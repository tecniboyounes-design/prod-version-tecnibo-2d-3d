// src/app/api/versionHistory/route.js
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { supabase } from '../filesController/route';

// ✅ Only trust DB: users.is_super_admin
function isSuperAdminUser(user) {
  return !!user?.is_super_admin;
}

async function fetchUserByOdooId(odooId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('odoo_id', odooId)
    .single();

  if (error || !user) {
    console.error(
      'Error fetching user by odoo_id:',
      error?.message || 'User not found',
    );
    throw new Error(
      `Failed to fetch user data: ${error?.message || 'User not found'}`,
    );
  }

  return user;
}

/**
 * Fetch projects (light rows only) where the user is owner or manager.
 * Super admin: all projects.
 */
async function fetchProjectsForUser(odooId) {
  const user = await fetchUserByOdooId(odooId);
  const isSuperAdmin = isSuperAdminUser(user);

  let projects = [];

  if (isSuperAdmin) {
    const { data, error } = await supabase.from('projects').select('*');
    if (error) {
      console.error('Error fetching ALL projects (super admin):', error.message);
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }
    projects = data || [];
  } else {
    // Owned projects
    const [ownedRes, managedRes] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', odooId),
      supabase.from('managers').select('project_id').eq('odoo_id', odooId),
    ]);

    const { data: ownedProjects, error: ownedError } = ownedRes;
    const { data: managedRows, error: managedError } = managedRes;

    if (ownedError) {
      console.error('Error fetching owned projects:', ownedError.message);
      throw new Error(`Failed to fetch owned projects: ${ownedError.message}`);
    }
    if (managedError) {
      console.error('Error fetching managed projects:', managedError.message);
      throw new Error(
        `Failed to fetch managed projects: ${managedError.message}`,
      );
    }

    const managedProjectIds = (managedRows || [])
      .map((m) => m.project_id)
      .filter(Boolean);

    let managedProjects = [];
    if (managedProjectIds.length > 0) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .in('id', managedProjectIds);
      if (error) {
        console.error(
          'Error fetching managed projects details:',
          error.message,
        );
        throw new Error(
          `Failed to fetch managed projects details: ${error.message}`,
        );
      }
      managedProjects = data || [];
    }

    // Merge owned + managed, remove duplicates
    const map = new Map();
    (ownedProjects || []).forEach((p) => map.set(p.id, p));
    managedProjects.forEach((p) => map.set(p.id, p));
    projects = Array.from(map.values());
  }

  return { projects, user, isSuperAdmin };
}

/**
 * Load real authors from users table using projects.user_id (odoo_id FK).
 */
async function fetchAuthorsMap(projects) {
  const authorOdooIds = Array.from(
    new Set(
      (projects || [])
        .map((p) => p.user_id)
        .filter((v) => v != null),
    ),
  );

  if (!authorOdooIds.length) return new Map();

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, odoo_id')
    .in('odoo_id', authorOdooIds);

  if (error) {
    console.error('Error fetching authors map:', error.message);
    return new Map();
  }

  const map = new Map();
  (data || []).forEach((u) => {
    map.set(u.odoo_id, u);
  });
  return map;
}

/**
 * Build lightweight project object for the frontend project list.
 */
function buildProjectHeader(project, authorUser) {
  const [firstName = '', lastName = ''] = authorUser?.name
    ? authorUser.name.trim().split(' ', 2)
    : ['', ''];

  return {
    created: project.created_on || new Date().toISOString(),
    lastModified:
      project.changed_on || project.created_on || new Date().toISOString(),
    error:
      typeof project.errors === 'object'
        ? project.errors
        : { error: false, message: '' },

    // REAL author (project owner from projects.user_id → users.odoo_id)
    author: {
      id: authorUser?.id ?? null,
      firstName,
      lastName,
      role: authorUser?.role ?? null,
    },

    status: project.status || 'draft',
    settings: {
      selectedTools: {},
    },
    cellingType: project.celling_type || 'default',
    floorType: project.floor_type || 'default',
    estimateUsage: project.project_estimate ?? false,
    colorProfile: project.colorProfile || project.RAL || {},
    id: project.id,
    projectName: project.title || 'Untitled',
    clientName: 'Untitled',
    projectType: 'residential',
    dimensions: {
      width: project.dimensions?.width || '3',
      length: project.dimensions?.length || '3',
      height:
        project.dimensions?.height ??
        project.dimensions?.height_mm ??
        2700,
    },
    plan2DImage: project.image_url || '',
    notes: '',
    description: project.description || '',
  };
}

export async function GET(req) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const sessionId = req.headers.get('x-session-id');
    if (!sessionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing x-session-id header' }),
        { status: 401, headers: corsHeaders },
      );
    }

    const { searchParams } = new URL(req.url);
    const odooIdRaw = searchParams.get('odooId');
    const restructureParam = searchParams.get('restructure');
    const restructure = restructureParam === 'true';

    if (!odooIdRaw) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing odooId parameter' }),
        { status: 400, headers: corsHeaders },
      );
    }

    const odooId = Number(odooIdRaw);
    if (!Number.isInteger(odooId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid odooId parameter' }),
        { status: 400, headers: corsHeaders },
      );
    }

    const { projects, user, isSuperAdmin } = await fetchProjectsForUser(odooId);

    if (!restructure) {
      // Raw/debug mode
      return new Response(
        JSON.stringify({ projects, user, isSuperAdmin }),
        {
          status: 200,
          statusText: 'OK',
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Restructured = LIGHT project list (no versions, no walls, no articles)
    if (!projects.length) {
      return new Response(JSON.stringify([]), {
        status: 200,
        statusText: 'OK',
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authorsMap = await fetchAuthorsMap(projects);
    const payload = projects.map((p) =>
      buildProjectHeader(p, authorsMap.get(p.user_id)),
    );

    return new Response(JSON.stringify(payload), {
      status: 200,
      statusText: 'OK',
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error in /api/versionHistory GET:', err.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Failed to fetch project history: ${err.message}`,
      }),
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

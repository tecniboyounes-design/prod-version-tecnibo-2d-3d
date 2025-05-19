import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { updateWallsInVersion } from "@/lib/princeCalculations";
import { supabase } from "../filesController/route";

export async function POST(req) {
    const corsHeaders = getCorsHeaders(req); 
    const { versionId } = await req.json();
    
    try {
        console.log('Updating walls for version:', versionId);
        await updateWallsInVersion(versionId);
        
        // Fetch the parent project that includes this version and all its relations (including walls)
        const { data: project, error: projectError } = await supabase
            .from("projects")
            .select(`
                *,
                versions(
                  *,
                  articles(*),
                  walls(
                    *,
                    points_start:points!walls_startpointid_fkey(*),
                    points_end:points!walls_endpointid_fkey(*)
                  ),
                  interventions(*)
                ),
                managers(*)
            `)
            .eq("versions.id", versionId)
            .single();
             
            console.log('Project with relations fetched:', project);
            
        if (projectError || !project) {
            console.error('Error fetching project object:', projectError?.message);
            return new Response(JSON.stringify({ error: "Walls updated but failed to fetch project object" }), {
                status: 500,
                headers: corsHeaders,
            });
        }
       
        return new Response(JSON.stringify({ message: 'Walls updated successfully', project }), {
            status: 200,
            headers: corsHeaders,
        });
    } catch (error) {
        console.error('Error updating walls:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders,
        });
    }
}

export async function OPTIONS(req) { 
    return handleCorsPreflight(req);
}
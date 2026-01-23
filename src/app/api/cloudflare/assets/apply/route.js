// src/app/api/cloudflare/assets/apply/route.js
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { buildDeliveryUrl, profileToDeliverySegment } from '@/cloudflare/server/cfDelivery';
import { checkGate } from '../../_lib/gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Reuse pool across hot reloads
const globalForPg = globalThis;
const pool =
  globalForPg.__CF_PG_POOL__ ||
  new Pool({
    connectionString: process.env.RP_IMOS_HELPER_DATABASE_URL || process.env.DATABASE_URL,
  });

if (!globalForPg.__CF_PG_POOL__) globalForPg.__CF_PG_POOL__ = pool;

function json(ok, payload, status = 200) {
  return NextResponse.json({ ok, ...payload }, { status });
}

export async function POST(req) {
  try {
    const gate = checkGate(req);
    if (!gate.ok) {
      return json(false, { message: gate.message }, gate.status);
    }

    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const defaultProfile = String(body?.defaultProfile || 'web');

    if (!items.length) return json(false, { message: 'items[] is required' }, 400);

    // Toggle flexible variants if you want per-row custom URL transforms
    const useFlexible = String(process.env.CF_IMAGES_USE_FLEXIBLE_VARIANTS || '') === '1';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updated = [];

      for (const it of items) {
        const cf_image_id = String(it?.cf_image_id || it?.id || '').trim();
        if (!cf_image_id) continue;

        const profile = String(it?.profile || defaultProfile || 'web');
        const custom = it?.custom && typeof it.custom === 'object' ? it.custom : null;

        const deliverySeg = profileToDeliverySegment(profile, custom, { useFlexible });

        const q = `
          UPDATE media_assets
             SET profile = $2,
                 delivery_variant = $3,
                 custom_transform = $4
           WHERE cf_image_id = $1
           RETURNING cf_image_id, root_slug, relative_path, file_name,
                     size_bytes, mime_type, width, height,
                     profile, delivery_variant, custom_transform
        `;

        const { rows } = await client.query(q, [cf_image_id, profile, deliverySeg, custom]);
        const row =
          rows[0] || {
            cf_image_id,
            profile,
            delivery_variant: deliverySeg,
            custom_transform: custom,
          };

        // URLs for UI
        const openUrl = buildDeliveryUrl({ cf_image_id, variantOrTransform: row.delivery_variant || 'public' });

        // optional: thumbnail URL (if you created a "thumb" variant)
        const thumbVariant = process.env.CF_IMAGES_THUMB_VARIANT || 'thumb';
        let thumbUrl = null;
        try {
          thumbUrl = buildDeliveryUrl({ cf_image_id, variantOrTransform: thumbVariant });
        } catch {
          thumbUrl = null;
        }

        updated.push({ ...row, openUrl, thumbUrl });
      }

      await client.query('COMMIT');
      return json(true, { updated });
    } catch (e) {
      await client.query('ROLLBACK');

      // Graceful fallback if table doesn't exist (dev/staging without migration)
      if (e?.code === '42P01') {
        console.error('[cf][assets/apply] media_assets table missing, returning delivery URLs without DB update');
        const fallback = items
          .map((it) => {
            const cf_image_id = String(it?.cf_image_id || it?.id || '').trim();
            if (!cf_image_id) return null;
            const profile = String(it?.profile || defaultProfile || 'web');
            const custom = it?.custom && typeof it.custom === 'object' ? it.custom : null;
            const delivery_variant = profileToDeliverySegment(profile, custom, { useFlexible });
            const openUrl = buildDeliveryUrl({ cf_image_id, variantOrTransform: delivery_variant || 'public' });
            const thumbVariant = process.env.CF_IMAGES_THUMB_VARIANT || 'thumb';
            let thumbUrl = null;
            try {
              thumbUrl = buildDeliveryUrl({ cf_image_id, variantOrTransform: thumbVariant });
            } catch {
              thumbUrl = null;
            }
            return {
              cf_image_id,
              profile,
              delivery_variant,
              custom_transform: custom,
              openUrl,
              thumbUrl,
            };
          })
          .filter(Boolean);

        return json(true, { updated: fallback, warning: 'media_assets table missing; returned URLs without DB update.' });
      }

      console.error('[cf][assets/apply] DB error', {
        message: e?.message,
        code: e?.code,
        detail: e?.detail,
        hint: e?.hint,
        stack: e?.stack?.split('\n').slice(0, 3).join(' \\ '),
      });
      return json(false, { message: e?.message || 'DB update failed' }, 500);
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('[cf][assets/apply] bad request', {
      message: e?.message,
      stack: e?.stack?.split('\n').slice(0, 3).join(' \\ '),
    });
    return json(false, { message: e?.message || 'Bad request' }, 400);
  }
}


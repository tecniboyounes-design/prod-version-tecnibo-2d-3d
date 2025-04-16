import { supabase } from '../filesController/route';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();

    const { version_id } = body;
    
    if (!version_id) {
      return NextResponse.json({ message: 'Missing version_id' }, { status: 400 });
    }

    // 1. Fetch walls under the version
    const { data: wallsData, error: wallsError } = await supabase
      .from('walls')
      .select('id, startpointid, endpointid')
      .eq('version_id', version_id);

    if (wallsError || !wallsData || wallsData.length === 0) {
      return NextResponse.json({ message: 'No walls found for this version' }, { status: 404 });
    }

    const results = [];

    for (const wall of wallsData) {
      const { id: wallId, startpointid: pointId1, endpointid: pointId2 } = wall;

      if (!pointId1 || !pointId2) {
        results.push({
          wallId,
          error: 'Invalid point IDs',
        });
        continue;
      }

      // 2. Call PostGIS distance function
      const { data: distanceResult, error: distanceError } = await supabase.rpc(
        'get_distance_between_points',
        {
          point_id_1: pointId1,
          point_id_2: pointId2,
        }
      );

      if (distanceError) {
        console.error(`Error for wall ${wallId}:`, distanceError);
        results.push({
          wallId,
          pointId1,
          pointId2,
          error: 'Distance calculation error',
        });
        continue;
      }

      results.push({
        wallId,
        pointId1,
        pointId2,
        distance: distanceResult,
      });
    }

    return NextResponse.json(results);

  } catch (err) {
    console.error('Unhandled error:', err);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

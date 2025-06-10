import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors"; 
import { validate } from "uuid";
import { supabase } from "../../filesController/route";

/**
 * Handles CORS preflight requests for the POST endpoint.
 */
export async function OPTIONS(request) {
  console.log("OPTIONS request received for POST /api/createComment");
  return handleCorsPreflight(request);
}

/**
 * Creates a new comment associated with a specific version.
 */
  
export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);
  
  try {
    const payload = await req.json();
    const { versionId, comment } = payload;

    // Validate payload
    if (!versionId || !comment) {
      return NextResponse.json(
        { error: "Missing versionId or comment" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate versionId as a UUID
    if (!validate(versionId)) {
      return NextResponse.json(
        { error: "Invalid versionId format" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if the version exists in the versions table
    const { data: version, error: versionError } = await supabase
      .from("versions")
      .select("id")
      .eq("id", versionId)
      .single();
    if (versionError || !version) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Prepare comment data for insertion
    const commentData = {
      version_id: versionId,
      data: comment,
    };

    // Insert the comment into the comments table
    const { data: newComment, error: insertError } = await supabase
      .from("comments")
      .insert(commentData)
      .select()
      .single();
    if (insertError) {
      console.error("[ERROR] Failed to insert comment:", insertError);
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Return success response with the newly created comment
    return NextResponse.json(
      {
        success: true,
        comment: newComment,
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[ERROR] Error processing request:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}



const commentObjectDataStructure = {
  name: "Untitled",
  versions: [
    {
      versionId: "1.0",
      comments: [
        {
          id: "1747237788610",
          position: {
            x: 6.965888148677713,
            y: 0.4,
            z: -7.586701454315291,
          },
          text: "Twst ",
          user: {
            id: "1",
            firstName: "Rabie",
            lastName: "ELMA",
            role: "Project Manager",
          },
          createdAt: "2025-05-14T15:49:48.610Z",
          isResolved: false,
        },
      ],
    },
  ],
};








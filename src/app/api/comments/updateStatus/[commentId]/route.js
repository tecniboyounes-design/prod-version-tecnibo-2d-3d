
  import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors"; // Adjust path as needed
import { supabase } from "@/app/api/filesController/route";

/**
 * Handles CORS preflight requests for the PATCH endpoint.
 */
export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

/**
 * Updates the 'isResolved' status inside the 'data' JSONB field of a specific comment.
 * Endpoint: PATCH /api/comments/updateStatus/[commentId]
 * Request Body: { "isResolved": true } or { "isResolved": false }
 * Response: Updated comment object { id, version_id, data }
 */
 


export async function PATCH(req, { params }) {
  const corsHeaders = getCorsHeaders(req);
  const commentId = params?.commentId;

  // Validate that commentId is provided
  if (!commentId) {
    return NextResponse.json(
      { message: "commentId is required" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // Parse the request body to get isResolved
    const { isResolved } = await req.json();

    // Validate that isResolved is provided and is a boolean
    if (isResolved === undefined) {
      return NextResponse.json(
        { message: "isResolved is required" },
        { status: 400, headers: corsHeaders }
      );
    }
    if (typeof isResolved !== "boolean") {
      return NextResponse.json(
        { message: "isResolved must be a boolean" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch the current comment data from Supabase
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("data")
      .eq("id", commentId)
      .single();
      // console.log('comment 1 :', comment)
    // Handle case where comment is not found
    if (fetchError || !comment) {
      return NextResponse.json(
        { message: "Comment not found" },
        { status: 404, headers: corsHeaders }
      );
    }
  
    // Ensure the 'data' field is an object and contains 'isResolved'
    if (typeof comment.data !== "object" || comment.data === null || !("isResolved" in comment.data)) {
      return NextResponse.json(
        { error: "Invalid comment data structure" },
        { status: 500, headers: corsHeaders }
      );
    }

    // console.log('comment:', comment)
    // Update the 'isResolved' field in the 'data' object
    comment.data.isResolved = isResolved;

    // Update the comment in Supabase with the modified 'data'
    const { data: updatedComment, error: updateError } = await supabase
      .from("comments")
      .update({ data: comment.data })
      .eq("id", commentId)
      .select()
      .single();
      
    // Handle any errors from the update operation
    if (updateError) {
      console.error("Error updating comment:", updateError);
      return NextResponse.json(
        { error: "Failed to update comment" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Return the updated comment data
    return NextResponse.json(updatedComment, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
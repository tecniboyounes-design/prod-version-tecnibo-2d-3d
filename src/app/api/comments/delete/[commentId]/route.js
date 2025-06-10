
import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors"; // Adjust path as needed
import { supabase } from "@/app/api/filesController/route";

/** * Handles CORS preflight requests for the DELETE endpoint.
 */

export async function OPTIONS(req) {
    console.log("OPTIONS request received for DELETE /api/comments/delete/[commentId]");
    return handleCorsPreflight(req);
}


/**
 * Deletes a comment by its ID.
 * Endpoint: DELETE /api/comments/delete/[commentId]
 * Request Body: None
 * Response: Success message or error
 */
 

export async function DELETE(req, { params }) { 
    const corsHeaders = getCorsHeaders(req);
    const commentId = params?.commentId;
    
    // Validate that commentId is provided
    if (!commentId) {
        return NextResponse.json(
        { message: "commentId is required" },
        { status: 400, headers: corsHeaders }
        );
    }
    
    // Delete the comment from the comments table
    const { error: deleteError } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);
    
    if (deleteError) {
        console.error("[ERROR] Failed to delete comment:", deleteError);
        return NextResponse.json(
        { error: "Failed to delete comment" },
        { status: 500, headers: corsHeaders }
        );
    }
    
    return NextResponse.json(
        { message: "Comment deleted successfully" },
        { status: 200, headers: corsHeaders }
    );
    }
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { supabase } from "../filesController/route";

/**
 * OPTIONS handler to satisfy CORS preflight.
*/


export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}


/**
 * POST /api/customArticles
 * Body (JSON):
 *   {
 *     projectId: "<uuid>",
 *     article: { … }    // the full article object you showed
 *   }
 *
 * Response:
 *   200  { id: "<new-custom_article-uuid>" }
 *   400  { error: "<message>" }
 *   404  { error: "Project not found" }
 *   500  { error: "Internal Server Error" }
 */
 

export async function POST(request) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json();
    const { projectId, article } = body;

    // Validate
    if (!projectId || !article) {
      return new Response(
        JSON.stringify({ error: "Missing projectId or article" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Normalize to array
    const articles = Array.isArray(article) ? article : [article];

    // Ensure project exists
    const { data: projectRow, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) {
      console.error("[customArticles] Project fetch error:", projectError);
      return new Response(
        JSON.stringify({ error: "Internal Server Error" }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!projectRow) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Prepare bulk insert
    const insertData = articles.map((a) => ({
      project_id: projectId,
      article_data: a,
    }));

    // Insert all articles
    const { error: insertError } = await supabase
      .from("custom_articles")
      .insert(insertData);

    if (insertError) {
      console.error("[customArticles] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message || "Insert failed" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch and return all articles for this project
    const { data: allArticles, error: fetchError } = await supabase
      .from("custom_articles")
      .select("id, article_data, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("[customArticles] Fetch after insert error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch articles after insert" }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify(allArticles), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error("[customArticles] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}




/**
 * GET /api/customArticles?projectId=<UUID>
 *
 * - Expects a query parameter `projectId`.
 * - Checks that `projectId` is provided.
 * - Queries Supabase for all rows in `custom_articles` where `project_id = projectId`.
 * - Returns an array of `{ id, article_data, created_at }` objects.
 */


export async function GET(request) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Missing projectId query parameter" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data, error } = await supabase
      .from("custom_articles")
      .select("id, article_data, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[customArticles GET] Supabase error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Failed to fetch articles" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Flatten the response to match POST format
    const articles = (data ?? []).map(({ id, created_at, article_data }) => ({
      ...article_data,
      id: article_data?.id || id,
      createdAt: article_data?.createdAt || created_at,
    }));
   
    return new Response(JSON.stringify(articles), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error("[customArticles GET] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}





export async function DELETE(request) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
   
    if (!id) {
      return new Response(
        JSON.stringify({ error: "Missing id query parameter" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { error } = await supabase
      .from("custom_articles")
      .delete()
      .eq("id", id);
      
    if (error) {
      console.error("[customArticles DELETE] Supabase error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Failed to delete article" }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ message: "Article deleted successfully", id }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("[customArticles DELETE] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}



export async function PUT(request) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response(
        JSON.stringify({ error: "Missing id query parameter" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const body = await request.json();
    
    if (!body || typeof body !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Optional: update the `created_at` to now (like a last updated timestamp)
    const updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("custom_articles")
      .update({
        article_data: body,
        created_at: updated_at, // optional: overwrite timestamp
      })
      .eq("id", id);

    if (error) {
      console.error("[customArticles PUT] Supabase error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Failed to update article" }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ message: "Article updated successfully", id }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("[customArticles PUT] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}



import { supabase } from "@/app/api/filesController/route";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

// GET /api/comments/project/[projectId]
// Fetch all comments for all versions inside a project, structured by version

export async function GET(req, { params }) {
  const corsHeaders = getCorsHeaders(req);
  const projectId = params?.projectId;

  console.log('projectId:', projectId);
  
  // Validate projectId
  if (!projectId) {
    return new Response(JSON.stringify({ message: "projectId is required" }), {
      status: 400,
      headers: corsHeaders,
    });
  }
 
  try {
    // Step 1: Fetch the project name
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("title")
      .eq("id", projectId)
      .single();
      
    if (projectError) {
      console.error("Error fetching project:", projectError);
      return new Response(JSON.stringify({ message: "Project not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const projectName = project.name;

    // Step 2: Fetch all versions for the project
    const { data: versions, error: versionError } = await supabase
      .from("versions")
      .select("id, version")
      .eq("project_id", projectId);
     
    if (versionError) {
      console.error("Error fetching versions:", versionError);
      return new Response(JSON.stringify({ error: "Failed to fetch versions" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Step 3: Fetch comments if there are versions
    let comments = [];
    if (versions.length > 0) {
      const versionIds = versions.map((v) => v.id);
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("version_id, data")
        .in("version_id", versionIds);
         
      if (commentsError) {
        console.error("Error fetching comments:", commentsError);
        return new Response(JSON.stringify({ error: "Failed to fetch comments" }), {
          status: 500,
          headers: corsHeaders,
        });
      }
      comments = commentsData || [];
    }

    // Step 4: Group and format comments by version
    const commentsByVersion = {};
    comments.forEach((comment) => {
      const versionId = comment.version_id;
      if (!commentsByVersion[versionId]) {
        commentsByVersion[versionId] = [];
      }
      const formattedComment = {
        id: comment.data.id,
        position: comment.data.position,
        text: comment.data.text,
        user: comment.data.user,
        createdAt: comment.data.createdAt,
        isResolved: comment.data.isResolved,
      };
      commentsByVersion[versionId].push(formattedComment);
    });

    // Step 5: Construct the versions array with comments
    const versionsWithComments = versions.map((version) => ({
      version: version.version,
      comments: commentsByVersion[version.id] || [],
    }));

    // Step 6: Construct the final response
    const response = {
      name: projectName,
      versions: versionsWithComments,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error fetching project comments:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}



// this is data structure we need to response with , 
// {
//   "name": "SDSASFSDFS",
//     "versions": [
//       {
//         "version": "1.0",
//         "comments": [
//           {
//             "id": "1748423951367",
//             "position": {
//               "x": 5.919756984612804,
//               "y": 0.4,
//               "z": -3.6066397711270635
//             },
//             "text": "TSasdkhdf",
//             "user": {
//               "id": "1",
//               "firstName": "Rabie",
//               "lastName": "ELMA",
//               "role": "Project Manager"
//             },
//             "createdAt": "2025-05-28T09:19:11.367Z",
//             "isResolved": false
//           }
//         ]
//       },
//       {
//         "version": "1.1",
//         "comments": [
//           {
//             "id": "1748424053439",
//             "position": {
//               "x": 5.72773102280936,
//               "y": 0.4,
//               "z": -3.7831474779110943
//             },
//             "text": "DFGDFGF",
//             "user": {
//               "id": "1",
//               "firstName": "Rabie",
//               "lastName": "ELMA",
//               "role": "Project Manager"
//             },
//             "createdAt": "2025-05-28T09:20:53.439Z",
//             "isResolved": true
//           },
//           {
//             "id": "1748424077567",
//             "position": {
//               "x": 1.5465355421511693,
//               "y": 0.4,
//               "z": -3.3650803231337503
//             },
//             "text": "VERSINDSFDN111",
//             "user": {
//               "id": "1",
//               "firstName": "Rabie",
//               "lastName": "ELMA",
//               "role": "Project Manager"
//             },
//             "createdAt": "2025-05-28T09:21:17.567Z",
//             "isResolved": true
//           }
//         ]
//       }
//     ]
// }

















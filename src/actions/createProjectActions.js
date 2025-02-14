export async function createProject(projectData) {
    try {
        const response = await fetch("/api/createProject", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(projectData),
        });

        const result = await response.json();
        console.log("Project Creation Response:", result);
        return result; // Return the result for further handling if needed
    } catch (error) {
        console.error("Error sending request:", error);
        throw error; // Rethrow error if you want to handle it outside
    }
}

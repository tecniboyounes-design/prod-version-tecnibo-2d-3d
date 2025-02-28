
export async function createProject(projectData) {
    try {
        const response = await fetch("/api/projects", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(projectData),
        });

        const result = await response.json();
        console.log("Project Creation Response:", result);
        return result; 
    } catch (error) {
        console.error("Error sending request:", error);
        throw error; 
    }
}

export async function createEntityInDB({ command, data }) {
  try {
    const res = await fetch("/api/create-entity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, data }),
    });

    if (!res.ok) throw new Error(`API creation failed: ${res.statusText}`);

    console.log(`✅ Created ${command} with data:`, data);
    return await res.json(); // assuming backend returns created entity
  } catch (err) {
    console.error(`❌ Failed to create ${command}:`, err);
    throw err;
  }
}

/**
 * Increments a semantic version string (e.g., "1.9" → "2.0").
 * @param {string} version - The current version string.
 * @returns {string} - The next version string.
 */


export function incrementVersion(version) {
    // console.log(`incrementVersion called with input: "${version}"`);
  
    // Validate input
    if (typeof version !== "string" || version.trim() === "") {
      console.error(`Invalid version: Empty or non-string input: "${version}"`);
      throw new Error("Version must be a non-empty string");
    }
  
    const parts = version.split(".");
    console.log(`Split version into parts:`, parts);
  
    if (parts.length < 1 || parts.length > 2) {
      console.error(`Invalid version: Must have 1 or 2 parts, got: ${parts}`);
      throw new Error("Version must have 1 or 2 parts (e.g., '1' or '1.0')");
    }
  
    const major = parseInt(parts[0], 10);
    if (isNaN(major) || major < 0) {
      console.error(`Invalid major version: "${parts[0]}" is not a non-negative number`);
      throw new Error("Major version must be a non-negative number");
    }
  
    // Default minor to 0 if not provided, otherwise parse
    const minor = parts[1] ? parseInt(parts[1], 10) : 0;
    if (parts[1] && (isNaN(minor) || minor < 0)) {
      console.error(`Invalid minor version: "${parts[1]}" is not a non-negative number`);
      throw new Error("Minor version must be a non-negative number");
    }
    // console.log(`Parsed major: ${major}, minor: ${minor}`);
  
    let newVersion;
    if (minor >= 9) {
      newVersion = `${major + 1}.0`;
    //   console.log(`Minor >= 9, incrementing major: ${newVersion}`);
    } else {
      newVersion = `${major}.${minor + 1}`;
    //   console.log(`Incrementing minor: ${newVersion}`);
    }
  
    // console.log(`Returning new version: "${newVersion}"`);
    return newVersion;
}






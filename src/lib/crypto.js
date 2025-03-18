// import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
// 
// const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
// if (!ENCRYPTION_KEY ) {
//   throw new Error("ENCRYPTION_KEY must be 32 characters long");
// }
// 
// const ALGORITHM = "aes-256-cbc";
// 
// // Encrypt data
// export function encrypt(text) {
//   const iv = randomBytes(16);
//   const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
//   let encrypted = cipher.update(text, "utf8", "hex");
//   encrypted += cipher.final("hex");
//   return `${iv.toString("hex")}:${encrypted}`;
// }
// 
// // Decrypt data
// export function decrypt(encryptedText) {
//   const [ivHex, encrypted] = encryptedText.split(":");
//   if (!ivHex || !encrypted) throw new Error("Invalid encrypted format");
//   const iv = Buffer.from(ivHex, "hex");
//   const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
//   let decrypted = decipher.update(encrypted, "hex", "utf8");
//   decrypted += decipher.final("utf8");
//   return decrypted;
// }
// 
// // Test function
// export function testCrypto(sessionId) {
//   console.log("Original session_id:", sessionId);
//   
//   const encrypted = encrypt(sessionId);
//   console.log("Encrypted session_id:", encrypted);
//   
//   const decrypted = decrypt(encrypted);
//   console.log("Decrypted session_id:", decrypted);
//   
//   const isMatch = sessionId === decrypted;
//   console.log("Match?", isMatch);
//   
//   return { original: sessionId, encrypted, decrypted, isMatch };
// }
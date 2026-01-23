// /app/(same-path)/page.tsx
import { cookies } from "next/headers";
import BuilderClientPage from "./BuilderClientPage";

export default function Page() {
  const sessionId = cookies().get("session_id")?.value || null;
  return <BuilderClientPage sessionId={sessionId} />;
}

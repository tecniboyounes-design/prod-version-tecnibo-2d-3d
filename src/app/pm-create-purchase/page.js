import React from "react";
import OdooPurchasePage from "./Createpurchase";
import { cookies } from "next/headers";

export default function Page() {
  const sessionId = cookies().get("session_id")?.value || null;
  return <OdooPurchasePage sessionId={sessionId} />;
}

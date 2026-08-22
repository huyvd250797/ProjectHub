import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function GET() {
  return NextResponse.json({
    app: "Project Hub",
    workspace: "Project Workspace",
    version: "0.2.0",
    status: "ok",
    supabaseConfigured: isSupabaseConfigured(),
    features: ["multi-project-schema", "project-switcher", "import-dry-run", "supabase-rls-foundation"],
  });
}

import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "../../../../../lib/supabase/server";

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", new URL(request.url).origin), 303);
}

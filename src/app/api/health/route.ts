import { NextResponse } from "next/server";
import { healthService } from "@/services/health/health.service";

export async function GET() {
  return NextResponse.json(await healthService.check(), {
    headers: { "Cache-Control": "no-store" },
  });
}

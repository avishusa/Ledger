import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const logs = await prisma.ingestLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ logs });
  } catch (error) {
    // Always return a JSON object, even on error
    return NextResponse.json({ logs: [], error: String(error) }, { status: 500 });
  }
}

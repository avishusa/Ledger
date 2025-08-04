// src/app/api/last-ingest/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const latest = await prisma.ingestLog.findFirst({
    where: { status: "success" },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true }
  });
  return NextResponse.json({ latest });
}

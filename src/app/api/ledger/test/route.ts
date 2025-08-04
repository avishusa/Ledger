// src/app/api/ledger/test/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const ledger = await prisma.ledger.findMany({
    orderBy: { date: "desc" }
  });
  return NextResponse.json({ ledger });
}

export async function POST(req: Request) {
  try {
    const { date, merchant, amount, description, category, paymentMethod } = await req.json();

    // Defensive: Parse values to match schema
    if (!date || !merchant || !amount || !category || !paymentMethod) {
      return NextResponse.json({ success: false, error: "Missing required fields." });
    }

    const entry = await prisma.ledger.create({
      data: {
        date: new Date(date),
        merchant: merchant.trim(),
        amount: parseFloat(amount),
        description: description || "",
        category,
        paymentMethod,
      }
    });

    return NextResponse.json({ success: true, entry });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Failed to add ledger entry" });
  }
}

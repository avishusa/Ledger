// src/app/api/ledger/[id]/route.ts
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ledger = await prisma.ledger.findUnique({
    where: { id: Number(id) },
  });
  if (!ledger) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ledger });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  try {
    const updated = await prisma.ledger.update({
      where: { id: Number(id) },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        merchant: body.merchant,
        amount: Number(body.amount),
        description: body.description ?? "",
        paymentMethod: body.paymentMethod ?? "Unknown",
        category: body.category ?? "Unknown",
      },
    });
    return Response.json({ ledger: updated });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.ledger.delete({ where: { id: Number(id) } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
}
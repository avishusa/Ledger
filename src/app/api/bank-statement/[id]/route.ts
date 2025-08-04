import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idNum = Number(id);
  const data = await req.json();

  const updated = await prisma.bankStatement.update({
    where: { id: idNum },
    data: {
      merchant: data.merchant,
      amount: parseFloat(data.amount),
      date: new Date(data.date),
      description: data.description ?? null,
      category: data.category ?? null,
      paymentMethod: data.paymentMethod ?? null
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = Number(id);

    await prisma.bankStatement.delete({
      where: { id: idNum }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}
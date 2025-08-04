import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const data = await req.json();

  const updated = await prisma.bankStatement.update({
    where: { id },
    data: {
      merchant: data.merchant,
      amount: parseFloat(data.amount),
      date: new Date(data.date),
      description: data.description ?? null,
      category: data.category ?? null,         // Add this
      paymentMethod: data.paymentMethod ?? null // Add this
    }
  });

  return NextResponse.json(updated);
}


export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);

    await prisma.bankStatement.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}

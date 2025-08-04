import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toKey(t: any) {
  return [
    (t.merchant || "").toLowerCase().trim(),
    (t.date instanceof Date ? t.date.toISOString().slice(0, 10) : (t.date || "")),
    Number(t.amount).toFixed(2)
  ].join(",");
}

export async function GET() {
  try {
    const ledger = await prisma.ledger.findMany();
    const bank = await prisma.bankStatement.findMany();

    const ledgerNorm = ledger.map(l => ({
      ...l,
      merchant: l.merchant,
      amount: l.amount,
      date: l.date instanceof Date ? l.date.toISOString().slice(0, 10) : l.date,
    }));
    const bankNorm = bank.map(b => ({
      ...b,
      merchant: b.merchant,
      amount: b.amount,
      date: b.date instanceof Date ? b.date.toISOString().slice(0, 10) : b.date,
    }));

    const ledgerSet = new Set(ledgerNorm.map(toKey));
    const bankSet = new Set(bankNorm.map(toKey));
    const matched = ledgerNorm.filter(l => bankSet.has(toKey(l)));
    const ledgerOnly = ledgerNorm.filter(l => !bankSet.has(toKey(l)));
    const bankOnly = bankNorm.filter(b => !ledgerSet.has(toKey(b)));

    return NextResponse.json({
      match: { matched, ledgerOnly, bankOnly }
    });
  } catch (error) {
    // Always return a JSON body, even if there's an error
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

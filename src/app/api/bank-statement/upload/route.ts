import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper: Make key for comparison (merchant/date/amount, case-insensitive)
function toKey(t: any) {
  return [
    (t.merchant || t.Merchant || "").toLowerCase().trim(),
    (t.date || t.Date || "").slice(0, 10),
    Number(t.amount || t.Amount).toFixed(2)
  ].join(",");
}

// Normalize rows for comparing/matching
async function getLedgerRows() {
  const ledger = await prisma.ledger.findMany();
  return ledger.map(l => ({
    ...l,
    merchant: l.merchant,
    amount: l.amount,
    date: l.date.toISOString().slice(0, 10),
  }));
}

async function getBankRows() {
  const bank = await prisma.bankStatement.findMany();
  return bank.map(b => ({
    ...b,
    merchant: b.merchant,
    amount: b.amount,
    date: b.date.toISOString().slice(0, 10),
  }));
}

// Comparison logic: only these fields matter
function compare(ledger: any[], bank: any[]) {
  const ledgerSet = new Set(ledger.map(toKey));
  const bankSet = new Set(bank.map(toKey));
  return {
    matched: ledger.filter(l => bankSet.has(toKey(l))),
    ledgerOnly: ledger.filter(l => !bankSet.has(toKey(l))),
    bankOnly: bank.filter(b => !ledgerSet.has(toKey(b))),
  };
}

export async function POST(req: Request) {
  const { rows } = await req.json();

  // Insert all CSV rows to DB (no dedup here, but could be added if desired)
  for (const row of rows) {
    if (!row.merchant && !row.Merchant) continue;
    await prisma.bankStatement.create({
  data: {
    merchant: row.merchant || row.Merchant || "",
    amount: parseFloat(row.amount || row.Amount || 0),
    date: new Date(row.date || row.Date),
    description: row.description || row.Description || null,
    paymentMethod: row.paymentMethod || row["Payment Method"] || "", // <--- Add this line!
    category: row.category || row.Category || "",                   // <--- And this one!
  }
});


  }

  // Fetch updated data for table & matching
  const bankRows = await getBankRows();
  const ledgerRows = await getLedgerRows();
  const match = compare(ledgerRows, bankRows);

  return NextResponse.json({ data: bankRows, match });
}

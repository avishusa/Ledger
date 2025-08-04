import React from "react";

type ComparisonResult = {
  matched: any[];
  ledgerOnly: any[];
  bankOnly: any[];
};

export default function LedgerSummary({
  comparison
}: {
  comparison: ComparisonResult | null;
}) {
  if (!comparison) return null;

  const matchedCount = comparison.matched.length;
  const ledgerOnlyCount = comparison.ledgerOnly.length;
  const bankOnlyCount = comparison.bankOnly.length;
  const unmatchedTotal = comparison.bankOnly.reduce(
    (sum: number, tx: any) => sum + Number(tx.amount || tx.Amount), 0
  );

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-4">
      <div className="bg-white/90 dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow flex-1 min-w-[140px] w-full sm:w-auto">
        <div className="text-xl sm:text-2xl font-bold text-green-700">{matchedCount}</div>
        <div className="text-gray-500 text-sm sm:text-base">Matched</div>
      </div>
      <div className="bg-white/90 dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow flex-1 min-w-[140px] w-full sm:w-auto">
        <div className="text-xl sm:text-2xl font-bold text-yellow-700">{ledgerOnlyCount}</div>
        <div className="text-gray-500 text-sm sm:text-base">Only in Ledger</div>
      </div>
      <div className="bg-white/90 dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow flex-1 min-w-[140px] w-full sm:w-auto">
        <div className="text-xl sm:text-2xl font-bold text-red-700">{bankOnlyCount}</div>
        <div className="text-gray-500 text-sm sm:text-base">Only in Bank</div>
      </div>
      <div className="bg-white/90 dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow flex-1 min-w-[140px] w-full sm:w-auto">
        <div className="text-base sm:text-lg font-bold text-red-800">
          ${unmatchedTotal.toFixed(2)}
        </div>
        <div className="text-gray-500 text-sm sm:text-base">Unmatched Amount</div>
      </div>
    </div>
  );
}

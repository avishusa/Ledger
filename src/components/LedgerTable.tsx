import React from "react";

export type LedgerItem = {
  id?: number;
  date: string;
  merchant: string;
  amount: number;
  description?: string;
  paymentMethod?: string;
  category?: string;
};

type Props = {
  items: LedgerItem[];
  editable?: boolean;
  onEdit?: (item: LedgerItem) => void;
  onDelete?: (id: number) => void;
};

export default function LedgerTable({ items, editable, onEdit, onDelete }: Props) {
  return (
    <div className="w-full overflow-x-auto rounded-lg">
      <table className="min-w-[650px] w-full table-auto text-xs sm:text-sm">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="px-2 py-1 sm:px-3 sm:py-2">Date</th>
            <th className="px-2 py-1 sm:px-3 sm:py-2">Merchant</th>
            <th className="px-2 py-1 sm:px-3 sm:py-2">Amount</th>
            <th className="px-2 py-1 sm:px-3 sm:py-2">Description</th>
            <th className="px-2 py-1 sm:px-3 sm:py-2">Payment Method</th>
            <th className="px-2 py-1 sm:px-3 sm:py-2">Category</th>
            {editable && <th className="px-2 py-1 sm:px-3 sm:py-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={editable ? 7 : 6} className="py-6 text-center text-gray-400">
                No data
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr
                key={
                  item.id !== undefined
                    ? `ledger-${item.id}`
                    : `row-${item.date || ""}-${item.amount || ""}-${item.merchant || ""}-${idx}`
                }
                className="border-b border-gray-700 hover:bg-gray-800/30"
              >
                <td className="px-2 py-1 sm:px-3 sm:py-2">{new Date(item.date).toLocaleDateString()}</td>
                <td className="px-2 py-1 sm:px-3 sm:py-2">{item.merchant}</td>
                <td className="px-2 py-1 sm:px-3 sm:py-2">${Number(item.amount).toFixed(2)}</td>
                <td className="px-2 py-1 sm:px-3 sm:py-2">{item.description}</td>
                <td className="px-2 py-1 sm:px-3 sm:py-2">{item.paymentMethod || "Unknown"}</td>
                <td className="px-2 py-1 sm:px-3 sm:py-2">{item.category || "Unknown"}</td>
                {editable && (
                  <td className="px-2 py-1 sm:px-3 sm:py-2 space-x-2 whitespace-nowrap">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => onEdit && onEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => onDelete && item.id !== undefined && onDelete(item.id)}
                      disabled={item.id === undefined}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

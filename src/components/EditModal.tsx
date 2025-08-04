"use client";
import React, { useState, useEffect } from "react";
import { LedgerItem } from "./LedgerTable";

const PAYMENT_OPTIONS = ["Card", "Cash", "UPI", "Other"];
const CATEGORY_OPTIONS = [
  "Groceries",
  "Dining",
  "Utilities",
  "Travel",
  "Shopping",
  "Health",
  "Other"
];

export default function EditModal({
  open,
  item,
  onClose,
  onSave,
}: {
  open: boolean;
  item: LedgerItem | null;
  onClose: () => void;
  onSave: (item: LedgerItem) => void;
}) {
  const [form, setForm] = useState<LedgerItem | null>(null);

  useEffect(() => {
    if (item) setForm(item);
  }, [item]);

  if (!open || !form) return null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) =>
      f
        ? {
            ...f,
            [e.target.name]: e.target.value,
          }
        : f
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form) onSave({ ...form, amount: Number(form.amount) });
  }

  return (
    <div className="fixed z-50 inset-0 bg-black/40 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-black dark:bg-gray-900 rounded-lg sm:rounded-xl border shadow-xl w-full max-w-xs sm:max-w-md md:max-w-lg p-4 sm:p-8">
        <h2 className="text-base sm:text-lg font-bold mb-4">Edit Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block font-medium mb-1 text-sm sm:text-base">Date</label>
            <input
              type="date"
              name="date"
              value={form.date ? new Date(form.date).toISOString().slice(0, 10) : ""}
              onChange={handleChange}
              className="w-full border bg-black dark:bg-gray-800 rounded px-3 py-2 text-base text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm sm:text-base">Merchant</label>
            <input
              name="merchant"
              value={form.merchant}
              onChange={handleChange}
              className="w-full border bg-black dark:bg-gray-800 rounded px-3 py-2 text-base text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm sm:text-base">Amount</label>
            <input
              type="number"
              step="0.01"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              className="w-full border bg-black dark:bg-gray-800 rounded px-3 py-2 text-base text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm sm:text-base">Description</label>
            <input
              name="description"
              value={form.description || ""}
              onChange={handleChange}
              className="w-full border bg-black dark:bg-gray-800 rounded px-3 py-2 text-base text-gray-100"
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm sm:text-base">Payment Method</label>
            <select
              name="paymentMethod"
              value={form.paymentMethod || ""}
              onChange={handleChange}
              className="w-full border rounded bg-black dark:bg-gray-800 px-3 py-2 text-base text-gray-100"
              required
            >
              <option value="" disabled>
                Select payment method...
              </option>
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm sm:text-base">Category</label>
            <select
              name="category"
              value={form.category || ""}
              onChange={handleChange}
              className="w-full border rounded bg-black dark:bg-gray-800 px-3 py-2 text-base text-gray-100"
              required
            >
              <option value="" disabled>
                Select category...
              </option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border bg-red-500 text-white dark:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-green-600 text-white font-semibold shadow"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";

const CATEGORY_OPTIONS = [
  "Groceries",
  "Dining",
  "Utilities",
  "Travel",
  "Shopping",
  "Health",
  "Other"
];

const PAYMENT_METHOD_OPTIONS = [
  "Cash",
  "Card",
  "Bank Transfer",
  "UPI",
  "Check",
  "Unknown"
];

export default function AddLedgerForm({ onAdd }: { onAdd: () => void }) {
  const [date, setDate] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/ledger/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, merchant, amount, description, category, paymentMethod }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.error || "Failed to add entry");
    } else {
      setDate("");
      setMerchant("");
      setAmount("");
      setDescription("");
      setCategory("");
      setPaymentMethod("");
      onAdd();
    }
    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 sm:mb-8 bg-black dark:bg-gray-400 p-3 sm:p-6 md:p-8 rounded-lg sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 max-w-full sm:max-w-lg mx-auto space-y-3 sm:space-y-5"
    >
      <div>
        <label className="block text-sm sm:text-base mb-2 font-semibold text-white-700 dark:text-gray-200">Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 sm:px-4 sm:py-3 text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm sm:text-base mb-2 font-semibold text-white-700 dark:text-gray-200">Merchant</label>
        <input
          value={merchant}
          onChange={e => setMerchant(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 sm:px-4 sm:py-3 text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm sm:text-base mb-2 font-semibold text-white-700 dark:text-gray-200">Amount</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 sm:px-4 sm:py-3 text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm sm:text-base mb-2 font-semibold text-white-700 dark:text-gray-200">Category</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 sm:px-4 sm:py-3 text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
          required
        >
          <option value="" disabled>Select category...</option>
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm sm:text-base mb-2 font-semibold text-white-700 dark:text-gray-200">Payment Method</label>
        <select
          value={paymentMethod}
          onChange={e => setPaymentMethod(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 sm:px-4 sm:py-3 text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
          required
        >
          <option value="" disabled>Select payment method...</option>
          {PAYMENT_METHOD_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm sm:text-base mb-2 font-semibold text-white-700 dark:text-gray-200">Description</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 sm:px-4 sm:py-3 text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
        />
      </div>
      {error && <div className="text-red-600 font-semibold">{error}</div>}
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 sm:py-3 mt-2 font-bold text-base sm:text-lg shadow-md transition disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Adding..." : "Add Entry"}
      </button>
    </form>
  );
}

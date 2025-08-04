"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import AddLedgerForm from "@/components/AddLedgerForm";
import LedgerTable, { LedgerItem } from "@/components/LedgerTable";
import BankCsvUpload from "@/components/BankCsvUpload";
import EditModal from "@/components/EditModal";
import LedgerSummary from "@/components/LedgerSummary";
import RecentImports from "@/components/RecentImports";

export default function HomeClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ledger, setLedger] = useState<any[]>([]);
  const [bankRows, setBankRows] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any | null>(null);
  const [recentRefresh, setRecentRefresh] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<LedgerItem | null>(null);
  const [editType, setEditType] = useState<"ledger" | "bank" | null>(null);

  // Auth redirect
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Poll for live updates (refresh everything from server)
  useEffect(() => {
    if (status !== "authenticated") return;
    let isMounted = true;
    setLoading(true);

    async function poll() {
      const [ledgerRes, bankRes, matchRes] = await Promise.all([
        fetch("/api/ledger/test"),
        fetch("/api/bank-statement"),
        fetch("/api/bank-statement/match"),
      ]);
      const ledgerData = await ledgerRes.json();
      const bankData = await bankRes.json();
      const matchData = await matchRes.json();
      if (isMounted) {
        setLedger(ledgerData.ledger);
        setBankRows(bankData.data);
        setComparison(matchData.match);
        setRecentRefresh(Date.now());
        setLoading(false);
      }
    }
    poll();
    const interval = setInterval(poll, 6000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [status]);

  function handleAddLedger() {
    setLoading(true);
    fetch("/api/ledger/test")
      .then(res => res.json())
      .then(data => setLedger(data.ledger))
      .finally(() => setLoading(false));
    setRecentRefresh(Date.now());
  }

  function handleBankUploaded(result: any) {
    setLoading(true);
    setBankRows(result.data);
    setComparison(result.match);
    setRecentRefresh(Date.now());
    setTimeout(() => setLoading(false), 400); // just for smoothness
  }

  async function handleDeleteLedger(id: number) {
    setLoading(true);
    await fetch(`/api/ledger/${id}`, { method: "DELETE" });
    const [ledgerRes, bankRes, matchRes] = await Promise.all([
      fetch("/api/ledger/test"),
      fetch("/api/bank-statement"),
      fetch("/api/bank-statement/match"),
    ]);
    setLedger((await ledgerRes.json()).ledger);
    setBankRows((await bankRes.json()).data);
    setComparison((await matchRes.json()).match);
    setLoading(false);
  }
  async function handleDeleteBank(id: number) {
    setLoading(true);
    await fetch(`/api/bank-statement/${id}`, { method: "DELETE" });
    const [ledgerRes, bankRes, matchRes] = await Promise.all([
      fetch("/api/ledger/test"),
      fetch("/api/bank-statement"),
      fetch("/api/bank-statement/match"),
    ]);
    setLedger((await ledgerRes.json()).ledger);
    setBankRows((await bankRes.json()).data);
    setComparison((await matchRes.json()).match);
    setLoading(false);
  }
  async function handleSaveEdit(updated: LedgerItem) {
    setLoading(true);
    if (editType === "ledger") {
      await fetch(`/api/ledger/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } else if (editType === "bank") {
      await fetch(`/api/bank-statement/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    }
    const [ledgerRes, bankRes, matchRes] = await Promise.all([
      fetch("/api/ledger/test"),
      fetch("/api/bank-statement"),
      fetch("/api/bank-statement/match"),
    ]);
    setLedger((await ledgerRes.json()).ledger);
    setBankRows((await bankRes.json()).data);
    setComparison((await matchRes.json()).match);
    setEditItem(null);
    setEditType(null);
    setRecentRefresh(Date.now());
    setLoading(false);
  }

  // Loader overlay
  if (status === "loading" || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-10 z-50 transition-all duration-300">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span className="text-white text-lg font-semibold tracking-wide">Loading...</span>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-950 to-gray-900 p-2 sm:p-4 md:p-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-8 gap-2 md:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow mb-1 sm:mb-2">
            🧾 Receipt Ledger Dashboard
          </h1>
          <p className="text-gray-300 text-base sm:text-lg">
            All your parsed receipts, bank statements, and matches in one place.
          </p>
        </div>
        <button
          onClick={() => signOut()}
          className="bg-gradient-to-r from-blue-700 to-indigo-900 text-white font-bold py-2 px-4 sm:px-6 rounded-xl shadow hover:scale-105 hover:bg-blue-800 transition text-base sm:text-lg"
        >
          Log Out
        </button>
      </div>

      {/* DASHBOARD LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* LEFT PANEL: Summary, Recent Imports, Add Ledger */}
        <div className="space-y-4 md:space-y-6 col-span-1">
          <div className="rounded-xl md:rounded-2xl shadow-lg p-3 md:p-6">
            <LedgerSummary ledger={ledger} comparison={comparison} />
          </div>
          <div className="rounded-xl md:rounded-2xl shadow-lg p-3 md:p-6 max-h-[220px] md:max-h-80 overflow-auto">
            <RecentImports refresh={recentRefresh} />
          </div>
          <div className=" rounded-xl md:rounded-2xl shadow-lg p-3 md:p-6">
            <AddLedgerForm onAdd={handleAddLedger} />
          </div>
        </div>

        {/* RIGHT PANEL: Ledger Table, Bank Statement, Comparison */}
        <div className="col-span-2 flex flex-col gap-4 md:gap-8">
          {/* Ledger Table */}
          <div className="bg-gray-900/80 rounded-xl md:rounded-2xl shadow-xl p-3 md:p-6">
            <h2 className="text-lg sm:text-2xl font-bold text-blue-300 mb-2 sm:mb-4 flex items-center gap-2">
              <span>📋</span> Ledger Entries
            </h2>
            {/* VERTICAL SCROLL */}
            <div className="w-full max-h-[320px] overflow-y-auto rounded-lg">
              <LedgerTable
                items={ledger}
                editable
                onEdit={item => { setEditItem(item); setEditType("ledger"); }}
                onDelete={handleDeleteLedger}
              />
            </div>
          </div>

          {/* Bank Statement and Upload */}
          <div className="bg-gray-900/80 rounded-xl md:rounded-2xl shadow-xl p-3 md:p-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-2">
              <h2 className="text-lg sm:text-2xl font-bold text-emerald-300 mb-1 sm:mb-2 flex items-center gap-2">
                <span>🏦</span> Bank Statement Data
              </h2>
              <div>
                <BankCsvUpload onUploaded={handleBankUploaded} />
              </div>
            </div>
            {/* VERTICAL SCROLL */}
            <div className="w-full max-h-[320px] overflow-y-auto rounded-lg">
              <LedgerTable
                items={bankRows}
                editable
                onEdit={item => { setEditItem(item); setEditType("bank"); }}
                onDelete={handleDeleteBank}
              />
            </div>
          </div>

          {/* Comparison */}
          <div className="bg-gray-900/90 rounded-xl md:rounded-2xl shadow-2xl p-3 md:p-6 max-h-[60vh] md:h-[430px] flex flex-col">
            <h2 className="text-lg sm:text-2xl font-bold text-indigo-300 mb-2 sm:mb-3 flex items-center gap-2">
              <span>🔍</span> Comparison Results
            </h2>
            <div className="overflow-y-auto flex flex-col gap-3 md:gap-4">
              <div className="bg-gray-800/60 rounded-xl p-2 md:p-3">
                <span className="font-semibold text-blue-200 mb-1 block">Matched Transactions:</span>
                <LedgerTable items={comparison?.matched ?? []} />
              </div>
              <div className="bg-gray-800/60 rounded-xl p-2 md:p-3">
                <span className="font-semibold text-emerald-200 mb-1 block">In Ledger Only:</span>
                <LedgerTable items={comparison?.ledgerOnly ?? []} />
              </div>
              <div className="bg-gray-800/60 rounded-xl p-2 md:p-3">
                <span className="font-semibold text-pink-200 mb-1 block">In Bank Only:</span>
                <LedgerTable items={comparison?.bankOnly ?? []} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditModal
        open={!!editItem}
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={handleSaveEdit}
      />
    </main>
  );
}

"use client";
import { useEffect, useState } from "react";

type IngestLog = {
  id: number;
  createdAt: string;
  status: string;
  message?: string | null;
  fileName?: string | null;
  ledgerId?: number | null;
  ledger?: any;
};

export default function RecentImports({ refresh = 0 }: { refresh?: number }) {
  const [logs, setLogs] = useState<IngestLog[]>([]);
  useEffect(() => {
    fetch("/api/ingest-log")
      .then(res => res.json())
      .then(data => setLogs(data.logs || []));
  }, [refresh]);

  return (
    <div className="bg-black dark:bg-gray-900 rounded-xl shadow p-3 sm:p-4 mb-4 sm:mb-6">
      <h2 className="font-bold text-base sm:text-lg mb-2">Recent Email Imports</h2>
      <div className="max-h-60 overflow-y-auto pr-2">
        <ul className="w-full">
          {logs.map(log =>
            <li
              key={log.id}
              className={`
                flex flex-col sm:flex-row items-start sm:items-center
                gap-1 sm:gap-2 mb-2
                break-all border-b border-gray-800 pb-1
              `}
            >
              <span>
                {log.status === "success" && "✅"}
                {log.status === "partial" && "🟡"}
                {log.status === "not_receipt" && "⚠️"}
                {log.status === "error" && "❌"}
              </span>
              <span className="font-mono text-xs truncate max-w-[120px] sm:max-w-[160px]">
                {log.fileName || "PDF"}
              </span>
              <span className="text-xs sm:text-sm flex-1 min-w-0 truncate">
                {log.message || "-"}
              </span>
              <span className="text-xs text-gray-400 sm:ml-auto">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

"use client";
import { useRef, useState } from "react";

export default function BankCsvUpload({ onUploaded }: { onUploaded: (result: any) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  function parseCsv(text: string) {
    const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headerLine = lines[0];
    const headers = headerLine.split(",").map(h => h.trim());
    return lines.slice(1)
      .map(line => {
        const fields = line.split(",").map(f => f.trim());
        if (fields.length !== headers.length) return null;
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = fields[i]; });
        return obj;
      }).filter(Boolean);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setError("Only CSV files are supported");
      return;
    }
    setError("");
    const text = await file.text();
    const rows = parseCsv(text);
    if (!rows.length) return setError("No valid data rows found in CSV.");
    // POST to server
    const res = await fetch("/api/bank-statement/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    if (res.ok) {
      const result = await res.json();
      onUploaded(result);
    } else {
      setError("Failed to upload");
    }
  }

  return (
    <div className="mb-8">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="block"
      />
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
}

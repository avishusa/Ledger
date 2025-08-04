"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password })
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed.");
      return;
    }
    router.push("/auth/signin");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-800 to-slate-900">
      <form
        onSubmit={handleRegister}
        className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl space-y-5 min-w-[320px] w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-2 text-center text-gray-900 dark:text-gray-100">Register</h1>
        <input
          type="text"
          placeholder="Name"
          className="w-full border border-gray-300 dark:border-gray-700 px-4 py-2 rounded mb-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full border border-gray-300 dark:border-gray-700 px-4 py-2 rounded mb-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border border-gray-300 dark:border-gray-700 px-4 py-2 rounded mb-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded font-semibold"
        >
          Register
        </button>
        <div className="text-center text-sm mt-2 text-gray-700 dark:text-gray-200">
          Already have an account?{" "}
          <a href="/auth/signin" className="text-indigo-700 dark:text-indigo-400 hover:underline">
            Sign In
          </a>
        </div>
      </form>
    </main>
  );
}

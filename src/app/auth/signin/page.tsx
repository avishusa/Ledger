"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid credentials.");
    } else {
      router.push("/");
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    // Triggers Google OAuth (redirects to Google's page)
    await signIn("google", { callbackUrl: "/" });
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-800 to-slate-900">
      <form
        onSubmit={handleSignIn}
        className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl space-y-5 min-w-[320px] w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-2 text-center text-gray-900 dark:text-gray-100">
          Sign In
        </h1>
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
          disabled={loading}
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>

        {/* --- Divider --- */}
        <div className="flex items-center my-2">
          <div className="flex-1 border-t border-gray-300 dark:border-gray-700" />
          <span className="mx-3 text-gray-500 dark:text-gray-400 text-sm">or</span>
          <div className="flex-1 border-t border-gray-300 dark:border-gray-700" />
        </div>

        {/* --- Google Sign In Button --- */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 font-semibold py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          disabled={loading}
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </button>

        <div className="text-center text-sm mt-2 text-gray-700 dark:text-gray-200">
          New?{" "}
          <a href="/auth/register" className="text-indigo-700 dark:text-indigo-400 hover:underline">
            Register
          </a>
        </div>
      </form>
    </main>
  );
}

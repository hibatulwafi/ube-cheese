"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Lock } from "lucide-react";
import { signInAdmin } from "@/lib/auth";

/**
 * Email admin diisikan dari env agar kasir cukup mengetik password.
 * Kolomnya tetap bisa diubah supaya admin lain masih bisa masuk.
 */
const DEFAULT_EMAIL = process.env.NEXT_PUBLIC_CASHIER_EMAIL ?? "";

export function CashierLogin() {
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password || isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    const result = await signInAdmin(email, password);
    // Kalau berhasil, AuthProvider akan me-render ulang halaman kasir,
    // jadi komponen ini keburu di-unmount — jangan setState lagi.
    if (!result.success) {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[60vh] h-[60vh] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[40vh] h-[40vh] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="bg-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative overflow-hidden border border-border/60"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-primary rounded-t-3xl" />

        <div className="flex flex-col items-center justify-center gap-2 mb-6 mt-2">
          <img src="/logo.png" alt="Ube Cashier Logo" className="h-16 w-auto object-contain drop-shadow-sm" />
          <p className="text-sm text-foreground/50 mt-2">Area khusus kasir</p>
        </div>

        <p className="text-foreground/60 mb-7 mt-4 text-sm">
          Masuk dengan akun admin untuk mengelola pesanan dan menu.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="text-sm font-semibold text-foreground/70 mb-1.5 block"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="kasir@ubecheese.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-sm font-semibold text-foreground/70 mb-1.5 block"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              role="alert"
              className="text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-xl px-4 py-3"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={!email.trim() || !password || isSubmitting}
            className={`w-full py-3.5 font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
              email.trim() && password && !isSubmitting
                ? "btn-primary-gradient text-white shadow-lg shadow-primary/25"
                : "bg-border text-muted cursor-not-allowed"
            }`}
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "Masuk"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

"use client";

import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { CashierLogin } from "@/components/CashierLogin";

/**
 * Gerbang untuk seluruh route /cashier.
 *
 * Ini murni lapisan UX: yang benar-benar menahan penyalahgunaan adalah
 * Firestore security rules, yang dievaluasi di server Google. Melewati
 * gerbang ini di browser tidak memberi akses tulis apa pun.
 */
export default function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!isAdmin) return <CashierLogin />;

  return <>{children}</>;
}

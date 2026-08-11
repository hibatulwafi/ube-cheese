"use client";

import { useEffect, useRef } from "react";

type UnsubFn = () => void;
type SubscribeFn = () => UnsubFn;

/**
 * Hook yang mendeteksi perubahan visibilitas tab/halaman.
 * Jika tab kembali aktif (visible), listener Firestore akan di-restart
 * agar data selalu fresh tanpa harus refresh manual.
 *
 * Ini menyelesaikan bug di browser mobile/tablet yang agresif men-suspend
 * koneksi WebSocket saat tab berada di background.
 */
export function useVisibilityReconnect(subscribe: SubscribeFn) {
  const unsubRef = useRef<UnsubFn | null>(null);

  useEffect(() => {
    // Subscribe pertama kali
    unsubRef.current = subscribe();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Tab kembali aktif — unsubscribe lama lalu buat listener baru
        unsubRef.current?.();
        unsubRef.current = subscribe();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubRef.current?.();
    };
  }, [subscribe]);
}

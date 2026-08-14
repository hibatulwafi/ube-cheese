"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import { Loader2 } from "lucide-react";

const STORE_DOC = "ubi-cheese/store";

const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

export default function ReceiptPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const snap = await getDoc(doc(db, `${STORE_DOC}/orders`, orderId));
      if (!snap.exists()) {
        setError("Pesanan tidak ditemukan.");
      } else {
        setOrder({ id: snap.id, ...snap.data() } as Order);
      }
    } catch (e) {
      setError("Gagal memuat struk. Coba lagi.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-gray-500" size={40} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500 font-bold">
        {error}
      </div>
    );
  }

  const createdAt = order.created_at?.toDate();

  return (
    <div className="receipt-page">
      {/* Print button — hanya tampil di layar, tersembunyi saat cetak */}
      <div className="no-print flex justify-center gap-3 p-4 bg-gray-100 border-b">
        <button
          onClick={() => window.print()}
          className="px-6 py-2.5 bg-gray-800 text-white font-bold rounded-xl text-sm hover:bg-gray-700 active:scale-95 transition-all"
        >
          🖨️ Cetak Struk
        </button>
        <button
          onClick={() => window.close()}
          className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-300 active:scale-95 transition-all"
        >
          ✕ Tutup
        </button>
      </div>

      {/* Struk */}
      <div className="receipt-container">
        {/* Header */}
        <div className="text-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Ube Cheese" className="receipt-logo h-10 mx-auto object-contain mb-1" />
          <p className="text-xs font-bold">Struk Pesanan</p>
        </div>

        <div className="divider" />

        {/* Info Order */}
        <div className="info-grid mb-2">
          <span>Tanggal</span>
          <span>{createdAt?.toLocaleDateString("id-ID") ?? "-"}</span>
          <span>Waktu</span>
          <span>{createdAt?.toLocaleTimeString("id-ID") ?? "-"}</span>
          <span>No Order</span>
          <span>#{order.id.slice(-5).toUpperCase()}</span>
          <span>Pelanggan</span>
          <span>{order.customer_name}</span>
        </div>

        <div className="divider" />

        {/* Items */}
        <div className="mb-2">
          {order.items.map((item, i) => (
            <div key={i} className="mb-1.5">
              <div className="font-bold">{item.name}</div>
              <div className="flex justify-between text-xs font-bold">
                <span>{item.quantity} x {formatRupiah(item.price)}</span>
                <span>{formatRupiah(item.price * item.quantity)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="divider" />

        {/* Total */}
        <div className="flex justify-between font-bold text-base mb-4">
          <span>TOTAL</span>
          <span>{formatRupiah(order.total_price)}</span>
        </div>

        <div className="divider" />

        {/* Footer */}
        <div className="text-center text-xs font-bold mt-2">
          <p>Terima kasih atas kunjungan Anda!</p>
          <p className="mt-1 font-bold">*** LUNAS ***</p>
        </div>
      </div>

      <style>{`
        .receipt-page {
          background: #f5f5f5;
          min-height: 100vh;
          font-family: 'Courier New', Courier, monospace;
        }
        .receipt-container {
          background: #fff;
          width: 80mm;
          margin: 20px auto;
          padding: 14px;
          box-sizing: border-box;
          font-size: 13px;
          /* Hitam murni — tanpa abu-abu sama sekali */
          color: #000;
          font-weight: 700;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12);
        }
        /* Semua turunan dipaksa hitam, apa pun class Tailwind-nya */
        .receipt-container * {
          color: #000;
        }
        /* Logo dijadikan siluet hitam pekat (PNG punya alpha, jadi aman) */
        .receipt-logo {
          filter: brightness(0) saturate(100%);
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .info-grid {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 2px 8px;
          font-size: 12px;
        }
        .info-grid span:nth-child(even) {
          text-align: right;
        }

        @media print {
          @page {
            size: 80mm 200mm;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff !important;
            /* Cegah browser menipiskan/menghaluskan warna saat cetak */
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .receipt-container {
            margin: 0;
            box-shadow: none;
            width: 80mm;
            font-size: 13px;
          }
          /*
            Printer thermal mengubah warna abu-abu jadi titik-titik jarang (dithering)
            sehingga teks terlihat pudar. Semua teks dipaksa hitam murni (#000) + tebal,
            ditambah text-stroke supaya garis huruf lebih padat.
          */
          .receipt-container,
          .receipt-container * {
            color: #000 !important;
            font-weight: 700 !important;
            -webkit-text-stroke: 0.35px #000;
            text-shadow: none !important;
            opacity: 1 !important;
          }
          .receipt-container .divider {
            border-top: 1px dashed #000 !important;
          }
          .receipt-logo {
            filter: brightness(0) saturate(100%) !important;
          }
        }
      `}</style>
    </div>
  );
}

import { Order, OrderStatus } from "@/types";

/**
 * Excel dengan locale Indonesia memakai titik koma sebagai pemisah kolom.
 * Memakai koma membuat semua data menumpuk di satu kolom saat file dibuka.
 */
const DELIMITER = ";";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Menunggu Verifikasi",
  paid: "Lunas",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export type ExportPeriod = "all" | "today" | "month";
export type ExportFormat = "summary" | "detail";

const pad = (n: number) => String(n).padStart(2, "0");
const fmtDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const fmtStamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

const shortId = (id: string) => `#${id.slice(-5).toUpperCase()}`;

/**
 * Bungkus satu sel agar aman di CSV.
 * Nilai yang diawali = + - @ diberi kutip tunggal supaya Excel tidak
 * menganggapnya rumus — nama pelanggan adalah input bebas dari pengunjung.
 */
const escapeCell = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (text.includes(DELIMITER) || text.includes('"') || /[\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

type Cell = string | number | null | undefined;

const toCsv = (headers: string[], rows: Cell[][]) =>
  [headers, ...rows].map((row) => row.map(escapeCell).join(DELIMITER)).join("\r\n");

/** Ambil hanya pesanan pada rentang waktu yang dipilih. */
export const filterOrdersByPeriod = (orders: Order[], period: ExportPeriod): Order[] => {
  if (period === "all") return orders;

  const now = new Date();
  return orders.filter((o) => {
    const d = o.created_at?.toDate();
    // Pesanan yang timestamp servernya belum tersinkron tidak bisa difilter per tanggal
    if (!d) return false;
    const sameMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    return period === "month" ? sameMonth : sameMonth && d.getDate() === now.getDate();
  });
};

const SUMMARY_HEADERS = [
  "No Order",
  "ID Pesanan",
  "Tanggal",
  "Waktu",
  "Pelanggan",
  "Status",
  "Jumlah Item",
  "Rincian Item",
  "Total (Rp)",
];

const DETAIL_HEADERS = [
  "No Order",
  "ID Pesanan",
  "Tanggal",
  "Waktu",
  "Pelanggan",
  "Status",
  "Nama Menu",
  "Harga Satuan (Rp)",
  "Qty",
  "Subtotal (Rp)",
  "Total Pesanan (Rp)",
];

/**
 * Susun isi CSV dari daftar pesanan.
 *
 * - `summary`: satu baris per pesanan, rincian item digabung dalam satu kolom.
 * - `detail`:  satu baris per item — cocok untuk pivot penjualan per menu.
 *
 * Nominal ditulis sebagai angka polos (tanpa "Rp" / titik ribuan) supaya
 * langsung bisa di-SUM di spreadsheet.
 */
export const buildOrdersCsv = (orders: Order[], format: ExportFormat): string => {
  if (format === "summary") {
    const rows: Cell[][] = orders.map((o) => {
      const d = o.created_at?.toDate();
      const items = o.items ?? [];
      return [
        shortId(o.id),
        o.id,
        d ? fmtDate(d) : "-",
        d ? fmtTime(d) : "-",
        o.customer_name,
        STATUS_LABEL[o.status] ?? o.status,
        items.reduce((n, it) => n + it.quantity, 0),
        items.map((it) => `${it.quantity}x ${it.name}`).join(", "),
        o.total_price,
      ];
    });
    return toCsv(SUMMARY_HEADERS, rows);
  }

  const rows: Cell[][] = orders.flatMap((o) => {
    const d = o.created_at?.toDate();
    const items = o.items ?? [];
    const base: Cell[] = [
      shortId(o.id),
      o.id,
      d ? fmtDate(d) : "-",
      d ? fmtTime(d) : "-",
      o.customer_name,
      STATUS_LABEL[o.status] ?? o.status,
    ];

    // Pesanan tanpa item tetap ditulis satu baris agar tidak hilang dari laporan
    if (items.length === 0) {
      return [[...base, "-", "", "", "", o.total_price]];
    }

    return items.map((it) => [
      ...base,
      it.name,
      it.price,
      it.quantity,
      it.price * it.quantity,
      o.total_price,
    ]);
  });

  return toCsv(DETAIL_HEADERS, rows);
};

const PERIOD_SLUG: Record<ExportPeriod, string> = {
  all: "semua",
  today: "harian",
  month: "bulanan",
};

export const buildCsvFilename = (period: ExportPeriod, format: ExportFormat) =>
  `pesanan-ube-cheese_${PERIOD_SLUG[period]}_${format === "detail" ? "detail" : "ringkasan"}_${fmtStamp(new Date())}.csv`;

/** Picu unduhan file CSV di browser. */
export const downloadCsv = (filename: string, csv: string) => {
  // BOM supaya Excel membaca file sebagai UTF-8 dan karakter non-ASCII tidak rusak
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

"use client";

import { useEffect, useState } from "react";
import { subscribeToMenus } from "@/lib/api";
import { MenuItem, OrderItem } from "@/types";
import { MenuCard } from "@/components/MenuCard";
import { Cart, CartItem } from "@/components/Cart";
import { motion, AnimatePresence } from "framer-motion";
import { createOrder } from "@/lib/api";
import { ensureCustomerSession } from "@/lib/auth";
import { ChevronLeft, ChevronRight, Loader2, UtensilsCrossed, Heart } from "lucide-react";

/** Menu ditampilkan empat per halaman dalam grid 2x2. */
const PAGE_SIZE = 4;

export default function CustomerHome() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckout, setIsCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [page, setPage] = useState(0);

  // Siapkan sesi anonim lebih awal supaya checkout tidak perlu menunggu login.
  useEffect(() => {
    ensureCustomerSession().catch((e: unknown) =>
      console.error("Gagal membuat sesi pelanggan:", e)
    );
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToMenus((newMenus) => {
      setMenus(newMenus);
      setLoadingMenus(false);
    });
    return () => unsubscribe();
  }, []);

  const totalPages = Math.max(1, Math.ceil(menus.length / PAGE_SIZE));
  // Halaman diturunkan, bukan disimpan mentah — kalau kasir menghapus menu
  // dan jumlah halaman menyusut, indeks lama tidak menyisakan layar kosong.
  const currentPage = Math.min(page, totalPages - 1);
  const visibleMenus = menus.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  const handleAddToCart = (menu: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === menu.id);
      if (existing) {
        return prev.map((item) =>
          item.id === menu.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: menu.id, name: menu.name, price: menu.price, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const handleRemove = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckoutProcess = async () => {
    if (!customerName.trim() || cart.length === 0) return;
    setIsSubmitting(true);

    const orderItems: OrderItem[] = cart.map((item) => ({
      menu_id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));

    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const result = await createOrder(customerName, orderItems, totalPrice);

    setIsSubmitting(false);

    if (result.success) {
      setOrderSuccess(true);
    } else {
      alert("Gagal membuat pesanan. Pastikan koneksi internet aktif.");
    }
  };

  const handleCloseSuccess = () => {
    setOrderSuccess(false);
    setIsCheckout(false);
    setCart([]);
    setCustomerName("");
  };

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-background">
      <header className="z-10 flex shrink-0 items-center justify-between gap-4 border-b border-border/60 px-5 py-4 glass md:px-8 md:py-5">
        <div className="flex items-center">
          <img src="/logo.png" alt="Ube Cheese Logo" className="h-8 md:h-10 w-auto object-contain drop-shadow-sm" />
        </div>
        <p className="hidden text-sm font-medium text-muted sm:block">
          Selamat datang! Silakan pilih pesanan Anda.
        </p>
      </header>

      {/* Tablet potret menumpuk (menu di atas, keranjang di bawah);
          mulai lg layarnya cukup lebar untuk berdampingan. */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row lg:gap-5 lg:p-5">
        <section className="flex min-h-0 flex-1 flex-col gap-3 lg:w-[62%]">
          {loadingMenus ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={40} />
            </div>
          ) : menus.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-muted">
              <UtensilsCrossed size={52} className="mb-4 opacity-40" />
              <p className="text-lg font-semibold">Belum ada menu tersedia.</p>
              <p className="mt-1 text-sm">Tambahkan menu di halaman Kasir.</p>
            </div>
          ) : (
            <>
              <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3 md:gap-4">
                {visibleMenus.map((menu) => (
                  <MenuCard
                    key={menu.id}
                    name={menu.name}
                    price={menu.price}
                    description={menu.description}
                    category={menu.category}
                    imageUrl={menu.image_url}
                    isAvailable={menu.is_available}
                    onAdd={() => handleAddToCart(menu)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  aria-label="Navigasi halaman menu"
                  className="flex shrink-0 items-center justify-center gap-4"
                >
                  <button
                    onClick={() => setPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    aria-label="Halaman sebelumnya"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm transition-all active:scale-95 hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        aria-label={`Halaman ${i + 1}`}
                        aria-current={i === currentPage ? "page" : undefined}
                        className={`h-2.5 rounded-full transition-all ${
                          i === currentPage
                            ? "w-7 bg-primary"
                            : "w-2.5 bg-primary/25 hover:bg-primary/45"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    aria-label="Halaman berikutnya"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm transition-all active:scale-95 hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card"
                  >
                    <ChevronRight size={20} />
                  </button>
                </nav>
              )}
            </>
          )}
        </section>

        <aside className="h-[42vh] shrink-0 lg:h-full lg:w-[38%]">
          <Cart
            items={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemove}
            onCheckout={() => setIsCheckout(true)}
          />
        </aside>
      </div>

      <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-[60vh] w-[60vh] rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[-10%] h-[40vh] w-[40vh] rounded-full bg-accent/10 blur-3xl" />

      <AnimatePresence>
        {isCheckout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 24 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className={`relative overflow-hidden rounded-3xl bg-card p-8 shadow-2xl transition-all duration-300 ${
                orderSuccess ? "w-[90vw] h-[90vh] max-w-[90vw] max-h-[90vh] flex flex-col" : "w-full max-w-md"
              }`}
            >
              <div className="absolute left-0 top-0 h-1 w-full btn-primary-gradient" />

              {orderSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col md:flex-row items-stretch gap-8 py-2 md:py-4 h-full w-full overflow-hidden"
                >
                  <div className="flex-1 text-center flex flex-col justify-between items-center order-2 md:order-1 h-full py-4">
                    <div className="flex flex-col items-center justify-center flex-1">
                      <div className="mb-6 flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-success-soft">
                        <svg className="h-10 w-10 md:h-12 md:w-12 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h2 className="mb-2 text-2xl md:text-4xl font-bold">Pesanan Diterima!</h2>
                      <p className="mb-8 text-muted md:text-xl max-w-md">
                        Silakan lakukan pembayaran QRIS dan tunjukkan bukti transfer ke kasir.
                      </p>
                    </div>
                    <button
                      onClick={handleCloseSuccess}
                      className="w-full md:w-auto px-8 md:px-16 py-4 text-lg font-bold text-white rounded-2xl btn-primary-gradient shadow-lg shadow-primary/25 active:scale-95 transition-all"
                    >
                      Selesai & Tutup
                    </button>
                  </div>
                  <div className="flex-1 w-full h-[45vh] md:h-full flex justify-center items-center bg-white rounded-3xl p-3 border-2 border-border shadow-sm order-1 md:order-2 overflow-hidden">
                    <img src="/qris-payment.jpeg" alt="QRIS Payment" className="w-full h-full object-contain rounded-2xl" />
                  </div>
                </motion.div>
              ) : (
                <>
                  <h2 className="mb-1 mt-2 text-3xl font-bold text-primary">Hampir Selesai!</h2>
                  <p className="mb-8 text-muted">Masukkan nama Anda untuk melanjutkan.</p>

                  <input
                    type="text"
                    placeholder="Nama Anda..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCheckoutProcess()}
                    className="mb-6 w-full rounded-2xl border-2 border-border px-6 py-4 text-lg font-medium transition-colors focus:border-primary focus:outline-none"
                    autoFocus
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsCheckout(false)}
                      disabled={isSubmitting}
                      className="flex-1 rounded-2xl py-4 font-semibold text-muted transition-colors hover:bg-background disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      disabled={!customerName.trim() || isSubmitting}
                      onClick={handleCheckoutProcess}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white transition-all active:scale-95 ${
                        customerName.trim() && !isSubmitting
                          ? "btn-primary-gradient shadow-lg shadow-primary/25"
                          : "cursor-not-allowed bg-border text-muted"
                      }`}
                    >
                      {isSubmitting ? <Loader2 size={22} className="animate-spin" /> : "Kirim Pesanan"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="z-10 shrink-0 text-center py-2.5 text-xs text-white/90 bg-primary font-medium flex items-center justify-center gap-1.5 print:hidden">
        Build with <Heart size={12} className="fill-white text-white animate-pulse" /> by Team IT Hiro Group | v.1.0.0
      </footer>
    </main>
  );
}

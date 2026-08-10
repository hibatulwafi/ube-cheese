"use client";

import { useEffect, useState } from "react";
import { subscribeToOrders, subscribeToMenus, updateOrderStatus, addMenu, updateMenu, deleteMenu } from "@/lib/api";
import { MenuItem, Order } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, UtensilsCrossed, Plus, Pencil, Trash2, CheckCircle, Printer, X, Loader2, ToggleLeft, ToggleRight, LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { signOutUser } from "@/lib/auth";
import { CategoryBadge } from "@/components/CategoryBadge";
import { CATEGORY_NAMES } from "@/lib/categories";
import Swal from "sweetalert2";

type ActiveTab = "orders" | "menus";

// Helper format Rupiah
const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

// Initial state untuk form menu
const emptyMenu: Omit<MenuItem, "id" | "created_at"> = {
  name: "",
  price: 0,
  description: "",
  category: "Makanan",
  image_url: "",
  is_available: true,
};

export default function CashierDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState(emptyMenu);
  const [isSaving, setIsSaving] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const unsubOrders = subscribeToOrders(setOrders);
    const unsubMenus = subscribeToMenus(setMenus);
    return () => {
      unsubOrders();
      unsubMenus();
    };
  }, []);

  const handleVerify = async (orderId: string) => {
    const result = await Swal.fire({
      title: "Verifikasi Pembayaran?",
      text: "Pastikan uang pembayaran sudah diterima.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Verifikasi",
      cancelButtonText: "Batal",
      confirmButtonColor: "#2f9e64",
      cancelButtonColor: "#8c7a75"
    });
    if (result.isConfirmed) {
      await updateOrderStatus(orderId, "paid");
      Swal.fire({
        title: "Berhasil!",
        text: "Pembayaran telah diverifikasi.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleCancel = async (orderId: string) => {
    const result = await Swal.fire({
      title: "Batalkan Pesanan?",
      text: "Pesanan ini akan dibatalkan secara permanen.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Batalkan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e63946",
      cancelButtonColor: "#8c7a75"
    });
    if (result.isConfirmed) {
      await updateOrderStatus(orderId, "cancelled");
      Swal.fire({
        title: "Dibatalkan!",
        text: "Pesanan telah dibatalkan.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleComplete = async (orderId: string) => {
    const result = await Swal.fire({
      title: "Tandai Selesai?",
      text: "Pesanan ini akan ditandai sebagai selesai.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Selesai",
      cancelButtonText: "Batal",
      confirmButtonColor: "#2f9e64",
      cancelButtonColor: "#8c7a75"
    });
    if (result.isConfirmed) {
      await updateOrderStatus(orderId, "completed");
      Swal.fire({
        title: "Selesai!",
        text: "Status pesanan telah diperbarui.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handlePrint = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
      setPrintingOrder(null);
    }, 100);
  };

  const handleOpenAddMenu = () => {
    setEditingMenu(null);
    setMenuForm(emptyMenu);
    setShowMenuModal(true);
  };

  const handleOpenEditMenu = (menu: MenuItem) => {
    setEditingMenu(menu);
    setMenuForm({
      name: menu.name,
      price: menu.price,
      description: menu.description,
      category: menu.category,
      image_url: menu.image_url || "",
      is_available: menu.is_available,
    });
    setShowMenuModal(true);
  };

  const handleDeleteMenu = async (menuId: string) => {
    const result = await Swal.fire({
      title: "Hapus Menu?",
      text: "Tindakan ini tidak dapat dibatalkan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e63946",
      cancelButtonColor: "#8c7a75"
    });
    if (result.isConfirmed) {
      await deleteMenu(menuId);
      Swal.fire({
        title: "Terhapus!",
        text: "Menu telah dihapus.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleToggleAvailability = async (menu: MenuItem) => {
    await updateMenu(menu.id, { is_available: !menu.is_available });
  };

  const handleSaveMenu = async () => {
    if (!menuForm.name.trim() || menuForm.price <= 0) return;
    setIsSaving(true);
    if (editingMenu) {
      await updateMenu(editingMenu.id, menuForm);
    } else {
      await addMenu(menuForm);
    }
    setIsSaving(false);
    setShowMenuModal(false);
  };

  const pendingOrders = orders.filter((o) => o.status === "pending_payment");

  return (
    <>
      <div className="print:hidden h-dvh bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-card border-r border-border flex flex-col shrink-0 transition-all">
        <div className="p-4 lg:p-6 border-b border-border">
          <div className="flex items-center justify-center lg:justify-start">
            <img src="/logo.png" alt="Ube Cashier Logo" className="h-8 lg:h-10 w-auto object-contain drop-shadow-sm" />
          </div>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-3 rounded-2xl font-semibold transition-all relative ${
              activeTab === "orders"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-muted hover:bg-primary-soft"
            }`}
          >
            <ClipboardList size={20} className="shrink-0" />
            <span className="hidden lg:inline">Pesanan Masuk</span>
            {pendingOrders.length > 0 && (
              <span className={`lg:ml-auto absolute lg:static top-1.5 right-1.5 px-2 py-0.5 text-xs font-bold rounded-full ${activeTab === "orders" ? "bg-white/25 text-white" : "bg-primary/10 text-primary"}`}>
                {pendingOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("menus")}
            className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-3 rounded-2xl font-semibold transition-all relative ${
              activeTab === "menus"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-muted hover:bg-primary-soft"
            }`}
          >
            <UtensilsCrossed size={20} className="shrink-0" />
            <span className="hidden lg:inline">Kelola Menu</span>
          </button>
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center justify-center lg:justify-start gap-2 px-3 lg:px-4 py-2.5 bg-success-soft rounded-xl border border-success/20">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/70 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            <span className="hidden lg:inline text-xs font-semibold text-success">Realtime Active</span>
          </div>

          <div className="px-1">
            <p className="hidden lg:block text-xs text-muted truncate" title={user?.email ?? ""}>
              {user?.email}
            </p>
            <button
              onClick={() => signOutUser()}
              title="Keluar"
              className="mt-2 w-full flex items-center justify-center lg:justify-start gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-muted hover:bg-primary-soft hover:text-primary transition-colors"
            >
              <LogOut size={16} className="shrink-0" />
              <span className="hidden lg:inline">Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 md:px-8 py-4 md:py-6 border-b border-border bg-card/60 backdrop-blur-md shrink-0">
              <h1 className="text-2xl font-bold">Pesanan Masuk</h1>
              <p className="text-sm text-muted mt-0.5">Pesanan akan muncul otomatis saat pelanggan mengirim.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              {orders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted/70">
                  <ClipboardList size={56} className="mb-4 opacity-40" />
                  <p className="text-xl font-medium">Belum ada pesanan</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                  <AnimatePresence>
                    {orders.map((order) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* Color bar */}
                        <div className={`h-1.5 w-full ${order.status === "pending_payment" ? "bg-accent" : order.status === "cancelled" ? "bg-red-500" : order.status === "completed" ? "bg-slate-400" : "bg-success"}`} />

                        <div className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-bold text-base">#{order.id.slice(-5).toUpperCase()}</h3>
                              <p className="text-primary font-semibold">{order.customer_name}</p>
                              <p className="text-xs text-muted mt-0.5">
                                {order.created_at?.toDate().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) || "Baru saja"}
                              </p>
                            </div>
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                              order.status === "pending_payment"
                                ? "bg-accent-soft text-accent"
                                : order.status === "cancelled"
                                ? "bg-red-100 text-red-600"
                                : order.status === "completed"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-success-soft text-success"
                            }`}>
                              {order.status === "pending_payment" ? "Cek Bayar" : order.status === "cancelled" ? "Batal" : order.status === "completed" ? "Selesai" : "Lunas ✓"}
                            </span>
                          </div>

                          <div className="space-y-1.5 mb-4 py-3 border-y border-border/50">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-foreground/80">{item.quantity}× {item.name}</span>
                                <span className="font-medium">{formatRupiah(item.price * item.quantity)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary text-lg">{formatRupiah(order.total_price)}</span>

                            {order.status === "pending_payment" ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleCancel(order.id)}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-sm font-bold active:scale-95 transition-all"
                                  title="Batalkan Pesanan"
                                >
                                  <X size={16} />
                                </button>
                                <button
                                  onClick={() => handleVerify(order.id)}
                                  className="flex items-center gap-1.5 px-4 py-2 btn-primary-gradient text-white rounded-xl text-sm font-bold active:scale-95 transition-all shadow-sm"
                                >
                                  <CheckCircle size={16} />
                                  Verifikasi
                                </button>
                              </div>
                            ) : order.status === "paid" ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleComplete(order.id)}
                                  className="px-4 py-2 bg-success text-white rounded-xl text-sm font-bold active:scale-95 transition-all shadow-sm"
                                >
                                  Selesai
                                </button>
                                <button
                                  onClick={() => handlePrint(order)}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-white rounded-xl text-sm font-bold hover:bg-foreground/85 active:scale-95 transition-all shadow-sm"
                                >
                                  <Printer size={16} />
                                  Struk
                                </button>
                              </div>
                            ) : order.status === "completed" ? (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-sm font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">Selesai ✓</span>
                                <button
                                  onClick={() => handlePrint(order)}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-white rounded-xl text-sm font-bold hover:bg-foreground/85 active:scale-95 transition-all shadow-sm"
                                  title="Cetak Ulang Struk"
                                >
                                  <Printer size={16} />
                                  Struk
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">Dibatalkan</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Menus Tab */}
        {activeTab === "menus" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 md:px-8 py-4 md:py-6 border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
              <div>
                <h1 className="text-2xl font-bold">Kelola Menu</h1>
                <p className="text-sm text-muted mt-0.5">{menus.length} menu tersedia</p>
              </div>
              <button
                onClick={handleOpenAddMenu}
                className="flex items-center gap-2 px-5 py-2.5 btn-primary-gradient text-white rounded-xl font-bold active:scale-95 transition-all shadow-md shadow-primary/20"
              >
                <Plus size={20} />
                Tambah Menu
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              {menus.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted/70">
                  <UtensilsCrossed size={56} className="mb-4 opacity-40" />
                  <p className="text-xl font-medium">Belum ada menu</p>
                  <p className="text-sm mt-2">Klik &quot;Tambah Menu&quot; untuk memulai.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                  {menus.map((menu) => (
                    <div key={menu.id} className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 pr-2">
                          <h3 className="font-bold text-base">{menu.name}</h3>
                          <CategoryBadge category={menu.category} className="mt-1.5" />
                        </div>
                        <span className="font-bold text-primary text-lg shrink-0">{formatRupiah(menu.price)}</span>
                      </div>

                      <p className="text-sm text-muted mb-4 line-clamp-2">{menu.description}</p>

                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <button
                          onClick={() => handleToggleAvailability(menu)}
                          className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                            menu.is_available ? "text-success" : "text-muted"
                          }`}
                        >
                          {menu.is_available ? (
                            <ToggleRight size={24} />
                          ) : (
                            <ToggleLeft size={24} />
                          )}
                          {menu.is_available ? "Tersedia" : "Habis"}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditMenu(menu)}
                            className="p-2 text-foreground/70 hover:bg-background rounded-xl transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteMenu(menu.id)}
                            className="p-2 text-primary/70 hover:bg-primary-soft rounded-xl transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Menu Modal */}
      <AnimatePresence>
        {showMenuModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-foreground/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="bg-card rounded-3xl p-8 w-full max-w-lg shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-primary rounded-t-3xl" />

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-primary">
                  {editingMenu ? "Edit Menu" : "Tambah Menu Baru"}
                </h2>
                <button onClick={() => setShowMenuModal(false)} className="p-2 text-muted hover:bg-primary-soft rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground/80 mb-1.5 block">Nama Menu *</label>
                  <input
                    type="text"
                    placeholder="cth: Ube Lumer Keju"
                    value={menuForm.name}
                    onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground/80 mb-1.5 block">Harga (Rp) *</label>
                    <input
                      type="number"
                      placeholder="15000"
                      value={menuForm.price || ""}
                      onChange={(e) => setMenuForm({ ...menuForm, price: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground/80 mb-1.5 block">Kategori</label>
                    <select
                      value={menuForm.category}
                      onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none transition-colors bg-card"
                    >
                      {CATEGORY_NAMES.map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground/80 mb-1.5 block">Deskripsi</label>
                  <textarea
                    placeholder="Deskripsi singkat menu..."
                    value={menuForm.description}
                    onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground/80 mb-1.5 block">URL Foto (opsional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={menuForm.image_url}
                    onChange={(e) => setMenuForm({ ...menuForm, image_url: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMenuForm({ ...menuForm, is_available: !menuForm.is_available })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${menuForm.is_available ? "bg-primary" : "bg-border"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-card rounded-full shadow transition-transform ${menuForm.is_available ? "translate-x-7" : "translate-x-1"}`} />
                  </button>
                  <span className="text-sm font-semibold text-foreground/80">
                    {menuForm.is_available ? "Menu tersedia" : "Menu tidak tersedia (habis)"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowMenuModal(false)}
                  className="flex-1 py-3 font-semibold text-muted hover:bg-primary-soft rounded-2xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveMenu}
                  disabled={!menuForm.name.trim() || menuForm.price <= 0 || isSaving}
                  className={`flex-1 py-3 font-bold text-white rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    menuForm.name.trim() && menuForm.price > 0 && !isSaving
                      ? "btn-primary-gradient shadow-lg shadow-primary/25"
                      : "bg-border cursor-not-allowed"
                  }`}
                >
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : (editingMenu ? "Simpan Perubahan" : "Tambahkan Menu")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Thermal Receipt Print Layout */}
    {printingOrder && (
      <div className="hidden print:block absolute inset-0 bg-white text-black font-mono text-sm p-4 z-[9999] print-receipt-container">
        <div className="text-center mb-4">
          <img src="/logo.png" alt="Ube Cheese Logo" className="h-10 mx-auto object-contain grayscale mb-1" />
          <p className="text-xs">Struk Pesanan</p>
        </div>

        <div className="border-b border-dashed border-black pb-2 mb-2 text-xs">
          <div className="flex justify-between">
            <span>Tanggal:</span>
            <span>{printingOrder.created_at?.toDate().toLocaleDateString("id-ID")}</span>
          </div>
          <div className="flex justify-between">
            <span>Waktu:</span>
            <span>{printingOrder.created_at?.toDate().toLocaleTimeString("id-ID")}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>No Order:</span>
            <span>#{printingOrder.id.slice(-5).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>Pelanggan:</span>
            <span>{printingOrder.customer_name}</span>
          </div>
        </div>

        <div className="border-b border-dashed border-black pb-2 mb-2">
          {printingOrder.items.map((item, i) => (
            <div key={i} className="mb-1 text-sm">
              <div>{item.name}</div>
              <div className="flex justify-between text-xs">
                <span>{item.quantity} x {formatRupiah(item.price)}</span>
                <span>{formatRupiah(item.price * item.quantity)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between font-bold text-base mb-6 border-b border-dashed border-black pb-2">
          <span>TOTAL</span>
          <span>{formatRupiah(printingOrder.total_price)}</span>
        </div>

        <div className="text-center text-xs">
          <p>Terima kasih atas kunjungan Anda!</p>
          <p className="mt-1">*** LUNAS ***</p>
        </div>
      </div>
    )}
  </>
  );
}

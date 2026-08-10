import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export function Cart({ items, onUpdateQuantity, onRemove, onCheckout }: CartProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
      <div className="relative shrink-0 overflow-hidden btn-primary-gradient px-5 py-4 text-white md:px-6 md:py-5">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold md:text-xl">
            <ShoppingCart size={22} />
            Keranjang
          </h2>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
            {totalItems} item
          </span>
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3 md:p-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
              <ShoppingCart size={28} className="text-primary/40" />
            </div>
            <p className="text-sm font-medium">Belum ada pesanan.</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background p-3"
            >
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-bold text-foreground md:text-base">
                  {item.name}
                </h4>
                <p className="text-sm font-semibold text-primary">
                  {rupiah(item.price)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  aria-label={`Kurangi ${item.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-primary transition-all active:scale-90 hover:bg-primary hover:text-white"
                >
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  aria-label={`Tambah ${item.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-primary transition-all active:scale-90 hover:bg-primary hover:text-white"
                >
                  <Plus size={14} />
                </button>
              </div>

              <button
                onClick={() => onRemove(item.id)}
                aria-label={`Hapus ${item.name}`}
                className="shrink-0 rounded-xl p-1.5 text-muted transition-colors hover:bg-primary-soft hover:text-primary"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-background p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <span className="text-sm font-medium text-muted">Total Pembayaran</span>
          <span className="text-xl font-black text-primary md:text-2xl">
            {rupiah(total)}
          </span>
        </div>

        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className={`w-full rounded-full py-3.5 text-base font-bold transition-all active:scale-95 md:py-4 md:text-lg ${
            items.length > 0
              ? "btn-primary-gradient text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
              : "cursor-not-allowed bg-border text-muted"
          }`}
        >
          Lanjut ke Pembayaran
        </button>
      </div>
    </div>
  );
}

import { Cookie, CupSoda, Package, UtensilsCrossed, type LucideIcon } from "lucide-react";

export interface CategoryStyle {
  label: string;
  icon: LucideIcon;
  /** Kelas Tailwind untuk badge kategori. */
  badge: string;
  /** Kelas untuk latar area gambar saat menu tidak punya foto. */
  placeholder: string;
}

/**
 * Kategori dipakai bersama oleh halaman pelanggan dan kasir.
 * Warnanya sengaja diambil dari token tema yang sudah ada supaya
 * paletnya tetap satu keluarga, tidak jadi pelangi.
 */
export const CATEGORIES: Record<string, CategoryStyle> = {
  Makanan: {
    label: "Makanan",
    icon: UtensilsCrossed,
    badge: "bg-primary-soft text-primary",
    placeholder: "bg-primary-soft text-primary/40",
  },
  Minuman: {
    label: "Minuman",
    icon: CupSoda,
    badge: "bg-success-soft text-success",
    placeholder: "bg-success-soft text-success/40",
  },
  Cemilan: {
    label: "Cemilan",
    icon: Cookie,
    badge: "bg-accent-soft text-accent",
    placeholder: "bg-accent-soft text-accent/50",
  },
  Paket: {
    label: "Paket",
    icon: Package,
    badge: "bg-foreground/10 text-foreground/70",
    placeholder: "bg-foreground/5 text-foreground/30",
  },
};

export const CATEGORY_NAMES = Object.keys(CATEGORIES);

/** Kategori di Firestore hanyalah string bebas, jadi selalu sediakan cadangan. */
export function getCategoryStyle(category: string): CategoryStyle {
  return (
    CATEGORIES[category] ?? {
      label: category || "Lainnya",
      icon: UtensilsCrossed,
      badge: "bg-foreground/10 text-foreground/70",
      placeholder: "bg-foreground/5 text-foreground/30",
    }
  );
}

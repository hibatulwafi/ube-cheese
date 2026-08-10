"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { getCategoryStyle } from "@/lib/categories";
import { CategoryBadge } from "./CategoryBadge";

interface MenuCardProps {
  name: string;
  price: number;
  description: string;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  onAdd: () => void;
}

export function MenuCard({
  name,
  price,
  description,
  category,
  imageUrl,
  isAvailable,
  onAdd,
}: MenuCardProps) {
  const { icon: CategoryIcon, placeholder } = getCategoryStyle(category);
  // URL foto diketik manual oleh kasir dan host-nya bisa saja belum terdaftar
  // di next.config.ts. Kalau gagal dimuat, jatuh ke ikon kategori — satu URL
  // salah tidak boleh merusak tampilan menu.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;
  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);

  return (
    <div className="group relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-warm">
      {/* Area gambar memakai flex-1 supaya kartu ikut mengecil di layar
          pendek — grid 2x2 tetap muat tanpa memunculkan scroll. */}
      <div className={`relative min-h-0 flex-1 overflow-hidden ${placeholder}`}>
        {showImage ? (
          <Image
            src={imageUrl!}
            alt={name}
            fill
            sizes="(max-width: 1024px) 50vw, 33vw"
            onError={() => setImageFailed(true)}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <CategoryIcon size={40} strokeWidth={1.5} className="opacity-70" />
          </div>
        )}

        <CategoryBadge
          category={category}
          className="absolute left-3 top-3 z-10 shadow-sm backdrop-blur-sm"
        />

        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/45 backdrop-blur-[2px]">
            <span className="rounded-full bg-card px-4 py-1.5 text-sm font-bold text-foreground shadow">
              Habis
            </span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1 p-3.5 md:p-4">
        <h3 className="truncate text-base font-bold text-foreground md:text-lg">
          {name}
        </h3>
        <p className="line-clamp-1 text-xs text-muted md:text-sm">
          {description}
        </p>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-base font-black text-primary md:text-lg">
            {formattedPrice}
          </span>

          <button
            onClick={onAdd}
            disabled={!isAvailable}
            aria-label={`Tambah ${name}`}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition-all active:scale-95 md:px-4 ${
              isAvailable
                ? "btn-primary-gradient text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30"
                : "cursor-not-allowed bg-border text-muted"
            }`}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Tambah</span>
          </button>
        </div>
      </div>
    </div>
  );
}

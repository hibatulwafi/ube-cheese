import { getCategoryStyle } from "@/lib/categories";

interface CategoryBadgeProps {
  category: string;
  /** Kelas tambahan untuk penempatan, mis. posisi absolut di atas foto menu. */
  className?: string;
  size?: number;
}

export function CategoryBadge({ category, className = "", size = 13 }: CategoryBadgeProps) {
  const { label, icon: Icon, badge } = getCategoryStyle(category);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${badge} ${className}`}
    >
      <Icon size={size} strokeWidth={2.5} />
      {label}
    </span>
  );
}

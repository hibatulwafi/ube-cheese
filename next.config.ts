import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * `next/image` menolak host yang tidak terdaftar di sini — URL asing
     * membuat optimizer menjawab 400 dan foto menu gagal tampil.
     *
     * Daftar ini sengaja tidak memakai wildcard `**`: mengizinkan semua host
     * berarti server ini bisa dipakai orang lain sebagai proxy gambar gratis.
     * Tambahkan host baru di sini kalau pindah penyedia.
     */
    remotePatterns: [
      // Firebase Storage (butuh paket Blaze).
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "*.firebasestorage.app" },
      // Layanan gambar gratis yang umum dipakai.
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "ik.imagekit.io" },
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "i.ibb.co.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;

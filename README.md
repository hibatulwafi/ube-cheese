This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

> **Dokumentasi lengkap aplikasi POS ada di [DOCS.md](DOCS.md)** — arsitektur,
> model data, aturan keamanan, setup dari nol, penyimpanan gambar, dan
> penyelesaian masalah.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Mengaktifkan login kasir

Halaman `/` (pelanggan) terbuka untuk umum, sedangkan `/cashier` hanya boleh
diakses akun admin. Yang benar-benar menahan akses adalah `firestore.rules`,
bukan tampilan di browser — melewati layar login tidak memberi hak tulis apa pun.

Aktivasi cukup dua langkah:

**1. Nyalakan Authentication di Firebase Console** (sekali saja, tidak bisa lewat CLI)

Buka [Authentication](https://console.firebase.google.com/project/input-icip/authentication)
→ **Get started**, lalu di tab **Sign-in method** aktifkan dua provider:

| Provider | Dipakai untuk |
| --- | --- |
| Email/Password | login kasir di `/cashier` |
| Anonymous | sesi pelanggan agar boleh mengirim pesanan |

**2. Buat akun admin dan aktifkan rules**

```bash
npm run setup:admin -- kasir@ubicheese.id <password>
```

Perintah ini mendaftarkan akun, menulis dokumen penanda `admins/<uid>`, lalu
men-deploy `firestore.rules`. Urutannya disengaja: kalau rules ketat aktif
sebelum ada admin, tidak ada satu pun akun yang bisa masuk ke `/cashier`.

Untuk menambah admin lain, jalankan perintah yang sama dengan email berbeda.
Menonaktifkan seorang admin cukup dengan menghapus dokumen `admins/<uid>` —
akunnya tetap ada tapi kehilangan seluruh hak tulis.

Kalau rules diubah tanpa menyentuh akun:

```bash
npm run deploy:rules
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

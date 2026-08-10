# Ubi Cheese POS — Dokumentasi

Aplikasi kasir dua sisi untuk warung Ubi Cheese. Pelanggan memesan sendiri lewat
tablet, kasir memverifikasi pembayaran dan mengelola menu. Keduanya tersambung
realtime lewat Firestore, jadi pesanan muncul di layar kasir tanpa perlu refresh.

- [Arsitektur](#arsitektur)
- [Struktur folder](#struktur-folder)
- [Model data](#model-data)
- [Keamanan](#keamanan)
- [Setup dari nol](#setup-dari-nol)
- [Menjalankan](#menjalankan)
- [Alur pemakaian](#alur-pemakaian)
- [Penyimpanan gambar menu](#penyimpanan-gambar-menu)
- [Kustomisasi](#kustomisasi)
- [Deploy](#deploy)
- [Masalah yang sering muncul](#masalah-yang-sering-muncul)

---

## Arsitektur

| Bagian | Teknologi |
| --- | --- |
| Framework | Next.js 16.3 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, framer-motion, lucide-react |
| Database | Cloud Firestore (realtime listener) |
| Autentikasi | Firebase Authentication (anonim + email/password) |
| Project Firebase | `input-icip` |

Tidak ada server backend sendiri. Browser berbicara langsung ke Firestore, dan
**Firestore Security Rules yang menjadi satu-satunya lapisan otorisasi.** Ini
penting untuk dipahami sebelum mengubah apa pun: layar login di `/cashier` hanya
pengatur tampilan. Orang yang mengakali JavaScript di browser tetap tidak bisa
menulis apa pun, karena rules dievaluasi di server Google.

Ada dua halaman:

| Route | Untuk siapa | Akses |
| --- | --- | --- |
| `/` | Pelanggan | Terbuka umum, login anonim otomatis |
| `/cashier` | Kasir / admin | Wajib login email + password, dan terdaftar sebagai admin |

---

## Struktur folder

```
src/
├── app/
│   ├── layout.tsx           root layout, membungkus semua halaman dengan AuthProvider
│   ├── globals.css          palet warna & utilitas (sumber semua warna aplikasi)
│   ├── page.tsx             halaman pelanggan: grid menu 2x2 + keranjang + checkout
│   └── cashier/
│       ├── layout.tsx       gerbang: tampilkan login kalau belum admin
│       └── page.tsx         dasbor kasir: pesanan masuk + kelola menu
├── components/
│   ├── AuthProvider.tsx     context { user, isAdmin, loading }
│   ├── CashierLogin.tsx     form login kasir
│   ├── MenuCard.tsx         kartu menu di halaman pelanggan
│   ├── CategoryBadge.tsx    badge kategori + ikon (dipakai dua halaman)
│   └── Cart.tsx             keranjang belanja
├── lib/
│   ├── firebase.ts          inisialisasi Firebase (app, db, auth, storage)
│   ├── auth.ts              login anonim, login admin, cek hak admin
│   ├── api.ts               semua operasi Firestore (menu & pesanan)
│   └── categories.ts        daftar kategori + ikon + warnanya
└── types/index.ts           tipe MenuItem, Order, OrderItem, OrderStatus

firestore.rules              aturan keamanan — lapisan otorisasi sesungguhnya
scripts/setup-admin.mjs      buat akun admin lalu deploy rules
scripts/finish-setup.mjs     tunggu Auth aktif, nyalakan provider, panggil setup-admin
```

---

## Model data

Semua data toko berada di bawah dokumen `ubi-cheese/store`.

### `ubi-cheese/store/menus/{menuId}`

| Field | Tipe | Catatan |
| --- | --- | --- |
| `name` | string | wajib, 1–100 karakter |
| `price` | number | wajib, ≥ 0 |
| `description` | string | maks. 500 karakter |
| `category` | string | `Makanan`, `Minuman`, `Cemilan`, atau `Paket` |
| `image_url` | string | opsional, boleh kosong |
| `is_available` | boolean | `false` menandai menu habis |
| `created_at` | timestamp | diisi `serverTimestamp()` |

### `ubi-cheese/store/orders/{orderId}`

| Field | Tipe | Catatan |
| --- | --- | --- |
| `customer_name` | string | diketik pelanggan saat checkout |
| `items` | array | salinan nama & harga saat memesan |
| `total_price` | number | dihitung di klien, divalidasi rules |
| `status` | string | lihat tabel di bawah |
| `created_by` | string | uid sesi anonim pelanggan |
| `created_at` | timestamp | dipakai untuk mengurutkan |

`items` sengaja menyimpan salinan nama dan harga, bukan sekadar referensi ke
menu. Kalau kasir menaikkan harga besok, struk pesanan kemarin tidak ikut berubah.

**Status pesanan.** Tipe dan rules mengizinkan empat nilai, tapi antarmuka kasir
saat ini hanya memakai dua yang pertama:

| Status | Arti | Dipakai UI? |
| --- | --- | --- |
| `pending_payment` | baru masuk, menunggu verifikasi kasir | ya |
| `paid` | kasir sudah memverifikasi pembayaran | ya |
| `completed` | pesanan selesai diserahkan | belum |
| `cancelled` | pesanan dibatalkan | belum |

Dua status terakhir sudah didukung rules, jadi menambahkan tombolnya di UI tidak
perlu menyentuh keamanan.

### `admins/{uid}`

Keberadaan dokumen inilah yang menentukan seseorang admin atau bukan. Isinya
hanya penanda (`email`, `created_at`); yang dibaca rules adalah **ada atau
tidaknya dokumen**. Koleksi ini terkunci total dari browser — lihat di bawah.

---

## Keamanan

Dua fungsi di [firestore.rules](firestore.rules) menjadi dasar semua aturan:

```
function isSignedIn() {
  return request.auth != null;
}

function isAdmin() {
  return isSignedIn()
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
```

Ringkasan hak akses:

| Operasi | Siapa yang boleh |
| --- | --- |
| Baca menu | siapa saja (etalase publik) |
| Tambah / ubah / hapus menu | admin |
| Baca daftar pesanan | admin |
| Buat pesanan | siapa pun yang punya sesi, dan `created_by` harus uid sendiri |
| Ubah status pesanan | admin, dan **hanya** field `status` |
| Hapus pesanan | tidak ada |
| Tulis ke `admins/*` | tidak ada |

Tiga keputusan yang perlu diingat saat mengubah rules:

**Admin tidak bisa mengangkat dirinya sendiri.** `admins/{uid}` memakai
`allow write: if false`, jadi satu-satunya cara menambah admin adalah lewat
Console atau `npm run setup:admin` yang berjalan dengan kredensial IAM.

**Kasir tidak bisa mengubah harga pesanan.** Update pesanan disaring dengan
`diff(resource.data).affectedKeys().hasOnly(['status'])`, sehingga total dan isi
keranjang terkunci setelah pesanan dibuat.

**Pesanan tidak bisa diatasnamakan orang lain.** Rules mensyaratkan
`created_by == request.auth.uid`.

Menonaktifkan seorang admin cukup dengan menghapus dokumen `admins/<uid>`.
Akunnya tetap ada tapi kehilangan seluruh hak tulis seketika.

> **Catatan biaya.** `exists()` di rules dihitung sebagai satu operasi baca per
> permintaan tulis. Untuk skala warung ini tidak terasa. Kalau nanti ramai,
> memindahkan penanda admin ke custom claims menghilangkan baca tersebut, tapi
> butuh Firebase Admin SDK.

---

## Setup dari nol

### 1. Variabel lingkungan

Salin `.env.example` menjadi `.env.local` lalu isi dari Firebase Console
(Project settings → Your apps):

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Email yang otomatis terisi di form login /cashier
NEXT_PUBLIC_CASHIER_EMAIL="kasir@ubicheese.id"
```

Semua nilai berawalan `NEXT_PUBLIC_` ikut terkirim ke browser. Itu wajar untuk
Firebase — keamanannya bertumpu pada security rules, bukan pada kerahasiaan
API key.

### 2. Aktifkan Authentication

Buka Console → **Authentication** → **Get started**, lalu aktifkan dua provider:

| Provider | Dipakai untuk |
| --- | --- |
| Email/Password | login kasir |
| Anonymous | sesi pelanggan agar boleh mengirim pesanan |

Langkah ini **tidak bisa dijalankan lewat CLI**. Endpoint API-nya
(`identityPlatform:initializeAuth`) menolak dengan `BILLING_NOT_ENABLED` di paket
gratis, sedangkan tombol di Console memakai jalur gratis yang tidak diekspos ke
publik.

### 3. Buat admin dan aktifkan rules

```bash
npm install
npm run setup:admin -- kasir@ubicheese.id <password>
```

Perintah ini mendaftarkan akun, menulis `admins/<uid>`, lalu men-deploy
`firestore.rules`. **Urutannya disengaja** — kalau rules ketat aktif sebelum ada
admin, tidak ada satu pun akun yang bisa masuk ke `/cashier`.

Script memakai kredensial `firebase login` yang sudah ada, jadi tidak perlu
service-account key. Untuk menambah admin lain, jalankan lagi dengan email
berbeda.

Kalau ingin script menunggu sampai Anda menekan tombol di Console lalu
menyelesaikan semuanya sendiri:

```bash
npm run finish:setup -- kasir@ubicheese.id <password> 25
```

---

## Menjalankan

```bash
npm run dev            # http://localhost:3000
npm run build          # build produksi
npm run lint           # eslint
npm run deploy:rules   # deploy firestore.rules saja
```

---

## Alur pemakaian

**Pelanggan** membuka `/`, dapat sesi anonim otomatis, memilih menu (empat per
halaman), lalu checkout dengan mengisi nama. Pesanan tersimpan dengan status
`pending_payment` dan muncul seketika di layar kasir.

**Kasir** membuka `/cashier`, login, lalu melihat tab **Pesanan Masuk**. Setelah
pembayaran QRIS diverifikasi, tekan **Verifikasi** untuk mengubah status jadi
`paid`, lalu **Cetak Struk** bila perlu. Tab **Kelola Menu** dipakai untuk
menambah, mengubah, menandai habis, atau menghapus menu.

---

## Penyimpanan gambar menu

Form kasir menerima **URL** gambar, bukan file. Jadi pertanyaannya: URL itu
sebaiknya menunjuk ke mana?

**Firebase Storage tidak tersedia di project ini.** Bucket-nya belum
ter-provisioning (`https://firebasestorage.googleapis.com/v0/b/input-icip.firebasestorage.app/o`
menjawab 404), karena sejak akhir 2024 bucket baru memerlukan paket Blaze.

Tiga pilihan yang realistis:

| Pilihan | Gratis | Kasir bisa unggah sendiri | Catatan |
| --- | --- | --- | --- |
| **Folder `public/`** | ya | tidak | tercepat, tanpa layanan luar; file ditambah developer lalu deploy ulang |
| **Cloudinary** | ya (25 GB) | ya | perlu daftar; cocok kalau foto sering ganti |
| **Firebase Storage** | perlu Blaze | ya | paling menyatu, tapi harus upgrade billing |

**Rekomendasi untuk sekarang: folder `public/`.** Menu warung ini hanya beberapa
item dan jarang berubah, jadi kerumitan layanan luar tidak sepadan. Simpan file di
`public/images/menu/`, lalu isi kolom URL foto dengan path relatif:

```
public/images/menu/ubi-cheese.jpg   →   isi URL: /images/menu/ubi-cheese.jpg
```

Gambar lokal juga otomatis dioptimasi Next.js dan dilayani dari origin yang sama,
jadi lebih cepat daripada mengambil dari server lain.

Kalau nanti kasir perlu memotret dan mengunggah sendiri dari tablet, pindah ke
Cloudinary — host-nya sudah didaftarkan, tinggal tempel URL-nya.

### Kenapa host harus didaftarkan

`next/image` menolak host yang tidak ada di `remotePatterns`; optimizer akan
menjawab **400 `"url" parameter is not allowed`** dan foto gagal tampil. Daftar
host yang sudah diizinkan ada di [next.config.ts](next.config.ts):

```ts
remotePatterns: [
  { protocol: "https", hostname: "firebasestorage.googleapis.com" },
  { protocol: "https", hostname: "*.firebasestorage.app" },
  { protocol: "https", hostname: "res.cloudinary.com" },
  { protocol: "https", hostname: "ik.imagekit.io" },
  { protocol: "https", hostname: "i.ibb.co" },
  { protocol: "https", hostname: "images.unsplash.com" },
]
```

Daftar ini sengaja **tidak** memakai wildcard `**`. Mengizinkan semua host berarti
server ini bisa dipakai orang lain sebagai proxy gambar gratis atas biaya Anda.

Sebagai jaring pengaman, `MenuCard` menangani kegagalan muat gambar dan jatuh ke
ikon kategori — satu URL salah tidak akan merusak tampilan menu.

---

## Kustomisasi

### Warna

Semua warna berasal dari token di [src/app/globals.css](src/app/globals.css).
Mengubah satu variabel akan menyebar ke seluruh aplikasi.

| Token | Nilai | Dipakai untuk |
| --- | --- | --- |
| `--primary` | `#e63946` | merah utama: tombol, harga, aksen |
| `--primary-hover` | `#cf2b3b` | keadaan hover |
| `--primary-soft` | `#fdeced` | latar lembut, badge |
| `--accent` | `#f5a524` | kuning hangat: status menunggu, kategori Cemilan |
| `--background` | `#fdf8f5` | krem hangat |
| `--foreground` | `#2b211f` | teks utama |
| `--muted` | `#8c7a75` | teks sekunder |
| `--success` | `#2f9e64` | status lunas, indikator realtime |

Merahnya dipilih dengan kanal hijau dan biru sedikit diangkat dibanding merah
pekat seperti `#E60012`. Merah berkanal nol itu yang membuat mata cepat lelah
pada bidang lebar, terutama di layar kasir yang ditatap berjam-jam.

### Kategori dan ikonnya

Tambah atau ubah kategori di satu tempat,
[src/lib/categories.ts](src/lib/categories.ts). Dropdown di form kasir dan badge
di kedua halaman ikut menyesuaikan otomatis. Ikon diambil dari `lucide-react`.

Kategori di Firestore hanyalah string bebas, jadi `getCategoryStyle()` selalu
menyediakan cadangan untuk nilai yang tidak dikenal.

### Jumlah menu per halaman

Ubah `PAGE_SIZE` di [src/app/page.tsx](src/app/page.tsx). Nilainya `4` agar pas
dengan grid 2×2. Kalau diubah, sesuaikan juga kelas `grid-rows-2` di sana.

### Responsif

| Lebar layar | Tata letak pelanggan | Sidebar kasir |
| --- | --- | --- |
| ≥ 1024 px | menu 62% + keranjang 38% berdampingan | penuh dengan label |
| < 1024 px | menumpuk: menu di atas, keranjang di bawah | menyusut jadi ikon (80 px) |

Grid menu tetap 2×2 di semua ukuran. Kartu memakai `flex-1` pada area gambar
sehingga ikut mengecil di layar pendek — 2×2 tetap muat tanpa memunculkan scroll.

---

## Deploy

Aplikasi ini statis sepenuhnya (`○ Static` untuk ketiga route), jadi bisa
di-host di Vercel, Firebase Hosting, atau mana pun.

1. Set semua variabel `NEXT_PUBLIC_*` di dashboard hosting.
2. `npm run build`
3. Pastikan rules terbaru sudah aktif: `npm run deploy:rules`

Rules dan kode di-deploy terpisah. Setelah mengubah `firestore.rules`, jalankan
`npm run deploy:rules` — build ulang aplikasi tidak ikut memperbarui rules.

---

## Masalah yang sering muncul

**`permission-denied` di console browser.**
Path yang diakses tidak cocok dengan blok `match` mana pun, atau pengguna belum
memenuhi syarat. Cek dulu apakah sedang login sebagai admin, dan pastikan rules
terbaru sudah ter-deploy. Untuk melihat rules yang benar-benar aktif, buka
Console → Firestore → Rules.

**Halaman kasir terus menampilkan form login padahal password benar.**
Akun berhasil login tapi dokumen `admins/<uid>` tidak ada, jadi `signInAdmin()`
langsung sign-out lagi. Jalankan `npm run setup:admin` dengan email tersebut.

**`auth/configuration-not-found`.**
Firebase Authentication belum diaktifkan di Console. Lihat langkah 2 pada
[Setup dari nol](#setup-dari-nol).

**Foto menu tidak muncul.**
Host-nya belum terdaftar di `remotePatterns`. Cek Network tab: permintaan ke
`/_next/image?...` yang menjawab 400 dengan `"url" parameter is not allowed`
adalah tandanya. Tambahkan host tersebut di [next.config.ts](next.config.ts).

**Pesanan tidak muncul di layar kasir.**
Pastikan indikator "Realtime Active" di sidebar menyala. Kalau pesanan pelanggan
gagal terkirim, biasanya sesi anonim belum terbentuk — periksa provider Anonymous
sudah aktif di Console.

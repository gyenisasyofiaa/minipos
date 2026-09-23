# 🛒 MiniPOS — Aplikasi Kasir Digital (Point of Sale)

**MiniPOS** adalah aplikasi sistem kasir berbasis web modern yang dibangun menggunakan **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, dan **Firebase Firestore** untuk mendukung pengelolaan produk, autentikasi pengguna, serta pencatatan transaksi penjualan secara real-time.

---

## 📂 Struktur Proyek & Penjelasan Modul

Berikut adalah rincian direktori dan modul koding yang digunakan di dalam proyek ini:

* **`src/app/`** — Pusat routing dan halaman utama aplikasi (menggunakan Next.js App Router):
  * `(auth)/login/` — Modul halaman masuk (*login*) pengguna.
  * `(dashboard)/dashboard/` — Halaman utama ringkasan sistem kasir.
  * `(dashboard)/products/` — Manajemen daftar produk lengkap dengan fitur tambah (`/create`) dan ubah data (`/[id]/edit`).
  * `(dashboard)/transactions/` — Modul kasir utama untuk membuat transaksi baru (`/new`) dan melihat detail riwayat transaksi (`/[id]`).
* **`src/components/`** — Kumpulan komponen antarmuka (*UI components*) yang dapat digunakan kembali:
  * `auth/` — Komponen penjaga rute autentikasi (`auth-guard.tsx`).
  * `layout/` — Komponen kerangka tata letak aplikasi seperti `Header.tsx` dan `Sidebar.tsx`.
  * `products/` — Komponen formulir produk (`product-form.tsx`).
  * `ui/` — Komponen dasar pendukung seperti tombol (`Button.tsx`), input (`input.tsx`), dan status kosong (`empty-state.tsx`).
* **`src/contexts/`** — Pengelola *state* global aplikasi, termasuk konteks autentikasi pengguna (`auth-context.tsx`).
* **`src/lib/`** — Konfigurasi pustaka eksternal dan utilitas penyimpanan lokal, termasuk inisialisasi koneksi `firebase.ts` dan `product-storage.ts`.
* **`src/services/`** — Lapisan layanan bisnis untuk komunikasi data asinkron dengan database backend (`product.service.ts` dan `transaction.service.ts`).
* **`src/types/`** — Definisi tipe data TypeScript secara global untuk entitas keranjang belanja (`cart.ts`), produk (`product.ts`), dan transaksi (`transaction.ts`).
* **`src/utils/`** — Fungsi pembantu (*helper*) untuk pemformatan mata uang (`currency.ts`), tanggal (`date.ts`), format data, nomor nota/invoice, dan penyimpanan lokal.

---

## 🛠️ Teknologi Utama

* **Framework:** Next.js (App Router)
* **Bahasa:** TypeScript
* **Styling:** Tailwind CSS
* **Database & Auth:** Firebase Firestore
* **Konfigurasi Tambahan:** `.env.example`, `firestore.rules`

---

## 🚀 Panduan Memulai (Local Setup)

1. **Kloning Repositori & Instalasi Dependensi**
   Jalankan perintah berikut di terminal Anda untuk menginstal semua modul yang diperlukan:
   ```bash
   npm install

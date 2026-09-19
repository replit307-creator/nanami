# PRD — Nanami Kitchen PWA (Dokumen Spesifikasi & Update Implementasi)

**Versi:** 1.4.0  
**Tanggal:** September 2026  
**Status:** Implemented & Production Ready  
**Basis:** PRD v1.0.0 + Feedback List Client + WhatsApp Settings Customization Suite  

---

## 1. Latar Belakang & Tujuan

Aplikasi Nanami Kitchen beroperasi di pasar **Namibia** (mata uang N$, layanan eWallet lokal "Pay2Cell"), dengan fokus pada kecepatan, kemudahan pemesanan, dan fleksibilitas konfigurasi operasional bagi pemilik usaha. Dokumen ini merefleksikan seluruh fungsionalitas sistem apa adanya (_as-is_).

---

## 2. Model Autentikasi & Hak Akses

> **Keputusan:** Login **hanya wajib** untuk role `admin`, `owner`, dan `staff`. Role `user` (customer) **tidak wajib login** untuk menjelajah menu, kustomisasi pesanan, kalkulasi ongkos kirim, dan checkout (Guest Checkout).

### 2.1 Perilaku per Role

| Role                               | Wajib Login?                                                                           | Alasan                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `user` (Customer)                  | **Tidak** — guest checkout diizinkan penuh                                             | Mengurangi friksi order dan mempercepat konversi belanja        |
| `user` (Customer) — opsional login | Ya, jika ingin akses `/profile`, `/orders` (riwayat), poin loyalitas, alamat tersimpan | Fitur-fitur akun personal                                       |
| `staff`                            | **Ya**, selalu                                                                         | Akses `/admin` Kitchen Kanban Board & operasional dapur         |
| `admin`                            | **Ya**, selalu                                                                         | Akses penuh `/admin/*`                                          |
| `owner`                            | **Ya**, selalu                                                                         | Akses penuh `/owner/*` termasuk WhatsApp Suite, CMS, & Finance  |

### 2.2 Alur Guest Checkout

- Pelanggan tanpa akun dapat: melihat menu → kustomisasi item → tambah ke cart → checkout (isi nama, nomor WhatsApp, alamat manual atau GPS otomatis) → memilih metode bayar → generate pesan WhatsApp terformat otomatis → pesanan tersimpan di DB dengan `account_id = NULL`.
- Pelacakan pesanan guest (`/tracking`) dapat diakses via **kode order** (link unik dikirim di `/order-success`, tanpa perlu login).

---

## 3. Matriks Implementasi Requirement

### 3.1 Auth & Onboarding

| #   | Requirement                                                                     | Status  |
| --- | ------------------------------------------------------------------------------- | ------- |
| A1  | Guest checkout untuk customer tanpa pop-up login paksa                          | Selesai |
| A2  | Kredensial email & password native untuk customer, staff, admin, dan owner      | Selesai |
| A3  | PWA install prompt (Add to Home Screen) dan service worker caching              | Selesai |
| A4  | Browser Geolocation prompt via tombol GPS otomatis ("Use GPS" / "Use Location") | Selesai |

### 3.2 Customer PWA — Home & Navigasi

| #   | Requirement                                                                                   | Status  |
| --- | --------------------------------------------------------------------------------------------- | ------- |
| H1  | Header Home bersih tanpa logo teks redundan (logo eksklusif di Splash Screen & Loading)       | Selesai |
| H2  | Hero banner promo full-width di paling atas layar dengan info kurasi dan tombol Order Now     | Selesai |
| H3  | Toggle Pickup/Delivery tepat di bawah hero banner dan di atas bilah pencarian                 | Selesai |
| H4  | Kategori berbentuk text-only pill button tanpa ikon                                           | Selesai |
| H5  | Tombol pemicu pencarian menyatu di baris pill kategori (kanan)                                | Selesai |
| H6  | Bottom nav 4 tab: Home (`/`), Cart (`/cart`), Orders (`/orders`), Profile (`/profile`)        | Selesai |

### 3.3 Customer PWA — Katalog Menu & Kustomisasi

| #   | Requirement                                                                                 | Status  |
| --- | ------------------------------------------------------------------------------------------- | ------- |
| M1  | Section **"Must Try!"** di paling atas katalog (grid 2x2, foto 1:1, 4–6 item)               | Selesai |
| M2  | Katalog vertikal per kategori dengan ScrollSpy otomatis                                     | Selesai |
| M3  | 5 kategori baku terstandarisasi: `Meals`, `Snacks`, `Drinks`, `Combos`, `Others`            | Selesai |
| M4  | Toggle ON/OFF grup varian per produk (misal: Spice Level aktif untuk bento, mati di snack)  | Selesai |
| M5  | Add-on opsi dengan harga dinamis (`priceDelta`); nilai 0 tampil bersih tanpa label harga     | Selesai |
| M6  | Special Request (catatan dapur) per produk yang diteruskan ke keranjang, struk, & WhatsApp  | Selesai |

### 3.4 Customer PWA — Pembayaran & WhatsApp Ordering

| #   | Requirement                                                                                  | Status  |
| --- | -------------------------------------------------------------------------------------------- | ------- |
| PM1 | Opsi eWallet lokal Namibia "eWallet / Pay2Cell"                                              | Selesai |
| PM2 | Cash on Delivery (COD) dengan toggle ON/OFF global di Owner Settings                         | Selesai |
| PM3 | PPN / VAT 15% dengan toggle ON/OFF dan persentase yang dapat disesuaikan                     | Selesai |
| PM4 | Tombol salin nomor rekening bank transfer instan                                             | Selesai |
| PM5 | **WhatsApp Settings Suite (`/owner/whatsapp`)**: Custom template editor, presets, & simulator| Selesai |

### 3.5 Admin & Owner Panel

| #   | Requirement                                                                                   | Status  |
| --- | --------------------------------------------------------------------------------------------- | ------- |
| O1  | Order Management page di sidebar (tabel pesanan scannable, filter status, action status)      | Selesai |
| O2  | Manual Save System: Tombol **[Save Changes]** + StickySaveBar + UnsavedChangesPrompt dialog    | Selesai |
| O3  | Sakelar ketersediaan stok instan (Available/Sold Out) di `/admin/stock`                      | Selesai |
| O4  | Simbol mata uang **N$** (Namibia Dollar) dan locale `en-ZA` terpusat di seluruh titik         | Selesai |
| O5  | Media Gallery Library (`/owner/media` dan `/admin/media`) untuk kelola dan pakai ulang foto   | Selesai |
| O6  | Visual CMS (`/owner/cms`) dan Live Smartphone Simulator (`/owner/preview`)                    | Selesai |
| O7  | Pemisahan modul Accounts & Staff (`/owner/staff`) vs direktori pelanggan (`/admin/customers`)| Selesai |
| O8  | Kitchen Kanban Board dengan peringatan keterlambatan masak (>30 menit)                        | Selesai |
| O9  | Pencetakan struk kasir termal (58mm/80mm) + fitur Thermal Auto-Print saat mulai memasak       | Selesai |
| O10 | Modul Pengaturan WhatsApp (`/owner/whatsapp`) lengkap dengan template editor dan chat mockup  | Selesai |

### 3.6 Konsistensi Bahasa

| #   | Requirement                                                                                   | Status  |
| --- | --------------------------------------------------------------------------------------------- | ------- |
| L1  | Standarisasi seluruh antarmuka (Storefront, Admin, Owner, WhatsApp Settings) ke Bahasa Inggris| Selesai |

---

## 4. Struktur Database & Model Data Terkini

1. **`orders`**: Menyimpan seluruh transaksi; kolom `account_id` bernilai `NULL` untuk pesanan tamu.
2. **`menu_items`**: Menyimpan katalog hidangan dengan kolom `groups` (JSONB) dan `special_request_enabled`.
3. **`app_settings`**: Menyimpan `vatPercent`, `vatEnabled`, `codEnabled`, `currencySymbol`, `whatsapp`, `whatsappTemplate`, `whatsappHeader`, `whatsappFooter`, `whatsappPreset`, `baseFee`, `feePerKm`, dll.
4. **`media_assets`**: Menyimpan metadata aset gambar (`id, url, filename, uploaded_at, used_by_menu_ids`).
5. **`cms_content`**: Menyimpan hero banner, announcement, welcome screen, FAQ, must-try IDs, urutan kategori.
6. **`promos` & `vouchers`**: Menyimpan promo carousel dan kode kupon diskon.
7. **`accounts` & `staff`**: Pemisahan akun pelanggan PWA (`accounts`) dan staf internal (`staff`).

---

## 5. Ringkasan Verifikasi & Status Operasional

- **36 Rute Aktif:** Seluruh rute storefront, admin, dan owner suite teruji 100% lulus HTTP 200 OK.
- **Pengujian Regresi:** Rangkaian tes regresi (Must-Try Grid, Category ScrollSpy, VAT, COD, dan WhatsApp Builder) terverifikasi lulus.
- **Linter & Kompilasi:** Bersih tanpa error linting atau kegagalan kompilasi.

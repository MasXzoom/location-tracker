# Sadap Lokasi

Aplikasi web untuk melacak lokasi target dengan menggunakan link tracking yang tidak mencurigakan. Aplikasi ini dilengkapi dengan fitur dashboard untuk memantau lokasi dan detail perangkat dari target yang mengakses link.

## Fitur Utama

- **Pembuatan Link Tracking**: Buat link dengan nama yang menarik dan tidak mencurigakan.
- **Deskripsi Kustom**: Tambahkan deskripsi yang ditampilkan di halaman tracking untuk meningkatkan kepercayaan target.
- **Shortlink**: Fitur shortlink untuk membuat URL lebih pendek dan tidak terlihat mencurigakan.
- **URL Redirect Kustom**: Atur kemana target akan diarahkan setelah lokasi terdeteksi.
- **Penghapusan Otomatis**: Link akan otomatis tidak bisa digunakan lagi 30 detik setelah target mengaksesnya.
- **Dashboard Terproteksi**: Akses dashboard dilindungi dengan password untuk keamanan data.
- **Visualisasi Data**: Dashboard menampilkan data lokasi dan perangkat target dalam bentuk grafik dan tabel.
- **Tracking Perangkat**: Mendapatkan informasi perangkat (browser, OS) dari target.

## Teknologi

- React + TypeScript
- Vite
- Tailwind CSS
- Supabase (PostgreSQL)
- Chart.js untuk visualisasi data
- React Router
- Geolocation API
- Reverse Geocoding API

## Instalasi dan Setup

1. Clone repositori
   ```bash
   git clone https://github.com/username/sadap-lokasi.git
   cd sadap-lokasi
   ```
2. Install dependensi:
   ```bash
   npm install
   ```
3. Buat file `.env` dan isi dengan konfigurasi Supabase:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Setup database Supabase dengan menjalankan SQL yang disediakan di folder `/sql/add_columns.sql`
5. Jalankan aplikasi:
   ```bash
   npm run dev
   ```

## Struktur Database

### Tabel: `tracking_links`

| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | Primary key |
| name | text | Nama link yang digunakan dalam URL |
| tracking_code | text | Kode unik untuk tracking |
| description | text | Deskripsi yang ditampilkan di halaman tracking |
| redirect_url | text | URL tujuan setelah lokasi terdeteksi |
| short_url | text | URL pendek (shortlink) |
| is_clicked | boolean | Status apakah link sudah diklik (default: false) |
| clicked_at | timestamptz | Waktu saat link diklik |
| created_at | timestamptz | Waktu pembuatan link |

### Tabel: `tracking_logs`

| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | Primary key |
| tracking_code | text | Kode unik dari link tracking |
| lat | float | Latitude lokasi |
| lng | float | Longitude lokasi |
| address | text | Alamat hasil reverse geocoding |
| google_maps_url | text | URL Google Maps untuk lokasi |
| device_info | text | Info browser/device (user agent) |
| created_at | timestamptz | Waktu akses link |

## Cara Kerja

1. **Pembuatan Link**: Buat link tracking dengan nama yang menarik, deskripsi, dan URL redirect.
2. **Bagikan Link**: Bagikan link (normal atau shortlink) kepada target.
3. **Deteksi Lokasi**: Saat target mengakses link, halaman akan meminta izin lokasi.
4. **Penyimpanan Data**: Lokasi dan detail perangkat disimpan ke database Supabase.
5. **Redirect Otomatis**: Target dialihkan ke URL yang telah ditentukan.
6. **Penghapusan Link**: Link akan otomatis tidak bisa digunakan lagi setelah 30 detik.
7. **Akses Dashboard**: Gunakan password untuk mengakses dashboard dan melihat data tracking.

## Penggunaan

### Membuat Link Tracking
1. Buka halaman utama
2. Isi nama link yang menarik (contoh: "promo-diskon")
3. Tambahkan deskripsi yang meyakinkan
4. Tentukan URL redirect (default: google.com)
5. Pilih apakah menggunakan shortlink atau tidak
6. Klik "Buat Link"

### Melihat Hasil Tracking
1. Buka `/dashboard`
2. Masukkan password (default: psy27)
3. Masukkan kode tracking untuk melihat hasil
4. Dashboard akan menampilkan lokasi, alamat, dan info perangkat target

## Catatan Keamanan

Aplikasi ini dibuat untuk tujuan edukasi dan demonstrasi. Penggunaan untuk melacak individu tanpa persetujuan dapat melanggar privasi dan hukum yang berlaku di beberapa yurisdiksi. Pengguna bertanggung jawab penuh atas penggunaan aplikasi ini.

## Pengembangan

Untuk menjalankan mode development:
```bash
npm run dev
```

Untuk build production:
```bash
npm run build
```

## GitHub Setup

### Persiapan Repository

1. Buat repository baru di GitHub
2. Initialize repository lokal dan push ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/username/sadap-lokasi.git
   git push -u origin main
   ```

### Membuat Release

1. Tag versi untuk release:
   ```bash
   git tag -a v1.0.0 -m "Versi 1.0.0"
   git push origin v1.0.0
   ```
2. Di GitHub, buka repository dan pilih "Releases"
3. Klik "Draft a new release"
4. Pilih tag yang sudah dibuat
5. Isi judul release dan deskripsi fitur/perubahan
6. Upload build file (.zip) jika diperlukan
7. Publikasikan release

### Setup GitHub Pages (Opsional)

Untuk hosting aplikasi di GitHub Pages:

1. Perbarui `vite.config.ts` untuk menambahkan base URL:
   ```typescript
   export default defineConfig({
     base: '/sadap-lokasi/',
     // konfigurasi lainnya
   })
   ```
2. Tambahkan script deployment di `package.json`:
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```
3. Install package gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```
4. Deploy ke GitHub Pages:
   ```bash
   npm run deploy
   ```

### GitHub Repository Metadata

Untuk meningkatkan visibilitas dan informasi repository di GitHub:

1. Tambahkan topic tags di bagian About repository
2. Buat file `.github/CONTRIBUTING.md` untuk panduan kontribusi
3. Buat file `.github/ISSUE_TEMPLATE.md` untuk template issue
4. Perbarui bagian About dengan informasi deskripsi dan website

## Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).

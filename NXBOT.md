Ide bagus banget, bro! Bikin file dokumentasi `NXBOT.md` itu langkah paling bener kalau lu mau *brainstorming* lintas AI atau matengin konsep dulu sebelum masuk ke tahap *coding*. Jadi, AI lain langsung dapet gambaran besar proyek lu tanpa perlu lu jelasin berulang-ulang dari nol.

Ini draf lengkap isi file **`NXBOT.md`** yang super detail, rapi, dan mencakup semua kemauan lu dari awal. Tinggal lu copas dan simpen jadi file markdown.

---

```markdown
# NXBot - Web-Managed Discord CTF Bot Platform

## 📌 Project Overview
NXBot adalah platform manajemen bot Discord berbasis kontainer (Docker) yang dirancang khusus untuk kebutuhan **Capture The Flag (CTF)**. Proyek ini menggabungkan fleksibilitas Discord Bot dengan kemudahan pengelolaan via Web Dashboard.

Tujuan utama dari arsitektur ini adalah mempermudah *deployment* dan konfigurasi. Pengguna tidak perlu menyentuh file `.env` atau terminal VPS secara manual untuk memasukkan token; semuanya dikendalikan melalui Web UI setelah proses instalasi awal (*setup wizard*).

---

## 🛠️ Tech Stack & Ecosystem

- **Containerization:** Docker & Docker Compose (Multi-container setup).
- **Control Interface:** Custom Bash CLI Script (`nxbot`).
- **Management Web Layer:** Next.js (App Router) atau React + Express (Backend API + Frontend Dashboard).
- **Bot Layer:** Node.js (Discord.js) atau Python (Discord.py) — *Fokus pada arsitektur modular agar fungsi CTF bisa di-inject belakangan*.
- **Database & Auth Provider:** Supabase (PostgreSQL + Supabase Auth).

---

## 📐 System Architecture & Flow

```text
       [ USER / ADMIN ]
              │
      ┌───────┴───────┐ (Kontrol via CLI)
      ▼               ▼
[ Terminal ]    [ Web Browser: Port 3000 ]
  (./nxbot)           │
      │               ▼
      │        ┌──────────────┐
      │        │  Next.js     │◄──────┐
      ▼        │  Dashboard   │       │
┌──────────┐   └──────┬───────┘       │ Read / Write Config
│ Docker   │          │               │ & Auth Session
│ Compose  │          ▼               ▼
│ Engine   │   ┌──────────────┐   ┌──────────────┐
│          ├──►│ Discord Bot  │   │   Supabase   │
└──────────┘   │ Container    │   │ (DB & Auth)  │
               └──────────────┘   └──────────────┘

```

### Jalur Komunikasi & State:

1. **CLI (`nxbot`)** mengontrol status *lifecycle* dari Docker containers (nyala/mati/parsial).
2. **Web Dashboard** membaca status setup dari Supabase. Jika belum setup, admin dipaksa membuat kredensial terlebih dahulu.
3. **Web Dashboard** menulis konfigurasi (Discord Token, API Keys, dll.) ke Supabase.
4. **Discord Bot** membaca token dari Supabase untuk *login* ke gateway Discord. Jika token belum ada/salah, bot masuk ke *sleep mode* (tidak *crash*).

---

## ⚙️ Lifecycle States (Kondisi Aplikasi)

Aplikasi harus dapat menangani 3 kondisi (state) utama secara aman:

### 1. State A: Fresh Boot (Belum Terkonfigurasi)

* Kontainer dinyalakan pertama kali. Database Supabase masih kosong dari konfigurasi sistem.
* Middleware Web Dashboard mendeteksi `is_setup = false` dan mengunci semua halaman, lalu me-redirect paksa user ke halaman `/setup`.
* Di halaman `/setup`, user memasukkan kredensial admin utama. Sistem men-generate token/hash keamanan ke database dan mengubah `is_setup = true`.

### 2. State B: Fully Operational (Berjalan Normal)

* Admin login via `/login` menggunakan kredensial dari State A.
* Admin masuk ke tab *Settings* untuk menginput `DISCORD_BOT_TOKEN`, `CLIENT_ID`, dll.
* Begitu disimpan, dashboard mengirim sinyal (via webhook atau DB listener) agar kontainer `discord-bot` melakukan *hot-reload* atau *restart* otomatis untuk menerapkan token baru.

### 3. State C: Maintenance / Web Only (Jalan Parsial)

* Diaktifkan secara manual oleh admin via CLI (`./nxbot web`).
* Kontainer `discord-bot` dimatikan untuk menghemat resource (RAM/CPU VPS), namun `web-dashboard` tetap menyala agar admin bisa melakukan konfigurasi ulang atau manajemen database.

---

## 📂 Proposed Repository Structure (Monorepo)

```text
my-ctf-bot-panel/
├── docker-compose.yml      # Orkestrasi multi-container
├── .env.example            # Environment variable dasar (Supabase URL & Anon Key)
├── nxbot                   # CLI Wrapper Script (Bash)
├── README.md               # Dokumentasi umum
│
├── web-dashboard/          # Aplikasi Web (Next.js / Express)
│   ├── src/
│   │   ├── app/            # Routing (setup, login, dashboard)
│   │   └── api/            # API endpoints untuk kontrol internal
│   ├── Dockerfile
│   └── package.json
│
└── discord-bot/            # Core Engine Bot Discord
    ├── src/
    │   ├── index.js        # Entry point (Polling & connection logic)
    │   └── commands/       # Folder modular untuk command CTF (Next Phase)
    ├── Dockerfile
    └── package.json

```

---

## 💻 CLI Specification (`nxbot`)

Untuk mempermudah manajemen operasional kontainer tanpa perlu mengetik perintah Docker yang panjang, dibuatlah script otomasi `nxbot` dengan perintah wajib sebagai berikut:

* `./nxbot start` : Menjalankan seluruh *service* (Web Dashboard & Discord Bot) di latar belakang (`docker compose up -d`).
* `./nxbot stop` : Mematikan seluruh kontainer dan merapikan network (`docker compose down`).
* `./nxbot web` : Mematikan fungsi bot, namun memastikan Web Dashboard tetap berjalan (`docker compose stop discord-bot && docker compose up -d web-dashboard`).
* `./nxbot status` : Menampilkan status kesehatan, performa, dan port dari setiap kontainer (`docker compose ps`).
* `./nxbot restart` : Melakukan restart cepat pada seluruh layanan (`docker compose restart`).

---

## 🎯 Target Brainstorming Selanjutnya (Next Steps)

Saat membawa dokumen ini ke AI lain untuk sesi *brainstorming*, fokuskan diskusi pada poin-poin berikut:

1. **Mekanisme Re-koneksi Bot:** Bagaimana implementasi kode terbaik di sisi Bot agar dia bisa *listening* perubahan token di Supabase secara *real-time* tanpa harus membuat kontainernya *crash* saat pertama kali dinyalakan (saat token masih kosong)?
2. **Sistem Autentikasi /Setup:** Apakah lebih aman menggunakan Supabase Auth bawaan atau membuat sistem enkripsi *session* mandiri (Custom JWT/Bcrypt) khusus untuk akun admin tunggal ini?
3. **Komunikasi Antar Kontainer:** Apakah perlu volume bersama (*shared volume*) berupa file `.json` lokal sebagai *backup caching* konfigurasi jika sewaktu-waktu koneksi ke Supabase terputus?

```

---

### 💡 Cara Pakai File Ini:
1. Copas text di atas, bikin file baru bernama `NXBOT.md` di laptop lu, lalu *save*.
2. Kalau mau *brainstorming* ke AI lain, tinggal buka obrolan baru terus ketik:
   > *"Gua punya rancangan spek proyek namanya NXBot. Ini file NXBOT.md nya: [Copas isi file di atas]. Gua mau brainstorming dulu soal poin nomor 1 di bagian Target Brainstorming, menurut lu gimana pendekatan kode terbaiknya?"*

Dokumentasi ini udah mateng banget secara konsep arsitektur DevOps dan integrasinya, bro. Semoga lancar *brainstorming*-nya! Kalau butuh revisi alurnya sebelum lo bawa keliling, kabari gua aja.

```

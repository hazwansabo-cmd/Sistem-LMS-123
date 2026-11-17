# Al Amin Edu Oasis — LMS Latihan AI Kakitangan

Sistem Pengurusan Pembelajaran (LMS) berasaskan web bagi **Al Amin**, Malaysia.
Menyediakan kursus dan bahan latihan Kecerdasan Buatan (AI) untuk kakitangan,
serta modul kehadiran digital yang menggantikan kerja menaip data kehadiran
secara manual.

> Dokumen rujukan: PRD LMS Latihan AI Al Amin (Bahasa Malaysia)
> Lokasi: Malaysia | Zon waktu: Asia/Kuala_Lumpur (UTC+8) | Pematuhan: PDPA 2010

---

## Ciri Utama

- **Antara muka glassmorphism** profesional dengan mod cerah/gelap
- **Bahasa Malaysia** (lalai) dengan sokongan Bahasa Inggeris (i18n)
- **4 peranan (RBAC):** Admin, HR/Pengurus, Jurulatih, Staf
- **Log masuk demo pantas** — tukar peranan dengan satu klik

### Modul

| Modul | Keupayaan |
|---|---|
| Papan Pemuka | Statistik & graf berperanan |
| Kursus | Katalog 9 kursus AI (AI-101 → AI-401), carian/penapis/isihan |
| Pembelajaran | Pemain pelajaran (teks/video/PDF/makmal), penjejakan kemajuan |
| Kuiz | Aneka pilihan, benar/salah, jawapan pendek; had masa & cubaan |
| Kehadiran | Sesi latihan, kod QR dinamik, kod sesi 6-digit, kemasukan pukal, import/eksport CSV, jejak audit |
| Sijil | PDF dijana automatik, nombor unik, pengesahan awam |
| Laporan | Penyiapan & kehadiran mengikut staf/jabatan, eksport CSV |
| Pentadbiran | Pengguna, jabatan, kategori, tetapan, log audit, reset data dummy |

---

## Tindanan Teknologi

- **Framework:** Next.js 16 (App Router) + TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui (New York)
- **Database:** Prisma ORM + SQLite (data dummy prototaip)
- **State:** Zustand (UI/sesi) + TanStack Query (data pelayan)
- **Carta:** Recharts
- **Kod QR:** qrcode
- **PDF Sijil:** jsPDF
- **CSV:** PapaParse
- **Ikon:** Lucide React

---

## Pemasangan

### Keperluan
- Node.js 20+ atau Bun
- Sambungan internet untuk pemasangan pakej

### Langkah

```bash
# 1. Pasang dependencies
bun install        # atau: npm install

# 2. Salin fail persekitaran
cp .env.example .env

# 3. Generate Prisma client & push skema ke SQLite
bun run db:generate
bun run db:push

# 4. Semai data contoh (dummy)
bun run prisma/seed.ts

# 5. Mulakan pelayan pembangunan
bun run dev
```

Buka `http://localhost:3000` dalam pelayar.

---

## Akaun Demo

Semua akaun menggunakan kata laluan: `password123`

| Peranan | E-mel |
|---|---|
| Pentadbir | `admin@alamin.edu.my` |
| HR / Pengurus | `hr1@alamin.edu.my` |
| Jurulatih | `trainer1@alamin.edu.my` |
| Staf | `nur.a1008@alamin.edu.my` |

Atau gunakan butang **"Log masuk sebagai (demo)"** pada skrin log masuk.

---

## Struktur Folder

```
prisma/
  schema.prisma     # Skema pangkalan data
  seed.ts           # Skrip semaian data contoh
src/
  app/              # Penghalaan App Router + API routes
    api/            # Lapisan akses data (REST)
  components/
    lms/            # Komponen LMS (views, app-shell, login)
    ui/             # Komponen shadcn/ui
  lib/              # Utiliti (db, auth, i18n, audit)
  store/            # Zustand stores
  hooks/            # Hooks React
```

---

## Data Contoh

| Data | Jumlah |
|---|---|
| Pengguna | 40 (1 Admin, 2 HR, 4 Jurulatih, 33 Staf) |
| Kursus | 9 (AI-101 hingga AI-401) |
| Pelajaran | 80+ |
| Kuiz & Soalan | 9 kuiz, 45 soalan |
| Sesi Latihan | 24 |
| Rekod Kehadiran | 200+ |
| Pendaftaran | 212 |
| Sijil | 30 |

> Semua data adalah rekaan untuk tujuan demo. Tiada maklumat peribadi sebenar.

---

## Reset Data Dummy

Log masuk sebagai **Admin** → **Tetapan** → **Reset Data Dummy** /
**Jana Semula Data Contoh**.

Atau jalankan terus:
```bash
bun run prisma/seed.ts
```

---

## Skrip

| Skrip | Penerangan |
|---|---|
| `bun run dev` | Mulakan pelayan pembangunan (port 3000) |
| `bun run lint` | Semakan kualiti kod ESLint |
| `bun run db:push` | Push skema Prisma ke SQLite |
| `bun run db:generate` | Generate Prisma Client |
| `bun run prisma/seed.ts` | Semai data contoh |

---

## Pematuhan PDPA 2010

Walaupun fasa prototaip menggunakan data dummy, reka bentuk bersedia untuk
pematuhan Akta Perlindungan Data Peribadi 2010 (PDPA) Malaysia:

- Pengumpulan data minimum
- Notis privasi dipaparkan semasa log masuk
- Kawalan akses berasaskan peranan
- Jejak audit untuk perubahan data kehadiran & sijil
- Kandungan latihan AI mengingatkan staf supaya tidak memasukkan data sulit
  ke alat AI awam

---

## Migrasi ke Pangkalan Data Sebenar

Lapisan akses data diabstrak menerusi API routes (`src/app/api/`). Untuk
beralih ke pangkalan data sebenar:

1. Tukar `DATABASE_URL` dalam `.env` ke PostgreSQL/MySQL
2. Kemas kini `prisma/schema.prisma` (`provider` datasource)
3. Jalankan `bun run db:push`
4. Tiada perubahan pada komponen UI diperlukan

---

Dibangunkan dengan z.ai | Dikuasakan oleh GLM

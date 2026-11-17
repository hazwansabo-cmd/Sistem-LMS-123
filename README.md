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

### Pilihan A: Supabase PostgreSQL (Pengeluaran)

Projek ini disambungkan ke **Supabase** sebagai pangkalan data pengeluaran
(mengikut PRD bahagian 9.2). Skema Prisma menggunakan `provider = "postgresql"`.

```bash
# 1. Pasang dependencies
bun install

# 2. Salin fail persekitaran dan isi dengan kredensial Supabase
cp .env.example .env
#   Edit .env dengan connection string Supabase anda:
#   DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
#   (Jika password mengandungi "@", tukarkan kepada %40)

# 3. Generate Prisma client
bun run db:generate

# 4. Push skema ke Supabase (cipta semua jadual)
bun run db:push

# 5. Semai data contoh (dummy)
bun run prisma/seed.ts

# 6. Mulakan pelayan
bun run dev
```

#### Kredensial Supabase (projek ini)

| Item | Nilai |
|---|---|
| Project URL | `https://tdclvjouktyggprxaxmn.supabase.co` |
| Direct Connection | `postgresql://postgres:****@db.tdclvjouktyggprxaxmn.supabase.co:5432/postgres` |

> Dapatkan connection string penuh dari Supabase Dashboard →
> Settings → Database → Connection string. Simpan dalam `.env` (jangan
> commit ke GitHub).

#### Supabase CLI (pilihan)

```bash
supabase login
supabase init
supabase link --project-ref tdclvjouktyggprxaxmn
```

### Pilihan B: SQLite (Prototaip / Pembangunan Tempatan)

Untuk pembangunan tempatan tanpa Supabase, tukar `provider` dalam
`prisma/schema.prisma` ke `"sqlite"` dan gunakan fail tempatan:

```bash
# Dalam .env:
# DATABASE_URL=file:/home/z/my-project/db/custom.db

bun run db:generate
bun run db:push
bun run prisma/seed.ts
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

## Migrasi SQLite → Supabase PostgreSQL

Projek kini dikonfigurasi untuk **Supabase PostgreSQL** secara lalai. Lapisan
akses data diabstrak menerusi API routes (`src/app/api/`) — tiada perubahan
pada komponen UI diperlukan.

### Langkah migrasi

1. Pastikan `prisma/schema.prisma` menggunakan `provider = "postgresql"`
2. Isi `.env` dengan connection string Supabase (rujuk Pilihan A di atas)
3. Jalankan `bun run db:generate` (regenerate Prisma client untuk PostgreSQL)
4. Jalankan `bun run db:push` (cipta jadual di Supabase)
5. Jalankan `bun run prisma/seed.ts` (semai data contoh)

### Nota connection string

- Jika password mengandungi `@`, `:`, `/`, atau aksara reserved lain,
  URL-encodekan (cth: `@` → `%40`)
- Supabase Direct Connection: port `5432`
- Supabase Pooler (PgBouncer): port `6543` — tambah `?pgbouncer=true&connection_limit=1`
- Untuk serverless (Vercel), gunakan pooler untuk mengelakkan kehabisan sambungan

---

Dibangunkan dengan z.ai | Dikuasakan oleh GLM

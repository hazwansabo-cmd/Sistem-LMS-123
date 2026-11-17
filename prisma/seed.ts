// Seed script for LMS Al Amin Edu Oasis
// Run: bun run prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const db = new PrismaClient();

// Deterministic helpers
const rnd = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
};
const pick = <T>(arr: T[], r: () => number) => arr[Math.floor(r() * arr.length)];

const hash = (s: string) => "demo$" + createHash("sha256").update(s).digest("hex").slice(0, 16);

// Malaysian names across communities
const MALAY_FIRST = ["Ahmad", "Siti", "Muhammad", "Nurul", "Abdul", "Aisyah", "Fatimah", "Mohd", "Hafiz", "Nur", "Azman", "Rohaya", "Kamal", "Zainab", "Fauzi", "Halimah"];
const CHINESE_FIRST = ["Wei", "Hui", "Jia", "Min", "Kah", "Lim", "Tan", "Chong", "Lee", "Wong", "Mei", "Sze"];
const INDIAN_FIRST = ["Kumar", "Priya", "Raj", "Deepa", "Suresh", "Lakshmi", "Arjun", "Meena", "Vimal", "Anita"];
const LAST = ["bin Abdullah", "binti Osman", "bin Rahman", "binti Hassan", "bin Ismail", "binti Yusof", "bin Ali", "binti Mohamed", "Tan", "Lim", "Wong", "Goh", "Ng", "Chong", "Kumar", "a/l Subramaniam", "a/p Devi", "Menon", "Singh", "Krishnan"];
const POSITIONS: Record<string, string[]> = {
  ADMIN_FINANCE: ["Pegawai Pentadbiran", "Pembantu Kewanan", "Akauntan", "Kerani Kewanan"],
  CUSTOMER_SERVICE: ["Pegawai Khidmat Pelanggan", "Penolong Khidmat Pelanggan", "Wakil Sokongan"],
  IT_DEV: ["Jurutera Perisian", "Penganalisis Sistem", "Pentadbir IT", "Pembangun Frontend"],
  HR_TRAINING: ["Pegawai HR", "Penyelaras Latihan", "Pegawai Pembangunan Staf"],
  OPERATIONS: ["Pegawai Operasi", "Penyelia Logistik", "Pembantu Operasi"],
  MARKETING: ["Pegawai Pemasaran", "Penyelaras Kandungan", "Eksekutif Media Sosial"],
};

const AVATAR_COLORS = ["#0f4c75", "#3282b8", "#0b8457", "#2a9d8f", "#e76f51", "#7b2cbf", "#c44569", "#3c6e71", "#1b998b", "#5d4e75"];

const COURSES = [
  { code: "AI-101", title: "Asas Kecerdasan Buatan", level: "PEMULA", hours: 4, path: "ALL", cat: "Asas", desc: "Pengenalan kepada AI, ML dan AI generatif: sejarah, mitos dan realiti, serta contoh kegunaan di Malaysia.", topics: ["Pengenalan: Apa itu AI", "ML vs AI Generatif", "Sejarah & Evolusi AI", "Mitos dan Realiti AI", "Kegunaan AI di Malaysia"] },
  { code: "AI-102", title: "Kejuruteraan Prompt (Prompt Engineering)", level: "PEMULA", hours: 5, path: "ALL", cat: "Asas", desc: "Struktur prompt, peranan, konteks, format output dan teknik langkah demi langkah dengan contoh dalam BM.", topics: ["Anatomi Prompt", "Peranan & Persona", "Konteks dan Had", "Format Output", "Teknik Chain-of-Thought", "Contoh Prompt BM"] },
  { code: "AI-103", title: "AI Generatif untuk Kerja Harian", level: "PEMULA", hours: 4, path: "ALL", cat: "Produktiviti", desc: "Menulis e-mel, ringkasan mesyuarat, terjemahan, penyelidikan dan penjanaan idea dengan AI.", topics: ["Menulis E-mel Profesional", "Ringkasan Mesyuarat", "Terjemahan & Laras Bahasa", "Penyelidikan Pantas", "Penjanaan Idea & Brainstorm"] },
  { code: "AI-201", title: "Analisis Data dengan Bantuan AI", level: "PERTENGAHAN", hours: 6, path: "ADMIN_FINANCE", cat: "Data", desc: "Pembersihan data, formula Excel dibantu AI, visualisasi dan tafsiran keputusan.", topics: ["Pembersihan Data", "Formula Excel dibantu AI", "Visualisasi Data", "Tafsiran Keputusan", "Kesilapan Biasa"] },
  { code: "AI-202", title: "Automasi Kerja dan Aliran Kerja AI", level: "PERTENGAHAN", hours: 6, path: "ADMIN_FINANCE", cat: "Automasi", desc: "Mengenal pasti tugas berulang, alat tanpa kod, ejen AI dan pengukuran penjimatan masa.", topics: ["Kenal Tugas Berulang", "Alat Tanpa Kod", "Ejen AI Asas", "Membina Aliran Kerja", "Ukur Penjimatan Masa"] },
  { code: "AI-203", title: "AI untuk Khidmat Pelanggan", level: "PERTENGAHAN", hours: 4, path: "CUSTOMER_SERVICE", cat: "Produktiviti", desc: "Chatbot, templat balasan, analisis sentimen dan kawalan kualiti.", topics: ["Chatbot Asas", "Templat Balasan", "Analisis Sentimen", "Kawalan Kualiti", "Eskalasi kepada Manusia"] },
  { code: "AI-301", title: "Etika, Privasi dan Tadbir Urus AI", level: "SEMUA", hours: 3, path: "ALL", cat: "Tadbir", desc: "PDPA 2010, kerahsiaan data, bias, halusinasi dan dasar penggunaan AI organisasi.", topics: ["PDPA 2010", "Kerahsiaan Data", "Bias dalam AI", "Halusinasi", "Dasar AI Organisasi"] },
  { code: "AI-302", title: "Keselamatan Penggunaan AI", level: "SEMUA", hours: 3, path: "ALL", cat: "Tadbir", desc: "Kebocoran data, prompt injection, phishing dibantu AI dan amalan terbaik.", topics: ["Kebocoran Data", "Prompt Injection", "Phishing dibantu AI", "Amalan Terbaik", "Pelaporan Insiden"] },
  { code: "AI-401", title: "Membina Aplikasi AI (Pengenalan untuk Pembangun)", level: "LANJUTAN", hours: 8, path: "IT_DEV", cat: "Pembangunan", desc: "API model bahasa, RAG asas, penilaian output, kos dan prestasi.", topics: ["API Model Bahasa", "Panggilan & Token", "RAG Asas", "Penilaian Output", "Kos & Prestasi"] },
];

const QUESTION_BANK: Record<string, { q: string; type: string; opts: string[]; ans: string; exp: string }[]> = {
  "AI-101": [
    { q: "Apakah perbezaan utama antara AI tradisional dan AI generatif?", type: "multiple", opts: ["AI generatif hanya mengira nombor", "AI generatif boleh menghasilkan teks, imej atau kod baharu", "AI tradisional lebih pantas dalam semua tugas", "Tiada perbezaan"], ans: "AI generatif boleh menghasilkan teks, imej atau kod baharu", exp: "AI generatif menghasilkan kandungan baharu berdasarkan pola yang dipelajari." },
    { q: "PDPA 2010 mengawal apa di Malaysia?", type: "multiple", opts: ["Pengangkutan awam", "Perlindungan data peribadi", "Hak cipta", "Cukai pendapatan"], ans: "Perlindungan data peribadi", exp: "Akta Perlindungan Data Peribadi 2010 mengawal pemprosesan data peribadi." },
    { q: "AI bermaksud...", type: "short", opts: [], ans: "Kecerdasan Buatan", exp: "AI = Artificial Intelligence = Kecerdasan Buatan." },
    { q: "Pernyataan: AI generatif sentiasa memberi jawapan yang tepat.", type: "truefalse", opts: ["Benar", "Salah"], ans: "Salah", exp: "AI generatif boleh berhalusinasi (memberi maklumat salah)." },
    { q: "Manakah contoh kegunaan AI di Malaysia?", type: "multiple", opts: ["Chatbot khidmat pelanggan", "Pengesanan fraud perbankan", "Terjemahan automatik BM-EN", "Semua di atas"], ans: "Semua di atas", exp: "AI digunakan secara meluas dalam perbankan, kerajaan dan perkhidmatan." },
  ],
  "AI-102": [
    { q: "Unsur manakah TIDAK termasuk dalam anatomi prompt yang baik?", type: "multiple", opts: ["Peranan", "Konteks", "Format output", "Lagu kegemaran"], ans: "Lagu kegemaran", exp: "Anatomi prompt: peranan, tugas, konteks, format output." },
    { q: "Teknik Chain-of-Thought meminta AI untuk...", type: "multiple", opts: ["Menyanyi", "Berfikir langkah demi langkah", "Memadam data", "Menyenaraikan harga"], ans: "Berfikir langkah demi langkah", exp: "CoT membantu AI menyelesaikan masalah secara berperingkat." },
    { q: "Pernyataan: Konteks yang lebih jelas menghasilkan jawapan yang lebih tepat.", type: "truefalse", opts: ["Benar", "Salah"], ans: "Benar", exp: "Konteks membantu AI memahami keperluan pengguna." },
    { q: "Apakah singkatan persona dalam prompt?", type: "short", opts: [], ans: "Peranan", exp: "Persona ialah peranan yang diberikan kepada AI." },
    { q: "Format output yang baik boleh berupa JSON, jadual atau...", type: "short", opts: [], ans: "Senarai", exp: "Format output yang jelas: JSON, jadual, senarai, dll." },
  ],
  "AI-103": [
    { q: "Untuk menulis e-mel profesional, prompt yang terbaik ialah...", type: "multiple", opts: ["tulis email", "Tulis e-mel jemputan mesyuarat bertona formal kepada pelanggan", "email jom", "hantar email"], ans: "Tulis e-mel jemputan mesyuarat bertona formal kepada pelanggan", exp: "Prompt spesifik dengan tona dan tujuan menghasilkan e-mel lebih baik." },
    { q: "AI boleh meringkaskan mesyuarat jika diberikan...", type: "short", opts: [], ans: "Transkrip", exp: "Berikan transkrip/nota mesyuarat untuk diringkaskan." },
    { q: "Pernyataan: Terjemahan AI selalu 100% tepat tanpa semakan.", type: "truefalse", opts: ["Benar", "Salah"], ans: "Salah", exp: "Sentiasa semak terjemahan AI, terutama istilah teknikal." },
    { q: "Apakah risiko menggunakan AI untuk penyelidikan?", type: "multiple", opts: ["Maklumat salah/halusinasi", "Pantas sangat", "Terlalu murah", "Tiada risiko"], ans: "Maklumat salah/halusinasi", exp: "Sahkan fakta AI dengan sumber primer." },
    { q: "Brainstorming dengan AI paling berkesan bila...", type: "multiple", opts: ["Meminta banyak idea tanpa penilaian dahulu", "Meminta satu jawapan sahaja", "Tidak memberi konteks", "Menyalin terus"], ans: "Meminta banyak idea tanpa penilaian dahulu", exp: "Jana banyak idea dahulu, kemudian tapis." },
  ],
  "AI-201": [
    { q: "Langkah pertama analisis data ialah...", type: "multiple", opts: ["Membuat graf", "Pembersihan data", "Laporan", "Pembentangan"], ans: "Pembersihan data", exp: "Data bersih adalah asas analisis yang tepat." },
    { q: "Formula Excel untuk jumlah lajur A ialah...", type: "short", opts: [], ans: "=SUM(A:A)", exp: "SUM menjumlahkan julat sel." },
    { q: "Pernyataan: Visualisasi membantu memahami pola data dengan cepat.", type: "truefalse", opts: ["Benar", "Salah"], ans: "Benar", exp: "Graf mendedahkan trend dan outlier dengan cepat." },
    { q: "AI boleh membantu Excel menerusi...", type: "multiple", opts: ["Menjana formula", "Menerangkan formula", "Membersihkan data", "Semua di atas"], ans: "Semua di atas", exp: "AI membantu formula, penerangan dan pembersihan data." },
    { q: "Kesilapan biasa dalam tafsiran data ialah...", type: "short", opts: [], ans: "Correlasi bukan sebab", exp: "Correlasi tidak semestinya kausaliti." },
  ],
  "AI-202": [
    { q: "Tugas berulang yang sesuai diautomasi ialah...", type: "multiple", opts: ["Menyambut hari jadi rakan", "Memindahkan data antara hamparan", "Mesyuarat strategik", "Temu bual staf"], ans: "Memindahkan data antara hamparan", exp: "Tugas berulang & berstruktur sesuai diautomasi." },
    { q: "Alat tanpa kod membenarkan automatik tanpa...", type: "short", opts: [], ans: "Pengaturcaraan", exp: "No-code = tanpa menulis kod." },
    { q: "Pernyataan: Ejen AI boleh membuat keputusan berbilang langkah.", type: "truefalse", opts: ["Benar", "Salah"], ans: "Benar", exp: "Ejen AI boleh merancang dan melaksanakan beberapa langkah." },
    { q: "Metrik penjimatan masa diukur dengan...", type: "multiple", opts: ["Masa sebelum vs selepas automatik", "Bilangan pekerja", "Warna butang", "Saiz pejabat"], ans: "Masa sebelum vs selepas automatik", exp: "Bandingkan masa sebelum dan selepas automatik." },
    { q: "Risiko automatik ialah...", type: "short", opts: [], ans: "Ralat berskala besar", exp: "Ralat automatik boleh berlaku berkali-kali jika tidak dikesan." },
  ],
  "AI-203": [
    { q: "Chatbot khidmat pelanggan yang baik mesti...", type: "multiple", opts: ["Eskalasi kepada manusia bila perlu", "Tidak pernah mengaku tidak tahu", "Memaksa jawapan", "Sembunyi kontak"], ans: "Eskalasi kepada manusia bila perlu", exp: "Eskalasi kepada manusia penting untuk isu kompleks." },
    { q: "Analisis sentimen mengesan...", type: "short", opts: [], ans: "Emosi", exp: "Sentimen = positif, negatif atau neutral." },
    { q: "Pernyataan: Templat balasan menjadikan respons lebih konsisten.", type: "truefalse", opts: ["Benar", "Salah"], ans: "Benar", exp: "Templat memastikan konsistensi dan kelajuan." },
    { q: "Kawalan kualiti chatbot termasuk...", type: "multiple", opts: ["Pemantauan jawapan", "Ujian berkala", "Maklum balas pengguna", "Semua di atas"], ans: "Semua di atas", exp: "Kawalan kualiti = pemantauan + ujian + maklum balas." },
    { q: "Bila chatbot patut eskalasi ke manusia?", type: "short", opts: [], ans: "Emosi negatif", exp: "Eskalasi apabila pelanggan marah atau isu kompleks." },
  ],
  "AI-301": [
    { q: "PDPA 2010 memerlukan organisasi untuk...", type: "multiple", opts: ["Memohon persetujuan data", "Kongsi data bebas", "Abai privasi", "Simpan data selama-lamanya"], ans: "Memohon persetujuan data", exp: "Persetujuan adalah prinsip utama PDPA." },
    { q: "Bias dalam AI bermaksud...", type: "short", opts: [], ans: "Prasangka", exp: "Bias = kecondongan tidak adil dalam output AI." },
    { q: "Pernyataan: Halusinasi AI ialah apabila AI memberi maklumat palsu yakin.", type: "truefalse", opts: ["Benar", "Salah"], ans: "Benar", exp: "Halusinasi = AI mengarang maklumat dengan yakin." },
    { q: "Amalan terbaik ialah tidak memasukkan ____ ke alat AI awam.", type: "multiple", opts: ["Data sulit/peribadi", "Meme", "Soalan lazim", "Gambar landskap"], ans: "Data sulit/peribadi", exp: "Jangan masukkan data sulit ke AI awam." },
    { q: "Dasar AI organisasi biasanya menetapkan...", type: "multiple", opts: ["Penggunaan dibenarkan", "Jenis data dilarang", "Semakan manusia", "Semua di atas"], ans: "Semua di atas", exp: "Dasar AI merangkumi penggunaan, data dan semakan." },
  ],
  "AI-302": [
    { q: "Prompt injection ialah serangan yang...", type: "multiple", opts: ["Menyuntuk arahan tersembunyi", "Memadam akaun", "Mematikan komputer", "Mengubah laluan"], ans: "Menyuntuk arahan tersembunyi", exp: "Prompt injection memanipulasi AI menerusi input." },
    { q: "Untuk elak kebocoran data, gunakan AI yang...", type: "short", opts: [], ans: "Premis peribadi", exp: "On-premise / enterprise AI untuk data sensitif." },
    { q: "Pernyataan: Phishing dibantu AI lebih sukar dikesan kerana lebih munasabah.", type: "truefalse", opts: ["Benar", "Salah"], ans: "Benar", exp: "AI menjana e-mel phishing yang sangat munasabah." },
    { q: "Amalan terbaik keselamatan AI ialah...", type: "multiple", opts: ["Semak output AI", "Hadkan akses data", "Log penggunaan", "Semua di atas"], ans: "Semua di atas", exp: "Semak, hadkan dan log untuk keselamatan AI." },
    { q: "Tanda phishing dibantu AI ialah...", type: "short", opts: [], ans: "Urgensi terlampau", exp: "Urgensi terlampau dan pautan pelik adalah tanda phishing." },
  ],
  "AI-401": [
    { q: "API model bahasa biasanya diukur dengan...", type: "multiple", opts: ["Token", "Piksel", "Byte sahaja", "Kadar frames"], ans: "Token", exp: "Penggunaan API diukur dalam token." },
    { q: "RAG bermaksud Retrieval-Augmented...", type: "short", opts: [], ans: "Generation", exp: "RAG = Retrieval-Augmented Generation." },
    { q: "Pernyataan: RAG menggunakan pangkalan pengetahuan luaran untuk menjawab.", type: "truefalse", opts: ["Benar", "Salah"], ans: "Benar", exp: "RAG memanggil dokumen luaran untuk jawapan tepat." },
    { q: "Penilaian output AI boleh dilakukan menerusi...", type: "multiple", opts: ["Metrik automatik", "Penilaian manusia", "A/B testing", "Semua di atas"], ans: "Semua di atas", exp: "Gabungan metrik, manusia dan A/B untuk penilaian." },
    { q: "Kos API bergantung kepada...", type: "short", opts: [], ans: "Token", exp: "Lebih token = lebih mahal." },
  ],
};

async function main() {
  console.log("Seeding LMS Al Amin...");

  // Wipe
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.certificate.deleteMany();
  await db.attendanceCorrection.deleteMany();
  await db.attendance.deleteMany();
  await db.session.deleteMany();
  await db.quizAttempt.deleteMany();
  await db.question.deleteMany();
  await db.quiz.deleteMany();
  await db.lessonProgress.deleteMany();
  await db.lesson.deleteMany();
  await db.module.deleteMany();
  await db.enrollment.deleteMany();
  await db.course.deleteMany();
  await db.user.deleteMany();
  await db.category.deleteMany();
  await db.department.deleteMany();

  // Departments
  const deptNames = ["Pentadbiran & Kewanan", "Khidmat Pelanggan", "IT & Pembangunan", "Sumber Manusia & Latihan", "Operasi", "Pemasaran"];
  const deptKeys = ["ADMIN_FINANCE", "CUSTOMER_SERVICE", "IT_DEV", "HR_TRAINING", "OPERATIONS", "MARKETING"];
  const departments = deptNames.map((name, i) => ({ id: `dept-${i}`, name, key: deptKeys[i] }));
  for (const d of departments) {
    await db.department.create({ data: { id: d.id, name: d.name } });
  }

  // Categories
  const catNames = ["Asas", "Produktiviti", "Data", "Automasi", "Tadbir", "Pembangunan"];
  const categories: { id: string; name: string }[] = [];
  for (let i = 0; i < catNames.length; i++) {
    const id = `cat-${i}`;
    await db.category.create({ data: { id, name: catNames[i], description: `Kategori ${catNames[i]}` } });
    categories.push({ id, name: catNames[i] });
  }

  // Users
  const r = rnd(42);
  const users: { id: string; staffNo: string; name: string; email: string; role: string; dept: string; position: string }[] = [];

  // Admin
  users.push({ id: "u-admin", staffNo: "A1001", name: "Ahmad Faizal bin Rahman", email: "admin@alamin.edu.my", role: "ADMIN", dept: departments[3].id, position: "Pentadbir Sistem LMS" });

  // HR / Pengurus
  users.push({ id: "u-hr1", staffNo: "A1002", name: "Siti Nurhaliza binti Osman", email: "hr1@alamin.edu.my", role: "HR", dept: departments[3].id, position: "Pegawai HR" });
  users.push({ id: "u-hr2", staffNo: "A1003", name: "Raj Kumar a/l Subramaniam", email: "hr2@alamin.edu.my", role: "HR", dept: departments[3].id, position: "Penyelaras Latihan" });

  // Trainers (4)
  const trainers = [
    { id: "u-tr1", staffNo: "A1004", name: "Dr. Nurul Aina binti Hassan", email: "trainer1@alamin.edu.my", dept: departments[2].id, position: "Jurulatih AI Kanan" },
    { id: "u-tr2", staffNo: "A1005", name: "Lim Wei Jie", email: "trainer2@alamin.edu.my", dept: departments[2].id, position: "Jurulatih AI" },
    { id: "u-tr3", staffNo: "A1006", name: "Priya Devi a/p Krishnan", email: "trainer3@alamin.edu.my", dept: departments[3].id, position: "Fasilitator Latihan" },
    { id: "u-tr4", staffNo: "A1007", name: "Mohd Hafiz bin Ismail", email: "trainer4@alamin.edu.my", dept: departments[2].id, position: "Jurulatih Pembangun" },
  ];
  for (const t of trainers) users.push({ ...t, role: "TRAINER" });

  // Staff (33)
  let staffIdx = 1008;
  const staffDeptKeys = ["ADMIN_FINANCE", "CUSTOMER_SERVICE", "IT_DEV", "OPERATIONS", "MARKETING", "HR_TRAINING"];
  for (let i = 0; i < 33; i++) {
    const dk = staffDeptKeys[i % staffDeptKeys.length];
    const dept = departments.find((d) => d.key === dk)!;
    const comm = i % 3;
    const first = comm === 0 ? pick(MALAY_FIRST, r) : comm === 1 ? pick(CHINESE_FIRST, r) : pick(INDIAN_FIRST, r);
    const last = comm === 0 || comm === 2 ? pick(LAST, r) : pick(LAST.filter((l) => ["Tan", "Lim", "Wong", "Goh", "Ng", "Chong", "Lee"].includes(l)), r);
    const name = `${first} ${last}`;
    const staffNo = `A${staffIdx + i}`;
    const email = `${first.toLowerCase()}.${staffNo.toLowerCase()}@alamin.edu.my`;
    const position = pick(POSITIONS[dk], r);
    users.push({ id: `u-st${i + 1}`, staffNo, name, email, role: "STAFF", dept: dept.id, position });
  }

  // Create users in DB
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    await db.user.create({
      data: {
        id: u.id,
        staffNo: u.staffNo,
        name: u.name,
        email: u.email,
        passwordHash: hash("password123"),
        role: u.role,
        departmentId: u.dept,
        position: u.position,
        language: "ms",
        status: "ACTIVE",
        avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
      },
    });
  }
  // Set department heads
  await db.department.update({ where: { id: departments[0].id }, data: { headUserId: "u-hr1" } });
  await db.department.update({ where: { id: departments[1].id }, data: { headUserId: "u-hr2" } });
  await db.department.update({ where: { id: departments[2].id }, data: { headUserId: "u-tr1" } });
  await db.department.update({ where: { id: departments[3].id }, data: { headUserId: "u-hr1" } });
  await db.department.update({ where: { id: departments[4].id }, data: { headUserId: "u-hr2" } });
  await db.department.update({ where: { id: departments[5].id }, data: { headUserId: "u-hr1" } });

  console.log(`Created ${users.length} users`);

  // Courses, modules, lessons, quizzes, questions
  const courseIds: string[] = [];
  for (let ci = 0; ci < COURSES.length; ci++) {
    const c = COURSES[ci];
    const cat = categories.find((x) => x.name === c.cat)!;
    const instructorId = trainers[ci % trainers.length].id;
    const courseId = `c-${ci}`;
    courseIds.push(courseId);
    await db.course.create({
      data: {
        id: courseId,
        code: c.code,
        title: c.title,
        description: c.desc,
        categoryId: cat.id,
        level: c.level,
        language: "bilingual",
        durationHours: c.hours,
        instructorId,
        status: ci < 7 ? "PUBLISHED" : (ci === 7 ? "PUBLISHED" : "DRAFT"),
        passMark: 70,
        minAttendancePct: c.path === "ALL" ? 0 : 60,
        thumbnail: c.code,
        learningPath: c.path,
      },
    });

    // 3 modules
    for (let mi = 0; mi < 3; mi++) {
      const moduleId = `${courseId}-m${mi}`;
      await db.module.create({ data: { id: moduleId, courseId, title: `Modul ${mi + 1}: ${c.topics[mi % c.topics.length]}`, order: mi } });
      // 3 lessons per module (2-4)
      const lessonCount = 3;
      for (let li = 0; li < lessonCount; li++) {
        const topicIdx = (mi * lessonCount + li) % c.topics.length;
        const type = (li === 0) ? "text" : (li === 1) ? "video" : (li === 2) ? "lab" : "pdf";
        const lessonId = `${moduleId}-l${li}`;
        const content = type === "video"
          ? `https://example.com/videos/${c.code}/${lessonId}`
          : type === "lab"
          ? `# Makmal Interaktif\n\nCuba prompt berikut:\n\n\`\`\`\nAnda ialah ${c.code === "AI-102" ? "jurutera prompt" : "pembantu AI"}. Tunjukkan contoh ${c.topics[topicIdx]}.\n\`\`\`\n\nBandingkan jawapan dengan dan tanpa konteks.`
          : `# ${c.topics[topicIdx]}\n\nDalam pelajaran ini, kita akan meneroka **${c.topics[topicIdx]}** dalam konteks ${c.title}.\n\n## Objektif\n- Memahami konsep ${c.topics[topicIdx]}\n- Mengaplikasi dalam kerja harian\n- Mengenal pasti had dan risiko\n\n## Kandungan\n${c.topics[topicIdx]} adalah komponen penting dalam ${c.title}. Penggunaan yang betul memerlukan pemahaman teori dan amalan.\n\n## Ringkasan\n${c.topics[topicIdx]} membantu kakitangan Al Amin menggunakan AI dengan berkesan dan selamat.`;
        await db.lesson.create({
          data: { id: lessonId, moduleId, title: `${c.topics[topicIdx]}${type === "video" ? " (Video)" : type === "lab" ? " (Makmal)" : ""}`, type, content, durationMin: 8 + li * 4, order: li },
        });
      }
    }

    // 1 quiz with questions
    const quizId = `${courseId}-q`;
    const qbank = QUESTION_BANK[c.code] || QUESTION_BANK["AI-101"];
    await db.quiz.create({ data: { id: quizId, courseId, title: `Kuiz ${c.code}`, timeLimitMin: 15, maxAttempts: 3, passMark: 70 } });
    qbank.forEach((qb, qi) => {
      db.question.create({
        data: {
          id: `${quizId}-q${qi}`,
          quizId,
          type: qb.type,
          text: qb.q,
          options: JSON.stringify(qb.opts),
          correctAnswer: qb.ans,
          explanation: qb.exp,
          points: 1,
          order: qi,
        },
      });
    });
  }
  console.log(`Created ${COURSES.length} courses with modules, lessons, quizzes`);

  // Enrollments: assign learning paths to staff + trainers
  const staffUsers = users.filter((u) => u.role === "STAFF");
  const allLearners = [...staffUsers, ...trainers.map((t) => ({ ...t, role: "TRAINER" as const }))];
  let enrollCount = 0;
  for (const u of allLearners) {
    const userDept = users.find((x) => x.id === u.id)!.dept;
    const deptKey = departments.find((d) => d.id === userDept)!.key;
    // Determine path
    const pathCourses = COURSES.filter((c) => c.path === "ALL" || c.path === deptKey || (deptKey === "HR_TRAINING" && c.path === "ALL"));
    for (const c of pathCourses) {
      const courseIdx = COURSES.indexOf(c);
      const courseId = courseIds[courseIdx];
      const r2 = r();
      const status = r2 < 0.45 ? "COMPLETED" : r2 < 0.75 ? "IN_PROGRESS" : "ENROLLED";
      const progress = status === "COMPLETED" ? 100 : status === "IN_PROGRESS" ? Math.floor(20 + r() * 60) : Math.floor(r() * 20);
      const completedAt = status === "COMPLETED" ? new Date(Date.now() - Math.floor(r() * 30) * 86400000) : null;
      const dueDate = new Date(Date.now() + Math.floor(10 + r() * 30) * 86400000);
      await db.enrollment.create({
        data: {
          id: `en-${enrollCount}`,
          userId: u.id,
          courseId,
          assignedBy: u.role === "STAFF" ? "u-hr1" : null,
          status,
          progressPct: progress,
          dueDate,
          completedAt,
        },
      });
      enrollCount++;

      // Lesson progress for completed/in-progress
      if (status !== "ENROLLED") {
        const lessons = await db.lesson.findMany({ where: { module: { courseId } }, orderBy: { order: "asc" } });
        const lessonsToComplete = Math.floor((lessons.length * progress) / 100);
        for (let li = 0; li < lessons.length; li++) {
          await db.lessonProgress.upsert({
            where: { userId_lessonId: { userId: u.id, lessonId: lessons[li].id } },
            update: {},
            create: {
              userId: u.id,
              lessonId: lessons[li].id,
              completed: li < lessonsToComplete,
              lastPosition: li < lessonsToComplete ? "end" : "0",
            },
          });
        }
      }

      // Quiz attempt for completed
      if (status === "COMPLETED") {
        const quiz = await db.quiz.findFirst({ where: { courseId } });
        if (quiz) {
          const score = 70 + Math.floor(r() * 30);
          await db.quizAttempt.create({
            data: {
              id: `qa-${enrollCount}`,
              userId: u.id,
              quizId: quiz.id,
              score,
              passed: score >= quiz.passMark,
              answers: JSON.stringify({ placeholder: true }),
              submittedAt: completedAt,
            },
          });
        }
      }
    }
  }
  console.log(`Created ${enrollCount} enrollments`);

  // Certificates for completed courses (limit ~30)
  const completed = await db.enrollment.findMany({ where: { status: "COMPLETED" }, include: { course: true } });
  let certCount = 0;
  const certTarget = Math.min(30, completed.length);
  for (let i = 0; i < certTarget; i++) {
    const e = completed[i];
    const certNo = `LMS-AM-${String(certCount + 1).padStart(5, "0")}-${new Date().getFullYear()}`;
    const verifyCode = (Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)).toUpperCase();
    await db.certificate.create({
      data: {
        id: `cert-${certCount}`,
        userId: e.userId,
        courseId: e.courseId,
        certNo,
        issuedAt: e.completedAt || new Date(),
        expiresAt: new Date(Date.now() + 365 * 86400000),
        verifyCode,
      },
    });
    certCount++;
  }
  console.log(`Created ${certCount} certificates`);

  // Sessions: 24 (past, today, future)
  const trainerIds = trainers.map((t) => t.id);
  const now = new Date();
  const kualaLumpurOffset = 8 * 60; // UTC+8
  const localNow = new Date(now.getTime() + (kualaLumpurOffset * 60000) - (now.getTimezoneOffset() * 60000));
  const sessionCount = 24;
  let attCount = 0;
  for (let si = 0; si < sessionCount; si++) {
    const courseIdx = si % COURSES.length;
    const courseId = courseIds[courseIdx];
    const trainerId = trainerIds[si % trainerIds.length];
    // Spread: 10 past, 4 today, 10 future
    const dayOffset = si < 10 ? -(si + 1) * 3 : si < 14 ? 0 : (si - 13) * 3;
    const sessDate = new Date(localNow);
    sessDate.setDate(sessDate.getDate() + dayOffset);
    const startHour = 9 + (si % 4) * 2;
    const startTime = `${String(startHour).padStart(2, "0")}:00`;
    const endTime = `${String(startHour + Math.ceil(COURSES[courseIdx].hours / 2)).padStart(2, "0")}:30`;
    const qrToken = `qrtok-${si}-${Math.random().toString(36).slice(2, 10)}`;
    const sessionCode = String(100000 + Math.floor(r() * 899999));
    const codeExpiry = new Date(sessDate.getTime() + (startHour + 1) * 60000);
    const isOnline = si % 3 === 0;
    const sessionId = `sess-${si}`;
    await db.session.create({
      data: {
        id: sessionId,
        courseId,
        title: `${COURSES[courseIdx].code}: ${COURSES[courseIdx].title}`,
        date: new Date(sessDate.getFullYear(), sessDate.getMonth(), sessDate.getDate()),
        startTime,
        endTime,
        mode: isOnline ? "dalam_talian" : "bersemuka",
        location: isOnline ? null : `Bilik Latihan ${1 + (si % 4)}, Menara Al Amin, KL`,
        url: isOnline ? `https://meet.example.com/alamin-${si}` : null,
        capacity: 30,
        qrToken,
        sessionCode,
        codeExpiry,
        lateAfterMin: 15,
        trainerId,
      },
    });

    // Attendance for staff (enrolled in this course)
    const enrolled = await db.enrollment.findMany({ where: { courseId }, take: 25 });
    const statuses = ["hadir", "hadir", "hadir", "hadir", "lewat", "tidak_hadir", "cuti"];
    for (let ai = 0; ai < enrolled.length; ai++) {
      const e = enrolled[ai];
      const isPast = dayOffset < 0 || (dayOffset === 0 && localNow.getHours() >= startHour + 2);
      if (!isPast) continue; // only record for past/today sessions that ended
      const status = pick(statuses, r);
      const checkInAt = status === "hadir" || status === "lewat"
        ? new Date(sessDate.getTime() + (startHour * 60 + (status === "lewat" ? 20 : 2)) * 60000)
        : null;
      const method = pick(["QR", "code", "manual", "import"], r);
      await db.attendance.create({
        data: {
          id: `att-${attCount}`,
          sessionId,
          userId: e.userId,
          status,
          checkInAt,
          method,
          recordedById: method === "manual" || method === "import" ? trainerId : null,
          remarks: status === "cuti" ? "Cuti tahunan" : status === "tidak_hadir" ? "Tiada notis" : null,
        },
      });
      attCount++;
    }
  }
  console.log(`Created ${sessionCount} sessions, ${attCount} attendance records`);

  // Notifications
  const notifTypes = [
    { type: "assigned", msg: "Kursus AI-101 telah ditugaskan kepada anda" },
    { type: "upcoming", msg: "Sesi latihan akan datang esok pada 09:00" },
    { type: "deadline", msg: "Tarikh akhir kuiz AI-102 dalam 3 hari" },
    { type: "certificate", msg: "Sijil anda untuk AI-301 sedia untuk dimuat turun" },
  ];
  for (const u of users) {
    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const t = pick(notifTypes, r);
      await db.notification.create({
        data: {
          id: `n-${u.id}-${i}`,
          userId: u.id,
          type: t.type,
          message: t.msg,
          read: r() < 0.5,
          createdAt: new Date(Date.now() - Math.floor(r() * 5) * 86400000),
        },
      });
    }
  }

  // Audit logs
  const auditActions = [
    { action: "CREATE_SESSION", entity: "Session" },
    { action: "BULK_ATTENDANCE", entity: "Attendance" },
    { action: "IMPORT_CSV", entity: "Attendance" },
    { action: "APPROVE_CORRECTION", entity: "AttendanceCorrection" },
    { action: "ISSUE_CERTIFICATE", entity: "Certificate" },
    { action: "RESET_DUMMY_DATA", entity: "System" },
    { action: "CREATE_COURSE", entity: "Course" },
    { action: "UPDATE_USER", entity: "User" },
  ];
  for (let i = 0; i < 40; i++) {
    const a = pick(auditActions, r);
    const actor = pick([...users.filter((u) => u.role === "ADMIN" || u.role === "HR" || u.role === "TRAINER")], r);
    await db.auditLog.create({
      data: {
        id: `al-${i}`,
        userId: actor.id,
        action: a.action,
        entity: a.entity,
        entityId: `ent-${i}`,
        before: JSON.stringify({ status: "hadir" }),
        after: JSON.stringify({ status: "lewat" }),
        timestamp: new Date(Date.now() - Math.floor(r() * 14) * 86400000),
      },
    });
  }

  // Pending corrections
  const someAtt = await db.attendance.findMany({ where: { status: "lewat" }, take: 4 });
  for (let i = 0; i < someAtt.length; i++) {
    await db.attendanceCorrection.create({
      data: {
        id: `ac-${i}`,
        attendanceId: someAtt[i].id,
        requestedById: someAtt[i].userId,
        oldStatus: "lewat",
        newStatus: "hadir",
        reason: "Tiba tepat pada masa, kesilapan rekod QR",
        state: "PENDING",
      },
    });
  }

  console.log("Seed complete!");
  console.log("Login: admin@alamin.edu.my / hr1@alamin.edu.my / trainer1@alamin.edu.my / A1008 staff");
  console.log("Password for all: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

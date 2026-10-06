# FitCoach: Panduan Fitur

Penjelasan fitur aplikasi dalam bahasa sederhana. Ditulis untuk pihak yang memesan aplikasi ini: tidak perlu pengetahuan teknis.

*"FitCoach" hanyalah nama sementara dan bisa diganti.*

*Versi bahasa Inggris: [features.md](features.md).*

---

## 1. Gambaran singkat

FitCoach adalah aplikasi kebugaran untuk pasar Indonesia dengan **dua cara berlatih**:

| | **Keanggotaan Bulanan (Monthly)** | **Coaching 1-on-1** |
| --- | --- | --- |
| Harga (contoh) | Rp 79.000 / bulan | Rp 499.000 / bulan |
| Yang didapat | Pustaka latihan siap pakai lengkap dengan video contoh, untuk diikuti sendiri | Pelatih sungguhan yang menyusun **program pribadi khusus untuk Anda**, menyesuaikannya tiap minggu, dan bertemu lewat panggilan video |
| Cocok untuk | Orang yang ingin panduan dan variasi latihan | Orang yang ingin ada yang mendampingi dan program yang disesuaikan dengan tujuannya (lari, renang, atau kebugaran umum) |
| Termasuk pustaka latihan? | Ya | Ya, ditambah semua yang ada di bawah |

Ada **dua program**:
- **Aplikasi seluler** (iPhone dan Android) dipakai oleh anggota dan klien coaching.
- **Dasbor pelatih** (sebuah situs web) dipakai pelatih untuk mengelola klien, program, dan konten.

Pembayaran memakai **QRIS**, jadi pelanggan bisa membayar dengan GoPay, OVO, DANA, ShopeePay, atau mobile banking.

---

## 2. Untuk anggota dan klien (aplikasi seluler)

### 2.1 Memulai
- **Daftar** dengan nama, email, dan kata sandi; **masuk**; **keluar**.
- **Lupa kata sandi:** pengguna meminta tautan reset lewat email. *(Di prototipe ini email hanya dicetak di log server, belum dikirim. Lihat bagian 5.)*
- **Pengaturan pribadi singkat (3 pertanyaan)** langsung setelah mendaftar: ingin berlatih untuk apa (kebugaran umum, lari, atau renang), levelnya, dan tujuannya. Ini dipakai untuk merekomendasikan latihan dan ditampilkan kepada pelatih.
- **Gratis untuk dilihat-lihat:** siapa pun yang punya akun bisa melihat semua latihan. Video dan pencatatan terbuka setelah berlangganan.
- **Tampilan terang, gelap, atau otomatis**, dipilih di Profil.

### 2.2 Layar Beranda
Dasbor harian yang berubah sesuai aktivitas pengguna:
- **Sapaan dan tanggal.**
- **Lingkaran target mingguan:** lingkaran bergaya "activity ring" yang menunjukkan hari latihan minggu ini dibanding target pengguna (mereka memilih 2–7 hari). Berubah hijau dengan 🎉 saat target tercapai.
- **Baris minggu ini:** Senin sampai Minggu, dengan tanda centang di setiap hari berlatih.
- **Tiga kartu statistik:** **streak** saat ini (hari berturut-turut), **selesai minggu ini**, dan **latihan pustaka** yang sudah dikerjakan. Angkanya menghitung naik saat layar dibuka.
- **Sesi coaching berikutnya** (klien coaching): kapan waktunya, hitung mundur langsung ("mulai dalam 2j 14m", berubah menjadi **LIVE NOW** merah), dan tombol **Gabung Google Meet**.
- **Latihan hari ini** (klien coaching): latihan yang ditetapkan pelatih untuk hari ini, dengan centang, dan tombol **Mulai sesi hari ini**.
- **Minggu Anda dalam otot:** peta tubuh yang menyala di bagian yang dilatih selama 7 hari terakhir. Jika ada kelompok otot besar yang belum dilatih, aplikasi memberi tahu dan menawarkan **Cari latihan**.
- **Direkomendasikan untuk Anda:** latihan yang dipilih berdasarkan olahraga dan level pengguna.
- **Latih per otot:** pintasan seperti Dada, Bisep, Glutes yang membuka latihan yang sesuai.
- **Kartu keanggotaan** yang menampilkan paket dan batas waktu pembayarannya.
- Pengunjung tanpa paket melihat spanduk ramah **"Mulai berlatih hari ini"**.

### 2.3 Pustaka latihan (Keanggotaan Bulanan)
- **11 latihan siap pakai** dan **31 gerakan** sebagai awal. Pelatih bisa menambah dan mengubahnya.
- **Pencarian** berdasarkan nama latihan, deskripsi, atau nama gerakan.
- **Filter:** jenis (Kekuatan, Kardio, Fleksibilitas, Khusus olahraga), tempat berlatih (**Di rumah, Tanpa alat, Gym**), level (Pemula, Menengah, Lanjut), dan **otot target**.
- Setiap kartu latihan menampilkan durasi, level, tempat, dan otot yang dilatih.
- **Halaman latihan:**
  - Video (khusus anggota; yang lain melihat pratinjau "Khusus anggota" dan tombol untuk membuka).
  - Ringkasan: waktu, level, jumlah gerakan, tempat.
  - **Otot yang dilatih:** peta tubuh depan dan belakang untuk seluruh latihan.
  - **Setiap gerakan**, bernomor, dengan set, repetisi atau waktu, dan istirahat. Ketuk salah satu untuk melihat tips pelatihan, **video contoh**, peta ototnya sendiri, dan **alternatif untuk yang tidak punya alat** (misalnya "tidak punya dumbbell? pakai tas berisi buku").
  - **Mulai latihan** (pemandu latihan di bawah), atau **Sudah dikerjakan? Catat** dengan catatan opsional.
- **Riwayat** latihan yang sudah selesai, beserta catatan.

### 2.4 Pemandu latihan
Tekan **Mulai latihan** dan aplikasi mendampingi pengguna seperti pelatih pribadi:
- **Hitung mundur 3-2-1**, lalu satu gerakan setiap kali dengan otot yang bekerja serta tips dari pelatih atau gerakannya.
- **Gerakan berbasis repetisi:** target repetisi besar dan tombol **Set selesai**.
- **Gerakan berbasis waktu** (plank, peregangan): lingkaran hitung mundur yang lanjut sendiri.
- **Lari dan renang:** stopwatch yang menampilkan jarak dan pace target.
- **Istirahat antar set:** lingkaran hitung mundur dengan **−15 dtk**, **Lewati istirahat**, dan **+15 dtk**, tip singkat, dan pratinjau gerakan berikutnya.
- **Video contoh** dan **alternatif tanpa alat** tersedia kapan saja; **Lewati** satu gerakan; **Jeda** semuanya.
- Bilah kemajuan untuk seluruh latihan, total waktu, getaran sebagai isyarat di ponsel, dan layar tetap menyala.
- **Perayaan di akhir:** konfeti, waktu, set dan repetisi (atau jarak), otot yang dilatih, dan "Bagaimana rasanya?" (Berat / Pas / Mudah) dengan catatan opsional.
- **Menyimpan** mencatat latihan dan menampilkan streak baru serta pencapaian (latihan ke-1, 5, 10, 25, 50, 100).
- Berlaku untuk latihan pustaka dan untuk **hari dalam program coaching**. Untuk klien coaching, menyimpan akan mengirim semua gerakan ke pelatih mereka.

### 2.5 Coaching 1-on-1 (tab "My Coach")
Tampilan layar bergantung pada posisi klien:
1. **Bukan klien coaching:** penjelasan jelas tentang apa yang ditambahkan 1-on-1 dibanding Bulanan, lengkap dengan harga dan tombol **Dapatkan pelatih saya**.
2. **Sudah bayar, menunggu pelatih:** "Kami sedang mencarikan pelatih untuk Anda", dengan tombol untuk berlatih memakai pustaka sementara itu. Mereka diberi tahu saat sudah dipasangkan.
3. **Pelatih sudah ditentukan, program belum siap:** "Pelatih Anda sedang menyusun program".
4. **Program aktif:**
   - **Kartu pelatih** dengan inisial, spesialisasi, dan bio singkat.
   - Kartu **sesi berikutnya**.
   - **Kartu program:** nama, minggu ke-X dari Y, catatan pelatih, dan bilah kemajuan keseluruhan.
   - **Pemilih minggu** dan **pemilih hari Senin–Minggu** dengan titik untuk hari yang ada latihannya dan centang untuk hari yang selesai.
   - **Gerakan pada hari itu:** nama, apa yang dikerjakan ("3 × 10", "6 × 400 m @ 5:00/km"), dan ototnya.
   - **Mulai sesi hari ini** untuk memakai pemandu latihan.
   - **Hari istirahat** ditampilkan dengan ramah.
- **Halaman gerakan:** catatan pelatih, video contoh, peta otot, alternatif tanpa alat, dan **formulir catatan**: set, repetisi, dan beban untuk latihan kekuatan, atau jarak dan waktu untuk lari dan renang, ditambah "bagaimana rasanya?". Mengosongkan angka berarti dicatat persis sesuai yang ditetapkan. Pelatih langsung melihat semuanya.
- **Program bersifat pribadi:** dua klien tidak akan mendapat program yang sama kecuali pelatih memilih demikian.

### 2.6 Sesi coaching
- **Sesi video 45 menit** setiap minggu lewat Google Meet, ditambah **sesi tatap muka** bila pelatih menawarkannya.
- Daftar sesi **mendatang dan yang sudah lewat**.
- Tombol **Gabung** untuk sesi online (menyala mulai 10 menit sebelum mulai); tombol **Petunjuk arah** (membuka Maps) untuk sesi tatap muka.
- **Tandai hadir** setelah sesi.
- Perubahan jadwal dan pembatalan oleh pelatih langsung muncul.

### 2.7 Notifikasi
- **Kotak masuk di dalam aplikasi** dengan lonceng dan jumlah belum dibaca; mengetuk notifikasi membuka layar terkait; **Tandai semua dibaca**.
- Dikirim otomatis untuk: **pelatih ditentukan**, **program baru diterbitkan**, **sesi dijadwalkan / dipindah / dibatalkan**, **pembayaran diterima**.
- **Pengingat otomatis:** sehari sebelum setiap sesi, dan 3 hari sebelum paket berakhir agar pelanggan bisa memperpanjang.
- *Notifikasi push ke layar kunci ponsel sudah direncanakan (butuh akun Firebase). Lihat bagian 5.*

### 2.8 Keanggotaan dan pembayaran
- **Pemilih paket** membandingkan kedua paket berdampingan, dengan harga dan isinya.
- Klien coaching memilih **fokus**: Lari, Renang, atau Kebugaran umum.
- **Bayar dengan QRIS:** aplikasi membuka halaman pembayaran yang menampilkan kode QR. Aplikasi menunggu dan mengonfirmasi sendiri begitu pembayaran masuk, lalu menampilkan "Anda sudah masuk! 🎉".
- **Tidak ada tagihan ganda:** mengetuk dua kali tidak membuat dua pembayaran.
- **Perpanjang lebih awal:** sisa waktu ditambah dengan waktu baru.
- **Jeda** (hari dibekukan dan dikembalikan saat dilanjutkan), **lanjutkan**, dan **batalkan** (akses tetap sampai masa bayar habis).
- **Riwayat pembayaran** beserta tanda terima.
- *QRIS tidak bisa menagih otomatis tiap bulan, jadi setiap bulan adalah pembayaran baru. Aplikasi mengingatkan sebelum masa berlaku habis.*

### 2.9 Profil
- Kartu profil dengan nama, paket, level, minat, dan **tujuan**.
- **Ubah profil:** nama, tahun lahir, level, minat, tujuan.
- **Keanggotaan dan pembayaran**, **Notifikasi**, **Riwayat latihan**, **Sesi coaching**.
- **Tampilan:** Otomatis / Terang / Gelap.

---

## 3. Peta otot

Gerakan diberi label otot yang dilatihnya, sehingga aplikasi bisa *menunjukkan* apa yang dilakukan sebuah gerakan.
- **14 kelompok otot:** dada, bahu, bisep, trisep, lengan bawah, perut, oblik, trapezius, lats, punggung bawah, glutes, paha depan, paha belakang, betis.
- **Dua tingkat:** **fokus utama** (oranye pekat) dan **ikut bekerja** (oranye muda).
- **Pelatih yang menentukan:** di dasbor, pelatih mengeklik otot pada diagram tubuh (klik sekali untuk fokus utama, dua kali untuk ikut bekerja, tiga kali untuk menghapus). Contoh: Bicep curl → klik *Bisep* → anggota melihat bisep menyala.
- **Anggota melihatnya** di latihan, di setiap gerakan, di hasil pemandu latihan, di gerakan coaching, dan sebagai peta panas di Beranda.
- **Cari berdasarkan otot** dengan filter Otot target.
- Berupa **gambar 2D tampak depan dan belakang**, bukan model 3D. Penampil anatomi 3D sungguhan bisa ditambahkan nanti dan membutuhkan model 3D berlisensi (lihat bagian 5).

---

## 4. Untuk pelatih (situs dasbor)

Pelatih masuk lewat situs web (**akun terpisah** dari klien). Halaman masuk demo punya akun pelatih contoh satu klik.

### 4.1 Dasbor (beranda)
- Sapaan dan empat angka: **klien aktif**, **sesi dalam 7 hari ke depan**, **gerakan yang dicatat klien minggu ini**, **klien baru menunggu**.
- **"Perlu perhatian Anda":** daftar tugas dengan aksi satu klik:
  - klien baru membayar coaching → **Ambil klien**
  - klien belum punya program → **Buat program**
  - klien tidak berlatih 3 hari lebih → **Lihat**
  - klien belum punya sesi terjadwal → **Jadwalkan**
- **Sesi mendatang** dikelompokkan per hari (Hari ini, Besok, …) dengan tombol **Gabung**.
- **Aktivitas klien terbaru** (siapa mengerjakan apa, hasil, dan catatan).
- Lencana di menu menunjukkan berapa klien baru yang menunggu.

### 4.2 Mengambil klien
Klien coaching yang sudah membayar muncul sebagai "menunggu pelatih". Pelatih bisa **mengambilnya** dengan satu klik (hanya satu pelatih yang bisa). Klien langsung diberi tahu. Pelatih hanya bisa melihat dan mengubah **klien miliknya sendiri**.

### 4.3 Klien
- **Pencarian** dan tab **Aktif / Semua**.
- **Kartu klien:** nama, jalur dan level, tujuan, program saat ini, sesi berikutnya, latihan terakhir (berubah merah setelah 3 hari tanpa kabar), dan tanggal akhir keanggotaan.
- **Halaman klien** dengan aksi cepat (**Buka program**, **Program baru**, **Jadwalkan sesi**) dan tab:
  - **Ringkasan:** tujuan, kemajuan minggu ini dan seluruh program, sesi mendatang, latihan terbaru.
  - **Catatan latihan:** setiap hasil beserta catatan klien.
  - **Sesi** dan **Program.**

### 4.4 Program latihan (1-on-1)
- Daftar semua program dengan status (**Draf, Aktif, Diarsipkan**), panjang, dan kemajuan klien.
- **Penyusun program:**
  - Minggu dalam tab (tambah minggu, **salin minggu** ke minggu lain untuk membuat progresi dengan cepat).
  - Satu baris per hari dengan tanggal sebenarnya, hari ini disorot.
  - **Tambah** membuka formulir sederhana: cari di pustaka gerakan (atau ketik gerakan sendiri), pilih hari, pilih **Repetisi / Waktu / Jarak**, isi set, catatan untuk klien, dan secara opsional video atau otot.
  - Ubah atau hapus item apa pun. Item yang sudah dikerjakan klien punya tepi hijau dan menampilkan hasilnya.
  - **Draf dulu:** klien tidak melihat apa pun sampai pelatih mengeklik **Terbitkan ke klien**, yang juga mengirim notifikasi. Program yang baru terbit menggantikan program aktif sebelumnya.
  - **Arsipkan** atau hapus program.
- Program mencakup **lari** (jarak dan pace), **renang** (jarak dan pace per 100 m), dan **kekuatan umum** dengan setara.

### 4.5 Sesi
- Agenda yang dikelompokkan per hari.
- **Jadwalkan** sesi online (tempel tautan Google Meet; pintasan **buat baru** membuka Google Meet) atau sesi tatap muka (sebuah lokasi), dengan durasi 30–90 menit (45 adalah standar) dan catatan. Klien diberi tahu.
- **Gabung**, **Selesai**, **Pindah** (jadwal ulang), dan **Batal**. Klien diberi tahu atas setiap perubahan dan mendapat pengingat baru setelah dipindah.

### 4.6 Pustaka latihan (konten Bulanan)
- Setiap latihan pustaka sebagai kartu, dengan status Terbit / Draf, video, dan berapa kali dikerjakan anggota.
- **Buat latihan:** judul, jenis, level, tempat, menit; lalu tambahkan gerakan dari pustaka, atur set, repetisi, waktu, dan istirahat, urutkan, dan lihat **peta otot gabungan** diperbarui langsung.
- Tambahkan deskripsi, gambar sampul, dan video ikuti-bersama (opsional).
- **Terbitkan ke anggota** atau **Batalkan penerbitan.** Latihan baru dimulai sebagai draf. Latihan yang sudah dikerjakan anggota hanya dibatalkan penerbitannya, bukan dihapus, sehingga riwayat mereka tetap ada.

### 4.7 Pustaka gerakan
- Blok pembangun setiap latihan dan program.
- Untuk setiap gerakan, pelatih bisa: menempel **tautan YouTube** (dengan pratinjau langsung), **mengeklik otot** pada peta tubuh, menulis tips pelatihan, mencantumkan **alat**, dan menambah **alternatif** untuk yang tidak punya alat (di rumah, di luar ruangan, lebih mudah).
- Perubahan langsung terlihat oleh anggota.

### 4.8 Lain-lain
- Berfungsi di komputer maupun layar yang lebih sempit; tampilan terang dan gelap mengikuti komputer.
- Konfirmasi untuk tindakan berisiko, pesan singkat saat sesuatu tersimpan, dan halaman kosong yang membantu.

---

## 5. Apa yang masih simulasi, dan apa yang masih dibutuhkan

### Disimulasikan di prototipe ini
| Hal | Yang terjadi sekarang | Agar benar-benar berfungsi |
| --- | --- | --- |
| **Pembayaran** | **Halaman bayar palsu** ("Simulasikan pembayaran berhasil") dipakai otomatis | **Kunci API Mayar** (sandbox dulu, lalu live) |
| **Email** (tanda terima, reset kata sandi) | Dicetak di log server | Layanan email (SendGrid atau Resend) |
| **Notifikasi push** | Hanya kotak masuk di dalam aplikasi | Proyek **Firebase** |
| **Video** | Placeholder "Video segera hadir" | Tautan YouTube (lihat `docs/MEDIA.md`) |
| **Gambar** | Sampul gradasi berwarna | File gambar untuk 11 latihan |
| **Tautan Google Meet** | Pelatih menempel tautan | Opsional nanti: dibuat otomatis lewat Google Calendar |

### Belum dibuat
- **Masuk dengan Google** (saat ini hanya email dan kata sandi).
- **Penggunaan offline** (aplikasi butuh koneksi).
- **Obrolan pelatih–klien** (direncanakan untuk fase berikutnya).
- **Grafik kemajuan** dari waktu ke waktu (saat ini: streak, lingkaran target mingguan, riwayat, peta panas otot).
- **Bahasa Indonesia** di dalam aplikasi (aplikasi masih berbahasa Inggris; terjemahannya adalah langkah tersendiri).
- **Rilis di App Store dan Google Play**, beserta Syarat & Ketentuan dan Kebijakan Privasi.
- **Penampil otot 3D** (butuh model 3D berlisensi).
- **Layar admin** (misalnya menentukan pelatih tertentu untuk klien; saat ini pelatih mengambil klien sendiri).

### Risiko yang perlu diketahui
- **Peninjauan App Store:** Apple mewajibkan pembelian dalam aplikasi untuk konten digital. Pembayaran QRIS di dalam aplikasi untuk pustaka Bulanan bisa ditolak di iPhone. Pilihan: jual paket Bulanan lewat situs web, atau memakai pembelian Apple khusus untuk paket Bulanan. Coaching 1-on-1 adalah layanan manusia dan umumnya diperbolehkan.
- **YouTube:** video tidak publik (unlisted) bisa dibagikan oleh siapa pun yang punya tautannya, sehingga video tidak sepenuhnya terlindungi di balik paywall. Layanan video dengan tautan bertanda tangan adalah peningkatan di kemudian hari.

### Keputusan yang hanya bisa Anda ambil
- **Nama akhir aplikasi** dan logo.
- **Harga** (Rp 79.000 dan Rp 499.000 hanyalah contoh).
- Apakah rilis di **iPhone dan Android bersamaan**, atau Android dulu.
- Apakah Anda ingin **penampil otot 3D**.
- Bagaimana pelatih **didaftarkan** (saat ini pelatih dibuat oleh administrator).

---

## 6. Kesesuaian dengan brief awal Anda

| Kebutuhan dari brief | Status |
| --- | --- |
| Daftar dan masuk | ✅ |
| Profil (usia, level, tujuan, spesialisasi) | ✅ |
| Reset kata sandi | ✅ (email disimulasikan) |
| Masuk dengan Google | ⏳ Belum |
| Dua tingkat langganan | ✅ |
| Pembayaran QRIS | ✅ dengan halaman bayar palsu sampai kunci Mayar ditambahkan (memakai Mayar, bukan Midtrans, sesuai spesifikasi berikutnya) |
| Status pembayaran dan tanda terima | ✅ (email tanda terima disimulasikan) |
| Jeda dan batalkan langganan | ✅ (ditambah lanjutkan dan perpanjang lebih awal) |
| Pustaka latihan per jenis, dengan pencarian dan filter | ✅ |
| Video contoh gerakan | ✅ sudah ada fiturnya; video perlu ditambahkan |
| Detail latihan (waktu, kesulitan, alat) | ✅ |
| Pelacakan penyelesaian dan riwayat | ✅ |
| Program pribadi dari pelatih | ✅ |
| Jalur khusus (lari, renang, umum) | ✅ |
| Panduan pengganti alat | ✅ di setiap gerakan |
| Sesi Google Meet 45 menit mingguan | ✅ (tautan ditempel pelatih) |
| Notifikasi sesi tatap muka | ✅ |
| Login pelatih, daftar klien, penyusun program, penjadwalan | ✅ |
| Notifikasi dan pengingat | ✅ di dalam aplikasi; ⏳ push ke layar kunci |
| Mode gelap dan terang | ✅ |
| Penanganan error dan umpan balik | ✅ |
| Dukungan offline | ⏳ Belum |
| Obrolan pelatih–klien | ⏳ Fase berikutnya |
| Analitik kemajuan | 🟡 Dasar (streak, lingkaran target, riwayat, peta panas otot) |

**Di luar brief:** pemandu latihan, peta otot dan peta panas, lingkaran target mingguan, daftar tugas "perlu perhatian" untuk pelatih, dan pengaturan awal (onboarding).

---

## 7. Informasi lebih lanjut

- **Coba sendiri:** [howToRun.md](howToRun.md), berisi akun demo dan panduan langkah demi langkah.
- **Perkembangan harian:** [docs/DAILY_LOG.md](docs/DAILY_LOG.md).
- **Video dan gambar yang perlu disediakan:** [docs/MEDIA.md](docs/MEDIA.md).
- **Detail teknis (untuk pengembang):** [DOCUMENTATION.md](DOCUMENTATION.md) dan [docs/decisions.md](docs/decisions.md).

import 'package:flutter/material.dart';

/// Model data untuk satu jenis penyakit daun pepaya
class Penyakit {
  final String nama;
  final String gambar; // path asset atau URL gambar
  final List<String> teks;

  const Penyakit({
    required this.nama,
    required this.gambar,
    required this.teks,
  });
}

/// Data penyakit daun pepaya
/// Catatan: ganti path `gambar` sesuai lokasi aset gambar Anda,
/// dan pastikan sudah didaftarkan di pubspec.yaml (folder assets/images/)
final List<Penyakit> penyakitList = [
  Penyakit(
    nama: "Antraknosa",
    gambar: "assets/antraknosa.jpg",
    teks: [
      "Antraknosa merupakan penyakit yang disebabkan oleh jamur patogen Colletotrichum gloeosporioides yang menyerang daun dan buah tanaman pepaya, terutama pada kondisi lingkungan yang lembap.",
      "Penyakit ini ditandai dengan munculnya bercak kecil berwarna coklat kehitaman pada daun dan buah yang kemudian berkembang menjadi bercak cekung (sunken lesion).",
      "Pada permukaan bercak sering ditemukan spora berwarna oranye hingga merah muda, dan pada kondisi lanjut dapat menyebabkan buah menjadi busuk terutama saat penyimpanan.",
      "Penanganan penyakit ini dilakukan dengan menjaga sanitasi kebun melalui pembuangan bagian tanaman yang terinfeksi, penggunaan fungisida seperti mankozeb dan klorotalonil, pengendalian kelembapan lingkungan, serta penyimpanan buah pada suhu rendah untuk menghambat perkembangan jamur.",
    ],
  ),
  Penyakit(
    nama: "Bercak Daun (Leaf Spot)",
    gambar: "assets/bercak_daun.jpg",
    teks: [
      "Bercak daun merupakan penyakit yang disebabkan oleh infeksi jamur seperti Cercospora spp. dan Corynespora cassiicola yang menyerang daun pepaya.",
      "Penyakit ini biasanya berkembang pada kondisi lingkungan yang lembap dan sirkulasi udara yang kurang baik.",
      "Gejala awal ditandai dengan munculnya bercak kecil berbentuk bulat berwarna coklat atau abu-abu dengan tepi yang lebih gelap.",
      "Seiring perkembangan penyakit, daun dapat menguning, mengering, dan akhirnya rontok, sehingga mengganggu proses fotosintesis tanaman.",
      "Penanganan dilakukan dengan memangkas dan membuang daun yang terinfeksi, melakukan rotasi tanaman, menggunakan fungisida berbahan aktif tembaga atau mankozeb, serta mengatur jarak tanam agar sirkulasi udara lebih baik.",
    ],
  ),
  Penyakit(
    nama: "Papaya Ringspot Virus (PRSV)",
    gambar: "assets/prsv.jpg",
    teks: [
      "Papaya Ringspot Virus (PRSV) merupakan penyakit yang disebabkan oleh virus dari kelompok Potyvirus yang menyerang jaringan daun dan buah tanaman pepaya.",
      "Virus ini umumnya ditularkan oleh serangga vektor seperti kutu daun (aphid) dan dapat menyebabkan penurunan pertumbuhan serta hasil panen secara signifikan.",
      "Gejala yang muncul meliputi daun yang mengalami belang (mosaic) antara warna hijau muda dan tua, bentuk daun menjadi menyempit dan keriting, serta munculnya pola cincin khas pada buah.",
      "Infeksi yang parah dapat menghambat pertumbuhan tanaman secara keseluruhan.",
      "Penanganan penyakit ini dilakukan dengan mengendalikan populasi vektor seperti kutu daun, menggunakan varietas pepaya yang tahan terhadap virus, mencabut dan memusnahkan tanaman yang telah terinfeksi, serta menjaga kebersihan lingkungan kebun untuk mencegah penyebaran lebih lanjut.",
    ],
  ),
];

class Informasi extends StatefulWidget {
  const Informasi({super.key});

  @override
  State<Informasi> createState() => _InformasiState();
}

class _InformasiState extends State<Informasi> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F8F4),
      appBar: AppBar(
        title: const Text('Informasi Penyakit Daun Pepaya'),
        centerTitle: true,
        backgroundColor: Colors.green.shade700,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final screenWidth = constraints.maxWidth;
            final isTablet = screenWidth > 600;
            // Padding kiri-kanan menyesuaikan lebar layar (responsif)
            final horizontalPadding =
                isTablet ? screenWidth * 0.12 : screenWidth * 0.04;

            return ListView.builder(
              padding: EdgeInsets.symmetric(
                horizontal: horizontalPadding,
                vertical: 16,
              ),
              itemCount: penyakitList.length,
              itemBuilder: (context, index) {
                final penyakit = penyakitList[index];
                return _PenyakitCard(penyakit: penyakit);
              },
            );
          },
        ),
      ),
    );
  }
}

class _PenyakitCard extends StatelessWidget {
  final Penyakit penyakit;

  const _PenyakitCard({required this.penyakit});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    // Ukuran font menyesuaikan lebar layar agar tetap nyaman dibaca
    final titleFontSize = screenWidth < 360 ? 16.0 : 19.0;
    final bodyFontSize = screenWidth < 360 ? 13.0 : 14.5;

    return Card(
      elevation: 3,
      margin: const EdgeInsets.only(bottom: 18),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Gambar penyakit, rasio 16:9 agar konsisten di semua ukuran layar
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Image.asset(
              penyakit.gambar,
              fit: BoxFit.cover,
              width: double.infinity,
              errorBuilder: (context, error, stackTrace) {
                // Placeholder jika gambar belum tersedia / gagal dimuat
                return Container(
                  color: Colors.green.shade50,
                  alignment: Alignment.center,
                  child: Icon(
                    Icons.eco_outlined,
                    size: 48,
                    color: Colors.green.shade400,
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  penyakit.nama,
                  style: TextStyle(
                    fontSize: titleFontSize,
                    fontWeight: FontWeight.bold,
                    color: Colors.green.shade800,
                  ),
                ),
                const SizedBox(height: 10),
                ...penyakit.teks.map(
                  (paragraf) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Text(
                      paragraf,
                      textAlign: TextAlign.justify,
                      style: TextStyle(
                        fontSize: bodyFontSize,
                        height: 1.55,
                        color: Colors.black87,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
const penyakitList = [
  {
    nama: "Antraknosa",
    teks: [
      "Antraknosa merupakan penyakit yang disebabkan oleh jamur patogen Colletotrichum gloeosporioides yang menyerang daun dan buah tanaman pepaya, terutama pada kondisi lingkungan yang lembap.",
      "Penyakit ini ditandai dengan munculnya bercak kecil berwarna coklat kehitaman pada daun dan buah yang kemudian berkembang menjadi bercak cekung (sunken lesion).",
      "Pada permukaan bercak sering ditemukan spora berwarna oranye hingga merah muda, dan pada kondisi lanjut dapat menyebabkan buah menjadi busuk terutama saat penyimpanan.",
      "Penanganan penyakit ini dilakukan dengan menjaga sanitasi kebun melalui pembuangan bagian tanaman yang terinfeksi, penggunaan fungisida seperti mankozeb dan klorotalonil, pengendalian kelembapan lingkungan, serta penyimpanan buah pada suhu rendah untuk menghambat perkembangan jamur.",
    ],
  },
  {
    nama: "Bercak Daun (Leaf Spot)",
    teks: [
      "Bercak daun merupakan penyakit yang disebabkan oleh infeksi jamur seperti Cercospora spp. dan Corynespora cassiicola yang menyerang daun pepaya.",
      "Penyakit ini biasanya berkembang pada kondisi lingkungan yang lembap dan sirkulasi udara yang kurang baik.",
      "Gejala awal ditandai dengan munculnya bercak kecil berbentuk bulat berwarna coklat atau abu-abu dengan tepi yang lebih gelap.",
      "Seiring perkembangan penyakit, daun dapat menguning, mengering, dan akhirnya rontok, sehingga mengganggu proses fotosintesis tanaman.",
      "Penanganan dilakukan dengan memangkas dan membuang daun yang terinfeksi, melakukan rotasi tanaman, menggunakan fungisida berbahan aktif tembaga atau mankozeb, serta mengatur jarak tanam agar sirkulasi udara lebih baik.",
    ],
  },
  {
    nama: "Papaya Ringspot Virus (PRSV)",
    teks: [
      "Papaya Ringspot Virus (PRSV) merupakan penyakit yang disebabkan oleh virus dari kelompok Potyvirus yang menyerang jaringan daun dan buah tanaman pepaya.",
      "Virus ini umumnya ditularkan oleh serangga vektor seperti kutu daun (aphid) dan dapat menyebabkan penurunan pertumbuhan serta hasil panen secara signifikan.",
      "Gejala yang muncul meliputi daun yang mengalami belang (mosaic) antara warna hijau muda dan tua, bentuk daun menjadi menyempit dan keriting, serta munculnya pola cincin khas pada buah.",
      "Infeksi yang parah dapat menghambat pertumbuhan tanaman secara keseluruhan.",
      "Penanganan penyakit ini dilakukan dengan mengendalikan populasi vektor seperti kutu daun, menggunakan varietas pepaya yang tahan terhadap virus, mencabut dan memusnahkan tanaman yang telah terinfeksi, serta menjaga kebersihan lingkungan kebun untuk mencegah penyebaran lebih lanjut.",
    ],
  },
];
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 0,       // ← kunci anti-duplikat
  separators: ["\n", ""],
});

function dedupChunks(docs) {
  const seen = new Set();
  return docs.filter((doc) => {
    const key = doc.pageContent.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
// CHUNKING PER PENYAKIT
async function chunkText() {
  console.log("=".repeat(65));
  console.log("  CHUNKING PENYAKIT PEPAYA — Sentence-Aware, Anti Duplikat");
  console.log("=".repeat(65));
  console.log(`\nKonfigurasi:`);
  console.log(`  • chunkSize   : ${splitter.chunkSize} karakter`);
  console.log(`  • chunkOverlap: ${splitter.chunkOverlap} karakter (NOL = anti duplikat)`);

  const semuaChunk = [];

  for (const penyakit of penyakitList) {
    // Gabungkan kalimat dengan newline sebagai separator
    const teksGabung = penyakit.teks.join("\n");

    // Buat dokumen dengan metadata
    let docs = await splitter.createDocuments(
      [teksGabung],
      [{ penyakit: penyakit.nama, sumber: "dataset_pepaya" }]
    );

    // Deduplikasi sebagai safety net
    docs = dedupChunks(docs);

    console.log(`\n${"─".repeat(65)}`);
    console.log(`PENYAKIT : ${penyakit.nama}`);
    console.log(`Kalimat  : ${penyakit.teks.length} | Chunk: ${docs.length}`);
    console.log(`${"─".repeat(65)}`);

    docs.forEach((doc, i) => {
      const konten = doc.pageContent.trim();

      console.log(`\n  [Chunk ${i + 1}]`);
      console.log(`  Panjang  : ${konten.length} karakter`);
      console.log(`  Metadata : penyakit="${doc.metadata.penyakit}", sumber="${doc.metadata.sumber}"`);
      console.log(`  Konten   :\n  ${konten.replace(/\n/g, "\n  ")}`);

      semuaChunk.push({ ...doc, pageContent: konten });
    });
  }

  // ── RINGKASAN ──────────────────────────────
  console.log(`\n${"=".repeat(65)}`);
  console.log(`Total chunk final: ${semuaChunk.length}`);
  console.log(`Breakdown per penyakit:`);
  for (const penyakit of penyakitList) {
    const count = semuaChunk.filter(
      (c) => c.metadata.penyakit === penyakit.nama
    ).length;
    console.log(`   • ${penyakit.nama}: ${count} chunk`);
  }
  console.log("=".repeat(65));

  return semuaChunk;
}

// JALANKAN
chunkText().catch(console.error);

export { chunkText };
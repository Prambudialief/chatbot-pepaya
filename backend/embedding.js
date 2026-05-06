// embedding.js
// Embedding Xenova multilingual-e5-small → disimpan ke FAISS lokal
//
// Jalankan  : node embedding.js
// Output    : ./faiss_db/faiss.index + ./faiss_db/docstore.json

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { Embeddings } from "@langchain/core/embeddings";
import { pipeline } from "@xenova/transformers";

// ─────────────────────────────────────────────
// WRAPPER: Xenova → LangChain Embeddings
// FaissStore butuh class yang extends Embeddings
// dengan method embedDocuments() dan embedQuery()
// ─────────────────────────────────────────────
class XenovaEmbeddings extends Embeddings {
  constructor() {
    super({});
    this.pipe = null;
    this.modelName = "Xenova/multilingual-e5-small";
  }

  async _loadPipeline() {
    if (!this.pipe) {
      this.pipe = await pipeline("feature-extraction", this.modelName);
    }
    return this.pipe;
  }

  // Mean pooling manual (sama seperti kode kamu sebelumnya)
  _meanPooling(output) {
    const [batch, seqLen, hidden] = output.dims;
    const result = [];
    for (let b = 0; b < batch; b++) {
      const vec = new Float32Array(hidden);
      let tokenCount = 0;
      for (let t = 0; t < seqLen; t++) {
        const maskVal = 1; // semua token valid (tanpa padding di single input)
        if (maskVal > 0) {
          for (let h = 0; h < hidden; h++) {
            vec[h] += output.data[b * seqLen * hidden + t * hidden + h];
          }
          tokenCount++;
        }
      }
      if (tokenCount > 0) {
        for (let h = 0; h < hidden; h++) vec[h] /= tokenCount;
      }
      result.push(vec);
    }
    return result;
  }

  // L2 Normalize
  _l2Normalize(vec) {
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) return Array.from(vec);
    return Array.from(vec).map((v) => v / norm);
  }

  async _embedSingle(text) {
    const embedder = await this._loadPipeline();
    const output = await embedder(text, { pooling: "none", normalize: false });

    if (output.dims.length === 2) {
      return this._l2Normalize(Array.from(output.data));
    }

    const pooled = this._meanPooling(output);
    return this._l2Normalize(Array.from(pooled[0]));
  }

  // ← Dipanggil FaissStore saat .fromDocuments()
  // prefix "passage:" wajib untuk model E5
  async embedDocuments(texts) {
    const results = [];
    for (let i = 0; i < texts.length; i++) {
      const vec = await this._embedSingle(`passage: ${texts[i]}`);
      results.push(vec);
      process.stdout.write(`\r   Embedding chunk ${i + 1}/${texts.length}...`);
    }
    console.log(""); // newline setelah progress
    return results;
  }

  // ← Dipanggil FaissStore saat .similaritySearch()
  // prefix "query:" wajib untuk model E5
  async embedQuery(text) {
    return await this._embedSingle(`query: ${text}`);
  }
}

// ─────────────────────────────────────────────
// DATA PENYAKIT PEPAYA
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// SPLITTER
// ─────────────────────────────────────────────
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 0,
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

async function buatDokumen() {
  const semuaDokumen = [];
  for (const penyakit of penyakitList) {
    const teksGabung = penyakit.teks.join("\n");
    let docs = await splitter.createDocuments(
      [teksGabung],
      [{ penyakit: penyakit.nama, sumber: "dataset_pepaya" }]
    );
    docs = dedupChunks(docs);
    docs.forEach((doc) => { doc.pageContent = doc.pageContent.trim(); });
    console.log(`   • ${penyakit.nama}: ${docs.length} chunk`);
    semuaDokumen.push(...docs);
  }
  return semuaDokumen;
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60));
  console.log("  EMBEDDING → SIMPAN KE FAISS");
  console.log("  Model: Xenova/multilingual-e5-small");
  console.log("=".repeat(60));

  // 1. Buat dokumen
  console.log("\n📄 Mempersiapkan dokumen...");
  const dokumen = await buatDokumen();
  console.log(`   ✅ Total: ${dokumen.length} chunk\n`);

  // 2. Init embeddings
  console.log("🤖 Memuat model Xenova...");
  const embeddings = new XenovaEmbeddings();
  // Load pipeline sekali di awal
  await embeddings._loadPipeline();
  console.log("   ✅ Model siap!\n");

  // 3. Buat FaissStore dari dokumen
  // FaissStore.fromDocuments() akan otomatis memanggil embedDocuments()
  console.log("🔢 Proses embedding + menyimpan ke FAISS...");
  const vectorStore = await FaissStore.fromDocuments(dokumen, embeddings);

  // 4. Simpan ke disk
  const savePath = "./faiss_db";
  await vectorStore.save(savePath);

  console.log("=".repeat(60));
  console.log("✅ Berhasil disimpan ke FAISS!");
  console.log(`   📁 ./faiss_db/faiss.index    → vektor biner`);
  console.log(`   📁 ./faiss_db/docstore.json  → konten + metadata`);
  console.log("=".repeat(60));

  // 5. Verifikasi similarity search
  console.log("\n🔍 Verifikasi similarity search...");
  const queries = [
    "gejala penyakit pada daun pepaya",
    "cara menangani jamur pada pepaya",
    "virus yang menyerang tanaman pepaya",
    "bercak coklat pada buah",
  ];

  for (const query of queries) {
    const hasil = await vectorStore.similaritySearchWithScore(query, 2);
    console.log(`\n   Query: "${query}"`);
    hasil.forEach(([doc, score], i) => {
      const bar = "█".repeat(Math.round(score * 20));
      console.log(`   [${i + 1}] ${doc.metadata.penyakit}`);
      console.log(`       Score  : ${score.toFixed(4)} ${bar}`);
      console.log(`       Konten : ${doc.pageContent.substring(0, 90)}...`);
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ FAISS siap digunakan untuk RAG!");
  console.log("\n   Cara load di index.js nanti:");
  console.log('   import { XenovaEmbeddings } from "./embedding.js"');
  console.log('   import { FaissStore } from "@langchain/community/vectorstores/faiss"');
  console.log('   const vs = await FaissStore.load("./faiss_db", new XenovaEmbeddings())');
  console.log("=".repeat(60));
}

main().catch(console.error);

// Export XenovaEmbeddings agar bisa dipakai di index.js (RAG API)
export { XenovaEmbeddings };
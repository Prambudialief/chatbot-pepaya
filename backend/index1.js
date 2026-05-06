// // index.js
// // RAG API — Express + FAISS + Gemini + Firestore (chat history)
// //
// // Jalankan : node index.js
// // Endpoint :
// //   POST /tanya          → kirim pertanyaan + userId
// //   GET  /history/:userId → ambil riwayat chat
// //   GET  /health          → status server
// //
// // Prasyarat:
// //   1. node embedding.js sudah dijalankan → ./faiss_db ada
// //   2. .env berisi GEMINI_API_KEY
// //   3. serviceAccountKey.json ada di folder backend

// import express from "express";
// import * as dotenv from "dotenv";
// import { FaissStore } from "@langchain/community/vectorstores/faiss";
// import { Embeddings } from "@langchain/core/embeddings";
// import { pipeline } from "@xenova/transformers";
// import { initializeApp, cert } from "firebase-admin/app";
// import { getFirestore, Timestamp } from "firebase-admin/firestore";
// import { createRequire } from "module";

// dotenv.config();

// // ─────────────────────────────────────────────
// // VALIDASI ENV
// // ─────────────────────────────────────────────
// if (!process.env.GROQ_API_KEY) {
//   console.error("❌ GROQ_API_KEY tidak ditemukan di .env");
//   process.exit(1);
// }

// // ─────────────────────────────────────────────
// // FIREBASE ADMIN — inisialisasi Firestore
// // Download serviceAccountKey.json dari:
// // Firebase Console → Project Settings → Service Accounts → Generate new private key
// // ─────────────────────────────────────────────
// const require = createRequire(import.meta.url);
// const serviceAccount = require("./serviceAccountKey.json");

// initializeApp({
//   credential: cert(serviceAccount),
// });

// const db = getFirestore();
// console.log("✅ Firestore terhubung!\n");

// // ─────────────────────────────────────────────
// // XENOVA EMBEDDINGS (identik dengan embedding.js)
// // ─────────────────────────────────────────────
// class XenovaEmbeddings extends Embeddings {
//   constructor() {
//     super({});
//     this.pipe = null;
//     this.modelName = "Xenova/multilingual-e5-small";
//   }

//   async _loadPipeline() {
//     if (!this.pipe) {
//       this.pipe = await pipeline("feature-extraction", this.modelName);
//     }
//     return this.pipe;
//   }

//   _meanPooling(output) {
//     const [batch, seqLen, hidden] = output.dims;
//     const result = [];
//     for (let b = 0; b < batch; b++) {
//       const vec = new Float32Array(hidden);
//       let count = 0;
//       for (let t = 0; t < seqLen; t++) {
//         for (let h = 0; h < hidden; h++) {
//           vec[h] += output.data[b * seqLen * hidden + t * hidden + h];
//         }
//         count++;
//       }
//       if (count > 0) for (let h = 0; h < hidden; h++) vec[h] /= count;
//       result.push(vec);
//     }
//     return result;
//   }

//   _l2Normalize(vec) {
//     const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
//     if (norm === 0) return Array.from(vec);
//     return Array.from(vec).map((v) => v / norm);
//   }

//   async _embedSingle(text) {
//     const embedder = await this._loadPipeline();
//     const output = await embedder(text, { pooling: "none", normalize: false });
//     if (output.dims.length === 2) return this._l2Normalize(Array.from(output.data));
//     const pooled = this._meanPooling(output);
//     return this._l2Normalize(Array.from(pooled[0]));
//   }

//   async embedDocuments(texts) {
//     const results = [];
//     for (const text of texts) {
//       results.push(await this._embedSingle(`passage: ${text}`));
//     }
//     return results;
//   }

//   async embedQuery(text) {
//     return await this._embedSingle(`query: ${text}`);
//   }
// }

// // ─────────────────────────────────────────────
// // HELPER: L2 distance → Cosine similarity
// // ─────────────────────────────────────────────
// function l2ToCosine(l2Distance) {
//   return Math.max(0, Math.min(1, 1 - (l2Distance * l2Distance) / 2));
// }

// // ─────────────────────────────────────────────
// // GEMINI — generate jawaban dari konteks
// // ─────────────────────────────────────────────
// async function generateWithGroq(pertanyaan, konteks) {
//   const prompt = `Kamu adalah asisten ahli pertanian yang membantu mendiagnosis dan memberikan informasi tentang penyakit tanaman pepaya.

// Gunakan HANYA informasi dari konteks berikut untuk menjawab pertanyaan.
// Jika informasi tidak tersedia dalam konteks, katakan "Maaf, saya tidak memiliki informasi tersebut dalam basis pengetahuan saya."
// Jawab dalam Bahasa Indonesia dengan jelas dan terstruktur.

// === KONTEKS ===
// ${konteks}
// ===============

// Pertanyaan: ${pertanyaan}

// Jawaban:`;

//   const response = await fetch(
//     `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GROQ_API_KEY}`,
//     {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         contents: [{ parts: [{ text: prompt }] }],
//         generationConfig: {
//           temperature: 0.3,
//           maxOutputTokens: 1024,
//           topP: 0.8,
//         },
//       }),
//     }
//   );

//   if (!response.ok) {
//     const err = await response.json();
//     throw new Error(`GROQ API error: ${err.error?.message || response.statusText}`);
//   }

//   const data = await response.json();
//   return data.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada jawaban.";
// }

// // ─────────────────────────────────────────────
// // FIRESTORE — simpan chat
// // ─────────────────────────────────────────────
// async function simpanChat({ userId, pertanyaan, jawaban }) {
//   const docRef = await db.collection("chats").add({
//     userId,
//     pertanyaan,
//     jawaban,
//     createdAt: Timestamp.now(),
//   });
//   return docRef.id;
// }

// // ─────────────────────────────────────────────
// // FIRESTORE — ambil history per user
// // ─────────────────────────────────────────────
// async function ambilHistory(userId, limit = 50) {
//   const snapshot = await db
//     .collection("chats")
//     .where("userId", "==", userId)
//     .orderBy("createdAt", "desc")
//     .limit(limit)
//     .get();

//   return snapshot.docs.map((doc) => ({
//     id: doc.id,
//     ...doc.data(),
//     createdAt: doc.data().createdAt.toDate().toISOString(),
//   }));
// }

// // ─────────────────────────────────────────────
// // EXPRESS APP
// // ─────────────────────────────────────────────
// const app = express();
// app.use(express.json());

// // CORS untuk Flutter
// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
//   if (req.method === "OPTIONS") return res.sendStatus(200);
//   next();
// });

// let vectorStore = null;
// let embeddings = null;
// let isReady = false;

// // ─────────────────────────────────────────────
// // LOAD FAISS saat server start
// // ─────────────────────────────────────────────
// async function initVectorStore() {
//   console.log("🤖 Memuat model Xenova...");
//   embeddings = new XenovaEmbeddings();
//   await embeddings._loadPipeline();
//   console.log("   ✅ Model siap!\n");

//   console.log("🗄️  Memuat FAISS dari ./faiss_db...");
//   try {
//     vectorStore = await FaissStore.load("./faiss_db", embeddings);
//     console.log("   ✅ FAISS berhasil dimuat!\n");
//     isReady = true;
//   } catch (err) {
//     console.error("❌ Gagal memuat FAISS:", err.message);
//     console.error("   Pastikan sudah menjalankan: node embedding.js");
//     process.exit(1);
//   }
// }

// // ─────────────────────────────────────────────
// // GET /health
// // ─────────────────────────────────────────────
// app.get("/health", (req, res) => {
//   res.json({
//     status: isReady ? "ready" : "loading",
//     model: "Xenova/multilingual-e5-small",
//     llm: "gemini-1.5-flash",
//     vectorDb: "FAISS local",
//     firestore: "connected",
//   });
// });

// // ─────────────────────────────────────────────
// // POST /tanya
// // Body: { "userId": "uid123", "pertanyaan": "apa gejala antraknosa?" }
// // ─────────────────────────────────────────────
// app.post("/tanya", async (req, res) => {
//   if (!isReady) {
//     return res.status(503).json({ error: "Server sedang loading, coba lagi sebentar." });
//   }

//   const { userId, pertanyaan } = req.body;

//   if (!userId || userId.trim() === "") {
//     return res.status(400).json({ error: "Field 'userId' tidak boleh kosong." });
//   }
//   if (!pertanyaan || pertanyaan.trim() === "") {
//     return res.status(400).json({ error: "Field 'pertanyaan' tidak boleh kosong." });
//   }

//   try {
//     console.log(`\n📥 [${userId}] "${pertanyaan}"`);

//     // 1. Cari chunk relevan dari FAISS
//     const hasilSearch = await vectorStore.similaritySearchWithScore(pertanyaan, 3);

//     // 2. Filter cosine > 0.70
//     const THRESHOLD = 0.70;
//     const chunkRelevan = hasilSearch
//       .map(([doc, l2dist]) => ({ doc, cosine: l2ToCosine(l2dist) }))
//       .filter((item) => item.cosine >= THRESHOLD)
//       .sort((a, b) => b.cosine - a.cosine);

//     console.log(`   🔍 Chunk relevan: ${chunkRelevan.length}`);

//     let jawaban;

//     if (chunkRelevan.length === 0) {
//       jawaban = "Maaf, saya tidak menemukan informasi yang relevan dengan pertanyaan Anda dalam basis pengetahuan penyakit pepaya.";
//     } else {
//       // 3. Susun konteks
//       const konteksTeks = chunkRelevan
//         .map((item, i) =>
//           `[${i + 1}] Penyakit: ${item.doc.metadata.penyakit}\n${item.doc.pageContent}`
//         )
//         .join("\n\n");

//       // 4. Generate dengan Gemini
//       console.log("   🤖 Mengirim ke Gemini...");
//       jawaban = await generateWithGemini(pertanyaan, konteksTeks);
//       console.log("   ✅ Jawaban diterima");
//     }

//     // 5. Simpan ke Firestore
//     const chatId = await simpanChat({ userId, pertanyaan, jawaban });
//     console.log(`   💾 Disimpan ke Firestore: ${chatId}`);

//     // 6. Response
//     res.json({
//       chatId,
//       pertanyaan,
//       jawaban,
//       konteks: chunkRelevan.map((item) => ({
//         penyakit: item.doc.metadata.penyakit,
//         score: parseFloat(item.cosine.toFixed(4)),
//         konten: item.doc.pageContent,
//       })),
//       status: "success",
//     });

//   } catch (err) {
//     console.error("❌ Error:", err.message);
//     res.status(500).json({ error: "Terjadi kesalahan server.", detail: err.message });
//   }
// });

// // ─────────────────────────────────────────────
// // GET /history/:userId
// // Ambil riwayat chat user, diurutkan terbaru
// // ─────────────────────────────────────────────
// app.get("/history/:userId", async (req, res) => {
//   const { userId } = req.params;

//   if (!userId) {
//     return res.status(400).json({ error: "userId diperlukan." });
//   }

//   try {
//     console.log(`\n📋 Ambil history: ${userId}`);
//     const history = await ambilHistory(userId);
//     console.log(`   ✅ ${history.length} chat ditemukan`);

//     res.json({
//       userId,
//       total: history.length,
//       data: history,
//     });

//   } catch (err) {
//     console.error("❌ Error ambil history:", err.message);
//     res.status(500).json({ error: "Gagal mengambil history.", detail: err.message });
//   }
// });

// // ─────────────────────────────────────────────
// // DELETE /history/:userId
// // Hapus semua riwayat chat user (opsional)
// // ─────────────────────────────────────────────
// app.delete("/history/:userId", async (req, res) => {
//   const { userId } = req.params;
//   try {
//     const snapshot = await db
//       .collection("chats")
//       .where("userId", "==", userId)
//       .get();

//     const batch = db.batch();
//     snapshot.docs.forEach((doc) => batch.delete(doc.ref));
//     await batch.commit();

//     console.log(`🗑️  Hapus ${snapshot.size} chat milik ${userId}`);
//     res.json({ message: `${snapshot.size} chat berhasil dihapus.` });
//   } catch (err) {
//     res.status(500).json({ error: "Gagal menghapus history.", detail: err.message });
//   }
// });

// // ─────────────────────────────────────────────
// // START SERVER
// // ─────────────────────────────────────────────
// const PORT = process.env.PORT || 3000;

// initVectorStore().then(() => {
//   app.listen(PORT, () => {
//     console.log("=".repeat(55));
//     console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
//     console.log("─".repeat(55));
//     console.log(`   GET  /health            → status server`);
//     console.log(`   POST /tanya             → tanya chatbot RAG`);
//     console.log(`   GET  /history/:userId   → riwayat chat user`);
//     console.log(`   DEL  /history/:userId   → hapus riwayat`);
//     console.log("=".repeat(55));
//   });
// });

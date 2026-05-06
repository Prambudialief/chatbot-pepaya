
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

// MODEL
class ChatMessage {
  final String id;
  final String pertanyaan;
  final String jawaban;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.pertanyaan,
    required this.jawaban,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] ?? '',
      pertanyaan: json['pertanyaan'] ?? '',
      jawaban: json['jawaban'] ?? '',
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

// SERVICE
class ChatService {
  // Ganti dengan IP lokal kamu saat development
  // Contoh: "http://192.168.1.5:3000"
  static const String baseUrl = "http://10.0.2.2:3000"; // Android emulator

  // Kirim pertanyaan ke backend RAG
  static Future<Map<String, dynamic>> tanya({
    required String userId,
    required String pertanyaan,
  }) async {
    final response = await http.post(
      Uri.parse("$baseUrl/tanya"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"userId": userId, "pertanyaan": pertanyaan}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Gagal mengirim pertanyaan: ${response.body}");
    }
  }

  // Ambil riwayat chat dari backend
  static Future<List<ChatMessage>> getHistory(String userId) async {
    final response = await http.get(
      Uri.parse("$baseUrl/history/$userId"),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List list = data['data'] ?? [];
      // Balik urutan: terlama dulu (agar tampil dari atas)
      return list.reversed
          .map((e) => ChatMessage.fromJson(e))
          .toList();
    } else {
      throw Exception("Gagal mengambil history");
    }
  }
}

// ─────────────────────────────────────────────
// HALAMAN CHAT
// ─────────────────────────────────────────────
class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  // Setiap item = { 'type': 'user'|'bot', 'text': '...', 'time': DateTime }
  final List<Map<String, dynamic>> _messages = [];

  bool _isLoading = false;
  bool _isLoadingHistory = true;
  String? _userId;

  @override
  void initState() {
    super.initState();
    _loadUserId();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  // Ambil userId dari Firebase Auth
  Future<void> _loadUserId() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    setState(() => _userId = user.uid);
    await _loadHistory(user.uid);
  }

  // Load riwayat chat dari backend
  Future<void> _loadHistory(String userId) async {
    try {
      final history = await ChatService.getHistory(userId);

      setState(() {
        _messages.clear();
        for (final chat in history) {
          // Tambah bubble user
          _messages.add({
            'type': 'user',
            'text': chat.pertanyaan,
            'time': chat.createdAt,
          });
          // Tambah bubble bot
          _messages.add({
            'type': 'bot',
            'text': chat.jawaban,
            'time': chat.createdAt,
          });
        }
        _isLoadingHistory = false;
      });

      _scrollToBottom();
    } catch (e) {
      setState(() => _isLoadingHistory = false);
    }
  }

  // Kirim pertanyaan baru
  Future<void> _kirimPertanyaan() async {
    final teks = _controller.text.trim();
    if (teks.isEmpty || _isLoading || _userId == null) return;

    _controller.clear();
    final now = DateTime.now();

    // Tambah bubble user langsung
    setState(() {
      _messages.add({'type': 'user', 'text': teks, 'time': now});
      _isLoading = true;
    });
    _scrollToBottom();

    try {
      final result = await ChatService.tanya(
        userId: _userId!,
        pertanyaan: teks,
      );

      setState(() {
        _messages.add({
          'type': 'bot',
          'text': result['jawaban'] ?? 'Tidak ada jawaban.',
          'time': DateTime.now(),
        });
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _messages.add({
          'type': 'bot',
          'text': 'Maaf, terjadi kesalahan. Coba lagi.',
          'time': DateTime.now(),
        });
        _isLoading = false;
      });
    }

    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  // ─────────────────────────────────────────────
  // BUILD
  // ─────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F5FF),
      appBar: AppBar(
        backgroundColor: const Color(0xFF3B62FF),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "🌿 Asisten Pepaya",
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            Text(
              "Tanya tentang penyakit pepaya",
              style: TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ],
        ),
        actions: [
          // Tombol refresh history
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            tooltip: "Muat ulang riwayat",
            onPressed: _userId == null
                ? null
                : () {
                    setState(() => _isLoadingHistory = true);
                    _loadHistory(_userId!);
                  },
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Area Chat ──
          Expanded(
            child: _isLoadingHistory
                ? const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(color: Color(0xFF3B62FF)),
                        SizedBox(height: 12),
                        Text("Memuat riwayat chat..."),
                      ],
                    ),
                  )
                : _messages.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 12),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          return _buildBubble(
                            text: msg['text'],
                            isUser: msg['type'] == 'user',
                            time: msg['time'],
                          );
                        },
                      ),
          ),

          // ── Indikator typing bot ──
          if (_isLoading)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              alignment: Alignment.centerLeft,
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 5,
                        )
                      ],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Color(0xFF3B62FF),
                          ),
                        ),
                        SizedBox(width: 8),
                        Text(
                          "Asisten sedang mengetik...",
                          style: TextStyle(
                            color: Colors.grey,
                            fontSize: 13,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // ── Input Box ──
          _buildInputBox(),
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────
  // WIDGET: Empty State
  // ─────────────────────────────────────────────
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.eco, size: 80, color: Colors.green.shade200),
          const SizedBox(height: 16),
          const Text(
            "Tanya tentang penyakit pepaya",
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black54,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            "Contoh: \"Apa gejala antraknosa?\"\n\"Bagaimana cara menangani PRSV?\"",
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.black38, fontSize: 13),
          ),
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────
  // WIDGET: Chat Bubble
  // ─────────────────────────────────────────────
  Widget _buildBubble({
    required String text,
    required bool isUser,
    required DateTime time,
  }) {
    final timeStr = DateFormat('HH:mm').format(time);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Avatar bot
          if (!isUser) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: const Color(0xFF3B62FF),
              child: const Text("🌿", style: TextStyle(fontSize: 14)),
            ),
            const SizedBox(width: 8),
          ],

          // Bubble
          Flexible(
            child: Column(
              crossAxisAlignment: isUser
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isUser
                        ? const Color(0xFF3B62FF)
                        : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(18),
                      topRight: const Radius.circular(18),
                      bottomLeft: Radius.circular(isUser ? 18 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 18),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.06),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Text(
                    text,
                    style: TextStyle(
                      color: isUser ? Colors.white : Colors.black87,
                      fontSize: 14,
                      height: 1.4,
                    ),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  timeStr,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Colors.black38,
                  ),
                ),
              ],
            ),
          ),

          // Avatar user
          if (isUser) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 16,
              backgroundColor: Colors.grey.shade300,
              child: const Icon(Icons.person, size: 18, color: Colors.grey),
            ),
          ],
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────
  // WIDGET: Input Box
  // ─────────────────────────────────────────────
  Widget _buildInputBox() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 10,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              maxLines: null,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                hintText: "Tanya tentang penyakit pepaya...",
                hintStyle: const TextStyle(color: Colors.black38),
                filled: true,
                fillColor: const Color(0xFFF3F5FF),
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
              ),
              onSubmitted: (_) => _kirimPertanyaan(),
            ),
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: _isLoading ? null : _kirimPertanyaan,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: _isLoading
                    ? Colors.grey.shade300
                    : const Color(0xFF3B62FF),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.send_rounded,
                color: _isLoading ? Colors.grey : Colors.white,
                size: 20,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
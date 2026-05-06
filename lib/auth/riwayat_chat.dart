import 'package:flutter/material.dart';

class RiwayatChatPage extends StatelessWidget {
  const RiwayatChatPage({super.key});

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;

    // Dummy data (nanti bisa diganti dari Firebase / database)
    final List<Map<String, String>> chatHistory = [
      {
        "title": "Daun bercak hitam",
        "subtitle": "Kemungkinan antraknosa",
        "time": "10:30"
      },
      {
        "title": "Daun menguning",
        "subtitle": "Gejala virus mosaik",
        "time": "Kemarin"
      },
      {
        "title": "Daun busuk",
        "subtitle": "Kemungkinan jamur",
        "time": "2 hari lalu"
      },
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text("Riwayat Chat"),
        backgroundColor: Colors.green,
      ),
      body: chatHistory.isEmpty
          ? const Center(
              child: Text(
                "Belum ada riwayat chat",
                style: TextStyle(fontSize: 16),
              ),
            )
          : ListView.builder(
              padding: EdgeInsets.symmetric(
                horizontal: width < 600 ? 10 : 40, // responsif
                vertical: 10,
              ),
              itemCount: chatHistory.length,
              itemBuilder: (context, index) {
                final chat = chatHistory[index];

                return Card(
                  elevation: 2,
                  margin: const EdgeInsets.symmetric(vertical: 6),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 15,
                      vertical: 10,
                    ),
                    leading: CircleAvatar(
                      backgroundColor: Colors.green,
                      child: const Icon(
                        Icons.chat,
                        color: Colors.white,
                      ),
                    ),
                    title: Text(
                      chat["title"]!,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    subtitle: Text(chat["subtitle"]!),
                    trailing: Text(
                      chat["time"]!,
                      style: const TextStyle(fontSize: 12),
                    ),
                    onTap: () {
                      // nanti bisa diarahkan ke detail chat
                    },
                  ),
                );
              },
            ),
    );
  }
}
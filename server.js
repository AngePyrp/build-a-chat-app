import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "node:url";
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;
const indexPath = path.join(__dirname, "public", "index.html");

const server = http.createServer((req, res) => {
  if (req.url !== "/" && req.url !== "/index.html") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  fs.readFile(indexPath, (error, html) => {
    if (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Could not load the chat page.");
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket, req) => {
  const username =
    new URL(req.url, "http://localhost").searchParams.get("username") ||
    "Anonymous";

  const broadcast = (message) => {
    const payload = JSON.stringify(message);

    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }
  };

  broadcast({ type: "system", text: `${username} joined` });

  socket.on("message", (rawMessage) => {
    try {
      const { text } = JSON.parse(rawMessage.toString());

      if (typeof text !== "string") return;

      broadcast({ type: "chat", username, text });
    } catch {
      // Ignore invalid JSON messages.
    }
  });

  socket.on("close", () => {
    broadcast({ type: "system", text: `${username} left` });
  });
});

server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
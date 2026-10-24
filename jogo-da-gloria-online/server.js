const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, game: "Jogo da Gloria Online" }));

const rooms = new Map();
const specials = {
  5: { type: "kiss", title: "Casa do Beijo", text: "Manda um beijo pela câmara! 💋" },
  7: { type: "memory", title: "Casa da Memória", text: "Contem uma memória bonita dos vossos meses juntos. 💕" },
  10: { type: "challenge", title: "Desafio da Diversão", text: "Façam uma cara engraçada durante 10 segundos! 😂" },
  13: { type: "love", title: "Pergunta do Amor", text: "O que mais gostas na outra pessoa? ❤️" },
  16: { type: "surprise", title: "Casa Surpresa", text: "Diz uma coisa bonita que ainda queres viver com a outra pessoa. 🎁" },
  20: { type: "challenge", title: "Desafio da Diversão", text: "Inventem um cumprimento só vosso! 😄" },
  23: { type: "memory", title: "Casa da Memória", text: "Qual foi um momento destes 9 meses que te fez sorrir? 💌" },
  26: { type: "love", title: "Pergunta do Amor", text: "Que pequeno gesto te faz sentir amado/a? ❤️" },
  30: { type: "extra", title: "Casa Extra", text: "A sorte está contigo: avança 2 casas! ⭐" },
  33: { type: "love", title: "Pergunta do Amor", text: "Que lugar gostavas de visitar comigo? 🌍" },
  37: { type: "challenge", title: "Desafio da Diversão", text: "Diz uma frase romântica com voz de locutor! 🎙️" },
  40: { type: "surprise", title: "Casa Surpresa", text: "Escolhe uma música que te faça lembrar de nós. 🎶" },
  45: { type: "memory", title: "Casa da Memória", text: "Conta uma coisa que aprendeste sobre nós nesta relação. 💗" }
};
const tileTypes = ["love", "gift", "star", "kiss", "heart", "challenge", "heart", "gift", "love", "surprise"];

function cleanName(value) {
  return String(value || "").trim().slice(0, 24) || "Jogador";
}
function roomPublic(room) {
  return {
    code: room.code,
    players: room.players.map(p => ({ id: p.id, name: p.name, pos: p.pos, online: true })),
    current: room.current,
    started: room.started,
    winner: room.winner,
    lastRoll: room.lastRoll,
    notice: room.notice,
    chat: room.chat.slice(-60)
  };
}
function broadcast(room) { io.to(room.code).emit("state", roomPublic(room)); }
function newRoom(code, hostId, hostName) {
  return {
    code, hostId, players: [{ id: hostId, name: cleanName(hostName), pos: 1 }],
    current: hostId, started: false, winner: null, lastRoll: null,
    notice: "Bem-vindos! Aguardem que o outro jogador entre.", chat: []
  };
}

io.on("connection", socket => {
  socket.on("createRoom", ({ password, name } = {}, cb = () => {}) => {
    if (!ADMIN_PASSWORD) return cb({ ok: false, error: "O administrador ainda não configurou ADMIN_PASSWORD no Render." });
    if (String(password || "") !== ADMIN_PASSWORD) return cb({ ok: false, error: "Palavra-passe de administrador incorreta." });
    let code;
    do { code = crypto.randomBytes(3).toString("hex").toUpperCase(); } while (rooms.has(code));
    const room = newRoom(code, socket.id, name);
    rooms.set(code, room);
    socket.join(code);
    socket.data.room = code;
    cb({ ok: true, code, host: true });
    broadcast(room);
  });

  socket.on("joinRoom", ({ code, name } = {}, cb = () => {}) => {
    code = String(code || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb({ ok: false, error: "Essa sala não existe ou já foi encerrada. Confirma o código/link." });
    if (room.players.some(p => p.id === socket.id)) return cb({ ok: true, code });
    if (room.players.length >= 2) return cb({ ok: false, error: "Esta sala já tem dois jogadores." });
    room.players.push({ id: socket.id, name: cleanName(name), pos: 1 });
    room.started = true;
    room.notice = "A aventura começou! Boa sorte aos dois. ❤️";
    socket.join(code);
    socket.data.room = code;
    cb({ ok: true, code });
    broadcast(room);
    io.to(code).emit("peer-ready");
  });

  socket.on("roll", () => {
    const room = rooms.get(socket.data.room);
    if (!room || !room.started || room.winner || room.current !== socket.id) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    const roll = Math.floor(Math.random() * 6) + 1;
    const old = player.pos;
    player.pos = Math.min(50, player.pos + roll);
    room.lastRoll = { name: player.name, value: roll, from: old, to: player.pos };
    const special = specials[player.pos];
    if (player.pos >= 50) {
      player.pos = 50; room.winner = socket.id;
      room.notice = `🎉 ${player.name} chegou à meta! Juntos, sempre! ❤️`;
    } else if (special) {
      room.notice = `${player.name} caiu na ${special.title}: ${special.text}`;
      if (special.type === "extra") player.pos = Math.min(50, player.pos + 2);
    } else {
      room.notice = `${player.name} tirou ${roll} e avançou de ${old} para ${player.pos}.`;
    }
    room.current = room.players.find(p => p.id !== socket.id)?.id || socket.id;
    broadcast(room);
  });

  socket.on("chat", message => {
    const room = rooms.get(socket.data.room);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    const text = String(message || "").trim().slice(0, 300);
    if (!player || !text) return;
    room.chat.push({ name: player.name, text, time: new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) });
    broadcast(room);
  });

  // WebRTC signaling for camera/microphone between the two players.
  socket.on("rtc-offer", data => { const room = rooms.get(socket.data.room); if (room) socket.to(room.code).emit("rtc-offer", data); });
  socket.on("rtc-answer", data => { const room = rooms.get(socket.data.room); if (room) socket.to(room.code).emit("rtc-answer", data); });
  socket.on("rtc-ice", data => { const room = rooms.get(socket.data.room); if (room) socket.to(room.code).emit("rtc-ice", data); });

  socket.on("disconnect", () => {
    const code = socket.data.room;
    const room = rooms.get(code);
    if (!room) return;
    room.players = room.players.filter(p => p.id !== socket.id);
    if (room.players.length === 0) rooms.delete(code);
    else {
      room.current = room.players[0].id;
      room.started = false;
      room.notice = "O outro jogador saiu da sala. Pode voltar a entrar pelo mesmo link.";
      broadcast(room);
    }
  });
});

server.listen(PORT, () => console.log(`Jogo da Gloria Online a ouvir na porta ${PORT}`));

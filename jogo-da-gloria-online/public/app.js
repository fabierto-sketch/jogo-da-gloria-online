const socket = io();
const $ = id => document.getElementById(id);
let roomCode = "";
let host = false;
let state = null;
let localStream = null;
let pc = null;
let remoteDescriptionSet = false;
let pendingIce = [];
const specialInfo = {
  5:["💋","Casa do Beijo"],7:["💌","Casa da Memória"],10:["😄","Desafio"],13:["💬","Pergunta do Amor"],
  16:["🎁","Surpresa"],20:["😄","Desafio"],23:["💌","Memória"],26:["💬","Pergunta do Amor"],
  30:["⭐","Avança 2"],33:["💬","Pergunta do Amor"],37:["😄","Desafio"],40:["🎁","Surpresa"],45:["💌","Memória"]
};
const tileEmojis = ["❤️","🎁","⭐","💋","❤️","😄","❤️","🎁","💬","📸"];
const colors = ["#ff8cae","#ffd071","#f8a2ba","#ffc1cc","#ff92ac","#8edb75","#ffb7b7","#ffd071","#70b8ff","#b875df"];
function showError(text){ $("lobbyError").textContent = text || ""; }
function enterGame(code, isHost){
  roomCode = code; host = isHost;
  $("lobby").classList.add("hidden"); $("game").classList.remove("hidden");
  $("roomStatus").textContent = `🔒 Sala privada ${code} · link para partilhar`;
  history.replaceState({}, "", `?sala=${code}`);
}
$("createBtn").onclick = () => {
  showError("");
  socket.emit("createRoom",{password:$("adminPassword").value,name:$("name").value},r=>{
    if(!r?.ok) return showError(r?.error || "Não foi possível criar a sala.");
    enterGame(r.code,true);
  });
};
$("joinBtn").onclick = () => {
  showError("");
  const code = ($("roomCode").value || new URLSearchParams(location.search).get("sala") || "").trim().toUpperCase();
  socket.emit("joinRoom",{code,name:$("joinName").value},r=>{
    if(!r?.ok) return showError(r?.error || "Não foi possível entrar.");
    enterGame(r.code,false);
  });
};
const urlCode = new URLSearchParams(location.search).get("sala");
if(urlCode){$("roomCode").value=urlCode;}
function makeBoard(){
  const tiles = $("tiles"); tiles.innerHTML="";
  // 50 spaces: 13 top, 12 right, 13 bottom, 12 left.
  const positions=[];
  for(let i=0;i<13;i++) positions.push({x:5+i*7.5,y:7.5});
  for(let i=0;i<12;i++) positions.push({x:95,y:14+i*6.4});
  for(let i=12;i>=0;i--) positions.push({x:5+i*7.5,y:92.5});
  for(let i=0;i<12;i++) positions.push({x:5,y:85-i*6.4});
  positions.forEach((p,idx)=>{
    const n=idx+1, tile=document.createElement("div"); tile.className="tile";
    if(n===1) tile.classList.add("start");
    if(n===50) tile.classList.add("finish");
    if(specialInfo[n]) tile.classList.add("special");
    tile.style.left=p.x+"%"; tile.style.top=p.y+"%";
    tile.style.background=n===1||n===50?"#b72555":colors[(n-1)%colors.length];
    if(n===1) tile.innerHTML=`<span>▶ PARTIDA</span><span class="emoji">❤️</span>`;
    else if(n===50) tile.innerHTML=`<span>CHEGADA</span><span class="emoji">👑</span>`;
    else tile.innerHTML=`<span>${n}</span><span class="emoji">${specialInfo[n]?.[0] || tileEmojis[(n-1)%tileEmojis.length]}</span>`;
    tile.title=specialInfo[n]?.[1] || `Casa ${n}`;
    tiles.appendChild(tile);
  });
}
makeBoard();
function render(s){
  state=s;
  const p1=s.players[0], p2=s.players[1];
  $("p1name").textContent=p1?.name||"À espera…"; $("p1pos").textContent=`Casa: ${p1?.pos||1}`;
  $("p2name").textContent=p2?.name||"À espera…"; $("p2pos").textContent=`Casa: ${p2?.pos||1}`;
  $("turnText").textContent=!s.started?"À espera do outro jogador":s.winner?"Partida terminada":s.current===socket.id?"É a tua vez!":"Vez do outro jogador";
  $("rollText").textContent=s.lastRoll?`${s.lastRoll.name} tirou ${s.lastRoll.value}`:"Joga o dado";
  $("dice").textContent=s.lastRoll?["⚀","⚁","⚂","⚃","⚄","⚅"][s.lastRoll.value-1]:"🎲";
  $("rollBtn").disabled=!s.started||s.current!==socket.id||!!s.winner;
  $("notice").textContent=s.notice||"Boa sorte! ❤️";
  const pawns=$("pawns"); pawns.innerHTML="";
  s.players.forEach((p,i)=>{
    const el=document.createElement("div");el.className="pawn-marker";el.textContent=i===0?"🔴":"🔵";
    const tile=document.querySelectorAll(".tile")[Math.max(0,Math.min(49,p.pos-1))];
    if(tile){el.style.left=tile.style.left;el.style.top=(parseFloat(tile.style.top)+(i===0?-2:2))+"%";}
    pawns.appendChild(el);
  });
  const box=$("chatMessages");box.innerHTML="";
  s.chat.forEach(m=>{const row=document.createElement("div");row.className="chat-message";row.innerHTML=`<time>${escapeHtml(m.time)}</time><b>${escapeHtml(m.name)}:</b> ${escapeHtml(m.text)}`;box.appendChild(row);});
  box.scrollTop=box.scrollHeight;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
socket.on("state",render);
$("rollBtn").onclick=()=>socket.emit("roll");
$("chatForm").onsubmit=e=>{e.preventDefault();const v=$("chatInput").value.trim();if(v){socket.emit("chat",v);$("chatInput").value="";}};
$("copyLinkBtn").onclick=async()=>{const link=location.origin+`/?sala=${roomCode}`;try{await navigator.clipboard.writeText(link);$("notice").textContent="Link copiado! Envia-o à Bernardete. ❤️";}catch{$("notice").textContent=link;}};
$("shareBtn").onclick=()=>{const link=location.origin+`/?sala=${roomCode}`;location.href=`https://wa.me/?text=${encodeURIComponent("Vamos jogar o nosso Jogo da Glória? ❤️🎲 "+link)}`;};

// WebRTC camera and microphone
function createPeer(){
  if(pc) return pc;
  pc=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});
  pc.onicecandidate=e=>{if(e.candidate)socket.emit("rtc-ice",e.candidate);};
  pc.ontrack=e=>{if(e.streams[0])$("remoteVideo").srcObject=e.streams[0];};
  if(localStream)localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
  return pc;
}
async function startMedia(kind){
  try{
    if(!localStream)localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    $("localVideo").srcObject=localStream;
    if(kind==="camera"){const t=localStream.getVideoTracks()[0];if(t)t.enabled=!t.enabled;$("cameraBtn").textContent=t&&t.enabled?"📷 Desligar câmara":"📷 Ligar câmara";}
    if(kind==="mic"){const t=localStream.getAudioTracks()[0];if(t)t.enabled=!t.enabled;$("micBtn").textContent=t&&t.enabled?"🎙️ Desligar microfone":"🎙️ Ligar microfone";}
    const peer=createPeer();
    if(state?.players?.length===2){
      const offer=await peer.createOffer();await peer.setLocalDescription(offer);socket.emit("rtc-offer",offer);
    }
  }catch(e){$("notice").textContent="Não foi possível ligar a câmara/microfone. Confirma as permissões do navegador e usa HTTPS."; }
}
$("cameraBtn").onclick=()=>startMedia("camera");
$("micBtn").onclick=()=>startMedia("mic");
socket.on("peer-ready",async()=>{if(localStream){const peer=createPeer();const offer=await peer.createOffer();await peer.setLocalDescription(offer);socket.emit("rtc-offer",offer);}});
socket.on("rtc-offer",async offer=>{try{const peer=createPeer();await peer.setRemoteDescription(offer);remoteDescriptionSet=true;for(const c of pendingIce)await peer.addIceCandidate(c);pendingIce=[];const answer=await peer.createAnswer();await peer.setLocalDescription(answer);socket.emit("rtc-answer",answer);}catch(e){console.error(e);}});
socket.on("rtc-answer",async answer=>{try{if(pc)await pc.setRemoteDescription(answer);remoteDescriptionSet=true;for(const c of pendingIce)await pc.addIceCandidate(c);pendingIce=[];}catch(e){console.error(e);}});
socket.on("rtc-ice",async candidate=>{try{if(pc&&remoteDescriptionSet)await pc.addIceCandidate(candidate);else pendingIce.push(candidate);}catch(e){console.error(e);}});

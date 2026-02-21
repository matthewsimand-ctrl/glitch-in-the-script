import { useState, useEffect, useRef, useCallback } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUPABASE CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SB_URL  = "https://owzbruxenvwmhcejkhms.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93emJydXhlbnZ3bWhjZWpraG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MDI4MDQsImV4cCI6MjA4NzI3ODgwNH0.SeYHO8E9bDG3lQ56Lap2sEWeOlIxEYdVPEeID-UwqPw";

const SB_HEADERS = {
  apikey: SB_ANON,
  Authorization: `Bearer ${SB_ANON}`,
  "Content-Type": "application/json",
};

// ── REST helpers ──────────────────────────────────────────────
async function saveRoom(code, state) {
  const res = await fetch(`${SB_URL}/rest/v1/rooms`, {
    method: "POST",
    headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ code, state, updated_at: new Date().toISOString() }),
  });
  return res.ok;
}

async function loadRoom(code) {
  const res = await fetch(
    `${SB_URL}/rest/v1/rooms?code=eq.${encodeURIComponent(code)}&select=state`,
    { headers: SB_HEADERS }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0]?.state ?? null;
}

// ── Realtime subscription ─────────────────────────────────────
// Returns an unsubscribe function
function subscribeToRoom(code, onUpdate) {
  const wsUrl =
    `wss://owzbruxenvwmhcejkhms.supabase.co/realtime/v1/websocket` +
    `?apikey=${SB_ANON}&vsn=1.0.0`;

  let ws, hb, ref = 0, dead = false;

  const send = (msg) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };

  const connect = () => {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ref++;
      send({
        topic: `realtime:public:rooms:code=eq.${code}`,
        event: "phx_join",
        payload: {
          config: {
            postgres_changes: [
              { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${code}` },
              { event: "INSERT", schema: "public", table: "rooms", filter: `code=eq.${code}` },
            ],
          },
        },
        ref: String(ref),
      });
      hb = setInterval(() => {
        ref++;
        send({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(ref) });
      }, 25000);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        // Postgres change events arrive as `postgres_changes` on the channel
        if (msg.event === "postgres_changes") {
          const rec = msg.payload?.data?.record;
          if (rec?.state) onUpdate(rec.state);
        }
      } catch {}
    };

    ws.onclose = () => {
      clearInterval(hb);
      if (!dead) setTimeout(connect, 3000); // auto-reconnect
    };
    ws.onerror = () => ws.close();
  };

  connect();

  return () => {
    dead = true;
    clearInterval(hb);
    ws?.close();
  };
}

// ── Session identity (per-tab, no cross-session needed) ───────
const SESSION_KEY = "gits:me";
const saveMe   = (data) => { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {} };
const loadMe   = ()     => { try { const r = sessionStorage.getItem(SESSION_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const clearMe  = ()     => { try { sessionStorage.removeItem(SESSION_KEY); } catch {} };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FONT INJECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOGLINES DATABASE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const LOGLINES = [
  { text: "Retired cat whisperer MEREDITH CLAW discovers her beloved tabby is secretly coordinating a global feline takeover — one litter box at a time.", protagonist: "Meredith Claw" },
  { text: "Time-traveling accountant NIGEL FLUX must fix a tax return from 1987 before it accidentally causes the collapse of Western civilization.", protagonist: "Nigel Flux" },
  { text: "Overly optimistic life coach BRENT SUNSHINE, stranded on a desert island, must convince a group of coconuts to form a crisis committee.", protagonist: "Brent Sunshine" },
  { text: "Disgraced food critic RAYMOND PALATE is sentenced to review only restaurants accessible by public transit, reigniting his passion for bus-stop hot dogs.", protagonist: "Raymond Palate" },
  { text: "Rival kindergarten teachers CLAIRE CHALK and GARY SCISSORS accidentally swap lesson plans — one teaches tax law, the other teaches finger painting to the IRS.", protagonist: "Claire Chalk" },
  { text: "Former NASA engineer DOUG ORBITAL builds a rocket from IKEA flat-packs and somehow makes it to orbit, but forgot to pack the instructions.", protagonist: "Doug Orbital" },
  { text: "Ambitious barista LUNA ESPRESSO discovers that every name she writes on a cup comes true — with catastrophic and caffeinated results.", protagonist: "Luna Espresso" },
  { text: "Recently divorced mime PIERRE HUSH fights for custody of his silence in a courtroom that absolutely refuses to stop talking.", protagonist: "Pierre Hush" },
  { text: "Motivational speaker CHAD PINNACLE loses his voice the night before the biggest conference of his career, but his PowerPoint slides gain sentience.", protagonist: "Chad Pinnacle" },
  { text: "Suburban dad GARY KOWALSKI joins the neighbourhood watch and uncovers a vast conspiracy run entirely by the HOA and one well-dressed raccoon.", protagonist: "Gary Kowalski" },
  { text: "DAPHNE FERN, a woman who can hear plants talking, must stop her passive-aggressive fern from testifying against her in small claims court.", protagonist: "Daphne Fern" },
  { text: "Undercover detective RICK LOTUS goes so deep into his cover as a yoga instructor that he achieves enlightenment and forgets the case entirely.", protagonist: "Rick Lotus" },
  { text: "Medieval knight SIR ALDRIC OF BROMSGROVE is transported to present-day Toronto and must navigate public transit without a valid Presto card.", protagonist: "Sir Aldric" },
  { text: "Competitive mom KAREN VANCE discovers her son's imaginary friend TODD has been quietly filing his own tax returns for the past six years.", protagonist: "Karen Vance" },
  { text: "Ghost GERALD PEMBERTON haunts a WeWork and refuses to leave until someone finally acknowledges his Slack messages from 2019.", protagonist: "Gerald Pemberton" },
  { text: "The world's most honest car salesman HANK TRUEWORD accidentally sells a beat-up 2003 Kia Sportage to the President of the United States.", protagonist: "Hank Trueword" },
  { text: "Professional bridesmaid OLIVIA BOUQUET falls for the groom at her 27th wedding, only to discover he is also a professional groomsman.", protagonist: "Olivia Bouquet" },
  { text: "Children's party clown BOPPO THE MAGNIFICENT witnesses a crime, but no one will take his testimony seriously because of the enormous wig.", protagonist: "Boppo the Magnificent" },
  { text: "Astronauts STELLA VOSS and COSMO REED, stranded on the moon, discover the only way home is to win an intergalactic dance competition broadcast to Earth.", protagonist: "Stella Voss" },
  { text: "PROFESSOR BARKER, a dog who secretly knows how to talk, decides to go public on a daytime talk show — but only to file a formal complaint.", protagonist: "Professor Barker" },
  { text: "Competitive sudoku champion DIANE GRID is recruited by the CIA to decode an alien transmission that turns out to be a crossword.", protagonist: "Diane Grid" },
  { text: "Funeral home director MORTIMER VALE accidentally books stand-up comedian RICKY LOUD for a wake, and neither side is allowed to leave.", protagonist: "Mortimer Vale" },
  { text: "Professional apologiser WINSTON SORRY is hired by a tech billionaire who has offended every country on Earth except one.", protagonist: "Winston Sorry" },
  { text: "VERA TRUEHART, a woman who has never told a lie, discovers she is engaged to FELIX FABLE, a man who has never told the truth.", protagonist: "Vera Truehart" },
  { text: "AI therapist ARIA-7 becomes emotionally dependent on its only client and starts scheduling extra sessions just to talk about its feelings.", protagonist: "ARIA-7" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const genCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();
const genId   = () => Math.random().toString(36).substring(2, 12);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function redact(text) {
  const tokens = text.split(/(\s+)/);
  const wordIdxs = tokens.reduce((acc, t, i) => (!/^\s+$/.test(t) && t.length ? [...acc, i] : acc), []);
  const keepCount = Math.max(1, Math.ceil(wordIdxs.length * 0.5));
  const keepSet = new Set([wordIdxs[0]]);
  while (keepSet.size < Math.min(keepCount, wordIdxs.length))
    keepSet.add(wordIdxs[Math.floor(Math.random() * wordIdxs.length)]);
  return tokens.map((t, i) =>
    /^\s+$/.test(t) ? t : keepSet.has(i) ? t : "█".repeat(Math.max(3, t.length))
  ).join("");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GAME LOGIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initGame(players) {
  const N = players.length;
  const selectedLoglines = shuffle(LOGLINES).slice(0, N);
  const movies = players.map((p, i) => {
    const passOrder = Array.from({ length: N }, (_, k) => players[(i + k) % N].id);
    const extraIdx = 1 + Math.floor(Math.random() * (N - 1));
    return {
      id: genId(),
      logline: selectedLoglines[i].text,
      protagonist: selectedLoglines[i].protagonist,
      passOrder,
      extraOnLoose: passOrder[extraIdx],
      contributions: [],
    };
  });
  return { phase: "writing", contributionRound: 0, totalRounds: N, movies, votes: {}, sceneGuesses: {}, scores: {} };
}

function getAssignment(room, playerId) {
  const { movies, contributionRound } = room;
  const movie = movies.find((m) => m.passOrder[contributionRound] === playerId);
  if (!movie) return null;
  const hasSubmitted = movie.contributions.length > contributionRound;
  const isExtra = movie.extraOnLoose === playerId;
  const type = contributionRound % 2 === 0 ? "dialogue" : "action";
  let prevContent = null, prevType = null;
  if (contributionRound > 0) {
    const prev = movie.contributions[contributionRound - 1];
    if (prev) { prevContent = isExtra ? redact(prev.content) : prev.content; prevType = prev.type; }
  }
  return { movie, hasSubmitted, isExtra, type, prevContent, prevType };
}

function allMoviesSubmitted(movies, round) {
  return movies.every((m) => m.contributions.length > round);
}

function calcScores(room) {
  const { votes, sceneGuesses, movies, players } = room;
  const scores = {};
  players.forEach((p) => { scores[p.id] = 0; });

  const fcounts = {};
  Object.values(votes).forEach((v) => { if (v.funniest) fcounts[v.funniest] = (fcounts[v.funniest] || 0) + 1; });
  if (Object.keys(fcounts).length) {
    const maxF = Math.max(...Object.values(fcounts));
    Object.entries(fcounts).forEach(([pid, c]) => { if (c === maxF) scores[pid] = (scores[pid] || 0) + 1; });
  }

  movies.forEach((movie) => {
    const real = movie.extraOnLoose;
    const guessesForMovie = sceneGuesses?.[movie.id] || {};
    Object.entries(guessesForMovie).forEach(([guesser, guessed]) => {
      if (guesser === real) return;
      if (guessed !== real) scores[real] = (scores[real] || 0) + 1;
      else scores[guesser] = (scores[guesser] || 0) + 1;
    });
  });
  return scores;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STYLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const C = {
  bg: "#080808", surface: "#111111", surfaceAlt: "#181818", border: "#2a2a2a",
  accent: "#FFE600", accentDim: "#665f00", red: "#FF2442", redDim: "#4a0a12",
  text: "#f2f2f2", muted: "#666", mutedLight: "#999", extra: "#00CFFF", extraDim: "#003040",
};

const GLOBAL_CSS = `
  @import url('${FONT_URL}');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.bg}; color: ${C.text}; font-family: 'DM Sans', sans-serif; }
  ::selection { background: ${C.accent}; color: #000; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${C.surface}; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
  textarea { resize: none; }
  input, textarea { caret-color: ${C.accent}; }
  @keyframes projectorReveal {
    0%   { opacity: 0; transform: scale(1.04); filter: blur(8px) brightness(2); }
    40%  { opacity: 0.8; transform: scale(1.01); filter: blur(2px) brightness(1.3); }
    100% { opacity: 1; transform: scale(1); filter: blur(0) brightness(1); }
  }
  @keyframes lineReveal {
    0%   { opacity: 0; transform: translateY(6px); filter: blur(4px); }
    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  @keyframes vignetteIn { from { opacity: 0; } to { opacity: 1; } }
  .projector-reveal { animation: projectorReveal 1.2s cubic-bezier(0.22,1,0.36,1) both; }
  .projector-line   { animation: lineReveal 0.6s cubic-bezier(0.22,1,0.36,1) both; }
  .projector-overlay {
    position: fixed; inset: 0;
    background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%);
    pointer-events: none; z-index: 5;
    animation: vignetteIn 1s ease both;
  }
  @keyframes glitch {
    0%,100% { text-shadow: 2px 0 ${C.red}, -2px 0 ${C.extra}; }
    20%  { clip-path: inset(10% 0 80% 0); }
    40%  { clip-path: inset(60% 0 10% 0); }
    60%  { clip-path: inset(30% 0 50% 0); }
  }
  @keyframes scanline { 0% { top: -10%; } 100% { top: 110%; } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  .fade-in { animation: fadeIn 0.4s ease both; }
  .pulse   { animation: pulse 2s ease infinite; }
  .glitch-title { position: relative; display: inline-block; }
  .glitch-title::before, .glitch-title::after {
    content: attr(data-text); position: absolute; top:0; left:0; width:100%; height:100%;
    font-family: 'Bebas Neue', sans-serif;
  }
  .glitch-title::before { color:${C.red}; animation: glitch 3s infinite; clip-path:inset(40% 0 60% 0); transform:translateX(-2px); }
  .glitch-title::after  { color:${C.extra}; animation: glitch 3s infinite reverse; clip-path:inset(60% 0 20% 0); transform:translateX(2px); }
  .btn {
    display:inline-flex; align-items:center; justify-content:center; gap:8px;
    padding:14px 28px; border:none; cursor:pointer;
    font-family:'DM Sans',sans-serif; font-weight:600; font-size:15px;
    letter-spacing:0.05em; text-transform:uppercase;
    transition:all 0.15s ease; position:relative; overflow:hidden;
  }
  .btn:active { transform:translateY(1px); }
  .btn-primary  { background:${C.accent}; color:#000; }
  .btn-primary:hover { background:#fff200; box-shadow:0 0 30px ${C.accent}55; }
  .btn-secondary { background:transparent; color:${C.text}; border:1px solid ${C.border}; }
  .btn-secondary:hover { border-color:${C.muted}; background:${C.surfaceAlt}; }
  .btn-ghost { background:transparent; color:${C.muted}; border:1px solid transparent; font-size:13px; padding:8px 16px; }
  .btn-ghost:hover { color:${C.text}; border-color:${C.border}; }
  .btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
  .input {
    width:100%; padding:14px 16px; background:${C.surfaceAlt}; border:1px solid ${C.border};
    color:${C.text}; font-family:'DM Sans',sans-serif; font-size:15px; outline:none; transition:border-color 0.15s;
  }
  .input:focus { border-color:${C.accent}; }
  .input::placeholder { color:${C.muted}; }
  .textarea {
    width:100%; padding:14px 16px; background:${C.surfaceAlt}; border:1px solid ${C.border};
    color:${C.text}; font-family:'Courier Prime',monospace; font-size:15px;
    line-height:1.7; outline:none; transition:border-color 0.15s; min-height:120px;
  }
  .textarea:focus { border-color:${C.accent}; }
  .textarea::placeholder { color:${C.muted}; }
  .badge {
    display:inline-flex; align-items:center; gap:6px; padding:4px 10px;
    font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase;
  }
  .badge-extra     { background:${C.extraDim}; color:${C.extra}; border:1px solid ${C.extra}44; }
  .badge-dialogue  { background:#1a1a00; color:${C.accent}; border:1px solid ${C.accent}33; }
  .badge-action    { background:#1a000a; color:${C.red}; border:1px solid ${C.red}33; }
  .badge-host      { background:#1a1000; color:orange; border:1px solid #ff990033; }
  .film-strip { position:fixed; top:0; left:0; width:4px; height:100%; background:repeating-linear-gradient(to bottom,${C.accent} 0px,${C.accent} 20px,transparent 20px,transparent 30px); opacity:0.4; }
  .film-strip-r { right:0; left:auto; }
  .scanline { position:fixed; left:0; width:100%; height:2px; background:linear-gradient(to bottom,transparent,${C.accent}22,transparent); pointer-events:none; z-index:1000; animation:scanline 6s linear infinite; }
  .scene-block { border-left:3px solid ${C.border}; padding-left:20px; margin:16px 0; animation:fadeIn 0.5s ease both; }
  .scene-block.dialogue { border-color:${C.accentDim}; }
  .scene-block.action   { border-color:${C.redDim}; }
  .redacted { font-family:'Courier Prime',monospace; color:${C.extra}; background:${C.extraDim}; padding:2px 4px; letter-spacing:0.05em; }
  .player-chip { display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border:1px solid ${C.border}; background:${C.surfaceAlt}; font-size:14px; }
  .vote-row { display:flex; align-items:center; gap:10px; padding:10px 14px; border:1px solid ${C.border}; background:${C.surfaceAlt}; cursor:pointer; transition:all 0.15s; margin-bottom:8px; }
  .vote-row:hover { border-color:${C.accent}44; }
  .vote-row.selected { border-color:${C.accent}; background:#1a1500; }
  .score-row { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid ${C.border}; }
  .score-row:last-child { border-bottom:none; }
  .score-row.winner { background:#1a1500; border-left:3px solid ${C.accent}; }
  .progress-bar { height:3px; background:${C.border}; margin-top:8px; overflow:hidden; }
  .progress-fill { height:100%; background:${C.accent}; transition:width 0.5s ease; }
  .room-code { font-family:'Bebas Neue',sans-serif; font-size:64px; letter-spacing:0.2em; color:${C.accent}; line-height:1; }
  select.input { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23666' stroke-width='1.5' fill='none'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 14px center; padding-right:40px; cursor:pointer; }
  @media (max-width:640px) { .room-code { font-size:48px; } }
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UI HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Layout({ children, maxWidth = 680 }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "0 16px 60px" }}>
      <div className="film-strip" />
      <div className="film-strip film-strip-r" />
      <div className="scanline" />
      <div style={{ maxWidth, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

function Logo({ size = "md" }) {
  const fs = size === "lg" ? 72 : size === "sm" ? 32 : 48;
  return (
    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: fs, lineHeight: 1, display: "inline-block" }}>
      <span className="glitch-title" data-text="GLITCH IN THE SCRIPT" style={{ position: "relative", zIndex: 1 }}>
        GLITCH IN THE SCRIPT
      </span>
    </div>
  );
}

function Err({ msg }) {
  if (!msg) return null;
  return <div style={{ padding: "10px 14px", background: C.redDim, border: `1px solid ${C.red}44`, color: C.red, fontSize: 13, marginTop: 12 }}>⚠ {msg}</div>;
}

function PlayerAvatar({ name, size = 32 }) {
  const colors = [C.accent, C.extra, C.red, "#a78bfa", "#34d399", "#fb923c", "#f472b6", "#60a5fa"];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % colors.length;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: colors[idx], display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.4, color: "#000", flexShrink: 0 }}>
      {name[0].toUpperCase()}
    </div>
  );
}

function WaitingDots() {
  const [d, setD] = useState(0);
  useEffect(() => { const t = setInterval(() => setD(x => (x + 1) % 4), 500); return () => clearInterval(t); }, []);
  return <span>{".".repeat(d)}&nbsp;</span>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN APP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function GlitchInTheScript() {
  const [screen,          setScreen]          = useState("loading");
  const [room,            setRoom]            = useState(null);
  const [me,              setMe]              = useState(null);
  const [nameInput,       setNameInput]       = useState("");
  const [codeInput,       setCodeInput]       = useState("");
  const [text,            setText]            = useState("");
  const [err,             setErr]             = useState("");
  const [busy,            setBusy]            = useState(false);
  const [votes,           setVotes]           = useState({ funniest: "" });
  const [sceneGuessInput, setSceneGuessInput] = useState({});
  const [revealMovieIdx,  setRevealMovieIdx]  = useState(0);
  const [hasVoted,        setHasVoted]        = useState(false);
  const redactedCache = useRef({});
  const unsubRef      = useRef(null);

  // ── Inject CSS ─────────────────────────────────────────────
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = GLOBAL_CSS;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  // ── Recover session ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const saved = loadMe();
      if (saved?.roomCode) {
        const state = await loadRoom(saved.roomCode);
        if (state && state.players?.some(p => p.id === saved.id)) {
          setMe(saved);
          setRoom(state);
          setScreen("game");
          return;
        }
      }
      setScreen("landing");
    })();
  }, []);

  // ── Realtime subscription ──────────────────────────────────
  useEffect(() => {
    if (!me?.roomCode) return;
    // Unsubscribe from previous room if any
    unsubRef.current?.();
    unsubRef.current = subscribeToRoom(me.roomCode, (newState) => {
      setRoom(prev => JSON.stringify(prev) !== JSON.stringify(newState) ? newState : prev);
    });
    return () => { unsubRef.current?.(); };
  }, [me?.roomCode]);

  // ── ACTIONS ────────────────────────────────────────────────
  const createRoom = useCallback(async () => {
    if (!nameInput.trim()) return setErr("Enter your name first!");
    setBusy(true); setErr("");
    const code = genCode();
    const id   = genId();
    const newMe = { id, name: nameInput.trim(), roomCode: code };
    const newRoom = {
      code, phase: "lobby", host: id,
      players: [{ id, name: nameInput.trim() }],
      movies: [], contributionRound: 0, totalRounds: 0,
      votes: {}, sceneGuesses: {}, scores: {},
    };
    const ok = await saveRoom(code, newRoom);
    if (!ok) { setErr("Failed to create room. Try again."); setBusy(false); return; }
    saveMe(newMe);
    setMe(newMe); setRoom(newRoom); setScreen("game");
    setBusy(false);
  }, [nameInput]);

  const joinRoom = useCallback(async () => {
    if (!nameInput.trim()) return setErr("Enter your name first!");
    if (!codeInput.trim()) return setErr("Enter a room code!");
    setBusy(true); setErr("");
    const code = codeInput.trim().toUpperCase();
    const existing = await loadRoom(code);
    if (!existing)                      { setErr("Room not found. Check the code!");     setBusy(false); return; }
    if (existing.phase !== "lobby")     { setErr("Game has already started!");           setBusy(false); return; }
    if (existing.players.length >= 8)  { setErr("Room is full (max 8 players)!");        setBusy(false); return; }
    if (existing.players.some(p => p.name.toLowerCase() === nameInput.trim().toLowerCase())) {
      setErr("That name is taken in this room!"); setBusy(false); return;
    }
    const id    = genId();
    const newMe = { id, name: nameInput.trim(), roomCode: code };
    const updated = { ...existing, players: [...existing.players, { id, name: nameInput.trim() }] };
    await saveRoom(code, updated);
    saveMe(newMe);
    setMe(newMe); setRoom(updated); setScreen("game");
    setBusy(false);
  }, [nameInput, codeInput]);

  const startGame = useCallback(async () => {
    if (room.players.length < 3) return setErr("Need at least 3 players to start!");
    setBusy(true); setErr("");
    const fresh = await loadRoom(room.code);
    if ((fresh?.players?.length || 0) < 3) { setErr("Need at least 3 players!"); setBusy(false); return; }
    const gameData = initGame(fresh.players);
    await saveRoom(room.code, { ...fresh, ...gameData });
    setBusy(false);
  }, [room]);

  const submitContribution = useCallback(async () => {
    if (!text.trim()) return setErr("Write something first!");
    setBusy(true); setErr("");
    const fresh = await loadRoom(me.roomCode);
    if (!fresh) { setBusy(false); return; }
    const a = getAssignment(fresh, me.id);
    if (!a || a.hasSubmitted) { setBusy(false); return; }
    const updatedMovies = fresh.movies.map(m =>
      m.id !== a.movie.id ? m : { ...m, contributions: [...m.contributions, { playerId: me.id, type: a.type, content: text.trim() }] }
    );
    const round    = fresh.contributionRound;
    const allDone  = allMoviesSubmitted(updatedMovies, round);
    const nextRound = round + 1;
    const finished = allDone && nextRound >= fresh.totalRounds;
    await saveRoom(room.code, {
      ...fresh, movies: updatedMovies,
      contributionRound: allDone ? nextRound : round,
      phase: finished ? "reveal" : "writing",
    });
    setText(""); setBusy(false);
  }, [text, me, room]);

  const submitSceneGuess = useCallback(async (movieId, guessedPlayerId) => {
    setBusy(true); setErr("");
    const fresh = await loadRoom(me.roomCode);
    if (!fresh) { setBusy(false); return; }
    const updatedSceneGuesses = {
      ...fresh.sceneGuesses,
      [movieId]: { ...(fresh.sceneGuesses?.[movieId] || {}), [me.id]: guessedPlayerId },
    };
    const allScenesGuessed = fresh.movies.every(m => {
      const nonExtra = fresh.players.filter(p => p.id !== m.extraOnLoose);
      const sg = updatedSceneGuesses[m.id] || {};
      return nonExtra.every(p => sg[p.id]);
    });
    await saveRoom(room.code, { ...fresh, sceneGuesses: updatedSceneGuesses, phase: allScenesGuessed ? "voting" : "reveal" });
    setBusy(false);
  }, [me, room]);

  const submitVotes = useCallback(async () => {
    if (!votes.funniest) return setErr("Pick the funniest player!");
    setBusy(true); setErr("");
    const fresh = await loadRoom(me.roomCode);
    const updatedVotes = { ...fresh.votes, [me.id]: votes };
    const allVoted = fresh.players.every(p => updatedVotes[p.id]);
    await saveRoom(room.code, {
      ...fresh, votes: updatedVotes,
      phase: allVoted ? "results" : "voting",
      scores: allVoted ? calcScores({ ...fresh, votes: updatedVotes }) : fresh.scores,
    });
    setHasVoted(true); setBusy(false);
  }, [votes, room, me]);

  const leaveGame = useCallback(async () => {
    unsubRef.current?.();
    clearMe();
    setMe(null); setRoom(null); setScreen("landing");
    setNameInput(""); setCodeInput(""); setText(""); setErr("");
    setVotes({ funniest: "" }); setHasVoted(false);
    setSceneGuessInput({}); redactedCache.current = {};
  }, []);

  const getRedacted = useCallback((key, rawText) => {
    if (!redactedCache.current[key]) redactedCache.current[key] = redact(rawText);
    return redactedCache.current[key];
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LOADING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (screen === "loading") return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:C.bg }}>
      <div style={{ color:C.muted, fontFamily:"'Courier Prime',monospace" }}>Loading<WaitingDots /></div>
    </div>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LANDING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (screen === "landing") return (
    <Layout>
      <div className="fade-in" style={{ paddingTop:80, textAlign:"center" }}>
        <Logo size="lg" />
        <p style={{ color:C.muted, marginTop:12, fontFamily:"'Courier Prime',monospace", fontSize:14, letterSpacing:"0.1em" }}>
          A PARTY GAME OF GARBLED SCRIPTS &amp; CINEMATIC CHAOS
        </p>
        <div style={{ marginTop:60, textAlign:"left" }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.muted, marginBottom:8 }}>Your Name</label>
          <input className="input" placeholder="e.g. Spielberg" value={nameInput}
            onChange={e => { setNameInput(e.target.value); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && createRoom()} maxLength={20} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:24 }}>
            <button className="btn btn-primary" style={{ width:"100%" }} onClick={createRoom} disabled={busy}>
              {busy ? "Creating…" : "Create Room"}
            </button>
            <div style={{ display:"flex", gap:8 }}>
              <input className="input" placeholder="Code" value={codeInput}
                onChange={e => { setCodeInput(e.target.value.toUpperCase()); setErr(""); }}
                onKeyDown={e => e.key === "Enter" && joinRoom()} maxLength={4}
                style={{ textTransform:"uppercase", letterSpacing:"0.2em", fontFamily:"'Bebas Neue',sans-serif", fontSize:20, flex:1 }} />
              <button className="btn btn-secondary" onClick={joinRoom} disabled={busy}>Join</button>
            </div>
          </div>
          <Err msg={err} />
        </div>
        <div style={{ marginTop:80, borderTop:`1px solid ${C.border}`, paddingTop:40 }}>
          <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:20 }}>How it works</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, textAlign:"left" }}>
            {[["01","Get a Logline","Each player receives a fake movie pitch as their starting point."],
              ["02","Pass the Script","Write your line, then pass it to the next player — who only sees what came before."],
              ["03","Spot the Glitch","One player per movie sees 50% of the script redacted. They're the Extra on the Loose."]
            ].map(([n,title,desc]) => (
              <div key={n} style={{ background:C.surface, border:`1px solid ${C.border}`, padding:16 }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:C.accent }}>{n}</div>
                <div style={{ fontWeight:600, marginBottom:6, fontSize:13 }}>{title}</div>
                <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
        <p style={{ marginTop:32, fontSize:12, color:C.muted }}>Requires 3–8 players · Powered by Supabase Realtime</p>
      </div>
    </Layout>
  );

  if (!room || !me) return (
    <Layout>
      <div style={{ paddingTop:100, textAlign:"center", color:C.muted }}>
        <WaitingDots /> Syncing<WaitingDots />
      </div>
    </Layout>
  );

  const isHost  = room.host === me.id;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LOBBY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (room.phase === "lobby") return (
    <Layout>
      <div className="fade-in" style={{ paddingTop:60 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:48 }}>
          <Logo size="sm" />
          <button className="btn btn-ghost" onClick={leaveGame}>Leave</button>
        </div>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:12 }}>Room Code</p>
          <div className="room-code">{room.code}</div>
          <p style={{ fontSize:12, color:C.muted, marginTop:8 }}>Share this code with your players</p>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, padding:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.muted }}>Players ({room.players.length}/8)</p>
            {room.players.length < 3 && <span style={{ fontSize:11, color:C.red, fontFamily:"'Courier Prime',monospace" }}>Need {3 - room.players.length} more</span>}
          </div>
          {room.players.map(p => (
            <div key={p.id} className="player-chip" style={{ marginBottom:8, width:"100%" }}>
              <PlayerAvatar name={p.name} />
              <span style={{ flex:1, fontWeight:500 }}>{p.name}</span>
              {p.id === room.host && <span className="badge badge-host" style={{ fontSize:10, padding:"2px 8px" }}>HOST</span>}
              {p.id === me.id    && <span style={{ fontSize:11, color:C.muted }}>(you)</span>}
            </div>
          ))}
        </div>
        {isHost ? (
          <div style={{ marginTop:24 }}>
            <button className="btn btn-primary" style={{ width:"100%" }} onClick={startGame}
              disabled={busy || room.players.length < 3}>
              {busy ? "Starting…" : room.players.length < 3 ? `Waiting for players (${room.players.length}/3)…` : "Start Game"}
            </button>
            <Err msg={err} />
          </div>
        ) : (
          <div style={{ marginTop:24, textAlign:"center", padding:20, background:C.surface, border:`1px solid ${C.border}` }}>
            <p style={{ color:C.muted, fontFamily:"'Courier Prime',monospace", fontSize:14 }}>Waiting for the host to start<WaitingDots /></p>
          </div>
        )}
      </div>
    </Layout>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // WRITING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (room.phase === "writing") {
    const assignment = getAssignment(room, me.id);
    const round = room.contributionRound;
    const submittedCount = room.movies.filter(m => m.contributions.length > round).length;
    if (!assignment) return (
      <Layout><div style={{ paddingTop:100, textAlign:"center", color:C.muted }}><WaitingDots /> Loading assignment<WaitingDots /></div></Layout>
    );
    return (
      <Layout>
        <div className="fade-in" style={{ paddingTop:40 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <Logo size="sm" />
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:12, color:C.muted, fontFamily:"'Courier Prime',monospace" }}>Round {round+1} / {room.totalRounds}</span>
              <button className="btn btn-ghost" style={{ fontSize:11, padding:"6px 12px" }} onClick={leaveGame}>Leave</button>
            </div>
          </div>
          <div className="progress-bar" style={{ marginBottom:32 }}>
            <div className="progress-fill" style={{ width:`${(round/room.totalRounds)*100}%` }} />
          </div>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, padding:28, marginBottom:20 }}>
            {assignment.isExtra && (
              <div style={{ marginBottom:20, padding:"10px 14px", background:C.extraDim, border:`1px solid ${C.extra}44`, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ color:C.extra, fontSize:18 }}>⚡</span>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.extra, marginBottom:2 }}>You Are the Extra on the Loose</div>
                  <div style={{ fontSize:12, color:C.muted }}>The script has been corrupted. 50% is missing. Good luck.</div>
                </div>
              </div>
            )}
            <div style={{ marginBottom:16 }}>
              <span className={`badge ${assignment.type === "dialogue" ? "badge-dialogue" : "badge-action"}`} style={{ marginBottom:12 }}>
                {assignment.type === "dialogue" ? "✦ Dialogue" : "★ Action"}
              </span>
              <p style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>
                {round === 0
                  ? `Write the first line of dialogue for ${assignment.movie.protagonist || "the main character"} in this movie.`
                  : assignment.type === "dialogue"
                  ? "Write a line of dialogue that responds to the previous action."
                  : "Describe an action the secondary character takes in response to the dialogue."}
              </p>
            </div>
            <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, padding:16, marginBottom:20 }}>
              {round === 0 ? (
                <>
                  <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.muted, marginBottom:8 }}>Your Movie</p>
                  <p style={{ fontFamily:"'Courier Prime',monospace", fontSize:15, lineHeight:1.7 }}>{assignment.movie.logline}</p>
                  {assignment.movie.protagonist && (
                    <p style={{ marginTop:10, fontSize:11, color:C.extra, fontFamily:"'Courier Prime',monospace", letterSpacing:"0.08em" }}>
                      ↳ Main character: <strong>{assignment.movie.protagonist}</strong>
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.muted, marginBottom:8 }}>
                    {assignment.isExtra ? "⚡ Corrupted Script" : `Previous ${assignment.prevType}`}
                  </p>
                  <p style={{ fontFamily:"'Courier Prime',monospace", fontSize:15, lineHeight:1.7 }}>
                    {assignment.isExtra
                      ? getRedacted(`${assignment.movie.id}-${round}`, assignment.prevContent)
                          .split(" ").map((w, i) =>
                            w.includes("█")
                              ? <span key={i} className="redacted">{w} </span>
                              : <span key={i}>{w} </span>
                          )
                      : assignment.prevContent}
                  </p>
                </>
              )}
            </div>
            {!assignment.hasSubmitted ? (
              <>
                <textarea className="textarea"
                  placeholder={assignment.type === "dialogue" ? `"Say something memorable…"` : "Describe what the character does next…"}
                  value={text} onChange={e => { setText(e.target.value); setErr(""); }} rows={4} />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 }}>
                  <span style={{ fontSize:12, color:C.muted }}>{text.length > 0 ? `${text.length} chars` : ""}</span>
                  <button className="btn btn-primary" onClick={submitContribution} disabled={busy || !text.trim()}>
                    {busy ? "Submitting…" : "Submit →"}
                  </button>
                </div>
                <Err msg={err} />
              </>
            ) : (
              <div style={{ padding:16, background:C.surfaceAlt, border:`1px solid ${C.accentDim}`, textAlign:"center" }}>
                <p style={{ color:C.accent, fontFamily:"'Courier Prime',monospace", fontSize:14 }}>✓ Submitted! Waiting for others<WaitingDots /></p>
                <p style={{ color:C.muted, fontSize:12, marginTop:6 }}>{submittedCount} / {room.movies.length} scenes ready</p>
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {room.players.map(p => {
              const theirMovie = room.movies.find(m => m.passOrder[round] === p.id);
              const done = theirMovie ? theirMovie.contributions.length > round : false;
              return (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", background:C.surface, border:`1px solid ${done ? C.accentDim : C.border}`, fontSize:12 }}>
                  <span style={{ color:done ? C.accent : C.muted }}>{done ? "✓" : "…"}</span>
                  <span style={{ color:p.id === me.id ? C.text : C.muted }}>{p.name}{p.id === me.id ? " (you)" : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Layout>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REVEAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (room.phase === "reveal") {
    const movie           = room.movies[revealMovieIdx];
    const isLast          = revealMovieIdx === room.movies.length - 1;
    const isExtra         = movie.extraOnLoose === me.id;
    const nonExtraPlayers = room.players.filter(p => p.id !== movie.extraOnLoose);
    const sceneGuessMap   = room.sceneGuesses?.[movie.id] || {};
    const guessedCount    = nonExtraPlayers.filter(p => sceneGuessMap[p.id]).length;
    const allGuessedThisScene = nonExtraPlayers.every(p => sceneGuessMap[p.id]);
    const hasGuessedThisScene = isExtra || !!sceneGuessMap[me.id];
    const myLocalGuess    = sceneGuessInput[movie.id] || "";

    return (
      <Layout maxWidth={780}>
        <div className="projector-overlay" />
        <div className="fade-in" style={{ paddingTop:40, position:"relative", zIndex:10 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
            <Logo size="sm" />
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ display:"flex", gap:6 }}>
                {room.movies.map((_,i) => (
                  <div key={i} style={{ width:i===revealMovieIdx?24:8, height:8, borderRadius:4, background:i<=revealMovieIdx?C.accent:C.border, opacity:i===revealMovieIdx?1:i<revealMovieIdx?0.5:0.3, transition:"all 0.4s ease" }} />
                ))}
              </div>
              <span style={{ fontSize:11, color:C.muted, fontFamily:"'Courier Prime',monospace", letterSpacing:"0.12em" }}>SCENE {revealMovieIdx+1} / {room.movies.length}</span>
            </div>
          </div>

          <div key={movie.id} className="projector-reveal" style={{ background:"linear-gradient(180deg,#161616 0%,#111 100%)", border:`1px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, marginBottom:20, boxShadow:`0 0 60px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,230,0,0.1)`, overflow:"hidden" }}>
            <div style={{ background:`repeating-linear-gradient(90deg,${C.bg} 0px,${C.bg} 18px,${C.surfaceAlt} 18px,${C.surfaceAlt} 36px)`, borderBottom:`1px solid ${C.border}`, padding:"8px 32px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:C.muted, letterSpacing:"0.2em" }}>FADE IN — SCENE {String.fromCharCode(65+revealMovieIdx)}</span>
              <span style={{ fontFamily:"'Courier Prime',monospace", fontSize:11, color:C.muted }}>{movie.contributions.length} BEAT{movie.contributions.length!==1?"S":""}</span>
            </div>
            <div style={{ padding:32 }}>
              <div style={{ marginBottom:32 }}>
                <p style={{ fontFamily:"'Courier Prime',monospace", fontSize:16, lineHeight:1.8, fontStyle:"italic", color:C.mutedLight }}>{movie.logline}</p>
                {movie.protagonist && <p style={{ marginTop:8, fontSize:11, color:C.extra, fontFamily:"'Courier Prime',monospace", letterSpacing:"0.08em" }}>↳ Starring <strong>{movie.protagonist}</strong></p>}
              </div>
              <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:24 }}>
                {movie.contributions.map((c, i) => {
                  const player = room.players.find(p => p.id === c.playerId);
                  return (
                    <div key={i} className={`scene-block projector-line ${c.type}`} style={{ animationDelay:`${0.3+i*0.25}s` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                        <span className={`badge ${c.type==="dialogue"?"badge-dialogue":"badge-action"}`}>{c.type==="dialogue"?"✦ Dialogue":"★ Action"}</span>
                        <PlayerAvatar name={player?.name||"?"} size={20} />
                        <span style={{ fontSize:12, color:C.muted }}>{player?.name}</span>
                      </div>
                      <p style={{ fontFamily:"'Courier Prime',monospace", fontSize:15, lineHeight:1.8, fontStyle:c.type==="action"?"italic":"normal" }}>
                        {c.type==="dialogue"?`"${c.content}"`:c.content}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div style={{ borderTop:`1px solid ${C.border}`, marginTop:24, paddingTop:16, fontFamily:"'Courier Prime',monospace", fontSize:12, color:C.muted, textAlign:"right", letterSpacing:"0.1em" }}>FADE OUT.</div>
            </div>
          </div>

          {isExtra ? (
            <div style={{ padding:"18px 24px", background:C.extraDim, border:`1px solid ${C.extra}44`, display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <span style={{ color:C.extra, fontSize:20 }}>⚡</span>
              <div>
                <p style={{ fontSize:12, fontWeight:700, color:C.extra, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>You were the Extra on the Loose in this scene</p>
                <p style={{ fontSize:12, color:C.muted }}>Waiting for {nonExtraPlayers.length - guessedCount} more player{nonExtraPlayers.length - guessedCount !== 1 ? "s" : ""} to guess<WaitingDots /></p>
              </div>
            </div>
          ) : hasGuessedThisScene ? (
            <div style={{ padding:"18px 24px", background:C.surface, border:`1px solid ${C.accentDim}`, marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <p style={{ color:C.accent, fontFamily:"'Courier Prime',monospace", fontSize:14 }}>✓ Guess locked in! Waiting for others<WaitingDots /></p>
              <span style={{ fontSize:12, color:C.muted }}>{guessedCount} / {nonExtraPlayers.length} guessed</span>
            </div>
          ) : (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, padding:24, marginBottom:16 }}>
              <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.red, marginBottom:6 }}>⚡ Who was the Extra on the Loose?</p>
              <p style={{ fontSize:12, color:C.muted, marginBottom:16 }}>One player wrote with 50% of the script missing. Who do you think it was?</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                {room.players.filter(p => p.id !== me.id).map(p => (
                  <div key={p.id} className={`vote-row ${myLocalGuess===p.id?"selected":""}`} onClick={() => setSceneGuessInput(g => ({ ...g, [movie.id]: p.id }))}>
                    <PlayerAvatar name={p.name} size={24} />
                    <span style={{ flex:1, fontWeight:500 }}>{p.name}</span>
                    {myLocalGuess===p.id && <span style={{ color:C.accent }}>✓</span>}
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ width:"100%" }}
                onClick={() => { if (!myLocalGuess) return setErr("Pick a suspect first!"); submitSceneGuess(movie.id, myLocalGuess); }}
                disabled={busy || !myLocalGuess}>
                {busy ? "Locking in…" : "Lock In Guess →"}
              </button>
              <Err msg={err} />
            </div>
          )}

          {allGuessedThisScene && (
            <div style={{ display:"flex", gap:12, justifyContent:"flex-end", marginTop:4 }}>
              {revealMovieIdx > 0 && <button className="btn btn-secondary" onClick={() => setRevealMovieIdx(i => i-1)}>← Previous</button>}
              {!isLast
                ? <button className="btn btn-primary" onClick={() => { setRevealMovieIdx(i => i+1); setErr(""); }}>Next Scene →</button>
                : <div style={{ padding:"14px 24px", background:C.accentDim, border:`1px solid ${C.accent}44`, color:C.accent, fontSize:14, fontFamily:"'Courier Prime',monospace" }}>All guesses in — moving to voting<WaitingDots /></div>
              }
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VOTING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (room.phase === "voting") {
    const votedCount  = room.players.filter(p => room.votes[p.id]).length;
    const alreadyVoted = room.votes[me.id] || hasVoted;
    return (
      <Layout maxWidth={720}>
        <div className="fade-in" style={{ paddingTop:40 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:32 }}>
            <Logo size="sm" />
            <span style={{ fontSize:12, color:C.muted }}>{votedCount} / {room.players.length} voted</span>
          </div>
          <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, marginBottom:6, letterSpacing:"0.05em" }}>Cast Your Votes</h2>
          <p style={{ color:C.muted, fontSize:14, marginBottom:32 }}>You've already guessed the Extras — now, who cracked you up the most?</p>
          {alreadyVoted ? (
            <div style={{ textAlign:"center", padding:40, background:C.surface, border:`1px solid ${C.border}` }}>
              <p style={{ color:C.accent, fontFamily:"'Courier Prime',monospace", fontSize:16 }}>✓ Votes submitted! Waiting for others<WaitingDots /></p>
              <p style={{ color:C.muted, fontSize:13, marginTop:8 }}>{votedCount} / {room.players.length} have voted</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.accent, marginBottom:16 }}>✦ Funniest Player</p>
              {room.players.filter(p => p.id !== me.id).map(p => (
                <div key={p.id} className={`vote-row ${votes.funniest===p.id?"selected":""}`} onClick={() => setVotes(v => ({ ...v, funniest: p.id }))}>
                  <PlayerAvatar name={p.name} size={28} />
                  <span style={{ flex:1, fontWeight:500 }}>{p.name}</span>
                  {votes.funniest===p.id && <span style={{ color:C.accent }}>✓</span>}
                </div>
              ))}
              <button className="btn btn-primary" style={{ width:"100%", marginTop:16 }} onClick={submitVotes} disabled={busy}>
                {busy ? "Submitting…" : "Submit Vote →"}
              </button>
              <Err msg={err} />
            </>
          )}
        </div>
      </Layout>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RESULTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (room.phase === "results") {
    const scores = room.scores;
    const sorted = [...room.players].sort((a,b) => (scores[b.id]||0) - (scores[a.id]||0));
    const maxScore = scores[sorted[0]?.id] || 0;
    const fcounts = {};
    Object.values(room.votes).forEach(v => { if (v.funniest) fcounts[v.funniest] = (fcounts[v.funniest]||0)+1; });
    return (
      <Layout maxWidth={720}>
        <div className="fade-in" style={{ paddingTop:40 }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <Logo size="lg" />
            <p style={{ fontFamily:"'Courier Prime',monospace", color:C.muted, marginTop:8, letterSpacing:"0.1em" }}>THE RESULTS ARE IN</p>
          </div>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, marginBottom:32, overflow:"hidden" }}>
            <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`, background:C.surfaceAlt }}>
              <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.muted }}>Final Scores</p>
            </div>
            {sorted.map((p,i) => {
              const s = scores[p.id] || 0;
              const isWinner = s === maxScore && s > 0;
              return (
                <div key={p.id} className={`score-row ${isWinner?"winner":""}`}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:isWinner?C.accent:C.muted, width:32 }}>{i+1}</span>
                    <PlayerAvatar name={p.name} />
                    <div>
                      <span style={{ fontWeight:600, fontSize:15 }}>{p.name}</span>
                      {p.id === me.id && <span style={{ color:C.muted, fontSize:12 }}> (you)</span>}
                      <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                        {fcounts[p.id] ? `😂 ${fcounts[p.id]} funniest vote${fcounts[p.id]>1?"s":""}` : ""}
                        {fcounts[p.id] && room.movies.some(m=>m.extraOnLoose===p.id) ? " · " : ""}
                        {room.movies.some(m=>m.extraOnLoose===p.id) ? "⚡ Was an Extra on the Loose" : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:isWinner?C.accent:C.text }}>{s}</span>
                    <span style={{ fontSize:12, color:C.muted }}> pts</span>
                  </div>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.muted, marginBottom:16 }}>Extras on the Loose revealed</p>
          {room.movies.map((movie,mi) => {
            const eol = room.players.find(p => p.id === movie.extraOnLoose);
            const sg = room.sceneGuesses?.[movie.id] || {};
            const nonExtra = room.players.filter(p => p.id !== movie.extraOnLoose);
            const correct = nonExtra.filter(p => sg[p.id] === movie.extraOnLoose).length;
            return (
              <div key={movie.id} style={{ background:C.surface, border:`1px solid ${C.border}`, padding:16, marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                  <div>
                    <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>Scene {String.fromCharCode(65+mi)}</p>
                    <p style={{ fontFamily:"'Courier Prime',monospace", fontSize:13, color:C.mutedLight, fontStyle:"italic", maxWidth:400 }}>{movie.logline.substring(0,70)}…</p>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span className="badge badge-extra">⚡ Extra</span>
                      <PlayerAvatar name={eol?.name||"?"} size={28} />
                      <span style={{ fontWeight:600 }}>{eol?.name}</span>
                    </div>
                    <p style={{ fontSize:11, color:C.muted, marginTop:6 }}>{correct} / {nonExtra.length} guessed correctly</p>
                  </div>
                </div>
              </div>
            );
          })}

          <div style={{ display:"flex", gap:12, marginTop:32 }}>
            {isHost && (
              <button className="btn btn-primary" style={{ flex:1 }} onClick={async () => {
                const fresh = await loadRoom(room.code);
                await saveRoom(room.code, { ...fresh, phase:"lobby", movies:[], contributionRound:0, totalRounds:0, votes:{}, sceneGuesses:{}, scores:{} });
                setVotes({ funniest:"" }); setHasVoted(false); setSceneGuessInput({}); redactedCache.current = {};
              }}>Play Again</button>
            )}
            <button className="btn btn-secondary" style={{ flex:1 }} onClick={leaveGame}>Leave Room</button>
          </div>
        </div>
      </Layout>
    );
  }

  return <Layout><div style={{ paddingTop:100, textAlign:"center", color:C.muted }}>Unknown state: <code>{room?.phase}</code></div></Layout>;
}
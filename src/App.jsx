import React, { useState, useEffect, useReducer, useRef, useCallback } from "react";

/* ============================================================
   ELARA · v7  ·  side-scrolling street, mini-games, stock exchange
   ============================================================ */

// ─── DESIGN TOKENS ──────────────────────────────────────────
const C = {
  // Dark plum twilight backgrounds — atmospheric, confident
  bg: "#1a1232",
  bg2: "#241845",
  bgGlow: "#3a2470",
  // Cream surfaces pop against the dark
  surface: "#fff5e1",
  surface2: "#faecd0",
  surface3: "#f0dcb0",
  // Borders
  border: "#3a2960",
  borderL: "#5a3f80",
  borderCream: "#c9a872",
  // Ink for text on cream
  ink: "#1a0a2e",
  text: "#3a1f50",
  textMuted: "#6a4878",
  textDim: "#aa8eb8",
  // Text on dark
  textCream: "#fff5e1",
  textCreamDim: "#c4a8d4",
  // Vibrant accents — game-y, not corporate
  coral: "#ff4757",
  gold: "#ffb627",
  goldBright: "#ffce5e",
  teal: "#06d6a0",
  blue: "#3a86ff",
  purple: "#b388eb",
  rose: "#ff8e9e",
  green: "#06d6a0",
  red: "#ff4757",
  yellow: "#ffd23f",
  // World — twilight Varena
  skyTop: "#2a1850",
  skyMid: "#7a3470",
  skyDawn: "#ff8e6e",
  skyHorizon: "#ffb887",
  street: "#3a2960",
  streetDark: "#241749",
  pavement: "#503770",
  grass: "#3d8a5c",
  river: "#3a86ff",
  // Glowing illustrated building palette
  bReserve: "#ffce3a", bReserveD: "#c08a00",
  bStocks: "#3a86ff", bStocksD: "#1a5fc4",
  bBank: "#06d6a0", bBankD: "#04a880",
  bMarket: "#ff4757", bMarketD: "#a01828",
  bCoffee: "#2a9d4f", bCoffeeD: "#176530",
  bCinema: "#b388eb", bCinemaD: "#7a3eb8",
  bFlat: "#ff8e9e", bFlatD: "#cc5e6e",
};
const FONT_D = "'Bricolage Grotesque', system-ui, sans-serif";
const FONT_B = "'Sora', system-ui, sans-serif";
const FONT_M = "'JetBrains Mono', ui-monospace, monospace";
const FONT_H = "'Caveat', cursive";
const fmt = (n) => `₺${Math.round(n).toLocaleString("en-GB")}`;
const fmtD = (n) => `₺${n.toLocaleString("en-GB", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
const pct = (n) => `${n.toFixed(1)}%`;

// ─── WORLD LAYOUT (continuous hillside city) ───────────────
const WORLD_W = 4800;
const WORLD_H = 1200;
const STREET_H = 700; // legacy ref kept for some renders
const GROUND_Y = 920; // legacy ref — base of residential

// Ground curve segments — the path climbs the hill
// Walking right takes you up; walking left takes you down.
const GROUND_SEGMENTS = [
  { from: 0,    to: 1400, y: 920 },                    // residential plateau (riverside)
  { from: 1400, to: 1800, y1: 920, y2: 620 },          // first hill — up to commerce
  { from: 1800, to: 3100, y: 620 },                    // commerce plateau
  { from: 3100, to: 3500, y1: 620, y2: 320 },          // second hill — up to financial
  { from: 3500, to: 4800, y: 320 },                    // financial plateau (top)
];

// Smooth ease in/out
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function groundY(x) {
  for (const seg of GROUND_SEGMENTS) {
    if (x >= seg.from && x <= seg.to) {
      if (seg.y !== undefined) return seg.y;
      const t = (x - seg.from) / (seg.to - seg.from);
      return seg.y1 + easeInOut(t) * (seg.y2 - seg.y1);
    }
  }
  return 920;
}

// What "area" name applies at a given x (for HUD)
function areaAt(x) {
  if (x < 1400) return "RIVERSIDE";
  if (x < 1800) return "OLD HILL ROAD";
  if (x < 3100) return "CITY CENTRE";
  if (x < 3500) return "PALACE STEPS";
  return "FINANCIAL DISTRICT";
}

// All buildings placed along the path — each x sits on groundY(x)
const BUILDINGS = [
  // RESIDENTIAL (x: 0 - 1400)
  { id: "park", name: "Riverside Park", x: 400, color: C.teal, dark: C.bBankD, type: "fountain" },
  { id: "flat", name: "Your Flat", x: 850, color: C.bFlat, dark: C.bFlatD, type: "home" },
  { id: "cinema", name: "The Cinema", x: 1200, color: C.bCinema, dark: C.bCinemaD, type: "deco" },
  // COMMERCE (x: 1800 - 3100)
  { id: "market", name: "Amara's Market", x: 1980, color: C.bMarket, dark: C.bMarketD, type: "shop" },
  { id: "plaza", name: "Central Plaza", x: 2400, color: null, dark: null, type: "fountain" },
  { id: "coffee", name: "Desta's Coffee", x: 2800, color: C.bCoffee, dark: C.bCoffeeD, type: "cafe" },
  // FINANCIAL (x: 3500 - 4800)
  { id: "fbank", name: "Savings Bank", x: 3700, color: C.bBank, dark: C.bBankD, type: "classical" },
  { id: "stocks", name: "Stock Exchange", x: 4050, color: C.bStocks, dark: C.bStocksD, type: "glass" },
  { id: "reserve", name: "Elaran Reserve", x: 4500, color: C.bReserve, dark: C.bReserveD, type: "tower" },
];

const PLACES = BUILDINGS;

const NPCS = [
  // Residential
  { id: "jogger", x: 200, color: C.green, label: "Jogger" },
  { id: "halim", x: 1000, color: C.rose, label: "Mr Halim" },
  // Commerce
  { id: "vendor", x: 1900, color: C.purple, label: "Vendor" },
  { id: "yusuf", x: 2150, color: C.coral, label: "Yusuf" },
  { id: "elder", x: 2550, color: C.blue, label: "Older man" },
  { id: "kids", x: 2950, color: C.rose, label: "Students" },
  // Financial
  { id: "trader", x: 3900, color: C.gold, label: "Trader" },
  { id: "protester", x: 4300, color: C.red, label: "Protester" },
];

// ─── QUESTS ─────────────────────────────────────────────────
const QUESTS = {
  // DAY 1 — narrative spine, each quest leads to the next
  q1: { title: "Step outside the flat", desc: "Your neighbour Mr Halim is outside. Press E when you're close enough to talk.", target: "halim_npc", xp: 10, next: "q2" },
  q2: { title: "Go to Amara's Market", desc: "You need groceries. Take the stairs up to the city centre. Then walk to the market with the red awning.", target: "market", xp: 20, next: "q3" },
  q3: { title: "Sort your savings out", desc: "After what you saw at the market, you need to think hard about how much you can actually put aside. Visit the Savings Bank — it's up in the financial district.", target: "fbank", xp: 30, next: "q4" },
  q4: { title: "The trading floor opens at 10", desc: "Stock Exchange — same district, just along the way. Optional but interesting.", target: "stocks", xp: 30, next: "q5" },
  q5: { title: "Head home, it's getting late", desc: "Walk back to your flat. Tomorrow's the big day.", target: "flat", xp: 20, next: "q6" },
  q6: { title: "Sleep on it", desc: "Press the SLEEP button in the flat panel.", target: null, xp: 10, next: "q7" },
  // DAY 2 — work at the Reserve
  q7: { title: "Tuesday morning. Get to the Reserve.", desc: "First day on the job. Walk up to the financial district. The gold tower at the far left.", target: "reserve", xp: 30, next: "q8" },
  q8: { title: "Sit through the briefing & decide", desc: "The committee will share their views. You make the call. Everything you saw yesterday is your evidence.", target: null, xp: 80, next: "q9" },
  q9: { title: "Face the press", desc: "Reporters are waiting outside. You have to say something. Make it count.", target: null, xp: 60, next: "q10" },
  q10: { title: "Walk back and see what you did", desc: "Find Mr Halim, Amara, Yusuf, Desta. Hear how your decision landed in their lives.", target: null, xp: 80, next: null },
};

// ─── STOCK EXCHANGE DATA ────────────────────────────────────
const STOCKS_INIT = [
  { id: "rail", name: "VARENA RAIL", sector: "Infrastructure", price: 84, vol: 0.005, trend: 0, color: C.bBank },
  { id: "tech", name: "KELDRA TECH", sector: "Software", price: 156, vol: 0.022, trend: 0.001, color: C.coral },
  { id: "food", name: "HARBOR FOODS", sector: "Consumer", price: 42, vol: 0.008, trend: 0, color: C.gold },
];

// ─── INITIAL STATE ──────────────────────────────────────────
const initialState = {
  px: 850, target: null, faceDir: -1, moving: false,
  hour: 8, day: 1, dayPhase: "personal",
  sleepAnim: 0, // 0 = none, 1..100 = animation progress // personal | work
  movesToday: 0, gamesPlayed: { bank: false, stocks: false }, npcsMet: 0,
  // Life meters - the emotional spine
  stress: 30, happiness: 60, energy: 80,
  xp: 0, level: 1,
  activeQuest: "q1",
  completedQuests: [],
  notes: [],
  briefingDone: false,
  decisionDone: false,
  meetingActive: false, meetingPhase: "briefing", meetingStep: 0,
  montageActive: false, montageStep: 0,
  pressActive: false, pressStep: 0, pressStatement: null,
  impactReviewed: {},
  wallet: 520,
  inflation: 4.2, interestRate: 3.0, pendingRate: 3.0, publicTrust: 38, guidance: "balanced",
  tradingCash: 500, holdings: {}, stockPrices: { rail: 84, tech: 156, food: 42 }, stockHistory: { rail: [], tech: [], food: [] },
  bankSaved: 0,
  futureYouResult: null, stockGameResult: null,
  phoneOpen: false, phoneTab: "msg",
  yusufReplied: false,
  openPanel: null, mapOpen: false,
  popups: [],
  notifications: [],
  thought: null,
};

// ─── REDUCER ────────────────────────────────────────────────
function reducer(s, a) {
  switch (a.type) {
    case "WALK": {
      const dx = a.dir * 680 * (a.dt || 0.016);
      const nx = Math.max(140, Math.min(WORLD_W - 140, s.px + dx));
      return { ...s, px: nx, faceDir: a.dir, moving: true };
    }
    case "STOP": return { ...s, moving: false, target: null };
    case "WALK_TO": return { ...s, target: a.x };
    case "STEP_TO": {
      if (s.target === null) return s;
      const dx = s.target - s.px;
      if (Math.abs(dx) < 6) return { ...s, px: s.target, target: null, moving: false };
      const dir = dx > 0 ? 1 : -1;
      const step = dir * 680 * (a.dt || 0.016);
      return { ...s, px: s.px + step, faceDir: dir, moving: true };
    }
    case "CHANGE_TIER": return s; // deprecated
    case "SLEEP_ANIM_TICK": return { ...s, sleepAnim: a.progress };
    case "TICK_METERS": {
      const dStress = a.stress || 0, dHappy = a.happy || 0, dEnergy = a.energy || 0;
      return {
        ...s,
        stress: Math.max(0, Math.min(100, s.stress + dStress)),
        happiness: Math.max(0, Math.min(100, s.happiness + dHappy)),
        energy: Math.max(0, Math.min(100, s.energy + dEnergy)),
      };
    }
    case "PUSH_NOTIF": {
      return { ...s, notifications: [{ id: Date.now() + Math.random(), ...a.notif, time: Date.now() }, ...(s.notifications || [])].slice(0, 5) };
    }
    case "DISMISS_NOTIF": return { ...s, notifications: (s.notifications || []).filter((n) => n.id !== a.id) };
    case "OPEN_PANEL": {
      let next = { ...s, openPanel: a.id, mapOpen: false };
      if (a.id === "reserve") {
        if (s.dayPhase !== "work") { next.openPanel = "reserve-locked"; return next; }
        if (!s.briefingDone) { next.meetingActive = true; next.meetingPhase = "briefing"; next.meetingStep = 0; }
      }
      // Auto-advance quest if target matches the place
      const cur = QUESTS[s.activeQuest];
      if (cur?.target === a.id && cur.next) {
        next.completedQuests = [...next.completedQuests, s.activeQuest];
        next.activeQuest = cur.next;
        next.xp = next.xp + (cur.xp || 0);
      }
      return next;
    }
    case "TOGGLE_MAP": return { ...s, mapOpen: !s.mapOpen };
    case "FAST_TRAVEL": return { ...s, px: a.x, target: null, moving: false, mapOpen: false };
    case "ADVANCE_QUEST": {
      // Mark current as complete, advance to next
      const cur = QUESTS[s.activeQuest];
      if (!cur || !cur.next) return s;
      const next = { ...s, completedQuests: [...s.completedQuests, s.activeQuest], activeQuest: cur.next, xp: s.xp + (cur.xp || 0) };
      return addPopup(next, { type: "quest", text: `✓ ${cur.title}`, sub: QUESTS[cur.next].title });
    }
    case "START_SLEEP": return { ...s, sleepAnim: 1, openPanel: null };
    case "SLEEP_TO_DAY_2": {
      let next = { ...s, day: 2, hour: 7, dayPhase: "work", openPanel: null, activeQuest: "q7", completedQuests: [...s.completedQuests, "q6"], xp: s.xp + 50, px: 850, sleepAnim: 0 };
      return addPopup(next, { type: "level", text: "Tuesday morning", sub: "First day at the Reserve" });
    }
    case "LOG_MOVE": {
      let next = { ...s, movesToday: s.movesToday + 1 };
      if (a.kind === "bank") next.gamesPlayed = { ...next.gamesPlayed, bank: true };
      if (a.kind === "stocks") next.gamesPlayed = { ...next.gamesPlayed, stocks: true };
      if (a.kind === "npc") next.npcsMet = s.npcsMet + 1;
      return next;
    }
    case "SAVE_FUTURE_RESULT": return { ...s, futureYouResult: a.result };
    case "SAVE_STOCK_RESULT": return { ...s, stockGameResult: a.result };
    case "CLOSE_PANEL": return { ...s, openPanel: null, meetingActive: false };
    case "MEETING_NEXT": return { ...s, meetingStep: s.meetingStep + 1 };
    case "MEETING_PHASE": return { ...s, meetingPhase: a.phase, meetingStep: 0 };
    case "BRIEFING_END": {
      const next = { ...s, meetingActive: false, briefingDone: true, openPanel: null, activeQuest: "q8", completedQuests: [...s.completedQuests, "q7"], xp: s.xp + 60 };
      return addPopup(next, { type: "quest", text: "✓ Briefing complete", sub: "Time to set the rate" });
    }
    case "DECISION_END": {
      // Now goes to PRESS, not montage
      const next = { ...s, meetingActive: false, decisionDone: true, briefingDone: true, openPanel: null, pressActive: true, pressStep: 0, activeQuest: "q9", completedQuests: [...s.completedQuests, "q8"], xp: s.xp + 80 };
      return next;
    }
    case "PRESS_CHOOSE": return { ...s, pressStatement: a.choice };
    case "PRESS_NEXT": return { ...s, pressStep: s.pressStep + 1 };
    case "PRESS_END": {
      const next = { ...s, pressActive: false, montageActive: true, montageStep: 0 };
      return next;
    }
    case "MONTAGE_NEXT": return { ...s, montageStep: s.montageStep + 1 };
    case "MONTAGE_END": {
      // After montage, advance to impact review quest
      return addPopup({ ...s, montageActive: false, activeQuest: "q10", completedQuests: [...s.completedQuests, "q9"], xp: s.xp + 60 }, { type: "quest", text: "✓ Press done", sub: "Now walk back and see the damage" });
    }
    case "ADD_NOTE": {
      if (s.notes.some((n) => n.from === a.note.from)) return s;
      let next = { ...s, notes: [...s.notes, a.note] };
      next = addPopup(next, { type: "note", text: "📓 Note saved", sub: `${next.notes.length} of 3 gathered` });
      if (next.notes.length >= 3 && s.activeQuest === "q3") {
        next.completedQuests = [...next.completedQuests, "q3"];
        next.activeQuest = "q4";
        next.xp += 80;
        next = addPopup(next, { type: "level", text: "Perspectives gathered", sub: "Head back to the Reserve" });
      }
      return next;
    }
    case "REPLY_YUSUF": {
      const next = { ...s, yusufReplied: true };
      return addPopup(next, { type: "msg", text: "Sent to Yusuf", sub: "" });
    }
    case "SET_RATE": return { ...s, pendingRate: a.rate };
    case "COMMIT_RATE": return { ...s, interestRate: s.pendingRate };
    case "SET_GUIDANCE": return { ...s, guidance: a.guidance };
    case "TOGGLE_PHONE": return { ...s, phoneOpen: !s.phoneOpen };
    case "SET_PHONE_TAB": return { ...s, phoneTab: a.tab };
    case "STOCK_TICK": {
      const newPrices = { ...s.stockPrices };
      const newHist = { ...s.stockHistory };
      for (const stock of STOCKS_INIT) {
        const cur = newPrices[stock.id];
        const noise = (Math.random() - 0.5) * 2 * stock.vol;
        const trend = stock.trend;
        const next = cur * (1 + noise + trend);
        newPrices[stock.id] = Math.max(5, next);
        newHist[stock.id] = [...(newHist[stock.id] || []), next].slice(-30);
      }
      return { ...s, stockPrices: newPrices, stockHistory: newHist };
    }
    case "BUY_STOCK": {
      const price = s.stockPrices[a.id];
      const cost = price * a.qty;
      if (cost > s.tradingCash) return s;
      const h = s.holdings[a.id] || { qty: 0, avg: 0 };
      const newQty = h.qty + a.qty;
      const newAvg = (h.avg * h.qty + cost) / newQty;
      return { ...s, tradingCash: s.tradingCash - cost, holdings: { ...s.holdings, [a.id]: { qty: newQty, avg: newAvg } } };
    }
    case "SELL_STOCK": {
      const h = s.holdings[a.id];
      if (!h || h.qty < a.qty) return s;
      const price = s.stockPrices[a.id];
      const revenue = price * a.qty;
      const newQty = h.qty - a.qty;
      const newH = newQty > 0 ? { qty: newQty, avg: h.avg } : null;
      const next = { ...s, tradingCash: s.tradingCash + revenue, holdings: { ...s.holdings, [a.id]: newH } };
      if (!newH) delete next.holdings[a.id];
      return next;
    }
    case "BANK_DEPOSIT": {
      const amt = Math.min(a.amount, s.wallet);
      let next = { ...s, wallet: s.wallet - amt, bankSaved: s.bankSaved + amt };
      // Saving reduces stress a bit (peace of mind), small energy hit
      next.stress = Math.max(0, next.stress - 6);
      next.happiness = Math.min(100, next.happiness + 3);
      return next;
    }
    case "TALK_NPC": {
      const note = a.note;
      let next = { ...s };
      if (!s.notes.some((n) => n.from === note.from)) {
        next = { ...next, notes: [...s.notes, note], npcsMet: s.npcsMet + 1, movesToday: s.movesToday + 1 };
      }
      next.happiness = Math.min(100, next.happiness + 4);
      next.stress = Math.max(0, next.stress - 2);
      next = addPopup(next, { type: "note", text: "📓 Note saved", sub: `${next.notes.length} perspectives` });
      // Auto-advance quest if target matches
      const cur = QUESTS[s.activeQuest];
      if (cur?.target === `${a.npcId}_npc`) {
        next.completedQuests = [...next.completedQuests, s.activeQuest];
        next.activeQuest = cur.next;
        next.xp = next.xp + (cur.xp || 0);
      }
      // Impact phase: track NPCs reviewed
      if (a.isImpact && a.npcId) {
        next.impactReviewed = { ...next.impactReviewed, [a.npcId]: true };
        const reviewedCount = Object.keys(next.impactReviewed).length;
        // After 3 impact reviews, finish q10
        if (reviewedCount >= 3 && s.activeQuest === "q10") {
          next.completedQuests = [...next.completedQuests, "q10"];
          next.activeQuest = "q10_done";
          next.xp = next.xp + 80;
          next = addPopup(next, { type: "level", text: "✓ Demo complete", sub: "You walked an economy in someone's shoes" });
        }
      }
      return next;
    }
    case "THOUGHT": return { ...s, thought: a.text };
    case "DISMISS_THOUGHT": return { ...s, thought: null };
    case "DISMISS_POPUP": return { ...s, popups: s.popups.filter((p) => p.id !== a.id) };
    case "RESET": return initialState;
    default: return s;
  }
}
function addPopup(s, p) {
  return { ...s, popups: [...s.popups, { ...p, id: Date.now() + Math.random() }] };
}

// ─── HELPERS ────────────────────────────────────────────────
function nearestPlace(px) {
  let best = null, bestD = Infinity;
  for (const p of BUILDINGS) {
    const d = Math.abs(p.x - px);
    if (d < bestD) { bestD = d; best = p; }
  }
  return { place: best, dist: bestD };
}
function nearestNpc(px) {
  let best = null, bestD = Infinity;
  for (const n of NPCS) {
    const d = Math.abs(n.x - px);
    if (d < bestD) { bestD = d; best = n; }
  }
  return { npc: best, dist: bestD };
}
function nearestStair() { return null; } // deprecated

// ─── PLAYER ─────────────────────────────────────────────────
function Player({ x, y, faceDir, moving }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!moving) return;
    let raf;
    const tick = () => { setT(performance.now() / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [moving]);
  const bob = moving ? Math.sin(t * 10) * 1.5 : 0;
  const leg = moving ? Math.sin(t * 10) * 4 : 0;
  const arm = moving ? Math.sin(t * 10) * 3 : 0;
  return (
    <g transform={`translate(${x},${y + bob}) scale(${1.6 * faceDir}, 1.6)`}>
      <ellipse cx="0" cy="20" rx="14" ry="4" fill="#000" opacity="0.25" />
      <rect x={-6 + leg} y="8" width="5" height="12" fill="#6d452a" rx="1" />
      <rect x={1 - leg} y="8" width="5" height="12" fill="#6d452a" rx="1" />
      <path d="M -10 -3 Q -10 -8 -5 -9 L 5 -9 Q 10 -8 10 -3 L 11 10 Q 6 12 0 12 Q -6 12 -11 10 Z" fill={C.coral} />
      <rect x={-11 + arm} y="-3" width="3.5" height="11" fill={C.coral} rx="1" />
      <rect x={7.5 - arm} y="-3" width="3.5" height="11" fill={C.coral} rx="1" />
      <circle cx="0" cy="-15" r="8.5" fill="#e8c8a8" />
      <path d="M -8 -17 Q -7 -23 0 -23 Q 7 -23 8 -17 L 7 -12 Q 4 -14 0 -14 Q -4 -14 -7 -12 Z" fill="#2a1810" />
      <circle cx="-2" cy="-15" r="0.9" fill="#2a1810" />
      <circle cx="2" cy="-15" r="0.9" fill="#2a1810" />
    </g>
  );
}

// ─── BUILDING FACADE ────────────────────────────────────────
function Place({ p, isActive, isQuest, locked }) {
  if (p.type === "fountain") return <Plaza p={p} />;
  const w = 220, h = 280;
  const x = p.x - w / 2;
  const y = GROUND_Y - h;
  return (
    <g>
      {/* Shadow */}
      <ellipse cx={p.x + 6} cy={GROUND_Y + 6} rx={w / 2} ry="12" fill="#000" opacity="0.18" />
      {/* Base body */}
      <rect x={x} y={y + 30} width={w} height={h - 30} fill={p.color} stroke={p.dark} strokeWidth="2" />
      {/* Trim */}
      <rect x={x} y={y + 30} width={w} height="4" fill={p.dark} opacity="0.6" />
      {/* Pediment / roof - varies by type */}
      {p.type === "tower" && (
        <>
          <rect x={x - 6} y={y + 16} width={w + 12} height="14" fill={p.dark} />
          <rect x={x - 8} y={y + 8} width={w + 16} height="8" fill={C.gold} />
          <rect x={x + 100} y={y - 30} width="20" height="38" fill={p.dark} />
          {/* Glass facade */}
          <rect x={x + 14} y={y + 44} width={w - 28} height={h - 90} fill={C.bReserveD} opacity="0.3" />
          {/* Floor lines */}
          {[60, 90, 120, 150, 180, 210, 240].map((dy) => (
            <line key={dy} x1={x + 14} y1={y + dy} x2={x + w - 14} y2={y + dy} stroke={p.dark} strokeWidth="1.5" opacity="0.6" />
          ))}
          {/* Vertical mullions */}
          {[1, 2, 3, 4].map((i) => (
            <line key={i} x1={x + 14 + (w - 28) / 5 * i} y1={y + 44} x2={x + 14 + (w - 28) / 5 * i} y2={y + h - 46} stroke={p.dark} strokeWidth="1.2" opacity="0.5" />
          ))}
          {/* Sign */}
          <rect x={x + w / 2 - 50} y={y + h - 40} width="100" height="20" fill={C.gold} />
          <text x={x + w / 2} y={y + h - 26} textAnchor="middle" fill={C.ink} fontFamily={FONT_M} fontSize="10" fontWeight="700" letterSpacing="0.2em">RESERVE</text>
        </>
      )}
      {p.type === "glass" && (
        <>
          {/* Modern flat roof */}
          <rect x={x - 4} y={y + 20} width={w + 8} height="14" fill={p.dark} />
          {/* Bold ticker band */}
          <rect x={x} y={y + 36} width={w} height="22" fill={C.ink} />
          <text x={x + w / 2} y={y + 52} textAnchor="middle" fill={C.green} fontFamily={FONT_M} fontSize="11" fontWeight="700" letterSpacing="0.1em">▲ ELR +1.42%</text>
          {/* Glass facade with grid */}
          <rect x={x + 12} y={y + 64} width={w - 24} height={h - 110} fill="#cfe2f7" stroke={p.dark} strokeWidth="1.5" />
          {[0, 1, 2, 3, 4].map((row) => [0, 1, 2, 3].map((col) => (
            <rect key={`${row}-${col}`} x={x + 18 + col * ((w - 36) / 4)} y={y + 72 + row * ((h - 130) / 5)} width={(w - 36) / 4 - 4} height={(h - 130) / 5 - 4} fill="none" stroke={p.dark} strokeWidth="0.8" opacity="0.4" />
          )))}
          {/* Sign */}
          <rect x={x + w / 2 - 60} y={y + h - 36} width="120" height="20" fill="#fff" stroke={p.dark} strokeWidth="1" />
          <text x={x + w / 2} y={y + h - 22} textAnchor="middle" fill={p.dark} fontFamily={FONT_M} fontSize="9" fontWeight="700" letterSpacing="0.18em">STOCK EXCHANGE</text>
        </>
      )}
      {p.type === "classical" && (
        <>
          {/* Pediment */}
          <polygon points={`${x - 6},${y + 36} ${p.x},${y - 2} ${x + w + 6},${y + 36}`} fill={p.dark} stroke={p.dark} strokeWidth="2" />
          {/* Columns */}
          {[0.15, 0.35, 0.55, 0.75].map((f, i) => (
            <g key={i}>
              <rect x={x + w * f - 8} y={y + 50} width="16" height={h - 80} fill="#fff" stroke={p.dark} strokeWidth="1" />
              <rect x={x + w * f - 11} y={y + 44} width="22" height="8" fill="#fff" stroke={p.dark} strokeWidth="1" />
              <rect x={x + w * f - 11} y={y + h - 38} width="22" height="8" fill="#fff" stroke={p.dark} strokeWidth="1" />
            </g>
          ))}
          {/* Pediment text */}
          <text x={p.x} y={y + 18} textAnchor="middle" fill="#fff" fontFamily={FONT_D} fontSize="14" fontStyle="italic" fontWeight="600">Bank</text>
          {/* Coin emblem */}
          <circle cx={p.x} cy={y + h - 60} r="18" fill={C.gold} stroke={p.dark} strokeWidth="2" />
          <text x={p.x} y={y + h - 54} textAnchor="middle" fill={p.dark} fontFamily={FONT_D} fontSize="18" fontWeight="700">₺</text>
        </>
      )}
      {p.type === "shop" && (
        <>
          {/* Pitched roof */}
          <polygon points={`${x - 8},${y + 36} ${p.x},${y - 6} ${x + w + 8},${y + 36}`} fill={p.dark} stroke={p.dark} strokeWidth="2" />
          {/* Chimney */}
          <rect x={x + 40} y={y - 2} width="16" height="22" fill={p.dark} />
          {/* Striped awning */}
          <path d={`M ${x - 4} ${y + 36} L ${x + w + 4} ${y + 36} L ${x + w - 8} ${y + 52} L ${x + 8} ${y + 52} Z`} fill={C.coral} stroke={p.dark} strokeWidth="1.5" />
          {[0.2, 0.4, 0.6, 0.8].map((f) => (
            <rect key={f} x={x + w * f - 12} y={y + 36} width="24" height="16" fill="#fff" opacity="0.35" />
          ))}
          {/* Windows */}
          <rect x={x + 22} y={y + 70} width="56" height="62" fill="#fff" stroke={p.dark} strokeWidth="1.5" />
          <line x1={x + 50} y1={y + 70} x2={x + 50} y2={y + 132} stroke={p.dark} strokeWidth="1" />
          <line x1={x + 22} y1={y + 100} x2={x + 78} y2={y + 100} stroke={p.dark} strokeWidth="1" />
          <rect x={x + w - 78} y={y + 70} width="56" height="62" fill="#fff" stroke={p.dark} strokeWidth="1.5" />
          {/* Produce baskets at front */}
          <rect x={x + 12} y={y + 230} width="36" height="30" fill={p.dark} />
          {[20, 30, 40].map((cx, i) => <circle key={i} cx={x + 14 + cx} cy={y + 230} r="6" fill={[C.coral, C.gold, C.green][i]} />)}
          <rect x={x + 172} y={y + 230} width="36" height="30" fill={p.dark} />
          {[20, 30, 40].map((cx, i) => <circle key={i} cx={x + 174 + cx} cy={y + 230} r="6" fill={[C.gold, C.coral, C.purple][i]} />)}
          {/* Door */}
          <rect x={x + w / 2 - 22} y={y + 160} width="44" height="100" fill={p.dark} />
          <rect x={x + w / 2 - 18} y={y + 164} width="36" height="96" fill={C.gold} opacity="0.4" />
          {/* Sign */}
          <rect x={x + w / 2 - 50} y={y + 140} width="100" height="16" fill="#fff" stroke={p.dark} strokeWidth="1" />
          <text x={x + w / 2} y={y + 152} textAnchor="middle" fill={p.dark} fontFamily={FONT_D} fontSize="11" fontStyle="italic" fontWeight="600">AMARA'S</text>
        </>
      )}
      {p.type === "cafe" && (
        <>
          {/* Roof */}
          <polygon points={`${x - 6},${y + 36} ${p.x},${y - 4} ${x + w + 6},${y + 36}`} fill={p.dark} stroke={p.dark} strokeWidth="2" />
          {/* Chimney with smoke */}
          <rect x={x + w - 50} y={y - 6} width="16" height="22" fill={p.dark} />
          <g>
            <circle cx={x + w - 42} cy={y - 10} r="6" fill="#bbb" opacity="0.4">
              <animateTransform attributeName="transform" type="translate" values="0,0; -12,-30; -28,-60" dur="6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0.25;0" dur="6s" repeatCount="indefinite" />
            </circle>
          </g>
          {/* Big front window */}
          <rect x={x + 20} y={y + 60} width={w - 40} height="100" fill="#f4a060" stroke={p.dark} strokeWidth="1.5" opacity="0.7" />
          <line x1={p.x} y1={y + 60} x2={p.x} y2={y + 160} stroke={p.dark} strokeWidth="1.5" />
          <line x1={x + 20} y1={y + 100} x2={x + w - 20} y2={y + 100} stroke={p.dark} strokeWidth="1" />
          {/* Striped awning */}
          <path d={`M ${x - 4} ${y + 56} L ${x + w + 4} ${y + 56} L ${x + w - 8} ${y + 70} L ${x + 8} ${y + 70} Z`} fill={C.coral} />
          {/* Door */}
          <rect x={x + w / 2 - 22} y={y + 170} width="44" height="90" fill={p.dark} />
          <rect x={x + w / 2 - 18} y={y + 174} width="36" height="86" fill={C.gold} opacity="0.5" />
          {/* Sign */}
          <text x={p.x} y={y + h - 8} textAnchor="middle" fill={C.gold} fontFamily={FONT_D} fontSize="16" fontStyle="italic" fontWeight="600">Desta's</text>
        </>
      )}
      {p.type === "deco" && (
        <>
          {/* Art deco crown */}
          <rect x={x - 6} y={y + 14} width={w + 12} height="20" fill={p.dark} />
          <rect x={x - 4} y={y + 6} width={w + 8} height="10" fill={p.color} />
          <rect x={x - 2} y={y - 4} width={w + 4} height="12" fill={p.dark} />
          {/* Marquee lights */}
          {[0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.94].map((f, i) => (
            <circle key={i} cx={x + w * f} cy={y + 24} r="3" fill={C.goldBright}>
              <animate attributeName="opacity" values="1;0.3;1" dur={`${1.2 + i * 0.15}s`} repeatCount="indefinite" />
            </circle>
          ))}
          {/* Marquee panel */}
          <rect x={x + 16} y={y + 52} width={w - 32} height="60" fill="#1a0a08" stroke={p.dark} strokeWidth="1.5" />
          <text x={p.x} y={y + 74} textAnchor="middle" fill={C.goldBright} fontFamily={FONT_D} fontSize="10" letterSpacing="0.2em" fontWeight="600">NOW SHOWING</text>
          <text x={p.x} y={y + 96} textAnchor="middle" fill={C.gold} fontFamily={FONT_D} fontSize="14" fontStyle="italic">"The Keldra Letters"</text>
          {/* Entrance */}
          <rect x={x + w / 2 - 36} y={y + 130} width="72" height="130" fill={p.dark} />
          <rect x={x + w / 2 - 32} y={y + 134} width="64" height="126" fill="#3a1018" />
          <text x={p.x} y={y + h - 8} textAnchor="middle" fill={C.gold} fontFamily={FONT_D} fontSize="16" fontStyle="italic" fontWeight="600">CINEMA</text>
        </>
      )}
      {p.type === "home" && (
        <>
          {/* Pitched roof */}
          <polygon points={`${x - 6},${y + 36} ${p.x},${y - 6} ${x + w + 6},${y + 36}`} fill={p.dark} stroke={p.dark} strokeWidth="2" />
          {/* Dormer */}
          <rect x={p.x - 14} y={y + 6} width="28" height="28" fill="#fff" stroke={p.dark} strokeWidth="1.5" />
          <rect x={p.x - 14} y={y + 6} width="28" height="4" fill={p.dark} />
          {/* Windows */}
          <rect x={x + 22} y={y + 70} width="40" height="50" fill="#fff" stroke={p.dark} strokeWidth="1.5" />
          <line x1={x + 42} y1={y + 70} x2={x + 42} y2={y + 120} stroke={p.dark} strokeWidth="1" />
          <line x1={x + 22} y1={y + 95} x2={x + 62} y2={y + 95} stroke={p.dark} strokeWidth="1" />
          <rect x={x + w - 62} y={y + 70} width="40" height="50" fill="#fff" stroke={p.dark} strokeWidth="1.5" />
          {/* Flower box */}
          <rect x={x + 22} y={y + 124} width="40" height="8" fill={C.bMarketD} />
          <circle cx={x + 30} cy={y + 122} r="3" fill={C.coral} />
          <circle cx={x + 40} cy={y + 124} r="3" fill={C.rose} />
          <circle cx={x + 52} cy={y + 122} r="3" fill={C.gold} />
          {/* Door */}
          <rect x={x + w / 2 - 22} y={y + 160} width="44" height="100" fill={p.dark} />
          <rect x={x + w / 2 - 18} y={y + 164} width="36" height="96" fill="#a85e48" />
          <circle cx={x + w / 2 + 10} cy={y + 210} r="2" fill={C.gold} />
        </>
      )}

      {/* Quest arrow */}
      {isQuest && (
        <g>
          <polygon points={`${p.x - 18},${y - 50} ${p.x + 18},${y - 50} ${p.x},${y - 22}`} fill={C.coral} stroke={C.ink} strokeWidth="2">
            <animateTransform attributeName="transform" type="translate" values="0,-4;0,4;0,-4" dur="1.2s" repeatCount="indefinite" />
          </polygon>
          <text x={p.x} y={y - 58} textAnchor="middle" fill={C.coral} fontFamily={FONT_M} fontSize="10" letterSpacing="0.18em" fontWeight="700">GO HERE</text>
        </g>
      )}

      {/* Active indicator */}
      {isActive && !isQuest && (
        <g>
          <rect x={p.x - 56} y={y - 36} width="112" height="22" fill={C.ink} rx="3" />
          <text x={p.x} y={y - 21} textAnchor="middle" fill={C.gold} fontFamily={FONT_M} fontSize="9" letterSpacing="0.2em" fontWeight="700">PRESS E TO ENTER</text>
        </g>
      )}

      {/* Locked indicator for Reserve on Day 1 */}
      {p.id === "reserve" && locked && (
        <g>
          <rect x={p.x - 60} y={y - 36} width="120" height="22" fill={C.ink} rx="3" opacity="0.85" />
          <text x={p.x} y={y - 21} textAnchor="middle" fill={C.textMuted} fontFamily={FONT_M} fontSize="9" letterSpacing="0.18em" fontWeight="700">🔒 OPENS TUESDAY</text>
        </g>
      )}
    </g>
  );
}

function Plaza({ p }) {
  return (
    <g>
      {/* Plaza floor (round area) */}
      <ellipse cx={p.x} cy={GROUND_Y + 12} rx="100" ry="20" fill={C.streetDark} opacity="0.5" />
      {/* Fountain */}
      <circle cx={p.x} cy={GROUND_Y - 40} r="40" fill={C.streetDark} />
      <circle cx={p.x} cy={GROUND_Y - 40} r="36" fill={C.pavement} />
      <circle cx={p.x} cy={GROUND_Y - 40} r="22" fill="#7ba4b8" />
      <circle cx={p.x} cy={GROUND_Y - 40} r="14" fill="none" stroke="#7ba4b8" strokeWidth="1.5">
        <animate attributeName="r" values="14;22;14" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0;0.7" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx={p.x} cy={GROUND_Y - 40} r="4" fill={C.gold} />
      {/* Benches */}
      <g transform={`translate(${p.x - 90}, ${GROUND_Y - 12})`}>
        <rect width="40" height="6" fill="#8a5e3e" rx="1" />
        <rect x="2" y="6" width="4" height="10" fill="#6d452a" />
        <rect x="34" y="6" width="4" height="10" fill="#6d452a" />
      </g>
      <g transform={`translate(${p.x + 50}, ${GROUND_Y - 12})`}>
        <rect width="40" height="6" fill="#8a5e3e" rx="1" />
        <rect x="2" y="6" width="4" height="10" fill="#6d452a" />
        <rect x="34" y="6" width="4" height="10" fill="#6d452a" />
      </g>
      {/* Tree */}
      <g transform={`translate(${p.x - 130}, ${GROUND_Y - 40})`}>
        <rect x="-3" y="0" width="6" height="20" fill="#6d452a" />
        <circle cx="0" cy="-6" r="22" fill="#3d5a3a" />
        <circle cx="-6" cy="-12" r="14" fill={C.grass} />
        <circle cx="6" cy="-8" r="16" fill="#7d9b66" />
      </g>
    </g>
  );
}

// ─── NPC ────────────────────────────────────────────────────
function NpcSprite({ npc, isActive }) {
  return (
    <g transform={`translate(${npc.x}, ${GROUND_Y - 38})`}>
      <ellipse cx="0" cy="38" rx="12" ry="3" fill="#000" opacity="0.2" />
      <rect x="-7" y="-2" width="14" height="20" rx="2" fill={npc.color} />
      <circle cx="0" cy="-12" r="8" fill="#e8c8a8" />
      <path d="M -7 -16 Q -6 -22 0 -22 Q 6 -22 7 -16 L 6 -10 Q 3 -12 0 -12 Q -3 -12 -6 -10 Z" fill="#2a1810" />
      <circle cx="-2" cy="-12" r="0.8" fill="#2a1810" />
      <circle cx="2" cy="-12" r="0.8" fill="#2a1810" />
      {isActive && (
        <g>
          <rect x="-60" y="-50" width="120" height="22" fill={C.ink} rx="3" />
          <text x="0" y="-35" textAnchor="middle" fill={C.gold} fontFamily={FONT_M} fontSize="9" letterSpacing="0.16em" fontWeight="700">PRESS E TO TALK</text>
        </g>
      )}
    </g>
  );
}

// ─── STREET SCENE ───────────────────────────────────────────
function StreetScene({ state, dispatch, nearestThing }) {
  const VW = 1500;
  const VH = 720;
  const playerY = groundY(state.px);
  // Camera follows player in 2D, clamped to world bounds
  const camX = Math.max(0, Math.min(WORLD_W - VW, state.px - VW / 2));
  const camY = Math.max(0, Math.min(WORLD_H - VH, playerY - VH * 0.6));
  const quest = QUESTS[state.activeQuest];
  const arrowTargetPlace = quest?.target ? BUILDINGS.find((p) => p.id === quest.target) : null;
  const arrowTargetNpc = quest?.target?.endsWith?.("_npc") ? NPCS.find((n) => n.id === quest.target.replace("_npc", "")) : null;

  // Sleep animation: dim sky based on state.sleepAnim (0-100)
  const sleepProg = state.sleepAnim / 100;
  const nightAmount = Math.sin(sleepProg * Math.PI); // 0 → 1 → 0

  // Build ground path SVG path string
  const groundPathPoints = [];
  for (let x = 0; x <= WORLD_W; x += 30) {
    groundPathPoints.push(`${x},${groundY(x)}`);
  }
  const groundLineD = "M " + groundPathPoints.join(" L ");
  const groundFillD = `M 0,${WORLD_H} L 0,${groundY(0)} L ${groundPathPoints.join(" L ")} L ${WORLD_W},${WORLD_H} Z`;

  return (
    <svg viewBox={`${camX} ${camY} ${VW} ${VH}`} preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={state.dayPhase === "work" ? "#5a3470" : "#0f0820"} />
          <stop offset="25%" stopColor={state.dayPhase === "work" ? "#a04880" : "#2a1438"} />
          <stop offset="55%" stopColor={state.dayPhase === "work" ? "#ff8e6e" : "#5a2c5a"} />
          <stop offset="85%" stopColor={state.dayPhase === "work" ? "#ffce8e" : "#a04060"} />
          <stop offset="100%" stopColor={state.dayPhase === "work" ? "#ffce8e" : "#ff8e6e"} />
        </linearGradient>
        <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#040114" />
          <stop offset="50%" stopColor="#0a061f" />
          <stop offset="100%" stopColor="#1a0a2e" />
        </linearGradient>
        <pattern id="cobble" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
          <rect width="40" height="20" fill={C.street} />
          <ellipse cx="10" cy="10" rx="9" ry="6" fill={C.streetDark} opacity="0.5" />
          <ellipse cx="28" cy="14" rx="8" ry="5" fill={C.pavement} opacity="0.6" />
        </pattern>
        <pattern id="hillside" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <rect width="80" height="80" fill="#2a1438" />
          <circle cx="20" cy="30" r="3" fill="#3a1f50" />
          <circle cx="55" cy="60" r="4" fill="#3a1f50" />
          <circle cx="70" cy="15" r="2.5" fill="#3a1f50" />
        </pattern>
      </defs>

      {/* Day sky */}
      <rect x="0" y="0" width={WORLD_W} height={WORLD_H} fill="url(#sky)" />
      {/* Night sky overlay (for sleep anim) */}
      {nightAmount > 0 && (
        <rect x="0" y="0" width={WORLD_W} height={WORLD_H} fill="url(#nightSky)" opacity={nightAmount} />
      )}

      {/* Stars (visible during night) */}
      {nightAmount > 0.4 && Array.from({ length: 60 }).map((_, i) => {
        const sx = ((i * 197) % WORLD_W);
        const sy = 30 + ((i * 71) % 280);
        return <circle key={i} cx={sx} cy={sy} r={0.8 + (i % 3) * 0.4} fill="#fff5d8" opacity={nightAmount * (0.4 + (i % 5) * 0.12)} />;
      })}

      {/* Moon (during night) and Sun (during day) */}
      {nightAmount > 0.3 ? (
        <g opacity={nightAmount}>
          <circle cx={camX + VW * 0.7} cy={120 - nightAmount * 30} r="44" fill="#fff5d8" />
          <circle cx={camX + VW * 0.7} cy={120 - nightAmount * 30} r="70" fill="#fff5d8" opacity="0.18" />
          <circle cx={camX + VW * 0.7 + 12} cy={108 - nightAmount * 30} r="6" fill="#e8d8b8" opacity="0.5" />
          <circle cx={camX + VW * 0.7 - 8} cy={132 - nightAmount * 30} r="4" fill="#e8d8b8" opacity="0.5" />
        </g>
      ) : (
        <g opacity={1 - nightAmount}>
          <circle cx={camX + VW * 0.18} cy={150 + (state.dayPhase === "work" ? 0 : 30)} r="40" fill="#fff5d8" opacity={state.dayPhase === "work" ? 1 : 0.85} />
          <circle cx={camX + VW * 0.18} cy={150 + (state.dayPhase === "work" ? 0 : 30)} r="70" fill="#fff5d8" opacity="0.2" />
        </g>
      )}

      {/* Distant mountain silhouette (parallax) */}
      <g transform={`translate(${camX * 0.3}, 0)`} opacity={1 - nightAmount * 0.5}>
        <path d="M 0 380 L 200 280 L 350 340 L 500 220 L 700 320 L 900 240 L 1100 310 L 1300 200 L 1500 280 L 1700 250 L 1900 310 L 2100 220 L 2300 290 L 1900 400 L 0 420 Z" fill="#1a0a2e" opacity="0.7" />
        <path d="M 0 460 L 180 380 L 380 430 L 580 360 L 800 430 L 1000 380 L 1200 440 L 1400 370 L 1600 420 L 1800 380 L 2000 430 L 2200 360 L 2400 420 L 2400 600 L 0 600 Z" fill="#241845" opacity="0.85" />
      </g>

      {/* Hillside fill below ground */}
      <path d={groundFillD} fill="url(#hillside)" />
      {/* Cobble strip - thick stroke along the curve */}
      <path d={groundLineD} stroke="url(#cobble)" strokeWidth="120" fill="none" strokeLinecap="butt" opacity="0.85" />
      {/* Ground top edge */}
      <path d={groundLineD} stroke={C.streetDark} strokeWidth="6" fill="none" />

      {/* Area labels graffitied on the path */}
      <text x="600" y={groundY(600) - 14} fontFamily={FONT_M} fontSize="10" fill={C.gold} letterSpacing="0.3em" fontWeight="700" opacity="0.4">— RIVERSIDE —</text>
      <text x="2300" y={groundY(2300) - 14} fontFamily={FONT_M} fontSize="10" fill={C.gold} letterSpacing="0.3em" fontWeight="700" opacity="0.4">— CITY CENTRE —</text>
      <text x="4000" y={groundY(4000) - 14} fontFamily={FONT_M} fontSize="10" fill={C.gold} letterSpacing="0.3em" fontWeight="700" opacity="0.4">— FINANCIAL DISTRICT —</text>

      {/* Lamp posts along the curve */}
      {Array.from({ length: Math.ceil(WORLD_W / 350) }).map((_, i) => {
        const lx = 180 + i * 350;
        if (lx > WORLD_W - 100) return null;
        const ly = groundY(lx);
        const lampOn = nightAmount > 0.3 || state.dayPhase !== "work";
        return (
          <g key={i} transform={`translate(${lx}, ${ly})`}>
            <rect x="-2" y="-90" width="4" height="90" fill="#1a0a06" />
            <rect x="-12" y="-106" width="24" height="6" fill="#1a0a06" />
            <circle cx="0" cy="-106" r="8" fill={C.goldBright} opacity={lampOn ? 0.95 : 0.4} />
            <circle cx="0" cy="-106" r="5" fill="#fff5d8" opacity={lampOn ? 1 : 0.5} />
            {lampOn && nightAmount > 0.4 && (
              <circle cx="0" cy="-106" r="40" fill={C.goldBright} opacity={nightAmount * 0.18} />
            )}
          </g>
        );
      })}

      {/* All buildings sit on the curve */}
      {BUILDINGS.map((p) => (
        <PlaceAtCurve key={p.id} p={p} isActive={nearestThing.kind === "place" && nearestThing.id === p.id} isQuest={arrowTargetPlace?.id === p.id} locked={p.id === "reserve" && state.dayPhase !== "work"} />
      ))}

      {/* All NPCs on the curve */}
      {NPCS.map((n) => (
        <NpcSpriteAtCurve key={n.id} npc={n} isActive={nearestThing.kind === "npc" && nearestThing.id === n.id} isQuest={arrowTargetNpc?.id === n.id} />
      ))}

      {/* Player */}
      <Player x={state.px} y={playerY - 24} faceDir={state.faceDir} moving={state.moving} />
    </svg>
  );
}

// Buildings sit on the ground curve
function PlaceAtCurve({ p, isActive, isQuest, locked }) {
  const y = groundY(p.x);
  return <g transform={`translate(0, ${y - GROUND_Y})`}><Place p={p} isActive={isActive} isQuest={isQuest} locked={locked} /></g>;
}

function NpcSpriteAtCurve({ npc, isActive, isQuest }) {
  const y = groundY(npc.x);
  return (
    <g transform={`translate(0, ${y - GROUND_Y})`}>
      <NpcSprite npc={npc} isActive={isActive} />
      {isQuest && (
        <g transform={`translate(${npc.x}, ${GROUND_Y - 110})`}>
          <polygon points="0,18 -10,0 10,0" fill={C.coral}>
            <animateTransform attributeName="transform" type="translate" values="0,-4;0,4;0,-4" dur="1s" repeatCount="indefinite" />
          </polygon>
          <circle cx="0" cy="-8" r="12" fill={C.coral} opacity="0.3">
            <animate attributeName="r" values="10;16;10" dur="1.4s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </g>
  );
}

// ─── TREASURE MAP (full-screen, illustrated, 3 zones) ──────
function TreasureMap({ state, dispatch }) {
  const W = 900, H = 620;
  // Zone display rows: work top, city middle, home bottom
  const ZONE_ROWS = {
    work: { y: 140, label: "FINANCIAL DISTRICT", note: "rates, trades" },
    city: { y: 320, label: "CITY CENTRE", note: "shops, plaza, bank" },
    home: { y: 500, label: "RESIDENTIAL", note: "home, park, cinema" },
  };

  return (
    <div onClick={() => dispatch({ type: "TOGGLE_MAP" })} style={{ position: "absolute", inset: 0, background: "rgba(10,5,20,0.85)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(10px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: W, width: "100%" }}>
        <button onClick={() => dispatch({ type: "TOGGLE_MAP" })} style={{ position: "absolute", top: -10, right: -10, background: C.coral, color: "#fff", border: `3px solid ${C.surface}`, width: 44, height: 44, borderRadius: "50%", cursor: "pointer", fontSize: 22, fontFamily: FONT_M, fontWeight: 700, zIndex: 5, boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }}>×</button>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", filter: "drop-shadow(0 24px 60px rgba(0,0,0,0.5))" }}>
          <defs>
            <radialGradient id="paper" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="#fff5d8" />
              <stop offset="60%" stopColor="#f0deb4" />
              <stop offset="100%" stopColor="#c4a070" />
            </radialGradient>
          </defs>

          {/* Paper background */}
          <path d="M 20 14 L 30 8 L 60 14 L 100 6 L 160 12 L 220 8 L 290 14 L 360 6 L 440 12 L 520 8 L 600 14 L 680 6 L 760 12 L 820 8 L 860 14 L 880 30 L 884 80 L 878 160 L 884 240 L 880 320 L 884 400 L 880 480 L 884 540 L 880 580 L 870 600 L 820 608 L 750 602 L 660 608 L 560 602 L 460 608 L 360 602 L 260 608 L 180 602 L 100 608 L 50 602 L 28 590 L 20 540 L 14 440 L 20 340 L 14 240 L 20 140 L 14 50 Z" fill="url(#paper)" stroke="#6a4828" strokeWidth="2" />

          {/* Coffee stain */}
          <ellipse cx="780" cy="80" rx="35" ry="28" fill="#a86b3a" opacity="0.15" />

          {/* Title cartouche */}
          <g transform="translate(450, 60)">
            <rect x="-180" y="-30" width="360" height="56" fill="#fff5d8" stroke="#6a4828" strokeWidth="2" rx="4" />
            <text x="0" y="-4" textAnchor="middle" fontFamily={FONT_H} fontSize="30" fontWeight="700" fill="#2a1438">Varena</text>
            <text x="0" y="16" textAnchor="middle" fontFamily={FONT_M} fontSize="8" fontWeight="700" fill="#6a4828" letterSpacing="0.3em">3 DISTRICTS · CHOOSE YOUR PATH</text>
          </g>

          {/* Tier separators */}
          {Object.entries(ZONE_ROWS).map(([zid, zr]) => {
            const tierLabel = zid === "work" ? "FINANCIAL DISTRICT" : zid === "city" ? "CITY CENTRE" : "RESIDENTIAL";
            // Player is in this tier if their x falls in the building cluster
            const inThis = (zid === "work" && state.px >= 3500) || (zid === "city" && state.px >= 1800 && state.px < 3500) || (zid === "home" && state.px < 1800);
            return (
              <g key={zid}>
                <path d={`M 70 ${zr.y} Q 250 ${zr.y - 10} 450 ${zr.y} Q 650 ${zr.y + 10} 830 ${zr.y}`} fill="none" stroke="#6a4828" strokeWidth="3" strokeDasharray="3,5" strokeLinecap="round" />
                <text x="70" y={zr.y - 56} fontFamily={FONT_H} fontSize="22" fill={inThis ? "#cc1d2a" : "#2a1438"} fontWeight="700">{tierLabel.toLowerCase()}</text>
                <text x="70" y={zr.y - 38} fontFamily={FONT_H} fontSize="14" fill="#6a4828" fontStyle="italic">{zr.note}</text>
                {inThis && <text x="225" y={zr.y - 56} fontFamily={FONT_H} fontSize="16" fill="#cc1d2a">← you're here</text>}
              </g>
            );
          })}

          {/* Hillside connecting line */}
          <g>
            <path d="M 780 170 L 770 200 L 780 230 L 770 260 L 780 290 L 770 320" fill="none" stroke="#6a4828" strokeWidth="2" />
            <text x="800" y="245" fontFamily={FONT_H} fontSize="13" fill="#6a4828" fontStyle="italic">hill path</text>
            <path d="M 130 350 L 120 380 L 130 410 L 120 440 L 130 470 L 120 500" fill="none" stroke="#6a4828" strokeWidth="2" />
            <text x="60" y="425" fontFamily={FONT_H} fontSize="13" fill="#6a4828" fontStyle="italic">hill path</text>
          </g>

          {/* Landmarks — assign each building to a row based on x */}
          {(() => {
            return BUILDINGS.map((p) => {
              const zid = p.x >= 3500 ? "work" : p.x >= 1800 ? "city" : "home";
              const row = ZONE_ROWS[zid];
              const startX = 150, endX = 750;
              const span = endX - startX;
              // Normalize x within tier range so they spread along the row
              const tierStart = zid === "work" ? 3500 : zid === "city" ? 1800 : 0;
              const tierEnd = zid === "work" ? WORLD_W : zid === "city" ? 3100 : 1400;
              const px = startX + ((p.x - tierStart) / (tierEnd - tierStart)) * span;
              const locked = p.id === "reserve" && state.dayPhase !== "work";
              const isQuest = QUESTS[state.activeQuest]?.target === p.id;
              const types = { tower: "tower", glass: "modern", classical: "classical", shop: "shop", cafe: "cafe", deco: "deco", home: "home", fountain: "plaza" };
              const type = types[p.type] || "shop";
              return (
                <g key={p.id} style={{ cursor: locked ? "not-allowed" : "pointer" }} onClick={() => !locked && dispatch({ type: "FAST_TRAVEL", x: p.x })}>
                  {isQuest && (
                    <circle cx={px} cy={row.y} r="26" fill="#ff4757" opacity="0.25">
                      <animate attributeName="r" values="22;32;22" dur="1.4s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <MapLandmark x={px} y={row.y} type={type} color={p.color || "#6a4828"} dark={p.dark || "#3a2418"} locked={locked} />
                  <g transform={`translate(${px}, ${row.y + 36})`}>
                    <rect x="-58" y="-2" width="116" height="18" fill="#fff5d8" opacity="0.9" rx="2" />
                    <text x="0" y="12" textAnchor="middle" fontFamily={FONT_H} fontSize="14" fontWeight="700" fill={locked ? "#8a7060" : "#2a1438"}>{locked ? "🔒 " : ""}{p.name}</text>
                  </g>
                </g>
              );
            });
          })()}

          {/* Player position marker */}
          {(() => {
            const zid = state.px >= 3500 ? "work" : state.px >= 1800 ? "city" : "home";
            const row = ZONE_ROWS[zid];
            const startX = 150, endX = 750;
            const tierStart = zid === "work" ? 3500 : zid === "city" ? 1800 : 0;
            const tierEnd = zid === "work" ? WORLD_W : zid === "city" ? 3100 : 1400;
            const px = startX + ((state.px - tierStart) / (tierEnd - tierStart)) * (endX - startX);
            return (
              <g transform={`translate(${px}, ${row.y - 24})`}>
                <circle r="11" fill="#ff4757" stroke="#fff5d8" strokeWidth="2">
                  <animate attributeName="r" values="9;14;9" dur="1.2s" repeatCount="indefinite" />
                </circle>
                <text x="0" y="-18" textAnchor="middle" fontFamily={FONT_H} fontSize="14" fontWeight="700" fill="#cc1d2a">you</text>
              </g>
            );
          })()}

          {/* Legend */}
          <g transform="translate(50, 560)">
            <rect width="200" height="48" fill="#fff5d8" stroke="#6a4828" strokeWidth="1.5" rx="3" />
            <text x="10" y="20" fontFamily={FONT_H} fontSize="14" fontWeight="700" fill="#2a1438">tap any place to travel</text>
            <text x="10" y="38" fontFamily={FONT_H} fontSize="13" fill="#3a2418">use stairs to change district</text>
          </g>

          {/* Compass mini */}
          <g transform="translate(800, 575)">
            <circle r="22" fill="#fff5d8" stroke="#6a4828" strokeWidth="1.5" />
            <polygon points="0,-20 4,0 0,20 -4,0" fill="#6a4828" />
            <polygon points="-20,0 0,-4 20,0 0,4" fill="#a86b3a" />
            <text x="0" y="-24" textAnchor="middle" fontFamily={FONT_D} fontSize="10" fontWeight="800" fill="#2a1438">N</text>
          </g>
        </svg>
      </div>
    </div>
  );
}
function MapLandmark({ x, y, type, color, dark, locked }) {
  const c = locked ? "#a89878" : color;
  const d = locked ? "#6a5848" : dark;
  if (type === "tower") return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-12" y="-30" width="24" height="34" fill={c} stroke={d} strokeWidth="1.5" />
      <polygon points="-12,-30 0,-44 12,-30" fill={d} />
      <rect x="-2" y="-50" width="4" height="8" fill={d} />
      <rect x="-8" y="-22" width="3" height="5" fill={d} opacity="0.5" />
      <rect x="-2" y="-22" width="3" height="5" fill={d} opacity="0.5" />
      <rect x="5" y="-22" width="3" height="5" fill={d} opacity="0.5" />
      <rect x="-8" y="-12" width="3" height="5" fill={d} opacity="0.5" />
      <rect x="5" y="-12" width="3" height="5" fill={d} opacity="0.5" />
    </g>
  );
  if (type === "modern") return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-13" y="-26" width="26" height="30" fill={c} stroke={d} strokeWidth="1.5" />
      <rect x="-10" y="-22" width="6" height="6" fill="#fff5d8" opacity="0.7" />
      <rect x="-2" y="-22" width="6" height="6" fill="#fff5d8" opacity="0.7" />
      <rect x="6" y="-22" width="6" height="6" fill="#fff5d8" opacity="0.7" />
      <rect x="-10" y="-12" width="6" height="6" fill="#fff5d8" opacity="0.7" />
      <rect x="-2" y="-12" width="6" height="6" fill="#fff5d8" opacity="0.7" />
      <rect x="6" y="-12" width="6" height="6" fill="#fff5d8" opacity="0.7" />
    </g>
  );
  if (type === "classical") return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-14" y="-20" width="28" height="24" fill={c} stroke={d} strokeWidth="1.5" />
      <polygon points="-16,-20 0,-32 16,-20" fill={d} />
      <rect x="-10" y="-16" width="3" height="20" fill="#fff5d8" />
      <rect x="-3" y="-16" width="3" height="20" fill="#fff5d8" />
      <rect x="4" y="-16" width="3" height="20" fill="#fff5d8" />
      <circle cx="0" cy="-26" r="3" fill={C.gold} />
    </g>
  );
  if (type === "shop") return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-13" y="-18" width="26" height="22" fill={c} stroke={d} strokeWidth="1.5" />
      <polygon points="-15,-18 0,-28 15,-18" fill={d} />
      <rect x="-10" y="-14" width="20" height="3" fill="#fff5d8" />
      <rect x="-8" y="-8" width="6" height="6" fill="#fff5d8" />
      <rect x="2" y="-8" width="6" height="6" fill="#fff5d8" />
    </g>
  );
  if (type === "cafe") return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-12" y="-18" width="24" height="22" fill={c} stroke={d} strokeWidth="1.5" />
      <polygon points="-14,-18 0,-26 14,-18" fill={d} />
      <rect x="-7" y="-32" width="3" height="6" fill={d} />
      <circle cx="-5.5" cy="-34" r="2" fill="#bbb" opacity="0.6" />
      <rect x="-3" y="-10" width="6" height="14" fill="#fff5d8" />
    </g>
  );
  if (type === "deco") return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-13" y="-22" width="26" height="26" fill={c} stroke={d} strokeWidth="1.5" />
      <rect x="-15" y="-24" width="30" height="3" fill={d} />
      <circle cx="-8" cy="-20" r="1.5" fill={C.gold} />
      <circle cx="0" cy="-20" r="1.5" fill={C.gold} />
      <circle cx="8" cy="-20" r="1.5" fill={C.gold} />
      <rect x="-4" y="-12" width="8" height="16" fill={d} />
    </g>
  );
  if (type === "home") return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-12" y="-16" width="24" height="20" fill={c} stroke={d} strokeWidth="1.5" />
      <polygon points="-14,-16 0,-26 14,-16" fill={d} />
      <rect x="-3" y="-8" width="6" height="12" fill={d} />
      <rect x="-9" y="-10" width="4" height="4" fill="#fff5d8" />
      <rect x="5" y="-10" width="4" height="4" fill="#fff5d8" />
    </g>
  );
  if (type === "plaza") return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r="14" fill={C.pavement} stroke={d} strokeWidth="1.5" />
      <circle r="7" fill="#5a9fd4" />
      <circle r="2" fill={C.gold} />
    </g>
  );
  return null;
}

// ─── HUD ────────────────────────────────────────────────────
function HUD({ state }) {
  const q = QUESTS[state.activeQuest];
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "14px 22px", display: "flex", gap: 14, alignItems: "flex-start", zIndex: 5, pointerEvents: "none" }}>
      {/* Logo block */}
      <div style={{ background: C.surface, padding: "8px 14px", borderRadius: 4, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 6px 20px rgba(0,0,0,0.4)", border: `1.5px solid ${C.borderCream}` }}>
        <div style={{ width: 12, height: 28, background: C.coral, borderRadius: 1 }} />
        <div style={{ width: 12, height: 28, background: C.gold, borderRadius: 1 }} />
        <div style={{ width: 12, height: 28, background: C.teal, borderRadius: 1 }} />
        <div style={{ marginLeft: 6 }}>
          <div style={{ fontFamily: FONT_D, fontSize: 18, color: C.ink, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>ELARA</div>
          <div style={{ fontFamily: FONT_H, fontSize: 14, color: C.coral, fontWeight: 600, lineHeight: 1, marginTop: 1 }}>the living economy</div>
        </div>
      </div>

      {/* Day/time + zone block */}
      <div style={{ background: C.surface, padding: "10px 16px", borderRadius: 4, boxShadow: "0 6px 20px rgba(0,0,0,0.4)", border: `1.5px solid ${C.borderCream}` }}>
        <div style={{ fontFamily: FONT_M, fontSize: 9, color: state.dayPhase === "work" ? C.coral : C.teal, letterSpacing: "0.2em", fontWeight: 700 }}>{state.dayPhase === "work" ? "● TUESDAY · WORK" : "● MONDAY · DAY OFF"}</div>
        <div style={{ fontFamily: FONT_D, fontSize: 22, color: C.ink, fontWeight: 700, lineHeight: 1.1 }}>{state.hour}:00 AM</div>
        <div style={{ fontFamily: FONT_M, fontSize: 8, color: C.purple, letterSpacing: "0.22em", fontWeight: 700, marginTop: 2 }}>📍 {areaAt(state.px)}</div>
      </div>

      {/* Life meters */}
      <div style={{ background: C.surface, padding: "10px 14px", borderRadius: 4, boxShadow: "0 6px 20px rgba(0,0,0,0.4)", border: `1.5px solid ${C.borderCream}`, display: "flex", gap: 16, alignItems: "center" }}>
        <Meter icon="💰" label="CASH" value={`₺${state.wallet}`} color={C.gold} numeric />
        <div style={{ width: 1, height: 26, background: C.borderCream }} />
        <Meter icon="😰" label="STRESS" pct={state.stress} color={state.stress > 70 ? C.coral : state.stress > 40 ? C.gold : C.teal} inverse />
        <Meter icon="😊" label="HAPPY" pct={state.happiness} color={C.rose} />
        <Meter icon="⚡" label="ENERGY" pct={state.energy} color={C.gold} />
      </div>

      <div style={{ flex: 1 }} />

      {/* Quest pill */}
      {q && (
        <div style={{ background: C.surface, border: `1.5px solid ${C.borderCream}`, borderLeft: `4px solid ${C.coral}`, padding: "10px 16px", borderRadius: 4, maxWidth: 340, boxShadow: "0 6px 20px rgba(0,0,0,0.4)", pointerEvents: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
            <span style={{ fontFamily: FONT_M, fontSize: 9, color: C.coral, letterSpacing: "0.22em", fontWeight: 700 }}>CURRENT TASK</span>
            <span style={{ fontFamily: FONT_M, fontSize: 9, color: C.textMuted, letterSpacing: "0.2em" }}>{state.completedQuests.length + 1} / 6</span>
          </div>
          <div style={{ fontFamily: FONT_D, fontSize: 15, color: C.ink, fontWeight: 700, lineHeight: 1.2 }}>{q.title}</div>
          <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: C.text, lineHeight: 1.45, marginTop: 3 }}>{q.desc}</div>
        </div>
      )}
    </div>
  );
}

function Meter({ icon, label, value, pct, color, numeric, inverse }) {
  return (
    <div style={{ minWidth: numeric ? 70 : 56 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 11 }}>{icon}</span>
        <span style={{ fontFamily: FONT_M, fontSize: 8, color: C.textMuted, letterSpacing: "0.18em", fontWeight: 700 }}>{label}</span>
      </div>
      {numeric ? (
        <div style={{ fontFamily: FONT_D, fontSize: 16, color, fontWeight: 700, lineHeight: 1.1, marginTop: 1 }}>{value}</div>
      ) : (
        <div style={{ position: "relative", height: 6, background: C.surface3, borderRadius: 3, marginTop: 4, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
        </div>
      )}
    </div>
  );
}

// ─── PHONE ──────────────────────────────────────────────────
function PhoneWidget({ state, dispatch }) {
  const unread = !state.yusufReplied;
  return (
    <button onClick={() => dispatch({ type: "TOGGLE_PHONE" })} style={{ position: "absolute", bottom: 24, right: 24, width: 64, height: 96, background: C.ink, border: `2.5px solid ${unread ? C.coral : C.border}`, borderRadius: 12, cursor: "pointer", zIndex: 20, padding: 5, boxShadow: "0 8px 24px rgba(26,16,8,0.25)" }}>
      <div style={{ width: "100%", height: "100%", background: C.surface2, borderRadius: 7, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ fontSize: 24 }}>📱</div>
        <div style={{ fontSize: 8, fontFamily: FONT_M, color: C.textMuted, letterSpacing: "0.18em", marginTop: 3, fontWeight: 600 }}>PHONE</div>
        {unread && (
          <div style={{ position: "absolute", top: 3, right: 3, background: C.coral, color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontFamily: FONT_M, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 1.4s ease infinite" }}>!</div>
        )}
      </div>
    </button>
  );
}

function PhonePanel({ state, dispatch }) {
  const tab = state.phoneTab;
  const yusufReplies = [
    { text: "Cheers mate. Don't sell yet — let me look at the numbers this week.", rel: 10 },
    { text: "Honestly bro, I don't know yet. I'll know more by Friday.", rel: 6 },
  ];
  return (
    <div onClick={() => dispatch({ type: "TOGGLE_PHONE" })} style={{ position: "absolute", inset: 0, background: "rgba(26,16,8,0.45)", backdropFilter: "blur(8px)", zIndex: 32, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 380, maxWidth: "100%", height: "85vh", maxHeight: 720, background: C.ink, border: `3px solid ${C.coral}`, borderRadius: 32, padding: 10, boxShadow: "0 30px 80px rgba(26,16,8,0.4)" }}>
        <div style={{ height: "100%", background: C.surface2, borderRadius: 24, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", fontFamily: FONT_M, fontSize: 11, color: C.ink, fontWeight: 600 }}>
            <span>8:00 AM · MON</span>
            <span style={{ color: C.coral }}>● Elaran 5G</span>
          </div>
          <div style={{ display: "flex", gap: 4, padding: "8px 8px", borderBottom: `1px solid ${C.border}` }}>
            {[{ id: "msg", icon: "💬", label: "Messages" }, { id: "news", icon: "📰", label: "News" }, { id: "notes", icon: "📓", label: "Notes" }, { id: "wallet", icon: "💼", label: "Wallet" }].map((t) => (
              <button key={t.id} onClick={() => dispatch({ type: "SET_PHONE_TAB", tab: t.id })} style={{ flex: 1, background: tab === t.id ? C.coral : "transparent", color: tab === t.id ? C.surface : C.text, border: "none", padding: "8px 4px", fontFamily: FONT_M, fontSize: 10, cursor: "pointer", borderRadius: 6, fontWeight: 600 }}>
                <div style={{ fontSize: 14 }}>{t.icon}</div>{t.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "12px 10px" }}>
            {tab === "msg" && (
              <div style={{ background: C.surface, borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.coral, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_D, fontWeight: 700, fontSize: 14 }}>Y</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Yusuf</div>
                    <div style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_M }}>Keldra · old mate</div>
                  </div>
                </div>
                {[
                  "Big day mate. Don't forget us when you're up in that tower 😅",
                  "Mortgage went up again Friday. Sara's saying we should sell.",
                  "Anyway. Smash it today. Proud of you.",
                ].map((t, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "flex-start", marginBottom: 5 }}>
                    <div style={{ background: C.surface3, padding: "8px 11px", borderRadius: "12px 12px 12px 4px", fontSize: 12.5, lineHeight: 1.4, maxWidth: "82%", color: C.text }}>{t}</div>
                  </div>
                ))}
                {state.yusufReplied ? (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 5 }}>
                    <div style={{ background: C.coral, color: "#fff", padding: "8px 11px", borderRadius: "12px 12px 4px 12px", fontSize: 12.5, maxWidth: "82%" }}>{yusufReplies[0].text}<div style={{ fontSize: 9, opacity: 0.7, marginTop: 3 }}>You · 8:08</div></div>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.coral, letterSpacing: "0.15em", marginBottom: 6, fontWeight: 700 }}>QUICK REPLY</div>
                    {yusufReplies.map((r, i) => (
                      <button key={i} onClick={() => dispatch({ type: "REPLY_YUSUF" })} style={{ display: "block", width: "100%", background: C.surface3, border: `1px solid ${C.border}`, color: C.text, padding: "8px 10px", fontFamily: FONT_B, fontSize: 12, cursor: "pointer", borderRadius: 6, textAlign: "left", marginBottom: 5 }}>{r.text}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === "news" && (
              <div>
                <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.coral, letterSpacing: "0.2em", marginBottom: 8, fontWeight: 700 }}>THIS MORNING</div>
                {[
                  { p: "Elaran Times", t: `Inflation at ${pct(state.inflation)}: families squeezed`, c: C.coral },
                  { p: "Daily Marka", t: "MPC meets this week. Rate decision in spotlight.", c: C.gold },
                  { p: "Varena Post", t: "Cost of living tops public concern, polling shows", c: C.coral },
                  { p: "Markets", t: "Keldra Tech up 4% on AI deal. Rail stocks flat.", c: C.green },
                ].map((h, i) => (
                  <div key={i} style={{ background: C.surface, borderLeft: `3px solid ${h.c}`, padding: "10px 12px", marginBottom: 6, borderRadius: 6 }}>
                    <div style={{ fontSize: 9, fontFamily: FONT_M, color: h.c, letterSpacing: "0.2em", marginBottom: 3, fontWeight: 700 }}>{h.p}</div>
                    <div style={{ fontFamily: FONT_D, fontSize: 13, color: C.ink, lineHeight: 1.4 }}>{h.t}</div>
                  </div>
                ))}
                <div style={{ marginTop: 10, padding: 10, background: C.surface, borderRadius: 6, fontSize: 11, color: C.textMuted, lineHeight: 1.5, fontStyle: "italic" }}>
                  "Inflation" means prices are rising. When inflation is high, the same ₺10 buys less than it did a year ago.
                </div>
              </div>
            )}
            {tab === "notes" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 9, fontFamily: FONT_M, color: C.coral, letterSpacing: "0.2em", fontWeight: 700 }}>RESEARCH NOTEBOOK</span>
                  <span style={{ fontFamily: FONT_D, fontSize: 13, color: state.notes.length >= 3 ? C.green : C.ink, fontWeight: 600 }}>{state.notes.length} / 3+</span>
                </div>
                {state.notes.length === 0 ? (
                  <div style={{ padding: 30, textAlign: "center", color: C.textMuted, fontSize: 12, lineHeight: 1.6 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📓</div>
                    Empty for now. Talk to people on the street. Their words land here.
                  </div>
                ) : (
                  state.notes.map((n, i) => (
                    <div key={i} style={{ background: C.surface, padding: "10px 12px", marginBottom: 6, borderRadius: 6, borderLeft: `3px solid ${C.gold}` }}>
                      <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.gold, letterSpacing: "0.15em", marginBottom: 4, fontWeight: 700 }}>{n.from.toUpperCase()}</div>
                      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, fontStyle: "italic" }}>"{n.text}"</div>
                    </div>
                  ))
                )}
                {state.notes.length >= 3 && !state.decisionDone && (
                  <div style={{ marginTop: 10, padding: 10, background: `${C.green}15`, border: `1.5px solid ${C.green}55`, borderRadius: 6, fontSize: 12, color: C.green, fontWeight: 600 }}>
                    ✓ Head back to the Reserve to make the call.
                  </div>
                )}
              </div>
            )}
            {tab === "wallet" && (
              <div>
                <div style={{ background: C.surface, padding: 16, borderRadius: 10, marginBottom: 10, border: `1.5px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.textMuted, letterSpacing: "0.2em", marginBottom: 4, fontWeight: 700 }}>IN YOUR POCKET</div>
                  <div style={{ fontFamily: FONT_D, fontSize: 34, color: C.teal, fontWeight: 600, lineHeight: 1 }}>{fmt(state.wallet)}</div>
                </div>
                {state.bankSaved > 0 && (
                  <div style={{ background: C.surface, padding: 14, borderRadius: 10, marginBottom: 10, borderLeft: `3px solid ${C.gold}` }}>
                    <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.gold, letterSpacing: "0.2em", marginBottom: 4, fontWeight: 700 }}>SAVINGS</div>
                    <div style={{ fontFamily: FONT_D, fontSize: 22, color: C.gold, fontWeight: 600 }}>{fmt(state.bankSaved)}</div>
                  </div>
                )}
                {Object.entries(state.holdings).filter(([, h]) => h).length > 0 && (
                  <div style={{ background: C.surface, padding: 14, borderRadius: 10, borderLeft: `3px solid ${C.blue}` }}>
                    <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.blue, letterSpacing: "0.2em", marginBottom: 6, fontWeight: 700 }}>PORTFOLIO</div>
                    {Object.entries(state.holdings).filter(([, h]) => h).map(([id, h]) => {
                      const stock = STOCKS_INIT.find((s) => s.id === id);
                      const val = state.stockPrices[id] * h.qty;
                      return (
                        <div key={id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                          <span style={{ color: C.text }}>{stock.name} × {h.qty}</span>
                          <span style={{ fontFamily: FONT_D, color: C.ink, fontWeight: 600 }}>{fmtD(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
            <button onClick={() => dispatch({ type: "TOGGLE_PHONE" })} style={{ width: 80, height: 5, background: C.border, border: "none", borderRadius: 3, cursor: "pointer" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PANEL SHELL ────────────────────────────────────────────
function PanelShell({ title, sub, onClose, accent = C.coral, children, wide }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(26,16,8,0.45)", backdropFilter: "blur(8px)", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 4, maxWidth: wide ? 720 : 560, width: "100%", maxHeight: "88vh", overflow: "auto", boxShadow: "0 24px 72px rgba(26,16,8,0.25)" }}>
        <div style={{ background: accent, height: 5 }} />
        <div style={{ padding: "26px 30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: FONT_M, letterSpacing: "0.28em", color: accent, textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>{sub}</div>
              <div style={{ fontFamily: FONT_D, fontSize: 30, color: C.ink, fontWeight: 500, lineHeight: 1.05, letterSpacing: "-0.01em" }}>{title}</div>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: `1.5px solid ${C.border}`, color: C.text, width: 36, height: 36, borderRadius: 4, cursor: "pointer", fontSize: 18, fontFamily: FONT_M }}>×</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── MEETING (BRIEFING & REVIEW) ────────────────────────────
const BRIEFING_LINES = [
  { sp: "Nara", role: "Governor", c: C.teal, t: "Welcome. First day. I'll skip the orientation — we have a real problem." },
  { sp: "Vega", role: "Chief Economist", c: C.coral, t: "Inflation 4.2% last quarter. Food and energy leading it. The country is hurting." },
  { sp: "Okafor", role: "Doves", c: C.blue, t: "You've been walking the city. You've seen Amara at the market. Yusuf with his mortgage. The students. The old man on the bench." },
  { sp: "Liana", role: "Communications", c: C.purple, t: "That counts for more than another spreadsheet. You felt it before you saw it from up here." },
  { sp: "Vega", role: "Chief Economist", c: C.coral, t: "So: raise rates, hold, or cut. Each option will hurt someone you've now met. Each will help someone else." },
  { sp: "Nara", role: "Governor", c: C.teal, t: "There's no perfect call. Only the least bad one. Your turn." },
];
const REVIEW_LINES = [
  { sp: "Nara", role: "Governor", c: C.teal, t: "You're back. Good. What did you find?" },
  { sp: "Liana", role: "Communications", c: C.purple, t: "[Reading your notes] These are people, not numbers. That has weight." },
  { sp: "Vega", role: "Chief Economist", c: C.coral, t: "Right. Do these voices change what we should do?" },
  { sp: "Okafor", role: "Doves", c: C.blue, t: "If Amara folds because we raise too hard, we wear that. If prices keep climbing because we held, we wear that too." },
  { sp: "Nara", role: "Governor", c: C.teal, t: "There's no perfect call. Only the least bad one. It's yours to make." },
];

function MeetingRoom({ state, dispatch }) {
  const phase = state.meetingPhase;
  const lines = phase === "briefing" ? BRIEFING_LINES : REVIEW_LINES;
  const cur = lines[state.meetingStep];

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(10,5,20,0.75)", zIndex: 35, display: "flex", flexDirection: "column", padding: 18 }}>
      <div style={{ flex: 1, background: "#3a2014", borderRadius: 6, border: `2px solid ${C.bReserveD}`, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 72px rgba(0,0,0,0.6)" }}>
        {/* Header strip with Reserve crest */}
        <div style={{ background: "#1a0e08", padding: "10px 20px", borderBottom: `2px solid ${C.gold}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="28" height="28" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="13" fill={C.gold} />
              <text x="14" y="20" textAnchor="middle" fontFamily={FONT_D} fontSize="16" fontWeight="800" fill="#1a0e08">₺</text>
            </svg>
            <div>
              <div style={{ fontFamily: FONT_D, fontSize: 14, color: C.gold, fontWeight: 800, letterSpacing: "0.05em", lineHeight: 1 }}>ELARAN RESERVE</div>
              <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.textCreamDim, letterSpacing: "0.22em", marginTop: 2 }}>FLOOR 8 · MONETARY POLICY COMMITTEE</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.textCreamDim, letterSpacing: "0.2em" }}>INFLATION</div>
              <div style={{ fontFamily: FONT_D, fontSize: 18, color: C.coral, fontWeight: 700, lineHeight: 1 }}>{state.inflation.toFixed(1)}%</div>
            </div>
            <div style={{ width: 1, height: 28, background: C.borderL }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.textCreamDim, letterSpacing: "0.2em" }}>CURRENT RATE</div>
              <div style={{ fontFamily: FONT_D, fontSize: 18, color: C.gold, fontWeight: 700, lineHeight: 1 }}>{state.interestRate.toFixed(2)}%</div>
            </div>
            <div style={{ width: 1, height: 28, background: C.borderL }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.textCreamDim, letterSpacing: "0.2em" }}>SESSION</div>
              <div style={{ fontFamily: FONT_D, fontSize: 14, color: C.surface, fontWeight: 700, lineHeight: 1 }}>{phase === "briefing" ? "BRIEFING" : phase === "rate" ? "VOTE" : phase === "outcome" ? "VERDICT" : "REVIEW"}</div>
            </div>
          </div>
        </div>

        {/* Meeting room scene */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 380 }}>
          <svg viewBox="0 0 1000 460" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }}>
            <defs>
              <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4a2818" />
                <stop offset="100%" stopColor="#2a1410" />
              </linearGradient>
              <linearGradient id="tableTop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a87044" />
                <stop offset="100%" stopColor="#6a3a1c" />
              </linearGradient>
              <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff5a8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#fff5a8" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Back wall with paneling */}
            <rect width="1000" height="320" fill="url(#wall)" />
            {/* Wood paneling stripes */}
            {[120, 220, 340, 440, 560, 680, 800, 880].map((x, i) => (
              <line key={i} x1={x} y1="0" x2={x} y2="320" stroke="#1a0a06" strokeWidth="1" opacity="0.5" />
            ))}
            {/* Chair rail */}
            <rect x="0" y="240" width="1000" height="6" fill="#1a0a06" />
            <rect x="0" y="246" width="1000" height="2" fill="#6a3a1c" />
            {/* Floor */}
            <rect y="320" width="1000" height="140" fill="#1a0a06" />
            <path d="M 0 320 L 1000 320 L 1000 360 L 0 360 Z" fill="#241410" />

            {/* Left window with city view */}
            <g transform="translate(50, 30)">
              <rect width="180" height="180" fill="#1a0a06" />
              <rect x="6" y="6" width="168" height="168" fill="url(#wall)" />
              {/* Sky outside */}
              <rect x="12" y="12" width="156" height="156" fill="#7a3470" />
              <rect x="12" y="12" width="156" height="80" fill={C.skyDawn} opacity="0.7" />
              {/* Distant city silhouette */}
              {[18, 30, 44, 58, 72, 88, 104, 120, 138, 152].map((x, i) => {
                const h = 30 + ((i * 7) % 40);
                return <rect key={i} x={x + 12} y={168 - h - 30} width={8 + (i % 4)} height={h} fill="#1a0a06" />;
              })}
              {/* Window mullions */}
              <line x1="90" y1="12" x2="90" y2="168" stroke="#1a0a06" strokeWidth="3" />
              <line x1="12" y1="90" x2="168" y2="90" stroke="#1a0a06" strokeWidth="3" />
              <rect x="6" y="6" width="168" height="168" fill="none" stroke="#1a0a06" strokeWidth="3" />
            </g>

            {/* Right window */}
            <g transform="translate(770, 30)">
              <rect width="180" height="180" fill="#1a0a06" />
              <rect x="6" y="6" width="168" height="168" fill="url(#wall)" />
              <rect x="12" y="12" width="156" height="156" fill="#7a3470" />
              <rect x="12" y="12" width="156" height="80" fill={C.skyDawn} opacity="0.7" />
              {[18, 34, 48, 64, 78, 94, 110, 124, 140, 152].map((x, i) => {
                const h = 28 + ((i * 11) % 44);
                return <rect key={i} x={x + 12} y={168 - h - 30} width={9 + (i % 3)} height={h} fill="#1a0a06" />;
              })}
              <line x1="90" y1="12" x2="90" y2="168" stroke="#1a0a06" strokeWidth="3" />
              <line x1="12" y1="90" x2="168" y2="90" stroke="#1a0a06" strokeWidth="3" />
              <rect x="6" y="6" width="168" height="168" fill="none" stroke="#1a0a06" strokeWidth="3" />
            </g>

            {/* Center wall: Reserve crest */}
            <g transform="translate(500, 90)">
              <circle r="44" fill="#1a0a06" stroke={C.gold} strokeWidth="3" />
              <circle r="36" fill="none" stroke={C.gold} strokeWidth="1" opacity="0.5" />
              <text x="0" y="9" textAnchor="middle" fontFamily={FONT_D} fontSize="40" fontWeight="800" fill={C.gold}>₺</text>
              <text x="0" y="62" textAnchor="middle" fontFamily={FONT_M} fontSize="8" fill={C.gold} letterSpacing="0.3em" fontWeight="700">EST. 1971</text>
            </g>

            {/* Bookshelves either side of crest */}
            <g transform="translate(280, 50)">
              <rect width="160" height="120" fill="#1a0a06" stroke="#0a0402" strokeWidth="2" />
              {[0, 30, 60, 90].map((y, row) => (
                <g key={row}>
                  <rect y={y + 4} width="160" height="26" fill="#241410" />
                  {[8, 22, 36, 52, 68, 84, 100, 118, 134, 148].map((x, i) => {
                    const h = 20 + ((row + i) % 5);
                    const colors = ["#8a3030", "#5a4020", "#4a3060", "#3a5040", "#8a6020", "#6a3030"];
                    return <rect key={i} x={x} y={y + 30 - h} width="8" height={h} fill={colors[(row + i) % colors.length]} />;
                  })}
                </g>
              ))}
            </g>
            <g transform="translate(560, 50)">
              <rect width="160" height="120" fill="#1a0a06" stroke="#0a0402" strokeWidth="2" />
              {[0, 30, 60, 90].map((y, row) => (
                <g key={row}>
                  <rect y={y + 4} width="160" height="26" fill="#241410" />
                  {[8, 22, 36, 52, 68, 84, 100, 118, 134, 148].map((x, i) => {
                    const h = 20 + ((row + i + 3) % 5);
                    const colors = ["#5a4020", "#3a5040", "#8a3030", "#4a3060", "#6a3030", "#8a6020"];
                    return <rect key={i} x={x} y={y + 30 - h} width="8" height={h} fill={colors[(row + i + 2) % colors.length]} />;
                  })}
                </g>
              ))}
            </g>

            {/* Pendant lamps */}
            <g transform="translate(360, 0)">
              <line x1="0" y1="0" x2="0" y2="50" stroke="#1a0a06" strokeWidth="2" />
              <ellipse cx="0" cy="56" rx="14" ry="8" fill="#3a2014" stroke={C.gold} strokeWidth="1" />
              <ellipse cx="0" cy="56" rx="12" ry="6" fill={C.gold} opacity="0.5" />
              <circle cx="0" cy="58" r="40" fill="url(#lampGlow)" />
            </g>
            <g transform="translate(500, 0)">
              <line x1="0" y1="0" x2="0" y2="40" stroke="#1a0a06" strokeWidth="2" />
              <ellipse cx="0" cy="46" rx="14" ry="8" fill="#3a2014" stroke={C.gold} strokeWidth="1" />
              <ellipse cx="0" cy="46" rx="12" ry="6" fill={C.gold} opacity="0.5" />
              <circle cx="0" cy="48" r="40" fill="url(#lampGlow)" />
            </g>
            <g transform="translate(640, 0)">
              <line x1="0" y1="0" x2="0" y2="50" stroke="#1a0a06" strokeWidth="2" />
              <ellipse cx="0" cy="56" rx="14" ry="8" fill="#3a2014" stroke={C.gold} strokeWidth="1" />
              <ellipse cx="0" cy="56" rx="12" ry="6" fill={C.gold} opacity="0.5" />
              <circle cx="0" cy="58" r="40" fill="url(#lampGlow)" />
            </g>

            {/* Clock */}
            <g transform="translate(740, 90)">
              <circle r="22" fill={C.surface2} stroke={C.gold} strokeWidth="2" />
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
                const r = (deg * Math.PI) / 180;
                return <line key={i} x1={Math.cos(r) * 18} y1={Math.sin(r) * 18} x2={Math.cos(r) * 22} y2={Math.sin(r) * 22} stroke="#1a0a06" strokeWidth={i % 3 === 0 ? "2" : "1"} />;
              })}
              <line x1="0" y1="0" x2="0" y2="-12" stroke="#1a0a06" strokeWidth="2" />
              <line x1="0" y1="0" x2="14" y2="-4" stroke="#1a0a06" strokeWidth="1.5" />
              <circle r="2" fill={C.coral} />
            </g>

            {/* Inflation chart on wall (right side) */}
            <g transform="translate(260, 90)">
              <text x="0" y="-30" fontFamily={FONT_M} fontSize="8" fill={C.gold} letterSpacing="0.2em" fontWeight="700">YOY INFLATION</text>
              <rect width="60" height="120" fill="#1a0a06" stroke={C.gold} strokeWidth="1" />
              <polyline points="6,100 16,90 26,82 36,70 46,55 54,40" fill="none" stroke={C.coral} strokeWidth="2" />
              <line x1="0" y1="40" x2="60" y2="40" stroke={C.gold} strokeWidth="0.5" strokeDasharray="2,2" />
              <text x="62" y="42" fontFamily={FONT_M} fontSize="6" fill={C.gold}>2%</text>
            </g>

            {/* The table - more dimensional */}
            <ellipse cx="500" cy="370" rx="380" ry="14" fill="#0a0402" opacity="0.6" />
            <ellipse cx="500" cy="365" rx="370" ry="60" fill="#3a1d0a" />
            <ellipse cx="500" cy="358" rx="370" ry="60" fill="url(#tableTop)" />
            <ellipse cx="500" cy="354" rx="358" ry="52" fill="#c4946a" opacity="0.9" />
            {/* Wood grain */}
            <ellipse cx="500" cy="354" rx="358" ry="52" fill="none" stroke="#8a5e3e" strokeWidth="0.4" opacity="0.5" />
            <ellipse cx="500" cy="350" rx="300" ry="40" fill="none" stroke="#8a5e3e" strokeWidth="0.4" opacity="0.4" />

            {/* Papers, cups */}
            <rect x="260" y="332" width="36" height="24" fill="#fff5e1" transform="rotate(-3 278 344)" stroke="#8a5e3e" strokeWidth="0.5" />
            <rect x="262" y="334" width="32" height="2" fill={C.text} transform="rotate(-3 278 344)" />
            <rect x="262" y="338" width="26" height="2" fill={C.text} transform="rotate(-3 278 344)" />
            <circle cx="335" cy="345" r="7" fill="#fff5e1" stroke="#8a5e3e" strokeWidth="1" />
            <ellipse cx="335" cy="344" rx="5" ry="3" fill="#6a3a1c" />
            <rect x="470" y="340" width="42" height="26" fill="#fff5e1" stroke="#8a5e3e" strokeWidth="0.5" />
            <rect x="472" y="343" width="32" height="2" fill={C.text} />
            <rect x="472" y="347" width="38" height="2" fill={C.text} />
            <rect x="472" y="351" width="28" height="2" fill={C.text} />
            <circle cx="600" cy="345" r="7" fill="#fff5e1" stroke="#8a5e3e" strokeWidth="1" />
            <ellipse cx="600" cy="344" rx="5" ry="3" fill="#6a3a1c" />
            <rect x="660" y="334" width="36" height="22" fill="#fff5e1" transform="rotate(4 678 345)" stroke="#8a5e3e" strokeWidth="0.5" />
            <rect x="662" y="336" width="32" height="2" fill={C.text} transform="rotate(4 678 345)" />

            {/* The 5 seats around the table */}
            <Seat x={500} y={240} c={C.teal} name="GOV NARA" g="f" hl={cur?.sp === "Nara"} />
            <Seat x={270} y={290} c={C.coral} name="DR VEGA" g="m" hl={cur?.sp === "Vega"} />
            <Seat x={730} y={290} c={C.blue} name="DR OKAFOR" g="m" hl={cur?.sp === "Okafor"} />
            <Seat x={360} y={400} c={C.purple} name="LIANA" g="f" hl={cur?.sp === "Liana"} />
            <Seat x={640} y={400} c={C.gold} name="YOU" g="m" hl={phase !== "briefing" && phase !== "review"} />
          </svg>
        </div>

        {/* Dialogue panel */}
        <div style={{ background: C.surface, borderTop: `3px solid ${C.gold}`, padding: "20px 28px", minHeight: 180, maxHeight: 220, overflowY: "auto" }}>
          {(phase === "briefing" || phase === "review") && cur && (
            <div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: cur.c, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_D, fontWeight: 800, fontSize: 18, boxShadow: `0 4px 12px ${cur.c}66` }}>{cur.sp[0]}</div>
                <div>
                  <div style={{ fontFamily: FONT_D, fontSize: 17, color: C.ink, fontWeight: 700 }}>{cur.sp}</div>
                  <div style={{ fontFamily: FONT_M, fontSize: 10, color: cur.c, letterSpacing: "0.2em", fontWeight: 700 }}>{cur.role.toUpperCase()}</div>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.textMuted, letterSpacing: "0.2em" }}>{state.meetingStep + 1} / {lines.length}</div>
              </div>
              <div style={{ fontFamily: FONT_D, fontSize: 19, color: C.ink, lineHeight: 1.5, fontWeight: 500, fontStyle: "italic" }}>"{cur.t}"</div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <button onClick={() => {
                  if (state.meetingStep < lines.length - 1) dispatch({ type: "MEETING_NEXT" });
                  else dispatch({ type: "MEETING_PHASE", phase: "rate" });
                }} style={{ background: C.ink, color: C.gold, border: `2px solid ${C.gold}`, padding: "12px 26px", fontFamily: FONT_M, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", cursor: "pointer", borderRadius: 4 }}>
                  {state.meetingStep < lines.length - 1 ? "CONTINUE →" : "SET THE RATE →"}
                </button>
              </div>
            </div>
          )}
          {phase === "rate" && (() => {
            const r = state.pendingRate;
            const cur = state.interestRate;
            const delta = r - cur;
            // General macro projections only — no personal connections
            const inflProj = Math.max(0, state.inflation - delta * 0.4);
            const unempProj = Math.max(3, 4.5 + delta * 0.4);
            const growthProj = 1.8 - delta * 0.3;
            const fxProj = 1.0 + delta * 0.05; // Marka vs USD (relative)
            return (
              <div>
                <div style={{ fontFamily: FONT_D, fontSize: 19, color: C.coral, fontWeight: 700, marginBottom: 2 }}>Your call. Set the policy rate.</div>
                <div style={{ fontSize: 12, color: C.text, marginBottom: 10, lineHeight: 1.45, fontStyle: "italic" }}>Every quarter-point ripples through the macro. Projections are 12-month, ceteris paribus.</div>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <input type="range" min="0" max="8" step="0.25" value={state.pendingRate} onChange={(e) => dispatch({ type: "SET_RATE", rate: parseFloat(e.target.value) })} style={{ width: "100%", accentColor: C.coral }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: FONT_M, color: C.textMuted, marginTop: 2 }}>
                      <span>0% · loose</span><span>2%</span><span>4%</span><span>6%</span><span>8% · tight</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: 10 }}>
                      <div style={{ background: C.surface2, padding: "6px 8px", borderRadius: 3, borderLeft: `2px solid ${C.coral}` }}>
                        <div style={{ fontSize: 8, color: C.textMuted, fontFamily: FONT_M, letterSpacing: "0.18em", fontWeight: 700 }}>CPI INFLATION</div>
                        <div style={{ fontFamily: FONT_D, fontSize: 15, color: inflProj > 4 ? C.coral : inflProj > 2.5 ? C.gold : C.green, fontWeight: 800 }}>{pct(inflProj)}</div>
                        <div style={{ fontSize: 9, color: C.textMuted, fontFamily: FONT_M }}>{inflProj < state.inflation ? "↓ cooling" : inflProj > state.inflation ? "↑ rising" : "→ flat"}</div>
                      </div>
                      <div style={{ background: C.surface2, padding: "6px 8px", borderRadius: 3, borderLeft: `2px solid ${C.gold}` }}>
                        <div style={{ fontSize: 8, color: C.textMuted, fontFamily: FONT_M, letterSpacing: "0.18em", fontWeight: 700 }}>UNEMPLOYMENT</div>
                        <div style={{ fontFamily: FONT_D, fontSize: 15, color: unempProj > 5.5 ? C.coral : C.text, fontWeight: 800 }}>{pct(unempProj)}</div>
                        <div style={{ fontSize: 9, color: C.textMuted, fontFamily: FONT_M }}>{unempProj > 4.5 ? "↑ rising" : "→ stable"}</div>
                      </div>
                      <div style={{ background: C.surface2, padding: "6px 8px", borderRadius: 3, borderLeft: `2px solid ${C.teal}` }}>
                        <div style={{ fontSize: 8, color: C.textMuted, fontFamily: FONT_M, letterSpacing: "0.18em", fontWeight: 700 }}>GDP GROWTH</div>
                        <div style={{ fontFamily: FONT_D, fontSize: 15, color: growthProj < 0.5 ? C.coral : growthProj < 1.5 ? C.gold : C.teal, fontWeight: 800 }}>{pct(growthProj)}</div>
                        <div style={{ fontSize: 9, color: C.textMuted, fontFamily: FONT_M }}>{growthProj < 0 ? "recession risk" : growthProj < 1.5 ? "slowing" : "expanding"}</div>
                      </div>
                      <div style={{ background: C.surface2, padding: "6px 8px", borderRadius: 3, borderLeft: `2px solid ${C.purple}` }}>
                        <div style={{ fontSize: 8, color: C.textMuted, fontFamily: FONT_M, letterSpacing: "0.18em", fontWeight: 700 }}>MARKA / USD</div>
                        <div style={{ fontFamily: FONT_D, fontSize: 15, color: fxProj > 1.03 ? C.teal : fxProj < 0.97 ? C.coral : C.text, fontWeight: 800 }}>{fxProj.toFixed(3)}</div>
                        <div style={{ fontSize: 9, color: C.textMuted, fontFamily: FONT_M }}>{fxProj > 1.0 ? "↑ stronger" : fxProj < 1.0 ? "↓ weaker" : "→ stable"}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ minWidth: 130, textAlign: "center", padding: "10px 14px", background: C.surface2, border: `2px solid ${C.coral}`, borderRadius: 4 }}>
                    <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.textMuted, letterSpacing: "0.2em", fontWeight: 700 }}>PENDING</div>
                    <div style={{ fontFamily: FONT_D, fontSize: 30, color: C.coral, fontWeight: 800 }}>{pct(state.pendingRate)}</div>
                    <div style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_M }}>was {pct(state.interestRate)}</div>
                    <div style={{ fontSize: 9.5, color: delta === 0 ? C.textMuted : delta > 0 ? C.coral : C.green, fontFamily: FONT_M, fontWeight: 700, marginTop: 3 }}>{delta === 0 ? "no change" : delta > 0 ? `↑ ${pct(delta)}` : `↓ ${pct(Math.abs(delta))}`}</div>
                    <button onClick={() => { dispatch({ type: "COMMIT_RATE" }); dispatch({ type: "MEETING_PHASE", phase: "guidance" }); }} style={{ marginTop: 10, width: "100%", background: C.coral, color: "#fff", border: "none", padding: "10px", fontFamily: FONT_M, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", cursor: "pointer", borderRadius: 4 }}>LOCK IN →</button>
                  </div>
                </div>
              </div>
            );
          })()}
          {phase === "guidance" && (
            <div>
              <div style={{ fontFamily: FONT_D, fontSize: 19, color: C.coral, fontWeight: 700, marginBottom: 2 }}>Forward guidance.</div>
              <div style={{ fontSize: 12.5, color: C.text, marginBottom: 12, lineHeight: 1.45 }}>The rate is set. Now the second decision: how do you signal what's next? Markets price tomorrow's expectations more than today's decision. Pick a stance.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {[
                  { id: "hawk", label: "Higher for longer", body: "Inflation isn't beaten. We may need to do more. Markets: tighten.", color: C.coral },
                  { id: "balanced", label: "Data-dependent", body: "We respond to the data as it comes. No commitments. The standard line.", color: C.gold },
                  { id: "dove", label: "We may have done enough", body: "If data cooperates, cuts are on the table. Borrowers: take heart.", color: C.teal },
                ].map((g) => (
                  <button key={g.id} onClick={() => { dispatch({ type: "SET_GUIDANCE", guidance: g.id }); dispatch({ type: "MEETING_PHASE", phase: "outcome" }); }} style={{ background: C.surface2, border: `1.5px solid ${C.borderCream}`, padding: "10px 14px", fontFamily: FONT_B, fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 4, textAlign: "left", color: C.text, lineHeight: 1.4, transition: "all 0.15s" }} onMouseOver={(e) => e.currentTarget.style.borderColor = g.color} onMouseOut={(e) => e.currentTarget.style.borderColor = C.borderCream}>
                    <div style={{ fontFamily: FONT_D, fontSize: 14.5, color: g.color, fontWeight: 700, marginBottom: 2 }}>{g.label}</div>
                    <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.4 }}>{g.body}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {phase === "outcome" && (
            <div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.teal, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_D, fontWeight: 800, fontSize: 18, boxShadow: `0 4px 12px ${C.teal}66` }}>N</div>
                <div>
                  <div style={{ fontFamily: FONT_D, fontSize: 17, color: C.ink, fontWeight: 700 }}>Governor Nara</div>
                  <div style={{ fontFamily: FONT_M, fontSize: 10, color: C.teal, letterSpacing: "0.2em", fontWeight: 700 }}>GOVERNOR</div>
                </div>
              </div>
              <div style={{ fontFamily: FONT_D, fontSize: 18, color: C.ink, lineHeight: 1.55, fontStyle: "italic" }}>
                "{state.interestRate > 4.5 ? "Bold call. There will be pain. Make sure the country knows why." : state.interestRate < 2.5 ? "Risky. Watch the inflation print closely — we may be back here in weeks." : "Calibrated. Sensible. Let's see if the country agrees."} {state.guidance === "hawk" ? "Tough guidance too — markets won't forget that." : state.guidance === "dove" ? "And dovish forward guidance. The press will read every comma." : "Data-dependent — the safe word."}"
              </div>
              <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => dispatch({ type: "DECISION_END" })} style={{ background: C.ink, color: C.gold, border: `2px solid ${C.gold}`, padding: "12px 26px", fontFamily: FONT_M, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", cursor: "pointer", borderRadius: 4 }}>FACE THE PRESS →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function Seat({ x, y, c, name, g, hl }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {hl && <circle cx="0" cy="0" r="36" fill={c} opacity="0.18"><animate attributeName="r" values="32;44;32" dur="1.6s" repeatCount="indefinite" /></circle>}
      <rect x="-22" y="20" width="44" height="42" fill={C.surface3} stroke={C.border} strokeWidth="1" rx="3" />
      <rect x="-18" y="0" width="36" height="35" fill={c} rx="4" />
      {g === "f" ? <path d="M -14 -8 Q -12 -16 0 -16 Q 12 -16 14 -8 L 16 0 L -16 0 Z" fill="#2a1810" /> : <path d="M -10 -10 Q -8 -18 0 -18 Q 8 -18 10 -10 L 10 -3 Q 4 -5 0 -5 Q -4 -5 -10 -3 Z" fill="#2a1810" />}
      <circle cx="0" cy="-6" r="9" fill="#e8c8a8" />
      <circle cx="-3" cy="-6" r="1" fill="#2a1810" />
      <circle cx="3" cy="-6" r="1" fill="#2a1810" />
      <text x="0" y="74" textAnchor="middle" fill={C.ink} fontFamily={FONT_M} fontSize="10" fontWeight="700" letterSpacing="0.12em">{name}</text>
    </g>
  );
}

// ─── STOCK EXCHANGE PANEL ──────────────────────────────────
function StockExchangePanel({ state, dispatch }) {
  // Phases: research → allocate → playing → paused → review → done
  const [phase, setPhase] = useState("research");
  const [round, setRound] = useState(1);
  const TOTAL_ROUNDS = 4; // 4 rounds × 6 months = 2 years
  const [monthInRound, setMonthInRound] = useState(0); // 0..6
  const [cash, setCash] = useState(1000);
  const [holdings, setHoldings] = useState({}); // assetId -> units
  const [infoAsset, setInfoAsset] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [eventLog, setEventLog] = useState([]);
  const [history, setHistory] = useState({}); // assetId -> array of prices over months

  // ASSET UNIVERSE: stocks, bonds, real estate, commodities
  const ASSETS = [
    // STOCKS
    { id: "rail", cls: "STOCK", name: "Varena Rail", color: C.teal, basePrice: 84, vol: 0.04, growth: 0.005, info: "Owns the national rail network. Boring dividend stock. Pays you to wait.", risk: "LOW", yieldPct: 3.5 },
    { id: "tech", cls: "STOCK", name: "Keldra Tech", color: C.coral, basePrice: 156, vol: 0.18, growth: 0.012, info: "AI infrastructure startup. Burning cash, growing fast. No profit yet. Volatile.", risk: "VERY HIGH", yieldPct: 0 },
    { id: "food", cls: "STOCK", name: "Harbor Foods", color: C.gold, basePrice: 42, vol: 0.06, growth: 0.004, info: "Supplies most of Varena's supermarkets. Defensive — people always eat.", risk: "MEDIUM", yieldPct: 2.5 },
    { id: "bank", cls: "STOCK", name: "Northern Bank", color: C.purple, basePrice: 92, vol: 0.09, growth: 0.006, info: "Big commercial bank. Profits when rates rise. Hurt by defaults.", risk: "MEDIUM", yieldPct: 4 },
    // BONDS
    { id: "govt", cls: "BOND", name: "Elaran 5yr Gilt", color: "#5a9fd4", basePrice: 100, vol: 0.015, growth: 0.001, info: "Government bond. Almost as safe as cash. Pays a small steady yield.", risk: "VERY LOW", yieldPct: 3 },
    { id: "corp", cls: "BOND", name: "Corp. Bond Fund", color: "#7a8cd4", basePrice: 100, vol: 0.03, growth: 0.002, info: "Corporate bonds. Higher yield than government, more credit risk.", risk: "LOW", yieldPct: 5 },
    // REAL ESTATE
    { id: "reit", cls: "REAL ESTATE", name: "Varena REIT", color: "#d4a868", basePrice: 78, vol: 0.05, growth: 0.007, info: "Real estate trust — apartments and offices. Rental income + appreciation.", risk: "MEDIUM", yieldPct: 5.5 },
    // COMMODITIES
    { id: "gold", cls: "COMMODITY", name: "Gold", color: C.goldBright, basePrice: 124, vol: 0.08, growth: 0.003, info: "The hedge. Goes up when people get scared. Doesn't pay you anything.", risk: "MEDIUM", yieldPct: 0 },
    { id: "oil", cls: "COMMODITY", name: "Oil Futures", color: "#ff6b35", basePrice: 64, vol: 0.13, growth: 0.001, info: "Energy commodity. Politics and geopolitics drive it. Wild swings.", risk: "HIGH", yieldPct: 0 },
  ];

  // Initialize history once
  useEffect(() => {
    if (Object.keys(history).length === 0) {
      const init = {};
      ASSETS.forEach((a) => { init[a.id] = [a.basePrice]; });
      setHistory(init);
    }
  }, []);

  // Current price = last in history
  const priceOf = (id) => {
    const h = history[id];
    return h ? h[h.length - 1] : ASSETS.find((a) => a.id === id)?.basePrice || 0;
  };

  // Events that can fire during simulation
  const ROUND_EVENTS = [
    [
      { id: "ai", t: "Keldra Tech unveils new AI model", body: "Twitter is in a frenzy. Bulls scream 'bubble'. Bears scream 'bubble'. Stock jumps.", impact: { tech: 0.22 } },
      { id: "rateup", t: "Reserve hints at rate rise", body: "Bonds wobble down, banks rally, growth stocks pull back.", impact: { tech: -0.08, bank: 0.06, govt: -0.02, corp: -0.03 } },
      { id: "rentup", t: "Rental yields tick higher", body: "Tight housing supply lifts REIT values.", impact: { reit: 0.07 } },
    ],
    [
      { id: "oilspike", t: "Geopolitical shock: oil spikes", body: "Conflict in a producer region. Oil up sharply. Inflation worry returns.", impact: { oil: 0.28, food: -0.05, tech: -0.04 } },
      { id: "drought", t: "Drought hits crops", body: "Food producers struggle. Prices climb at the till.", impact: { food: -0.12 } },
      { id: "calm", t: "A calm month — markets drift", body: "Nothing dramatic. The boring stocks earn their dividends quietly.", impact: { rail: 0.03, food: 0.02 } },
    ],
    [
      { id: "crash", t: "Tech sector crashes", body: "Profit warnings cascade. The hype unwinds painfully.", impact: { tech: -0.32, bank: -0.08, gold: 0.06 } },
      { id: "fly", t: "Flight to safety", body: "Investors stampede into gold and bonds.", impact: { gold: 0.15, govt: 0.04, corp: 0.02, tech: -0.06 } },
      { id: "bankgood", t: "Banks report bumper profits", body: "Higher rates flow to bank margins. Dividends raised.", impact: { bank: 0.14 } },
    ],
    [
      { id: "rec", t: "Recovery hopes lift everything", body: "Growth optimism returns. The risk-on trade is on.", impact: { tech: 0.18, food: 0.06, rail: 0.04 } },
      { id: "rateCut", t: "Reserve cuts rates", body: "Borrowers rejoice. Bonds rally. Banks pull back.", impact: { govt: 0.05, corp: 0.04, bank: -0.05, reit: 0.06 } },
      { id: "regul", t: "New tech regulation announced", body: "Tech firms required to disclose AI training data. Costs to follow.", impact: { tech: -0.11 } },
    ],
  ];

  // Simulate one month: random walk + maybe event
  useEffect(() => {
    if (phase !== "playing") return;
    if (monthInRound >= 6) {
      // End of round
      setPhase("review");
      return;
    }
    const id = setTimeout(() => {
      // Update prices
      setHistory((h) => {
        const nh = {};
        for (const a of ASSETS) {
          const cur = (h[a.id] && h[a.id][h[a.id].length - 1]) || a.basePrice;
          const noise = (Math.random() - 0.5) * 2 * a.vol;
          const drift = a.growth;
          const next = Math.max(5, cur * (1 + noise + drift));
          nh[a.id] = [...(h[a.id] || [a.basePrice]), next];
        }
        return nh;
      });
      // 40% chance of event in this month
      if (Math.random() < 0.4) {
        const pool = ROUND_EVENTS[round - 1] || ROUND_EVENTS[0];
        const ev = pool[Math.floor(Math.random() * pool.length)];
        setActiveEvent(ev);
        setEventLog((l) => [...l, { round, month: monthInRound + 1, ev }]);
        setHistory((h) => {
          const nh = { ...h };
          for (const [k, mult] of Object.entries(ev.impact)) {
            const cur = nh[k][nh[k].length - 1];
            nh[k] = [...nh[k].slice(0, -1), cur * (1 + mult)];
          }
          return nh;
        });
        setTimeout(() => setActiveEvent(null), 3500);
      }
      setMonthInRound((m) => m + 1);
    }, 1400);
    return () => clearTimeout(id);
  }, [phase, monthInRound]);

  // Portfolio value
  const holdingsValue = Object.entries(holdings).reduce((s, [id, qty]) => s + (qty || 0) * priceOf(id), 0);
  const totalValue = cash + holdingsValue;
  const totalReturn = totalValue - 1000;
  const totalPct = (totalReturn / 1000) * 100;

  // Allocation %
  const alloc = Object.fromEntries(ASSETS.map((a) => [a.id, ((holdings[a.id] || 0) * priceOf(a.id) / Math.max(1, totalValue)) * 100]));
  const cashAlloc = (cash / Math.max(1, totalValue)) * 100;

  // Buy/sell helpers
  const buy = (id, qty = 1) => {
    const p = priceOf(id);
    const cost = p * qty;
    if (cost > cash) return;
    setCash((c) => c - cost);
    setHoldings((h) => ({ ...h, [id]: (h[id] || 0) + qty }));
  };
  const sell = (id, qty = 1) => {
    if (!holdings[id] || holdings[id] < qty) return;
    setCash((c) => c + priceOf(id) * qty);
    setHoldings((h) => ({ ...h, [id]: h[id] - qty }));
  };
  const sellAll = (id) => sell(id, holdings[id] || 0);

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) { setPhase("done"); return; }
    setRound((r) => r + 1);
    setMonthInRound(0);
    setPhase("allocate");
  };

  if (phase === "research") {
    return (
      <PanelShell title="The Trading Floor" sub="Step 1 of 4 · Research" onClose={() => dispatch({ type: "CLOSE_PANEL" })} accent={C.bStocks} wide>
        <p style={{ fontSize: 14, color: C.text, lineHeight: 1.55, margin: "0 0 16px" }}>
          Welcome to the floor. You have <strong>₺1,000</strong> to invest over <strong>two years</strong> (four rounds, six months each).
          Real markets. Real news. Pause anytime to rebalance. Start by learning what you can buy.
        </p>
        <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, margin: "0 0 14px", fontStyle: "italic" }}>💡 Tap any asset to read about it. Diversifying across stocks, bonds, real estate and commodities reduces your risk.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
          {ASSETS.map((a) => (
            <button key={a.id} onClick={() => setInfoAsset(a)} style={{ background: C.surface2, border: `1.5px solid ${C.borderCream}`, borderLeft: `4px solid ${a.color}`, padding: 10, borderRadius: 4, cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 8, fontFamily: FONT_M, color: C.textMuted, letterSpacing: "0.2em", fontWeight: 700 }}>{a.cls}</span>
                <span style={{ fontSize: 8, fontFamily: FONT_M, color: a.risk.includes("VERY") || a.risk === "HIGH" ? C.coral : a.risk === "MEDIUM" ? C.gold : C.teal, letterSpacing: "0.1em", fontWeight: 700 }}>{a.risk}</span>
              </div>
              <div style={{ fontFamily: FONT_D, fontSize: 14, color: C.ink, fontWeight: 700, marginTop: 2 }}>{a.name}</div>
              <div style={{ fontFamily: FONT_M, fontSize: 10, color: C.textMuted, marginTop: 2 }}>{fmtD(a.basePrice)} · {a.yieldPct > 0 ? `${a.yieldPct}% yield` : "no yield"}</div>
            </button>
          ))}
        </div>
        <button onClick={() => setPhase("allocate")} style={{ width: "100%", background: C.bStocks, color: "#fff", border: "none", padding: "14px", fontFamily: FONT_M, fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", cursor: "pointer", borderRadius: 4 }}>
          GOT IT · BUILD MY PORTFOLIO →
        </button>
        {infoAsset && <AssetInfoModal asset={infoAsset} onClose={() => setInfoAsset(null)} />}
      </PanelShell>
    );
  }

  if (phase === "allocate") {
    return (
      <PanelShell title="Build Your Portfolio" sub={`Round ${round} of ${TOTAL_ROUNDS} · Allocate`} onClose={() => dispatch({ type: "CLOSE_PANEL" })} accent={C.bStocks} wide>
        <div style={{ background: C.ink, color: C.surface, padding: "12px 18px", borderRadius: 4, marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontFamily: FONT_M }}>
          <div><div style={{ fontSize: 9, opacity: 0.6, letterSpacing: "0.22em", fontWeight: 700 }}>CASH</div><div style={{ fontSize: 22, color: C.gold, fontWeight: 700 }}>{fmtD(cash)}</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, opacity: 0.6, letterSpacing: "0.22em", fontWeight: 700 }}>INVESTED</div><div style={{ fontSize: 22, color: C.teal, fontWeight: 700 }}>{fmtD(holdingsValue)}</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 9, opacity: 0.6, letterSpacing: "0.22em", fontWeight: 700 }}>TOTAL</div><div style={{ fontSize: 22, color: C.surface, fontWeight: 700 }}>{fmtD(totalValue)}</div></div>
        </div>
        <AllocationBar alloc={alloc} cashAlloc={cashAlloc} assets={ASSETS} />
        <div style={{ marginTop: 14, marginBottom: 14, maxHeight: 280, overflowY: "auto" }}>
          {["STOCK", "BOND", "REAL ESTATE", "COMMODITY"].map((cls) => (
            <div key={cls} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.textMuted, letterSpacing: "0.25em", fontWeight: 700, marginBottom: 6 }}>{cls === "STOCK" ? "STOCKS" : cls === "BOND" ? "BONDS" : cls + "S"}</div>
              {ASSETS.filter((a) => a.cls === cls).map((a) => (
                <AssetRow key={a.id} asset={a} qty={holdings[a.id] || 0} price={priceOf(a.id)} canBuy={priceOf(a.id) <= cash} buy={() => buy(a.id)} sell={() => sell(a.id)} sellAll={() => sellAll(a.id)} onInfo={() => setInfoAsset(a)} />
              ))}
            </div>
          ))}
        </div>
        <button onClick={() => setPhase("playing")} style={{ width: "100%", background: C.bStocks, color: "#fff", border: "none", padding: "14px", fontFamily: FONT_M, fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", cursor: "pointer", borderRadius: 4 }}>
          ▶ RUN 6 MONTHS → ROUND {round} OF {TOTAL_ROUNDS}
        </button>
        {infoAsset && <AssetInfoModal asset={infoAsset} onClose={() => setInfoAsset(null)} />}
      </PanelShell>
    );
  }

  if (phase === "playing" || phase === "paused") {
    const paused = phase === "paused";
    return (
      <PanelShell title={paused ? "Markets Paused" : `Running · Round ${round}`} sub={`Month ${monthInRound} / 6`} onClose={() => dispatch({ type: "CLOSE_PANEL" })} accent={paused ? C.gold : C.bStocks} wide>
        <div style={{ background: C.ink, color: C.surface, padding: "12px 18px", borderRadius: 4, marginBottom: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 90px", gap: 12, fontFamily: FONT_M, alignItems: "center" }}>
          <div><div style={{ fontSize: 9, opacity: 0.6, letterSpacing: "0.22em", fontWeight: 700 }}>TOTAL</div><div style={{ fontSize: 22, color: C.surface, fontWeight: 700 }}>{fmtD(totalValue)}</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, opacity: 0.6, letterSpacing: "0.22em", fontWeight: 700 }}>RETURN</div><div style={{ fontSize: 22, color: totalReturn >= 0 ? C.green : C.red, fontWeight: 700 }}>{totalReturn >= 0 ? "+" : ""}{totalPct.toFixed(1)}%</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, opacity: 0.6, letterSpacing: "0.22em", fontWeight: 700 }}>CASH</div><div style={{ fontSize: 22, color: C.gold, fontWeight: 700 }}>{fmtD(cash)}</div></div>
          <button onClick={() => setPhase(paused ? "playing" : "paused")} style={{ background: paused ? C.green : C.gold, color: "#fff", border: "none", padding: "10px", fontFamily: FONT_M, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer", borderRadius: 3 }}>{paused ? "▶ RESUME" : "⏸ PAUSE"}</button>
        </div>
        {activeEvent && !paused && (
          <div className="popupIn" style={{ background: C.coral, color: "#fff", padding: "10px 16px", borderRadius: 4, marginBottom: 10, fontFamily: FONT_M, fontSize: 12, fontWeight: 600 }}>
            📢 <strong>BREAKING:</strong> {activeEvent.t}
          </div>
        )}
        <AllocationBar alloc={alloc} cashAlloc={cashAlloc} assets={ASSETS} />
        <div style={{ marginTop: 12, maxHeight: 320, overflowY: "auto" }}>
          {ASSETS.map((a) => {
            const h = history[a.id] || [a.basePrice];
            const cur = priceOf(a.id);
            const startPrice = h[0] || a.basePrice;
            const change = ((cur - startPrice) / startPrice) * 100;
            const positive = change >= 0;
            const min = Math.min(...h), max = Math.max(...h), range = (max - min) || 1;
            return (
              <div key={a.id} style={{ background: C.surface2, padding: 9, borderRadius: 4, border: `1.5px solid ${C.borderCream}`, borderLeft: `4px solid ${a.color}`, display: "grid", gridTemplateColumns: "150px 1fr 70px 110px", gap: 10, alignItems: "center", marginBottom: 6 }}>
                <div onClick={() => setInfoAsset(a)} style={{ cursor: "pointer" }}>
                  <div style={{ fontSize: 8, fontFamily: FONT_M, color: C.textMuted, letterSpacing: "0.15em", fontWeight: 700 }}>{a.cls}</div>
                  <div style={{ fontFamily: FONT_D, fontSize: 13, color: C.ink, fontWeight: 800 }}>{a.name} <span style={{ fontSize: 9, color: C.purple }}>ⓘ</span></div>
                  <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                    <span style={{ fontFamily: FONT_D, fontSize: 17, color: C.ink, fontWeight: 700 }}>{fmtD(cur)}</span>
                    <span style={{ fontFamily: FONT_M, fontSize: 10, color: positive ? C.green : C.red, fontWeight: 700 }}>{positive ? "▲" : "▼"}{Math.abs(change).toFixed(1)}%</span>
                  </div>
                </div>
                <svg viewBox="0 0 200 40" preserveAspectRatio="none" style={{ width: "100%", height: 40 }}>
                  <rect width="200" height="40" fill={C.surface} stroke={C.borderCream} strokeWidth="1" />
                  {h.length > 1 && (
                    <>
                      <polyline fill={positive ? C.green : C.red} fillOpacity="0.12" points={`0,40 ${h.map((p, i) => `${(i / (h.length - 1)) * 200},${40 - ((p - min) / range) * 32 - 4}`).join(" ")} 200,40`} />
                      <polyline fill="none" stroke={positive ? C.green : C.red} strokeWidth="1.8" points={h.map((p, i) => `${(i / (h.length - 1)) * 200},${40 - ((p - min) / range) * 32 - 4}`).join(" ")} />
                    </>
                  )}
                </svg>
                <div style={{ fontFamily: FONT_M, fontSize: 11, color: holdings[a.id] ? C.ink : C.textMuted, textAlign: "right", fontWeight: 700 }}>
                  {holdings[a.id] ? `${holdings[a.id]} units` : "—"}
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  <button onClick={() => buy(a.id)} disabled={cur > cash} style={{ flex: 1, background: cur > cash ? C.surface3 : C.green, color: cur > cash ? C.textDim : "#fff", border: "none", padding: "6px 4px", fontFamily: FONT_M, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", cursor: cur > cash ? "not-allowed" : "pointer", borderRadius: 3 }}>BUY</button>
                  <button onClick={() => sell(a.id)} disabled={!holdings[a.id]} style={{ flex: 1, background: !holdings[a.id] ? C.surface3 : C.red, color: !holdings[a.id] ? C.textDim : "#fff", border: "none", padding: "6px 4px", fontFamily: FONT_M, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", cursor: !holdings[a.id] ? "not-allowed" : "pointer", borderRadius: 3 }}>SELL</button>
                </div>
              </div>
            );
          })}
        </div>
        {paused && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: `${C.gold}18`, borderLeft: `3px solid ${C.gold}`, borderRadius: 4, fontSize: 12, color: C.text, lineHeight: 1.5 }}>
            ⏸ <strong>Markets paused.</strong> Rebalance freely. Hit RESUME to continue the round.
          </div>
        )}
        {infoAsset && <AssetInfoModal asset={infoAsset} onClose={() => setInfoAsset(null)} />}
      </PanelShell>
    );
  }

  if (phase === "review") {
    // Show what happened during this round
    const roundEvents = eventLog.filter((e) => e.round === round);
    return (
      <PanelShell title={`6 Months Done · Round ${round}`} sub={`Total: ${fmtD(totalValue)}`} onClose={() => dispatch({ type: "CLOSE_PANEL" })} accent={C.gold} wide>
        <div style={{ background: totalReturn >= 0 ? `${C.green}15` : `${C.red}15`, padding: 16, borderRadius: 4, marginBottom: 14, borderLeft: `4px solid ${totalReturn >= 0 ? C.green : C.red}`, textAlign: "center" }}>
          <div style={{ fontSize: 10, fontFamily: FONT_M, color: totalReturn >= 0 ? C.green : C.red, letterSpacing: "0.25em", fontWeight: 700 }}>{totalReturn >= 0 ? "ROUND PROFIT" : "ROUND LOSS"}</div>
          <div style={{ fontFamily: FONT_D, fontSize: 42, color: totalReturn >= 0 ? C.green : C.red, fontWeight: 800 }}>{totalReturn >= 0 ? "+" : ""}{totalPct.toFixed(1)}%</div>
          <div style={{ fontSize: 12, color: C.textMuted, fontFamily: FONT_M }}>Started ₺1,000 · Now {fmtD(totalValue)}</div>
        </div>
        {roundEvents.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.coral, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 8 }}>WHAT HAPPENED THIS ROUND</div>
            {roundEvents.map((e, i) => (
              <div key={i} style={{ background: C.surface2, padding: 10, borderRadius: 4, marginBottom: 6, borderLeft: `3px solid ${C.coral}` }}>
                <div style={{ fontFamily: FONT_D, fontSize: 13, color: C.ink, fontWeight: 700 }}>Month {e.month}: {e.ev.t}</div>
                <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.4, marginTop: 2 }}>{e.ev.body}</div>
              </div>
            ))}
          </div>
        )}
        <AllocationBar alloc={alloc} cashAlloc={cashAlloc} assets={ASSETS} />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={() => { setPhase("allocate"); }} style={{ flex: 1, background: "transparent", color: C.bStocks, border: `1.5px solid ${C.bStocks}`, padding: "12px", fontFamily: FONT_M, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", cursor: "pointer", borderRadius: 4 }}>REBALANCE</button>
          <button onClick={nextRound} style={{ flex: 1, background: C.bStocks, color: "#fff", border: "none", padding: "12px", fontFamily: FONT_M, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", cursor: "pointer", borderRadius: 4 }}>
            {round >= TOTAL_ROUNDS ? "FINISH →" : `NEXT ROUND ${round + 1} →`}
          </button>
        </div>
      </PanelShell>
    );
  }

  if (phase === "done") {
    let lesson;
    if (totalPct > 40) lesson = { title: "Standout year", body: "You significantly beat the index. Either skill or luck — over two years it's hard to tell. Most professional managers don't do this." };
    else if (totalPct > 15) lesson = { title: "Solid run", body: "You compounded steadily. This is what good long-term investing looks like — boring, patient, diversified." };
    else if (totalPct > 0) lesson = { title: "You kept up with inflation", body: "Better than cash, but not by much. Often the difference between mediocre and great returns is one or two big concentrated bets." };
    else lesson = { title: "Markets ate you up", body: "Two years isn't long. Even diversified portfolios lose money sometimes. This is why the long-run matters and why timing the market is hard." };

    const winners = Object.entries(holdings).filter(([, q]) => q > 0).map(([id]) => ASSETS.find((a) => a.id === id)).filter(Boolean);

    return (
      <PanelShell title="2 Years Done" sub="Final results" onClose={() => { dispatch({ type: "SAVE_STOCK_RESULT", result: { totalValue, totalPct } }); dispatch({ type: "CLOSE_PANEL" }); }} accent={totalPct >= 0 ? C.green : C.red} wide>
        <div style={{ background: totalPct >= 0 ? `${C.green}15` : `${C.red}15`, padding: 22, borderRadius: 4, marginBottom: 16, borderLeft: `4px solid ${totalPct >= 0 ? C.green : C.red}`, textAlign: "center" }}>
          <div style={{ fontSize: 10, fontFamily: FONT_M, color: totalPct >= 0 ? C.green : C.red, letterSpacing: "0.28em", fontWeight: 700 }}>TWO-YEAR RETURN</div>
          <div style={{ fontFamily: FONT_D, fontSize: 56, color: totalPct >= 0 ? C.green : C.red, fontWeight: 800, lineHeight: 1 }}>{totalPct >= 0 ? "+" : ""}{totalPct.toFixed(1)}%</div>
          <div style={{ fontSize: 14, color: C.text, marginTop: 6, fontFamily: FONT_M }}>₺1,000 → <strong>{fmtD(totalValue)}</strong></div>
        </div>
        <div style={{ background: C.surface2, padding: 14, borderRadius: 4, marginBottom: 12, borderLeft: `3px solid ${C.gold}` }}>
          <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.gold, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 4 }}>WHAT THAT TELLS US</div>
          <div style={{ fontFamily: FONT_D, fontSize: 16, color: C.ink, fontWeight: 700 }}>{lesson.title}</div>
          <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5, marginTop: 4 }}>{lesson.body}</div>
        </div>
        {winners.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.textMuted, letterSpacing: "0.2em", fontWeight: 700, marginBottom: 6 }}>YOUR FINAL PORTFOLIO</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {winners.map((w) => (
                <div key={w.id} style={{ padding: 8, background: C.surface2, borderLeft: `3px solid ${w.color}`, borderRadius: 3 }}>
                  <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.textMuted, letterSpacing: "0.15em", fontWeight: 700 }}>{w.cls}</div>
                  <div style={{ fontFamily: FONT_D, fontSize: 12, color: C.ink, fontWeight: 700 }}>{w.name}</div>
                  <div style={{ fontSize: 10, fontFamily: FONT_M, color: C.textMuted }}>{holdings[w.id]} units · {fmtD(holdings[w.id] * priceOf(w.id))}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={() => { dispatch({ type: "SAVE_STOCK_RESULT", result: { totalValue, totalPct } }); dispatch({ type: "CLOSE_PANEL" }); }} style={{ width: "100%", background: C.ink, color: C.gold, border: "none", padding: "14px", fontFamily: FONT_M, fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", cursor: "pointer", borderRadius: 4 }}>LEAVE THE FLOOR</button>
      </PanelShell>
    );
  }

  return null;
}

function AssetRow({ asset, qty, price, canBuy, buy, sell, sellAll, onInfo }) {
  return (
    <div style={{ background: C.surface2, padding: 8, marginBottom: 5, borderRadius: 4, borderLeft: `3px solid ${asset.color}`, display: "grid", gridTemplateColumns: "1fr 80px 140px", gap: 10, alignItems: "center" }}>
      <div onClick={onInfo} style={{ cursor: "pointer" }}>
        <div style={{ fontFamily: FONT_D, fontSize: 13, color: C.ink, fontWeight: 700 }}>{asset.name} <span style={{ fontSize: 9, color: C.purple }}>ⓘ</span></div>
        <div style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_M, marginTop: 2 }}>{asset.cls} · {asset.risk} · {asset.yieldPct > 0 ? `${asset.yieldPct}% yield` : "no yield"}</div>
      </div>
      <div style={{ textAlign: "right", fontFamily: FONT_D, fontSize: 16, color: C.ink, fontWeight: 700 }}>{fmtD(price)}</div>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button onClick={buy} disabled={!canBuy} style={{ flex: 1, background: !canBuy ? C.surface3 : C.green, color: !canBuy ? C.textDim : "#fff", border: "none", padding: "7px 4px", fontFamily: FONT_M, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", cursor: !canBuy ? "not-allowed" : "pointer", borderRadius: 3 }}>BUY</button>
        <div style={{ minWidth: 28, textAlign: "center", fontFamily: FONT_M, fontSize: 11, fontWeight: 700, color: C.ink }}>{qty}</div>
        <button onClick={sell} disabled={qty < 1} style={{ flex: 1, background: qty < 1 ? C.surface3 : C.red, color: qty < 1 ? C.textDim : "#fff", border: "none", padding: "7px 4px", fontFamily: FONT_M, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", cursor: qty < 1 ? "not-allowed" : "pointer", borderRadius: 3 }}>SELL</button>
      </div>
    </div>
  );
}

function AllocationBar({ alloc, cashAlloc, assets }) {
  const items = [{ id: "_cash", pct: cashAlloc, color: C.gold, label: "Cash" }, ...assets.map((a) => ({ id: a.id, pct: alloc[a.id] || 0, color: a.color, label: a.name })).filter((x) => x.pct > 0.5)];
  return (
    <div>
      <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.textMuted, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 6 }}>YOUR ALLOCATION</div>
      <div style={{ display: "flex", height: 16, background: C.surface3, borderRadius: 3, overflow: "hidden" }}>
        {items.map((it) => it.pct > 0.5 && (
          <div key={it.id} style={{ width: `${it.pct}%`, background: it.color, transition: "width 0.4s ease" }} title={`${it.label}: ${it.pct.toFixed(1)}%`} />
        ))}
      </div>
      <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
        {items.filter((it) => it.pct > 0.5).map((it) => (
          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 9, height: 9, background: it.color, borderRadius: 2 }} />
            <span style={{ fontSize: 10, fontFamily: FONT_M, color: C.text }}>{it.label} <strong>{it.pct.toFixed(0)}%</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetInfoModal({ asset, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,5,20,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 8 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, border: `2px solid ${asset.color}`, padding: 22, maxWidth: 460, width: "100%", borderRadius: 6, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: FONT_M, color: asset.color, letterSpacing: "0.22em", fontWeight: 700 }}>{asset.cls}</div>
            <div style={{ fontFamily: FONT_D, fontSize: 22, color: C.ink, fontWeight: 800 }}>{asset.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1.5px solid ${C.borderCream}`, width: 30, height: 30, borderRadius: 4, cursor: "pointer", fontSize: 16, fontFamily: FONT_M }}>×</button>
        </div>
        <div style={{ background: C.surface2, padding: 12, borderRadius: 4, marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.55 }}>{asset.info}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ background: C.surface2, padding: 10, borderRadius: 4, borderLeft: `3px solid ${asset.risk.includes("VERY HIGH") || asset.risk === "HIGH" ? C.coral : asset.risk === "MEDIUM" ? C.gold : C.teal}` }}>
            <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.textMuted, letterSpacing: "0.2em", fontWeight: 700 }}>RISK</div>
            <div style={{ fontFamily: FONT_D, fontSize: 14, color: C.ink, fontWeight: 700 }}>{asset.risk}</div>
          </div>
          <div style={{ background: C.surface2, padding: 10, borderRadius: 4, borderLeft: `3px solid ${C.gold}` }}>
            <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.textMuted, letterSpacing: "0.2em", fontWeight: 700 }}>YIELD</div>
            <div style={{ fontFamily: FONT_D, fontSize: 14, color: C.ink, fontWeight: 700 }}>{asset.yieldPct > 0 ? `${asset.yieldPct}% pa` : "none"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BANK PANEL · "FUTURE YOU" GAME ────────────────────────
function BankPanel({ state, dispatch }) {
  // Phases: setup | playing | done
  const [phase, setPhase] = useState("setup");
  const [baseSave, setBaseSave] = useState(100); // monthly baseline
  const [year, setYear] = useState(0);
  const [balance, setBalance] = useState(0);
  const [stress, setStress] = useState(25);
  const [balanceHistory, setBalanceHistory] = useState([0]);
  const [stressHistory, setStressHistory] = useState([25]);
  const [log, setLog] = useState([]); // moments + choices
  const [currentMoment, setCurrentMoment] = useState(null);

  const RATE = 0.05;
  const TOTAL_YEARS = 5;

  // Every year there's a "moment" — a choice. Each choice affects both lines.
  // The lines RACE — both go up, but ratio shifts based on decisions.
  const MOMENTS = [
    {
      year: 1,
      title: "First raise. ₺200/month more.",
      body: "Six months in, the boss bumped you up. New money in the account. What do you do?",
      options: [
        { label: "Save all of it", balanceChange: +1800, stressChange: +6, lesson: "Maxed the windfall. Balance jumped. Stress crept too — you're holding tight." },
        { label: "Save half, enjoy half", balanceChange: +900, stressChange: -2, lesson: "Best of both worlds. Balance grew, stress eased. The textbook move." },
        { label: "Enjoy the lot", balanceChange: 0, stressChange: -8, lesson: "Lifestyle inflated. You felt lighter but the line stayed flat. Compounding lost a year." },
      ],
    },
    {
      year: 2,
      title: "Your best friend's wedding in Greece.",
      body: "₺600 all-in. Flights, hotel, gift. You weren't budgeting for it.",
      options: [
        { label: "Go. Use the savings.", balanceChange: -600, stressChange: -4, lesson: "You went. Photos for a lifetime. Balance took a hit; stress went down. This is what savings are for." },
        { label: "Skip it. Save the money.", balanceChange: 0, stressChange: +14, lesson: "Saved ₺600. Missed the wedding. Friend stopped texting back. Stress climbed harder than the saving." },
        { label: "Half-attend (day trip)", balanceChange: -300, stressChange: +2, lesson: "Compromise. Half the joy, half the cost. Felt smart at the time. Still slightly weird." },
      ],
    },
    {
      year: 3,
      title: "Tight month. Car broke down.",
      body: "Repair: ₺800. You don't have it cashflow.",
      options: [
        { label: "Use savings", balanceChange: -800, stressChange: -3, lesson: "Emergency fund did its job. Balance dropped but the alternative was credit card debt." },
        { label: "Credit card at 18% APR", balanceChange: -144, stressChange: +18, lesson: "Saved your balance for now but ₺144 of interest by year-end. Debt compounds against you." },
        { label: "Cut out everything for 3 months", balanceChange: 0, stressChange: +22, lesson: "No social life for 12 weeks. Balance held — stress went through the roof. Burnout territory." },
      ],
    },
    {
      year: 4,
      title: "Tax refund: ₺900",
      body: "Unexpected money. How does it feel best?",
      options: [
        { label: "Add it all to savings", balanceChange: +900, stressChange: +3, lesson: "Discipline. Balance up sharply. Tiny stress bump — you felt the restraint." },
        { label: "Split: ₺500 save, ₺400 fun", balanceChange: +500, stressChange: -6, lesson: "Balance up, stress down. Honestly the right answer most of the time." },
        { label: "Treat yourself fully", balanceChange: 0, stressChange: -12, lesson: "Joy now. Balance flat. Sometimes you just need the holiday." },
      ],
    },
    {
      year: 5,
      title: "End of year five. Burnout knocking.",
      body: "You've been heads-down for years. The body is starting to ask questions.",
      options: [
        { label: "Take 6 weeks off (unpaid)", balanceChange: -2200, stressChange: -25, lesson: "Sabbatical. Balance hit hard but you came back as a person, not a husk." },
        { label: "Just keep going", balanceChange: +baseSave * 12, stressChange: +12, lesson: "Pushed through. Balance grew but stress is at the wheel now. This doesn't end well." },
        { label: "Switch to a less-paid easier job", balanceChange: +baseSave * 6, stressChange: -15, lesson: "Took the easier road. Half the saving. Half the stress. Whole life back." },
      ],
    },
  ];

  // Year ticker — runs continuously and triggers moments
  useEffect(() => {
    if (phase !== "playing") return;
    if (currentMoment) return; // wait for player
    if (year >= TOTAL_YEARS) { setPhase("done"); return; }
    const id = setTimeout(() => {
      // Baseline year: balance grows by base savings + interest; stress drifts by base
      const baseStress = baseSave <= 50 ? 1 : baseSave <= 100 ? 3 : baseSave <= 150 ? 6 : baseSave <= 200 ? 10 : 14;
      setBalance((b) => {
        const newB = b * (1 + RATE) + baseSave * 12;
        setBalanceHistory((h) => [...h, newB]);
        return newB;
      });
      setStress((sr) => {
        const newS = Math.max(0, Math.min(100, sr + baseStress));
        setStressHistory((h) => [...h, newS]);
        return newS;
      });
      const nextYear = year + 1;
      setYear(nextYear);
      // Trigger moment if defined
      const m = MOMENTS.find((mm) => mm.year === nextYear);
      if (m) setCurrentMoment(m);
    }, 900);
    return () => clearTimeout(id);
  }, [phase, year, baseSave, currentMoment]);

  const chooseOption = (opt) => {
    setBalance((b) => {
      const newB = Math.max(0, b + opt.balanceChange);
      setBalanceHistory((h) => [...h.slice(0, -1), newB]);
      return newB;
    });
    setStress((sr) => {
      const newS = Math.max(0, Math.min(100, sr + opt.stressChange));
      setStressHistory((h) => [...h.slice(0, -1), newS]);
      return newS;
    });
    setLog((l) => [...l, { year, title: currentMoment.title, choice: opt.label, lesson: opt.lesson, balanceChange: opt.balanceChange, stressChange: opt.stressChange }]);
    setCurrentMoment(null);
  };

  const restart = () => {
    setPhase("setup"); setYear(0); setBalance(0); setStress(25);
    setBalanceHistory([0]); setStressHistory([25]); setLog([]); setCurrentMoment(null);
  };

  if (phase === "setup") {
    return (
      <PanelShell title="Future You" sub="A five-year saving simulation" onClose={() => dispatch({ type: "CLOSE_PANEL" })} accent={C.bBank}>
        <p style={{ fontSize: 14, color: C.text, lineHeight: 1.55, margin: "0 0 14px" }}>You just saw what the prices are doing at the market. Now you need to actually decide: how much can you put aside each month, given everything else life will throw at you?</p>
        <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.55, marginBottom: 16, fontStyle: "italic" }}>The chart shows two lines. <strong style={{ color: C.green }}>Green is your balance.</strong> <strong style={{ color: C.coral }}>Red is your stress.</strong> Both grow over five years. Your job is to keep them from racing each other into the ceiling.</p>
        <div style={{ background: C.surface2, padding: 16, borderRadius: 4, borderLeft: `4px solid ${C.bBank}` }}>
          <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.textMuted, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 8 }}>HOW MUCH PER MONTH?</div>
          <input type="range" min="25" max="300" step="25" value={baseSave} onChange={(e) => setBaseSave(parseInt(e.target.value))} style={{ width: "100%", accentColor: C.bBank }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: FONT_M, fontSize: 11, fontWeight: 600 }}>
            <span style={{ color: C.textMuted }}>₺25</span>
            <span style={{ color: C.bBank, fontSize: 22, fontFamily: FONT_D, fontWeight: 700 }}>₺{baseSave} / mo</span>
            <span style={{ color: C.textMuted }}>₺300</span>
          </div>
          <div style={{ fontSize: 12, color: C.text, marginTop: 10, lineHeight: 1.45, fontStyle: "italic" }}>
            {baseSave <= 50 ? "Easy. Won't move the needle much, but you'll barely notice." : baseSave <= 100 ? "Comfortable habit. Most months you won't feel it." : baseSave <= 150 ? "Starts to bite. You'll think twice on dinners." : baseSave <= 200 ? "Real sacrifice. Holidays getting shorter." : "Spartan. You'll save loads. You'll resent it eventually."}
          </div>
        </div>
        <button onClick={() => setPhase("playing")} style={{ width: "100%", background: C.bBank, color: "#fff", border: "none", padding: "14px", fontFamily: FONT_M, fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", cursor: "pointer", borderRadius: 4, marginTop: 14 }}>
          ▶ RUN THE NEXT 5 YEARS
        </button>
      </PanelShell>
    );
  }

  if (phase === "done") {
    const finalBalance = balance;
    const finalStress = stress;
    let outcome;
    if (finalStress > 75) outcome = { title: "Burnt out, but loaded", body: "You saved like a champion. You're also fried. Money is one resource. Energy is another." };
    else if (finalStress < 35 && finalBalance > 3000) outcome = { title: "Balanced and built", body: "Solid balance, manageable stress. You learned to choose. The textbook outcome." };
    else if (finalBalance < 2000) outcome = { title: "Easier, but light", body: "You enjoyed the journey but the balance is thin. Find ways to save more without sacrificing more." };
    else outcome = { title: "Steady. A bit of both.", body: "Some saved. Some lived. Roughly normal. Roughly fine." };

    return (
      <PanelShell title="Five years done" sub={`${fmt(finalBalance)} · stress ${finalStress}%`} onClose={() => { dispatch({ type: "SAVE_FUTURE_RESULT", result: { balance: finalBalance, stress: finalStress } }); dispatch({ type: "CLOSE_PANEL" }); }} accent={C.bBank} wide>
        <BankChart balanceHistory={balanceHistory} stressHistory={stressHistory} year={TOTAL_YEARS} totalYears={TOTAL_YEARS} moments={MOMENTS} />
        <div style={{ background: `${C.bBank}15`, padding: 18, borderRadius: 4, marginTop: 14, borderLeft: `4px solid ${C.bBank}` }}>
          <div style={{ fontSize: 10, fontFamily: FONT_M, color: C.bBank, letterSpacing: "0.25em", fontWeight: 700 }}>OUTCOME</div>
          <div style={{ fontFamily: FONT_D, fontSize: 22, color: C.ink, fontWeight: 800, marginTop: 2 }}>{outcome.title}</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, marginTop: 4 }}>{outcome.body}</div>
        </div>
        {log.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.textMuted, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 8 }}>WHAT YOU CHOSE</div>
            {log.map((l, i) => (
              <div key={i} style={{ background: C.surface2, padding: 10, marginBottom: 5, borderRadius: 4, borderLeft: `3px solid ${C.gold}` }}>
                <div style={{ fontFamily: FONT_D, fontSize: 13, color: C.ink, fontWeight: 700 }}>Year {l.year}: {l.title}</div>
                <div style={{ fontSize: 11.5, color: C.text, marginTop: 2 }}>Chose: <em>{l.choice}</em> → {l.lesson}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => { dispatch({ type: "SAVE_FUTURE_RESULT", result: { balance: finalBalance, stress: finalStress } }); dispatch({ type: "CLOSE_PANEL" }); }} style={{ width: "100%", background: C.ink, color: C.gold, border: "none", padding: "14px", fontFamily: FONT_M, fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", cursor: "pointer", borderRadius: 4, marginTop: 14 }}>LEAVE THE BANK</button>
      </PanelShell>
    );
  }

  // Playing phase
  return (
    <PanelShell title={currentMoment ? "Life happens" : "Five years passing..."} sub={`Year ${year} of ${TOTAL_YEARS} · saving ₺${baseSave}/mo`} onClose={() => { restart(); dispatch({ type: "CLOSE_PANEL" }); }} accent={C.bBank} wide>
      <BankChart balanceHistory={balanceHistory} stressHistory={stressHistory} year={year} totalYears={TOTAL_YEARS} moments={MOMENTS} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 14, marginBottom: 14 }}>
        <Tile label="BALANCE" value={fmt(balance)} color={C.green} />
        <Tile label="STRESS" value={`${stress}%`} color={stress > 70 ? C.coral : stress > 40 ? C.gold : C.green} />
        <Tile label="YEAR" value={`${year} / ${TOTAL_YEARS}`} color={C.bBank} />
      </div>
      {currentMoment ? (
        <div className="popupIn" style={{ background: `${C.coral}10`, border: `2px solid ${C.coral}55`, borderLeft: `4px solid ${C.coral}`, padding: 18, borderRadius: 4 }}>
          <div style={{ fontSize: 10, fontFamily: FONT_M, color: C.coral, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 6 }}>YEAR {currentMoment.year} · DECISION</div>
          <div style={{ fontFamily: FONT_D, fontSize: 20, color: C.ink, fontWeight: 700, marginBottom: 6 }}>{currentMoment.title}</div>
          <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.5, marginBottom: 14 }}>{currentMoment.body}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {currentMoment.options.map((opt, i) => (
              <button key={i} onClick={() => chooseOption(opt)} style={{ background: C.surface, border: `1.5px solid ${C.borderCream}`, padding: "12px 14px", fontFamily: FONT_B, fontSize: 13, fontWeight: 500, cursor: "pointer", borderRadius: 4, textAlign: "left", color: C.text, lineHeight: 1.4, transition: "all 0.15s" }} onMouseOver={(e) => e.currentTarget.style.borderColor = C.coral} onMouseOut={(e) => e.currentTarget.style.borderColor = C.borderCream}>
                <div style={{ fontFamily: FONT_D, fontSize: 14, color: C.ink, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, fontFamily: FONT_M }}>
                  <span style={{ color: opt.balanceChange >= 0 ? C.green : C.red, fontWeight: 700 }}>💰 {opt.balanceChange >= 0 ? "+" : ""}{fmt(opt.balanceChange)}</span>
                  <span style={{ color: opt.stressChange >= 0 ? C.red : C.green, fontWeight: 700 }}>😰 {opt.stressChange >= 0 ? "+" : ""}{opt.stressChange}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 14, fontSize: 13, color: C.text, fontStyle: "italic", background: C.surface2, borderLeft: `3px solid ${C.bBank}`, borderRadius: 4 }}>
          Time passing... <span style={{ display: "inline-block", animation: "pulse 1s infinite" }}>●</span>
        </div>
      )}
    </PanelShell>
  );
}

function BankChart({ balanceHistory, stressHistory, year, totalYears, moments }) {
  const maxBalance = Math.max(...balanceHistory, 1000);
  const CHART_W = 540, CHART_H = 200;
  const pointsBalance = balanceHistory.map((b, i) => `${(i / totalYears) * CHART_W},${CHART_H - (b / maxBalance) * (CHART_H - 30) - 15}`).join(" ");
  const pointsStress = stressHistory.map((s, i) => `${(i / totalYears) * CHART_W},${CHART_H - (s / 100) * (CHART_H - 30) - 15}`).join(" ");
  return (
    <div style={{ background: C.surface2, border: `1.5px solid ${C.borderCream}`, borderRadius: 4, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.textMuted, letterSpacing: "0.22em", fontWeight: 700 }}>RACE OVER 5 YEARS</div>
        <div style={{ display: "flex", gap: 12, fontSize: 9, fontFamily: FONT_M, fontWeight: 700, letterSpacing: "0.1em" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 14, height: 3, background: C.green }} />BALANCE</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 14, height: 3, background: C.coral }} />STRESS</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ width: "100%", height: CHART_H, display: "block" }}>
        <rect width={CHART_W} height={CHART_H} fill={C.surface} />
        {/* Year grid */}
        {Array.from({ length: totalYears + 1 }).map((_, i) => (
          <g key={i}>
            <line x1={(i / totalYears) * CHART_W} y1="0" x2={(i / totalYears) * CHART_W} y2={CHART_H} stroke={C.borderCream} strokeWidth="0.5" opacity="0.4" />
            <text x={(i / totalYears) * CHART_W + 2} y={CHART_H - 2} fontSize="9" fill={C.textMuted} fontFamily={FONT_M}>Y{i}</text>
          </g>
        ))}
        {/* Moment markers */}
        {moments.map((m, i) => (
          <line key={i} x1={(m.year / totalYears) * CHART_W} y1="6" x2={(m.year / totalYears) * CHART_W} y2={CHART_H - 14} stroke={year >= m.year ? C.coral : C.borderCream} strokeWidth="1" strokeDasharray="2,3" opacity={year >= m.year ? 0.55 : 0.25} />
        ))}
        {/* Filled area under balance */}
        {balanceHistory.length > 1 && (
          <polyline fill={C.green} fillOpacity="0.15" stroke="none" points={`0,${CHART_H} ${pointsBalance} ${(year / totalYears) * CHART_W},${CHART_H}`} />
        )}
        {/* Stress line */}
        {stressHistory.length > 1 && <polyline fill="none" stroke={C.coral} strokeWidth="2.5" points={pointsStress} />}
        {/* Balance line */}
        {balanceHistory.length > 1 && <polyline fill="none" stroke={C.green} strokeWidth="3" points={pointsBalance} />}
        {/* Current dots */}
        {balanceHistory.length > 0 && (
          <circle cx={(year / totalYears) * CHART_W} cy={CHART_H - (balanceHistory[balanceHistory.length - 1] / maxBalance) * (CHART_H - 30) - 15} r="5" fill={C.green} stroke={C.surface} strokeWidth="2" />
        )}
        {stressHistory.length > 0 && (
          <circle cx={(year / totalYears) * CHART_W} cy={CHART_H - (stressHistory[stressHistory.length - 1] / 100) * (CHART_H - 30) - 15} r="5" fill={C.coral} stroke={C.surface} strokeWidth="2" />
        )}
      </svg>
    </div>
  );
}


function Tile({ label, value, color }) {
  return (
    <div style={{ background: C.surface2, padding: "12px 14px", borderRadius: 4, border: `1.5px solid ${C.border}` }}>
      <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.textMuted, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: FONT_D, fontSize: 22, color, fontWeight: 600, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ─── MARKET PANEL ───────────────────────────────────────────
function MarketPanel({ state, dispatch }) {
  // Phases: shock (first time on q2) → choice → done
  const [phase, setPhase] = useState(state.activeQuest === "q2" || (state.activeQuest === "q3" && !state.marketShockSeen) ? "shock" : "browse");
  const [view, setView] = useState("chat");
  const inflMult = 1 + ((state.inflation - 2) / 100) * 8;

  // The shopping list — last week vs this week
  const ITEMS = [
    { name: "Loaf of bread", base: 1.8, icon: "🍞" },
    { name: "Litre of milk", base: 1.4, icon: "🥛" },
    { name: "Cooking oil", base: 4.5, icon: "🫒" },
    { name: "Eggs (dozen)", base: 5.2, icon: "🥚" },
    { name: "Rice (2kg)", base: 6.4, icon: "🌾" },
    { name: "Chicken (1kg)", base: 8.5, icon: "🍗" },
    { name: "Tomatoes (1kg)", base: 3.2, icon: "🍅" },
    { name: "Tea (200g)", base: 4.1, icon: "🍵" },
    { name: "Apples (1kg)", base: 2.8, icon: "🍎" },
    { name: "Pasta (500g)", base: 1.9, icon: "🍝" },
  ];
  const lastWeekTotal = ITEMS.reduce((s, i) => s + i.base, 0);
  const thisWeekTotal = ITEMS.reduce((s, i) => s + i.base * inflMult, 0);
  const extra = thisWeekTotal - lastWeekTotal;
  const planned = 100; // wallet for shopping
  const overBy = thisWeekTotal - planned;

  if (phase === "shock") {
    return (
      <PanelShell title="Amara's Market" sub="The chalkboard's been redone again" onClose={() => { dispatch({ type: "CLOSE_PANEL" }); }} accent={C.coral} wide>
        <div style={{ background: `${C.coral}10`, borderLeft: `4px solid ${C.coral}`, padding: 16, borderRadius: 4, marginBottom: 14 }}>
          <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.coral, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 6 }}>AMARA, AT THE TILL</div>
          <div style={{ fontFamily: FONT_D, fontSize: 17, color: C.ink, fontWeight: 500, lineHeight: 1.5, fontStyle: "italic" }}>
            "Same shop, love. Same shelves. I just keep rewriting the prices. Sorry."
          </div>
        </div>

        <div style={{ background: C.surface2, borderRadius: 4, border: `1.5px solid ${C.borderCream}`, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ fontFamily: FONT_M, fontSize: 10, color: C.textMuted, letterSpacing: "0.22em", fontWeight: 700 }}>YOUR USUAL WEEKLY SHOP</div>
            <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.coral, letterSpacing: "0.18em", fontWeight: 700 }}>INFLATION {pct(state.inflation)}</div>
          </div>
          <div>
            {ITEMS.map((it, i) => {
              const newP = it.base * inflMult;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", borderBottom: i < ITEMS.length - 1 ? `1px solid ${C.border}30` : "none" }}>
                  <span style={{ fontSize: 18 }}>{it.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, color: C.text }}>{it.name}</span>
                  <span style={{ fontSize: 10, color: C.textDim, fontFamily: FONT_M, textDecoration: "line-through", minWidth: 36, textAlign: "right" }}>{fmt(it.base)}</span>
                  <span style={{ fontFamily: FONT_D, fontSize: 14, color: C.coral, fontWeight: 700, minWidth: 50, textAlign: "right" }}>{fmt(newP)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `2px solid ${C.coral}` }}>
            <span style={{ fontFamily: FONT_M, fontSize: 11, color: C.textMuted, letterSpacing: "0.2em", fontWeight: 700 }}>TOTAL</span>
            <span>
              <span style={{ fontSize: 13, color: C.textDim, fontFamily: FONT_M, textDecoration: "line-through", marginRight: 8 }}>{fmt(lastWeekTotal)}</span>
              <span style={{ fontFamily: FONT_D, fontSize: 24, color: C.coral, fontWeight: 800 }}>{fmt(thisWeekTotal)}</span>
            </span>
          </div>
          <div style={{ textAlign: "right", marginTop: 4, fontFamily: FONT_M, fontSize: 11, color: C.coral, fontWeight: 700 }}>
            +{fmt(extra)} more than last week ({Math.round((extra / lastWeekTotal) * 100)}% up)
          </div>
        </div>

        <div style={{ background: C.ink, padding: 14, borderRadius: 4, marginBottom: 14 }}>
          <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.gold, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 4 }}>YOUR INNER MONOLOGUE</div>
          <div style={{ fontFamily: FONT_H, fontSize: 18, color: C.surface, lineHeight: 1.45 }}>
            You'd budgeted {fmt(planned)} for this. The full shop is {fmt(thisWeekTotal)}. {overBy > 0 ? `That's ${fmt(overBy)} over.` : ""} You can't both eat well and save what you planned this month. Something has to give.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => { dispatch({ type: "ADD_NOTE", note: { from: "Amara's Market", text: `Weekly shop went from ${fmt(lastWeekTotal)} to ${fmt(thisWeekTotal)}. Same basket. Same shop. Just chalkboard maths.` } }); setPhase("browse"); }} style={{ background: C.coral, color: "#fff", border: "none", padding: "13px", fontFamily: FONT_M, fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer", borderRadius: 4 }}>
            BUY THE FULL SHOP · {fmt(thisWeekTotal)} <span style={{ opacity: 0.85, fontSize: 10 }}>(eat well, save less)</span>
          </button>
          <button onClick={() => { dispatch({ type: "ADD_NOTE", note: { from: "Amara's Market", text: `Couldn't afford the full shop. Skipped meat, dropped to own-brand. Saved ${fmt(thisWeekTotal - planned)}. Felt small.` } }); setPhase("browse"); }} style={{ background: C.gold, color: C.ink, border: "none", padding: "13px", fontFamily: FONT_M, fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer", borderRadius: 4 }}>
            CUT BACK · KEEP TO {fmt(planned)} <span style={{ opacity: 0.85, fontSize: 10 }}>(skip meat, drop to own-brand)</span>
          </button>
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell title="Amara's Market" sub="7th Street · high street" onClose={() => dispatch({ type: "CLOSE_PANEL" })} accent={C.coral} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <button onClick={() => { setView("chat"); dispatch({ type: "TALK_NPC", note: { from: "Amara (market)", text: state.inflation > 4 ? "Suppliers raising prices every week. Chalkboard's been redone twice this month. Eldest at uni — don't know how to keep both going." : "Tight. Trying not to pass it all on. Can't eat the difference forever." } }); }} style={{ background: view === "chat" ? `${C.coral}22` : C.surface2, border: `1.5px solid ${view === "chat" ? C.coral : C.border}`, padding: "11px", fontFamily: FONT_M, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", cursor: "pointer", borderRadius: 4 }}>💬 TALK TO AMARA</button>
        <button onClick={() => setView("prices")} style={{ background: view === "prices" ? `${C.coral}22` : C.surface2, border: `1.5px solid ${view === "prices" ? C.coral : C.border}`, padding: "11px", fontFamily: FONT_M, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", cursor: "pointer", borderRadius: 4 }}>📋 SEE PRICES</button>
      </div>

      {view === "chat" && (
        <div style={{ background: C.surface2, padding: 16, borderLeft: `3px solid ${C.coral}`, borderRadius: 4 }}>
          <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.coral, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 6 }}>AMARA</div>
          <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.65 }}>
            <p>"Twenty years I've had this shop. Took it over from my dad in '06."</p>
            <p style={{ marginTop: 10 }}>"My supplier put the oil up again last week. Same with the bread flour. I write a new chalkboard every Monday. People look at it longer than they used to."</p>
            <p style={{ marginTop: 10, fontStyle: "italic", color: C.textMuted }}>She glances at your Reserve lanyard.</p>
            <p style={{ marginTop: 6 }}>"You're young to be working there. You'll be alright. Just don't forget what a chalkboard costs to redo."</p>
          </div>
        </div>
      )}

      {view === "prices" && (
        <div style={{ background: C.surface2, padding: 16, borderRadius: 4 }}>
          <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.coral, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 10 }}>THE CHALKBOARD · INFLATION {pct(state.inflation)}</div>
          {ITEMS.slice(0, 5).map((it, i) => {
            const p = it.base * inflMult;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontSize: 22 }}>{it.icon}</span>
                <span style={{ flex: 1, fontSize: 13, color: C.text }}>{it.name}</span>
                <span style={{ fontSize: 11, color: C.textDim, fontFamily: FONT_M, textDecoration: "line-through" }}>{fmt(it.base)}</span>
                <span style={{ fontFamily: FONT_D, fontSize: 16, color: p > it.base ? C.coral : C.green, fontWeight: 600, minWidth: 50, textAlign: "right" }}>{fmt(p)}</span>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={() => { dispatch({ type: "CLOSE_PANEL" }); }} style={{ width: "100%", background: C.ink, color: C.gold, border: "none", padding: "12px", fontFamily: FONT_M, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", cursor: "pointer", borderRadius: 4, marginTop: 14 }}>HEAD TO THE BANK NEXT →</button>
    </PanelShell>
  );
}

// ─── COFFEE PANEL ───────────────────────────────────────────
function CoffeePanel({ state, dispatch }) {
  const loanRepay = 800 * (1 + ((state.interestRate - 2) / 100) * 4);
  useEffect(() => {
    dispatch({ type: "TALK_NPC", note: { from: "Desta (coffee)", text: loanRepay > 1100 ? "Loan repayment 800 → 1200 in a year. Same loan, same business. Already let two drivers go." : "Loan crept up. Holding everyone on for now but it's tight." } });
  }, []); // eslint-disable-line

  return (
    <PanelShell title="Desta's Coffee" sub="Morash quarter" onClose={() => dispatch({ type: "CLOSE_PANEL" })} accent={C.bCoffee}>
      <div style={{ background: C.surface2, padding: 16, borderLeft: `3px solid ${C.bCoffee}`, borderRadius: 4, marginBottom: 14 }}>
        <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.bCoffee, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 6 }}>DESTA</div>
        <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.65 }}>
          <p>"Eight years. Started with one van and one regular run. Took a loan out in '21 to expand. Smartest thing I ever did. Until last year."</p>
          <p style={{ marginTop: 10 }}>"My repayment was ₺800 a month at the start. It's nearly twelve hundred now. Same loan. Same business."</p>
          <p style={{ marginTop: 10 }}>"Two daughters at home. They don't know any of this. I'd like to keep it that way."</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Tile label="HER LOAN REPAYMENT" value={`${fmt(loanRepay)}/mo`} color={loanRepay > 1000 ? C.coral : C.gold} />
        <Tile label="STARTED AT" value="₺800/mo" color={C.text} />
      </div>
      <button onClick={() => { dispatch({ type: "CLOSE_PANEL" }); }} style={{ width: "100%", background: C.coral, color: "#fff", border: "none", padding: "12px", fontFamily: FONT_M, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", cursor: "pointer" }}>☕ BUY A COFFEE · ₺3.50</button>
    </PanelShell>
  );
}

// ─── CINEMA PANEL ───────────────────────────────────────────
function CinemaPanel({ state, dispatch }) {
  return (
    <PanelShell title="Plaza Cinema" sub="Now showing: The Keldra Letters" onClose={() => dispatch({ type: "CLOSE_PANEL" })} accent={C.bCinema}>
      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, marginTop: 0, marginBottom: 16 }}>
        Marquee lights buzzing. A queue starting to form. Ticket: <strong style={{ color: C.coral }}>₺12</strong> (up from ₺10 last year).
      </p>
      <button onClick={() => { dispatch({ type: "CLOSE_PANEL" }); }} style={{ width: "100%", background: C.bCinema, color: "#fff", border: "none", padding: "13px", fontFamily: FONT_M, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", cursor: "pointer" }}>🎬 BUY A TICKET</button>
    </PanelShell>
  );
}

// ─── FLAT PANEL ─────────────────────────────────────────────
function FlatPanel({ state, dispatch }) {
  const [view, setView] = useState("evening");
  const canSleep = state.dayPhase === "personal" && (state.activeQuest === "q5" || state.activeQuest === "q6");
  const isMorning = state.dayPhase === "work";
  const wallet = state.wallet;
  const inBank = state.bankSaved;

  return (
    <PanelShell title="Your Flat" sub="Apartment 4B · top floor · 7:48pm" onClose={() => dispatch({ type: "CLOSE_PANEL" })} accent={C.bFlatD} wide>
      {/* Interior illustration */}
      <div style={{ background: "linear-gradient(180deg, #2a1438 0%, #4a2860 40%, #8a4870 100%)", borderRadius: 6, padding: 18, marginBottom: 14, position: "relative", overflow: "hidden", height: 180 }}>
        <svg viewBox="0 0 600 180" style={{ width: "100%", height: "100%", display: "block" }}>
          {/* Wall */}
          <rect x="0" y="0" width="600" height="180" fill="#3a1f50" />
          {/* Window with sunset (or morning) */}
          <rect x="40" y="20" width="170" height="110" fill={isMorning ? "#ffd28e" : "#ff8e6e"} />
          <rect x="40" y="20" width="170" height="55" fill={isMorning ? "#a8c8e8" : "#a04060"} />
          <line x1="125" y1="20" x2="125" y2="130" stroke="#2a1850" strokeWidth="3" />
          <line x1="40" y1="75" x2="210" y2="75" stroke="#2a1850" strokeWidth="3" />
          <rect x="36" y="16" width="178" height="118" fill="none" stroke="#1a0a06" strokeWidth="5" />
          {/* Sill plant */}
          <ellipse cx="125" cy="135" rx="14" ry="4" fill="#2a1438" />
          <path d="M 119 134 Q 117 122 113 116 M 125 134 Q 125 118 125 110 M 131 134 Q 133 122 137 118" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" />
          {/* Sofa */}
          <rect x="260" y="115" width="170" height="50" fill="#7a4060" rx="6" />
          <rect x="260" y="100" width="170" height="22" fill="#8a4870" rx="6" />
          {/* Lamp on side table */}
          <rect x="445" y="125" width="40" height="40" fill="#2a1438" />
          <rect x="455" y="90" width="20" height="35" fill="#1a0a06" />
          <ellipse cx="465" cy="85" rx="22" ry="14" fill={C.gold} opacity="0.9" />
          <circle cx="465" cy="85" r="32" fill={C.gold} opacity="0.18" />
          {/* Coffee table with bank statement */}
          <rect x="280" y="158" width="120" height="14" fill="#3a1f30" />
          <rect x="305" y="150" width="70" height="10" fill="#fff5e1" />
          <line x1="312" y1="153" x2="368" y2="153" stroke="#1a0a06" strokeWidth="0.6" />
          <line x1="312" y1="156" x2="345" y2="156" stroke="#1a0a06" strokeWidth="0.6" />
          {/* Picture frame on wall */}
          <rect x="500" y="40" width="60" height="48" fill="#1a0a06" />
          <rect x="504" y="44" width="52" height="40" fill="#a04060" />
          <path d="M 510 78 Q 520 60 530 70 Q 540 50 550 70 L 552 82 L 506 82 Z" fill="#3a1f50" />
        </svg>
      </div>

      {/* Tabs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
        {[
          { id: "evening", label: "🕯 EVENING" },
          { id: "notes", label: "📓 NOTES" },
          { id: "sleep", label: "🌙 SLEEP" },
        ].map((t) => (
          <button key={t.id} onClick={() => setView(t.id)} style={{ background: view === t.id ? `${C.bFlat}22` : C.surface2, border: `1.5px solid ${view === t.id ? C.bFlat : C.border}`, padding: "10px 8px", fontFamily: FONT_M, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer", borderRadius: 4, color: view === t.id ? C.coral : C.text }}>{t.label}</button>
        ))}
      </div>

      {view === "evening" && (
        <div>
          <div style={{ background: C.surface2, padding: 16, borderLeft: `3px solid ${C.bFlat}`, borderRadius: 4, marginBottom: 14 }}>
            <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.bFlat, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 6 }}>HOW THE DAY FELT</div>
            <div style={{ fontFamily: FONT_D, fontSize: 16, color: C.ink, lineHeight: 1.55, fontStyle: "italic" }}>
              {isMorning ? '"Already Tuesday. Coffee. Suit. The Reserve in ninety minutes. You can do this."' : '"Kettle on. Bank statement on the table. Your week\'s shopping cost more than the same shop two months ago and you don\'t need a chart to know that. Tomorrow you walk into the Reserve."'}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <Tile label="WALLET" value={fmt(wallet)} color={C.teal} />
            <Tile label="IN THE BANK" value={fmt(inBank)} color={C.gold} />
          </div>
          <div style={{ background: C.ink, padding: 14, borderRadius: 4 }}>
            <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.gold, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 6 }}>TOMORROW'S BRIEF</div>
            <div style={{ fontFamily: FONT_D, fontSize: 14.5, color: C.surface, lineHeight: 1.55 }}>
              First Monetary Policy Committee meeting. They'll brief you on the data. They'll want your view. You set the rate for ten million people.
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 14, fontFamily: FONT_M, fontSize: 10.5, fontWeight: 700 }}>
              <span style={{ color: C.coral }}>Inflation {pct(state.inflation)}</span>
              <span style={{ color: C.gold }}>Rate {pct(state.interestRate)}</span>
            </div>
          </div>
        </div>
      )}

      {view === "notes" && (
        <div>
          <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.bFlat, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 10 }}>{state.notes.length} VOICES IN YOUR HEAD</div>
          {state.notes.length === 0 ? (
            <div style={{ background: C.surface2, padding: 16, borderRadius: 4, fontSize: 13, color: C.textMuted, fontStyle: "italic", textAlign: "center" }}>
              You didn't talk to anyone today. Tomorrow you'll wish you had.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
              {state.notes.map((n, i) => (
                <div key={i} style={{ background: C.surface2, padding: 12, borderRadius: 4, borderLeft: `3px solid ${C.gold}` }}>
                  <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.coral, letterSpacing: "0.2em", fontWeight: 700, marginBottom: 4 }}>{n.from.toUpperCase()}</div>
                  <div style={{ fontFamily: FONT_D, fontSize: 13.5, color: C.text, lineHeight: 1.5, fontStyle: "italic" }}>"{n.text}"</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "sleep" && (
        <div>
          <div style={{ background: "linear-gradient(180deg, #1a0a2e 0%, #3a1f50 100%)", padding: 22, borderRadius: 6, marginBottom: 14, textAlign: "center" }}>
            <div style={{ fontSize: 56 }}>🌙</div>
            <div style={{ fontFamily: FONT_H, fontSize: 30, color: C.surface, fontWeight: 600, marginTop: 6 }}>Sleep on it</div>
            <div style={{ fontFamily: FONT_M, fontSize: 11, color: C.textCreamDim, letterSpacing: "0.15em", marginTop: 4 }}>The committee meets at nine.</div>
          </div>
          {canSleep ? (
            <button onClick={() => { dispatch({ type: "START_SLEEP" }); }} style={{ width: "100%", background: C.coral, color: "#fff", border: "none", padding: "16px", fontFamily: FONT_M, fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", cursor: "pointer", borderRadius: 4 }}>
              😴 SLEEP · ADVANCE TO TUESDAY →
            </button>
          ) : state.dayPhase === "personal" ? (
            <div style={{ padding: 14, background: C.surface2, borderLeft: `3px solid ${C.gold}`, borderRadius: 4, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
              Not ready yet. {state.activeQuest === "q1" ? "Talk to Mr Halim outside first." : state.activeQuest === "q2" ? "See what's happening at Amara's Market." : state.activeQuest === "q3" ? "Visit the savings bank — work out what you can actually save." : state.activeQuest === "q4" ? "The trading floor opens at ten. Worth a look." : "Keep going."}
            </div>
          ) : (
            <div style={{ padding: 14, background: `${C.green}15`, borderLeft: `3px solid ${C.green}`, borderRadius: 4, fontSize: 13, color: C.text }}>It's Tuesday. Head to the Reserve.</div>
          )}
        </div>
      )}
    </PanelShell>
  );
}

// ─── NPC DIALOGUE (sidewalk encounters) ────────────────────
function NpcDialogue({ npc, dispatch, state }) {
  const [step, setStep] = useState(0);
  const rate = state.interestRate;
  const hike = rate > 3.5;
  const cut = rate < 2.5;
  const isImpactPhase = state.activeQuest === "q10";

  // DAY 1 multi-beat dialogues — deeper, setting up Day 2
  const day1 = {
    halim: {
      name: "Mr Halim", color: C.rose,
      beats: [
        "Morning, neighbour! Off to the shop, are you? Mind how you go — Amara's been redoing the chalkboard every other week.",
        "I've lived in this building forty-one years. Watched the families change. The young ones come, struggle, then leave. The old ones stay because we paid off long ago.",
        "My grandson — Adam, lovely boy — bought his first flat last year. Six per cent mortgage. Thinks he can afford it. I haven't the heart to tell him.",
        "Anyway. I saw the announcement. They've put you on the committee. I'm proud to say I knew you before you were important. Just don't forget us up here when you're up there.",
      ],
      note: { from: "Mr Halim (neighbour)", text: "Forty-one years here. Grandson Adam just bought first flat at 6%. Said he's proud I'm on the committee. Asked me not to forget the people up here when I'm up there." }
    },
    yusuf: {
      name: "Yusuf", color: C.coral,
      beats: [
        "Mate! Funny seeing you here. I was just heading to mine — Sara's been doing the maths on the kitchen table again.",
        "Look. The mortgage went from ₺820 to ₺1,200 in a year. Same flat. Same loan. Just the rate.",
        "We've cut everything we can cut. Gym gone. Holidays gone. We even cancelled the kids' swimming lessons last month and I haven't told my mum because she'd weep.",
        "Tomorrow — whatever you do — just be honest with us. We can survive bad news. We can't survive being lied to.",
      ],
      note: { from: "Yusuf (friend, mortgage)", text: "Payment ₺820 → ₺1,200 in a year. Cut everything. Cancelled the kids' swimming. Asked me to be honest tomorrow. 'We can survive bad news. We can't survive being lied to.'" }
    },
    elder: {
      name: "Older man on the bench", color: C.blue,
      beats: [
        "Used to be you could buy a flat on one wage. My grandson works two jobs and rents a room. Same city, same currency, different country.",
        "I worked thirty-eight years. Saved every month. Paid off my flat at fifty-two. The system worked because the maths worked.",
        "Now my pension interest is half what it used to be. I'm not poor — but my niece in Keldra is. She can't make her loan repayments and her landlord raised her rent by twenty per cent.",
        "Whatever you do tomorrow, young one — make the rules work again. The maths has to add up. For everyone.",
      ],
      note: { from: "Older man · pensioner", text: "Worked 38 years. Paid off flat at 52. Pension interest halved. Niece in Keldra can't pay loans, rent up 20%. 'Make the rules work again. The maths has to add up.'" }
    },
    kids: {
      name: "Two students", color: C.rose,
      beats: [
        "Yo, you're the new finance guy yeah? Bro. Rent ate my whole student loan. Like, all of it.",
        "I'm eating tinned beans till May. Mate's been buying me lunches. I'm too embarrassed to call my mum.",
        "Everyone says we just need to wait. Wait for what? Wait till we're sixty?",
        "If you can do anything tomorrow that means we can stop being scared of our landlord... that'd be nice. Yeah. Nice would be nice.",
      ],
      note: { from: "Two students", text: "Rent ate the whole student loan. Tinned beans till May. Too embarrassed to call mum. 'If you can do anything that means we stop being scared of our landlord, that'd be nice.'" }
    },
    protester: {
      name: "Protester", color: C.red,
      beats: [
        "Hey. You. You're going in there tomorrow, aren't you? I saw your photo in the paper.",
        "My mum's seventy-three. She turns the heating off when I'm not visiting because she's worried about the bills. She tells me to wear a jumper instead.",
        "Her rent went up nine per cent last quarter. Her pension went up two. Tell me how that maths works.",
        "I'll be here tomorrow. Whatever you do. Just remember — somebody's mum is in every spreadsheet you look at. Don't forget. Please. Please don't forget.",
      ],
      note: { from: "Protester near the Reserve", text: "Mum is 73. Turns heating off so I don't worry. Rent up 9%, pension up 2%. 'Somebody's mum is in every spreadsheet.' She'll be here tomorrow." }
    },
    vendor: {
      name: "Street vendor", color: C.purple,
      beats: [
        "Half-price chargers. Cash only. You buy now, you save twenty.",
        "Heard you're going up there tomorrow. The tower. Good luck with that, mate. Keep your wallet on the inside of your jacket.",
      ],
      note: { from: "Street vendor", text: "Cash only mate. Wished me luck. Told me to keep my wallet on the inside of my jacket. Wisdom of the streets." }
    },
    jogger: {
      name: "Jogger", color: C.green,
      beats: [
        "Morning! Beautiful day. I run this loop every morning. Cheapest therapy I know.",
        "Don't get me wrong, I read the papers. But for forty minutes a day I just... breathe. You should try it. Tomorrow, especially. Big day ahead, I hear.",
      ],
      note: { from: "Morning jogger", text: "Runs the loop daily. 'Cheapest therapy I know.' Recommended I try it before tomorrow." }
    },
    trader: {
      name: "Trader", color: C.gold,
      beats: [
        "First day at the Reserve tomorrow, eh? I saw the press release.",
        "Word of advice. Whatever rate you set, half the screens up there will be screaming about how wrong you got it by lunch. The other half will be scrolling Instagram.",
        "Wear it lightly. The markets always recover. The people sometimes don't. Choose carefully which one you're more worried about.",
      ],
      note: { from: "Trader on his lunch break", text: "Half the screens scream you got it wrong, half scroll Instagram. 'Markets recover, people sometimes don't. Choose carefully which one you're more worried about.'" }
    },
  };

  // DAY 2 (impact) — single-beat reactions reflecting rate decision
  const day2 = {
    halim: { name: "Mr Halim", color: C.rose,
      text: hike ? "Adam's mortgage went up. He's looking at lodgers. But you know what — better the truth than the slow drip. My pension's worth more this month, first time in years. Mixed feelings, dear. Mixed feelings." : cut ? "Adam's mortgage came down — relief on his face I haven't seen in months. My pension interest dropped though. That's the thing isn't it — somebody loses." : "Steady. I'll take steady. Adam can plan. I can plan. Boring is a gift at my age.",
      note: { from: "Mr Halim · after", text: hike ? "Adam looking at lodgers. Pension worth more. Mixed feelings." : cut ? "Adam's relief visible. Halim's pension interest dropped. 'Somebody loses.'" : "Boring is a gift at his age. He'll take steady." }
    },
    yusuf: { name: "Yusuf", color: C.coral,
      text: hike ? "Mate. Mate. Payment up another two hundred. We're putting the flat on the market next week. I'm not angry at you. I think. I haven't decided." : cut ? "MATE. Payment came down ₺140. First good news in eighteen months. Drinks tomorrow on me. Sara's actually smiled." : "Held. I can keep planning. The cancellation list stays cancelled but at least it's not getting longer. Thank you.",
      note: { from: "Yusuf · after", text: hike ? "Selling the flat. 'I haven't decided if I'm angry.'" : cut ? "Down ₺140. Sara smiled. Drinks on him tomorrow." : "Can keep planning. Cancellation list stays cancelled." }
    },
    elder: { name: "Older man", color: C.blue,
      text: hike ? "Discipline. Good. My pension interest's up for the first time in a decade. Don't apologise for doing the job. The system has to mean something." : cut ? "You cut. At a time like this. My savings interest has halved overnight. My niece's loan is no easier — banks won't pass it on for months. Worst of both worlds." : "Hold. Wait. Watch. My father's way. Sensible.",
      note: { from: "Older man · after", text: hike ? "Pension interest up first time in a decade. 'Don't apologise for doing the job.'" : cut ? "Savings halved. Niece's loan no easier. 'Worst of both worlds.'" : "Father's way. Sensible." }
    },
    kids: { name: "Students", color: C.rose,
      text: hike ? "Bro. Bro. Landlord's already said rent's going up next month because his mortgage went up. So thanks for that. Beans till the END of May now." : cut ? "Wait — does this mean rents go down? Eventually? Maybe? It's been a year of just maybe. We'll see." : "Bro. Nothing changed. As predicted. Cool. Beans forever then.",
      note: { from: "Students · after", text: hike ? "Landlord raising rent next month because his mortgage rose. 'Beans till END of May now.'" : cut ? "'A year of just maybe. We'll see.'" : "Nothing changed. Beans forever." }
    },
    protester: { name: "Protester", color: C.red,
      text: hike ? "Eight hundred of us here yesterday. Mum can't afford heat AND rent now. You raised both at once. There's a name for that. I'll find it." : cut ? "You cut. Good. Now do the rest. Build housing. Tax wealth. Cap rents. This is one decision. There are seventeen more." : "Nothing. You did nothing. Mum still freezes. Rent still rises. There were a thousand of us this morning. There'll be two thousand by Friday.",
      note: { from: "Protester · after", text: hike ? "800 here yesterday. Mum can't afford heat AND rent. 'There's a name for that. I'll find it.'" : cut ? "'This is one decision. There are seventeen more.'" : "Nothing. 1000 today. 2000 by Friday." }
    },
    vendor: { name: "Street vendor", color: C.purple,
      text: "Heard you on the radio. Strong words. Strong words sell newspapers. Don't sell chargers. Cash only, mate.",
      note: { from: "Vendor · after", text: "Cash only. Some economies run beneath the rate." }
    },
    jogger: { name: "Jogger", color: C.green,
      text: "Saw the press conference. Held up well. Same loop tomorrow if you fancy it. Six AM. Not slowing down for you.",
      note: { from: "Jogger · after", text: "Six AM. Not slowing down." }
    },
    trader: { name: "Trader", color: C.gold,
      text: hike ? "Index down 4.1%. Quite the morning. I made money short, so don't feel bad. Welcome to the job." : cut ? "Currency wobble but conviction always prices in. You looked decisive. Markets respect that more than most things." : "Boring. I'll take it. Quiet days are good days for me.",
      note: { from: "Trader · after", text: hike ? "Index down 4.1%. He's short. The market eats either direction." : cut ? "Markets respect conviction." : "Quiet days are good days." }
    },
  };

  if (isImpactPhase) {
    const item = day2[npc.id] || day1[npc.id];
    if (!item) return null;
    return (
      <PanelShell title={item.name} sub="After the announcement" onClose={() => dispatch({ type: "CLOSE_PANEL" })} accent={item.color}>
        <div style={{ background: `${item.color}15`, padding: 10, borderLeft: `3px solid ${item.color}`, borderRadius: 4, marginBottom: 12, fontFamily: FONT_M, fontSize: 9.5, color: item.color, letterSpacing: "0.18em", fontWeight: 700 }}>
          POST-DECISION · YOUR CHOICE AT WORK
        </div>
        <div style={{ background: C.surface2, padding: 18, borderLeft: `3px solid ${item.color}`, borderRadius: 4, marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_D, fontSize: 16.5, color: C.ink, lineHeight: 1.55, fontStyle: "italic" }}>"{item.text}"</div>
        </div>
        <button onClick={() => { dispatch({ type: "TALK_NPC", note: item.note, npcId: npc.id, isImpact: true }); dispatch({ type: "CLOSE_PANEL" }); }} style={{ width: "100%", background: C.ink, color: C.surface, border: "none", padding: "12px", fontFamily: FONT_M, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", cursor: "pointer" }}>SAVE NOTE & MOVE ON →</button>
      </PanelShell>
    );
  }

  // Day 1 multi-beat
  const item = day1[npc.id];
  if (!item) return null;
  const isLast = step >= item.beats.length - 1;

  return (
    <PanelShell title={item.name} sub={`On the street · ${step + 1}/${item.beats.length}`} onClose={() => dispatch({ type: "CLOSE_PANEL" })} accent={item.color}>
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 50, height: 50, borderRadius: "50%", background: item.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_D, fontWeight: 800, fontSize: 22, flexShrink: 0 }}>{item.name[0]}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_M, fontSize: 9, color: item.color, letterSpacing: "0.22em", fontWeight: 700 }}>{item.name.toUpperCase()}</div>
          <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
            {item.beats.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, background: i <= step ? item.color : C.borderCream, borderRadius: 2, transition: "background 0.2s" }} />
            ))}
          </div>
        </div>
      </div>
      <div className="popupIn" key={step} style={{ background: C.surface2, padding: 18, borderLeft: `3px solid ${item.color}`, borderRadius: 4, marginBottom: 14, minHeight: 110 }}>
        <div style={{ fontFamily: FONT_D, fontSize: 17, color: C.ink, lineHeight: 1.55, fontStyle: "italic" }}>"{item.beats[step]}"</div>
      </div>
      {!isLast ? (
        <button onClick={() => setStep(step + 1)} style={{ width: "100%", background: item.color, color: "#fff", border: "none", padding: "12px", fontFamily: FONT_M, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", cursor: "pointer", borderRadius: 4 }}>CONTINUE →</button>
      ) : (
        <button onClick={() => { dispatch({ type: "TALK_NPC", note: item.note, npcId: npc.id }); dispatch({ type: "CLOSE_PANEL" }); }} style={{ width: "100%", background: C.ink, color: C.surface, border: "none", padding: "12px", fontFamily: FONT_M, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", cursor: "pointer", borderRadius: 4 }}>SAVE NOTE & MOVE ON →</button>
      )}
    </PanelShell>
  );
}

// ─── POPUPS ─────────────────────────────────────────────────
function PressConference({ state, dispatch }) {
  const rate = state.interestRate;
  const hike = rate > 3.5;
  const cut = rate < 2.5;

  // Press conference has phases: intro → questions → statement choice → reaction
  const guidanceLabel = state.guidance === "hawk" ? "'higher for longer'" : state.guidance === "dove" ? "'we may have done enough'" : "'data-dependent'";
  const QUESTIONS = [
    { who: "Sasha Voss, Varena Times", color: C.purple, q: "Governor, you've just " + (hike ? "raised rates to " + pct(rate) + ". Many will struggle with mortgages. What's your message to them?" : cut ? "cut rates to " + pct(rate) + ". Critics say you're being soft on inflation. Your response?" : "held rates at " + pct(rate) + ". Inflation is at " + pct(state.inflation) + " and you did nothing. People needed help. Why didn't they get any?") },
    { who: "Marcus Ode, financial wire", color: C.coral, q: hike ? "The markets fell on the news. Banks are flagging a recession. Was this too aggressive?" : cut ? "Bonds rallied but the currency weakened against the dollar. Is that a sign of weakness?" : "Markets shrugged. The IMF this morning called for action. Are you out of step with the world?" },
    { who: "Layla Daud, public broadcaster", color: C.teal, q: "Your forward guidance was " + guidanceLabel + ". Why send that signal now? People are listening for one thing — when will it get better?" },
    { who: "Sasha Voss, Varena Times", color: C.purple, q: "Last question. Just for the headlines. In one sentence — what do you say to the country tonight?" },
  ];

  const STATEMENTS = hike ? [
    { id: "discipline", label: "Discipline. We had no choice.", reaction: { public: -8, markets: 5, press: 0, story: "Public mood: cold. Markets: respectful. Tomorrow's headline calls it 'principled but lonely'." } },
    { id: "empathy", label: "I know this will hurt. I am sorry. But the alternative was worse.", reaction: { public: 5, markets: -3, press: 8, story: "Public mood: warmed. Markets: slightly uneasy you flinched. Press call it 'a Governor with a soul'." } },
    { id: "blame", label: "External shocks left us no choice. This is not our fault.", reaction: { public: -12, markets: -5, press: -10, story: "Public mood: angry — feels evasive. Markets: spooked you're not in control. Press call it 'finger-pointing'." } },
  ] : cut ? [
    { id: "relief", label: "Today is relief. Borrowers, breathe.", reaction: { public: 10, markets: 0, press: 5, story: "Public mood: relieved. Markets: cautious. Press call it 'a populist gift'." } },
    { id: "vigilant", label: "We cut, but we're watching inflation like hawks.", reaction: { public: 0, markets: 5, press: 8, story: "Public mood: steady. Markets: confident in your judgment. Press call it 'measured and serious'." } },
    { id: "aggressive", label: "Growth matters more than the price index right now.", reaction: { public: 5, markets: -10, press: -5, story: "Public mood: split. Markets: panic, currency wobbles. Press call it 'a gamble'." } },
  ] : [
    { id: "steady", label: "Stability is what people need. We will not panic with them.", reaction: { public: -5, markets: 5, press: 0, story: "Public mood: cold. Felt scolded. Markets: appreciated the calm. Press split — half called it 'statesmanlike', half called it 'condescending'." } },
    { id: "patient", label: "We are watching every line of data. We will act when the moment is right.", reaction: { public: -3, markets: 8, press: 6, story: "Public mood: skeptical. Markets: trust the process. Press call it 'the cleanest defence of a hold this year'." } },
    { id: "weak", label: "Honestly, the data is mixed. We needed more time.", reaction: { public: -15, markets: -8, press: -12, story: "Public mood: betrayed. People are paying their rent in advance because they think prices will keep rising. Markets: smell weakness. Press call it 'the most honest thing a Governor has ever said — and the most damning'." } },
  ];

  if (state.pressStep < QUESTIONS.length) {
    const cur = QUESTIONS[state.pressStep];
    return (
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,5,20,0.92)", zIndex: 38, display: "flex", flexDirection: "column", padding: 30, justifyContent: "center" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: FONT_M, fontSize: 10, color: C.gold, letterSpacing: "0.3em", fontWeight: 700 }}>RESERVE LOBBY · {state.pressStep + 1} OF {QUESTIONS.length + 1}</div>
          <div style={{ fontFamily: FONT_H, fontSize: 38, color: C.surface, fontWeight: 600, marginTop: 4 }}>The press conference</div>
          <div style={{ fontFamily: FONT_M, fontSize: 11, color: C.textCreamDim, letterSpacing: "0.15em", marginTop: 4 }}>Cameras. Flashbulbs. Notebooks. Twelve voices shouting your name.</div>
        </div>
        <div style={{ maxWidth: 760, width: "100%", margin: "0 auto" }}>
          <div className="popupIn" style={{ background: C.surface, border: `3px solid ${cur.color}`, borderRadius: 8, padding: "28px 34px", boxShadow: `0 20px 60px ${cur.color}40` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", background: cur.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_D, fontWeight: 800, fontSize: 22 }}>{cur.who[0]}</div>
              <div>
                <div style={{ fontFamily: FONT_D, fontSize: 18, color: C.ink, fontWeight: 800 }}>{cur.who}</div>
                <div style={{ fontFamily: FONT_M, fontSize: 10, color: cur.color, letterSpacing: "0.22em", fontWeight: 700 }}>JOURNALIST</div>
              </div>
            </div>
            <div style={{ fontFamily: FONT_D, fontSize: 20, color: C.ink, lineHeight: 1.45, fontStyle: "italic" }}>"{cur.q}"</div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
            <button onClick={() => dispatch({ type: "PRESS_NEXT" })} style={{ background: C.coral, color: "#fff", border: "none", padding: "12px 30px", fontFamily: FONT_M, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", cursor: "pointer", borderRadius: 4 }}>
              {state.pressStep < QUESTIONS.length - 1 ? "NEXT QUESTION →" : "RESPOND TO ALL →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Statement choice
  if (!state.pressStatement) {
    return (
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,5,20,0.92)", zIndex: 38, display: "flex", flexDirection: "column", padding: 30, justifyContent: "center" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: FONT_M, fontSize: 10, color: C.gold, letterSpacing: "0.3em", fontWeight: 700 }}>YOUR STATEMENT</div>
          <div style={{ fontFamily: FONT_H, fontSize: 36, color: C.surface, fontWeight: 600, marginTop: 4 }}>What do you say?</div>
          <div style={{ fontFamily: FONT_M, fontSize: 11, color: C.textCreamDim, letterSpacing: "0.15em", marginTop: 4 }}>Twelve cameras. One sentence. Pick carefully.</div>
        </div>
        <div style={{ maxWidth: 720, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {STATEMENTS.map((st) => (
            <button key={st.id} onClick={() => dispatch({ type: "PRESS_CHOOSE", choice: st })} className="popupIn" style={{ background: C.surface, border: `2px solid ${C.borderCream}`, padding: "18px 24px", fontFamily: FONT_D, fontSize: 17, fontWeight: 600, color: C.ink, textAlign: "left", cursor: "pointer", borderRadius: 6, lineHeight: 1.4, fontStyle: "italic", transition: "all 0.15s" }} onMouseOver={(e) => e.currentTarget.style.borderColor = C.coral} onMouseOut={(e) => e.currentTarget.style.borderColor = C.borderCream}>
              "{st.label}"
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Reaction
  const r = state.pressStatement.reaction;
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(10,5,20,0.94)", zIndex: 38, display: "flex", flexDirection: "column", padding: 30, justifyContent: "center" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontFamily: FONT_M, fontSize: 10, color: C.gold, letterSpacing: "0.3em", fontWeight: 700 }}>THE REACTION</div>
        <div style={{ fontFamily: FONT_H, fontSize: 36, color: C.surface, fontWeight: 600, marginTop: 4 }}>How it landed</div>
      </div>
      <div style={{ maxWidth: 720, width: "100%", margin: "0 auto" }}>
        <div className="popupIn" style={{ background: C.surface, border: `3px solid ${C.coral}`, borderRadius: 8, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ fontFamily: FONT_M, fontSize: 9, color: C.coral, letterSpacing: "0.25em", fontWeight: 700, marginBottom: 6 }}>YOU SAID</div>
          <div style={{ fontFamily: FONT_D, fontSize: 19, color: C.ink, fontStyle: "italic", fontWeight: 500, marginBottom: 18, lineHeight: 1.45 }}>"{state.pressStatement.label}"</div>
          <div style={{ background: C.surface2, padding: 16, borderRadius: 4, borderLeft: `3px solid ${C.coral}`, marginBottom: 14 }}>
            <div style={{ fontFamily: FONT_D, fontSize: 15, color: C.ink, lineHeight: 1.5, fontWeight: 500 }}>{r.story}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <ReactionBar label="PUBLIC" value={r.public} />
            <ReactionBar label="MARKETS" value={r.markets} />
            <ReactionBar label="PRESS" value={r.press} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
          <button onClick={() => dispatch({ type: "PRESS_END" })} style={{ background: C.coral, color: "#fff", border: "none", padding: "12px 30px", fontFamily: FONT_M, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", cursor: "pointer", borderRadius: 4 }}>
            SEE THE RIPPLE →
          </button>
        </div>
      </div>
    </div>
  );
}

function ReactionBar({ label, value }) {
  const positive = value >= 0;
  const color = value > 5 ? C.green : value > 0 ? C.teal : value > -5 ? C.gold : C.coral;
  return (
    <div style={{ background: C.surface, padding: 10, borderRadius: 4, border: `1.5px solid ${C.borderCream}` }}>
      <div style={{ fontSize: 9, fontFamily: FONT_M, color: C.textMuted, letterSpacing: "0.22em", fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: FONT_D, fontSize: 22, color, fontWeight: 800, marginTop: 2 }}>{positive ? "+" : ""}{value}</div>
    </div>
  );
}

function ConsequenceMontage({ state, dispatch }) {
  const rate = state.interestRate;
  const hike = rate > 3.5;
  const cut = rate < 2.5;
  const statementId = state.pressStatement?.id || "";
  const harshStatement = statementId === "blame" || statementId === "weak" || statementId === "aggressive";

  // Each scene is a vignette: NPC quote, headline, or chart
  const scenes = [
    {
      type: "headline",
      paper: "VARENA TIMES",
      color: hike ? C.coral : cut ? C.teal : C.red,
      bigHeadline: hike ? "RESERVE STRIKES" : cut ? "RESERVE BLINKS" : "RESERVE FROZEN AT THE WHEEL",
      subhead: hike ? `Rate hike to ${pct(rate)} — Governor invokes 'discipline'. Mortgage holders reel across Varena.` : cut ? `Cut to ${pct(rate)} sparks borrower relief — and immediate inflation fears.` : `Hold at ${pct(rate)} while inflation runs at ${pct(state.inflation)}. Critics call it 'paralysis'. Editorial pages: 'do something'.`,
      kicker: harshStatement ? "PRESS REACT: 'This was the wrong tone'" : hike ? "Markets opened down 3%" : cut ? "Currency wobbles" : "Editorial: 'Cowardice in a cardigan'",
    },
    {
      type: "headline",
      paper: cut ? "MARKET WIRE · INFLATION ALERT" : hike ? "MARKET WIRE · CRASH WATCH" : "MARKET WIRE · 'NOTHINGNESS'",
      color: cut ? C.gold : hike ? C.coral : C.red,
      bigHeadline: hike ? "MARKETS PLUNGE — 'CARNAGE'" : cut ? "INFLATION ALARM — PRICES SET TO EXPLODE" : "ECONOMISTS: 'CENTRAL BANK ASLEEP'",
      subhead: hike ? `MAIN INDEX -4.1% on day. Three banks issuing recession warnings. The mortgage market is in shock — broker calls up 340%.` : cut ? `Five major economists warn the cut will push inflation past 7% by year-end. Bond yields surge. Marka down 2.4% against USD overnight.` : `Twenty-six economists signed an open letter overnight calling the hold 'reckless'. Inflation at ${pct(state.inflation)}, real wages falling, and the Reserve does nothing.`,
      kicker: harshStatement ? "Trading floor: 'They've lost the room'" : "",
    },
    {
      type: "scene",
      who: hike ? "Mortgage broker" : cut ? "Pensioner advocate" : "Single mum, Keldra",
      role: hike ? "Twelve phones ringing" : cut ? "Eight hundred members" : "Three jobs, two kids",
      color: C.coral,
      icon: hike ? "📞" : cut ? "👴" : "👩",
      line: hike ? "Phones haven't stopped. We've got eighteen people in arrears already this morning. People are crying on the line. I've been doing this thirty years. I've never had a morning like this." : cut ? "We've been writing letters since June. Our members lost three percent on their savings overnight. Some of them have been saving for fifty years. Today they were told that doesn't matter." : "I work three jobs. Rent's gone up twice this year. Food's up. Petrol's up. Nursery fees are up. The Reserve looked at this and decided to do nothing. Let them try living it.",
      detail: hike ? "Estimated 90,000 households into mortgage stress" : cut ? "Average pensioner: -₺780/yr in saving interest" : "Real wages down 4.2% YoY — and no help coming",
    },
    {
      type: "protest",
      color: C.coral,
      bigHeadline: hike ? "PROTESTS OUTSIDE THE RESERVE" : cut ? "PENSIONERS STORM THE PLAZA" : "'DO SOMETHING' MARCH — THOUSANDS",
      subhead: hike ? "Crowd of around 1,400 by 4pm. Banners read 'YOU CHOSE THIS PAIN'. Riot police deployed at 5:15. Three arrests for criminal damage to the Reserve gates." : cut ? "An estimated 900 pensioners gathered on the Plaza. Former Governor Hadi spoke for nine minutes — most of it boos. Mounted police now stationed nearby." : "Estimated 2,200 protesters from rent unions, debt charities, and youth groups marching from Riverside to the Reserve. 'YOU SAW US. YOU DID NOTHING.' on twelve-foot banners. Police escort but the crowd is angry.",
      kicker: hike ? "Three arrests · Police presence to remain through night" : cut ? "Letter to the Times signed by 1,200 pensioners" : "Six MPs joined the march unannounced. The Speaker has 'concerns'.",
    },
    {
      type: "headline",
      paper: "PUBLIC BROADCASTER · 6PM NEWS",
      color: C.teal,
      bigHeadline: harshStatement ? "GOVERNOR FACES CALLS TO RESIGN" : hike ? "FINANCE MINISTER 'DEEPLY CONCERNED'" : cut ? "SHADOW MINISTER: 'INFLATIONARY GAMBLE'" : "OPPOSITION: 'A FAILURE OF NERVE'",
      subhead: harshStatement ? "Two backbench MPs and a former MPC member have publicly called the statement 'unbecoming'. Number 11 has declined to comment. The press lobby is openly hostile." : hike ? "Cross-party pressure mounting. The Finance Minister gave a thirty-second doorstep that pundits are calling 'pointed'. Tomorrow's PMQs will be ferocious." : cut ? "The pound under pressure. The IMF released a statement 'noting' the cut. Currency markets reading that as 'concerned'." : "The opposition leader: 'Inflation is robbing this country and the Governor stared at it and did nothing.' Live debate scheduled tomorrow at 11am.",
      kicker: "Approval rating: " + (harshStatement ? "29% (-14)" : hike ? "41% (-6)" : cut ? "46% (-3)" : "34% (-13)"),
    },
    {
      type: "scene",
      who: "TalkBack Live · phone-in",
      role: "National radio · prime time",
      color: C.gold,
      icon: "📻",
      line: hike ? "Caller after caller. 'I voted for safety and the Reserve raised my mortgage.' 'My business is over.' Host can't get a word in. Lines jammed for forty minutes." : cut ? "Caller after caller. 'My mum's been saving since the 70s and you've cut her interest in half.' 'You'll let inflation rip again.' Twenty texts to the show every minute." : "Caller after caller. 'You SAW the inflation. You SAW the prices. You did NOTHING.' Host tries to defend the decision. Caller hangs up.",
      detail: "Listeners reporting they switched off in disgust",
    },
    {
      type: "summary",
      who: "Governor Nara",
      role: "End of the day · committee room",
      color: C.teal,
      icon: "🏛",
      line: harshStatement ? "Right. We need to talk about the statement. Not the decision — the decision is defensible. The wording will be remembered." : "Right. Well. You made a call. The country felt it. Some are calling for your head. Some are calling for a parade. Welcome to the job. Get some sleep — we do this again in six weeks.",
      detail: harshStatement ? `Forward guidance "${state.guidance}" was overshadowed by the statement.` : `Forward guidance "${state.guidance}" landed as expected.`,
    },
  ];

  const cur = scenes[state.montageStep];
  const done = state.montageStep >= scenes.length;
  if (done) { setTimeout(() => dispatch({ type: "MONTAGE_END" }), 100); return null; }

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(8,4,18,0.94)", zIndex: 38, display: "flex", flexDirection: "column", padding: 30, justifyContent: "center" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontFamily: FONT_M, fontSize: 10, color: C.gold, letterSpacing: "0.3em", fontWeight: 700 }}>THE WEEK YOU MADE · {state.montageStep + 1} / {scenes.length}</div>
        <div style={{ fontFamily: FONT_H, fontSize: 32, color: C.surface, fontWeight: 600, marginTop: 2 }}>What happened next</div>
      </div>
      <div style={{ maxWidth: 760, width: "100%", margin: "0 auto" }}>
        {(cur.type === "headline" || cur.type === "protest") && (
          <div className="popupIn" style={{ background: cur.type === "protest" ? "#1a0808" : C.surface, border: `4px solid ${cur.color}`, padding: 28, borderRadius: 4 }}>
            <div style={{ fontFamily: FONT_M, fontSize: 10, color: cur.color, letterSpacing: "0.3em", fontWeight: 700, paddingBottom: 8, borderBottom: `2px solid ${cur.color}`, marginBottom: 14 }}>{cur.paper || "BREAKING"}</div>
            <div style={{ fontFamily: FONT_D, fontSize: 38, color: cur.type === "protest" ? C.surface : C.ink, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.01em", marginBottom: 10 }}>{cur.bigHeadline}</div>
            <div style={{ fontFamily: FONT_D, fontSize: 17, color: cur.type === "protest" ? C.textCreamDim : C.text, fontWeight: 500, lineHeight: 1.4, marginBottom: cur.kicker ? 12 : 0 }}>{cur.subhead}</div>
            {cur.kicker && (
              <div style={{ background: cur.color, color: cur.type === "protest" ? C.ink : "#fff", padding: "8px 14px", fontFamily: FONT_M, fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", display: "inline-block", borderRadius: 2 }}>
                {cur.kicker}
              </div>
            )}
          </div>
        )}
        {(cur.type === "scene" || cur.type === "summary") && (
          <div className="popupIn" style={{ background: C.surface, border: `3px solid ${cur.color}`, borderRadius: 8, padding: 26, boxShadow: `0 20px 60px ${cur.color}40` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 54, height: 54, borderRadius: "50%", background: cur.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{cur.icon}</div>
              <div>
                <div style={{ fontFamily: FONT_D, fontSize: 22, color: C.ink, fontWeight: 800 }}>{cur.who}</div>
                <div style={{ fontFamily: FONT_M, fontSize: 10, color: cur.color, letterSpacing: "0.22em", fontWeight: 700 }}>{cur.role.toUpperCase()}</div>
              </div>
            </div>
            <div style={{ fontFamily: FONT_D, fontSize: 19, color: C.ink, lineHeight: 1.45, fontStyle: "italic", fontWeight: 500, marginBottom: 12 }}>"{cur.line}"</div>
            {cur.detail && (
              <div style={{ background: C.surface2, padding: "8px 12px", borderRadius: 4, fontFamily: FONT_M, fontSize: 11, color: cur.color, fontWeight: 700, letterSpacing: "0.1em", borderLeft: `3px solid ${cur.color}` }}>
                {cur.detail}
              </div>
            )}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
          <button onClick={() => dispatch({ type: "MONTAGE_NEXT" })} style={{ background: C.coral, color: "#fff", border: "none", padding: "13px 30px", fontFamily: FONT_M, fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", cursor: "pointer", borderRadius: 4, boxShadow: "0 8px 24px rgba(255,71,87,0.4)" }}>
            {state.montageStep < scenes.length - 1 ? "NEXT →" : "GO BACK TO THE CITY →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SleepAnimation({ state, dispatch }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("dimming"); // dimming → night → dawn → done
  const [phaseText, setPhaseText] = useState("Closing your eyes...");

  useEffect(() => {
    const startedAt = performance.now();
    let raf;
    const tick = (now) => {
      const elapsed = (now - startedAt) / 1000; // seconds
      // Total animation: 4.5 seconds
      // 0–1.5s: dimming (sky darkens, sun sets)
      // 1.5–2.8s: deep night (moon high, stars)
      // 2.8–4.0s: dawn (sky brightens)
      // 4.0–4.5s: morning (commit state change)
      if (elapsed < 1.5) {
        const p = elapsed / 1.5;
        setProgress(p * 50);
        if (p > 0.5 && phaseText !== "Night falling...") setPhaseText("Night falling...");
      } else if (elapsed < 2.8) {
        setProgress(50);
        if (phaseText !== "Deep into sleep...") setPhaseText("Deep into sleep...");
      } else if (elapsed < 4.0) {
        const p = (elapsed - 2.8) / 1.2;
        setProgress(50 + p * 50);
        if (phaseText !== "Dawn breaks over Varena...") setPhaseText("Dawn breaks over Varena...");
      } else if (elapsed < 4.5) {
        setProgress(100);
        if (phaseText !== "Tuesday morning.") setPhaseText("Tuesday morning.");
      } else {
        dispatch({ type: "SLEEP_TO_DAY_2" });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line

  // Sky color based on progress
  const t = progress / 100;
  // Day (sunset) → Night (deep) → Dawn → Morning
  let skyTop, skyMid, skyBot;
  if (t < 0.3) {
    // Day → dusk
    const p = t / 0.3;
    skyTop = `rgb(${Math.round(42 - 38*p)}, ${Math.round(20 - 14*p)}, ${Math.round(56 - 24*p)})`;
    skyMid = `rgb(${Math.round(90 - 80*p)}, ${Math.round(44 - 38*p)}, ${Math.round(90 - 60*p)})`;
    skyBot = `rgb(${Math.round(255 - 215*p)}, ${Math.round(142 - 130*p)}, ${Math.round(110 - 80*p)})`;
  } else if (t < 0.6) {
    // Deep night
    skyTop = "rgb(4, 1, 20)";
    skyMid = "rgb(10, 6, 31)";
    skyBot = "rgb(26, 10, 46)";
  } else {
    // Dawn → morning
    const p = (t - 0.6) / 0.4;
    skyTop = `rgb(${Math.round(4 + 86*p)}, ${Math.round(1 + 53*p)}, ${Math.round(20 + 92*p)})`;
    skyMid = `rgb(${Math.round(10 + 150*p)}, ${Math.round(6 + 66*p)}, ${Math.round(31 + 97*p)})`;
    skyBot = `rgb(${Math.round(26 + 229*p)}, ${Math.round(10 + 196*p)}, ${Math.round(46 + 96*p)})`;
  }

  // Moon position (rises during night, sets during dawn)
  const moonY = t < 0.5 ? 200 - t * 240 : 80 + (t - 0.5) * 240;
  const moonOpacity = t > 0.15 && t < 0.85 ? Math.min(1, Math.min((t - 0.15) * 5, (0.85 - t) * 5)) : 0;
  // Sun rises in last 30%
  const sunY = t > 0.7 ? 500 - (t - 0.7) * 1200 : 600;
  const sunOpacity = t > 0.7 ? Math.min(1, (t - 0.7) * 3.3) : 0;
  // Stars visible during 30%-70%
  const starOpacity = t > 0.25 && t < 0.75 ? Math.min(1, Math.min((t - 0.25) * 4, (0.75 - t) * 4)) : 0;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, pointerEvents: "none", overflow: "hidden" }}>
      <svg viewBox="0 0 1500 720" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }}>
        <defs>
          <linearGradient id="sleepSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skyTop} />
            <stop offset="50%" stopColor={skyMid} />
            <stop offset="100%" stopColor={skyBot} />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1500" height="720" fill="url(#sleepSky)" />

        {/* Stars */}
        {starOpacity > 0 && Array.from({ length: 80 }).map((_, i) => {
          const sx = (i * 197) % 1500;
          const sy = 40 + ((i * 71) % 340);
          const tw = 0.7 + ((i * 13) % 100) / 100;
          return <circle key={i} cx={sx} cy={sy} r={tw} fill="#fff5d8" opacity={starOpacity * (0.4 + (i % 5) * 0.12)}>
            <animate attributeName="opacity" values={`${starOpacity * 0.3};${starOpacity};${starOpacity * 0.3}`} dur={`${2 + (i % 4)}s`} repeatCount="indefinite" />
          </circle>;
        })}

        {/* Moon */}
        {moonOpacity > 0 && (
          <g opacity={moonOpacity}>
            <circle cx="1100" cy={moonY} r="120" fill="#fff5d8" opacity="0.15" />
            <circle cx="1100" cy={moonY} r="80" fill="#fff5d8" opacity="0.3" />
            <circle cx="1100" cy={moonY} r="54" fill="#fff5d8" />
            <circle cx="1115" cy={moonY - 12} r="8" fill="#e8d8b8" opacity="0.6" />
            <circle cx="1085" cy={moonY + 18} r="6" fill="#e8d8b8" opacity="0.6" />
            <circle cx="1120" cy={moonY + 22} r="4" fill="#e8d8b8" opacity="0.4" />
          </g>
        )}

        {/* Sun rising */}
        {sunOpacity > 0 && (
          <g opacity={sunOpacity}>
            <circle cx="350" cy={sunY} r="160" fill="#ffce8e" opacity="0.18" />
            <circle cx="350" cy={sunY} r="110" fill="#ffce8e" opacity="0.32" />
            <circle cx="350" cy={sunY} r="70" fill="#ffd28e" />
          </g>
        )}

        {/* Silhouette of city hill — kept dark throughout */}
        <path d="M 0 600 L 0 540 L 250 540 L 380 460 L 600 460 L 750 380 L 1500 380 L 1500 720 L 0 720 Z" fill="#0a0418" opacity="0.95" />
        {/* Little building silhouettes */}
        <rect x="80" y="490" width="60" height="50" fill="#0a0418" />
        <rect x="180" y="500" width="40" height="40" fill="#0a0418" />
        <rect x="450" y="410" width="50" height="50" fill="#0a0418" />
        <rect x="850" y="320" width="40" height="60" fill="#0a0418" />
        <rect x="950" y="290" width="50" height="90" fill="#0a0418" />
        <rect x="1100" y="270" width="80" height="110" fill="#0a0418" />
        <rect x="1140" y="200" width="10" height="70" fill="#0a0418" />

        {/* Window lights on city — flicker on at night */}
        {starOpacity > 0 && (
          <g opacity={starOpacity}>
            <rect x="92" y="500" width="6" height="6" fill="#ffce8e" />
            <rect x="110" y="510" width="6" height="6" fill="#ffce8e" />
            <rect x="92" y="520" width="6" height="6" fill="#ffce8e" />
            <rect x="190" y="510" width="4" height="4" fill="#ffce8e" />
            <rect x="200" y="520" width="4" height="4" fill="#ffce8e" />
            <rect x="462" y="425" width="6" height="6" fill="#ffce8e" />
            <rect x="478" y="430" width="6" height="6" fill="#ffce8e" />
            <rect x="858" y="335" width="5" height="5" fill="#ffce8e" />
            <rect x="858" y="355" width="5" height="5" fill="#ffce8e" />
            <rect x="958" y="300" width="6" height="6" fill="#ffce8e" />
            <rect x="975" y="320" width="6" height="6" fill="#ffce8e" />
            <rect x="975" y="340" width="6" height="6" fill="#ffce8e" />
            <rect x="1110" y="280" width="8" height="8" fill="#ffce8e" />
            <rect x="1125" y="295" width="8" height="8" fill="#ffce8e" />
            <rect x="1145" y="280" width="8" height="8" fill="#ffce8e" />
          </g>
        )}

        {/* "Zzz" floating during night */}
        {t > 0.3 && t < 0.75 && (
          <g opacity={Math.min(1, Math.min((t - 0.3) * 6, (0.75 - t) * 6))}>
            <text x="750" y="220" fontFamily={FONT_H} fontSize="80" fontWeight="600" fill="#fff5d8" opacity="0.6">Zzz<animate attributeName="y" values="220;200;220" dur="3s" repeatCount="indefinite" /></text>
          </g>
        )}
      </svg>

      {/* Text overlay */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 130, textAlign: "center", color: "#fff5d8" }}>
        <div style={{ fontFamily: FONT_H, fontSize: 52, fontWeight: 600, textShadow: "0 4px 20px rgba(0,0,0,0.8)" }}>{phaseText}</div>
      </div>

      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)", pointerEvents: "none" }} />
    </div>
  );
}

function NotificationToasts({ notifications, dispatch }) {
  useEffect(() => {
    const t = (notifications || []).map((n) => setTimeout(() => dispatch({ type: "DISMISS_NOTIF", id: n.id }), 5000));
    return () => t.forEach(clearTimeout);
  }, [notifications, dispatch]);
  if (!notifications || notifications.length === 0) return null;
  return (
    <div style={{ position: "absolute", bottom: 140, right: 24, display: "flex", flexDirection: "column", gap: 8, zIndex: 18, pointerEvents: "none", maxWidth: 320 }}>
      {notifications.slice(0, 3).map((n) => (
        <div key={n.id} className="popupIn" style={{ background: C.surface, border: `1.5px solid ${C.borderCream}`, borderLeft: `4px solid ${n.color || C.coral}`, borderRadius: 6, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14 }}>{n.icon || "💬"}</span>
            <span style={{ fontFamily: FONT_M, fontSize: 9, color: n.color || C.coral, letterSpacing: "0.2em", fontWeight: 700 }}>{n.from || "VARENA"}</span>
          </div>
          <div style={{ fontFamily: FONT_D, fontSize: 13, color: C.ink, fontWeight: 600, lineHeight: 1.35 }}>{n.title}</div>
          {n.body && <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.4, marginTop: 3 }}>{n.body}</div>}
        </div>
      ))}
    </div>
  );
}

function Popups({ popups, dispatch }) {
  useEffect(() => {
    const t = popups.map((p) => setTimeout(() => dispatch({ type: "DISMISS_POPUP", id: p.id }), 3200));
    return () => t.forEach(clearTimeout);
  }, [popups, dispatch]);
  return (
    <div style={{ position: "absolute", top: 110, left: 22, display: "flex", flexDirection: "column", gap: 8, zIndex: 6, pointerEvents: "none" }}>
      {popups.map((p) => (
        <div key={p.id} className="popupIn" style={{ background: p.type === "level" ? C.gold : p.type === "note" ? C.green : p.type === "quest" ? C.coral : C.blue, color: "#fff", padding: "11px 18px", borderRadius: 4, minWidth: 240, boxShadow: "0 10px 30px rgba(26,16,8,0.25)" }}>
          <div style={{ fontFamily: FONT_D, fontSize: 15, fontWeight: 600 }}>{p.text}</div>
          {p.sub && <div style={{ fontSize: 11, opacity: 0.95, fontFamily: FONT_M, marginTop: 2, letterSpacing: "0.08em" }}>{p.sub}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── INTRO ──────────────────────────────────────────────────
function IntroScreen({ onStart }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${C.bg} 0%, ${C.bg2} 100%)`, zIndex: 50, display: "flex" }}>
      <div style={{ flex: "0 0 50%", padding: "60px 70px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>
        {/* Subtle grid pattern */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none" }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fff" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
            <div style={{ display: "flex", gap: 3 }}>
              <div style={{ width: 8, height: 28, background: C.coral, borderRadius: 1 }} />
              <div style={{ width: 8, height: 28, background: C.gold, borderRadius: 1 }} />
              <div style={{ width: 8, height: 28, background: C.teal, borderRadius: 1 }} />
            </div>
            <div style={{ fontSize: 10, fontFamily: FONT_M, color: C.textCreamDim, letterSpacing: "0.32em", fontWeight: 700 }}>LIFESMART × BANK OF ENGLAND</div>
          </div>
          <div style={{ fontFamily: FONT_H, fontSize: 44, color: C.coral, fontWeight: 600, marginBottom: 4, lineHeight: 0.9 }}>the living</div>
          <div style={{ fontFamily: FONT_D, fontSize: 132, color: C.textCream, fontWeight: 800, letterSpacing: "-0.06em", lineHeight: 0.82, marginBottom: 8 }}>ELARA</div>
          <div style={{ fontFamily: FONT_H, fontSize: 44, color: C.gold, fontWeight: 600, lineHeight: 0.9 }}>economy.</div>
        </div>
        <div style={{ maxWidth: 480, position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: `2px solid ${C.borderL}` }}>
            <span style={{ fontFamily: FONT_M, fontSize: 10, color: C.coral, letterSpacing: "0.28em", fontWeight: 700 }}>ISSUE 01</span>
            <span style={{ fontFamily: FONT_M, fontSize: 10, color: C.textCreamDim, letterSpacing: "0.22em" }}>MONDAY · 08:00 AM</span>
          </div>
          <p style={{ fontSize: 17, color: C.textCream, lineHeight: 1.55, margin: 0, fontFamily: FONT_B, marginBottom: 14 }}>
            <span style={{ background: C.coral, color: "#fff", padding: "3px 9px", fontFamily: FONT_M, fontSize: 11, letterSpacing: "0.18em", fontWeight: 700, marginRight: 8 }}>NEW</span>
            Today: live your own financial life in Varena. Tomorrow: walk into the Reserve and decide it for everyone.
          </p>
          <p style={{ fontSize: 13, color: C.textCreamDim, lineHeight: 1.6, margin: "0 0 24px" }}>
            <strong style={{ color: C.gold }}>Move:</strong> click left/right, or arrow keys. <strong style={{ color: C.gold }}>Map:</strong> top-right button for the full city. <strong style={{ color: C.gold }}>E:</strong> enter a place or talk.
          </p>
          <button onClick={onStart} style={{ background: C.coral, color: "#fff", border: "none", padding: "18px 36px", fontFamily: FONT_M, fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", cursor: "pointer", boxShadow: "0 12px 30px rgba(204,30,40,0.4)", borderRadius: 4 }}>BEGIN THE DAY →</button>
        </div>
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: `linear-gradient(180deg, ${C.skyTop} 0%, ${C.skyMid} 50%, ${C.skyDawn} 100%)` }}>
        <svg viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <circle cx="440" cy="180" r="80" fill="#fff2c8" opacity="0.95" />
          <circle cx="440" cy="180" r="140" fill="#fff2c8" opacity="0.25" />
          <circle cx="440" cy="180" r="200" fill="#fff2c8" opacity="0.1" />
          <path d="M 0 480 Q 100 440 200 470 Q 320 430 460 460 Q 540 450 600 470 L 600 800 L 0 800 Z" fill={C.bg2} opacity="0.6" />
          <path d="M 0 540 Q 80 510 180 530 Q 280 500 380 525 Q 480 510 600 530 L 600 800 L 0 800 Z" fill={C.bg} opacity="0.8" />
          <rect x="0" y="560" width="600" height="240" fill={C.bg} />
          {[
            [20, 500, 60, 100], [90, 450, 50, 150], [150, 400, 80, 200], [240, 470, 40, 130],
            [290, 300, 60, 300], [360, 380, 50, 220], [420, 420, 70, 180], [500, 460, 50, 140], [560, 480, 40, 120]
          ].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={C.bg} />)}
          <polygon points="290,300 320,260 350,300" fill={C.bg} />
          <rect x="316" y="240" width="8" height="30" fill={C.bg} />
          {/* Windows with vibrant glow */}
          {[[40,520],[60,540],[105,470],[105,520],[125,470],[170,420],[170,480],[170,540],[190,440],[190,510],[300,330],[300,380],[300,440],[300,510],[300,570],[320,360],[320,420],[320,480],[320,540],[340,340],[340,420],[340,510],[375,400],[375,460],[375,520],[395,420],[395,500],[435,440],[435,510],[455,480],[475,460],[475,540],[510,490],[530,500],[570,510]].map(([x,y],i) => (
            <rect key={i} x={x} y={y} width="6" height="10" fill={i % 3 === 0 ? C.coral : i % 3 === 1 ? C.gold : C.goldBright} opacity="0.95" />
          ))}
          <ellipse cx="120" cy="170" rx="55" ry="14" fill={C.coral} opacity="0.4" />
          <ellipse cx="170" cy="200" rx="65" ry="12" fill={C.rose} opacity="0.4" />
          <ellipse cx="80" cy="240" rx="40" ry="10" fill={C.coral} opacity="0.55" />
        </svg>
        <div style={{ position: "absolute", top: 24, right: 28, fontFamily: FONT_H, fontSize: 22, color: "#fff", opacity: 0.9, fontWeight: 600 }}>varena, capital of elara</div>
        <div style={{ position: "absolute", bottom: 28, right: 28, fontFamily: FONT_M, fontSize: 9, color: "#fff", letterSpacing: "0.22em", opacity: 0.6, textAlign: "right", fontWeight: 600 }}>A PROTOTYPE FOR<br/>FINANCIAL LITERACY</div>
      </div>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showIntro, setShowIntro] = useState(true);

  // Step movement
  useEffect(() => {
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (state.target !== null) dispatch({ type: "STEP_TO", dt });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.target]);

  // Periodic notifications
  useEffect(() => {
    if (showIntro) return;
    const NOTIFS = [
      { from: "YUSUF", icon: "💬", color: C.coral, title: "Bro, my landlord just messaged. Rent up again.", body: "Third time this year." },
      { from: "VARENA TIMES", icon: "📰", color: C.purple, title: "Food prices jump again across Elara", body: "Grocery basket up 6% this month." },
      { from: "AMARA", icon: "💬", color: C.bMarket, title: "Hi love, can I get a price on this oil?", body: "Suppliers won't talk. Everything's moving." },
      { from: "VARNGRAM", icon: "📱", color: C.rose, title: "@finance_bro_22 just posted", body: "\"This is why everyone should be buying gold rn 🚀\"" },
      { from: "BANK ALERT", icon: "💰", color: C.gold, title: "Your savings earned ₺1.20 in interest", body: "Set up auto-save to grow it faster." },
      { from: "DESTA", icon: "💬", color: C.bCoffee, title: "Loan came up for renewal. They want 9.5%.", body: "It was 6.5% last year. Same business." },
      { from: "RESERVE WIRE", icon: "🏦", color: C.gold, title: "Inflation data due Thursday", body: "Markets bracing." },
      { from: "MUM", icon: "💬", color: C.bFlat, title: "Saw your face on the news. Proud of you.", body: "Don't forget to eat." },
    ];
    let i = 0;
    const id = setInterval(() => {
      if (state.phoneOpen || state.meetingActive || state.openPanel) return;
      dispatch({ type: "PUSH_NOTIF", notif: NOTIFS[i % NOTIFS.length] });
      i++;
    }, 22000);
    // First one after 8s
    const first = setTimeout(() => {
      if (!state.phoneOpen && !state.meetingActive && !state.openPanel) {
        dispatch({ type: "PUSH_NOTIF", notif: NOTIFS[0] });
        i = 1;
      }
    }, 8000);
    return () => { clearInterval(id); clearTimeout(first); };
  }, [showIntro]); // eslint-disable-line

  // Keyboard
  useEffect(() => {
    const down = {};
    const handler = (e) => {
      if (state.openPanel || state.meetingActive || state.phoneOpen || state.mapOpen || showIntro) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") down.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") down.right = true;
      if ((e.key === "e" || e.key === "E")) {
        const { place, dist } = nearestPlace(state.px);
        if (place && dist < 140 && place.type !== "fountain") { dispatch({ type: "OPEN_PANEL", id: place.id }); return; }
        const { npc, dist: nd } = nearestNpc(state.px);
        if (npc && nd < 110) { dispatch({ type: "OPEN_PANEL", id: `npc-${npc.id}` }); }
      }
    };
    window.addEventListener("keydown", handler);
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (down.left && !down.right) dispatch({ type: "WALK", dir: -1, dt });
      else if (down.right && !down.left) dispatch({ type: "WALK", dir: 1, dt });
      else if (state.moving && state.target === null) dispatch({ type: "STOP" });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const up = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") down.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") down.right = false;
    };
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(raf);
    };
  }, [state.px, state.openPanel, state.meetingActive, state.phoneOpen, state.mapOpen, showIntro, state.moving, state.target]);

  // Click-to-walk
  const onWorldClick = (e) => {
    if (state.openPanel || state.meetingActive || state.phoneOpen) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const dir = fx < 0.5 ? -1 : 1;
    const newTarget = Math.max(140, Math.min(WORLD_W - 140, state.px + dir * 500));
    dispatch({ type: "WALK_TO", x: newTarget });
  };

  const nearestThing = (() => {
    const { place, dist: pd } = nearestPlace(state.px);
    const { npc, dist: nd } = nearestNpc(state.px);
    if (place && place.type !== "fountain" && pd < 140 && (!npc || pd < nd)) return { kind: "place", id: place.id, name: place.name };
    if (npc && nd < 110) return { kind: "npc", id: npc.id, name: npc.label };
    return { kind: null };
  })();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Caveat:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; color: ${C.text}; font-family: ${FONT_B}; overflow: hidden; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popupIn { 0% { opacity: 0; transform: translateX(-30px) scale(0.9); } 70% { opacity: 1; transform: translateX(0) scale(1.05); } 100% { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        .popupIn { animation: popupIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        input[type=range] { height: 6px; -webkit-appearance: none; background: ${C.surface3}; border-radius: 3px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; background: ${C.coral}; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 6px rgba(26,16,8,0.3); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      `}</style>
      <div style={{ width: "100vw", height: "100vh", background: C.bg, position: "relative", overflow: "hidden", fontFamily: FONT_B }}>
        <div onClick={onWorldClick} style={{ width: "100%", height: "100%", cursor: "pointer" }}>
          <StreetScene state={state} dispatch={dispatch} nearestThing={nearestThing} />
        </div>
        <HUD state={state} />
        <Popups popups={state.popups} dispatch={dispatch} />
        <NotificationToasts notifications={state.notifications} dispatch={dispatch} />
        <PhoneWidget state={state} dispatch={dispatch} />
        <button onClick={() => dispatch({ type: "TOGGLE_MAP" })} style={{ position: "absolute", top: 22, right: 22, background: C.surface, color: C.ink, border: `2px solid ${C.coral}`, padding: "10px 18px", fontFamily: FONT_M, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", cursor: "pointer", borderRadius: 4, boxShadow: "0 6px 18px rgba(0,0,0,0.4)", zIndex: 8, display: "flex", alignItems: "center", gap: 8 }}>
          🗺 <span>MAP</span>
        </button>
        {state.mapOpen && <TreasureMap state={state} dispatch={dispatch} />}

        <div style={{ position: "absolute", bottom: 24, left: 22, background: C.surface, border: `1.5px solid ${C.borderCream}`, borderRadius: 4, padding: "9px 16px", fontSize: 10, fontFamily: FONT_M, color: C.text, letterSpacing: "0.15em", fontWeight: 600, boxShadow: "0 4px 14px rgba(0,0,0,0.3)" }}>
          ← → WALK · E ENTER / TALK · 🗺 MAP
        </div>

        {state.phoneOpen && <PhonePanel state={state} dispatch={dispatch} />}
        {state.meetingActive && <MeetingRoom state={state} dispatch={dispatch} />}
        {state.pressActive && <PressConference state={state} dispatch={dispatch} />}
        {state.montageActive && <ConsequenceMontage state={state} dispatch={dispatch} />}
        {state.sleepAnim > 0 && <SleepAnimation state={state} dispatch={dispatch} />}
        {state.openPanel === "reserve-locked" && (
          <PanelShell title="Locked until Tuesday" sub="The Elaran Reserve" onClose={() => dispatch({ type: "CLOSE_PANEL" })} accent={C.gold}>
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.65, marginTop: 0, marginBottom: 14 }}>The security guard checks her clipboard. <em>"You don't start until tomorrow. Get some rest. Sort your own affairs out. Walk the city if you like — you'll be making decisions for it soon enough."</em></p>
            <div style={{ background: `${C.gold}15`, padding: "12px 14px", borderLeft: `3px solid ${C.gold}`, borderRadius: 4, fontSize: 13, color: C.text, lineHeight: 1.55 }}>
              <strong style={{ color: C.gold }}>Today's job:</strong> live your own financial life. Try the Bank's <em>Future You</em> game. Try the Stock Exchange. Talk to people on the street. Sleep when you've done three things.
            </div>
          </PanelShell>
        )}
        {state.openPanel === "reserve" && !state.meetingActive && state.briefingDone && (
          <PanelShell title="Elaran Reserve · Floor 8" sub="After the meeting" onClose={() => dispatch({ type: "CLOSE_PANEL" })} accent={C.gold}>
            <p style={{ color: C.text }}>The committee's gone home. The decision is made. The rate is <strong>{pct(state.interestRate)}</strong>. You should walk the city and see how it's landing.</p>
          </PanelShell>
        )}
        {state.openPanel === "stocks" && <StockExchangePanel state={state} dispatch={dispatch} />}
        {(state.openPanel === "bank" || state.openPanel === "fbank") && <BankPanel state={state} dispatch={dispatch} />}
        {state.openPanel === "market" && <MarketPanel state={state} dispatch={dispatch} />}
        {state.openPanel === "coffee" && <CoffeePanel state={state} dispatch={dispatch} />}
        {state.openPanel === "cinema" && <CinemaPanel state={state} dispatch={dispatch} />}
        {state.openPanel === "flat" && <FlatPanel state={state} dispatch={dispatch} />}
        {state.openPanel?.startsWith?.("npc-") && (() => {
          const id = state.openPanel.replace("npc-", "");
          const npc = NPCS.find((n) => n.id === id);
          return npc ? <NpcDialogue npc={npc} dispatch={dispatch} state={state} /> : null;
        })()}

        {showIntro && <IntroScreen onStart={() => setShowIntro(false)} />}
      </div>
    </>
  );
}

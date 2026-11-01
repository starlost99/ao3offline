// world.js — the keepsake scenes: graveyard, graveyard grounds, Bram’s cottage, celebrations,
// constellation, aquarium, bookshelf, garden, Hollowbrook village, the chapel (stained glass), the bell tower, Hawkins. Web app only; AO3 never loads this.
// app.js fetches it the first time a keepsake is opened and calls __ao3WorldInit once, handing over the
// tracker helpers listed below. Nothing in here touches AO3 pages.
window.__ao3WorldInit = function (core) {
  'use strict';
  const { READ_LOG_KEY, wordsToReadMinutes, formatReadTime, readChapterFor, getTracked, setManualAbandoned, nvEnsureCss, daysSince, fmtWords, isWip, renderDashboard, gyStore, ccStore, GY2_KEY, CC_KEY, GY_FLOWERS_KEY } = core;

  // ── 🪦 FIC GRAVEYARD ──
  // A night-time tribute to abandoned fics (unfinished and either marked abandoned
  // or silent for STALE_DAYS+). One tombstone each; tap one for the eulogy.
  // Read-only except for the "Resurrect" button (same override as the dashboard's
  // abandon toggle) and the flowers/notes, kept under their own key.
  const GY_FLOWERS = [
    { e: "🌹", n: "Rose" }, { e: "🌷", n: "Tulip" }, { e: "🌻", n: "Sunflower" }, { e: "🌼", n: "Daisy" },
    { e: "🌸", n: "Blossom" }, { e: "💐", n: "Bouquet" }, { e: "🥀", n: "Wilted rose" },
  ];
  function gyRec(id, store) { const r = (store || gyStore())[id] || {}; return { c: r.c || {}, notes: r.notes || [], lit: r.lit || 0, lc: r.lc || 0, ep: r.ep || "" }; }
  // Candles: lighting sets an expiry (ms). A candle burns for GY_CANDLE_MS, relighting resets it.
  const GY_CANDLE_MS = 3 * 86400000;
  function gyLight(id) {
    const s = gyStore();
    const r = s[id] || (s[id] = { c: {}, notes: [] });
    r.lit = Date.now() + GY_CANDLE_MS; r.lc = (r.lc || 0) + 1;
    try { localStorage.setItem(GY2_KEY, JSON.stringify(s)); } catch {}
    return gyRec(id, s);
  }
  // Your own epitaph for a fic (overrides the generated one). Empty text = back to generated.
  function gySetEpitaph(id, text) {
    const s = gyStore();
    const r = s[id] || (s[id] = { c: {}, notes: [] });
    const t = (text || "").trim().slice(0, 80);
    if (t) r.ep = t; else delete r.ep;
    try { localStorage.setItem(GY2_KEY, JSON.stringify(s)); } catch {}
    return t;
  }
  function gyLeft(ms) {
    const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.max(1, Math.floor((ms % 3600000) / 60000));
    return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  function gyTotal(r) { return Object.values(r.c).reduce((a, n) => a + n, 0); }
  function gyAddFlower(id, emoji, note) {
    const s = gyStore();
    const r = s[id] || (s[id] = { c: {}, notes: [] });
    r.c = r.c || {}; r.notes = r.notes || [];
    r.c[emoji] = (r.c[emoji] || 0) + 1;
    const t = (note || "").trim().slice(0, 100);
    if (t) { r.notes.push({ e: emoji, t, d: new Date().toISOString().slice(0, 10) }); if (r.notes.length > 30) r.notes.shift(); }
    try { localStorage.setItem(GY2_KEY, JSON.stringify(s)); } catch {}
    return gyRec(id, s);
  }
  function gyHash(str) { let h = 0; for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
  function abandonedFics() { return getTracked().filter(f => !f.finished && !isWip(f)); }
  function gyEpitaph(f) {
    const total = f.totalChapters || 1;
    const planned = parseInt(((f.chaptersLabel || "").split("/")[1]) || "", 10);
    const quiet = daysSince(f.lastUpdate) || 0;
    if (planned && total / planned >= 0.8) return "So close to the end.";
    if (f.words >= 100000) return "A long life, well written.";
    if (total <= 3) return "Gone too soon.";
    if (quiet >= 730) return "Gone, but never forgotten.";
    if (f.avgUpdateDays && f.avgUpdateDays <= 7) return "Updated weekly, until it didn’t.";
    if (!f.currentChapter) return "Bookmarked, never begun.";
    const pool = [
      "Left mid-scene.", "Last seen on a cliffhanger.", "Not dead, only resting?", "The kudos live on.",
      "Beloved by at least one reader.", "Dust gathers; hope remains.", "The plot thickened, then stopped.",
      "Ship sailed. Author didn’t.", "Still in the drafts, somewhere.", "It had so much left to say.",
      "Fell silent after the confession scene.", "The tags promised more.", "Gone to the great hiatus.",
      "Its comments section still weeps.", "One more chapter, they said.", "Rest well, sweet WIP.",
    ];
    return pool[gyHash(f.workId) % pool.length];
  }
  function gyAgo(d) {
    if (d == null) return "—";
    if (d < 60) return `${d} day${d === 1 ? "" : "s"}`;
    if (d < 730) return `${Math.round(d / 30)} months`;
    return `${(d / 365).toFixed(1).replace(/\.0$/, "")} years`;
  }

  function openGraveyard() {
    const old = document.getElementById("ao3-graveyard");
    if (old) old.remove();
    nvEnsureCss();
    if (!document.getElementById("ao3-gy-css")) {
      const st = document.createElement("style");
      st.id = "ao3-gy-css";
      st.textContent = `
        @keyframes nvGhost{0%{transform:translate(-12vw,0);opacity:0}10%{opacity:.35}50%{transform:translate(50vw,-26px)}90%{opacity:.35}100%{transform:translate(110vw,10px);opacity:0}}
        @keyframes nvFirefly{0%,100%{opacity:.1;transform:translate(0,0)}25%{opacity:1;transform:translate(10px,-8px)}50%{opacity:.3;transform:translate(-6px,-16px)}75%{opacity:1;transform:translate(8px,-6px)}}
        @keyframes nvPetal{0%{opacity:1;transform:translate(0,0) scale(.6) rotate(0)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.15) rotate(var(--rot))}}
        @keyframes nvPop{0%{transform:scale(0) translateY(-18px);opacity:0}60%{transform:scale(1.35) translateY(2px);opacity:1}100%{transform:scale(1) translateY(0)}}
        @keyframes nvFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes nvFall{0%{opacity:0;transform:translateY(0) rotate(0)}10%{opacity:1}100%{opacity:.9;transform:translateY(105vh) rotate(var(--rot))}}
        @media (prefers-reduced-motion: reduce){.nv-anim{animation:none !important}}
      `;
      (document.head || document.documentElement).appendChild(st);
    }
    const el = (tag, css, text) => {
      const e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (text != null) e.textContent = text;
      return e;
    };
    const anim = (node) => { node.className = "nv-anim"; return node; };
    const iso = d => (d ? String(d).slice(0, 10) : null);
    const yearOf = d => (d ? String(d).slice(0, 4) : "?");
    const fics = abandonedFics();
    const bornOf = f => ((f.chapterDates || []).slice().sort()[0]) || iso(f.trackedAt);
    const livedOf = f => {
      const b = bornOf(f);
      return (b && f.lastUpdate) ? Math.max(0, Math.round((new Date(f.lastUpdate) - new Date(b)) / 86400000)) : null;
    };
    const yearsOf = f => {
      const b = yearOf(bornOf(f)), d = yearOf(f.lastUpdate);
      return b === d ? b : `${b} – ${d}`;
    };
    const titleOf = f => f.title || `Work ${f.workId}`;

    // ── shell: always a night sky, whatever the page theme ──
    // Anchored top AND bottom (with safe-area insets) so nothing hides under a phone's browser bar.
    const back = el("div", "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000002;");
    back.id = "ao3-graveyard";
    const box = el("div", "position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:8px;right:8px;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;font-family:inherit;color:#e9e4f5;background:linear-gradient(180deg,#0b0818 0%,#1a1233 55%,#2b1c3f 100%);border:1px solid rgba(190,170,255,0.25);box-shadow:0 8px 40px rgba(0,0,0,0.6);");
    back.appendChild(box);

    // scenery: stars, moon, a bat, fireflies, fence, fog
    const rnd = seed => { const x = Math.sin(gyHash(seed) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const scene = el("div", "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;");
    for (let i = 0; i < 38; i++) {
      const sz = 1 + (gyHash("sz" + i) % 20) / 10;
      scene.appendChild(anim(el("span", `position:absolute;left:${(rnd("x" + i) * 100).toFixed(1)}%;top:${(rnd("y" + i) * 50).toFixed(1)}%;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;opacity:0.7;animation:nvTwinkle ${2 + (gyHash("d" + i) % 30) / 10}s ease-in-out ${(gyHash("t" + i) % 30) / 10}s infinite;`)));
    }
    scene.appendChild(el("div", "position:absolute;top:76px;right:22px;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fffbe6,#e8dfb0 70%);box-shadow:0 0 28px 8px rgba(255,248,200,0.25);"));
    scene.appendChild(anim(el("span", "position:absolute;top:110px;left:0;font-size:16px;opacity:0.8;animation:nvBat 18s linear 2s infinite;", "🦇")));
    for (let i = 0; i < 12; i++) {
      scene.appendChild(anim(el("span", `position:absolute;left:${(rnd("fx" + i) * 96).toFixed(1)}%;top:${(55 + rnd("fy" + i) * 40).toFixed(1)}%;width:3px;height:3px;border-radius:50%;background:#f6e27a;box-shadow:0 0 6px 2px rgba(246,226,122,0.55);opacity:.1;animation:nvFirefly ${6 + gyHash("fd" + i) % 5}s ease-in-out ${(gyHash("ft" + i) % 40) / 10}s infinite;`)));
    }
    scene.appendChild(el("div", "position:absolute;left:0;right:0;bottom:0;height:34px;opacity:.75;background:linear-gradient(#120c20,#120c20) 0 12px/100% 3px no-repeat, repeating-linear-gradient(90deg,#120c20 0 4px,transparent 4px 16px);"));
    scene.appendChild(anim(el("div", "position:absolute;left:-10%;right:-10%;bottom:0;height:110px;background:linear-gradient(0deg, rgba(200,190,230,0.2), transparent);animation:nvFog 12s ease-in-out infinite;")));
    box.appendChild(scene);
    const rainLayer = el("div", "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:4;");
    box.appendChild(rainLayer);

    // ── top bar ──
    const topbar = el("div", "position:relative;z-index:2;flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(190,170,255,0.22);background:rgba(10,8,24,0.55);");
    const ttl = el("div", "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;");
    ttl.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:15px;letter-spacing:0.05em;line-height:1.2;text-transform:uppercase;color:#d9d0f5;white-space:normal;overflow-wrap:anywhere;", "🪦 Fic Graveyard"));
    const sub = el("div", "font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.04em;color:rgba(217,208,245,0.6);white-space:normal;line-height:1.35;");
    ttl.appendChild(sub);
    topbar.appendChild(ttl);
    const tbRight = el("div", "display:flex;align-items:center;gap:8px;flex:0 0 auto;");
    const allBtn = el("button", "cursor:pointer;font:inherit;font-size:10px;border-radius:999px;padding:2px 8px;border:none;background:none;color:rgba(217,208,245,0.4);white-space:nowrap;", "flowers for all");
    allBtn.type = "button";
    allBtn.title = "Lay one bouquet on every grave";
    const xBtn = el("button", "background:none;border:none;color:rgba(217,208,245,0.7);cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px;", "✕");
    if (fics.length) {
      const groundsBtn = el("button", "cursor:pointer;font:inherit;font-size:10px;border-radius:999px;padding:2px 8px;border:none;background:none;color:rgba(217,208,245,0.4);white-space:nowrap;", "grounds \u203A");
      groundsBtn.type = "button";
      groundsBtn.title = "Wander the graveyard grounds";
      groundsBtn.onclick = () => openGraveyardGrounds();
      tbRight.appendChild(groundsBtn);
    }
    tbRight.appendChild(xBtn);
    topbar.appendChild(tbRight);
    box.appendChild(topbar);

    const body = el("div", "position:relative;z-index:1;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding:26px 12px 64px;");
    box.appendChild(body);

    const onKey = e => { if (e.key === "Escape") close(); };
    const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
    xBtn.onclick = close;
    back.addEventListener("click", e => { if (e.target === back) close(); });
    document.addEventListener("keydown", onKey);

    // petals / bouquets falling over the whole graveyard
    const rain = (emojis, n) => {
      for (let i = 0; i < n; i++) {
        const s = anim(el("span", `position:absolute;top:-28px;left:${(Math.random() * 94).toFixed(1)}%;font-size:${16 + Math.random() * 10}px;opacity:0;--rot:${(Math.random() * 360 - 180) | 0}deg;animation:nvFall ${(2.2 + Math.random() * 1.8).toFixed(2)}s ease-in ${(Math.random() * 0.9).toFixed(2)}s forwards;`, emojis[i % emojis.length]));
        rainLayer.appendChild(s);
        setTimeout(() => s.remove(), 5200);
      }
    };

    // ── eulogy sheet ──
    const openEulogy = f => {
      const prev = document.getElementById("ao3-eulogy");
      if (prev) prev.remove();
      const ov = el("div", "position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000003;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;");
      ov.id = "ao3-eulogy";
      const bx = el("div", "position:relative;background:linear-gradient(180deg,#26203d,#171128);color:#e9e4f5;border:1px solid rgba(190,170,255,0.35);border-radius:14px;width:100%;max-width:440px;max-height:90%;overflow-y:auto;overflow-x:hidden;padding:18px 18px 16px;box-sizing:border-box;font-family:inherit;box-shadow:0 12px 40px rgba(0,0,0,0.6);text-align:center;");

      bx.appendChild(el("div", "font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(217,208,245,0.6);", "🪦 In loving memory of"));
      bx.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:700;line-height:1.25;margin:6px 0 2px;color:#f3eeff;overflow-wrap:anywhere;", titleOf(f)));
      bx.appendChild(el("div", "font-family:'Courier New',Courier,monospace;font-size:12px;color:rgba(217,208,245,0.75);", yearsOf(f)));
      const quote = el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;color:rgba(217,208,245,0.85);margin:10px 0 2px;overflow-wrap:anywhere;");
      const paintQuote = () => { quote.textContent = `\u201C${gyRec(f.workId).ep || gyEpitaph(f)}\u201D`; };
      paintQuote();
      bx.appendChild(quote);
      const editLink = el("button", "background:none;border:none;cursor:pointer;font:inherit;font-size:10.5px;color:rgba(217,208,245,0.45);padding:2px 6px;margin-bottom:8px;", "\u270E write your own");
      editLink.type = "button";
      const editRow = el("div", "display:none;gap:6px;margin:4px 0 10px;align-items:center;");
      const epIn = el("input", "flex:1;min-width:0;box-sizing:border-box;font:inherit;font-size:12.5px;padding:7px 10px;border-radius:8px;border:1px solid rgba(190,170,255,0.3);background:rgba(0,0,0,0.25);color:#e9e4f5;outline:none;");
      epIn.type = "text"; epIn.maxLength = 80; epIn.placeholder = "Your epitaph\u2026";
      const miniCss = "cursor:pointer;font:inherit;font-size:11.5px;font-weight:600;border-radius:8px;padding:7px 9px;border:1px solid rgba(190,170,255,0.35);background:rgba(255,255,255,0.07);color:#e9e4f5;white-space:nowrap;";
      const epSave = el("button", miniCss, "Save"); epSave.type = "button";
      const epAuto = el("button", miniCss + "opacity:.75;", "Auto"); epAuto.type = "button";
      epAuto.title = "Go back to the generated epitaph";
      const saveEp = (txt) => { gySetEpitaph(f.workId, txt); paintQuote(); editRow.style.display = "none"; editLink.textContent = "\u270E write your own"; };
      epSave.onclick = () => saveEp(epIn.value);
      epAuto.onclick = () => { epIn.value = ""; saveEp(""); };
      epIn.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); saveEp(epIn.value); } };
      editLink.onclick = () => {
        const open = editRow.style.display === "none";
        editRow.style.display = open ? "flex" : "none";
        editLink.textContent = open ? "\u2715 cancel" : "\u270E write your own";
        if (open) { epIn.value = gyRec(f.workId).ep || ""; epIn.focus(); }
      };
      editRow.appendChild(epIn); editRow.appendChild(epSave); editRow.appendChild(epAuto);
      bx.appendChild(editLink); bx.appendChild(editRow);

      const born = bornOf(f);
      const quiet = daysSince(f.lastUpdate);
      const lived = livedOf(f);
      const plannedRaw = ((f.chaptersLabel || "").split("/")[1]) || "?";
      const plannedN = /^\d+$/.test(plannedRaw) ? parseInt(plannedRaw, 10) : null;
      const posted = f.totalChapters || 1;
      const readTo = f.currentChapter ? Math.min(f.currentChapter, posted) : 0;
      const rows = [
        ["Born", born || "—"],
        ["Last breath", f.lastUpdate ? `${f.lastUpdate}${quiet != null ? ` (${quiet}d ago)` : ""}` : "—"],
        ["Silent for", quiet != null ? gyAgo(quiet) : "—"],
        ["Cause", f.manualAbandoned === true ? "Laid to rest by you" : `Silence${quiet != null ? ` (${quiet} days)` : ""}`],
        ["Lived", lived != null ? `${lived} days` : "—"],
        ["Chapters", `${posted}/${plannedRaw}`],
        ["You read to", readTo ? `ch ${readTo}` : "—"],
        ["Words", fmtWords(f.words)],
        ["Avg update", f.avgUpdateDays != null ? `${f.avgUpdateDays}d` : "—"],
      ];
      const tbl = el("div", "display:grid;grid-template-columns:auto 1fr;gap:5px 14px;text-align:left;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(190,170,255,0.18);");
      rows.forEach(([k, v]) => {
        tbl.appendChild(el("div", "font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(217,208,245,0.55);align-self:center;", k));
        tbl.appendChild(el("div", "font-size:12.5px;font-weight:600;color:#e9e4f5;", v));
      });
      bx.appendChild(tbl);

      // little life-story bars: how much got written, how much you read
      const bars = el("div", "margin-top:10px;display:flex;flex-direction:column;gap:6px;text-align:left;");
      const bar = (label, val, max, color) => {
        const r = el("div", "display:flex;align-items:center;gap:8px;");
        r.appendChild(el("div", "width:64px;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(217,208,245,0.55);", label));
        const tr = el("div", "flex:1;height:7px;border-radius:4px;background:rgba(255,255,255,0.09);overflow:hidden;");
        tr.appendChild(el("div", `height:100%;width:${Math.max(2, Math.min(100, Math.round(100 * val / Math.max(1, max))))}%;border-radius:4px;background:${color};`));
        r.appendChild(tr);
        r.appendChild(el("div", "width:46px;text-align:right;font-size:10.5px;font-family:'Courier New',Courier,monospace;color:rgba(217,208,245,0.75);", `${val}/${max}`));
        return r;
      };
      if (plannedN) bars.appendChild(bar("Written", Math.min(posted, plannedN), plannedN, "#b79cf0"));
      bars.appendChild(bar("You read", readTo, posted, "#e7a4c4"));
      bx.appendChild(bars);

      // ── flowers: pick a kind, lay it, optionally leave a note ──
      const sec = el("div", "margin-top:14px;padding:10px 10px 12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(190,170,255,0.18);");
      const secHead = el("div", "font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(217,208,245,0.65);");
      const plot = el("div", "min-height:34px;margin:8px 0 8px;font-size:21px;line-height:1.2;display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-end;gap:0 1px;padding-bottom:4px;border-bottom:3px solid #1d3322;");
      const picker = el("div", "display:flex;flex-wrap:wrap;justify-content:center;gap:6px;");
      const noteIn = el("input", "box-sizing:border-box;width:100%;margin-top:10px;font:inherit;font-size:12.5px;padding:7px 10px;border-radius:8px;border:1px solid rgba(190,170,255,0.3);background:rgba(0,0,0,0.25);color:#e9e4f5;outline:none;");
      noteIn.type = "text"; noteIn.maxLength = 100;
      noteIn.placeholder = "Leave a few words with your flower (optional)";
      const notesBox = el("div", "margin-top:8px;display:flex;flex-direction:column;gap:4px;text-align:left;");
      const pickBtns = {};
      const candleBtn = el("button", "cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;width:100%;margin-top:8px;border-radius:8px;padding:8px 10px;border:1px solid rgba(255,190,100,0.4);background:rgba(255,190,100,0.08);color:#ffe3b3;-webkit-tap-highlight-color:transparent;");
      candleBtn.type = "button";
      const paintCandle = () => {
        const left = gyRec(f.workId).lit - Date.now();
        if (left > 0) { candleBtn.textContent = `🕯️ Candle lit \u00B7 burns out in ${gyLeft(left)} \u00B7 tap to relight`; candleBtn.style.boxShadow = "0 0 14px rgba(255,180,80,0.35)"; }
        else { candleBtn.textContent = "🕯️ Light a candle (burns 3 days)"; candleBtn.style.boxShadow = "none"; }
      };
      candleBtn.onclick = () => {
        gyLight(f.workId);
        try { if (navigator.vibrate) navigator.vibrate(12); } catch {}
        burst(candleBtn, "\u2728");
        paintCandle();
      };
      const paintSec = (popEmoji) => {
        const r = gyRec(f.workId);
        secHead.textContent = `Flowers laid · ${gyTotal(r)}`;
        plot.innerHTML = "";
        if (!gyTotal(r)) plot.appendChild(el("div", "font-size:11px;font-style:italic;color:rgba(217,208,245,0.5);align-self:center;", "Nothing here yet. Be the first."));
        GY_FLOWERS.forEach(t => {
          const n = r.c[t.e] || 0;
          for (let i = 0; i < Math.min(n, 5); i++) {
            const s = el("span", `display:inline-block;margin:0 -2px;transform:rotate(${((gyHash(t.e + i) % 21) - 10)}deg);`, t.e);
            if (popEmoji === t.e && i === Math.min(n, 5) - 1) { s.style.animation = "nvPop .5s ease-out"; s.className = "nv-anim"; }
            plot.appendChild(s);
          }
          if (n > 5) plot.appendChild(el("span", "font-size:10px;font-weight:700;color:rgba(217,208,245,0.8);align-self:center;margin:0 3px;", `×${n}`));
        });
        GY_FLOWERS.forEach(t => { pickBtns[t.e].count.textContent = r.c[t.e] || ""; });
        notesBox.innerHTML = "";
        r.notes.slice(-4).reverse().forEach(nt => {
          const line = el("div", "font-size:11.5px;line-height:1.35;color:rgba(233,228,245,0.85);padding:5px 8px;border-radius:7px;background:rgba(255,255,255,0.05);overflow-wrap:anywhere;");
          line.appendChild(el("span", "", `${nt.e} `));
          line.appendChild(el("span", "font-style:italic;font-family:Georgia,'Times New Roman',serif;", `“${nt.t}”`));
          line.appendChild(el("span", "font-size:9.5px;color:rgba(217,208,245,0.45);margin-left:6px;", nt.d || ""));
          notesBox.appendChild(line);
        });
      };
      const burst = (btn, emoji) => {
        const br = btn.getBoundingClientRect(), xr = bx.getBoundingClientRect();
        const cx = br.left - xr.left + br.width / 2, cy = br.top - xr.top + bx.scrollTop + br.height / 2;
        for (let i = 0; i < 9; i++) {
          const ang = (Math.PI * 2 * i) / 9 + Math.random() * 0.5;
          const dist = 36 + Math.random() * 34;
          const p = el("span", `position:absolute;left:${cx - 8}px;top:${cy - 10}px;font-size:${12 + Math.random() * 8}px;pointer-events:none;z-index:5;--dx:${(Math.cos(ang) * dist).toFixed(0)}px;--dy:${(Math.sin(ang) * dist - 26).toFixed(0)}px;--rot:${(Math.random() * 240 - 120) | 0}deg;animation:nvPetal ${(0.7 + Math.random() * 0.4).toFixed(2)}s ease-out forwards;`, emoji);
          p.className = "nv-anim";
          bx.appendChild(p);
          setTimeout(() => p.remove(), 1300);
        }
      };
      GY_FLOWERS.forEach(t => {
        const b = el("button", "position:relative;cursor:pointer;font:inherit;font-size:21px;line-height:1;width:44px;height:44px;border-radius:10px;border:1px solid rgba(190,170,255,0.3);background:rgba(255,255,255,0.07);color:#e9e4f5;padding:0;-webkit-tap-highlight-color:transparent;");
        b.type = "button"; b.title = `Lay a ${t.n.toLowerCase()}`;
        b.appendChild(el("span", "", t.e));
        const count = el("span", "position:absolute;right:3px;bottom:1px;font-size:9px;font-weight:700;color:#f3eeff;text-shadow:0 1px 2px #000;");
        b.appendChild(count);
        b.onclick = () => {
          gyAddFlower(f.workId, t.e, noteIn.value);
          noteIn.value = "";
          try { if (navigator.vibrate) navigator.vibrate(12); } catch {}
          burst(b, t.e);
          paintSec(t.e);
        };
        pickBtns[t.e] = { count };
        picker.appendChild(b);
      });
      sec.appendChild(secHead); sec.appendChild(plot); sec.appendChild(picker); sec.appendChild(candleBtn); sec.appendChild(noteIn); sec.appendChild(notesBox);
      bx.appendChild(sec);
      paintSec(null);
      paintCandle();

      const btnCss = "cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;border-radius:8px;padding:7px 12px;border:1px solid rgba(190,170,255,0.35);background:rgba(255,255,255,0.07);color:#e9e4f5;";
      const btns = el("div", "display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:14px;");
      const visitBtn = el("button", btnCss, "Visit grave");
      visitBtn.type = "button";
      visitBtn.title = "Open the fic on AO3";
      visitBtn.onclick = () => { location.href = `https://archiveofourown.org/works/${f.workId}`; };
      const raiseBtn = el("button", btnCss, "↺ Resurrect");
      raiseBtn.type = "button";
      raiseBtn.title = "Move it back to your active fics";
      raiseBtn.onclick = () => {
        setManualAbandoned(f.workId, false);
        closeE();
        try { renderDashboard(); } catch {}
        openGraveyard();
      };
      const doneBtn = el("button", btnCss, "Close");
      doneBtn.type = "button";
      btns.appendChild(visitBtn); btns.appendChild(raiseBtn); btns.appendChild(doneBtn);
      bx.appendChild(btns);
      bx.appendChild(el("div", "font-size:10px;color:rgba(217,208,245,0.45);margin-top:10px;", "Resurrect keeps it in Active, even if it stays silent."));

      ov.appendChild(bx);
      const onKeyE = e => { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); closeE(); } };
      const closeE = () => { ov.remove(); document.removeEventListener("keydown", onKeyE, true); refresh(); };
      doneBtn.onclick = closeE;
      ov.addEventListener("click", e => { if (e.target === ov) closeE(); });
      document.addEventListener("keydown", onKeyE, true);
      document.body.appendChild(ov);
    };

    // ── tombstones ──
    const grid = el("div", "display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:38px 10px;align-items:end;padding-top:16px;");
    const makeGrave = (f, rec) => {
      const h = gyHash(f.workId);
      // top padding is generous on the arched shapes so text sits inside the curve, never past it
      const shapes = [
        { radius: "64px 64px 6px 6px / 54px 54px 6px 6px", pad: "40px 12px 14px" },
        { radius: "14px 14px 4px 4px", pad: "22px 8px 14px" },
        { radius: "28px 28px 4px 4px / 46px 46px 4px 4px", pad: "34px 10px 14px" },
      ];
      const sh = shapes[h % 3];
      const lit = rec.lit > Date.now();
      const rot = (((h >> 3) % 5) - 2) * 0.8;
      const cell = el("div", "position:relative;display:flex;flex-direction:column;align-items:center;");
      const tomb = el("div", `position:relative;width:100%;max-width:170px;min-height:140px;box-sizing:border-box;padding:${sh.pad};border-radius:${sh.radius};background:linear-gradient(180deg,#9a97ad 0%,#6b6882 100%);border:2px solid rgba(255,255,255,0.14);box-shadow:inset 0 2px 6px rgba(255,255,255,0.18), inset 0 -8px 14px rgba(0,0,0,0.25), 0 6px 14px rgba(0,0,0,0.5)${lit ? ",0 0 24px 5px rgba(255,180,80,0.38)" : ""};color:#26233a;text-align:center;cursor:pointer;transform:rotate(${rot}deg);-webkit-tap-highlight-color:transparent;text-shadow:0 1px 0 rgba(255,255,255,0.35);display:flex;flex-direction:column;align-items:center;gap:5px;`);
      tomb.setAttribute("role", "button");
      tomb.setAttribute("tabindex", "0");
      tomb.title = "Read the eulogy";
      tomb.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-size:9px;font-weight:700;letter-spacing:0.22em;", "R.I.P."));
      tomb.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-size:11.5px;font-weight:700;line-height:1.25;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;max-width:100%;", titleOf(f)));
      tomb.appendChild(el("div", "width:28px;height:1px;background:rgba(38,35,58,0.45);margin:1px 0;"));
      tomb.appendChild(el("div", "font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;", yearsOf(f)));
      const planned = ((f.chaptersLabel || "").split("/")[1]) || "?";
      tomb.appendChild(el("div", "font-size:9.5px;", `ch ${f.totalChapters || 1}/${planned}`));
      tomb.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:9.5px;line-height:1.3;opacity:0.85;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;max-width:100%;", rec.ep || gyEpitaph(f)));
      if (h % 4 === 0) tomb.appendChild(el("div", "position:absolute;left:6%;bottom:0;width:32%;height:9px;border-radius:9px 9px 0 0;background:#4c7a4f;opacity:.6;"));
      tomb.onclick = () => openEulogy(f);
      tomb.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEulogy(f); } };
      if (lit) cell.appendChild(anim(el("div", "position:absolute;left:-14%;right:-14%;top:12%;bottom:-12px;border-radius:50%;background:radial-gradient(ellipse at 50% 65%,rgba(255,190,100,0.32),transparent 68%);pointer-events:none;animation:nvFlicker 2.4s ease-in-out infinite;")));
      cell.appendChild(tomb);
      cell.appendChild(el("div", "width:118%;height:16px;margin-top:-8px;border-radius:50%;background:radial-gradient(ellipse at 50% 30%,#2f4a33,#14241a);box-shadow:0 4px 8px rgba(0,0,0,0.5);position:relative;"));

      // flowers laid at the foot of the stone
      const laid = GY_FLOWERS.filter(t => rec.c[t.e] > 0);
      if (laid.length) {
        const row = el("div", "position:absolute;left:0;right:0;bottom:-6px;display:flex;justify-content:center;align-items:flex-end;font-size:14px;line-height:1;pointer-events:none;filter:drop-shadow(0 2px 2px rgba(0,0,0,.5));");
        laid.slice(0, 6).forEach((t, i) => row.appendChild(el("span", `margin:0 -1px;transform:rotate(${((gyHash(t.e + i) % 17) - 8)}deg);`, t.e)));
        const total = gyTotal(rec);
        if (total > Math.min(laid.length, 6)) row.appendChild(el("span", "font-size:9px;font-weight:700;color:#f3eeff;margin-left:4px;align-self:center;text-shadow:0 1px 2px #000;", `×${total}`));
        cell.appendChild(row);
      }
      // a bit of seasonal clutter on some graves
      if (h % 100 < 38) {
        const decor = ["🎃", "🍄", "🕸️", "🌿", "🍂"][(h >> 5) % 5];
        cell.appendChild(el("span", "position:absolute;left:0;bottom:2px;font-size:15px;pointer-events:none;", decor));
      }
      if (lit) {
        const candle = anim(el("span", "position:absolute;bottom:2px;right:1%;font-size:17px;filter:drop-shadow(0 0 6px rgba(255,190,100,0.9));animation:nvFlicker 1.6s ease-in-out infinite;", "🕯️"));
        candle.title = `Candle burns out in ${gyLeft(rec.lit - Date.now())}`;
        cell.appendChild(candle);
      }
      return cell;
    };

    // ── sorting chips, stats, grid ──
    let sortMode = "fresh";
    const sorters = {
      fresh: () => (a, b) => (daysSince(a.lastUpdate) ?? 1e9) - (daysSince(b.lastUpdate) ?? 1e9),
      old: () => (a, b) => (daysSince(b.lastUpdate) ?? -1) - (daysSince(a.lastUpdate) ?? -1),
      long: () => (a, b) => (livedOf(b) || 0) - (livedOf(a) || 0),
      words: () => (a, b) => (b.words || 0) - (a.words || 0),
      mourned: (st) => (a, b) => gyTotal(gyRec(b.workId, st)) - gyTotal(gyRec(a.workId, st)),
    };
    const chipsRow = el("div", "display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px;margin:0 auto 10px;");
    const chipBtns = {};
    [["fresh", "Newest"], ["old", "Oldest"], ["long", "Longest-lived"], ["words", "Most words"], ["mourned", "Most mourned"]].forEach(([k, label]) => {
      const c = el("button", "", label);
      c.type = "button";
      c.onclick = () => { sortMode = k; paintGrid(); paintChips(); };
      chipBtns[k] = c;
      chipsRow.appendChild(c);
    });
    const paintChips = () => {
      Object.keys(chipBtns).forEach(k => {
        const on = k === sortMode;
        chipBtns[k].style.cssText = `cursor:pointer;font:inherit;font-size:10px;font-weight:600;border-radius:999px;padding:2px 8px;border:1px solid rgba(190,170,255,${on ? 0.5 : 0.15});background:${on ? "rgba(190,170,255,0.18)" : "none"};color:${on ? "#f3eeff" : "rgba(217,208,245,0.5)"};`;
      });
    };
    const statsBtn = el("button", "cursor:pointer;font:inherit;font-size:10px;border-radius:999px;padding:2px 8px;border:none;background:none;color:rgba(217,208,245,0.4);", "stats \u25BE");
    statsBtn.type = "button";
    // 🕯️ Moment of silence: dim everything, light a candle per grave, show one quiet line.
    const silenceBtn = el("button", "cursor:pointer;font:inherit;font-size:10px;border-radius:999px;padding:2px 8px;border:none;background:none;color:rgba(217,208,245,0.4);", "silence");
    silenceBtn.type = "button";
    silenceBtn.title = "A moment of silence";
    silenceBtn.onclick = () => {
      if (box.querySelector("[data-silence]")) return;
      const ov = el("div", "position:absolute;inset:0;z-index:6;background:rgba(2,1,8,0.97);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:24px;text-align:center;cursor:pointer;animation:nvFadeIn 1.4s ease both;");
      ov.className = "nv-anim"; ov.setAttribute("data-silence", "1");
      const lines = ["For every story that stopped mid-sentence.", "Thank you for the chapters we got.", "They were loved while they lasted.", "Some stories live only in the middle.", "A moment for the ones that never got an ending."];
      const words = fics.reduce((a, f) => a + (f.words || 0), 0);
      const candles = el("div", "display:flex;flex-wrap:wrap;justify-content:center;gap:10px 12px;max-width:300px;");
      fics.slice(0, 15).forEach((f, i) => candles.appendChild(anim(el("span", `font-size:26px;filter:drop-shadow(0 0 8px rgba(255,190,100,0.85));animation:nvFadeIn 1s ease ${(0.4 + i * 0.18).toFixed(2)}s both, nvFlicker ${(1.2 + rnd("sc" + i) * 1.2).toFixed(2)}s ease-in-out ${(rnd("sd" + i) * 1.5).toFixed(2)}s infinite;`, "\uD83D\uDD6F\uFE0F"))));
      if (fics.length > 15) candles.appendChild(el("span", "align-self:center;font-size:12px;color:rgba(255,227,179,0.7);", `+${fics.length - 15}`));
      ov.appendChild(candles);
      ov.appendChild(anim(el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:17px;line-height:1.45;color:#f3eeff;max-width:320px;animation:nvFadeIn 2s ease 1.2s both;", lines[Math.floor(Math.random() * lines.length)])));
      ov.appendChild(anim(el("div", "font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:0.06em;color:rgba(217,208,245,0.55);animation:nvFadeIn 2s ease 2s both;", `${fics.length} fic${fics.length === 1 ? "" : "s"} \u00B7 ${words.toLocaleString()} words`)));
      const nameLine = anim(el("div", "min-height:18px;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:rgba(255,227,179,0.85);max-width:320px;overflow-wrap:anywhere;"));
      ov.appendChild(nameLine);
      const hint = anim(el("div", "font-size:10.5px;color:rgba(217,208,245,0.4);animation:nvFadeIn 1.5s ease both;", "tap to return"));
      hint.style.display = "none";
      ov.appendChild(hint);
      // names drift by, one at a time
      let idx = 0;
      const nextName = () => {
        if (!ov.isConnected) { clearInterval(tm); return; }
        const f = fics[idx % fics.length]; idx++;
        nameLine.textContent = `${titleOf(f)} \u00B7 ${yearsOf(f)}`;
        nameLine.style.animation = "none"; void nameLine.offsetWidth;
        nameLine.style.animation = "nvFadeIn 1.2s ease both";
      };
      const tm = setInterval(nextName, 2400);
      setTimeout(nextName, 3000);
      setTimeout(() => { hint.style.display = ""; }, 10000);
      const off = () => { clearInterval(tm); ov.remove(); document.removeEventListener("keydown", onKeyS, true); };
      const onKeyS = e => { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); off(); } };
      document.addEventListener("keydown", onKeyS, true);
      ov.onclick = off;
      box.appendChild(ov);
    };
    chipsRow.appendChild(allBtn);
    chipsRow.appendChild(silenceBtn);
    chipsRow.appendChild(statsBtn);
    const stats = el("div", "display:none;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;margin:0 auto 14px;max-width:560px;");
    statsBtn.onclick = () => {
      const on = stats.style.display === "none";
      stats.style.display = on ? "grid" : "none";
      statsBtn.textContent = on ? "stats \u25B4" : "stats \u25BE";
    };
    const paintStats = () => {
      stats.innerHTML = "";
      const st = gyStore();
      const silent = fics.filter(f => f.manualAbandoned !== true).length;
      const best = (fn) => fics.reduce((b, f) => (b === null || fn(f) > fn(b) ? f : b), null);
      const card = (k, v, f) => {
        const c = el("div", `padding:6px 9px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(190,170,255,0.12);text-align:left;min-width:0;${f ? "cursor:pointer;" : ""}`);
        c.appendChild(el("div", "font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(217,208,245,0.55);", k));
        c.appendChild(el("div", "font-size:11.5px;font-weight:600;color:rgba(243,238,255,0.9);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;", v));
        if (f) { c.onclick = () => openEulogy(f); c.title = titleOf(f); }
        return c;
      };
      stats.appendChild(card("Cause of death", `${silent} silence · ${fics.length - silent} by you`, null));
      const lng = best(f => livedOf(f) || 0);
      if (lng && livedOf(lng)) stats.appendChild(card("Longest-lived", `${titleOf(lng)} · ${livedOf(lng)}d`, lng));
      const big = best(f => f.words || 0);
      if (big && big.words) stats.appendChild(card("Biggest loss", `${titleOf(big)} · ${fmtWords(big.words)}w`, big));
      const dead = best(f => daysSince(f.lastUpdate) ?? -1);
      if (dead && daysSince(dead.lastUpdate) != null) stats.appendChild(card("Dead longest", `${titleOf(dead)} · ${gyAgo(daysSince(dead.lastUpdate))}`, dead));
      const mourned = best(f => gyTotal(gyRec(f.workId, st)));
      if (mourned && gyTotal(gyRec(mourned.workId, st))) stats.appendChild(card("Most mourned", `${titleOf(mourned)} · ${gyTotal(gyRec(mourned.workId, st))}`, mourned));
    };
    const paintGrid = () => {
      grid.innerHTML = "";
      const st = gyStore();
      [...fics].sort(sorters[sortMode](st)).forEach(f => grid.appendChild(makeGrave(f, gyRec(f.workId, st))));
    };
    const paintHead = () => {
      const st = gyStore();
      const n = fics.reduce((a, f) => a + gyTotal(gyRec(f.workId, st)), 0);
      const lits = fics.filter(f => gyRec(f.workId, st).lit > Date.now()).length;
      sub.textContent = `${fics.length} laid to rest${n ? ` · ${n} flower${n === 1 ? "" : "s"}` : ""}${lits ? ` · ${lits} lit` : ""}`;
    };
    const refresh = () => { paintGrid(); paintStats(); paintHead(); };

    allBtn.onclick = () => {
      fics.forEach(f => gyAddFlower(f.workId, "💐"));
      try { if (navigator.vibrate) navigator.vibrate([10, 40, 10]); } catch {}
      rain(["🌹", "🌸", "💐", "🌷", "🌼"], 26);
      refresh();
    };

    if (!fics.length) {
      paintHead();
      const empty = el("div", "text-align:center;padding:60px 16px;");
      empty.appendChild(el("div", "font-size:40px;", "🌱"));
      empty.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#d9d0f5;margin-top:8px;", "No fallen fics. Not yet."));
      empty.appendChild(el("div", "font-size:12px;color:rgba(217,208,245,0.6);margin-top:4px;", "Everything you track is either still going or finished."));
      body.appendChild(empty);
    } else {
      const words = fics.reduce((a, f) => a + (f.words || 0), 0);
      const chs = fics.reduce((a, f) => a + (f.totalChapters || 1), 0);
      body.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;line-height:1.5;color:rgba(217,208,245,0.8);text-align:center;margin:2px auto 16px;max-width:460px;",
        `Here lie ${fics.length} fic${fics.length === 1 ? "" : "s"} that never reached the end: ${words.toLocaleString()} words across ${chs.toLocaleString()} chapters. Tap a stone to pay respects.`));
      body.appendChild(chipsRow);
      body.appendChild(stats);
      body.appendChild(grid);
      paintChips();
      refresh();
    }

    document.body.appendChild(back);
  }

  // ── 🎉 FIC CELEBRATION ──
  // The cheerful counterpart to the graveyard, for fics you've finished (marked
  // Finished). One gold plaque each; tap one for a toast. Read-only except for the
  // cheers/notes and your own cheer line, kept under their own key and included in
  // the combined backup. Reached from a small text link in the Finished section.
  const CC_CHEERS = [
    { e: "🎉", n: "Party popper" }, { e: "🥳", n: "Party face" }, { e: "🏆", n: "Trophy" }, { e: "⭐", n: "Star" },
    { e: "💖", n: "Sparkling heart" }, { e: "🥂", n: "Clinking glasses" }, { e: "🎊", n: "Confetti ball" },
  ];
  function ccRec(id, store) { const r = (store || ccStore())[id] || {}; return { c: r.c || {}, notes: r.notes || [], ep: r.ep || "" }; }
  function ccTotal(r) { return Object.values(r.c).reduce((a, n) => a + n, 0); }
  function ccAddCheer(id, emoji, note) {
    const s = ccStore();
    const r = s[id] || (s[id] = { c: {}, notes: [] });
    r.c = r.c || {}; r.notes = r.notes || [];
    r.c[emoji] = (r.c[emoji] || 0) + 1;
    const t = (note || "").trim().slice(0, 100);
    if (t) { r.notes.push({ e: emoji, t, d: new Date().toISOString().slice(0, 10) }); if (r.notes.length > 30) r.notes.shift(); }
    try { localStorage.setItem(CC_KEY, JSON.stringify(s)); } catch {}
    return ccRec(id, s);
  }
  // Your own cheer line for a fic (overrides the generated one). Empty text = back to generated.
  function ccSetLine(id, text) {
    const s = ccStore();
    const r = s[id] || (s[id] = { c: {}, notes: [] });
    const t = (text || "").trim().slice(0, 80);
    if (t) r.ep = t; else delete r.ep;
    try { localStorage.setItem(CC_KEY, JSON.stringify(s)); } catch {}
    return t;
  }
  function finishedFics() { return getTracked().filter(f => f.finished); }
  function ccLine(f) {
    const total = f.totalChapters || 1;
    if (f.words >= 200000) return "An epic, and you made it to the very end.";
    if (f.words >= 100000) return "A long journey, all the way to the last page.";
    if (total <= 1) return "One sitting, one perfect ending.";
    if (f.words && f.words < 10000) return "Short, sweet, and complete.";
    if (f.avgUpdateDays && f.avgUpdateDays <= 7) return "Weekly updates, one happy ending.";
    const pool = [
      "Stuck the landing.", "Every chapter, delivered.", "Worth every kudos.", "The ending was worth the wait.",
      "Happily ever after, confirmed.", "Plot threads: all tied up.", "The tags kept their promises.",
      "Finished, and still glowing.", "Read to the last line.", "A full-heart finish.",
      "No cliffhanger left behind.", "The author delivered.", "Closed the tab smiling.",
      "Re-read pending.", "Bookmarked for life.", "Chef’s kiss, final chapter.",
    ];
    return pool[gyHash(f.workId) % pool.length];
  }

  function openCelebration() {
    const old = document.getElementById("ao3-celebration");
    if (old) old.remove();
    nvEnsureCss();
    if (!document.getElementById("ao3-cc-css")) {
      const st = document.createElement("style");
      st.id = "ao3-cc-css";
      st.textContent = `
        @keyframes ccFall{0%{opacity:0;transform:translateY(0) rotate(0)}10%{opacity:1}100%{opacity:.9;transform:translateY(105vh) rotate(var(--rot))}}
        @keyframes ccDrift{0%{opacity:0;transform:translate(0,-20px) rotate(0)}12%{opacity:.85}100%{opacity:0;transform:translate(var(--dx),105vh) rotate(var(--rot))}}
        @keyframes ccPop{0%{transform:scale(0) translateY(-18px);opacity:0}60%{transform:scale(1.35) translateY(2px);opacity:1}100%{transform:scale(1) translateY(0)}}
        @keyframes ccBurst{0%{opacity:1;transform:translate(0,0) scale(.6) rotate(0)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.15) rotate(var(--rot))}}
        @keyframes ccFade{from{opacity:0}to{opacity:1}}
        @keyframes ccSway{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
        @keyframes ccTwinkle{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1.2)}}
        @keyframes ccShine{0%{transform:translateX(-130%) skewX(-18deg)}55%,100%{transform:translateX(260%) skewX(-18deg)}}
        @media (prefers-reduced-motion: reduce){.nv-anim{animation:none !important}}
      `;
      (document.head || document.documentElement).appendChild(st);
    }
    const el = (tag, css, text) => {
      const e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (text != null) e.textContent = text;
      return e;
    };
    const anim = (node) => { node.className = "nv-anim"; return node; };
    const iso = d => (d ? String(d).slice(0, 10) : null);
    const yearOf = d => (d ? String(d).slice(0, 4) : "?");
    const fics = finishedFics();
    const bornOf = f => ((f.chapterDates || []).slice().sort()[0]) || iso(f.trackedAt);
    const livedOf = f => {
      const b = bornOf(f);
      return (b && f.lastUpdate) ? Math.max(0, Math.round((new Date(f.lastUpdate) - new Date(b)) / 86400000)) : null;
    };
    const yearsOf = f => {
      const b = yearOf(bornOf(f)), d = yearOf(f.lastUpdate);
      return b === d ? b : `${b} – ${d}`;
    };
    const titleOf = f => f.title || `Work ${f.workId}`;
    const CONFETTI = ["🎉", "🎊", "✨", "⭐", "💖", "🌟"];

    // ── shell: always a sunset party, whatever the page theme ──
    // Anchored top AND bottom (with safe-area insets) so nothing hides under a phone's browser bar.
    const back = el("div", "position:fixed;inset:0;background:rgba(30,8,40,0.8);z-index:1000002;");
    back.id = "ao3-celebration";
    const box = el("div", "position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:8px;right:8px;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;font-family:inherit;color:#fff6ea;background:linear-gradient(180deg,#3a1f5c 0%,#8a3b7d 38%,#e8806f 78%,#ffc46b 100%);border:1px solid rgba(255,225,160,0.35);box-shadow:0 12px 40px rgba(0,0,0,0.55);");
    back.appendChild(box);

    // scenery: stars, bunting, drifting confetti, a warm glow at the bottom
    const rnd = seed => { const x = Math.sin(gyHash(seed) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const scene = el("div", "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;");
    for (let i = 0; i < 26; i++) {
      const sz = 1 + (gyHash("sz" + i) % 20) / 10;
      scene.appendChild(anim(el("span", `position:absolute;left:${(rnd("x" + i) * 100).toFixed(1)}%;top:${(rnd("y" + i) * 38).toFixed(1)}%;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;opacity:0.7;animation:ccTwinkle ${2 + (gyHash("d" + i) % 30) / 10}s ease-in-out ${(gyHash("t" + i) % 30) / 10}s infinite;`)));
    }
    // bunting string under the top bar
    const bunting = el("div", "position:absolute;left:-2%;right:-2%;top:50px;display:flex;justify-content:space-between;opacity:.9;");
    bunting.appendChild(el("div", "position:absolute;left:0;right:0;top:0;height:2px;background:rgba(255,246,234,0.5);"));
    const flagCols = ["#ff7eb6", "#ffd36b", "#7fe0c3", "#9ec5ff", "#c9a3ff"];
    for (let i = 0; i < 16; i++) {
      bunting.appendChild(anim(el("span", `display:block;width:0;height:0;margin-top:2px;border-left:9px solid transparent;border-right:9px solid transparent;border-top:15px solid ${flagCols[i % flagCols.length]};transform-origin:50% 0;animation:ccSway ${(2.4 + rnd("bf" + i) * 1.6).toFixed(2)}s ease-in-out ${(rnd("bg" + i) * 2).toFixed(2)}s infinite;`)));
    }
    scene.appendChild(bunting);
    const bits = ["#ff7eb6", "#ffd36b", "#7fe0c3", "#9ec5ff", "#c9a3ff", "#fff6ea"];
    for (let i = 0; i < 16; i++) {
      scene.appendChild(anim(el("span", `position:absolute;top:-16px;left:${(rnd("cx" + i) * 96).toFixed(1)}%;width:${5 + (gyHash("cw" + i) % 4)}px;height:${8 + (gyHash("ch" + i) % 5)}px;border-radius:1px;background:${bits[i % bits.length]};opacity:0;--rot:${((gyHash("cr" + i) % 720) - 360)}deg;--dx:${((gyHash("cd" + i) % 60) - 30)}px;animation:ccDrift ${(11 + rnd("cs" + i) * 9).toFixed(1)}s linear ${(rnd("cl" + i) * 12).toFixed(1)}s infinite;`)));
    }
    scene.appendChild(el("div", "position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(0deg, rgba(255,230,150,0.28), transparent);"));
    box.appendChild(scene);
    const rainLayer = el("div", "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:4;");
    box.appendChild(rainLayer);

    // ── top bar ──
    const topbar = el("div", "position:relative;z-index:2;flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,225,160,0.28);background:rgba(40,12,50,0.5);");
    const ttl = el("div", "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;");
    ttl.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:15px;letter-spacing:0.08em;text-transform:uppercase;color:#ffe9a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;", "🎉 Fic Celebration"));
    const sub = el("div", "font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.04em;color:rgba(255,246,234,0.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;");
    ttl.appendChild(sub);
    topbar.appendChild(ttl);
    const tbRight = el("div", "display:flex;align-items:center;gap:8px;flex:0 0 auto;");
    const allBtn = el("button", "cursor:pointer;font:inherit;font-size:10px;border-radius:999px;padding:2px 8px;border:none;background:none;color:rgba(255,246,234,0.55);white-space:nowrap;", "cheers for all");
    allBtn.type = "button";
    allBtn.title = "Throw a little party for every finished fic";
    const xBtn = el("button", "background:none;border:none;color:rgba(255,246,234,0.85);cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px;", "✕");
    tbRight.appendChild(xBtn);
    topbar.appendChild(tbRight);
    box.appendChild(topbar);

    const body = el("div", "position:relative;z-index:1;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding:46px 12px 64px;");
    box.appendChild(body);

    const onKey = e => { if (e.key === "Escape") close(); };
    const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
    xBtn.onclick = close;
    back.addEventListener("click", e => { if (e.target === back) close(); });
    document.addEventListener("keydown", onKey);

    // confetti falling over the whole screen
    const rain = (emojis, n) => {
      for (let i = 0; i < n; i++) {
        const s = anim(el("span", `position:absolute;top:-28px;left:${(Math.random() * 94).toFixed(1)}%;font-size:${16 + Math.random() * 10}px;opacity:0;--rot:${(Math.random() * 360 - 180) | 0}deg;animation:ccFall ${(2.2 + Math.random() * 1.8).toFixed(2)}s ease-in ${(Math.random() * 0.9).toFixed(2)}s forwards;`, emojis[i % emojis.length]));
        rainLayer.appendChild(s);
        setTimeout(() => s.remove(), 5200);
      }
    };

    // ── toast sheet (the finished-fic version of the eulogy) ──
    const openToast = f => {
      const prev = document.getElementById("ao3-cc-toast");
      if (prev) prev.remove();
      const ov = el("div", "position:fixed;inset:0;background:rgba(20,5,30,0.7);z-index:1000003;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;");
      ov.id = "ao3-cc-toast";
      const bx = el("div", "position:relative;background:linear-gradient(180deg,#4a2358,#2a1238);color:#fff6ea;border:1px solid rgba(255,225,160,0.4);border-radius:14px;width:100%;max-width:440px;max-height:90%;overflow-y:auto;overflow-x:hidden;padding:18px 18px 16px;box-sizing:border-box;font-family:inherit;box-shadow:0 12px 40px rgba(0,0,0,0.6);text-align:center;");

      bx.appendChild(el("div", "font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,233,168,0.8);", "🎉 Congratulations to"));
      bx.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:700;line-height:1.25;margin:6px 0 2px;color:#fffaf0;overflow-wrap:anywhere;", titleOf(f)));
      bx.appendChild(el("div", "font-family:'Courier New',Courier,monospace;font-size:12px;color:rgba(255,246,234,0.75);", yearsOf(f)));
      const quote = el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;color:rgba(255,246,234,0.9);margin:10px 0 2px;overflow-wrap:anywhere;");
      const paintQuote = () => { quote.textContent = `\u201C${ccRec(f.workId).ep || ccLine(f)}\u201D`; };
      paintQuote();
      bx.appendChild(quote);
      const editLink = el("button", "background:none;border:none;cursor:pointer;font:inherit;font-size:10.5px;color:rgba(255,246,234,0.5);padding:2px 6px;margin-bottom:8px;", "\u270E write your own");
      editLink.type = "button";
      const editRow = el("div", "display:none;gap:6px;margin:4px 0 10px;align-items:center;");
      const inCss = "box-sizing:border-box;font:inherit;font-size:12.5px;padding:7px 10px;border-radius:8px;border:1px solid rgba(255,225,160,0.35);background:rgba(0,0,0,0.25);color:#fff6ea;outline:none;";
      const epIn = el("input", "flex:1;min-width:0;" + inCss);
      epIn.type = "text"; epIn.maxLength = 80; epIn.placeholder = "Your cheer\u2026";
      const miniCss = "cursor:pointer;font:inherit;font-size:11.5px;font-weight:600;border-radius:8px;padding:7px 9px;border:1px solid rgba(255,225,160,0.4);background:rgba(255,255,255,0.08);color:#fff6ea;white-space:nowrap;";
      const epSave = el("button", miniCss, "Save"); epSave.type = "button";
      const epAuto = el("button", miniCss + "opacity:.75;", "Auto"); epAuto.type = "button";
      epAuto.title = "Go back to the generated line";
      const saveEp = (txt) => { ccSetLine(f.workId, txt); paintQuote(); editRow.style.display = "none"; editLink.textContent = "\u270E write your own"; };
      epSave.onclick = () => saveEp(epIn.value);
      epAuto.onclick = () => { epIn.value = ""; saveEp(""); };
      epIn.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); saveEp(epIn.value); } };
      editLink.onclick = () => {
        const open = editRow.style.display === "none";
        editRow.style.display = open ? "flex" : "none";
        editLink.textContent = open ? "\u2715 cancel" : "\u270E write your own";
        if (open) { epIn.value = ccRec(f.workId).ep || ""; epIn.focus(); }
      };
      editRow.appendChild(epIn); editRow.appendChild(epSave); editRow.appendChild(epAuto);
      bx.appendChild(editLink); bx.appendChild(editRow);

      const born = bornOf(f);
      const lived = livedOf(f);
      const posted = f.totalChapters || 1;
      const readMin = f.words ? formatReadTime(wordsToReadMinutes(f.words)) : null;
      const rows = [
        ["Started", born || "—"],
        ["Final chapter", f.lastUpdate || "—"],
        ["Journey", posted <= 1 ? "One sitting" : (lived != null ? `${lived} days` : "—")],
        ["Chapters", String(posted)],
        ["Words", fmtWords(f.words)],
        ["Read time", readMin || "—"],
        ["Avg update", f.avgUpdateDays != null ? `${f.avgUpdateDays}d` : "—"],
      ];
      const tbl = el("div", "display:grid;grid-template-columns:auto 1fr;gap:5px 14px;text-align:left;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,225,160,0.22);");
      rows.forEach(([k, v]) => {
        tbl.appendChild(el("div", "font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,233,168,0.65);align-self:center;", k));
        tbl.appendChild(el("div", "font-size:12.5px;font-weight:600;color:#fff6ea;", v));
      });
      bx.appendChild(tbl);

      // ── cheers: pick a kind, send it, optionally leave a note ──
      const sec = el("div", "margin-top:14px;padding:10px 10px 12px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,225,160,0.22);");
      const secHead = el("div", "font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,233,168,0.75);");
      const plot = el("div", "min-height:34px;margin:8px 0 8px;font-size:21px;line-height:1.2;display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-end;gap:0 1px;padding-bottom:4px;border-bottom:3px solid #d99a1f;");
      const picker = el("div", "display:flex;flex-wrap:wrap;justify-content:center;gap:6px;");
      const noteIn = el("input", "width:100%;margin-top:10px;" + inCss);
      noteIn.type = "text"; noteIn.maxLength = 100;
      noteIn.placeholder = "Leave a few words with your cheer (optional)";
      const notesBox = el("div", "margin-top:8px;display:flex;flex-direction:column;gap:4px;text-align:left;");
      const pickBtns = {};
      const paintSec = (popEmoji) => {
        const r = ccRec(f.workId);
        secHead.textContent = `Cheers sent · ${ccTotal(r)}`;
        plot.innerHTML = "";
        if (!ccTotal(r)) plot.appendChild(el("div", "font-size:11px;font-style:italic;color:rgba(255,246,234,0.55);align-self:center;", "No cheers yet. Start the party."));
        CC_CHEERS.forEach(t => {
          const n = r.c[t.e] || 0;
          for (let i = 0; i < Math.min(n, 5); i++) {
            const s = el("span", `display:inline-block;margin:0 -2px;transform:rotate(${((gyHash(t.e + i) % 21) - 10)}deg);`, t.e);
            if (popEmoji === t.e && i === Math.min(n, 5) - 1) { s.style.animation = "ccPop .5s ease-out"; s.className = "nv-anim"; }
            plot.appendChild(s);
          }
          if (n > 5) plot.appendChild(el("span", "font-size:10px;font-weight:700;color:rgba(255,246,234,0.85);align-self:center;margin:0 3px;", `×${n}`));
        });
        CC_CHEERS.forEach(t => { pickBtns[t.e].count.textContent = r.c[t.e] || ""; });
        notesBox.innerHTML = "";
        r.notes.slice(-4).reverse().forEach(nt => {
          const line = el("div", "font-size:11.5px;line-height:1.35;color:rgba(255,246,234,0.9);padding:5px 8px;border-radius:7px;background:rgba(255,255,255,0.07);overflow-wrap:anywhere;");
          line.appendChild(el("span", "", `${nt.e} `));
          line.appendChild(el("span", "font-style:italic;font-family:Georgia,'Times New Roman',serif;", `\u201C${nt.t}\u201D`));
          line.appendChild(el("span", "font-size:9.5px;color:rgba(255,246,234,0.5);margin-left:6px;", nt.d || ""));
          notesBox.appendChild(line);
        });
      };
      const burst = (btn, emoji) => {
        const br = btn.getBoundingClientRect(), xr = bx.getBoundingClientRect();
        const cx = br.left - xr.left + br.width / 2, cy = br.top - xr.top + bx.scrollTop + br.height / 2;
        for (let i = 0; i < 10; i++) {
          const ang = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
          const dist = 38 + Math.random() * 36;
          const p = el("span", `position:absolute;left:${cx - 8}px;top:${cy - 10}px;font-size:${12 + Math.random() * 8}px;pointer-events:none;z-index:5;--dx:${(Math.cos(ang) * dist).toFixed(0)}px;--dy:${(Math.sin(ang) * dist - 26).toFixed(0)}px;--rot:${(Math.random() * 240 - 120) | 0}deg;animation:ccBurst ${(0.7 + Math.random() * 0.4).toFixed(2)}s ease-out forwards;`, i % 3 === 0 ? "✨" : emoji);
          p.className = "nv-anim";
          bx.appendChild(p);
          setTimeout(() => p.remove(), 1300);
        }
      };
      CC_CHEERS.forEach(t => {
        const b = el("button", "position:relative;cursor:pointer;font:inherit;font-size:21px;line-height:1;width:44px;height:44px;border-radius:10px;border:1px solid rgba(255,225,160,0.35);background:rgba(255,255,255,0.09);color:#fff6ea;padding:0;-webkit-tap-highlight-color:transparent;");
        b.type = "button"; b.title = `Send a ${t.n.toLowerCase()}`;
        b.appendChild(el("span", "", t.e));
        const count = el("span", "position:absolute;right:3px;bottom:1px;font-size:9px;font-weight:700;color:#fffaf0;text-shadow:0 1px 2px #000;");
        b.appendChild(count);
        b.onclick = () => {
          ccAddCheer(f.workId, t.e, noteIn.value);
          noteIn.value = "";
          try { if (navigator.vibrate) navigator.vibrate(12); } catch {}
          burst(b, t.e);
          paintSec(t.e);
        };
        pickBtns[t.e] = { count };
        picker.appendChild(b);
      });
      sec.appendChild(secHead); sec.appendChild(plot); sec.appendChild(picker); sec.appendChild(noteIn); sec.appendChild(notesBox);
      bx.appendChild(sec);
      paintSec(null);

      const btnCss = "cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;border-radius:8px;padding:7px 12px;border:1px solid rgba(255,225,160,0.4);background:rgba(255,255,255,0.08);color:#fff6ea;";
      const btns = el("div", "display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:14px;");
      const visitBtn = el("button", btnCss, "Open fic");
      visitBtn.type = "button";
      visitBtn.title = "Open the fic on AO3";
      visitBtn.onclick = () => { location.href = `https://archiveofourown.org/works/${f.workId}`; };
      const doneBtn = el("button", btnCss, "Close");
      doneBtn.type = "button";
      btns.appendChild(visitBtn); btns.appendChild(doneBtn);
      bx.appendChild(btns);

      ov.appendChild(bx);
      const onKeyE = e => { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); closeE(); } };
      const closeE = () => { ov.remove(); document.removeEventListener("keydown", onKeyE, true); refresh(); };
      doneBtn.onclick = closeE;
      ov.addEventListener("click", e => { if (e.target === ov) closeE(); });
      document.addEventListener("keydown", onKeyE, true);
      document.body.appendChild(ov);
      rain(CONFETTI, 12);
    };

    // ── plaques ──
    const grid = el("div", "display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:38px 10px;align-items:end;padding-top:16px;");
    const makePlaque = (f, rec) => {
      const h = gyHash(f.workId);
      const rot = (((h >> 3) % 5) - 2) * 0.8;
      const cell = el("div", "position:relative;display:flex;flex-direction:column;align-items:center;");
      const plaque = el("div", `position:relative;width:100%;max-width:170px;min-height:140px;box-sizing:border-box;padding:24px 10px 14px;border-radius:14px;background:linear-gradient(160deg,#fff1b8 0%,#f3c04a 55%,#d99a1f 100%);border:2px solid rgba(255,255,255,0.55);box-shadow:inset 0 2px 6px rgba(255,255,255,0.6),0 6px 14px rgba(0,0,0,0.35);color:#4a2a00;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;transform:rotate(${rot}deg);-webkit-tap-highlight-color:transparent;`);
      plaque.setAttribute("role", "button");
      plaque.setAttribute("tabindex", "0");
      plaque.title = "Raise a toast";
      // medal on top
      plaque.appendChild(el("div", "position:absolute;top:-14px;left:50%;margin-left:-14px;width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7d6,#f0b429);border:2px solid #fff6d8;display:flex;align-items:center;justify-content:center;font-size:14px;color:#8a5a00;box-shadow:0 2px 6px rgba(0,0,0,0.35);", "★"));
      // a slow shine sweeping across
      const shineWrap = el("div", "position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;");
      shineWrap.appendChild(anim(el("div", `position:absolute;top:0;bottom:0;width:30%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent);animation:ccShine ${(5 + (h % 4)).toFixed(0)}s ease-in-out ${(h % 5)}s infinite;`)));
      plaque.appendChild(shineWrap);
      plaque.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-size:9px;font-weight:700;letter-spacing:0.22em;", "THE END"));
      plaque.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-size:11.5px;font-weight:700;line-height:1.25;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;max-width:100%;", titleOf(f)));
      plaque.appendChild(el("div", "width:28px;height:1px;background:rgba(74,42,0,0.4);margin:1px 0;"));
      plaque.appendChild(el("div", "font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;", yearsOf(f)));
      plaque.appendChild(el("div", "font-size:9.5px;", `${f.totalChapters || 1} ch · ${fmtWords(f.words)}`));
      plaque.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:9.5px;line-height:1.3;opacity:0.85;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;max-width:100%;", rec.ep || ccLine(f)));
      plaque.onclick = () => openToast(f);
      plaque.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openToast(f); } };
      cell.appendChild(plaque);
      cell.appendChild(el("div", "width:118%;height:14px;margin-top:-7px;border-radius:50%;background:radial-gradient(ellipse at 50% 30%,#ffe9a8,#b9771f);box-shadow:0 4px 8px rgba(0,0,0,0.4);position:relative;"));

      // cheers resting at the foot of the plaque
      const sent = CC_CHEERS.filter(t => rec.c[t.e] > 0);
      if (sent.length) {
        const row = el("div", "position:absolute;left:0;right:0;bottom:-6px;display:flex;justify-content:center;align-items:flex-end;font-size:14px;line-height:1;pointer-events:none;filter:drop-shadow(0 2px 2px rgba(0,0,0,.4));");
        sent.slice(0, 6).forEach((t, i) => row.appendChild(el("span", `margin:0 -1px;transform:rotate(${((gyHash(t.e + i) % 17) - 8)}deg);`, t.e)));
        const total = ccTotal(rec);
        if (total > Math.min(sent.length, 6)) row.appendChild(el("span", "font-size:9px;font-weight:700;color:#fffaf0;margin-left:4px;align-self:center;text-shadow:0 1px 2px #000;", `×${total}`));
        cell.appendChild(row);
      }
      return cell;
    };

    // ── sorting chips, stats, grid ──
    let sortMode = "fresh";
    const sorters = {
      fresh: () => (a, b) => (daysSince(a.lastUpdate) ?? 1e9) - (daysSince(b.lastUpdate) ?? 1e9),
      old: () => (a, b) => (daysSince(b.lastUpdate) ?? -1) - (daysSince(a.lastUpdate) ?? -1),
      long: () => (a, b) => (livedOf(b) || 0) - (livedOf(a) || 0),
      words: () => (a, b) => (b.words || 0) - (a.words || 0),
      cheered: (st) => (a, b) => ccTotal(ccRec(b.workId, st)) - ccTotal(ccRec(a.workId, st)),
    };
    const chipsRow = el("div", "display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px;margin:0 auto 10px;");
    const chipBtns = {};
    [["fresh", "Newest"], ["old", "Oldest"], ["long", "Longest journey"], ["words", "Most words"], ["cheered", "Most cheered"]].forEach(([k, label]) => {
      const c = el("button", "", label);
      c.type = "button";
      c.onclick = () => { sortMode = k; paintGrid(); paintChips(); };
      chipBtns[k] = c;
      chipsRow.appendChild(c);
    });
    const paintChips = () => {
      Object.keys(chipBtns).forEach(k => {
        const on = k === sortMode;
        chipBtns[k].style.cssText = `cursor:pointer;font:inherit;font-size:10px;font-weight:600;border-radius:999px;padding:2px 8px;border:1px solid rgba(255,225,160,${on ? 0.6 : 0.2});background:${on ? "rgba(255,225,160,0.2)" : "none"};color:${on ? "#fffaf0" : "rgba(255,246,234,0.6)"};`;
      });
    };
    const statsBtn = el("button", "cursor:pointer;font:inherit;font-size:10px;border-radius:999px;padding:2px 8px;border:none;background:none;color:rgba(255,246,234,0.55);", "stats \u25BE");
    statsBtn.type = "button";
    // 🎆 A toast: fireworks over everything, one quiet line, names drifting by.
    const toastBtn = el("button", "cursor:pointer;font:inherit;font-size:10px;border-radius:999px;padding:2px 8px;border:none;background:none;color:rgba(255,246,234,0.55);", "toast");
    toastBtn.type = "button";
    toastBtn.title = "Raise a toast to them all";
    toastBtn.onclick = () => {
      if (box.querySelector("[data-toast]")) return;
      const ov = el("div", "position:absolute;inset:0;z-index:6;background:rgba(20,5,30,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:24px;text-align:center;cursor:pointer;overflow:hidden;animation:ccFade 1s ease both;");
      ov.className = "nv-anim"; ov.setAttribute("data-toast", "1");
      const lines = ["To every story that made it to the end.", "Cheers to the ones that stuck the landing.", "Every last chapter, delivered.", "Happily ever after, confirmed.", "You saw it through. So did they."];
      const words = fics.reduce((a, f) => a + (f.words || 0), 0);
      const trophies = el("div", "display:flex;flex-wrap:wrap;justify-content:center;gap:10px 12px;max-width:300px;position:relative;z-index:2;");
      fics.slice(0, 15).forEach((f, i) => trophies.appendChild(anim(el("span", `font-size:26px;filter:drop-shadow(0 0 8px rgba(255,210,100,0.85));animation:ccFade 1s ease ${(0.3 + i * 0.15).toFixed(2)}s both;`, "\uD83C\uDFC6"))));
      if (fics.length > 15) trophies.appendChild(el("span", "align-self:center;font-size:12px;color:rgba(255,233,168,0.8);", `+${fics.length - 15}`));
      ov.appendChild(trophies);
      ov.appendChild(anim(el("div", "position:relative;z-index:2;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:17px;line-height:1.45;color:#fffaf0;max-width:320px;animation:ccFade 2s ease 1s both;", lines[Math.floor(Math.random() * lines.length)])));
      ov.appendChild(anim(el("div", "position:relative;z-index:2;font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:0.06em;color:rgba(255,246,234,0.65);animation:ccFade 2s ease 1.6s both;", `${fics.length} fic${fics.length === 1 ? "" : "s"} \u00B7 ${words.toLocaleString()} words`)));
      const nameLine = anim(el("div", "position:relative;z-index:2;min-height:18px;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:rgba(255,233,168,0.9);max-width:320px;overflow-wrap:anywhere;"));
      ov.appendChild(nameLine);
      const hint = el("div", "position:relative;z-index:2;font-size:10.5px;color:rgba(255,246,234,0.45);", "tap to return");
      hint.style.display = "none";
      ov.appendChild(hint);
      // fireworks: little emoji bursts popping at random spots
      const sparks = ["\u2728", "\uD83C\uDF86", "\uD83C\uDF87", "\u2B50", "\uD83C\uDF89", "\uD83D\uDC96"];
      const boom = () => {
        if (!ov.isConnected) return;
        const cx = 12 + Math.random() * 76, cy = 12 + Math.random() * 52;
        const em = sparks[Math.floor(Math.random() * sparks.length)];
        for (let i = 0; i < 9; i++) {
          const ang = (Math.PI * 2 * i) / 9;
          const dist = 44 + Math.random() * 30;
          const p = anim(el("span", `position:absolute;left:${cx}%;top:${cy}%;font-size:${14 + Math.random() * 8}px;pointer-events:none;z-index:1;--dx:${(Math.cos(ang) * dist).toFixed(0)}px;--dy:${(Math.sin(ang) * dist).toFixed(0)}px;--rot:${(Math.random() * 200 - 100) | 0}deg;animation:ccBurst ${(0.9 + Math.random() * 0.5).toFixed(2)}s ease-out forwards;`, em));
          ov.appendChild(p);
          setTimeout(() => p.remove(), 1600);
        }
      };
      const bm = setInterval(boom, 900);
      setTimeout(boom, 400);
      // names drift by, one at a time
      let idx = 0;
      const nextName = () => {
        if (!ov.isConnected) { clearInterval(tm); return; }
        const f = fics[idx % fics.length]; idx++;
        nameLine.textContent = `${titleOf(f)} \u00B7 ${yearsOf(f)}`;
        nameLine.style.animation = "none"; void nameLine.offsetWidth;
        nameLine.style.animation = "ccFade 1.2s ease both";
      };
      const tm = setInterval(nextName, 2400);
      setTimeout(nextName, 2600);
      setTimeout(() => { hint.style.display = ""; }, 8000);
      const off = () => { clearInterval(tm); clearInterval(bm); ov.remove(); document.removeEventListener("keydown", onKeyS, true); };
      const onKeyS = e => { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); off(); } };
      document.addEventListener("keydown", onKeyS, true);
      ov.onclick = off;
      box.appendChild(ov);
    };
    chipsRow.appendChild(allBtn);
    chipsRow.appendChild(toastBtn);
    chipsRow.appendChild(statsBtn);
    const stats = el("div", "display:none;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;margin:0 auto 14px;max-width:560px;");
    statsBtn.onclick = () => {
      const on = stats.style.display === "none";
      stats.style.display = on ? "grid" : "none";
      statsBtn.textContent = on ? "stats \u25B4" : "stats \u25BE";
    };
    const paintStats = () => {
      stats.innerHTML = "";
      const st = ccStore();
      const best = (fn) => fics.reduce((b, f) => (b === null || fn(f) > fn(b) ? f : b), null);
      const card = (k, v, f) => {
        const c = el("div", `padding:6px 9px;border-radius:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,225,160,0.2);text-align:left;min-width:0;${f ? "cursor:pointer;" : ""}`);
        c.appendChild(el("div", "font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,233,168,0.7);", k));
        c.appendChild(el("div", "font-size:11.5px;font-weight:600;color:rgba(255,250,240,0.95);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;", v));
        if (f) { c.onclick = () => openToast(f); c.title = titleOf(f); }
        return c;
      };
      const totalWords = fics.reduce((a, f) => a + (f.words || 0), 0);
      stats.appendChild(card("Total finished", `${fics.length} \u00B7 ${fmtWords(totalWords)} words`, null));
      const big = best(f => f.words || 0);
      if (big && big.words) stats.appendChild(card("Biggest finish", `${titleOf(big)} \u00B7 ${fmtWords(big.words)}w`, big));
      const lng = best(f => livedOf(f) || 0);
      if (lng && livedOf(lng)) stats.appendChild(card("Longest journey", `${titleOf(lng)} \u00B7 ${livedOf(lng)}d`, lng));
      const latest = best(f => (f.lastUpdate ? Date.parse(f.lastUpdate) || 0 : 0));
      if (latest && latest.lastUpdate) stats.appendChild(card("Latest finish", `${titleOf(latest)} \u00B7 ${latest.lastUpdate}`, latest));
      const cheered = best(f => ccTotal(ccRec(f.workId, st)));
      if (cheered && ccTotal(ccRec(cheered.workId, st))) stats.appendChild(card("Most cheered", `${titleOf(cheered)} \u00B7 ${ccTotal(ccRec(cheered.workId, st))}`, cheered));
    };
    const paintGrid = () => {
      grid.innerHTML = "";
      const st = ccStore();
      [...fics].sort(sorters[sortMode](st)).forEach(f => grid.appendChild(makePlaque(f, ccRec(f.workId, st))));
    };
    const paintHead = () => {
      const st = ccStore();
      const n = fics.reduce((a, f) => a + ccTotal(ccRec(f.workId, st)), 0);
      sub.textContent = `${fics.length} finished${n ? ` \u00B7 ${n} cheer${n === 1 ? "" : "s"}` : ""}`;
    };
    const refresh = () => { paintGrid(); paintStats(); paintHead(); };

    allBtn.onclick = () => {
      fics.forEach(f => ccAddCheer(f.workId, "🎉"));
      try { if (navigator.vibrate) navigator.vibrate([10, 40, 10]); } catch {}
      rain(CONFETTI, 28);
      refresh();
    };

    if (!fics.length) {
      paintHead();
      const empty = el("div", "text-align:center;padding:60px 16px;");
      empty.appendChild(el("div", "font-size:40px;", "🌟"));
      empty.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#ffe9a8;margin-top:8px;", "Nothing finished yet."));
      empty.appendChild(el("div", "font-size:12px;color:rgba(255,246,234,0.7);margin-top:4px;", "Fics you finish will get their own plaque here."));
      body.appendChild(empty);
    } else {
      const words = fics.reduce((a, f) => a + (f.words || 0), 0);
      const chs = fics.reduce((a, f) => a + (f.totalChapters || 1), 0);
      body.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;line-height:1.5;color:rgba(255,246,234,0.9);text-align:center;margin:2px auto 16px;max-width:460px;",
        `${fics.length} fic${fics.length === 1 ? "" : "s"} seen all the way to the end: ${words.toLocaleString()} words across ${chs.toLocaleString()} chapters. Tap a plaque to raise a toast.`));
      body.appendChild(chipsRow);
      body.appendChild(stats);
      body.appendChild(grid);
      paintChips();
      refresh();
      rain(CONFETTI, 16);
    }

    document.body.appendChild(back);
  }

  // ── 🏠 BRAM'S COTTAGE (the inside) ──
  // Tap the cottage by the gate in the grounds (or "Cottage" on Bram's menu) to step in. A warm little room with
  // Bram in his armchair, the cat by the fire and a kettle on. Five things to do, none of them about his past
  // (in here he is only the man with the kettle):
  //   🫖 Tea       he offers a cup, you pick one (he remembers your usual); your mug shows on the table for the day
  //   🗣️ Vent      type or pick a topic; he listens, says something kind and a bit sassy, asks one gentle question.
  //                What you type is NEVER saved. If it sounds like a real crisis he drops the act and points you to people.
  //   📚 Fics      he chats about your dead fics, the ones still going and the finished ones, and reads back lines you saved
  //   🃏 Tarot     pick one of three face-down cards; one card a day, same card all day (the deck is shuffled by the date)
  // Only tiny bits are kept, in ao3_cottage_v1 (so cloud sync carries it): visits, today's tea, your tea counts, today's card.
  function openBramCottage() {
    const getLog = () => { try { const v = JSON.parse(localStorage.getItem("ao3_word_log_v4") || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };   // (this part of the bundle has no getLog of its own)
    const old = document.getElementById("ao3-cottage");
    if (old) old.remove();
    if (!document.getElementById("ao3-cot-css")) {
      const cs = document.createElement("style");
      cs.id = "ao3-cot-css";
      cs.textContent = `
        @keyframes cotFlicker{0%,100%{opacity:.8;transform:scale(1)}30%{opacity:1;transform:scale(1.08)}60%{opacity:.7;transform:scale(.94)}}
        @keyframes cotSteam{0%{opacity:0;transform:translateY(2px)}35%{opacity:.8}100%{opacity:0;transform:translateY(-8px)}}
        @keyframes cotBreathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.07)}}
        @keyframes cotFlip{0%{transform:rotateY(90deg);opacity:0}100%{transform:rotateY(0);opacity:1}}
        @keyframes cotPop{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-26px);opacity:0}}
        @keyframes cotTwinkle{0%,100%{opacity:.35}50%{opacity:1}}
        @keyframes cotPulse{0%,100%{opacity:.7}50%{opacity:1}}
        @keyframes cotSway{0%,100%{transform:rotate(-1.6deg)}50%{transform:rotate(1.6deg)}}
        @keyframes cotSpark{0%{transform:translate(0,0);opacity:0}15%{opacity:1}100%{transform:translate(var(--dx,6px),-58px);opacity:0}}
        @keyframes cotZ{0%{transform:translate(0,0);opacity:0}25%{opacity:.85}100%{transform:translate(5px,-9px);opacity:0}}
        @media (prefers-reduced-motion: reduce){.cot-anim{animation:none !important}}
      `;
      (document.head || document.documentElement).appendChild(cs);
    }
    const el = (tag, css, text) => {
      const e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (text != null) e.textContent = text;
      return e;
    };
    const NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs, parent) => {
      const e = document.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
      if (parent) parent.appendChild(e);
      return e;
    };
    const anim = (node, css) => { node.setAttribute("class", "cot-anim"); node.style.cssText += css; return node; };
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const rnd = seed => { const x = Math.sin(gyHash(String(seed)) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

    // ── the few things he keeps: visits, today's tea, tea counts, today's card (never what you type) ──
    const KEY = "ao3_cottage_v1";
    let st = {};
    try { st = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { st = {}; }
    if (!st.teas || typeof st.teas !== "object") st.teas = {};
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
    const pragueDay = () => {                           // Prague date as YYYY-MM-DD; 00:00-01:59 still counts as the day before (same as the grounds)
      const p = {};
      new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Prague", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(new Date()).forEach(x => { if (x.type !== "literal") p[x.type] = Number(x.value); });
      let d = new Date(Date.UTC(p.year, p.month - 1, p.day));
      if (p.hour * 60 + p.minute < 120) d = new Date(d.getTime() - 864e5);
      return d.toISOString().slice(0, 10);
    };
    const dayKey = pragueDay();
    const hr = new Date().getHours();
    const firstEver = !st.visits;
    const visitedToday = st.last === dayKey;
    st.visits = (st.visits || 0) + 1; st.last = dayKey; save();

    // ── shell ──
    const back = el("div", "position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000003;");
    back.id = "ao3-cottage";
    const box = el("div", "position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:8px;right:8px;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;font-family:inherit;color:#f3e6d3;background:linear-gradient(180deg,#1d130f 0%,#2a1b15 100%);border:1px solid rgba(255,200,140,0.28);box-shadow:0 8px 40px rgba(0,0,0,0.6);");
    back.appendChild(box);
    const topbar = el("div", "flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;border-bottom:1px solid rgba(255,200,140,0.2);background:rgba(20,12,8,0.6);");
    const ttl = el("div", "display:flex;flex-direction:column;gap:2px;min-width:0;");
    ttl.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:15px;letter-spacing:0.05em;text-transform:uppercase;color:#ffe2b0;", "\u{1F3E0} Bram\u2019s cottage"));
    ttl.appendChild(el("div", "font-size:10px;letter-spacing:0.04em;color:rgba(243,230,211,0.6);", "kettle\u2019s on \u00B7 no history lessons"));
    const xBtn = el("button", "background:none;border:none;color:rgba(243,230,211,0.75);cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px;", "\u2715");
    xBtn.type = "button";
    topbar.appendChild(ttl); topbar.appendChild(xBtn);
    box.appendChild(topbar);

    // ── the room (SVG) ──  (taller, cosier room: string lights, hat on a proper peg, hanging mugs, rug, candles, fire sparks)
    const sceneWrap = el("div", "flex:0 0 auto;background:linear-gradient(180deg,#46332a 0%,#46332a 71.3%,#2b1e18 71.3%,#2b1e18 100%);");
    const svg = sv("svg", { viewBox: "0 0 360 300", preserveAspectRatio: "xMidYMid meet" });
    svg.style.cssText = "width:100%;max-width:560px;height:auto;max-height:50vh;display:block;margin:0 auto;";
    sceneWrap.appendChild(svg);
    box.appendChild(sceneWrap);
    const defs = sv("defs", {}, svg);
    const grad = (tag, id, attrs, stops) => {
      const g0 = sv(tag, Object.assign({ id }, attrs || {}), defs);
      stops.forEach(([o, c, a]) => sv("stop", { offset: o, "stop-color": c, "stop-opacity": a }, g0));
      return g0;
    };
    grad("radialGradient", "cot-fire", {}, [["0%", "#ffb060", 0.55], ["100%", "#ffb060", 0]]);
    grad("radialGradient", "cot-lamp", {}, [["0%", "#ffd98a", 0.35], ["100%", "#ffd98a", 0]]);
    grad("radialGradient", "cot-amb", {}, [["0%", "#ff9a4a", 0.3], ["55%", "#ff8a3a", 0.1], ["100%", "#ff8a3a", 0]]);
    grad("linearGradient", "cot-sky", { x1: 0, y1: 0, x2: 0, y2: 1 }, [["0%", "#141a3a", 1], ["100%", "#2b3163", 1]]);
    grad("linearGradient", "cot-moon", { x1: 0, y1: 0, x2: 0, y2: 1 }, [["0%", "#aebdff", 0.09], ["100%", "#aebdff", 0]]);
    grad("linearGradient", "cot-shade", { x1: 0, y1: 0, x2: 0, y2: 1 }, [["0%", "#000", 0.35], ["100%", "#000", 0]]);
    grad("radialGradient", "cot-vig", { cx: "50%", cy: "55%", r: "75%" }, [["60%", "#000", 0], ["100%", "#000", 0.5]]);
    const pat = sv("pattern", { id: "cot-paper", width: 16, height: 16, patternUnits: "userSpaceOnUse" }, defs);
    sv("rect", { width: 16, height: 16, fill: "#46332a" }, pat);
    sv("rect", { x: 0, width: 1.6, height: 16, fill: "#4f392f" }, pat);
    sv("circle", { cx: 8, cy: 8, r: 0.9, fill: "#563d31" }, pat);
    const moonMask = sv("mask", { id: "cot-moonmask" }, defs);
    sv("rect", { x: 0, y: 0, width: 360, height: 300, fill: "#fff" }, moonMask);
    sv("circle", { cx: 39, cy: 70, r: 7.6, fill: "#000" }, moonMask);

    const shadow = (cx, cy, rx) => sv("ellipse", { cx, cy, rx, ry: Math.max(3, rx * 0.12), fill: "#000", opacity: 0.28 }, svg);
    const candleFlame = (parent, x, y, sc, delay) => {     // a little glow + a flickering flame
      anim(sv("circle", { cx: x, cy: y, r: 13 * sc, fill: "url(#cot-lamp)" }, parent), `animation:cotPulse ${(2.2 + delay).toFixed(1)}s ease-in-out ${delay}s infinite;`);
      anim(sv("ellipse", { cx: x, cy: y, rx: 1.8 * sc, ry: 3.2 * sc, fill: "#ffd98a" }, parent), `animation:cotFlicker ${(1.1 + delay * 0.3).toFixed(1)}s ease-in-out ${delay}s infinite;transform-box:fill-box;transform-origin:50% 100%;`);
    };

    // walls: papered upper wall, panelled lower wall, skirting, floor
    sv("rect", { x: 0, y: 0, width: 360, height: 214, fill: "url(#cot-paper)" }, svg);
    sv("rect", { x: 0, y: 168, width: 360, height: 40, fill: "#36261f" }, svg);
    sv("rect", { x: 0, y: 164, width: 360, height: 5, fill: "#5a4230" }, svg);
    for (let i = 0; i < 8; i++) sv("rect", { x: 8 + i * 45, y: 175, width: 37, height: 27, rx: 1, fill: "none", stroke: "#2b1e18", "stroke-width": 1 }, svg);
    sv("rect", { x: 0, y: 208, width: 360, height: 8, fill: "#5a4230" }, svg);
    sv("rect", { x: 0, y: 208, width: 360, height: 1.4, fill: "#7a5a40" }, svg);
    sv("rect", { x: 0, y: 214, width: 360, height: 86, fill: "#2b1e18" }, svg);
    const plankRows = [216, 232, 252, 276, 300];
    plankRows.forEach((y0, i) => {
      if (i > 0 && i < 4) sv("line", { x1: 0, y1: y0, x2: 360, y2: y0, stroke: "#231813", "stroke-width": 1 }, svg);
      if (i < 4) (i % 2 ? [60, 190, 300] : [120, 250]).forEach(xx => sv("line", { x1: xx, y1: y0, x2: xx, y2: plankRows[i + 1], stroke: "#231813", "stroke-width": 1 }, svg));
    });
    // ceiling beam
    sv("rect", { x: 0, y: 0, width: 360, height: 16, fill: "#2e2019" }, svg);
    sv("rect", { x: 0, y: 16, width: 360, height: 7, fill: "url(#cot-shade)" }, svg);
    sv("rect", { x: 0, y: 15, width: 360, height: 1.2, fill: "#4a3426" }, svg);

    // window (night, moon, stars, hills, a far-off lit window), curtains, sill
    sv("rect", { x: 18, y: 54, width: 64, height: 86, fill: "url(#cot-sky)" }, svg);
    for (let i = 0; i < 12; i++) {
      const star = sv("circle", { cx: (22 + rnd("cs" + i) * 56).toFixed(1), cy: (58 + rnd("cy" + i) * 40).toFixed(1), r: (0.6 + rnd("cr" + i) * 0.5).toFixed(2), fill: "#fff", opacity: 0.75 }, svg);
      if (i % 3 === 0) anim(star, `animation:cotTwinkle ${(2 + rnd("ct" + i) * 2).toFixed(1)}s ease-in-out ${(rnd("cd" + i) * 2).toFixed(1)}s infinite;`);
    }
    sv("circle", { cx: 34, cy: 72, r: 15, fill: "#efe6bd", opacity: 0.1 }, svg);
    sv("circle", { cx: 34, cy: 72, r: 8.5, fill: "#efe6bd", mask: "url(#cot-moonmask)" }, svg);
    sv("path", { d: "M18 140 V126 Q30 116 44 124 Q58 112 70 122 Q76 118 82 124 V140 Z", fill: "#10142b" }, svg);
    sv("path", { d: "M52 124 L57 106 L62 124 Z M60 124 L64 110 L68 124 Z M24 128 L28 114 L32 128 Z", fill: "#0a0e20" }, svg);
    anim(sv("circle", { cx: 73, cy: 128, r: 1.2, fill: "#ffd98a" }, svg), "animation:cotTwinkle 3.2s ease-in-out infinite;");
    sv("path", { d: "M22 58 L40 58 L22 90 Z", fill: "#fff", opacity: 0.05 }, svg);
    sv("rect", { x: 18, y: 54, width: 64, height: 86, fill: "none", stroke: "#8a6a4e", "stroke-width": 4 }, svg);
    sv("path", { d: "M50 54 V140 M18 97 H82", stroke: "#8a6a4e", "stroke-width": 2.4 }, svg);
    sv("rect", { x: 10, y: 140, width: 80, height: 6, rx: 1.5, fill: "#6b4f35" }, svg);
    sv("rect", { x: 10, y: 140, width: 80, height: 1.4, rx: 0.7, fill: "#8a6a4e" }, svg);
    sv("rect", { x: 23, y: 134, width: 9, height: 6, fill: "#a06a50" }, svg);                         // cactus on the sill
    sv("ellipse", { cx: 27.5, cy: 129.5, rx: 3.2, ry: 5.2, fill: "#5d8a55" }, svg);
    sv("rect", { x: 62, y: 130, width: 10, height: 10, rx: 2, fill: "#ffd98a", "fill-opacity": 0.22, stroke: "#b98a6a", "stroke-width": 0.8 }, svg);   // candle jar on the sill
    candleFlame(svg, 67, 133, 0.8, 0.4);
    sv("line", { x1: 4, y1: 48, x2: 96, y2: 48, stroke: "#6b4f35", "stroke-width": 3, "stroke-linecap": "round" }, svg);
    sv("circle", { cx: 4, cy: 48, r: 2.8, fill: "#b98a3c" }, svg);
    sv("circle", { cx: 96, cy: 48, r: 2.8, fill: "#b98a3c" }, svg);
    sv("path", { d: "M7 50 H22 Q25 96 19 150 H7 Z", fill: "#7a3b4d" }, svg);
    sv("path", { d: "M93 50 H78 Q75 96 81 150 H93 Z", fill: "#7a3b4d" }, svg);
    sv("path", { d: "M12 50 Q13 100 11 150 M17 50 Q19 100 16 150 M88 50 Q87 100 89 150 M83 50 Q81 100 84 150", stroke: "#5e2a3a", "stroke-width": 1, fill: "none" }, svg);
    sv("path", { d: "M7 104 Q14 109 22 103 M93 104 Q86 109 78 103", stroke: "#d9b26a", "stroke-width": 2.4, fill: "none", "stroke-linecap": "round" }, svg);

    // his hat, hung properly: wooden plate, a peg, a little leather loop, and a soft sway
    sv("rect", { x: 107, y: 56, width: 10, height: 18, rx: 3, fill: "#6b4f35" }, svg);
    sv("rect", { x: 107, y: 56, width: 3, height: 18, rx: 1.5, fill: "#8a6a4e", opacity: 0.6 }, svg);
    sv("circle", { cx: 112, cy: 66, r: 3, fill: "#3a2a1c" }, svg);
    sv("circle", { cx: 111.2, cy: 65.2, r: 1, fill: "#8a6a4e" }, svg);
    const hatG = sv("g", {}, svg);
    anim(hatG, "animation:cotSway 5.5s ease-in-out infinite;transform-origin:112px 66px;");
    const hatSh = sv("g", { transform: "translate(2.2 2.4)", opacity: 0.28 }, hatG);
    sv("path", { d: "M112.6 71 Q110 82 103 93 L121.5 93 Q116 82 112.6 71 Z", fill: "#000" }, hatSh);
    sv("ellipse", { cx: 112, cy: 94, rx: 13.5, ry: 3.4, fill: "#000" }, hatSh);
    sv("circle", { cx: 112, cy: 66, r: 4.4, fill: "none", stroke: "#c9a36a", "stroke-width": 1.2 }, hatG);
    sv("path", { d: "M112.6 71 Q110 82 103 93 L121.5 93 Q116 82 112.6 71 Z", fill: "#1d1830" }, hatG);
    sv("path", { d: "M111.5 74 Q108.5 83 105 91", stroke: "#3a3358", "stroke-width": 0.9, fill: "none", "stroke-linecap": "round" }, hatG);
    sv("ellipse", { cx: 112, cy: 94, rx: 13.5, ry: 3.4, fill: "#15112a" }, hatG);
    sv("path", { d: "M104.3 90.2 Q112 92.6 120.2 90.2 L121 93 Q112 95.4 103.5 93 Z", fill: "#7a3b4d" }, hatG);
    sv("rect", { x: 111.4, y: 91.2, width: 2.4, height: 2.6, rx: 0.4, fill: "#d9b26a" }, hatG);

    // shelf with books and a plant, mugs on hooks beneath, a picture above
    sv("rect", { x: 134, y: 84, width: 94, height: 5, fill: "#6b4f35" }, svg);
    sv("rect", { x: 134, y: 84, width: 94, height: 1.2, fill: "#8a6a4e" }, svg);
    sv("path", { d: "M137 89 V96 L144 89 Z M218 89 V96 L225 89 Z", fill: "#5a4129" }, svg);
    [["#8a3b4d", 9], ["#3f6f8a", 7], ["#b99a5b", 8], ["#5d7a4e", 6], ["#7a5d8a", 9], ["#a86a4a", 7]].reduce((x0, [c, w]) => {
      const bw = w * 1.1, bh = (14 + (w % 3) * 2) * 1.25;
      sv("rect", { x: x0, y: 84 - bh, width: bw, height: bh, rx: 0.9, fill: c }, svg);
      sv("rect", { x: x0 + 1, y: 84 - bh + 4, width: bw - 2, height: 1.2, fill: "#000", opacity: 0.2 }, svg);
      return x0 + bw + 1.6;
    }, 139);
    sv("rect", { x: 203, y: 76, width: 14, height: 8, rx: 1.5, fill: "#8a5a44" }, svg);
    sv("path", { d: "M210 76 Q202 66 200 60 M210 76 Q211 64 213 58 M210 76 Q219 68 223 66", stroke: "#5d8a55", "stroke-width": 2.2, fill: "none", "stroke-linecap": "round" }, svg);
    sv("path", { d: "M218 86 Q222 96 218 106", stroke: "#4f7a46", "stroke-width": 1.5, fill: "none", "stroke-linecap": "round" }, svg);
    [[221, 94], [217, 99], [220, 104]].forEach(([lx, ly]) => sv("ellipse", { cx: lx, cy: ly, rx: 2.6, ry: 1.5, fill: "#5d8a55" }, svg));
    [[154, "#d6a36a"], [171, "#c98a8a"], [188, "#9bb7c9"]].forEach(([mx, mc]) => {
      sv("circle", { cx: mx, cy: 91.5, r: 1, fill: "#b98a3c" }, svg);
      sv("path", { d: `M${mx + 4.5} 96 q3 0 3 3 q0 2.5 -3 2.5`, stroke: mc, "stroke-width": 1.4, fill: "none" }, svg);
      sv("rect", { x: mx - 4.5, y: 93, width: 9, height: 9, rx: 2, fill: mc }, svg);
    });
    sv("rect", { x: 152, y: 32, width: 40, height: 32, rx: 1.5, fill: "#6b4f35" }, svg);
    sv("rect", { x: 155, y: 35, width: 34, height: 26, fill: "#e9dcc2" }, svg);
    sv("rect", { x: 158, y: 38, width: 28, height: 20, fill: "#3b5266" }, svg);
    sv("circle", { cx: 180, cy: 44, r: 3, fill: "#e8b86a" }, svg);
    sv("path", { d: "M158 58 Q166 46 174 52 Q180 44 186 50 V58 Z", fill: "#2f4a3a" }, svg);

    // dried herbs hanging from the beam
    const herbs = sv("g", {}, svg);
    anim(herbs, "animation:cotSway 6.5s ease-in-out infinite;transform-origin:244px 16px;");
    sv("line", { x1: 244, y1: 16, x2: 244, y2: 34, stroke: "#c9a36a", "stroke-width": 0.9 }, herbs);
    [-3, -2, -1, 0, 1, 2, 3].forEach((k, i) => sv("path", { d: `M244 36 Q${244 + k * 3} 46 ${244 + k * 5} ${58 - Math.abs(k) * 1.5}`, stroke: i % 2 ? "#8a6aa8" : "#7a8a4e", "stroke-width": 2.2, fill: "none", "stroke-linecap": "round" }, herbs));
    sv("rect", { x: 241, y: 33, width: 6, height: 3.4, rx: 1, fill: "#b04a3a" }, herbs);

    // fireplace: stone breast, round picture, mantel with garland and candles, arched firebox, hearth
    sv("rect", { x: 282, y: 16, width: 68, height: 192, fill: "#5d5057" }, svg);
    for (let r = 0; r < 18; r++) {
      const by = 18 + r * 10.6;
      sv("line", { x1: 282, y1: by, x2: 350, y2: by, stroke: "#4a3f45", "stroke-width": 0.8 }, svg);
      for (let xx = 282 + (r % 2 ? 9 : 18); xx < 350; xx += 17) sv("line", { x1: xx, y1: by, x2: xx, y2: by + 10.6, stroke: "#4a3f45", "stroke-width": 0.8 }, svg);
    }
    sv("ellipse", { cx: 316, cy: 44, rx: 17, ry: 20, fill: "#6b4f35" }, svg);
    sv("ellipse", { cx: 316, cy: 44, rx: 14, ry: 17, fill: "#26364f" }, svg);
    sv("path", { d: "M308 49 L316 41 L324 49 Z", fill: "#3b2a30" }, svg);
    sv("rect", { x: 310, y: 49, width: 12, height: 7, fill: "#6b3a48" }, svg);
    sv("rect", { x: 315, y: 51, width: 3, height: 3, fill: "#ffd98a" }, svg);
    sv("rect", { x: 274, y: 70, width: 84, height: 9, rx: 2, fill: "#6b4f35" }, svg);
    sv("rect", { x: 274, y: 70, width: 84, height: 2, rx: 1, fill: "#8a6a4e" }, svg);
    sv("rect", { x: 278, y: 79, width: 6, height: 6, fill: "#5a4129" }, svg);
    sv("rect", { x: 348, y: 79, width: 6, height: 6, fill: "#5a4129" }, svg);
    for (let i = 0; i < 10; i++) {
      const gx0 = 277 + i * 8.4;
      sv("ellipse", { cx: gx0, cy: 80 + (i % 2) * 2, rx: 4, ry: 1.8, fill: i % 2 ? "#4f7a46" : "#5d8a55" }, svg);
      if (i % 2) sv("circle", { cx: gx0 + 4, cy: 82, r: 1.5, fill: "#c0394a" }, svg);
    }
    sv("rect", { x: 286.5, y: 54, width: 3.2, height: 16, rx: 1, fill: "#f3e6d3" }, svg);
    candleFlame(svg, 288, 51, 1, 0.1);
    sv("rect", { x: 294, y: 60, width: 3.2, height: 10, rx: 1, fill: "#e8d6b8" }, svg);
    candleFlame(svg, 295.6, 57, 0.9, 0.7);
    sv("rect", { x: 335, y: 62, width: 11, height: 8, rx: 1.5, fill: "#8a5a44" }, svg);
    sv("path", { d: "M340.5 62 Q334 54 332 50 M340.5 62 Q341 52 343 48 M340.5 62 Q347 56 350 54", stroke: "#5d8a55", "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, svg);
    sv("path", { d: "M294 208 V150 Q294 120 316 120 Q338 120 338 150 V208 Z", fill: "#120a0e" }, svg);
    sv("path", { d: "M294 208 V150 Q294 120 316 120 Q338 120 338 150 V208", fill: "none", stroke: "#6b5a5f", "stroke-width": 4 }, svg);
    sv("rect", { x: 276, y: 206, width: 80, height: 9, rx: 1.5, fill: "#6b5a5f" }, svg);
    sv("rect", { x: 276, y: 206, width: 80, height: 1.6, fill: "#8a7a7f" }, svg);
    sv("rect", { x: 300, y: 196, width: 32, height: 8, rx: 4, fill: "#4a3022" }, svg);
    sv("rect", { x: 304, y: 189, width: 26, height: 7, rx: 3.5, fill: "#5a3a28", transform: "rotate(-10 317 192)" }, svg);
    sv("circle", { cx: 301, cy: 200, r: 4, fill: "#6a4630" }, svg);
    sv("circle", { cx: 301, cy: 200, r: 2, fill: "none", stroke: "#4a3022", "stroke-width": 0.8 }, svg);
    const fireG = sv("g", {}, svg);                     // (no transform attribute here: fireBoost scales this one with CSS)
    anim(sv("circle", { cx: 316, cy: 180, r: 60, fill: "url(#cot-fire)" }, fireG), "animation:cotFlicker 2.6s ease-in-out infinite;transform-origin:316px 180px;");
    anim(sv("ellipse", { cx: 316, cy: 202, rx: 15, ry: 3.2, fill: "#ff7a3a" }, fireG), "animation:cotPulse 1.8s ease-in-out infinite;");
    const flameIn = sv("g", { transform: "translate(-59 45) scale(1.25)" }, fireG);
    anim(sv("path", { d: "M283 124 Q276 104 286 90 Q289 104 296 96 Q297 108 307 104 Q312 96 309 88 Q319 104 316 124 Z", fill: "#e0572a", opacity: 0.9 }, flameIn), "animation:cotFlicker 2.1s ease-in-out .15s infinite;transform-origin:300px 124px;");
    anim(sv("path", { d: "M287 124 Q281 108 289 96 Q291 108 298 102 Q298 114 308 110 Q314 118 312 124 Z", fill: "#ff9a4a" }, flameIn), "animation:cotFlicker 1.7s ease-in-out infinite;transform-origin:300px 124px;");
    anim(sv("path", { d: "M293 124 Q290 114 297 108 Q299 116 304 112 Q307 118 305 124 Z", fill: "#ffd98a" }, flameIn), "animation:cotFlicker 1.3s ease-in-out .3s infinite;transform-origin:299px 124px;");
    [[309, 5, 3.1], [315, -6, 3.9], [320, 8, 4.6], [312, -3, 5.2], [318, 4, 3.5]].forEach(([sx, dx, dur], i) =>
      anim(sv("circle", { cx: sx, cy: 176, r: 0.9, fill: "#ffc070" }, fireG), `animation:cotSpark ${dur}s ease-out ${(i * 0.8).toFixed(1)}s infinite;--dx:${dx}px;`));

    // rug, moonlight on the floor, warm light behind the chair
    sv("ellipse", { cx: 200, cy: 256, rx: 132, ry: 26, fill: "#6b3a48", opacity: 0.92 }, svg);
    sv("ellipse", { cx: 200, cy: 256, rx: 114, ry: 19, fill: "none", stroke: "#b98a6a", "stroke-width": 1.2, opacity: 0.6 }, svg);
    sv("ellipse", { cx: 200, cy: 256, rx: 100, ry: 14, fill: "none", stroke: "#d9b26a", "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0.35 }, svg);
    sv("polygon", { points: "18,140 82,140 176,264 56,264", fill: "url(#cot-moon)" }, svg);
    sv("circle", { cx: 168, cy: 170, r: 100, fill: "url(#cot-lamp)" }, svg);

    // plant in the corner
    shadow(46, 226, 18);
    [["M45 202 Q28 186 26 160 Q42 172 45 202 Z", "#4f7a46"], ["M45 202 Q60 182 66 158 Q50 172 45 202 Z", "#5d8a55"], ["M45 202 Q40 176 44 150 Q52 176 45 202 Z", "#3f6a3c"],
     ["M45 202 Q24 196 14 180 Q34 182 45 202 Z", "#5d8a55"], ["M45 202 Q66 196 76 182 Q56 184 45 202 Z", "#4f7a46"]].forEach(([d, c]) => sv("path", { d, fill: c }, svg));
    sv("path", { d: "M33 226 L36 206 L56 206 L59 226 Z", fill: "#8a5a44" }, svg);
    sv("rect", { x: 33, y: 201, width: 26, height: 6, rx: 2, fill: "#a06a50" }, svg);

    // stack of books with a candle on top
    shadow(109, 226, 16);
    sv("rect", { x: 96, y: 217, width: 26, height: 7, rx: 1, fill: "#8a3b4d" }, svg);
    sv("rect", { x: 99, y: 210, width: 21, height: 7, rx: 1, fill: "#3f6f8a" }, svg);
    sv("rect", { x: 97, y: 203, width: 24, height: 7, rx: 1, fill: "#b99a5b" }, svg);
    sv("rect", { x: 106, y: 199, width: 9, height: 4, rx: 1, fill: "#b98a3c" }, svg);
    sv("rect", { x: 108, y: 189, width: 5, height: 10, rx: 1, fill: "#f3e6d3" }, svg);
    candleFlame(svg, 110.5, 186, 1, 0.5);

    // the armchair and Bram, sitting with a mug (drawn at the old size, then scaled up into the room)
    shadow(168, 226, 46);
    const chairG = sv("g", { transform: "translate(-50.7 48.5) scale(1.35)" }, svg);
    sv("rect", { x: 138, y: 128, width: 5, height: 5, rx: 1, fill: "#3d2429" }, chairG);
    sv("rect", { x: 183, y: 128, width: 5, height: 5, rx: 1, fill: "#3d2429" }, chairG);
    sv("rect", { x: 140, y: 84, width: 44, height: 46, rx: 9, fill: "#5c3a3f" }, chairG);
    sv("rect", { x: 134, y: 106, width: 11, height: 24, rx: 4, fill: "#6e464b" }, chairG);
    [[148, 93], [176, 93]].forEach(([bx, by]) => sv("circle", { cx: bx, cy: by, r: 1, fill: "#3d2429" }, chairG));
    sv("rect", { x: 141, y: 100, width: 12, height: 11, rx: 4, fill: "#b0764a" }, chairG);       // cushion
    sv("path", { d: "M143 104 H152 M143 107.5 H152", stroke: "#ecd3a0", "stroke-width": 0.9 }, chairG);
    const bram = sv("g", {}, chairG);
    sv("path", { d: "M150 118 L153 98 Q162 92 171 98 L174 118 Z", fill: "#2e2a45" }, bram);
    sv("circle", { cx: 162, cy: 90, r: 6, fill: "#d9c3a8" }, bram);
    sv("path", { d: "M156 88 Q162 80 168 88 Q162 85 156 88 Z", fill: "#3d2a1e" }, bram);
    sv("circle", { cx: 160, cy: 90.5, r: 0.7, fill: "#2a2033" }, bram);
    sv("circle", { cx: 164.4, cy: 90.5, r: 0.7, fill: "#2a2033" }, bram);
    sv("path", { d: "M160.4 93.4 q1.8 1.2 3.6 0", stroke: "#8a5a44", "stroke-width": 0.7, fill: "none", "stroke-linecap": "round" }, bram);
    sv("line", { x1: 170, y1: 104, x2: 176, y2: 106, stroke: "#2e2a45", "stroke-width": 2.2, "stroke-linecap": "round" }, bram);
    sv("rect", { x: 174, y: 102, width: 6, height: 7, rx: 1.4, fill: "#d6deea" }, bram);
    [0, 1].forEach(i => anim(sv("path", { d: `M${(175.5 + i * 2).toFixed(1)} 100 q-1.4 -3 0 -5 q1.4 -2 0 -4`, stroke: "#e6dcf5", "stroke-width": 1, fill: "none", "stroke-linecap": "round", opacity: 0.7 }, bram), `animation:cotSteam ${(1.9 + i * 0.5).toFixed(1)}s ease-out ${(i * 0.6).toFixed(1)}s infinite;`));
    sv("rect", { x: 180, y: 106, width: 11, height: 24, rx: 4, fill: "#6e464b" }, chairG);
    sv("path", { d: "M178.5 106 Q185 102 192 106 L192.5 124 Q185 128 178 124 Z", fill: "#c0794a" }, chairG);   // blanket over the arm
    sv("path", { d: "M178.5 112 H192 M178.2 118 H192.3", stroke: "#ecd3a0", "stroke-width": 1.2 }, chairG);
    sv("path", { d: "M179 124.5 v3 M182 125.6 v3 M185 126 v3 M188 125.6 v3 M191 124.5 v3", stroke: "#ecd3a0", "stroke-width": 0.8, "stroke-linecap": "round" }, chairG);
    sv("rect", { x: 134, y: 118, width: 56, height: 12, rx: 5, fill: "#6e464b" }, chairG);

    // little table: teapot, and your mug once you have one
    shadow(240, 226, 30);
    const tableG = sv("g", { transform: "translate(-48 61.5) scale(1.25)" }, svg);
    sv("rect", { x: 208, y: 114, width: 46, height: 4, rx: 1, fill: "#6b4f35" }, tableG);
    sv("rect", { x: 212, y: 118, width: 3, height: 12, fill: "#5a4129" }, tableG);
    sv("rect", { x: 247, y: 118, width: 3, height: 12, fill: "#5a4129" }, tableG);
    sv("ellipse", { cx: 222, cy: 109, rx: 8, ry: 6, fill: "#8a5a44" }, tableG);
    sv("rect", { x: 219, y: 102, width: 6, height: 2.4, rx: 1, fill: "#6b4f35" }, tableG);
    sv("path", { d: "M229.5 108 Q235 106 233 101", stroke: "#8a5a44", "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, tableG);
    sv("path", { d: "M214.5 106 Q209 107 210 112", stroke: "#8a5a44", "stroke-width": 1.8, fill: "none", "stroke-linecap": "round" }, tableG);
    anim(sv("path", { d: "M233 99 q-1.5 -3 0 -5 q1.5 -2 0 -4", stroke: "#e6dcf5", "stroke-width": 1, fill: "none", "stroke-linecap": "round", opacity: 0.6 }, tableG), "animation:cotSteam 2.2s ease-out infinite;");
    const herMug = sv("g", {}, tableG);
    herMug.style.display = "none";
    const mugBody = sv("rect", { x: 240, y: 106, width: 8, height: 8, rx: 1.6, fill: "#d6a36a" }, herMug);
    sv("path", { d: "M248 108 q3 0 3 3 q0 2.5 -3 2.5", stroke: "#d6deea", "stroke-width": 1.2, fill: "none" }, herMug);
    [0, 1].forEach(i => anim(sv("path", { d: `M${(242 + i * 3).toFixed(1)} 104 q-1.4 -3 0 -5 q1.4 -2 0 -4`, stroke: "#e6dcf5", "stroke-width": 1, fill: "none", "stroke-linecap": "round", opacity: 0.75 }, herMug), `animation:cotSteam ${(1.8 + i * 0.5).toFixed(1)}s ease-out ${(i * 0.5).toFixed(1)}s infinite;`));

    // slippers by the chair
    [[152, 252, -8], [166, 255, 6]].forEach(([sx, sy, rot]) => {
      const sl = sv("g", { transform: `rotate(${rot} ${sx} ${sy})` }, svg);
      sv("ellipse", { cx: sx, cy: sy, rx: 7, ry: 3.4, fill: "#a8704f" }, sl);
      sv("ellipse", { cx: sx + 3.5, cy: sy - 0.4, rx: 3.4, ry: 2.4, fill: "#e6d3b3" }, sl);
    });

    // the cat, curled up on the rug by the fire (breathing, with sleepy z's)
    shadow(262, 270, 28);
    const cat = sv("g", { transform: "translate(91 32.5) scale(1.5)" }, svg);
    const catBody = sv("g", {}, cat);
    anim(catBody, "animation:cotBreathe 3.4s ease-in-out infinite;transform-origin:50% 100%;transform-box:fill-box;");
    sv("ellipse", { cx: 112, cy: 150, rx: 15, ry: 7, fill: "#3b3340" }, catBody);
    sv("circle", { cx: 99, cy: 147, r: 5.6, fill: "#3b3340" }, catBody);
    sv("path", { d: "M94.6 144 L95.6 138.6 L99 142 Z M103.4 144 L102.4 138.6 L99 142 Z", fill: "#3b3340" }, catBody);
    sv("path", { d: "M126 152 Q134 150 130 144", stroke: "#3b3340", "stroke-width": 3.2, fill: "none", "stroke-linecap": "round" }, catBody);
    sv("path", { d: "M96.6 147.4 q1.2 1 2.4 0 M100 147.4 q1.2 1 2.4 0", stroke: "#cbbfe0", "stroke-width": 0.7, fill: "none", "stroke-linecap": "round" }, catBody);
    [0, 1].forEach(i => {
      const z = sv("text", { x: 102 + i * 4, y: 138 - i * 3, "font-size": 5 + i, fill: "#e6dcf5", "font-family": "Georgia,serif", "font-style": "italic" }, cat);
      z.textContent = "z";
      anim(z, `animation:cotZ 3.6s ease-out ${(i * 1.4).toFixed(1)}s infinite;`);
    });

    // the glow of the fire over the room, string lights along the beam, and a soft vignette
    const amb = sv("circle", { cx: 316, cy: 190, r: 170, fill: "url(#cot-amb)" }, svg);
    amb.style.pointerEvents = "none";
    anim(amb, "animation:cotPulse 3.2s ease-in-out infinite;");
    const A = [[-4, 14], [90, 19], [180, 16], [270, 20], [364, 14]];
    let wire = `M${A[0][0]} ${A[0][1]}`;
    const lightCols = ["#ffd98a", "#ffb870", "#ff9ab0", "#fff0c0"];
    const bulbs = [];
    for (let i = 0; i < A.length - 1; i++) {
      const p0 = A[i], p2 = A[i + 1], c = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2 + 26];
      wire += ` Q${c[0]} ${c[1]} ${p2[0]} ${p2[1]}`;
      [0.2, 0.4, 0.6, 0.8].forEach(t => { const u = 1 - t; bulbs.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1]]); });
    }
    sv("path", { d: wire, stroke: "#2a1d16", "stroke-width": 1, fill: "none" }, svg);
    bulbs.forEach(([bx, by], i) => {
      const col = lightCols[i % lightCols.length];
      sv("rect", { x: bx - 1, y: by - 0.2, width: 2, height: 2.4, fill: "#3a2a1c" }, svg);
      anim(sv("circle", { cx: bx, cy: by + 4.4, r: 6.5, fill: col, "fill-opacity": 0.22 }, svg), `animation:cotTwinkle ${(2.4 + (i % 4) * 0.5).toFixed(1)}s ease-in-out ${((i * 0.37) % 2).toFixed(2)}s infinite;`);
      sv("circle", { cx: bx, cy: by + 4.2, r: 2, fill: col }, svg);
    });
    const vig = sv("rect", { x: 0, y: 0, width: 360, height: 300, fill: "url(#cot-vig)" }, svg);
    vig.style.pointerEvents = "none";
    const bramHit = sv("rect", { x: 127, y: 151, width: 84, height: 76, fill: "transparent" }, svg);   // tap Bram (on top of everything)
    bramHit.style.cursor = "pointer";
    const setMug = c => { if (!c) { herMug.style.display = "none"; return; } mugBody.setAttribute("fill", c); herMug.style.display = ""; };
    const fireBoost = () => {                         // the fire jumps when you toss something on it
      fireG.style.transition = "transform .25s"; fireG.style.transformOrigin = "316px 200px";
      fireG.style.transform = "scale(1.35)";
      setTimeout(() => { fireG.style.transform = "scale(1)"; }, 1200);
    };

    // ── the card where he talks ──
    const card = el("div", "flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:22px 16px 30px;border-top:1px solid rgba(255,200,140,0.25);background:rgba(20,12,8,0.9);text-align:center;");
    box.appendChild(card);
    const bcss = "cursor:pointer;font:inherit;font-size:14px;font-weight:600;border-radius:10px;padding:10px 15px;border:1px solid rgba(255,200,140,0.4);background:rgba(255,255,255,0.07);color:#f6e8d6;";
    const speak = (line, build) => {
      card.textContent = "";
      card.appendChild(el("div", "font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,217,138,0.85);", "\u{1F3EE} Bram \u00B7 in the cottage"));
      if (line.t) card.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:17px;line-height:1.5;margin:12px 0 4px;color:#f6e8d6;", `\u201C${line.t}\u201D`));
      if (line.n) card.appendChild(el("div", "font-size:12.5px;line-height:1.45;margin-top:7px;color:rgba(255,217,138,0.9);", line.n));
      const row = el("div", "display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:16px;");
      const btn = (label, fn, css) => { const b = el("button", bcss + (css || ""), label); b.type = "button"; b.onclick = fn; row.appendChild(b); return b; };
      card.appendChild(row);
      (build || (() => {}))({ btn, add: node => card.insertBefore(node, row) });
      card.scrollTop = 0;
    };
    const onKey = e => { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); close(); } };
    const close = () => { back.remove(); window.removeEventListener("keydown", onKey, true); };
    xBtn.onclick = close;
    back.addEventListener("click", e => { if (e.target === back) close(); });
    window.addEventListener("keydown", onKey, true);       // on window so it runs before the grounds' own Escape handler
    const heard = [];
    const fresh = arr => { const f = arr.filter(x => !heard.includes(x)); const v = pick(f.length ? f : arr); heard.push(v); if (heard.length > 24) heard.shift(); return v; };

    bramHit.addEventListener("click", () => speak({ t: fresh([
      "Hm? Oh, don\u2019t mind me. Drink your tea.",
      "Not in here. Cottage rule: tea and chat, no history lessons.",
      "I\u2019m only the man with the kettle in here. Anything else can stay outside with the crows.",
      "Nothing interesting to tell, love. Ask the cat. She knows everything.",
      "Sit down, you\u2019re making the room nervous."
    ]) }, ({ btn }) => { btn("Back", () => room()); }));

    // ═════════ the room: where he starts and where everything comes back to ═════════
    const room = line => {
      const had = st.tea && st.tea.d === dayKey;
      speak(line || { t: pick(["Right. What\u2019ll it be?", "Go on, then. I\u2019m all yours.", "Anything you fancy?"]) }, ({ btn }) => {
        btn(had ? "\u{1FAD6} Another cup" : "\u{1FAD6} Tea", () => teaMenu());
        btn("\u{1F5E3}\uFE0F Vent", () => ventStart());
        btn("\u{1F4DA} Fics", () => ficMenu());
        btn("\u{1F0CF} Tarot", () => tarotStart());
        btn("\u{1F6AA} Leave", () => leave());
      });
    };
    const leave = () => {
      speak({ t: pick(["Mind the step. And the cat.", "Off you go, then. The door\u2019s always on the latch.", "Look after yourself out there, love. I mean it. I\u2019ll know if you don\u2019t.", "Go on. Come back when the kettle gets lonely."]) }, ({ btn }) => { btn("Out I go", close); });
      setTimeout(close, 2200);
    };

    // ═════════ 🫖 tea ═════════
    const TEAS = [
      { id: "builder", e: "\u2615", n: "Builder\u2019s tea", d: "strong, stewed, splash of milk", c: "#b9794a", say: ["Strong enough to stand a spoon in. For days that have earned it.", "Proper tea. No nonsense. Like a good boot."] },
      { id: "chamomile", e: "\u{1F33C}", n: "Chamomile & honey", d: "soft, golden, sleepy", c: "#e8cf7a", say: ["Chamomile. For winding down, and for pretending you aren\u2019t wound up.", "Honey in it. Don\u2019t tell the bees I\u2019m a thief."] },
      { id: "earl", e: "\u{1F9D0}", n: "Earl Grey", d: "bergamot, a bit posh", c: "#a8794f", say: ["Earl Grey. For the part of you that likes to feel elegant. Pinkies out.", "Bergamot. Smells like a library that\u2019s doing well for itself."] },
      { id: "mint", e: "\u{1F33F}", n: "Peppermint", d: "bright, clearing, for a loud head", c: "#9bd1a0", say: ["Peppermint. Opens the windows in your head. Mind the draught.", "Fresh as a slap, and gentler."] },
      { id: "lapsang", e: "\u{1F525}", n: "Lapsang souchong", d: "smoky, like a bonfire in a cup", c: "#7a4a32", say: ["Lapsang. Tastes like a campfire went to finishing school. You\u2019ll love it or you\u2019ll glare at me.", "Smoky. Bold choice. I respect it."] },
      { id: "jasmine", e: "\u{1F338}", n: "Jasmine green", d: "light, floral, clear", c: "#cfe0a0", say: ["Jasmine. Light as a good morning. Sip it, don\u2019t gulp it.", "Delicate stuff. Handle it like gossip."] },
      { id: "chai", e: "\u{1F9E1}", n: "Spiced chai", d: "cinnamon, cardamom, a hug", c: "#c98a52", say: ["Chai. Cinnamon and cardamom and a bit of attitude. Like you.", "Spiced. It\u2019ll warm you from the toes up."] },
      { id: "rooibos", e: "\u{1F342}", n: "Vanilla rooibos", d: "red, sweet, no caffeine", c: "#c25a3a", say: ["Rooibos. Caffeine-free, so no excuses about sleep.", "Vanilla. Tastes like being tucked in."] },
      { id: "hibiscus", e: "\u{1F33A}", n: "Hibiscus", d: "tart, ruby red, sharp", c: "#c0405a", say: ["Hibiscus. Tart as a retort. Suits you on a day like this.", "Sharp and a bit sour, and good for you. Rather like advice."] },
      { id: "ginger", e: "\u{1FAD0}", n: "Ginger & lemon", d: "zingy, for run-down days", c: "#e6c75a", say: ["Ginger and lemon. For a worn-out body. Drink it all, I\u2019m watching.", "Zingy. It\u2019ll wake up whatever part of you is sulking."] }
    ];
    const teaById = id => TEAS.find(t => t.id === id);
    if (st.tea && st.tea.d === dayKey && teaById(st.tea.id)) setMug(teaById(st.tea.id).c);
    const favTea = () => {
      const top = Object.keys(st.teas).sort((a, b) => st.teas[b] - st.teas[a])[0];
      return top && st.teas[top] >= 3 ? teaById(top) : null;
    };
    const timeTea = () => {                           // what he'd choose for you, by the hour
      const pool = hr < 5 || hr >= 22 ? ["chamomile", "mint", "rooibos"] : hr < 11 ? ["builder", "earl", "ginger"] : hr < 17 ? ["jasmine", "chai", "mint"] : ["chamomile", "rooibos", "chai"];
      return teaById(pick(pool));
    };
    const pour = (t, bySurprise) => {
      const had = st.tea && st.tea.d === dayKey;
      st.tea = { d: dayKey, id: t.id }; st.teas[t.id] = (st.teas[t.id] || 0) + 1; save();
      setMug(t.c);
      const usual = favTea() && favTea().id === t.id && st.teas[t.id] >= 3;
      const opener = bySurprise ? pick(["You look like a " + t.n.toLowerCase() + " sort of person tonight. Don\u2019t argue.", "Trust me. I\u2019ve got an eye for these things."]) : "";
      speak({
        t: (opener ? opener + " " : "") + pick(t.say) + (usual ? " The usual, then. I knew it." : ""),
        n: had ? "He tops up your mug. The steam curls round the lamp." : "He sets the cup by your hand. The steam curls round the lamp."
      }, ({ btn }) => { btn("Thanks, Bram", () => room({ t: pick(["Anything else, while it cools?", "Go on, then. What\u2019s next?", "Drink up. What else?"]) })); });
    };
    const teaMenu = (entry) => {
      const had = st.tea && st.tea.d === dayKey;
      const line = had ? { t: pick(["Another one? Greedy. I approve.", "Second cup, is it? Go on, it\u2019s a cup, not a commitment."]) }
        : { t: !entry ? pick(["Go on, then. What\u2019ll it be?", "Have a look. Take your time."]) : firstEver ? "Come in, come in. Wipe your feet. Mind the cat, she\u2019s decided that chair is hers. Tea?" : visitedToday ? "Back again? Good. Sit. Tea?" : pick(
          hr < 5 || hr >= 22 ? ["Still up? Course you are. Kettle\u2019s just boiled. Tea?", "Late, isn\u2019t it? Sit. I\u2019ll find you something soothing."] :
          hr < 11 ? ["Morning, love. Tea first, talk after.", "Up already? Brave. Sit, I\u2019ll pour."] :
          hr < 17 ? ["Afternoon. Sit. You look like you\u2019ve been carrying something. Tea?", "There you are. Kettle\u2019s just boiled. What\u2019ll it be?"] :
          ["Evening. Sit, sit. Kettle\u2019s on. What\u2019ll it be?", "Ah, there you are. Long day? Tea, then talk."]) };
      const day = TEAS.slice().map(t => ({ t, k: rnd("tea" + dayKey + t.id) })).sort((a, b) => a.k - b.k).map(o => o.t).slice(0, 4);
      const fav = favTea();
      const opts = fav ? [fav].concat(day.filter(t => t.id !== fav.id)).slice(0, 4) : day;
      speak(line, ({ btn, add }) => {
        if (fav) add(el("div", "font-size:11px;margin-top:6px;color:rgba(255,217,138,0.85);", `\u2606 Your usual: ${fav.n}`));
        const list = el("div", "display:flex;flex-direction:column;gap:6px;margin-top:10px;text-align:left;");
        opts.forEach(t => {
          const b = el("button", bcss + "display:flex;align-items:center;gap:10px;width:100%;text-align:left;", "");
          b.type = "button";
          b.appendChild(el("span", "font-size:20px;line-height:1;", t.e));
          const tx = el("span", "display:flex;flex-direction:column;gap:1px;");
          tx.appendChild(el("span", "font-size:13px;", t.n));
          tx.appendChild(el("span", "font-size:11px;font-weight:400;opacity:0.7;", t.d));
          b.appendChild(tx);
          b.onclick = () => pour(t, false);
          list.appendChild(b);
        });
        add(list);
        btn("\u2728 You pick", () => pour(timeTea(), true));
        btn(had ? "Back" : "Not now", () => room());
      });
    };

    // ═════════ 🗣️ vent ═════════
    const CRISIS = /\b(kill myself|killing myself|suicid\w*|end it all|end my life|want to die|wanna die|don'?t want to (be here|live|exist)|no point (in )?(living|going on)|hurt myself|harm myself|self[- ]?harm\w*|can'?t go on|better off without me|take my own life)\b/i;
    const TOPICS = [
      { id: "anxious", chip: "Brain won\u2019t stop", re: /\b(anxious|anxiety|worried|worry|worrying|scared|panic\w*|nervous|spiral\w*|overthink\w*|dread|stress\w*)\b/i },
      { id: "work", chip: "Work", re: /\b(work|job|boss|manager|deadline\w*|meeting\w*|co-?workers?|colleagues?|clients?|shifts?|overtime|emails?|office|customers?|promotion|salary|workload)\b/i },
      { id: "people", chip: "People", re: /\b(friends?|mum|mom|dad|mother|father|family|sister|brother|partner|boyfriend|girlfriend|husband|wife|ex|argument|argued|fight|fought|ignored|ghosted|left out|lonely)\b/i },
      { id: "tired", chip: "Tired", re: /\b(tired|exhausted|drained|burnt out|burned out|burnout|insomnia|knackered|no energy|wiped|can'?t sleep)\b/i },
      { id: "sad", chip: "Sad", re: /\b(sad|cry|crying|cried|empty|numb|miserable|alone|grief|heartbroken)\b/i },
      { id: "angry", chip: "Angry", re: /\b(angry|furious|annoyed|pissed|rage|hate|sick of|fed up|unfair|livid)\b/i },
      { id: "over", chip: "Just a lot", re: /\b(overwhelmed|too much|can'?t cope|behind on|so much|swamped|drowning)\b/i }
    ];
    const VENT = {
      work: {
        ack: ["Work again. That place takes an awful lot and gives you a payslip.", "Ah. Work. The thing that eats the best hours and calls it a favour.", "That sounds like a lot to carry through a door every morning.", "So they\u2019ve handed you more than one person\u2019s job. Marvellous. Very generous of them."],
        nudge: ["Your worth isn\u2019t a performance review, love. Tell it I said so.", "You\u2019re more capable than that email makes you feel. Emails lie. Constantly.", "Nobody ever lay on their deathbed wishing they\u2019d answered one more email. Put the kettle between you and it."],
        ask: ["What\u2019s the part that actually stings: the amount of it, or how it\u2019s being handled?", "If you could change one thing about it by Friday, what would it be?", "Is it the work that\u2019s heavy, or the people around it?"]
      },
      people: {
        ack: ["People. Lovely, and also the whole problem.", "Mm. It\u2019s always the ones we care about who land hardest.", "That would sting me too. It sounds like it stung you properly."],
        nudge: ["You\u2019re allowed to be hurt and fair about it. Both fit in the same cup.", "You give people a lot of benefit of the doubt. Keep some back for yourself, eh?", "Caring isn\u2019t the mistake here. Never was."],
        ask: ["What did you need from them that you didn\u2019t get?", "If they were sitting here, what\u2019s the first thing you\u2019d say?", "Is this a talk-it-out situation, or a let-it-go one?"]
      },
      tired: {
        ack: ["You sound wrung out. Properly, bone-deep.", "Tired. Not \u2018had a late one\u2019 tired. The other kind.", "Your battery\u2019s in the red and you\u2019re still out there being polite to everyone."],
        nudge: ["Rest isn\u2019t a reward you earn, you daft thing. It\u2019s maintenance.", "I\u2019m ordering you to do absolutely nothing for ten minutes. I\u2019m not a doctor. Do it anyway.", "Even a lantern needs its oil topped up. Nobody calls that weakness."],
        ask: ["What\u2019s one thing you could put down tonight?", "When did you last do something just because it was nice?", "Is it your body that\u2019s tired, or your head?"]
      },
      anxious: {
        ack: ["That sounds loud in there. All those what-ifs at once.", "Ah, the spiral. It always sounds so sure of itself, doesn\u2019t it?", "That\u2019s a lot of dread to carry round. No wonder you\u2019re worn."],
        nudge: ["Your brain is brilliant at writing worst cases. Shame it\u2019s rubbish at editing them.", "Feelings aren\u2019t forecasts, love. A grey sky isn\u2019t a prophecy.", "Breathe out slower than you breathe in. Twice. I\u2019ll wait. I\u2019ve nowhere to be."],
        ask: ["What\u2019s the thing you\u2019re most afraid will happen? Say it out loud, it shrinks.", "Which part is actually yours to deal with tonight, and which part can wait?", "What would you tell a friend who said this to you?"]
      },
      sad: {
        ack: ["I\u2019m sorry, love. That\u2019s a heavy one.", "Some days sit on your chest like wet wool.", "Mm. You don\u2019t have to tidy that up for me."],
        nudge: ["You don\u2019t have to be fine in here. Fine can wait outside with the crows.", "Sad doesn\u2019t mean broken. It means you\u2019re paying attention.", "Drink your tea. Then, if you like, have a cry. Both are very productive."],
        ask: ["Do you want me to just sit with you, or help you think it through?", "Has something happened, or has it been building?", "Who in your life could you tell a little of this to?"]
      },
      angry: {
        ack: ["Good. Be furious. It\u2019s a fair reaction to an unfair thing.", "Oh, that would\u2019ve had me kicking a bucket. And I\u2019m a calm man.", "Right, I\u2019m on your side. Tell me all of it. Don\u2019t leave out the rude bits."],
        nudge: ["Anger is just a love of things being fair that\u2019s had enough.", "You\u2019re allowed to say it badly in here. Nobody\u2019s marking it.", "Say the thing you wish you\u2019d said. Out loud. The kettle\u2019s heard worse."],
        ask: ["What do you wish had gone differently?", "Is there something you need to say to someone, or just to get out?", "What would fair actually look like here?"]
      },
      over: {
        ack: ["That\u2019s a lot of plates, love. No wonder one\u2019s wobbling.", "Everything at once. That\u2019s how it tends to come.", "You\u2019re juggling the lot and nobody\u2019s said thank you. So: thank you. Now put one down."],
        nudge: ["You don\u2019t have to solve the whole pile. Just pick up the top thing.", "A graveyard doesn\u2019t get swept in an afternoon. One stone at a time.", "Whatever isn\u2019t on fire can wait until tomorrow."],
        ask: ["If you could only do one thing tomorrow, what would it be?", "What\u2019s the one item on the list that\u2019s quietly making everything else heavier?", "What can you drop, delay, or hand to somebody else?"]
      },
      generic: {
        ack: ["I hear you.", "Mm. Go on, I\u2019m listening.", "That\u2019s a lot to be holding."],
        nudge: ["You\u2019re doing better than you think, love. I\u2019m a decent judge. I judge stones for a living.", "Whatever it is, you walked in and said it. That counts for something.", "Not everything has to get fixed tonight. Some things just need saying."],
        ask: ["How is it sitting with you now you\u2019ve said it out loud?", "What do you need most right now: comfort, or a plan?"]
      }
    };
    let ventTopic = null;
    const ventStart = (more) => {
      ventTopic = null;
      speak({
        t: more ? pick(["Go on, then.", "And?", "What else is in there?"]) : pick(["Go on. Say it to the kettle if you\u2019d rather. I\u2019m only here to listen.", "Out with it, love. Whatever it is, it\u2019s too heavy to keep carrying round.", "I\u2019ve got all night and a full pot. Tell me."]),
        n: "What you type stays in this box. It isn\u2019t saved anywhere."
      }, ({ btn, add }) => {
        const ta = el("textarea", "width:100%;box-sizing:border-box;min-height:84px;margin-top:10px;padding:9px 10px;border-radius:10px;border:1px solid rgba(255,200,140,0.35);background:rgba(0,0,0,0.3);color:#f6e8d6;font:inherit;font-size:13.5px;line-height:1.45;resize:vertical;");
        ta.placeholder = "What\u2019s weighing on you?";
        ta.maxLength = 1500;
        add(ta);
        const chips = el("div", "display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin-top:8px;");
        const chipEls = {};
        TOPICS.forEach(tp => {
          const c = el("button", "cursor:pointer;font:inherit;font-size:11.5px;border-radius:999px;padding:4px 10px;border:1px solid rgba(255,200,140,0.35);background:rgba(255,255,255,0.05);color:#f6e8d6;", tp.chip);
          c.type = "button";
          c.onclick = () => {
            ventTopic = ventTopic === tp.id ? null : tp.id;
            Object.keys(chipEls).forEach(k => { chipEls[k].style.background = k === ventTopic ? "rgba(255,217,138,0.3)" : "rgba(255,255,255,0.05)"; });
          };
          chipEls[tp.id] = c; chips.appendChild(c);
        });
        add(chips);
        add(el("div", "font-size:10px;margin-top:9px;color:rgba(243,230,211,0.5);", "Bram\u2019s a cosy character, not a therapist."));
        btn("Let it out", () => ventReply(ta.value, ventTopic));
        btn("Back", () => room());
        setTimeout(() => { try { ta.focus(); } catch {} }, 60);
      });
    };
    const ventReply = (raw, chip) => {
      const text = String(raw || "").trim();
      const norm = text.replace(/[\u2018\u2019]/g, "'");       // phones type curly apostrophes
      if (CRISIS.test(norm)) {                        // he puts the sass down and points to people
        speak({ t: "Love, I\u2019m putting the sass down for a minute. What you just said sounds really heavy, and I don\u2019t want you holding it alone tonight.",
          n: "Please reach out to someone who can be with you properly: a person you trust, or a crisis line. If you might act on it or you\u2019re in danger, call your local emergency number now." }, ({ btn, add }) => {
          const a = el("a", "display:inline-block;margin-top:9px;font-size:12px;color:#ffd98a;text-decoration:underline;", "findahelpline.com lists free lines by country");
          a.href = "https://findahelpline.com"; a.target = "_blank"; a.rel = "noopener noreferrer";
          add(a);
          btn("I\u2019m here, keep going", () => ventStart(true));
          btn("Back", () => room());
        });
        return;
      }
      if (!text && !chip) {
        speak({ t: "Nothing? That\u2019s allowed too. Sit with the tea. Say it when it\u2019s ready." }, ({ btn }) => { btn("Try again", () => ventStart(true)); btn("Back", () => room()); });
        return;
      }
      const hit = TOPICS.find(tp => tp.re.test(norm));
      const topic = chip || (hit && hit.id) || "generic";
      const P = VENT[topic] || VENT.generic;
      speak({ t: pick(P.ack) + " " + pick(P.nudge) }, ({ btn, add }) => {
        add(el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:12.5px;line-height:1.45;margin-top:9px;color:rgba(255,217,138,0.95);", `Then, gently: \u201C${pick(P.ask)}\u201D`));
        btn("Keep going", () => ventStart(true));
        btn("\u{1F525} Put it on the fire", () => {
          fireBoost();
          speak({ t: pick(["There. Gone. The smoke takes the worst of it up the chimney.", "Into the fire with you. That\u2019s me done with it, too.", "Burned. Properly. The cat approves."]), n: "Better out than in." }, ({ btn: b2 }) => { b2("Thanks, Bram", () => room()); });
        });
        btn("Done for now", () => room({ t: pick(["Good. That\u2019s a weight shifted. Now: something gentler?", "Well said, love. Better? Go on, pick something nice.", "You did well, saying all that. Now. Biscuit? Metaphorical biscuit. What next?"]) }));
      });
    };

    // ═════════ 📚 fics: dead ones, ones still going, finished ones, and lines you saved ═════════
    const titleOf = f => f.title || `Work ${f.workId}`;
    const quotesOf = f => getLog().filter(e => e && e.quote && String(e.quote).trim() && (String(e.key || "").split("::")[0] === String(f.workId) || (e.title && e.title === f.title)));
    const clip = s => { s = String(s).replace(/\s+/g, " ").trim(); return s.length > 260 ? s.slice(0, 257) + "\u2026" : s; };
    const QUOTE_REACT = ["Oh, that line. Yes. I see why you kept it.", "That\u2019s well put. Annoyingly well put.", "You\u2019ve got good taste in sentences, I\u2019ll give you that.", "I\u2019d have underlined that too. In pen. Like a vandal.", "Hm. Read it again. Slower. There.", "That one\u2019s got teeth."];
    const quoteBlock = (q, who) => {
      const w = el("div", "text-align:left;margin-top:10px;padding:8px 11px;border-left:3px solid rgba(255,217,138,0.6);background:rgba(255,255,255,0.05);border-radius:0 8px 8px 0;");
      w.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;line-height:1.5;color:#f6e8d6;overflow-wrap:anywhere;", `\u201C${clip(q)}\u201D`));
      if (who) w.appendChild(el("div", "font-size:10.5px;margin-top:5px;color:rgba(243,230,211,0.6);", who));
      return w;
    };
    const ficList = () => {
      const all = getTracked();
      return {
        dead: abandonedFics(),
        alive: all.filter(f => !f.finished && isWip(f)),
        done: all.filter(f => f.finished),
        quotes: getLog().filter(e => e && e.quote && String(e.quote).trim())
      };
    };
    const ficLine = (f, kind) => {
      const tt = `\u2018${titleOf(f)}\u2019`, by = f.author ? ` by ${f.author}` : "";
      const quiet = daysSince(f.lastUpdate), ago = quiet != null ? gyAgo(quiet) : "a good while";
      const words = f.words ? `${Number(f.words).toLocaleString()} words` : "";
      const pool = kind === "dead" ? [
        `${tt} again? Quiet for ${ago}, and yet here we are, still talking about it.`,
        `Ah, ${tt}${by}. ${words ? words + " and then" : "And then"} nothing. You never quite let that one go, did you?`,
        `${ago} since an update. You and I both know you\u2019ll check again next week.`,
        `${tt}. Dead, but not forgotten. And you\u2019re allowed to leave a fic unfinished, love. Libraries don\u2019t send you a bill.`
      ] : kind === "alive" ? [
        `${tt} is still breathing. Updating, even! A fic with manners.`,
        `${tt}${by} is still going. Do try not to read it all in one sitting. (You will.)`,
        `Ooh, ${tt}. A living one. Your favourite kind of heartache: the kind with a next chapter.`
      ] : [
        `${tt}${by}. Finished! A whole, complete story. I had to sit down.`,
        `A finished one${words ? ", " + words : ""}, and an actual ending. Rarer than a dry day.`,
        `${tt}. You read it to the end. I\u2019m proud of you and slightly jealous.`
      ];
      return fresh(pool);
    };
    const ficDetail = (f) => {
      const bits = [];
      if (f.chaptersLabel) bits.push(`chapters ${f.chaptersLabel}`);
      if (f.currentChapter) bits.push(`you\u2019re up to chapter ${f.currentChapter}`);
      if (f.words) bits.push(`${Number(f.words).toLocaleString()} words`);
      const q = daysSince(f.lastUpdate);
      if (q != null) bits.push(q === 0 ? "updated today" : `last update ${gyAgo(q)} ago`);
      return bits.join(" \u00B7 ");
    };
    let lastFic = null;
    const ficCard = (f, kind) => {
      lastFic = f;
      const qs = quotesOf(f);
      const line = { t: ficLine(f, kind), n: ficDetail(f) };
      speak(line, ({ btn, add }) => {
        if (qs.length) {
          const q = pick(qs);
          add(quoteBlock(q.quote, q.chapter ? `${titleOf(f)}, ${q.chapter}` : titleOf(f)));
          add(el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;margin-top:8px;color:#f6e8d6;", `\u201C${pick(QUOTE_REACT)}\u201D`));
          if (qs.length > 1) btn("Another line", () => ficCard(f, kind));
        } else {
          add(el("div", "font-size:11.5px;margin-top:8px;color:rgba(243,230,211,0.6);", "No saved lines from this one yet."));
        }
        btn("Another fic", () => ficPick(kind));
        btn("Back", () => ficMenu());
      });
    };
    const ficPick = kind => {
      const L = ficList()[kind];
      if (!L.length) { ficMenu(); return; }
      let f = pick(L);
      for (let k = 0; k < 5 && L.length > 1 && f === lastFic; k++) f = pick(L);
      ficCard(f, kind);
    };
    const randomLine = () => {
      const L = ficList().quotes;
      if (!L.length) { ficMenu(); return; }
      const q = pick(L);
      speak({ t: pick(["Here\u2019s one you kept.", "You saved this one. Good eye.", "Found this in your pile."]) }, ({ btn, add }) => {
        add(quoteBlock(q.quote, [q.title, q.chapter].filter(Boolean).join(", ")));
        add(el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;margin-top:8px;color:#f6e8d6;", `\u201C${pick(QUOTE_REACT)}\u201D`));
        if (L.length > 1) btn("Another line", () => randomLine());
        btn("Back", () => ficMenu());
      });
    };
    const ficMenu = () => {
      const L = ficList();
      if (!L.dead.length && !L.alive.length && !L.done.length) {
        speak({ t: "Your shelf\u2019s empty, love. Add a fic to the tracker and come back, and we\u2019ll have a proper natter." }, ({ btn }) => { btn("Back", () => room()); });
        return;
      }
      speak({ t: pick(["Right, which one are we gossiping about?", "Fics, is it? My favourite subject. Pick a shelf.", "Go on. Dead, alive or finished: I\u2019ve opinions on all three."]) }, ({ btn }) => {
        if (L.dead.length) btn(`\u{1FAA6} A dead one (${L.dead.length})`, () => ficPick("dead"));
        if (L.alive.length) btn(`\u{1F331} Still going (${L.alive.length})`, () => ficPick("alive"));
        if (L.done.length) btn(`\u2728 A finished one (${L.done.length})`, () => ficPick("done"));
        if (L.quotes.length) btn("\u275D A line you saved", () => randomLine());
        btn("Back", () => room());
      });
    };

    // ═════════ 🃏 tarot: pick one of three face-down cards; one card a day ═════════
    const DECK = [
      ["The Fool", "\u{1F0CF}", "A fresh start. Step off the edge with a snack and a plan-ish.", "Leaping without looking. Look first. Briefly."],
      ["The Magician", "\u2728", "You\u2019ve got everything you need on the table. You only have to use it.", "Scattered tools. Pick one and finish it."],
      ["The High Priestess", "\u{1F319}", "Trust the quiet knowing. You already sense the answer.", "You\u2019re ignoring your gut. It\u2019s been waving at you."],
      ["The Empress", "\u{1F33F}", "Comfort, creativity, being looked after. Including by yourself.", "Pouring from an empty pot. Refill first."],
      ["The Emperor", "\u{1F3F0}", "Structure and boundaries. Decide, and stick to it.", "Too rigid, or too bossed about. Loosen your grip, or take it back."],
      ["The Hierophant", "\u{1F4DC}", "Tradition, mentors, learning from those who\u2019ve walked it.", "Rules that don\u2019t fit you. Permission to colour outside them."],
      ["The Lovers", "\u{1F49E}", "A meaningful choice, and staying true to what you value.", "What you say and what you want don\u2019t match. Be honest with yourself."],
      ["The Chariot", "\u{1F6E1}\uFE0F", "Momentum. Hold the reins and keep going.", "Pulled two ways. Pick a direction, then steer."],
      ["Strength", "\u{1F981}", "Quiet courage. Gentle isn\u2019t weak.", "Self-doubt. You\u2019re stronger than your inner critic admits."],
      ["The Hermit", "\u{1F3EE}", "Time alone to find your own light. Pairs well with a good book.", "Isolation creeping in. Open a window. Text someone."],
      ["Wheel of Fortune", "\u{1F3A1}", "A turn in luck. Things move; they always do.", "A rough patch. Wheels keep turning. It won\u2019t stay down."],
      ["Justice", "\u2696\uFE0F", "Fairness, honesty, weighing it properly.", "Unfairness, or being unfair to yourself. Check the scales."],
      ["The Hanged Man", "\u{1F643}", "A pause. A new angle. Nothing wrong with waiting.", "Stalling. Decide or let go; hanging about isn\u2019t free."],
      ["Death", "\u{1F312}", "An ending that makes room. Not the literal one. I\u2019d tell you.", "Clinging to what\u2019s over. Let it go gently."],
      ["Temperance", "\u{1FAD6}", "Balance, patience, a bit of everything. Tea, in short.", "Overdoing it. Ease off a notch."],
      ["The Devil", "\u26D3\uFE0F", "A habit or worry has hold of you. The chain\u2019s looser than it looks.", "Breaking free. Keep going."],
      ["The Tower", "\u26A1", "A sudden shake-up. Rough, then clearing.", "Putting off the inevitable. Repair what\u2019s worth keeping."],
      ["The Star", "\u2B50", "Hope and healing. Things are getting better.", "Faith running low. Look up anyway; the stars haven\u2019t gone."],
      ["The Moon", "\u{1F315}", "Not clear yet. Trust your feet, not your fears.", "Fog lifting. The scary shape was a coat on a hook."],
      ["The Sun", "\u2600\uFE0F", "Joy, warmth, things going right. Enjoy it without suspicion.", "Cloud cover, not night. It\u2019s still up there."],
      ["Judgement", "\u{1F4EF}", "A call to rise to something. Forgive your old self.", "Doubt and dodging the call. Listen anyway."],
      ["The World", "\u{1F30D}", "Completion. You\u2019ve come further than you realise.", "Almost there. Finish the last bit."]
    ];
    const spread = () => DECK.map((c, i) => ({ i, k: rnd("tarot" + dayKey + i) })).sort((a, b) => a.k - b.k).slice(0, 3)
      .map(o => ({ i: o.i, rev: rnd("rev" + dayKey + o.i) < 0.28 }));
    const cardFace = (c, rev, big) => {
      const w = el("div", `display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:${big ? 112 : 70}px;height:${big ? 158 : 100}px;border-radius:10px;border:2px solid #d9b26a;background:linear-gradient(160deg,#2a1b3a,#47264f);box-shadow:0 4px 14px rgba(0,0,0,0.5);animation:cotFlip .45s ease-out;`);
      w.className = "cot-anim";
      const sym = el("div", `font-size:${big ? 44 : 28}px;line-height:1;${rev ? "transform:rotate(180deg);" : ""}`, c[1]);
      w.appendChild(sym);
      w.appendChild(el("div", `font-family:Georgia,'Times New Roman',serif;font-size:${big ? 12 : 9.5}px;color:#ffe2b0;text-align:center;padding:0 4px;line-height:1.2;`, c[0]));
      return w;
    };
    const reveal = idx => {
      const sp = spread(), s = sp[idx], c = DECK[s.i];
      const first = !(st.tarot && st.tarot.d === dayKey);
      if (first) { st.tarot = { d: dayKey, pick: idx }; st.readings = (st.readings || 0) + 1; save(); }
      const tail = pick(["Don\u2019t take it as gospel. I only read the cards, I don\u2019t write them.", "For entertainment, love. Mostly.", "If it\u2019s rubbish, blame the cat. She shuffled.", "Whatever it says, you\u2019ve handled harder.", "You\u2019re going to be alright. That\u2019s not the cards, that\u2019s me."]);
      speak({ t: `${c[0]}${s.rev ? ", reversed" : ""}. ${s.rev ? c[3] : c[2]} ${tail}`, n: first ? "That\u2019s your card for today." : "Same card as before. They don\u2019t like being nagged." }, ({ btn, add }) => {
        const wrap = el("div", "margin-top:10px;");
        wrap.appendChild(cardFace(c, s.rev, true));
        add(wrap);
        btn("Thanks, Bram", () => room());
      });
    };
    const tarotStart = () => {
      if (st.tarot && st.tarot.d === dayKey && spread()[st.tarot.pick]) { reveal(st.tarot.pick); return; }
      speak({ t: pick(["Three cards. Pick the one that looks at you funny.", "Go on, then. Don\u2019t overthink it. The cards can tell.", "I don\u2019t believe in it. Mostly. The cards believe in you."]), n: "One card a day. Tap one." }, ({ btn, add }) => {
        const rowC = el("div", "display:flex;justify-content:center;gap:12px;margin-top:12px;");
        [0, 1, 2].forEach(i => {
          const b = el("button", "cursor:pointer;width:70px;height:100px;border-radius:10px;border:2px solid #d9b26a;background:repeating-linear-gradient(45deg,#2a1b3a,#2a1b3a 6px,#38214a 6px,#38214a 12px);color:#ffe2b0;font-size:22px;box-shadow:0 4px 14px rgba(0,0,0,0.5);", "\u2726");
          b.type = "button";
          b.onclick = () => reveal(i);
          rowC.appendChild(b);
        });
        add(rowC);
        btn("Back", () => room());
      });
    };

    document.body.appendChild(back);
    teaMenu(true);                                      // he opens by offering you a cup
  }

  // ── 🪦 GRAVEYARD GROUNDS ──
  // An expansion of the fic graveyard: a walkable night-time cemetery map. A winding cobbled path
  // runs from the iron gate down past five plots (Long Lives, Almost There, Gone Too Soon,
  // Old Growth, the Quiet Meadow), each with its own landmark, to a wishing well. Every abandoned
  // fic keeps its grave; graves with a lit candle flicker, and flowers show on top. Tap a grave
  // for its epitaph and a way into the full graveyard. "stroll" wanders down the path on its own.
  // Extras (all optional, all local): a day/dusk/dawn switch, weather (rain, fog, snow), seasonal
  // dressing (Halloween pumpkins and bats, winter snow caps, autumn leaves, spring petals, summer
  // fireflies), crows on the gate, a visitors' book with your graveyard stats, a groundskeeper who
  // walks the path with a lantern, a cat who sits on graves, a drifting ghost, a koi pond with a frog,
  // ten will-o-wisps that come back every day (2 am Prague), wishing-well streaks, grave search and a random visit.
  // Tap a grave to lay flowers (with an optional note) or light a candle; it saves exactly like the full
  // graveyard does. The extras' own little preferences (time of day, weather, wishes, this
  // day's wisps) live in one local key, ao3-gg-prefs; the wisps and Bram (hats, lanterns, flowers, story) are split into ao3_gg_sync_v1, which cloud sync carries between devices.
  // ── 🪦 GRAVEYARD GROUNDS ──
  // An expansion of the fic graveyard: a walkable night-time cemetery map. A winding cobbled path
  // runs from the iron gate down past five plots (Long Lives, Almost There, Gone Too Soon,
  // Old Growth, the Quiet Meadow), each with its own landmark, to a wishing well. Every abandoned
  // fic keeps its grave; graves with a lit candle flicker, and flowers show on top. Tap a grave
  // for its epitaph and a way into the full graveyard. "stroll" wanders down the path on its own.
  // Extras (all optional, all local): a day/dusk/dawn switch, weather (rain, fog, snow), seasonal
  // dressing (Halloween pumpkins and bats, winter snow caps, autumn leaves, spring petals, summer
  // fireflies), crows on the gate, a visitors' book with your graveyard stats, a groundskeeper who
  // walks the path with a lantern, a cat who sits on graves, a drifting ghost, a koi pond with a frog,
  // ten will-o-wisps that come back every day (2 am Prague), wishing-well streaks, grave search and a random visit.
  // Tap a grave to lay flowers (with an optional note) or light a candle; it saves exactly like the full
  // graveyard does. The extras' own little preferences (time of day, weather, wishes, this
  // day's wisps) live in one local key, ao3-gg-prefs; the wisps and Bram (hats, lanterns, flowers, story) are split into ao3_gg_sync_v1, which cloud sync carries between devices.
  function openGraveyardGrounds() {
    const old = document.getElementById("ao3-grounds");
    if (old) old.remove();
    if (!document.getElementById("ao3-gg-css")) {
      const st = document.createElement("style");
      st.id = "ao3-gg-css";
      st.textContent = `
        @keyframes ggFlicker{0%,100%{opacity:.75;transform:scale(1)}30%{opacity:1;transform:scale(1.15)}60%{opacity:.6;transform:scale(.9)}}
        @keyframes ggFirefly{0%,100%{opacity:.1;transform:translate(0,0)}25%{opacity:1;transform:translate(8px,-7px)}50%{opacity:.3;transform:translate(-5px,-14px)}75%{opacity:1;transform:translate(7px,-5px)}}
        @keyframes ggRipple{0%{opacity:.9;transform:scale(.3)}100%{opacity:0;transform:scale(2.6)}}
        @keyframes ggSway{0%,100%{transform:rotate(-1.6deg)}50%{transform:rotate(1.6deg)}}
        @keyframes ggMist{0%,100%{opacity:.18;transform:translateX(-14px)}50%{opacity:.34;transform:translateX(14px)}}
        @keyframes ggRain{from{transform:translateY(-30px)}to{transform:translateY(60px)}}
        @keyframes ggFall{0%{transform:translate(0,-20px)}50%{transform:translate(12px,30px)}100%{transform:translate(-6px,80px)}}
        @keyframes ggBat{0%{transform:translateX(-40px)}100%{transform:translateX(410px)}}
        @keyframes ggFlap{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.3)}}
        @keyframes ggHeart{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-24px)}}
        @keyframes ggDrift{0%{transform:translateX(-60px)}100%{transform:translateX(420px)}}
        @keyframes ggBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes ggFly{to{transform:translate(70px,-130px);opacity:0}}
        @keyframes ggHop{0%,100%{transform:translateY(0)}40%{transform:translateY(-10px)}}
        @keyframes ggPulse{0%,100%{opacity:.1}50%{opacity:.9}}
        @keyframes ggSteam{0%{opacity:0;transform:translateY(2px)}35%{opacity:.8}100%{opacity:0;transform:translateY(-7px)}}
        @keyframes ggSmoke{0%{opacity:.55;transform:translate(0,0) scale(.6)}100%{opacity:0;transform:translate(7px,-24px) scale(1.7)}}
        @keyframes ggWisp{0%,100%{opacity:.3;transform:translate(0,0)}50%{opacity:.9;transform:translate(4px,-6px)}}
        @keyframes ggSpark{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(var(--dx),var(--dy))}}
        @keyframes ggFlash{0%,92%,100%{opacity:0}93%{opacity:.3}94%{opacity:0}95.5%{opacity:.22}97%{opacity:0}}
        @media (prefers-reduced-motion: reduce){.gg-anim{animation:none !important}}
      `;
      (document.head || document.documentElement).appendChild(st);
    }
    const el = (tag, css, text) => {
      const e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (text != null) e.textContent = text;
      return e;
    };
    const NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs, parent) => {
      const e = document.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
      if (parent) parent.appendChild(e);
      return e;
    };
    const anim = (node, css) => { node.setAttribute("class", "gg-anim"); node.style.cssText += css; return node; };
    const rnd = seed => { const x = Math.sin(gyHash(String(seed)) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const titleOf = f => f.title || `Work ${f.workId}`;
    const bornOf = f => ((f.chapterDates || []).slice().sort()[0]) || (f.trackedAt ? String(f.trackedAt).slice(0, 10) : null);
    const yearOf = d => (d ? String(d).slice(0, 4) : "?");
    const yearsOf = f => { const b = yearOf(bornOf(f)), d = yearOf(f.lastUpdate); return b === d ? b : `${b} \u2013 ${d}`; };

    // ── sort every abandoned fic into a plot ──
    const SECTIONS = [
      { key: "long",    name: "Long Lives",       sub: "100k+ words" },
      { key: "close",   name: "Almost There",     sub: "nearly finished" },
      { key: "soon",    name: "Gone Too Soon",    sub: "3 chapters or fewer" },
      { key: "old",     name: "Old Growth",       sub: "silent 2+ years" },
      { key: "meadow",  name: "The Quiet Meadow", sub: "everyone else" }
    ];
    const plotOf = f => {
      const total = f.totalChapters || 1;
      const planned = parseInt(((f.chaptersLabel || "").split("/")[1]) || "", 10);
      const quiet = daysSince(f.lastUpdate) || 0;
      if (f.words >= 100000) return "long";
      if (planned && total / planned >= 0.8) return "close";
      if (total <= 3) return "soon";
      if (quiet >= 730) return "old";
      return "meadow";
    };
    const graves = abandonedFics().map(f => ({ f, plot: plotOf(f), quiet: daysSince(f.lastUpdate) || 0 }));
    SECTIONS.forEach(s => { s.graves = graves.filter(g => g.plot === s.key); });
    const live = SECTIONS.filter(s => s.graves.length);

    // ── shell ──
    const back = el("div", "position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000002;");
    back.id = "ao3-grounds";
    const box = el("div", "position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:8px;right:8px;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;font-family:inherit;color:#e6dcf5;background:linear-gradient(180deg,#0c0a1c 0%,#1a1330 45%,#231a38 100%);box-shadow:0 10px 40px rgba(0,0,0,0.6);");
    back.appendChild(box);
    const topbar = el("div", "flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(190,170,255,0.18);background:rgba(8,6,22,0.55);z-index:3;");
    const ttl = el("div", "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;");
    ttl.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:15px;letter-spacing:0.05em;line-height:1.2;text-transform:uppercase;color:#d9d0f5;white-space:normal;overflow-wrap:anywhere;", "\u{1FAA6} Graveyard Grounds"));
    const sub = el("div", "font-size:10px;letter-spacing:0.04em;color:rgba(217,208,245,0.6);", "");
    ttl.appendChild(sub);
    topbar.appendChild(ttl);
    const strollBtn = el("button", "flex:0 0 auto;border:1px solid rgba(190,170,255,0.35);background:rgba(255,255,255,0.07);color:#e6dcf5;border-radius:999px;padding:5px 12px;font:600 12px/1 inherit;font-family:inherit;cursor:pointer;", "\u{1F56F}\uFE0F stroll");
    const xBtn = el("button", "background:none;border:none;color:rgba(217,208,245,0.7);cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px;", "\u2715");
    // stroll with a small button under it that hides or shows the whole buttons bar
    const sideCol = el("div", "flex:0 0 auto;display:flex;flex-direction:column;align-items:stretch;gap:5px;");
    const sceneBtn = el("button", "border:1px solid rgba(190,170,255,0.25);background:rgba(255,255,255,0.04);color:rgba(230,220,245,0.85);border-radius:999px;padding:4px 10px;font:500 11px/1 inherit;font-family:inherit;cursor:pointer;white-space:nowrap;", "");
    sceneBtn.type = "button";
    sideCol.appendChild(strollBtn); sideCol.appendChild(sceneBtn);
    topbar.appendChild(sideCol); topbar.appendChild(xBtn);
    box.appendChild(topbar);

    const field = el("div", "position:relative;flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;");
    box.appendChild(field);
    const card = el("div", "flex:0 0 auto;max-height:55%;overflow-y:auto;-webkit-overflow-scrolling:touch;display:none;padding:12px 14px;border-top:1px solid rgba(190,170,255,0.25);background:rgba(18,12,34,0.96);text-align:center;");
    box.appendChild(card);
    const caption = el("div", "flex:0 0 auto;padding:9px 14px;text-align:center;border-top:1px solid rgba(190,170,255,0.15);font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:12.5px;color:rgba(230,220,245,0.85);", graves.length ? "tap a grave to lay flowers or light a candle \u00B7 tap the well at the end of the path \u00B7 \u2715 returns to the graveyard" : "");
    box.appendChild(caption);

    let strolling = false, raf = 0, stopToll = () => {};
    const stopStroll = () => { strolling = false; cancelAnimationFrame(raf); strollBtn.textContent = "\u{1F56F}\uFE0F stroll"; };
    const onKey = e => { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); const ask = document.getElementById("ao3-gate-ask"); if (ask) ask.remove(); else close(); } };
    const close = () => { stopStroll(); stopToll(); back.remove(); document.removeEventListener("keydown", onKey, true); };
    xBtn.onclick = close;
    back.addEventListener("click", e => { if (e.target === back) close(); });
    document.addEventListener("keydown", onKey, true);

    if (!graves.length) {
      const empty = el("div", "text-align:center;padding:70px 24px;");
      empty.appendChild(el("div", "font-size:34px;", "\u{1F54A}\uFE0F"));
      empty.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-size:15px;margin-top:8px;", "The grounds are empty."));
      empty.appendChild(el("div", "font-size:12px;opacity:0.65;margin-top:4px;", "No abandoned fics, so no graves. The gate stays quietly closed."));
      field.appendChild(empty);
      document.body.appendChild(back);
      return;
    }

    // ── layout ──
    const W = 360, GATE = 130, HEAD = 104, ROW = 58, PER_ROW = 8, TAIL = 300;
    let y = GATE;
    live.forEach(s => { s.y = y; s.rows = Math.ceil(s.graves.length / PER_ROW); y += HEAD + s.rows * ROW + 30; });
    const H = y + TAIL;
    const pathX = yy => 180 + 12 * Math.sin(yy / 90) + 5 * Math.sin(yy / 37 + 1);

    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMin meet" });
    svg.style.cssText = "width:100%;height:auto;display:block;";
    const defs = sv("defs", {}, svg);
    const glow = sv("radialGradient", { id: "gg-glow" }, defs);
    sv("stop", { offset: "0%", "stop-color": "#ffd98a", "stop-opacity": "0.75" }, glow);
    sv("stop", { offset: "100%", "stop-color": "#ffd98a", "stop-opacity": "0" }, glow);

    // sky stuff near the gate: stars + moon (the moon becomes a low sun at dusk and dawn)
    const starG = sv("g", {}, svg);
    for (let i = 0; i < 40; i++) sv("circle", { cx: (rnd("sx" + i) * W).toFixed(1), cy: (rnd("sy" + i) * 200).toFixed(1), r: (0.5 + rnd("sr" + i) * 0.9).toFixed(2), fill: "#fff", opacity: (0.25 + rnd("so" + i) * 0.5).toFixed(2) }, starG);
    const moonG = sv("g", {}, svg);
    const moonDisc = sv("circle", { cx: 300, cy: 46, r: 17, fill: "#efe6bd" }, moonG);
    sv("circle", { cx: 300, cy: 46, r: 32, fill: "url(#gg-glow)", opacity: 0.35 }, moonG);

    // the cobbled path
    let d = `M${pathX(0).toFixed(1)} 0`;
    for (let yy = 10; yy <= H; yy += 10) d += ` L${pathX(yy).toFixed(1)} ${yy}`;
    sv("path", { d, fill: "none", stroke: "#2b2233", "stroke-width": 54, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0.45 }, svg);
    sv("path", { d, fill: "none", stroke: "#473b3d", "stroke-width": 38, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0.9 }, svg);
    const STONES = ["#6d6070", "#7a6d7d", "#5f5463", "#857886", "#6a5f5a"];
    for (let yy = 4; yy < H; yy += 9) {
      for (let k = 0; k < 3; k++) {
        const sd = "st" + yy + "_" + k;
        sv("ellipse", { cx: (pathX(yy) + (rnd(sd) - 0.5) * 32).toFixed(1), cy: (yy + rnd(sd + "y") * 8).toFixed(1),
          rx: (2.6 + rnd(sd + "w") * 3.2).toFixed(1), ry: (1.8 + rnd(sd + "h") * 2).toFixed(1),
          fill: STONES[Math.floor(rnd(sd + "c") * STONES.length)], opacity: (0.55 + rnd(sd + "o") * 0.4).toFixed(2) }, svg);
      }
    }
    for (let yy = 12; yy < H; yy += 26) {      // little grass tufts hugging the path
      [-1, 1].forEach(sd => {
        const gx = pathX(yy) + sd * (26 + rnd("g" + yy + sd) * 10);
        sv("path", { d: `M${gx} ${yy} l-2 -6 M${gx} ${yy} l0 -8 M${gx} ${yy} l2 -6`, stroke: "#46705a", "stroke-width": 1.4, fill: "none", "stroke-linecap": "round", opacity: 0.8 }, svg);
      });
    }

    // iron gate
    const gate = sv("g", {}, svg);
    sv("rect", { x: 52, y: 40, width: 14, height: 90, fill: "#2c2438" }, gate);
    sv("rect", { x: 294, y: 40, width: 14, height: 90, fill: "#2c2438" }, gate);
    sv("rect", { x: 48, y: 34, width: 22, height: 8, fill: "#3a3047" }, gate);
    sv("rect", { x: 290, y: 34, width: 22, height: 8, fill: "#3a3047" }, gate);
    sv("path", { d: "M66 70 Q180 6 294 70", fill: "none", stroke: "#4a3e58", "stroke-width": 5 }, gate);
    for (let i = 0; i < 8; i++) { const gx = 78 + i * 29; sv("line", { x1: gx, y1: 78 - 22 * Math.sin((i + 0.5) / 8 * Math.PI) * 0.2, x2: gx, y2: 30 + Math.abs(i - 3.5) * 8, stroke: "#3a3047", "stroke-width": 2 }, gate); }
    const gt = sv("text", { x: 180, y: 38, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 9, "letter-spacing": 3, fill: "#cbbfe0", opacity: 0.8 }, gate); gt.textContent = "REST HERE";
    // Tap the gate: "leave the grounds?" Yes walks down into Hollowbrook village (web app only; the grounds close behind you).
    sv("rect", { x: 48, y: 30, width: 264, height: 104, fill: "transparent" }, gate);
    gate.style.cursor = "pointer";
    gate.setAttribute("role", "button"); gate.setAttribute("aria-label", "The gate. Leave the grounds for Hollowbrook village");
    gate.addEventListener("click", () => {
      if (document.getElementById("ao3-gate-ask")) return;
      stopStroll();
      const ask = el("div", "position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(6,4,16,0.62);");
      ask.id = "ao3-gate-ask";
      ask.addEventListener("click", ev => { if (ev.target === ask) ask.remove(); });
      const dlg = el("div", "width:100%;max-width:300px;box-sizing:border-box;border-radius:18px;padding:20px 18px 16px;background:rgba(24,17,44,0.98);border:1px solid rgba(190,170,255,0.35);box-shadow:0 12px 36px rgba(0,0,0,0.6);color:#e6dcf5;text-align:center;");
      dlg.appendChild(el("div", "font-size:26px;", "\u{1F6AA}"));
      dlg.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:16px;margin-top:6px;", "Leave the grounds?"));
      dlg.appendChild(el("div", "font-size:12.5px;line-height:1.45;opacity:0.75;margin:6px 0 14px;", "The gate opens onto the road down to Hollowbrook village."));
      const row = el("div", "display:flex;gap:8px;justify-content:center;");
      const stay = el("button", "flex:1 1 0;border:1px solid rgba(190,170,255,0.35);background:rgba(255,255,255,0.06);color:#e6dcf5;border-radius:999px;padding:9px 12px;font:600 13px/1 inherit;font-family:inherit;cursor:pointer;", "Stay");
      const go = el("button", "flex:1 1 0;border:1px solid rgba(255,217,138,0.6);background:rgba(255,217,138,0.18);color:#ffe9b0;border-radius:999px;padding:9px 12px;font:600 13px/1 inherit;font-family:inherit;cursor:pointer;", "Leave");
      stay.type = "button"; go.type = "button";
      stay.onclick = () => ask.remove();
      go.onclick = () => { ask.remove(); close(); openHollowbrook(); };
      row.appendChild(stay); row.appendChild(go); dlg.appendChild(row);
      ask.appendChild(dlg); box.appendChild(ask);
      go.focus();
    });

    // lamp posts along the path, glowing
    const lamp = (lx, ly, seed) => {
      const g = sv("g", {}, svg);
      sv("circle", { cx: lx, cy: ly - 26, r: 22, fill: "url(#gg-glow)" }, g);
      sv("rect", { x: lx - 1.5, y: ly - 24, width: 3, height: 26, fill: "#2c2438" }, g);
      sv("rect", { x: lx - 4, y: ly - 32, width: 8, height: 9, rx: 2, fill: "#ffd98a" }, g);
      anim(g, `animation:ggFlicker ${(2.2 + rnd("l" + seed) * 1.6).toFixed(1)}s ease-in-out infinite;transform-origin:${lx}px ${ly - 28}px;`);
    };
    for (let ly = GATE + 70, i = 0; ly < H - TAIL + 40; ly += 230, i++) lamp(pathX(ly) + (i % 2 ? -32 : 32), ly, i);

    // ── extras: preferences, seasons and little scenes ──
    const PKEY = "ao3-gg-prefs", SKEY = "ao3_gg_sync_v1";
    // wisps (found, spent, carried, cat/ghost gifts, keeper count) and everything about Bram (hats, lanterns, flowers,
    // story) go in SKEY, which the cloud sync picks up because it starts with ao3_. Time of day, weather etc. stay on this device.
    const SYNCED = ["wm", "wi", "wg", "wc", "wf", "keeper", "bt", "hw"];
    let prefs = {};
    try { prefs = JSON.parse(localStorage.getItem(PKEY) || "{}") || {}; } catch { prefs = {}; }
    try { const sp = JSON.parse(localStorage.getItem(SKEY) || "null"); if (sp && typeof sp === "object") SYNCED.forEach(k => { if (k in sp) prefs[k] = sp[k]; }); } catch {}
    const savePrefs = () => {
      try {
        const loc = {}, syn = {};
        Object.keys(prefs).forEach(k => { (SYNCED.includes(k) ? syn : loc)[k] = prefs[k]; });
        localStorage.setItem(PKEY, JSON.stringify(loc));
        localStorage.setItem(SKEY, JSON.stringify(syn));
      } catch {}
    };
    const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let sayAt = 0;
    const say = t => { caption.textContent = t; sayAt = Date.now(); };
    // Far off, the bell tower tolls the hour (see scenes/belltower.js). Quiet and muffled here. Browsers keep sound
    // switched off until the first tap, so the first tap anywhere in the grounds wakes the audio up.
    back.addEventListener("pointerdown", () => { bellUnlock(); }, { passive: true });
    stopToll = startHourToll(h24 => {
      const n = h24 % 12 || 12;
      for (let i = 0; i < n; i++) bellStrike(BELL_HOUR, { delay: i * 2.6, vol: 0.07, distant: true });
      say(`Far off, the bell tower tolls ${BELL_WORDS[n]}.`);
    });
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const now = new Date(), month = now.getMonth();
    // Halloween dressing is automatic in October, and the \u{1F383} button in the top bar turns it on or off any time of year.
    // prefs.hw only holds an override (true / false); with none, October decides.
    const autoHw = month === 9;
    const hwOn = prefs.hw === true ? true : prefs.hw === false ? false : autoHw;
    const season = hwOn ? "halloween" : (month === 11 || month <= 1) ? "winter" : month <= 4 ? "spring" : month <= 7 ? "summer" : "autumn";
    const SEASON_TAG = { halloween: "\u{1F383} spooky season", winter: "\u2744\uFE0F winter", spring: "\u{1F338} spring", summer: "\u2600\uFE0F summer", autumn: "\u{1F342} autumn" };
    const bcss = "cursor:pointer;font:inherit;font-size:12px;font-weight:600;border-radius:8px;padding:6px 12px;border:1px solid rgba(190,170,255,0.35);background:rgba(255,255,255,0.07);color:#e6dcf5;";
    const sparkle = (x, y, n) => {
      const g = sv("g", {}, svg);
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2, dist = 18 + Math.random() * 18;
        const c = sv("circle", { cx: x, cy: y, r: 1.8, fill: "#ffe27a" }, g);
        anim(c, `--dx:${(Math.cos(ang) * dist).toFixed(1)}px;--dy:${(Math.sin(ang) * dist).toFixed(1)}px;animation:ggSpark 1s ease-out forwards;`);
      }
      setTimeout(() => g.remove(), 1100);
    };

    const rise = (txt, x, y) => {      // a little emoji that floats up from a grave
      const h = sv("text", { x, y, "text-anchor": "middle", "font-size": 14 }, svg);
      h.textContent = txt;
      anim(h, "animation:ggHeart 1.1s ease-out forwards;");
      setTimeout(() => h.remove(), 1150);
    };

    // a little jack-o'-lantern
    const pumpkin = (parent, px, py, s, seed) => {
      const g = sv("g", { transform: `translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(${s})` }, parent);
      const lit = sv("g", {}, g);
      sv("circle", { cx: 0, cy: -6, r: 15, fill: "url(#gg-glow)", opacity: 0.6 }, lit);
      sv("ellipse", { cx: 0, cy: 2, rx: 10, ry: 2.5, fill: "#000", opacity: 0.35 }, g);
      sv("ellipse", { cx: -5, cy: -6, rx: 6, ry: 7.5, fill: "#d9731f" }, g);
      sv("ellipse", { cx: 5, cy: -6, rx: 6, ry: 7.5, fill: "#d9731f" }, g);
      sv("ellipse", { cx: 0, cy: -6, rx: 5, ry: 8, fill: "#ee8a2c" }, g);
      sv("rect", { x: -1, y: -16, width: 2.4, height: 4, rx: 1, fill: "#4f6b3a" }, g);
      sv("path", { d: "M-5 -9 L-2 -9 L-3.5 -6 Z M2 -9 L5 -9 L3.5 -6 Z M-4 -2 L-2 -3.5 L0 -2 L2 -3.5 L4 -2 L2 -1 L0 -2.5 L-2 -1 Z", fill: "#ffe27a" }, g);
      anim(lit, `animation:ggFlicker ${(1.8 + rnd("pk" + seed) * 1.4).toFixed(1)}s ease-in-out infinite;`);
      return g;
    };
    if (season === "halloween") {
      for (let py = GATE + 105, i = 0; py < H - TAIL; py += 150, i++) pumpkin(svg, pathX(py) + (i % 2 ? 34 : -34), py, 1, "p" + i);
      for (let i = 0; i < 4; i++) {          // bats crossing the sky
        const wrap = sv("g", { transform: `translate(0 ${(24 + rnd("bt" + i) * 110).toFixed(0)})` }, svg);
        const fly = sv("g", {}, wrap);
        const wing = sv("path", { d: "M-8 0 Q-4 -6 0 -1 Q4 -6 8 0 Q4 -2 0 3 Q-4 -2 -8 0 Z", fill: "#0d0916" }, fly);
        anim(wing, "animation:ggFlap .35s ease-in-out infinite;transform-origin:0px 0px;");
        anim(fly, `animation:ggBat ${(16 + rnd("bd" + i) * 10).toFixed(1)}s linear -${(rnd("bs" + i) * 14).toFixed(1)}s infinite;`);
        if (reduce) fly.setAttribute("transform", `translate(${60 + i * 80} 0)`);
      }
    }

    // two crows on the gate: tap one and it flaps off, then comes back
    [[134, 43], [226, 43]].forEach(([cx, cy], i) => {
      const wrap = sv("g", { transform: `translate(${cx} ${cy})` }, svg);
      const bird = sv("g", {}, wrap);
      const dir = i ? -1 : 1;
      sv("ellipse", { cx: 0, cy: -3.5, rx: 6, ry: 3.6, fill: "#0e0b16" }, bird);
      sv("circle", { cx: 5.5 * dir, cy: -7, r: 2.7, fill: "#0e0b16" }, bird);
      sv("path", { d: `M${8 * dir} -7 L${11 * dir} -6 L${8 * dir} -5.5 Z`, fill: "#3a3047" }, bird);
      sv("path", { d: `M${-5 * dir} -3 L${-11 * dir} 0 L${-4 * dir} -1 Z`, fill: "#0e0b16" }, bird);
      sv("circle", { cx: 6.3 * dir, cy: -7.6, r: 0.6, fill: "#ffe27a" }, bird);
      const hit = sv("circle", { cx: 0, cy: -5, r: 11, fill: "transparent" }, wrap);
      hit.style.cursor = "pointer";
      let away = false;
      hit.addEventListener("click", () => {
        if (away) return;
        away = true;
        say(pick(["Caw!", "Caw. Caw. (Translation: update your tracker.)", "The crow glares at you, then leaves in a dramatic flap."]));
        anim(bird, "animation:ggFly 1.1s ease-in forwards;");
        setTimeout(() => { bird.style.animation = "none"; away = false; }, 9000);
      });
    });

    // the visitors' book on its lectern by the gate
    const showBook = () => {
      if (picked) { picked.setAttribute("opacity", 0); picked = null; }
      const wordsAll = graves.reduce((a, g) => a + (g.f.words || 0), 0);
      const quietest = graves.slice().sort((a, b) => b.quiet - a.quiet)[0];
      const biggest = graves.slice().sort((a, b) => (b.f.words || 0) - (a.f.words || 0))[0];
      const crowded = live.slice().sort((a, b) => b.graves.length - a.graves.length)[0];
      let flowers = 0, candles = 0;
      graves.forEach(g => { const r = gyRec(g.f.workId); flowers += gyTotal(r); if (r.lit && r.lit > Date.now()) candles++; });
      card.textContent = "";
      card.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:14px;color:#f1e8ff;", "\u{1F4D6} The Visitors\u2019 Book"));
      [
        `${wordsAll.toLocaleString()} words laid to rest across ${graves.length} grave${graves.length === 1 ? "" : "s"}`,
        `Longest silence: \u201C${titleOf(quietest.f)}\u201D, quiet for ${gyAgo(quietest.quiet)}`,
        biggest.f.words ? `Biggest stone: \u201C${titleOf(biggest.f)}\u201D, ${biggest.f.words.toLocaleString()} words` : "",
        `Busiest plot: ${crowded.name} (${crowded.graves.length})`,
        `${flowers} flower${flowers === 1 ? "" : "s"} left \u00B7 ${candles} candle${candles === 1 ? "" : "s"} burning`,
        `${prefs.wishes || 0} wish${(prefs.wishes || 0) === 1 ? "" : "es"} made at the well` + (prefs.keeper ? ` \u00B7 wisp-keeper \u00D7${prefs.keeper}` : "")
      ].filter(Boolean).forEach(t => card.appendChild(el("div", "font-size:12px;line-height:1.5;color:#e6dcf5;margin-top:4px;", t)));
      const row = el("div", "display:flex;justify-content:center;margin-top:10px;");
      const done = el("button", bcss, "Close"); done.type = "button";
      done.onclick = () => { card.style.display = "none"; };
      row.appendChild(done); card.appendChild(row);
      card.style.display = "block"; card.scrollTop = 0;
    };
    {
      const lx = pathX(112) + 40, ly = 114;
      const lect = sv("g", {}, svg);
      sv("ellipse", { cx: lx, cy: ly + 2, rx: 11, ry: 2.5, fill: "#000", opacity: 0.35 }, lect);
      sv("rect", { x: lx - 2, y: ly - 14, width: 4, height: 16, fill: "#4a3a30" }, lect);
      sv("path", { d: `M${lx - 11} ${ly - 14} L${lx + 11} ${ly - 14} L${lx + 8} ${ly - 22} L${lx - 8} ${ly - 22} Z`, fill: "#6a5039" }, lect);
      sv("path", { d: `M${lx - 7} ${ly - 20.5} L${lx} ${ly - 19} L${lx + 7} ${ly - 20.5} L${lx + 7} ${ly - 16} L${lx} ${ly - 14.8} L${lx - 7} ${ly - 16} Z`, fill: "#f1e8d0" }, lect);
      const lt = sv("text", { x: lx, y: ly + 12, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 7, "font-style": "italic", fill: "#cbbfe0", opacity: 0.75 }, lect);
      lt.textContent = "visitors\u2019 book";
      const hit = sv("rect", { x: lx - 16, y: ly - 28, width: 32, height: 46, fill: "transparent" }, lect);
      hit.style.cursor = "pointer";
      hit.addEventListener("click", showBook);
    }

    // landmark art, one per plot
    const landmark = (key, cx, cy) => {
      const g = sv("g", {}, svg);
      if (key === "long") {            // mausoleum
        sv("rect", { x: cx - 30, y: cy - 28, width: 60, height: 34, fill: "#6f6a80" }, g);
        sv("path", { d: `M${cx - 36} ${cy - 28} L${cx} ${cy - 50} L${cx + 36} ${cy - 28} Z`, fill: "#58536b" }, g);
        [-22, -8, 8, 22].forEach(o => sv("rect", { x: cx + o - 2.5, y: cy - 26, width: 5, height: 30, fill: "#8a8499" }, g));
        sv("rect", { x: cx - 7, y: cy - 16, width: 14, height: 22, rx: 7, fill: "#14101f" }, g);
      } else if (key === "close") {    // stone cross + halo
        sv("ellipse", { cx, cy: cy - 30, rx: 22, ry: 22, fill: "url(#gg-glow)", opacity: 0.55 }, g);
        sv("rect", { x: cx - 18, y: cy - 2, width: 36, height: 8, fill: "#6f6a80" }, g);
        sv("rect", { x: cx - 4, y: cy - 40, width: 8, height: 40, fill: "#8a8499" }, g);
        sv("rect", { x: cx - 15, y: cy - 31, width: 30, height: 7, fill: "#8a8499" }, g);
      } else if (key === "soon") {     // sapling with sparkles
        sv("path", { d: `M${cx} ${cy + 4} Q${cx - 2} ${cy - 14} ${cx + 3} ${cy - 30}`, stroke: "#6aa56e", "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, g);
        sv("ellipse", { cx: cx - 8, cy: cy - 22, rx: 9, ry: 4, fill: "#7fc083", transform: `rotate(-30 ${cx - 8} ${cy - 22})` }, g);
        sv("ellipse", { cx: cx + 11, cy: cy - 32, rx: 9, ry: 4, fill: "#7fc083", transform: `rotate(28 ${cx + 11} ${cy - 32})` }, g);
        sv("ellipse", { cx, cy: cy + 5, rx: 16, ry: 4, fill: "#4a3a30" }, g);
        [[-18, -34], [20, -16], [-14, -10]].forEach(([dx, dy], i) => { const c = sv("circle", { cx: cx + dx, cy: cy + dy, r: 1.6, fill: "#f6e27a" }, g); anim(c, `animation:ggFirefly ${3 + i}s ease-in-out infinite;`); });
      } else if (key === "old") {      // willow
        sv("rect", { x: cx - 5, y: cy - 30, width: 10, height: 36, fill: "#4a3a30" }, g);
        sv("ellipse", { cx, cy: cy - 40, rx: 30, ry: 16, fill: "#3f6a55" }, g);
        for (let i = 0; i < 9; i++) { const sx = cx - 26 + i * 6.5; sv("path", { d: `M${sx} ${cy - 38} Q${sx + (i % 2 ? 4 : -4)} ${cy - 18} ${sx + (i % 2 ? 2 : -2)} ${cy + 2}`, stroke: "#4f8068", "stroke-width": 1.6, fill: "none", opacity: 0.85 }, g); }
        anim(g, `animation:ggSway 6s ease-in-out infinite;transform-origin:${cx}px ${cy}px;`);
      } else {                          // bench + lamp
        sv("rect", { x: cx - 22, y: cy - 10, width: 44, height: 5, rx: 2, fill: "#5a4535" }, g);
        sv("rect", { x: cx - 20, y: cy - 5, width: 4, height: 11, fill: "#3d2f25" }, g);
        sv("rect", { x: cx + 16, y: cy - 5, width: 4, height: 11, fill: "#3d2f25" }, g);
        sv("rect", { x: cx - 22, y: cy - 22, width: 44, height: 4, rx: 2, fill: "#5a4535" }, g);
      }
    };
    const sign = (s, sx, sy) => {
      const g = sv("g", {}, svg);
      sv("rect", { x: sx + 48, y: sy + 8, width: 4, height: 50, fill: "#4a3a30" }, g);
      sv("rect", { x: sx, y: sy, width: 100, height: 36, rx: 4, fill: "#6a5039", stroke: "#3d2f25", "stroke-width": 1.5 }, g);
      const t1 = sv("text", { x: sx + 50, y: sy + 15, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 10, "font-weight": 700, fill: "#f1dfc0" }, g); t1.textContent = s.name;
      const t2 = sv("text", { x: sx + 50, y: sy + 28, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 8, "font-style": "italic", fill: "#d9c3a0" }, g); t2.textContent = `${s.graves.length} grave${s.graves.length === 1 ? "" : "s"} \u00B7 ${s.sub}`;
      t2.setAttribute("font-size", 7);
    };

    // ── tapping a grave ──
    let picked = null;
    const showCard = (g, mark) => {
      if (picked) picked.setAttribute("opacity", 0);
      if (picked === mark) { picked = null; card.style.display = "none"; return; }
      picked = mark; mark.setAttribute("opacity", 0.35);
      if (keeperGoTo) { const kn = graveNodes.find(x => x.g === g); if (kn) keeperGoTo(kn); }   // Bram walks over
      const f = g.f, rec = gyRec(f.workId), total = gyTotal(rec);
      const lit = rec.lit && rec.lit > Date.now();
      card.textContent = "";
      card.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:14px;color:#f1e8ff;", titleOf(f)));
      card.appendChild(el("div", "font-size:10.5px;letter-spacing:0.05em;color:rgba(217,208,245,0.6);margin-top:2px;", `${yearsOf(f)} \u00B7 quiet for ${gyAgo(g.quiet)}`));
      card.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;margin:8px 0 4px;color:#e6dcf5;", `\u201C${rec.ep || gyEpitaph(f)}\u201D`));
      const bits = [];
      if (total) bits.push(`${total} flower${total === 1 ? "" : "s"} left`);
      if (lit) bits.push(`candle lit \u00B7 ${gyLeft(rec.lit - Date.now())} left`);
      if (bits.length) card.appendChild(el("div", "font-size:10.5px;color:rgba(217,208,245,0.7);", bits.join(" \u00B7 ")));
      // ── tend the grave: lay a flower (with an optional note) or light a candle ──
      // Saved with the graveyard's own functions, so it shows up in the full graveyard too.
      const node = graveNodes.find(x => x.g === g);
      const redo = () => { picked = null; showCard(g, mark); };
      const lastNote = rec.notes[rec.notes.length - 1];
      if (lastNote) card.appendChild(el("div", "font-size:11px;font-style:italic;color:rgba(217,208,245,0.6);margin-top:4px;", `${lastNote.e} \u201C${lastNote.t}\u201D`));
      const noteIn = el("input", "width:100%;box-sizing:border-box;margin-top:10px;padding:8px 10px;border-radius:8px;border:1px solid rgba(190,170,255,0.3);background:rgba(255,255,255,0.07);color:#e6dcf5;font-family:inherit;font-size:16px;outline:none;text-align:center;");
      noteIn.type = "text"; noteIn.maxLength = 100; noteIn.placeholder = "Leave a few words with your flower (optional)";
      card.appendChild(noteIn);
      const fr = el("div", "display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin-top:8px;");
      GY_FLOWERS.forEach(t => {
        const b = el("button", "cursor:pointer;font-size:20px;line-height:1;padding:6px 8px;border-radius:10px;border:1px solid rgba(190,170,255,0.3);background:rgba(255,255,255,0.06);", t.e);
        b.type = "button"; b.title = `Lay a ${t.n.toLowerCase()}`;
        b.onclick = () => {
          gyAddFlower(f.workId, t.e, noteIn.value);
          try { if (navigator.vibrate) navigator.vibrate(10); } catch {}
          if (node) { node.paintDyn(); rise(t.e, node.gx + 14, node.gy + 6); }
          redo();
        };
        fr.appendChild(b);
      });
      card.appendChild(fr);
      const cb = el("button", "cursor:pointer;font:inherit;font-family:inherit;font-size:12.5px;font-weight:600;width:100%;margin-top:8px;border-radius:8px;padding:8px 10px;border:1px solid rgba(255,190,100,0.4);background:rgba(255,190,100,0.08);color:#ffe2b3;");
      cb.type = "button";
      cb.textContent = lit ? `\u{1F56F}\uFE0F Candle lit \u00B7 burns out in ${gyLeft(rec.lit - Date.now())} \u00B7 tap to relight` : "\u{1F56F}\uFE0F Light a candle (burns 3 days)";
      if (lit) cb.style.boxShadow = "0 0 14px rgba(255,180,80,0.35)";
      cb.onclick = () => {
        gyLight(f.workId);
        try { if (navigator.vibrate) navigator.vibrate(12); } catch {}
        if (node) { node.paintDyn(); sparkle(node.gx + 33, node.gy + 28, 6); }
        redo();
      };
      card.appendChild(cb);
      const row = el("div", "display:flex;justify-content:center;gap:8px;margin-top:10px;");
      const bcss = "cursor:pointer;font:inherit;font-size:12px;font-weight:600;border-radius:8px;padding:6px 12px;border:1px solid rgba(190,170,255,0.35);background:rgba(255,255,255,0.07);color:#e6dcf5;";
      const open = el("button", bcss, "Back to the graveyard"); open.type = "button";
      open.onclick = () => close();
      const done = el("button", bcss, "Close"); done.type = "button";
      done.onclick = () => { picked.setAttribute("opacity", 0); picked = null; card.style.display = "none"; };
      row.appendChild(open); row.appendChild(done);
      card.appendChild(row);
      card.style.display = "block"; card.scrollTop = 0;
    };

    const graveNodes = [];
    // ── plots ──
    live.forEach((s, si) => {
      const left = si % 2 === 0;
      landmark(s.key, left ? 262 : 98, s.y + 78);
      sign(s, left ? 14 : 246, s.y + 14);
      s.graves.forEach((g, i) => {
        const side = i % 2, col = Math.floor(i / 2) % 4, row = Math.floor(i / PER_ROW);
        const gx = side === 0 ? 14 + col * 34 : 318 - col * 34;
        const gy = s.y + HEAD + row * ROW + (rnd("j" + g.f.workId) * 8);
        const grp = sv("g", { transform: `translate(${gx.toFixed(1)} ${gy.toFixed(1)})` }, svg);
        const moss = g.quiet >= 730;
        const tones = moss ? ["#7d8f86", "#74887e"] : ["#8c8a9a", "#9a97a8", "#7f7d90"];
        sv("ellipse", { cx: 14, cy: 37, rx: 17, ry: 4, fill: "#000", opacity: 0.35 }, grp);
        const tilt = (rnd("t" + g.f.workId) - 0.5) * 8;
        const stone = sv("g", { transform: `rotate(${tilt.toFixed(1)} 14 36)` }, grp);
        sv("path", { d: "M0 36 V14 A14 14 0 0 1 28 14 V36 Z", fill: tones[gyHash(g.f.workId) % tones.length] }, stone);
        sv("path", { d: "M14 12 v14 M9 17 h10", stroke: "rgba(0,0,0,0.35)", "stroke-width": 2, "stroke-linecap": "round", fill: "none" }, stone);
        if (moss) sv("ellipse", { cx: 8, cy: 35, rx: 9, ry: 3, fill: "#4f7a5a", opacity: 0.8 }, stone);
        if (season === "winter") sv("path", { d: "M2.2 7 A14 14 0 0 1 25.8 7 Q21 5.5 17.5 8.5 Q14 5 10.5 8.5 Q6 5.5 2.2 7 Z", fill: "#f4f7ff", opacity: 0.92 }, stone);
        if (season === "halloween" && gyHash(g.f.workId) % 5 === 0) pumpkin(grp, 2, 40, 0.55, "g" + g.f.workId);
        const dyn = sv("g", {}, grp);       // flowers + candle: repainted live when you tend the grave
        const paintDyn = () => {
          dyn.textContent = "";
          const rec = gyRec(g.f.workId);
          const kinds = Object.keys(rec.c).filter(k => rec.c[k] > 0).sort((a, b) => rec.c[b] - rec.c[a]).slice(0, 3);
          const xs = kinds.length === 1 ? [14] : kinds.length === 2 ? [8, 20] : [3, 14, 25];
          kinds.forEach((k, ki) => {
            const ft = sv("text", { x: xs[ki], y: 46, "text-anchor": "middle", "font-size": kinds.length > 1 ? 9 : 11 }, dyn);
            ft.textContent = k;
          });
          if (rec.lit && rec.lit > Date.now()) {
            const cg = sv("g", {}, dyn);
            sv("circle", { cx: 33, cy: 32, r: 11, fill: "url(#gg-glow)" }, cg);
            sv("rect", { x: 31.5, y: 31, width: 3, height: 6, fill: "#f3ead2" }, cg);
            sv("ellipse", { cx: 33, cy: 29.5, rx: 1.8, ry: 3, fill: "#ffcf5a" }, cg);
            anim(cg, `animation:ggFlicker ${(1.6 + rnd("c" + g.f.workId)).toFixed(1)}s ease-in-out infinite;transform-origin:33px 32px;`);
          }
        };
        paintDyn();
        const mark = sv("rect", { x: -3, y: -4, width: 34, height: 44, rx: 8, fill: "#fff", opacity: 0 }, grp);
        mark.style.pointerEvents = "none";
        const hit = sv("rect", { x: -3, y: -4, width: 34, height: 52, fill: "transparent" }, grp);
        hit.style.cursor = "pointer";
        const tl = sv("title", {}, hit); tl.textContent = titleOf(g.f);
        hit.addEventListener("click", () => showCard(g, mark));
        graveNodes.push({ g, gx, gy, mark, paintDyn, dyn });
      });
    });

    // ── the wishing well at the end of the path ──
    const wy = H - TAIL + 70, wx = pathX(wy) + 52;
    const well = sv("g", {}, svg);
    sv("ellipse", { cx: wx, cy: wy + 28, rx: 30, ry: 6, fill: "#000", opacity: 0.35 }, well);
    sv("rect", { x: wx - 24, y: wy, width: 48, height: 28, fill: "#6f6a80" }, well);
    sv("ellipse", { cx: wx, cy: wy, rx: 24, ry: 7, fill: "#2d3a63" }, well);
    sv("ellipse", { cx: wx, cy: wy, rx: 24, ry: 7, fill: "none", stroke: "#8a8499", "stroke-width": 3 }, well);
    sv("rect", { x: wx - 22, y: wy - 34, width: 4, height: 34, fill: "#4a3a30" }, well);
    sv("rect", { x: wx + 18, y: wy - 34, width: 4, height: 34, fill: "#4a3a30" }, well);
    sv("path", { d: `M${wx - 30} ${wy - 32} L${wx} ${wy - 50} L${wx + 30} ${wy - 32} Z`, fill: "#58493c" }, well);
    const wt = sv("text", { x: wx, y: wy + 52, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 8, "font-style": "italic", fill: "#cbbfe0", opacity: 0.75 }, svg); wt.textContent = "the wishing well";
    const WHISPERS = [
      "A coin sinks. Somewhere, an author opens a blank document.",
      "You wished for an update. The well is considering it.",
      "The water whispers: \u201Cone more chapter.\u201D",
      "Something splashes. It sounds a lot like hope.",
      "The well is deep, but the wishes are deeper.",
      "A faint chime. Somewhere, a notification you will never get.",
      "The ripples spell out \u201Cplease don\u2019t be abandoned.\u201D",
      "Nothing happens. But you feel slightly more optimistic.",
      "A distant voice: \u201CI\u2019ll finish it this weekend.\u201D The well does not believe it."
    ];
    let wi = Math.floor(Math.random() * WHISPERS.length);
    let wishes = prefs.wishes || 0;
    const wellHit = sv("rect", { x: wx - 34, y: wy - 52, width: 68, height: 84, fill: "transparent" }, well);
    wellHit.style.cursor = "pointer";
    wellHit.addEventListener("click", () => {
      wi = (wi + 1 + Math.floor(Math.random() * (WHISPERS.length - 1))) % WHISPERS.length;
      wishes++; prefs.wishes = wishes; savePrefs();
      if (wishes % 7 === 0) { caption.textContent = `The well glows gold for a heartbeat. Somewhere, a fic gets a new chapter. (${wishes} wishes)`; sparkle(wx, wy, 12); }
      else caption.textContent = WHISPERS[wi];
      const rp = sv("ellipse", { cx: wx, cy: wy, rx: 20, ry: 5, fill: "none", stroke: "#9fb4ff", "stroke-width": 1.5 }, well);
      rp.setAttribute("class", "gg-anim"); rp.style.cssText = `transform-origin:${wx}px ${wy}px;animation:ggRipple 1.3s ease-out forwards;`;
      setTimeout(() => rp.remove(), 1400);
    });
    // a bench near the well, fireflies and drifting mist over the lower grounds
    sv("rect", { x: 34, y: wy + 10, width: 40, height: 4, rx: 2, fill: "#5a4535" }, svg);
    sv("rect", { x: 37, y: wy + 14, width: 3, height: 10, fill: "#3d2f25" }, svg);
    sv("rect", { x: 68, y: wy + 14, width: 3, height: 10, fill: "#3d2f25" }, svg);
    for (let i = 0; i < (season === "summer" ? 44 : 22); i++) {
      const c = sv("circle", { cx: (rnd("ffx" + i) * W).toFixed(1), cy: (GATE + 40 + rnd("ffy" + i) * (H - GATE - 80)).toFixed(1), r: 1.5, fill: "#f6e27a" }, svg);
      anim(c, `animation:ggFirefly ${(3 + rnd("ffd" + i) * 4).toFixed(1)}s ${(rnd("ffs" + i) * 3).toFixed(1)}s ease-in-out infinite;`);
    }
    for (let i = 0; i < 3; i++) {
      const m = sv("ellipse", { cx: 90 + i * 90, cy: H - 60 - i * 70, rx: 130, ry: 16, fill: "#c8bee6" }, svg);
      anim(m, `animation:ggMist ${(9 + i * 3)}s ease-in-out infinite;opacity:.2;`);
    }
    // ── extras, part 2: wisps, ghost, cat, groundskeeper, pond, weather, time of day, finder ──
    const WISPS = 10;                                   // wisps to collect per day
    const WISP_KEEP = 3;                                // unspent wisps that carry over to the next day
    const ym = `${now.getFullYear()}-${now.getMonth() + 1}`;   // (still seeds the ghost)
    const pragueDay = at => {                           // Prague date as YYYY-MM-DD, with 00:00-01:59 still counted as the day before
      const p = {};
      new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Prague", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(at || new Date()).forEach(x => { if (x.type !== "literal") p[x.type] = Number(x.value); });
      let d = new Date(Date.UTC(p.year, p.month - 1, p.day));
      if (p.hour * 60 + p.minute < 120) d = new Date(d.getTime() - 864e5);
      return d.toISOString().slice(0, 10);
    };
    const dayKey = pragueDay();                         // rolls over at 2 am Prague
    if (prefs.wm !== dayKey) {                          // new day: wisps are back, Bram is back to normal
      const spare = Math.max(0, (Array.isArray(prefs.wi) ? prefs.wi.length : 0) + (prefs.wc || 0) - (prefs.wg || 0));
      prefs.wm = dayKey; prefs.wi = []; prefs.wg = 0; prefs.wc = Math.min(WISP_KEEP, spare);
      if (prefs.bt) {
        const b = prefs.bt;
        if (b.total == null) b.total = b.tips || 0;     // older saves: tips was the lifetime count
        b.tips = 0; b.lan = "gold"; b.hat = "dflt"; b.fl = [];
      }
      savePrefs();
    }
    const wispFound = () => (Array.isArray(prefs.wi) ? prefs.wi : []);
    const updateSub = () => {
      const bits = [`${graves.length} grave${graves.length === 1 ? "" : "s"}`, `${live.length} plot${live.length === 1 ? "" : "s"}`, SEASON_TAG[season], `\u2726 ${wispFound().length}/${WISPS} wisps${prefs.wc ? ` +${prefs.wc} kept` : ""}`];
      if (prefs.keeper) bits.push(`keeper \u00D7${prefs.keeper}`);
      sub.textContent = bits.join(" \u00B7 ");
    };

    // will-o-wisps: ten faint lights hidden in the grounds, new places every day
    // (wispLoose keeps the ones still out there, so Bram can fetch one for you)
    const wispLoose = {};
    // today's hiding places: same all day, new tomorrow, kept apart so none sit on top of another
    const wispPos = [];
    for (let i = 0; i < WISPS; i++) {
      let p = null;
      for (let t = 0; t < 12; t++) {
        p = { x: 26 + rnd("wx" + dayKey + i + "_" + t) * 308, y: GATE + 90 + rnd("wy" + dayKey + i + "_" + t) * Math.max(80, H - GATE - TAIL - 120) };
        if (wispPos.every(q => Math.hypot(q.x - p.x, q.y - p.y) > 34)) break;
      }
      wispPos.push(p);
    }
    for (let i = 0; i < WISPS; i++) {
      if (wispFound().includes(i)) continue;
      const wx0 = wispPos[i].x, wy0 = wispPos[i].y;
      const wg = sv("g", { transform: `translate(${wx0.toFixed(1)} ${wy0.toFixed(1)})` }, svg);
      const wf = sv("g", {}, wg);
      sv("circle", { cx: 0, cy: 0, r: 11, fill: "#9fd4ff", opacity: 0.22 }, wf);
      sv("circle", { cx: 0, cy: 0, r: 4, fill: "#cfe9ff", opacity: 0.8 }, wf);
      sv("circle", { cx: 0, cy: 0, r: 1.8, fill: "#fff" }, wf);
      anim(wf, `animation:ggWisp ${(3.5 + rnd("wd" + i) * 3).toFixed(1)}s ease-in-out infinite;`);
      const hit = sv("circle", { cx: 0, cy: 0, r: 15, fill: "transparent" }, wg);
      hit.style.cursor = "pointer";
      // bram = true when he coaxed it in himself (he says his own line); returns how many are caught today
      const collect = bram => {
        if (!wispLoose[i]) return 0;
        delete wispLoose[i];
        wg.remove();
        prefs.wi = wispFound().concat(i);
        const n = prefs.wi.length;
        if (n >= WISPS) { prefs.keeper = (prefs.keeper || 0) + 1; if (!bram) { say("The last wisp slips into your lantern. The whole place hums. You are a wisp-keeper."); sparkle(wx0, wy0, 14); } }
        else if (!bram) { say(`A wisp drifts into your lantern. ${n} of ${WISPS} today.`); sparkle(wx0, wy0, 6); }
        savePrefs(); updateSub();
        return n;
      };
      wispLoose[i] = { i, x: wx0, y: wy0, wg, collect };
      hit.addEventListener("click", () => collect(false));
    }

    // ── unspent wisps: Bram's jar, a gift for the cat or the ghost (one each per day), or up to WISP_KEEP carry over to tomorrow ──
    const wispAvail = () => Math.max(0, wispFound().length + (prefs.wc || 0) - (prefs.wg || 0));
    const wfToday = () => {
      const f = (prefs.wf && typeof prefs.wf === "object") ? prefs.wf : (prefs.wf = {});
      if (f.d !== dayKey) { f.d = dayKey; f.cat = 0; f.ghost = 0; }     // today's gifts; catAll / ghostAll keep the running count
      return f;
    };
    const ctl = {};                                     // the cat and ghost fill these in so a gift can light them up
    const CAT_LINES = [
      "The cat laps at the glow as if it were milk, then purrs loud enough to shake the stone.",
      "She noses the wisp, sneezes, and decides it is hers now.",
      "A small blue light curls up beside her. She keeps one eye on it all night.",
      "The cat head-butts your hand. Once. That is a great honour.",
      "She sits in the wisp-light and, for a moment, looks like a lantern herself."
    ];
    const GHOST_TALES = [
      "Thank you. I haven\u2019t been warm since the last chapter. It was chapter six.",
      "I was a slow burn. Six chapters of almost. I never got my kiss.",
      "My author wrote me at night, mostly. You can tell. Everyone in me is tired and brave.",
      "There was a reader who left a comment on every chapter. Every one. \u2018Please update.\u2019 I think about her.",
      "Do you know what\u2019s worse than an ending that hurts? One that never comes.",
      "The last thing written was a line of dialogue, stopped halfway. I\u2019ve been finishing it in my head for years.",
      "I never found out the ending. But I know how it felt to be read. That counts for something.",
      "Keep going. Whatever you\u2019re reading. Finish it for me."
    ];
    const wispCard = (head, text, note, build) => {
      if (picked) { picked.setAttribute("opacity", 0); picked = null; }
      card.textContent = "";
      card.appendChild(el("div", "font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(159,212,255,0.9);", head));
      card.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13.5px;line-height:1.45;margin:8px 0 2px;color:#e6dcf5;", text));
      if (note) card.appendChild(el("div", "font-size:11.5px;line-height:1.4;margin-top:5px;color:rgba(159,212,255,0.9);", note));
      const row = el("div", "display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin-top:10px;");
      build((label, fn) => { const b = el("button", bcss, label); b.type = "button"; b.onclick = fn; row.appendChild(b); });
      card.appendChild(row);
      card.style.display = "block"; card.scrollTop = 0;
    };
    const giveWisp = who => {
      const f = wfToday();
      if (wispAvail() < 1 || f[who]) return;
      prefs.wg = (prefs.wg || 0) + 1; f[who] = 1; f[who + "All"] = (f[who + "All"] || 0) + 1;
      const n = f[who + "All"];
      savePrefs(); updateSub();
      try { if (navigator.vibrate) navigator.vibrate(12); } catch {}
      if (who === "cat") {
        const p = ctl.catPos ? ctl.catPos() : null;
        if (p) sparkle(p.x, p.y - 8, 8);
        if (ctl.catGlow) ctl.catGlow();
        card.style.display = "none";
        say(CAT_LINES[(n - 1) % CAT_LINES.length]);
      } else {
        if (ctl.ghostGlow) ctl.ghostGlow();
        const tale = GHOST_TALES[n - 1];
        wispCard("\u{1F47B} The ghost",
          tale ? `\u201C${tale}\u201D` : "The ghost says nothing. It glows a little brighter, and that is enough.",
          tale ? `(${n} of ${GHOST_TALES.length})` : "",
          btn => btn("Close", () => { card.style.display = "none"; }));
      }
    };
    const offerWisp = who => {                          // false when there is nothing to offer, so the cat and ghost act as usual
      const f = wfToday();
      if (wispAvail() < 1 || f[who]) return false;
      const a = wispAvail();
      wispCard(who === "cat" ? "\u{1F408} The cat" : "\u{1F47B} The ghost",
        who === "cat" ? "She sniffs at your lantern, ears forward." : "It drifts closer, hollow eyes on the glow in your lantern.",
        `${a} wisp${a === 1 ? "" : "s"} to spare \u00B7 one gift each per day`,
        btn => { btn("Give 1 \u2726", () => giveWisp(who)); btn("Not now", () => { card.style.display = "none"; }); });
      return true;
    };

    // a ghost that drifts across the grounds
    {
      const gy0 = GATE + 150 + rnd("ghost" + ym) * Math.max(60, H - GATE - TAIL - 300);
      const wrap = sv("g", { transform: `translate(0 ${gy0.toFixed(0)})` }, svg);
      wrap.style.transition = "opacity .6s";
      const drift = sv("g", { transform: "translate(180 0)" }, wrap);
      const bob = sv("g", {}, drift);
      sv("circle", { cx: 0, cy: -4, r: 20, fill: "#cfe0ff", opacity: 0.12 }, bob);
      const gbody = sv("path", { d: "M-9 8 V-2 A9 9 0 0 1 9 -2 V8 L6 5 L3 8 L0 5 L-3 8 L-6 5 Z", fill: "#f1f4ff", opacity: 0.55 }, bob);
      ctl.ghostGlow = () => gbody.setAttribute("opacity", wfToday().ghost ? 0.95 : 0.55);   // brighter for the rest of the day after a gift
      ctl.ghostGlow();
      sv("circle", { cx: -3, cy: -3, r: 1.3, fill: "#1b1530" }, bob);
      sv("circle", { cx: 3, cy: -3, r: 1.3, fill: "#1b1530" }, bob);
      sv("ellipse", { cx: 0, cy: 1.5, rx: 1.5, ry: 2, fill: "#1b1530" }, bob);
      anim(bob, "animation:ggBob 2.8s ease-in-out infinite;");
      anim(drift, `animation:ggDrift ${40 + Math.round(rnd("gd") * 20)}s linear -${Math.round(rnd("gs" + ym) * 30)}s infinite alternate;`);
      const hit = sv("circle", { cx: 0, cy: -2, r: 18, fill: "transparent" }, drift);
      hit.style.cursor = "pointer";
      let gone = false;
      hit.addEventListener("click", () => {
        if (gone) return;
        if (offerWisp("ghost")) { say("The ghost drifts closer, eyeing your lantern."); return; }   // it lingers while there is a gift to give
        gone = true;
        say(pick([
          "Boo. (Affectionately.)",
          "\u201CI was a six-chapter slow burn. Tell no one.\u201D",
          "\u201CHave you seen my author? Last seen 2019.\u201D",
          "\u201CI\u2019m not haunting you. I\u2019m waiting for an update.\u201D",
          "\u201CWhooo reads at 3am? Oh. You do.\u201D",
          "\u201CPlease. Just one more chapter.\u201D"
        ]));
        wrap.style.opacity = "0";
        setTimeout(() => { wrap.style.opacity = "1"; gone = false; }, 9000);
      });
    }

    // hooks that Bram's block fills in (declared here so the cat, the weather and the graves can reach them)
    let keeperGoTo = null, keeperOnWeather = null, catCtl = null;

    // a cat who sits on graves; pet her and she eventually wanders off to another one.
    // catCtl lets Bram chase her: while he does, she runs loose over the grounds (see Bram's block below).
    if (graveNodes.length) {
      let at = Math.floor(Math.random() * graveNodes.length), pets = 0, cx = 0, cy = 0;
      const spot = n => ({ x: n.gx + 14, y: n.gy + 1 });
      const catG = sv("g", {}, svg);
      catG.style.transition = "transform .9s ease-in-out";
      const place = () => { const p = spot(graveNodes[at]); cx = p.x; cy = p.y; catG.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`; };
      place();
      const wglow = sv("circle", { cx: 0, cy: -8, r: 17, fill: "#9fd4ff", opacity: 0 }, catG);     // lit up for the day after a wisp gift
      const tail = sv("path", { d: "M5 -2 Q13 -3 11 -11", stroke: "#0b0910", "stroke-width": 2.2, fill: "none", "stroke-linecap": "round" }, catG);
      anim(tail, "animation:ggSway 2.4s ease-in-out infinite;transform-origin:5px -2px;");
      sv("ellipse", { cx: 0, cy: -6, rx: 6, ry: 6, fill: "#0b0910" }, catG);
      sv("circle", { cx: 0, cy: -15, r: 4.6, fill: "#0b0910" }, catG);
      sv("path", { d: "M-4 -17 L-3.5 -22 L-0.8 -18.5 Z M4 -17 L3.5 -22 L0.8 -18.5 Z", fill: "#0b0910" }, catG);
      sv("circle", { cx: -1.8, cy: -15.5, r: 0.9, fill: "#ffe27a" }, catG);
      sv("circle", { cx: 1.8, cy: -15.5, r: 0.9, fill: "#ffe27a" }, catG);
      const hit = sv("circle", { cx: 0, cy: -12, r: 10, fill: "transparent" }, catG);
      hit.style.cursor = "pointer";
      catCtl = {
        busy: false,
        at: () => at,
        run: (x, y) => { cx = x; cy = y; catG.style.transition = "none"; catG.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; },
        sit: i => { if (i != null) at = i; catG.style.transition = "transform .9s ease-in-out"; place(); }
      };
      ctl.catPos = () => ({ x: cx, y: cy });
      ctl.catGlow = () => wglow.setAttribute("opacity", wfToday().cat ? 0.26 : 0);
      ctl.catGlow();
      hit.addEventListener("click", e => {
        e.stopPropagation();
        pets++;
        offerWisp("cat");
        const h = sv("text", { x: cx, y: cy - 24, "text-anchor": "middle", "font-size": 10, fill: "#ff9fb8" }, svg);
        h.textContent = "\u2665";
        anim(h, "animation:ggHeart 1s ease-out forwards;");
        setTimeout(() => h.remove(), 1050);
        if (pets % 4 === 0 && !catCtl.busy) {
          say("The cat hops down and trots off to another grave.");
          setTimeout(() => { if (catCtl.busy) return; at = (at + 1 + Math.floor(Math.random() * Math.max(1, graveNodes.length - 1))) % graveNodes.length; place(); }, 500);
        } else say(pick(["Mrrp.", `Purrrr. (${pets} pet${pets === 1 ? "" : "s"})`, "The cat narrows her eyes happily.", "She allows it."]));
      });
    }

    // ── Bram, the groundskeeper ──
    // Walks the path with a lantern (driven by script, so he can stop for a chat). Tap him and he
    // talks about YOUR graveyard: quiet fics, flowers, candles, wisps, anniversaries, the weather.
    // A glowing "!" over his hat means he has news (an anniversary today, or candles about to go out).
    // He also goes about his day: he stops to sweep a stone, straighten a flower, or sit on the bench
    // with a thermos; he chases the cat when she knocks something over; he walks over to any grave you
    // tap; and when it rains he goes into his cottage by the gate (lit window) until it clears.
    // You can also send him on errands (fetch a wisp, lead you to a quiet grave), give him a flower for his hat,
    // drop today's wisps in his tip jar for lantern colours and hats (different each day, back to normal at 2 am), and slowly learn who he used to be.
    {
      const OFF = 24, yMin = GATE + 20, benchY = wy + 34;
      const CX = 335, CB = 132, DOORY = 137;      // cottage centre, base line, and where Bram stands at its door
      let mode = "patrol";                        // patrol | walk | act | chase | home | enter | inside | exit

      // ── the cottage just outside the gate: dark until Bram is home, then the window lights up ──
      const cot = sv("g", {}, svg);
      sv("ellipse", { cx: CX, cy: CB + 1, rx: 25, ry: 3.5, fill: "#000", opacity: 0.35 }, cot);
      sv("rect", { x: 344, y: 92, width: 6, height: 15, fill: "#35283f" }, cot);
      sv("rect", { x: 315, y: 108, width: 40, height: 24, fill: "#4a3a4f" }, cot);
      sv("path", { d: "M311 110.5 L335 89 L359 110.5 Z", fill: "#3b2a46" }, cot);
      sv("path", { d: "M311 110.5 L335 89 L359 110.5", fill: "none", stroke: "#5d4a6d", "stroke-width": 1.2, "stroke-linejoin": "round" }, cot);
      [[318, 8], [345, 7]].forEach(([wx2, ww]) => {
        sv("rect", { x: wx2, y: 114, width: ww, height: 8, rx: 0.8, fill: "#241f3a" }, cot);
        sv("rect", { x: wx2, y: 114, width: ww, height: 8, rx: 0.8, fill: "none", stroke: "#6f5f7d", "stroke-width": 0.9 }, cot);
      });
      sv("rect", { x: 329, y: 118, width: 11, height: 14, rx: 1.5, fill: "#2a2033" }, cot);
      sv("circle", { cx: 338, cy: 125.5, r: 0.8, fill: "#d9c3a0" }, cot);
      const litG = sv("g", {}, svg);              // glow + warm windows, faded in while he is home
      litG.style.transition = "opacity .6s"; litG.style.opacity = "0";
      sv("circle", { cx: 331, cy: 118, r: 26, fill: "url(#gg-glow)", opacity: 0.55 }, litG);
      [[318, 8], [345, 7]].forEach(([wx2, ww], i) => {
        const wl = sv("rect", { x: wx2, y: 114, width: ww, height: 8, rx: 0.8, fill: "#ffd98a" }, litG);
        if (i === 0) anim(wl, "animation:ggFlicker 3.4s ease-in-out infinite;transform-origin:322px 118px;");
      });
      sv("path", { d: "M322 114 V122 M318 118 H326 M348.5 114 V122", stroke: "#6b4f35", "stroke-width": 0.7, fill: "none" }, litG);
      sv("circle", { cx: 322, cy: 117.6, r: 1.7, fill: "#3d2a1e" }, litG);       // Bram's silhouette in the window
      sv("path", { d: "M318.8 122 Q322 117.8 325.2 122 Z", fill: "#3d2a1e" }, litG);
      const doorG = sv("g", {}, svg);             // the door standing open, light spilling out
      doorG.style.transition = "opacity .25s"; doorG.style.opacity = "0";
      sv("path", { d: "M329 132 L340 132 L348 143 L321 143 Z", fill: "#ffd98a", opacity: 0.28 }, doorG);
      sv("rect", { x: 329, y: 118, width: 11, height: 14, rx: 1.5, fill: "#ffd98a", opacity: 0.92 }, doorG);
      const smokeG = sv("g", {}, svg);
      smokeG.style.transition = "opacity .6s"; smokeG.style.opacity = "0";
      for (let i = 0; i < 3; i++) {
        const sm = sv("circle", { cx: 347, cy: 90, r: 2.2, fill: "#cfc6e0" }, smokeG);
        anim(sm, `animation:ggSmoke 3.3s ease-out ${(i * 1.1).toFixed(1)}s infinite;transform-box:fill-box;transform-origin:center;`);
      }
      const ct = sv("text", { x: CX, y: 146, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 7.5, "font-style": "italic", fill: "#cbbfe0", opacity: 0.75 }, svg);
      ct.textContent = "the cottage";
      const setLit = on => { litG.style.opacity = on ? "1" : "0"; smokeG.style.opacity = on ? "1" : "0"; };
      const setDoor = on => { doorG.style.opacity = on ? "1" : "0"; };
      const cotHit = sv("rect", { x: 311, y: 88, width: 48, height: 46, fill: "transparent" }, svg);
      cotHit.style.cursor = "pointer";
      const RAIN_LINES = [
        "Not coming out in this. Kettle\u2019s on.",
        "Listen to that rain on the roof. Best sound there is.",
        "Nothing out there needs sweeping tonight. The rain\u2019s doing it for me.",
        "Window\u2019s lit. If you spot a wisp, wave. I\u2019ll wave back."
      ];
      cotHit.addEventListener("click", () => {
        if (mode === "inside") talk(solved() ? { t: pick(RAIN_LINES), n: "A pen scratches somewhere behind him." } : { t: pick(RAIN_LINES) });
        else bramCard({ t: pick(["The door\u2019s on the latch. Come in if you like.", "Kettle\u2019s on. Come in, come in.", "A tidy little cottage. The roof only leaks in one corner."]) }, ({ btn }) => { btn("\u{1F6AA} Step inside", () => { closeCard(); openBramCottage(); }); btn("Close", closeCard); });
      });

      // ── the figure: facing flips with the walk, items swap with the job ──
      const keeper = sv("g", {}, svg);
      keeper.style.transition = "opacity .35s";
      const flipG = sv("g", {}, keeper);
      sv("ellipse", { cx: 0, cy: 1, rx: 7, ry: 2, fill: "#000", opacity: 0.3 }, flipG);
      const lantDown = sv("g", {}, flipG);        // lantern set down on the ground while his hands are busy
      const gld = sv("circle", { cx: -15, cy: -3, r: 12, fill: "url(#gg-glow)" }, lantDown);
      anim(gld, "animation:ggFlicker 2.4s ease-in-out infinite;transform-origin:-15px -3px;");
      const lrD = sv("rect", { x: -17, y: -6, width: 4, height: 6, rx: 1, fill: "#ffd98a" }, lantDown);
      lantDown.style.display = "none";
      const sitG = sv("g", {}, flipG);            // squashed a little when he sits
      const body = sv("g", {}, sitG);             // bobs and leans
      sv("path", { d: "M-6 0 L-4 -16 Q0 -20 4 -16 L6 0 Z", fill: "#2e2a45" }, body);
      sv("circle", { cx: 0, cy: -20, r: 3.5, fill: "#d9c3a8" }, body);
      const hatDefault = sv("path", { d: "M-7 -22 Q0 -25 7 -22 L3 -29 Q0 -32 -3 -29 Z", fill: "#1d1830" }, body);
      sv("line", { x1: 4, y1: -13, x2: 10, y2: -11, stroke: "#2e2a45", "stroke-width": 2, "stroke-linecap": "round" }, body);
      const lantHeld = sv("g", {}, body);
      const gl = sv("circle", { cx: 11, cy: -8, r: 18, fill: "url(#gg-glow)" }, lantHeld);
      anim(gl, "animation:ggFlicker 2.4s ease-in-out infinite;transform-origin:11px -8px;");
      const lrH = sv("rect", { x: 9, y: -10, width: 4, height: 6, rx: 1, fill: "#ffd98a" }, lantHeld);
      const broomG = sv("g", {}, body);
      const broomRot = sv("g", {}, broomG);
      sv("line", { x1: 8, y1: -12, x2: 16, y2: 1, stroke: "#6b4f35", "stroke-width": 1.8, "stroke-linecap": "round" }, broomRot);
      sv("path", { d: "M13 -2 L20 0 L19.5 3.5 L12 2.5 Z", fill: "#b99a5b" }, broomRot);
      broomG.style.display = "none";
      const thermosG = sv("g", {}, body);
      const thermos = sv("g", {}, thermosG);
      sv("rect", { x: 8, y: -16, width: 4.5, height: 9, rx: 1.2, fill: "#6f93bd" }, thermos);
      sv("rect", { x: 8, y: -18, width: 4.5, height: 2.6, rx: 1, fill: "#d6deea" }, thermos);
      sv("rect", { x: 8, y: -12.5, width: 4.5, height: 1, fill: "#3a5a80" }, thermos);
      [0, 1].forEach(i => {
        const st = sv("path", { d: `M${(9.5 + i * 2).toFixed(1)} -19 q-1.5 -3 0 -5 q1.5 -2 0 -4`, stroke: "#e6dcf5", "stroke-width": 1, fill: "none", "stroke-linecap": "round", opacity: 0.7 }, thermosG);
        anim(st, `animation:ggSteam ${(1.8 + i * 0.5).toFixed(1)}s ease-out ${(i * 0.6).toFixed(1)}s infinite;`);
      });
      thermosG.style.display = "none";
      const badge = sv("text", { x: 0, y: -36, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "#ffd98a" }, keeper);
      badge.textContent = "!";
      anim(badge, "animation:ggBob 1.6s ease-in-out infinite;");
      badge.style.display = "none";
      const hit = sv("rect", { x: -14, y: -42, width: 28, height: 50, fill: "transparent" }, keeper);
      hit.style.cursor = "pointer";

      const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
      const q2 = s => `\u2018${s}\u2019`;
      const todayMD = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const todayKey = `${now.getFullYear()}-${todayMD}`;
      const nodeOf = g => graveNodes.find(n => n.g === g);
      const lows = () => {                       // candles with under 12 hours left
        const st = gyStore(), t = Date.now();
        return graves.filter(g => { const r = gyRec(g.f.workId, st); return r.lit > t && r.lit - t < 43200000; });
      };
      const anniv = () => graves.filter(g => g.f.lastUpdate && String(g.f.lastUpdate).slice(5, 10) === todayMD && +String(g.f.lastUpdate).slice(0, 4) < now.getFullYear());
      const hasNews = () => (anniv().length > 0 && prefs.kd !== todayKey) || lows().length > 0;
      const updateBadge = () => { badge.style.display = hasNews() ? "" : "none"; };

      const heard = [];
      const candidates = () => {
        const out = [];
        const add = (t, node) => out.push({ t, node });
        const st = gyStore();
        let flowers = 0, candles = 0;
        graves.forEach(g => { const r = gyRec(g.f.workId, st); flowers += gyTotal(r); if (r.lit > Date.now()) candles++; });
        const q = graves.slice().sort((a, b) => b.quiet - a.quiet)[0];
        const big = graves.slice().sort((a, b) => (b.f.words || 0) - (a.f.words || 0))[0];
        const crowd = live.slice().sort((a, b) => b.graves.length - a.graves.length)[0];
        const left = WISPS - wispFound().length;
        // about your graveyard
        add(`${q2(titleOf(q.f))} has been quiet for ${gyAgo(q.quiet)}. I still sweep round it.`, nodeOf(q));
        if (big.f.words) add(`${q2(titleOf(big.f))} is the biggest stone here. ${big.f.words.toLocaleString()} words. I\u2019ve peeked at a few.`, nodeOf(big));
        add(`${crowd.name} is the busiest plot: ${plural(crowd.graves.length, "stone")}. Hardest to sweep.`);
        add(flowers ? `${plural(flowers, "flower")} laid so far. I counted. Twice.` : "Not one flower laid yet. Go on, I\u2019ll look away.");
        add(candles ? `${plural(candles, "candle")} burning tonight. I keep an eye on them.` : "No candles lit. Awfully dark for company.");
        if (left === WISPS) add(`${WISPS} wisps loose today. Keep your eyes soft and they\u2019ll find you.`);
        else if (left > 0) add(`${plural(left, "wisp")} still loose today. They like the gravel.`);
        else add("You caught every wisp today. Show-off.");
        if (prefs.wc) add(`You\u2019re carrying ${plural(prefs.wc, "wisp")} over from yesterday. Sensible. They keep.`);
        if (prefs.wishes) add(`${plural(prefs.wishes, "wish")} down the well, and it\u2019s never once granted mine.`);
        // about the moment
        add(["The moon\u2019s good company. Better than most readers.", "Dusk. My favourite hour. The lamps just starting to matter.", "Dawn already? I never did sleep."][tI]);
        const wk = WX[wxI][0];
        if (wk === "rain") add("Rain again. Good for the moss, bad for my hat.");
        if (wk === "fog") add("Can\u2019t see my own lantern in this. Mind your feet.");
        if (wk === "snow") add("Snow\u2019s the kindest weather. Quiet as the residents.");
        add({ halloween: "Everyone dresses up tonight. I came as a groundskeeper. Very convincing, no?", winter: "I swept the snow off every stone. Twice.", spring: "Petals everywhere. I don\u2019t mind.", summer: "Fireflies out in force. Free lanterns.", autumn: "Leaves. Leaves. More leaves." }[season]);
        // about Bram himself
        { const b = bt(), fl = b.gd === dayKey ? (b.fl || []) : [];
          if (fl.length) add(`I\u2019ll wear this ${fl[fl.length - 1]} until morning. Then I\u2019ll be wanting a fresh one.`);
          if (b.hat !== "dflt") add("Like the hat? Paid for in wisps. Best trade I ever made. Back to the old one by morning, mind.");
          if (b.lan !== "gold") add("Never thought the lantern could be anything but gold. Look at it now.");
          if (solved()) ["Wrote a sentence last night. One. Don\u2019t clap.", "Every stone here is somebody\u2019s drawer. I just keep the dust off.", "Funny. Sweeping other people\u2019s endings is what got me writing again."].forEach(t => add(t)); }
        // old favourites
        [
          "Evening. I just keep the lanterns lit.",
          "Mind the third stone from the left. It has opinions.",
          "Most of these folks would have finished, given a little more time.",
          "The cat? Never seen her before in my life. She lives here.",
          "If you hear whispering near the well, that\u2019s the authors, apologizing.",
          "Sweep a stone, straighten a flower, sit down with the thermos. That\u2019s the whole job. Best job.",
          "She knocks that bucket over on purpose. I\u2019ve watched her take aim.",
          "Tap a stone and I\u2019ll wander over. Slowly. I\u2019m not young.",
          "When it rains I\u2019m in the cottage with the kettle. Wave at the window if you like."
        ].forEach(t => add(t));
        return out;
      };
      const nextLine = () => {
        const all = candidates();
        const fresh = all.filter(l => !heard.includes(l.t));
        const l = pick(fresh.length ? fresh : all);
        heard.push(l.t); if (heard.length > 10) heard.shift();
        return l;
      };
      const firstLine = () => {                  // what he opens with: news first, then small talk
        const an = anniv();
        if (an.length && prefs.kd !== todayKey) {
          prefs.kd = todayKey; savePrefs();
          const g = an[0], yrs = now.getFullYear() - (+String(g.f.lastUpdate).slice(0, 4));
          return { t: `Years ago today, ${q2(titleOf(g.f))} went quiet. ${plural(yrs, "year")} now.` + (an.length > 1 ? ` And ${plural(an.length - 1, "other")} besides.` : "") + " Thought you\u2019d want to know.", node: nodeOf(g) };
        }
        const lo = lows();
        if (lo.length) return { t: `${lo.length === 1 ? "A candle is" : plural(lo.length, "candle") + " are"} nearly burnt out. Shall I relight ${lo.length === 1 ? "it" : "them"}?` };
        return nextLine();
      };
      const isTalking = () => card.style.display !== "none" && card.firstChild && card.firstChild.dataset && card.firstChild.dataset.bram === "1";
      // ── Bram's extras: errands, gifts, the wisp tip jar, and his story ──
      // Saved under prefs.bt, which lives in the synced ao3_gg_sync_v1 key:
      //   tips = wisps given today (resets at 2 am), total = wisps given in all, lan / hat = what he has on, fl = today's flower in his hat band (one a day, cleared at 2 am),
      //   gifts / gdays = flowers given in all (and on how many days; gd = the day of the last one), cl / cd = story pieces told (and the day of the last),
      //   fd / fc = wisps he has fetched today.
      const bt = () => prefs.bt || (prefs.bt = { tips: 0, total: 0, lan: "gold", hat: "dflt", fl: [], gifts: 0, gdays: 0, cl: 0, cd: "", fd: "", fc: 0 });
      const LANTERNS = {
        gold: { n: "Gold", c: "#ffd98a" }, moss: { n: "Moss green", c: "#9fe3a0" }, violet: { n: "Violet", c: "#c9a6ff" },
        ember: { n: "Ember", c: "#ff8a5c" }, moon: { n: "Moonlight blue", c: "#a9d6ff" }
      };
      const HATS = { dflt: { n: "His old hat" }, wool: { n: "Wool bobble cap" }, straw: { n: "Straw hat" }, top: { n: "Top hat" } };
      const HAT_BAND = { dflt: -24.2, wool: -23.2, straw: -23.8, top: -23.8 };      // where a tucked flower sits, per hat
      // [wisps given today, "lan" | "hat", id]: each gift unlocks at that many wisps in today's jar.
      // The thresholds are fixed but which gift sits at which one is shuffled by the day, so every day unlocks in a different order.
      const REWARD_AT = [1, 2, 3, 5, 6, 8, 10];
      const REWARDS = [["lan", "moss"], ["lan", "violet"], ["lan", "ember"], ["lan", "moon"], ["hat", "wool"], ["hat", "straw"], ["hat", "top"]]
        .map(p => ({ p, k: rnd("reward" + dayKey + p[1]) })).sort((a, c) => a.k - c.k)
        .map((o, i) => [REWARD_AT[i], o.p[0], o.p[1]]);
      const have = (kind, id) => id === "gold" || id === "dflt" || REWARDS.some(r => r[1] === kind && r[2] === id && bt().tips >= r[0]);
      const needOf = (kind, id) => (REWARDS.find(r => r[1] === kind && r[2] === id) || [0])[0];
      const trust = () => (bt().total || 0) + (bt().gdays || 0);

      // his story: a piece comes out once a day, and the later ones need some trust (wisps in the jar + days you brought a flower)
      const STORY = [
        { need: 0, t: "Bram. Just Bram. The crows have called me worse." },
        { need: 0, t: "Before this? Different work. Indoors. A great deal of sitting." },
        { need: 2, t: "I had a desk once. Ink up to the wrist. Don\u2019t tell the cat." },
        { need: 4, t: "I wrote. Long things, in chapters. People waited for me to update, if you can believe it." },
        { need: 6, t: "There\u2019s one I never finished. Walked out mid-sentence and took this job. A grave you can sweep. A draft just sits there, wanting." },
        { need: 8, t: "There\u2019s a drawer in the cottage. Half a last chapter in it. I check on it every time it rains." },
        { need: 10, t: "Ambrose Hollin, if you want the lot. Bram\u2019s what the readers called me. Someone ought to look after the ones that stopped.", n: "He glances at the cottage. You get the feeling the drawer will be opened tonight." },
        // part two: after the name comes out
        { need: 12, t: "I opened the drawer last night. The last line just stops. Mid-sentence, like a door somebody forgot to close." },
        { need: 14, t: "I never told you why I stopped. Nothing dramatic. A bad week. Then a bad month. Then it had been a year, and the silence was too big to write into." },
        { need: 16, t: "The readers kept commenting, even after. \u2018No rush!\u2019 they said. \u2018We\u2019ll wait!\u2019 I couldn\u2019t open them. It felt like owing money I didn\u2019t have." },
        { need: 19, t: "So I took the job. A quiet place. Stones that never ask when you\u2019re updating." },
        { need: 22, t: "Then you turned up with your lantern-light and your flowers and your candles. People still care about the ones that stopped. I\u2019d forgotten that." },
        { need: 25, t: "The cat, by the way, came with the cottage. She knows everything. Keep that between us." },
        { need: 28, t: "That drifting ghost, the one who wants his ending. I\u2019ve started leaving pages on the gatepost for him. He never takes them. He reads them, though. I can tell." },
        { need: 32, t: "I wrote the next paragraph. Four sentences. Then I sat an hour and cut it down to three." },
        { need: 36, t: "Here is what a graveyard teaches you: an unfinished story isn\u2019t a failure. It\u2019s a story still waiting to be somebody\u2019s." },
        { need: 40, t: "The drawer\u2019s empty now. The chapter\u2019s on the desk. It isn\u2019t done. But it\u2019s moving. Some mornings that\u2019s the whole job.", n: "He turns back toward the cottage. A lamp is lit in the window, and a pen is scratching." }
      ];
      const REVEAL = 7;                          // the first seven pieces are chapter one of his story; his name comes out at the seventh
      const solved = () => (bt().cl || 0) >= REVEAL;
      const headTxt = () => solved() ? "\u{1F3EE} Ambrose \u201CBram\u201D Hollin \u00B7 groundskeeper" : "\u{1F3EE} Bram \u00B7 groundskeeper";

      // lantern colours need their own glow gradient; hats are drawn on his head and hidden until worn
      Object.keys(LANTERNS).forEach(k => {
        if (k === "gold") return;
        const gr = sv("radialGradient", { id: "gg-glow-" + k }, defs);
        sv("stop", { offset: "0%", "stop-color": LANTERNS[k].c, "stop-opacity": "0.75" }, gr);
        sv("stop", { offset: "100%", "stop-color": LANTERNS[k].c, "stop-opacity": "0" }, gr);
      });
      const hatG = {};
      ["wool", "straw", "top"].forEach(k => { hatG[k] = sv("g", {}, body); });
      sv("path", { d: "M-5.2 -22.4 Q-5.4 -29.2 0 -29.6 Q5.4 -29.2 5.2 -22.4 Z", fill: "#8a3b4d" }, hatG.wool);
      sv("rect", { x: -5.6, y: -24.4, width: 11.2, height: 2.4, rx: 1.1, fill: "#c0607a" }, hatG.wool);
      sv("circle", { cx: 0, cy: -30.4, r: 1.9, fill: "#eadbe0" }, hatG.wool);
      sv("ellipse", { cx: 0, cy: -22.6, rx: 9.5, ry: 2.1, fill: "#d3b25f" }, hatG.straw);
      sv("path", { d: "M-4.2 -22.6 Q-4.4 -28.8 0 -28.8 Q4.4 -28.8 4.2 -22.6 Z", fill: "#e8cc80" }, hatG.straw);
      sv("rect", { x: -4.3, y: -24.7, width: 8.6, height: 1.7, fill: "#8a5a44" }, hatG.straw);
      sv("ellipse", { cx: 0, cy: -22.4, rx: 8.2, ry: 1.9, fill: "#12101c" }, hatG.top);
      sv("rect", { x: -4.6, y: -32.4, width: 9.2, height: 10, rx: 0.7, fill: "#1d1830" }, hatG.top);
      sv("rect", { x: -4.6, y: -25.2, width: 9.2, height: 2, fill: "#7a4a8c" }, hatG.top);
      const hatFl = sv("g", {}, body);            // flowers tucked in the hat band
      hatFl.style.pointerEvents = "none";
      const FL_X = [4.4, 0.6, -3.2];
      const paintHatFlowers = () => {
        hatFl.textContent = "";
        const b = bt(), by = HAT_BAND[HATS[b.hat] ? b.hat : "dflt"];
        (b.gd === dayKey ? (b.fl || []).slice(-1) : []).forEach(e => {
          const i = 1;                                  // one flower a day, tucked into the middle of the band
          const t = sv("text", { x: FL_X[i], y: by + 1.6, "text-anchor": "middle", "font-size": 6.4, transform: `rotate(${(i - 1) * 16} ${FL_X[i]} ${by + 1})` }, hatFl);
          t.textContent = e;
        });
      };
      const applyLook = () => {
        const b = bt(), lk = LANTERNS[b.lan] ? b.lan : "gold", hk = HATS[b.hat] ? b.hat : "dflt";
        [lrH, lrD].forEach(r => r.setAttribute("fill", LANTERNS[lk].c));
        const gu = lk === "gold" ? "url(#gg-glow)" : `url(#gg-glow-${lk})`;
        gl.setAttribute("fill", gu); gld.setAttribute("fill", gu);
        hatDefault.style.display = hk === "dflt" ? "" : "none";
        Object.keys(hatG).forEach(k => { hatG[k].style.display = k === hk ? "" : "none"; });
        paintHatFlowers();
      };
      applyLook();

      // one card for everything he says; extra content goes in with add(), buttons with btn()
      let errandHook = null;                      // filled in below (walking version, or a still version for reduced motion)
      const bramCard = (line, build) => {
        if (picked) { picked.setAttribute("opacity", 0); picked = null; }
        card.textContent = "";
        const head = el("div", "font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,217,138,0.85);", headTxt());
        head.dataset.bram = "1";
        card.appendChild(head);
        card.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13.5px;line-height:1.45;margin:8px 0 2px;color:#e6dcf5;", `\u201C${line.t}\u201D`));
        if (line.n) card.appendChild(el("div", "font-size:11.5px;line-height:1.4;margin-top:5px;color:rgba(255,217,138,0.9);", line.n));
        const row = el("div", "display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin-top:10px;");
        const btn = (label, fn) => { const b = el("button", bcss, label); b.type = "button"; b.onclick = fn; row.appendChild(b); };
        card.appendChild(row);
        build({ btn, add: node => card.insertBefore(node, row) });
        card.style.display = "block"; card.scrollTop = 0;
        updateBadge();
      };
      const closeCard = () => { card.style.display = "none"; };
      const again = () => talk({ t: pick(["Anything else?", "Mm? Go on.", "Yes?"]) });
      const backRow = ({ btn }) => { btn("Back", again); btn("Close", closeCard); };
      const talk = line => bramCard(line, ({ btn }) => {
        if (line.node) btn("Show me", () => goTo(line.node));
        const lo = lows();
        if (lo.length) btn(`\u{1F56F}\uFE0F Relight ${lo.length === 1 ? "it" : "them"}`, () => {
          lo.forEach(g => { gyLight(g.f.workId); const n = nodeOf(g); if (n) { n.paintDyn(); sparkle(n.gx + 33, n.gy + 28, 5); } });
          try { if (navigator.vibrate) navigator.vibrate(12); } catch {}
          updateBadge();
          talk({ t: pick(["There. Good for another three days.", "Lit and lovely. They\u2019ll see you right.", "Done. Nobody sits in the dark on my watch."]) });
        });
        btn("Chat", () => talk(nextLine()));
        btn("\u{1F9ED} Errands", () => errandsMenu());
        btn("\u{1F337} Gift", () => giftMenu());
        btn("\u2726 Tip jar", () => tipMenu());
        btn("\u{1F3E0} Cottage", () => { closeCard(); openBramCottage(); });
        btn("Who are you?", () => storyMenu());
        btn("Close", closeCard);
      });
      hit.addEventListener("click", () => talk(firstLine()));

      // ── errands: "Fetch the wisps" and "Find me a quiet grave" ──
      const RAIN_BLOCK = "In this rain? Not a chance. Ask me again when it clears.";
      const FETCH_PER_DAY = 1;                    // they are shy: he can coax this many out per day
      const fetchCheck = () => {
        const left = Object.keys(wispLoose).map(k => wispLoose[k]);
        if (!left.length) return { msg: "Every last wisp is already in your lantern. Nothing left for me to fetch." };
        const b = bt();
        if (b.fd === dayKey && (b.fc || 0) >= FETCH_PER_DAY) return { msg: "I\u2019ve coaxed one out already today. They get shy if you push. Tomorrow, eh?" };
        left.sort((a, c) => Math.abs(a.y - bm.y) - Math.abs(c.y - bm.y));
        return { w: left[0] };
      };
      const noteFetched = () => { const b = bt(); b.fc = b.fd === dayKey ? (b.fc || 0) + 1 : 1; b.fd = dayKey; savePrefs(); };
      let lastQuiet = null;
      const quietPick = () => {                   // one of the quietest third of the graves, not the same twice running
        const ranked = graveNodes.slice().sort((a, c) => c.g.quiet - a.g.quiet);
        const pool = ranked.slice(0, Math.max(1, Math.ceil(ranked.length / 3)));
        let n = pick(pool);
        for (let k = 0; k < 6 && pool.length > 1 && n === lastQuiet; k++) n = pick(pool);
        lastQuiet = n;
        return n;
      };
      const errand = kind => {
        const why = errandHook ? errandHook.blocked() : "";
        if (why) { bramCard({ t: why }, backRow); return; }
        let w = null;
        if (kind === "wisps") {
          const c = fetchCheck();
          if (c.msg) { bramCard({ t: c.msg }, backRow); return; }
          w = c.w;
        }
        closeCard();
        if (kind === "wisps") errandHook.wisps(w); else errandHook.grave();
      };
      const errandsMenu = () => {
        const loose = Object.keys(wispLoose).length;
        bramCard({ t: "Errands, is it? Go on, then." }, ({ btn }) => {
          btn(loose ? "\u2726 Fetch the wisps" : "\u2726 Fetch the wisps (none left)", () => errand("wisps"));
          btn("\u{1FAA6} Find me a quiet grave", () => errand("grave"));
          btn("Back", again);
        });
      };

      // ── gifts: a flower goes in his hat band (the last three stay) ──
      const FLOWER_SAY = {
        "Rose": ["A rose. Nobody\u2019s given me a rose since the old job. Thank you.", "Careful. I\u2019ll get ideas."],
        "Tulip": ["A tulip! Practical. Cheerful. Doesn\u2019t make a fuss.", "Tulips. They\u2019ll sulk when it frosts, same as me."],
        "Sunflower": ["That\u2019s bigger than my hat. I\u2019ll make it work.", "A sunflower in a graveyard. Bold. I like it."],
        "Daisy": ["A daisy. Simple. Honest. Sits right in the band.", "Oh, that\u2019s a good one."],
        "Blossom": ["Blossom. It\u2019ll drop petals down my collar all afternoon. Worth it.", "Pretty thing. Hold still, hat."],
        "Bouquet": ["A whole bouquet? For a hat? ...Fine. I\u2019ll find room.", "Now I look like a wedding. Thank you."],
        "Wilted rose": ["Ha! A wilted one. You understand the job.", "Wilted, is it? Suits the grounds. Suits me, honestly."]
      };
      const giveFlower = t => {
        const b = bt();
        if (b.gd === dayKey) return;                    // one flower a day
        b.fl = [t.e];                                   // today's flower; gone again by morning, like the hat and lantern
        b.gifts = (b.gifts || 0) + 1;
        b.gd = dayKey; b.gdays = (b.gdays || 0) + 1;
        savePrefs(); paintHatFlowers();
        try { if (navigator.vibrate) navigator.vibrate(10); } catch {}
        rise(t.e, bm.x, bm.y - 32);
        talk({ t: pick(FLOWER_SAY[t.n] || ["Well. Aren\u2019t you kind."]), n: `He tucks the ${t.n.toLowerCase()} into his hat band. It\u2019ll see him through to morning.` });
      };
      const giftMenu = () => {
        const b = bt();
        if (b.gd === dayKey) {                          // today's flower is already in his hat
          bramCard({ t: pick(["One a day is plenty. It\u2019s looking well in the hat, isn\u2019t it?", "You\u2019ve been generous already today. Tomorrow, eh?"]) }, ({ btn }) => { btn("Back", again); btn("Close", closeCard); });
          return;
        }
        bramCard({ t: "A flower? For me? Well.", n: "One flower a day. He wears it until morning." }, ({ btn, add }) => {
          const fr = el("div", "display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin-top:10px;");
          GY_FLOWERS.forEach(t => {
            const fb = el("button", "cursor:pointer;font-size:20px;line-height:1;padding:6px 8px;border-radius:10px;border:1px solid rgba(190,170,255,0.3);background:rgba(255,255,255,0.06);", t.e);
            fb.type = "button"; fb.title = `Give a ${t.n.toLowerCase()}`;
            fb.onclick = () => giveFlower(t);
            fr.appendChild(fb);
          });
          add(fr);
          btn("Back", again); btn("Close", closeCard);
        });
      };

      // ── tip jar: today's wisps for lanterns and hats ──
      const giveWisps = n => {
        const b = bt(), before = b.tips;
        prefs.wg = (prefs.wg || 0) + n; b.tips += n; b.total = (b.total || 0) + n;
        const won = REWARDS.filter(r => r[0] > before && r[0] <= b.tips);
        won.forEach(r => { b[r[1]] = r[2]; });          // he puts the newest of each on straight away
        savePrefs(); applyLook(); updateSub();
        try { if (navigator.vibrate) navigator.vibrate(12); } catch {}
        sparkle(bm.x, bm.y - 14, 8);
        const next = REWARDS.find(r => b.tips < r[0]);
        const note = won.length
          ? won.map(r => r[1] === "lan" ? `The lantern burns ${LANTERNS[r[2]].n.toLowerCase()} now.` : `He puts on a ${HATS[r[2]].n.toLowerCase()}.`).join(" ")
          : `${n === 1 ? "A wisp slips" : n + " wisps slip"} into the jar.` + (next ? ` ${next[0] - b.tips} more for his next gift.` : "");
        talk({ t: pick(n > 1 ? ["All of them? ...Right. Thank you. Truly.", "That\u2019s a handsome haul. The jar\u2019s humming."] : ["One wisp. Thank you. It\u2019s warm.", "Ah. Into the jar with you. Thank you."]), n: note });
      };
      const wardrobe = () => {
        const b = bt(), w = el("div", "margin-top:6px;");
        const lab = txt => el("div", "font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(217,208,245,0.6);margin:9px 0 5px;", txt);
        w.appendChild(lab("Lantern"));
        const lr = el("div", "display:flex;justify-content:center;flex-wrap:wrap;gap:8px;");
        Object.keys(LANTERNS).forEach(k => {
          const ok = have("lan", k), on = (LANTERNS[b.lan] ? b.lan : "gold") === k;
          const d = el("button", `width:26px;height:26px;border-radius:50%;padding:0;font-size:11px;line-height:1;cursor:${ok ? "pointer" : "default"};border:2px solid ${on ? "#fff" : "rgba(190,170,255,0.35)"};background:${ok ? LANTERNS[k].c : "rgba(255,255,255,0.06)"};${ok ? "" : "opacity:.55;"}`, ok ? "" : "\u{1F512}");
          d.type = "button"; d.title = ok ? LANTERNS[k].n : `Unlocks at ${needOf("lan", k)} wisps`;
          if (ok) d.onclick = () => { b.lan = k; savePrefs(); applyLook(); tipMenu(); };
          lr.appendChild(d);
        });
        w.appendChild(lr);
        w.appendChild(lab("Hat"));
        const hr = el("div", "display:flex;justify-content:center;flex-wrap:wrap;gap:6px;");
        Object.keys(HATS).forEach(k => {
          const ok = have("hat", k), on = (HATS[b.hat] ? b.hat : "dflt") === k;
          const d = el("button", bcss + (on ? "box-shadow:0 0 0 2px rgba(255,217,138,0.6);" : "") + (ok ? "" : "opacity:.5;cursor:default;"), ok ? HATS[k].n : `\u{1F512} ${needOf("hat", k)}`);
          d.type = "button"; d.title = ok ? HATS[k].n : `Unlocks at ${needOf("hat", k)} wisps`;
          if (ok) d.onclick = () => { b.hat = k; savePrefs(); applyLook(); tipMenu(); };
          hr.appendChild(d);
        });
        w.appendChild(hr);
        return w;
      };
      const tipMenu = () => {
        const b = bt(), avail = wispAvail();
        const next = REWARDS.find(r => b.tips < r[0]);
        bramCard({ t: avail ? "Wisps for the jar? Well, I won\u2019t say no." : pick(["The jar\u2019s for wisps. Bring me what you\u2019ve caught today.", "Nothing in your lantern to spare. Catch a few and come back."]) }, ({ btn, add }) => {
          add(el("div", "font-size:11.5px;line-height:1.5;margin-top:8px;color:rgba(217,208,245,0.75);", `${avail} wisp${avail === 1 ? "" : "s"} to give \u00B7 ${b.tips} given today` + (next ? ` \u00B7 next gift at ${next[0]}` : " \u00B7 he has everything on offer today")));
          if (b.tips > 0) add(wardrobe());
          if (avail > 0) btn("Give 1 \u2726", () => giveWisps(1));
          if (avail > 1) btn(`Give all ${avail}`, () => giveWisps(avail));
          btn("Back", again); btn("Close", closeCard);
        });
      };

      // ── his story ──
      const storyMenu = () => {
        const b = bt(), cl = b.cl || 0, nx = STORY[cl];
        let line;
        if (!nx) line = { t: "You\u2019ve had it all out of me now. Ambrose Hollin, groundskeeper, one chapter in the works." };
        else if (b.cd === dayKey) line = { t: "That\u2019s all I\u2019ve got in me for one day. Come back tomorrow." };
        else if (trust() < nx.need) line = { t: pick(["Hm. I don\u2019t know you well enough for that one yet.", "Another day. Ask me another day."]), n: "He seems fonder of people who bring flowers, and wisps for the jar." };
        else { b.cl = cl + 1; b.cd = dayKey; savePrefs(); line = { t: nx.t, n: nx.n || `(${b.cl} of ${STORY.length})` }; }
        bramCard(line, ({ btn, add }) => {
          const known = STORY.slice(0, b.cl || 0);
          const j = el("div", "text-align:left;margin-top:10px;padding-top:8px;border-top:1px solid rgba(190,170,255,0.18);font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:12px;line-height:1.45;color:rgba(230,220,245,0.75);");
          if (known.length) known.forEach((s, i) => j.appendChild(el("div", "margin-bottom:5px;", `${i + 1}. ${s.t}`)));
          if (known.length < STORY.length) j.appendChild(el("div", "opacity:0.4;", `${known.length + 1}. ???`));
          add(j);
          btn("Back", again); btn("Close", closeCard);
        });
      };

      // ── Bram's day ──
      // One small state machine, driven by requestAnimationFrame and frozen while he is talking to you:
      //   patrol  walks the path (down to the bench, sits a while, then back up to the gate)
      //   walk    walks a route (to a grave, back to the path) and then does `onArrive`
      //   act     sweeps a stone / straightens a flower / sits on the bench with his thermos
      //   chase   goes after the cat, who knocks something over; he stands it back up
      //   home    heads for the cottage when it rains; enter / inside / exit are the door and the wait
      const bsay = t => { if (Date.now() - sayAt > 7000) say(t); };     // ambient lines never talk over something you just did
      const rainNow = () => WX[wxI][0] === "rain";
      const clampY = y0 => Math.max(yMin, Math.min(benchY, y0));
      const bm = { x: pathX(yMin + 40) + OFF, y: yMin + 40, route: [] };
      let face = 1, bob = 0, lean = 0, seated = false, walkPh = 0;
      const put = () => keeper.setAttribute("transform", `translate(${bm.x.toFixed(1)} ${bm.y.toFixed(1)})`);
      const applyBody = () => {
        body.setAttribute("transform", `translate(0 ${(-bob).toFixed(2)}) rotate(${lean.toFixed(1)})`);
        sitG.setAttribute("transform", seated ? "scale(1 0.86)" : "");
      };
      const setFace = f => { if (f !== face) { face = f; flipG.setAttribute("transform", f < 0 ? "scale(-1 1)" : ""); } };
      const setPose = p => {                      // "walk" | "sweep" | "bend" | "sit"
        lantHeld.style.display = p === "walk" ? "" : "none";
        lantDown.style.display = p === "walk" ? "none" : "";
        broomG.style.display = p === "sweep" ? "" : "none";
        thermosG.style.display = p === "sit" ? "" : "none";
        seated = p === "sit"; lean = 0; bob = 0; applyBody();
      };
      put(); setPose("walk");

      if (reduce) {
        // reduced motion: he just stands on the path; in rain he is "home" (hidden) with the window lit
        bm.y = Math.min(260, benchY - 30); bm.x = pathX(bm.y) + OFF; put();
        keeperOnWeather = () => { const r = rainNow(); mode = r ? "inside" : "patrol"; keeper.style.display = r ? "none" : ""; setLit(r); };
        errandHook = {                              // reduced motion: no walking, so the result just appears
          blocked: () => (rainNow() ? RAIN_BLOCK : ""),
          grave: () => { const n = quietPick(); say(`Bram points. \u201CThat one. ${q2(titleOf(n.g.f))}. Quiet for ${gyAgo(n.g.quiet)}.\u201D`); goTo(n); },
          wisps: w => {
            const n = w.collect(true);
            noteFetched();
            sparkle(w.x, w.y, n >= WISPS ? 14 : 7);
            say(n >= WISPS ? "Bram tips the last wisp into your lantern. The whole place hums. You are a wisp-keeper." : `Bram brings a wisp back and tips it into your lantern. ${n} of ${WISPS} today.`);
          }
        };
      } else {
        // ── routes ──
        const spineP = (y0, off) => ({ x: pathX(y0) + off, y: y0 });
        // from (fx, fy) to `to`: step onto the path, follow it up/down, then step off sideways if `to.lane`
        const mkRoute = (fx, fy, to, off) => {
          const pts = [];
          if (Math.abs(fx - (pathX(fy) + off)) > 1.5) pts.push(spineP(fy, off));
          const dir0 = to.y >= fy ? 1 : -1;
          for (let y0 = fy + dir0 * 24; dir0 > 0 ? y0 < to.y : y0 > to.y; y0 += dir0 * 24) pts.push(spineP(y0, off));
          if (to.lane) pts.push(spineP(to.y, off));
          pts.push({ x: to.x, y: to.y });
          return pts;
        };
        const advance = (m, dt, speed, faceFn) => {
          let rem = speed * dt;
          while (rem > 0 && m.route.length) {
            const tg = m.route[0], dx = tg.x - m.x, dy = tg.y - m.y, dd = Math.hypot(dx, dy);
            if (dd < 1e-3) { m.route.shift(); continue; }
            if (faceFn && Math.abs(dx) > Math.abs(dy) * 0.8 + 0.05) faceFn(dx > 0 ? 1 : -1);
            if (dd <= rem) { m.x = tg.x; m.y = tg.y; rem -= dd; m.route.shift(); }
            else { m.x += dx / dd * rem; m.y += dy / dd * rem; rem = 0; }
          }
          return m.route.length === 0;
        };
        const stride = dist => {
          walkPh += dist * 0.45;
          bob = Math.abs(Math.sin(walkPh)) * 1.1; lean = Math.sin(walkPh) * 1.6;
        };
        const walkBy = (dt, speed) => {
          const x0 = bm.x, y0 = bm.y;
          const done = advance(bm, dt, speed, setFace);
          stride(Math.hypot(bm.x - x0, bm.y - y0));
          return done;
        };

        // ── little effects ──
        const bits = (x0, y0, n, fill) => {
          const g = sv("g", {}, svg);
          for (let k = 0; k < n; k++) {
            const ang = -Math.PI * (0.1 + Math.random() * 0.8), dist = 8 + Math.random() * 14;
            const cc = sv("circle", { cx: x0, cy: y0, r: 1.3, fill }, g);
            anim(cc, `--dx:${(Math.cos(ang) * dist).toFixed(1)}px;--dy:${(Math.sin(ang) * dist).toFixed(1)}px;animation:ggSpark .8s ease-out forwards;`);
          }
          setTimeout(() => g.remove(), 900);
        };
        const dustPuff = (x0, y0) => {
          const cc = sv("circle", { cx: (x0 + (Math.random() - 0.5) * 6).toFixed(1), cy: y0 - 1, r: 1.5, fill: "#cdbfa8", opacity: 0.8 }, svg);
          anim(cc, `--dx:${((Math.random() - 0.5) * 14).toFixed(1)}px;--dy:${(-6 - Math.random() * 6).toFixed(1)}px;animation:ggSpark .8s ease-out forwards;`);
          setTimeout(() => cc.remove(), 850);
        };
        const shout = (txt, x0, y0) => {
          const tx = sv("text", { x: x0, y: y0, "text-anchor": "middle", "font-size": 9, "font-weight": 700, "font-style": "italic", "font-family": "Georgia,serif", fill: "#ffe9a8" }, svg);
          tx.textContent = txt;
          anim(tx, "animation:ggHeart 1.2s ease-out forwards;");
          setTimeout(() => tx.remove(), 1250);
        };

        // ── things the cat can knock over, left about the path ──
        const PROP_NAME = { bucket: "bucket", can: "watering can", pot: "flowerpot" };
        const PROP_NOISE = { bucket: "CLANG!", can: "clink!", pot: "crack!" };
        const makeProp = (kind, px, py) => {
          const g = sv("g", {}, svg);
          g.style.transition = "transform .45s cubic-bezier(.3,1.5,.5,1)";
          g.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) rotate(0deg)`;
          sv("ellipse", { cx: 0, cy: 0.5, rx: 7, ry: 1.8, fill: "#000", opacity: 0.35 }, g);
          if (kind === "bucket") {
            sv("path", { d: "M-6 -11 L6 -11 L5 0 L-5 0 Z", fill: "#7d8398" }, g);
            sv("ellipse", { cx: 0, cy: -11, rx: 6, ry: 1.6, fill: "#4c5266" }, g);
            sv("path", { d: "M-6 -11 Q0 -19 6 -11", fill: "none", stroke: "#9aa0b4", "stroke-width": 1 }, g);
          } else if (kind === "can") {
            sv("rect", { x: -6, y: -9, width: 10, height: 9, rx: 1.5, fill: "#6fa07f" }, g);
            sv("path", { d: "M4 -3 L10 -10", stroke: "#6fa07f", "stroke-width": 2, "stroke-linecap": "round" }, g);
            sv("path", { d: "M-6 -8 Q-11 -6 -6 -2", fill: "none", stroke: "#8cc09a", "stroke-width": 1.4 }, g);
          } else {
            sv("path", { d: "M-5 -8 L5 -8 L4 0 L-4 0 Z", fill: "#b5603a" }, g);
            sv("rect", { x: -6, y: -10, width: 12, height: 3, rx: 1, fill: "#c97449" }, g);
            const fl = sv("text", { x: 0, y: -12, "text-anchor": "middle", "font-size": 9 }, g);
            fl.textContent = "\u{1F337}";
          }
          return { kind, x: px, y: py, g, down: false };
        };
        const props = [];
        const KINDS = ["bucket", "can", "pot"];
        for (let k = 0, py0 = GATE + 195; py0 < H - TAIL - 30 && k < 5; k++, py0 += 260) props.push(makeProp(KINDS[k % 3], pathX(py0) - 12, py0));
        props.push(makeProp("can", pathX(wy + 52) - 12, wy + 52));          // always one by the well
        const knockProp = p => {
          p.down = true;
          p.g.style.transform = `translate(${(p.x - 4).toFixed(1)}px,${(p.y + 1).toFixed(1)}px) rotate(-88deg)`;
          shout(PROP_NOISE[p.kind], p.x - 2, p.y - 18);
          bits(p.x - 8, p.y - 2, 7, p.kind === "pot" ? "#8b5a3c" : "#9fb4ff");
        };
        const standProp = p => {
          p.down = false;
          p.g.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) rotate(0deg)`;
        };

        // ── state ──
        let dir = 1, wSpeed = 20, stopT = 14 + Math.random() * 12, chaseT = 40 + Math.random() * 30;
        let act = null, ch = null, onArrive = null, tendNode = null, pendingTap = null;
        let insideT = 0, phT = 0, flags = 0, clock = 0, started = false;

        const hasFlowers = n => gyTotal(gyRec(n.g.f.workId)) > 0;
        const pickGrave = () => {
          const near = graveNodes.filter(n => Math.abs(n.gy + 54 - bm.y) < 420);
          return pick(near.length ? near : graveNodes);
        };
        // his feet go in the aisle just in front of a stone
        const walkToTend = (n, speed) => {
          tendNode = n; mode = "walk"; wSpeed = speed;
          bm.route = mkRoute(bm.x, bm.y, { x: n.gx + 14, y: n.gy + 54, lane: true }, OFF);
          onArrive = () => startAct(hasFlowers(n) && Math.random() < 0.6 ? "straighten" : "sweep", n);
        };
        const resume = () => {                    // back onto the path, or off to a grave you tapped meanwhile
          if (pendingTap) { const n = pendingTap; pendingTap = null; walkToTend(n, 28); return; }
          const y1 = clampY(bm.y);
          mode = "walk"; wSpeed = 22; onArrive = null; tendNode = null;
          bm.route = mkRoute(bm.x, bm.y, { x: pathX(y1) + OFF, y: y1 }, OFF);
          stopT = 12 + Math.random() * 14;
        };

        // ── jobs ──
        const startAct = (kind, n) => {
          mode = "act";
          if (kind === "catch") { act = { kind, n: null, w: n, t: 0, dur: 3.2, got: false }; setPose("walk"); return; }
          const title = n ? q2(titleOf(n.g.f)) : "";
          if (kind === "sweep") {
            act = { kind, n, t: 0, dur: 4.8, dust: 0 };
            setPose("sweep");
            bsay(pick([`Bram sweeps ${title} clean.`, `Bram brushes the leaves off ${title}.`, `Bram gives ${title} a good sweep.`]));
          } else if (kind === "straighten") {
            act = { kind, n, t: 0, dur: 3.7, done: false };
            setPose("bend");
            bsay(pick([`Bram straightens the flowers on ${title}.`, `Bram tucks the flowers back upright on ${title}.`]));
          } else {
            act = { kind: "bench", n: null, t: 0, dur: 10.5 };
            bm.x = 54; bm.y = wy + 13; setFace(1);
            setPose("sit");
            bsay("Bram sits on the bench and unscrews his thermos. Steam curls up into the cold.");
          }
        };
        const endAct = cancelled => {
          const a = act;
          if (!a) return;
          act = null;
          if (a.kind === "straighten" && a.n && a.n.dyn) a.n.dyn.removeAttribute("transform");
          if (a.kind === "bench") { bm.y = wy + 30; dir = -1; }
          thermos.setAttribute("transform", ""); broomRot.setAttribute("transform", "");
          setPose("walk");
          if (!cancelled) resume();
        };
        const actTick = dt => {
          const a = act;
          a.t += dt;
          if (a.kind === "sweep") {
            broomRot.setAttribute("transform", `rotate(${(Math.sin(a.t * 8) * 16).toFixed(1)} 8 -12)`);
            lean = 5;
            a.dust += dt;
            if (a.dust > 0.3) { a.dust = 0; dustPuff(bm.x + face * 15, bm.y); }
          } else if (a.kind === "straighten") {
            const t0 = a.t, node = a.n;
            lean = t0 < 0.7 ? 18 * (t0 / 0.7) : t0 < 3.2 ? 18 : 18 * Math.max(0, 1 - (t0 - 3.2) / 0.5);
            if (t0 > 0.7 && t0 < 2.4) { const k = t0 - 0.7; node.dyn.setAttribute("transform", `rotate(${(11 * Math.sin(k * 13) * Math.exp(-k * 1.1)).toFixed(1)} 14 47)`); }
            else if (!a.done && t0 >= 2.4) { a.done = true; node.dyn.removeAttribute("transform"); sparkle(node.gx + 14, node.gy + 44, 5); rise("\u2728", node.gx + 14, node.gy + 30); }
          } else if (a.kind === "catch") {
            catchTick(a);
          } else {
            const p = a.t % 4;                    // a sip every four seconds or so
            thermos.setAttribute("transform", p > 1.2 && p < 2.6 ? `rotate(${(-34 * Math.sin((p - 1.2) / 1.4 * Math.PI)).toFixed(1)} 10 -8)` : "");
          }
          applyBody();
          if (a.t >= a.dur) endAct(false);
        };

        // ── the cat ──
        const LAG = 0.6;                          // Bram runs this many seconds behind her
        const propTarget = p => ({ x: p.x + 9, y: p.y + 3, lane: true });
        const tryChase = () => {
          if (!catCtl || catCtl.busy || rainNow() || pendingTap) return false;
          const cn = graveNodes[catCtl.at()];
          if (Math.abs(cn.gy + 54 - bm.y) > 700) return false;       // too far to bother
          const free = props.filter(p => !p.down).sort((p1, p2) => Math.abs(p1.y - cn.gy) - Math.abs(p2.y - cn.gy));
          if (!free.length) return false;
          startChase(cn, pick(free.slice(0, 2)));
          return true;
        };
        const startChase = (cn, prop) => {
          mode = "chase"; tendNode = null;
          const lane = { x: cn.gx + 14, y: cn.gy + 54 };
          const co = lane.x > 180 ? -18 : 18;
          ch = { ph: "approach", cn, prop, lane, co, t: 0, k: 0, hist: [], rec: false, bouncePh: 0, arrived: false, left: false, righted: false,
                 cat: { x: cn.gx + 14, y: cn.gy + 1, route: [] } };
          catCtl.busy = true;
          bm.route = mkRoute(bm.x, bm.y, { x: lane.x + co, y: lane.y, lane: true }, OFF);
        };
        const followCat = () => {                 // Bram retraces her path, a moment behind
          const h = ch.hist, T = clock - LAG;
          if (!h.length || T <= h[0].t) return;
          let p = h[h.length - 1];
          if (T < p.t) {
            let i = h.length - 1;
            while (i > 0 && h[i - 1].t > T) i--;
            const a0 = h[i - 1], b0 = h[i], f = (T - a0.t) / Math.max(1e-6, b0.t - a0.t);
            p = { x: a0.x + (b0.x - a0.x) * f, y: a0.y + (b0.y - a0.y) * f };
          }
          const nx = p.x + ch.co, ny = p.y, dx = nx - bm.x, dy = ny - bm.y;
          if (Math.abs(dx) > Math.abs(dy) * 0.8 + 0.3) setFace(dx > 0 ? 1 : -1);
          stride(Math.hypot(dx, dy));
          bm.x = nx; bm.y = ny;
        };
        const endChase = () => {
          if (ch && !ch.left) { ch.left = true; catCtl.sit(); }
          catCtl.busy = false; ch = null;
          setPose("walk");
          chaseT = 45 + Math.random() * 40;
          resume();
        };
        const chaseTick = dt => {
          const c = ch;
          if (c.ph === "approach") {
            if (walkBy(dt, 38)) {
              c.ph = "spook"; c.t = 0; bob = 0; lean = 0;
              say(pick(["Bram points at the cat. \u201CDown. Off. That one\u2019s freshly swept.\u201D", "\u201COi! Not that stone, madam.\u201D", "\u201CDon\u2019t you dare. Not the bucket.\u201D"]));
            }
          } else if (c.ph === "spook") {
            c.t += dt;
            if (c.t >= 0.6) {
              c.ph = "run";
              c.cat.route = [{ x: c.lane.x, y: c.lane.y }].concat(mkRoute(c.lane.x, c.lane.y, propTarget(c.prop), 2));
            }
          } else if (c.ph === "run") {
            const cat = c.cat;
            const done = advance(cat, dt, 58, null);
            c.bouncePh += dt * 24;
            catCtl.run(cat.x, cat.y - Math.abs(Math.sin(c.bouncePh)) * 3);
            if (!c.rec && cat.y >= c.lane.y - 0.01) c.rec = true;      // she has dropped down to the aisle: he starts tracking her
            if (c.rec) c.hist.push({ t: clock, x: cat.x, y: cat.y });
            followCat();
            if (done) {
              c.ph = "knock"; c.arrived = true; c.k = 0;
              catCtl.run(cat.x, cat.y);
              knockProp(c.prop);
              say(`The cat bats the ${PROP_NAME[c.prop.kind]} clean over and stares straight at Bram.`);
            }
          } else {
            followCat();
            const h = c.hist;
            if (c.ph === "knock" && clock - LAG >= h[h.length - 1].t) {
              c.ph = "tidy"; c.t = 0; bob = 0; lean = 0; setFace(-1); setPose("bend");
            } else if (c.ph === "tidy") {
              c.t += dt;
              lean = c.t < 0.5 ? 16 * (c.t / 0.5) : c.t < 1.7 ? 16 : 16 * Math.max(0, 1 - (c.t - 1.7) / 0.4);
              if (c.t >= 0.9 && !c.righted) {
                c.righted = true; standProp(c.prop);
                say(pick([`Bram rights the ${PROP_NAME[c.prop.kind]}. \u201CEvery. Single. Time.\u201D`, `Bram stands the ${PROP_NAME[c.prop.kind]} back up and sighs.`]));
              }
              if (c.t >= 2.3) { endChase(); return; }
            }
          }
          if (c.arrived) {
            c.k += dt;
            if (!c.left && c.k > 1.5) {         // she wanders off to another grave
              c.left = true;
              let i; do { i = Math.floor(Math.random() * graveNodes.length); } while (graveNodes.length > 1 && i === catCtl.at());
              catCtl.sit(i);
            }
          }
        };

        // ── rain: into the cottage, and out again when it stops ──
        const goHome = () => {
          mode = "home"; tendNode = null; onArrive = null; wSpeed = 38;
          bm.route = mkRoute(bm.x, bm.y, { x: CX, y: DOORY, lane: true }, OFF);
          bsay("Bram pulls his hat down and makes for the cottage.");
        };
        const enterTick = dt => {
          phT += dt;
          if (!(flags & 1)) { flags |= 1; setDoor(true); }
          if (phT > 0.5 && !(flags & 2)) { flags |= 2; keeper.style.opacity = "0"; }
          if (phT > 1.0) {
            setDoor(false); setLit(true); keeper.style.display = "none";
            say(pick(["The cottage door shuts. A warm window glows through the rain.", "Bram ducks inside. A lamp comes on in the window.", "A light appears in the cottage window. Smoke curls from the chimney."]));
            mode = "inside"; insideT = 0;
          }
        };
        const startExit = () => {
          mode = "exit"; phT = 0; flags = 0;
          bm.x = CX; bm.y = DOORY; setFace(-1); put();
          setDoor(true);
          keeper.style.opacity = "0"; keeper.style.display = "";
          void keeper.getBoundingClientRect();
          keeper.style.opacity = "1";
          say(pick(["The rain stops. Bram steps out and stretches.", "The cottage door opens. Bram checks the sky, then reaches for his lantern.", "Clear again. Bram comes out, sniffing the air."]));
        };
        const exitTick = dt => {
          phT += dt;
          if (phT > 0.5 && !(flags & 1)) { flags |= 1; setLit(false); }
          if (phT > 1.2) { setDoor(false); resume(); }
        };

        // ── the main loop ──
        const patrolTick = dt => {
          bm.y += dir * 10 * dt;
          bm.x = pathX(bm.y) + OFF;
          setFace(dir > 0 ? 1 : -1);
          stride(10 * dt * 1.8);
          stopT -= dt; chaseT -= dt;
          if (dir > 0 && bm.y >= benchY) {        // end of the round: to the bench
            bm.y = benchY; bm.x = pathX(bm.y) + OFF;
            mode = "walk"; wSpeed = 20; bm.route = [{ x: 54, y: benchY }];
            onArrive = () => startAct("bench", null);
            return;
          }
          if (dir < 0 && bm.y <= yMin) { bm.y = yMin; dir = 1; }
          if (stopT <= 0) { stopT = 12 + Math.random() * 14; walkToTend(pickGrave(), 26); return; }
          if (chaseT <= 0) chaseT = tryChase() ? 45 + Math.random() * 40 : 8;
        };
        const tick = dt => {
          clock += dt;
          if (!started) {
            started = true;
            if (rainNow()) { mode = "inside"; keeper.style.display = "none"; setLit(true); insideT = 0; }
          }
          if (rainNow() && (mode === "patrol" || mode === "walk" || mode === "act")) { if (act) endAct(true); stopLead(); goHome(); }
          if (mode === "patrol") patrolTick(dt);
          else if (mode === "walk") {
            if (walkBy(dt, wSpeed)) { bob = 0; lean = 0; mode = "patrol"; const f = onArrive; onArrive = null; if (f) f(); }
          }
          else if (mode === "act") actTick(dt);
          else if (mode === "chase") chaseTick(dt);
          else if (mode === "home") { if (walkBy(dt, wSpeed)) { mode = "enter"; phT = 0; flags = 0; bob = 0; lean = 0; setFace(1); } }
          else if (mode === "enter") enterTick(dt);
          else if (mode === "inside") { if (!rainNow()) { insideT += dt; if (insideT >= 2.5) startExit(); } else insideT = 0; }
          else if (mode === "exit") exitTick(dt);
          if (lead) followView(dt);
          put(); applyBody();
        };

        // tap a grave and he walks over to it
        keeperGoTo = n => {
          if (mode === "chase") { pendingTap = n; return; }
          if (mode === "inside") { say(pick(["A shadow moves behind the lit window. \u201CNot in this rain, love.\u201D", "Bram taps the glass from inside. \u201CAfter the rain!\u201D"])); return; }
          if (mode === "home" || mode === "enter" || mode === "exit") return;
          if (tendNode === n && (mode === "walk" || mode === "act")) return;
          if (act) endAct(true);
          walkToTend(n, 28);
          bsay(pick([`Bram ambles over to ${q2(titleOf(n.g.f))}.`, "Bram heads over, lantern swinging.", "\u201CComing, coming.\u201D"]));
        };

        // ── errands: he leads, and the view follows him until you touch the screen ──
        const LEAD_EVS = ["touchstart", "wheel", "mousedown"];
        let lead = false;
        const stopLead = () => { lead = false; LEAD_EVS.forEach(ev => field.removeEventListener(ev, stopLead)); };
        const viewTop = () => Math.max(0, bm.y * (field.clientWidth / W) - field.clientHeight * 0.45);
        const followView = dt => { field.scrollTop += (viewTop() - field.scrollTop) * Math.min(1, dt * 5); };
        const leadTo = (pt, done) => {
          if (act) endAct(true);
          stopStroll();
          mode = "walk"; wSpeed = 54;
          onArrive = () => { stopLead(); done(); };
          bm.route = mkRoute(bm.x, bm.y, pt, OFF);
          lead = true;
          LEAD_EVS.forEach(ev => field.addEventListener(ev, stopLead, { passive: true }));
          field.scrollTop = viewTop();
        };
        // the wisp drifts into his lantern, and from there into yours
        const catchTick = a => {
          const w = a.w, loose = !!wispLoose[w.i];
          lean = Math.sin(a.t * 3) * 1.2;
          if (a.got) return;
          if (!loose) { a.got = true; a.dur = Math.min(a.dur, a.t + 0.8); say("\u201CAh. Somebody beat me to it.\u201D"); return; }
          if (a.t > 0.9) {
            const k = Math.min(1, (a.t - 0.9) / 0.9), tx = bm.x + face * 11, ty = bm.y - 9;
            w.wg.setAttribute("transform", `translate(${(w.x + (tx - w.x) * k).toFixed(1)} ${(w.y + (ty - w.y) * k).toFixed(1)})`);
            if (k >= 1) {
              a.got = true;
              const n = w.collect(true);
              noteFetched();
              sparkle(tx, ty, n >= WISPS ? 14 : 7);
              say(n >= WISPS
                ? "Bram tips the last wisp into your lantern. The whole place hums. You are a wisp-keeper."
                : pick(["Bram scoops a wisp out of the air with his lantern. \u201CThere. Got you.\u201D", "\u201CSlippery things,\u201D Bram mutters, and tips a wisp into your lantern.", "Bram whistles low and a wisp drifts in. \u201CThey won\u2019t be rushed.\u201D"]) + ` ${n} of ${WISPS} today.`);
            }
          }
        };
        errandHook = {
          blocked: () => (rainNow() || mode === "inside" || mode === "home" || mode === "enter" || mode === "exit") ? RAIN_BLOCK
            : mode === "chase" ? "Not now! That cat\u2019s mid-mischief. Ask me again in a minute." : "",
          grave: () => {
            const n = quietPick();
            tendNode = n;
            say(pick(["Bram lifts his lantern. \u201CA quiet one? This way. Mind the roots.\u201D", "\u201CFollow me, then. Quietly.\u201D", "Bram sets off down the path. \u201CI know just the place.\u201D"]));
            leadTo({ x: n.gx + 14, y: n.gy + 54, lane: true }, () => {
              startAct("sweep", n);                // sweeping first, so the card below does not send him off again
              say(pick([`Bram stops at ${q2(titleOf(n.g.f))}. \u201CHere. Quiet for ${gyAgo(n.g.quiet)}, and not a peep.\u201D`, `\u201CThis one.\u201D Bram sets down his lantern and nods at ${q2(titleOf(n.g.f))}.`]));
              goTo(n);
            });
          },
          wisps: w => {
            say(pick(["Bram lifts his lantern. \u201CWisps? Shy things. Give me a minute.\u201D", "\u201CI know where they like to hide.\u201D", "Bram heads off through the grass, lantern held high."]));
            leadTo({ x: Math.max(18, Math.min(342, w.x - 14)), y: w.y + 6, lane: true }, () => startAct("catch", w));
          }
        };

        let lastT = 0, lastBadge = 0;
        const step = ts => {
          if (!back.isConnected) return;
          if (!lastT) lastT = ts;
          const dt = isTalking() ? 0 : Math.min(64, ts - lastT) / 1000;   // everything waits while he talks to you
          lastT = ts;
          tick(dt);
          if (ts - lastBadge > 30000) { lastBadge = ts; updateBadge(); }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
      updateBadge();
    }

    // a koi pond with lily pads and a frog, below the well
    {
      const px = 84, py = wy + 112;
      const pond = sv("g", {}, svg);
      sv("ellipse", { cx: px, cy: py, rx: 56, ry: 21, fill: "#1b2748", stroke: "#4a5a8a", "stroke-width": 2.5 }, pond);
      sv("ellipse", { cx: px - 12, cy: py - 4, rx: 22, ry: 5, fill: "#2c3d6e", opacity: 0.7 }, pond);
      sv("circle", { cx: px + 22, cy: py - 5, r: 3.5, fill: "#efe6bd", opacity: 0.55 }, pond);
      [["#ff9a4d", 24, 5.5, 26], ["#f4efe6", 18, 4.5, 38]].forEach(([col, rx, ry, dur], k) => {
        const kg = sv("g", {}, pond);
        sv("ellipse", { cx: 0, cy: 0, rx: 5, ry: 2.2, fill: col }, kg);
        sv("path", { d: "M-4 0 L-8 -2.2 L-8 2.2 Z", fill: col }, kg);
        const kp = `M${px - rx} ${py + k * 2} A${rx} ${ry} 0 1 1 ${px + rx} ${py + k * 2} A${rx} ${ry} 0 1 1 ${px - rx} ${py + k * 2}`;
        if (reduce) kg.setAttribute("transform", `translate(${px - rx + 6} ${py + k * 2})`);
        else sv("animateMotion", { dur: dur + "s", repeatCount: "indefinite", path: kp, rotate: "auto" }, kg);
      });
      [[-30, 4, 8], [30, 8, 7], [8, -9, 6.5], [-12, 9, 6]].forEach(([dx, dy, r]) => {
        sv("ellipse", { cx: px + dx, cy: py + dy, rx: r, ry: r * 0.45, fill: "#4f8a5e" }, pond);
        sv("path", { d: `M${px + dx} ${py + dy} L${px + dx + r} ${py + dy - 1}`, stroke: "#1b2748", "stroke-width": 1 }, pond);
      });
      sv("circle", { cx: px + 30, cy: py + 5, r: 2.4, fill: "#f6a5c0" }, pond);
      const pt = sv("text", { x: px, y: py + 38, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 8, "font-style": "italic", fill: "#cbbfe0", opacity: 0.75 }, pond);
      pt.textContent = "the koi pond";
      const water = sv("ellipse", { cx: px, cy: py, rx: 56, ry: 21, fill: "transparent" }, pond);
      water.style.cursor = "pointer";
      water.addEventListener("click", () => say(pick(["The koi circle once, unimpressed.", "A koi surfaces, judges your tabs, and sinks again.", "Lily pads. Zero chapters. Total peace."])));
      const frog = sv("g", { transform: `translate(${px - 30} ${py + 2})` }, pond);
      const fj = sv("g", {}, frog);
      fj.setAttribute("class", "gg-anim");
      sv("ellipse", { cx: 0, cy: -2, rx: 4.5, ry: 3.2, fill: "#6fbf73" }, fj);
      [-2.2, 2.2].forEach(ex => { sv("circle", { cx: ex, cy: -5, r: 1.6, fill: "#6fbf73" }, fj); sv("circle", { cx: ex, cy: -5, r: 0.7, fill: "#10151f" }, fj); });
      const fh = sv("circle", { cx: 0, cy: -3, r: 10, fill: "transparent" }, frog);
      fh.style.cursor = "pointer";
      fh.addEventListener("click", e => {
        e.stopPropagation();
        say(pick(["Ribbit.", "Ribbit. (He has seen things.)", "The frog hops, lands on the same pad, and acts like that was the plan."]));
        fj.style.animation = "none"; void fj.getBoundingClientRect(); fj.style.animation = "ggHop .5s ease-out";
      });
    }

    // seasonal falling bits (leaves / petals) and the weather, drawn over everything and never tappable
    const overlay = sv("g", {}, svg);
    overlay.style.pointerEvents = "none";
    const wxG = sv("g", {}, overlay);
    const seasonG = sv("g", {}, overlay);
    if (!reduce && (season === "autumn" || season === "halloween" || season === "spring")) {
      const cols = season === "spring" ? ["#f6b6cc", "#fbd3e0", "#f09ab8"] : ["#d9731f", "#b5541a", "#e0a032", "#8a4a1e"];
      const N = Math.min(46, Math.round(H / 32));
      for (let i = 0; i < N; i++) {
        const p = sv("ellipse", { cx: (rnd("lx" + i) * W).toFixed(1), cy: (rnd("ly" + i) * H).toFixed(1), rx: 3, ry: 1.6, fill: cols[i % cols.length], opacity: 0.8 }, seasonG);
        anim(p, `animation:ggFall ${(6 + rnd("ld" + i) * 6).toFixed(1)}s linear -${(rnd("lz" + i) * 8).toFixed(1)}s infinite;`);
      }
    }
    const WX = [["clear", "\u2600\uFE0F clear"], ["rain", "\u{1F327}\uFE0F rain"], ["fog", "\u{1F32B}\uFE0F fog"], ["snow", "\u2744\uFE0F snow"]];
    const WX_SAY = { clear: "The sky clears.", rain: "Rain patters on the stones. Somewhere, distant thunder.", fog: "A thick fog rolls in between the graves.", snow: "Soft snow begins to fall." };
    let wxI = Math.max(0, Math.min(WX.length - 1, prefs.wx | 0));
    const paintWeather = () => {
      if (keeperOnWeather) keeperOnWeather();
      wxG.textContent = "";
      const kind = WX[wxI][0];
      if (kind === "rain" && !reduce) {
        const n = Math.min(190, Math.round(H / 8));
        for (let i = 0; i < n; i++) {
          const x = rnd("rx" + i) * (W + 20), y = rnd("ry" + i) * H;
          const l = sv("line", { x1: x.toFixed(1), y1: y.toFixed(1), x2: (x - 2.5).toFixed(1), y2: (y + 9).toFixed(1), stroke: "#a9bcff", "stroke-width": 1, opacity: 0.45 }, wxG);
          anim(l, `animation:ggRain ${(0.6 + rnd("rd" + i) * 0.5).toFixed(2)}s linear -${rnd("rs" + i).toFixed(2)}s infinite;`);
        }
        const fl = sv("rect", { x: 0, y: 0, width: W, height: H, fill: "#dfe6ff", opacity: 0 }, wxG);
        anim(fl, "animation:ggFlash 13s linear infinite;");
      } else if (kind === "snow" && !reduce) {
        const n = Math.min(130, Math.round(H / 12));
        for (let i = 0; i < n; i++) {
          const s = sv("circle", { cx: (rnd("nx" + i) * W).toFixed(1), cy: (rnd("ny" + i) * H).toFixed(1), r: (1 + rnd("nr" + i) * 1.4).toFixed(1), fill: "#fff", opacity: 0.85 }, wxG);
          anim(s, `animation:ggFall ${(5 + rnd("nd" + i) * 5).toFixed(1)}s linear -${(rnd("nz" + i) * 8).toFixed(1)}s infinite;`);
        }
      } else if (kind === "fog") {
        const n = Math.max(4, Math.round(H / 260));
        for (let i = 0; i < n; i++) {
          const f = sv("ellipse", { cx: (rnd("fx" + i) * W).toFixed(1), cy: ((i + 0.5) * H / n).toFixed(1), rx: 190, ry: 46, fill: "#c8bee6", opacity: 0.22 }, wxG);
          anim(f, `animation:ggMist ${(11 + i % 4 * 3)}s ease-in-out infinite;`);
        }
      }
    };

    // time of day: night, dusk, dawn
    const TIMES = [
      { label: "\u{1F319} night", bg: "linear-gradient(180deg,#0c0a1c 0%,#1a1330 45%,#231a38 100%)", stars: 1, orb: "#efe6bd", dy: 0, say: "Night again. The moon is out." },
      { label: "\u{1F307} dusk", bg: "linear-gradient(180deg,#2b1b4a 0%,#6a3566 35%,#a85a52 55%,#33203c 100%)", stars: 0.3, orb: "#ffb067", dy: 34, say: "Dusk. The lamps are just starting to matter." },
      { label: "\u{1F305} dawn", bg: "linear-gradient(180deg,#27356a 0%,#6e75b0 32%,#d9a0a0 55%,#42354f 100%)", stars: 0.12, orb: "#fff1c9", dy: 24, say: "Dawn. Even the graveyard looks hopeful." }
    ];
    let tI = Math.max(0, Math.min(TIMES.length - 1, prefs.tm | 0));
    const applyTime = () => {
      const t = TIMES[tI];
      box.style.background = t.bg;
      starG.setAttribute("opacity", t.stars);
      moonDisc.setAttribute("fill", t.orb);
      moonG.setAttribute("transform", `translate(0 ${t.dy})`);
      timeBtn.textContent = t.label;
    };

    // tools row, grave finder and random visit
    const tools = el("div", "flex:0 0 auto;display:flex;gap:6px;padding:7px 14px;overflow-x:auto;-webkit-overflow-scrolling:touch;border-bottom:1px solid rgba(190,170,255,0.12);background:rgba(8,6,22,0.4);z-index:3;");
    const pill = (label, title, fn) => {
      const b = el("button", "flex:0 0 auto;border:1px solid rgba(190,170,255,0.3);background:rgba(255,255,255,0.06);color:#e6dcf5;border-radius:999px;padding:5px 11px;font:500 12px/1 inherit;font-family:inherit;cursor:pointer;white-space:nowrap;", label);
      b.type = "button"; b.title = title; b.onclick = fn; tools.appendChild(b); return b;
    };
    const timeBtn = pill("", "Change the time of day", () => { tI = (tI + 1) % TIMES.length; prefs.tm = tI; savePrefs(); applyTime(); say(TIMES[tI].say); });
    const wxBtn = pill(WX[wxI][1], "Change the weather", () => { wxI = (wxI + 1) % WX.length; prefs.wx = wxI; savePrefs(); wxBtn.textContent = WX[wxI][1]; paintWeather(); say(WX_SAY[WX[wxI][0]]); });
    // Halloween on / off any time of year (October is automatic; this only stores an override)
    const hwBtn = pill("\u{1F383} halloween", hwOn ? "Halloween is on. Tap to turn it off" : "Halloween is off. Tap to turn it on", () => {
      const next = !hwOn;
      if (next === autoHw) delete prefs.hw; else prefs.hw = next;      // back to automatic when it matches what the month would do anyway
      savePrefs();
      close(); openGraveyardGrounds();                                  // rebuild the grounds with (or without) the pumpkins and bats
    });
    hwBtn.setAttribute("aria-pressed", hwOn ? "true" : "false");
    if (hwOn) { hwBtn.style.borderColor = "rgba(255,160,60,0.7)"; hwBtn.style.background = "rgba(255,140,30,0.26)"; }
    // the button under stroll hides or shows this whole bar (time, weather, Halloween, find, random, book) so more of the grounds fits on screen
    const applyScene = () => {
      const hide = prefs.sh === true;
      tools.style.display = hide ? "none" : "flex";
      sceneBtn.textContent = hide ? "\u{1F319} show scene" : "\u{1F319} hide scene";
      sceneBtn.title = hide ? "Show the buttons bar" : "Hide the buttons bar for a bigger view";
    };
    sceneBtn.onclick = () => { prefs.sh = !(prefs.sh === true); savePrefs(); applyScene(); if (prefs.sh === true) finder.style.display = "none"; };
    applyScene();
    const goTo = n => {
      stopStroll();
      const top = Math.max(0, n.gy * (field.clientWidth / W) - field.clientHeight / 2 + 20);
      field.scrollTo({ top, behavior: "smooth" });
      const ring = sv("rect", { x: n.gx - 6, y: n.gy - 8, width: 40, height: 62, rx: 12, fill: "none", stroke: "#ffd98a", "stroke-width": 1.5 }, svg);
      anim(ring, "animation:ggPulse .9s ease-in-out 4;");
      setTimeout(() => ring.remove(), 3800);
      if (picked !== n.mark) showCard(n.g, n.mark);
    };
    const finder = el("div", "flex:0 0 auto;display:none;padding:8px 14px 10px;border-bottom:1px solid rgba(190,170,255,0.12);background:rgba(8,6,22,0.45);z-index:3;");
    const fin = el("input", "width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid rgba(190,170,255,0.35);background:rgba(255,255,255,0.08);color:#e6dcf5;font-family:inherit;font-size:16px;outline:none;");
    fin.type = "search"; fin.placeholder = "find a grave by title\u2026";
    const finRes = el("div", "display:flex;flex-direction:column;gap:5px;margin-top:7px;max-height:150px;overflow-y:auto;");
    finder.appendChild(fin); finder.appendChild(finRes);
    fin.addEventListener("input", () => {
      const q = fin.value.trim().toLowerCase();
      finRes.textContent = "";
      if (!q) return;
      const hits = graveNodes.filter(n => (titleOf(n.g.f) + " " + String(n.g.f.author || "")).toLowerCase().includes(q)).slice(0, 8);
      if (!hits.length) { finRes.appendChild(el("div", "font-size:12px;opacity:0.6;", "No grave by that name.")); return; }
      hits.forEach(n => {
        const b = el("button", "text-align:left;cursor:pointer;font-family:inherit;font-size:12.5px;color:#e6dcf5;background:rgba(255,255,255,0.06);border:1px solid rgba(190,170,255,0.25);border-radius:8px;padding:6px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;", titleOf(n.g.f));
        b.type = "button"; b.onclick = () => goTo(n); finRes.appendChild(b);
      });
    });
    pill("\u{1F50D} find", "Find a grave by title", () => {
      const open = finder.style.display === "none";
      finder.style.display = open ? "block" : "none";
      if (open) fin.focus();
    });
    pill("\u{1F3B2} random", "Visit a random grave", () => goTo(pick(graveNodes)));
    pill("\u{1F4D6} book", "The visitors\u2019 book", showBook);
    box.insertBefore(tools, field);
    box.insertBefore(finder, field);

    applyTime(); paintWeather(); updateSub();
    if (month === 9 && now.getDate() === 31) say("Happy Halloween. Tonight, the graves are almost lively.");

    field.appendChild(svg);

    // ── stroll: wander down the path on your own; any touch stops it ──
    let pos = 0, last = 0;
    field.style.scrollBehavior = "auto";
    const strollStep = ts => {
      if (!strolling) return;
      if (!last) last = ts;
      const dt = Math.min(64, ts - last); last = ts;
      const max = field.scrollHeight - field.clientHeight;
      pos += dt * 0.045;                       // ~45px per second, kept as a float
      field.scrollTop = pos;
      if (pos >= max - 1) { stopStroll(); return; }
      raf = requestAnimationFrame(strollStep);
    };
    strollBtn.onclick = () => {
      if (strolling) { stopStroll(); return; }
      if (field.scrollTop >= field.scrollHeight - field.clientHeight - 2) field.scrollTop = 0;
      pos = field.scrollTop; last = 0;
      strolling = true; strollBtn.textContent = "\u23F8 pause";
      raf = requestAnimationFrame(strollStep);
    };
    ["touchstart", "wheel", "pointerdown"].forEach(ev => field.addEventListener(ev, () => { if (strolling) stopStroll(); }, { passive: true }));
    document.body.appendChild(back);
  }

  // ── ✦ FIC CONSTELLATION ──
  // A night sky where every tracked fic is a star: bigger = more words, colour =
  // status (active / finished / abandoned). Fics you logged on the same day are
  // joined by lines, and the layout pulls connected fics together so they form
  // little constellations. Nothing to do here but look; tap a star to read its name.
  // Read-only: it stores nothing. Reached from a faint link at the bottom of the tracker.
  function openConstellation() {
    const old = document.getElementById("ao3-constellation");
    if (old) old.remove();
    if (!document.getElementById("ao3-cn-css")) {
      const st = document.createElement("style");
      st.id = "ao3-cn-css";
      st.textContent = `
        @keyframes cnTwinkle{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes cnShoot{0%{transform:translate(0,0) rotate(28deg);opacity:0}3%{opacity:1}16%{transform:translate(280px,150px) rotate(28deg);opacity:0}100%{transform:translate(280px,150px) rotate(28deg);opacity:0}}
        @keyframes cnFade{from{opacity:0}to{opacity:1}}
        @media (prefers-reduced-motion: reduce){.nv-anim{animation:none !important}}
      `;
      (document.head || document.documentElement).appendChild(st);
    }
    nvEnsureCss(); // provides the .nv-anim reduced-motion rule
    const el = (tag, css, text) => {
      const e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (text != null) e.textContent = text;
      return e;
    };
    const NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs) => {
      const e = document.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
      return e;
    };
    const rnd = seed => { const x = Math.sin(gyHash(String(seed)) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const titleOf = f => f.title || `Work ${f.workId}`;

    // ── data: one star per tracked fic ──
    const fics = getTracked();
    const statusOf = f => f.finished ? "finished" : (isWip(f) ? "active" : "abandoned");
    const COL = { active: "#bcd6ff", finished: "#ffd36b", abandoned: "#9a8fc4" };
    const ids = new Set(fics.map(f => String(f.workId)));

    // same-day links from the reading log: each day's fics are chained in the order logged
    const edges = new Map(); // "a|b" -> number of shared days
    try {
      const log = JSON.parse(localStorage.getItem(READ_LOG_KEY) || "[]");
      const days = new Map(); // day -> [{ t, id }]
      if (Array.isArray(log)) log.forEach(e => {
        if (!e || !e.key || !e.date) return;
        const id = String(e.key).split("::")[0];
        if (!ids.has(id)) return;
        const day = String(e.date).slice(0, 10);
        if (!days.has(day)) days.set(day, []);
        days.get(day).push({ t: String(e.date), id });
      });
      days.forEach(list => {
        list.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
        const seq = [];
        list.forEach(x => { if (!seq.includes(x.id)) seq.push(x.id); });
        for (let i = 0; i + 1 < seq.length; i++) {
          const k = seq[i] < seq[i + 1] ? `${seq[i]}|${seq[i + 1]}` : `${seq[i + 1]}|${seq[i]}`;
          edges.set(k, (edges.get(k) || 0) + 1);
        }
      });
    } catch { /* corrupt log: just no lines */ }

    // ── layout: a small deterministic force simulation, so linked fics cluster ──
    const W = 400, H = 640, M = 26;
    const nodes = fics.map(f => {
      const words = f.words || 0;
      return {
        f, id: String(f.workId), status: statusOf(f),
        r: Math.min(10, 1.6 + Math.sqrt(words / 1000) * 0.5),
        x: M + rnd("px" + f.workId) * (W - 2 * M),
        y: M + rnd("py" + f.workId) * (H - 2 * M),
      };
    });
    const byId = new Map(nodes.map(n => [n.id, n]));
    const links = [];
    edges.forEach((w, k) => {
      const [a, b] = k.split("|");
      if (byId.has(a) && byId.has(b)) links.push({ a: byId.get(a), b: byId.get(b), w });
    });
    const IT = nodes.length > 160 ? 120 : 220;
    for (let it = 0; it < IT; it++) {
      const alpha = 1 - it / IT;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const A = nodes[i], B = nodes[j];
          let dx = B.x - A.x, dy = B.y - A.y;
          let d = Math.sqrt(dx * dx + dy * dy);
          if (d < 0.01) { dx = rnd("jx" + i + j) - 0.5; dy = rnd("jy" + i + j) - 0.5; d = Math.sqrt(dx * dx + dy * dy) || 1; }
          const minD = A.r + B.r + 9;
          let push = 0;
          if (d < 72) push += (72 - d) / 72 * 1.1 * alpha;
          if (d < minD) push += (minD - d) * 0.5;
          if (push) { const ux = dx / d, uy = dy / d; A.x -= ux * push; A.y -= uy * push; B.x += ux * push; B.y += uy * push; }
        }
      }
      links.forEach(l => {
        const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const pull = (d - (30 + l.a.r + l.b.r)) * 0.03 * alpha;
        const ux = dx / d, uy = dy / d;
        l.a.x += ux * pull; l.a.y += uy * pull; l.b.x -= ux * pull; l.b.y -= uy * pull;
      });
      nodes.forEach(n => {
        n.x += (W / 2 - n.x) * 0.004; n.y += (H / 2 - n.y) * 0.004;
        n.x = Math.max(M, Math.min(W - M, n.x)); n.y = Math.max(M, Math.min(H - M, n.y));
      });
    }

    // ── shell ──
    const back = el("div", "position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000002;");
    back.id = "ao3-constellation";
    const box = el("div", "position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:8px;right:8px;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;font-family:inherit;color:#e9e4f5;background:radial-gradient(ellipse at 50% 30%,#1b1740 0%,#0c0a22 60%,#05040f 100%);border:1px solid rgba(190,170,255,0.25);box-shadow:0 12px 40px rgba(0,0,0,0.6);");
    back.appendChild(box);

    const topbar = el("div", "position:relative;z-index:3;flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(190,170,255,0.18);background:rgba(8,6,22,0.55);");
    const ttl = el("div", "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;");
    ttl.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:15px;letter-spacing:0.08em;text-transform:uppercase;color:#d9d0f5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;", "✦ Fic Constellation"));
    ttl.appendChild(el("div", "font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.04em;color:rgba(217,208,245,0.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
      `${nodes.length} star${nodes.length === 1 ? "" : "s"} \u00B7 ${links.length} line${links.length === 1 ? "" : "s"}`));
    topbar.appendChild(ttl);
    const xBtn = el("button", "background:none;border:none;color:rgba(217,208,245,0.7);cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px;", "✕");
    topbar.appendChild(xBtn);
    box.appendChild(topbar);

    const sky = el("div", "position:relative;z-index:1;flex:1 1 auto;min-height:0;overflow:hidden;");
    box.appendChild(sky);

    const onKey = e => { if (e.key === "Escape") close(); };
    const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
    xBtn.onclick = close;
    back.addEventListener("click", e => { if (e.target === back) close(); });
    document.addEventListener("keydown", onKey);

    if (!nodes.length) {
      const empty = el("div", "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;");
      empty.appendChild(el("div", "font-size:34px;", "🌌"));
      empty.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#d9d0f5;margin-top:8px;", "The sky is empty."));
      empty.appendChild(el("div", "font-size:12px;color:rgba(217,208,245,0.6);margin-top:4px;", "Track a fic and its star will appear."));
      sky.appendChild(empty);
      document.body.appendChild(back);
      return;
    }

    // ── the sky itself ──
    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet" });
    svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
    const defs = sv("defs");
    Object.keys(COL).forEach(k => {
      const g = sv("radialGradient", { id: `cn-g-${k}` });
      g.appendChild(sv("stop", { offset: "0%", "stop-color": COL[k], "stop-opacity": "0.9" }));
      g.appendChild(sv("stop", { offset: "45%", "stop-color": COL[k], "stop-opacity": "0.28" }));
      g.appendChild(sv("stop", { offset: "100%", "stop-color": COL[k], "stop-opacity": "0" }));
      defs.appendChild(g);
    });
    svg.appendChild(defs);

    // faint background dust
    for (let i = 0; i < 70; i++) {
      const c = sv("circle", { cx: (rnd("dx" + i) * W).toFixed(1), cy: (rnd("dy" + i) * H).toFixed(1), r: (0.4 + rnd("dr" + i) * 0.7).toFixed(2), fill: "#fff" });
      c.setAttribute("opacity", (0.15 + rnd("do" + i) * 0.35).toFixed(2));
      svg.appendChild(c);
    }
    // lines first, so stars sit on top
    links.forEach(l => {
      const ln = sv("line", { x1: l.a.x.toFixed(1), y1: l.a.y.toFixed(1), x2: l.b.x.toFixed(1), y2: l.b.y.toFixed(1), stroke: "#cfc4ff", "stroke-linecap": "round" });
      ln.setAttribute("stroke-opacity", Math.min(0.7, 0.2 + l.w * 0.12).toFixed(2));
      ln.setAttribute("stroke-width", Math.min(1.6, 0.6 + l.w * 0.2).toFixed(2));
      svg.appendChild(ln);
    });

    const caption = el("div", "position:absolute;left:0;right:0;bottom:56px;text-align:center;padding:0 16px;pointer-events:none;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;color:#f3eeff;text-shadow:0 1px 6px #000;min-height:36px;");
    const showCaption = n => {
      if (!n) { caption.textContent = ""; return; }
      const w = n.f.words ? ` \u00B7 ${fmtWords(n.f.words)} words` : "";
      caption.textContent = `${titleOf(n.f)}${w} \u00B7 ${n.status}`;
      caption.style.animation = "none"; void caption.offsetWidth;
      caption.style.animation = "cnFade .4s ease both";
    };
    nodes.forEach((n, i) => {
      const col = COL[n.status];
      const g = sv("g");
      const glow = sv("circle", { cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: (n.r * 3.2).toFixed(1), fill: `url(#cn-g-${n.status})` });
      glow.setAttribute("class", "nv-anim");
      glow.style.animation = `cnTwinkle ${(2.6 + rnd("tw" + i) * 3).toFixed(1)}s ease-in-out ${(rnd("td" + i) * 3).toFixed(1)}s infinite`;
      g.appendChild(glow);
      if (n.r > 4.5) {
        // a little four-point sparkle on the big ones
        const s = n.r * 2.1;
        [["h", n.x - s, n.y, n.x + s, n.y], ["v", n.x, n.y - s, n.x, n.y + s]].forEach(([, x1, y1, x2, y2]) => {
          g.appendChild(sv("line", { x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1), stroke: col, "stroke-opacity": "0.55", "stroke-width": "0.7", "stroke-linecap": "round" }));
        });
      }
      const core = sv("circle", { cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: n.r.toFixed(1), fill: col });
      core.setAttribute("opacity", n.status === "abandoned" ? "0.7" : "1");
      g.appendChild(core);
      g.appendChild(sv("circle", { cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: (n.r * 0.45).toFixed(1), fill: "#fff" }));
      const hit = sv("circle", { cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: (n.r + 9).toFixed(1), fill: "transparent" });
      hit.style.cursor = "pointer";
      hit.addEventListener("click", e => { e.stopPropagation(); showCaption(n); });
      g.appendChild(hit);
      svg.appendChild(g);
    });
    svg.addEventListener("click", () => showCaption(null));
    sky.appendChild(svg);

    // an occasional shooting star
    sky.appendChild(el("span", "position:absolute;top:8%;left:6%;width:70px;height:1.5px;border-radius:2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.9));pointer-events:none;opacity:0;animation:cnShoot 16s ease-in 4s infinite;")).className = "nv-anim";
    sky.appendChild(caption);

    // quiet legend
    const legend = el("div", "position:absolute;left:0;right:0;bottom:10px;display:flex;justify-content:center;align-items:center;gap:14px;flex-wrap:wrap;padding:0 12px;pointer-events:none;font-size:10px;letter-spacing:0.04em;color:rgba(217,208,245,0.55);");
    [["active", "active"], ["finished", "finished"], ["abandoned", "abandoned"]].forEach(([k, label]) => {
      const it = el("span", "display:inline-flex;align-items:center;gap:5px;");
      it.appendChild(el("span", `display:inline-block;width:7px;height:7px;border-radius:50%;background:${COL[k]};opacity:${k === "abandoned" ? 0.7 : 1};`));
      it.appendChild(el("span", "", label));
      legend.appendChild(it);
    });
    legend.appendChild(el("span", "", "bigger = more words \u00B7 lines = read on the same day"));
    sky.appendChild(legend);

    document.body.appendChild(back);
  }

  // ── 📚 FIC BOOKSHELF ──
  // Every tracked fic is a book spine on a shelf: taller = more words, colour = status
  // (gold/red finished, blue-green still reading, dusty grey abandoned). Tap a spine and
  // it slides out a little with its title below. Read-only: it stores nothing.
  // Reached from a faint link at the bottom of the tracker, next to "constellation".
  function openBookshelf() {
    const old = document.getElementById("ao3-bookshelf");
    if (old) old.remove();
    const el = (tag, css, text) => {
      const e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (text != null) e.textContent = text;
      return e;
    };
    const titleOf = f => f.title || `Work ${f.workId}`;
    const statusOf = f => f.finished ? "finished" : (isWip(f) ? "active" : "abandoned");
    const PAL = {
      finished:  ["#8c2f39", "#b5483f", "#c28a3a", "#7a4e2d", "#9b5b6e"],
      active:    ["#2f6f73", "#3d5a80", "#4f7c6b", "#5b7fa6", "#386fa4"],
      abandoned: ["#6e6a85", "#7b6f8f", "#5f5a6e", "#85808f"]
    };
    const ORDER = { finished: 0, active: 1, abandoned: 2 };
    const h32 = x => Math.abs(Math.floor(gyHash(String(x))));
    const books = getTracked().map(f => {
      const st = statusOf(f), hv = h32(f.workId || titleOf(f));
      const words = Number(f.words) || 0;
      const hgt = words > 0 ? 84 + Math.round(86 * Math.min(1, Math.log10(words + 1) / 6)) : 110;
      return { f, st, title: titleOf(f), words, h: hgt, w: 22 + (hv % 13),
               color: PAL[st][hv % PAL[st].length], band: (hv >> 3) % 2 === 0 };
    }).sort((a, b) => ORDER[a.st] - ORDER[b.st]);

    const back = el("div", "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000002;");
    back.id = "ao3-bookshelf";
    const box = el("div", "position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:8px;right:8px;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;font-family:inherit;color:#f6e9d6;background:linear-gradient(180deg,#34241b,#241812);box-shadow:0 10px 40px rgba(0,0,0,0.5);");
    back.appendChild(box);

    const topbar = el("div", "flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(246,233,214,0.15);");
    const ttl = el("div", "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;");
    ttl.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:15px;letter-spacing:0.08em;text-transform:uppercase;color:#f6e9d6;", "\u{1F4DA} Fic Bookshelf"));
    ttl.appendChild(el("div", "font-size:10px;letter-spacing:0.04em;color:rgba(246,233,214,0.6);", `${books.length} book${books.length === 1 ? "" : "s"}`));
    topbar.appendChild(ttl);
    const xBtn = el("button", "background:none;border:none;color:rgba(246,233,214,0.7);cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px;", "\u2715");
    topbar.appendChild(xBtn);
    box.appendChild(topbar);

    const shelves = el("div", "flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:18px 10px 8px;");
    box.appendChild(shelves);
    const caption = el("div", "flex:0 0 auto;min-height:54px;padding:8px 14px calc(8px + 2px);text-align:center;border-top:1px solid rgba(246,233,214,0.15);font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;display:flex;flex-direction:column;justify-content:center;gap:2px;");
    caption.appendChild(el("div", "", books.length ? "tap a book" : ""));
    caption.appendChild(el("div", "font-style:normal;font-family:inherit;font-size:10px;color:rgba(246,233,214,0.55);", "taller = more words \u00B7 gold/red finished \u00B7 blue-green reading \u00B7 grey abandoned"));
    box.appendChild(caption);

    const onKey = e => { if (e.key === "Escape") close(); };
    const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
    xBtn.onclick = close;
    back.addEventListener("click", e => { if (e.target === back) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(back);

    if (!books.length) {
      const empty = el("div", "text-align:center;padding:50px 24px;");
      empty.appendChild(el("div", "font-size:34px;", "\u{1F4DA}"));
      empty.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-size:15px;margin-top:8px;", "The shelf is empty."));
      empty.appendChild(el("div", "font-size:12px;color:rgba(246,233,214,0.6);margin-top:4px;", "Track a fic and its book will appear."));
      shelves.appendChild(empty);
      return;
    }

    // fill each shelf row up to the available width
    const avail = Math.max(200, shelves.clientWidth - 36);
    const rows = []; let cur = [], used = 0;
    books.forEach(b => {
      if (cur.length && used + b.w + 3 > avail) { rows.push(cur); cur = []; used = 0; }
      cur.push(b); used += b.w + 3;
    });
    if (cur.length) rows.push(cur);

    let picked = null;
    const pick = (b, spine) => {
      if (picked) picked.style.transform = "";
      if (picked === spine) { picked = null; caption.firstChild.textContent = "tap a book"; return; }
      picked = spine; spine.style.transform = "translateY(-12px)";
      const label = { finished: "finished", active: "still reading", abandoned: "abandoned" }[b.st];
      caption.firstChild.textContent = `${b.title} \u00B7 ${label}${b.words ? " \u00B7 " + b.words.toLocaleString() + " words" : ""}`;
    };
    rows.forEach(r => {
      const row = el("div", "margin-bottom:20px;");
      const line = el("div", "display:flex;align-items:flex-end;justify-content:center;gap:3px;padding:0 8px;");
      r.forEach(b => {
        const spine = el("div", `position:relative;flex:0 0 auto;width:${b.w}px;height:${b.h}px;border-radius:3px 3px 1px 1px;cursor:pointer;overflow:hidden;background:linear-gradient(90deg,rgba(0,0,0,0.28),rgba(255,255,255,0.14) 22%,rgba(0,0,0,0.22)),${b.color};transition:transform 0.18s;box-shadow:0 1px 3px rgba(0,0,0,0.4);`);
        spine.title = b.title;
        if (b.band) spine.appendChild(el("div", "position:absolute;left:0;right:0;top:9px;height:3px;background:rgba(246,233,214,0.55);"));
        spine.appendChild(el("div", "position:absolute;left:0;right:0;top:18px;bottom:6px;writing-mode:vertical-rl;font-family:Georgia,'Times New Roman',serif;font-size:10px;line-height:" + b.w + "px;text-align:left;color:#fdf3e0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0;", b.title));
        spine.onclick = () => pick(b, spine);
        line.appendChild(spine);
      });
      row.appendChild(line);
      row.appendChild(el("div", "height:9px;border-radius:2px;background:linear-gradient(180deg,#8a6244,#5e402a);box-shadow:0 4px 8px rgba(0,0,0,0.45);"));
      shelves.appendChild(row);
    });
  }

  // ── 🌷 FIC GARDEN ──
  // Every tracked fic is a plant in a little garden. A WIP grows taller the further you've read
  // (sprout, then bud), a finished fic is in full bloom, and an abandoned one droops. Tap a plant
  // for its title and progress; "water" sends a short rain shower. Just for show: nothing is stored.
  // Reached from a faint link at the bottom of the tracker, next to "constellation".
  function openGarden() {
    const old = document.getElementById("ao3-garden");
    if (old) old.remove();
    nvEnsureCss(); // provides the .nv-anim reduced-motion rule
    if (!document.getElementById("ao3-gd-css")) {
      const st = document.createElement("style");
      st.id = "ao3-gd-css";
      st.textContent = `
        @keyframes gdSway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
        @keyframes gdRain{0%{transform:translateY(-20px);opacity:0}15%{opacity:.9}100%{transform:translateY(105vh);opacity:0}}
        @keyframes gdPerk{0%,100%{transform:scale(1)}40%{transform:scale(1.12,1.06)}}
      `;
      (document.head || document.documentElement).appendChild(st);
    }
    const el = (tag, css, text) => {
      const e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (text != null) e.textContent = text;
      return e;
    };
    const NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs) => {
      const e = document.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
      return e;
    };
    const titleOf = f => f.title || `Work ${f.workId}`;
    const h32 = x => Math.abs(Math.floor(gyHash(String(x))));
    const PETALS = ["#f29bb5", "#f7b267", "#c9a7eb", "#f4d35e", "#ee8572", "#9ad1d4", "#ff9fc2"];
    const ORDER = { finished: 0, active: 1, abandoned: 2 };
    const plants = getTracked().map(f => {
      const st = f.finished ? "finished" : (isWip(f) ? "active" : "abandoned");
      const total = Number(f.totalChapters) || 0;
      let read = 0; try { read = Number(readChapterFor(f)) || 0; } catch (e) { read = 0; }
      const p = st === "finished" ? 1 : (total ? Math.max(0.1, Math.min(1, read / total)) : 0.45);
      const hv = h32(f.workId || titleOf(f));
      return { f, st, p, read, total, title: titleOf(f), color: PETALS[hv % PETALS.length], hv };
    }).sort((a, b) => ORDER[a.st] - ORDER[b.st]);

    const drawPlant = pl => {
      const svg = sv("svg", { viewBox: "0 0 72 110" });
      svg.style.cssText = "width:100%;height:auto;display:block;overflow:visible;";
      const dead = pl.st === "abandoned";
      const stemC = dead ? "#9a8c63" : "#5c9a62", leafC = dead ? "#a89a72" : "#78b87a";
      svg.appendChild(sv("ellipse", { cx: 36, cy: 101, rx: 26, ry: 6, fill: "#7a5638" }));
      svg.appendChild(sv("ellipse", { cx: 36, cy: 99, rx: 20, ry: 4, fill: "#946b47" }));
      const g = sv("g");
      if (!dead) { g.style.cssText = `transform-origin:36px 100px;animation:gdSway ${(3.4 + (pl.hv % 20) / 10).toFixed(1)}s ease-in-out infinite;`; g.setAttribute("class", "nv-anim"); }
      const top = 100 - (20 + 62 * pl.p);
      const tipX = dead ? 56 : 36, tipY = dead ? top + 18 : top;
      g.appendChild(sv("path", { d: `M36 100 Q36 ${(100 + top) / 2} ${tipX} ${tipY}`, stroke: stemC, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }));
      const nLeaves = pl.p > 0.7 ? 3 : (pl.p > 0.35 ? 2 : 1);
      for (let i = 0; i < nLeaves; i++) {
        const ly = 94 - i * ((100 - top) / (nLeaves + 0.6)), side = i % 2 ? 1 : -1;
        const lx = 36 + (dead ? i * 4 : 0);
        g.appendChild(sv("ellipse", { cx: lx + side * 8, cy: ly, rx: 8, ry: 3.6, fill: leafC,
          transform: `rotate(${dead ? side * 50 : side * -28} ${lx + side * 8} ${ly})` }));
      }
      if (pl.st === "finished") {
        for (let i = 0; i < 6; i++) g.appendChild(sv("ellipse", { cx: tipX, cy: tipY - 9, rx: 5, ry: 9, fill: pl.color,
          transform: `rotate(${i * 60} ${tipX} ${tipY})`, opacity: 0.95 }));
        g.appendChild(sv("circle", { cx: tipX, cy: tipY, r: 5, fill: "#f6c453" }));
      } else if (!dead && pl.p >= 0.55) {
        g.appendChild(sv("ellipse", { cx: tipX, cy: tipY - 5, rx: 5, ry: 8, fill: pl.color }));
        g.appendChild(sv("path", { d: `M${tipX - 5} ${tipY + 1} Q${tipX} ${tipY + 7} ${tipX + 5} ${tipY + 1}`, fill: leafC }));
      } else if (!dead) {
        g.appendChild(sv("ellipse", { cx: tipX - 5, cy: tipY - 2, rx: 6, ry: 3.2, fill: leafC, transform: `rotate(-30 ${tipX - 5} ${tipY - 2})` }));
        g.appendChild(sv("ellipse", { cx: tipX + 5, cy: tipY - 2, rx: 6, ry: 3.2, fill: leafC, transform: `rotate(30 ${tipX + 5} ${tipY - 2})` }));
      } else {
        [[-6, 6, 20], [2, 9, -10], [9, 4, -40]].forEach(([dx, dy, rot]) =>
          g.appendChild(sv("ellipse", { cx: tipX + dx, cy: tipY + dy, rx: 3.4, ry: 7, fill: "#b9a58c", transform: `rotate(${rot} ${tipX + dx} ${tipY + dy})`, opacity: 0.9 })));
      }
      svg.appendChild(g);
      return svg;
    };

    const back = el("div", "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000002;");
    back.id = "ao3-garden";
    const box = el("div", "position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:8px;right:8px;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;font-family:inherit;color:#3b4a3a;background:linear-gradient(180deg,#d4ecf7 0%,#f6efd9 70%,#e5d7b4 100%);box-shadow:0 10px 40px rgba(0,0,0,0.4);");
    back.appendChild(box);
    const topbar = el("div", "flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(59,74,58,0.15);background:rgba(255,255,255,0.35);");
    const ttl = el("div", "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;");
    ttl.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:15px;letter-spacing:0.08em;text-transform:uppercase;", "\u{1F337} Fic Garden"));
    const cnt = { finished: 0, active: 0, abandoned: 0 }; plants.forEach(p => cnt[p.st]++);
    ttl.appendChild(el("div", "font-size:10px;letter-spacing:0.04em;opacity:0.7;", `${cnt.finished} in bloom \u00B7 ${cnt.active} growing \u00B7 ${cnt.abandoned} drooping`));
    topbar.appendChild(ttl);
    const waterBtn = el("button", "flex:0 0 auto;border:1.5px solid rgba(59,74,58,0.3);background:rgba(255,255,255,0.6);color:inherit;border-radius:999px;padding:5px 12px;font:600 12px/1 inherit;font-family:inherit;cursor:pointer;", "\u{1F4A7} water");
    const xBtn = el("button", "background:none;border:none;color:inherit;opacity:0.7;cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px;", "\u2715");
    topbar.appendChild(waterBtn); topbar.appendChild(xBtn);
    box.appendChild(topbar);

    const field = el("div", "position:relative;flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 8px 8px;");
    box.appendChild(field);
    const caption = el("div", "flex:0 0 auto;min-height:54px;padding:8px 14px;text-align:center;border-top:1px solid rgba(59,74,58,0.15);background:rgba(255,255,255,0.35);font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;display:flex;flex-direction:column;justify-content:center;gap:2px;");
    caption.appendChild(el("div", "", plants.length ? "tap a plant" : ""));
    caption.appendChild(el("div", "font-style:normal;font-family:inherit;font-size:10px;opacity:0.6;", "taller = further read \u00B7 flower = finished \u00B7 bud/sprout = reading \u00B7 droopy = abandoned"));
    box.appendChild(caption);

    const onKey = e => { if (e.key === "Escape") close(); };
    const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
    xBtn.onclick = close;
    back.addEventListener("click", e => { if (e.target === back) close(); });
    document.addEventListener("keydown", onKey);

    if (!plants.length) {
      const empty = el("div", "text-align:center;padding:50px 24px;");
      empty.appendChild(el("div", "font-size:34px;", "\u{1F331}"));
      empty.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-size:15px;margin-top:8px;", "The garden is empty."));
      empty.appendChild(el("div", "font-size:12px;opacity:0.65;margin-top:4px;", "Track a fic and a seedling will pop up."));
      field.appendChild(empty);
    } else {
      const grid = el("div", "display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:6px 4px;");
      let picked = null;
      plants.forEach(pl => {
        const cell = el("div", "cursor:pointer;padding:2px;border-radius:10px;transition:background 0.15s;");
        cell.title = pl.title;
        cell.appendChild(drawPlant(pl));
        cell.onclick = () => {
          if (picked) picked.style.background = "";
          if (picked === cell) { picked = null; caption.firstChild.textContent = "tap a plant"; return; }
          picked = cell; cell.style.background = "rgba(255,255,255,0.55)";
          const label = { finished: "in full bloom", active: "growing", abandoned: "drooping" }[pl.st];
          const prog = pl.st === "finished" ? "" : (pl.total ? ` \u00B7 ch ${pl.read}/${pl.total}` : (pl.read ? ` \u00B7 ch ${pl.read}` : ""));
          caption.firstChild.textContent = `${pl.title} \u00B7 ${label}${prog}`;
        };
        grid.appendChild(cell);
      });
      field.appendChild(grid);
    }

    waterBtn.onclick = () => {
      if (!plants.length) return;
      const rain = el("div", "position:absolute;left:0;right:0;top:0;height:0;pointer-events:none;z-index:5;");
      for (let i = 0; i < 28; i++) {
        const d = el("div", `position:absolute;left:${(Math.random() * 100).toFixed(1)}%;top:0;width:2px;height:12px;border-radius:2px;background:#6fb4e6;opacity:0;animation:gdRain ${(0.9 + Math.random() * 0.8).toFixed(2)}s ${(Math.random() * 0.9).toFixed(2)}s linear forwards;`);
        d.className = "nv-anim"; rain.appendChild(d);
      }
      box.appendChild(rain);
      field.querySelectorAll("svg").forEach(s => { s.style.animation = "gdPerk 0.6s ease-in-out 1.1s 1"; s.classList.add("nv-anim"); });
      setTimeout(() => { rain.remove(); field.querySelectorAll("svg").forEach(s => { s.style.animation = ""; }); }, 2700);
    };
    document.body.appendChild(back);
  }

  // ── 🪟 STAINED GLASS ──
  // The old stand-alone stained-glass page is now the big window inside the chapel (scenes/chapel.js).
  // The name stays so existing buttons keep working.
  function openStainedGlass() { return openChapel(); }

  // ── 🐠 FIC AQUARIUM ──
  // Every tracked fic is a little fish. Lively = a WIP that's updating on schedule,
  // slow = a WIP that's gone quiet for a while (about 2.5x its usual gap, min. 21 days),
  // finished = cruises calmly in open water, abandoned = asleep on the sand.
  // Bigger fish = more words. Tap a fish for its title; "feed" sprinkles flakes that
  // the swimmers chase. "hide finished" takes the finished fish out of the tank (that one
  // preference is remembered). Otherwise it's all for show: nothing else is stored or changed.
  // Reached from a faint link at the bottom of the tracker, next to "constellation".
  function openAquarium() {
    const old = document.getElementById("ao3-aquarium");
    if (old) old.remove();
    nvEnsureCss(); // provides the .nv-anim reduced-motion rule
    if (!document.getElementById("ao3-aq-css")) {
      const st = document.createElement("style");
      st.id = "ao3-aq-css";
      st.textContent = `
        @keyframes aqRay{0%,100%{opacity:.04}50%{opacity:.16}}
        @keyframes aqFade{from{opacity:0}to{opacity:1}}
        @media (prefers-reduced-motion: reduce){.nv-anim{animation:none !important}}
      `;
      (document.head || document.documentElement).appendChild(st);
    }
    let reduced = false;
    try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
    const calm = reduced ? 0.35 : 1;

    const el = (tag, css, text) => {
      const e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (text != null) e.textContent = text;
      return e;
    };
    const NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs) => {
      const e = document.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
      return e;
    };
    const rnd = seed => { const x = Math.sin(gyHash(String(seed)) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const titleOf = f => f.title || `Work ${f.workId}`;

    // ── who swims how ──
    const kindOf = f => {
      if (f.finished) return "finished";
      if (!isWip(f)) return "abandoned";
      const d = daysSince(f.lastUpdate);
      const lim = Math.max(21, (f.avgUpdateDays || 0) * 2.5);
      return (d != null && d >= lim) ? "slow" : "lively";
    };
    const PAL = {
      lively: ["#ff8a65", "#ffb74d", "#ff7eb6", "#4dd0e1", "#a5d6a7", "#ffd54f"],
      slow: ["#8fa9c9", "#9db4c0", "#a8b5d6", "#9fb8b0"],
      finished: ["#ffd36b", "#ffc23d", "#ffe08a"],
      abandoned: ["#7d7a9a", "#8a8aa3", "#76809a"],
    };
    const SPEED = { lively: [48, 82], slow: [9, 17], finished: [22, 34], abandoned: [0, 0] };   // px per second
    const HOLD  = { lively: [1.2, 3], slow: [5, 9], finished: [3, 6] };                         // seconds between new targets
    const LABEL = { lively: "swimming", slow: "drifting", finished: "finished", abandoned: "resting" };

    const fics = getTracked();
    const fish = fics.map(f => {
      const kind = kindOf(f);
      const [a, b] = SPEED[kind];
      return {
        f, kind,
        L: Math.min(46, 16 + Math.sqrt((f.words || 0) / 1000) * 2.2),
        color: PAL[kind][gyHash("c" + f.workId) % PAL[kind].length],
        speed: (a + rnd("sp" + f.workId) * (b - a)) * calm,
        x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, next: 0, lookAt: 0,
        dir: rnd("d" + f.workId) < 0.5 ? 1 : -1,
        ph: rnd("ph" + f.workId) * 6.28,
        g: null, tail: null, chase: null,
      };
    });
    const count = k => fish.filter(x => x.kind === k).length;

    // ── shell ──
    const back = el("div", "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000002;");
    back.id = "ao3-aquarium";
    const box = el("div", "position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:8px;right:8px;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;font-family:inherit;color:#e8f6ff;background:linear-gradient(180deg,#0f4c75 0%,#0b3a5e 45%,#07223d 100%);border:1px solid rgba(160,220,255,0.28);box-shadow:0 12px 40px rgba(0,0,0,0.6);");
    back.appendChild(box);

    const topbar = el("div", "position:relative;z-index:3;flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(160,220,255,0.2);background:rgba(4,22,40,0.5);");
    const ttl = el("div", "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;");
    ttl.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:15px;letter-spacing:0.08em;text-transform:uppercase;color:#d6f0ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;", "🐠 Fic Aquarium"));
    const subEl = el("div", "font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.04em;color:rgba(214,240,255,0.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
      `${fish.length} fish \u00B7 ${count("lively")} lively`);
    ttl.appendChild(subEl);
    topbar.appendChild(ttl);
    const tbRight = el("div", "display:flex;align-items:center;gap:8px;flex:0 0 auto;");
    const feedBtn = el("button", "cursor:pointer;font:inherit;font-size:10px;border-radius:999px;padding:2px 8px;border:none;background:none;color:rgba(214,240,255,0.65);white-space:nowrap;", "feed");
    feedBtn.type = "button";
    feedBtn.title = "Sprinkle some flakes";
    const xBtn = el("button", "background:none;border:none;color:rgba(214,240,255,0.8);cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px;", "✕");
    // Hide/show the finished fics (remembered, since it's a display preference).
    const HIDE_KEY = "ao3_aquarium_hide_finished";
    let hideFinished = false;
    try { hideFinished = localStorage.getItem(HIDE_KEY) === "1"; } catch {}
    const finBtn = el("button", "cursor:pointer;font:inherit;font-size:10px;border-radius:999px;padding:2px 8px;border:none;background:none;color:rgba(214,240,255,0.65);white-space:nowrap;", "");
    finBtn.type = "button";
    if (!count("finished")) finBtn.style.display = "none";
    tbRight.appendChild(xBtn);
    topbar.appendChild(tbRight);
    box.appendChild(topbar);

    const sky = el("div", "position:relative;z-index:1;flex:1 1 auto;min-height:0;overflow:hidden;");
    box.appendChild(sky);
    // "hide finished" and "feed" sit in a quiet row at the top of the water, so the title keeps its room
    const controls = el("div", "position:absolute;left:0;right:0;top:6px;display:flex;justify-content:center;align-items:center;gap:14px;z-index:3;pointer-events:none;");
    finBtn.style.pointerEvents = "auto"; feedBtn.style.pointerEvents = "auto";
    controls.appendChild(finBtn); controls.appendChild(feedBtn);
    sky.appendChild(controls);

    let raf = 0;
    const onResize = () => { measure(); };
    const onKey = e => { if (e.key === "Escape") close(); };
    const close = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKey);
      back.remove();
    };
    xBtn.onclick = close;
    back.addEventListener("click", e => { if (e.target === back) close(); });
    document.addEventListener("keydown", onKey);

    if (!fish.length) {
      const empty = el("div", "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;");
      empty.appendChild(el("div", "font-size:34px;", "🫧"));
      empty.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#d6f0ff;margin-top:8px;", "An empty tank."));
      empty.appendChild(el("div", "font-size:12px;color:rgba(214,240,255,0.65);margin-top:4px;", "Track a fic and a fish will move in."));
      sky.appendChild(empty);
      feedBtn.style.display = "none"; finBtn.style.display = "none";
      document.body.appendChild(back);
      return;
    }

    // ── the tank ──
    let W = 400, H = 600, floorY = H - 30;
    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });
    svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:manipulation;";
    const scn = sv("g");        // rays, kelp, sand (rebuilt on resize)
    const fishLayer = sv("g");
    const flakeLayer = sv("g");
    const bubbleLayer = sv("g");
    svg.appendChild(scn); svg.appendChild(fishLayer); svg.appendChild(flakeLayer); svg.appendChild(bubbleLayer);
    sky.appendChild(svg);

    const caption = el("div", "position:absolute;left:0;right:0;bottom:46px;text-align:center;padding:0 16px;pointer-events:none;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;color:#f4fbff;text-shadow:0 1px 6px rgba(0,0,0,0.8);min-height:36px;");
    sky.appendChild(caption);
    let capTimer = 0;
    const say = (text, ms) => {
      caption.textContent = text || "";
      caption.style.animation = "none"; void caption.offsetWidth;
      if (text) caption.style.animation = "aqFade .4s ease both";
      clearTimeout(capTimer);
      if (text && ms) capTimer = setTimeout(() => { if (caption.textContent === text) caption.textContent = ""; }, ms);
    };

    // quiet legend along the top of the water
    const legend = el("div", "position:absolute;left:0;right:0;top:32px;display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap;padding:0 12px;pointer-events:none;font-size:10px;letter-spacing:0.04em;color:rgba(214,240,255,0.6);z-index:2;");
    [["lively", "lively"], ["slow", "slow"], ["finished", "finished"], ["abandoned", "resting"]].forEach(([k, label]) => {
      const it = el("span", "display:inline-flex;align-items:center;gap:5px;");
      it.appendChild(el("span", `display:inline-block;width:7px;height:7px;border-radius:50%;background:${PAL[k][0]};`));
      it.appendChild(el("span", "", label));
      legend.appendChild(it);
    });
    legend.appendChild(el("span", "", "bigger = more words"));
    sky.appendChild(legend);

    // scenery: light rays, kelp, sand. Rebuilt whenever the tank is resized.
    const kelp = [];
    const buildScenery = () => {
      scn.innerHTML = ""; kelp.length = 0;
      floorY = H - 30;
      for (let i = 0; i < 3; i++) {
        const x0 = W * (0.15 + i * 0.32 + rnd("ray" + i) * 0.08);
        const ray = sv("polygon", { points: `${x0 - 14},0 ${x0 + 22},0 ${x0 + 90},${floorY} ${x0 + 20},${floorY}`, fill: "#bfe9ff" });
        ray.setAttribute("opacity", "0.06");
        ray.setAttribute("class", "nv-anim");
        ray.style.animation = `aqRay ${(7 + i * 2.3).toFixed(1)}s ease-in-out ${(i * 1.7).toFixed(1)}s infinite`;
        scn.appendChild(ray);
      }
      const nKelp = Math.max(4, Math.round(W / 70));
      for (let i = 0; i < nKelp; i++) {
        const x = (i + 0.3 + rnd("kx" + i) * 0.5) * (W / nKelp);
        const h = 60 + rnd("kh" + i) * 90;
        const outer = sv("g", { transform: `translate(${x.toFixed(1)} ${floorY + 4})` });
        const inner = sv("g");
        const d = `M0 0 C -9 ${(-h * 0.25).toFixed(0)}, 9 ${(-h * 0.55).toFixed(0)}, 0 ${(-h * 0.75).toFixed(0)} S -7 ${(-h * 0.95).toFixed(0)}, 0 ${(-h).toFixed(0)}`;
        inner.appendChild(sv("path", { d, fill: "none", stroke: i % 2 ? "#2e8b57" : "#3aa56a", "stroke-width": "4.5", "stroke-linecap": "round", "stroke-opacity": "0.85" }));
        outer.appendChild(inner);
        scn.appendChild(outer);
        kelp.push({ inner, ph: rnd("kp" + i) * 6.28, amp: 3 + rnd("ka" + i) * 4 });
      }
      let pts = `0,${H}`;
      for (let x = 0; x <= W + 20; x += 20) pts += ` ${x},${(floorY + 8 + Math.sin(x * 0.045) * 3).toFixed(1)}`;
      pts += ` ${W},${H}`;
      scn.appendChild(sv("polygon", { points: pts, fill: "#b99b6b" }));
      scn.appendChild(sv("rect", { x: 0, y: H - 10, width: W, height: 10, fill: "#8d7549" }));
      for (let i = 0; i < Math.round(W / 38); i++) {
        scn.appendChild(sv("ellipse", { cx: (rnd("pb" + i) * W).toFixed(1), cy: (floorY + 14 + rnd("pc" + i) * 10).toFixed(1), rx: (2 + rnd("pr" + i) * 3).toFixed(1), ry: "1.8", fill: i % 2 ? "#d9c08f" : "#7d6a45" }));
      }
    };

    // fish artwork, drawn facing right around (0,0)
    const drawFish = fi => {
      const { L, color } = fi;
      const g = sv("g");
      const tail = sv("g");
      tail.appendChild(sv("path", { d: `M ${-L * 0.26} 0 L ${-L * 0.6} ${-L * 0.25} Q ${-L * 0.5} 0 ${-L * 0.6} ${L * 0.25} Z`, fill: color }));
      g.appendChild(tail);
      g.appendChild(sv("path", { d: `M ${-L * 0.08} ${-L * 0.2} Q ${L * 0.05} ${-L * 0.45} ${L * 0.2} ${-L * 0.2} Z`, fill: color, "fill-opacity": "0.8" }));
      g.appendChild(sv("ellipse", { cx: 0, cy: 0, rx: L * 0.38, ry: L * 0.24, fill: color }));
      if (gyHash("s" + fi.f.workId) % 3 === 0) {
        g.appendChild(sv("path", { d: `M ${L * 0.06} ${-L * 0.21} Q ${L * 0.02} 0 ${L * 0.06} ${L * 0.21}`, stroke: "#fff", "stroke-opacity": "0.35", "stroke-width": Math.max(1, L * 0.06).toFixed(1), fill: "none" }));
      }
      g.appendChild(sv("ellipse", { cx: L * 0.02, cy: L * 0.08, rx: L * 0.28, ry: L * 0.09, fill: "#fff", "fill-opacity": "0.22" }));
      const er = Math.max(1.4, L * 0.06);
      if (fi.kind === "abandoned") {
        // asleep: a closed eye
        g.appendChild(sv("path", { d: `M ${L * 0.22 - er} ${-L * 0.04} Q ${L * 0.22} ${-L * 0.04 + er} ${L * 0.22 + er} ${-L * 0.04}`, stroke: "#12202b", "stroke-width": "1.2", fill: "none", "stroke-linecap": "round" }));
        g.setAttribute("opacity", "0.82");
      } else {
        g.appendChild(sv("circle", { cx: L * 0.22, cy: -L * 0.04, r: er, fill: "#fff" }));
        g.appendChild(sv("circle", { cx: L * 0.235, cy: -L * 0.04, r: Math.max(0.8, L * 0.03), fill: "#12202b" }));
      }
      const hit = sv("circle", { cx: 0, cy: 0, r: Math.max(L * 0.55, 15), fill: "transparent" });
      hit.style.cursor = "pointer";
      hit.addEventListener("click", e => {
        e.stopPropagation();
        const w = fi.f.words ? ` \u00B7 ${fmtWords(fi.f.words)} words` : "";
        say(`${titleOf(fi.f)}${w} \u00B7 ${LABEL[fi.kind]}`, 5000);
        for (let i = 0; i < 3; i++) spawnBubble(fi.x + fi.dir * fi.L * 0.4, fi.y - 2);
      });
      g.appendChild(hit);
      fi.g = g; fi.tail = tail;
      fishLayer.appendChild(g);
    };
    fish.forEach(drawFish);
    const paintFinished = () => {
      fish.forEach(fi => {
        if (fi.kind !== "finished") return;
        fi.hidden = hideFinished;
        fi.g.style.display = hideFinished ? "none" : "";
        if (hideFinished) fi.chase = null;
      });
      finBtn.textContent = hideFinished ? "show finished" : "hide finished";
      finBtn.title = hideFinished ? "Let the finished fics back into the tank" : "Take the finished fics out of the tank";
      subEl.textContent = `${fish.filter(x => !x.hidden).length} fish \u00B7 ${count("lively")} lively`;
    };
    finBtn.onclick = () => {
      hideFinished = !hideFinished;
      try { localStorage.setItem(HIDE_KEY, hideFinished ? "1" : "0"); } catch {}
      paintFinished();
      say("", 0);
    };
    paintFinished();
    svg.addEventListener("click", () => say("", 0));

    // ── bubbles ──
    const bubbles = [];
    const spawnBubble = (x, y) => {
      if (bubbles.length > 45) return;
      const r = 1.5 + Math.random() * 2.5;
      const c = sv("circle", { cx: x, cy: y, r: r.toFixed(1), fill: "none", stroke: "#e8f6ff", "stroke-opacity": "0.6", "stroke-width": "0.9" });
      bubbleLayer.appendChild(c);
      bubbles.push({ el: c, x, y, v: 22 + Math.random() * 26, ph: Math.random() * 6.28 });
    };

    // ── flakes ("feeding" is purely for show) ──
    const flakes = [];
    const feedLines = ["Nom nom nom.", "They seem pleased.", "Nothing has changed, but everyone looks happier.", "Fed. The ledger remains unchanged."];
    feedBtn.onclick = () => {
      for (let i = 0; i < 10; i++) {
        const c = sv("circle", { cx: 0, cy: -6, r: "2.2", fill: "#f3d9a4" });
        c.setAttribute("opacity", "0");
        flakeLayer.appendChild(c);
        flakes.push({ el: c, x: 20 + Math.random() * (W - 40), y: -6, vy: 26 + Math.random() * 14, delay: i * 0.12, ph: Math.random() * 6.28, show: false, rest: false, age: 0, dead: false });
      }
      try { if (navigator.vibrate) navigator.vibrate(10); } catch {}
      say(feedLines[Math.floor(Math.random() * feedLines.length)], 3500);
    };
    const killFlake = k => { k.dead = true; k.el.remove(); };

    // ── movement ──
    let T = 0;
    const retarget = fi => {
      const m = fi.L * 0.7;
      if (fi.kind === "slow") {
        // inch along: small hops from where it already is
        fi.tx = Math.max(m, Math.min(W - m, fi.x + (Math.random() - 0.5) * 160));
        fi.ty = Math.max(H * 0.3, Math.min(floorY - 24, fi.y + (Math.random() - 0.5) * 80));
      } else {
        const lo = fi.kind === "finished" ? H * 0.2 : 40;
        const hi = fi.kind === "finished" ? H * 0.65 : floorY - 24;
        fi.tx = m + Math.random() * Math.max(10, W - 2 * m);
        fi.ty = lo + Math.random() * Math.max(10, hi - lo);
      }
      const [a, b] = HOLD[fi.kind];
      fi.next = T + a + Math.random() * (b - a);
    };
    const restFish = () => {
      // asleep fish lie along the sand, spread out and slightly tilted
      const sleepers = fish.filter(x => x.kind === "abandoned");
      sleepers.forEach((fi, i) => {
        const fx = (i + 0.5 + (rnd("rx" + fi.f.workId) - 0.5) * 0.6) / sleepers.length;
        fi.x = Math.max(fi.L * 0.6, Math.min(W - fi.L * 0.6, fx * W));
        fi.y = Math.min(H - 8 - fi.L * 0.2, floorY + 8 + (i % 3) * 6 - fi.L * 0.12);
        const tilt = ((gyHash("t" + fi.f.workId) % 17) - 8);
        fi.g.setAttribute("transform", `translate(${fi.x.toFixed(1)} ${fi.y.toFixed(1)}) scale(${fi.dir} 1) rotate(${tilt})`);
      });
    };
    let placed = false;
    const measure = () => {
      const w = sky.clientWidth, h = sky.clientHeight;
      if (w > 0 && h > 0) { W = w; H = h; }
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      buildScenery();
      if (!placed) {
        placed = true;
        fish.forEach(fi => {
          if (fi.kind === "abandoned") return;
          fi.x = fi.L + rnd("ix" + fi.f.workId) * (W - 2 * fi.L);
          const lo = fi.kind === "finished" ? H * 0.2 : 40, hi = fi.kind === "finished" ? H * 0.65 : floorY - 24;
          fi.y = lo + rnd("iy" + fi.f.workId) * Math.max(10, hi - lo);
          retarget(fi);
        });
      } else {
        fish.forEach(fi => {
          if (fi.kind === "abandoned") return;
          fi.x = Math.max(fi.L * 0.6, Math.min(W - fi.L * 0.6, fi.x));
          fi.y = Math.min(floorY - 12, fi.y);
        });
      }
      restFish();
    };

    let last = 0;
    const step = now => {
      if (!back.isConnected) { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); document.removeEventListener("keydown", onKey); return; }
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; T += dt;

      // flakes sink; ones on the sand fade away
      for (let i = flakes.length - 1; i >= 0; i--) {
        const k = flakes[i];
        if (k.dead) { flakes.splice(i, 1); continue; }
        if (k.delay > 0) { k.delay -= dt; continue; }
        if (!k.show) { k.show = true; k.el.setAttribute("opacity", "1"); }
        if (!k.rest) {
          k.y += k.vy * dt * calm; k.x += Math.sin(T * 2 + k.ph) * 6 * dt;
          if (k.y >= floorY + 4) { k.y = floorY + 4; k.rest = true; }
        } else {
          k.age += dt;
          k.el.setAttribute("opacity", Math.max(0, 1 - k.age / 4).toFixed(2));
          if (k.age >= 4) { killFlake(k); flakes.splice(i, 1); continue; }
        }
        k.el.setAttribute("cx", k.x.toFixed(1)); k.el.setAttribute("cy", k.y.toFixed(1));
      }

      fish.forEach(fi => {
        if (fi.kind === "abandoned" || fi.hidden) return;
        // notice the nearest flake
        if (flakes.length && T >= fi.lookAt) {
          fi.lookAt = T + 0.35;
          let best = null, bd = 1e9;
          for (const k of flakes) {
            if (!k.show || k.dead) continue;
            const d = (k.x - fi.x) * (k.x - fi.x) + (k.y - fi.y) * (k.y - fi.y);
            if (d < bd) { bd = d; best = k; }
          }
          fi.chase = (best && bd < 260 * 260) ? best : null;
        }
        if (fi.chase && fi.chase.dead) fi.chase = null;
        let dx, dy, d;
        if (fi.chase) {
          fi.tx = fi.chase.x; fi.ty = fi.chase.y;
          dx = fi.tx - fi.x; dy = fi.ty - fi.y; d = Math.hypot(dx, dy) || 1;
          if (d < Math.max(8, fi.L * 0.35)) {
            killFlake(fi.chase); fi.chase = null;
            spawnBubble(fi.x + fi.dir * fi.L * 0.4, fi.y); spawnBubble(fi.x + fi.dir * fi.L * 0.45, fi.y - 3);
            retarget(fi);
            dx = fi.tx - fi.x; dy = fi.ty - fi.y; d = Math.hypot(dx, dy) || 1;
          }
        } else {
          dx = fi.tx - fi.x; dy = fi.ty - fi.y; d = Math.hypot(dx, dy) || 1;
          if (T >= fi.next || d < 12) { retarget(fi); dx = fi.tx - fi.x; dy = fi.ty - fi.y; d = Math.hypot(dx, dy) || 1; }
        }
        const sp = fi.speed * (fi.chase ? (fi.kind === "slow" ? 3 : 1.7) : 1);
        const arrive = Math.min(1, d / 40);
        const ease = Math.min(1, dt * 2.2);
        fi.vx += (dx / d * sp * arrive - fi.vx) * ease;
        fi.vy += (dy / d * sp * arrive - fi.vy) * ease;
        fi.x += fi.vx * dt; fi.y += fi.vy * dt;
        const m = fi.L * 0.6;
        if (fi.x < m) { fi.x = m; fi.vx = Math.abs(fi.vx); } else if (fi.x > W - m) { fi.x = W - m; fi.vx = -Math.abs(fi.vx); }
        if (fi.y < 10) { fi.y = 10; fi.vy = Math.abs(fi.vy); } else if (fi.y > floorY - 8) { fi.y = floorY - 8; fi.vy = -Math.abs(fi.vy); }
        if (Math.abs(fi.vx) > 3) fi.dir = fi.vx > 0 ? 1 : -1;
        const spd = Math.hypot(fi.vx, fi.vy);
        const tilt = Math.max(-0.6, Math.min(0.6, Math.atan2(fi.vy, Math.max(8, Math.abs(fi.vx))))) * 57.3;
        fi.g.setAttribute("transform", `translate(${fi.x.toFixed(1)} ${fi.y.toFixed(1)}) scale(${fi.dir} 1) rotate(${tilt.toFixed(1)})`);
        const wag = Math.sin(T * (2.2 + spd / 22) + fi.ph) * (6 + Math.min(8, spd / 8)) * (reduced ? 0.5 : 1);
        fi.tail.setAttribute("transform", `rotate(${wag.toFixed(1)} ${(-fi.L * 0.26).toFixed(1)} 0)`);
        // lively fish blow the odd bubble
        if (fi.kind === "lively" && Math.random() < dt * 0.05) spawnBubble(fi.x + fi.dir * fi.L * 0.4, fi.y - 2);
      });

      // ambient bubbles off the sand
      if (Math.random() < dt * 0.9) spawnBubble(Math.random() * W, floorY);
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.y -= b.v * dt * calm; b.x += Math.sin(T * 3 + b.ph) * 8 * dt;
        if (b.y < -6) { b.el.remove(); bubbles.splice(i, 1); continue; }
        b.el.setAttribute("cx", b.x.toFixed(1)); b.el.setAttribute("cy", b.y.toFixed(1));
      }

      // kelp sways
      kelp.forEach(k => k.inner.setAttribute("transform", `rotate(${(Math.sin(T * 0.9 + k.ph) * k.amp * (reduced ? 0.3 : 1)).toFixed(2)})`));

      raf = requestAnimationFrame(step);
    };

    document.body.appendChild(back);
    window.addEventListener("resize", onResize);
    measure();
    raf = requestAnimationFrame(step);
  }


  // ── 🏘️ HOLLOWBROOK ──
  // The village outside the graveyard grounds. You get here by tapping the iron gate in the grounds and
  // answering yes to "leave the grounds?". For now it is only a place to look at: the chapel at the centre
  // with its bell tower behind it, a crossroads in front of it, and Bram's grounds at the bottom of the screen.
  // The crossroads has three signposts that will lead on later: the woods (through a gap in the hedge),
  // Hawkins (down a road with a bus stop) and the cottage and graveyard (south, back to the grounds).
  // Same night / dusk / dawn switch as the grounds, and it shares that setting (the "tm" value in ao3-gg-prefs).
  // Tap the chapel door (or its big window, or the chapel pill) to go inside: see scenes/chapel.js.
  // Tap the bell tower behind the chapel (or the bell tower pill) to walk up to it: see scenes/belltower.js.
  // Tap the bus stop shelter (or the bus pill) and board to ride to Hawkins, Indiana: see scenes/hawkins.js.
  // Nothing in here saves anything except that one time-of-day value.
  function openHollowbrook() {
    const old = document.getElementById("ao3-hollowbrook");
    if (old) old.remove();
    if (!document.getElementById("ao3-hb-css")) {
      const st = document.createElement("style");
      st.id = "ao3-hb-css";
      st.textContent = `
        @keyframes hbFlicker{0%,100%{opacity:.8}30%{opacity:1}60%{opacity:.62}}
        @keyframes hbSmoke{0%{opacity:.5;transform:translate(0,0) scale(.6)}100%{opacity:0;transform:translate(8px,-26px) scale(1.7)}}
        @keyframes hbFly{0%,100%{opacity:.1;transform:translate(0,0)}25%{opacity:1;transform:translate(8px,-7px)}50%{opacity:.3;transform:translate(-5px,-14px)}75%{opacity:1;transform:translate(7px,-5px)}}
        @keyframes hbBell{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
        @keyframes hbMist{0%,100%{opacity:.08;transform:translateX(-8px)}50%{opacity:.2;transform:translateX(8px)}}
        @media (prefers-reduced-motion: reduce){.hb-anim{animation:none !important}}
      `;
      (document.head || document.documentElement).appendChild(st);
    }
    const el = (tag, css, text) => {
      const e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (text != null) e.textContent = text;
      return e;
    };
    const NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs, parent) => {
      const e = document.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
      if (parent) parent.appendChild(e);
      return e;
    };
    const anim = (node, css) => { node.setAttribute("class", "hb-anim"); node.style.cssText += css; return node; };
    const rnd = seed => { const x = Math.sin(gyHash(String(seed)) * 12.9898) * 43758.5453; return x - Math.floor(x); };

    // time of day: the grounds keep it in ao3-gg-prefs ("tm"); read and write only that one value
    const PKEY = "ao3-gg-prefs";
    let tI = 0;
    try { const p = JSON.parse(localStorage.getItem(PKEY) || "{}") || {}; tI = Math.max(0, Math.min(2, p.tm | 0)); } catch {}
    const saveTime = () => {
      try { const p = JSON.parse(localStorage.getItem(PKEY) || "{}") || {}; p.tm = tI; localStorage.setItem(PKEY, JSON.stringify(p)); } catch {}
    };

    // ── shell (same look as the grounds) ──
    const back = el("div", "position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000002;");
    back.id = "ao3-hollowbrook";
    const box = el("div", "position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:8px;right:8px;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.6);border:1px solid rgba(190,170,255,0.18);");
    back.appendChild(box);
    const topbar = el("div", "flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(190,170,255,0.18);background:rgba(8,6,22,0.55);z-index:3;");
    const ttl = el("div", "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;");
    ttl.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:15px;letter-spacing:0.05em;line-height:1.2;text-transform:uppercase;color:#d9d0f5;", "\u{1F3D8}️ Hollowbrook"));
    const sub = el("div", "font-size:10px;letter-spacing:0.04em;color:rgba(217,208,245,0.6);", "");
    ttl.appendChild(sub);
    const xBtn = el("button", "background:none;border:none;color:rgba(217,208,245,0.7);cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px;", "✕");
    xBtn.type = "button"; xBtn.setAttribute("aria-label", "Close");
    topbar.appendChild(ttl); topbar.appendChild(xBtn);
    box.appendChild(topbar);

    const tools = el("div", "flex:0 0 auto;display:flex;gap:6px;padding:7px 14px;overflow-x:auto;-webkit-overflow-scrolling:touch;border-bottom:1px solid rgba(190,170,255,0.12);background:rgba(8,6,22,0.4);z-index:3;");
    const pill = (label, title, fn) => {
      const b = el("button", "flex:0 0 auto;border:1px solid rgba(190,170,255,0.3);background:rgba(255,255,255,0.06);color:#e6dcf5;border-radius:999px;padding:5px 11px;font:500 12px/1 inherit;font-family:inherit;cursor:pointer;white-space:nowrap;", label);
      b.type = "button"; b.title = title; b.onclick = fn; tools.appendChild(b); return b;
    };
    box.appendChild(tools);
    const field = el("div", "position:relative;flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;");
    box.appendChild(field);
    const caption = el("div", "flex:0 0 auto;padding:9px 14px;text-align:center;border-top:1px solid rgba(190,170,255,0.15);font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:12.5px;color:rgba(230,220,245,0.85);background:rgba(8,6,22,0.45);min-height:1.4em;");
    box.appendChild(caption);

    const onKey = e => { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); close(); } };
    const close = () => { back.remove(); document.removeEventListener("keydown", onKey, true); };
    xBtn.onclick = close;
    back.addEventListener("click", e => { if (e.target === back) close(); });
    document.addEventListener("keydown", onKey, true);

    // ── the picture ──
    const W = 360, H = 760;
    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMin meet" });
    svg.style.cssText = "width:100%;height:auto;display:block;";
    const defs = sv("defs", {}, svg);
    const mkGlow = (id, col) => {
      const g = sv("radialGradient", { id }, defs);
      sv("stop", { offset: "0%", "stop-color": col, "stop-opacity": "0.75" }, g);
      sv("stop", { offset: "100%", "stop-color": col, "stop-opacity": "0" }, g);
    };
    mkGlow("hb-glow", "#ffd98a"); mkGlow("hb-glow-cool", "#bfe3ff");
    const dark = sv("linearGradient", { id: "hb-dark", x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    sv("stop", { offset: "0%", "stop-color": "#070510", "stop-opacity": "0.95" }, dark);
    sv("stop", { offset: "100%", "stop-color": "#070510", "stop-opacity": "0" }, dark);
    const fade = sv("linearGradient", { id: "hb-fade", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    sv("stop", { offset: "0%", "stop-color": "#0a0818", "stop-opacity": "0" }, fade);
    sv("stop", { offset: "100%", "stop-color": "#0a0818", "stop-opacity": "0.9" }, fade);

    const lits = [];                                    // everything that glows, drawn last so it sits on top
    const litRect = (x, y, w, h, fill, op, glowR) => lits.push(g => {
      if (glowR) sv("circle", { cx: x + w / 2, cy: y + h / 2, r: glowR, fill: fill === "#cfe7ff" ? "url(#hb-glow-cool)" : "url(#hb-glow)", opacity: 0.5 }, g);
      sv("rect", { x, y, width: w, height: h, fill, opacity: op }, g);
    });

    // sky: stars and the moon (a low sun at dusk and dawn), far hills, the ground
    const starG = sv("g", {}, svg);
    for (let i = 0; i < 46; i++) sv("circle", { cx: (rnd("hsx" + i) * W).toFixed(1), cy: (rnd("hsy" + i) * 215).toFixed(1), r: (0.5 + rnd("hsr" + i) * 0.9).toFixed(2), fill: "#fff", opacity: (0.25 + rnd("hso" + i) * 0.6).toFixed(2) }, starG);
    const moonG = sv("g", {}, svg);
    const moonDisc = sv("circle", { cx: 300, cy: 56, r: 16, fill: "#efe6bd" }, moonG);
    sv("circle", { cx: 300, cy: 56, r: 32, fill: "url(#hb-glow)", opacity: 0.3 }, moonG);
    sv("path", { d: "M0 252 Q50 222 120 246 T240 238 T360 248 V330 H0 Z", fill: "#2a2147" }, svg);
    sv("path", { d: "M0 276 Q90 254 180 274 T360 264 V340 H0 Z", fill: "#241b3b" }, svg);
    sv("rect", { x: 0, y: 290, width: W, height: H - 290, fill: "#1a1a2e" }, svg);
    // the graveyard end of the map is a shade darker
    sv("rect", { x: 0, y: 592, width: W, height: H - 592, fill: "#150f27" }, svg);

    // grass tufts scattered on the ground, kept off the roads
    const onRoad = (x, y) => (Math.abs(x - 180) < 30 && y > 290) || Math.abs(y - 410) < 28;
    for (let i = 0; i < 110; i++) {
      const gx = 6 + rnd("tx" + i) * (W - 12), gy = 300 + rnd("ty" + i) * (H - 320);
      if (onRoad(gx, gy)) continue;
      sv("path", { d: `M${gx.toFixed(1)} ${gy.toFixed(1)} l-2 -5 M${gx.toFixed(1)} ${gy.toFixed(1)} l0 -7 M${gx.toFixed(1)} ${gy.toFixed(1)} l2 -5`, stroke: "#3f6552", "stroke-width": 1.3, fill: "none", "stroke-linecap": "round", opacity: 0.65 }, svg);
    }

    // soft grass patches and wildflowers in the verges
    for (let i = 0; i < 26; i++) {
      const px = rnd("gp" + i) * W, py = 300 + rnd("gq" + i) * 270;
      if (onRoad(px, py)) continue;
      sv("ellipse", { cx: px.toFixed(1), cy: py.toFixed(1), rx: (14 + rnd("gr" + i) * 16).toFixed(1), ry: (4 + rnd("gs" + i) * 4).toFixed(1), fill: "#20332f", opacity: 0.45 }, svg);
    }
    const BLOOM = ["#f4c2d0", "#f6e27a", "#e9e4f5", "#d99ae0", "#f0a07a"];
    for (let i = 0; i < 70; i++) {
      const fx = 6 + rnd("fx" + i) * (W - 12), fy = 300 + rnd("fy" + i) * 260;
      if (onRoad(fx, fy)) continue;
      sv("circle", { cx: fx.toFixed(1), cy: fy.toFixed(1), r: (0.9 + rnd("fr" + i) * 0.7).toFixed(2), fill: BLOOM[i % BLOOM.length], opacity: 0.8 }, svg);
    }

    // the woods, off the left edge (the trail goes in through the hedge)
    const pine = (x, base, h, fill) => {
      const w = h * 0.3;
      sv("rect", { x: x - 2, y: base - 8, width: 4, height: 10, fill: "#0e0b18" }, svg);
      for (let i = 0; i < 3; i++) {
        const ay = base - h + i * h * 0.24, hw = w * (0.55 + 0.22 * i), by = ay + h * 0.42;
        sv("polygon", { points: `${x},${ay.toFixed(1)} ${(x - hw).toFixed(1)},${by.toFixed(1)} ${(x + hw).toFixed(1)},${by.toFixed(1)}`, fill }, svg);
      }
    };
    pine(8, 372, 96, "#0d1319"); pine(30, 384, 84, "#10171d"); pine(6, 470, 150, "#0b1016"); pine(32, 478, 118, "#0f161c"); pine(4, 330, 70, "#0d1319");

    // ── the chapel: bell tower behind, chapel in front ──
    sv("rect", { x: 158, y: 92, width: 44, height: 122, fill: "#3a2e52" }, svg);
    [100, 150, 196].forEach(yy => sv("rect", { x: 156, y: yy, width: 48, height: 3, fill: "#4a3d66" }, svg));
    sv("polygon", { points: "153,94 207,94 180,34", fill: "#2a2040" }, svg);
    sv("path", { d: "M180 34 V17 M174.5 24 H185.5", stroke: "#8a7aa8", "stroke-width": 1.7, fill: "none", "stroke-linecap": "round" }, svg);
    sv("path", { d: "M167 138 V120 a13 13 0 0 1 26 0 V138 Z", fill: "#120d22" }, svg);
    const bell = sv("g", {}, svg);
    sv("path", { d: "M175 131 Q175 120 180 118.5 Q185 120 185 131 Z", fill: "#c9a24a" }, bell);
    sv("circle", { cx: 180, cy: 132, r: 1.6, fill: "#8a6d2a" }, bell);
    anim(bell, "animation:hbBell 5s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 0%;");
    lits.push(g => sv("path", { d: "M167 138 V120 a13 13 0 0 1 26 0 V138 Z", fill: "#f0b45a", opacity: 0.2 }, g));

    sv("rect", { x: 118, y: 212, width: 7, height: 80, fill: "#3b2f54" }, svg);                 // buttresses
    sv("rect", { x: 235, y: 212, width: 7, height: 80, fill: "#3b2f54" }, svg);
    sv("rect", { x: 122, y: 206, width: 116, height: 86, fill: "#46385f" }, svg);               // walls
    sv("rect", { x: 122, y: 252, width: 116, height: 2, fill: "#54456f" }, svg);
    sv("polygon", { points: "112,209 248,209 180,150", fill: "#2f2445" }, svg);                  // gable
    sv("polygon", { points: "112,209 248,209 180,150 180,155 241,206 119,206 180,155", fill: "#3a2d52" }, svg);
    // the big stained-glass window: one tall pointed arch under the gable, with a rose in its head
    const WIN = "M156 250 V204 Q156 180 180 158 Q204 180 204 204 V250 Z";
    sv("clipPath", { id: "hb-chapel-clip" }, defs).appendChild(sv("path", { d: WIN }));
    sv("path", { d: "M152 254 V204 Q152 177 180 152 Q208 177 208 204 V254 Z", fill: "#5a4b6f" }, svg);   // stone surround
    sv("path", { d: WIN, fill: "#1a1228" }, svg);
    sv("rect", { x: 150, y: 250, width: 60, height: 5, fill: "#5a4b6f" }, svg);                         // sill
    const panes = ["#e7a14f", "#d96f7e", "#7f8be0", "#5fb3a8", "#b573d6"];
    lits.push(g => {
      sv("circle", { cx: 180, cy: 205, r: 52, fill: "url(#hb-glow)", opacity: 0.4 }, g);
      const cg = sv("g", { "clip-path": "url(#hb-chapel-clip)" }, g);
      for (let r = 0; r < 12; r++) for (let c = 0; c < 6; c++) {
        sv("rect", { x: 156 + c * 8, y: 158 + r * 8, width: 8, height: 8, fill: panes[Math.floor(rnd("cg" + r + "_" + c) * panes.length)], opacity: 0.88 }, cg);
      }
      sv("circle", { cx: 180, cy: 188, r: 10.5, fill: "#2a2040" }, cg);                                  // rose
      for (let i = 0; i < 8; i++) {
        const a0 = i * Math.PI / 4, a1 = (i + 1) * Math.PI / 4, r = 8.6;
        sv("path", { d: `M180 188 L${(180 + r * Math.cos(a0)).toFixed(2)} ${(188 + r * Math.sin(a0)).toFixed(2)} A${r} ${r} 0 0 1 ${(180 + r * Math.cos(a1)).toFixed(2)} ${(188 + r * Math.sin(a1)).toFixed(2)} Z`, fill: i % 2 ? "#d96f7e" : "#ffd98a", stroke: "#2a2040", "stroke-width": 0.8, opacity: 0.95 }, cg);
      }
      sv("circle", { cx: 180, cy: 188, r: 2.2, fill: "#ffe7a8" }, cg);
      let lead = "";                                                                                      // lead lines: grid, diamonds, mullion and transom
      for (let x = 156; x <= 204; x += 8) lead += `M${x} 158 V250 `;
      for (let y = 158; y <= 250; y += 8) lead += `M156 ${y} H204 `;
      sv("path", { d: lead, stroke: "#1a1228", "stroke-width": 0.7, fill: "none", opacity: 0.7 }, cg);
      sv("path", { d: "M180 158 V250 M156 206 H204", stroke: "#2a2040", "stroke-width": 1.8, fill: "none" }, cg);
      sv("circle", { cx: 180, cy: 188, r: 10, fill: "none", stroke: "#2a2040", "stroke-width": 1.4 }, cg);
      sv("path", { d: "M156 250 V204 Q156 180 180 158 Q204 180 204 204 V250 Z", fill: "none", stroke: "#2a2040", "stroke-width": 1.6 }, g);
    });
    [[134, 0], [214, 0]].forEach(([wx]) => {                                                           // a tall narrow window each side
      const d = `M${wx} 268 V240 a7 7 0 0 1 14 0 V268 Z`;
      sv("path", { d, fill: "#1a1228" }, svg);
      lits.push(g => {
        sv("circle", { cx: wx + 7, cy: 250, r: 17, fill: "url(#hb-glow)", opacity: 0.35 }, g);
        sv("path", { d: `M${wx + 1.4} 266.6 V240 a5.6 5.6 0 0 1 11.2 0 V266.6 Z`, fill: "#f0b45a", opacity: 0.85 }, g);
        sv("path", { d: `M${wx + 7} 234.4 V266.6 M${wx + 1.4} 252 H${wx + 12.6}`, stroke: "#46385f", "stroke-width": 1, fill: "none" }, g);
      });
    });
    sv("path", { d: "M166 292 V272 a14 14 0 0 1 28 0 V292 Z", fill: "#1a1228" }, svg);          // door
    lits.push(g => {
      sv("ellipse", { cx: 180, cy: 301, rx: 40, ry: 8, fill: "#ffd98a", opacity: 0.18 }, g);
      sv("path", { d: "M169 292 V273 a11 11 0 0 1 22 0 V292 Z", fill: "#f0b45a", opacity: 0.85 }, g);
      sv("path", { d: "M180 262 V292", stroke: "#5b3a22", "stroke-width": 1, opacity: 0.7 }, g);
    });
    sv("rect", { x: 160, y: 292, width: 40, height: 4, fill: "#5a4b6f" }, svg);                 // steps
    sv("rect", { x: 154, y: 296, width: 52, height: 4, fill: "#4c3f62" }, svg);
    [154, 206].forEach(lx => {                                                                    // lanterns either side of the door
      sv("rect", { x: lx - 1, y: 270, width: 2, height: 22, fill: "#2c2438" }, svg);
      sv("rect", { x: lx - 3, y: 264, width: 6, height: 7, rx: 1.4, fill: "#ffd98a" }, svg);
      lits.push(g => anim(sv("circle", { cx: lx, cy: 268, r: 15, fill: "url(#hb-glow)" }, g), `animation:hbFlicker ${(2.4 + rnd("lan" + lx) * 1.4).toFixed(1)}s ease-in-out infinite;`));
    });
    [108, 252].forEach(yx => {                                                                    // yews either side
      sv("ellipse", { cx: yx, cy: 268, rx: 14, ry: 30, fill: "#17252d" }, svg);
      sv("ellipse", { cx: yx + (yx < 180 ? -3 : 3), cy: 262, rx: 8, ry: 22, fill: "#1d2f38", opacity: 0.8 }, svg);
    });

    // ── village houses: timber-framed cottages with warm roofs, window boxes and a lit door ──
    const house = (x, base, w, h, wall, roof, seed, chimney) => {
      const g = sv("g", {}, svg);
      if (chimney) {
        const cx = x + w * 0.7;
        sv("rect", { x: cx, y: base - h - h * 0.52, width: 6, height: h * 0.44, fill: "#4a3340" }, g);
        [0, 1].forEach(i => {
          const p = sv("circle", { cx: cx + 3, cy: base - h - h * 0.56, r: 3, fill: "#d8cde6" }, g);
          anim(p, `animation:hbSmoke 4.5s ease-out ${i * 2.2}s infinite;transform-box:fill-box;transform-origin:center;opacity:0;`);
        });
      }
      sv("rect", { x, y: base - h, width: w, height: h, fill: wall }, g);
      sv("path", { d: `M${x + 1} ${base - 1} V${base - h + 1} H${x + w - 1} V${base - 1} M${x + w * 0.5} ${base - h + 1} V${base - 1} M${x + 1} ${base - h * 0.5} H${x + w - 1}`, stroke: "#2f2230", "stroke-width": 1.4, fill: "none", opacity: 0.75 }, g);   // timber frame
      sv("polygon", { points: `${x - 5},${base - h + 1} ${x + w + 5},${base - h + 1} ${x + w / 2},${base - h - h * 0.66}`, fill: roof }, g);
      sv("path", { d: `M${x - 5} ${base - h + 1} L${x + w / 2} ${base - h - h * 0.66} L${x + w + 5} ${base - h + 1}`, fill: "none", stroke: "#8a5a60", "stroke-width": 1.2, "stroke-linejoin": "round", opacity: 0.7 }, g);
      const dx = x + w * 0.44;
      sv("path", { d: `M${dx} ${base} V${base - 10} a4 4 0 0 1 8 0 V${base} Z`, fill: "#3a2630" }, g);
      litRect(dx + 1.3, base - 11, 5.4, 11, "#f0b45a", 0.55, 0);
      [0.1, 0.7].forEach((fx, i) => {
        const wx = x + w * fx, wy = base - h * 0.72;
        sv("rect", { x: wx, y: wy, width: 8, height: 9, fill: "#120d22" }, g);
        if (rnd(seed + "w" + i) > 0.12) litRect(wx + 0.8, wy + 0.8, 6.4, 7.4, "#f0b45a", 0.85, 15);
        sv("rect", { x: wx - 1, y: wy + 9, width: 10, height: 2.6, rx: 0.8, fill: "#4a3326" }, g);      // window box
        [0, 1, 2, 3].forEach(k => sv("circle", { cx: wx + 1 + k * 2.6, cy: wy + 8.6, r: 1.3, fill: BLOOM[(k + i + seed.length) % BLOOM.length] }, g));
      });
      sv("path", { d: `M${x - 6} ${base + 6} H${x + w + 6}`, stroke: "#5a4638", "stroke-width": 1.2, "stroke-dasharray": "1.6 2.6", opacity: 0.8 }, g);   // garden picket
    };
    house(60, 292, 32, 28, "#54445f", "#6a4150", "hsA", false);                                  // left: small one peeking behind a larger one
    house(14, 300, 52, 36, "#5d4a66", "#74464f", "hsB", true);
    house(268, 292, 32, 28, "#54445f", "#6a4150", "hsC", false);                                 // right
    house(294, 300, 52, 36, "#5d4a66", "#74464f", "hsD", true);

    // a few round village trees, and a picket fence down each side of the chapel path
    [[100, 322, 15], [262, 322, 14], [338, 372, 12]].forEach(([tx, ty, tr], i) => {
      sv("rect", { x: tx - 2, y: ty, width: 4, height: 18, fill: "#2c2028" }, svg);
      sv("circle", { cx: tx, cy: ty - 4, r: tr, fill: "#1f3a37" }, svg);
      sv("circle", { cx: tx - 5, cy: ty - 8, r: tr * 0.62, fill: "#27483f" }, svg);
      sv("circle", { cx: tx + 6, cy: ty - 2, r: tr * 0.5, fill: "#234339" }, svg);
      lits.push(g => [[-6, -8], [5, -9], [8, 0], [-8, 1], [0, 3]].forEach(([ox, oy], k) => anim(sv("circle", { cx: tx + ox, cy: ty + oy, r: 1.3, fill: "#ffe3a0" }, g), `animation:hbFlicker ${(2 + rnd("tl" + i + k) * 2).toFixed(1)}s ease-in-out infinite;`)));
    });
    [153, 207].forEach(fx => {
      for (let fy = 306; fy <= 384; fy += 5) sv("path", { d: `M${fx} ${fy} v-7`, stroke: "#6a5240", "stroke-width": 1.8, "stroke-linecap": "round", opacity: 0.85 }, svg);
      sv("path", { d: `M${fx} 301 V384`, stroke: "#4a3a30", "stroke-width": 1.2, opacity: 0.9, fill: "none" }, svg);
    });

    // ── roads ──
    // north: chapel steps to the crossroads. west: to the hedge, then a trail into the woods. east: a cobbled lane to Hawkins.
    // south: down to Bram's grounds.
    const ROADS = [
      { pts: [[180, 296], [180, 410]], w: 40, kind: "cobble", cap: "butt" },
      { pts: [[180, 410], [100, 410], [52, 410]], w: 38, kind: "cobble" },
      { pts: [[60, 410], [30, 409], [0, 407]], w: 22, kind: "cobble" },
      { pts: [[180, 410], [260, 410], [360, 410]], w: 38, kind: "cobble" },
      { pts: [[180, 410], [180, 480], [180, 566], [181, 650], [182, 760]], w: 38, kind: "cobble" },
    ];
    const polyD = pts => pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
    ROADS.forEach(r => sv("path", { d: polyD(r.pts), fill: "none", stroke: "#1b2a26", "stroke-width": r.w + 14, "stroke-linecap": r.cap || "round", "stroke-linejoin": "round", opacity: 0.55 }, svg));
    ROADS.forEach(r => sv("path", { d: polyD(r.pts), fill: "none", stroke: "#4d4040", "stroke-width": r.w, "stroke-linecap": r.cap || "round", "stroke-linejoin": "round", opacity: 0.95 }, svg));
    const STONES = ["#6d6070", "#7a6d7d", "#5f5463", "#857886", "#6a5f5a"];
    ROADS.forEach((r, ri) => {
      if (r.kind !== "cobble") return;
      for (let s = 0; s < r.pts.length - 1; s++) {
        const [x1, y1] = r.pts[s], [x2, y2] = r.pts[s + 1];
        const L = Math.hypot(x2 - x1, y2 - y1), dx = (x2 - x1) / L, dy = (y2 - y1) / L, nx = -dy, ny = dx;
        for (let t = 0; t < L; t += 8) for (let k = 0; k < 3; k++) {
          const sd = "c" + ri + "_" + s + "_" + t + "_" + k, off = (rnd(sd) - 0.5) * r.w * 0.8;
          sv("ellipse", { cx: (x1 + dx * t + nx * off).toFixed(1), cy: (y1 + dy * t + ny * off).toFixed(1), rx: (2.4 + rnd(sd + "w") * 3).toFixed(1), ry: (1.7 + rnd(sd + "h") * 1.9).toFixed(1),
            fill: STONES[Math.floor(rnd(sd + "c") * STONES.length)], opacity: (0.5 + rnd(sd + "o") * 0.4).toFixed(2) }, svg);
        }
      }
    });
    // a few tufts of grass pushing up between the cobbles
    for (let i = 0; i < 26; i++) {
      const tx = rnd("rt" + i) * W, ty = 396 + rnd("ru" + i) * 28, onV = i % 3 === 0;
      const x = onV ? 168 + rnd("rv" + i) * 24 : tx, y = onV ? 300 + rnd("rw" + i) * 330 : ty;
      if (y > 540 && y < 600) continue;
      sv("path", { d: `M${x.toFixed(1)} ${y.toFixed(1)} l-1.5 -3.5 M${x.toFixed(1)} ${y.toFixed(1)} l0 -4.5 M${x.toFixed(1)} ${y.toFixed(1)} l1.5 -3.5`, stroke: "#4f7a5c", "stroke-width": 1, fill: "none", "stroke-linecap": "round", opacity: 0.6 }, svg);
    }

    // ── the hedge with a gap in it, and the trail through it into the woods ──
    const HEDGE = ["#1f3a34", "#27473e", "#1a312c"];
    for (let yy = 334; yy <= 470; yy += 9) {
      if (yy >= 388 && yy <= 433) continue;                                                      // the gap
      const hx = 38 + (rnd("hx" + yy) - 0.5) * 5;
      sv("circle", { cx: hx.toFixed(1), cy: yy, r: (10 + rnd("hr" + yy) * 3).toFixed(1), fill: HEDGE[Math.floor(rnd("hc" + yy) * 3)] }, svg);
      sv("circle", { cx: (hx + 8).toFixed(1), cy: yy + 3, r: 8, fill: HEDGE[Math.floor(rnd("hd" + yy) * 3)] }, svg);
    }
    sv("rect", { x: 0, y: 391, width: 46, height: 38, fill: "url(#hb-dark)" }, svg);          // the trail fades into the dark
    anim(sv("ellipse", { cx: 22, cy: 410, rx: 26, ry: 11, fill: "#9cc4d8", opacity: 0.1 }, svg), "animation:hbMist 9s ease-in-out infinite;");
    [[14, 402], [30, 418], [40, 398], [20, 424]].forEach(([fx, fy], i) => {
      const f = sv("circle", { cx: fx, cy: fy, r: 1.5, fill: "#f6e27a" }, svg);
      anim(f, `animation:hbFly ${(4 + i * 0.9).toFixed(1)}s ease-in-out ${(i * 0.7).toFixed(1)}s infinite;`);
    });

    // ── signposts ──
    const signpost = (x, base, lines, dir, wBoard) => {
      const g = sv("g", {}, svg);
      const top = base - 44, h = lines.length > 1 ? 22 : 13, y0 = top + 2;
      sv("ellipse", { cx: x, cy: base, rx: 6, ry: 1.8, fill: "#0a0714", opacity: 0.5 }, g);
      sv("rect", { x: x - 1.6, y: top, width: 3.2, height: 44, fill: "#3b2a22" }, g);
      let d;
      if (dir === "l") d = `M${x + 3} ${y0} H${x - wBoard + 9} L${x - wBoard} ${y0 + h / 2} L${x - wBoard + 9} ${y0 + h} H${x + 3} Z`;
      else if (dir === "r") d = `M${x - 3} ${y0} H${x + wBoard - 9} L${x + wBoard} ${y0 + h / 2} L${x + wBoard - 9} ${y0 + h} H${x - 3} Z`;
      else d = `M${x - wBoard / 2} ${y0} H${x + wBoard / 2} V${y0 + h} L${x} ${y0 + h + 8} L${x - wBoard / 2} ${y0 + h} Z`;
      sv("path", { d, fill: "#6b4a35", stroke: "#3a281c", "stroke-width": 1 }, g);
      const cx = dir === "l" ? x - wBoard / 2 + 3 : dir === "r" ? x + wBoard / 2 - 3 : x;
      lines.forEach((t, i) => {
        const tx = sv("text", { x: cx, y: y0 + (lines.length > 1 ? 9.2 + i * 9 : 9.4), "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 6.8, fill: "#f3e7c8" }, g);
        tx.textContent = t;
      });
    };
    signpost(132, 388, ["Woods"], "l", 46);
    signpost(232, 388, ["Hawkins"], "r", 54);
    signpost(232, 478, ["Cottage &", "graveyard"], "d", 56);

    // ── the bus stop, south side of the Hawkins road: a little wooden shelter with a shingled roof and a lantern ──
    sv("rect", { x: 286, y: 442, width: 3, height: 34, fill: "#4a3326" }, svg);
    sv("rect", { x: 331, y: 442, width: 3, height: 34, fill: "#4a3326" }, svg);
    sv("rect", { x: 289, y: 446, width: 42, height: 30, fill: "#2a2030" }, svg);
    sv("polygon", { points: "278,444 342,444 310,424", fill: "#6a4150" }, svg);
    sv("path", { d: "M278 444 L310 424 L342 444", fill: "none", stroke: "#8a5a60", "stroke-width": 1.2, "stroke-linejoin": "round", opacity: 0.7 }, svg);
    sv("rect", { x: 276, y: 443, width: 68, height: 3.5, rx: 1, fill: "#4a3326" }, svg);
    litRect(293, 449, 34, 18, "#f0b45a", 0.3, 24);
    sv("rect", { x: 292, y: 464, width: 28, height: 3.5, rx: 1, fill: "#6a5240" }, svg);
    sv("rect", { x: 294, y: 467, width: 2.4, height: 9, fill: "#4a3326" }, svg);
    sv("rect", { x: 316, y: 467, width: 2.4, height: 9, fill: "#4a3326" }, svg);
    sv("path", { d: "M310 446 v5", stroke: "#2c2438", "stroke-width": 1, fill: "none" }, svg);
    sv("rect", { x: 307.5, y: 451, width: 5, height: 6, rx: 1.2, fill: "#ffd98a" }, svg);
    lits.push(g => anim(sv("circle", { cx: 310, cy: 454, r: 14, fill: "url(#hb-glow)" }, g), "animation:hbFlicker 3s ease-in-out infinite;"));
    sv("rect", { x: 347, y: 444, width: 3, height: 32, fill: "#4a3326" }, svg);                    // the stop sign: a round wooden board
    sv("circle", { cx: 348.5, cy: 440, r: 7.5, fill: "#a8553f", stroke: "#4a3326", "stroke-width": 1.2 }, svg);
    const bus = sv("text", { x: 348.5, y: 442, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 5.2, "font-weight": 700, fill: "#f6ead0" }, svg);
    bus.textContent = "BUS";
    sv("path", { d: "M268 476 q-6 -3 -4 -9 M268 476 q0 -7 3 -9", stroke: "#4f7a5c", "stroke-width": 1.2, fill: "none" }, svg);
    [[270, 472], [274, 474], [265, 473]].forEach(([fx, fy], i) => sv("circle", { cx: fx, cy: fy, r: 1.8, fill: BLOOM[i] }, svg));

    // bunting strung between the posts and lamps
    const bunting = (x1, y1, x2, y2, sag, n) => {
      const pt = t => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * sag];
      sv("path", { d: `M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag * 2} ${x2} ${y2}`, stroke: "#3a2d33", "stroke-width": 0.8, fill: "none" }, svg);
      for (let i = 1; i < n; i++) { const [px, py] = pt(i / n); sv("polygon", { points: `${(px - 2.8).toFixed(1)},${py.toFixed(1)} ${(px + 2.8).toFixed(1)},${py.toFixed(1)} ${px.toFixed(1)},${(py + 5.5).toFixed(1)}`, fill: BLOOM[(i + 2) % BLOOM.length], opacity: 0.85 }, svg); }
    };
    bunting(308, 350, 338, 360, 4, 5);              // a short string from the east lamp to the tree

    // ── Bram's grounds: the wall and iron gate, with the graveyard behind it and Bram's cottage just inside ──
    [[0, 148], [212, 148]].forEach(([wx, ww]) => {
      sv("rect", { x: wx, y: 562, width: ww, height: 30, fill: "#2a2238" }, svg);
      sv("rect", { x: wx, y: 559, width: ww, height: 4, fill: "#3a3047" }, svg);
      for (let by = 570; by < 592; by += 7) sv("path", { d: `M${wx} ${by} H${wx + ww}`, stroke: "#201a2e", "stroke-width": 1 }, svg);
    });
    sv("rect", { x: 146, y: 530, width: 13, height: 62, fill: "#2c2438" }, svg);
    sv("rect", { x: 201, y: 530, width: 13, height: 62, fill: "#2c2438" }, svg);
    sv("rect", { x: 143, y: 524, width: 19, height: 8, fill: "#3a3047" }, svg);
    sv("rect", { x: 198, y: 524, width: 19, height: 8, fill: "#3a3047" }, svg);
    sv("path", { d: "M159 548 Q180 514 201 548", fill: "none", stroke: "#4a3e58", "stroke-width": 4 }, svg);
    for (let i = 0; i < 5; i++) { const gx = 166 + i * 7; sv("line", { x1: gx, y1: 540 - Math.sin((i + 0.5) / 5 * Math.PI) * 9 + 8, x2: gx, y2: 548 + Math.abs(i - 2) * 3 + 6, stroke: "#3a3047", "stroke-width": 1.6 }, svg); }
    const rest = sv("text", { x: 180, y: 532, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 4.6, "letter-spacing": 1.4, fill: "#cbbfe0", opacity: 0.8 }, svg);
    rest.textContent = "REST HERE";
    // headstones behind the wall (a few with candles)
    for (let i = 0; i < 16; i++) {
      const gx = (i % 2 ? 214 + rnd("gx" + i) * 128 : 18 + rnd("gx" + i) * 128), gy = 618 + Math.floor(i / 2) * 15 + rnd("gy" + i) * 6;
      if (gx > 246 && gx < 322 && gy > 598 && gy < 668) continue;           // keep clear of Bram's cottage
      sv("path", { d: `M${(gx - 5).toFixed(1)} ${gy.toFixed(1)} V${(gy - 9).toFixed(1)} a5 5 0 0 1 10 0 V${gy.toFixed(1)} Z`, fill: "#6d6577", opacity: 0.8 }, svg);
      if (i % 3 === 0) sv("path", { d: `M${gx.toFixed(1)} ${(gy - 11).toFixed(1)} v6 M${(gx - 2.4).toFixed(1)} ${(gy - 8.5).toFixed(1)} h4.8`, stroke: "#4a4256", "stroke-width": 1, fill: "none" }, svg);
      if (i % 5 === 1) lits.push(g => {
        sv("rect", { x: gx - 0.8, y: gy - 5, width: 1.6, height: 4, fill: "#ffe9b0" }, g);
        anim(sv("circle", { cx: gx, cy: gy - 5, r: 8, fill: "url(#hb-glow)" }, g), `animation:hbFlicker ${(2 + rnd("cd" + i) * 1.6).toFixed(1)}s ease-in-out infinite;`);
      });
    }
    // Bram's cottage, inside the grounds. This is the grounds' own drawing (same shapes and colours, the way it looks
    // before Bram is home: dark windows, no smoke), moved to sit just inside the gate on the right.
    {
      const cot = sv("g", { transform: "translate(-51 514)" }, svg);
      sv("ellipse", { cx: 335, cy: 133, rx: 25, ry: 3.5, fill: "#000", opacity: 0.35 }, cot);
      sv("rect", { x: 344, y: 92, width: 6, height: 15, fill: "#35283f" }, cot);
      sv("rect", { x: 315, y: 108, width: 40, height: 24, fill: "#4a3a4f" }, cot);
      sv("path", { d: "M311 110.5 L335 89 L359 110.5 Z", fill: "#3b2a46" }, cot);
      sv("path", { d: "M311 110.5 L335 89 L359 110.5", fill: "none", stroke: "#5d4a6d", "stroke-width": 1.2, "stroke-linejoin": "round" }, cot);
      [[318, 8], [345, 7]].forEach(([wx2, ww]) => {
        sv("rect", { x: wx2, y: 114, width: ww, height: 8, rx: 0.8, fill: "#241f3a" }, cot);
        sv("rect", { x: wx2, y: 114, width: ww, height: 8, rx: 0.8, fill: "none", stroke: "#6f5f7d", "stroke-width": 0.9 }, cot);
      });
      sv("rect", { x: 329, y: 118, width: 11, height: 14, rx: 1.5, fill: "#2a2033" }, cot);
      sv("circle", { cx: 338, cy: 125.5, r: 0.8, fill: "#d9c3a0" }, cot);
      const ct = sv("text", { x: 335, y: 146, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 7.5, "font-style": "italic", fill: "#cbbfe0", opacity: 0.75 }, cot);
      ct.textContent = "the cottage";
    }
    [[110, 660], [250, 700]].forEach(([mx, my], i) => anim(sv("ellipse", { cx: mx, cy: my, rx: 70, ry: 12, fill: "#c8bee6", opacity: 0.1 }, svg), `animation:hbMist ${10 + i * 3}s ease-in-out infinite;`));

    // ── lamp posts ──
    const lamp = (lx, base, i) => {
      sv("rect", { x: lx - 1.2, y: base - 30, width: 2.4, height: 30, fill: "#2c2438" }, svg);
      sv("rect", { x: lx - 3.5, y: base - 38, width: 7, height: 9, rx: 1.6, fill: "#ffd98a" }, svg);
      lits.push(g => anim(sv("circle", { cx: lx, cy: base - 34, r: 24, fill: "url(#hb-glow)" }, g), `animation:hbFlicker ${(2.2 + rnd("hl" + i) * 1.6).toFixed(1)}s ease-in-out infinite;`));
    };
    [[146, 326], [214, 326], [72, 388], [308, 388], [148, 452], [128, 564], [238, 564]].forEach(([lx, ly], i) => lamp(lx, ly, i));
    lits.push(g => { [152, 208].forEach((px, i) => anim(sv("circle", { cx: px, cy: 520, r: 16, fill: "url(#hb-glow)" }, g), `animation:hbFlicker ${(2.6 + i * 0.7).toFixed(1)}s ease-in-out infinite;`)); });

    // ── everything that glows, then fireflies, the bottom fade and the time-of-day tint ──
    const lit = sv("g", {}, svg);
    lits.forEach(f => f(lit));
    sv("rect", { x: 0, y: 690, width: W, height: H - 690, fill: "url(#hb-fade)", "pointer-events": "none" }, svg);
    const tint = sv("rect", { x: 0, y: 0, width: W, height: H, fill: "#000", opacity: 0, "pointer-events": "none" }, svg);
    [[164, 258, 32, 40, "the chapel door"], [156, 158, 48, 92, "the big window"]].forEach(([hx, hy, hw, hh, tt]) => {   // tap the door or the window to go inside
      const hit = sv("rect", { x: hx, y: hy, width: hw, height: hh, fill: "transparent" }, svg);
      hit.style.cursor = "pointer"; hit.setAttribute("aria-label", "Step inside the chapel");
      hit.addEventListener("click", () => { close(); openChapel(); });
    });
    {   // tap the chapel's bell tower (its roof and shaft, above the big window) to walk up to it
      const hit = sv("rect", { x: 150, y: 30, width: 60, height: 124, fill: "transparent" }, svg);
      hit.style.cursor = "pointer"; hit.setAttribute("role", "button"); hit.setAttribute("aria-label", "Walk up to the bell tower");
      hit.addEventListener("click", () => { close(); openBellTower(); });
    }
    // the bus stop (the little shelter at the end of the Hawkins road): "catch the bus?" takes you to Hawkins (scenes/hawkins.js)
    const askBus = () => {
      if (document.getElementById("ao3-bus-ask")) return;
      const ask = el("div", "position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(6,4,16,0.62);");
      ask.id = "ao3-bus-ask";
      ask.addEventListener("click", ev => { if (ev.target === ask) ask.remove(); });
      const dlg = el("div", "width:100%;max-width:300px;box-sizing:border-box;border-radius:18px;padding:20px 18px 16px;background:rgba(24,17,44,0.98);border:1px solid rgba(190,170,255,0.35);box-shadow:0 12px 36px rgba(0,0,0,0.6);color:#e6dcf5;text-align:center;");
      dlg.appendChild(el("div", "font-size:26px;", "\u{1F68C}"));
      dlg.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:16px;margin-top:6px;", "Catch the bus?"));
      dlg.appendChild(el("div", "font-size:12.5px;line-height:1.45;opacity:0.75;margin:6px 0 14px;", "It goes to Hawkins, Indiana."));
      const row = el("div", "display:flex;gap:8px;justify-content:center;");
      const stay = el("button", "flex:1 1 0;border:1px solid rgba(190,170,255,0.35);background:rgba(255,255,255,0.06);color:#e6dcf5;border-radius:999px;padding:9px 12px;font:600 13px/1 inherit;font-family:inherit;cursor:pointer;", "Stay");
      const go = el("button", "flex:1 1 0;border:1px solid rgba(255,217,138,0.6);background:rgba(255,217,138,0.18);color:#ffe9b0;border-radius:999px;padding:9px 12px;font:600 13px/1 inherit;font-family:inherit;cursor:pointer;", "Board");
      stay.type = "button"; go.type = "button";
      stay.onclick = () => ask.remove();
      go.onclick = () => { ask.remove(); close(); openHawkins(true); };
      row.appendChild(stay); row.appendChild(go); dlg.appendChild(row);
      ask.appendChild(dlg); box.appendChild(ask);
      go.focus();
    };
    {
      const hit = sv("rect", { x: 272, y: 420, width: 82, height: 60, fill: "transparent" }, svg);
      hit.style.cursor = "pointer"; hit.setAttribute("role", "button"); hit.setAttribute("aria-label", "Catch the bus to Hawkins");
      hit.addEventListener("click", askBus);
    }
    field.appendChild(svg);

    // ── time of day (same three looks as the grounds) ──
    const TIMES = [
      { label: "\u{1F319} night", name: "night", bg: "linear-gradient(180deg,#0c0a1c 0%,#1a1330 45%,#231a38 100%)", stars: 1, orb: "#efe6bd", dy: 0, lit: 1, tint: ["#000000", 0], say: "Night in Hollowbrook. The bell has stopped; the lamps haven’t." },
      { label: "\u{1F307} dusk", name: "dusk", bg: "linear-gradient(180deg,#2b1b4a 0%,#6a3566 35%,#a85a52 55%,#33203c 100%)", stars: 0.3, orb: "#ffb067", dy: 34, lit: 0.9, tint: ["#ff8a5c", 0.1], say: "Dusk. Every window is deciding whether to light up." },
      { label: "\u{1F305} dawn", name: "dawn", bg: "linear-gradient(180deg,#27356a 0%,#6e75b0 32%,#d9a0a0 55%,#42354f 100%)", stars: 0.12, orb: "#fff1c9", dy: 24, lit: 0.6, tint: ["#ffc9c9", 0.09], say: "Dawn. The first chimneys are already smoking." }
    ];
    const applyTime = () => {
      const t = TIMES[tI];
      box.style.background = t.bg;
      starG.setAttribute("opacity", t.stars);
      moonDisc.setAttribute("fill", t.orb);
      moonG.setAttribute("transform", `translate(0 ${t.dy})`);
      lit.setAttribute("opacity", t.lit);
      tint.setAttribute("fill", t.tint[0]); tint.setAttribute("opacity", t.tint[1]);
      timeBtn.textContent = t.label;
      sub.textContent = "village · " + t.name;
      caption.textContent = t.say;
    };
    const timeBtn = pill("", "Change the time of day", () => { tI = (tI + 1) % TIMES.length; saveTime(); applyTime(); });
    pill("\u26EA chapel", "Step inside the chapel", () => { close(); openChapel(); });
    pill("\u{1F514} bell tower", "Walk up to the bell tower", () => { close(); openBellTower(); });
    pill("\u{1F68C} bus", "Catch the bus to Hawkins", askBus);
    pill("\u{1FAA6} grounds", "Back to the graveyard grounds", () => { close(); openGraveyardGrounds(); });
    applyTime();
    document.body.appendChild(back);
  }



  // ── 🔔 THE BELL TOWER ──
  // The chapel's own bell tower, seen up close (tap the tower behind the chapel in Hollowbrook, or the bell tower pill).
  //  · the bell: one finished fic = one ring. Each tap rings the next fic you finished, latest first, then back
  //    round again. The note comes from the fic (its pitch from the work, how long it hangs in the air from its
  //    word count) and the bell swings as it rings. No two taps sound quite the same.
  //  · the rope: tap it and the tower rings out this year's finished fics in the order you finished them,
  //    one stroke each, so you can hear how many there are. The caption counts along.
  //  · the hour: at the top of every hour the bell tolls the hour. The graveyard grounds hear it too, far off
  //    and quiet (see the toll hook in openGraveyardGrounds), which is what ties the two places together.
  // Sound is made with the Web Audio API (no sound files). Browsers only allow sound after a tap, so the
  // grounds wake the audio up on the first tap anywhere inside them. A "sound on / off" pill in the tower
  // keeps one tiny setting (ao3-bell-mute) that the grounds' toll obeys too. Nothing else is saved.

  const BELL_MUTE_KEY = "ao3-bell-mute";
  const BELL_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const BELL_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];            // a pentatonic ladder, so any mix of fics sounds kind together
  const BELL_HOUR = { freq: 130.81, len: 4.8, bright: 0.45, hue: 42 };   // the hour bell: low and slow
  let bellAC = null, bellNoise = null;
  const bellMuted = () => { try { return localStorage.getItem(BELL_MUTE_KEY) === "1"; } catch { return false; } };
  const setBellMuted = m => { try { localStorage.setItem(BELL_MUTE_KEY, m ? "1" : "0"); } catch {} };

  // Call from a tap. Creates the audio context the first time and wakes it up if the browser put it to sleep.
  function bellUnlock() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!bellAC) bellAC = new AC();
      if (bellAC.state === "suspended") bellAC.resume();
      return bellAC;
    } catch { return null; }
  }

  // One finished fic's bell: pitch from the work itself, how long it rings from its word count, a little brightness from the work too.
  function bellVoice(fic) {
    const key = String((fic && (fic.workId || fic.title)) || "?");
    const h = Math.abs(Math.floor(gyHash(key))), h2 = Math.abs(Math.floor(gyHash("bell" + key)));
    const words = Number(fic && fic.words) || 0;
    return { freq: 196 * Math.pow(2, BELL_SCALE[h % BELL_SCALE.length] / 12), len: 2.4 + Math.min(3.2, Math.log10(words + 10) * 0.55), bright: 0.5 + (h2 % 100) / 100, hue: h % 360 };
  }

  // Strike once. Several sine partials at bell-like ratios, each fading at its own rate, plus a soft clapper click.
  // opts: delay (seconds from now), vol, distant (muffled, for the grounds). Returns false if nothing could play.
  function bellStrike(voice, opts) {
    const o = opts || {};
    const ac = bellUnlock();
    if (!ac || ac.state !== "running" || bellMuted()) return false;
    try {
      const t0 = ac.currentTime + (o.delay || 0) + 0.01;
      const out = ac.createGain(); out.gain.value = o.vol != null ? o.vol : 0.2;
      if (o.distant) { const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 650; out.connect(lp); lp.connect(ac.destination); }
      else out.connect(ac.destination);
      const jitter = Math.pow(2, ((Math.random() - 0.5) * 14) / 1200);          // a few cents either way, so no two taps match
      const PARTS = [[0.5, 0.55, 1.0], [1, 1, 0.85], [1.183, 0.6, 0.6], [1.506, 0.42, 0.45], [2, 0.5, 0.35], [2.514, 0.26, 0.22], [3.011, 0.18, 0.15], [4.166, 0.1, 0.09]];   // [ratio, loudness, share of the ring time]
      const norm = PARTS.reduce((s, p) => s + p[1], 0);
      PARTS.forEach(([ratio, amp, share], i) => {
        const osc = ac.createOscillator(), g = ac.createGain();
        osc.type = "sine"; osc.frequency.value = voice.freq * ratio * jitter;
        const peak = (amp / norm) * (i >= 4 ? voice.bright * (0.75 + Math.random() * 0.5) : 1);
        const d = Math.max(0.35, voice.len * share);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
        osc.connect(g); g.connect(out);
        osc.start(t0); osc.stop(t0 + d + 0.05);
      });
      if (!bellNoise) {
        bellNoise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.05), ac.sampleRate);
        const d = bellNoise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const ns = ac.createBufferSource(), bp = ac.createBiquadFilter(), ng = ac.createGain();
      ns.buffer = bellNoise; bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 0.8;
      ng.gain.setValueAtTime(0.0001, t0); ng.gain.exponentialRampToValueAtTime(0.1, t0 + 0.004); ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
      ns.connect(bp); bp.connect(ng); ng.connect(out); ns.start(t0);
      return true;
    } catch { return false; }
  }

  // Calls onHour(hour24) at the top of every hour until the returned stop function is called.
  // A tab that slept through the hour doesn't toll for it late.
  function startHourToll(onHour) {
    let timer = 0, alive = true;
    const arm = () => {
      const now = new Date(), next = new Date(now.getTime());
      next.setHours(now.getHours() + 1, 0, 0, 0);
      timer = setTimeout(() => {
        if (!alive) return;
        const late = Date.now() - next.getTime();
        arm();
        if (late < 60000) { try { onHour(next.getHours()); } catch {} }
      }, next.getTime() - now.getTime());
    };
    arm();
    return () => { alive = false; clearTimeout(timer); };
  }

  // Every finished fic with the day it finished (same rule as the chapel's window), oldest first.
  function bellRings() {
    let log = [];
    try { const l = JSON.parse(localStorage.getItem(READ_LOG_KEY) || "[]"); if (Array.isArray(l)) log = l.filter(e => e && e.date); } catch {}
    const lastDay = new Map();
    log.forEach(e => { const id = String(e.key || "").split("::")[0]; if (!id) return; const d = String(e.date).slice(0, 10); if (!lastDay.has(id) || d > lastDay.get(id)) lastDay.set(id, d); });
    return getTracked().filter(f => f.finished).map(f => ({
      f, title: f.title || `Work ${f.workId}`, words: Number(f.words) || 0,
      day: lastDay.get(String(f.workId)) || (f.lastUpdate && String(f.lastUpdate).slice(0, 10)) || (f.trackedAt && String(f.trackedAt).slice(0, 10)) || ""
    })).sort((a, b) => a.day < b.day ? -1 : a.day > b.day ? 1 : 0);
  }

  function openBellTower() {
    const old = document.getElementById("ao3-belltower");
    if (old) old.remove();
    if (!document.getElementById("ao3-bt-css")) {
      const st = document.createElement("style");
      st.id = "ao3-bt-css";
      st.textContent = `
        @keyframes btFlicker{0%,100%{opacity:.8}30%{opacity:1}60%{opacity:.62}}
        @keyframes btMist{0%,100%{opacity:.08;transform:translateX(-8px)}50%{opacity:.2;transform:translateX(8px)}}
        @media (prefers-reduced-motion: reduce){.bt-anim{animation:none !important}}
      `;
      (document.head || document.documentElement).appendChild(st);
    }
    const el = (tag, css, text) => {
      const e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (text != null) e.textContent = text;
      return e;
    };
    const NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs, parent) => {
      const e = document.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
      if (parent) parent.appendChild(e);
      return e;
    };
    const anim = (node, css) => { node.setAttribute("class", "bt-anim"); node.style.cssText += css; return node; };
    const rnd = seed => { const x = Math.sin(gyHash(String(seed)) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const vibrate = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch {} };
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
    const fmtDay = d => { try { const x = new Date(d + "T12:00:00"); return isNaN(x) ? "" : x.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };

    // time of day: shared with the village and the grounds ("tm" in ao3-gg-prefs); only that one value is touched
    const PKEY = "ao3-gg-prefs";
    let tI = 0;
    try { const p = JSON.parse(localStorage.getItem(PKEY) || "{}") || {}; tI = Math.max(0, Math.min(2, p.tm | 0)); } catch {}
    const saveTime = () => {
      try { const p = JSON.parse(localStorage.getItem(PKEY) || "{}") || {}; p.tm = tI; localStorage.setItem(PKEY, JSON.stringify(p)); } catch {}
    };

    // the bells: every finished fic, latest first for tapping; this year's in the order they finished for the rope
    const rings = bellRings();
    const order = rings.slice().reverse();
    const year = String(new Date().getFullYear());
    const thisYear = rings.filter(r => r.day.slice(0, 4) === year);
    let cursor = 0, pealId = 0;

    // ── shell (same look as the village) ──
    const back = el("div", "position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000002;");
    back.id = "ao3-belltower";
    const box = el("div", "position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:8px;right:8px;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.6);border:1px solid rgba(190,170,255,0.18);");
    back.appendChild(box);
    const topbar = el("div", "flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(190,170,255,0.18);background:rgba(8,6,22,0.55);z-index:3;");
    const ttl = el("div", "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;");
    ttl.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:15px;letter-spacing:0.05em;line-height:1.2;text-transform:uppercase;color:#d9d0f5;", "\u{1F514} Bell tower"));
    const sub = el("div", "font-size:10px;letter-spacing:0.04em;color:rgba(217,208,245,0.6);", "");
    ttl.appendChild(sub);
    const xBtn = el("button", "background:none;border:none;color:rgba(217,208,245,0.7);cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px;", "\u2715");
    xBtn.type = "button"; xBtn.setAttribute("aria-label", "Close");
    topbar.appendChild(ttl); topbar.appendChild(xBtn);
    box.appendChild(topbar);
    const tools = el("div", "flex:0 0 auto;display:flex;gap:6px;padding:7px 14px;overflow-x:auto;-webkit-overflow-scrolling:touch;border-bottom:1px solid rgba(190,170,255,0.12);background:rgba(8,6,22,0.4);z-index:3;");
    const pill = (label, title, fn) => {
      const b = el("button", "flex:0 0 auto;border:1px solid rgba(190,170,255,0.3);background:rgba(255,255,255,0.06);color:#e6dcf5;border-radius:999px;padding:5px 11px;font:500 12px/1 inherit;font-family:inherit;cursor:pointer;white-space:nowrap;", label);
      b.type = "button"; b.title = title; b.onclick = fn; tools.appendChild(b); return b;
    };
    box.appendChild(tools);
    const field = el("div", "position:relative;flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;");
    box.appendChild(field);
    const caption = el("div", "flex:0 0 auto;min-height:38px;padding:9px 14px;text-align:center;border-top:1px solid rgba(190,170,255,0.15);font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:12.5px;color:rgba(230,220,245,0.85);background:rgba(8,6,22,0.45);display:flex;align-items:center;justify-content:center;");
    box.appendChild(caption);

    let raf = 0, clockTimer = 0, stopToll = () => {};
    const onKey = e => { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); close(); } };
    const close = () => {
      pealId++; timers.forEach(clearTimeout); timers.clear();
      cancelAnimationFrame(raf); clearInterval(clockTimer); stopToll();
      back.remove(); document.removeEventListener("keydown", onKey, true);
    };
    xBtn.onclick = close;
    back.addEventListener("click", e => { if (e.target === back) close(); });
    back.addEventListener("pointerdown", () => { bellUnlock(); }, { passive: true });
    document.addEventListener("keydown", onKey, true);

    // ── the picture: 360 x 640 ──
    const W = 360, H = 640;
    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMin meet" });
    svg.style.cssText = "width:100%;height:auto;display:block;";
    const defs = sv("defs", {}, svg);
    const glow = sv("radialGradient", { id: "bt-glow" }, defs);
    sv("stop", { offset: "0%", "stop-color": "#ffd98a", "stop-opacity": "0.75" }, glow);
    sv("stop", { offset: "100%", "stop-color": "#ffd98a", "stop-opacity": "0" }, glow);
    const slot = sv("linearGradient", { id: "bt-slot", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    sv("stop", { offset: "0%", "stop-color": "#8a5a2e" }, slot);
    sv("stop", { offset: "100%", "stop-color": "#2a1d2c" }, slot);
    const fade = sv("linearGradient", { id: "bt-fade", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    sv("stop", { offset: "0%", "stop-color": "#0a0818", "stop-opacity": "0" }, fade);
    sv("stop", { offset: "100%", "stop-color": "#0a0818", "stop-opacity": "0.85" }, fade);

    const starG = sv("g", {}, svg);
    for (let i = 0; i < 46; i++) sv("circle", { cx: (rnd("bsx" + i) * W).toFixed(1), cy: (rnd("bsy" + i) * 300).toFixed(1), r: (0.5 + rnd("bsr" + i) * 0.9).toFixed(2), fill: "#fff", opacity: (0.25 + rnd("bso" + i) * 0.6).toFixed(2) }, starG);
    const moonG = sv("g", {}, svg);
    const moonDisc = sv("circle", { cx: 292, cy: 60, r: 16, fill: "#efe6bd" }, moonG);
    sv("circle", { cx: 292, cy: 60, r: 32, fill: "url(#bt-glow)", opacity: 0.3 }, moonG);
    sv("path", { d: "M0 410 Q60 380 130 404 T250 396 T360 406 V500 H0 Z", fill: "#2a2147" }, svg);
    sv("path", { d: "M0 450 Q90 428 180 448 T360 438 V520 H0 Z", fill: "#241b3b" }, svg);
    sv("rect", { x: 0, y: 480, width: W, height: H - 480, fill: "#1a1a2e" }, svg);
    for (let i = 0; i < 70; i++) {
      const gx = 6 + rnd("btx" + i) * (W - 12), gy = 490 + rnd("bty" + i) * (H - 510);
      if (Math.abs(gx - 180) < 40 + (gy - 520) * 0.2) continue;
      sv("path", { d: `M${gx.toFixed(1)} ${gy.toFixed(1)} l-2 -5 M${gx.toFixed(1)} ${gy.toFixed(1)} l0 -7 M${gx.toFixed(1)} ${gy.toFixed(1)} l2 -5`, stroke: "#3f6552", "stroke-width": 1.3, fill: "none", "stroke-linecap": "round", opacity: 0.65 }, svg);
    }

    // the path from the door down to the village
    sv("path", { d: "M166 520 H194 L222 640 H138 Z", fill: "#2b2540" }, svg);
    for (let i = 0; i < 9; i++) sv("path", { d: `M${166 - i * 3} ${526 + i * 13} H${194 + i * 3}`, stroke: "#3a3158", "stroke-width": 1, opacity: 0.7 }, svg);

    // the tower: a stone shaft, a belfry with an open arch, a pointed roof and a weathervane
    sv("rect", { x: 130, y: 262, width: 100, height: 258, fill: "#3a2e52" }, svg);
    for (let yy = 276; yy < 520; yy += 22) sv("rect", { x: 128, y: yy, width: 104, height: 2.4, fill: "#4a3d66" }, svg);
    sv("rect", { x: 118, y: 150, width: 124, height: 112, fill: "#46385f" }, svg);
    sv("rect", { x: 114, y: 258, width: 132, height: 6, fill: "#5a4b6f" }, svg);
    sv("polygon", { points: "110,152 250,152 180,72", fill: "#2a2040" }, svg);
    sv("path", { d: "M110 152 L180 72 L250 152", fill: "none", stroke: "#4a3d66", "stroke-width": 1.4, "stroke-linejoin": "round" }, svg);
    sv("path", { d: "M180 72 V50 M174 56 H186", stroke: "#8a7aa8", "stroke-width": 1.8, fill: "none", "stroke-linecap": "round" }, svg);
    sv("path", { d: "M152 258 V196 a28 28 0 0 1 56 0 V258 Z", fill: "#0f0a1c" }, svg);           // the open arch
    sv("path", { d: "M148 258 V196 a32 32 0 0 1 64 0 V258", fill: "none", stroke: "#5a4b6f", "stroke-width": 4 }, svg);
    sv("circle", { cx: 180, cy: 214, r: 44, fill: "url(#bt-glow)", opacity: 0.28 }, svg);
    sv("rect", { x: 156, y: 174, width: 48, height: 5, rx: 1.5, fill: "#5a4030" }, svg);          // the beam the bell hangs from

    // the bell, in its own group so it can swing from the beam
    const swingG = sv("g", {}, svg);
    const clapG = sv("g", {}, swingG);
    sv("path", { d: "M164 238 Q170 233 171 220 Q172 198 180 186 Q188 198 189 220 Q190 233 196 238 Z", fill: "#c9a24a", stroke: "#8a6d2a", "stroke-width": 1 }, swingG);
    sv("path", { d: "M174 214 Q175 202 180 194", fill: "none", stroke: "#f2dc9a", "stroke-width": 1.4, "stroke-linecap": "round", opacity: 0.7 }, swingG);
    sv("rect", { x: 177, y: 178, width: 6, height: 9, rx: 1.5, fill: "#6a4a2a" }, swingG);
    sv("line", { x1: 180, y1: 190, x2: 180, y2: 236, stroke: "#6a5a3a", "stroke-width": 1.4 }, clapG);
    sv("circle", { cx: 180, cy: 238, r: 3.3, fill: "#8a6d2a" }, clapG);
    const fxG = sv("g", { "pointer-events": "none" }, svg);                                          // ripples when it rings

    // a clock on the shaft, showing the real time (the bell tolls when both hands point up)
    sv("circle", { cx: 180, cy: 296, r: 17, fill: "#1a1228", stroke: "#5a4b6f", "stroke-width": 2.4 }, svg);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; sv("line", { x1: (180 + Math.sin(a) * 13.5).toFixed(1), y1: (296 - Math.cos(a) * 13.5).toFixed(1), x2: (180 + Math.sin(a) * 15).toFixed(1), y2: (296 - Math.cos(a) * 15).toFixed(1), stroke: "#cbbfe0", "stroke-width": i % 3 ? 0.7 : 1.3, opacity: 0.8 }, svg); }
    const hHand = sv("line", { x1: 180, y1: 296, x2: 180, y2: 287, stroke: "#e6dcf5", "stroke-width": 1.8, "stroke-linecap": "round" }, svg);
    const mHand = sv("line", { x1: 180, y1: 296, x2: 180, y2: 283, stroke: "#e6dcf5", "stroke-width": 1.1, "stroke-linecap": "round" }, svg);
    sv("circle", { cx: 180, cy: 296, r: 1.4, fill: "#ffd98a" }, svg);
    const setClock = () => {
      const d = new Date();
      hHand.setAttribute("transform", `rotate(${((d.getHours() % 12) + d.getMinutes() / 60) * 30} 180 296)`);
      mHand.setAttribute("transform", `rotate(${d.getMinutes() * 6} 180 296)`);
    };
    setClock(); clockTimer = setInterval(setClock, 20000);

    // the rope: it comes down inside the tower and shows through a tall lit slit, with a striped grip (the sally)
    sv("rect", { x: 171, y: 324, width: 18, height: 146, rx: 3, fill: "url(#bt-slot)" }, svg);
    sv("rect", { x: 169, y: 322, width: 22, height: 150, rx: 4, fill: "none", stroke: "#5a4b6f", "stroke-width": 2.4 }, svg);
    const ropeG = sv("g", {}, svg);
    sv("path", { d: "M180 324 V452", stroke: "#e8d7b0", "stroke-width": 2.2, fill: "none", "stroke-linecap": "round" }, ropeG);
    sv("rect", { x: 176.5, y: 392, width: 7, height: 34, rx: 3, fill: "#b3304a" }, ropeG);
    [398, 406, 414, 422].forEach(yy => sv("rect", { x: 176.5, y: yy, width: 7, height: 2.6, fill: "#f3e6d0" }, ropeG));
    sv("circle", { cx: 180, cy: 454, r: 2.6, fill: "#e8d7b0" }, ropeG);

    // the door, lanterns, and yews either side
    sv("path", { d: "M164 520 V502 a16 16 0 0 1 32 0 V520 Z", fill: "#120d22" }, svg);
    sv("rect", { x: 158, y: 518, width: 44, height: 4, fill: "#5a4b6f" }, svg);
    [112, 248].forEach(yx => {
      sv("rect", { x: yx - 2, y: 506, width: 4, height: 16, fill: "#2c2028" }, svg);
      sv("ellipse", { cx: yx, cy: 500, rx: 14, ry: 22, fill: "#1b2f2b" }, svg);
      sv("ellipse", { cx: yx - 3, cy: 494, rx: 8, ry: 14, fill: "#223d36" }, svg);
    });
    // a signpost back to the village (tap it)
    const post = sv("g", {}, svg);
    sv("rect", { x: 289, y: 548, width: 3.4, height: 52, fill: "#4a3326" }, post);
    sv("polygon", { points: "258,552 286,552 296,558 286,564 258,564", fill: "#6a4a30" }, post);
    const pt = sv("text", { x: 271, y: 560.2, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 5.6, fill: "#f3e7c8" }, post); pt.textContent = "Hollowbrook";
    [[118, 566], [244, 566]].forEach(([lx, base], i) => {
      sv("rect", { x: lx - 1.2, y: base - 30, width: 2.4, height: 30, fill: "#2c2438" }, svg);
      sv("rect", { x: lx - 3.5, y: base - 38, width: 7, height: 9, rx: 1.6, fill: "#ffd98a" }, svg);
    });
    const lit = sv("g", {}, svg);
    [[118, 566], [244, 566]].forEach(([lx, base], i) => anim(sv("circle", { cx: lx, cy: base - 34, r: 24, fill: "url(#bt-glow)" }, lit), `animation:btFlicker ${(2.2 + rnd("bl" + i) * 1.6).toFixed(1)}s ease-in-out infinite;`));
    [[180, 512, 16]].forEach(([gx, gy, gr]) => anim(sv("circle", { cx: gx, cy: gy, r: gr, fill: "url(#bt-glow)" }, lit), "animation:btFlicker 2.8s ease-in-out infinite;"));
    [[110, 600], [250, 618]].forEach(([mx, my], i) => anim(sv("ellipse", { cx: mx, cy: my, rx: 70, ry: 12, fill: "#c8bee6", opacity: 0.1 }, svg), `animation:btMist ${10 + i * 3}s ease-in-out infinite;`));
    sv("rect", { x: 0, y: 580, width: W, height: H - 580, fill: "url(#bt-fade)", "pointer-events": "none" }, svg);
    const tint = sv("rect", { x: 0, y: 0, width: W, height: H, fill: "#000", opacity: 0, "pointer-events": "none" }, svg);

    // ── the swing: a little spring, so a second ring catches the bell mid-swing instead of snapping it back ──
    let ang = 0, vel = 0, dir = 1, last = 0;
    const K = Math.pow(2 * Math.PI / 1.7, 2), C = 1.2;
    const drawSwing = () => {
      swingG.setAttribute("transform", `rotate(${ang.toFixed(2)} 180 178)`);
      clapG.setAttribute("transform", `rotate(${(-ang * 0.9 - vel * 0.06).toFixed(2)} 180 190)`);
    };
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      vel += (-K * ang - C * vel) * dt; ang += vel * dt;
      if (Math.abs(ang) < 0.05 && Math.abs(vel) < 0.3) { ang = 0; vel = 0; drawSwing(); raf = 0; return; }
      drawSwing(); raf = requestAnimationFrame(tick);
    };
    const kick = v => {
      dir = -dir; vel += dir * v * (reduce ? 0.12 : 1);
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };
    const ripple = hue => {
      const c = sv("circle", { cx: 180, cy: 212, r: 30, fill: "none", stroke: `hsl(${hue},70%,74%)`, "stroke-width": 2, opacity: 0 }, fxG);
      c.style.cssText = "transform-box:fill-box;transform-origin:center;";
      if (reduce || !c.animate) { c.remove(); return; }
      try { const a = c.animate([{ transform: "scale(.5)", opacity: 0.8 }, { transform: "scale(3.4)", opacity: 0 }], { duration: 1500, easing: "ease-out" }); a.onfinish = () => c.remove(); } catch { c.remove(); }
    };
    // one stroke: the sound, the swing and the ripple together
    const stroke = (voice, vol) => { bellStrike(voice, { vol }); kick(88); ripple(voice.hue); };
    const knock = () => { bellStrike({ freq: 110, len: 0.9, bright: 0.05, hue: 260 }, { vol: 0.1 }); kick(26); };
    const offNote = () => bellMuted() ? " (sound is off)" : "";

    // ── tap the bell: the next fic you finished rings ──
    const ringBell = () => {
      bellUnlock(); vibrate(12); pealId++;
      if (!order.length) { knock(); caption.textContent = "No fic has finished yet. The bell is waiting for its first."; return; }
      const r = order[cursor % order.length]; cursor++;
      stroke(bellVoice(r.f), 0.2);
      const when = fmtDay(r.day);
      caption.textContent = `${r.title}${when ? " \u00B7 finished " + when : ""}${r.words ? " \u00B7 " + r.words.toLocaleString() + " words" : ""}${offNote()}`;
    };
    // ── tap the rope: this year rings out, one stroke per fic, in the order you finished them ──
    const pullRope = () => {
      bellUnlock(); vibrate(14);
      try { if (ropeG.animate && !reduce) ropeG.animate([{ transform: "translateY(0)" }, { transform: "translateY(14px)" }, { transform: "translateY(0)" }], { duration: 420, easing: "ease-out" }); } catch {}
      const id = ++pealId, n = thisYear.length;
      if (!n) { knock(); caption.textContent = `Nothing has rung this year yet. The rope is waiting.`; return; }
      const gap = Math.max(220, Math.min(800, 7000 / n));
      thisYear.forEach((r, i) => later(() => {
        if (id !== pealId) return;
        stroke(bellVoice(r.f), 0.15);
        caption.textContent = `${i + 1} of ${n} \u00B7 ${r.title}`;
        if (i === n - 1) later(() => { if (id === pealId) caption.textContent = `${n} ${n === 1 ? "fic has" : "fics have"} rung this year.${offNote()}`; }, 1500);
      }, i * gap));
    };
    const hotspot = (x, y, w, h, label, fn) => {
      const hit = sv("rect", { x, y, width: w, height: h, fill: "transparent" }, svg);
      hit.style.cursor = "pointer"; hit.setAttribute("role", "button"); hit.setAttribute("aria-label", label);
      hit.addEventListener("click", fn);
    };
    hotspot(150, 168, 60, 92, "Ring the bell", ringBell);
    hotspot(158, 322, 44, 160, "Pull the rope to hear how many fics have rung this year", pullRope);
    hotspot(256, 546, 44, 56, "Back to Hollowbrook village", () => { close(); openHollowbrook(); });
    field.appendChild(svg);

    // ── the hour: the bell tolls it here for real (the grounds hear it from far off) ──
    stopToll = startHourToll(h24 => {
      const n = h24 % 12 || 12; pealId++;
      caption.textContent = `The hour: ${BELL_WORDS[n]} o\u2019clock.${offNote()}`;
      for (let i = 0; i < n; i++) later(() => stroke(BELL_HOUR, 0.22), i * 2600);
    });

    // ── time of day (same three looks as the village) ──
    const TIMES = [
      { label: "\u{1F319} night", name: "night", bg: "linear-gradient(180deg,#0c0a1c 0%,#1a1330 45%,#231a38 100%)", stars: 1, orb: "#efe6bd", dy: 0, lit: 1, tint: ["#000000", 0], say: "Night at the bell tower. The bell is only resting." },
      { label: "\u{1F307} dusk", name: "dusk", bg: "linear-gradient(180deg,#2b1b4a 0%,#6a3566 35%,#a85a52 55%,#33203c 100%)", stars: 0.3, orb: "#ffb067", dy: 34, lit: 0.9, tint: ["#ff8a5c", 0.1], say: "Dusk. The rope sways a little in the draught." },
      { label: "\u{1F305} dawn", name: "dawn", bg: "linear-gradient(180deg,#27356a 0%,#6e75b0 32%,#d9a0a0 55%,#42354f 100%)", stars: 0.12, orb: "#fff1c9", dy: 24, lit: 0.6, tint: ["#ffc9c9", 0.09], say: "Dawn. The bell gets the first word." }
    ];
    const applyTime = announce => {
      const t = TIMES[tI];
      box.style.background = t.bg;
      starG.setAttribute("opacity", t.stars);
      moonDisc.setAttribute("fill", t.orb);
      moonG.setAttribute("transform", `translate(0 ${t.dy})`);
      lit.setAttribute("opacity", t.lit);
      tint.setAttribute("fill", t.tint[0]); tint.setAttribute("opacity", t.tint[1]);
      timeBtn.textContent = t.label;
      sub.textContent = "by the village \u00B7 " + t.name;
      if (announce) caption.textContent = t.say;
    };
    const timeBtn = pill("", "Change the time of day", () => { tI = (tI + 1) % TIMES.length; saveTime(); applyTime(true); });
    const soundBtn = pill("", "Turn the bell's sound on or off", () => { setBellMuted(!bellMuted()); bellUnlock(); syncSound(); });
    const syncSound = () => { soundBtn.textContent = bellMuted() ? "\u{1F515} sound off" : "\u{1F514} sound on"; };
    pill("\u{1F3D8}\uFE0F village", "Back to Hollowbrook", () => { close(); openHollowbrook(); });
    syncSound(); applyTime(false);
    caption.textContent = "tap the bell to hear a fic \u00B7 tap the rope to hear your year";
    document.body.appendChild(back);
  }



  // ── 🚌 HAWKINS, INDIANA ──
  // The bus stop in Hollowbrook (tap the shelter at the end of the Hawkins road, answer "board") takes you here:
  // a simplified night-time map of the town. Everything is drawn from scratch as flat shapes (no artwork reused).
  // For now only ONE place can be entered, the Wheelers' house (top right): its front lawn, and through the basement
  // window, the basement. The rest are labelled but closed, and tapping one just says so. The bus parked at the bottom
  // takes you back to Hollowbrook.
  //  · openHawkins(arrive)  the map. arrive = true plays the short bus ride in first (tap to skip).
  //  · openWheelers()       the front of the house: Mike's lit window, the glowing basement window (the way in), weather and season.
  //  · openBasement()       through the window well: a D&D table (campaign map, dice, minis) with two small figures sitting close, in a different pose each visit; the stairs up.
  // Same night / dusk / dawn switch as the village and the grounds (the "tm" value in ao3-gg-prefs).
  // Nothing in here saves anything except that one time-of-day value.

  const HK_TIMES = [
    { label: "\u{1F319} night", name: "night", map: "#18203a", sky: "linear-gradient(180deg,#0c0a1c 0%,#1a1330 45%,#231a38 100%)", stars: 1, orb: "#efe6bd", dy: 0, lit: 1, tint: ["#000000", 0],
      say: { map: "Night in Hawkins. Every porch light is a small promise.", house: "Night. Somebody upstairs is still awake." } },
    { label: "\u{1F307} dusk", name: "dusk", map: "#2c2a4a", sky: "linear-gradient(180deg,#2b1b4a 0%,#6a3566 35%,#a85a52 55%,#33203c 100%)", stars: 0.3, orb: "#ffb067", dy: 34, lit: 0.9, tint: ["#ff8a5c", 0.1],
      say: { map: "Dusk. The streetlights are making up their minds.", house: "Dusk. Dinner smells drift out across the lawn." } },
    { label: "\u{1F305} dawn", name: "dawn", map: "#2f3a5e", sky: "linear-gradient(180deg,#27356a 0%,#6e75b0 32%,#d9a0a0 55%,#42354f 100%)", stars: 0.12, orb: "#fff1c9", dy: 24, lit: 0.6, tint: ["#ffc9c9", 0.09],
      say: { map: "Dawn. The paper boys are out already.", house: "Dawn. One window is still lit from last night." } }
  ];
  const hkTimeGet = () => { try { const p = JSON.parse(localStorage.getItem("ao3-gg-prefs") || "{}") || {}; return Math.max(0, Math.min(2, p.tm | 0)); } catch { return 0; } };
  const hkTimeSet = i => { try { const p = JSON.parse(localStorage.getItem("ao3-gg-prefs") || "{}") || {}; p.tm = i; localStorage.setItem("ao3-gg-prefs", JSON.stringify(p)); } catch {} };

  function hkKit() {
    const el = (tag, css, text) => {
      const e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (text != null) e.textContent = text;
      return e;
    };
    const NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs, parent) => {
      const e = document.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
      if (parent) parent.appendChild(e);
      return e;
    };
    const rnd = seed => { const x = Math.sin(gyHash(String(seed)) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const anim = (node, css) => { node.setAttribute("class", "hk-anim"); node.style.cssText += css; return node; };
    return { el, sv, rnd, anim };
  }

  // The frame both Hawkins scenes share (same look as the village). Set shell.onClose to clean up timers.
  function hkShell(id, titleText) {
    const old = document.getElementById(id);
    if (old) old.remove();
    if (!document.getElementById("ao3-hk-css")) {
      const st = document.createElement("style");
      st.id = "ao3-hk-css";
      st.textContent = `
        @keyframes hkFlicker{0%,100%{opacity:.8}30%{opacity:1}60%{opacity:.62}}
        @keyframes hkPulse{0%,100%{opacity:.35}50%{opacity:.9}}
        @keyframes hkMist{0%,100%{opacity:.08;transform:translateX(-8px)}50%{opacity:.2;transform:translateX(8px)}}
        @keyframes hkRain{from{transform:translateY(-30px)}to{transform:translateY(60px)}}
        @keyframes hkFall{0%{transform:translate(0,-20px)}50%{transform:translate(12px,30px)}100%{transform:translate(-6px,80px)}}
        @keyframes hkFog{0%,100%{opacity:.18;transform:translateX(-14px)}50%{opacity:.34;transform:translateX(14px)}}
        @keyframes hkSmoke{0%{opacity:.55;transform:translate(0,0)}100%{opacity:0;transform:translate(9px,-26px)}}
        @keyframes hkTwinkle{0%,100%{opacity:.35}50%{opacity:1}}
        @keyframes hkWave{0%,100%{transform:rotate(-16deg)}50%{transform:rotate(20deg)}}
        @keyframes hkRing{0%{opacity:.8;transform:scale(.4)}100%{opacity:0;transform:scale(2.6)}}
        @keyframes hkBreathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.1px)}}
        @keyframes hkBlink{0%,93%,100%{transform:scaleY(1)}96.5%{transform:scaleY(.08)}}
        @keyframes hkFirefly{0%,100%{opacity:.1;transform:translate(0,0)}25%{opacity:1;transform:translate(8px,-7px)}50%{opacity:.3;transform:translate(-5px,-14px)}75%{opacity:1;transform:translate(7px,-5px)}}
        @media (prefers-reduced-motion: reduce){.hk-anim{animation:none !important}}
      `;
      (document.head || document.documentElement).appendChild(st);
    }
    const kit = hkKit(), el = kit.el;
    const back = el("div", "position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000002;");
    back.id = id;
    // Browsers keep sound switched off until a tap. Wake the audio up as the scene opens, and again on the first tap anywhere in it,
    // so the knock, the walkie-talkie and the radio all work even when you come straight in (e.g. from the main page button).
    bellUnlock();
    back.addEventListener("pointerdown", () => { bellUnlock(); }, { passive: true });
    const box = el("div", "position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:8px;right:8px;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.6);border:1px solid rgba(190,170,255,0.18);");
    back.appendChild(box);
    const topbar = el("div", "flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(190,170,255,0.18);background:rgba(8,6,22,0.55);z-index:3;");
    const ttl = el("div", "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;");
    ttl.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:15px;letter-spacing:0.05em;line-height:1.2;text-transform:uppercase;color:#d9d0f5;", titleText));
    const sub = el("div", "font-size:10px;letter-spacing:0.04em;color:rgba(217,208,245,0.6);", "");
    ttl.appendChild(sub);
    const xBtn = el("button", "background:none;border:none;color:rgba(217,208,245,0.7);cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px;", "\u2715");
    xBtn.type = "button"; xBtn.setAttribute("aria-label", "Close");
    topbar.appendChild(ttl); topbar.appendChild(xBtn);
    box.appendChild(topbar);
    const tools = el("div", "flex:0 0 auto;display:flex;gap:6px;padding:7px 14px;overflow-x:auto;-webkit-overflow-scrolling:touch;border-bottom:1px solid rgba(190,170,255,0.12);background:rgba(8,6,22,0.4);z-index:3;");
    box.appendChild(tools);
    const field = el("div", "position:relative;flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;");
    box.appendChild(field);
    const caption = el("div", "flex:0 0 auto;min-height:38px;padding:9px 14px;text-align:center;border-top:1px solid rgba(190,170,255,0.15);font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:12.5px;color:rgba(230,220,245,0.85);background:rgba(8,6,22,0.45);display:flex;align-items:center;justify-content:center;");
    box.appendChild(caption);
    const pill = (label, title, fn) => {
      const b = el("button", "flex:0 0 auto;border:1px solid rgba(190,170,255,0.3);background:rgba(255,255,255,0.06);color:#e6dcf5;border-radius:999px;padding:5px 11px;font:500 12px/1 inherit;font-family:inherit;cursor:pointer;white-space:nowrap;", label);
      b.type = "button"; b.title = title; b.onclick = fn; tools.appendChild(b); return b;
    };
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
    const shell = { back, box, sub, field, caption, pill, later, onClose: null, close: null, kit };
    const onKey = e => { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); shell.close(); } };
    shell.close = () => {
      timers.forEach(clearTimeout); timers.clear();
      if (shell.onClose) shell.onClose();
      back.remove(); document.removeEventListener("keydown", onKey, true);
    };
    xBtn.onclick = shell.close;
    back.addEventListener("click", e => { if (e.target === back) shell.close(); });
    document.addEventListener("keydown", onKey, true);
    return shell;
  }

  // ── the map ──
  function openHawkins(arrive) {
    const sh = hkShell("ao3-hawkins", "\u{1F68C} Hawkins");
    const { el, sv, rnd, anim } = sh.kit;
    const { box, sub, field, caption, pill, later, close } = sh;
    const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let tI = hkTimeGet();

    const W = 360, H = 600;
    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMin meet" });
    svg.style.cssText = "width:100%;height:auto;display:block;";
    const defs = sv("defs", {}, svg);
    const glow = sv("radialGradient", { id: "hk-glow" }, defs);
    sv("stop", { offset: "0%", "stop-color": "#ffd98a", "stop-opacity": "0.75" }, glow);
    sv("stop", { offset: "100%", "stop-color": "#ffd98a", "stop-opacity": "0" }, glow);
    const ground = sv("rect", { x: 0, y: 0, width: W, height: H, fill: HK_TIMES[0].map }, svg);
    for (let i = 0; i < 160; i++) sv("circle", { cx: (rnd("hmx" + i) * W).toFixed(1), cy: (rnd("hmy" + i) * H).toFixed(1), r: 0.8, fill: "#2a3558", opacity: 0.6 }, svg);   // grain

    // streets: a wide dark road with a faint dashed centre line
    const road = (d, w) => { sv("path", { d, stroke: "#2a3454", "stroke-width": w || 11, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg); sv("path", { d, stroke: "#46527a", "stroke-width": 0.8, "stroke-dasharray": "4 4", fill: "none", opacity: 0.6 }, svg); };
    [["M173 52 V570"], ["M26 178 H336"], ["M54 238 H346"], ["M215 238 V338"], ["M215 305 H346"], ["M300 94 V338"], ["M75 150 V420"], ["M70 398 L172 336"]].forEach(([d]) => road(d));
    const street = (txt, x, y, rot) => { const t = sv("text", { x, y, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 5, "letter-spacing": 1, fill: "#9aa6cc", opacity: 0.8, transform: rot ? `rotate(${rot} ${x} ${y})` : "" }, svg); t.textContent = txt; };
    street("CHERRY OAK DRIVE", 173, 430, -90); street("WATER STREET", 262, 180, 0); street("MAIN STREET", 120, 240, 0);
    street("MULBERRY STREET", 300, 215, -90); street("KERLEY BLVD", 75, 340, -90); street("6TH STREET", 280, 307, 0); street("OAK STREET", 215, 285, -90);

    const solids = [];                                   // boxes the trees keep out of
    const lits = [];                                     // everything that glows, drawn last
    const litRect = (x, y, w, h, op, r) => lits.push(g => { if (r) sv("circle", { cx: x + w / 2, cy: y + h / 2, r, fill: "url(#hk-glow)", opacity: 0.45 }, g); sv("rect", { x, y, width: w, height: h, fill: "#f0b45a", opacity: op }, g); });
    const label = (txt, x, y, col) => { const t = sv("text", { x, y, "text-anchor": "middle", "font-family": "Georgia,serif", "font-style": "italic", "font-size": 6.4, fill: col || "#cbbfe0", opacity: 0.85 }, svg); t.textContent = txt; };
    const say = t => { caption.textContent = t; };
    const closed = (x, y, w, h, name) => {              // a place that isn't open yet: tapping it just says so
      const hit = sv("rect", { x: x - 2, y: y - 12, width: w + 4, height: h + 26, fill: "transparent" }, svg);
      hit.style.cursor = "pointer"; hit.setAttribute("role", "button"); hit.setAttribute("aria-label", name);
      hit.addEventListener("click", () => say(`${name}. Closed for now.`));
    };
    // a plain little building: walls, a roof, a couple of lit windows
    const building = (x, y, w, h, wall, roof, name, o) => {
      o = o || {};
      solids.push([x - 6, y - 14, w + 12, h + 30]);
      sv("rect", { x, y, width: w, height: h, fill: wall }, svg);
      if (o.pitch) sv("polygon", { points: `${x - 3},${y + 1} ${x + w + 3},${y + 1} ${x + w / 2},${y - o.pitch}`, fill: roof }, svg);
      else sv("rect", { x: x - 2, y: y - 4, width: w + 4, height: 5, fill: roof }, svg);
      const n = Math.max(1, Math.floor((w - 6) / 14));
      for (let i = 0; i < n; i++) { const wx = x + 5 + i * ((w - 10) / n) + ((w - 10) / n - 7) / 2; if (rnd(name + i) > 0.2) litRect(wx, y + h * 0.3, 7, Math.min(9, h * 0.34), 0.85, 11); else sv("rect", { x: wx, y: y + h * 0.3, width: 7, height: Math.min(9, h * 0.34), fill: "#120d22" }, svg); }
      label(name, x + w / 2, y + h + 9);
      closed(x, y, w, h, name);
    };

    // natural things: the quarry and the lake
    const water = (cx, cy, rx, ry, name) => { solids.push([cx - rx - 8, cy - ry - 8, rx * 2 + 16, ry * 2 + 24]); sv("ellipse", { cx, cy, rx: rx + 4, ry: ry + 3, fill: "#34364a" }, svg); sv("ellipse", { cx, cy, rx, ry, fill: "#1f3a5e" }, svg); sv("path", { d: `M${cx - rx * 0.5} ${cy} q${rx * 0.25} -3 ${rx * 0.5} 0 t${rx * 0.5} 0`, stroke: "#4a6a96", "stroke-width": 0.9, fill: "none", opacity: 0.8 }, svg); label(name, cx, cy + ry + 14); };
    water(36, 288, 22, 12, "Sattler\u2019s Quarry"); water(128, 506, 36, 16, "Lover\u2019s Lake");

    // the town
    building(100, 142, 62, 17, "#7a3a30", "#2a2236", "Middle school");
    building(190, 188, 70, 28, "#8a4a3a", "#3a3347", "General store");
    building(130, 248, 44, 32, "#5a2a28", "#2a2236", "The Hawk");
    litRect(138, 262, 28, 4, 0.95, 16);                                   // the marquee
    building(222, 250, 54, 30, "#8a3a3a", "#2f2540", "Town hall", { pitch: 9 });
    building(148, 362, 48, 20, "#8a7a60", "#3a3040", "The Byers\u2019", { pitch: 9 });
    building(298, 384, 46, 22, "#5a4030", "#2a2236", "Hopper\u2019s cabin", { pitch: 8 });
    building(20, 416, 54, 58, "#4a5570", "#2a2236", "Hawkins Lab");
    building(196, 68, 40, 34, "#2a4a5a", "#23203a", "The Creels\u2019", { pitch: 12 });
    building(310, 100, 40, 18, "#37507a", "#27406a", "The Sinclairs\u2019", { pitch: 7 });

    // the Wheelers' house, top right: brick below, white siding above. The one place you can go in.
    solids.push([226, 8, 124, 84]);
    const hw = sv("g", {}, svg);
    sv("rect", { x: 240, y: 28, width: 92, height: 14, fill: "#cfc9dc" }, hw);
    sv("rect", { x: 240, y: 42, width: 92, height: 16, fill: "#7d3a33" }, hw);
    sv("polygon", { points: "234,29 338,29 326,17 246,17", fill: "#35283f" }, hw);
    sv("rect", { x: 240, y: 58, width: 92, height: 2.5, fill: "#2a2236" }, hw);
    [250, 280, 308].forEach(wx => { litRect(wx, 31, 9, 8, 0.9, 12); });
    sv("rect", { x: 278, y: 46, width: 9, height: 12, fill: "#2a1b20" }, hw);
    litRect(250, 47, 12, 9, 0.8, 0); litRect(310, 47, 12, 9, 0.8, 0);
    sv("rect", { x: 244, y: 59, width: 22, height: 9, fill: "#2c2a42" }, hw);                     // the driveway
    lits.push(g => anim(sv("circle", { cx: 283, cy: 44, r: 10, fill: "url(#hk-glow)" }, g), "animation:hkFlicker 2.6s ease-in-out infinite;"));
    const ring = anim(sv("ellipse", { cx: 286, cy: 37, rx: 58, ry: 28, fill: "none", stroke: "#ffd98a", "stroke-width": 1.2, "stroke-dasharray": "3 4" }, svg), "animation:hkPulse 2.8s ease-in-out infinite;");
    ring.setAttribute("pointer-events", "none");
    label("The Wheelers\u2019", 286, 78, "#ffe3a0");
    const wh = sv("rect", { x: 228, y: 8, width: 116, height: 76, fill: "transparent" }, svg);
    wh.style.cursor = "pointer"; wh.setAttribute("role", "button"); wh.setAttribute("aria-label", "Walk up to the Wheelers' house");
    wh.addEventListener("click", () => { close(); openWheelers(); });

    // the bus parked at the end of Cherry Oak Drive, and its stop
    solids.push([140, 520, 90, 56]);
    const bus = sv("g", {}, svg);
    sv("rect", { x: 186, y: 550, width: 46, height: 17, rx: 4, fill: "#d9b44a" }, bus);
    [191, 201, 211, 221].forEach(wx => sv("rect", { x: wx, y: 553, width: 7, height: 6, rx: 1, fill: "#1a1330" }, bus));
    sv("rect", { x: 186, y: 561, width: 46, height: 2, fill: "#8a6d2a" }, bus);
    [196, 222].forEach(wx => sv("circle", { cx: wx, cy: 567.5, r: 3.2, fill: "#120d22", stroke: "#3a3347", "stroke-width": 1 }, bus));
    sv("rect", { x: 230, y: 556, width: 2.4, height: 3, fill: "#c9482e" }, bus);
    sv("rect", { x: 160, y: 530, width: 2.6, height: 38, fill: "#4a3326" }, svg);
    sv("circle", { cx: 161.3, cy: 527, r: 7, fill: "#a8553f", stroke: "#4a3326", "stroke-width": 1.2 }, svg);
    const bt = sv("text", { x: 161.3, y: 529, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 5, "font-weight": 700, fill: "#f6ead0" }, svg); bt.textContent = "BUS";
    label("bus to Hollowbrook", 190, 582);
    const bh = sv("rect", { x: 150, y: 518, width: 92, height: 58, fill: "transparent" }, svg);
    bh.style.cursor = "pointer"; bh.setAttribute("role", "button"); bh.setAttribute("aria-label", "Take the bus back to Hollowbrook");
    bh.addEventListener("click", () => { close(); openHollowbrook(); });

    // trees, kept off the roads and buildings
    const nearRoad = (x, y) => Math.abs(x - 173) < 14 || Math.abs(y - 178) < 12 || Math.abs(y - 238) < 12 || Math.abs(x - 300) < 12 && y < 340 || Math.abs(x - 75) < 12 && y > 140 && y < 425 || Math.abs(x - 215) < 12 && y > 232 && y < 340 || Math.abs(y - 305) < 12 && x > 208;
    for (let i = 0, n = 0; i < 160 && n < 34; i++) {
      const tx = 10 + rnd("htx" + i) * (W - 20), ty = 20 + rnd("hty" + i) * (H - 40);
      if (nearRoad(tx, ty) || solids.some(([sx, sy, sw, sh2]) => tx > sx - 8 && tx < sx + sw + 8 && ty > sy - 8 && ty < sy + sh2 + 8)) continue;
      n++;
      const r = 6 + rnd("htr" + i) * 6;
      sv("circle", { cx: tx.toFixed(1), cy: ty.toFixed(1), r: r.toFixed(1), fill: rnd("htc" + i) > 0.5 ? "#1f3a37" : "#27483f" }, svg);
      sv("circle", { cx: (tx - r * 0.3).toFixed(1), cy: (ty - r * 0.3).toFixed(1), r: (r * 0.55).toFixed(1), fill: "#2d5547", opacity: 0.7 }, svg);
    }
    // streetlamps at the crossings
    [[188, 168], [188, 228], [204, 296], [288, 168], [88, 228]].forEach(([lx, ly], i) => {
      sv("rect", { x: lx - 0.8, y: ly - 14, width: 1.6, height: 14, fill: "#2c2438" }, svg);
      sv("rect", { x: lx - 2.2, y: ly - 18, width: 4.4, height: 5, rx: 1, fill: "#ffd98a" }, svg);
      lits.push(g => anim(sv("circle", { cx: lx, cy: ly - 15, r: 14, fill: "url(#hk-glow)" }, g), `animation:hkFlicker ${(2.2 + rnd("hl" + i) * 1.6).toFixed(1)}s ease-in-out infinite;`));
    });
    [[110, 400], [250, 470]].forEach(([mx, my], i) => anim(sv("ellipse", { cx: mx, cy: my, rx: 60, ry: 10, fill: "#c8bee6", opacity: 0.1 }, svg), `animation:hkMist ${10 + i * 3}s ease-in-out infinite;`));
    const lit = sv("g", {}, svg);
    lits.forEach(f => f(lit));
    const tint = sv("rect", { x: 0, y: 0, width: W, height: H, fill: "#000", opacity: 0, "pointer-events": "none" }, svg);
    const title = sv("text", { x: 180, y: 24, "text-anchor": "middle", "font-family": "Georgia,serif", "font-weight": 700, "font-size": 14, "letter-spacing": 3, fill: "#e6dcf5", opacity: 0.55 }, svg); title.textContent = "HAWKINS";
    const title2 = sv("text", { x: 180, y: 35, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 6.5, "letter-spacing": 4, fill: "#e6dcf5", opacity: 0.45 }, svg); title2.textContent = "INDIANA";
    field.appendChild(svg);

    const applyTime = announce => {
      const t = HK_TIMES[tI];
      box.style.background = t.map;
      ground.setAttribute("fill", t.map);
      lit.setAttribute("opacity", t.lit);
      tint.setAttribute("fill", t.tint[0]); tint.setAttribute("opacity", t.tint[1]);
      timeBtn.textContent = t.label;
      sub.textContent = "indiana \u00B7 " + t.name;
      if (announce) caption.textContent = t.say.map;
    };
    const timeBtn = pill("", "Change the time of day", () => { tI = (tI + 1) % HK_TIMES.length; hkTimeSet(tI); applyTime(true); });
    pill("\u{1F3E1} Wheelers\u2019", "Walk up to the Wheelers\u2019 house", () => { close(); openWheelers(); });
    pill("\u{1F68C} bus stop", "Take the bus back to Hollowbrook", () => { close(); openHollowbrook(); });
    applyTime(true);
    document.body.appendChild(sh.back);

    // ── the bus ride in (tap to skip) ──
    if (arrive && !reduce) {
      const ride = el("div", "position:absolute;inset:0;z-index:30;background:#070510;display:flex;align-items:center;justify-content:center;overflow:hidden;transition:opacity .7s;cursor:pointer;");
      const lane = el("div", "position:absolute;left:0;right:0;top:50%;height:0;border-top:2px dashed rgba(190,170,255,0.28);");
      const busSvg = sv("svg", { viewBox: "0 0 120 50", width: 120, height: 50 });
      busSvg.style.cssText = "position:absolute;left:0;top:calc(50% - 46px);";
      sv("rect", { x: 4, y: 8, width: 104, height: 32, rx: 7, fill: "#d9b44a" }, busSvg);
      for (let i = 0; i < 6; i++) sv("rect", { x: 12 + i * 15, y: 14, width: 10, height: 10, rx: 2, fill: "#1a1330" }, busSvg);
      sv("rect", { x: 4, y: 30, width: 104, height: 3, fill: "#8a6d2a" }, busSvg);
      sv("rect", { x: 106, y: 24, width: 6, height: 5, rx: 1.5, fill: "#fff1c9" }, busSvg);
      [26, 88].forEach(cx => sv("circle", { cx, cy: 41, r: 6.5, fill: "#120d22", stroke: "#3a3347", "stroke-width": 1.5 }, busSvg));
      const words = el("div", "position:absolute;left:0;right:0;top:calc(50% + 26px);text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.16em;text-transform:uppercase;color:#f1e4c0;white-space:pre;line-height:1.5;opacity:0;transition:opacity .8s;", "Hawkins\nIndiana");
      ride.appendChild(lane); ride.appendChild(busSvg); ride.appendChild(words);
      box.appendChild(ride);
      let over = false;
      const end = () => { if (over) return; over = true; ride.style.opacity = "0"; later(() => ride.remove(), 750); };
      ride.addEventListener("click", end);
      try { busSvg.animate([{ transform: "translateX(-140px)" }, { transform: `translateX(${Math.max(360, box.clientWidth || 360) + 20}px)` }], { duration: 2300, easing: "ease-in-out", fill: "forwards" }); } catch {}
      later(() => { words.style.opacity = "1"; }, 500);
      later(end, 2900);
    }
  }

  // a knock: three low thumps (obeys the bell tower's sound setting)
  function hkKnock() {
    const ac = bellUnlock();
    if (!ac || ac.state !== "running" || bellMuted()) return;
    try {
      const t0 = ac.currentTime + 0.01;
      [0, 0.22, 0.44].forEach(d => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(170, t0 + d); o.frequency.exponentialRampToValueAtTime(70, t0 + d + 0.09);
        g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.25, t0 + d + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.12);
        o.connect(g); g.connect(ac.destination); o.start(t0 + d); o.stop(t0 + d + 0.14);
      });
    } catch {}
  }

  // the grounds' own preferences, read the way the grounds read them (time of day, weather, Halloween override),
  // so the house always has the same night / dusk / dawn, the same weather and the same season as the grounds
  function hkPrefs() {
    let p = {};
    try { p = JSON.parse(localStorage.getItem("ao3-gg-prefs") || "{}") || {}; } catch { p = {}; }
    try { const s = JSON.parse(localStorage.getItem("ao3_gg_sync_v1") || "null"); if (s && typeof s === "object" && "hw" in s) p.hw = s.hw; } catch {}
    return p;
  }
  const HK_WX = [["clear", "\u2600\uFE0F clear"], ["rain", "\u{1F327}\uFE0F rain"], ["fog", "\u{1F32B}\uFE0F fog"], ["snow", "\u2744\uFE0F snow"]];
  const hkWxGet = () => Math.max(0, Math.min(HK_WX.length - 1, hkPrefs().wx | 0));
  const hkWxSet = i => { try { const p = JSON.parse(localStorage.getItem("ao3-gg-prefs") || "{}") || {}; p.wx = i; localStorage.setItem("ao3-gg-prefs", JSON.stringify(p)); } catch {} };
  const HK_SEASON_TAG = { halloween: "\u{1F383} spooky season", winter: "\u2744\uFE0F winter", spring: "\u{1F338} spring", summer: "\u2600\uFE0F summer", autumn: "\u{1F342} autumn" };
  function hkSeason() {
    const m = new Date().getMonth(), p = hkPrefs();
    const hw = p.hw === true ? true : p.hw === false ? false : m === 9;
    return hw ? "halloween" : (m === 11 || m <= 1) ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "autumn";
  }

  // a walkie-talkie coming alive: a little squelch chirp, then bursts of static (obeys the bell tower's sound setting)
  function hkCrackle() {
    const ac = bellUnlock();
    if (!ac || ac.state !== "running" || bellMuted()) return;
    try {
      const t0 = ac.currentTime + 0.01, len = 1;
      const chirp = ac.createOscillator(), cg = ac.createGain();
      chirp.type = "square"; chirp.frequency.setValueAtTime(1500, t0); chirp.frequency.setValueAtTime(1100, t0 + 0.05);
      cg.gain.setValueAtTime(0.0001, t0); cg.gain.exponentialRampToValueAtTime(0.03, t0 + 0.01); cg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
      chirp.connect(cg); cg.connect(ac.destination); chirp.start(t0); chirp.stop(t0 + 0.1);
      const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * len), ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.06 ? 1 : 0.35);
      const src = ac.createBufferSource(); src.buffer = buf;
      const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 0.9;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0 + 0.1);
      [[0.12, 0.3], [0.4, 0.52], [0.62, 0.9]].forEach(([a, b]) => { g.gain.linearRampToValueAtTime(0.05, t0 + a); g.gain.linearRampToValueAtTime(0.0001, t0 + b); });
      src.connect(bp); bp.connect(g); g.connect(ac.destination); src.start(t0 + 0.1); src.stop(t0 + len);
    } catch {}
  }

  // ── the Wheelers' house, from the front lawn ──
  // A two-storey at dusk (or night, or dawn: the same switch as the grounds), porch light on, a mailbox, two bikes dropped on the
  // lawn leaning on each other. Two lit windows: Mike's room upstairs (fairy lights) and a small basement window at ground level.
  // The basement window is the way in (it climbs through to openBasement); there is no menu. Weather, season and time of day come
  // from the grounds' own settings, so a snowy evening is the cosiest version. Small living details: a curtain twitches,
  // a walkie-talkie crackles from the basement now and then, and somebody waves from Mike's window when you arrive.
  function openWheelers() {
    const sh = hkShell("ao3-wheelers", "\u{1F3E1} The Wheelers\u2019");
    const { sv, rnd, anim, el } = sh.kit;
    const { box, sub, field, caption, pill, close, later } = sh;
    const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const season = hkSeason();
    const say = t => { caption.textContent = t; };
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    let tI = hkTimeGet(), wxI = hkWxGet(), nKnock = 0, nWin = 0, nBike = 0, nBox = 0, entering = false, gone = false;
    sh.onClose = () => { gone = true; };
    const W = 360, H = 540;
    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMin meet" });
    svg.style.cssText = "width:100%;height:auto;display:block;";
    const defs = sv("defs", {}, svg);
    const glow = sv("radialGradient", { id: "wh-glow" }, defs);
    sv("stop", { offset: "0%", "stop-color": "#ffd98a", "stop-opacity": "0.8" }, glow);
    sv("stop", { offset: "100%", "stop-color": "#ffd98a", "stop-opacity": "0" }, glow);
    const lits = [], hits = [];
    const BULB = ["#ff7a7a", "#ffd36b", "#7ad6ff", "#9be58f", "#ffa6e8"];
    // a drooping string of little lights from (x0,y0) to (x1,y1), sagging by d
    const strand = (g, x0, y0, x1, y1, d, n, seed, r) => {
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + d * 2;
      sv("path", { d: `M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`, stroke: "#2a1d1a", "stroke-width": 0.7, fill: "none" }, g);
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1), u = 1 - t;
        const bx = (u * u * x0 + 2 * u * t * cx + t * t * x1).toFixed(1), by = (u * u * y0 + 2 * u * t * cy + t * t * y1 + 1).toFixed(1);
        const col = BULB[(i + seed) % BULB.length];
        sv("circle", { cx: bx, cy: by, r: r * 2.6, fill: col, opacity: 0.22 }, g);
        const b = sv("circle", { cx: bx, cy: by, r, fill: col }, g);
        anim(b, `animation:hkTwinkle ${(1.6 + rnd("tw" + seed + i) * 1.8).toFixed(1)}s ease-in-out -${(rnd("tz" + seed + i) * 3).toFixed(1)}s infinite;`);
      }
    };

    const starG = sv("g", {}, svg);
    for (let i = 0; i < 40; i++) sv("circle", { cx: (rnd("wsx" + i) * W).toFixed(1), cy: (rnd("wsy" + i) * 150).toFixed(1), r: (0.5 + rnd("wsr" + i) * 0.9).toFixed(2), fill: "#fff", opacity: (0.25 + rnd("wso" + i) * 0.6).toFixed(2) }, starG);
    const moonG = sv("g", {}, svg);
    const moonDisc = sv("circle", { cx: 300, cy: 44, r: 15, fill: "#efe6bd" }, moonG);
    sv("circle", { cx: 300, cy: 44, r: 30, fill: "url(#wh-glow)", opacity: 0.3 }, moonG);
    // the tree line behind, the lawn, the pavement and the road
    sv("path", { d: "M0 190 Q40 150 80 176 T170 168 T260 174 T360 160 V340 H0 Z", fill: "#16212a" }, svg);
    for (let i = 0; i < 16; i++) { const tx = i * 24 + rnd("wt" + i) * 10; sv("circle", { cx: tx, cy: 172 + rnd("wu" + i) * 10, r: 13 + rnd("wv" + i) * 8, fill: i % 2 ? "#13201f" : "#182826" }, svg); }
    sv("rect", { x: 0, y: 330, width: W, height: 150, fill: "#1b2b2c" }, svg);
    sv("rect", { x: 0, y: 462, width: W, height: 16, fill: "#3a3a52" }, svg);
    sv("rect", { x: 0, y: 478, width: W, height: 62, fill: "#17172a" }, svg);
    sv("path", { d: "M0 509 H360", stroke: "#8a7a50", "stroke-width": 1.4, "stroke-dasharray": "12 10", opacity: 0.6 }, svg);
    for (let i = 0; i < 60; i++) { const gx = 6 + rnd("wgx" + i) * (W - 12), gy = 340 + rnd("wgy" + i) * 118; sv("path", { d: `M${gx.toFixed(1)} ${gy.toFixed(1)} l-2 -5 M${gx.toFixed(1)} ${gy.toFixed(1)} l0 -7 M${gx.toFixed(1)} ${gy.toFixed(1)} l2 -5`, stroke: "#3f6552", "stroke-width": 1.2, fill: "none", "stroke-linecap": "round", opacity: 0.6 }, svg); }
    // the driveway and the path to the door
    sv("polygon", { points: "66,346 128,346 142,478 52,478", fill: "#2c2a42" }, svg);
    sv("polygon", { points: "196,350 226,350 238,462 184,462", fill: "#3a3550" }, svg);
    for (let i = 0; i < 6; i++) sv("path", { d: `M${194 - i * 2} ${364 + i * 18} H${228 + i * 2}`, stroke: "#4a4468", "stroke-width": 1, opacity: 0.7 }, svg);

    // the house: white siding above, brick below, a dark low roof, a garage on the left
    sv("polygon", { points: "42,200 318,200 288,144 72,144", fill: "#35283f" }, svg);
    sv("path", { d: "M72 144 L288 144", stroke: "#4a3d56", "stroke-width": 2 }, svg);
    sv("rect", { x: 294, y: 116, width: 16, height: 62, fill: "#7d3a33" }, svg);                      // brick chimney up the right side
    for (let yy = 122; yy < 178; yy += 6) sv("path", { d: `M294 ${yy} H310`, stroke: "#5a2a26", "stroke-width": 0.8, opacity: 0.8 }, svg);
    sv("rect", { x: 291, y: 112, width: 22, height: 5, fill: "#3a2230" }, svg);
    sv("rect", { x: 58, y: 200, width: 244, height: 68, fill: "#cfc9dc" }, svg);
    for (let yy = 207; yy < 268; yy += 7) sv("path", { d: `M58 ${yy} H302`, stroke: "#a8a2bb", "stroke-width": 0.8, opacity: 0.7 }, svg);
    sv("rect", { x: 58, y: 268, width: 244, height: 78, fill: "#7d3a33" }, svg);
    for (let yy = 274, r = 0; yy < 346; yy += 6, r++) { sv("path", { d: `M58 ${yy} H302`, stroke: "#5a2a26", "stroke-width": 0.8, opacity: 0.8 }, svg); for (let xx = 58 + (r % 2) * 8; xx < 302; xx += 16) sv("path", { d: `M${xx} ${yy} v6`, stroke: "#5a2a26", "stroke-width": 0.8, opacity: 0.6 }, svg); }
    sv("rect", { x: 54, y: 266, width: 252, height: 4, fill: "#2a2236" }, svg);
    sv("rect", { x: 54, y: 344, width: 252, height: 5, fill: "#3a3347" }, svg);
    [[8, 58, "2,284 12,262 58,254 58,284", 22], [302, 352, "302,254 348,262 358,284 302,284", 316]].forEach(([x0, x1, roof, wx]) => {
      sv("rect", { x: x0, y: 276, width: x1 - x0, height: 70, fill: "#7d3a33" }, svg);
      for (let yy = 282, r = 0; yy < 346; yy += 6, r++) { sv("path", { d: `M${x0} ${yy} H${x1}`, stroke: "#5a2a26", "stroke-width": 0.8, opacity: 0.8 }, svg); for (let xx = x0 + (r % 2) * 8; xx < x1; xx += 16) sv("path", { d: `M${xx} ${yy} v6`, stroke: "#5a2a26", "stroke-width": 0.8, opacity: 0.6 }, svg); }
      sv("polygon", { points: roof, fill: "#2f2338" }, svg);
      sv("path", { d: roof.split(" ").slice(0, 3).map((p, i) => (i ? "L" : "M") + p.replace(",", " ")).join(" "), stroke: "#4a3d56", "stroke-width": 1.6, fill: "none" }, svg);
      sv("rect", { x: x0 - 2, y: 344, width: x1 - x0 + 4, height: 5, fill: "#3a3347" }, svg);
      sv("rect", { x: wx - 2, y: 292, width: 28, height: 30, fill: "#e6e0ef" }, svg);                        // a window on each wing
      sv("rect", { x: wx, y: 294, width: 24, height: 26, fill: "#120d22" }, svg);
      sv("rect", { x: wx, y: 294, width: 24, height: 26, fill: "#4a4263", opacity: 0.5 }, svg);
      sv("path", { d: `M${wx + 12} 294 V320 M${wx} 307 H${wx + 24}`, stroke: "#e6e0ef", "stroke-width": 1.2 }, svg);
      sv("rect", { x: wx - 7, y: 292, width: 5, height: 30, fill: "#1d1b26" }, svg);                         // black shutters
      sv("rect", { x: wx + 26, y: 292, width: 5, height: 30, fill: "#1d1b26" }, svg);
    });

    // the upstairs windows. Only the middle one (Mike's room) is lit: fairy lights, curtains, a desk. The left one is dark with a
    // curtain that twitches now and then; the right one has its blind half down.
    const winFrame = wx => {
      sv("rect", { x: wx - 7, y: 208, width: 6, height: 34, fill: "#1d1b26" }, svg);
      sv("rect", { x: wx + 32, y: 208, width: 6, height: 34, fill: "#1d1b26" }, svg);
      sv("rect", { x: wx - 2, y: 207, width: 36, height: 36, fill: "#e6e0ef" }, svg);
      sv("rect", { x: wx, y: 209, width: 32, height: 32, fill: "#120d22" }, svg);
    };
    const winBars = wx => sv("path", { d: `M${wx + 16} 209 V241 M${wx} 225 H${wx + 32}`, stroke: "#e6e0ef", "stroke-width": 1.4 }, svg);
    // left window, dark, with the curtain that twitches
    winFrame(80);
    const curtain = sv("g", {}, svg);
    sv("rect", { x: 81, y: 210, width: 13, height: 30, fill: "#4a4263", opacity: 0.8 }, curtain);
    const curtain2 = sv("g", {}, svg);
    sv("rect", { x: 98, y: 210, width: 13, height: 30, fill: "#4a4263", opacity: 0.8 }, curtain2);
    const sliver = sv("rect", { x: 94, y: 210, width: 4, height: 30, fill: "#f0b45a", opacity: 0 }, svg);
    sliver.style.transition = "opacity .3s";
    winBars(80);
    // right window, blind half down
    winFrame(250);
    sv("rect", { x: 250, y: 209, width: 32, height: 15, fill: "#4a4263", opacity: 0.85 }, svg);
    sv("path", { d: "M250 224 H282", stroke: "#6a6088", "stroke-width": 1.2 }, svg);
    winBars(250);
    // Mike's window: lit
    winFrame(165);
    lits.push(g => {
      const wx = 165, gg = sv("g", {}, g);
      anim(sv("circle", { cx: wx + 16, cy: 225, r: 40, fill: "url(#wh-glow)", opacity: 0.7 }, gg), "animation:hkFlicker 3.4s ease-in-out infinite;");
      sv("rect", { x: wx, y: 209, width: 32, height: 32, fill: "#ffcb70" }, gg);
      sv("path", { d: `M${wx} 209 H${wx + 8} Q${wx + 5} 225 ${wx + 7} 241 H${wx} Z M${wx + 32} 209 H${wx + 24} Q${wx + 27} 225 ${wx + 25} 241 H${wx + 32} Z`, fill: "#b9772a", opacity: 0.75 }, gg);
      sv("rect", { x: wx, y: 235, width: 32, height: 6, fill: "#4a2f1c", opacity: 0.75 }, gg);                 // the desk under the window
      sv("rect", { x: wx + 3, y: 231, width: 6, height: 4, fill: "#6a4a30", opacity: 0.8 }, gg);               // a stack of comics, maybe
      strand(g, wx + 1, 211, wx + 31, 211, 5, 7, 1, 1.15);                                                    // the fairy lights, two swags
      strand(g, wx + 1, 222, wx + 31, 222, 4, 6, 3, 1.05);
      sv("path", { d: `M${wx + 16} 209 V241 M${wx} 225 H${wx + 32}`, stroke: "#e6e0ef", "stroke-width": 1.4 }, g);
    });
    // somebody who waves from Mike's window when you arrive (a silhouette in the light, hidden until then)
    const fig = sv("g", {}, svg);
    fig.style.opacity = 0; fig.style.transition = "opacity .5s";
    sv("circle", { cx: 181, cy: 224, r: 4.3, fill: "#1b1226" }, fig);
    sv("path", { d: "M172 241 Q173 231 181 231 Q189 231 190 241 Z", fill: "#1b1226" }, fig);
    const armPos = sv("g", { transform: "translate(188 236)" }, fig);
    const arm = sv("g", { class: "hk-anim" }, armPos);
    sv("path", { d: "M0 0 L4 -12", stroke: "#1b1226", "stroke-width": 2.8, "stroke-linecap": "round", fill: "none" }, arm);
    sv("circle", { cx: 4.4, cy: -13.4, r: 2.2, fill: "#1b1226" }, arm);
    let waving = false;
    const wave = () => {
      if (waving || gone) return; waving = true;
      fig.style.opacity = 1;
      arm.style.cssText = "transform-box:fill-box;transform-origin:0% 100%;animation:hkWave .55s ease-in-out infinite;";
      later(() => { fig.style.opacity = 0; waving = false; arm.style.animation = "none"; }, reduce ? 2600 : 3800);
    };
    // ground-floor window beside the front door: curtains drawn, dark
    sv("rect", { x: 244, y: 288, width: 40, height: 34, fill: "#e6e0ef" }, svg);
    sv("rect", { x: 246, y: 290, width: 36, height: 30, fill: "#120d22" }, svg);
    sv("rect", { x: 246, y: 290, width: 36, height: 30, fill: "#4a4263", opacity: 0.55 }, svg);
    sv("path", { d: "M264 290 V320 M246 305 H282", stroke: "#e6e0ef", "stroke-width": 1.2 }, svg);
    // the garage door
    sv("rect", { x: 68, y: 284, width: 62, height: 62, fill: "#d9d4e4", stroke: "#a8a2bb", "stroke-width": 1.2 }, svg);
    for (let i = 0; i < 4; i++) sv("rect", { x: 71, y: 287 + i * 15, width: 56, height: 12, rx: 1, fill: "none", stroke: "#b4aec7", "stroke-width": 0.9 }, svg);
    // the basement window: small, at ground level, with a window well in front. It glows, and it is the way in.
    sv("ellipse", { cx: 156, cy: 350, rx: 25, ry: 9, fill: "#0e1117" }, svg);
    sv("path", { d: "M132 350 Q156 366 180 350", stroke: "#3a3a52", "stroke-width": 1.4, fill: "none" }, svg);
    for (let i = 0; i < 4; i++) sv("path", { d: `M${140 + i * 6} ${354 + i} q${5 - i} 4 ${8 - i * 2} 0`, stroke: "#2a2a3c", "stroke-width": 0.8, fill: "none" }, svg);
    sv("rect", { x: 133, y: 322, width: 46, height: 24, fill: "#8c86a0" }, svg);
    sv("rect", { x: 136, y: 325, width: 40, height: 18, fill: "#120d22" }, svg);
    const bsGlow = sv("g", {}, svg);                                                                            // moves with the radio crackle
    lits.push(g => {
      const bg = sv("g", {}, g);
      anim(sv("circle", { cx: 156, cy: 334, r: 46, fill: "url(#wh-glow)", opacity: 0.85 }, bg), "animation:hkFlicker 2.8s ease-in-out infinite;");
      sv("rect", { x: 136, y: 325, width: 40, height: 18, fill: "#ffd27a" }, bg);
      sv("path", { d: "M136 334 H176 M146 325 V343 M166 325 V343", stroke: "#b87a2a", "stroke-width": 0.9, opacity: 0.8 }, bg);
      sv("circle", { cx: 142, cy: 328, r: 1.3, fill: "#ff7a7a" }, bg); sv("circle", { cx: 156, cy: 329, r: 1.3, fill: "#7ad6ff" }, bg); sv("circle", { cx: 170, cy: 328, r: 1.3, fill: "#9be58f" }, bg);
      g.appendChild(bsGlow);
    });
    sv("path", { d: "M136 343 H176", stroke: "#a8a2bb", "stroke-width": 1.4 }, svg);
    // the front door under a little porch roof, with the porch light
    sv("polygon", { points: "184,284 238,284 232,272 190,272", fill: "#35283f" }, svg);
    sv("rect", { x: 188, y: 284, width: 3, height: 62, fill: "#e6e0ef" }, svg);
    sv("rect", { x: 231, y: 284, width: 3, height: 62, fill: "#e6e0ef" }, svg);
    sv("rect", { x: 197, y: 292, width: 28, height: 54, rx: 1.5, fill: "#2a3a5a", stroke: "#3a4a6a", "stroke-width": 1.2 }, svg);
    sv("rect", { x: 202, y: 297, width: 8, height: 14, fill: "#1a2540" }, svg); sv("rect", { x: 212, y: 297, width: 8, height: 14, fill: "#1a2540" }, svg);
    sv("circle", { cx: 220, cy: 322, r: 1.6, fill: "#d9c3a0" }, svg);
    sv("rect", { x: 190, y: 346, width: 40, height: 5, fill: "#4a4468" }, svg);
    sv("rect", { x: 193, y: 351, width: 34, height: 4, fill: "#3f3a5a" }, svg);
    sv("rect", { x: 207, y: 282, width: 6, height: 7, rx: 1.5, fill: "#ffe3a0" }, svg);
    const porch = sv("g", {}, svg);                                                                             // the porch light's glow, so a knock can make it buzz
    lits.push(g => { porch.setAttribute("class", "hk-anim"); porch.style.cssText = "animation:hkFlicker 2.6s ease-in-out infinite;"; sv("circle", { cx: 210, cy: 290, r: 26, fill: "url(#wh-glow)" }, porch); g.appendChild(porch); });
    // seasonal dressing on the house itself
    if (season === "winter") {                                                                                  // a wreath, and lights along the porch eave
      sv("circle", { cx: 211, cy: 330, r: 6.5, fill: "none", stroke: "#2f6a42", "stroke-width": 3.2 }, svg);
      sv("circle", { cx: 207, cy: 326, r: 1.1, fill: "#c9482e" }, svg); sv("circle", { cx: 215, cy: 334, r: 1.1, fill: "#c9482e" }, svg);
      sv("path", { d: "M209 336 l2 4 l2 -4", stroke: "#c9482e", "stroke-width": 1.6, fill: "none" }, svg);
      lits.push(g => strand(g, 186, 285, 236, 285, 3, 9, 2, 1.2));
    }
    if (season === "halloween") {                                                                               // two jack-o'-lanterns on the porch step
      [[196, 346, 1], [226, 347, 0.75]].forEach(([px, py, s], i) => {
        sv("ellipse", { cx: px - 3 * s, cy: py - 4 * s, rx: 5 * s, ry: 6 * s, fill: "#d9731f" }, svg);
        sv("ellipse", { cx: px + 3 * s, cy: py - 4 * s, rx: 5 * s, ry: 6 * s, fill: "#d9731f" }, svg);
        sv("ellipse", { cx: px, cy: py - 4 * s, rx: 4 * s, ry: 6.5 * s, fill: "#ee8a2c" }, svg);
        sv("rect", { x: px - 0.8, y: py - 12 * s, width: 1.8, height: 3 * s, fill: "#4f6b3a" }, svg);
        lits.push(g => {
          sv("circle", { cx: px, cy: py - 4 * s, r: 14 * s, fill: "url(#wh-glow)", opacity: 0.6 }, g);
          sv("path", { d: `M${px - 3.5 * s} ${py - 7 * s} l2.6 0 l-1.3 2.4 Z M${px + 0.9 * s} ${py - 7 * s} l2.6 0 l-1.3 2.4 Z M${px - 3 * s} ${py - 2 * s} l1.6 -1.6 l1.4 1.2 l1.4 -1.2 l1.6 1.6 l-1.6 0.8 l-1.4 -1 l-1.4 1 Z`, fill: "#ffe27a" }, g);
          anim(g.lastChild, `animation:hkFlicker ${(1.8 + i * 0.7).toFixed(1)}s ease-in-out infinite;`);
        });
      });
    }
    // two trees, the lamp, the mailbox
    [[10, 384, 24], [350, 388, 24]].forEach(([tx, ty, tr]) => { sv("rect", { x: tx - 3, y: ty, width: 6, height: 56, fill: "#2c2028" }, svg); sv("circle", { cx: tx, cy: ty - 6, r: tr, fill: "#1f3a37" }, svg); sv("circle", { cx: tx - 8, cy: ty - 14, r: tr * 0.6, fill: "#27483f" }, svg); });
    sv("ellipse", { cx: 262, cy: 352, rx: 36, ry: 11, fill: "#1b2f2b" }, svg);                                  // the hedge by the window
    sv("ellipse", { cx: 258, cy: 349, rx: 22, ry: 6.6, fill: "#223d36" }, svg);
    sv("rect", { x: 281, y: 429, width: 4, height: 33, fill: "#241c16" }, svg);
    sv("rect", { x: 266, y: 413, width: 36, height: 17, rx: 7, fill: "#17151b" }, svg);
    sv("path", { d: "M270 416 Q284 413 298 416", stroke: "#3a3744", "stroke-width": 1, fill: "none" }, svg);
    sv("path", { d: "M268 421 v5", stroke: "#2a2833", "stroke-width": 0.8 }, svg);
    sv("rect", { x: 301, y: 402, width: 2.2, height: 14, fill: "#c9482e" }, svg);                           // the flag, up
    sv("polygon", { points: "303,402 311,404 303,408", fill: "#c9482e" }, svg);
    const mt = sv("text", { x: 284, y: 424.6, "text-anchor": "middle", "font-family": "'Snell Roundhand','Segoe Script','Brush Script MT','Lucida Handwriting',cursive", "font-style": "italic", "font-size": 8, textLength: 30, lengthAdjust: "spacingAndGlyphs", fill: "#f1e4c0" }, svg); mt.textContent = "The Wheelers";
    sv("rect", { x: 100, y: 424, width: 2.4, height: 38, fill: "#2c2438" }, svg);                               // the garden lamp
    sv("rect", { x: 96.5, y: 416, width: 9, height: 9, rx: 2, fill: "#ffd98a" }, svg);
    lits.push(g => anim(sv("circle", { cx: 101, cy: 420, r: 26, fill: "url(#wh-glow)" }, g), "animation:hkFlicker 3s ease-in-out infinite;"));
    sv("ellipse", { cx: 110, cy: 440, rx: 70, ry: 10, fill: "#c8bee6", opacity: 0.08 }, svg);

    // the two bikes, dropped on the lawn and leaning against each other
    const bike = (bx, by, rot, flip, body) => {
      const g = sv("g", { transform: `translate(${bx} ${by}) rotate(${rot}) scale(${flip ? -1.05 : 1.05} 1.05)` }, svg);
      [-13, 13].forEach(cx => {
        sv("circle", { cx, cy: -9.5, r: 9.5, fill: "none", stroke: "#14111f", "stroke-width": 2.4 }, g);
        sv("circle", { cx, cy: -9.5, r: 7.4, fill: "none", stroke: "#8a86a0", "stroke-width": 0.7 }, g);
        sv("path", { d: `M${cx - 7} -9.5 H${cx + 7} M${cx} -16.5 V-2.5 M${cx - 5} -14.5 L${cx + 5} -4.5 M${cx + 5} -14.5 L${cx - 5} -4.5`, stroke: "#8a86a0", "stroke-width": 0.5 }, g);
      });
      sv("path", { d: "M-13 -9.5 L-1 -8 L-5 -22 M-1 -8 L9 -21 M-5 -21 L9 -21 M9 -21 L13 -9.5 M-13 -9.5 L-5 -21", stroke: body, "stroke-width": 2, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      sv("path", { d: "M-9 -23.4 H-2 M6 -26 L10 -21 M6 -26 H14", stroke: "#14111f", "stroke-width": 2.2, fill: "none", "stroke-linecap": "round" }, g);
      sv("circle", { cx: -1, cy: -8, r: 2.4, fill: "none", stroke: "#8a86a0", "stroke-width": 1 }, g);
    };
    sv("ellipse", { cx: 46, cy: 447, rx: 44, ry: 4.5, fill: "#000", opacity: 0.3 }, svg);
    bike(26, 444, 15, false, "#2f6fd6");
    bike(66, 445, -15, true, "#f2c230");

    const dynG = sv("g", {}, svg);                                                                             // snow cover, warm spill, smoke, puddles: rebuilt when the weather changes
    dynG.style.pointerEvents = "none";
    const lit = sv("g", {}, svg);
    lit.style.pointerEvents = "none";
    lits.forEach(f => f(lit));
    svg.appendChild(fig);                                                                                       // the waving figure sits in front of the lit window

    // tappable things (kept on top of the glows so they always answer)
    const hit = (x, y, w, h, label, fn) => hits.push([x, y, w, h, label, fn]);
    const WIN_SAY = ["Mike\u2019s room. Fairy lights strung along the glass.", "Somebody waves, then points down towards the basement.", "The lights blink on, off, on. A code, maybe."];
    hit(158, 205, 46, 40, "Mike\u2019s window", () => { say(WIN_SAY[nWin++ % WIN_SAY.length]); wave(); });
    hit(73, 205, 46, 40, "An upstairs window", () => { say("Dark upstairs. A curtain stirs."); twitch(); });
    hit(243, 205, 46, 40, "An upstairs window", () => say("The blind is half down. Nothing moves."));
    hit(244, 288, 40, 34, "The living-room window", () => say("Curtains drawn. Nobody is watching. Obviously."));
    hit(186, 282, 50, 72, "Knock on the front door", () => {
      hkKnock();
      try { if (navigator.vibrate) navigator.vibrate([12, 60, 12, 60, 12]); } catch {}
      say(["You knock. Somewhere inside, a floorboard creaks.", "You knock again. Nobody comes.", "The porch light buzzes. Try the little window instead."][nKnock++ % 3]);
      try { if (porch.animate) porch.animate([{ opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], { duration: 700 }); } catch {}
    });
    hit(264, 400, 48, 62, "The mailbox", () => say(["The mailbox. A flyer from a pizza place and nothing else.", "Still just the flyer."][nBox++ % 2]));
    hit(0, 396, 92, 60, "Two bikes, dropped on the lawn", () => say(["Two bikes, dropped mid-argument, leaning on each other like they are holding each other up.", "One bell, one rattly chain. Both of them wet from the grass."][nBike++ % 2]));
    hit(126, 316, 60, 52, "Climb in through the basement window", () => goIn());
    const hitG = sv("g", {}, svg);
    hits.forEach(([x, y, w, h, label, fn]) => {
      const r = sv("rect", { x, y, width: w, height: h, fill: "transparent" }, hitG);
      r.style.cursor = "pointer"; r.setAttribute("role", "button"); r.setAttribute("aria-label", label);
      r.addEventListener("click", fn);
    });

    // weather and season, drawn over everything and never tappable
    const overlay = sv("g", {}, svg);
    overlay.style.pointerEvents = "none";
    const wxG = sv("g", {}, overlay);
    const seasonG = sv("g", {}, overlay);
    if (!reduce && (season === "autumn" || season === "halloween" || season === "spring")) {
      const cols = season === "spring" ? ["#f6b6cc", "#fbd3e0", "#f09ab8"] : ["#d9731f", "#b5541a", "#e0a032", "#8a4a1e"];
      for (let i = 0; i < 26; i++) {
        const p = sv("ellipse", { cx: (rnd("lx" + i) * W).toFixed(1), cy: (rnd("ly" + i) * H).toFixed(1), rx: 3, ry: 1.6, fill: cols[i % cols.length], opacity: 0.8 }, seasonG);
        anim(p, `animation:hkFall ${(6 + rnd("ld" + i) * 6).toFixed(1)}s linear -${(rnd("lz" + i) * 8).toFixed(1)}s infinite;`);
      }
    }
    if (season === "autumn" || season === "halloween") {                                                          // leaves on the lawn
      for (let i = 0; i < 14; i++) sv("ellipse", { cx: (10 + rnd("lf" + i) * 340).toFixed(1), cy: (362 + rnd("lg" + i) * 96).toFixed(1), rx: 3, ry: 1.5, fill: ["#d9731f", "#b5541a", "#e0a032"][i % 3], opacity: 0.7 }, seasonG);
    }
    if (season === "summer") {                                                                                    // fireflies over the lawn
      for (let i = 0; i < 14; i++) {
        const f = sv("circle", { cx: (10 + rnd("ff" + i) * 340).toFixed(1), cy: (340 + rnd("fg" + i) * 120).toFixed(1), r: 1.7, fill: "#e8ff8a" }, seasonG);
        anim(f, `animation:hkFirefly ${(4 + rnd("fd" + i) * 4).toFixed(1)}s ease-in-out -${(rnd("fz" + i) * 5).toFixed(1)}s infinite;`);
      }
    }
    const tint = sv("rect", { x: 0, y: 0, width: W, height: H, fill: "#000", opacity: 0, "pointer-events": "none" }, svg);
    field.appendChild(svg);

    const paintWeather = () => {
      const kind = HK_WX[wxI][0], cozy = kind === "snow";
      wxG.textContent = "";
      if (kind === "rain") {
        sv("rect", { x: 0, y: 0, width: W, height: H, fill: "#0a1230", opacity: 0.14 }, wxG);
        if (!reduce) for (let i = 0; i < 70; i++) {
          const x = rnd("rx" + i) * (W + 20), y = rnd("ry" + i) * H;
          anim(sv("line", { x1: x.toFixed(1), y1: y.toFixed(1), x2: (x - 2.5).toFixed(1), y2: (y + 9).toFixed(1), stroke: "#a9bcff", "stroke-width": 1, opacity: 0.45 }, wxG), `animation:hkRain ${(0.6 + rnd("rd" + i) * 0.5).toFixed(2)}s linear -${rnd("rs" + i).toFixed(2)}s infinite;`);
        }
      } else if (cozy && !reduce) {
        for (let i = 0; i < 90; i++) anim(sv("circle", { cx: (rnd("nx" + i) * W).toFixed(1), cy: (rnd("ny" + i) * H).toFixed(1), r: (1 + rnd("nr" + i) * 1.4).toFixed(1), fill: "#fff", opacity: 0.85 }, wxG), `animation:hkFall ${(5 + rnd("nd" + i) * 5).toFixed(1)}s linear -${(rnd("nz" + i) * 8).toFixed(1)}s infinite;`);
      } else if (cozy) {
        for (let i = 0; i < 60; i++) sv("circle", { cx: (rnd("nx" + i) * W).toFixed(1), cy: (rnd("ny" + i) * H).toFixed(1), r: (1 + rnd("nr" + i) * 1.2).toFixed(1), fill: "#fff", opacity: 0.7 }, wxG);
      } else if (kind === "fog") {
        for (let i = 0; i < 4; i++) anim(sv("ellipse", { cx: (rnd("fx" + i) * W).toFixed(1), cy: ((i + 0.5) * H / 4).toFixed(1), rx: 190, ry: 46, fill: "#c8bee6", opacity: 0.22 }, wxG), `animation:hkFog ${11 + i % 4 * 3}s ease-in-out infinite;`);
      }
      // what the weather and the season leave on the house: snow cover, a warm spill, chimney smoke, puddles
      dynG.textContent = "";
      const cover = season === "winter" || cozy;
      if (cover) {
        sv("rect", { x: 0, y: 352, width: W, height: 110, fill: "#e8eefc", opacity: 0.2 }, dynG);
        for (let i = 0; i < 16; i++) sv("ellipse", { cx: (rnd("sa" + i) * W).toFixed(1), cy: (362 + rnd("sb" + i) * 92).toFixed(1), rx: (20 + rnd("sc" + i) * 22).toFixed(1), ry: (3.5 + rnd("sd" + i) * 3).toFixed(1), fill: "#dfe8fb", opacity: 0.5 }, dynG);
        sv("path", { d: "M72 143 H288 L293 150 Q250 154 180 151 Q110 154 67 150 Z", fill: "#eef2ff", opacity: 0.95 }, dynG);      // the roof, the porch roof, the chimney
        sv("path", { d: "M44 199 H316", stroke: "#eef2ff", "stroke-width": 3, opacity: 0.8 }, dynG);
        sv("path", { d: "M190 271 H232", stroke: "#eef2ff", "stroke-width": 3.4, opacity: 0.9 }, dynG);
        sv("rect", { x: 290, y: 109, width: 24, height: 4, rx: 2, fill: "#f4f7ff" }, dynG);
        sv("path", { d: "M2 283 L12 261 L58 253 M302 253 L348 261 L358 283", stroke: "#eef2ff", "stroke-width": 3, fill: "none", opacity: 0.9 }, dynG);
        sv("ellipse", { cx: 284, cy: 413.5, rx: 13, ry: 2.6, fill: "#f4f7ff" }, dynG);                                        // the mailbox
        [[10, 384, 24], [350, 388, 24]].forEach(([tx, ty, tr]) => sv("ellipse", { cx: tx, cy: ty - 6 - tr * 0.72, rx: tr * 0.7, ry: tr * 0.26, fill: "#f4f7ff", opacity: 0.85 }, dynG));
        [[27, 418], [65, 419], [46, 420]].forEach(([sx, sy]) => sv("ellipse", { cx: sx, cy: sy, rx: 6, ry: 2.2, fill: "#f4f7ff", opacity: 0.9 }, dynG));  // the bike tops
        sv("ellipse", { cx: 262, cy: 342, rx: 30, ry: 4, fill: "#f4f7ff", opacity: 0.8 }, dynG);                            // the hedge
      }
      if (cozy) {
        sv("ellipse", { cx: 210, cy: 358, rx: 52, ry: 8, fill: "#ffd98a", opacity: 0.24 }, dynG);                           // light pooling on the snow
        sv("ellipse", { cx: 156, cy: 357, rx: 36, ry: 6, fill: "#f2b65c", opacity: 0.34 }, dynG);
        sv("ellipse", { cx: 190, cy: 244, rx: 38, ry: 6, fill: "#ffd98a", opacity: 0.1 }, dynG);
        for (let i = 0; i < 9; i++) { const t = i / 8; sv("ellipse", { cx: (112 + t * 40 + (i % 2 ? 3 : -3)).toFixed(1), cy: (476 - t * 118).toFixed(1), rx: 2, ry: 3.2, fill: "#a7b4d6", opacity: 0.6 }, dynG); }   // footprints to the basement window
      }
      if (cozy || season === "winter") for (let i = 0; i < 4; i++) {                                                          // chimney smoke
        const p = sv("circle", { cx: 302, cy: 108, r: 4, fill: "#cfc8e6", opacity: 0 }, dynG);
        if (!reduce) anim(p, `animation:hkSmoke 4s ease-out -${i}s infinite;`); else p.setAttribute("opacity", 0.25 - i * 0.05);
      }
      if (kind === "rain") for (let i = 0; i < 4; i++) sv("ellipse", { cx: [210, 90, 270, 150][i], cy: 470 + (i % 2) * 2, rx: 18 - i * 2, ry: 2.4, fill: i === 0 ? "#ffd98a" : "#a9bcff", opacity: i === 0 ? 0.22 : 0.12 }, dynG);   // puddles, the porch light in the first
    };

    const COZY = { night: "Snow at night. Every lit window feels like a promise kept.", dusk: "A snowy dusk. The whole house is glowing.", dawn: "Snow at dawn. One window is still lit from last night." };
    const WX_SAY = { clear: "The sky clears. The porch light hums.", rain: "Rain on the roof. Every window looks warmer for it.", fog: "Fog swallows the road. The porch light becomes a small moon.", snow: "Snow. The windows are as cosy as they will ever be." };
    const applyTime = announce => {
      const t = HK_TIMES[tI], kind = HK_WX[wxI][0], cozy = kind === "snow";
      const over = kind === "clear" ? 1 : kind === "fog" ? 0.4 : 0.2;                                          // cloud hides the stars and dims the moon
      box.style.background = t.sky;
      starG.setAttribute("opacity", t.stars * over);
      moonDisc.setAttribute("fill", t.orb);
      moonG.setAttribute("transform", `translate(0 ${t.dy})`);
      moonG.setAttribute("opacity", over < 1 ? 0.3 + over * 0.5 : 1);
      lit.setAttribute("opacity", Math.min(1, t.lit + (cozy ? 0.12 : 0)));
      tint.setAttribute("fill", t.tint[0]); tint.setAttribute("opacity", t.tint[1]);
      timeBtn.textContent = t.label;
      sub.textContent = "hawkins \u00B7 " + t.name + " \u00B7 " + HK_SEASON_TAG[season].replace(/^\S+\s/, "");
      if (announce) say(cozy ? COZY[t.name] : t.say.house);
    };
    const timeBtn = pill("", "Change the time of day", () => { tI = (tI + 1) % HK_TIMES.length; hkTimeSet(tI); applyTime(true); });
    const wxBtn = pill(HK_WX[wxI][1], "Change the weather", () => { wxI = (wxI + 1) % HK_WX.length; hkWxSet(wxI); wxBtn.textContent = HK_WX[wxI][1]; paintWeather(); applyTime(false); say(WX_SAY[HK_WX[wxI][0]]); });
    pill("\u{1F5FA}\uFE0F map", "Back to the map of Hawkins", () => { close(); openHawkins(false); });
    pill("\u{1F68C} bus stop", "Take the bus back to Hollowbrook", () => { close(); openHollowbrook(); });

    // the curtain on the left window twitches, with a sliver of lamplight behind it
    function twitch() {
      if (gone) return;
      sliver.setAttribute("opacity", 0.55);
      later(() => sliver.setAttribute("opacity", 0), reduce ? 1200 : 900);
      if (!reduce) { try { curtain2.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(-6px)" }, { transform: "translateX(0)" }], { duration: 900, easing: "ease-in-out" }); } catch {} }
    }
    // a walkie-talkie voice crackles up from the basement window, with rings of signal
    const ring = () => {
      const rg = sv("g", { transform: "translate(156 334)" }, bsGlow);
      if (reduce) { later(() => rg.remove(), 900); return; }
      for (let i = 0; i < 3; i++) { const c = sv("circle", { cx: 0, cy: 0, r: 7, fill: "none", stroke: "#ffd98a", "stroke-width": 1.2 }, rg); anim(c, `transform-box:fill-box;transform-origin:center;animation:hkRing 1.2s ease-out ${i * 0.28}s both;`); }
      later(() => rg.remove(), 2000);
    };
    const RADIO = ["From the basement, through static: \u201C\u2026do you copy? Over.\u201D", "Crackle. A small voice: \u201CSay again? Over.\u201D", "The window hisses. \u201C\u2026bring snacks. Over.\u201D", "Static. Then: \u201CIs anyone out there? Over.\u201D"];
    const sched = (fn, lo, hi) => later(() => { if (gone) return; fn(); sched(fn, lo, hi); }, lo + Math.random() * (hi - lo));
    sched(twitch, 14000, 30000);
    sched(() => { hkCrackle(); ring(); say(pick(RADIO)); }, 20000, 42000);

    // the basement window is the way in: crouch, the latch gives, and the screen fades to the basement
    const veil = el("div", `position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:30;transition:opacity ${reduce ? 0 : 0.7}s;`);
    box.appendChild(veil);
    function goIn() {
      if (entering) return; entering = true;
      say("You crouch at the window well. The latch gives. Down you go.");
      hkCrackle(); ring();
      later(() => { veil.style.opacity = 1; }, reduce ? 100 : 500);
      later(() => { close(); openBasement(); }, reduce ? 300 : 1300);
    }

    applyTime(true);
    paintWeather();
    document.body.appendChild(sh.back);
    const openLine = caption.textContent;
    later(() => { if (entering) return; if (caption.textContent === openLine) say("Somebody waves from Mike\u2019s window, then points down at the basement."); wave(); }, 1100);   // somebody has seen you coming
  }

  // ── the two figures: Will (left, bowl cut + flannel) and Mike (right, curls + teal pullover) ──
  // Drawn from scratch, shared by the basement table and the fort's inside. FIG gives each one's size and shoulder points;
  // the plaid pattern "bs-plaid" must exist in the calling scene's <defs>. A pose's blush:true deepens the cheeks.
  function bsKit(sv, anim, FIG) {
    const SKIN_A = "#ecc6a6", SKIN_B = "#eec4a2", TEAL = "#2c8aa6", TEAL_D = "#1f6a82", GREY = "#5e6770", THERMAL = "#aab0bb";
    // two-bone arm: the shoulder S and the hand target T (local units), the elbow bends out and down
    const solveArm = (S, T, u, f, left) => {
      let dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy);
      const maxD = u + f - 0.6;
      if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
      if (d < 4) { d = 4; if (!dx && !dy) dy = 4; }
      const a = (u * u - f * f + d * d) / (2 * d), h = Math.sqrt(Math.max(0, u * u - a * a));
      const mx = S[0] + dx / d * a, my = S[1] + dy / d * a;
      const c1 = [mx - dy / d * h, my + dx / d * h], c2 = [mx + dy / d * h, my - dx / d * h];
      const score = c => 0.6 * c[1] + 0.8 * (left ? -c[0] : c[0]);
      return [score(c1) >= score(c2) ? c1 : c2, [S[0] + dx, S[1] + dy]];
    };
    const drawArm = (g, who, left, T, sx, dy, bendProp, Sov) => {
      const F = FIG[who], isA = who === "a", S = Sov || (left ? F.sl : F.sr);
      const [E, Hd] = solveArm(S, T, F.u, F.f, left);
      const w = isA ? 10.6 : 11.8, seg = (p, q, col, ww, cap) => sv("path", { d: `M${p[0].toFixed(1)} ${p[1].toFixed(1)} L${q[0].toFixed(1)} ${q[1].toFixed(1)}`, stroke: col, "stroke-width": ww, "stroke-linecap": cap || "round", fill: "none" }, g);
      seg(S, E, "#1b1320", w + 1.6).setAttribute("opacity", 0.35); seg(E, Hd, "#1b1320", w - 0.2).setAttribute("opacity", 0.35);
      seg(S, E, isA ? "url(#bs-plaid)" : "url(#bs-knit)", w); seg(E, Hd, isA ? "url(#bs-plaid)" : "url(#bs-knit)", w - 1.6);
      if (!isA) { const k = 0.74, cp = [E[0] + (Hd[0] - E[0]) * k, E[1] + (Hd[1] - E[1]) * k]; seg(cp, [E[0] + (Hd[0] - E[0]) * 0.97, E[1] + (Hd[1] - E[1]) * 0.97], "#1f2331", w - 0.6, "butt"); }
      if (isA && left) { const k = 0.78, wx = E[0] + (Hd[0] - E[0]) * k, wy = E[1] + (Hd[1] - E[1]) * k, ang = Math.atan2(Hd[1] - E[1], Hd[0] - E[0]) * 180 / Math.PI; const wg = sv("g", { transform: `translate(${wx.toFixed(1)} ${wy.toFixed(1)}) rotate(${ang.toFixed(1)})` }, g); sv("rect", { x: -1.9, y: -3.9, width: 3.8, height: 7.8, rx: 0.8, fill: "#2a2a36" }, wg); sv("rect", { x: -0.9, y: -1.6, width: 1.8, height: 3.2, fill: "#9ac6e0", opacity: 0.9 }, wg); }
      sv("circle", { cx: Hd[0].toFixed(1), cy: Hd[1].toFixed(1), r: 4.4, fill: isA ? SKIN_A : SKIN_B, stroke: "#b98f72", "stroke-width": 0.6 }, g);
      return Hd;
    };
    const face = (g, p, o) => {
      const lk = Math.max(-1.6, Math.min(1.6, p.look || 0)) * 0.9, lky = Math.max(-1, Math.min(2, p.lookY || 0)) * 0.7, mood = p.mood || "neutral", ek = p.eyes || "open";
      const eyes = sv("g", {}, g);
      [-1, 1].forEach(sd => {
        const x = sd * o.ex + lk, y = o.ey + lky;
        if (ek === "closed") sv("path", { d: `M${x - 2.2} ${y} Q${x} ${y + 1.7} ${x + 2.2} ${y}`, stroke: "#2a1d1a", "stroke-width": 1, fill: "none", "stroke-linecap": "round" }, eyes);
        else if (ek === "happy") sv("path", { d: `M${x - 2.2} ${y + 0.9} Q${x} ${y - 2} ${x + 2.2} ${y + 0.9}`, stroke: "#2a1d1a", "stroke-width": 1.1, fill: "none", "stroke-linecap": "round" }, eyes);
        else { const er = o.er || 1; sv("ellipse", { cx: x, cy: y, rx: 1.35 * er, ry: 1.7 * er, fill: o.eye || "#2a1d1a" }, eyes); sv("circle", { cx: x + 0.5 * er, cy: y - 0.6 * er, r: 0.45 * er, fill: "#fff", opacity: 0.9 }, eyes); }
      });
      if (ek === "open") anim(eyes, `transform-box:fill-box;transform-origin:center;animation:hkBlink ${(4.6 + Math.random() * 2.4).toFixed(1)}s ease-in-out -${(Math.random() * 4).toFixed(1)}s infinite;`);
      const up = { o: [-1.8, -1.8], smirk: [-0.2, -1.8], grin: [-0.8, -0.8], cheer: [-1.4, -1.4], smile: [-0.3, -0.3] }[mood] || [0, 0];
      [-1, 1].forEach((sd, i) => { const x = sd * o.ex + lk * 0.5, y = o.by + up[i]; sv("path", { d: `M${x - 3} ${y + 0.4} Q${x} ${y - 0.9} ${x + 3} ${y + (sd > 0 ? 0.4 : 0.4)}`, stroke: o.brow, "stroke-width": o.bw || 1.15, fill: "none", "stroke-linecap": "round" }, g); });
      const m = o.my, mc = "#7a2f2f", MS = { stroke: "#7a3a30", "stroke-width": 1, fill: "none", "stroke-linecap": "round" };
      if (mood === "o") sv("ellipse", { cx: 0, cy: m + 0.6, rx: 1.9, ry: 2.4, fill: mc }, g);
      else if (mood === "grin") { sv("path", { d: `M-4.4 ${m - 0.6} Q0 ${m + 5.4} 4.4 ${m - 0.6} Z`, fill: mc }, g); sv("path", { d: `M-3.4 ${m - 0.4} Q0 ${m + 1.2} 3.4 ${m - 0.4}`, stroke: "#f6ead0", "stroke-width": 1.1, fill: "none" }, g); }
      else if (mood === "cheer") { sv("path", { d: `M-5 ${m - 1.2} Q0 ${m + 7.4} 5 ${m - 1.2} Z`, fill: mc }, g); sv("path", { d: `M-4 ${m - 0.8} Q0 ${m + 0.8} 4 ${m - 0.8}`, stroke: "#f6ead0", "stroke-width": 1.2, fill: "none" }, g); }
      else if (mood === "smile" && o.open) { sv("path", { d: `M-4.6 ${m - 0.4} Q0.8 ${m - 2.2} 4.8 ${m - 1.6} Q2.4 ${m + 5.2} -4.6 ${m - 0.4} Z`, fill: mc }, g); sv("path", { d: `M-4.1 ${m - 0.5} Q0.8 ${m - 2} 4.4 ${m - 1.4} L4 ${m - 0.2} Q0.2 ${m - 1} -3.7 ${m + 0.2} Z`, fill: "#f6ead0" }, g); }
      else if (mood === "smile") sv("path", Object.assign({ d: `M-3.4 ${m - 0.6} Q0 ${m + 3} 3.4 ${m - 0.6}` }, MS), g);
      else if (mood === "smirk") sv("path", Object.assign({ d: `M-3 ${m + 0.2} Q1 ${m + 1.4} 4 ${m - 1.6}` }, MS), g);
      else if (mood === "calm") sv("path", Object.assign({ d: `M-2.4 ${m} Q0 ${m + 1.4} 2.4 ${m}` }, MS), g);
      else sv("path", Object.assign({ d: `M-2.8 ${m + 0.4} Q0 ${m + 0.9} 2.8 ${m + 0.4}` }, MS), g);
      if (p.blush || o.cheek || mood === "smile" || mood === "grin" || mood === "cheer") [-1, 1].forEach(sd => sv("ellipse", { cx: sd * (o.ex + 2.6), cy: m - 2.4, rx: p.blush ? 3.2 : o.cheek ? 3.1 : 2.4, ry: p.blush ? 2 : o.cheek ? 2 : 1.4, fill: p.blush ? "#e86a7a" : o.cheek ? "#ea8f8f" : "#e8908a", opacity: p.blush ? 0.6 : o.cheek ? 0.62 : 0.3 }, g));
    };
    const torsoA = g => {                                   // the striped sweater: cream with navy and maroon bands, a navy ribbed crew neck
      sv("path", { d: "M-24 9 Q-24 -3 -12 -5 L12 -5 Q24 -3 24 9 L25 58 L-25 58 Z", fill: "url(#bs-plaid)", stroke: "#5a2e3c", "stroke-width": 0.8 }, g).setAttribute("stroke-opacity", 0.55);
      sv("rect", { x: -4.6, y: -12, width: 9.2, height: 8, fill: "#d9ae8e" }, g);
      sv("path", { d: "M-10.4 -5.4 Q0 4.6 10.4 -5.4 L9 -10.4 Q0 -3.8 -9 -10.4 Z", fill: "#2b3862" }, g);
      sv("path", { d: "M-9 -9 Q0 -2.6 9 -9", stroke: "#4a5a8a", "stroke-width": 0.5, fill: "none", opacity: 0.6 }, g);
      sv("path", { d: "M-17 12 Q-19.4 34 -17.6 58 M17 12 Q19.4 34 17.6 58", stroke: "#7a6a5e", "stroke-width": 0.7, fill: "none", opacity: 0.5 }, g);
    };
    const torsoB = g => {                                   // a chunky dark knit with maroon patches, a ribbed navy crew neck over a white tee
      sv("path", { d: "M-27 9 Q-27 -3 -14 -6 L14 -6 Q27 -3 27 9 L28 62 L-28 62 Z", fill: "url(#bs-knit)", stroke: "#171b28", "stroke-width": 0.8 }, g);
      sv("rect", { x: -5, y: -13, width: 10, height: 9, fill: "#e4b898" }, g);
      sv("path", { d: "M-11 -5 Q0 7 11 -5 L9.4 -9.4 Q0 -2.6 -9.4 -9.4 Z", fill: "#1f2331" }, g);
      for (let k = 1; k < 10; k++) { const t = k / 10, xo = -11 + 22 * t, yo = (1 - t) * (1 - t) * -5 + 2 * t * (1 - t) * 7 + t * t * -5, xi = -9.4 + 18.8 * t, yi = (1 - t) * (1 - t) * -9.4 + 2 * t * (1 - t) * -2.6 + t * t * -9.4; sv("path", { d: `M${xi.toFixed(1)} ${yi.toFixed(1)} L${xo.toFixed(1)} ${yo.toFixed(1)}`, stroke: "#3c4562", "stroke-width": 0.55, opacity: 0.8 }, g); }
      sv("path", { d: "M-8.6 -9.6 Q0 -4.2 8.6 -9.6", stroke: "#f1efe9", "stroke-width": 1.5, fill: "none", "stroke-linecap": "round" }, g);
      sv("path", { d: "M-19 14 Q-22 36 -20 60 M19 14 Q22 36 20 60", stroke: "#131622", "stroke-width": 0.8, fill: "none", opacity: 0.55 }, g);
      sv("rect", { x: -28, y: 55, width: 56, height: 7, fill: "#1f2331" }, g);
    };
    // a neck that follows the head: joins the neck base on the torso to the underside of the (shifted, tilted) head, so leaning never snaps it
    const neckTo = (g, p, baseY, topY, hw) => {
      const th = p.head[2] * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
      const top = x => { const rx = x, ry = topY + 8; return [(rx * c - ry * s + p.head[0]).toFixed(1), (rx * s + ry * c - 8 + p.head[1]).toFixed(1)]; };
      const l = top(-hw), r = top(hw);
      sv("polygon", { points: `${-hw},${baseY} ${hw},${baseY} ${r[0]},${r[1]} ${l[0]},${l[1]}`, fill: "#d9b090" }, g);
    };
    const headA = (g, p) => {                               // a soft bowl cut: blunt, slightly ragged bangs, hair down past the ears, dark brown
      neckTo(g, p, -9, -16, 4.6);
      const h = sv("g", { transform: `translate(${p.head[0]} ${p.head[1]}) rotate(${p.head[2]} 0 -8)` }, g);
      const HAIR = "#4a2e22", HAIR_D = "#2f1d15";
      // 1. the back of the hair: a round dome that comes down on both sides to the jaw
      sv("path", { d: "M-12.6 -8.4 C-21.4 -16 -23 -32 -17.6 -39.6 C-12 -47.4 -4 -49 2 -48.6 C10 -48.4 17.4 -45 20 -37.4 C23.2 -30 22.4 -18 12.4 -7.8 Q9 -11.6 5 -13 L-5 -13 Q-9 -11.8 -12.6 -8.4 Z", fill: HAIR }, h);
      // 2. ears, then the face
      [-1, 1].forEach(sd => sv("ellipse", { cx: sd * 15.4, cy: -20, rx: 2.5, ry: 3.1, fill: SKIN_A, stroke: "#b98f72", "stroke-width": 0.5 }, h));
      sv("ellipse", { cx: 0, cy: -24, rx: 14.8, ry: 15.5, fill: SKIN_A }, h);
      // 3. the front: straight bangs with a few pointed strands, and the side hair falling over the temples
      sv("path", { d: "M-14.4 -21 C-15.8 -31 -15.4 -40 -4 -44.4 C4 -46.4 13 -44 15.6 -35 C16.4 -30 15.4 -25 14.4 -21 L13 -25.6 L11.6 -29.6 L10 -30.2 L8.4 -28 L6.8 -30.2 L4.2 -30.4 L2.6 -28.2 L0.8 -30.4 L-1.6 -30.2 L-3 -28 L-4.8 -30.2 L-7.4 -30.4 L-9 -28.4 L-10.6 -30.2 L-12.4 -27 Z", fill: HAIR }, h);
      sv("path", { d: "M1 -46 Q-3 -40 -2 -31 M-5 -44 Q-9 -38 -8.4 -31 M7 -45.4 Q10.4 -39 8.6 -31.6 M-12 -41 Q-16 -34 -14 -27 M13.4 -40 Q16.6 -34 14 -27 M-19 -32 Q-20.4 -24 -15.6 -15 M19.4 -32 Q20.6 -24 14 -14", stroke: HAIR_D, "stroke-width": 0.9, fill: "none", "stroke-linecap": "round", opacity: 0.5 }, h);
      sv("path", { d: "M-8 -43.8 Q-1 -46.6 7 -44.6", stroke: "#6e4a38", "stroke-width": 1.6, fill: "none", "stroke-linecap": "round", opacity: 0.45 }, h);
      face(h, p, { ex: 5.9, ey: -22.4, by: -26.8, my: -13.4, brow: "#2f1d15", er: 1.32, bw: 1.6, eye: "#3a2018", cheek: true, open: true });
      sv("circle", { cx: 9.4, cy: -18, r: 0.65, fill: "#5a3226" }, h);      // his mole
    };
    const headB = (g, p) => {                               // soft, wavy dark curls: a full mass that falls past the ears, a parted fringe of curls
      neckTo(g, p, -9, -18, 5);
      const h = sv("g", { transform: `translate(${p.head[0]} ${p.head[1]}) rotate(${p.head[2]} 0 -8)` }, g);
      const HAIR = "#3a251d", HAIR_L = "#5c3a2c";
      // 1. the back of the hair: a wavy outline, full on top and down both sides
      sv("path", { d: "M-15 -12 Q-19 -13 -19.6 -17.6 Q-23.4 -19 -22 -24 Q-25.4 -27 -22.6 -31.4 Q-25 -35.6 -21 -38.6 Q-22.4 -43.4 -17.6 -45 Q-17 -48.4 -11.4 -48.6 Q-8.4 -52.6 -3 -50.4 Q1.6 -53.6 6.4 -50.4 Q11.6 -52.2 13.6 -48 Q19 -47.8 19 -43.4 Q23.4 -42.4 21.6 -37.4 Q25.4 -34 22.4 -29.4 Q25 -25.4 21.6 -22 Q22.6 -17.4 18.4 -16.2 Q17 -12.4 13 -12.6 Q0 -8 -15 -12 Z", fill: HAIR }, h);
      // 2. ears, then the face
      [-1, 1].forEach(sd => sv("ellipse", { cx: sd * 14.9, cy: -25.4, rx: 2.6, ry: 3.3, fill: SKIN_B, stroke: "#b98f72", "stroke-width": 0.5 }, h));
      sv("ellipse", { cx: 0, cy: -28, rx: 14.4, ry: 17.4, fill: SKIN_B }, h);
      // 3. the front: a centre-ish parting, curls falling to either side over the forehead, a few at the temples
      sv("path", { d: "M-14.8 -27 Q-17.4 -35 -13.6 -41 Q-12.4 -46.2 -5 -46.8 Q0 -49.6 5.8 -47.2 Q13.4 -47 14.6 -42 Q18.4 -38 15.4 -29 Q15.6 -32.6 13.2 -34 Q12 -36.4 9.6 -34.6 Q7.4 -36.4 5.4 -34.2 Q3 -35.6 -0.6 -38.2 Q-3 -36 -5.8 -35 Q-7.6 -33 -10 -34.2 Q-11.8 -31.8 -13.2 -32.6 Q-14.8 -30.6 -14.8 -27 Z", fill: HAIR }, h);
      sv("path", { d: "M-10 -45 q3 -3.4 6.4 -1 q2.2 2 -0.4 3.8 M4 -47 q3.6 -2.4 6.6 0.4 q1.6 2.6 -1 3.6 M-16.6 -36 q-1.6 -3.6 1 -5.2 M15.4 -40 q2.6 1.4 1.4 4.2 M-19 -26 q-2.6 2.6 0.2 5 M19.6 -27 q2.4 2.6 -0.4 5 M-17.4 -16.8 q-1.4 1.6 1 3 M17 -17 q1.6 1.6 -0.6 3", stroke: HAIR_L, "stroke-width": 0.9, fill: "none", "stroke-linecap": "round", opacity: 0.8 }, h);
      face(h, p, { ex: 5.9, ey: -26.2, by: -30.8, my: -17.4, brow: "#33201a", bw: 1.4, er: 1.12, eye: "#1a1214", cheek: true });
    };
        return { solveArm, drawArm, face, torsoA, torsoB, headA, headB };
  }

  // ── the Wheelers' basement (reached through the window well) ──
  // A D&D table under a hanging lamp: a hand-drawn campaign map, dice, little painted minis, snacks and a walkie-talkie,
  // with two small figures sitting shoulder to shoulder behind it. The one on the left has a straight-fringed bowl cut and a
  // plaid flannel over a grey thermal; the one on the right is taller, with long dark curls and a teal pullover with grey
  // shoulder panels and a pocket. They sit in a different pose each visit: the last pose is remembered under "ao3-bs-pose"
  // (the only thing the basement saves), so you never get the same one twice running. Tap either of them to make them shift.
  // Tap the die to roll it; the little minis, the map, the snacks and the walkie-talkie all say something too.
  const BS_POSE_KEY = "ao3-bs-pose";
  // Each pose: a = the one on the left, b = the one on the right. sx/dy shift the body (px), head = [dx, dy, tilt°] (local units),
  // L/R = where each hand goes on the canvas [x, y, prop?] or "lap" (hidden under the table), cross = arms folded.
  const BS_POSES = [
    { say: "Shoulder to shoulder, heads together over the map. Somebody is about to make a very bad decision.",
      a: { sx: 1, head: [3, 1, 5], mood: "smile", look: 1, lookY: 1, L: [128, 344], R: [196, 342] },
      b: { sx: 0, head: [-2, 2, -5], mood: "o", look: -1, lookY: 1, L: [210, 339], R: [236, 344] } },
    { say: "One of them has his arms folded. The other is explaining the plan again.",
      a: { sx: 2, head: [2, 0, -4], mood: "smirk", look: 1, cross: true },
      b: { sx: -2, head: [-4, 1, -8], mood: "o", look: -1, lookY: 0.4, L: "lap", R: "lap" } },
    { say: "A roll is about to happen. Nobody is breathing.",
      a: { head: [1, 1, 3], mood: "grin", look: 1, lookY: 1, L: [140, 288], R: [156, 288] },
      b: { sx: -2, head: [4, -1, 5], mood: "grin", look: 0, lookY: 1, L: [200, 348], R: [252, 318, "die"] } },
    { say: "A whisper. Whatever it was, the other one is trying very hard not to laugh.",
      a: { sx: 1, head: [2, 1, 6], mood: "grin", eyes: "happy", look: 1, L: [128, 346], R: [160, 283] },
      b: { sx: 0, head: [-4, 3, -10], mood: "o", look: -1.5, L: [188, 270], R: [238, 348] } },
    { say: "A small tin hero is walking across the map, with sound effects.",
      a: { head: [-1, 0, -4], mood: "grin", look: -1, L: [124, 331, "mini"], R: [168, 346] },
      b: { sx: -1, head: [2, 2, 5], mood: "smile", look: -1, lookY: 1, L: [193, 278], R: [238, 346] } },
    { say: "Heads down over the character sheet. The pencil is doing most of the talking.",
      a: { sx: 2, head: [3, 6, 10], mood: "neutral", look: 0.5, lookY: 1.8, L: [137, 344, "pencil"], R: [168, 345] },
      b: { sx: -2, head: [-3, 6, -9], mood: "neutral", look: 0, lookY: 1.8, L: [190, 268], R: [236, 346] } },
    { say: "One of them has fallen asleep against the other’s shoulder. The other is quietly working the walkie-talkie.",
      front: "a",
      a: { sx: 6, head: [8, 3, 15], mood: "calm", eyes: "closed", L: "lap", R: "lap" },
      b: { sx: -2, head: [-1, -1, -4], mood: "o", look: 0.5, L: "lap", R: [226, 280, "walkie"] } },
    { say: "A natural twenty! The whole table erupts.", die: 20, cheer: true,
      a: { head: [0, -3, 0], mood: "cheer", eyes: "happy", L: [110, 262], R: [180, 254] },
      b: { head: [0, -3, -3], mood: "cheer", eyes: "happy", L: [183, 250], R: [252, 254] } },
    { say: "Snack break. Strictly speaking, the popcorn is part of the map.",
      a: { sx: -2, head: [-3, 1, -6], mood: "smile", look: -1.2, lookY: 0.8, L: [104, 345], R: [170, 346] },
      b: { sx: 2, head: [4, 0, 6], mood: "smile", look: -1, L: "lap", R: [238, 342, "can"] } },
    { say: "A disagreement about the rules. The rulebook is being consulted, slowly.",
      a: { head: [0, 0, -5], mood: "smirk", look: 1, L: [104, 314], R: [182, 312] },
      b: { head: [3, 0, 8], mood: "o", look: -1, L: [166, 306], R: "lap" } }
  ];

  function openBasement() {
    const sh = hkShell("ao3-basement", "\u{1F3B2} The basement");
    const { sv, rnd, anim } = sh.kit;
    const { sub, field, caption, pill, close, later } = sh;
    const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const say = t => { caption.textContent = t; };
    const W = 360, H = 540, hits = [];
    let nTable = 0, nCouch = 0, nMap = 0, nMini = 0, nSnack = 0, nPoster = 0;
    sh.box.style.background = "#241a26";
    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMin meet" });
    svg.style.cssText = "width:100%;height:auto;display:block;";
    const defs = sv("defs", {}, svg);
    const glow = sv("radialGradient", { id: "bs-glow" }, defs);
    sv("stop", { offset: "0%", "stop-color": "#ffd98a", "stop-opacity": "0.85" }, glow);
    sv("stop", { offset: "100%", "stop-color": "#ffd98a", "stop-opacity": "0" }, glow);
    const cone = sv("linearGradient", { id: "bs-cone", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    sv("stop", { offset: "0%", "stop-color": "#ffd98a", "stop-opacity": "0.26" }, cone);
    sv("stop", { offset: "100%", "stop-color": "#ffd98a", "stop-opacity": "0.03" }, cone);
    const vig = sv("radialGradient", { id: "bs-vig", cx: "50%", cy: "52%", r: "75%" }, defs);
    sv("stop", { offset: "55%", "stop-color": "#0a060e", "stop-opacity": "0" }, vig);
    sv("stop", { offset: "100%", "stop-color": "#0a060e", "stop-opacity": "0.6" }, vig);
    // the flannel: tan with blue bands and thin orange lines
    const plaid = sv("pattern", { id: "bs-plaid", width: 16, height: 16, patternUnits: "userSpaceOnUse" }, defs);   // Will's striped sweater (bsKit asks for this id)
    sv("rect", { width: 16, height: 16, fill: "#d8c9b0" }, plaid); sv("rect", { y: 0, width: 16, height: 1.1, fill: "#8a2c44" }, plaid); sv("rect", { y: 2.1, width: 16, height: 3, fill: "#2b3862" }, plaid); sv("rect", { y: 5.9, width: 16, height: 1, fill: "#8a2c44" }, plaid);
    const knit = sv("pattern", { id: "bs-knit", width: 30, height: 30, patternUnits: "userSpaceOnUse" }, defs);   // Mike's chunky patterned sweater
    sv("rect", { width: 30, height: 30, fill: "#272d41" }, knit); sv("rect", { x: 2, y: 3, width: 13, height: 10, fill: "#6a2c3a" }, knit); sv("rect", { x: 17, y: 15, width: 11, height: 12, fill: "#6a2c3a" }, knit); sv("rect", { x: 17, y: 2, width: 9, height: 9, fill: "#1c2030" }, knit); sv("rect", { x: 3, y: 18, width: 10, height: 8, fill: "#1c2030" }, knit);
    sv("path", { d: "M0 14.5 H30 M15.5 0 V30", stroke: "#74703f", "stroke-width": 0.7, "stroke-dasharray": "2 1.2", opacity: 0.5 }, knit); sv("path", { d: "M4 6 h3 M20 20 h3 M9 22 h2 M22 5 h2", stroke: "#8a4050", "stroke-width": 0.6, opacity: 0.6 }, knit);
    const mapClip = sv("clipPath", { id: "bs-mapclip" }, defs);
    sv("polygon", { points: "112,331 248,331 270,366 90,366" }, mapClip);

    // ── the room ──
    sv("rect", { x: 0, y: 0, width: W, height: 330, fill: "#3b2a34" }, svg);                                      // the back wall, with wood panelling
    for (let x = 0; x < W; x += 20) sv("path", { d: `M${x} 40 V330`, stroke: "#2c1f29", "stroke-width": 1, opacity: 0.7 }, svg);
    sv("rect", { x: 0, y: 0, width: W, height: 40, fill: "#1b1320" }, svg);                                       // the low ceiling
    sv("rect", { x: 0, y: 36, width: W, height: 6, fill: "#2c2028" }, svg);
    sv("rect", { x: 0, y: 322, width: W, height: 8, fill: "#2c1f29" }, svg);                                      // skirting board
    sv("rect", { x: 0, y: 330, width: W, height: 210, fill: "#2a2030" }, svg);                                     // the carpet, and a rug under the table
    sv("rect", { x: 22, y: 352, width: 316, height: 150, rx: 10, fill: "#5a2f4a" }, svg);
    sv("rect", { x: 30, y: 360, width: 300, height: 134, rx: 8, fill: "none", stroke: "#8a5a6a", "stroke-width": 1.4, "stroke-dasharray": "6 5" }, svg);
    // the high window you came through, showing the sky outside
    const sky = { night: "#18203a", dusk: "#8a4a62", dawn: "#6e75b0" }[HK_TIMES[hkTimeGet()].name];
    sv("rect", { x: 22, y: 68, width: 70, height: 30, fill: "#cfc9dc" }, svg);
    sv("rect", { x: 25, y: 71, width: 64, height: 24, fill: sky }, svg);
    sv("path", { d: "M57 71 V95", stroke: "#cfc9dc", "stroke-width": 2 }, svg);
    if (HK_WX[hkWxGet()][0] === "snow") for (let i = 0; i < 8; i++) sv("circle", { cx: 28 + rnd("bf" + i) * 58, cy: 73 + rnd("bg" + i) * 20, r: 1.1, fill: "#fff" }, svg);
    // the stairs up to the house, on the right
    sv("polygon", { points: "262,330 350,330 350,60 322,60", fill: "#2c2028" }, svg);
    for (let i = 0; i < 9; i++) sv("path", { d: `M${262 + i * 6.6} ${330 - i * 30} H350`, stroke: "#4a3340", "stroke-width": 1.6 }, svg);
    sv("rect", { x: 322, y: 46, width: 28, height: 30, fill: "#f0b45a", opacity: 0.8 }, svg);
    sv("circle", { cx: 336, cy: 62, r: 24, fill: "url(#bs-glow)", opacity: 0.4 }, svg);
    // shelves of games on the left wall
    [[20, 138], [20, 186]].forEach(([sx, sy], r) => {
      sv("rect", { x: sx, y: sy + 28, width: 112, height: 4, fill: "#4a3326" }, svg);
      for (let i = 0; i < 7; i++) { const bh = 18 + rnd("bk" + r + i) * 8; sv("rect", { x: sx + 4 + i * 15, y: sy + 28 - bh, width: 12, height: bh, fill: ["#c9482e", "#3f7fd0", "#e0a032", "#4a8a5a", "#8a4a9a"][(i + r) % 5], opacity: 0.85 }, svg); }
    });
    // two things pinned to the wall: a scribbled dungeon plan, and a crayon dragon
    const plan = sv("g", {}, svg);
    sv("polygon", { points: "140,104 172,102 174,142 142,144", fill: "#d8c9a0" }, plan);
    sv("path", { d: "M147 112 H166 V122 H158 V134 H147 Z M158 122 H168 M150 138 H165", stroke: "#5a4a3a", "stroke-width": 1, fill: "none" }, plan);
    sv("circle", { cx: 156, cy: 104, r: 1.6, fill: "#c9482e" }, plan);
    const crayon = sv("g", {}, svg);
    sv("polygon", { points: "196,108 238,110 236,154 197,152", fill: "#efe8d6" }, crayon);
    sv("path", { d: "M204 140 Q210 126 220 130 Q228 122 232 114 M220 130 Q226 138 232 136 M204 140 Q214 146 228 142", stroke: "#4a8a5a", "stroke-width": 2.2, fill: "none", "stroke-linecap": "round" }, crayon);
    sv("circle", { cx: 230, cy: 118, r: 1.2, fill: "#c9482e" }, crayon);
    sv("path", { d: "M233 113 q6 -2 8 -8 M233 116 q5 3 9 0", stroke: "#e0a032", "stroke-width": 1.8, fill: "none", "stroke-linecap": "round" }, crayon);
    sv("circle", { cx: 217, cy: 108, r: 1.6, fill: "#3f7fd0" }, crayon);
    // lights along the ceiling beam
    const BULB = ["#ff7a7a", "#ffd36b", "#7ad6ff", "#9be58f", "#ffa6e8"];
    sv("path", { d: "M0 46 Q90 72 180 46 Q270 72 360 46", stroke: "#2a1d1a", "stroke-width": 1, fill: "none" }, svg);
    for (let i = 0; i < 12; i++) {
      const t = i / 11, s = (t * 2) % 1, bx = t * 360, by = 46 + 2 * (1 - s) * s * 26 + 1, col = BULB[i % BULB.length];
      sv("circle", { cx: bx.toFixed(1), cy: by.toFixed(1), r: 5, fill: col, opacity: 0.2 }, svg);
      anim(sv("circle", { cx: bx.toFixed(1), cy: by.toFixed(1), r: 1.8, fill: col }, svg), `animation:hkTwinkle ${(1.6 + rnd("bt" + i) * 1.8).toFixed(1)}s ease-in-out -${(rnd("bu" + i) * 3).toFixed(1)}s infinite;`);
    }
    // the couch, on the left (half out of the picture)
    sv("rect", { x: -30, y: 340, width: 92, height: 40, rx: 8, fill: "#7a4658" }, svg);
    sv("rect", { x: -30, y: 372, width: 100, height: 46, rx: 8, fill: "#6a3a4a" }, svg);
    sv("path", { d: "M20 376 V416", stroke: "#4a2634", "stroke-width": 1.2 }, svg);
    sv("path", { d: "M-6 388 Q16 378 36 392 L36 412 L-6 412 Z", fill: "#3f7a6a", opacity: 0.85 }, svg);               // a blanket
    // the lamp hanging over the table, and its cone of light
    sv("polygon", { points: "168,200 192,200 292,380 68,380", fill: "url(#bs-cone)" }, svg);
    anim(sv("circle", { cx: 180, cy: 270, r: 130, fill: "url(#bs-glow)", opacity: 0.32 }, svg), "animation:hkFlicker 4s ease-in-out infinite;");
    sv("path", { d: "M180 40 V172", stroke: "#14111f", "stroke-width": 1.4 }, svg);
    sv("polygon", { points: "157,198 203,198 193,172 167,172", fill: "#3a2a1a" }, svg);
    sv("ellipse", { cx: 180, cy: 198, rx: 23, ry: 3.4, fill: "#ffe3a0" }, svg);
    sv("circle", { cx: 180, cy: 199, r: 3, fill: "#fff6d8" }, svg);

    // ── the two at the table ──
    const FIG = {
      a: { cx: 146, sy: 292, s: 1.25, u: 21, f: 20, sl: [-21, 5], sr: [21, 5] },
      b: { cx: 210, sy: 286, s: 1.25, u: 23, f: 22, sl: [-24, 5], sr: [24, 5] }
    };
    const bodyL = sv("g", {}, svg);                         // the bodies and heads, behind the table
    // the table
    sv("ellipse", { cx: 180, cy: 424, rx: 142, ry: 14, fill: "#000", opacity: 0.28 }, svg);
    [[72, 378, 7, 48], [281, 378, 7, 48]].forEach(([lx, ly, lw, lh]) => sv("rect", { x: lx, y: ly, width: lw, height: lh, fill: "#3a2418" }, svg));
    sv("polygon", { points: "90,324 270,324 300,372 60,372", fill: "#6b4630" }, svg);                             // the top
    sv("polygon", { points: "90,324 270,324 272,327 88,327", fill: "#82583c" }, svg);
    sv("rect", { x: 60, y: 372, width: 240, height: 10, fill: "#4a2f1e" }, svg);
    sv("path", { d: "M100 340 L72 340 M270 338 L292 338 M96 358 H66 M268 358 H296", stroke: "#5a3a26", "stroke-width": 0.8, opacity: 0.8 }, svg);
    // the campaign map
    sv("polygon", { points: "112,331 248,331 270,366 90,366", fill: "#d8c9a0", stroke: "#a88a58", "stroke-width": 1 }, svg);
    const mp = sv("g", { "clip-path": "url(#bs-mapclip)" }, svg);
    sv("path", { d: "M112 331 L140 331 Q134 338 138 344 Q126 348 118 352 L90 352 Z", fill: "#9bb5b0", opacity: 0.8 }, mp);        // the sea, and its coast
    sv("path", { d: "M140 331 Q134 338 138 344 Q126 348 118 352", stroke: "#6a8a8a", "stroke-width": 0.8, fill: "none" }, mp);
    sv("path", { d: "M114 337 q3 -2 6 0 t6 0 M120 345 q3 -2 6 0", stroke: "#6a8a8a", "stroke-width": 0.6, fill: "none", opacity: 0.8 }, mp);
    for (let i = 0; i < 10; i++) { const fx = 150 + rnd("mf" + i) * 30, fy = 336 + rnd("mg" + i) * 8; sv("circle", { cx: fx.toFixed(1), cy: fy.toFixed(1), r: 1.7, fill: i % 2 ? "#5a7a4a" : "#6a8a52" }, mp); }   // the forest
    [[198, 338], [205, 335.6], [212, 338.4], [219, 335.8], [226, 338]].forEach(([mx, my]) => { sv("path", { d: `M${mx - 5} ${my + 4} L${mx} ${my - 4} L${mx + 5} ${my + 4} Z`, fill: "#a8987a", stroke: "#6a5238", "stroke-width": 0.5 }, mp); sv("path", { d: `M${mx - 1.6} ${my - 1.6} L${mx} ${my - 4} L${mx + 1.6} ${my - 1.6} Z`, fill: "#f4efe0" }, mp); });
    sv("path", { d: "M198 342 Q188 348 194 354 T180 366", stroke: "#7fa0b8", "stroke-width": 1.7, fill: "none", "stroke-linecap": "round" }, mp);   // the river
    sv("ellipse", { cx: 234, cy: 357, rx: 8, ry: 3, fill: "#7fa0b8" }, mp);                                            // a lake
    [[152, 342], [158, 343.5], [155, 345.5]].forEach(([tx, ty]) => { sv("rect", { x: tx - 1.4, y: ty - 1, width: 2.8, height: 2.2, fill: "#8a4a3a" }, mp); sv("path", { d: `M${tx - 1.9} ${ty - 1} L${tx} ${ty - 2.8} L${tx + 1.9} ${ty - 1} Z`, fill: "#4a2a30" }, mp); });   // a town
    sv("rect", { x: 236, y: 336, width: 11, height: 6, fill: "#9a8a7a", stroke: "#5a4a3a", "stroke-width": 0.5 }, mp);                 // a castle
    [236, 240, 244].forEach(cx => sv("rect", { x: cx, y: 334, width: 2.6, height: 2.4, fill: "#9a8a7a", stroke: "#5a4a3a", "stroke-width": 0.4 }, mp));
    sv("path", { d: "M155 346 Q170 340 186 345 T202 343", stroke: "#a83a2a", "stroke-width": 0.9, "stroke-dasharray": "2 2", fill: "none" }, mp);   // the planned route
    sv("path", { d: "M180 331 V366 M112 348 H270", stroke: "#a88a58", "stroke-width": 0.7, opacity: 0.35 }, mp);     // fold lines
    sv("path", { d: "M200.4 338.8 l7.2 7.2 M207.6 338.8 l-7.2 7.2", stroke: "#c9482e", "stroke-width": 1.8, "stroke-linecap": "round" }, mp);   // the X
    sv("path", { d: "M255 354 V364 M250 359 H260 M251.5 355.5 L258.5 362.5 M258.5 355.5 L251.5 362.5", stroke: "#6a5238", "stroke-width": 0.6, fill: "none" }, mp);   // compass rose
    const nTxt = sv("text", { x: 255, y: 353, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 3.4, fill: "#6a5238" }, mp); nTxt.textContent = "N";
    const mTxt = sv("text", { x: 176, y: 334.6, "text-anchor": "middle", "font-family": "Georgia,serif", "font-style": "italic", "font-size": 3.6, "letter-spacing": 0.5, fill: "#6a5238", opacity: 0.85 }, mp); mTxt.textContent = "THE VALE OF ASH";
    sv("polygon", { points: "112,331 248,331 270,366 90,366", fill: "none", stroke: "#8a6a3a", "stroke-width": 2.4, opacity: 0.3 }, mp);
    // a character sheet and a pencil
    sv("polygon", { points: "100,350 134,348 138,364 102,367", fill: "#efe8d6", stroke: "#b8ad92", "stroke-width": 0.6 }, svg);
    sv("path", { d: "M106 354 L128 353 M107 357.5 L130 356.5 M108 361 L124 360 M115 355 v8", stroke: "#6a6a7a", "stroke-width": 0.7, fill: "none", opacity: 0.8 }, svg);
    // the minis
    const mini = (g, x, y, col, kind, sc) => {
      const M = sv("g", { transform: `translate(${x} ${y}) scale(${sc || 1})` }, g);
      sv("ellipse", { cx: 0, cy: 1.2, rx: 4.3, ry: 1.7, fill: "#1a120c", opacity: 0.55 }, M);
      sv("ellipse", { cx: 0, cy: 0, rx: 3.8, ry: 1.4, fill: "#4a4a58" }, M);
      sv("path", { d: "M-2.8 0 L-1.4 -8 L1.4 -8 L2.8 0 Z", fill: col }, M);
      sv("circle", { cx: 0, cy: -9.4, r: 2.2, fill: kind === "goblin" ? "#7aa05a" : "#e8c4a8" }, M);
      if (kind === "wizard") { sv("path", { d: "M-3.4 -10.6 L3.4 -10.6 L0.6 -19 Z", fill: col }, M); sv("path", { d: "M3.4 -1 L4 -14", stroke: "#8a6a3a", "stroke-width": 0.9 }, M); sv("circle", { cx: 4, cy: -14.6, r: 1, fill: "#7ad6ff" }, M); }
      else if (kind === "knight") { sv("path", { d: "M-2.7 -9.6 Q0 -14.4 2.7 -9.6 Z", fill: "#9aa0ae" }, M); sv("path", { d: "M3.6 -2 L3.6 -12", stroke: "#cfd4de", "stroke-width": 0.9 }, M); }
      else if (kind === "rogue") { sv("path", { d: "M-2.8 -9.2 Q0 -14 2.8 -9.2 Z", fill: "#2a2a36" }, M); sv("path", { d: "M-3.6 -3 L-3.6 -8", stroke: "#cfd4de", "stroke-width": 0.8 }, M); }
      else if (kind === "cleric") { sv("ellipse", { cx: 0, cy: -12.8, rx: 2.8, ry: 0.8, fill: "none", stroke: "#e0b032", "stroke-width": 0.7 }, M); }
      else if (kind === "goblin") { sv("polygon", { points: "-2,-10 -5,-12 -2.4,-8.6", fill: "#7aa05a" }, M); sv("polygon", { points: "2,-10 5,-12 2.4,-8.6", fill: "#7aa05a" }, M); }
      return M;
    };
    const party = sv("g", {}, svg);
    mini(party, 146, 352, "#c9482e", "knight"); mini(party, 158, 348, "#3f7fd0", "wizard"); mini(party, 170, 353, "#4a8a5a", "rogue"); mini(party, 182, 348, "#e0a032", "cleric");
    const foes = sv("g", {}, svg);
    mini(foes, 214, 352, "#4a7a3a", "goblin"); mini(foes, 226, 347.5, "#5a8a42", "goblin");
    // the dragon, the best-painted thing in the house
    const dr = sv("g", { transform: "translate(246 348)" }, svg);
    sv("ellipse", { cx: 0, cy: 2, rx: 11, ry: 2.6, fill: "#1a120c", opacity: 0.5 }, dr);
    sv("ellipse", { cx: 0, cy: 0.6, rx: 10, ry: 2.5, fill: "#4a4a58" }, dr);
    sv("path", { d: "M-6 -3 Q-14 -2 -13 -10 Q-9 -6 -5 -6 Z", fill: "#2f7a3e" }, dr);
    sv("path", { d: "M-2 -9 L-9 -21 L-3 -16.5 L0 -23 L3 -12 Z", fill: "#2d6a3a", stroke: "#1f4a2a", "stroke-width": 0.5 }, dr);
    sv("ellipse", { cx: 0, cy: -6.5, rx: 6.8, ry: 4.6, fill: "#3f8a4a" }, dr);
    sv("ellipse", { cx: 1, cy: -4.6, rx: 3.6, ry: 2.2, fill: "#c9d68a", opacity: 0.85 }, dr);
    sv("path", { d: "M3 -8.6 Q7.4 -12.6 7.2 -16.6", stroke: "#3f8a4a", "stroke-width": 3.6, fill: "none", "stroke-linecap": "round" }, dr);
    sv("ellipse", { cx: 9, cy: -17.8, rx: 3.8, ry: 2.4, fill: "#3f8a4a" }, dr);
    sv("circle", { cx: 9.8, cy: -18.4, r: 0.65, fill: "#ffd98a" }, dr);
    sv("polygon", { points: "6,-19.6 5,-23 8,-20.4", fill: "#e6dcf5" }, dr);
    sv("rect", { x: -4.4, y: -2.4, width: 2.6, height: 3.4, fill: "#2f7a3e" }, dr); sv("rect", { x: 2.4, y: -2.4, width: 2.6, height: 3.4, fill: "#2f7a3e" }, dr);
    // dice
    const d20 = (g, x, y, sc, val) => {
      const D = sv("g", { transform: `translate(${x} ${y}) scale(${sc})` }, g);
      sv("polygon", { points: "0,-8 7,-4 7,4 0,8 -7,4 -7,-4", fill: "#e6dcf5", stroke: "#8a86a0", "stroke-width": 0.8 }, D);
      sv("path", { d: "M0 -8 L-3.4 2.4 L3.4 2.4 Z M-7 -4 L-3.4 2.4 L-7 4 M7 -4 L3.4 2.4 L7 4 M0 8 L-3.4 2.4 M0 8 L3.4 2.4", stroke: "#8a86a0", "stroke-width": 0.5, fill: "none", opacity: 0.6 }, D);
      const t = sv("text", { x: 0, y: 1.6, "text-anchor": "middle", "font-family": "Georgia,serif", "font-weight": 700, "font-size": 4.6, fill: "#3a2a5a" }, D); t.textContent = String(val);
      return { D, t };
    };
    const tableDie = sv("g", { style: "transform-box:fill-box;transform-origin:center;" }, svg);
    let dieVal = 1 + Math.floor(Math.random() * 20);
    const die = d20(tableDie, 280, 348, 1.15, dieVal);
    const setDie = n => { dieVal = n; die.t.textContent = String(n); };
    sv("rect", { x: 258, y: 360, width: 8, height: 8, rx: 1, fill: "#c9482e", stroke: "#6a2a1e", "stroke-width": 0.6 }, svg);           // a d6
    [[260.4, 362.4], [263.6, 362.4], [260.4, 365.6], [263.6, 365.6]].forEach(([px, py]) => sv("circle", { cx: px, cy: py, r: 0.75, fill: "#f6ead0" }, svg));
    sv("polygon", { points: "290,367 295,367 292.5,361", fill: "#3f7fd0", stroke: "#1f4a8a", "stroke-width": 0.5 }, svg);           // a d4
    // snacks, and the walkie-talkie
    sv("ellipse", { cx: 90, cy: 355, rx: 12, ry: 5, fill: "#d8d0c0", stroke: "#8a8070", "stroke-width": 0.6 }, svg);
    sv("path", { d: "M80 353 L81 358 M86 351.6 L86.6 359.8 M93 351.6 L92.4 359.8 M99 353 L98 358", stroke: "#c9482e", "stroke-width": 1.5, opacity: 0.8 }, svg);
    [[82, 351], [87, 349], [92, 350], [97, 351.4], [85, 352.4], [90, 352], [95, 353], [88.6, 347.6], [93.6, 347.8]].forEach(([px, py], i) => sv("circle", { cx: px, cy: py, r: 2 + (i % 3) * 0.3, fill: i % 2 ? "#f6ead0" : "#efdca8" }, svg));
    [[98, 335, "#3f7fd0"], [108, 333.4, "#c9482e"]].forEach(([cx, cy, cc]) => { sv("rect", { x: cx - 3.4, y: cy - 10, width: 6.8, height: 11, rx: 1.6, fill: cc }, svg); sv("rect", { x: cx - 3.4, y: cy - 10, width: 6.8, height: 2, rx: 1, fill: "#cfd4de" }, svg); sv("path", { d: `M${cx - 1.6} ${cy - 6} h3.2`, stroke: "#f6ead0", "stroke-width": 1, opacity: 0.8 }, svg); });
    sv("rect", { x: 262, y: 316, width: 13, height: 22, rx: 2, fill: "#2a2a36", stroke: "#4a4a5a", "stroke-width": 0.8 }, svg);              // the walkie-talkie
    sv("path", { d: "M266 316 V304", stroke: "#4a4a5a", "stroke-width": 1.4 }, svg);
    sv("rect", { x: 265, y: 321, width: 7, height: 5, fill: "#7a8a6a" }, svg);
    sv("circle", { cx: 268.5, cy: 331, r: 2, fill: "#3a3a4a", stroke: "#5a5a6a", "stroke-width": 0.5 }, svg);
    anim(sv("circle", { cx: 266, cy: 303, r: 1.4, fill: "#ff7a7a" }, svg), "animation:hkTwinkle 2.4s ease-in-out infinite;");

    // the arms and props, in front of the table
    const armL = sv("g", {}, svg);
    // soft dust in the lamplight, and a dark vignette round the edges
    for (let i = 0; i < 9; i++) anim(sv("circle", { cx: (150 + rnd("bd" + i) * 60).toFixed(1), cy: (205 + rnd("be" + i) * 110).toFixed(1), r: 0.9, fill: "#ffe3a0" }, svg), `animation:hkFirefly ${(7 + rnd("bh" + i) * 6).toFixed(1)}s ease-in-out -${(rnd("bi" + i) * 8).toFixed(1)}s infinite;opacity:0.4;`);
    const vgn = sv("rect", { x: 0, y: 0, width: W, height: H, fill: "url(#bs-vig)" }, svg); vgn.setAttribute("pointer-events", "none");

    // ── drawing the two ──
    const clear = n => { while (n.firstChild) n.removeChild(n.firstChild); };
    const mkFig = key => {
      const F = FIG[key];
      F.g1 = sv("g", {}, bodyL); F.g2 = sv("g", {}, armL);
      F.r1 = sv("g", {}, F.g1); F.r2 = sv("g", {}, F.g2);
      F.b1 = anim(sv("g", {}, F.r1), `animation:hkBreathe ${key === "a" ? 4.2 : 4.8}s ease-in-out infinite;`);
      F.b2 = anim(sv("g", {}, F.r2), `animation:hkBreathe ${key === "a" ? 4.2 : 4.8}s ease-in-out infinite;`);
    };
    mkFig("a"); mkFig("b");

    const prop = (g, kind, x, y) => {
      if (kind === "die") d20(g, x, y - 4, 0.95, "20");
      else if (kind === "pencil") { sv("path", { d: `M${x - 7} ${y + 7} L${x + 4} ${y - 6}`, stroke: "#e0b032", "stroke-width": 2.2, "stroke-linecap": "round" }, g); sv("path", { d: `M${x - 7} ${y + 7} L${x - 8.4} ${y + 9}`, stroke: "#3a3a46", "stroke-width": 1.4, "stroke-linecap": "round" }, g); sv("circle", { cx: x + 4.4, cy: y - 6.6, r: 1.3, fill: "#e8a0a0" }, g); }
      else if (kind === "mini") mini(g, x, y + 4, "#3f7fd0", "wizard");
      else if (kind === "can") { sv("rect", { x: x - 3.6, y: y - 10, width: 7.2, height: 11.5, rx: 1.6, fill: "#c9482e" }, g); sv("rect", { x: x - 3.6, y: y - 10, width: 7.2, height: 2, rx: 1, fill: "#cfd4de" }, g); }
      else if (kind === "walkie") { sv("rect", { x: x - 3.6, y: y - 12, width: 7.2, height: 15, rx: 1.4, fill: "#2a2a36", stroke: "#4a4a5a", "stroke-width": 0.6 }, g); sv("path", { d: `M${x - 1.4} ${y - 12} V${y - 21}`, stroke: "#4a4a5a", "stroke-width": 1.2 }, g); sv("rect", { x: x - 2.2, y: y - 9, width: 4.4, height: 3, fill: "#7a8a6a" }, g); }
    };
    const { solveArm, drawArm, face, torsoA, torsoB, headA, headB } = bsKit(sv, anim, FIG);   // the figure drawing lives in bsKit
    const drawFig = (key, p) => {
      const F = FIG[key], isA = key === "a";
      clear(F.b1); clear(F.b2);
      const tr = `translate(${(F.cx + (p.sx || 0)).toFixed(1)} ${(F.sy + (p.dy || 0)).toFixed(1)}) scale(${F.s})`;
      F.g1.setAttribute("transform", tr); F.g2.setAttribute("transform", tr);
      (isA ? torsoA : torsoB)(F.b1);
      const cx = F.cx + (p.sx || 0), cy = F.sy + (p.dy || 0), toLocal = t => [(t[0] - cx) / F.s, (t[1] - cy) / F.s];
      const hand = (left, t) => {
        if (t === "lap") { drawArm(F.b1, key, left, [left ? -17 : 17, 50], 0, 0); return; }
        const Hd = drawArm(F.b2, key, left, toLocal(t));
        if (t[2]) prop(F.b2, t[2], Hd[0], Hd[1]);
      };
      if (p.cross) {                                        // arms folded: the right arm underneath, the left over the top
        drawArm(F.b2, key, false, [-12, 23]);
        drawArm(F.b2, key, true, [12, 15]);
      } else { hand(false, p.R || "lap"); hand(true, p.L || "lap"); }
      (isA ? headA : headB)(F.b1, p);
    };

    let pi = 0;
    const applyPose = (i, announce) => {
      pi = i;
      const P = BS_POSES[i];
      drawFig("a", P.a); drawFig("b", P.b);
      if (P.front === "a") { bodyL.appendChild(FIG.a.g1); armL.appendChild(FIG.a.g2); } else { bodyL.appendChild(FIG.b.g1); armL.appendChild(FIG.b.g2); }
      if (P.die) setDie(P.die);
      try { localStorage.setItem(BS_POSE_KEY, String(i)); } catch {}
      if (announce) say(P.say);
      if (P.cheer && !reduce) later(() => react("cheer"), 80);
    };
    const react = kind => {
      if (reduce) return;
      const fr = kind === "cheer" ? [{ transform: "translateY(0)" }, { transform: "translateY(-7px)" }, { transform: "translateY(0)" }, { transform: "translateY(-4px)" }, { transform: "translateY(0)" }] : [{ transform: "translateX(0)" }, { transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "translateX(-2px)" }, { transform: "translateX(0)" }];
      ["a", "b"].forEach(k => [FIG[k].r1, FIG[k].r2].forEach(n => { try { n.animate(fr, { duration: 520, easing: "ease-out" }); } catch {} }));
    };
    // a different pose each visit: never the same one twice running
    let first = Math.floor(Math.random() * BS_POSES.length);
    try { const last = parseInt(localStorage.getItem(BS_POSE_KEY), 10); if (Number.isFinite(last) && last >= 0 && last < BS_POSES.length) first = (last + 1 + Math.floor(Math.random() * (BS_POSES.length - 1))) % BS_POSES.length; } catch {}
    applyPose(first, false);
    const shift = () => { applyPose((pi + 1 + Math.floor(Math.random() * (BS_POSES.length - 1))) % BS_POSES.length, true); };

    const roll = () => {
      const n = 1 + Math.floor(Math.random() * 20);
      if (!reduce) try { tableDie.animate([{ transform: "rotate(0deg) scale(1)" }, { transform: "rotate(300deg) scale(1.5)", offset: 0.5 }, { transform: "rotate(720deg) scale(1)" }], { duration: 560, easing: "ease-out" }); } catch {}
      later(() => {
        setDie(n);
        if (n === 20) { say("You roll the die. 20! The whole table erupts."); react("cheer"); }
        else if (n === 1) { say("You roll the die. 1. A very small, very quiet groan."); react("groan"); }
        else say(`You roll the die. ${n}.${n >= 15 ? " Somebody mutters “that’s good”." : n <= 5 ? " Somebody mutters “oh no”." : ""}`);
      }, reduce ? 0 : 520);
    };

    // tappable things
    const hit = (x, y, w, h, label, fn) => hits.push([x, y, w, h, label, fn]);
    hit(262, 60, 90, 270, "The stairs up", () => say("The stairs up to the house. Something warm is cooking up there."));
    hit(116, 232, 60, 92, "The one in the striped sweater", shift);
    hit(176, 218, 70, 106, "The one with the curly hair", shift);
    hit(90, 328, 180, 40, "The campaign map", () => say(["The campaign map, hand-drawn and much folded. Somebody has marked an X in red pencil.", "The route runs from the little town, through the forest, straight at the mountains. Nobody is happy about that.", "In the corner, in tiny letters: HERE BE DRAGONS. Underlined twice."][nMap++ % 3]));
    hit(100, 347, 38, 22, "The character sheet", () => say("A character sheet. Strength is crossed out and rewritten, twice."));
    hit(138, 334, 52, 24, "The party minis", () => say(["The party: a knight, a wizard, a rogue and a cleric, painted by hand and a little crooked.", "The wizard’s hat is a cut-down cone. Nobody mentions it."][nMini++ % 2]));
    hit(206, 334, 28, 24, "The goblin minis", () => say("Two goblins by the red X, chipped and slightly cross-eyed."));
    hit(230, 322, 32, 32, "The dragon mini", () => say("The dragon is the best-painted thing in the house. Nobody is sure who is allowed to touch it."));
    hit(266, 334, 28, 36, "The dice", roll);
    hit(76, 342, 28, 20, "The popcorn", () => say(["A bowl of popcorn. It is mostly the unpopped kind by now.", "Somebody keeps eating it off the edge of the map."][nSnack++ % 2]));
    hit(90, 322, 26, 16, "The sodas", () => say("Two cans of soda, one already shaken."));
    hit(258, 300, 22, 40, "The walkie-talkie", () => { hkCrackle(); say("The walkie-talkie hisses. “…Mike? Where did you go? Over.”"); });
    // the couch (and the little arrow on it) is the way left, to the blanket fort: see openBasementFort
    let leaving = false;
    const goFort = () => { if (leaving) return; leaving = true; say("The couch cushions are gone. A trail of popcorn leads off to the left\u2026"); bfFade(sh, () => openBasementFort(true)); };
    hit(-4, 300, 66, 124, "The couch, and the way to the blanket fort", goFort);
    hit(16, 130, 120, 100, "The games shelves", () => say("Shelves of board games and a very dented box of dice."));
    hit(20, 66, 74, 34, "The window", () => say("The little window you came through, high up on the wall."));
    hit(138, 100, 38, 46, "The pinned plan", () => say("A scribbled dungeon plan. One room is labelled “probably a trap”."));
    hit(194, 106, 46, 50, "The crayon dragon", () => say(["A crayon dragon, pinned up very proudly.", "It has seven legs. It is still the scariest thing in the room."][nPoster++ % 2]));
    sv("circle", { cx: 14, cy: 366, r: 11, fill: "#000", opacity: 0.35, "pointer-events": "none" }, svg);                // a small arrow: there is more to the left
    anim(sv("path", { d: "M18 358 L10 366 L18 374", stroke: "#ffd98a", "stroke-width": 2, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", "pointer-events": "none" }, svg), "animation:hkPulse 2.6s ease-in-out infinite;");
    const hitG = sv("g", {}, svg);
    hits.forEach(([x, y, w, h, label, fn]) => { const r = sv("rect", { x, y, width: w, height: h, fill: "transparent" }, hitG); r.style.cursor = "pointer"; r.setAttribute("role", "button"); r.setAttribute("aria-label", label); r.addEventListener("click", fn); });
    field.appendChild(svg);
    sub.textContent = "hawkins · the basement";
    say("Warm, low-ceilinged, smelling of popcorn. " + BS_POSES[pi].say);
    pill("\u{1F9CD} shift", "Make the two of them sit differently", shift);
    pill("\u{1F3B2} roll", "Roll the die", roll);
    pill("\u25C0 fort", "Follow the popcorn trail to the blanket fort", goFort);
    pill("\u{1F3E1} outside", "Climb back out to the front lawn", () => { close(); openWheelers(); });
    pill("\u{1F5FA}️ map", "Back to the map of Hawkins", () => { close(); openHawkins(false); });
    document.body.appendChild(sh.back);
  }

  // ── 🏕️ THE BLANKET FORT (off to the left of the Wheelers' basement) ──
  // Reached from the basement: tap the couch on the left edge, the little ◀ arrow, or the "◀ fort" pill. The screen fades
  // through black, like the window well. This is the fort seen from OUTSIDE (stage 1): blankets and sheets thrown over the
  // furniture (a striped one down the side, an olive one across the top, a pom-pom garland and fairy lights), with a thin sheet over
  // the opening, lit from within so that only two shadows show on the fabric, and a few small hearts drifting up out of the top. A TV hums to itself nearby and the couch has been stripped bare.
  //  · tap the fort: you lift the blanket and go inside, where Will and Mike are (openFortInside). The old shadow lines and hearts below only show if that scene is missing (or lifts the blanket: it fades to the inside, see openFortInside)
  //  · tap a heart, the TV, the couch, the popcorn trail, or the crayon drawing: each says something
  //  · the ▶ arrow on the right, or the "🎲 table" pill, goes back to the table
  // Nothing in here saves anything. Hearts, flicker and shadows stand still with "reduce motion" switched on.

  // fade the scene to black, close it, and run fn (which opens the next one)
  function bfFade(sh, fn) {
    const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const v = sh.kit.el("div", `position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:30;transition:opacity ${reduce ? 0 : 0.45}s;`);
    sh.box.appendChild(v);
    v.getBoundingClientRect();
    v.style.opacity = 1;
    sh.later(() => { sh.close(); fn(); }, reduce ? 60 : 480);
  }

  function openBasementFort(arrive) {
    const sh = hkShell("ao3-basement-fort", "\u{1F3D5}️ The fort");
    const { sv, rnd, anim, el } = sh.kit;
    const { sub, field, caption, pill, later } = sh;
    const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const say = t => { caption.textContent = t; };
    const W = 360, H = 540, hits = [];
    let nTent = 0, nHeart = 0, nTv = 0, nCouch = 0, nTrail = 0, nDraw = 0, leaving = false;
    sh.box.style.background = "#241a26";
    if (!document.getElementById("ao3-bf-css")) {
      const st = document.createElement("style");
      st.id = "ao3-bf-css";
      st.textContent = `
        @keyframes bfHeart{0%{opacity:0;transform:translate(0,0) scale(.4)}15%{opacity:.95}70%{opacity:.8}100%{opacity:0;transform:translate(var(--dx,0px),-92px) scale(1.15)}}
        @keyframes bfLeanA{0%,55%,100%{transform:rotate(0deg)}68%,86%{transform:rotate(7deg)}}
        @keyframes bfLeanB{0%,55%,100%{transform:rotate(0deg)}68%,86%{transform:rotate(-7deg)}}
        @keyframes bfStatic{0%,100%{opacity:.5}20%{opacity:.85}40%{opacity:.35}60%{opacity:.9}80%{opacity:.55}}
        @keyframes bfRoll{from{transform:translateY(-12px)}to{transform:translateY(64px)}}
      `;
      (document.head || document.documentElement).appendChild(st);
    }

    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMin meet" });
    svg.style.cssText = "width:100%;height:auto;display:block;";
    const defs = sv("defs", {}, svg);
    const glow = sv("radialGradient", { id: "bf-glow" }, defs);
    sv("stop", { offset: "0%", "stop-color": "#ffd98a", "stop-opacity": "0.85" }, glow);
    sv("stop", { offset: "100%", "stop-color": "#ffd98a", "stop-opacity": "0" }, glow);
    const lit = sv("radialGradient", { id: "bf-lit", cx: "50%", cy: "55%", r: "55%" }, defs);
    sv("stop", { offset: "0%", "stop-color": "#ffd27a", "stop-opacity": "0.95" }, lit);
    sv("stop", { offset: "55%", "stop-color": "#e8955a", "stop-opacity": "0.5" }, lit);
    sv("stop", { offset: "100%", "stop-color": "#c8704a", "stop-opacity": "0" }, lit);
    const tvg = sv("radialGradient", { id: "bf-tv" }, defs);
    sv("stop", { offset: "0%", "stop-color": "#8fd8ff", "stop-opacity": "0.55" }, tvg);
    sv("stop", { offset: "100%", "stop-color": "#8fd8ff", "stop-opacity": "0" }, tvg);
    const vig = sv("radialGradient", { id: "bf-vig", cx: "42%", cy: "55%", r: "78%" }, defs);
    sv("stop", { offset: "55%", "stop-color": "#0a060e", "stop-opacity": "0" }, vig);
    sv("stop", { offset: "100%", "stop-color": "#0a060e", "stop-opacity": "0.6" }, vig);
    // the striped blanket and the olive print
    const stripe = sv("pattern", { id: "bf-stripe", width: 22, height: 20, patternUnits: "userSpaceOnUse" }, defs);
    [["#e8917a", 0, 6], ["#f6dcb8", 6, 3], ["#d95a6a", 9, 6], ["#f6dcb8", 15, 2], ["#f0a860", 17, 5]].forEach(([c, x, w]) => sv("rect", { x, y: 0, width: w, height: 20, fill: c }, stripe));
    const olive = sv("pattern", { id: "bf-olive", width: 10, height: 10, patternUnits: "userSpaceOnUse" }, defs);
    sv("rect", { width: 10, height: 10, fill: "#8a8260" }, olive);
    sv("path", { d: "M5 1 L9 5 L5 9 L1 5 Z", fill: "#c9a86a", opacity: 0.5 }, olive);
    sv("circle", { cx: 5, cy: 5, r: 0.9, fill: "#5a4a38", opacity: 0.8 }, olive);
    const tentClip = sv("clipPath", { id: "bf-tentclip" }, defs);                                                     // the sheet over the opening
    sv("path", { d: "M98 160 Q128 288 176 424 L14 424 Q66 288 98 160 Z" }, tentClip);
    const rugClip = sv("clipPath", { id: "bf-rugclip" }, defs);
    sv("path", { d: "M10 440 Q6 410 40 404 Q90 396 140 402 Q200 396 236 410 Q252 440 240 474 Q222 512 150 514 Q70 518 24 500 Q4 480 10 440 Z" }, rugClip);
    const soft = sv("filter", { id: "bf-soft", x: "-10%", y: "-10%", width: "120%", height: "120%" }, defs);
    sv("feGaussianBlur", { stdDeviation: 1.2 }, soft);
    const screenClip = sv("clipPath", { id: "bf-screenclip" }, defs);
    sv("rect", { x: 242, y: 262, width: 70, height: 62, rx: 9 }, screenClip);

    // ── the room ──
    sv("rect", { x: 0, y: 0, width: W, height: 330, fill: "#3b2a34" }, svg);
    for (let x = 0; x < W; x += 20) sv("path", { d: `M${x} 40 V330`, stroke: "#2c1f29", "stroke-width": 1, opacity: 0.7 }, svg);
    sv("rect", { x: 0, y: 0, width: W, height: 40, fill: "#1b1320" }, svg);
    sv("rect", { x: 0, y: 36, width: W, height: 6, fill: "#2c2028" }, svg);
    sv("rect", { x: 0, y: 322, width: W, height: 8, fill: "#2c1f29" }, svg);
    sv("rect", { x: 0, y: 330, width: W, height: 210, fill: "#2a2030" }, svg);
    // lights along the ceiling beam
    const BULB = ["#ff7a7a", "#ffd36b", "#7ad6ff", "#9be58f", "#ffa6e8"];
    sv("path", { d: "M0 46 Q90 72 180 46 Q270 72 360 46", stroke: "#2a1d1a", "stroke-width": 1, fill: "none" }, svg);
    for (let i = 0; i < 12; i++) {
      const t = i / 11, s = (t * 2) % 1, bx = t * 360, by = 46 + 2 * (1 - s) * s * 26 + 1, col = BULB[i % BULB.length];
      sv("circle", { cx: bx.toFixed(1), cy: by.toFixed(1), r: 5, fill: col, opacity: 0.2 }, svg);
      anim(sv("circle", { cx: bx.toFixed(1), cy: by.toFixed(1), r: 1.8, fill: col }, svg), `animation:hkTwinkle ${(1.6 + rnd("fb" + i) * 1.8).toFixed(1)}s ease-in-out -${(rnd("fc" + i) * 3).toFixed(1)}s infinite;`);
    }
    // a crayon drawing pinned up: two stick figures and one very big heart
    const draw = sv("g", { transform: "translate(112 -6)" }, svg);
    sv("polygon", { points: "38,96 86,94 88,142 40,144", fill: "#efe8d6" }, draw);
    sv("circle", { cx: 52, cy: 114, r: 3.2, fill: "none", stroke: "#3f7fd0", "stroke-width": 1.4 }, draw);
    sv("circle", { cx: 72, cy: 114, r: 3.2, fill: "none", stroke: "#4a8a5a", "stroke-width": 1.4 }, draw);
    sv("path", { d: "M52 117.4 V130 M52 122 L47 127 M52 122 L58 125 M52 130 L48 138 M52 130 L56 138 M72 117.4 V130 M72 122 L78 127 M72 122 L66 125 M72 130 L68 138 M72 130 L76 138 M58 125 L66 125", stroke: "#4a4a5a", "stroke-width": 1.2, fill: "none", "stroke-linecap": "round" }, draw);
    sv("path", { d: "M62 108 C54 99 58 95 62 100 C66 95 70 99 62 108 Z", fill: "#e0405a" }, draw);
    sv("circle", { cx: 62, cy: 95, r: 1.4, fill: "#c9482e" }, draw);

    // ── the TV, on a rolling cart, humming to itself ──
    const tvWall = sv("ellipse", { cx: 288, cy: 292, rx: 96, ry: 78, fill: "url(#bf-tv)" }, svg);
    anim(tvWall, "animation:hkFlicker 3.2s ease-in-out infinite;");
    sv("ellipse", { cx: 288, cy: 392, rx: 78, ry: 12, fill: "#8fd8ff", opacity: 0.1 }, svg);
    sv("path", { d: "M270 252 L250 224 M286 252 L306 222", stroke: "#9a9aa8", "stroke-width": 1.3, "stroke-linecap": "round" }, svg);
    [[250, 224], [306, 222]].forEach(([ax, ay]) => sv("circle", { cx: ax, cy: ay, r: 1.6, fill: "#cfd4de" }, svg));
    sv("rect", { x: 232, y: 336, width: 5, height: 40, fill: "#3a2a20" }, svg); sv("rect", { x: 335, y: 336, width: 5, height: 40, fill: "#3a2a20" }, svg);
    sv("rect", { x: 226, y: 332, width: 120, height: 6, rx: 1, fill: "#4a3326" }, svg);
    sv("rect", { x: 228, y: 358, width: 116, height: 5, rx: 1, fill: "#4a3326" }, svg);
    sv("rect", { x: 244, y: 342, width: 90, height: 14, rx: 1.5, fill: "#2a2a36", stroke: "#4a4a5a", "stroke-width": 0.6 }, svg);          // the VCR
    sv("rect", { x: 252, y: 347, width: 44, height: 3.4, rx: 1, fill: "#0e0e16" }, svg);
    sv("circle", { cx: 322, cy: 349, r: 1.3, fill: "#7aff9a" }, svg);
    [["#c9482e", 232], ["#3f7fd0", 244], ["#e0a032", 256]].forEach(([c, tx], i) => sv("rect", { x: tx, y: 364 + (i % 2), width: 10, height: 6, fill: c, opacity: 0.9 }, svg));   // a few tapes on the lower shelf
    sv("rect", { x: 232, y: 252, width: 108, height: 80, rx: 8, fill: "#4a3a2c", stroke: "#2c2018", "stroke-width": 1.2 }, svg);
    sv("rect", { x: 238, y: 258, width: 78, height: 68, rx: 11, fill: "#16161e" }, svg);
    sv("rect", { x: 242, y: 262, width: 70, height: 62, rx: 9, fill: "#27384a" }, svg);
    const scr = sv("g", { "clip-path": "url(#bf-screenclip)" }, svg);
    const stat = [sv("g", {}, scr), sv("g", {}, scr), sv("g", {}, scr)];
    for (let i = 0; i < 26; i++) { const sy = 262 + i * 2.4; sv("rect", { x: 242 + rnd("sx" + i) * 14, y: sy.toFixed(1), width: (22 + rnd("sw" + i) * 44).toFixed(1), height: 1.4, fill: rnd("sc" + i) > 0.5 ? "#e8f4ff" : "#7a93ad", opacity: (0.35 + rnd("so" + i) * 0.5).toFixed(2) }, stat[i % 3]); }
    stat.forEach((g, i) => anim(g, `animation:bfStatic ${(0.9 + i * 0.37).toFixed(2)}s steps(2,end) -${(i * 0.3).toFixed(1)}s infinite;`));
    const band = sv("rect", { x: 242, y: 262, width: 70, height: 10, fill: "#fff", opacity: 0.13 }, scr);
    anim(band, "animation:bfRoll 3.4s linear infinite;");
    sv("rect", { x: 242, y: 262, width: 70, height: 62, rx: 9, fill: "none", stroke: "#0e1018", "stroke-width": 1.4 }, svg);
    sv("path", { d: "M248 270 Q262 266 280 268", stroke: "#fff", "stroke-width": 1.2, fill: "none", opacity: 0.18, "stroke-linecap": "round" }, svg);
    const playT = sv("text", { x: 247, y: 319, "font-family": "monospace", "font-size": 5.2, fill: "#7aff9a", opacity: 0.9 }, svg); playT.textContent = "▶ PLAY";
    [276, 296].forEach(ky => { sv("circle", { cx: 328, cy: ky, r: 4.2, fill: "#8a7a60", stroke: "#2c2018", "stroke-width": 0.8 }, svg); sv("path", { d: `M326 ${ky} H330`, stroke: "#2c2018", "stroke-width": 0.8 }, svg); });
    sv("path", { d: "M322 308 H334 M322 312 H334 M322 316 H334 M322 320 H334", stroke: "#2c2018", "stroke-width": 0.9, opacity: 0.8 }, svg);

    // ── the blanket fort: a ridge pole with a sheet hung over the open front (the gable), an olive blanket sloping away behind it,
    //    and a striped one pulled aside like a curtain. Lit from inside, so only shadows show on the sheet. ──
    const GABLE = "M98 160 Q128 288 176 424 L14 424 Q66 288 98 160 Z";
    const ROOF = "M98 160 L222 196 Q232 300 230 422 L176 424 Q128 288 98 160 Z";
    const shade = sv("linearGradient", { id: "bf-roofshade", x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    sv("stop", { offset: "0%", "stop-color": "#fff1c0", "stop-opacity": "0.22" }, shade);
    sv("stop", { offset: "45%", "stop-color": "#000", "stop-opacity": "0" }, shade);
    sv("stop", { offset: "100%", "stop-color": "#0a050c", "stop-opacity": "0.55" }, shade);
    const gv = sv("radialGradient", { id: "bf-gabvig", cx: "50%", cy: "55%", r: "50%" }, defs);
    sv("stop", { offset: "55%", "stop-color": "#1a0a1e", "stop-opacity": "0" }, gv);
    sv("stop", { offset: "100%", "stop-color": "#1a0a1e", "stop-opacity": "0.6" }, gv);
    // the fur rug it all sits on
    const RUG = "M8 440 Q4 410 40 404 Q90 396 140 402 Q200 396 238 410 Q254 440 242 474 Q224 512 150 514 Q70 518 22 500 Q2 480 8 440 Z";
    sv("path", { d: RUG, fill: "#3b2f35" }, svg);
    const rugFur = sv("g", { "clip-path": "url(#bf-rugclip)" }, svg);
    [[90, 470, 46, 16, "#7a6a66", 0.38], [196, 432, 34, 12, "#7a6a66", 0.3], [60, 428, 30, 10, "#1d151b", 0.4], [150, 500, 52, 12, "#1d151b", 0.35]].forEach(([cx, cy, rx, ry, c, o]) => sv("ellipse", { cx, cy, rx, ry, fill: c, opacity: o }, rugFur));
    for (let i = 0; i < 110; i++) { const fx = 8 + rnd("fx" + i) * 236, fy = 402 + rnd("fy" + i) * 112; sv("path", { d: `M${fx.toFixed(1)} ${fy.toFixed(1)} l${(rnd("fl" + i) * 5 - 2.5).toFixed(1)} ${(2 + rnd("fm" + i) * 3).toFixed(1)}`, stroke: rnd("fk" + i) > 0.5 ? "#9a8a82" : "#1d151b", "stroke-width": 1.1, "stroke-linecap": "round", opacity: 0.55 }, rugFur); }
    sv("ellipse", { cx: 122, cy: 424, rx: 118, ry: 12, fill: "#000", opacity: 0.32 }, svg);
    // a warm halo on the wall behind the fort, and a pool of light spilling out onto the rug
    sv("ellipse", { cx: 120, cy: 280, rx: 150, ry: 140, fill: "url(#bf-glow)", opacity: 0.16 }, svg);
    anim(sv("ellipse", { cx: 96, cy: 438, rx: 92, ry: 18, fill: "url(#bf-glow)", opacity: 0.6 }, svg), "animation:hkFlicker 4s ease-in-out infinite;");

    const tent = sv("g", {}, svg);
    // 1. the roof: the olive blanket sloping away to the right, lighter at the front edge, darker toward the back, with deep folds
    sv("path", { d: ROOF, fill: "url(#bf-olive)" }, tent);
    sv("path", { d: ROOF, fill: "url(#bf-roofshade)" }, tent);
    sv("path", { d: "M98 160 Q170 292 190 424 L206 424 Q186 290 98 160 Z", fill: "#241c10", opacity: 0.22 }, tent);
    sv("path", { d: "M98 160 Q200 280 216 424 L230 422 Q222 300 98 160 Z", fill: "#241c10", opacity: 0.2 }, tent);
    sv("path", { d: "M98 160 Q150 290 176 424 L188 424 Q166 290 98 160 Z", fill: "#fff1c0", opacity: 0.1 }, tent);
    sv("path", { d: "M104 166 Q196 214 222 196 M110 180 Q180 236 226 262", stroke: "#2e2618", "stroke-width": 1.2, fill: "none", opacity: 0.35 }, tent);
    sv("path", { d: "M176 424 Q190 418 204 424 T230 422", stroke: "#2a2214", "stroke-width": 3, fill: "none", opacity: 0.55, "stroke-linecap": "round" }, tent);
    // 2. the open front: the thin cream sheet, glowing from inside, with the light dying off toward its edges
    sv("path", { d: GABLE, fill: "#2a1828" }, tent);
    const inner = sv("g", { "clip-path": "url(#bf-tentclip)" }, tent);
    sv("ellipse", { cx: 100, cy: 372, rx: 84, ry: 76, fill: "url(#bf-lit)" }, inner);
    sv("ellipse", { cx: 100, cy: 356, rx: 140, ry: 140, fill: "url(#bf-gabvig)" }, inner);
    [[50, 414, 17, 10], [148, 416, 15, 9]].forEach(([cx, cy, rx, ry]) => sv("ellipse", { cx, cy, rx, ry, fill: "#f6dcb0", opacity: 0.45 }, inner));        // pillows in there
    sv("path", { d: "M80 250 Q74 340 80 424 M104 230 Q102 340 104 424 M128 250 Q134 340 126 424", stroke: "#a8683a", "stroke-width": 1, fill: "none", opacity: 0.3 }, inner);   // soft folds in the sheet
    // two shadows, shoulder to shoulder; each head sits on a neck so it can tip toward the other
    const sil = sv("g", { transform: "translate(-10 0)", filter: "url(#bf-soft)", fill: "#1d0f1a", opacity: 0.82 }, inner);
    sv("path", { d: "M68 436 Q68 398 78 386 Q86 377 94 376 Q104 377 112 386 Q120 398 120 436 Z" }, sil);
    sv("path", { d: "M106 436 Q106 396 116 384 Q124 375 131 374 Q142 375 150 384 Q160 396 160 436 Z" }, sil);
    const headA = sv("g", { style: "transform-box:fill-box;transform-origin:50% 100%;" }, sil);
    sv("rect", { x: 89, y: 364, width: 10, height: 16 }, headA); sv("circle", { cx: 94, cy: 357, r: 11 }, headA);
    const headB = sv("g", { style: "transform-box:fill-box;transform-origin:50% 100%;" }, sil);
    sv("rect", { x: 126, y: 362, width: 10, height: 16 }, headB); sv("circle", { cx: 131, cy: 354, r: 11.6 }, headB);
    anim(headA, "animation:bfLeanA 11s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%;");
    anim(headB, "animation:bfLeanB 11s ease-in-out -0.4s infinite;transform-box:fill-box;transform-origin:50% 100%;");
    // where the sheet meets the rug it falls into shadow, so the two sit down in it instead of floating
    const flf = sv("linearGradient", { id: "bf-floorfade", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    sv("stop", { offset: "0%", "stop-color": "#1a0a1e", "stop-opacity": "0" }, flf); sv("stop", { offset: "100%", "stop-color": "#1a0a1e", "stop-opacity": "0.7" }, flf);
    sv("rect", { x: 0, y: 392, width: 240, height: 34, fill: "url(#bf-floorfade)" }, inner);
    // the folded hem along both slopes of the front
    sv("path", { d: "M14 424 Q66 288 98 160 Q128 288 176 424", stroke: "#2a1428", "stroke-width": 6, fill: "none", opacity: 0.35, "stroke-linejoin": "round" }, tent);
    sv("path", { d: "M14 424 Q66 288 98 160 Q128 288 176 424", stroke: "#efe0c4", "stroke-width": 3, fill: "none", opacity: 0.9, "stroke-linejoin": "round" }, tent);
    // 3. the striped blanket, pulled aside down the left like a curtain
    sv("path", { d: "M86 158 Q46 232 28 312 Q12 372 2 424 L44 424 Q50 372 58 318 Q74 252 106 172 Z", fill: "url(#bf-stripe)" }, tent);
    sv("path", { d: "M86 158 Q46 232 28 312 Q12 372 2 424 L44 424 Q50 372 58 318 Q74 252 106 172 Z", fill: "url(#bf-roofshade)", opacity: 0.5 }, tent);
    sv("path", { d: "M92 164 Q58 240 40 320 Q28 372 20 424 M80 170 Q52 232 36 300", stroke: "#5a2a30", "stroke-width": 1.4, fill: "none", opacity: 0.4 }, tent);
    sv("path", { d: "M100 176 Q70 250 52 324 Q44 372 36 424", stroke: "#fff1dc", "stroke-width": 1.3, fill: "none", opacity: 0.25 }, tent);
    sv("path", { d: "M2 424 Q14 431 28 424 T44 424", stroke: "#3a2028", "stroke-width": 3, fill: "none", opacity: 0.6, "stroke-linecap": "round" }, tent);
    // 4. the ridge pole poking out the front,
    sv("path", { d: "M70 146 L100 162", stroke: "#3a2418", "stroke-width": 5.4, "stroke-linecap": "round" }, tent);
    sv("path", { d: "M70 146 L100 162", stroke: "#8a5a38", "stroke-width": 3.4, "stroke-linecap": "round" }, tent);
    sv("circle", { cx: 69, cy: 145.4, r: 3.4, fill: "#b07a4a", stroke: "#3a2418", "stroke-width": 0.8 }, tent);
    // pom-pom garland along the ridge and down the front-right edge, and fairy lights swagged across and down
    const gbez = (a, c, b, n) => Array.from({ length: n }, (_, i) => { const t = (i + 0.5) / n; return [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]; });
    const pomline = (a, c, b, n, off) => {
      sv("path", { d: `M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`, stroke: "#2a2230", "stroke-width": 0.9, fill: "none", opacity: 0.8 }, tent);
      gbez(a, c, b, n).forEach(([px, py], i) => {
        sv("circle", { cx: px.toFixed(1), cy: (py + 2.4).toFixed(1), r: 3.8, fill: ["#5fb0b0", "#1f1a24", "#7fd0d0"][(i + off) % 3] }, tent);
        sv("circle", { cx: (px - 1).toFixed(1), cy: (py + 1.2).toFixed(1), r: 1, fill: "#fff", opacity: 0.28 }, tent);
      });
    };
    pomline([100, 164], [168, 176], [222, 198], 12, 0);
    pomline([98, 162], [128, 288], [176, 424], 24, 1);
    const lights = (a, c, b, n, tag) => {
      sv("path", { d: `M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`, stroke: "#1a1218", "stroke-width": 0.8, fill: "none", opacity: 0.85 }, tent);
      for (let i = 0; i <= n; i++) {
        const t = i / n, bx = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], by = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1], col = BULB[(i + tag) % BULB.length];
        sv("circle", { cx: bx.toFixed(1), cy: by.toFixed(1), r: 5, fill: col, opacity: 0.2 }, tent);
        anim(sv("circle", { cx: bx.toFixed(1), cy: by.toFixed(1), r: 1.7, fill: col }, tent), `animation:hkTwinkle ${(1.5 + rnd("ff" + tag + i) * 1.8).toFixed(1)}s ease-in-out -${(rnd("fg" + tag + i) * 3).toFixed(1)}s infinite;`);
      }
    };
    lights([62, 232], [100, 282], [140, 244], 8, 0);
    lights([96, 168], [160, 186], [218, 204], 8, 2);
    lights([86, 160], [30, 290], [8, 410], 9, 4);
    // 5. on the floor in front: couch cushions, a pair of sneakers, a board game, and popcorn
    [["M14 440 Q16 430 42 428 L76 430 Q86 432 84 442 L80 456 Q62 462 28 458 Q12 456 14 440 Z", "#7a4658", "M46 430 V459"], ["M152 446 Q162 436 186 438 L208 444 Q214 452 210 462 Q188 472 160 468 Q148 462 152 446 Z", "#6a3a4a", "M182 438 V470"]].forEach(([d, c, st]) => { sv("path", { d, fill: c }, svg); sv("path", { d: st, stroke: "#00000044", "stroke-width": 1 }, svg); sv("circle", { cx: d.startsWith("M14") ? 46 : 182, cy: d.startsWith("M14") ? 444 : 453, r: 1.6, fill: "#3a1a26" }, svg); });
    [[104, 436], [116, 437]].forEach(([sx, sy], i) => { sv("path", { d: `M${sx} ${sy + 4} Q${sx} ${sy - 3} ${sx + 6} ${sy - 3} L${sx + 9} ${sy} Q${sx + 12} ${sy + 1} ${sx + 12} ${sy + 4} Z`, fill: i ? "#e8e0d0" : "#c9482e" }, svg); sv("path", { d: `M${sx} ${sy + 4} H${sx + 12}`, stroke: "#2a2a36", "stroke-width": 1.4 }, svg); });
    const box = sv("g", { transform: "rotate(-5 104 480)" }, svg);
    sv("polygon", { points: "66,466 134,462 142,484 72,490", fill: "#efe8d6", stroke: "#b8ad92", "stroke-width": 0.6 }, box);
    sv("polygon", { points: "72,490 142,484 142,492 72,498", fill: "#d9cdb0" }, box);
    sv("polygon", { points: "74,470 130,467 134,477 78,481", fill: "#a83a2a", opacity: 0.85 }, box);
    const bt = sv("text", { x: 104, y: 476, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 6.4, "font-weight": 700, fill: "#f6ead0", transform: "rotate(-3 104 476)" }, box); bt.textContent = "GAME NIGHT";
    [[84, 487, "#3f7fd0"], [96, 486, "#e0a032"], [108, 485, "#4a8a5a"]].forEach(([px, py, c]) => sv("circle", { cx: px, cy: py, r: 1.8, fill: c }, box));
    [[72, 450], [84, 454], [92, 449], [124, 450], [136, 456], [146, 452], [160, 480], [172, 486], [184, 482]].forEach(([px, py], i) => sv("circle", { cx: px, cy: py, r: 1.8 + (i % 3) * 0.3, fill: i % 2 ? "#f6ead0" : "#efdca8" }, svg));

    // ── the couch, seen from behind: every cushion is in the fort ──
    sv("rect", { x: 190, y: 436, width: 26, height: 92, rx: 10, fill: "#6a3a4a" }, svg);
    sv("rect", { x: 346, y: 436, width: 28, height: 92, rx: 10, fill: "#6a3a4a" }, svg);
    sv("rect", { x: 200, y: 424, width: 160, height: 90, rx: 14, fill: "#7a4658" }, svg);
    sv("path", { d: "M210 438 Q280 430 350 438", stroke: "#9a6678", "stroke-width": 1.6, fill: "none", opacity: 0.6, "stroke-linecap": "round" }, svg);
    sv("path", { d: "M280 440 V508", stroke: "#4a2634", "stroke-width": 1.2 }, svg);
    sv("path", { d: "M318 424 q-1 12 3 22 q4 4 7 -1 q-1 -10 -2 -21 Z", fill: "#e8e0d0", stroke: "#b8ad92", "stroke-width": 0.6 }, svg);   // a single sock
    sv("path", { d: "M318.4 424 H327", stroke: "#c9482e", "stroke-width": 2, opacity: 0.8 }, svg);

    // ── the hearts: a few at a time, rising out of the peak of the fort ──
    const heartsG = sv("g", { "pointer-events": "none" }, svg);
    const HEART = "M0 2.6 C-7 -2.4 -3.4 -7.6 0 -3.8 C3.4 -7.6 7 -2.4 0 2.6 Z";
    const mkHeart = (x, y, col, sc, delay, dx, dur, loop) => {
      const w = sv("g", { transform: `translate(${x} ${y}) scale(${sc})` }, heartsG);
      const h = sv("path", { d: HEART, fill: col }, w);
      anim(h, `--dx:${dx}px;opacity:${reduce ? 0.85 : 0};animation:bfHeart ${dur}s ease-out ${delay}s ${loop ? "infinite" : "1 both"};`);
      return w;
    };
    const HCOL = ["#ff8fb1", "#ff6f91", "#ffc0d6", "#ff7a9a", "#ffd0e0"];
    [[-12, 0.0, 9], [8, 1.1, -12], [-2, 2.3, 14], [14, 3.4, -8], [-16, 4.5, -14], [4, 5.6, 10]].forEach(([ox, d, dx], i) => mkHeart(100 + ox, reduce ? 150 - i * 11 : 150, HCOL[i % HCOL.length], 1 + (i % 3) * 0.14, d, dx, 6.8, true));
    const puff = n => {                       // a handful of extra hearts, when the fort is tapped
      if (reduce) return;
      for (let i = 0; i < n; i++) {
        const w = mkHeart(100 + (Math.random() - 0.5) * 36, 190 + Math.random() * 30, HCOL[Math.floor(Math.random() * HCOL.length)], 1 + Math.random() * 0.4, i * 0.18, (Math.random() - 0.5) * 36, 2.2, false);
        later(() => w.remove(), 3000);
      }
    };
    // a soft vignette
    const vgn = sv("rect", { x: 0, y: 0, width: W, height: H, fill: "url(#bf-vig)" }, svg); vgn.setAttribute("pointer-events", "none");
    // the way back to the table, as a small arrow on the right
    sv("circle", { cx: 349, cy: 316, r: 11, fill: "#000", opacity: 0.35, "pointer-events": "none" }, svg);
    anim(sv("path", { d: "M345 308 L353 316 L345 324", stroke: "#ffd98a", "stroke-width": 2, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", "pointer-events": "none" }, svg), "animation:hkPulse 2.6s ease-in-out infinite;");

    // ── what you can tap ──
    const hit = (x, y, w, h, label, fn) => hits.push([x, y, w, h, label, fn]);
    const SAY = {
      tent: ["Two shadows on the blanket, sitting very close. One of them is whispering. The other is smiling at nothing in particular.",
        "The shadows lean together. Then they sit up very straight and pretend they didn’t.",
        "From inside: “Shh. Somebody’s out there.” “Nobody’s out there.” “Somebody is definitely out there.”",
        "One shadow offers the other something small. A hand finds a hand. You look at the ceiling, politely."],
      heart: ["A heart drifts up out of the blanket and pops against the ceiling. Nobody inside seems to have noticed.",
        "Another one. They are not being subtle about not being subtle.",
        "The hearts are definitely coming from the fort. You are a professional and will not mention it."],
      tv: ["The TV is on, but nobody is watching it. A tape is stuck on PLAY.",
        "Static. Whatever the movie was, it ended an hour ago.",
        "The remote is missing. It is almost certainly in the fort."],
      couch: ["The couch, from behind. Every cushion has been taken, and none have been returned.",
        "A single sock hangs over the back. It does not belong to anybody present.",
        "There is still a dent in the frame where somebody sat through the whole movie."],
      trail: ["A trail of popcorn runs from the couch to the fort. Whoever carried the bowl gave up halfway.",
        "Popcorn, popcorn, a pillow, more popcorn. It is a very clear trail."],
      drawing: ["A crayon drawing pinned to the wall: two stick figures holding hands, one very large heart. Whoever hung it up is not available for comment.",
        "In the corner there is a date, scribbled out. Twice."]
    };
    const wobble = () => { if (reduce) return; try { tent.animate([{ transform: "translate(0,0)" }, { transform: "translate(-1.5px,0)" }, { transform: "translate(1.5px,0)" }, { transform: "translate(0,0)" }], { duration: 380, easing: "ease-out" }); } catch {} };
    const peek = () => {       // tapping the fort fades in to openFortInside() (defined below)
      if (typeof openFortInside === "function" && !leaving) { leaving = true; say("You lift the edge of the blanket…"); bfFade(sh, () => openFortInside(true)); return true; }
      return false;
    };
    const back = () => { if (leaving) return; leaving = true; say("Back to the table."); bfFade(sh, () => openBasement()); };
    hit(4, 150, 230, 278, "The blanket fort", () => { if (peek()) return; say(SAY.tent[nTent++ % SAY.tent.length]); wobble(); puff(3); });
    hit(70, 56, 64, 100, "The hearts", () => { say(SAY.heart[nHeart++ % SAY.heart.length]); puff(2); });
    hit(226, 218, 120, 156, "The TV", () => {
      say(SAY.tv[nTv++ % SAY.tv.length]);
      if (!reduce) try { tvWall.animate([{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], { duration: 420 }); } catch {}
    });
    hit(188, 424, 188, 108, "The couch", () => say(SAY.couch[nCouch++ % SAY.couch.length]));
    hit(66, 440, 126, 52, "The popcorn trail and the game", () => say(SAY.trail[nTrail++ % SAY.trail.length]));
    hit(146, 84, 58, 58, "The crayon drawing", () => say(SAY.drawing[nDraw++ % SAY.drawing.length]));
    hit(334, 292, 26, 50, "Back to the table", back);
    const hitG = sv("g", {}, svg);
    hits.forEach(([x, y, w, h, label, fn]) => { const r = sv("rect", { x, y, width: w, height: h, fill: "transparent" }, hitG); r.style.cursor = "pointer"; r.setAttribute("role", "button"); r.setAttribute("aria-label", label); r.addEventListener("click", fn); });
    field.appendChild(svg);
    sub.textContent = "hawkins · the basement · the fort";
    say("Off to the left of the table: a blanket fort. Every couch cushion is in it. So are two shadows.");
    pill("\u{1F3B2} table", "Back to the table", back);
    if (typeof openFortInside === "function") pill("\u{1F3D5}️ peek inside", "Lift the edge of the blanket", peek);
    pill("\u{1F5FA}️ map", "Back to the map of Hawkins", () => { sh.close(); openHawkins(false); });
    document.body.appendChild(sh.back);
    if (arrive) {
      const v = el("div", `position:absolute;inset:0;background:#000;opacity:1;pointer-events:none;z-index:30;transition:opacity ${reduce ? 0 : 0.6}s;`);
      sh.box.appendChild(v);
      requestAnimationFrame(() => requestAnimationFrame(() => { v.style.opacity = 0; }));
      later(() => v.remove(), 900);
    }
  }


  // The conversations in the fort. Each moment: a start pose, then beats [who, text, patch?]. who: "w" Will, "m" Mike, "n" the caption only.
  // A patch changes the pose from that beat on: { a: Will's, b: Mike's } (mood, eyes, head [dx, dy, tilt], sx, blush, L / R hands), plus
  // hearts: n (a puff of hearts), jig: true (a happy wiggle), front: "a" | "b" (who is in front). Everything is gentle and innocent.
  const FI_CL = [[177, 383], [186, 382]];              // where their two hands meet, on top of the blanket
  const FI_BASE = { a: { sx: 4, head: [2, 1, 5], mood: "smile", look: 1, L: "lap", R: "lap" }, b: { sx: -2, head: [-2, 2, -5], mood: "smile", look: -1, L: "lap", R: "lap" } };
  const FI_HOLD = { a: { R: FI_CL[0] }, b: { L: FI_CL[1] } };
  const FI_MOMENTS = [
    { name: "the lights", beats: [
      ["n", "The fairy lights are twinkling. Mike has stopped mid-sentence. Will has noticed.", { a: { mood: "o", look: 1 }, b: { mood: "calm", look: -1 } }],
      ["w", "What? You’re staring at me.", {}],
      ["m", "The lights are doing something to your face. I’m just… observing the effect.", { b: { mood: "smirk" } }],
      ["w", "You are so bad at lying.", { a: { mood: "grin", blush: true }, jig: true }],
      ["m", "I’m excellent at lying. I’m just not trying right now.", { b: { mood: "grin", blush: true } }],
      ["w", "…Okay. That one was kind of good.", { a: { eyes: "happy", mood: "smile" } }],
      ["m", "I’ve been saving it.", { hearts: 2 }],
      ["n", "Under the blanket, two hands have found each other. Neither of them mentions it.", Object.assign({ hearts: 3 }, FI_HOLD)]] },
    { name: "the blanket", beats: [
      ["m", "Are you cold? You’re cold. Come here.", { b: { mood: "o" } }],
      ["w", "I’m fine, I’m— okay. I’m a little cold.", { a: { mood: "smirk", blush: true } }],
      ["m", "Then why are you sitting over there like we’re in a library?", { b: { mood: "grin" } }],
      ["w", "Because you take up the entire blanket.", { a: { mood: "grin" }, jig: true }],
      ["m", "I’ll share it. I’ll always share it. Even the good popcorn.", { b: { mood: "smile", blush: true } }],
      ["w", "Even the good popcorn? Mike. That’s practically a vow.", { a: { eyes: "happy", mood: "smile" } }],
      ["m", "It’s a vow.", { hearts: 2 }],
      ["n", "Will lets his head rest on Mike’s shoulder. Mike stops breathing for a second, then very carefully doesn’t move.", Object.assign({ front: "a", hearts: 3, a: { sx: 14, lean: 9, head: [2, 3, 7], mood: "calm", eyes: "happy", blush: true, R: FI_CL[0] }, b: { head: [-1, 3, -4], mood: "calm", blush: true, L: FI_CL[1] } })]] },
    { name: "the best part", beats: [
      ["w", "Can I tell you something dumb?", { a: { mood: "calm", look: 0.5, lookY: 1 } }],
      ["m", "Nothing you say is dumb. Rule of the fort.", { b: { mood: "smile" } }],
      ["w", "This is my favourite place. The fort, I mean. Well. Mostly the part where you’re in it.", { a: { blush: true, lookY: 1.5 } }],
      ["m", "…Will.", { b: { mood: "o", blush: true } }],
      ["w", "It’s out now. I can’t take it back.", { a: { mood: "smirk", eyes: "happy" } }],
      ["m", "Good. Don’t you dare. I’m keeping it.", { b: { mood: "grin" }, jig: true }],
      ["m", "It’s my favourite place too. Same reason. Obviously. Same reason.", { b: { mood: "smile", blush: true } }],
      ["w", "“Obviously.”", { a: { mood: "grin", eyes: "happy" }, hearts: 3 }],
      ["n", "Their hands meet on the blanket and stay there.", FI_HOLD]] },
    { name: "sleepy", beats: [
      ["n", "The movie ended an hour ago. Will’s eyes keep closing.", { a: { mood: "calm", look: 0 } }],
      ["w", "I’m awake. I’m just resting my eyes. Very… actively.", { a: { eyes: "closed" } }],
      ["m", "Sure. Very actively.", { b: { mood: "smirk" } }],
      ["w", "Mm. You’re warm.", { a: { sx: 11, lean: 9, head: [2, 3, 7], mood: "smile" }, front: "a", hearts: 1 }],
      ["m", "I’m basically a heater. You’re welcome.", { b: { mood: "smile", blush: true, head: [-1, 3, -4] } }],
      ["w", "Stay like this a bit?", { a: { blush: true } }],
      ["m", "As long as you want. I’ll tell Dustin the fort is closed for renovations.", { b: { mood: "grin" } }],
      ["n", "Will is asleep. Mike does not move for a very long time, and is extremely happy about it.", Object.assign({ hearts: 4, a: { eyes: "closed", mood: "calm" }, b: { mood: "calm", eyes: "happy", L: FI_CL[1] } })]] },
    { name: "the sketch", beats: [
      ["n", "Will has a sketchbook on his knee. Mike keeps leaning over to look. Will keeps tilting it away.", { a: { L: [112, 392, "pad"], mood: "smirk", look: -1 }, b: { mood: "grin", look: 1, head: [-4, 2, -10] } }],
      ["m", "Let me see.", {}],
      ["w", "It’s not finished.", { a: { blush: true } }],
      ["m", "Let me see the unfinished one.", { b: { mood: "smile" } }],
      ["w", "…Fine. Don’t laugh.", { a: { mood: "o" } }],
      ["m", "Will. It’s us. We’re in the fort, and you gave me the better hair.", { b: { mood: "o", blush: true } }],
      ["w", "I didn’t change anything. That’s just how you look when you’re laughing.", { a: { mood: "smile", eyes: "happy" }, hearts: 2 }],
      ["m", "I’m going to frame it. Right next to the heart on the wall.", { b: { mood: "grin" }, jig: true }],
      ["n", "Mike takes Will’s free hand, very gently, as if it were part of the drawing.", Object.assign({ hearts: 3 }, { b: { L: FI_CL[1] }, a: { R: FI_CL[0] } })]] },
    { name: "happily ever after", beats: [
      ["m", "If our characters got a happily-ever-after, what would it look like?", { b: { mood: "smile", look: -1 } }],
      ["w", "A cottage. A garden. A very suspicious dragon who turns out to be friendly.", { a: { mood: "grin", eyes: "happy" } }],
      ["m", "And us?", { b: { mood: "calm", blush: true } }],
      ["w", "…Next door. Obviously.", { a: { blush: true, mood: "smirk" } }],
      ["m", "Next door is too far. Same door.", { b: { mood: "grin" }, jig: true }],
      ["w", "Mike!", { a: { mood: "cheer", blush: true, R: "mouth" } }],
      ["m", "In the game! The characters! They’d share a door. For efficiency.", { b: { mood: "smirk", blush: true } }],
      ["w", "Sure. Efficiency.", { a: { mood: "smile", eyes: "happy", R: FI_CL[0] }, hearts: 3 }],
      ["n", "Neither of them lets go.", FI_HOLD]] }
  ];

  // ── 🏕️ INSIDE THE FORT (stage 2) ──
  // Reached by tapping the fort (or the "peek inside" pill) in openBasementFort: the screen fades to black, then you are in.
  // An A-frame of blankets lit by fairy lights and a flashlight, a patchwork quilt, cushions, popcorn, comics, a walkie-talkie.
  // Will (left) and Mike (right) are the very same figures as at the basement table (see bsKit), sitting close under one blanket.
  // They talk: each "moment" below is a short, sweet, wholly innocent conversation played line by line in speech bubbles, with
  // the stage directions in the caption, and the two of them change expression and lean as it goes.
  //  · it plays by itself; tap either of them (or the 💬 pill) to hear the next line sooner, 🔁 for a different moment
  //  · when a moment ends they stay put; tap them again for the next one
  //  · tap the hands, the walkie-talkie (somebody interrupts), the fairy lights, the flashlight, the popcorn, the comics, the drawing
  // The last moment is remembered under "ao3-fi-moment" (the only thing saved here) so it is never the same one twice running.
  // Hearts, bubbles' pop and the twinkle stand still with "reduce motion" switched on.
  const FI_KEY = "ao3-fi-moment";
  // The radio in the fort plays a YouTube video or playlist. Put a link between the quotes to set the station for good,
  // or leave it empty and use the "📻 station" button in the fort (that link is remembered under "ao3-fi-radio").
  const FI_RADIO_DEFAULT = "";
  const FI_RADIO_KEY = "ao3-fi-radio";
  function openFortInside(arrive) {
    const sh = hkShell("ao3-fort-inside", "\u{1F3D5}️ Inside the fort");
    const { sv, rnd, anim, el } = sh.kit;
    const { sub, field, caption, pill, later } = sh;
    const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const say = t => { caption.textContent = t; };
    const W = 360, H = 540, hits = [];
    let leaving = false, tid = 0, nHand = 0, nWalkie = 0, nLights = 0, nTorch = 0, nCorn = 0, nComic = 0, nDraw = 0;
    sh.box.style.background = "#20141c";
    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMin meet" });
    svg.style.cssText = "width:100%;height:auto;display:block;";
    const defs = sv("defs", {}, svg);
    const radial = (id, stops, o) => { const g = sv("radialGradient", Object.assign({ id }, o || {}), defs); stops.forEach(([off, c, op]) => sv("stop", { offset: off, "stop-color": c, "stop-opacity": op }, g)); };
    radial("fi-glow", [["0%", "#ffd98a", 0.85], ["100%", "#ffd98a", 0]]);
    radial("fi-wall", [["0%", "#c99a5c", 1], ["55%", "#8c6038", 1], ["100%", "#3e2616", 1]], { cx: "50%", cy: "62%", r: "70%" });
    radial("fi-vig", [["35%", "#0a060e", 0], ["100%", "#0a060e", 0.85]], { cx: "50%", cy: "58%", r: "72%" });
    const beam = sv("linearGradient", { id: "fi-beam", x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
    sv("stop", { offset: "0%", "stop-color": "#fff3c8", "stop-opacity": 0.55 }, beam); sv("stop", { offset: "100%", "stop-color": "#fff3c8", "stop-opacity": 0 }, beam);
    const stripe = sv("pattern", { id: "fi-stripe", width: 22, height: 20, patternUnits: "userSpaceOnUse" }, defs);
    [["#e8917a", 0, 6], ["#f6dcb8", 6, 3], ["#d95a6a", 9, 6], ["#f6dcb8", 15, 2], ["#f0a860", 17, 5]].forEach(([c, x, w]) => sv("rect", { x, y: 0, width: w, height: 20, fill: c }, stripe));
    const olive = sv("pattern", { id: "fi-olive", width: 10, height: 10, patternUnits: "userSpaceOnUse" }, defs);
    sv("rect", { width: 10, height: 10, fill: "#8a8260" }, olive); sv("path", { d: "M5 1 L9 5 L5 9 L1 5 Z", fill: "#c9a86a", opacity: 0.5 }, olive); sv("circle", { cx: 5, cy: 5, r: 0.9, fill: "#5a4a38", opacity: 0.8 }, olive);
    const plaid = sv("pattern", { id: "bs-plaid", width: 16, height: 16, patternUnits: "userSpaceOnUse" }, defs);   // Will's striped sweater (bsKit asks for this id)
    sv("rect", { width: 16, height: 16, fill: "#d8c9b0" }, plaid); sv("rect", { y: 0, width: 16, height: 1.1, fill: "#8a2c44" }, plaid); sv("rect", { y: 2.1, width: 16, height: 3, fill: "#2b3862" }, plaid); sv("rect", { y: 5.9, width: 16, height: 1, fill: "#8a2c44" }, plaid);
    const knit = sv("pattern", { id: "bs-knit", width: 30, height: 30, patternUnits: "userSpaceOnUse" }, defs);   // Mike's chunky patterned sweater
    sv("rect", { width: 30, height: 30, fill: "#272d41" }, knit); sv("rect", { x: 2, y: 3, width: 13, height: 10, fill: "#6a2c3a" }, knit); sv("rect", { x: 17, y: 15, width: 11, height: 12, fill: "#6a2c3a" }, knit); sv("rect", { x: 17, y: 2, width: 9, height: 9, fill: "#1c2030" }, knit); sv("rect", { x: 3, y: 18, width: 10, height: 8, fill: "#1c2030" }, knit);
    sv("path", { d: "M0 14.5 H30 M15.5 0 V30", stroke: "#74703f", "stroke-width": 0.7, "stroke-dasharray": "2 1.2", opacity: 0.5 }, knit); sv("path", { d: "M4 6 h3 M20 20 h3 M9 22 h2 M22 5 h2", stroke: "#8a4050", "stroke-width": 0.6, opacity: 0.6 }, knit);
    const quilt = sv("pattern", { id: "fi-quilt", width: 36, height: 36, patternUnits: "userSpaceOnUse" }, defs);
    [["#b9566a", 0, 0], ["#e8c8a0", 18, 0], ["#e8c8a0", 0, 18], ["#5f8a8a", 18, 18]].forEach(([c, x, y]) => { sv("rect", { x, y, width: 18, height: 18, fill: c }, quilt); sv("path", { d: `M${x + 2} ${y + 2} H${x + 16} V${y + 16} H${x + 2} Z`, stroke: "#fff4e0", "stroke-width": 0.6, "stroke-dasharray": "2 2", fill: "none", opacity: 0.6 }, quilt); });
    const soft = sv("filter", { id: "fi-soft", x: "-20%", y: "-20%", width: "140%", height: "140%" }, defs); sv("feGaussianBlur", { stdDeviation: 3 }, soft);
    const BULB = ["#ff7a7a", "#ffd36b", "#7ad6ff", "#9be58f", "#ffa6e8"];

    // ── the A-frame, seen from inside, in one-point perspective: slopes, back wall, floor ──
    sv("rect", { x: 0, y: 0, width: W, height: H, fill: "#20141c" }, svg);
    sv("polygon", { points: "180,-20 180,100 30,320 -120,420 -120,-20", fill: "url(#fi-stripe)" }, svg);        // left slope: the striped blanket
    sv("polygon", { points: "180,-20 180,100 330,320 480,420 480,-20", fill: "url(#fi-olive)" }, svg);           // right slope: the olive one
    sv("polygon", { points: "180,-20 180,100 30,320 -120,420 -120,-20", fill: "#2a1020", opacity: 0.38 }, svg);
    sv("polygon", { points: "180,-20 180,100 330,320 480,420 480,-20", fill: "#1a1008", opacity: 0.42 }, svg);
    [[-40, 40], [20, 120], [60, 200]].forEach(([x, y]) => { sv("path", { d: `M180 ${y - 20} Q${x + 90} ${y + 40} ${x} ${y + 150}`, stroke: "#1a0c14", "stroke-width": 1.4, fill: "none", opacity: 0.35 }, svg); sv("path", { d: `M180 ${y - 20} Q${360 - x - 90} ${y + 40} ${360 - x} ${y + 150}`, stroke: "#14100a", "stroke-width": 1.4, fill: "none", opacity: 0.35 }, svg); });
    sv("polygon", { points: "180,100 330,320 30,320", fill: "url(#fi-wall)" }, svg);                              // the back wall: a cream sheet, lit
    sv("path", { d: "M180 100 L330 320 M180 100 L30 320", stroke: "#b89c76", "stroke-width": 3, fill: "none", opacity: 0.8, "stroke-linejoin": "round" }, svg);   // its hem
    sv("path", { d: "M150 150 Q146 240 150 320 M205 140 Q210 240 206 320 M252 200 Q256 260 254 320", stroke: "#a8683a", "stroke-width": 1, fill: "none", opacity: 0.25 }, svg);
    sv("path", { d: "M180 -20 V100", stroke: "#3a2418", "stroke-width": 7, opacity: 0.9 }, svg); sv("path", { d: "M180 -20 V100", stroke: "#8a5a38", "stroke-width": 3.6 }, svg);   // the ridge pole
    sv("rect", { x: 0, y: 320, width: W, height: 220, fill: "#2a1822" }, svg);                                      // floor
    sv("rect", { x: 0, y: 320, width: W, height: 220, fill: "url(#fi-quilt)", opacity: 0.9 }, svg);
    sv("rect", { x: 0, y: 320, width: W, height: 220, fill: "#1a0c16", opacity: 0.45 }, svg);
    sv("rect", { x: 0, y: 320, width: W, height: 36, fill: "#14080e", opacity: 0.4 }, svg);
    // pinned to the back wall: the crayon heart (M + W), a ticket stub, a paper-heart chain
    const heartD = (x, y, s) => `M${x} ${y + 6 * s} C${x - 14 * s} ${y - 4 * s} ${x - 7 * s} ${y - 14 * s} ${x} ${y - 6 * s} C${x + 7 * s} ${y - 14 * s} ${x + 14 * s} ${y - 4 * s} ${x} ${y + 6 * s} Z`;
    const note = sv("g", { transform: "rotate(-6 90 262)" }, svg);
    sv("polygon", { points: "62,236 118,234 120,288 64,290", fill: "#efe8d6" }, note); sv("circle", { cx: 90, cy: 237, r: 1.8, fill: "#c9482e" }, note);
    sv("path", { d: heartD(91, 262, 2.1), fill: "none", stroke: "#e0405a", "stroke-width": 2, "stroke-linejoin": "round" }, note);
    const mw = sv("text", { x: 91, y: 264, "text-anchor": "middle", "font-family": "Georgia,serif", "font-weight": 700, "font-size": 9, fill: "#4a3a5a" }, note); mw.textContent = "M+W";
    const stub = sv("g", { transform: "rotate(7 268 270)" }, svg);
    sv("rect", { x: 250, y: 256, width: 36, height: 18, rx: 1.5, fill: "#e8b84a" }, stub); sv("path", { d: "M262 256 V274", stroke: "#a8782a", "stroke-width": 0.8, "stroke-dasharray": "1.5 1.5" }, stub);
    const st = sv("text", { x: 256, y: 268, "font-family": "monospace", "font-size": 4.6, "font-weight": 700, fill: "#6a3a1a" }, stub); st.textContent = "ADMIT 2";
    // the quilt's cushions, stacked behind them as a backrest
    sv("rect", { x: 80, y: 300, width: 100, height: 96, rx: 22, fill: "#7a4658" }, svg); sv("rect", { x: 176, y: 292, width: 112, height: 100, rx: 22, fill: "#6a3a4a" }, svg);
    sv("path", { d: "M142 308 Q146 350 140 392 M224 300 Q228 345 222 388", stroke: "#4a2634", "stroke-width": 1.2, fill: "none" }, svg);
    // the figures: bodies behind the blanket, arms in front
    const FIG = { a: { cx: 136, sy: 322, s: 1.5, u: 21, f: 20, sl: [-21, 5], sr: [21, 5] }, b: { cx: 226, sy: 316, s: 1.5, u: 23, f: 22, sl: [-24, 5], sr: [24, 5] } };
    const bodyL = sv("g", {}, svg);
    const throwG = sv("g", {}, svg);
    // the shared throw over their laps, with a wavy top edge and a few folds
    sv("path", { d: "M70 386 Q110 372 150 380 T230 378 T300 388 L318 470 Q180 500 42 470 Z", fill: "#d29a4a" }, throwG);
    sv("path", { d: "M70 386 Q110 372 150 380 T230 378 T300 388", stroke: "#f0c47a", "stroke-width": 2.4, fill: "none", "stroke-linecap": "round" }, throwG);
    [90, 130, 170, 210, 250].forEach((x, i) => sv("path", { d: `M${x} ${392 + (i % 2) * 3} Q${x + 6} 430 ${x - 4} ${472}`, stroke: "#9a6a2a", "stroke-width": 1.3, fill: "none", opacity: 0.5 }, throwG));
    sv("path", { d: "M54 440 H306 M50 454 H310", stroke: "#f0c47a", "stroke-width": 1, "stroke-dasharray": "5 4", opacity: 0.45 }, throwG);
    const armL = sv("g", {}, svg);
    const clear = n => { while (n.firstChild) n.removeChild(n.firstChild); };
    const { drawArm, torsoA, torsoB, headA, headB } = bsKit(sv, anim, FIG);
    ["a", "b"].forEach(key => {
      const F = FIG[key], br = key === "a" ? 4.2 : 4.8;
      F.g1 = sv("g", {}, bodyL); F.g2 = sv("g", {}, armL); F.r1 = sv("g", {}, F.g1); F.r2 = sv("g", {}, F.g2);
      F.b1 = anim(sv("g", {}, F.r1), `animation:hkBreathe ${br}s ease-in-out infinite;`); F.b2 = anim(sv("g", {}, F.r2), `animation:hkBreathe ${br}s ease-in-out infinite;`);
    });
    const prop = (g, kind, x, y) => {
      if (kind === "pad") { const P = sv("g", { transform: `translate(${x} ${y}) rotate(-10)` }, g); sv("rect", { x: -13, y: -20, width: 26, height: 20, rx: 1.4, fill: "#efe8d6", stroke: "#b8ad92", "stroke-width": 0.7 }, P); sv("path", { d: "M-8 -14 Q-3 -17 0 -12 T8 -13 M-8 -7 H6", stroke: "#6a6a7a", "stroke-width": 0.8, fill: "none" }, P); sv("circle", { cx: 0, cy: 0, r: 4.4, fill: "#e7c0a1", stroke: "#b98f72", "stroke-width": 0.6 }, P); }
      else if (kind === "pencil") { sv("path", { d: `M${x - 6} ${y + 6} L${x + 4} ${y - 7}`, stroke: "#e0b032", "stroke-width": 2.2, "stroke-linecap": "round" }, g); sv("circle", { cx: x + 4.4, cy: y - 7.4, r: 1.3, fill: "#e8a0a0" }, g); }
      else if (kind === "walkie") { sv("rect", { x: x - 3.6, y: y - 12, width: 7.2, height: 15, rx: 1.4, fill: "#2a2a36", stroke: "#4a4a5a", "stroke-width": 0.6 }, g); sv("path", { d: `M${x - 1.4} ${y - 12} V${y - 21}`, stroke: "#4a4a5a", "stroke-width": 1.2 }, g); }
      else if (kind === "corn") { [[-2, -4], [2, -6], [0, -9]].forEach(([dx, dy]) => sv("circle", { cx: x + dx, cy: y + dy, r: 2.2, fill: "#f6ead0" }, g)); }
    };
    const drawFig = (key, p) => {
      const F = FIG[key], isA = key === "a";
      clear(F.b1); clear(F.b2);
      const tr = `translate(${(F.cx + (p.sx || 0)).toFixed(1)} ${(F.sy + (p.dy || 0)).toFixed(1)}) scale(${F.s})`;
      F.g1.setAttribute("transform", tr); F.g2.setAttribute("transform", tr);
      // leaning: the whole upper body (torso, neck, head) tips about the hips, so the head stays on its neck; the arms' shoulders follow
      const lean = p.lean || 0, la = lean * Math.PI / 180, lc = Math.cos(la), ls = Math.sin(la);
      const tg = sv("g", lean ? { transform: `rotate(${lean} 0 58)` } : {}, F.b1);
      const shoulder = left => { const S = left ? F.sl : F.sr, rx = S[0], ry = S[1] - 58; return [rx * lc - ry * ls, rx * ls + ry * lc + 58]; };
      (isA ? torsoA : torsoB)(tg);
      const cx = F.cx + (p.sx || 0), cy = F.sy + (p.dy || 0), toLocal = t => [(t[0] - cx) / F.s, (t[1] - cy) / F.s];
      const mouth = () => [cx + (p.head[0] + (isA ? 0 : 0)) * F.s, cy + ((isA ? -13.6 : -17.4) + p.head[1] + 3) * F.s];
      const hand = (left, t) => {
        if (t === "lap") { drawArm(F.b1, key, left, [left ? -17 : 17, 50], 0, 0, 0, shoulder(left)); return; }
        if (t === "mouth") t = mouth();
        const Hd = drawArm(F.b2, key, left, toLocal(t), 0, 0, 0, shoulder(left));
        if (t[2]) prop(F.b2, t[2], Hd[0], Hd[1]);
      };
      hand(false, p.R || "lap"); hand(true, p.L || "lap");
      (isA ? headA : headB)(tg, p);
    };
    // ── foreground: popcorn, comics, flashlight with its beam, walkie-talkie; fairy lights and pom-poms along the edges ──
    const beamG = sv("g", {}, svg);
    sv("polygon", { points: "292,452 330,452 250,150 190,150", fill: "url(#fi-beam)", opacity: 0.28 }, beamG);
    const fore = sv("g", {}, svg);
    const bowl = sv("g", {}, fore);       // a striped cinema popcorn bucket, tapered, heaped over the rim
    sv("ellipse", { cx: 62, cy: 508, rx: 20, ry: 4, fill: "#000", opacity: 0.35 }, bowl);
    const BT = [40, 84], BB = [46.5, 77.5], BY = [469, 506];
    for (let k = 0; k < 6; k++) {
      const a0 = BT[0] + (BT[1] - BT[0]) * k / 6, a1 = BT[0] + (BT[1] - BT[0]) * (k + 1) / 6, b0 = BB[0] + (BB[1] - BB[0]) * k / 6, b1 = BB[0] + (BB[1] - BB[0]) * (k + 1) / 6;
      sv("polygon", { points: `${a0},${BY[0]} ${a1},${BY[0]} ${b1},${BY[1]} ${b0},${BY[1]}`, fill: k % 2 ? "#f3e9d2" : "#c9482e" }, bowl);
    }
    sv("polygon", { points: `62,${BY[0]} ${BT[1]},${BY[0]} ${BB[1]},${BY[1]} 62,${BY[1]}`, fill: "#1a0c16", opacity: 0.25 }, bowl);
    sv("path", { d: `M${BB[0]} ${BY[1]} Q62 ${BY[1] + 5} ${BB[1]} ${BY[1]}`, fill: "#a8382a" }, bowl);
    sv("path", { d: `M${BT[0]} ${BY[0]} L${BB[0]} ${BY[1]} M${BT[1]} ${BY[0]} L${BB[1]} ${BY[1]}`, stroke: "#6a2418", "stroke-width": 0.9, fill: "none" }, bowl);
    sv("ellipse", { cx: 62, cy: BY[0], rx: 22.6, ry: 5.2, fill: "#f6ead0", stroke: "#8a8070", "stroke-width": 0.8 }, bowl);
    for (let i = 0; i < 16; i++) { const a = rnd("pc" + i), b = rnd("pd" + i), cx = 44 + a * 36, cy = 462 + b * 7 - Math.abs(a - 0.5) * 8; sv("circle", { cx: cx.toFixed(1), cy: cy.toFixed(1), r: (3 + rnd("pe" + i) * 1.3).toFixed(1), fill: i % 2 ? "#f6ead0" : "#efdca8" }, bowl); }
    for (let i = 0; i < 6; i++) sv("circle", { cx: (50 + rnd("pq" + i) * 24).toFixed(1), cy: (459 + rnd("pr" + i) * 5).toFixed(1), r: 1.2, fill: "#d9a85c", opacity: 0.7 }, bowl);
    [[116, 508], [128, 512], [102, 514]].forEach(([x, y]) => sv("circle", { cx: x, cy: y, r: 2.2, fill: "#f6ead0" }, fore));
    // the radio: a little red boombox with a handle, an aerial, a speaker, a dial and a light that comes on when it plays
    const rad = sv("g", {}, fore);
    sv("ellipse", { cx: 143, cy: 508, rx: 34, ry: 4, fill: "#000", opacity: 0.35 }, rad);
    sv("path", { d: "M122 476 V467 Q143 458 164 467 V476", stroke: "#2a2a36", "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, rad);
    sv("path", { d: "M167 476 L182 446", stroke: "#cfd4de", "stroke-width": 1.3, "stroke-linecap": "round" }, rad); sv("circle", { cx: 182.4, cy: 445.4, r: 1.9, fill: "#cfd4de" }, rad);
    sv("rect", { x: 112, y: 475, width: 62, height: 32, rx: 5, fill: "#c9482e", stroke: "#6a2418", "stroke-width": 1 }, rad);
    sv("rect", { x: 114, y: 477, width: 58, height: 5, rx: 2.5, fill: "#fff", opacity: 0.16 }, rad);
    const spk = sv("g", {}, rad);
    sv("circle", { cx: 128, cy: 491.5, r: 10.5, fill: "#2a2a36", stroke: "#14141c", "stroke-width": 0.8 }, spk);
    [7.4, 4.4].forEach(r => sv("circle", { cx: 128, cy: 491.5, r, fill: "none", stroke: "#4a4a5a", "stroke-width": 0.9 }, spk)); sv("circle", { cx: 128, cy: 491.5, r: 1.8, fill: "#4a4a5a" }, spk);
    sv("rect", { x: 144, y: 480, width: 24, height: 10, rx: 2, fill: "#efe3c6", stroke: "#6a2418", "stroke-width": 0.6 }, rad);
    sv("path", { d: "M147 487 V489 M150 487.6 V489 M153 487 V489 M156 487.6 V489 M159 487 V489 M162 487.6 V489 M165 487 V489", stroke: "#6a5a40", "stroke-width": 0.6 }, rad);
    sv("path", { d: "M156 481 V489", stroke: "#c9482e", "stroke-width": 1 }, rad);
    [[150, 499], [162, 499]].forEach(([x, y]) => { sv("circle", { cx: x, cy: y, r: 2.8, fill: "#2a2a36" }, rad); sv("path", { d: `M${x} ${y - 2.4} V${y}`, stroke: "#9a9aaa", "stroke-width": 0.7 }, rad); });
    const led = sv("circle", { cx: 169, cy: 479, r: 1.5, fill: "#5a2a2a" }, rad);
    const comics = sv("g", {}, fore);
    [["#3f7fd0", 262, 496, -4], ["#c9482e", 268, 488, 3], ["#e0a032", 264, 481, -2]].forEach(([c, x, y, r]) => { const b = sv("g", { transform: `rotate(${r} ${x + 26} ${y})` }, comics); sv("rect", { x, y, width: 54, height: 9, rx: 1, fill: c }, b); sv("rect", { x: x + 2, y: y + 1.5, width: 50, height: 6, fill: "#f6ead0", opacity: 0.85 }, b); sv("path", { d: `M${x + 6} ${y + 4.5} h20 M${x + 30} ${y + 4.5} h10`, stroke: c, "stroke-width": 1.2 }, b); });
    const torch = sv("g", { transform: "rotate(-24 300 452)" }, fore);
    sv("rect", { x: 292, y: 446, width: 34, height: 12, rx: 3, fill: "#3a4a66" }, torch); sv("rect", { x: 322, y: 443, width: 10, height: 18, rx: 2, fill: "#cfd4de" }, torch); sv("rect", { x: 331, y: 445, width: 2, height: 14, fill: "#fff3c8" }, torch);
    const walk = sv("g", {}, fore);
    sv("rect", { x: 306, y: 476, width: 16, height: 26, rx: 2.4, fill: "#2a2a36", stroke: "#4a4a5a", "stroke-width": 0.8 }, walk); sv("path", { d: "M311 476 V460", stroke: "#4a4a5a", "stroke-width": 1.6 }, walk); sv("rect", { x: 309, y: 482, width: 10, height: 7, fill: "#7a8a6a" }, walk);
    anim(sv("circle", { cx: 311, cy: 459, r: 1.6, fill: "#ff7a7a" }, walk), "animation:hkTwinkle 2.4s ease-in-out infinite;");
    const lights = (a, c, b, n, tag) => {
      sv("path", { d: `M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`, stroke: "#1a1218", "stroke-width": 0.9, fill: "none", opacity: 0.85 }, svg);
      for (let i = 0; i <= n; i++) { const t = i / n, bx = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], by = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1], col = BULB[(i + tag) % BULB.length];
        sv("circle", { cx: bx.toFixed(1), cy: by.toFixed(1), r: 7, fill: col, opacity: 0.22 }, svg);
        anim(sv("circle", { cx: bx.toFixed(1), cy: by.toFixed(1), r: 2.1, fill: col }, svg), `animation:hkTwinkle ${(1.5 + rnd("fl" + tag + i) * 1.8).toFixed(1)}s ease-in-out -${(rnd("fm" + tag + i) * 3).toFixed(1)}s infinite;`); }
    };
    lights([-10, 52], [90, 110], [176, 106], 9, 0); lights([190, 106], [270, 110], [370, 52], 9, 2);
    const pom = (a, c, b, n) => { for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]; sv("circle", { cx: x.toFixed(1), cy: (y + 3).toFixed(1), r: 4, fill: ["#5fb0b0", "#1f1a24", "#7fd0d0"][i % 3] }, svg); } };
    pom([180, 100], [105, 210], [30, 320], 12); pom([180, 100], [255, 210], [330, 320], 12);
    // hearts rising from between them
    const heartsG = sv("g", { "pointer-events": "none" }, svg);
    const HEART = "M0 2.6 C-7 -2.4 -3.4 -7.6 0 -3.8 C3.4 -7.6 7 -2.4 0 2.6 Z", HCOL = ["#ff8fb1", "#ff6f91", "#ffc0d6", "#ff7a9a", "#ffd0e0"];
    const puff = n => { if (reduce) return; for (let i = 0; i < n; i++) later(() => { const w = sv("g", { transform: `translate(${(176 + (Math.random() - 0.5) * 50).toFixed(1)} ${(250 + Math.random() * 20).toFixed(1)}) scale(${(1.2 + Math.random() * 0.7).toFixed(2)})` }, heartsG); anim(sv("path", { d: HEART, fill: HCOL[Math.floor(Math.random() * HCOL.length)] }, w), `--dx:${((Math.random() - 0.5) * 40).toFixed(0)}px;opacity:0;animation:bfHeart 2.6s ease-out 1 both;`); later(() => w.remove(), 2800); }, i * 160); };
    if (!document.getElementById("ao3-bf-css")) { const s = document.createElement("style"); s.id = "ao3-bf-css"; s.textContent = "@keyframes bfHeart{0%{opacity:0;transform:translate(0,0) scale(.4)}15%{opacity:.95}70%{opacity:.8}100%{opacity:0;transform:translate(var(--dx,0px),-92px) scale(1.15)}}@keyframes bfPop{0%{opacity:0;transform:translate(-50%,-100%) scale(.85)}100%{opacity:1;transform:translate(-50%,-100%) scale(1)}}"; (document.head || document.documentElement).appendChild(s); }
    const vgn = sv("rect", { x: 0, y: 0, width: W, height: H, fill: "url(#fi-vig)" }, svg); vgn.setAttribute("pointer-events", "none");
    const wrap = el("div", "position:relative;");
    const ov = el("div", "position:absolute;inset:0;pointer-events:none;overflow:hidden;");
    wrap.appendChild(svg); wrap.appendChild(ov); field.appendChild(wrap);
    // ── the speech bubble: one at a time, above whoever is speaking ──
    const HEADX = { w: 150, m: 222 };
    let bub = null;
    const hideBubble = () => { if (bub) { bub.remove(); bub = null; } };
    const speak = (who, text) => {
      hideBubble();
      const anchor = who === "w" ? 33 : 67, headPct = HEADX[who] / W * 100, cw = wrap.clientWidth || 360;
      bub = el("div", `position:absolute;left:${anchor}%;top:${(232 / H * 100).toFixed(2)}%;transform:translate(-50%,-100%);max-width:56%;box-sizing:border-box;background:#fff6e0;color:#3a2630;border-radius:14px;padding:7px 12px;font:italic 13px/1.35 Georgia,'Times New Roman',serif;text-align:center;box-shadow:0 3px 12px rgba(0,0,0,0.45);${reduce ? "" : "animation:bfPop .22s ease-out both;"}`, text);
      const tail = el("div", `position:absolute;bottom:-5px;left:calc(50% + ${((headPct - anchor) * cw / 100).toFixed(0)}px);width:10px;height:10px;margin-left:-5px;background:#fff6e0;transform:rotate(45deg);`);
      bub.appendChild(tail); ov.appendChild(bub);
    };
    // ── the director ──
    const P = { a: null, b: null };
    const setPose = patch => {
      ["a", "b"].forEach(k => { if (patch[k]) P[k] = Object.assign({}, P[k], patch[k]); });
      if (patch.front) { const k = patch.front; bodyL.appendChild(FIG[k].g1); armL.appendChild(FIG[k].g2); }
      ["a", "b"].forEach(k => { if (patch[k]) drawFig(k, P[k]); });
      if (patch.jig && !reduce) ["a", "b"].forEach(k => [FIG[k].r1, FIG[k].r2].forEach(n => { try { n.animate([{ transform: "translateY(0)" }, { transform: "translateY(-4px)" }, { transform: "translateY(0)" }, { transform: "translateY(-2px)" }, { transform: "translateY(0)" }], { duration: 520, easing: "ease-out" }); } catch {} }));
      if (patch.hearts) puff(patch.hearts);
    };
    const start = patch => { P.a = Object.assign({}, FI_BASE.a); P.b = Object.assign({}, FI_BASE.b); bodyL.appendChild(FIG.b.g1); armL.appendChild(FIG.b.g2); drawFig("a", P.a); drawFig("b", P.b); if (patch) setPose(patch); };
    let mi = 0, bi = 0, playing = false;
    const readTime = t => 2600 + t.length * 48;
    const step = () => {
      clearTimeout(tid);
      const M = FI_MOMENTS[mi];
      if (bi >= M.beats.length) { playing = false; hideBubble(); say("The moment settles. Tap either of them for another."); return; }
      const [who, text, patch] = M.beats[bi++];
      setPose(patch || {});
      if (who === "n") { hideBubble(); say(text); } else speak(who, text);
      tid = setTimeout(step, readTime(text));
    };
    const play = i => { clearTimeout(tid); mi = i; bi = 0; playing = true; hideBubble(); start(); try { localStorage.setItem(FI_KEY, String(mi)); } catch {} say("Inside: fairy lights, popcorn, and two people sitting very close."); tid = setTimeout(step, reduce ? 300 : 1100); };
    const another = () => { let n = Math.floor(Math.random() * (FI_MOMENTS.length - 1)); n = n >= mi ? n + 1 : n; play(n); };
    const next = () => { if (playing) step(); else another(); };
    sh.onClose = () => { clearTimeout(tid); hideBubble(); };
    let first = Math.floor(Math.random() * FI_MOMENTS.length);
    try { const last = parseInt(localStorage.getItem(FI_KEY), 10); if (Number.isFinite(last) && last >= 0 && last < FI_MOMENTS.length) first = (last + 1 + Math.floor(Math.random() * (FI_MOMENTS.length - 1))) % FI_MOMENTS.length; } catch {}

    // ── what you can tap ──
    const hit = (x, y, w, h, label, fn) => hits.push([x, y, w, h, label, fn]);
    const SAY = {
      hand: ["Two hands, one blanket. Nobody is looking at them. Everybody is looking at them.", "A thumb moves, very slightly, back and forth. It is a small, serious gesture."],
      lights: ["The fairy lights twinkle faster. Somebody up there is very pleased with themselves.", "Red, gold, blue, green, pink. Mike strung them up; Will rearranged them when he wasn’t looking."],
      torch: ["The flashlight is pointed at the ceiling, painting a long pale stripe across the blankets.", "Somebody’s been reading comics by it. The batteries are almost certainly borrowed."],
      corn: ["The popcorn bucket is mostly kernels now. A single piece sits on its own, saved for somebody.", "Half the popcorn is on the quilt. The other half is also on the quilt."],
      comic: ["Comics, in a leaning stack. One has two names inked inside the cover, very small, and a doodled heart between them.", "The top issue is open at a page nobody has turned in an hour."],
      draw: ["A crayon heart, pinned up very crooked. M + W. Nobody has ever been asked about it."]
    };
    // ── the radio: the YouTube player lives off-screen; the tap is a real user gesture, so it may start playing (needs internet) ──
    let radioUrl = FI_RADIO_DEFAULT; try { radioUrl = localStorage.getItem(FI_RADIO_KEY) || FI_RADIO_DEFAULT; } catch {}
    const ytParse = u => {
      try {
        const x = new URL(String(u).trim()), list = x.searchParams.get("list"); let id = null;
        if (x.hostname.indexOf("youtu.be") >= 0) id = x.pathname.slice(1).split("/")[0];
        else if (x.pathname.indexOf("/watch") === 0) id = x.searchParams.get("v");
        else { const m = x.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{6,})/); if (m) id = m[2]; }
        if (id || list) return { id, list };
      } catch {}
      return null;
    };
    const radioHost = el("div", "position:fixed;left:-400px;top:0;width:200px;height:200px;opacity:0;pointer-events:none;overflow:hidden;");
    document.body.appendChild(radioHost);
    let ytp = null, ytReady = false, radioOn = false, wantPlay = false, notesT = null;
    const setRadio = on => {
      radioOn = on; led.setAttribute("fill", on ? "#7aff9a" : "#5a2a2a");
      clearInterval(notesT); notesT = null;
      if (on && !reduce) {
        spk.style.cssText = "transform-box:fill-box;transform-origin:center;animation:hkBreathe 0.7s ease-in-out infinite;";
        const note = () => { const w = sv("g", { transform: `translate(${(132 + Math.random() * 34).toFixed(1)} 458)` }, heartsG); const t = sv("text", { "font-size": 15, fill: ["#ffd98a", "#ff9fc0", "#9fe0ff"][Math.floor(Math.random() * 3)], "text-anchor": "middle" }, w); t.textContent = Math.random() > 0.5 ? "\u266A" : "\u266B"; anim(t, `--dx:${((Math.random() - 0.5) * 36).toFixed(0)}px;opacity:0;animation:bfHeart 2.6s ease-out 1 both;`); later(() => w.remove(), 2800); };
        note(); notesT = setInterval(note, 1100);
      } else spk.style.cssText = "";
    };
    const radioKill = () => { clearInterval(notesT); try { if (ytp) ytp.destroy(); } catch {} ytp = null; ytReady = false; radioHost.remove(); };
    const loadYT = cb => {
      if (window.YT && window.YT.Player) return cb();
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { try { if (prev) prev(); } catch {} cb(); };
      if (!document.getElementById("ao3-yt-api")) { const sc = document.createElement("script"); sc.id = "ao3-yt-api"; sc.src = "https://www.youtube.com/iframe_api"; sc.onerror = () => say("The radio only gets static. It needs an internet connection to find the station."); document.head.appendChild(sc); }
    };
    const setupPlayer = () => {
      try { if (ytp) ytp.destroy(); } catch {} ytp = null; ytReady = false; setRadio(false);
      const p = ytParse(radioUrl); if (!p) return;
      while (radioHost.firstChild) radioHost.removeChild(radioHost.firstChild);
      const mount = document.createElement("div"); radioHost.appendChild(mount);
      loadYT(() => {
        if (!radioHost.isConnected) return;
        const vars = { playsinline: 1, controls: 0, rel: 0, loop: 1 };
        const cfg = { width: "200", height: "200", playerVars: vars, events: {
          onReady: () => { ytReady = true; if (wantPlay) { wantPlay = false; try { ytp.playVideo(); } catch {} } },
          onStateChange: e => { if (e.data === 1) setRadio(true); else if (e.data === 2 || e.data === 0) setRadio(false); },
          onError: () => { setRadio(false); say("Just static. That video can\u2019t be played in the radio (some can\u2019t be embedded). Try a different link."); }
        } };
        if (p.id) { cfg.videoId = p.id; if (p.list) vars.list = p.list; else vars.playlist = p.id; } else { vars.listType = "playlist"; vars.list = p.list; }
        try { ytp = new window.YT.Player(mount, cfg); } catch { say("The radio only gets static."); }
      });
    };
    const station = () => {
      const v = window.prompt("Paste a YouTube link (a song, a video or a playlist) for the radio:", radioUrl || "");
      if (v === null) return;
      if (!v.trim()) { radioUrl = ""; try { localStorage.removeItem(FI_RADIO_KEY); } catch {} setupPlayer(); say("The dial is back to empty."); return; }
      if (!ytParse(v)) { say("That doesn\u2019t look like a YouTube link. The dial doesn\u2019t move."); return; }
      radioUrl = v.trim(); try { localStorage.setItem(FI_RADIO_KEY, radioUrl); } catch {}
      wantPlay = true; setupPlayer(); say("The dial turns\u2026 tap the radio when the light comes on.");
    };
    const radioTap = () => {
      if (!ytParse(radioUrl)) { station(); return; }
      if (!ytp || !ytReady) { wantPlay = true; say("The radio crackles, finding the station\u2026"); if (!ytp) setupPlayer(); return; }
      if (radioOn) { try { ytp.pauseVideo(); } catch {} setRadio(false); say("Click. The radio goes quiet."); }
      else { try { ytp.playVideo(); } catch {} say("\u266A The radio hums to life. Somebody turns it up a notch."); puff(2); }
    };
    const prevClose = sh.onClose; sh.onClose = () => { if (prevClose) prevClose(); radioKill(); };
    setupPlayer();
    hit(108, 444, 78, 64, "The radio", radioTap);
    hit(96, 250, 100, 140, "Will", next); hit(196, 244, 100, 146, "Mike", next);
    hit(150, 366, 60, 36, "Their hands", () => { say(SAY.hand[nHand++ % SAY.hand.length]); puff(3); });
    hit(296, 466, 40, 50, "The walkie-talkie", () => {
      hkCrackle(); clearTimeout(tid); playing = false; hideBubble(); say("The walkie-talkie hisses. “…Mike? Will? It got very quiet. Dustin to the fort. Over.”");
      setPose({ a: { mood: "o", blush: true, R: "lap" }, b: { mood: "o", blush: true, L: "lap" } });
      tid = setTimeout(() => { speak("m", "Nothing! We’re fine! Over!"); setPose({ jig: true }); tid = setTimeout(() => { speak("w", "That was extremely believable."); setPose({ a: { mood: "grin", eyes: "happy", R: FI_CL[0] }, b: { mood: "grin", L: FI_CL[1] }, hearts: 2 }); tid = setTimeout(() => { hideBubble(); say("They’re laughing too hard to say anything else. Tap them for another moment."); }, 3400); }, 2600); }, 2600);
    });
    hit(20, 60, 320, 70, "The fairy lights", () => { say(SAY.lights[nLights++ % SAY.lights.length]); puff(2); });
    hit(286, 430, 60, 30, "The flashlight", () => say(SAY.torch[nTorch++ % SAY.torch.length]));
    hit(30, 450, 64, 60, "The popcorn", () => say(SAY.corn[nCorn++ % SAY.corn.length]));
    hit(256, 474, 60, 36, "The comics", () => say(SAY.comic[nComic++ % SAY.comic.length]));
    hit(56, 228, 70, 66, "The crayon heart", () => say(SAY.draw[nDraw++ % SAY.draw.length]));
    const hitG = sv("g", {}, svg);
    hits.forEach(([x, y, w, h, label, fn]) => { const r = sv("rect", { x, y, width: w, height: h, fill: "transparent" }, hitG); r.style.cursor = "pointer"; r.setAttribute("role", "button"); r.setAttribute("aria-label", label); r.addEventListener("click", fn); });
    sub.textContent = "hawkins · the basement · inside the fort";
    const out = () => { if (leaving) return; leaving = true; say("You back out on your hands and knees."); bfFade(sh, () => openBasementFort(true)); };
    pill("\u{1F4AC} next", "Hear the next line sooner", next);
    pill("\u{1F501} another", "A different moment", another);
    pill("\u{1F4FB} station", "Change the radio station (paste a YouTube link)", station);
    pill("◀ outside", "Back out of the fort", out);
    pill("\u{1F5FA}️ map", "Back to the map of Hawkins", () => { sh.close(); openHawkins(false); });
    document.body.appendChild(sh.back);
    play(first);
    if (arrive) {
      const v = el("div", `position:absolute;inset:0;background:#000;opacity:1;pointer-events:none;z-index:30;transition:opacity ${reduce ? 0 : 0.6}s;`);
      sh.box.appendChild(v);
      requestAnimationFrame(() => requestAnimationFrame(() => { v.style.opacity = 0; }));
      later(() => v.remove(), 900);
    }
  }


  // ── ⛪ THE CHAPEL (inside) ──
  // Step in through the chapel door in Hollowbrook (or from the keepsakes menu). Three things to look at:
  //  · the big window: one pane of coloured glass per FINISHED fic, added in the order you finished them.
  //    Empty slots are clear glass showing the sky. The sun (or moon) shines through and throws the
  //    colours onto the floor. The window has room to grow: it gets finer-grained as you finish more.
  //  · the candle rack: one lit candle per fic you're STILL READING. The fewer chapters you have left, the shorter the candle.
  //  · the pew: sit down and a short summary of your reading year plays, a few slides.
  // This replaces the old "fic stained glass" page (openStainedGlass now just opens the chapel).
  // Read-only: nothing here saves anything. Time of day is the real clock, with a button to try the others.
  function openChapel() {
    const old = document.getElementById("ao3-chapel");
    if (old) old.remove();
    nvEnsureCss();
    if (!document.getElementById("ao3-ch-css")) {
      const st = document.createElement("style");
      st.id = "ao3-ch-css";
      st.textContent = `
        @keyframes chFlame{0%,100%{transform:scale(1,1)}30%{transform:scale(.88,1.14)}60%{transform:scale(1.07,.92)}}
        @keyframes chGlow{0%,100%{opacity:.7}50%{opacity:1}}
        @keyframes chPane{from{opacity:0}to{opacity:1}}
        @keyframes chDrift{0%,100%{transform:translateX(-4px)}50%{transform:translateX(5px)}}
        @keyframes chMote{0%{opacity:0;transform:translate(0,0)}20%{opacity:.8}100%{opacity:0;transform:translate(9px,-38px)}}
        @keyframes chSlide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes chHint{0%,100%{opacity:.5}50%{opacity:1}}
        @media (prefers-reduced-motion: reduce){.ch-anim{animation:none !important}}
      `;
      (document.head || document.documentElement).appendChild(st);
    }
    const el = (tag, css, text) => {
      const e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (text != null) e.textContent = text;
      return e;
    };
    const NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs, parent) => {
      const e = document.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
      if (parent) parent.appendChild(e);
      return e;
    };
    const anim = (node, css) => { node.setAttribute("class", "ch-anim"); node.style.cssText += css; return node; };
    const rnd = seed => { const x = Math.sin(gyHash(String(seed)) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const titleOf = f => f.title || `Work ${f.workId}`;
    const plural = (n, one, many) => n === 1 ? one : (many || one + "s");

    // ── the data ──
    let log = [];
    try { const l = JSON.parse(localStorage.getItem(READ_LOG_KEY) || "[]"); if (Array.isArray(l)) log = l.filter(e => e && e.date); } catch {}
    const dayOf = e => String(e.date).slice(0, 10);
    const idOf = e => String(e.key || "").split("::")[0];
    const lastDay = new Map();                                    // workId -> the last day you logged a chapter of it
    log.forEach(e => { const id = idOf(e); if (!id) return; const d = dayOf(e); if (!lastDay.has(id) || d > lastDay.get(id)) lastDay.set(id, d); });
    const fics = getTracked();
    const GLASS = ["#e0a82e", "#c9482e", "#b3304a", "#2f7fa8", "#3aa0a0", "#4aa36b", "#7a5c8f", "#5a7fd1", "#d98a2b", "#2a9d8f"];
    const finishDay = f => lastDay.get(String(f.workId)) || (f.lastUpdate && String(f.lastUpdate).slice(0, 10)) || (f.trackedAt && String(f.trackedAt).slice(0, 10)) || "";
    const done = fics.filter(f => f.finished).map(f => ({
      f, title: titleOf(f), day: finishDay(f), words: Number(f.words) || 0,
      color: GLASS[gyHash(String(f.workId || titleOf(f))) % GLASS.length]
    })).sort((a, b) => a.day < b.day ? -1 : a.day > b.day ? 1 : 0);
    const wips = fics.filter(isWip).sort((a, b) => (lastDay.get(String(b.workId)) || "") < (lastDay.get(String(a.workId)) || "") ? -1 : 1);

    // ── the window: a pointed arch, split into a grid of panes ──
    const WX0 = 88, WW = 184, WCX = 180, SPR = 130, WR = 92, WB = 300, WT = 38;
    const inside = (x, y) => y >= SPR ? (x >= WX0 && x <= WX0 + WW && y <= WB) : ((x - WCX) * (x - WCX) + (y - SPR) * (y - SPR) <= (WR - 2) * (WR - 2));
    let grid = null;
    for (const cols of [4, 6, 8, 10]) {                          // finer grid as the number of finished fics grows
      const cw = WW / cols, rows = Math.ceil((WB - WT) / cw), cells = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const cx = WX0 + (c + 0.5) * cw, cy = WB - (r + 0.5) * cw;
        if (inside(cx, cy)) cells.push({ c, r, cx, cy });
      }
      grid = { cols, cw, cells };
      if (cells.length >= Math.max(12, Math.ceil(done.length * 1.25))) break;
    }
    const mid = (grid.cols - 1) / 2;
    grid.cells.sort((a, b) => a.r - b.r || Math.abs(a.c - mid) - Math.abs(b.c - mid) || a.c - b.c);   // fills from the bottom up, centre first
    grid.cells.forEach((cell, i) => { cell.fic = done[i] || null; });
    const shown = Math.min(done.length, grid.cells.length);

    // ── the shell (same look as Hollowbrook) ──
    const back = el("div", "position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000002;");
    back.id = "ao3-chapel";
    const box = el("div", "position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:8px;right:8px;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.6);background:#16101f;color:#e6dcf5;font-family:inherit;");
    back.appendChild(box);
    const topbar = el("div", "flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(190,170,255,0.18);background:rgba(8,6,22,0.55);z-index:3;");
    const ttl = el("div", "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;");
    ttl.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:15px;letter-spacing:0.05em;line-height:1.2;text-transform:uppercase;color:#d9d0f5;", "⛪ The Chapel"));
    const sub = el("div", "font-size:10px;letter-spacing:0.04em;color:rgba(217,208,245,0.6);", "");
    ttl.appendChild(sub);
    const xBtn = el("button", "background:none;border:none;color:rgba(217,208,245,0.7);cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px;", "✕");
    xBtn.type = "button"; xBtn.setAttribute("aria-label", "Close");
    topbar.appendChild(ttl); topbar.appendChild(xBtn);
    box.appendChild(topbar);
    const tools = el("div", "flex:0 0 auto;display:flex;gap:6px;padding:7px 14px;overflow-x:auto;-webkit-overflow-scrolling:touch;border-bottom:1px solid rgba(190,170,255,0.12);background:rgba(8,6,22,0.4);z-index:3;");
    const pill = (label, title, fn) => {
      const b = el("button", "flex:0 0 auto;border:1px solid rgba(190,170,255,0.3);background:rgba(255,255,255,0.06);color:#e6dcf5;border-radius:999px;padding:5px 11px;font:500 12px/1 inherit;font-family:inherit;cursor:pointer;white-space:nowrap;", label);
      b.type = "button"; b.title = title; b.onclick = fn; tools.appendChild(b); return b;
    };
    box.appendChild(tools);
    const field = el("div", "position:relative;flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;");
    box.appendChild(field);
    const caption = el("div", "flex:0 0 auto;min-height:44px;padding:9px 14px;text-align:center;border-top:1px solid rgba(190,170,255,0.15);font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:12.5px;color:rgba(230,220,245,0.88);background:rgba(8,6,22,0.55);display:flex;align-items:center;justify-content:center;");
    box.appendChild(caption);

    let overlay = null, timer = null;
    const onKey = e => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation(); e.preventDefault();
      if (overlay) standUp(); else close();
    };
    const close = () => { clearInterval(timer); back.remove(); document.removeEventListener("keydown", onKey, true); };
    xBtn.onclick = close;
    back.addEventListener("click", e => { if (e.target === back) close(); });
    document.addEventListener("keydown", onKey, true);

    // ── the picture ──
    const W = 360, H = 720;
    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMin meet" });
    svg.style.cssText = "width:100%;height:auto;display:block;";
    const defs = sv("defs", {}, svg);
    const grad = (id, x2, y2, stops) => {
      const g = sv("linearGradient", { id, x1: 0, y1: 0, x2, y2 }, defs);
      stops.forEach(([o, c, op]) => sv("stop", { offset: o, "stop-color": c, "stop-opacity": op == null ? 1 : op }, g));
      return g;
    };
    const glow = sv("radialGradient", { id: "ch-glow" }, defs);
    sv("stop", { offset: "0%", "stop-color": "#ffd98a", "stop-opacity": "0.8" }, glow);
    sv("stop", { offset: "100%", "stop-color": "#ffd98a", "stop-opacity": "0" }, glow);
    const sky = grad("ch-sky", 0, 1, [[0, "#000"], [1, "#000"]]);
    grad("ch-floor", 0, 1, [[0, "#3b2f48"], [1, "#241b30"]]);
    grad("ch-wall", 0, 1, [[0, "#2b2140"], [1, "#43365a"]]);
    const rayG = grad("ch-ray", 0, 1, [[0, "#fff", 0.5], [1, "#fff", 0]]);
    const ARCH = `M${WX0} ${WB} V${SPR} A${WR} ${WR} 0 0 1 ${WX0 + WW} ${SPR} V${WB} Z`;
    sv("clipPath", { id: "ch-win" }, defs).appendChild(sv("path", { d: ARCH }));

    // back wall: stone blocks, pillars and roof timbers
    sv("rect", { x: 0, y: 0, width: W, height: 332, fill: "url(#ch-wall)" }, svg);
    for (let y = 40, row = 0; y < 330; y += 22, row++) {
      sv("path", { d: `M0 ${y} H${W}`, stroke: "#1d1630", "stroke-width": 1, opacity: 0.55 }, svg);
      for (let x = (row % 2) * 28; x < W; x += 56) sv("path", { d: `M${x} ${y} v22`, stroke: "#1d1630", "stroke-width": 1, opacity: 0.4 }, svg);
    }
    sv("rect", { x: 0, y: 0, width: W, height: 34, fill: "#1c1428" }, svg);
    [0, 90, 180, 270, 360].forEach(x => sv("path", { d: `M${x} 0 V34`, stroke: "#3a2b2f", "stroke-width": 7, opacity: 0.9 }, svg));
    sv("path", { d: "M0 34 H360", stroke: "#4a382f", "stroke-width": 5 }, svg);
    [[0, 26], [334, 26]].forEach(([x, w]) => {
      sv("rect", { x, y: 34, width: w, height: 298, fill: "#3b2f52" }, svg);
      sv("rect", { x: x + (x ? 0 : w - 4), y: 34, width: 4, height: 298, fill: "#54456f", opacity: 0.6 }, svg);
    });

    // the window: sky behind, then a grid of panes
    sv("path", { d: `M${WX0 - 8} ${WB + 4} V${SPR} A${WR + 8} ${WR + 8} 0 0 1 ${WX0 + WW + 8} ${SPR} V${WB + 4} Z`, fill: "#54456f" }, svg);
    const winG = sv("g", { "clip-path": "url(#ch-win)" }, svg);
    sv("rect", { x: WX0, y: WT - 4, width: WW, height: WB - WT + 8, fill: "url(#ch-sky)" }, winG);
    const starG = sv("g", {}, winG);
    for (let i = 0; i < 26; i++) sv("circle", { cx: (WX0 + rnd("cs" + i) * WW).toFixed(1), cy: (WT + rnd("ct" + i) * 190).toFixed(1), r: (0.5 + rnd("cr" + i) * 0.9).toFixed(2), fill: "#fff", opacity: (0.4 + rnd("co" + i) * 0.55).toFixed(2) }, starG);
    const orbG = sv("g", {}, winG);
    const orbGlow = sv("circle", { cx: 0, cy: 0, r: 40, fill: "url(#ch-glow)", opacity: 0.6 }, orbG);
    const orb = sv("circle", { cx: 0, cy: 0, r: 12, fill: "#fff" }, orbG);
    let picked = null;
    const paneEls = [];
    grid.cells.forEach((cell, i) => {
      const x = WX0 + cell.c * grid.cw, y = WB - (cell.r + 1) * grid.cw;
      const g = sv("g", {}, winG);
      if (cell.fic) {
        const p = sv("rect", { x: x.toFixed(1), y: y.toFixed(1), width: grid.cw.toFixed(1), height: grid.cw.toFixed(1), fill: cell.fic.color, opacity: 0.9 }, g);
        sv("rect", { x: x.toFixed(1), y: y.toFixed(1), width: grid.cw.toFixed(1), height: grid.cw.toFixed(1), fill: "#fff", opacity: 0.1 + rnd("pw" + i) * 0.14 }, g);
        sv("path", { d: `M${x} ${y + grid.cw} L${x + grid.cw} ${y} M${x} ${y} L${x + grid.cw} ${y + grid.cw}`, stroke: "#1a1228", "stroke-width": 0.6, opacity: 0.35 }, g);
        anim(g, `animation:chPane .7s ease-out ${Math.min(i * 0.07, 1.8).toFixed(2)}s both;`);
        cell.el = p;
      } else {
        sv("rect", { x: x.toFixed(1), y: y.toFixed(1), width: grid.cw.toFixed(1), height: grid.cw.toFixed(1), fill: "#fff", opacity: 0.06 }, g);
      }
      sv("rect", { x: x.toFixed(1), y: y.toFixed(1), width: grid.cw.toFixed(1), height: grid.cw.toFixed(1), fill: "none", stroke: "#1a1228", "stroke-width": 1.5 }, g);
      const hit = sv("rect", { x: x.toFixed(1), y: y.toFixed(1), width: grid.cw.toFixed(1), height: grid.cw.toFixed(1), fill: "transparent" }, g);
      hit.style.cursor = "pointer";
      hit.addEventListener("click", () => {
        if (picked) picked.setAttribute("stroke", "none");
        if (cell.fic) {
          if (picked === cell.sel) { picked = null; caption.textContent = summary(); return; }
          cell.sel = cell.sel || sv("rect", { x: x + 1, y: y + 1, width: grid.cw - 2, height: grid.cw - 2, fill: "none", "stroke-width": 2.4, "pointer-events": "none" }, g);
          cell.sel.setAttribute("stroke", "#fff"); picked = cell.sel;
          const d = cell.fic.day ? new Date(cell.fic.day + "T00:00:00") : null;
          const when = d && !isNaN(d) ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null;
          caption.textContent = `${cell.fic.title}${when ? " · finished " + when : ""}${cell.fic.words ? " · " + cell.fic.words.toLocaleString() + " words" : ""}`;
        } else {
          picked = null;
          const left = grid.cells.length - done.length;
          caption.textContent = left > 0 ? `A clear pane, waiting for the next fic you finish. ${left} ${plural(left, "slot")} left in this window.` : "A clear pane.";
        }
      });
    });
    sv("path", { d: ARCH, fill: "none", stroke: "#1a1228", "stroke-width": 3 }, svg);

    // altar under the window
    sv("rect", { x: 112, y: 300, width: 136, height: 8, fill: "#6c5a82" }, svg);
    sv("rect", { x: 118, y: 308, width: 124, height: 24, fill: "#e9dcc4" }, svg);
    sv("rect", { x: 118, y: 308, width: 124, height: 5, fill: "#cdbd9f" }, svg);
    sv("path", { d: "M150 308 V332 M210 308 V332", stroke: "#b9a888", "stroke-width": 0.8 }, svg);
    sv("path", { d: "M170 300 q10 -6 20 0 z", fill: "#f4ead6" }, svg);                           // an open book
    sv("path", { d: "M180 294 V300", stroke: "#a99572", "stroke-width": 0.8 }, svg);
    const glows = [];
    [128, 232].forEach(cx => {
      sv("rect", { x: cx - 3, y: 286, width: 6, height: 14, fill: "#f1e6c8" }, svg);
      anim(sv("ellipse", { cx, cy: 282, rx: 2.2, ry: 3.6, fill: "#ffcf6a" }, svg), "animation:chFlame 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%;");
      glows.push([cx, 283, 18]);
    });

    // floor with the aisle runner
    sv("rect", { x: 0, y: 332, width: W, height: H - 332, fill: "url(#ch-floor)" }, svg);
    for (let i = 0; i < 12; i++) {
      const y = 332 + Math.pow(i / 11, 1.7) * 380;
      sv("path", { d: `M0 ${y.toFixed(1)} H${W}`, stroke: "#1e1628", "stroke-width": 1, opacity: 0.55 }, svg);
    }
    for (let x = -360; x <= 720; x += 60) sv("path", { d: `M${x} ${H} L${180 + (x - 180) * 0.12} 332`, stroke: "#1e1628", "stroke-width": 1, opacity: 0.4 }, svg);
    sv("polygon", { points: "158,332 202,332 252,720 108,720", fill: "#6e2a39" }, svg);
    sv("path", { d: "M158 332 L108 720 M202 332 L252 720", stroke: "#c9a24a", "stroke-width": 2, opacity: 0.7 }, svg);
    sv("rect", { x: 0, y: 326, width: W, height: 8, fill: "#2a2038" }, svg);                         // skirting at the foot of the wall

    // the light: soft shafts and the coloured patches on the floor (rebuilt whenever the time of day changes)
    const lightG = sv("g", { "pointer-events": "none", style: "mix-blend-mode:screen" }, svg);

    // pews: rows down each side of the aisle, the nearest one on the right is yours
    const pew = (x, y, w, s, mine) => {
      const g = sv("g", {}, svg);
      sv("ellipse", { cx: x + w / 2, cy: y + 2 * s, rx: w / 2 + 6 * s, ry: 4 * s, fill: "#000", opacity: 0.35 }, g);
      sv("rect", { x: x - 3 * s, y: y - 40 * s, width: 7 * s, height: 40 * s, rx: 2.5 * s, fill: "#45301f" }, g);
      sv("rect", { x: x + w - 4 * s, y: y - 40 * s, width: 7 * s, height: 40 * s, rx: 2.5 * s, fill: "#45301f" }, g);
      sv("rect", { x, y: y - 34 * s, width: w, height: 32 * s, fill: "#5a3e32" }, g);
      for (let k = 1; k < 3; k++) sv("rect", { x, y: y - 34 * s + k * 10.5 * s, width: w, height: 1.3 * s, fill: "#3e2a22" }, g);
      sv("rect", { x: x - 2 * s, y: y - 38 * s, width: w + 4 * s, height: 5.5 * s, rx: 2.5 * s, fill: "#7a5642" }, g);
      if (mine) {
        sv("rect", { x: x + w / 2 - 8 * s, y: y - 25 * s, width: 16 * s, height: 5 * s, rx: 1 * s, fill: "#c9a24a" }, g);
        sv("rect", { x, y: y - 34 * s, width: w, height: 32 * s, fill: "#ffd98a", opacity: 0.0 }, g);
      }
      return g;
    };
    const runnerL = y => 158 - 50 * (y - 332) / 388, runnerR = y => 202 + 50 * (y - 332) / 388;
    [[408, 0.62], [452, 0.76], [512, 0.94], [592, 1.18]].forEach(([y, s]) => {
      const lw = Math.max(40, runnerL(y) - 10 + 6), rw = Math.max(40, W - (runnerR(y) + 10) + 8);
      if (y === 408) pew(-8 * s, y, lw, s);                                                 // the left side is kept clear for the candle rack
      if (y !== 592) pew(runnerR(y) + 10, y, rw, s);
    });
    const myPew = pew(runnerR(592) + 10, 592, W - (runnerR(592) + 10) + 8, 1.18, true);
    myPew.style.cursor = "pointer";
    const hint = sv("g", {}, svg);
    sv("rect", { x: 264, y: 524, width: 70, height: 20, rx: 10, fill: "#1a1228", opacity: 0.8, stroke: "#c9a24a", "stroke-width": 1 }, hint);
    const ht = sv("text", { x: 299, y: 538, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 10, fill: "#f3e7c8" }, hint);
    ht.textContent = "\u{1FA91} sit down";
    anim(hint, "animation:chHint 2.6s ease-in-out infinite;");
    hint.style.cursor = "pointer";

    // the candle rack: one lit candle per fic you're still reading
    const RX = 62, TRAYS = [{ y: 440, n: 5 }, { y: 488, n: 7 }, { y: 536, n: 9 }];
    sv("rect", { x: RX - 2, y: 424, width: 4, height: 150, fill: "#2a2236" }, svg);
    sv("path", { d: `M${RX - 56} 574 H${RX + 56} M${RX - 44} 574 L${RX - 30} 536 M${RX + 44} 574 L${RX + 30} 536`, stroke: "#2a2236", "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, svg);
    sv("ellipse", { cx: RX, cy: 576, rx: 60, ry: 5, fill: "#000", opacity: 0.35 }, svg);
    const slots = [];
    TRAYS.slice().reverse().forEach(t => {                                                              // bottom tray first
      const tw = t.n * 11 + 6, x0 = RX - tw / 2;
      sv("rect", { x: x0, y: t.y, width: tw, height: 5, rx: 2, fill: "#3a2f48" }, svg);
      sv("rect", { x: x0, y: t.y, width: tw, height: 1.6, rx: 0.8, fill: "#5a4b6f" }, svg);
      sv("path", { d: `M${x0 + 3} ${t.y + 5} q-2 8 0 12 M${x0 + tw - 3} ${t.y + 5} q2 8 0 12`, stroke: "#2a2236", "stroke-width": 1.6, fill: "none" }, svg);
      for (let i = 0; i < t.n; i++) slots.push({ x: x0 + 3 + i * 11 + 5.5, y: t.y });
    });
    const maxC = slots.length, litC = wips.slice(0, maxC);
    litC.forEach((f, i) => {
      const s = slots[i];
      const planned = parseInt(((f.chaptersLabel || "").split("/")[1]) || "", 10);
      const total = Number.isFinite(planned) && planned > 0 ? planned : (f.totalChapters || 1);
      let read = 0; try { read = Number(readChapterFor(f)) || 0; } catch { read = 0; }
      const frac = Number.isFinite(planned) && planned > 0 ? Math.max(0.08, 1 - read / total) : 0.55;
      const h = 8 + frac * 20, top = s.y - h;
      sv("rect", { x: s.x - 3, y: top, width: 6, height: h, fill: ["#f1e6c8", "#ead8b4", "#f4ead2"][i % 3] }, svg);
      sv("rect", { x: s.x - 3, y: top, width: 2, height: h, fill: "#fff", opacity: 0.25 }, svg);
      sv("path", { d: `M${s.x} ${top} v-2.5`, stroke: "#3a2a20", "stroke-width": 0.8 }, svg);
      anim(sv("ellipse", { cx: s.x, cy: top - 5.4, rx: 2.1, ry: 3.4, fill: "#ffcf6a" }, svg), `animation:chFlame ${(1.3 + rnd("fl" + i) * 1.0).toFixed(2)}s ease-in-out ${(rnd("fd" + i) * 1.2).toFixed(2)}s infinite;transform-box:fill-box;transform-origin:50% 100%;`);
      sv("ellipse", { cx: s.x, cy: top - 4.8, rx: 0.9, ry: 1.7, fill: "#fff6d0" }, svg);
      glows.push([s.x, top - 5, 13]);
      const hit = sv("rect", { x: s.x - 5.5, y: top - 11, width: 11, height: h + 12, fill: "transparent" }, svg);
      hit.style.cursor = "pointer";
      hit.addEventListener("click", () => {
        const left = Number.isFinite(planned) && planned > 0 ? Math.max(0, planned - read) : null;
        caption.textContent = `${titleOf(f)} · ${read ? "chapter " + read + (Number.isFinite(planned) && planned > 0 ? " of " + planned : " so far") : "not started"}${left ? " · " + left + " to go" : ""}`;
      });
    });
    const rackSign = sv("text", { x: RX, y: 596, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 7, "letter-spacing": 1.2, fill: "#cbbfe0", opacity: 0.7 }, svg);
    rackSign.textContent = wips.length ? "STILL READING" : "NO CANDLES LIT";
    if (wips.length > maxC) {
      const more = sv("text", { x: RX, y: 606, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 7, fill: "#cbbfe0", opacity: 0.6 }, svg);
      more.textContent = `+${wips.length - maxC} more`;
    }
    if (!wips.length) {
      const bare = sv("rect", { x: RX - 50, y: 430, width: 100, height: 150, fill: "transparent" }, svg);
      bare.style.cursor = "pointer";
      bare.addEventListener("click", () => { caption.textContent = "No candles lit. Track a fic you're reading and one appears here."; });
    }

    // glow, dust in the light, and a time-of-day tint over everything
    const glowG = sv("g", { "pointer-events": "none" }, svg);
    glows.forEach(([gx, gy, gr], i) => anim(sv("circle", { cx: gx, cy: gy, r: gr, fill: "url(#ch-glow)" }, glowG), `animation:chGlow ${(2 + rnd("gl" + i) * 1.6).toFixed(1)}s ease-in-out infinite;`));
    const moteG = sv("g", { "pointer-events": "none" }, svg);
    for (let i = 0; i < 12; i++) anim(sv("circle", { cx: (120 + rnd("mx" + i) * 130).toFixed(1), cy: (360 + rnd("my" + i) * 160).toFixed(1), r: 1.1, fill: "#fff6d0" }, moteG), `animation:chMote ${(6 + rnd("mt" + i) * 5).toFixed(1)}s ease-out ${(rnd("md" + i) * 6).toFixed(1)}s infinite;opacity:0;`);
    const tint = sv("rect", { x: 0, y: 0, width: W, height: H, fill: "#000", opacity: 0, "pointer-events": "none" }, svg);
    field.appendChild(svg);

    // ── time of day: the sun's position decides where the colours land on the floor ──
    const TIMES = [
      { name: "morning", label: "\u{1F305} morning", sky: ["#8fb8e0", "#f7d7a0"], orb: [124, 214, "#fff2b8"], dir: 0.8, ev: 1.15, ray: "#ffe7b0", rayOp: 0.18, patchOp: 0.36, stars: 0, tint: ["#ffb98a", 0.05],
        say: "Morning. The sun comes in low and lays the colours across the stone." },
      { name: "noon", label: "☀️ noon", sky: ["#6fb0ea", "#cfe8f8"], orb: [180, 76, "#fffbe0"], dir: 0, ev: 0.72, ray: "#fff6d8", rayOp: 0.14, patchOp: 0.3, stars: 0, tint: ["#000", 0],
        say: "Noon. The colours pool right under the window." },
      { name: "evening", label: "\u{1F307} evening", sky: ["#5b4a8f", "#f0905e"], orb: [238, 214, "#ffc78a"], dir: -0.8, ev: 1.15, ray: "#ffcf9a", rayOp: 0.2, patchOp: 0.36, stars: 0.2, tint: ["#ff8a5c", 0.07],
        say: "Evening. The light leans the other way and goes long." },
      { name: "night", label: "\u{1F319} night", sky: ["#0d0b22", "#241c48"], orb: [232, 90, "#efe6bd"], dir: -0.25, ev: 0.8, ray: "#bfd3ff", rayOp: 0.08, patchOp: 0.17, stars: 1, tint: ["#05031a", 0.26],
        say: "Night. Moonlight, thin and blue, and the candles doing most of the work." }
    ];
    const hr = new Date().getHours();
    let tI = hr >= 5 && hr < 10 ? 0 : hr >= 10 && hr < 16 ? 1 : hr >= 16 && hr < 20 ? 2 : 3;
    const summary = () => `${done.length} ${plural(done.length, "pane")} of glass · ${wips.length} ${plural(wips.length, "candle")} lit · tap a pane or a candle`;
    const buildLight = t => {
      while (lightG.firstChild) lightG.removeChild(lightG.firstChild);
      // shafts from the window into the nave
      [[104, 150], [150, 200], [210, 260]].forEach(([a, b], i) => {
        const sk = t.dir * 150;
        sv("polygon", { points: `${a},262 ${b},262 ${b + sk + 18},560 ${a + sk - 18},560`, fill: "url(#ch-ray)", opacity: t.rayOp * (0.7 + i * 0.15) }, lightG);
      });
      // the colours of every finished pane, projected onto the floor: higher panes land farther from the wall
      const lit = grid.cells.filter(c => c.fic);
      const step = Math.max(1, Math.ceil(lit.length / 70));
      lit.forEach((cell, i) => {
        if (i % step) return;
        const h = 332 - cell.cy, d = h * t.ev;
        const py = 346 + d * 0.82, px = WCX + (cell.cx - WCX) * (1 + d / 300) + t.dir * d * 0.55;
        const pw = grid.cw * (1 + d / 240), ph = Math.max(5, grid.cw * 0.36 * (1 + d / 190)), sk = t.dir * 7;
        const p = sv("polygon", { points: `${(px - pw / 2 + sk).toFixed(1)},${(py - ph / 2).toFixed(1)} ${(px + pw / 2 + sk).toFixed(1)},${(py - ph / 2).toFixed(1)} ${(px + pw / 2).toFixed(1)},${(py + ph / 2).toFixed(1)} ${(px - pw / 2).toFixed(1)},${(py + ph / 2).toFixed(1)}`, fill: cell.fic.color, opacity: t.patchOp }, lightG);
        anim(p, `animation:chDrift ${(10 + rnd("dr" + i) * 6).toFixed(1)}s ease-in-out ${(rnd("dd" + i) * 5).toFixed(1)}s infinite;`);
      });
    };
    const applyTime = () => {
      const t = TIMES[tI];
      while (sky.firstChild) sky.removeChild(sky.firstChild);
      t.sky.forEach((c, i) => sv("stop", { offset: i, "stop-color": c }, sky));
      starG.setAttribute("opacity", t.stars);
      orb.setAttribute("cx", t.orb[0]); orb.setAttribute("cy", t.orb[1]); orb.setAttribute("fill", t.orb[2]);
      orb.setAttribute("r", t.name === "night" ? 10 : 13);
      orbGlow.setAttribute("cx", t.orb[0]); orbGlow.setAttribute("cy", t.orb[1]);
      orbGlow.setAttribute("opacity", t.name === "night" ? 0.25 : 0.6);
      tint.setAttribute("fill", t.tint[0]); tint.setAttribute("opacity", t.tint[1]);
      timeBtn.textContent = t.label;
      buildLight(t);
      sub.textContent = `${done.length} ${plural(done.length, "pane")} · ${wips.length} ${plural(wips.length, "candle")} · ${t.name}`;
      if (!picked) caption.textContent = t.say;
    };
    const timeBtn = pill("", "Change the time of day", () => { tI = (tI + 1) % TIMES.length; picked = null; applyTime(); });
    pill("\u{1FA91} sit in the pew", "Sit down and watch your year", () => sit());
    pill("\u{1F3D8}️ village", "Back out to Hollowbrook", () => { close(); openHollowbrook(); });
    hint.addEventListener("click", () => sit());
    myPew.addEventListener("click", () => sit());

    // ── the pew: a short summary of your reading year ──
    const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const yearStats = () => {
      let Y = new Date().getFullYear();
      const inYear = y => log.filter(e => dayOf(e).slice(0, 4) === String(y));
      let ent = inYear(Y);
      if (ent.length < 5) { const prev = inYear(Y - 1); if (prev.length > ent.length) { Y -= 1; ent = prev; } }   // early January: show last year instead
      const words = ent.reduce((a, e) => a + (Number(e.words) || 0), 0);
      const days = Array.from(new Set(ent.map(dayOf))).sort();
      let streak = 0, run = 0, prevT = null;
      days.forEach(d => {
        const t = Date.parse(d + "T00:00:00");
        run = prevT !== null && Math.round((t - prevT) / 86400000) === 1 ? run + 1 : 1;
        prevT = t; if (run > streak) streak = run;
      });
      const perMonth = new Array(12).fill(0);
      ent.forEach(e => { const m = parseInt(dayOf(e).slice(5, 7), 10) - 1; if (m >= 0 && m < 12) perMonth[m] += Number(e.words) || 0; });
      let best = -1; perMonth.forEach((w, i) => { if (w > 0 && (best < 0 || w > perMonth[best])) best = i; });
      const byFic = new Map(), byFandom = new Map();
      ent.forEach(e => {
        const id = idOf(e) || String(e.title || ""), w = Number(e.words) || 0;
        const cur = byFic.get(id) || { title: e.title || "an untitled fic", words: 0 }; cur.words += w; byFic.set(id, cur);
        (Array.isArray(e.fandoms) ? e.fandoms : []).forEach(fd => { if (fd) byFandom.set(fd, (byFandom.get(fd) || 0) + w); });
      });
      const top = m => { let b = null; m.forEach((v, k) => { const w = typeof v === "number" ? v : v.words; if (!b || w > b.w) b = { k, v, w }; }); return b; };
      const topFic = top(byFic), topFandom = top(byFandom);
      const finishedThisYear = done.filter(d => d.day.slice(0, 4) === String(Y));
      return { Y, words, chapters: ent.length, days: days.length, streak, perMonth, best, topFic: topFic && topFic.v, topFandom: topFandom && topFandom.k,
        finished: finishedThisYear, readTime: formatReadTime(wordsToReadMinutes(words)) };
    };
    const slidesFor = s => {
      const out = [];
      out.push({ kicker: "the pew", big: String(s.Y), body: "Sit a moment. This is what the year looked like from here." });
      if (s.words > 0) out.push({ kicker: "reading", big: `${s.words.toLocaleString()} words`, body: `${s.chapters.toLocaleString()} ${plural(s.chapters, "chapter")} over ${s.days} ${plural(s.days, "day")}${s.readTime ? ", about " + s.readTime + " of reading" : ""}.` });
      else out.push({ kicker: "reading", big: "A quiet year so far", body: "No chapters logged yet. The pews are patient." });
      if (s.finished.length) {
        const last = s.finished[s.finished.length - 1];
        out.push({ kicker: "stained glass", big: `${s.finished.length} ${plural(s.finished.length, "fic")} finished`, body: `${s.finished.length} new ${plural(s.finished.length, "pane")} in the window. The latest: ${last.title}.` });
      } else out.push({ kicker: "stained glass", big: "No endings yet", body: "The glass is waiting for the next fic you finish." });
      if (s.topFic) out.push({ kicker: "most read", big: s.topFic.title, small: true, body: `${s.topFic.words.toLocaleString()} words of your year went here.${s.topFandom ? " Most of it lived in " + s.topFandom + "." : ""}` });
      if (s.best >= 0) out.push({ kicker: "rhythm", big: MONTHS[s.best], body: `was your busiest month${s.streak > 1 ? ". Longest streak: " + s.streak + " days in a row." : "."}`, chart: s.perMonth, hi: s.best });
      out.push({ kicker: "still burning", big: `${wips.length} ${plural(wips.length, "candle")}`, body: wips.length ? "lit for the fics you're still reading." : "Nothing in progress. A clear head, a clean rack.", foot: "Stand up whenever you like. The chapel will keep your place." });
      return out;
    };
    const standUp = () => {
      clearInterval(timer);
      if (overlay) { overlay.remove(); overlay = null; }
    };
    const sit = () => {
      if (overlay) return;
      const slides = slidesFor(yearStats());
      let i = 0;
      overlay = el("div", "position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 26px 54px;text-align:center;background:radial-gradient(ellipse at 50% 38%,rgba(20,12,32,0.93),rgba(6,4,14,0.97));color:#f4ead6;cursor:pointer;");
      const stage = el("div", "width:100%;max-width:320px;");
      const dots = el("div", "position:absolute;left:0;right:0;bottom:22px;display:flex;justify-content:center;gap:7px;");
      const stand = el("button", "position:absolute;top:12px;right:14px;border:1px solid rgba(244,234,214,0.35);background:rgba(255,255,255,0.07);color:#f4ead6;border-radius:999px;padding:6px 12px;font:500 12px/1 inherit;font-family:inherit;cursor:pointer;", "stand up");
      stand.type = "button";
      stand.onclick = e => { e.stopPropagation(); standUp(); };
      overlay.appendChild(stage); overlay.appendChild(dots); overlay.appendChild(stand);
      const show = () => {
        stage.textContent = ""; dots.textContent = "";
        const sl = slides[i], wrap = el("div", "animation:chSlide .7s ease-out both;");
        wrap.classList.add("ch-anim");
        wrap.appendChild(el("div", "font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#c9a24a;margin-bottom:14px;", sl.kicker));
        wrap.appendChild(el("div", `font-family:Georgia,'Times New Roman',serif;font-weight:700;line-height:1.15;font-size:${sl.small ? 24 : (String(sl.big).length > 12 ? 30 : 40)}px;margin-bottom:12px;overflow-wrap:anywhere;`, sl.big));
        wrap.appendChild(el("div", "font-family:Georgia,'Times New Roman',serif;font-size:14.5px;line-height:1.5;color:rgba(244,234,214,0.85);", sl.body));
        if (sl.chart) {
          const mx = Math.max.apply(null, sl.chart), cs = sv("svg", { viewBox: "0 0 240 70", width: 240, height: 70 });
          cs.style.cssText = "margin-top:18px;max-width:100%;";
          sl.chart.forEach((w, m) => {
            const bh = mx ? Math.max(w ? 3 : 1, (w / mx) * 50) : 1;
            sv("rect", { x: m * 20 + 3, y: 54 - bh, width: 14, height: bh, rx: 2, fill: m === sl.hi ? "#ffd98a" : "#8a7aa8", opacity: m === sl.hi ? 1 : 0.65 }, cs);
            const lab = sv("text", { x: m * 20 + 10, y: 66, "text-anchor": "middle", "font-size": 7.5, fill: "#cbbfe0", opacity: 0.7 }, cs); lab.textContent = MONTHS[m][0];
          });
          wrap.appendChild(cs);
        }
        if (sl.foot) wrap.appendChild(el("div", "margin-top:26px;font-size:12px;font-style:italic;color:rgba(244,234,214,0.6);", sl.foot));
        stage.appendChild(wrap);
        slides.forEach((_, k) => dots.appendChild(el("span", `width:6px;height:6px;border-radius:50%;background:#f4ead6;opacity:${k === i ? 0.95 : 0.28};`)));
      };
      const next = () => { if (i < slides.length - 1) { i++; show(); } else { clearInterval(timer); } };
      overlay.addEventListener("click", () => { next(); clearInterval(timer); timer = setInterval(next, 6500); });
      box.appendChild(overlay);
      show();
      clearInterval(timer); timer = setInterval(next, 6500);
    };

    applyTime();
    document.body.appendChild(back);
  }


  return { openGraveyard, openGraveyardGrounds, openCelebration, openConstellation, openAquarium, openBookshelf, openGarden, openStainedGlass, openHollowbrook, openChapel, openBellTower, openHawkins, openWheelers, openBasement, openBasementFort, openFortInside };
};

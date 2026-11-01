  // ── 🚌 HAWKINS, INDIANA ──
  // The bus stop in Hollowbrook (tap the shelter at the end of the Hawkins road, answer "board") takes you here:
  // a simplified night-time map of the town. Everything is drawn from scratch as flat shapes (no artwork reused).
  // For now only ONE place can be entered, the Wheelers' house (top right); the rest are labelled but closed, and
  // tapping one just says so. The bus parked at the bottom takes you back to Hollowbrook.
  //  · openHawkins(arrive)  the map. arrive = true plays the short bus ride in first (tap to skip).
  //  · openWheelers()       the front of the house: lit windows, porch light, a knock on the door.
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
        @media (prefers-reduced-motion: reduce){.hk-anim{animation:none !important}}
      `;
      (document.head || document.documentElement).appendChild(st);
    }
    const kit = hkKit(), el = kit.el;
    const back = el("div", "position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000002;");
    back.id = id;
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

  // ── the Wheelers' house, from the front lawn ──
  function openWheelers() {
    const sh = hkShell("ao3-wheelers", "\u{1F3E1} The Wheelers\u2019");
    const { sv, rnd, anim } = sh.kit;
    const { box, sub, field, caption, pill, close } = sh;
    let tI = hkTimeGet(), nKnock = 0, nWin = 0;
    const W = 360, H = 540;
    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMin meet" });
    svg.style.cssText = "width:100%;height:auto;display:block;";
    const defs = sv("defs", {}, svg);
    const glow = sv("radialGradient", { id: "wh-glow" }, defs);
    sv("stop", { offset: "0%", "stop-color": "#ffd98a", "stop-opacity": "0.8" }, glow);
    sv("stop", { offset: "100%", "stop-color": "#ffd98a", "stop-opacity": "0" }, glow);
    const lits = [];

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
    sv("rect", { x: 232, y: 112, width: 14, height: 36, fill: "#5a2f2a" }, svg);                      // chimney
    sv("rect", { x: 229, y: 109, width: 20, height: 5, fill: "#3a2230" }, svg);
    sv("rect", { x: 58, y: 200, width: 244, height: 68, fill: "#cfc9dc" }, svg);
    for (let yy = 207; yy < 268; yy += 7) sv("path", { d: `M58 ${yy} H302`, stroke: "#a8a2bb", "stroke-width": 0.8, opacity: 0.7 }, svg);
    sv("rect", { x: 58, y: 268, width: 244, height: 78, fill: "#7d3a33" }, svg);
    for (let yy = 274, r = 0; yy < 346; yy += 6, r++) { sv("path", { d: `M58 ${yy} H302`, stroke: "#5a2a26", "stroke-width": 0.8, opacity: 0.8 }, svg); for (let xx = 58 + (r % 2) * 8; xx < 302; xx += 16) sv("path", { d: `M${xx} ${yy} v6`, stroke: "#5a2a26", "stroke-width": 0.8, opacity: 0.6 }, svg); }
    sv("rect", { x: 54, y: 266, width: 252, height: 4, fill: "#2a2236" }, svg);
    sv("rect", { x: 54, y: 344, width: 252, height: 5, fill: "#3a3347" }, svg);
    // the upstairs windows: shutters, warm light, curtains. The middle one is the one somebody left on
    const wins = [];
    [[80, 1], [165, 1], [250, 0.8]].forEach(([wx, lum], i) => {
      sv("rect", { x: wx - 7, y: 208, width: 6, height: 34, fill: "#3a2a4a" }, svg);
      sv("rect", { x: wx + 32, y: 208, width: 6, height: 34, fill: "#3a2a4a" }, svg);
      sv("rect", { x: wx - 2, y: 207, width: 36, height: 36, fill: "#e6e0ef" }, svg);
      sv("rect", { x: wx, y: 209, width: 32, height: 32, fill: "#120d22" }, svg);
      lits.push(g => {
        const gg = sv("g", {}, g);
        sv("circle", { cx: wx + 16, cy: 225, r: 34, fill: "url(#wh-glow)", opacity: 0.4 * lum }, gg);
        sv("rect", { x: wx, y: 209, width: 32, height: 32, fill: "#f0b45a", opacity: 0.85 * lum }, gg);
        sv("path", { d: `M${wx + 11} 209 q-1 14 1 32 M${wx + 21} 209 q1 14 -1 32`, stroke: "#b9772a", "stroke-width": 1.6, fill: "none", opacity: 0.8 }, gg);
        if (i === 1) anim(gg, "animation:hkFlicker 3.4s ease-in-out infinite;");
      });
      sv("path", { d: `M${wx + 16} 209 V241 M${wx} 225 H${wx + 32}`, stroke: "#e6e0ef", "stroke-width": 1.4 }, svg);
      const hit = sv("rect", { x: wx - 7, y: 205, width: 46, height: 40, fill: "transparent" }, svg);
      hit.style.cursor = "pointer"; hit.setAttribute("role", "button"); hit.setAttribute("aria-label", "An upstairs window");
      wins.push(hit);
    });
    const WIN_SAY = ["A light has been left on upstairs.", "A curtain moves. Or the draught does.", "Somewhere up there, a radio is playing very quietly."];
    wins.forEach(h => h.addEventListener("click", () => { caption.textContent = WIN_SAY[nWin++ % WIN_SAY.length]; }));
    // the garage door and a window beside the front door
    sv("rect", { x: 68, y: 284, width: 62, height: 62, fill: "#d9d4e4", stroke: "#a8a2bb", "stroke-width": 1.2 }, svg);
    for (let i = 0; i < 4; i++) sv("rect", { x: 71, y: 287 + i * 15, width: 56, height: 12, rx: 1, fill: "none", stroke: "#b4aec7", "stroke-width": 0.9 }, svg);
    sv("rect", { x: 244, y: 288, width: 40, height: 34, fill: "#e6e0ef" }, svg);
    sv("rect", { x: 246, y: 290, width: 36, height: 30, fill: "#120d22" }, svg);
    lits.push(g => { sv("rect", { x: 246, y: 290, width: 36, height: 30, fill: "#f0b45a", opacity: 0.7 }, g); sv("circle", { cx: 264, cy: 305, r: 30, fill: "url(#wh-glow)", opacity: 0.3 }, g); });
    sv("path", { d: "M264 290 V320 M246 305 H282", stroke: "#e6e0ef", "stroke-width": 1.2 }, svg);
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
    const porch = sv("g", {}, svg);                                                                   // the porch light's glow, so a knock can make it buzz
    lits.push(g => { porch.setAttribute("class", "hk-anim"); porch.style.cssText = "animation:hkFlicker 2.6s ease-in-out infinite;"; sv("circle", { cx: 210, cy: 290, r: 26, fill: "url(#wh-glow)" }, porch); g.appendChild(porch); });
    const door = sv("rect", { x: 186, y: 282, width: 50, height: 72, fill: "transparent" }, svg);
    door.style.cursor = "pointer"; door.setAttribute("role", "button"); door.setAttribute("aria-label", "Knock on the front door");
    const KNOCK = ["You knock. Somewhere inside, a floorboard creaks.", "You knock again. Nobody comes.", "The porch light buzzes. Maybe later."];
    door.addEventListener("click", () => {
      hkKnock();
      try { if (navigator.vibrate) navigator.vibrate([12, 60, 12, 60, 12]); } catch {}
      caption.textContent = KNOCK[nKnock++ % KNOCK.length];
      try { if (porch.animate) porch.animate([{ opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], { duration: 700 }); } catch {}
    });
    // hedges, the garage lamp, a mailbox, two trees
    [[150, 350, 24, 10], [262, 352, 36, 11], [100, 352, 0, 0]].forEach(([hx, hy, hr, hh]) => { if (hr) { sv("ellipse", { cx: hx, cy: hy, rx: hr, ry: hh, fill: "#1b2f2b" }, svg); sv("ellipse", { cx: hx - 4, cy: hy - 3, rx: hr * 0.6, ry: hh * 0.6, fill: "#223d36" }, svg); } });
    [[30, 330, 32], [336, 336, 28]].forEach(([tx, ty, tr]) => { sv("rect", { x: tx - 3, y: ty, width: 6, height: 70, fill: "#2c2028" }, svg); sv("circle", { cx: tx, cy: ty - 6, r: tr, fill: "#1f3a37" }, svg); sv("circle", { cx: tx - 8, cy: ty - 14, r: tr * 0.6, fill: "#27483f" }, svg); });
    sv("rect", { x: 282, y: 428, width: 3, height: 34, fill: "#4a3326" }, svg);
    sv("rect", { x: 272, y: 418, width: 24, height: 12, rx: 5, fill: "#3a4a66" }, svg);
    sv("rect", { x: 296, y: 414, width: 2, height: 10, fill: "#c9482e" }, svg);
    const mt = sv("text", { x: 284, y: 427, "text-anchor": "middle", "font-family": "Georgia,serif", "font-size": 4.2, fill: "#e6dcf5" }, svg); mt.textContent = "WHEELER";
    sv("rect", { x: 150, y: 424, width: 2.4, height: 38, fill: "#2c2438" }, svg);
    sv("rect", { x: 146.5, y: 416, width: 9, height: 9, rx: 2, fill: "#ffd98a" }, svg);
    lits.push(g => anim(sv("circle", { cx: 151, cy: 420, r: 26, fill: "url(#wh-glow)" }, g), "animation:hkFlicker 3s ease-in-out infinite;"));
    const mail = sv("rect", { x: 266, y: 412, width: 36, height: 50, fill: "transparent" }, svg);
    mail.style.cursor = "pointer"; mail.setAttribute("role", "button"); mail.setAttribute("aria-label", "The mailbox");
    mail.addEventListener("click", () => { caption.textContent = "The mailbox. A flyer from a pizza place and nothing else."; });
    sv("ellipse", { cx: 110, cy: 440, rx: 70, ry: 10, fill: "#c8bee6", opacity: 0.08 }, svg);
    const lit = sv("g", {}, svg);
    lits.forEach(f => f(lit));
    const tint = sv("rect", { x: 0, y: 0, width: W, height: H, fill: "#000", opacity: 0, "pointer-events": "none" }, svg);
    field.appendChild(svg);

    const applyTime = announce => {
      const t = HK_TIMES[tI];
      box.style.background = t.sky;
      starG.setAttribute("opacity", t.stars);
      moonDisc.setAttribute("fill", t.orb);
      moonG.setAttribute("transform", `translate(0 ${t.dy})`);
      lit.setAttribute("opacity", t.lit);
      tint.setAttribute("fill", t.tint[0]); tint.setAttribute("opacity", t.tint[1]);
      timeBtn.textContent = t.label;
      sub.textContent = "hawkins \u00B7 " + t.name;
      if (announce) caption.textContent = t.say.house;
    };
    const timeBtn = pill("", "Change the time of day", () => { tI = (tI + 1) % HK_TIMES.length; hkTimeSet(tI); applyTime(true); });
    pill("\u{1F5FA}\uFE0F map", "Back to the map of Hawkins", () => { close(); openHawkins(false); });
    pill("\u{1F68C} bus stop", "Take the bus back to Hollowbrook", () => { close(); openHollowbrook(); });
    applyTime(true);
    document.body.appendChild(sh.back);
  }

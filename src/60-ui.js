// ============================================================================
// 60 · UI — console, live numbers, spec sheets
// ============================================================================
const UI = {};
const $ = (s) => document.querySelector(s);
const el = (tag, attrs = {}, html = "") => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (html) e.innerHTML = html; return e; };
const N2LBF = 1 / LBF;
const fmtN = (n) => (n >= 1e6 ? fmt(n / 1e6, 2) + " MN" : fmt(n / 1e3, 1) + " kN");
const EXIT_R = { F1: 1.88, J2: 0.98, SPS: 1.25, DPS: 0.76, APS: 0.4 };
const FLOWN = {
  F1: "CECO 135.2 s · outboard cutoff 161.6 s",
  J2II: "Ignition T+163.0 s → cutoff T+548.2 s (385 s)",
  J2IVB: "150.1 s to orbit · 346.8 s for TLI",
  SPS: "LOI-1 ≈ 6 min, ≈ 2,924 ft/s",
  DPS: "PDI → touchdown 12 min 39 s",
  APS: "Lunar liftoff, 434 s, ≈ 6,055 ft/s",
};
const SPEC_ORDER = ["les", "bpc", "cm", "sm", "lm", "lmAscent", "lmDescent", "sla", "iu", "sivb", "sivbEngine", "sivbInter", "sii", "siiEngines", "siiInter", "sic", "sicEngines", "launcher", "tower"];

function buildUI() {
  const seg = $("#groupSeg");
  for (const [k, G] of Object.entries(GROUPS)) {
    if (G.show) continue;
    const b = el("button", { type: "button", "data-g": k, "aria-pressed": "false" }, `<span>${G.label}</span><small>${G.sub}</small>`);
    b.addEventListener("click", () => selectGroup(k));  // also selects the engine in the index
    seg.append(b);
  }
  // "All engines": one button per engine fires or cuts it alone
  ENGINE_SETS.xALL.forEach((e, i) => {
    const b = el("button", { type: "button", "data-i": i, "aria-pressed": "false" }, `<i></i>${e.name}`);
    b.addEventListener("click", () => fireOne(i));
    $("#fireRow").append(b);
  });
  // the journey: step through the flight from the figure
  const jstep = (d) => { const i = J_BY[C.sel]?.i ?? 0, n = J_PHASES[clamp(i + d, 0, J_PHASES.length - 1)]; selectItem(n.id); };
  $("#jprev").addEventListener("click", () => jstep(-1));
  $("#jnext").addEventListener("click", () => jstep(1));
  for (const id of ["#thr", "#thrMini"]) $(id).addEventListener("input", (e) => { C.thr = +e.target.value / 100; UI.sync(); });
  $("#alt").addEventListener("input", (e) => { const v = +e.target.value; C.alt = v >= 100 ? 1e6 : v * 1000; UI.sync(); });
  for (const b of [$("#ign"), $("#ign2")]) b.addEventListener("click", () => (C.running ? shutdown() : ignite()));
  $("#apart").addEventListener("click", () => setExplode(!(curShow() ? C.sx : C.explode)));
  $("#free").addEventListener("click", () => { CAM.free = !CAM.free; CAM.keys.clear(); try { localStorage.setItem("apollo-free", CAM.free ? "1" : "0"); } catch (e) {} UI.sync(); });
  document.querySelectorAll(".dragmode button").forEach((b) => b.addEventListener("click", () => { CAM.dragMode = b.dataset.mode; try { localStorage.setItem("apollo-drag", CAM.dragMode); } catch (e) {} UI.sync(); }));
  try { const dm = localStorage.getItem("apollo-drag"); if (dm === "pan" || dm === "orbit") CAM.dragMode = dm; } catch (e) {}
  $("#zin").addEventListener("click", () => zoomBy(1 / 1.35));
  $("#zout").addEventListener("click", () => zoomBy(1.35));
  $("#zreset").addEventListener("click", resetView);
  $("#aa").addEventListener("click", () => { PIPE.setAA(!PIPE.aa); try { localStorage.setItem("apollo-aa", PIPE.aa ? "1" : "0"); } catch (e) {} UI.sync(); });
  $("#allOn").addEventListener("click", () => {
    if (GROUPS[C.group].lineup && C.running) C.off.xALL.forEach((o, i) => { if (o) C.lstart[i] = C.t; });
    C.off[C.group] = C.off[C.group].map(() => 0); UI.sync();
  });
  // parts index: stacked sections, one open at a time, scrolling inside its own panel
  const menu = $("#menu");
  menu.style.setProperty("--n", MENU.length);
  MENU.forEach(([title, items], si) => {
    const sec = el("section", { "data-sec": si });
    const head = el("button", { type: "button", class: "sec-head", "aria-expanded": "false", "aria-controls": `sec${si}` }, `<span>${title}</span><b>${String(si).padStart(2, "0")}</b><i aria-hidden="true"></i>`);
    head.addEventListener("click", () => openSection(si, true));
    const body = el("div", { class: "sec-items", id: `sec${si}`, role: "group", "aria-label": title }), inner = el("div", { class: "sec-in" });
    items.forEach(([id, label], ii) => {
      const b = el("button", { type: "button", "data-item": id, "aria-pressed": "false" }, `<em>${si}.${ii + 1}</em><span>${label}</span>`);
      b.addEventListener("click", () => selectItem(id));
      inner.append(b);
      SEC_OF[id] = si;
    });
    body.append(inner); sec.append(head, body); menu.append(sec);
  });
  openSection(0);
  // keyboard flight: keys act while the pointer is over the figure or it has focus
  const fig = $("#fig"); fig.tabIndex = 0;
  const FLY = new Set(["w", "a", "s", "d", "q", "e", "arrowleft", "arrowright", "arrowup", "arrowdown", "shift"]);
  let overFig = false;
  fig.addEventListener("pointerenter", () => (overFig = true));
  fig.addEventListener("pointerleave", () => (overFig = false));
  window.addEventListener("keydown", (e) => {
    if (!(overFig || fig.contains(document.activeElement)) || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target, onControl = t !== fig && t.closest?.("button, input, select, textarea, a");
    const k = e.key.toLowerCase();
    if (onControl && (k === " " || k === "enter" || t.matches?.("input"))) return;
    if (k === " " || k === "enter") { e.preventDefault(); C.running ? shutdown() : ignite(); }
    else if (k === "+" || k === "=") { e.preventDefault(); zoomBy(1 / 1.25); }
    else if (k === "-" || k === "_") { e.preventDefault(); zoomBy(1.25); }
    else if (k === "r" || k === "0") { e.preventDefault(); resetView(); }
    else if (k === "]" || k === "[") { e.preventDefault(); C.thr = clamp(C.thr + (k === "]" ? 0.05 : -0.05), 0, 1); UI.sync(); }
    else if (CAM.free && FLY.has(k)) { e.preventDefault(); CAM.keys.add(k); }
  });
  window.addEventListener("keyup", (e) => CAM.keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => CAM.keys.clear());
  buildSheets();
  UI.sync();
}

const PROP_SHORT = { F1: "RP-1 / LOX", J2: "LH₂ / LOX", SPS: "A-50 / N₂O₄", DPS: "A-50 / N₂O₄", APS: "A-50 / N₂O₄" };
const plumeInk = (fx) => FX_SETS[fx.userData.kind][PAL.dark3d ? "dark" : "light"][1];
function lineupSVG(svg) {   // the five exits side by side, to scale; click one to fire or cut it
  const set = ENGINE_SETS.xALL, gap = 0.4, R = set.map((e) => EXIT_R[e.eng]);
  const k = 112 / (R.reduce((a, r) => a + 2 * r, 0) + gap * (R.length - 1));
  let x = -56, h = "", lastX = -99, lastDrop = 0;
  set.forEach((e, i) => {
    const r = R[i] * k, cx = x + r, on = C.running && !C.off.xALL[i]; x += 2 * r + gap * k;
    const drop = cx - lastX < 17 && !lastDrop ? 9 : 0; lastX = cx; lastDrop = drop;   // stagger labels that would touch
    h += `<g class="eng-g" data-i="${i}" role="button" tabindex="0" aria-label="${e.name} ${on ? "firing" : "off"}" aria-pressed="${on}">`;
    h += `<circle class="eng" cx="${cx.toFixed(1)}" cy="0" r="${(r * 0.96).toFixed(1)}" fill="var(--card)" stroke="var(--ink)" stroke-width="1.2"/>`;
    h += `<circle class="glow" cx="${cx.toFixed(1)}" cy="0" r="${(r * 0.8).toFixed(1)}" fill="${plumeInk(e.fx)}" opacity="${((e.fx.userData.thrust || 0) * 0.9).toFixed(2)}" pointer-events="none"/>`;
    h += `<text x="${cx.toFixed(1)}" y="${(Math.max(r, 6) + 10 + drop).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="7" fill="var(--ink-2)" pointer-events="none">${e.name}</text></g>`;
  });
  svg.innerHTML = h;
  svg.querySelectorAll(".eng-g").forEach((g) => {
    const t = () => fireOne(+g.dataset.i);
    g.addEventListener("click", t);
    g.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); t(); } });
  });
}
function clusterSVG() {
  const G = GROUPS[C.group], set = ENGINE_SETS[G.set], svg = $("#cluster");
  if (G.lineup) return lineupSVG(svg);
  const pts = set.map((e) => (G.set === "F1" || G.set === "J2II" ? e.group.position : V3()));
  const rE = EXIT_R[G.eng], maxR = Math.max(...pts.map((p) => Math.hypot(p.x, p.z))) + rE;
  const k = 52 / maxR;
  const names = G.set === "F1" ? ["105", "101", "102", "103", "104"] : G.set === "J2II" ? ["205", "201", "202", "203", "204"] : [G.sub];
  let h = `<circle cx="0" cy="0" r="58" fill="none" stroke="var(--line-2)" stroke-dasharray="2 3"/>`;
  if (G.set === "F1") for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2, r1 = 30, r2 = 57; h += `<line x1="${Math.cos(a) * r1}" y1="${Math.sin(a) * r1}" x2="${Math.cos(a) * r2}" y2="${Math.sin(a) * r2}" stroke="var(--line-2)" stroke-width="3"/>`; }
  pts.forEach((p, i) => {
    const x = p.x * k, y = p.z * k, r = rE * k * 0.96, off = C.off[C.group][i];
    const lvl = set[i].fx.userData.level;
    h += `<g class="eng-g" data-i="${i}" role="button" tabindex="0" aria-label="Engine ${names[i]} ${off ? "cut" : "enabled"}" aria-pressed="${!off}">`;
    h += `<circle class="eng" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="var(--card)" stroke="var(--ink)" stroke-width="1.4"/>`;
    h += `<circle class="glow" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 0.82).toFixed(1)}" fill="var(--accent)" opacity="${(lvl * 0.85).toFixed(2)}" pointer-events="none"/>`;
    h += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 0.26).toFixed(1)}" fill="none" stroke="var(--ink-2)" stroke-width="1" pointer-events="none"/>`;
    if (off) h += `<path d="M${x - r * 0.6} ${y - r * 0.6}L${x + r * 0.6} ${y + r * 0.6}M${x + r * 0.6} ${y - r * 0.6}L${x - r * 0.6} ${y + r * 0.6}" stroke="var(--accent)" stroke-width="2" pointer-events="none"/>`;
    h += `<text x="${x.toFixed(1)}" y="${(y + r + 9).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="7.5" fill="var(--ink-2)" pointer-events="none">${names[i]}</text></g>`;
  });
  svg.innerHTML = h;
  svg.querySelectorAll(".eng-g").forEach((g) => {
    const t = () => toggleEngine(C.group, +g.dataset.i);
    g.addEventListener("click", t);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t(); } });
  });
}
// ---------- stacked index ----------
const SEC_OF = {};
let openSec = -1, secFor = null;
function openSection(si, toggle = false, reveal = false) {
  const menu = $("#menu");
  openSec = toggle && openSec === si ? -1 : si;
  menu.querySelectorAll("section").forEach((s) => {
    const on = +s.dataset.sec === openSec;
    s.classList.toggle("open", on);
    s.querySelector(".sec-head").setAttribute("aria-expanded", String(on));
  });
  // keep the open section (and the selected item) in view by scrolling the index itself, never the page
  const sec = menu.querySelector(`section[data-sec="${openSec}"]`); if (!sec) return;
  const go = (el, o) => el.scrollTo({ ...o, behavior: REDUCED ? "auto" : "smooth" });
  const run = () => {
    const head = sec.querySelector(".sec-head"), sel = sec.querySelector('button[aria-pressed="true"]'), mr = menu.getBoundingClientRect();
    if (menu.scrollWidth > menu.clientWidth + 2) {                       // phone layout: a row of section tabs
      const hr = head.getBoundingClientRect();
      if (hr.left < mr.left || hr.right > mr.right) go(menu, { left: Math.max(0, hr.left - mr.left + menu.scrollLeft - 8) });
      const row = sec.querySelector(".sec-in");
      if (sel && row) { const rr = row.getBoundingClientRect(), sr = sel.getBoundingClientRect(); if (sr.left < rr.left || sr.right > rr.right) go(row, { left: Math.max(0, sr.left - rr.left + row.scrollLeft - 8) }); }
    } else {
      const hr = head.getBoundingClientRect(), tr = (reveal && sel ? sel : sec).getBoundingClientRect();
      const vis = Math.min(mr.bottom, innerHeight) - mr.top;                       // the part of the panel on screen
      let top = hr.top - mr.top + menu.scrollTop - 2;                               // section header at the top…
      const need = tr.bottom - mr.top + menu.scrollTop + 10;                        // …unless that hides the selected item
      if (need - top > vis) top = need - vis;
      if (hr.top < mr.top || tr.bottom > mr.top + vis) go(menu, { top: Math.max(0, top) });
    }
  };
  // measure once the section has finished opening (and again as a fallback; an in-view check makes the repeat harmless)
  sec.querySelector(".sec-items").addEventListener("transitionend", run, { once: true });
  requestAnimationFrame(run); setTimeout(run, 450);
}
function toggleEngine(group, i) { C.off[group][i] = C.off[group][i] ? 0 : 1; UI.sync(); }

UI.sync = function () {
  const G = GROUPS[C.group], E = ENGINES[G.eng], sh = curShow(), cabin = !!SHOW[sh]?.cabin, apart = sh ? C.sx : C.explode, lineup = !!G.lineup;
  const journey = !!SHOW[sh]?.journey, ph = J_BY[C.sel];
  $("#fig").classList.toggle("journey", journey);
  if (journey && ph) {
    $("#jpos").textContent = ph.i ? `${ph.i} / ${J_PHASES.length - 1}` : "Overview";
    $("#jprev").disabled = ph.i === 0; $("#jnext").disabled = ph.i === J_PHASES.length - 1;
  }
  document.querySelectorAll("#groupSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.g === C.group)));
  document.querySelectorAll("#menu button[data-item]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.item === C.sel || MENU_ITEMS[C.sel]?.parent === b.dataset.item)));
  if (C.sel !== secFor) { secFor = C.sel; const si = SEC_OF[MENU_ITEMS[C.sel]?.parent || C.sel]; if (si !== undefined) openSection(si, false, true); }
  renderDetail();
  for (const b of [$("#ign"), $("#ign2")]) { b.querySelector("span").textContent = cabin ? "No engine" : C.running ? "Shut down" : lineup ? "Ignite all" : "Ignite"; b.disabled = cabin || journey; }
  $("#fig").classList.toggle("lineup", lineup);
  document.querySelectorAll("#fireRow button").forEach((b, i) => { b.setAttribute("aria-pressed", String(lineup && C.running && !C.off.xALL[i])); b.style.setProperty("--c", plumeInk(ENGINE_SETS.xALL[i].fx)); });
  $("#ign").classList.toggle("on", C.running);
  $("#ign2").classList.toggle("off", !C.running);
  $("#apart").setAttribute("aria-pressed", String(apart));
  $("#aa").setAttribute("aria-pressed", String(PIPE.aa));
  $("#free").setAttribute("aria-pressed", String(CAM.free));
  $("#free").innerHTML = `Free cam <b>${CAM.free ? "On" : "Off"}</b>`;
  $("#fig").classList.toggle("free", CAM.free);
  $("#fig").classList.toggle("pan", CAM.dragMode === "pan");
  document.querySelectorAll(".dragmode button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === CAM.dragMode)));
  $("#hint").textContent = CAM.free ? (CAM.dragMode === "pan" ? "Drag to pan · shift-drag to orbit" : "Drag to orbit · right- or shift-drag to pan") + " · scroll to zoom · W/S in-out · A/D sideways · Q/E down-up · R reset" : "Hover or click a part to read it · turn on free cam to fly around";
  $("#aa").innerHTML = `Anti-aliasing <b>${PIPE.aa ? `On · ${fmt(PIPE.ss || 1, 1)}× + MSAA` : "Off"}</b>`;
  $("#apart").textContent = apart ? "Assemble" : "Take apart";
  // throttle
  const thr = $("#thr"), dps = G.eng === "DPS";
  thr.value = C.thr * 100; $("#thrMini").value = C.thr * 100;
  const eff = dps ? dpsBand(C.thr) : C.thr;
  $("#thrOut").textContent = dps ? `${fmt(eff * 100, eff === 1 ? 0 : 1)} %${Math.abs(eff - C.thr) > 0.004 ? " (set)" : ""}` : `${fmt(C.thr * 100, C.thr === 1 ? 0 : 1)} %`;
  $("#thrMiniOut").textContent = $("#thrOut").textContent.replace(" (set)", "");
  for (const t of [thr, $("#thrMini")]) t.style.setProperty("--track", dps
    ? "linear-gradient(90deg, var(--line) 0 10%, color-mix(in srgb, var(--accent) 45%, var(--line)) 10% 60%, var(--line) 60% 98%, color-mix(in srgb, var(--accent) 45%, var(--line)) 98% 100%)"
    : "linear-gradient(90deg, var(--line) 0 99%, var(--ink) 99% 100%)");
  // ambient
  const alt = $("#alt"), vac = ["SPS", "DPS", "APS"].includes(G.eng);
  alt.disabled = vac;
  alt.value = C.alt >= 1e6 ? 100 : C.alt / 1000;
  $("#altOut").textContent = vac ? "Vacuum (design point)" : C.alt >= 1e6 ? "Vacuum" : C.alt === 0 ? "Sea level" : `${fmt(C.alt / 1000, 1)} km`;
  clusterSVG();
  // notes and caption
  const notes = {
    F1: `<b>Fixed-thrust engine.</b> The F-1 flew at 100 %; lower settings scale mass flow as an off-design what-if. Thrust here is F = t·F<sub>vac</sub> − p<sub>a</sub>·A<sub>e</sub>, with A<sub>e</sub> = ${fmt(ENGINES.F1.Ae, 2)} m² from the rated pair. Raise the altitude to watch it grow toward 1,746,000 lbf.`,
    J2: `<b>Fixed-thrust engine.</b> Rated 232,250 lbf in vacuum and 109,302 lbf at sea level; thrust is taken linearly in ambient pressure between those two ratings. ${G.show ? "It starts at sea level; raise the altitude to take it toward its vacuum rating." : G.set === "J2II" ? "Set to the 67.6 km S-II ignition altitude." : "Set to the 185 km parking orbit."}`,
    SPS: `<b>Fixed-thrust, vacuum engine.</b> 20,500 lbf at Isp 314.5 s; below 100 % is an off-design what-if.`,
    DPS: `<b>The only throttleable engine on Apollo.</b> Valid settings are 10–60 % continuously, or full thrust; anything between 60 % and full snaps to 60 %. Range 1,050–10,125 lbf.`,
    APS: `<b>Fixed-thrust, pressure-fed, no gimbal.</b> 3,500 lbf; below 100 % is an off-design what-if.`,
    ALL: `<b>Five engines, one scale.</b> Ignite all fires the row; each engine button fires or cuts that engine alone, as does clicking its exit in the diagram. The throttle drives them all within each engine's own limits (the DPS keeps to 10–60 % or full). Altitude acts on the F-1 and J-2; the SPS, DPS and APS run at their vacuum design point. <b>Plume colour comes from the propellants:</b> the F-1's fuel-rich kerosene burns bright orange inside a dark sheath of turbine exhaust; the J-2's hydrogen and oxygen burn almost clear, a faint blue with shock diamonds; the SPS, DPS and APS all burn Aerozine 50 with nitrogen tetroxide, a translucent rose-orange.`,
  };
  $("#engNote").innerHTML = notes[G.eng];
  $("#engName").textContent = lineup ? ENGINE_SETS.xALL.map((e) => e.name).join(" · ") : `${E.name} × ${ENGINE_SETS[G.set].length}`;
  $("#figTitle").textContent = journey ? `The Journey · ${ph ? ph.label : ""}` : sh ? MODULES[sh].name + (C.sx ? " · taken apart" : "") : C.explode ? "Saturn V · AS-506 · taken apart" : "Saturn V · AS-506 · LC-39A";
  const caps = {
    F1: "Five F-1s exhaust into the flame trench, where the wedge deflector splits the jet north and south. The four hold-down arms keep the vehicle on the pad whatever the throttle says.",
    J2II: "The stack is taken apart in place so the S-II's five J-2s hang clear of their interstage ring. Centre engine 205 shut down early on Apollo 11, at T+7:40.6.",
    J2IVB: "The single S-IVB J-2, exposed between its aft interstage and the stage. It burned twice: 150 s to reach orbit and 347 s for trans-lunar injection.",
    SPS: "Columbia's service propulsion engine, firing into the open adapter. Its nozzle extension is columbium and titanium below an ablative chamber.",
    DPS: "Eagle stands beside the stack with its legs deployed. Its descent engine is the only throttleable engine in the vehicle.",
    APS: "Eagle's ascent stage, lifted off its descent stage. The ascent engine fires down into the descent stage, which served as the launch platform on the Moon.",
  };
  $("#caption").innerHTML = journey ? "Earth, Moon, their distance and every orbit are drawn to scale; the coasts are shown as seen from a frame turning with the Moon. Step through the flight with Next and Previous, or pick a stage from the index." : sh ? SHOW_CAPS[sh] : caps[G.set] || "";
  UI.tick(true);
};

// write to the DOM only when a value actually changes, so an idle page does no layout or paint work
const _put = new WeakMap();
function put(el, key, val) {
  let m = _put.get(el); if (!m) _put.set(el, (m = {}));
  if (m[key] === val) return;
  m[key] = val;
  if (key === "html") el.innerHTML = val; else if (key === "text") el.textContent = val; else if (key === "class") el.className = val;
  else if (key[0] === "@") el.setAttribute(key.slice(1), val); else el.style[key] = val;
}
let lastTick = 0;
UI.tick = function (force) {
  const now = performance.now();
  if (!force && now - lastTick < 90) return;
  lastTick = now;
  const S = groupState(), G = S.G, E = S.E;
  if (S.lineup) return tickLineup(S);
  // displayed thrust follows each engine's start transient and cutoff tail-off
  const lit = ENGINE_SETS[G.set].reduce((a, e) => a + (e.fx.userData.thrust || 0), 0);
  const ramp = S.n > 0 ? clamp(lit / Math.max(S.n * S.t, 1e-6), 0, 1) : 0;
  const tail = ENGINE_SETS[G.set].reduce((a, e, i) => a + (C.off[C.group][i] || !C.running ? (e.fx.userData.thrust || 0) : 0), 0);
  const total = (C.running ? S.total * ramp : 0) + tail * S.per;
  const lbf = total * N2LBF;
  put($("#thrustBig"), "html", `${fmt(lbf)}<small>lbf</small>`);
  put($("#thrustSub"), "text", `${fmtN(total)} · ${S.n} of ${S.N} engine${S.N > 1 ? "s" : ""} lit`);
  // bar: thrust vs this cluster's full rated output at this ambient pressure
  const fullPer = Math.max(0, E.thrustVac * LBF - S.pa * S.Ae);
  const ref = fullPer * S.N;
  let tw = null, twLabel = "", twStatus = null;
  if (G.eng === "F1" && !G.show) { tw = total / (VEHICLE.liftoffMass * G0); twLabel = "T/W vs AS-506 liftoff weight"; }
  if (G.eng === "DPS" && !G.show) { tw = total / ((LANDER.dryAtTouch + LANDER.fuelAtTouchReal) * G_MOON); twLabel = "Lunar T/W at touchdown mass (est. 7,000 kg)"; }
  if (G.eng === "APS" && !G.show) { tw = total / (4700 * G_MOON); twLabel = "Lunar T/W, ascent stage 4,700 kg"; }
  const bar = $("#twBar");
  if (tw !== null) {
    const max = G.eng === "F1" ? 1.5 : G.eng === "DPS" ? 4.5 : 2.5;
    put(bar.querySelector("b"), "width", `${clamp(tw / max, 0, 1) * 100}%`);
    put(bar.querySelector("em"), "left", `${(1 / max) * 100}%`);
    put($("#twMid"), "text", "1.0 = hover / liftoff");
    put($("#twMax"), "text", `${max}`);
  } else {
    put(bar.querySelector("b"), "width", `${ref > 0 ? clamp(total / ref, 0, 1) * 100 : 0}%`);
    put(bar.querySelector("em"), "left", "calc(100% - 2px)");
    put($("#twMid"), "text", "share of rated cluster thrust");
    put($("#twMax"), "text", "100 %");
  }
  const kv = [];
  kv.push(["Thrust per engine", `${fmt(S.per * N2LBF)} lbf · ${fmt(S.per / 1000, 0)} kN`]);
  kv.push(["Ambient pressure", S.pa >= 1 ? `${fmt(S.pa, S.pa < 100 ? 1 : 0)} Pa · ${fmt((S.pa / P0) * 100, 2)} % SL` : S.pa > 0 ? `${S.pa.toFixed(3)} Pa` : "0 Pa (vacuum)"]);
  kv.push(["Specific impulse", S.isp > 0 ? `${fmt(S.isp, 1)} s` : "—"]);
  if (G.eng === "F1") {
    const md = C.running ? S.mdot * ramp : 0; // flow stops when the main valves close
    kv.push(["Propellant flow", `${fmt(md)} kg/s`]);
    kv.push(["LOX · RP-1", `${fmt(md * 1789 / 2577)} · ${fmt(md * 788 / 2577)} kg/s`]);
  } else kv.push(["Propellant flow", `${fmt(C.running ? S.mdot * ramp : 0, G.eng === "J2" ? 0 : 2)} kg/s`]);
  if (E.pc) kv.push(["Chamber pressure (rated)", E.pc]);
  if (tw !== null) kv.push([twLabel, `${fmt(tw, 3)}`, tw > 1 ? "hi" : ""]);
  kv.push(["Apollo 11 burn", FLOWN[G.set]]);
  put($("#liveKV"), "html", kv.map(([k, v, c]) => `<dt>${k}</dt><dd${c ? ` class="${c}"` : ""}>${v}</dd>`).join(""));
  // status
  const st = $("#engStatus"), outs = C.off[C.group].reduce((a, b) => a + b, 0);
  put(st, "class", "status" + (C.running ? (outs ? " warn" : " go") : ""));
  put(st, "text", C.running ? (outs ? `Firing · ${outs} out` : "Firing") : SHOW[curShow()]?.cabin ? "No engine here" : "Safed");
  // card readout (hover wins)
  const ro = $("#readout"), jph = SHOW[curShow()]?.journey && J_BY[C.sel];
  if (jph && !(C.hover && MODULES[C.hover])) {
    put(ro, "html", `${jph.i ? jph.label + " · GET " + jph.get : jph.name}<small>${jph.sub}</small>`);
  } else if (SHOW[curShow()]?.cabin && !(C.hover && MODULES[C.hover])) {
    put(ro, "html", `${MODULES[curShow()].name}<small>Hover any part to name it · click to zoom in · Take apart to open it up</small>`);
  } else if (C.hover && MODULES[C.hover]) {
    const M = MODULES[C.hover];
    put(ro, "html", `${M.name}<small>${M.kv.slice(0, 2).map(([a, b]) => `${a} ${b}`).join(" · ")}</small>`);
  } else {
    const code = { F1: "F-1", J2: "J-2", SPS: "SPS", DPS: "DPS", APS: "APS" }[G.eng];
    const head = `${code} × ${S.n || S.N} · ${C.running ? fmt(lbf) + " lbf" : "idle"}`;
    let sub = C.running ? `${fmtN(total)} · Isp ${fmt(S.isp, 1)} s` : (G.show ? "Safed" : G.eng === "F1" ? "Hold-down arms closed" : "Safed");
    if (C.running && G.eng === "F1" && tw !== null) sub += tw > 1 ? ` · T/W ${fmt(tw, 2)} · held down` : ` · T/W ${fmt(tw, 2)}`;
    put(ro, "html", `${head}<small>${sub}</small>`);
  }
  // cluster glow
  ENGINE_SETS[G.set].forEach((e, i) => { const c = document.querySelector(`#cluster .eng-g[data-i="${i}"] .glow`); if (c) put(c, "@opacity", ((e.fx.userData.thrust || 0) * 0.85).toFixed(2)); });
};

function tickLineup(S) {
  const set = ENGINE_SETS.xALL;
  // each engine's displayed thrust follows its own start transient and tail-off
  const per = S.eng.map((s, i) => s.per * clamp((set[i].fx.userData.thrust || 0) / Math.max(s.t, 1e-6), 0, 1));
  const total = per.reduce((a, b) => a + b, 0), lbf = total * N2LBF, ref = S.eng.reduce((a, s) => a + s.full, 0);
  const lit = per.map((p) => p > 1e-3), nLit = lit.filter(Boolean).length;
  put($("#thrustBig"), "html", `${fmt(lbf)}<small>lbf</small>`);
  put($("#thrustSub"), "text", `${fmtN(total)} · ${S.n} of ${S.N} engines lit`);
  const bar = $("#twBar");
  put(bar.querySelector("b"), "width", `${ref > 0 ? clamp(total / ref, 0, 1) * 100 : 0}%`);
  put(bar.querySelector("em"), "left", "calc(100% - 2px)");
  put($("#twMid"), "text", "share of the row's rated thrust");
  put($("#twMax"), "text", "100 %");
  const kv = S.eng.map((s, i) => [`${set[i].name} · ${PROP_SHORT[s.code]}`, per[i] > 1e-3 ? `${fmt(per[i] * N2LBF)} lbf · Isp ${fmt(s.isp, 1)} s` : "off"]);
  kv.push(["Ambient (F-1, J-2)", S.pa >= 1 ? `${fmt(S.pa, S.pa < 100 ? 1 : 0)} Pa · ${fmt((S.pa / P0) * 100, 2)} % SL` : S.pa > 0 ? `${S.pa.toFixed(3)} Pa` : "0 Pa (vacuum)"]);
  kv.push(["Propellant flow", `${fmt(S.eng.reduce((a, s, i) => a + (s.per > 0 ? s.mdotPer * per[i] / s.per : 0), 0))} kg/s`]);
  put($("#liveKV"), "html", kv.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(""));
  const st = $("#engStatus");
  put(st, "class", "status" + (C.running ? " go" : ""));
  put(st, "text", C.running ? `Firing · ${S.n} of ${S.N}` : "Safed");
  const ro = $("#readout");
  if (C.hover && MODULES[C.hover]) { const M = MODULES[C.hover]; put(ro, "html", `${M.name}<small>${M.kv.slice(0, 2).map(([a, b]) => `${a} ${b}`).join(" · ")}</small>`); }
  else put(ro, "html", `All engines · ${nLit ? fmt(lbf) + " lbf" : "idle"}<small>${nLit ? set.filter((_, i) => lit[i]).map((e) => e.name).join(" · ") + " · " + fmtN(total) : "Ignite all, or fire one engine from the row"}</small>`);
  set.forEach((e, i) => { const c = document.querySelector(`#cluster .eng-g[data-i="${i}"] .glow`); if (c) put(c, "@opacity", ((e.fx.userData.thrust || 0) * 0.9).toFixed(2)); });
}

function buildSheets() {
  const F1 = ENGINES.F1;
  $("#glance").innerHTML = [
    ["Height", "110.6 m", "363 ft 0.15 in to the escape-tower tip"],
    ["Liftoff mass", "2,938 t", "6,477,875 lb"],
    ["Liftoff thrust", "7.61 M lbf", "5 × 1,522,000 lbf · 33.86 MN rated"],
    ["S-IC propellant flow", "12,885 kg/s", "5 × (1,789 LOX + 788 RP-1)"],
    ["Payload to LEO", "117,934 kg", "260,000 lb"],
    ["Main engines", "14", "5 F-1 · 6 J-2 · SPS · DPS · APS"],
    ["Mission", "8 d 3 h 19 m", "195:18:35 ground elapsed"],
    ["Lunar samples", "21.55 kg", "47.5 lb in one 2 h 31 min EVA"],
  ].map(([s, b, sm]) => `<div><span>${s}</span><b>${b}</b><small>${sm}</small></div>`).join("");
  $("#specs").innerHTML = SPEC_ORDER.map((k) => {
    const M = MODULES[k];
    return `<article class="spec" data-mod="${k}"><header><h4>${M.name}</h4>${M.by ? `<span class="by">${M.by}</span>` : ""}</header><dl class="kv">${M.kv.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl></article>`;
  }).join("");
  const rows = [
    ["F-1", "S-IC", "5", fmt(F1.thrustSL), fmt(F1.thrustVac), "263 / 304", "70 bar", "2.27", "16", "RP-1 / LOX", "8,400 kg"],
    ["J-2", "S-II, S-IVB", "6", fmt(ENGINES.J2.thrustSL), fmt(ENGINES.J2.thrustVac), "200 / 421", "52.6 bar", "5.5", "27.5", "LH₂ / LOX", "1,788 kg"],
    ["AJ10-137 SPS", "Service Module", "1", "—", "20,500", "— / 314.5", "—", "—", "—", "A-50 / N₂O₄", "—"],
    ["LMDE (DPS)", "LM descent", "1", "—", "1,050–10,125", "— / 311", "—", "—", "—", "A-50 / N₂O₄", "—"],
    ["LMAE (APS)", "LM ascent", "1", "—", "3,500", "— / 311", "—", "—", "—", "A-50 / N₂O₄", "—"],
  ];
  $("#engTable").innerHTML = `<thead><tr><th>Engine</th><th>Where</th><th class="num">On AS-506</th><th class="num">Thrust SL, lbf</th><th class="num">Thrust vac, lbf</th><th class="num">Isp SL / vac, s</th><th class="num">Chamber</th><th class="num">Mixture</th><th class="num">Expansion</th><th>Propellants</th><th class="num">Dry mass</th></tr></thead><tbody>` +
    rows.map((r) => `<tr>${r.map((c, i) => `<td${[2, 3, 4, 5, 6, 7, 8, 10].includes(i) ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`).join("") + "</tbody>";
  const AeJ2 = (ENGINES.J2.thrustVac - ENGINES.J2.thrustSL) * LBF / P0;
  $("#math").innerHTML = [
    `<p>F(t, p<sub>a</sub>) = t · F<sub>vac</sub> − p<sub>a</sub> · A<sub>e</sub> <em>— momentum thrust scales with mass flow; the pressure term does not</em></p>`,
    `<p>A<sub>e</sub>(F-1) = (1,746,000 − 1,522,000) lbf × 4.44822 N/lbf ÷ 101,325 Pa = ${fmt(F1.Ae, 3)} m² <em>→ exit Ø ${fmt(F1.De, 2)} m</em></p>`,
    `<p>ṁ(F-1) = 1,789 kg/s LOX + 788 kg/s RP-1 = 2,577 kg/s <em>→ Isp from F and ṁ: ${fmt(engineThrustN("F1", 0) / (2577 * G0), 1)} s SL · ${fmt(engineThrustN("F1", 1e6) / (2577 * G0), 1)} s vac (rated 263 / 304 s)</em></p>`,
    `<p>T/W at liftoff = 5 × 6,770.3 kN ÷ (2,938,315 kg × 9.80665 m/s²) = ${fmt(5 * engineThrustN("F1", 0) / (VEHICLE.liftoffMass * G0), 3)}</p>`,
    `<p>J-2: linear in p<sub>a</sub> between ratings, slope ${fmt(AeJ2, 2)} m² · ṁ = F<sub>vac</sub> ÷ (421 s · g₀) = ${fmt(ENGINES.J2.thrustVac * LBF / (421 * G0), 1)} kg/s</p>`,
    `<p>Ambient pressure: U.S. Standard Atmosphere 1976, seven layers to 86 km; vacuum above.</p>`,
  ].join("");
  $("#crew").innerHTML = MISSION.crew.map(([n, r]) => `<div><b>${n}</b><span>${r}</span></div>`).join("") +
    `<div><b>Columbia</b><span>CSM-107</span></div><div><b>Eagle</b><span>LM-5</span></div>`;
  $("#missionKV").innerHTML = [
    ["Launch", MISSION.launch], ["Earth parking orbit", MISSION.parking], ["Lunar orbit", MISSION.lunarOrbit + " · 30 orbits"],
    ["Landing", MISSION.landing], ["Landing site", MISSION.site + " · Mare Tranquillitatis"], ["Moonwalk", MISSION.eva],
    ["Samples", MISSION.samples], ["Lunar liftoff", MISSION.liftoffMoon], ["Splashdown", MISSION.splash + " · 13°19′N 169°9′W"],
    ["Recovery", "USS Hornet"], ["Duration", MISSION.duration],
  ].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("");
  $("#recTable").innerHTML = `<thead><tr><th>GET</th><th>Event</th><th>Logged</th></tr></thead><tbody>` +
    EVENTS.map(([g, e, d]) => `<tr><td class="get">${g}</td><td>${e}</td><td class="get">${d}</td></tr>`).join("") + "</tbody>";
  $("#sources").innerHTML = SOURCES.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${t}</a></li>`).join("");
}
// Full sheet for the selected part, under the figure
let detailFor = null;
function renderDetail() {
  if (detailFor === C.sel) return;
  detailFor = C.sel;
  const it = MENU_ITEMS[C.sel], box = $("#detail");
  if (!it || C.sel === "whole") {
    box.innerHTML = `<div class="d-head"><h3>Selected · whole vehicle</h3><h2>Saturn V AS-506 with Apollo 11</h2><p>Three stages, an instrument ring and the Apollo spacecraft: 110.6 m from the F-1 exits to the escape-tower tip, 2,938,315 kg at liftoff. Pick a stage, engine or module in the index to frame it and read its sheet.</p></div>
      <div class="d-cols"><dl class="kv">${[["Height", "110.646 m · 363 ft"], ["Liftoff mass", "2,938,315 kg"], ["Liftoff thrust (rated)", "7,610,000 lbf"]].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>
      <dl class="kv">${[["Payload to LEO", "117,934 kg"], ["Engines", "5 F-1 · 6 J-2 · SPS · DPS · APS"], ["Stages", "S-IC · S-II · S-IVB"]].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl></div>`;
    return;
  }
  const keys = it.info || it.mods.filter((k) => MODULES[k]);
  const M = MODULES[keys[0]];
  let cols = "";
  for (const k of keys) {
    const m = MODULES[k];
    if (keys.length > 1) cols += `<h3>${m.name}</h3>`;
    const half = Math.ceil(m.kv.length / 2);
    cols += `<dl class="kv">${m.kv.slice(0, half).map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl><dl class="kv">${m.kv.slice(half).map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>`;
  }
  const engItem = it.group && !GROUPS[it.group].lineup;
  if (engItem) {
    const E = ENGINES[GROUPS[it.group].eng];
    const ekv = [["Engine", E.name], ["Maker", E.maker], ["Thrust (vac)", `${fmt(E.thrustVac)} lbf · ${fmt(E.thrustVac * LBF / 1000, 1)} kN`]];
    if (E.thrustSL) ekv.push(["Thrust (sea level)", `${fmt(E.thrustSL)} lbf`]);
    ekv.push(["Isp (vac)", `${E.ispVac} s`], ["Propellants", E.prop]);
    if (E.pc) ekv.push(["Chamber pressure", E.pc]);
    if (E.mr) ekv.push(["Mixture ratio", E.mr]);
    if (E.eps) ekv.push(["Expansion ratio", E.eps]);
    if (E.minThrust) ekv.push(["Throttle range", `${fmt(E.minThrust)}–${fmt(E.thrustVac)} lbf`]);
    const half = Math.ceil(ekv.length / 2);
    cols += `<h3>${E.name}</h3><dl class="kv">${ekv.slice(0, half).map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl><dl class="kv">${ekv.slice(half).map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>`;
  }
  const descs = keys.map((k) => MODULES[k].desc).filter(Boolean);
  box.innerHTML = `<div class="d-head"><h3>Selected · ${it.label}</h3><h2>${keys.length > 1 && !engItem ? it.label : M.name}</h2>${M.by ? `<span class="d-by">${M.by}</span>` : ""}${descs.map((d) => `<p>${d}</p>`).join("")}${engItem ? `<p>${ENGINES[GROUPS[it.group].eng].note} The throttle below now drives it.</p>` : ""}</div><div class="d-cols">${cols}</div>`;
}
function setHotSpec(key) {
  document.querySelectorAll(".spec.hot").forEach((e) => e.classList.remove("hot"));
  if (key) document.querySelector(`.spec[data-mod="${key}"]`)?.classList.add("hot");
}

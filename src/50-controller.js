// ============================================================================
// 50 · CONTROLLER — one fixed scene: the stack stays on the pad. The throttle,
// engine selection and engine-out toggles drive the exhaust and the live thrust.
// ============================================================================
const KEYS = ["launcher", "sicEngines", "sic", "siiInter", "siiEngines", "sii", "sivbInter", "sivbEngine", "sivb", "iu", "sla", "lm", "sm", "cm", "bpc", "les"];
// vertical take-apart offsets (m), chosen so every engine bell clears the part below it
const EXV = { sicEngines: 0, sic: 8, siiInter: 11, siiEngines: 14, sii: 17, sivbInter: 20, sivbEngine: 24, sivb: 26.5, iu: 28.5, sla: 30.5, sm: 32.5, cm: 35.5, bpc: 40, les: 42 };
const CAM_AZ = 40 * DEG, CAM_EL = 21 * DEG;
const SCREEN_RIGHT = V3(Math.cos(CAM_AZ), 0, -Math.sin(CAM_AZ));
const LM_APART = V3(0, ST.lm + EXV.sla + 1.8, 0).add(SCREEN_RIGHT.clone().multiplyScalar(13.5)).add(V3(0, 0, 1.5));

// engine groups the throttle can drive
const GROUPS = {
  F1: { set: "F1", eng: "F1", label: "S-IC", sub: "5 × F-1", apart: false, alt: 0, item: "f1", plume: { len: 17, sSL: 1.4, sVac: 6.5 } },
  J2II: { set: "J2II", eng: "J2", label: "S-II", sub: "5 × J-2", apart: true, alt: 67600, item: "j2ii", plume: { len: 9, sSL: 1.2, sVac: 7.0 } },
  J2IVB: { set: "J2IVB", eng: "J2", label: "S-IVB", sub: "1 × J-2", apart: true, alt: 185000, item: "j2ivb", plume: { len: 16, sSL: 1.2, sVac: 8.0 } },
  SPS: { set: "SPS", eng: "SPS", label: "Service Module", sub: "SPS", apart: true, alt: 1e6, item: "sps", plume: { len: 8, sSL: 3.0, sVac: 3.0 } },
  DPS: { set: "DPS", eng: "DPS", label: "LM descent", sub: "DPS", apart: true, alt: 1e6, item: "dps", plume: { len: 13, sSL: 3.2, sVac: 3.2 } },
  APS: { set: "APS", eng: "APS", label: "LM ascent", sub: "APS", apart: true, alt: 1e6, item: "aps", plume: { len: 2.2, sSL: 3.5, sVac: 3.5 } },
};
const C = {
  group: "F1", running: false, thr: 1.0, alt: 0, explode: false, exAmt: 0, sel: "whole",
  off: { F1: [0, 0, 0, 0, 0], J2II: [0, 0, 0, 0, 0], J2IVB: [0], SPS: [0], DPS: [0], APS: [0] },
  start: 0, t: 0, hover: null, sx: false, sxAmt: 0, csmLift: 0,
};
const START_SEQ = { F1: [0, 0.3, 0.3, 0.6, 0.6], J2II: [0, 0.12, 0.12, 0.24, 0.24] }; // F-1: centre first, then opposing pairs (1-2-2)

// ---------- physics of the selected group (all SI) ----------
const VAC_ENG = new Set(["SPS", "DPS", "APS"]);
function engState(code, thr, h) {   // one engine at throttle thr and altitude h; vacuum engines sit at their design point
  const E = ENGINES[code];
  const t = code === "DPS" ? dpsBand(thr) : thr;
  const pa = VAC_ENG.has(code) || h >= 1e6 ? 0 : pressureAt(h);
  // Momentum thrust scales with mass flow; the pressure term p_a·A_e does not.
  const Ae = code === "F1" ? E.Ae : code === "J2" ? (E.thrustVac - E.thrustSL) * LBF / P0 : 0;
  const per = Math.max(0, t * E.thrustVac * LBF - pa * Ae);
  const mdotPer = code === "F1" ? t * E.mdotSourced : (t * E.thrustVac * LBF) / (E.ispVac * G0);
  const isp = mdotPer > 0 ? per / (mdotPer * G0) : 0;
  return { E, t, pa, per, mdotPer, isp, Ae, full: Math.max(0, E.thrustVac * LBF - pa * Ae) };
}
function groupState() {
  const G = GROUPS[C.group], set = ENGINE_SETS[G.set], h = C.alt;
  if (G.lineup) {                    // "All engines": five different engines, each lit on its own
    const eng = set.map((e, i) => Object.assign(engState(e.eng, C.thr, h), { code: e.eng, lit: C.running && !C.off.xALL[i] }));
    const on = eng.filter((s) => s.lit);
    return { G, lineup: true, eng, h, pa: h >= 1e6 ? 0 : pressureAt(h), t: C.thr, n: on.length, N: set.length, total: on.reduce((a, s) => a + s.per, 0), mdot: on.reduce((a, s) => a + s.mdotPer, 0) };
  }
  const s = engState(G.eng, C.thr, h);
  const n = set.reduce((a, _, i) => a + (C.running && !C.off[C.group][i] ? 1 : 0), 0);
  return { G, E: s.E, t: s.t, h, pa: s.pa, n, N: set.length, per: s.per, total: s.per * n, mdot: s.mdotPer * n, mdotPer: s.mdotPer, isp: s.isp, Ae: s.Ae };
}
function dpsBand(t) { // valid DPS settings: 10–60 % continuously, or full thrust
  if (t < 0.10) return 0.10;
  if (t > 0.60 && t < 0.80) return 0.60;
  if (t >= 0.80) return 1.0;
  return t;
}

// ---------- FX that are not engines ----------
const XFX = { billows: [] };
const ENGINE_FX = new Set();
function registerEngineFX() { ENGINE_FX.clear(); for (const set of Object.values(ENGINE_SETS)) for (const e of set) ENGINE_FX.add(e.fx); }
function buildExtraFX() {
  for (const s of [-1, 1]) for (const i of [0, 1]) {
    const f = makeFX("STEAM", 1, { len: 22, r0: 14, rmax: 19, freq: 0.7, flow: 0.45, dens: 1.5, attack: 1.4, decay: 3.0 });
    f.position.set(i ? -4 : 4, 6, s * (26 + i * 9)); MODS.launcher.group.add(f); XFX.billows.push({ f, s, i });
  }
  XFX.padFire = makeFX("FIRE", 1, { len: 8, r0: 7.5, rmax: 8, freq: 1.0, flow: 3, dens: 1.6, attack: 0.5, decay: 1.5 });
  XFX.padFire.position.set(0, -12.5, 0); MODS.launcher.group.add(XFX.padFire);
  // flame and smoke rolling out over the deck around the base, as at every Saturn V ignition
  XFX.baseFire = makeFX("FIRE", 1, { len: 5.5, r0: 8.5, rmax: 9.5, freq: 1.1, flow: 2.2, dens: 1.2, attack: 1.2, decay: 1.8 });
  XFX.baseFire.position.set(0, 4.4, 0); MODS.launcher.group.add(XFX.baseFire);
  XFX.baseSmoke = makeFX("STEAM", 1, { len: 13, r0: 15, rmax: 19, freq: 0.75, flow: 0.8, dens: 1.25, attack: 1.8, decay: 2.8 });
  XFX.baseSmoke.position.set(0, 9.5, 0); MODS.launcher.group.add(XFX.baseSmoke);
}

// ---------- commands ----------
function ignite() {
  const sh = curShow(), G = GROUPS[C.group];
  if (C.running || SHOW[sh]?.cabin) return;
  if (sh && C.sx) { C.sx = false; CAM.user = false; }      // put the engine back together before firing it
  if (G.lineup) { C.off.xALL.fill(0); C.lstart.fill(C.t); } // Ignite all
  else if (!sh && G.apart && !C.explode) C.explode = true;  // engines inside an interstage need the stack opened up
  C.running = true; C.start = C.t;
  UI.sync?.();
}
function fireOne(i) {   // "All engines": light or cut one engine on its own
  const off = C.off.xALL;
  if (!C.running) { off.fill(1); off[i] = 0; C.lstart[i] = C.t; C.running = true; C.start = C.t; }
  else if (off[i]) { off[i] = 0; C.lstart[i] = C.t; }
  else { off[i] = 1; if (off.every(Boolean)) C.running = false; }
  UI.sync?.();
}
function shutdown() { C.running = false; UI.sync?.(); }
function selectGroup(key, fromItem) {
  if (key !== C.group) {
    C.running = false;
    C.group = key;
    const G = GROUPS[key];
    C.alt = G.alt;
    if (G.apart && (!fromItem || MENU_ITEMS[C.sel]?.apart)) C.explode = true;
    if (key === "DPS" && (C.thr > 0.6 && C.thr < 1)) C.thr = 0.6;
  }
  if (!fromItem) { C.sel = GROUPS[key].item; CAM.user = false; }
  UI.sync?.();
}
function selectItem(id) {
  const it = MENU_ITEMS[id]; if (!it) return;
  const prev = curShow(), next = it.show || null;
  if (prev !== next) {                                       // moving between the pad and a display: cut, don't pan
    CAM.snap = true; C.sx = false; C.sxAmt = 0; C.hover = null; setHotSpec?.(null);
    if (next) { CAM.az = SHOW[next].view?.az ?? CAM_AZ; CAM.el = SHOW[next].view?.el ?? CAM_EL; CAM.fly = null; }
  }
  C.sel = id; CAM.user = false;
  if (it.apart) C.explode = true;
  if (it.group) selectGroup(it.group, true);
  else if (GROUPS[C.group].show) selectGroup("F1", true);
  if (SHOW[next]?.cabin) shutdown();
  it.onSelect?.(prev);
  UI.sync?.();
}
function setExplode(on) {
  if (SHOW[curShow()]?.lineup) return;
  if (curShow()) { C.sx = on; CAM.user = false; if (on) C.running = false; UI.sync?.(); return; }
  C.explode = on; CAM.user = false;
  if (!on && GROUPS[C.group].apart) { C.running = false; C.group = "F1"; C.alt = 0; }
  if (!on && MENU_ITEMS[C.sel]?.apart) C.sel = "whole";
  UI.sync?.();
}

// ---------- per-frame ----------
function applyFrame(dt) {
  C.t += dt;
  const target = C.explode ? 1 : 0;
  C.exAmt += (target - C.exAmt) * (1 - Math.exp(-dt * (REDUCED ? 60 : 1.7)));
  if (Math.abs(C.exAmt - target) < 1e-3) C.exAmt = target;
  const ex = C.exAmt, exS = ease(ex);
  // with the SPS selected, Columbia backs off the adapter (as at separation) so its engine fires in the clear
  const liftT = C.group === "SPS" ? 1 : 0;
  C.csmLift += (liftT - C.csmLift) * (1 - Math.exp(-dt * (REDUCED ? 60 : 1.7)));
  if (Math.abs(C.csmLift - liftT) < 1e-3) C.csmLift = liftT;
  const lift = 7 * ease(C.csmLift) * exS;
  // stack poses
  for (const k of ["sicEngines", "sic", "siiInter", "siiEngines", "sii", "sivbInter", "sivbEngine", "sivb", "iu", "sla", "les"]) {
    const g = MODS[k].group; g.position.set(0, ST[k] + EXV[k] * exS + (k === "les" ? lift : 0), 0); g.quaternion.identity(); g.visible = true;
  }
  MODS.sm.group.position.set(0, ST.csm + EXV.sm * exS + lift, 0);
  MODS.cm.group.position.set(0, ST.csm + CSM_CM + EXV.cm * exS + lift, 0);
  MODS.bpc.group.position.set(0, ST.csm + CSM_CM + EXV.bpc * exS + lift, 0);
  // Eagle leaves the adapter: up through the open panels, then out to the side
  const lmUp = smooth(0.15, 0.6, ex), lmOut = smooth(0.45, 1, ex);
  const lmStack = V3(0, ST.lm, 0);
  const lmP = lmStack.clone().lerp(V3(0, LM_APART.y + 9, 0), lmUp);
  lmP.lerp(LM_APART, lmOut); if (lmOut > 0 && lmOut < 1) lmP.y += Math.sin(lmOut * Math.PI) * 3;
  MODS.lm.group.position.copy(lmP);
  MODS.lm.group.quaternion.setFromAxisAngle(UP, 0.7 * lmOut);
  MODS.launcher.group.visible = true;
  // sub-assemblies
  const petal = 0.75 * smooth(0, 0.35, ex);
  PETALS.forEach((pt) => { pt.pivot.quaternion.setFromAxisAngle(pt.axis, petal * 45 * DEG); pt.pivot.position.copy(pt.hinge); });
  setLegs(smooth(0.55, 1, ex));
  if (HGA) HGA.hinge.quaternion.setFromAxisAngle(HGA.axis, -smooth(0.3, 0.8, ex) * Math.PI / 2);
  ARMS.forEach((a, i) => { const sw = smooth(0, 0.4, ex); a.pivot.rotation.y = a.base - a.park - sw * (i === 8 ? 60 : 72) * DEG; });
  MODS.lmAscent.group.position.set(0, 1.78 + 2.4 * smooth(0.6, 1, ex), 0);
  // showroom: only the selected display is drawn; its assemblies separate along their own vectors
  const sh = curShow(), stackOn = !sh;
  const shown = SHOW[sh]?.roots || [SHOW[sh]?.group];
  for (const o of SCENE.children) o.visible = SHOW_ROOT.has(o) ? shown.includes(o) : stackOn;
  const sxT = C.sx ? 1 : 0;
  C.sxAmt += (sxT - C.sxAmt) * (1 - Math.exp(-dt * (REDUCED ? 60 : 1.9)));
  if (Math.abs(C.sxAmt - sxT) < 1e-3) C.sxAmt = sxT;
  if (sh) { const e = ease(C.sxAmt); for (const a of SHOW[sh].asm) a.group.position.copy(a.ex).multiplyScalar(e); }

  // engines
  const S = groupState(), G = S.G;
  for (const fx of ENGINE_FX) fx.userData.target = 0;
  if (G.lineup) {
    ENGINE_SETS.xALL.forEach((e, i) => {
      const s = S.eng[i];
      e.fx.userData.target = s.lit ? s.t * smooth(0, 0.9, C.t - C.lstart[i]) : 0;
      shapePlume(e.fx, GROUPS[e.g], s.pa, s.t);
    });
  } else {
    const seq = START_SEQ[G.set] || [];
    ENGINE_SETS[G.set].forEach((e, i) => {
      if (C.running && !C.off[C.group][i]) e.fx.userData.target = S.t * smooth(seq[i] || 0, (seq[i] || 0) + 0.9, C.t - C.start);
      shapePlume(e.fx, G, S.pa, S.t);
    });
  }
  for (const fx of FX_LIST) {
    const d = fx.userData, u = fx.material.uniforms;
    u.uTime.value += dt * (REDUCED ? 0 : 1);
    if (!ENGINE_FX.has(fx)) {
      const rate = d.target > d.level ? 1 / d.attack : 1 / d.decay;
      d.level += clamp(d.target - d.level, -rate * dt, rate * dt);
      u.uInt.value = d.level;
      continue;
    }
    // engine plume life cycle: flame front out of the bell → steady → cutoff tail blown downstream
    const vF = d.vFront || 2.2, vC = d.vCut || 1.25;
    if (d.target > 0.001) {
      if (!d.on || d.cut > 0) { d.on = true; d.front = d.cut > 0 ? 0 : 0; d.cut = 0; d.tCut = 0; if (d.level < 0.05) d.level = 0; }
      d.front = Math.min(1.7, d.front + dt * vF);
      d.level += clamp(d.target - d.level, -dt / 0.35, dt / 0.18);
      d.thrust = d.level * smooth(0, 0.9, d.front);
    } else if (d.on) {
      d.cut += dt * vC; d.tCut += dt;
      d.thrust = d.level * Math.exp(-d.tCut / 0.18);    // thrust tail-off after the valves close
      if (d.cut > 1.15) { d.on = false; d.level = 0; d.cut = 0; d.front = 0; d.thrust = 0; }
    } else d.thrust = 0;
    u.uInt.value = REDUCED ? (d.target > 0.001 ? d.target : 0) : (d.on ? d.level * (1 - smooth(0.45, 1.12, d.cut)) : 0);
    u.uFront.value = REDUCED ? 10 : d.front;
    u.uCut.value = REDUCED ? 0 : d.cut;
  }
  // pad: flame in the trench and steam billows while the F-1s run
  const f1 = ENGINE_SETS.F1.reduce((a, e) => a + (e.fx.userData.thrust || 0), 0) / 5;
  XFX.padFire.userData.target = f1;
  XFX.baseFire.userData.target = f1 * (C.exAmt < 0.5 ? 1 : 0.6);
  XFX.baseSmoke.userData.target = f1 * 0.8;
  XFX.baseSmoke.material.uniforms.uR0.value = 10 + 7 * XFX.baseSmoke.userData.level;
  XFX.billows.forEach((b) => { b.f.userData.target = f1; const L = b.f.userData.level; b.f.position.z = b.s * (24 + b.i * 10 + L * 8); b.f.material.uniforms.uR0.value = 8 + 9 * L; });
  for (const k in SHOW) if (SHOW[k].splash) SHOW[k].splash.userData.target = SHOW[k].fx.reduce((a, f) => a + (f.userData.thrust || 0), 0);
  frameCamera(dt);
}

// plume shape from ambient pressure and throttle: wider and shorter at altitude, longer with flow
function shapePlume(fx, G, pa, t) {
  const u = fx.material.uniforms, pr = pa / P0;
  u.uSpread.value = lerp(G.plume.sVac, G.plume.sSL, Math.sqrt(pr));
  u.uLen.value = G.plume.len * (0.55 + 0.45 * Math.sqrt(Math.max(t, 0.1)));
  u.uDens.value = (G.show ? fx.userData.dens0 : G.eng === "F1" ? 2.2 : G.eng === "J2" ? 0.7 : 1.0) * (0.45 + 0.55 * t);
  if (G.eng === "J2") u.uDens.value *= lerp(1.6, 1, Math.sqrt(1 - pr));
}

// ---------- camera: fixed angle, framed per focus ----------
const CAM = { target: V3(-6, 52, 5), h: 156, az: CAM_AZ, el: CAM_EL, user: false, free: false, fly: null, keys: new Set(), dragMode: "orbit" };
const _bx = new THREE.Box3(), _bt = new THREE.Box3();
function boxOf(keys) {
  _bx.makeEmpty();
  for (const k of keys) for (const m of MODS[k].meshes) {
    if (!isShown(m)) continue;
    m.updateWorldMatrix(true, false);
    if (m.isInstancedMesh) _bt.setFromObject(m);
    else { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); _bt.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); }
    _bx.union(_bt);
  }
  return _bx;
}
const CAM_DIR = V3(), CAM_RIGHT = V3(), CAM_UP = V3();
function camBasis() {   // camera sits along CAM_DIR from the target; right / up span the picture plane
  CAM_DIR.set(Math.sin(CAM.az) * Math.cos(CAM.el), Math.sin(CAM.el), Math.cos(CAM.az) * Math.cos(CAM.el));
  CAM_RIGHT.crossVectors(UP, CAM_DIR).normalize(); CAM_UP.crossVectors(CAM_DIR, CAM_RIGHT).normalize();
}
function focusFrame() {
  const ex = ease(C.exAmt);
  if (C.sel === "whole" || !MENU_ITEMS[C.sel]) return { c: V3(-6, 52, 5).lerp(V3(-1, 68, 3), ex), h: lerp(156, 178, ex) };
  const it = MENU_ITEMS[C.sel];
  if (it.jv && J.built) {                     // the journey map frames a region, not parts
    const f = journeyFrameBox(it.jv), aspect = PIPE.w / PIPE.h;
    return { c: f.c.clone().add(J_ORIGIN), h: Math.max(f.h, f.w / aspect) * 1.12 };
  }
  const b = boxOf(it.frame || it.mods);
  if (b.isEmpty()) return { c: CAM.target.clone(), h: CAM.h };
  if (it.below) b.min.y -= it.below;          // room for the plumes under the row
  if (it.belowFiring && C.running && it.group === C.group) b.min.y -= it.belowFiring;   // and under a firing engine
  const c = b.getCenter(V3());
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    const p = V3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).sub(c);
    const x = p.dot(CAM_RIGHT), y = p.dot(CAM_UP);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const aspect = PIPE.w / PIPE.h;
  const h = Math.max(it.show ? 1.2 : 7, Math.max(y1 - y0, (x1 - x0) / aspect) * (it.show ? 1.3 : 1.42));
  c.addScaledVector(CAM_RIGHT, (x0 + x1) / 2).addScaledVector(CAM_UP, (y0 + y1) / 2 - h * 0.02);
  return { c, h };
}
// continuous keyboard flight: speed scales with how much of the vehicle is in view
function flyStep(dt) {
  const K = CAM.keys; if (!K.size) return;
  camBasis();
  const fast = K.has("shift") ? 3 : 1, v = CAM.h * 0.6 * dt * fast;
  if (K.has("a")) CAM.target.addScaledVector(CAM_RIGHT, -v);
  if (K.has("d")) CAM.target.addScaledVector(CAM_RIGHT, v);
  if (K.has("q")) CAM.target.y -= v;
  if (K.has("e")) CAM.target.y += v;
  if (K.has("w")) CAM.h = clamp(CAM.h * Math.exp(-1.2 * dt * fast), 2.5, 420);
  if (K.has("s")) CAM.h = clamp(CAM.h * Math.exp(1.2 * dt * fast), 2.5, 420);
  if (K.has("arrowleft")) CAM.az -= 1.3 * dt * fast;
  if (K.has("arrowright")) CAM.az += 1.3 * dt * fast;
  if (K.has("arrowup")) CAM.el = clamp(CAM.el + 0.9 * dt * fast, -0.15, 1.45);
  if (K.has("arrowdown")) CAM.el = clamp(CAM.el - 0.9 * dt * fast, -0.15, 1.45);
  CAM.user = true; CAM.fly = null;
}
function frameCamera(dt) {
  flyStep(dt);
  camBasis();
  if (CAM.snap) { const f = focusFrame(); CAM.target.copy(f.c); CAM.h = f.h; CAM.snap = false; return; }
  if (CAM.user) return;                       // the viewer is flying: leave the camera where they put it
  const f = focusFrame(), k = 1 - Math.exp(-dt * (REDUCED ? 60 : 2.6));
  CAM.target.lerp(f.c, k);
  CAM.h = lerp(CAM.h, f.h, k);
  if (CAM.fly) {                              // ease the view angle back to the drawing's default on reset
    CAM.az = lerp(CAM.az, CAM.fly.az, k); CAM.el = lerp(CAM.el, CAM.fly.el, k);
    if (Math.abs(CAM.az - CAM.fly.az) + Math.abs(CAM.el - CAM.fly.el) < 1e-4) CAM.fly = null;
  }
}
function resetView() { const v = SHOW[curShow()]?.view; CAM.user = false; CAM.fly = { az: v?.az ?? CAM_AZ, el: v?.el ?? CAM_EL }; UI.sync?.(); }
function zoomBy(f, ndc) { // f < 1 zooms in; keeps the point under the cursor fixed
  camBasis();
  const h0 = CAM.h, h1 = clamp(h0 * f, 2.5, 420), aspect = PIPE.w / PIPE.h;
  if (ndc) { const ox = ndc.x * (h0 / 2) * aspect, oy = ndc.y * (h0 / 2), s = 1 - h1 / h0; CAM.target.addScaledVector(CAM_RIGHT, ox * s).addScaledVector(CAM_UP, oy * s); }
  CAM.h = h1; CAM.user = true; CAM.fly = null; UI.sync?.();
}
function orbitBy(dx, dy) { CAM.az -= dx * 0.006; CAM.el = clamp(CAM.el + dy * 0.005, -0.15, 1.45); CAM.user = true; CAM.fly = null; }
function panBy(dx, dy) { camBasis(); const wpp = CAM.h / PIPE.h; CAM.target.addScaledVector(CAM_RIGHT, -dx * wpp).addScaledVector(CAM_UP, dy * wpp); CAM.user = true; CAM.fly = null; }

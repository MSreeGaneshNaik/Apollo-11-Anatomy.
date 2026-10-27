// ============================================================================
// 41 · SPACECRAFT — IU, SLA, LM-5 Eagle, CSM-107 Columbia, LES; Moon, sea, chutes, museum display
// ============================================================================
const slaR = (y) => R3 - (R3 - RSM) * (y / 8.53);
const LEGS = [];   // { group, strut, pad, rods, dir }
const PETALS = [];
const RCS_FX = []; // { fx, mod }
let HGA = null;
const FX_EXTRA = {};

function buildSpaceTextures() {
  T.iu = TEX(2048, 128, (P) => { for (let i = 0; i < 6; i++) P.vline(i / 6, 0.9, 3); for (let i = 0; i < 48; i++) P.rect(i / 48 + 0.004, 0.22, 1 / 48 - 0.008, 0.56, 0.32, 2); P.hline(0.06, 0.8, 3); P.hline(0.94, 0.8, 3); });
  T.sla = TEX(1024, 1024, (P) => {
    P.vline(0.004, 0.9, 4); P.vline(0.996, 0.9, 4);
    for (const u of [0.02, 0.98]) for (let v = 0.02; v < 1; v += 0.025) P.dot(u, v, 2, 0.5);
    for (const v of [0.33, 0.66]) { P.hline(v, 0.25, 2); P.rivets(v + 0.01, 60, 0.35, 1.6); }
    P.rect(0.44, 0.05, 0.12, 0.05, 0.6, 2);
  });
  T.slaLow = TEX(2048, 256, (P) => { for (let i = 0; i < 4; i++) P.vline(i / 4 + 0.125, 0.8, 3); P.rivets(0.9, 240, 0.45, 1.5); P.rivets(0.1, 240, 0.45, 1.5); });
  T.sm = TEX(2048, 512, (P) => {
    const seams = [0, 50, 120, 180, 230, 300];
    for (const d of seams) { P.vline(d / 360, 0.85, 3, 0, 0.905); for (let v = 0.04; v < 0.9; v += 0.035) { P.dot(d / 360 + 0.004, v, 1.5, 0.45); P.dot(d / 360 - 0.004, v, 1.5, 0.45); } }
    for (const [u0, u1] of [[60 / 360, 112 / 360], [240 / 360, 292 / 360]]) {                 // ECS radiator panels
      P.alt(u0, 0.12, u1 - u0, 0.7, 0.55);
      for (let v = 0.14; v < 0.82; v += 0.028) P.hline(v, 0.32, 1.4, u0, u1);
      P.rect(u0, 0.12, u1 - u0, 0.7, 0.8, 2);
    }
    P.hline(0.905, 0.9, 3);
    for (let i = 0; i < 8; i++) { const u = i / 8 + 0.02; P.alt(u, 0.925, 0.085, 0.06, 0.6); P.rect(u, 0.925, 0.085, 0.06, 0.7, 2); }   // EPS radiators on the fairing
    P.rect(0.43, 0.3, 0.03, 0.08, 0.6, 2); P.rect(0.9, 0.55, 0.025, 0.07, 0.6, 2);
  });
  T.cm = TEX(1024, 512, (P) => {
    for (let v = 0.04; v < 1; v += 0.045) P.hline(v, 0.09, 1.2);                               // reflective tape lanes
    P.rect(0.955, 0.2, 0.09, 0.42, 0.9, 3); P.rect(-0.045, 0.2, 0.09, 0.42, 0.9, 3);            // unified crew hatch (wraps u = 0)
    P.alt(0.985, 0.42, 0.03, 0.09, 1); P.alt(-0.015, 0.42, 0.03, 0.09, 1);                     // hatch window
    for (const u of [0.17, 0.83]) { P.alt(u - 0.022, 0.38, 0.044, 0.14, 1); P.rect(u - 0.026, 0.37, 0.052, 0.16, 0.8, 2); }  // side windows
    for (const s of [-1, 1]) P.poly([[0.065 * s + (s < 0 ? 1 : 0), 0.66], [0.11 * s + (s < 0 ? 1 : 0), 0.66], [0.088 * s + (s < 0 ? 1 : 0), 0.8]], "alt", 1);  // rendezvous windows
    for (const u of [0.125, 0.375, 0.625, 0.875]) { P.dot(u - 0.012, 0.12, 4, 0.9); P.dot(u + 0.012, 0.12, 4, 0.9); }       // roll thruster pairs
    for (const u of [0.25, 0.5, 0.75]) { P.dot(u, 0.88, 4, 0.9); P.dot(u + 0.02, 0.88, 4, 0.9); }                            // pitch / yaw thrusters
    P.rect(0.33, 0.55, 0.05, 0.08, 0.6, 2);                                                     // optics / sextant door
  });
  T.heat = TEX(1024, 512, (P) => { for (let i = 0; i < 48; i++) P.vline(i / 48, 0.18, 1.2); for (let v = 0.05; v < 1; v += 0.06) P.hline(v, 0.2, 1.2); });
  T.bpc = TEX(1024, 512, (P) => { for (let i = 0; i < 4; i++) { P.vline(i / 4 + 0.125, 0.8, 3); for (let v = 0.03; v < 1; v += 0.04) P.dot(i / 4 + 0.13, v, 1.6, 0.45); } P.circle(0.0, 0.42, 9, "alt", 1); P.circle(1.0, 0.42, 9, "alt", 1); P.ring(0, 0.42, 12, 0.9, 2); P.ring(1, 0.42, 12, 0.9, 2); P.rivets(0.03, 120, 0.5, 1.5); });
  T.lmFoil = TEX(1024, 512, (P) => {
    const rnd = mulberry(7);
    P.paint(0, 0, 1, 0.13);
    for (let i = 0; i < 520; i++) { const u = rnd(), v = 0.14 + rnd() * 0.84, l = 0.01 + rnd() * 0.03, a = rnd() * TAU; P.polyline([[u, v], [u + Math.cos(a) * l * 0.5, v + Math.sin(a) * l]], 0.22, 1.3); }
    for (let i = 0; i < 8; i++) P.vline(i / 8, 0.5, 2.5, 0.13, 1);
    P.hline(0.14, 0.7, 2.5); P.hline(0.97, 0.6, 2);
  });
  T.lmAsc = TEX(1024, 512, (P) => {
    const rnd = mulberry(3);
    for (let i = 0; i < 26; i++) { const u = Math.floor(rnd() * 12) / 12, v = Math.floor(rnd() * 6) / 6; if (rnd() < 0.42) P.paint(u, v, 1 / 12, 1 / 6, 1); P.rect(u, v, 1 / 12, 1 / 6, 0.55, 2); }
    for (let v = 0.02; v < 1; v += 1 / 6) for (let u = 0.01; u < 1; u += 0.02) P.dot(u, v, 1.3, 0.35);
  });
  T.dish = TEX(256, 256, (P) => { for (let i = 0; i < 12; i++) P.vline(i / 12, 0.4, 1.5); P.hline(0.5, 0.4, 1.5); });
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- IU + SLA ----------
function buildIU() {
  mod("iu");
  within("iu", (g) => {
    add(g, turn([[R3, 0], [R3, 0.914]], { seg: 128 }), "white", { map: T.iu, side: DS });
    for (const y of [0.02, 0.894]) add(g, torusGeo(R3, 0.05, 128), "light", { p: [0, y, 0] });
    const boxes = [];
    for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU, p = polar(R3 - 0.32, a); boxes.push(new THREE.Matrix4().compose(V3(p.x, 0.45, p.z), new THREE.Quaternion().setFromAxisAngle(UP, a), V3(0.7, 0.55, 0.4))); }
    lattice(g, boxes, "grey");
    add(g, torusGeo(R3 - 0.12, 0.04, 96), "dark", { p: [0, 0.82, 0] });   // cable tray
  });
}
function buildSLA() {
  mod("sla");
  within("sla", (g) => {
    add(g, turn([[R3, 0], [slaR(2.13), 2.13]], { seg: 128 }), "white", { map: T.slaLow, side: DS });
    add(g, torusGeo(R3, 0.05, 128), "light", { p: [0, 0.03, 0] });
    add(g, torusGeo(slaR(2.13), 0.06, 128), "light", { p: [0, 2.13, 0] });
    // LM support struts to the outrigger ends
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      for (const s of [-1, 1]) add(g, rodGeo(polar(slaR(0.5) - 0.12, a + s * 0.22, 0.5), polar(2.33, a, ST.lm - ST.sla + 1.45), 0.05, 8), "grey");
    }
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      const hinge = polar(slaR(2.13), a, 2.13);
      const pivot = new THREE.Group(); pivot.position.copy(hinge); g.add(pivot);
      const geo = turn([[slaR(2.13), 2.13], [RSM, 8.53]], { seg: 40, phi0: a - Math.PI / 4 + 0.004, phi: Math.PI / 2 - 0.008 });
      geo.translate(-hinge.x, -hinge.y, -hinge.z);
      add(pivot, geo, "white", { map: T.sla, side: DS });
      const edge = turn([[RSM + 0.03, 8.48], [RSM + 0.03, 8.53]], { seg: 24, phi0: a - Math.PI / 4, phi: Math.PI / 2 }); edge.translate(-hinge.x, -hinge.y, -hinge.z);
      add(pivot, edge, "light", { side: DS });
      PETALS.push({ pivot, axis: V3(Math.cos(a), 0, -Math.sin(a)), out: polar(1, a), hinge: hinge.clone(), spin: (k % 2 ? 1 : -1) });
    }
  });
}

// ---------- LM-5 Eagle ----------
const LM_A = 2.11, LM_C = 0.82;   // descent-stage half-width and corner cut
// ---------- CSM-107 Columbia ----------
function buildCSM() {
  mod("sm");
  within("sm", (g) => {
    add(g, turn([[0, 0], [RSM, 0], [RSM, 3.94], [RSM - 0.03, 3.98], [RSM - 0.03, CSM_CM], [0, CSM_CM]], { seg: 128, vy: [0, CSM_CM] }), "white", { map: T.sm, alt: "lo" });
    add(g, torusGeo(RSM, 0.04, 128), "light", { p: [0, 0.03, 0] });
    // SPS nozzle: ablative chamber (upper) → columbium → titanium extension
    add(g, turn([[0.42, 0.05], [0.3, -0.35, 1], [0.55, -0.78, 1], [0.8, -1.3, 1], [0.99, -1.85, 1], [1.13, -2.35, 1], [1.25, -2.85]], { seg: 64 }), "metal", { side: DS });
    for (const [y, r] of [[-1.05, 0.69], [-2.0, 1.05]]) add(g, torusGeo(r + 0.025, 0.035, 64), "light", { p: [0, y, 0] });
    add(g, turn([[1.25, -2.85], [1.29, -2.82], [1.29, -2.76], [1.22, -2.74]], { seg: 64 }), "light");
    add(g, turn([[0.6, 0.0], [0.6, -0.08], [0.42, -0.15]], { seg: 40 }), "grey");
    for (const ang of [0.6, 2.1]) { const a = polar(1.05, ang, -0.02), b = polar(0.5, ang + 0.2, -0.62), m = a.clone().lerp(b, 0.5); add(g, rodGeo(a, m, 0.06), "grey"); add(g, rodGeo(m, b, 0.035), "light"); }
    const sps = makeFX("HYP", 0, { len: 22, r0: 1.15, spread: 3.0, pow: 0.6, rmax: 5.0, freq: 0.8, flow: 18, dens: 0.9, hot: 6, attack: 0.3, decay: 0.7 });
    sps.position.y = -2.85; g.add(sps);
    ENGINE_SETS.SPS = [{ group: g, fx: sps, name: "SPS", on: true }];
    // RCS quads (four R-4D each), 7°15′ off the axes
    for (let k = 0; k < 4; k++) {
      const a = 7.25 * DEG + k * Math.PI / 2, dir = polar(1, a), tan = V3(dir.z, 0, -dir.x), q = new THREE.Quaternion().setFromAxisAngle(UP, a);
      const c = dir.clone().multiplyScalar(RSM + 0.12).add(V3(0, 2.78, 0));
      add(g, boxGeo(0.58, 0.95, 0.24), "light", { p: c.toArray(), q });
      add(g, boxGeo(0.7, 1.1, 0.03), "grey", { p: dir.clone().multiplyScalar(RSM + 0.01).add(V3(0, 2.78, 0)).toArray(), q });
      for (const d of [V3(0, 1, 0), V3(0, -1, 0), tan, tan.clone().negate()]) {
        const p = c.clone().add(d.clone().multiplyScalar(d.y ? 0.47 : 0.29));
        add(g, turn([[0, 0], [0.045, 0], [0.075, 0.26], [0, 0.26]], { seg: 12 }), "dark", { p: p.toArray(), q: new THREE.Quaternion().setFromUnitVectors(UP, d) });
        if (d.y) { const fx = makeFX("RCS", 0, { len: 3.2, r0: 0.07, spread: 9, pow: 0.5, rmax: 0.9, freq: 2, flow: 6, dens: 2.2, hot: 4, attack: 0.08, decay: 0.3 }); fx.position.copy(p.clone().add(d.clone().multiplyScalar(0.26))); fx.quaternion.setFromUnitVectors(V3(0, -1, 0), d); g.add(fx); RCS_FX.push({ fx, up: d.y > 0 }); }
      }
    }
    // scimitar VHF antennas
    for (const a of [Math.PI / 2 + 0.3, 3 * Math.PI / 2 + 0.3]) {
      const arc = new THREE.TorusGeometry(0.42, 0.028, 6, 32, Math.PI);
      const m = add(g, arc, "light");
      const c = polar(RSM, a, 3.45);
      m.position.copy(c); m.rotation.set(0, a - Math.PI / 2, -Math.PI / 2);
    }
    add(g, boxGeo(0.34, 0.5, 0.2), "grey", { p: polar(RSM + 0.06, 2.8, 4.1).toArray(), r: [0, 2.8, 0] });         // CM/SM umbilical fairing
    // high-gain antenna on its deploy hinge
    const ha = 225 * DEG, hdir = polar(1, ha);
    const hinge = new THREE.Group(); hinge.position.copy(polar(RSM - 0.1, ha, 0.0)); g.add(hinge);
    add(hinge, boxGeo(0.22, 0.14, 0.22), "grey");
    const boom = new THREE.Group(); hinge.add(boom);
    add(boom, rodGeo(V3(0, 0, 0), V3(0, -1.35, 0), 0.05, 8), "light");
    const arr = new THREE.Group(); arr.position.set(0, -1.75, 0); boom.add(arr);
    arr.quaternion.setFromUnitVectors(UP, hdir.clone());
    add(arr, boxGeo(0.28, 0.06, 0.28), "light");
    for (const [x, z] of [[0.45, 0.45], [-0.45, 0.45], [0.45, -0.45], [-0.45, -0.45]]) add(arr, turn([[0, 0], [0.24, 0.03, 1], [0.394, 0.1]], { seg: 32 }), "white", { p: [x, 0.02, z], side: DS, map: T.dish });
    add(arr, boxGeo(1.0, 0.05, 0.05), "grey"); add(arr, boxGeo(0.05, 0.05, 1.0), "grey");
    HGA = { hinge, boom, axis: V3(hdir.z, 0, -hdir.x) };
  });
  mod("cm");
  within("cm", (g) => {
    add(g, turn([[0, -0.18], [0.9, -0.15, 1], [1.5, -0.08, 1], [1.86, 0.0, 1], [1.955, 0.08, 1], [1.95, 0.2, 1], [1.9, 0.28]], { seg: 128 }), "light", { map: T.heat });
    add(g, turn([[1.9, 0.28], [0.62, 2.36], [0.56, 2.46, 1], [0.46, 2.66, 1], [0.42, 2.78], [0.42, 2.98], [0.36, 3.0], [0, 3.0]], { seg: 128, vy: [0.28, 2.36] }), "white", { map: T.cm, alt: "glass" });
    for (let i = 0; i < 12; i++) { const p = polar(0.45, (i / 12) * TAU, 2.93); add(g, boxGeo(0.08, 0.08, 0.06), "grey", { p: p.toArray(), r: [0, (i / 12) * TAU, 0] }); }
    // docking probe
    for (let i = 0; i < 3; i++) add(g, rodGeo(polar(0.32, (i / 3) * TAU, 3.0), V3(0, 3.22, 0), 0.025, 6), "grey");
    add(g, rodGeo(V3(0, 3.0, 0), V3(0, 3.42, 0), 0.06, 10), "light");
    add(g, turn([[0, 3.42], [0.09, 3.42], [0.07, 3.48], [0, 3.5]], { seg: 16 }), "metal");
    for (let i = 0; i < 3; i++) add(g, boxGeo(0.03, 0.08, 0.05), "dark", { p: polar(0.09, (i / 3) * TAU + 0.5, 3.44).toArray() });
    for (const s of [-1, 1]) add(g, rodGeo(polar(1.45, 0.16 * s, 0.75), polar(1.12, 0.2 * s, 1.35), 0.02, 6), "grey");   // handholds
  });
  mod("bpc");
  within("bpc", (g) => {
    add(g, turn([[2.0, 0.0], [2.0, 0.14, 1], [1.94, 0.26], [0.66, 2.4], [0.6, 2.55, 1], [0.48, 2.76], [0.48, 2.96], [0, 2.98]], { seg: 128, vy: [0.26, 2.4] }), "white", { map: T.bpc, alt: "glass", side: DS });
  });
  mod("les");
  within("les", (g) => {
    const b = 0.61, t = 0.457, H = 3.05, mem = [];
    const C = (h, y) => [[h, h], [-h, h], [-h, -h], [h, -h]].map(([x, z]) => V3(x, y, z));
    const lv = [0, 1.0, 2.05, H].map((y) => C(lerp(b, t, y / H), y));
    for (let c = 0; c < 4; c++) add(g, rodGeo(lv[0][c], lv[3][c], 0.06, 8), "light");
    for (let i = 0; i < 4; i++) for (let c = 0; c < 4; c++) add(g, rodGeo(lv[i][c], lv[i][(c + 1) % 4], 0.035, 6), "light");
    for (let i = 0; i < 3; i++) for (let c = 0; c < 4; c++) { add(g, rodGeo(lv[i][c], lv[i + 1][(c + 1) % 4], 0.025, 6), "grey"); add(g, rodGeo(lv[i][(c + 1) % 4], lv[i + 1][c], 0.025, 6), "grey"); }
    for (const p of lv[0]) add(g, boxGeo(0.16, 0.12, 0.16, p.x, 0.02, p.z), "dark");
    add(g, turn([[0.62, 3.05], [0.64, 3.1], [0.36, 3.55]], { seg: 48 }), "light", { side: DS });
    add(g, turn([[0.36, 3.55], [0.33, 3.62], [0.33, 7.95], [0.335, 7.95], [0.335, 9.32], [0.26, 9.72], [0.2, 9.85, 1], [0.1, 9.98, 1], [0, 10.06]], { seg: 48 }), "white");
    for (const y of [5.2, 6.6, 7.95]) add(g, torusGeo(0.335, 0.02, 40), "grey", { p: [0, y, 0] });
    for (let k = 0; k < 4; k++) {                                                                                   // launch escape motor nozzles
      const a = 45 * DEG + k * 90 * DEG, d = polar(Math.sin(35 * DEG), a).add(V3(0, -Math.cos(35 * DEG), 0)).normalize();
      add(g, turn([[0, 0], [0.07, 0], [0.13, 0.34], [0, 0.34]], { seg: 14 }), "dark", { p: polar(0.24, a, 3.7).toArray(), q: new THREE.Quaternion().setFromUnitVectors(UP, d) });
    }
    FX_EXTRA.tjm = [];
    for (const [a, s] of [[0, 1], [Math.PI, 0.7]]) {                                                               // tower jettison motor nozzles
      const d = polar(Math.sin(30 * DEG), a).add(V3(0, -Math.cos(30 * DEG), 0)).normalize(), p = polar(0.3, a, 8.05);
      add(g, turn([[0, 0], [0.06 * s, 0], [0.11 * s, 0.28 * s], [0, 0.28 * s]], { seg: 14 }), "dark", { p: p.toArray(), q: new THREE.Quaternion().setFromUnitVectors(UP, d) });
      const fx = makeFX("FIRE", 0, { len: 9, r0: 0.12, spread: 6, pow: 0.6, rmax: 1.6, freq: 1.3, flow: 26, dens: 3, hot: 5, attack: 0.08, decay: 0.5 });
      fx.position.copy(p.clone().add(d.clone().multiplyScalar(0.28 * s))); fx.quaternion.setFromUnitVectors(V3(0, -1, 0), d); g.add(fx);
      FX_EXTRA.tjm.push(fx);
    }
    add(g, turn([[0, 0], [0.04, 0], [0.07, 0.16], [0, 0.16]], { seg: 10 }), "dark", { p: [0.29, 9.45, 0], r: [0, 0, -Math.PI / 2] });   // pitch control motor
    for (const a of [Math.PI / 2, -Math.PI / 2]) add(g, turn([[0.345, 9.36], [0.275, 9.7]], { seg: 16, phi0: a - 0.9, phi: 1.8 }), "light", { side: DS });   // canards (stowed)
    const ports = []; for (let i = 0; i < 4; i++) ports.push(polar(0.12, i * Math.PI / 2 + 0.4, 9.95));
    for (const p of ports) add(g, sphereGeo(0.018, p.x, p.y, p.z, 8, 6), "dark");
  });
}


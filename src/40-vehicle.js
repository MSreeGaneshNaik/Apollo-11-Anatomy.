// ============================================================================
// 40 · LAUNCH VEHICLE — pad, umbilical tower, S-IC, S-II, S-IVB and engines.
// World units are metres, y up. Stack stations are measured from the F-1 exit plane.
// ============================================================================
const DS = THREE.DoubleSide;
const R1 = 10.089 / 2;           // S-IC / S-II radius
const R3 = 6.604 / 2;            // S-IVB / IU radius
const RSM = 3.91 / 2;            // CSM radius
const ST = {                      // station of each module's local origin (vehicle frame)
  sicEngines: 0, sic: 4.4, siiInter: 42.1, siiEngines: 46.6, sii: 47.7, sivbInter: 66.9, sivbEngine: 69.2,
  sivb: 72.0, iu: 84.8, sla: 85.71, lm: 86.15, csm: 94.24, les: 100.58,
};
const CSM_CM = 4.34;              // CM origin in the CSM frame (top of SM fairing)
const DECK_Y = -0.6;              // mobile launcher deck top
const TOWER = { x: -19, z: 10, half: 6.1, top: 115.2 };
const OUTER_F1 = 4.45;            // outboard F-1 radial station

// ---------- textures ----------
function stripesTex(cols, a = 0.45, lw = 1.4, w = 1024, h = 512, extra) {
  return TEX(w, h, (P) => { for (let i = 0; i < cols; i++) P.vline((i + 0.5) / cols, a, lw); if (extra) extra(P); });
}
const T = {};
function buildTextures() {
  T.f1Tubes = stripesTex(178, 0.55, 1.6, 2048, 256, (P) => { for (const v of [0.18, 0.42, 0.66, 0.86]) P.hline(v, 0.25, 2); });
  T.j2Tubes = stripesTex(180, 0.5, 1.6, 2048, 256);
  // S-IC skin: v spans the 37.7 m body. Roll pattern: four black stripes over the lower third,
  // alternating sectors on the intertank and the forward skirt.
  T.sic = TEX(2048, 2048, (P) => {
    const sec = (v0, v1, n, off) => { for (let i = 0; i < n; i += 2) P.paint(((i + off) / n) % 1, v0, 1 / n, v1 - v0); };
    for (let k = 0; k < 4; k++) P.paint(k / 4 - 1 / 16 + (k === 0 ? 1 : 0), 0.0, 1 / 8, 0.36), P.paint(k / 4 - 1 / 16, 0.0, 1 / 8, 0.36);
    sec(0.485, 0.60, 8, 0); sec(0.905, 1.0, 8, 1);
    for (const v of [0.162, 0.48, 0.60, 0.905]) { P.hline(v, 0.9, 3); P.rivets(v + 0.006, 220, 0.45, 1.6); P.rivets(v - 0.006, 220, 0.45, 1.6); }
    for (let i = 0; i < 144; i++) P.vline(i / 144, 0.32, 1.4, 0.485, 0.60);   // intertank corrugations
    for (let i = 0; i < 96; i++) P.vline(i / 96, 0.28, 1.4, 0.905, 1.0);       // forward-skirt stringers
    for (let i = 0; i < 96; i++) P.vline(i / 96, 0.24, 1.4, 0.0, 0.162);       // thrust-structure stringers
    for (let v = 0.19; v < 0.47; v += 0.044) P.hline(v, 0.14, 1.5);             // RP-1 tank weld lands
    for (let v = 0.63; v < 0.9; v += 0.044) P.hline(v, 0.14, 1.5);              // LOX tank weld lands
    for (let i = 0; i < 16; i++) P.rect(i / 16 + 0.02, 0.925, 0.012, 0.03, 0.55, 2); // skirt vent louvers
    P.rect(0.31, 0.06, 0.018, 0.035, 0.7, 2); P.rect(0.81, 0.06, 0.018, 0.035, 0.7, 2); // fill / drain plates
    P.ring(0.56, 0.47, 9, 0.6, 2); P.ring(0.06, 0.88, 9, 0.6, 2);
  });
  T.inter = TEX(2048, 256, (P) => { for (let i = 0; i < 160; i++) P.vline(i / 160, 0.35, 1.5); P.hline(0.04, 0.8, 3); P.hline(0.96, 0.8, 3); P.rivets(0.08, 300, 0.4, 1.3); P.rivets(0.92, 300, 0.4, 1.3); });
  T.sii = TEX(2048, 1024, (P) => {
    // aft skirt 0–0.146, LH2 tank 0.146–0.875, forward skirt 0.875–1
    for (let i = 0; i < 120; i++) { P.vline(i / 120, 0.3, 1.4, 0, 0.146); P.vline(i / 120, 0.3, 1.4, 0.875, 1); }
    for (const v of [0.146, 0.875]) { P.hline(v, 0.9, 3); P.rivets(v + 0.008, 260, 0.5, 1.5); P.rivets(v - 0.008, 260, 0.5, 1.5); }
    for (let v = 0.2; v < 0.86; v += 0.072) P.hline(v, 0.12, 1.5);              // LH2 tank cylinder rings
    for (let i = 0; i < 36; i++) P.vline(i / 36, 0.07, 1.2, 0.146, 0.875);      // insulation panel joints
    for (let i = 0; i < 8; i++) P.rect(i / 8 + 0.04, 0.9, 0.014, 0.05, 0.5, 2);
  });
  T.sivbInter = TEX(2048, 256, (P) => {
    for (let i = 0; i < 8; i += 2) P.paint(i / 8, 0.0, 1 / 8, 1);
    for (let i = 0; i < 128; i++) P.vline(i / 128, 0.32, 1.4);
    P.hline(0.03, 0.8, 3); P.hline(0.97, 0.8, 3);
  });
  T.sivb = TEX(2048, 1024, (P) => {
    // aft skirt 0–0.156 roll pattern; forward skirt 0.86–1
    for (let i = 0; i < 8; i += 2) P.paint(i / 8 + 1 / 16, 0, 1 / 8, 0.156);
    for (let i = 0; i < 96; i++) { P.vline(i / 96, 0.28, 1.4, 0, 0.156); P.vline(i / 96, 0.28, 1.4, 0.86, 1); }
    for (const v of [0.156, 0.86]) { P.hline(v, 0.9, 3); P.rivets(v + 0.008, 200, 0.5, 1.5); P.rivets(v - 0.008, 200, 0.5, 1.5); }
    for (let v = 0.22; v < 0.84; v += 0.09) P.hline(v, 0.12, 1.5);
    P.rect(0.47, 0.9, 0.03, 0.06, 0.6, 2); P.rect(0.97, 0.9, 0.03, 0.06, 0.6, 2);
  });
  T.deck = TEX(2048, 1700, (P) => {
    for (let x = 0; x <= 49; x += 3.5) P.vline(x / 49, 0.32, 2);
    for (let z = 0; z <= 41; z += 3.5) P.hline(z / 41, 0.32, 2);
    for (const [x, z, w, d] of [[4, 4, 4, 2.4], [38, 6, 3, 3], [41, 30, 4, 2.4], [6, 33, 2.4, 2.4], [26, 36, 5, 2]]) P.rect(x / 49, z / 41, w / 49, d / 41, 0.6, 2.5);
    for (let x = 1; x < 49; x += 2) { P.dot(x / 49, 0.6 / 41, 2.2, 0.5); P.dot(x / 49, 40.4 / 41, 2.2, 0.5); }
  });
  T.lattice = TEX(256, 1024, (P) => { const n = 10; for (let i = 0; i < n; i++) { P.polyline([[0, i / n], [1, (i + 1) / n]], 0.5, 3); P.polyline([[1, i / n], [0, (i + 1) / n]], 0.5, 3); P.hline(i / n, 0.5, 3); } P.vline(0.02, 0.6, 4); P.vline(0.98, 0.6, 4); }, { wrap: false });
  T.plate = TEX(512, 256, (P) => { P.rect(0.04, 0.08, 0.92, 0.84, 0.8, 3); for (const v of [0.66, 0.5, 0.34]) P.hline(v, 0.6, 3, 0.12, 0.88); for (const [u, v] of [[0.08, 0.16], [0.92, 0.16], [0.08, 0.84], [0.92, 0.84]]) P.ring(u, v, 6, 0.8, 2); });
}

// ---------- engines ----------
function buildF1(parent) {
  const g = new THREE.Group(); parent.add(g);
  add(g, turn([[1.88, 0], [1.81, 0.5, 1], [1.70, 1.1, 1], [1.60, 1.65, 1], [1.53, 2.0]], { seg: 72 }), "metal", { side: DS });
  add(g, turn([[1.88, 0], [1.93, 0.04], [1.93, 0.1], [1.86, 0.12]], { seg: 72 }), "light");           // exit stiffener
  add(g, torusGeo(1.58, 0.2, 72), "metal", { p: [0, 2.12, 0] });                                       // turbine exhaust manifold
  add(g, turn([[1.48, 2.26], [1.30, 2.6, 1], [1.10, 3.05, 1], [0.86, 3.55, 1], [0.64, 4.0, 1], [0.49, 4.36, 1], [0.46, 4.5]], { seg: 72, vy: [2.26, 4.5] }), "metal", { map: T.f1Tubes, side: DS });
  for (const [y, r] of [[2.48, 1.39], [2.86, 1.19], [3.27, 0.99], [3.7, 0.79], [4.08, 0.61]]) add(g, torusGeo(r + 0.025, 0.04, 64), "light", { p: [0, y, 0] });
  add(g, torusGeo(0.6, 0.08, 48), "metal", { p: [0, 4.42, 0] });                                      // fuel inlet manifold
  add(g, turn([[0.46, 4.5], [0.52, 4.75, 1], [0.53, 5.1], [0.5, 5.18], [0.42, 5.4, 1], [0.22, 5.55, 1], [0, 5.6]], { seg: 48 }), "metal");
  add(g, boxGeo(0.44, 0.24, 0.44, 0, 5.72, 0), "grey");                                                // gimbal block
  add(g, rodGeo(V3(-0.3, 5.72, 0), V3(0.3, 5.72, 0), 0.08, 12), "dark");
  // Mark 10 turbopump on +x
  const tp = V3(1.25, 0, 0);
  const at = (x, y, z) => V3(tp.x + x, y, tp.z + z);
  add(g, turn([[0, 4.76], [0.42, 4.76], [0.46, 4.95, 1], [0.41, 5.12], [0, 5.12]], { seg: 40 }), "light", { p: [tp.x, 0, tp.z] });   // LOX volute
  add(g, turn([[0.25, 3.95], [0.25, 4.76]], { seg: 32 }), "metal", { p: [tp.x, 0, tp.z] });
  add(g, turn([[0, 4.3], [0.39, 4.3], [0.41, 4.47, 1], [0.37, 4.62], [0, 4.62]], { seg: 40 }), "light", { p: [tp.x, 0, tp.z] });    // fuel volute
  add(g, turn([[0, 3.6], [0.37, 3.6], [0.38, 3.78, 1], [0.36, 3.95], [0, 3.95]], { seg: 40 }), "grey", { p: [tp.x, 0, tp.z] });     // turbine
  add(g, turn([[0, 3.25], [0.27, 3.25], [0.27, 3.6], [0, 3.6]], { seg: 32 }), "metal", { p: [tp.x + 0.07, 0, tp.z] });              // heat exchanger
  for (const y of [3.33, 3.43, 3.53]) add(g, torusGeo(0.28, 0.022, 32), "light", { p: [tp.x + 0.07, y, tp.z] });
  add(g, tubeGeo([at(0.08, 3.28, 0), at(0.17, 2.96, 0), at(0.28, 2.62, 0), at(0.33, 2.32, 0)], 0.15, { radial: 12 }), "metal");    // exhaust duct → manifold
  add(g, sphereGeo(0.15, ...at(0.33, 2.32, 0).toArray()), "metal");
  for (const s of [-1, 1]) {
    add(g, tubeGeo([at(0, 5.1, 0.22 * s), at(0, 5.45, 0.24 * s), at(-0.02, 5.75, 0.26 * s)], 0.11), "light");                        // LOX inlets
    add(g, turn([[0.15, 0], [0.15, 0.06]], { seg: 20 }), "grey", { p: at(-0.02, 5.72, 0.26 * s).toArray() });
    add(g, tubeGeo([at(0, 4.46, 0.3 * s), at(0.05, 4.48, 0.62 * s), at(0.0, 5.0, 0.68 * s), at(-0.05, 5.72, 0.68 * s)], 0.085), "light"); // fuel inlets
    add(g, tubeGeo([at(-0.25, 4.98, 0.22 * s), at(-0.55, 5.2, 0.34 * s), at(-0.93, 5.45, 0.2 * s)], 0.1), "metal");                 // HP LOX ducts
    add(g, tubeGeo([at(-0.24, 4.46, 0.22 * s), at(-0.45, 4.45, 0.32 * s), at(-0.69, 4.42, 0.26 * s)], 0.085), "metal");             // HP fuel ducts
  }
  add(g, turn([[0, 0], [0.1, 0], [0.1, 0.3], [0, 0.3]], { seg: 20 }), "grey", { p: at(0.38, 3.7, 0.35).toArray() });               // gas generator
  add(g, tubeGeo([at(0.38, 4.0, 0.35), at(0.3, 4.1, 0.2), at(0.22, 3.8, 0.12)], 0.035), "dark");
  // gimbal actuators
  for (const [ax, az] of [[-1, 0], [0, -1]]) {
    const a = V3(0.9 * ax, 5.78, 0.9 * az), b = V3(0.56 * ax, 4.88, 0.56 * az), m = a.clone().lerp(b, 0.55);
    add(g, rodGeo(a, m, 0.075, 12), "grey"); add(g, rodGeo(m, b, 0.04, 10), "light");
    add(g, sphereGeo(0.07, b.x, b.y, b.z, 12, 8), "dark");
  }
  // harness conduits
  add(g, tubeGeo([V3(-0.42, 5.4, 0.3), V3(-0.55, 4.9, 0.32), V3(-0.62, 4.5, 0.2)], 0.025, { radial: 6 }), "dark");
  add(g, tubeGeo([V3(0.3, 5.42, -0.38), V3(0.6, 5.0, -0.5), V3(0.84, 4.5, -0.3)], 0.025, { radial: 6 }), "dark");
  return g;
}
function buildJ2(parent) {
  const g = new THREE.Group(); parent.add(g);
  add(g, turn([[0.98, 0], [0.93, 0.4, 1], [0.83, 0.9, 1], [0.67, 1.45, 1], [0.49, 1.95, 1], [0.31, 2.35, 1], [0.215, 2.55, 1], [0.205, 2.6]], { seg: 64 }), "metal", { map: T.j2Tubes, side: DS });
  add(g, turn([[0.98, 0], [1.02, 0.03], [1.02, 0.08], [0.96, 0.1]], { seg: 64 }), "light");
  for (const [y, r] of [[0.6, 0.9], [1.2, 0.75], [1.72, 0.57]]) add(g, torusGeo(r + 0.02, 0.03, 56), "light", { p: [0, y, 0] });
  add(g, torusGeo(0.8, 0.075, 56), "metal", { p: [0, 1.08, 0] });                                       // turbine exhaust manifold
  add(g, torusGeo(0.27, 0.045, 32), "metal", { p: [0, 2.6, 0] });                                       // fuel manifold
  add(g, turn([[0.205, 2.6], [0.245, 2.75, 1], [0.25, 2.95], [0.22, 3.05], [0.14, 3.15, 1], [0, 3.18]], { seg: 40 }), "metal");
  add(g, boxGeo(0.28, 0.16, 0.28, 0, 3.26, 0), "grey");
  add(g, rodGeo(V3(-0.2, 3.26, 0), V3(0.2, 3.26, 0), 0.05, 10), "dark");
  add(g, turn([[0, 2.55], [0.2, 2.55], [0.22, 2.75, 1], [0.2, 3.1], [0, 3.1]], { seg: 32 }), "light", { p: [0.62, 0, 0] });        // LOX turbopump
  add(g, turn([[0, 2.35], [0.18, 2.35], [0.19, 2.6], [0.17, 3.15], [0, 3.15]], { seg: 32 }), "light", { p: [-0.62, 0, 0] });      // LH2 turbopump
  for (const y of [2.5, 2.7, 2.9]) add(g, torusGeo(0.19, 0.016, 28), "grey", { p: [-0.62, y, 0] });
  add(g, sphereGeo(0.24, 0, 2.86, -0.66), "light");                                                     // H2 / He start tank
  add(g, rodGeo(V3(0, 2.62, -0.5), V3(0, 2.7, -0.3), 0.03), "dark");
  add(g, turn([[0, 0], [0.08, 0], [0.08, 0.22], [0, 0.22]], { seg: 16 }), "grey", { p: [0.36, 2.92, 0.42] });                     // gas generator
  add(g, tubeGeo([V3(-0.62, 2.4, 0.05), V3(-0.35, 2.36, 0.42), V3(0.3, 2.42, 0.45), V3(0.62, 2.6, 0.08)], 0.06), "metal");         // hot-gas crossover
  add(g, tubeGeo([V3(0.64, 2.56, 0), V3(0.74, 2.0, 0.04), V3(0.8, 1.5, 0.02), V3(0.8, 1.15, 0)], 0.07), "metal");                 // turbine exhaust duct
  add(g, tubeGeo([V3(0.46, 2.95, 0.12), V3(0.32, 3.08, 0.14), V3(0.16, 3.12, 0.08)], 0.05), "metal");
  add(g, tubeGeo([V3(-0.46, 2.7, 0.1), V3(-0.34, 2.64, 0.14), V3(-0.24, 2.62, 0.1)], 0.05), "metal");
  for (const [a, b] of [[V3(0.15, 3.32, 0.6), V3(0.1, 2.86, 0.27)], [V3(-0.45, 3.32, -0.42), V3(-0.19, 2.86, -0.19)]]) {
    const m = a.clone().lerp(b, 0.55); add(g, rodGeo(a, m, 0.05), "grey"); add(g, rodGeo(m, b, 0.028), "light");
  }
  return g;
}

// ---------- launcher, pad, umbilical tower ----------
function buildLauncher() {
  const L = mod("launcher");
  within("launcher", (g) => {
    // pad hardstand and flame trench (trench runs along z)
    add(g, boxGeo(36.2, 8.4, 80, -27.05, -18.8, -5), "grey");
    add(g, boxGeo(36.2, 8.4, 80, 27.05, -18.8, -5), "grey");
    add(g, boxGeo(17.7, 1.5, 80, 0, -22.25, -5), "dark");
    const sh = new THREE.Shape([new THREE.Vector2(-7.5, -21.5), new THREE.Vector2(7.5, -21.5), new THREE.Vector2(0.6, -15.4), new THREE.Vector2(-0.6, -15.4)]);
    const defl = new THREE.ExtrudeGeometry(sh, { depth: 15, bevelEnabled: false }); defl.rotateY(Math.PI / 2); defl.translate(-7.5, 0, 0);
    add(g, defl, "light");
    for (const x of [-16, 16]) for (const z of [-18, -3, 12]) add(g, boxGeo(2.4, 6.4, 2.4, x, -11.4, z), "light");
    // mobile launcher deck with the 45 ft flame hole
    const hy = -4.4, hh = 7.6;
    add(g, boxGeo(18.64, hh, 41, -16.18, hy, -3.5), "deck"); add(g, boxGeo(16.64, hh, 41, 15.18, hy, -3.5), "deck");
    add(g, boxGeo(13.72, hh, 10.14, 0, hy, 11.93), "deck"); add(g, boxGeo(13.72, hh, 17.14, 0, hy, -15.43), "deck");
    {
      const sh = new THREE.Shape([new THREE.Vector2(-25.5, -17), new THREE.Vector2(23.5, -17), new THREE.Vector2(23.5, 24), new THREE.Vector2(-25.5, 24)]);
      sh.holes.push(new THREE.Path([new THREE.Vector2(-6.86, -6.86), new THREE.Vector2(-6.86, 6.86), new THREE.Vector2(6.86, 6.86), new THREE.Vector2(6.86, -6.86)]));
      const geo = new THREE.ShapeGeometry(sh); geo.rotateX(-Math.PI / 2); geo.translate(0, DECK_Y + 0.02, 0);
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + 25.5) / 49, (-pos.getZ(i) + 17) / 41);
      add(g, geo, "deck", { map: T.deck });
    }
    // ruler strips and ticks on the two lit edges
    add(g, boxGeo(46, 0.08, 0.7, -1, DECK_Y + 0.1, 16.35), "light");
    add(g, boxGeo(0.7, 0.08, 38, 22.85, DECK_Y + 0.1, -3.5), "light");
    const ticks = [];
    for (let i = 0; i <= 44; i++) { const maj = i % 5 === 0; ticks.push(new THREE.Matrix4().compose(V3(-23 + i, DECK_Y + 0.16, 16.35 + (maj ? 0 : 0.12)), new THREE.Quaternion(), V3(0.07, 0.04, maj ? 0.6 : 0.36))); }
    for (let i = 0; i <= 36; i++) { const maj = i % 5 === 0; ticks.push(new THREE.Matrix4().compose(V3(22.85 + (maj ? 0 : 0.12), DECK_Y + 0.16, 14.5 - i), new THREE.Quaternion(), V3(maj ? 0.6 : 0.36, 0.04, 0.07))); }
    lattice(g, ticks, "dark");
    add(g, boxGeo(3.4, 0.08, 1.7, 18.4, DECK_Y + 0.1, 13.6), "light", { map: T.plate });                 // label plate
    for (const [x, z] of [[-25.2, 16.7], [23.2, 16.7], [23.2, -23.7], [-25.2, -23.7]]) add(g, turn([[0, 0], [0.22, 0], [0.22, 0.08], [0, 0.1]], { seg: 16 }), "dark", { p: [x, DECK_Y, z] });
    // handrail along the front edge
    const posts = [];
    for (let x = -24; x <= 22; x += 2.3) posts.push(new THREE.Matrix4().compose(V3(x, DECK_Y + 0.6, 17.2), new THREE.Quaternion(), V3(0.06, 1.2, 0.06)));
    lattice(g, posts, "grey");
    for (const y of [0.6, 1.15]) add(g, rodGeo(V3(-24, DECK_Y + y, 17.2), V3(22, DECK_Y + y, 17.2), 0.035, 6), "grey");
    // hold-down arms (4)
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2, dir = polar(1, a), tan = V3(dir.z, 0, -dir.x);
      const at = (r, y, t = 0) => dir.clone().multiplyScalar(r).add(V3(0, y, 0)).add(tan.clone().multiplyScalar(t));
      const q = new THREE.Quaternion().setFromAxisAngle(UP, a);
      const base = add(g, boxGeo(2.6, 1.4, 3.2), "light", { p: at(8.3, DECK_Y + 0.7).toArray(), q });
      add(g, prismGeo([[-1.0, 6.9], [1.0, 6.9], [1.0, 9.6], [-1.0, 9.6]].map(([t, r]) => [at(r, 0, t).x, at(r, 0, t).z]), DECK_Y + 1.4, DECK_Y + 1.7), "grey");
      for (const t of [-0.55, 0.55]) add(g, rodGeo(at(7.9, DECK_Y + 1.4, t), at(5.7, 3.55, t), 0.28, 8), "light");
      add(g, boxGeo(1.6, 0.85, 1.25), "grey", { p: at(5.35, 3.92).toArray(), q });                     // jaw under the S-IC hold-down post
      add(g, rodGeo(at(8.6, DECK_Y + 1.4), at(6.4, 3.3), 0.12, 10), "metal");                          // hydraulic release cylinder
      add(g, rodGeo(at(8.6, DECK_Y + 1.4), at(7.4, 2.3), 0.2, 10), "grey");
    }
    // tail service masts (3)
    for (const deg of [16, 164, 254]) {
      const a = deg * DEG, dir = polar(1, a), q = new THREE.Quaternion().setFromAxisAngle(UP, a);
      const p = dir.clone().multiplyScalar(11.2);
      add(g, boxGeo(1.9, 9.6, 1.9), "light", { p: [p.x, DECK_Y + 4.8, p.z], q, map: T.lattice });
      add(g, boxGeo(2.4, 0.4, 2.4), "grey", { p: [p.x, DECK_Y + 0.2, p.z], q });
      const hood = dir.clone().multiplyScalar(9.9);
      add(g, boxGeo(1.4, 1.5, 1.2), "grey", { p: [hood.x, DECK_Y + 9.2, hood.z], q });
      const skin = dir.clone().multiplyScalar(R1 + 0.06);
      add(g, tubeGeo([V3(hood.x, DECK_Y + 8.8, hood.z), dir.clone().multiplyScalar(7.6).add(V3(0, 7.4, 0)), V3(skin.x, 7.9, skin.z)], 0.16), "dark");
      add(g, boxGeo(0.7, 0.9, 0.2), "grey", { p: [skin.x, 7.9, skin.z], q });
    }
  });
  // launch umbilical tower
  const tw = mod("tower", L);
  within("tower", (g) => {
    const { x: TX, z: TZ, half: Hf, top: TT } = TOWER, y0 = DECK_Y, levels = 19, dy = (TT - y0) / levels;
    const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [TX + a * Hf, TZ + b * Hf]);
    const mem = [];
    for (let i = 0; i < levels; i++) {
      const ya = y0 + i * dy, yb = ya + dy;
      for (let c = 0; c < 4; c++) {
        const [x1, z1] = C[c], [x2, z2] = C[(c + 1) % 4];
        mem.push(memberMatrix(V3(x1, ya, z1), V3(x1, yb, z1), 0.75));
        mem.push(memberMatrix(V3(x1, yb, z1), V3(x2, yb, z2), 0.42));
        mem.push(memberMatrix(V3(x1, ya, z1), V3(x2, yb, z2), 0.26));
        mem.push(memberMatrix(V3(x2, ya, z2), V3(x1, yb, z1), 0.26));
      }
      if (i % 2 === 0) mem.push(new THREE.Matrix4().compose(V3(TX, yb, TZ), new THREE.Quaternion(), V3(2 * Hf - 0.4, 0.14, 2 * Hf - 0.4)));
    }
    lattice(g, mem, "tower");
    add(g, boxGeo(2 * Hf + 1.6, 0.5, 2 * Hf + 1.6, TX, y0 + 0.25, TZ), "grey");
    // hammerhead crane
    add(g, boxGeo(4.2, 3.6, 4.2, TX, TT + 1.8, TZ), "light");
    add(g, boxGeo(26, 1.6, 1.6, TX + 4, TT + 4.4, TZ), "tower", { map: T.lattice });
    add(g, boxGeo(3.2, 2.4, 2.4, TX - 8.2, TT + 4.2, TZ), "grey");
    add(g, boxGeo(1.2, 0.5, 1.4, TX + 15, TT + 3.35, TZ), "grey");                                    // trolley
    add(g, rodGeo(V3(TX + 15, TT + 3.1, TZ), V3(TX + 15, TT + 1.3, TZ), 0.05, 6), "dark");              // hoist line, hook parked under the boom
    add(g, boxGeo(0.7, 0.9, 0.7, TX + 15, TT + 0.9, TZ), "grey");
    add(g, rodGeo(V3(TX - 1.2, TT + 3.6, TZ - 1.2), V3(TX - 1.2, TT + 11, TZ - 1.2), 0.08, 6), "grey");   // light mast
  });
  return L;
}
// Swing arms are their own groups so they can swing away at liftoff.
const ARMS = [];
function buildArms() {
  const L = MODS.launcher.group;
  within("tower", () => {
    const d = V3(-TOWER.x, 0, -TOWER.z).normalize();
    const heights = [25.2, 38.6, 49.0, 57.4, 65.3, 73.0, 84.2, 95.4, 98.6];
    heights.forEach((y, i) => {
      const pivot = new THREE.Group();
      pivot.position.set(TOWER.x + d.x * 7.6, y, TOWER.z + d.z * 7.6);
      pivot.rotation.y = Math.atan2(d.x, d.z) - Math.PI / 2;
      L.add(pivot);
      const R = y < 42.1 ? R1 : y < 66.9 ? R1 : y < 85.7 ? R3 : RSM;
      const len = Math.hypot(TOWER.x, TOWER.z) - 7.6 - R - (i === 8 ? 1.6 : 0.5);
      const H = 2.1, W = 2.2, mem = [];
      for (const [yy, zz] of [[0, -W / 2], [0, W / 2], [H, -W / 2], [H, W / 2]]) mem.push(memberMatrix(V3(0, yy, zz), V3(len, yy, zz), 0.24));
      const nb = Math.max(3, Math.round(len / 2.2));
      for (let b = 0; b <= nb; b++) {
        const x = (b / nb) * len, x2 = ((b + 1) / nb) * len;
        for (const zz of [-W / 2, W / 2]) { mem.push(memberMatrix(V3(x, 0, zz), V3(x, H, zz), 0.16)); if (b < nb) mem.push(memberMatrix(V3(x, 0, zz), V3(x2, H, zz), 0.12)); }
        mem.push(memberMatrix(V3(x, H, -W / 2), V3(x, H, W / 2), 0.14)); mem.push(memberMatrix(V3(x, 0, -W / 2), V3(x, 0, W / 2), 0.14));
      }
      lattice(pivot, mem, "tower");
      add(pivot, boxGeo(0.9, 2.6, 2.8, 0, 1.0, 0), "grey");                                                    // hinge column
      if (i === 8) {
        add(pivot, boxGeo(3.0, 3.0, 3.2, len + 1.5, 1.2, 0), "light");                                         // white room
        add(pivot, boxGeo(0.06, 1.6, 0.9, len + 3.0, 1.0, 0), "glass");
      } else {
        add(pivot, boxGeo(1.0, 1.4, 1.6, len + 0.1, 0.9, 0), "light");                                        // umbilical carrier
        add(pivot, tubeGeo([V3(len + 0.3, 0.4, -0.4), V3(len + 0.5, -0.4, -0.3), V3(len + 0.55, -1.0, 0)], 0.09), "dark");
        add(pivot, tubeGeo([V3(len + 0.3, 0.4, 0.4), V3(len + 0.48, -0.2, 0.42), V3(len + 0.58, -0.7, 0.2)], 0.07), "dark");
      }
      ARMS.push({ pivot, base: pivot.rotation.y, park: i === 8 ? 12 * DEG : 0 });
    });
  });
}

// ---------- S-IC ----------
function buildSIC() {
  const sic = mod("sic");
  within("sic", (g) => {
    add(g, turn([[0, 0], [R1, 0], [R1, 37.7], [0, 37.7]], { seg: 128, vy: [0, 37.7] }), "white", { map: T.sic });
    add(g, turn([[R1 + 0.02, -0.02], [R1 + 0.08, 0.05], [R1 + 0.08, 0.42], [R1 + 0.02, 0.48]], { seg: 128 }), "light");   // base ring
    // engine fairings, fins, retro-rockets
    for (let k = 0; k < 4; k++) {
      const a = 45 * DEG + k * 90 * DEG, c = polar(OUTER_F1, a), dir = polar(1, a);
      add(g, turn([[0, 0], [2.18, 0], [2.18, 1.0], [1.95, 2.6, 1], [1.45, 4.6, 1], [0.8, 6.4, 1], [0, 7.3]], { seg: 64 }), "white", { p: [c.x, 0, c.z] });
      add(g, turn([[2.2, 0.0], [2.26, 0.06], [2.26, 0.3], [2.2, 0.36]], { seg: 64 }), "light", { p: [c.x, 0, c.z] });
      // fin: trapezoid in the radial–vertical plane
      const sh = new THREE.Shape([new THREE.Vector2(0, 0.2), new THREE.Vector2(2.75, 0.2), new THREE.Vector2(2.75, 2.25), new THREE.Vector2(0, 5.0)]);
      const fin = new THREE.ExtrudeGeometry(sh, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 1 });
      fin.translate(0, 0, -0.16);
      add(g, fin, "white", { p: dir.clone().multiplyScalar(OUTER_F1 + 1.72).toArray(), r: [0, a - Math.PI / 2, 0] });
      add(g, boxGeo(0.4, 0.5, 0.5), "light", { p: dir.clone().multiplyScalar(OUTER_F1 + 4.47).add(V3(0, 0.45, 0)).toArray(), r: [0, a, 0] }); // fin-tip fairing
      for (const s of [-1, 1]) {
        const t = V3(dir.z, 0, -dir.x).multiplyScalar(0.55 * s), p = c.clone().add(dir.clone().multiplyScalar(1.05)).add(t);
        add(g, turn([[0.0, 0], [0.16, 0], [0.12, 0.42], [0.0, 0.46]], { seg: 16 }), "dark", { p: [p.x, 4.25, p.z], r: [0.5 * Math.cos(a), 0, -0.5 * Math.sin(a)] });
      }
    }
    // flame curtains around each engine at the heat shield
    for (const c of [V3(0, 0, 0), ...[0, 1, 2, 3].map((k) => polar(OUTER_F1, 45 * DEG + k * 90 * DEG))])
      add(g, turn([[1.45, -0.01], [1.32, -0.35, 1], [1.18, -0.75]], { seg: 40 }), "grey", { p: [c.x, 0, c.z], side: DS });
    // systems tunnels
    for (const deg of [112, 292]) {
      const p = polar(R1 + 0.08, deg * DEG);
      add(g, turn([[0, 0.8], [0.3, 1.6, 1], [0.34, 2.4], [0.34, 35.6], [0.3, 36.4, 1], [0, 37.2]], { seg: 24 }), "white", { p: [p.x, 0, p.z] });
    }
    // hold-down posts
    for (let k = 0; k < 4; k++) { const p = polar(R1 - 0.2, k * Math.PI / 2); add(g, boxGeo(1.2, 0.5, 1.0), "grey", { p: [p.x, 0.25, p.z], r: [0, k * Math.PI / 2, 0] }); }
  });
  const eng = mod("sicEngines");
  within("sicEngines", (g) => {
    const pos = [V3(0, 0, 0), ...[0, 1, 2, 3].map((k) => polar(OUTER_F1, 45 * DEG + k * 90 * DEG))];
    const names = ["101", "102", "103", "104", "105"];
    ENGINE_SETS.F1 = pos.map((p, i) => {
      const e = buildF1(g); e.position.copy(p);
      e.rotation.y = Math.atan2(p.x, p.z) - Math.PI / 2 + (i === 0 ? 0 : 0);
      if (i === 0) e.rotation.y = 0;
      const fx = makeFX("F1", 0, { len: 62, r0: 1.7, spread: 1.6, pow: 0.8, rmax: 6.2, freq: 1.0, flow: 34, dens: 2.2, hot: 7, diam: 0.75, soot: 1.0, attack: 0.35, decay: 0.8 });
      e.add(fx);
      return { group: e, fx, name: names[i], on: true };
    });
  });
  return { sic, eng };
}
const ENGINE_SETS = {};

// ---------- S-II ----------
function buildSII() {
  mod("siiInter");
  within("siiInter", (g) => {
    add(g, turn([[R1, 0], [R1, 5.6]], { seg: 128 }), "white", { map: T.inter, side: DS });
    add(g, torusGeo(R1, 0.07, 128), "light", { p: [0, 0.05, 0] });
    for (let k = 0; k < 4; k++) {
      const a = k * 90 * DEG, p = polar(R1, a);
      add(g, turn([[0, 0], [0.34, 0.35, 1], [0.36, 1.7], [0.28, 2.4, 1], [0, 2.7]], { seg: 20 }), "light", { p: [p.x, 0.45, p.z] });
      const n = polar(R1 + 0.25, a); add(g, turn([[0.0, 0], [0.14, 0], [0.18, -0.3], [0.0, -0.3]], { seg: 14 }), "dark", { p: [n.x, 0.5, n.z] });
    }
  });
  mod("sii");
  within("sii", (g) => {
    add(g, turn([[R1, 0], [R1, 19.2], [0, 19.2]], { seg: 128, vy: [0, 19.2] }), "white", { map: T.sii, side: DS });
    add(g, turn([[R1 - 0.04, 0.6], [3.4, 1.6, 1], [1.6, 2.35, 1], [0, 2.5]], { seg: 96 }), "light", { side: DS });   // thrust cone
    add(g, turn([[0, 2.9], [1.5, 2.85, 1], [3.0, 3.25, 1], [4.2, 3.9, 1], [R1 - 0.06, 4.6]], { seg: 96 }), "grey");     // LOX tank aft dome
    add(g, torusGeo(R1 - 0.02, 0.07, 128), "light", { p: [0, 0.05, 0] });
    const p = polar(R1 + 0.1, 200 * DEG);
    add(g, turn([[0, 0.4], [0.36, 1.2, 1], [0.4, 2.0], [0.4, 17.6], [0.36, 18.4, 1], [0, 18.9]], { seg: 24 }), "white", { p: [p.x, 0, p.z] });
    for (const deg of [20, 205]) { const v = polar(R1 + 0.12, deg * DEG); add(g, boxGeo(0.5, 0.9, 0.24), "light", { p: [v.x, 18.2, v.z], r: [0, deg * DEG, 0] }); }
  });
  mod("siiEngines");
  within("siiEngines", (g) => {
    const pos = [V3(0, 0, 0), ...[0, 1, 2, 3].map((k) => polar(2.65, k * 90 * DEG))];
    ENGINE_SETS.J2II = pos.map((p, i) => {
      const e = buildJ2(g); e.position.copy(p); e.rotation.y = i ? Math.atan2(p.x, p.z) - Math.PI / 2 : 0;
      const fx = makeFX("J2", 0, { len: 40, r0: 0.92, spread: 7.0, pow: 0.55, rmax: 8.2, freq: 0.6, flow: 26, dens: 0.6, hot: 9, diam: 0.35, attack: 0.5, decay: 0.8 });
      e.add(fx);
      return { group: e, fx, name: ["201", "202", "203", "204", "205"][i], on: true };
    });
  });
}

// ---------- S-IVB ----------
function buildSIVB() {
  mod("sivbInter");
  within("sivbInter", (g) => {
    add(g, turn([[R1, 0], [R3, 5.1]], { seg: 128 }), "white", { map: T.sivbInter, side: DS });
    add(g, torusGeo(R1, 0.07, 128), "light", { p: [0, 0.05, 0] });
    const slope = Math.atan2(R1 - R3, 5.1);
    for (let k = 0; k < 4; k++) {
      const a = 45 * DEG + k * 90 * DEG, r = R1 - (R1 - R3) * (1.0 / 5.1), p = polar(r + 0.12, a);
      const gen = polar(-(R1 - R3), a).add(V3(0, 5.1, 0)).normalize();
      add(g, turn([[0, 0], [0.24, 0.3, 1], [0.26, 1.6], [0.2, 2.1, 1], [0, 2.3]], { seg: 18 }), "light", { p: [p.x, 0.5, p.z], q: new THREE.Quaternion().setFromUnitVectors(UP, gen) });
    }
  });
  mod("sivb");
  within("sivb", (g) => {
    add(g, turn([[R3, 0], [R3, 12.8], [0, 12.8]], { seg: 128, vy: [0, 12.8] }), "white", { map: T.sivb, side: DS });
    add(g, turn([[R3 - 0.04, 0.4], [2.2, 1.1, 1], [0.9, 0.85, 1], [0.42, 0.66]], { seg: 80 }), "light", { side: DS });   // thrust cone
    add(g, turn([[0, 1.15], [1.2, 1.25, 1], [2.3, 1.7, 1], [R3 - 0.05, 2.6]], { seg: 80 }), "grey");                    // aft dome
    add(g, torusGeo(R3 - 0.02, 0.06, 96), "light", { p: [0, 0.04, 0] });
    // APS modules at the aft skirt (positions I and III)
    for (const a of [90 * DEG, 270 * DEG]) {
      const dir = polar(1, a), q = new THREE.Quaternion().setFromAxisAngle(UP, a);
      const c = dir.clone().multiplyScalar(R3 + 0.32);
      add(g, boxGeo(1.05, 1.7, 0.66), "white", { p: [c.x, 1.05, c.z], q });
      const capq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), 0));
      add(g, turn([[0, 0], [0.33, 0], [0.33, 0.3, 1], [0.2, 0.55, 1], [0, 0.62]], { seg: 24, phi0: -Math.PI / 2, phi: Math.PI }), "white", { p: [c.x, 1.9, c.z], q: capq, s: [1.6, 1, 1] });
      for (const [dy, tx] of [[0.35, -0.6], [0.35, 0.6], [1.2, -0.6], [1.2, 0.6]]) {
        const t = V3(dir.z, 0, -dir.x).multiplyScalar(tx), p = c.clone().add(t);
        add(g, turn([[0, 0], [0.09, 0], [0.13, 0.24], [0, 0.24]], { seg: 12 }), "dark", { p: [p.x, dy, p.z], r: [0, 0, tx > 0 ? -Math.PI / 2 : Math.PI / 2], q: q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), tx > 0 ? -Math.PI / 2 : Math.PI / 2)) });
      }
      const n = c.clone().add(dir.clone().multiplyScalar(0.1));
      add(g, turn([[0, 0], [0.12, 0], [0.18, -0.36], [0, -0.36]], { seg: 14 }), "dark", { p: [n.x, 0.2, n.z] });   // ullage engine
    }
    const tp = polar(R3 + 0.08, 0);
    add(g, turn([[0, 2.2], [0.24, 2.7, 1], [0.27, 3.2], [0.27, 10.6], [0.24, 11.0, 1], [0, 11.4]], { seg: 20 }), "white", { p: [tp.x, 0, tp.z] });
    for (const deg of [150, 330]) { const v = polar(R3 + 0.1, deg * DEG); add(g, turn([[0, 0], [0.1, 0], [0.13, 0.32], [0, 0.32]], { seg: 12 }), "dark", { p: [v.x, 11.6, v.z], r: [0, 0, 0] }); }
  });
  mod("sivbEngine");
  within("sivbEngine", (g) => {
    const e = buildJ2(g);
    const fx = makeFX("J2", 0, { len: 46, r0: 0.92, spread: 8.0, pow: 0.55, rmax: 9.4, freq: 0.6, flow: 26, dens: 0.7, hot: 9, diam: 0.35, attack: 0.5, decay: 0.9 });
    e.add(fx);
    ENGINE_SETS.J2IVB = [{ group: e, fx, name: "J-2", on: true }];
  });
}

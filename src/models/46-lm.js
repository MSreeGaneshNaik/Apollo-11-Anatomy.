// ============================================================================
// 46 · LM-5 EAGLE — rebuilt to the LM structures reference (Grumman / NASA):
//   crew compartment: 92 in cylinder, 42 in deep, upper part forward of the lower
//   flight stations 44 in apart · crew deck 36 × 55 in · forward hatch 32 in square
//   midsection 54 in deep, floor 18 in above the crew deck · docking tunnel 32 in Ø × 16 in
//   aft equipment bay cantilevered 33 in · tanks outside the midsection, 14 ft 1 in across
//   descent stage: cruciform decks 65 in apart, beam ends 81 in from centre, quads 1–4
//   counter-clockwise from the left of the forward compartment (MESA in quad 4)
//   landing gear: outriggers, primary strut, 2 secondary struts, truss + downlocks,
//   37 in footpads, probes on all but the forward leg · porch 32 × 45 in · 9-rung ladder
// Frames: LM origin at the descent-stage reference; the ascent stage sits on the upper
// deck at y = 1.78. +z forward, +x the commander's (left) side.
// ============================================================================
const LMA = { deck: 0.25, yc: 1.187, R: 1.168, zf: 1.30, zb: 0.23, zm: -1.14, za: -1.98, mfloor: 0.707, zt: -0.45, top: 2.46, mtop: 2.36 };
const LM_XS = [[0.70, -0.05], [1.26, 0.45], [1.26, 1.75], [0.72, 2.46], [-0.72, 2.46], [-1.26, 1.75], [-1.26, 0.45], [-0.70, -0.05]];  // cabin skin section (CCW)
const LM_MS = [[0.62, -0.05], [0.82, 0.25], [0.82, 2.05], [0.55, 2.36], [-0.55, 2.36], [-0.82, 2.05], [-0.82, 0.25], [-0.62, -0.05]];  // midsection skin section
const LM_TANK_X = 1.48, LM_STATION = 0.559;     // tank centres (14 ft 1 in across) · flight-station half-spacing (44 in)

// flat panel along a polygon edge, extruded along z; thickness grows toward the inside of a CCW polygon
function edgePlate(a, b, z0, z1, t, off = 0) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const g = new THREE.BoxGeometry(L, t, z1 - z0);
  g.rotateZ(Math.atan2(dy, dx));
  g.translate((a[0] + b[0]) / 2 + nx * (off + t / 2), (a[1] + b[1]) / 2 + ny * (off + t / 2), (z0 + z1) / 2);
  return g;
}
// place a +y-axis geometry at `at`, its y along yDir and its x as close to xDir as possible
function orient(geo, at, yDir, xDir) {
  const y = yDir.clone().normalize(), x = xDir.clone().addScaledVector(y, -xDir.dot(y)).normalize(), z = V3().crossVectors(x, y);
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(x, y, z)); geo.translate(at.x, at.y, at.z); return geo;
}
function triGeo(tris) {             // flat-shaded triangles from [[p, p, p], ...]
  const pos = [];
  for (const t of tris) for (const p of t) pos.push(p.x, p.y, p.z);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
function frustumBox(w0, h0, w1, h1, L) {   // along +y: base w0 × h0 (x × z), tip w1 × h1
  const g = new THREE.BoxGeometry(1, L, 1, 1, 1, 1).translate(0, L / 2, 0), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const tip = P.getY(i) > L / 2; P.setX(i, P.getX(i) * (tip ? w1 : w0)); P.setZ(i, P.getZ(i) * (tip ? h1 : h0)); }
  g.computeVertexNormals();
  return g;
}
function rcsQuad(B, c, sx, sz) {           // cluster housing, four R-4D thrusters, thermal shield
  B.add(new THREE.BoxGeometry(0.26, 0.30, 0.26).translate(c.x, c.y, c.z), "light");
  B.add(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 20).translate(c.x, c.y + 0.16, c.z), "grey");
  for (const d of [V3(0, 1, 0), V3(0, -1, 0), V3(sx, 0, 0), V3(0, 0, sz)]) {
    const p = c.clone().addScaledVector(d, d.y ? 0.15 : 0.13);
    B.add(aim(new THREE.CylinderGeometry(0.045, 0.045, 0.07, 14).translate(0, 0.035, 0), p, d), "grey");          // valve / chamber
    B.add(aim(turn([[0.032, 0], [0.038, 0.02], [0.075, 0.22], [0.07, 0.225], [0.03, 0.03]], { seg: 16 }), p.clone().addScaledVector(d, 0.07), d), "dark");
  }
}
function dish(B, at, dir, r, role = "white") {
  B.dishes = B.dishes || [];
  B.dishes.push([aim(turn([[0, 0], [r * 0.6, r * 0.11, 1], [r, r * 0.33]], { seg: 40 }), at, dir), role]);   // bowl is double-sided, added on flush
  B.add(aim(torusGeo(r, r * 0.03, 40).translate(0, r * 0.33, 0), at, dir), "grey");
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU, q = V3(Math.cos(a) * r * 0.85, r * 0.3, Math.sin(a) * r * 0.85); B.add(aim(rodGeo(q, V3(0, r * 0.75, 0), 0.008, 6), at, dir), "dark"); }
  B.add(aim(new THREE.CylinderGeometry(r * 0.08, r * 0.06, r * 0.18, 12).translate(0, r * 0.8, 0), at, dir), "dark");
}

// ---------- ascent stage exterior (and, with o.cut, the walls left after cutting the commander's side away) ----------
// put(cat, fn): runs fn(group) inside the module for that category: "shell", "tanks", "bay", "aps"
function buildLMAscentExterior(put, o = {}) {
  const { zf, zb, zm, za, zt, top, mtop } = LMA, cut = !!o.cut;
  let apsFX = null;
  put("shell", (g) => {
    const B = bulk(), skin = bulk(), dark = bulk();
    // cabin skin, plate by plate; the cutaway drops the commander's side wall
    LM_XS.forEach((a, i) => {
      const b = LM_XS[(i + 1) % LM_XS.length];
      if (cut && a[0] > 0.3 && b[0] > 0.3) return;
      skin.add(edgePlate(a, b, zb, zf, 0.04), "silver");
    });
    // midsection skin (roof is a separate slab with the overhead hatch opening)
    LM_MS.forEach((a, i) => {
      const b = LM_MS[(i + 1) % LM_MS.length];
      if (a[1] === mtop && b[1] === mtop) return;
      if (cut && a[0] > 0.3 && b[0] > 0.3) return;
      skin.add(edgePlate(a, b, zm, zb, 0.035), "silver");
    });
    const ring = Array.from({ length: 40 }, (_, i) => [0.43 * Math.cos((i / 40) * TAU), 0.43 * Math.sin((i / 40) * TAU) - zt]);
    const roof = extrudeXY([[-0.55, -zb], [0.55, -zb], [0.55, -zm], [-0.55, -zm]], 0, 0.035, [ring]);
    roof.rotateX(-Math.PI / 2); roof.translate(0, mtop - 0.035, 0); skin.add(roof, "silver");
    skin.add(extrudeXY(LM_XS, zb - 0.035, zb, [LM_MS.map(([x, y]) => [x * 0.985, y < 0 ? 0.0 : y * 0.99])]), "silver");   // cabin aft bulkhead ring
    skin.add(extrudeXY(LM_MS, zm, zm + 0.035), "silver");                                                                        // midsection aft bulkhead
    skin.flush(g, { map: T.lmAsc });
    // base heat shield with the ascent-engine opening, interstage fittings
    const base = extrudeXY([[-0.70, -zf], [0.70, -zf], [0.70, -zm], [-0.70, -zm]], 0, 0.04, [Array.from({ length: 32 }, (_, i) => [0.44 * Math.cos((i / 32) * TAU), 0.44 * Math.sin((i / 32) * TAU)])]);
    base.rotateX(-Math.PI / 2); base.translate(0, -0.09, 0); dark.add(base, "dark");
    for (const [x, z] of [[0.62, 0.95], [-0.62, 0.95], [0.62, -0.95], [-0.62, -0.95]]) dark.add(new THREE.BoxGeometry(0.16, 0.12, 0.16).translate(x, -0.12, z), "dark");
    // front face: lower panel with the 32 in hatch, upper "brow" carrying the two triangular windows,
    // canted down and to the sides
    const hatch = [[-0.405, 0.30], [0.405, 0.30], [0.405, 1.11], [-0.405, 1.11]];
    B.add(extrudeXY([[0.70, -0.05], [1.26, 0.45], [1.26, 1.30], [-1.26, 1.30], [-1.26, 0.45], [-0.70, -0.05]], zf - 0.04, zf, [hatch]), "silver");
    const A = V3(0, 1.30, 1.40), D = V3(0, 2.40, 1.62), T0 = V3(0, top, zf), Z0 = V3(0, 1.30, zf), tris = [];
    const glass = bulk(), frames = bulk();
    for (const s of [1, -1]) {
      const Bp = V3(1.26 * s, 1.30, zf), Cp = V3(1.0 * s, 2.25, 1.46), R1 = V3(1.26 * s, 1.75, zf), R2 = V3(0.72 * s, top, zf);
      tris.push([A, Bp, Cp], [A, Cp, D], [Bp, R1, Cp], [R1, R2, Cp], [Cp, R2, T0], [Cp, T0, D], [A, Z0, Bp]);
      const P = (u, v) => A.clone().multiplyScalar((1 - u) * (1 - v)).addScaledVector(Bp, u * (1 - v)).addScaledVector(Cp, u * v).addScaledVector(D, (1 - u) * v);
      const n = V3().crossVectors(V3().subVectors(Bp, A), V3().subVectors(D, A)).normalize(); if (n.z < 0) n.negate();
      const w = [P(0.17, 0.9), P(0.8, 0.9), P(0.17, 0.27)].map((p) => p.addScaledVector(n, 0.012));       // ◥ ◤ : right angle at the top inner corner
      glass.add(triGeo([[w[0], w[1], w[2]]]), "glass");
      for (let k = 0; k < 3; k++) frames.add(rodGeo(w[k], w[(k + 1) % 3], 0.022, 6), "dark");
    }
    B.add(triGeo(tris), "silver");
    glass.flush(g, { side: DS }); frames.flush(g);
    // hatch (closed), handle, hinges; tracking light; alignment telescope; docking window over the commander
    B.add(new THREE.BoxGeometry(0.79, 0.79, 0.04).translate(0, 0.705, zf - 0.02), "light");
    B.add(rodGeo(V3(-0.28, 0.62, zf + 0.01), V3(-0.28, 0.92, zf + 0.01), 0.016, 8), "dark");
    for (const y of [0.45, 0.96]) B.add(new THREE.BoxGeometry(0.06, 0.08, 0.05).translate(0.42, y, zf), "grey");
    B.add(new THREE.SphereGeometry(0.06, 16, 10, 0, TAU, 0, Math.PI / 2).translate(0, 2.44, 1.47), "light");
    B.add(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 20).translate(0, top + 0.015, 1.05), "grey");
    B.add(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 20).translate(0, top + 0.1, 1.05), "light");
    B.add(new THREE.SphereGeometry(0.06, 16, 10, 0, TAU, 0, Math.PI / 2).translate(0, top + 0.18, 1.05), "grey");
    B.add(new THREE.BoxGeometry(0.13, 0.01, 0.30).translate(0.45, top + 0.006, 0.85), "glass");
    B.add(new THREE.BoxGeometry(0.19, 0.012, 0.36).translate(0.45, top + 0.001, 0.85), "dark");
    // docking tunnel with the drogue, docking target on the upper left of the midsection
    B.add(turn([[0.43, mtop - 0.03], [0.43, mtop + 0.36], [0.47, mtop + 0.40], [0.47, mtop + 0.44], [0.36, mtop + 0.44], [0.22, mtop + 0.36, 1], [0, mtop + 0.33]], { seg: 48 }).translate(0, 0, zt), "light");
    for (let i = 0; i < 12; i++) B.add(new THREE.BoxGeometry(0.05, 0.04, 0.05).translate(...polar(0.45, (i / 12) * TAU, mtop + 0.42).add(V3(0, 0, zt)).toArray()), "dark");
    const tg = V3(0.45, mtop, -1.0);
    B.add(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 24).translate(tg.x, tg.y + 0.01, tg.z), "light");
    B.add(rodGeo(tg, tg.clone().add(V3(0, 0.38, 0)), 0.018, 8), "grey");
    B.add(new THREE.BoxGeometry(0.34, 0.03, 0.03).translate(tg.x, tg.y + 0.4, tg.z), "dark");
    B.add(new THREE.BoxGeometry(0.03, 0.03, 0.34).translate(tg.x, tg.y + 0.4, tg.z), "dark");
    // rendezvous radar on the cabin's upper beams, S-band steerable dish and VHF/EVA antennas on the midsection
    const rr = V3(-0.42, top, 0.95);
    B.add(new THREE.BoxGeometry(0.2, 0.1, 0.2).translate(rr.x, rr.y + 0.05, rr.z), "grey");
    for (const s of [-1, 1]) B.add(rodGeo(rr.clone().add(V3(s * 0.11, 0.1, 0)), rr.clone().add(V3(s * 0.11, 0.32, 0.03)), 0.022, 8), "grey");
    B.add(rodGeo(rr.clone().add(V3(-0.12, 0.32, 0.03)), rr.clone().add(V3(0.12, 0.32, 0.03)), 0.02, 8), "dark");
    dish(B, rr.clone().add(V3(0, 0.32, 0.06)), V3(0, 0.55, 0.83), 0.3);
    const sb = V3(-0.82, 2.0, -0.75);
    B.add(rodGeo(sb, V3(-1.18, 2.55, -0.85), 0.035, 10), "grey");
    B.add(new THREE.BoxGeometry(0.12, 0.12, 0.12).translate(-1.18, 2.58, -0.85), "dark");
    dish(B, V3(-1.24, 2.66, -0.86), V3(-0.45, 0.85, 0.25), 0.33);
    for (const [p, q] of [[V3(0.55, top, 0.35), V3(0.92, 2.98, 0.55)], [V3(-0.45, mtop, -0.98), V3(-0.78, 2.85, -1.35)]]) { B.add(rodGeo(p, q, 0.016, 6), "dark"); B.add(new THREE.SphereGeometry(0.025, 10, 8).translate(q.x, q.y, q.z), "dark"); }
    B.add(rodGeo(V3(-0.12, mtop, -1.06), V3(-0.12, mtop + 0.48, -1.06), 0.012, 6), "dark");
    B.add(aim(turn([[0, 0], [0.06, 0], [0.0, 0.16]], { seg: 16 }), V3(-0.95, 1.05, zf), V3(0, 0, 1)), "light");    // forward S-band in-flight antenna
    // RCS: two forward quads off the cabin, two aft quads off the aft bulkhead and equipment rack
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      if (cut && sx > 0) continue;                                                                    // near-side quads left out of the cutaway
      const c = V3(1.66 * sx, 2.02, sz > 0 ? 1.0 : -1.42);
      const root0 = sz > 0 ? V3(1.15 * sx, 1.9, 1.12) : V3(0.95 * sx, 1.9, -1.30), root1 = sz > 0 ? V3(0.86 * sx, 2.28, 0.85) : V3(0.95 * sx, 2.12, -1.65);
      B.add(rodGeo(root0, c, 0.035, 8), "grey"); B.add(rodGeo(root1, c, 0.03, 8), "grey");
      rcsQuad(B, c, sx, sz);
    }
    // interior lining on the walls that remain in the cutaway
    for (const [geo, role] of B.dishes || []) add(g, geo, role, { side: DS });
    if (cut) {
      const lin = bulk();
      lin.add(new THREE.BoxGeometry(0.03, LMA.mfloor + 0.05, zb - zm).translate(0.78, (LMA.mfloor - 0.05) / 2, (zb + zm) / 2), "light");   // skirt under the midsection floor
      LM_XS.forEach((a, i) => { const b = LM_XS[(i + 1) % LM_XS.length]; if (a[0] > 0.3 && b[0] > 0.3) return; if (a[1] < 0 && b[1] < 0) return; lin.add(edgePlate(a, b, zb + 0.04, zf - 0.05, 0.02, 0.06), "light"); });
      lin.flush(g);
    }
    B.flush(g); dark.flush(g);
  });
  put("tanks", (g) => {
    const B = bulk();
    for (const s of cut ? [-1] : [-1, 1]) {
      const c = V3(LM_TANK_X * s, 1.25, -0.50);
      B.add(new THREE.SphereGeometry(0.624, 40, 28).translate(c.x, c.y, c.z), "silver");
      B.add(torusGeo(0.63, 0.025, 48).translate(c.x, c.y, c.z), "grey");
      for (const [dy, dz] of [[0.42, 0.32], [0.42, -0.32], [-0.42, 0.3], [-0.42, -0.3]]) strut(B, c.clone().add(V3(-s * 0.48, dy * 0.85, dz)), V3(0.84 * s, c.y + dy, c.z + dz * 1.25), 0.022);
      duct(B, [c.clone().add(V3(-s * 0.25, -0.57, 0)), V3(0.7 * s, 0.25, -0.3), V3(0.3 * s, 0.12, -0.08), V3(0.12 * s, 0.06, 0)], 0.035, { bolts: 8 });
    }
    B.flush(g, { map: null });
  });
  put("bay", (g) => {
    const B = bulk(), z0 = zm, z1 = za;
    if (!cut) {                                   // closed: shielded box, aft S-band antenna
      const sk = bulk();
      for (const [a, b] of [[[0.95, 0.55], [0.95, 2.15]], [[0.95, 2.15], [-0.95, 2.15]], [[-0.95, 2.15], [-0.95, 0.55]], [[-0.95, 0.55], [0.95, 0.55]]]) sk.add(edgePlate(a, b, z1, z0, 0.03), "silver");
      sk.add(extrudeXY([[0.95, 0.55], [0.95, 2.15], [-0.95, 2.15], [-0.95, 0.55]], z1 - 0.03, z1), "silver");
      sk.flush(g, { map: T.lmAsc });
      B.add(aim(turn([[0, 0], [0.06, 0], [0, 0.16]], { seg: 16 }), V3(0.6, 1.9, z1 - 0.03), V3(0, 0, -1)), "light");
    } else {                                      // open rack
      for (const x of [-0.95, 0.95]) for (const z of [z0 - 0.04, z1]) B.add(rodGeo(V3(x, 0.55, z), V3(x, 2.15, z), 0.03, 8), "grey");
      for (const y of [0.55, 1.08, 1.62, 2.15]) { for (const z of [z0 - 0.04, z1]) B.add(rodGeo(V3(-0.95, y, z), V3(0.95, y, z), 0.025, 8), "grey"); for (const x of [-0.95, 0.95]) B.add(rodGeo(V3(x, y, z0 - 0.04), V3(x, y, z1), 0.022, 8), "grey"); }
      for (const y of [0.58, 1.11, 1.65]) for (const z of [-1.4, -1.72]) B.add(rodGeo(V3(-0.93, y, z), V3(0.93, y, z), 0.016, 8), "metal");
      const boxes = [[-0.5, 0.8, 0.6, 0.3, 0.42, "silver"], [0.35, 0.78, 0.5, 0.24, 0.38, "light"], [-0.45, 1.32, 0.5, 0.3, 0.4, "light"], [0.4, 1.34, 0.6, 0.34, 0.42, "silver"], [-0.2, 1.86, 1.1, 0.34, 0.42, "grey"], [0.62, 1.86, 0.4, 0.3, 0.4, "light"]];
      for (const [x, y, w, h, d, role] of boxes) { B.add(new THREE.BoxGeometry(w, h, d).translate(x, y, -1.56), role); for (let i = 0; i < Math.round(w / 0.07); i++) B.add(new THREE.BoxGeometry(0.01, h * 0.8, 0.02).translate(x - w / 2 + 0.04 + i * 0.07, y, -1.56 + d / 2 + 0.01), "dark"); }
      for (const [x, y] of [[-0.5, 0.97], [0.35, 0.92], [-0.45, 1.49], [0.4, 1.53], [-0.2, 2.05]]) bundle(B, [V3(x, y, -1.4), V3(x * 0.6, y + 0.1, z0 - 0.06), V3(0, 1.5, z0 - 0.02)], 4, 0.005, 0.016);
    }
    // two ECS oxygen tanks and two helium tanks under the rack
    for (const [x, r, role] of [[-0.55, 0.2, "light"], [-0.12, 0.2, "light"], [0.3, 0.17, "silver"], [0.68, 0.17, "silver"]]) {
      B.add(new THREE.SphereGeometry(r, 24, 16).translate(x, 0.55 - r - 0.04, -1.55), role);
      B.add(rodGeo(V3(x, 0.55, -1.55), V3(x, 0.55 - 0.04, -1.55), 0.02, 6), "grey");
    }
    B.flush(g);
  });
  put("aps", (g) => {
    add(g, turn([[0.4, -0.44], [0.33, -0.17, 1], [0.22, 0.03]], { seg: 40 }), "metal", { side: DS });
    add(g, turn([[0.4, -0.44], [0.43, -0.42], [0.43, -0.38], [0.39, -0.37]], { seg: 40 }), "light");
    const B = bulk(); flange(B, V3(0, 0.03, 0), UP, 0.2, 0.28, 0.03, 16); B.flush(g);
    if (o.fx) { apsFX = makeFX("HYP", 0, { len: 9, r0: 0.38, spread: 3.5, pow: 0.6, rmax: 2.2, freq: 1.0, flow: 16, dens: 1.2, hot: 6, attack: 0.25, decay: 0.6 }); apsFX.position.y = -0.44; g.add(apsFX); }
  });
  return apsFX;
}

// ---------- descent stage, landing gear, porch and ladder ----------
function buildLMDescent(g) {
  const a = LM_A, c = LM_C, PIV_R = 2.35, PIV_Y = 1.70;
  const oct = [[a, -(a - c)], [a, a - c], [a - c, a], [-(a - c), a], [-a, a - c], [-a, -(a - c)], [-(a - c), -a], [a - c, -a]];
  add(g, prismGeo(oct, 0.3, 1.72), "gold", { map: T.lmFoil, alt: "hi" });
  add(g, prismGeo(oct.map(([x, z]) => [x * 1.02, z * 1.02]), 0.22, 0.3), "dark");
  add(g, prismGeo(oct.map(([x, z]) => [x * 0.97, z * 0.97]), 1.72, 1.78), "light");
  const B = bulk();
  // descent engine: bell, its gimbal skirt and the base heat shield round it
  add(g, turn([[0.76, -0.38], [0.66, 0.0, 1], [0.48, 0.3, 1], [0.3, 0.55]], { seg: 48 }), "metal", { side: DS });
  add(g, torusGeo(0.77, 0.03, 48), "light", { p: [0, -0.37, 0] });
  B.add(turn([[0.82, 0.22], [1.0, 0.22], [1.0, 0.18], [0.82, 0.18], [0.82, 0.22]], { seg: 48 }), "dark");
  const dps = makeFX("HYP", 0, { len: 14, r0: 0.7, spread: 3.2, pow: 0.6, rmax: 3.6, freq: 0.9, flow: 18, dens: 1.0, hot: 6, attack: 0.3, decay: 0.6 });
  dps.position.y = -0.38; g.add(dps);
  ENGINE_SETS.DPS = [{ group: g, fx: dps, name: "DPS", on: true }];
  // landing radar antenna under the stage
  B.add(new THREE.BoxGeometry(0.62, 0.12, 0.5).translate(0.95, 0.15, -0.75), "light");
  B.add(new THREE.BoxGeometry(0.56, 0.02, 0.44).translate(0.95, 0.085, -0.75), "dark");
  // quad faces: MESA folded on quad 4 (right of the forward compartment), SEQ bay door on quad 2
  const quad = (sx, sz) => { const p = V3(sx * (a - c / 2), 0, sz * (a - c / 2)), q = new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(sx, sz)); return { p, q }; };
  {
    const { p, q } = quad(-1, 1), M = new THREE.Group(); M.position.copy(p); M.quaternion.copy(q); g.add(M);
    add(M, boxGeo(1.0, 1.1, 0.08, 0, 0.92, 0.06), "silver");
    add(M, boxGeo(0.96, 0.05, 0.05, 0, 0.36, 0.11), "dark");                                           // hinge line (MESA swings down from here)
    add(M, boxGeo(0.86, 0.04, 0.04, 0, 1.36, 0.12), "dark");
    add(M, boxGeo(0.2, 0.14, 0.12, 0.3, 1.2, 0.16), "grey");                                            // TV camera bracket
    for (const x of [-0.42, 0.42]) add(M, boxGeo(0.04, 0.06, 0.08, x, 1.44, 0.12), "grey");           // release handles
  }
  {
    const { p, q } = quad(1, -1), S = new THREE.Group(); S.position.copy(p); S.quaternion.copy(q); g.add(S);
    add(S, boxGeo(0.98, 0.95, 0.05, 0, 0.95, 0.04), "silver");
    add(S, boxGeo(0.3, 0.04, 0.05, 0, 1.3, 0.09), "dark");
    for (const x of [-0.46, 0.46]) add(S, boxGeo(0.03, 0.9, 0.03, x, 0.95, 0.08), "grey");
  }
  // porch over the forward outrigger, 32 × 45 in, just below the hatch, with its handrails
  const pz0 = 1.32, pz1 = 2.46, py = 2.0;
  B.add(new THREE.BoxGeometry(0.81, 0.05, pz1 - pz0).translate(0, py - 0.025, (pz0 + pz1) / 2), "grey");
  for (let i = 0; i < 8; i++) B.add(new THREE.BoxGeometry(0.77, 0.012, 0.02).translate(0, py + 0.006, pz0 + 0.08 + i * 0.14), "dark");
  for (const s of [-1, 1]) {
    B.add(rodGeo(V3(s * 0.36, py - 0.05, pz1 - 0.06), V3(s * 0.12, PIV_Y + 0.08, PIV_R - 0.05), 0.02, 8), "grey");
    B.add(rodGeo(V3(s * 0.36, py - 0.05, 1.6), V3(s * 0.36, 1.78, 1.6), 0.02, 8), "grey");
    B.add(new THREE.TubeGeometry(curveOf([V3(s * 0.40, py, pz1 - 0.04), V3(s * 0.42, py + 0.72, pz1 - 0.12), V3(s * 0.44, py + 0.92, 2.0), V3(s * 0.45, py + 0.86, 1.42)]), 30, 0.022, 8, false), "grey");
  }
  // interstage fittings on the upper deck
  for (const [x, z] of [[0.62, 0.95], [-0.62, 0.95], [0.62, -0.95], [-0.62, -0.95]]) B.add(new THREE.BoxGeometry(0.2, 0.06, 0.2).translate(x, 1.81, z), "dark");
  B.flush(g);
  // landing gear: outrigger, primary strut (outer cylinder + piston with honeycomb), footpad, probe,
  // two secondary struts and the deployment truss with its downlock
  for (let k = 0; k < 4; k++) {
    const ang = k * Math.PI / 2, dir = polar(1, ang), tan = V3(dir.z, 0, -dir.x);
    const piv = dir.clone().multiplyScalar(PIV_R).add(V3(0, PIV_Y, 0)), face = dir.clone().multiplyScalar(a - 0.03).add(V3(0, 1.48, 0));
    add(g, orient(frustumBox(0.72, 0.46, 0.26, 0.2, piv.distanceTo(face)), face, V3().subVectors(piv, face), tan), "gold", { map: T.lmFoil, alt: "hi" });
    const C2 = bulk();
    for (const s of [-1, 1]) C2.add(new THREE.BoxGeometry(0.03, 0.2, 0.16).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(1, 0, 0), tan)).translate(...piv.clone().addScaledVector(tan, s * 0.13).toArray()), "grey");
    C2.add(aim(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 12), piv, tan), "dark");
    C2.flush(g);
    const leg = new THREE.Group(); leg.position.copy(piv); leg.rotation.y = ang - Math.PI / 2; g.add(leg);
    const strutG = new THREE.Group(); leg.add(strutG);
    add(strutG, rodGeo(V3(0, 0.08, 0), V3(0, -1.95, 0), 0.1, 14), "gold", { map: T.lmFoil, alt: "hi" });
    add(strutG, boxGeo(0.2, 0.22, 0.18, 0, 0.02, 0), "grey");                                          // upper fitting / drive-out mechanism
    add(strutG, torusGeo(0.11, 0.025, 16), "grey", { p: [0, -1.95, 0] });
    add(strutG, boxGeo(0.12, 0.14, 0.24, 0.05, -1.85, 0), "dark");                                     // downlock
    const piston = new THREE.Group(); strutG.add(piston);
    add(piston, rodGeo(V3(0, 0, 0), V3(0, 1.7, 0), 0.07, 12), "metal");
    const pad = new THREE.Group(); piston.add(pad); pad.rotation.z = -32.5 * DEG;
    add(pad, turn([[0, -0.13], [0.4, -0.11, 1], [0.47, 0.0], [0.44, 0.05], [0.12, 0.08], [0, 0.08]], { seg: 40 }), "gold", { map: T.lmFoil, alt: "hi" });
    add(pad, sphereGeo(0.08, 0, 0.08, 0, 12, 8), "dark");
    let probe = null;
    if (k !== 0) {                                                                                     // surface-sensing probe: folded for launch, swings down with the gear
      add(pad, boxGeo(0.08, 0.1, 0.08, 0.3, -0.1, 0), "grey");
      probe = new THREE.Group(); probe.position.set(0.3, -0.12, 0); pad.add(probe);
      add(probe, rodGeo(V3(0, 0, 0), V3(0, -1.53, 0), 0.016, 6), "dark"); add(probe, sphereGeo(0.03, 0, -1.54, 0, 8, 6), "dark");
    }
    if (k === 0) {                                                                                     // ladder and the Apollo 11 plaque on the forward strut
      for (const s of [-1, 1]) add(strutG, rodGeo(V3(0.17, -0.45, 0.254 * s), V3(0.17, -3.05, 0.254 * s), 0.018, 6), "grey");
      for (let i = 0; i < 9; i++) { const y = -0.62 - i * (2.33 / 8); add(strutG, rodGeo(V3(0.17, y, -0.254), V3(0.17, y, 0.254), 0.014, 6), "grey"); }
      for (const y of [-0.5, -3.0]) for (const s of [-1, 1]) add(strutG, rodGeo(V3(0.08, y, 0.12 * s), V3(0.17, y, 0.254 * s), 0.012, 6), "grey");
      add(strutG, boxGeo(0.008, 0.194, 0.229, 0.105, -0.95, 0), "silver");
    }
    const rods = [liveRod(leg, 0.045, "grey"), liveRod(leg, 0.045, "grey"), liveRod(leg, 0.032, "grey")];
    LEGS.push({ leg, strut: strutG, piston, pad, rods, k, probe });
  }
}
function buildLM() {
  const lm = mod("lm");
  mod("lmDescent", lm);
  within("lmDescent", (g) => buildLMDescent(g));
  const asc = mod("lmAscent", lm);
  asc.position.y = 1.78;
  const aps = buildLMAscentExterior((cat, fn) => within("lmAscent", () => fn(asc)), { fx: true });
  ENGINE_SETS.APS = [{ group: asc, fx: aps, name: "APS", on: true }];
  return lm;
}
function setLegs(lambda) {
  const phi = lerp(185, 32.5, lambda) * DEG, ext = lerp(0.55, 1, lambda);
  for (const L of LEGS) {
    L.strut.rotation.z = phi;
    L.piston.position.y = -3.56 * ext;
    const J = V3(0, -1.85, 0).applyAxisAngle(V3(0, 0, 1), phi);
    const J2 = V3(0, -1.2, 0).applyAxisAngle(V3(0, 0, 1), phi);
    L.rods[0].userData.aim(V3(-0.2, -1.42, 0.95), J);
    L.rods[1].userData.aim(V3(-0.2, -1.42, -0.95), J);
    L.rods[2].userData.aim(V3(-0.2, -0.72, 0), J2);
    if (L.probe) L.probe.rotation.z = lerp(-147.5, 0, smooth(0.55, 1, lambda)) * DEG;
  }
}

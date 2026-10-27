// ============================================================================
// 44 · CREW QUARTERS — Columbia and Eagle cut open, with their crews aboard.
// ============================================================================
// suited crew figures (A7L-style pressure suits) built from capsules
function limb(B, a, b, r, role = "white") {
  const d = V3().subVectors(b, a), L = d.length();
  B.add(aim(new THREE.CapsuleGeometry(r, Math.max(0.001, L), 4, 14), a.clone().lerp(b, 0.5), d), role);
}
const POSE = {
  lie: { pelvis: [0, 0.95, 0], chest: [0, 1.36, 0.03], neck: [0, 1.55, 0.04], head: [0, 1.73, 0.06], shL: [-0.21, 1.43, 0.02], shR: [0.21, 1.43, 0.02], elL: [-0.3, 1.2, 0.1], elR: [0.3, 1.2, 0.1], haL: [-0.29, 1.0, 0.2], haR: [0.29, 1.0, 0.2], hipL: [-0.11, 0.92, 0], hipR: [0.11, 0.92, 0], knL: [-0.13, 0.86, 0.42], knR: [0.13, 0.86, 0.42], anL: [-0.13, 0.45, 0.48], anR: [0.13, 0.45, 0.48], toL: [-0.13, 0.42, 0.64], toR: [0.13, 0.42, 0.64] },
  stand: { pelvis: [0, 0.97, 0], chest: [0, 1.37, 0.02], neck: [0, 1.55, 0.03], head: [0, 1.72, 0.05], shL: [-0.21, 1.43, 0], shR: [0.21, 1.43, 0], elL: [-0.27, 1.16, 0.12], elR: [0.27, 1.16, 0.12], haL: [-0.23, 1.0, 0.33], haR: [0.23, 1.0, 0.33], hipL: [-0.11, 0.93, 0], hipR: [0.11, 0.93, 0], knL: [-0.12, 0.5, 0.06], knR: [0.12, 0.5, 0.06], anL: [-0.12, 0.1, 0], anR: [0.12, 0.1, 0], toL: [-0.12, 0.05, 0.17], toR: [0.12, 0.05, 0.17] },
};
// body frame: x = crewman's right, y = toward the head, z = where he faces
function bodyFrame(O, R, H, F) {
  const X = (p) => O.clone().addScaledVector(R, p[0]).addScaledVector(H, p[1]).addScaledVector(F, p[2]);
  const M = new THREE.Matrix4().makeBasis(R, H, F);
  const box = (c, s, role, B) => B.add(new THREE.BoxGeometry(...s).applyMatrix4(M.clone().setPosition(X(c))), role);
  return { X, M, box, R, H, F };
}
function astronaut(B, fr, pose) {
  const J = {}; for (const k in pose) J[k] = fr.X(pose[k]);
  limb(B, J.pelvis, J.chest, 0.155);
  limb(B, J.shL, J.shR, 0.088);
  limb(B, J.hipL, J.hipR, 0.1);
  for (const s of ["L", "R"]) {
    const sh = J["sh" + s], el = J["el" + s], ha = J["ha" + s], hip = J["hip" + s], kn = J["kn" + s], an = J["an" + s], to = J["to" + s];
    limb(B, sh, el, 0.066); limb(B, el, ha, 0.058);
    const fa = V3().subVectors(ha, el).normalize();
    B.add(aim(torusGeo(0.062, 0.014, 18), ha.clone().addScaledVector(fa, -0.075), fa), "grey");                 // wrist disconnect
    B.add(new THREE.SphereGeometry(0.056, 16, 12).translate(ha.x + fa.x * 0.02, ha.y + fa.y * 0.02, ha.z + fa.z * 0.02), "light");   // glove
    const ua = V3().subVectors(el, sh).normalize();
    B.add(aim(torusGeo(0.07, 0.012, 18), el.clone().addScaledVector(ua, -0.04), ua), "grey");                   // elbow convolute
    limb(B, hip, kn, 0.088); limb(B, kn, an, 0.072);
    const th = V3().subVectors(kn, hip).normalize();
    for (const t of [-0.05, 0, 0.05]) B.add(aim(torusGeo(0.09, 0.012, 18), kn.clone().addScaledVector(th, t - 0.02), th), "grey");   // knee bellows
    limb(B, an, to, 0.066, "light");                                                                              // boot
    B.add(aim(torusGeo(0.078, 0.012, 18), an.clone().addScaledVector(V3().subVectors(kn, an).normalize(), 0.07), V3().subVectors(kn, an)), "grey");
  }
  const nd = V3().subVectors(J.head, J.neck).normalize();
  B.add(aim(torusGeo(0.125, 0.028, 28), J.neck, nd), "grey");                                                    // neck ring
  B.add(aim(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 28), J.neck.clone().addScaledVector(nd, -0.02), nd), "light");
  B.add(new THREE.SphereGeometry(0.168, 32, 22).translate(J.head.x, J.head.y, J.head.z), "silver");             // bubble helmet
  B.add(aim(torusGeo(0.15, 0.01, 28), J.head.clone().addScaledVector(nd, -0.06), nd), "grey");
  // suit connectors on the chest: oxygen in, oxygen out, comms
  const c0 = J.chest.clone().addScaledVector(fr.F, 0.14).addScaledVector(nd, -0.08), tips = {};
  for (const [k, dx, dy, role] of [["in", -0.08, 0, "paint"], ["out", 0.08, 0, "grey"], ["comm", 0, -0.11, "dark"]]) {
    const p = c0.clone().addScaledVector(fr.R, dx).addScaledVector(nd, dy);
    B.add(aim(new THREE.CylinderGeometry(0.028, 0.032, 0.05, 16).translate(0, 0.025, 0), p, fr.F), role);
    B.add(aim(torusGeo(0.034, 0.008, 14), p.clone().addScaledVector(fr.F, 0.045), fr.F), "dark");
    tips[k] = p.clone().addScaledVector(fr.F, 0.06);
  }
  B.add(fr.M && new THREE.BoxGeometry(0.16, 0.1, 0.03).applyMatrix4(fr.M.clone().setPosition(J.chest.clone().addScaledVector(fr.F, 0.155).addScaledVector(nd, 0.07))), "light");   // pressure gauge / checklist pocket
  return tips;
}
// thin box in an arbitrary frame (u right, v up, n out); returns the frame for children
function frameAt(c, u, v, n) { const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(u, v, n)); return { c, q, u, v, n, P: (x, y, z = 0) => c.clone().addScaledVector(u, x).addScaledVector(v, y).addScaledVector(n, z) }; }
function boxIn(B, F, x, y, z, w, h, d, role) { const g = new THREE.BoxGeometry(w, h, d); g.applyQuaternion(F.q); const p = F.P(x, y, z); g.translate(p.x, p.y, p.z); return B.add(g, role); }
function cylIn(B, F, x, y, z, r, len, role, seg = 16) { const p = F.P(x, y, z); return B.add(aim(new THREE.CylinderGeometry(r, r, len, seg), p, F.n), role); }
// an instrument panel: textured face plus raised switches, guards, gauges
function instrumentPanel(g, F, w, h, o = {}) {
  const sub = new THREE.Group(); sub.position.copy(F.c); sub.quaternion.copy(F.q); g.add(sub);
  add(sub, new THREE.BoxGeometry(w, h, 0.05).translate(0, 0, -0.025), "grey", { map: o.map || T.panel, inkA: 0.95 });
  add(sub, new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.03).translate(0, 0, -0.045), "dark");
  const B = bulk(), rnd = mulberry(o.seed || 3);
  const nx = Math.max(2, Math.round(w / 0.11)), ny = Math.max(1, Math.round(h / 0.13));
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const x = -w / 2 + (i + 0.5) * w / nx, y = -h / 2 + (j + 0.5) * h / ny, k = rnd();
    if (o.skip && o.skip(x, y)) continue;
    if (k < 0.5) for (let t = 0; t < 4; t++) {                   // a row of toggles, some guarded
      const sx = x - 0.036 + t * 0.024;
      B.add(new THREE.CylinderGeometry(0.0035, 0.005, 0.024, 6).rotateX(Math.PI / 2 + (rnd() - 0.5) * 0.6).translate(sx, y, 0.012), "light");
      B.add(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 8).rotateX(Math.PI / 2).translate(sx, y, 0.002), "dark");
      if (rnd() < 0.25) { B.add(new THREE.BoxGeometry(0.003, 0.02, 0.026).translate(sx - 0.009, y, 0.013), "paint"); B.add(new THREE.BoxGeometry(0.003, 0.02, 0.026).translate(sx + 0.009, y, 0.013), "paint"); }
    } else if (k < 0.72) {                                         // round meter
      B.add(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 20).rotateX(Math.PI / 2).translate(x, y, 0.006), "dark");
      B.add(new THREE.TorusGeometry(0.031, 0.004, 6, 20).translate(x, y, 0.012), "light");
    } else if (k < 0.85) {                                         // rotary selector
      B.add(new THREE.CylinderGeometry(0.014, 0.016, 0.018, 12).rotateX(Math.PI / 2).translate(x, y, 0.009), "dark");
      B.add(new THREE.BoxGeometry(0.004, 0.018, 0.004).translate(x, y + 0.006, 0.02), "light");
    } else {                                                       // tape meters / talkbacks
      for (let t = 0; t < 3; t++) B.add(new THREE.BoxGeometry(0.018, 0.05, 0.01).translate(x - 0.025 + t * 0.025, y, 0.005), "silver");
    }
  }
  for (const f of o.fdai || []) {                                  // attitude ball ("8-ball")
    B.add(new THREE.SphereGeometry(0.075, 24, 16).translate(f[0], f[1], 0.0), "light");
    B.add(new THREE.TorusGeometry(0.084, 0.012, 8, 28).translate(f[0], f[1], 0.01), "dark");
    B.add(new THREE.BoxGeometry(0.004, 0.1, 0.004).translate(f[0], f[1], 0.075), "paint");
  }
  for (const d of o.dsky || []) {                                  // display & keyboard
    add(sub, new THREE.BoxGeometry(0.19, 0.21, 0.04).translate(d[0], d[1], 0.02), "light", { map: T.dsky, inkA: 1 });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) B.add(new THREE.BoxGeometry(0.019, 0.019, 0.012).translate(d[0] - 0.085 + 0.024 * c + 0.012, d[1] - 0.095 + r * 0.03 + 0.012, 0.045), "white");
  }
  B.flush(sub);
  return sub;
}

// ---------- Command Module Columbia ----------
const CM_CUT0 = 110 * DEG, CM_CUTW = 220 * DEG;           // a 140° wedge facing the drawing's camera is removed
const CM_HD = polar(1, 40 * DEG), CM_RT = polar(1, 130 * DEG); // crew head direction · crew right
function cutShell(g, prof, role, o = {}) {
  const { shell, cap } = turnCut(prof, CM_CUT0, CM_CUTW, { seg: o.seg ?? 110, u: [CM_CUT0 / TAU - 40 / 360, (CM_CUT0 + CM_CUTW) / TAU - 40 / 360], vy: o.vy });
  add(g, shell, role, { map: o.map, alt: o.alt, side: o.side });
  add(g, cap, o.capRole || role, { map: o.capMap || T.hatch, side: DS, inkA: 0.75 });
}
function buildCabinCM() {
  const K = "dCM";
  const root = showItem(K, { name: "Command Module Columbia · cut away", by: "North American Aviation · Downey", desc: "The crew's home for eight days: three couches under the main display console, the navigation station at their feet, equipment bays down both sides, and the heat shield, parachutes and thrusters packed round the pressure vessel. A 140° wedge is cut away to show the layers.", kv: [["Habitable volume", "5.9 m³"], ["Cabin in flight", "pure O₂ at 34 kPa · 5 psi"], ["On the pad", "60 % O₂ / 40 % N₂"], ["Pressure vessel", "aluminium honeycomb"], ["Heat shield", "ablator on brazed steel honeycomb"], ["Windows", "5"]] });
  const cm = new THREE.Group(); cm.position.y = 0.62; root.add(cm);
  const P_AFT = [[0, -0.18], [0.9, -0.15, 1], [1.5, -0.08, 1], [1.86, 0.0, 1], [1.955, 0.08, 1], [1.95, 0.2, 1], [1.9, 0.28]];
  const P_CONE = [[1.9, 0.28], [1.42, 1.06], [0.934, 1.85]];
  const P_FWD = [[0.934, 1.85], [0.62, 2.36, 1], [0.56, 2.46, 1], [0.46, 2.66, 1], [0.44, 2.72]];
  const Q = [[0, 0.0], [0.9, 0.03, 1], [1.3, 0.1, 1], [1.42, 0.22], [1.42, 0.793], [0.727, 1.92], [0.5, 2.05, 1], [0.42, 2.12], [0.42, 2.98]];
  const coneIn = (y, d) => 1.9 - 0.6154 * (y - 0.28) - d / 0.852;        // radius of a surface d inside the outer cone
  const HD = CM_HD, RT = CM_RT;

  within(asm(K, "aft", "Aft heat shield", "The thickest ablator on the spacecraft: an epoxy-novolac resin gunned by hand into every cell of a fibreglass-phenolic honeycomb, bonded to brazed stainless-steel honeycomb. It led the way through entry at about 11 km/s.", [0, 0, 0], [["Ablator", "Avcoat 5026-39 in honeycomb"], ["Substructure", "brazed steel honeycomb"], ["Entry speed", "≈11 km/s · 36,000 ft/s"], ["Peak surface", "≈2,760 °C"]], cm), (g) => {
    cutShell(g, band(P_AFT, 0, 0.055), "light", { map: T.heat, capRole: "dark", capMap: T.honey });
    cutShell(g, band(P_AFT, 0.055, 0.09), "metal", { capRole: "grey", capMap: T.honey });
  });
  within(asm(K, "shell", "Crew-compartment heat shield", "The conical shield round the cabin: thinner ablator on the same brazed steel honeycomb, with a fibrous insulation blanket between it and the pressure vessel.", [0, 0, 0], [["Ablator", "thinner on the lee side"], ["Insulation", "fibrous blanket"]], cm), (g) => {
    cutShell(g, band(P_CONE, 0, 0.02), "white", { map: T.cmOut, alt: "glass", vy: [0.28, 2.36], capRole: "dark", capMap: T.honey });
    cutShell(g, band(P_CONE, 0.02, 0.05), "metal", { capRole: "grey", capMap: T.honey });
    cutShell(g, band([[1.586, 0.79], [0.934, 1.85]], 0.05, 0.14), "light", { capRole: "light", capMap: T.hatch2 });
    // side windows (left and right of the crew)
    const B = bulk();
    for (const s of [-1, 1]) {
      const a = Math.atan2(RT.x * s, RT.z * s), y = 1.2, rad = polar(1, a), n = rad.clone().multiplyScalar(0.852).add(V3(0, 0.524, 0));
      const pin = polar(coneIn(y, 0.185) + 0.004, a, y), pout = pin.clone().addScaledVector(n, 0.19);
      for (const [p, sg] of [[pin, -1], [pout, 1]]) { B.add(aim(new THREE.CylinderGeometry(0.115, 0.115, 0.012, 32), p.clone().addScaledVector(n, sg * 0.004), n), "glass"); B.add(aim(torusGeo(0.122, 0.014, 32), p, n), "dark"); }
      boltCircle(B, pin, n.clone().negate(), 0.145, 16, 0.006, 0.008);
    }
    B.flush(g);
  });
  within(asm(K, "fwd", "Forward heat shield · docking ring", "The apex cover over the parachutes. It was blown off at about 7,300 m on the way down so the drogues could deploy; the docking probe sits in the tunnel it surrounds.", [0, 1.6, 0], [["Jettisoned", "≈7,300 m · 24,000 ft"], ["Under it", "3 mains, 2 drogues, 3 pilots"]], cm), (g) => {
    cutShell(g, band(P_FWD, 0, 0.018), "white", { map: T.cmOut, capRole: "dark", capMap: T.honey });
    cutShell(g, band(P_FWD, 0.018, 0.04), "metal", { capRole: "grey", capMap: T.honey });
  });
  within(asm(K, "pv", "Pressure vessel · tunnel · probe", "The sealed inner structure the crew actually lived in: aluminium honeycomb, from the aft bulkhead under the couches to the forward hatch and docking tunnel. The probe on top drew Eagle's drogue in and latched the two ships together.", [0, 0, 0], [["Structure", "bonded aluminium honeycomb"], ["Forward hatch", "into the docking tunnel"], ["Probe", "3 capture latches · 12 ring latches"]], cm), (g) => {
    cutShell(g, band(Q, 0, 0.045), "light", { capRole: "silver", capMap: T.honey });
    const B = bulk();
    B.add(turn([[0.375, 2.18], [0.375, 2.22], [0.0, 2.22], [0, 2.18], [0.375, 2.18]], { seg: 40 }), "light");          // forward pressure hatch
    B.add(rodGeo(V3(-0.15, 2.17, 0.05), V3(0.15, 2.17, 0.05), 0.012, 8), "dark");
    for (let i = 0; i < 6; i++) B.add(new THREE.BoxGeometry(0.05, 0.035, 0.03).translate(...polar(0.33, (i / 6) * TAU, 2.165).toArray()), "grey");
    B.add(turn([[0.42, 2.98], [0.45, 2.98], [0.45, 3.0], [0.36, 3.0], [0.36, 2.98]], { seg: 64 }), "grey");                 // docking ring
    for (let i = 0; i < 12; i++) B.add(new THREE.BoxGeometry(0.07, 0.07, 0.05).rotateY((i / 12) * TAU).translate(...polar(0.45, (i / 12) * TAU, 2.95).toArray()), "dark");
    for (let i = 0; i < 3; i++) B.add(rodGeo(polar(0.32, (i / 3) * TAU, 3.0), V3(0, 3.22, 0), 0.025, 8), "grey");      // probe
    B.add(rodGeo(V3(0, 3.0, 0), V3(0, 3.42, 0), 0.06, 14), "light");
    B.add(turn([[0, 3.42], [0.09, 3.42], [0.07, 3.48], [0, 3.5]], { seg: 20 }), "metal");
    for (let i = 0; i < 3; i++) B.add(new THREE.BoxGeometry(0.03, 0.08, 0.05).translate(...polar(0.09, (i / 3) * TAU + 0.5, 3.44).toArray()), "dark");
    // cabin wiring trays along the wall
    const tray = []; for (let i = 0; i <= 22; i++) { const a = CM_CUT0 + 0.05 + (i / 22) * (CM_CUTW - 0.1); tray.push(polar(1.36, a, 0.68)); }
    bundle(B, tray, 8, 0.006, 0.024, { clamps: 0.4 });
    B.flush(g);
  });
  // ---- crew and couches ----
  const LAT = [-0.66, 0, 0.66];
  const frames = LAT.map((x) => bodyFrame(HD.clone().multiplyScalar(-1.2).add(V3(0, 0.6, 0)).addScaledVector(RT, x), RT, HD, UP));
  const tips = [];
  within(asm(K, "crew", "Crew couches · pressure suits", "Three couches side by side on struts built to stroke and soften the splashdown, the commander on the left. Each suited crewman is plugged into the cabin's oxygen loop by two hoses and a communications lead.", [HD.x * 1.4 + RT.x * 2.0, 0.35, HD.z * 1.4 + RT.z * 2.0], [["Couches", "3, on load-attenuating struts"], ["Suits", "A7L pressure suits"], ["Umbilicals", "O₂ supply, O₂ return, comms"]], cm), (g) => {
    const B = bulk();
    frames.forEach((fr, i) => {
      tips.push(astronaut(B, fr, POSE.lie));
      const X = fr.X;
      for (const s of [-1, 1]) {                                    // couch frame rails
        B.add(new THREE.TubeGeometry(curveOf([X([0.28 * s, 1.92, -0.12]), X([0.28 * s, 1.6, -0.19]), X([0.28 * s, 0.95, -0.19]), X([0.28 * s, 0.8, -0.06]), X([0.28 * s, 0.82, 0.3])]), 30, 0.018, 8, false), "grey");
        B.add(new THREE.TubeGeometry(curveOf([X([0.28 * s, 0.82, 0.3]), X([0.28 * s, 0.6, 0.36]), X([0.28 * s, 0.38, 0.4])]), 16, 0.016, 8, false), "grey");
        fr.box([0.33 * s, 1.06, 0.06], [0.07, 0.36, 0.05], "light", B);                  // armrest
      }
      fr.box([0, 1.25, -0.205], [0.52, 0.72, 0.03], "light", B);                          // back pan
      fr.box([0, 1.8, -0.17], [0.34, 0.2, 0.05], "grey", B);                              // head rest
      fr.box([0, 0.86, -0.12], [0.52, 0.16, 0.03], "light", B);                           // seat pan
      fr.box([0, 0.62, 0.33], [0.48, 0.42, 0.025], "light", B);                           // lower-leg pan
      fr.box([0, 0.37, 0.52], [0.44, 0.03, 0.26], "grey", B);                             // foot restraint plate
      for (const x of [-0.13, 0.13]) fr.box([x, 0.4, 0.6], [0.12, 0.05, 0.09], "dark", B);
      for (const [x, y] of [[-0.25, 1.3], [0.25, 1.3], [-0.25, 0.9], [0.25, 0.9]]) {   // struts to the aft bulkhead
        const a = X([x, y, -0.2]), b = a.clone(); b.y = 0.08; B.add(rodGeo(a, b, 0.022, 10), "metal"); B.add(rodGeo(b, b.clone().add(V3(0, 0.05, 0)), 0.04, 10), "dark");
      }
      B.add(rodGeo(X([0, 1.55, -0.2]), X([0, 0.78, -0.2]).setY(0.08), 0.026, 10), "metal");
      if (i === 0) {                                                // commander's hand controllers
        const rh = X([0.35, 1.0, 0.14]), lh = X([-0.35, 1.0, 0.14]);
        B.add(aim(new THREE.CapsuleGeometry(0.025, 0.08, 4, 10), rh.clone().addScaledVector(UP, 0.05), UP), "dark"); B.add(new THREE.BoxGeometry(0.08, 0.04, 0.08).translate(rh.x, rh.y, rh.z), "grey");
        B.add(rodGeo(lh, lh.clone().addScaledVector(UP, 0.08), 0.012, 8), "grey"); B.add(aim(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8), lh.clone().addScaledVector(UP, 0.09), RT), "dark");
      }
    });
    // couch cross-beams tie the three into one unit
    for (const [y, z] of [[1.6, -0.21], [0.95, -0.21]]) B.add(rodGeo(frames[0].X([-0.32, y, z]), frames[2].X([0.32, y, z]), 0.024, 10), "grey");
    // suit umbilicals to the environmental control unit in the left-hand bay
    const ecu = (k) => HD.clone().multiplyScalar(-0.05 + k * 0.12).addScaledVector(RT, -1.2).add(V3(0, 0.62, 0));
    tips.forEach((t, i) => {
      const lift = 0.25 + i * 0.05;
      cable(B, [t.in, t.in.clone().add(V3(0, lift, 0)), ecu(i * 2).clone().add(V3(0.0, 0.25, 0)).addScaledVector(RT, 0.2), ecu(i * 2)], 0.019, { role: "paint", clip: 0.5, connector: false });
      cable(B, [t.out, t.out.clone().add(V3(0, lift + 0.05, 0)), ecu(i * 2 + 1).clone().add(V3(0, 0.3, 0)).addScaledVector(RT, 0.2), ecu(i * 2 + 1)], 0.019, { role: "grey", clip: 0.5, connector: false });
      cable(B, [t.comm, t.comm.clone().add(V3(0, 0.12, 0)), t.comm.clone().addScaledVector(HD, -0.4).add(V3(0, 0.25, 0)), HD.clone().multiplyScalar(-0.62).addScaledVector(RT, LAT[i] * 0.9).add(V3(0, 1.32, 0))], 0.006, { clip: 0.3 });
    });
    B.flush(g);
  });
  // ---- main display console ----
  within(asm(K, "mdc", "Main display console", "The panel arched over the crew's knees: flight controls and attitude balls in front of the commander, propulsion, caution-and-warning and a computer keyboard in the centre, electrical power, environmental and communications systems on the right.", [0, 0, 0], [["Left", "flight controls · FDAI"], ["Centre", "SPS, RCS, caution & warning, DSKY"], ["Right", "power, environment, comms"]], cm), (g) => {
    const n0 = HD.clone().multiplyScalar(0.82).add(V3(0, -0.57, 0)).normalize();
    const B = bulk();
    [-1, 0, 1].forEach((s, i) => {
      const yaw = -s * 24 * DEG, q = new THREE.Quaternion().setFromAxisAngle(V3().crossVectors(n0, RT).normalize(), yaw);
      const u = RT.clone().applyQuaternion(q), n = n0.clone().applyQuaternion(q), v = V3().crossVectors(n, u);
      const c = HD.clone().multiplyScalar(-0.4 + Math.abs(s) * 0.12).addScaledVector(RT, s * 0.6).add(V3(0, 1.44, 0));
      const F = frameAt(c, u, v, n);
      instrumentPanel(g, F, 0.62, 0.5, { seed: 5 + i, fdai: s === -1 ? [[-0.14, 0.08]] : s === 0 ? [[-0.18, 0.1]] : [], dsky: s === 0 ? [[0.17, -0.1]] : [], skip: (x, y) => (s === -1 && Math.hypot(x + 0.14, y - 0.08) < 0.12) || (s === 0 && (Math.hypot(x + 0.18, y - 0.1) < 0.12 || (x > 0.05 && y < 0.02))) });
      for (const [x, y] of [[-0.28, 0.24], [0.28, 0.24]]) B.add(rodGeo(F.P(x, y, -0.06), F.P(x * 1.2, y + 0.3, -0.35), 0.016, 8), "grey");   // brackets up to the forward bulkhead
    });
    B.flush(g);
  });
  // ---- lower equipment bay: navigation station ----
  within(asm(K, "leb", "Lower equipment bay · navigation station", "At the crew's feet: the guidance and navigation station, with the sextant and scanning telescope eyepieces, a second computer keyboard, and the Apollo Guidance Computer and inertial platform built into the bay.", [0, 0, 0], [["Sextant", "28× · two lines of sight"], ["Scanning telescope", "1×, 60° field"], ["Computer", "AGC, 2,048 words erasable"], ["Platform", "IMU, 3 gimbals"]], cm), (g) => {
    const c = HD.clone().multiplyScalar(-1.12).add(V3(0, 0.62, 0));
    const F = frameAt(c, RT.clone(), UP.clone(), HD.clone());
    instrumentPanel(g, F, 0.84, 0.46, { seed: 21, dsky: [[-0.25, -0.02]], skip: (x, y) => x < -0.1 });
    const B = bulk();
    for (const [x, len, r] of [[0.02, 0.26, 0.038], [0.26, 0.2, 0.032]]) {      // sextant (left) and telescope eyepieces
      const base = F.P(x, 0.38, 0.02), d = HD.clone().multiplyScalar(0.8).add(V3(0, -0.6, 0)).normalize();
      B.add(rodGeo(base, base.clone().addScaledVector(d, len), r, 16), "dark");
      B.add(aim(torusGeo(r * 1.2, r * 0.4, 16), base.clone().addScaledVector(d, len), d), "grey");
      B.add(new THREE.CylinderGeometry(r * 1.4, r * 1.4, 0.06, 16).translate(base.x, base.y, base.z), "grey");
    }
    boxIn(B, F, 0.14, 0.42, -0.05, 0.6, 0.14, 0.12, "grey");                   // optics base
    B.add(new THREE.SphereGeometry(0.15, 28, 18).translate(...F.P(0.14, 0.56, -0.12).toArray()), "silver");   // IMU housing
    boxIn(B, F, 0, -0.42, 0.02, 0.62, 0.22, 0.16, "silver");                   // AGC
    for (let i = 0; i < 9; i++) boxIn(B, F, -0.26 + i * 0.065, -0.42, 0.11, 0.012, 0.18, 0.02, "dark");
    for (const s of [-1, 1]) boxIn(B, F, s * 0.72, -0.08, -0.02, 0.36, 0.8, 0.08, "light");   // stowage lockers either side
    B.flush(g);
    for (const s of [-1, 1]) { const L = add(g, new THREE.PlaneGeometry(0.36, 0.8), "light", { map: T.locker, side: DS }); L.position.copy(F.P(s * 0.72, -0.08, 0.025)); L.quaternion.copy(F.q); }
  });
  // ---- side equipment bays ----
  within(asm(K, "bays", "Side equipment bays", "Left of the commander, the environmental control unit: suit-loop fans and heat exchangers, lithium-hydroxide canisters that scrubbed carbon dioxide, and the water-glycol cooling loop. Right of the lunar module pilot: food, waste management and stowage.", [0, 0, 0], [["CO₂ removal", "lithium hydroxide canisters"], ["Coolant", "water-glycol loop"], ["Right bay", "food · waste · stowage"]], cm), (g) => {
    const B = bulk();
    // left (−RT): environmental control unit
    const L = frameAt(RT.clone().multiplyScalar(-1.18).addScaledVector(HD, 0.0).add(V3(0, 0.42, 0)), HD.clone().negate(), UP.clone(), RT.clone());
    boxIn(B, L, 0, 0, -0.08, 1.0, 0.56, 0.14, "light");
    for (const x of [-0.32, -0.12]) { cylIn(B, L, x, 0.05, 0.0, 0.075, 0.04, "grey", 24); B.add(aim(torusGeo(0.06, 0.008, 20), L.P(x, 0.05, 0.022), L.n), "dark"); }   // LiOH canister lids
    for (const x of [0.1, 0.22, 0.34]) cylIn(B, L, x, 0.12, 0.0, 0.035, 0.06, "dark", 12);
    for (let i = 0; i < 6; i++) cable(B, [L.P(-0.44 + i * 0.16, -0.24, 0.0), L.P(-0.44 + i * 0.16, -0.15, 0.06), L.P(-0.36 + i * 0.13, 0.1, 0.07)], 0.01, { connector: false, role: i % 2 ? "metal" : "grey", clip: 0.25 });
    const lp = add(g, new THREE.PlaneGeometry(0.5, 0.2), "grey", { map: T.panel, side: DS }); lp.position.copy(L.P(0.2, -0.15, 0.002)); lp.quaternion.copy(L.q);
    // right (+RT): food and waste stowage
    const R = frameAt(RT.clone().multiplyScalar(1.18).add(V3(0, 0.42, 0)), HD.clone(), UP.clone(), RT.clone().negate());
    boxIn(B, R, 0, 0, -0.08, 1.0, 0.56, 0.14, "light");
    B.flush(g);
    const lk = add(g, new THREE.PlaneGeometry(1.0, 0.56), "light", { map: T.locker, side: DS }); lk.position.copy(R.P(0, 0, -0.008)); lk.quaternion.copy(R.q);
  });
  // ---- forward compartment: Earth landing system ----
  within(asm(K, "chutes", "Earth landing system", "Packed round the tunnel under the apex cover: two drogue mortars, three pilot-chute mortars and three main parachutes in their deployment bags. The mains lowered Columbia to the Pacific at about 35 km/h.", [0, 0.95, 0], [["Mains", "3 × 25.5 m ringsail"], ["Drogues", "2 × 5 m conical ribbon"], ["Pilots", "3 × 2.2 m ringslot"], ["Splashdown", "≈35 km/h on the mains"]], cm), (g) => {
    const B = bulk();
    for (const deg of [140, 220, 300]) {
      const a = deg * DEG, c = polar(0.57, a, 2.17);
      B.add(new THREE.CapsuleGeometry(0.11, 0.07, 6, 20).translate(c.x, c.y, c.z), "chute");
      for (const y of [-0.05, 0.03]) B.add(torusGeo(0.112, 0.006, 20).translate(c.x, c.y + y, c.z), "grey");
      cable(B, [c.clone().add(V3(0, 0.15, 0)), polar(0.5, a, 2.36), polar(0.44, a + 0.2, 2.62)], 0.008, { connector: false, role: "grey" });
    }
    for (const deg of [180, 260]) { const a = deg * DEG, base = polar(0.6, a, 2.04), d = polar(0.35, a).add(V3(0, 1, 0)).normalize(); B.add(rodGeo(base, base.clone().addScaledVector(d, 0.22), 0.055, 16), "grey"); B.add(aim(torusGeo(0.058, 0.01, 16), base.clone().addScaledVector(d, 0.2), d), "dark"); }
    for (const deg of [160, 240, 320]) { const a = deg * DEG, base = polar(0.64, a, 2.0); B.add(rodGeo(base, base.clone().add(V3(0, 0.13, 0)), 0.032, 12), "light"); }
    B.flush(g);
  });
  // ---- aft compartment: reaction control ----
  within(asm(K, "aftc", "Aft compartment · reaction control", "The ring between the heat shield and the pressure vessel: two independent reaction-control systems, each with its own fuel, oxidiser and helium tanks feeding six thrusters, plus the plumbing and harness that tie them in.", [0, 0, 0], [["Thrusters", "12 × 93 lbf, 2 systems"], ["Propellants", "MMH / N₂O₄"], ["Pressurant", "helium"]], cm), (g) => {
    const B = bulk();
    const tanks = [[150, "light"], [200, "silver"], [255, "light"], [305, "silver"]].map(([deg, role]) => {
      const c = polar(1.6, deg * DEG, 0.37);
      B.add(new THREE.CapsuleGeometry(0.1, 0.2, 6, 20).translate(c.x, c.y, c.z), role);
      B.add(torusGeo(0.102, 0.008, 20).translate(c.x, c.y, c.z), "grey");
      return c;
    });
    const he = [175, 280].map((deg) => { const c = polar(1.62, deg * DEG, 0.3); B.add(new THREE.SphereGeometry(0.12, 24, 16).translate(c.x, c.y, c.z), "silver"); return c; });
    const thr = [128, 190, 232, 318].map((deg) => {                      // thrusters through the shell
      const a = deg * DEG, y = 0.62, rad = polar(1, a), n = rad.clone().multiplyScalar(0.852).add(V3(0, 0.524, 0));
      const pin = polar(coneIn(y, 0.12), a, y);
      B.add(rodGeo(pin.clone().addScaledVector(n, -0.08), pin.clone().addScaledVector(n, 0.04), 0.035, 12), "grey");
      B.add(aim(turn([[0, 0], [0.03, 0], [0.055, 0.1], [0, 0.1]], { seg: 14 }), pin.clone().addScaledVector(n, 0.04), n), "dark");
      B.add(aim(new THREE.CylinderGeometry(0.06, 0.06, 0.005, 20), polar(coneIn(y, 0) + 0.004, a, y), n), "dark");
      return pin.clone().addScaledVector(n, -0.08);
    });
    tanks.forEach((c, i) => { cable(B, [c.clone().add(V3(0, 0.2, 0)), c.clone().lerp(thr[i], 0.5).add(V3(0, 0.12, 0)), thr[i]], 0.009, { connector: false, role: "metal", clip: 0.3 }); });
    he.forEach((c, i) => { cable(B, [c.clone().add(V3(0, 0.12, 0)), c.clone().lerp(tanks[i * 2], 0.5).add(V3(0, 0.12, 0)), tanks[i * 2].clone().add(V3(0, 0.2, 0))], 0.008, { connector: false, role: "grey", clip: 0.3 }); });
    const ring = []; for (let i = 0; i <= 20; i++) ring.push(polar(1.47, CM_CUT0 + 0.04 + (i / 20) * (CM_CUTW - 0.08), 0.56));
    bundle(B, ring, 6, 0.005, 0.02, { clamps: 0.35 });
    for (const c of tanks) cable(B, [c.clone().add(V3(0, 0.05, 0)).lerp(V3(0, c.y, 0), 0.06), polar(1.47, Math.atan2(c.x, c.z), 0.56)], 0.005, { connector: false });
    B.flush(g);
  });
  SHOW[K].cabin = true;
  SHOW[K].frame = SHOW[K].asm.map((a) => a.key);
}

// ---------- Lunar Module Eagle ----------
function extrudeXY(pts, z0, z1, holes = []) {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0, bevelEnabled: false });
  g.translate(0, 0, z0);
  return g;
}
function buildCabinLM() {
  const K = "dLM";
  const root = showItem(K, { name: "Lunar Module Eagle · cabin cut away", by: "Grumman · Bethpage", desc: "Two men standing, held down by restraint cables, in a cabin about the size of a closet: flight displays under two triangular windows, the computer keyboard between them, the ascent-engine cover behind, and the square hatch at their feet they crawled out of onto the porch.", kv: [["Cabin volume", "6.7 m³ pressurised (235 ft³)"], ["Crew compartment", "92 in cylinder, 42 in deep"], ["Cabin in flight", "pure O₂ at 33 kPa · 4.8 psi"], ["Crew stations", "2, standing, 44 in apart"], ["Forward hatch", "32 in square"], ["Windows", "2 forward · 1 docking"]] });
  const lmG = new THREE.Group(); lmG.rotation.y = -75 * DEG; root.add(lmG);
  // descent stage: a copy of the flight model's, legs down
  mod("dLM.desc", lmG); MODULES["dLM.desc"] = { ...MODULES.lmDescent, name: "Descent stage", short: "Descent stage" };
  setLegs(1); MODS.lmDescent.group.updateMatrixWorld(true);
  const desc = MODS.lmDescent.group.clone(true);
  setLegs(0);
  within("dLM.desc", (g) => {
    const drop = [];
    desc.traverse((o) => {
      if (!o.isMesh) return;
      if (o.material.uniforms?.uShape) { drop.push(o); return; }
      const m0 = o.material;
      o.material = matFor(m0.userData.role, m0.uniforms.uMap.value, m0.userData.opt);
      o.userData = { mod: "dLM.desc" }; tagPart(o); MODS["dLM.desc"].meshes.push(o);
    });
    drop.forEach((o) => o.parent.remove(o));
    desc.position.set(0, 0, 0); g.add(desc);
  });
  SHOW[K].asm.push({ key: "dLM.desc", group: MODS["dLM.desc"].group, ex: V3() });
  const bb = new THREE.Box3().setFromObject(desc);
  lmG.position.y = -bb.min.y;
  const ascG = new THREE.Group(); ascG.position.y = 1.78; lmG.add(ascG);
  const LIFT = 2.1, { deck, zf, zb, zm, mfloor, zt, mtop } = LMA;
  const keys = {
    shell: asm(K, "cab", "Ascent stage structure", "The pressurised crew compartment, a 92 in cylinder 42 in deep whose upper part juts forward over the hatch, and the midsection behind it with the overhead hatch and docking tunnel. Chem-milled aluminium under thermal blankets and micrometeoroid shields. The commander's side wall is cut away here.", [0, LIFT, 0], [["Crew compartment", "92 in Ø × 42 in"], ["Midsection", "54 in deep"], ["Docking tunnel", "32 in Ø × 16 in"], ["RCS", "16 × 100 lbf, 4 quads"]], ascG),
    panels: asm(K, "panels", "Displays and controls", "Panels 1 and 2 under the windows carry each man's flight instruments and attitude ball; panel 3 between them and the computer keyboard on panel 4 below it, just above the hatch. Circuit breakers fill panels 11 and 16 overhead on either side.", [0, LIFT, 0.45], [["Panels 1 · 2", "commander · LM pilot flight displays"], ["Panel 4", "DSKY"], ["Panels 11 · 16", "circuit breakers"]], ascG),
    crew: asm(K, "crew", "Crew stations", "No seats: each man stood at his window, held to the floor by a restraint harness on cables, with the attitude controller under his right hand and the thrust-translation controller under his left. Suit hoses run back to the environmental control system.", [1.8, LIFT, 0], [["Commander", "left station (+X here)"], ["LM pilot", "right station"], ["Station spacing", "44 in"], ["Controls", "ACA right hand · TTCA left hand"]], ascG),
    mid: asm(K, "mid", "Midsection · engine cover · life support", "Behind the crew and 18 in higher: the ascent-engine cover in the middle of the floor, the two backpacks stowed against the aft bulkhead, and the environmental control system's suit loop, water separators and CO₂ canisters on the side wall.", [0.9, LIFT, -0.7], [["Floor", "18 in above the crew deck"], ["Backpacks", "2 PLSS stowed aft"], ["Suit loop", "fans · water separators · LiOH"]], ascG),
    tanks: asm(K, "tanks", "Ascent propellant tanks", "One fuel and one oxidiser tank, a sphere of about 1.25 m on either side of the midsection, pressure-fed by helium to the ascent engine below the floor. The near-side tank is left out of this cutaway so the midsection can be seen.", [-0.6, LIFT, -0.6], [["Fuel", "Aerozine 50"], ["Oxidiser", "N₂O₄"], ["Feed", "helium pressure"]], ascG),
    bay: asm(K, "bay", "Aft equipment bay", "The unpressurised rack cantilevered 33 in behind the midsection: the LM guidance computer, the abort guidance system that could fly Eagle back to orbit on its own, batteries, inverters and cold plates, with the two oxygen tanks and two helium tanks below.", [0, LIFT, -1.7], [["Computers", "LGC · AGS"], ["Tanks", "2 ECS oxygen · 2 helium"], ["Cooling", "cold plates"]], ascG),
    aps: asm(K, "aps", "Ascent engine", "Hung under the midsection floor inside the engine cover, firing down through the descent stage, which served as its launch pad on the Moon.", [0, LIFT * 0.55, 0], [["Thrust", "3,500 lbf"], ["Gimbal", "none"]], ascG),
  };
  buildLMAscentExterior((cat, fn) => within(keys[cat], () => fn(MODS[keys[cat]].group)), { cut: true });
  // floors, step, overhead hatch
  within(keys.shell, (g) => {
    const B = bulk();
    B.add(new THREE.BoxGeometry(1.40, 0.03, zf - 0.04 - (zb + 0.04)).translate(0, deck - 0.015, (zf - 0.04 + zb + 0.04) / 2), "grey");
    B.add(new THREE.BoxGeometry(1.40, deck + 0.04, zf - zb - 0.1).translate(0, (deck - 0.05) / 2 - 0.02, (zf + zb) / 2), "dark");
    B.add(new THREE.BoxGeometry(1.52, 0.03, zb - zm - 0.07).translate(0, mfloor - 0.015, (zb + zm) / 2), "grey");
    B.add(new THREE.BoxGeometry(1.40, mfloor - deck, 0.03).translate(0, (deck + mfloor) / 2, zb + 0.05), "light");
    for (let i = 0; i < 7; i++) B.add(new THREE.BoxGeometry(1.32, 0.006, 0.02).translate(0, deck + 0.003, zb + 0.18 + i * 0.13), "dark");
    B.add(turn([[0, 0], [0.40, 0], [0.40, 0.03], [0, 0.03]], { seg: 40 }).translate(0, mtop - 0.06, zt), "grey");
    B.add(rodGeo(V3(-0.15, mtop - 0.08, zt + 0.05), V3(0.15, mtop - 0.08, zt + 0.05), 0.012, 8), "dark");
    B.add(rodGeo(V3(0, 2.05, 1.05), V3(0, 2.46, 1.05), 0.055, 16), "grey");                                   // AOT body inside
    B.add(rodGeo(V3(0, 2.05, 1.05), V3(0, 1.98, 0.95), 0.035, 12), "dark");
    B.add(aim(torusGeo(0.04, 0.012, 14), V3(0, 1.98, 0.95), V3(0, -0.6, -1)), "grey");
    B.flush(g);
  });
  within(keys.panels, (g) => {
    const n0 = V3(0, 0.45, -1).normalize();
    for (const s of [1, -1]) {                                       // panel 1 (commander, +X) and panel 2 (LM pilot, −X)
      const q = new THREE.Quaternion().setFromAxisAngle(UP, s * 14 * DEG);
      const n = n0.clone().applyQuaternion(q), u = V3(-1, 0, 0).applyQuaternion(q), v = V3().crossVectors(n, u);
      instrumentPanel(g, frameAt(V3(s * 0.64, 1.34, 1.17), u, v, n), 0.6, 0.42, { seed: s > 0 ? 31 : 37, fdai: [[0, 0.07]], skip: (x, y) => Math.hypot(x, y - 0.07) < 0.12 });
    }
    const u = V3(-1, 0, 0), v = V3().crossVectors(n0, u);
    instrumentPanel(g, frameAt(V3(0, 1.49, 1.2), u, v, n0), 0.4, 0.2, { seed: 41 });
    instrumentPanel(g, frameAt(V3(0, 1.25, 1.19), u, v, n0), 0.4, 0.22, { seed: 43, dsky: [[0.0, 0.0]], skip: (x) => Math.abs(x) < 0.12 });
    // circuit-breaker panel 16 on the upper-right slope, panels 12/14 on the side wall (the LM pilot's right)
    const sl = V3(0.605, 0.796, 0), nIn = V3(0.796, -0.605, 0), F16 = frameAt(V3(-0.99, 2.105, 0.76).addScaledVector(nIn, 0.085), V3(0, 0, -1), sl, nIn);
    instrumentPanel(g, F16, 0.86, 0.5, { map: T.breakers, seed: 51, skip: () => true });
    const B = bulk();
    for (let r = 0; r < 4; r++) for (let c = 0; c < 22; c++) B.add(aim(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8), F16.P(-0.39 + c * 0.037, -0.17 + r * 0.11, 0.01), nIn), c % 7 === 3 ? "paint" : "dark");
    B.flush(g);
    instrumentPanel(g, frameAt(V3(-1.17, 1.15, 0.78), V3(0, 0, -1), UP.clone(), V3(1, 0, 0)), 0.86, 0.5, { seed: 53 });
  });
  within(keys.crew, (g) => {
    const B = bulk(), tips = [];
    for (const xc of [LM_STATION, -LM_STATION]) {
      const fr = bodyFrame(V3(xc, deck, 0.72), V3(-1, 0, 0), UP.clone(), V3(0, 0, 1));
      tips.push(astronaut(B, fr, POSE.stand));
      for (const s of [-1, 1]) {                                      // restraint cables floor → waist
        const f = V3(xc + s * 0.27, deck, 0.7), w = V3(xc + s * 0.15, deck + 0.95, 0.72);
        B.add(new THREE.BoxGeometry(0.07, 0.05, 0.07).translate(f.x, f.y + 0.025, f.z), "dark");
        B.add(rodGeo(f.clone().add(V3(0, 0.05, 0)), w, 0.006, 6), "grey");
        B.add(aim(torusGeo(0.025, 0.006, 10), w, V3(1, 0, 0)), "dark");
      }
      const rh = V3(xc - 0.24, deck + 1.03, 1.06), lh = V3(xc + 0.24, deck + 1.03, 1.06);
      B.add(aim(new THREE.CapsuleGeometry(0.026, 0.09, 4, 12), rh.clone().add(V3(0, 0.07, 0)), V3(0, 1, 0.25)), "dark");   // ACA grip
      B.add(new THREE.BoxGeometry(0.09, 0.05, 0.09).translate(rh.x, rh.y - 0.02, rh.z), "grey");
      B.add(rodGeo(lh, lh.clone().add(V3(0, 0.08, 0)), 0.012, 8), "grey"); B.add(aim(new THREE.CylinderGeometry(0.014, 0.014, 0.13, 8), lh.clone().add(V3(0, 0.09, 0)), V3(1, 0, 0)), "dark");   // TTCA
      for (const p of [rh, lh]) { B.add(rodGeo(p.clone().add(V3(0, -0.045, 0)), V3(p.x, deck + 0.85, 1.25), 0.016, 8), "grey"); B.add(new THREE.BoxGeometry(0.16, 0.025, 0.2).translate(p.x, p.y - 0.045, 1.13), "light"); }
    }
    const ecs = (k) => V3(-0.72, 1.15 + k * 0.06, -0.55 - k * 0.05);
    tips.forEach((t, i) => {
      cable(B, [t.in, t.in.clone().add(V3(0, -0.15, -0.15)), V3(t.in.x * 0.6 - 0.2, 1.2, 0.12), ecs(i * 2)], 0.019, { role: "paint", clip: 0.5, connector: false });
      cable(B, [t.out, t.out.clone().add(V3(0, -0.2, -0.12)), V3(t.out.x * 0.6 - 0.25, 1.25, 0.08), ecs(i * 2 + 1)], 0.019, { role: "grey", clip: 0.5, connector: false });
      cable(B, [t.comm, t.comm.clone().add(V3(0, -0.1, 0.1)), V3(t.comm.x, 1.1, 1.15)], 0.006, { clip: 0.25 });
    });
    B.flush(g);
  });
  within(keys.mid, (g) => {
    add(g, turn([[0.48, mfloor], [0.48, mfloor + 0.18], [0.42, mfloor + 0.28, 1], [0.24, mfloor + 0.33, 1], [0, mfloor + 0.34]], { seg: 48 }), "light", { p: [0, 0, -0.3], map: T.foilQ });
    const B = bulk();
    for (let i = 0; i < 12; i++) B.add(new THREE.BoxGeometry(0.03, 0.04, 0.03).translate(...polar(0.49, (i / 12) * TAU, mfloor + 0.03).add(V3(0, 0, -0.3)).toArray()), "dark");
    for (const x of [-0.48, 0.18]) {                                 // backpacks + oxygen purge units against the aft bulkhead
      const z = zm + 0.17;
      B.add(new THREE.BoxGeometry(0.48, 0.66, 0.24).translate(x, mfloor + 0.33, z), "white");
      B.add(new THREE.BoxGeometry(0.48, 0.2, 0.2).translate(x, mfloor + 0.76, z), "light");
      for (const y of [mfloor + 0.18, mfloor + 0.43]) B.add(new THREE.BoxGeometry(0.5, 0.025, 0.26).translate(x, y, z), "grey");
    }
    // environmental control on the side wall
    const wx = -0.71;
    B.add(new THREE.BoxGeometry(0.14, 0.7, 0.8).translate(wx, 1.25, -0.6), "light");
    for (const [y, z, r] of [[1.45, -0.35, 0.08], [1.45, -0.6, 0.08], [1.05, -0.85, 0.1], [1.05, -0.45, 0.07]]) B.add(rodGeo(V3(wx + 0.07, y, z), V3(wx + 0.22, y, z), r, 18), r > 0.09 ? "silver" : "grey");
    for (let i = 0; i < 4; i++) B.add(rodGeo(V3(wx + 0.03, 0.95 + i * 0.12, -1.0), V3(wx + 0.03, 0.95 + i * 0.12, -0.2), 0.012, 8), i % 2 ? "metal" : "grey");
    for (let k = 0; k < 4; k++) { const p = V3(-0.72, 1.15 + k * 0.06, -0.55 - k * 0.05); B.add(aim(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), p, V3(1, 0, 0)), "dark"); }
    B.flush(g);
    const ep = add(g, new THREE.PlaneGeometry(0.8, 0.36), "grey", { map: T.panel, side: DS }); ep.position.set(wx + 0.075, 1.78, -0.6); ep.rotation.y = Math.PI / 2;
  });
  SHOW[K].cabin = true;
  SHOW[K].view = { az: 40 * DEG, el: 28 * DEG };
  SHOW[K].frame = SHOW[K].asm.filter((a) => a.key !== "dLM.desc").map((a) => a.key);
}

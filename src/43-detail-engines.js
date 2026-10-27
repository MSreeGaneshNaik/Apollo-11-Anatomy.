// ============================================================================
// 43 · DETAILED ENGINES — each engine alone on a test stand, built to the plumbing.
// Assemblies separate along their own vectors when the stand is taken apart.
// ============================================================================
const SHOW = {};   // item key → { group, asm: [{ key, group, ex }], fx: [], Y0, info }
const SHOW_X = { dF1: 700, dJ2: 760, dSPS: 810, dDPS: 855, dAPS: 895, dCM: 950, dLM: 1010 };
function showItem(key, info) {
  const g = mod(key); g.position.set(SHOW_X[key], 0, 0); g.visible = false;
  SHOW[key] = { key, group: g, asm: [], fx: [], info };
  MODULES[key] = { name: info.name, desc: info.desc, by: info.by, kv: info.kv };
  return g;
}
function asm(item, sub, name, desc, ex, kv = [], parent) {
  const key = `${item}.${sub}`, g = mod(key, parent || SHOW[item].group);
  MODULES[key] = { name, desc, kv, short: name };
  SHOW[item].asm.push({ key, group: g, ex: V3(...ex) });
  return key;
}
const at3 = (o, x, y, z) => V3(o.x + x, y, o.z + z);

// ---------------- F-1 ----------------
function buildDetailF1() {
  const K = "dF1", Y0 = 3.6;
  const root = showItem(K, { name: "Rocketdyne F-1", by: "Rocketdyne · Canoga Park", desc: "One of the five engines that lifted Apollo 11, built down to its plumbing: thrust chamber, nozzle extension, Mark 10 turbopump, gas generator, heat exchanger, the four main valves, actuators and wiring.", kv: [["Thrust", "1,522,000 lbf SL · 1,746,000 lbf vac"], ["Flow", "2,577 kg/s (1,789 LOX + 788 RP-1)"], ["Chamber", "70 bar · 2.27 : 1 mixture"], ["Height × width", "5.8 m × 3.7 m"], ["Dry mass", "8,400 kg"], ["Turbopump", "≈55,000 bhp at 5,500 rpm"]] });
  const eng = new THREE.Group(); eng.position.y = Y0; eng.rotation.y = -20 * DEG; root.add(eng);
  const tp = V3(1.25, 0, 0);
  const TC = [[1.48, 2.26], [1.30, 2.6, 1], [1.10, 3.05, 1], [0.86, 3.55, 1], [0.64, 4.0, 1], [0.49, 4.36, 1], [0.46, 4.5]];
  const IFP = V3(-0.28, 5.87, 0.24);   // engine interface panel on the thrust mount
  const T_ = (x, y, z) => at3(tp, x, y, z);

  // nozzle extension + turbine exhaust manifold
  within(asm(K, "ext", "Nozzle extension", "Bolted on at an expansion ratio of 10 : 1 and taking the bell to 16 : 1. Turbine exhaust from the manifold film-cools its wall against the 3,200 °C main flow.", [0, -2.9, 0], [["Area ratio", "10 → 16 : 1"], ["Exit Ø", "≈3.7 m"], ["Cooling", "turbine-exhaust film"]], eng), (g) => {
    const B = bulk();
    add(g, turn([[1.88, 0], [1.81, 0.5, 1], [1.70, 1.1, 1], [1.60, 1.65, 1], [1.53, 2.0]], { seg: 160 }), "metal", { side: DS });
    add(g, turn([[1.88, 0], [1.96, 0.03], [1.96, 0.13], [1.86, 0.15]], { seg: 160 }), "light");
    for (const [y, r] of [[0.55, 1.805], [1.1, 1.70], [1.62, 1.605]]) add(g, turn([[r + 0.004, y - 0.05], [r + 0.05, y - 0.035], [r + 0.05, y + 0.035], [r + 0.004, y + 0.05]], { seg: 160 }), "light");
    flange(B, V3(0, 2.02, 0), UP, 1.5, 1.64, 0.05, 180);
    add(g, torusGeo(1.6, 0.2, 160), "metal", { p: [0, 2.13, 0] });
    for (let i = 0; i < 36; i++) { const a = (i / 36) * TAU; B.add(aim(torusGeo(0.206, 0.012, 16), polar(1.6, a, 2.13), V3(Math.cos(a), 0, -Math.sin(a))), "light"); }
    B.add(aim(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 20), polar(1.6, Math.PI / 2, 2.35), UP), "metal");
    B.flush(g);
  });
  // thrust chamber body
  within(asm(K, "tc", "Thrust chamber", "178 nickel-alloy tubes brazed into a bell carry RP-1 down the wall and back to cool it, then into the injector. Five hatbands hold the tubes against chamber pressure.", [0, -0.9, 0], [["Chamber pressure", "70 bar · 1,015 psi"], ["Tubes", "178 primary"], ["Expansion", "10 : 1 at the extension joint"]], eng), (g) => {
    const B = bulk();
    add(g, turn(TC, { seg: 200, vy: [2.26, 4.5] }), "metal", { map: T.tubesF1, side: DS });
    add(g, torusGeo(1.5, 0.05, 160), "light", { p: [0, 2.23, 0] });
    for (const [y, r] of [[2.48, 1.39], [2.86, 1.19], [3.27, 0.99], [3.7, 0.79], [4.08, 0.61]]) {
      add(g, turn([[r + 0.01, y - 0.04], [r + 0.045, y - 0.03], [r + 0.045, y + 0.03], [r + 0.01, y + 0.04]], { seg: 140 }), "light");
      for (const a of [0.5, 0.5 + Math.PI]) {
        const p = polar(r + 0.07, a, y), n = polar(1, a);
        B.add(aim(new THREE.BoxGeometry(0.1, 0.09, 0.07), p, n), "grey");
        for (const dz of [-0.03, 0.03]) for (const dy of [-0.025, 0.025]) B.add(aim(new THREE.CylinderGeometry(0.009, 0.009, 0.02, 6), p.clone().add(V3(0, dy, 0)).addScaledVector(V3(n.z, 0, -n.x), dz).addScaledVector(n, 0.04), n), "dark");
      }
    }
    add(g, turn([[0.46, 4.5], [0.52, 4.75, 1], [0.53, 5.1], [0.6, 5.1], [0.6, 5.14]], { seg: 96 }), "metal");
    add(g, torusGeo(0.62, 0.085, 96), "metal", { p: [0, 4.42, 0] });
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; B.add(rodGeo(polar(0.5, a, 4.36), polar(0.58, a, 4.4), 0.012, 6), "grey"); }
    for (const a of [65 * DEG, 115 * DEG]) flange(B, polar(0.72, a, 4.42), polar(1, a), 0.055, 0.1, 0.03, 10);
    for (const y of [4.0, 4.88]) { const p = polar(0.6 + (y < 4.4 ? 0.05 : -0.05), Math.PI / 2, y); B.add(aim(new THREE.BoxGeometry(0.12, 0.08, 0.1), p, V3(1, 0, 0)), "grey"); }
    B.flush(g);
  });
  // injector, LOX dome, gimbal
  within(asm(K, "inj", "Injector · LOX dome · gimbal", "A flat-faced injector with thousands of impinging orifices mixes RP-1 and LOX. The LOX dome above it feeds the oxidizer; the gimbal bearing on top carries all 1.5 million pounds of thrust into the vehicle.", [0, 0.25, 0], [["Mixture", "2.27 : 1 LOX / RP-1"], ["Gimbal", "spherical bearing on the dome"], ["Ignition", "hypergol TEA-TEB slug"]], eng), (g) => {
    const B = bulk();
    add(g, turn([[0.4, 5.14], [0.66, 5.14], [0.66, 5.22], [0.4, 5.22], [0.4, 5.14]], { seg: 96 }), "light");
    boltCircle(B, V3(0, 5.22, 0), UP, 0.62, 64, 0.011, 0.016);
    add(g, turn([[0.58, 5.22], [0.53, 5.33, 1], [0.42, 5.46, 1], [0.24, 5.56, 1], [0, 5.6]], { seg: 96 }), "metal");
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; B.add(aim(new THREE.BoxGeometry(0.03, 0.2, 0.012), polar(0.5, a, 5.36), polar(1, a)), "light"); }
    for (const a of [58 * DEG, 122 * DEG]) {
      const p0 = polar(0.42, a, 5.44), p1 = polar(0.6, a, 5.5);
      B.add(rodGeo(p0, p1, 0.075, 18), "metal");
      flange(B, p1, polar(1, a), 0.07, 0.12, 0.03, 10);
    }
    add(g, boxGeo(0.46, 0.22, 0.46, 0, 5.71, 0), "grey");
    add(g, sphereGeo(0.14, 0, 5.62, 0), "light");
    add(g, boxGeo(0.9, 0.06, 0.9, 0, 5.84, 0), "light");
    boltCircle(B, V3(0, 5.87, 0), UP, 0.36, 16, 0.016, 0.022);
    for (const [x, z] of [[0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]]) B.add(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 6).translate(x, 5.89, z), "dark");
    sensor(B, polar(0.5, 200 * DEG, 5.36), polar(1, 200 * DEG).add(V3(0, 0.6, 0)));
    sensor(B, polar(0.3, 300 * DEG, 5.52), V3(0, 1, 0).add(polar(0.4, 300 * DEG)));
    B.flush(g);
  });
  // Mark 10 turbopump + heat exchanger
  within(asm(K, "tp", "Mark 10 turbopump · heat exchanger", "One turbine drives the LOX pump (top) and the fuel pump (middle) on a common shaft at 5,500 rpm. The heat exchanger on the turbine exhaust warms helium and LOX to pressurise the S-IC tanks.", [2.8, 0.5, 0.6], [["Power", "≈55,000 bhp"], ["Speed", "5,500 rpm"], ["LOX delivered", "24,811 US gal/min"], ["RP-1 delivered", "15,471 US gal/min"]], eng), (g) => {
    const B = bulk();
    add(g, turn([[0, 4.76], [0.42, 4.76], [0.46, 4.95, 1], [0.41, 5.12], [0, 5.12]], { seg: 64 }), "light", { p: [tp.x, 0, tp.z] });
    add(g, torusGeo(0.47, 0.07, 64, 5.2), "light", { p: [tp.x, 4.95, tp.z] });
    boltCircle(B, T_(0, 4.95 + 0.07, 0), UP, 0.36, 36, 0.01, 0.014);
    for (const s of [-1, 1]) {
      duct(B, [T_(-0.02, 5.12, 0.24 * s), T_(-0.03, 5.45, 0.25 * s), T_(-0.04, 5.86, 0.27 * s)], 0.11, { bellows: [0.55], bolts: 16 });
      duct(B, [T_(0.0, 4.46, 0.34 * s), T_(0.05, 4.5, 0.62 * s), T_(0.0, 5.0, 0.7 * s), T_(-0.05, 5.86, 0.7 * s)], 0.085, { bellows: [0.68], bolts: 12 });
      flange(B, T_(-0.42, 4.98, 0.2 * s), V3(-1, 0, 0), 0.06, 0.1, 0.03, 8);
      flange(B, T_(-0.38, 4.46, 0.2 * s), V3(-1, 0, 0), 0.05, 0.09, 0.03, 8);
    }
    add(g, turn([[0.25, 3.95], [0.25, 4.3]], { seg: 40 }), "metal", { p: [tp.x, 0, tp.z] });
    add(g, turn([[0.25, 4.62], [0.27, 4.64], [0.27, 4.74], [0.25, 4.76]], { seg: 40 }), "grey", { p: [tp.x, 0, tp.z] });
    add(g, turn([[0, 4.3], [0.39, 4.3], [0.41, 4.47, 1], [0.37, 4.62], [0, 4.62]], { seg: 64 }), "light", { p: [tp.x, 0, tp.z] });
    add(g, torusGeo(0.42, 0.06, 64, 5.2), "light", { p: [tp.x, 4.47, tp.z] });
    boltCircle(B, T_(0, 4.47 + 0.06, 0), UP, 0.33, 32, 0.009, 0.013);
    for (const y of [4.02, 4.12, 4.22]) B.add(torusGeo(0.255, 0.012, 32).translate(tp.x, y, tp.z), "grey");
    add(g, turn([[0, 3.6], [0.37, 3.6], [0.39, 3.78, 1], [0.36, 3.95], [0, 3.95]], { seg: 64 }), "grey", { p: [tp.x, 0, tp.z] });
    add(g, torusGeo(0.39, 0.05, 56), "metal", { p: [tp.x, 3.86, tp.z] });
    boltCircle(B, T_(0, 3.95, 0), UP, 0.3, 28, 0.009, 0.012);
    add(g, turn([[0, 3.25], [0.28, 3.25], [0.28, 3.6], [0, 3.6]], { seg: 48, vy: [3.25, 3.6] }), "metal", { p: [tp.x + 0.07, 0, tp.z], map: T.coil });
    for (const y of [3.3, 3.43, 3.55]) B.add(torusGeo(0.29, 0.016, 40).translate(tp.x + 0.07, y, tp.z), "light");
    for (const [dz, r] of [[0.18, 0.022], [0.26, 0.022], [-0.2, 0.03], [-0.28, 0.03]]) {
      cable(B, [T_(0.33, 3.45, dz), T_(0.42, 3.8, dz * 1.1), T_(0.4, 4.6, dz * 1.3), T_(0.3, 5.86, dz * 1.4)], r, { clip: 0.35, connector: false, role: "grey" });
      flange(B, T_(0.3, 5.86, dz * 1.4), UP, r, r * 1.9, 0.02, 4);
    }
    const sp = sensor(B, T_(0.25, 4.7, 0.18), V3(1, 0, 0.6));
    cable(B, [sp, T_(0.36, 4.75, 0.3), T_(0.2, 5.3, 0.45), T_(-0.3, 5.6, 0.5)], 0.008);
    for (const s of [-1, 1]) cable(B, [T_(0.2, 4.4, 0.3 * s), T_(0.33, 4.3, 0.22 * s), T_(0.34, 4.0, 0.15 * s), T_(0.27, 3.98, 0.1 * s)], 0.016, { connector: false, clip: 0.4, role: "grey" });
    for (const [y, a] of [[4.0, -0.06], [4.88, 0.06]]) strut(B, T_(-0.27, y, 0), polar(0.66, Math.PI / 2, y + a), 0.035);
    B.flush(g);
  });
  // gas generator
  within(asm(K, "gg", "Gas generator", "Burns a fuel-rich RP-1 / LOX mixture at about 800 °C to spin the turbine. Its sooty exhaust, piped through the heat exchanger and manifold, is the dark sheath seen around every F-1 plume.", [2.4, 1.4, 2.2], [["Turbine inlet", "≈820 °C (1,500 °F)"], ["Valve", "ball valve, hydraulically opened"], ["Igniters", "2 pyrotechnic"]], eng), (g) => {
    const B = bulk(), gg = T_(0.45, 0, 0.42);
    add(g, turn([[0, 3.62], [0.11, 3.62], [0.11, 3.94], [0.08, 4.0, 1], [0, 4.02]], { seg: 28 }), "metal", { p: [gg.x, 0, gg.z] });
    for (const y of [3.7, 3.82]) B.add(torusGeo(0.112, 0.01, 24).translate(gg.x, y, gg.z), "light");
    const w = valve(B, V3(gg.x, 4.12, gg.z), V3(0, 0, 1), 0.075);
    cable(B, [T_(-0.4, 4.9, 0.12), T_(-0.1, 4.62, 0.34), V3(gg.x - 0.02, 4.2, gg.z - 0.06)], 0.022, { connector: false, role: "metal" });
    cable(B, [T_(-0.36, 4.42, 0.16), T_(0.05, 4.32, 0.42), V3(gg.x, 4.2, gg.z + 0.06)], 0.022, { connector: false, role: "metal" });
    duct(B, [V3(gg.x, 3.62, gg.z), T_(0.42, 3.55, 0.3), T_(0.38, 3.78, 0.12)], 0.05, { bolts: 8 });
    for (const s of [-1, 1]) { const p = sensor(B, V3(gg.x + 0.11, 3.78 + s * 0.06, gg.z), V3(1, s * 0.3, 0.2), 0.016); cable(B, [p, V3(gg.x + 0.22, 3.9, gg.z - 0.1), T_(0.1, 4.05, 0.55)], 0.006); }
    cable(B, [w, V3(gg.x + 0.12, 4.3, gg.z - 0.1), T_(-0.1, 4.75, 0.55)], 0.007);
    B.flush(g);
  });
  // main propellant valves
  within(asm(K, "mv", "Main valves", "Two main LOX valves on the dome and two main fuel valves on the fuel manifold, opened by fuel-pressure actuators in a fixed sequence so the engine lights LOX-lead and shuts down cleanly.", [-0.2, 1.1, 2.6], [["Main LOX valves", "2, on the LOX dome"], ["Main fuel valves", "2, on the fuel manifold"], ["Actuation", "hydraulic, RP-1 as fluid"]], eng), (g) => {
    const B = bulk();
    SHOW.dF1.wire = [];
    for (const a of [58 * DEG, 122 * DEG]) SHOW.dF1.wire.push(valve(B, polar(0.75, a, 5.52), polar(1, a), 0.13));
    for (const a of [65 * DEG, 115 * DEG]) SHOW.dF1.wire.push(valve(B, polar(0.85, a, 4.42), polar(1, a), 0.11));
    B.flush(g);
  });
  // high-pressure ducts and turbine exhaust duct
  within(asm(K, "duct", "High-pressure ducts", "Two LOX and two RP-1 ducts carry pump discharge to the main valves; a large duct takes turbine exhaust through the heat exchanger down to the manifold. Bellows let the chamber gimbal and grow with heat.", [1.6, 0.25, 0], [["LOX ducts", "2 · pump → dome valves"], ["Fuel ducts", "2 · pump → manifold valves"], ["Exhaust duct", "turbine → HX → manifold"]], eng), (g) => {
    const B = bulk();
    for (const [s, a] of [[1, 58 * DEG], [-1, 122 * DEG]]) {
      const vEnd = polar(0.75 + 0.16, a, 5.52);
      duct(B, [T_(-0.44, 4.98, 0.2 * s), T_(-0.58, 5.16, 0.3 * s), vEnd.clone().add(polar(0.12, a)).add(V3(0, -0.06, 0)), vEnd.clone().add(polar(0.03, a))], 0.09, { bellows: [0.45], clamps: [0.2, 0.75], bolts: 12 });
    }
    for (const [s, a] of [[1, 65 * DEG], [-1, 115 * DEG]]) {
      const vEnd = polar(0.85 + 0.14, a, 4.42);
      duct(B, [T_(-0.4, 4.46, 0.2 * s), T_(-0.32, 4.38, 0.32 * s), vEnd.clone().add(polar(0.1, a)), vEnd.clone().add(polar(0.02, a))], 0.075, { bellows: [0.5], bolts: 10 });
    }
    duct(B, [T_(0.08, 3.24, 0), T_(0.17, 2.96, 0), T_(0.28, 2.62, 0), polar(1.6, Math.PI / 2, 2.42)], 0.15, { bellows: [0.35], clamps: [0.65], bolts: 20 });
    B.flush(g);
  });
  // gimbal actuators
  within(asm(K, "act", "Gimbal actuators", "Two hydraulic actuators swing each outboard F-1 up to about ±6°, steering the stack. They run on RP-1 tapped from the fuel pump rather than a separate hydraulic oil.", [-2.6, 0.7, -1.0], [["Count", "2 per outboard engine"], ["Fluid", "RP-1 from the fuel pump"], ["Feedback", "position transducer on each"]], eng), (g) => {
    const B = bulk();
    for (const [ax, az] of [[0, 1], [-1, 0]]) {
      const a = V3(0.95 * ax, 5.84, 0.95 * az), b = V3(0.58 * ax, 4.88, 0.58 * az), m = a.clone().lerp(b, 0.55);
      B.add(rodGeo(a, m, 0.085, 18), "light"); B.add(rodGeo(m, b, 0.045, 14), "metal");
      for (const p of [a, b]) { B.add(new THREE.SphereGeometry(0.075, 14, 10).translate(p.x, p.y, p.z), "grey"); B.add(aim(new THREE.BoxGeometry(0.16, 0.06, 0.12), p, V3(-az, 0, ax)), "dark"); }
      const sv = a.clone().lerp(b, 0.22).add(V3(az * 0.13, 0, -ax * 0.13));
      B.add(new THREE.BoxGeometry(0.16, 0.14, 0.12).translate(sv.x, sv.y, sv.z), "grey");
      for (const s of [-1, 1]) cable(B, [sv.clone().add(V3(0, s * 0.05, 0)), sv.clone().add(V3(az * 0.2, 0.25 + s * 0.05, -ax * 0.2)), V3(0.6 * ax + az * 0.5, 5.86, 0.6 * az - ax * 0.5)], 0.016, { connector: false, clip: 0.3, role: "grey" });
      const fb = a.clone().lerp(b, 0.7).add(V3(-az * 0.1, 0, ax * 0.1));
      B.add(rodGeo(fb.clone().add(V3(0, 0.2, 0)), fb.clone().add(V3(0, -0.2, 0)), 0.018), "dark");
      cable(B, [sv.clone().add(V3(-az * 0.08, 0.08, ax * 0.08)), sv.clone().add(V3(-az * 0.2, 0.3, ax * 0.2)), IFP.clone().add(V3(0.05 * ax, 0, 0.05 * az))], 0.007);
    }
    B.flush(g);
  });
  // electrical harness, junction box, interface panel, transducers
  within(asm(K, "elec", "Wiring harness · instrumentation", "A ring harness round the chamber feeds every valve, igniter and transducer from the main junction box. Chamber pressure, pump discharge, turbine temperature, speed and vibration are all wired back to the vehicle's telemetry.", [-1.7, 0, 2.4], [["Junction box", "1 main, 8 connectors"], ["Transducers", "pressure, temperature, speed, vibration"], ["Thrust-OK switches", "3 on the fuel manifold"]], eng), (g) => {
    const B = bulk();
    const ring = []; for (let i = 0; i <= 26; i++) { const a = 150 * DEG + (i / 26) * 300 * DEG; ring.push(polar(0.72, a, 4.8 + 0.03 * Math.sin(i))); }
    bundle(B, ring, 7, 0.006, 0.022, { clamps: 0.45 });
    const JA = 340 * DEG, jb = polar(0.7, JA, 4.72);
    add(g, boxGeo(0.34, 0.26, 0.14), "light", { p: jb.toArray(), r: [0, JA, 0] });
    for (let i = 0; i < 8; i++) { const n = polar(1, JA), t = V3(n.z, 0, -n.x), p = jb.clone().addScaledVector(n, 0.08).addScaledVector(t, -0.12 + (i % 4) * 0.08).add(V3(0, i < 4 ? 0.06 : -0.06, 0)); B.add(aim(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 12), p, n), "dark"); }
    bundle(B, [polar(0.74, JA - 5 * DEG, 4.86), polar(0.66, JA - 5 * DEG, 5.2), polar(0.55, JA - 10 * DEG, 5.5), polar(0.45, JA - 12 * DEG, 5.74), IFP.clone().add(V3(0.02, -0.01, 0.04))], 9, 0.007, 0.028, { clamps: 0.3 });
    add(g, boxGeo(0.34, 0.05, 0.22, IFP.x, IFP.y + 0.03, IFP.z), "grey");
    for (let i = 0; i < 6; i++) B.add(new THREE.CylinderGeometry(0.026, 0.026, 0.05, 12).translate(IFP.x - 0.11 + (i % 3) * 0.11, IFP.y + 0.08, IFP.z - 0.05 + Math.floor(i / 3) * 0.1), "dark");
    for (const w of SHOW.dF1.wire) { const near = polar(0.72, Math.atan2(w.x, w.z), 4.8); bundle(B, [w, w.clone().lerp(near, 0.5).add(V3(0, 0.08, 0)), near], 3, 0.005, 0.012); }
    const onTC = (y) => rAt(TC, y) + 0.01;
    const S = [[onTC(3.3), 15, 3.3, 0.3], [onTC(2.75), 135, 2.75, 0.3], [onTC(3.9), 150, 3.9, 0.3], [onTC(3.6), 345, 3.6, 0.3], [0.53, 25, 4.95, 0.2], [0.53, 320, 4.7, 0], [0.71, 5, 4.42, 0.4], [0.71, 140, 4.42, 0.4], [onTC(2.45), 320, 2.45, 0.3], [0.53, 160, 4.95, 0.2], [onTC(4.2), 200, 4.2, 0.2], [onTC(3.0), 260, 3.0, 0.2]];
    for (const [r, deg, y, up] of S) {
      const a = deg * DEG, n = polar(1, a).add(V3(0, up, 0)), p = sensor(B, polar(r, a, y), n);
      const near = polar(0.72, a, 4.8);
      cable(B, [p, p.clone().addScaledVector(n, 0.06), p.clone().lerp(near, 0.5).add(V3(0, 0.05, 0)), near], 0.006, { connector: false, clip: 0.18 });
    }
    B.flush(g);
  });
  // ignition system and control valves
  within(asm(K, "ign", "Ignition · control valves", "A hypergolic cartridge of TEA-TEB burst by fuel pressure lights the chamber; pyrotechnic igniters light the gas generator. The four-way control valve and checkout valve sequence the hydraulic opening of the main valves.", [1.6, -0.8, 2.8], [["Chamber ignition", "TEA-TEB hypergol cartridge"], ["GG ignition", "pyrotechnic"], ["Sequencing", "4-way control valve"]], eng), (g) => {
    const B = bulk(), hc = polar(0.98, 100 * DEG, 4.75);
    add(g, turn([[0, -0.2], [0.065, -0.2], [0.07, -0.17], [0.07, 0.17], [0.065, 0.2], [0, 0.2]], { seg: 24 }), "light", { p: hc.toArray() });
    for (const y of [-0.12, 0, 0.12]) B.add(torusGeo(0.072, 0.008, 20).translate(hc.x, hc.y + y, hc.z), "grey");
    cable(B, [hc.clone().add(V3(0, 0.2, 0)), hc.clone().add(V3(-0.1, 0.42, -0.05)), polar(0.6, 100 * DEG, 5.18)], 0.016, { connector: false, role: "metal" });
    cable(B, [hc.clone().add(V3(0, -0.2, 0)), hc.clone().add(V3(-0.05, -0.3, 0.05)), polar(0.8, 85 * DEG, 4.45)], 0.016, { connector: false, role: "metal" });
    const w = valve(B, polar(1.0, 112 * DEG, 5.25), polar(1, 112 * DEG), 0.06);
    cable(B, [w, w.clone().add(V3(0, 0.2, -0.1)), IFP.clone().add(V3(0.08, 0, -0.06))], 0.006);
    const cv = V3(-0.75, 5.62, 0.35);
    add(g, boxGeo(0.26, 0.16, 0.2), "light", { p: cv.toArray() });
    for (let i = 0; i < 4; i++) cable(B, [cv.clone().add(V3(-0.13, 0.04 * (i - 1.5), 0)), cv.clone().add(V3(-0.3, 0.1 + 0.04 * i, 0.05)), V3(-0.62 - 0.03 * i, 5.86, 0.3)], 0.01, { connector: false, role: "grey", clip: 0.5 });
    B.flush(g);
  });
  const fx = makeFX("F1", 0, { fade: 0.45, coolK: 0.3, len: Y0 + 2.4, r0: 1.8, spread: 0.2, pow: 1.0, rmax: 3.2, freq: 1.0, flow: 30, dens: 3.4, hot: 1.6, diam: 0.9, soot: 1.0, attack: 0.3, decay: 0.8 });
  eng.add(fx); SHOW[K].fx.push(fx);
  SHOW[K].eng = "F1"; SHOW[K].Y0 = Y0;
}

// ---------------- J-2 ----------------
function buildDetailJ2() {
  const K = "dJ2", Y0 = 2.2;
  const root = showItem(K, { name: "Rocketdyne J-2", by: "Rocketdyne · Canoga Park", desc: "The hydrogen engine of the S-II and S-IVB. Separate LOX and LH₂ turbopumps in series on one gas generator, a start tank that spins them up, and the electrical control package that let the S-IVB's engine restart in orbit for TLI.", kv: [["Thrust", "232,250 lbf vac · 109,302 lbf SL"], ["Isp", "421 s vac"], ["Chamber", "52.6 bar · 5.5 : 1"], ["Length × Ø", "3.4 m × 2.1 m"], ["Dry mass", "1,788 kg"], ["Restart", "once, after 1.5–6 h"]] });
  const eng = new THREE.Group(); eng.position.y = Y0; eng.rotation.y = 30 * DEG; root.add(eng);
  within(asm(K, "nz", "Tube-wall nozzle", "180 stainless tubes carry liquid hydrogen down the bell and back to cool it before it reaches the injector. Turbine exhaust is dumped into the bell through the manifold at the 10 : 1 station.", [0, -1.3, 0], [["Expansion", "27.5 : 1"], ["Coolant", "LH₂"]], eng), (g) => {
    const B = bulk();
    add(g, turn([[0.98, 0], [0.93, 0.4, 1], [0.83, 0.9, 1], [0.67, 1.45, 1], [0.49, 1.95, 1], [0.31, 2.35, 1], [0.215, 2.55, 1], [0.205, 2.6]], { seg: 160, vy: [0, 2.6] }), "metal", { map: T.tubesJ2, side: DS });
    add(g, turn([[0.98, 0], [1.03, 0.03], [1.03, 0.09], [0.96, 0.11]], { seg: 140 }), "light");
    for (const [y, r] of [[0.6, 0.9], [1.2, 0.75], [1.72, 0.57]]) {
      add(g, turn([[r + 0.006, y - 0.03], [r + 0.03, y - 0.02], [r + 0.03, y + 0.02], [r + 0.006, y + 0.03]], { seg: 120 }), "light");
      for (const a of [0.9, 0.9 + Math.PI]) { const p = polar(r + 0.05, a, y); B.add(aim(new THREE.BoxGeometry(0.06, 0.06, 0.05), p, polar(1, a)), "grey"); }
    }
    add(g, torusGeo(0.8, 0.075, 96), "metal", { p: [0, 1.08, 0] });
    for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; B.add(aim(torusGeo(0.078, 0.008, 12), polar(0.8, a, 1.08), V3(Math.cos(a), 0, -Math.sin(a))), "light"); }
    B.flush(g);
  });
  within(asm(K, "tca", "Thrust chamber · injector · ASI", "Concentric-element injector with the augmented spark igniter at its centre, which burns a small flow of LH₂ and LOX lit by two spark plugs and keeps burning for the whole run.", [0, 1.2, 0], [["Chamber", "52.6 bar"], ["Igniter", "ASI, 2 spark plugs"]], eng), (g) => {
    const B = bulk();
    add(g, turn([[0.205, 2.6], [0.245, 2.75, 1], [0.25, 2.95], [0.3, 2.95], [0.3, 3.0], [0.24, 3.0]], { seg: 64 }), "metal");
    boltCircle(B, V3(0, 3.0, 0), UP, 0.27, 32, 0.008, 0.012);
    add(g, turn([[0.24, 3.0], [0.2, 3.08, 1], [0.12, 3.15, 1], [0, 3.18]], { seg: 48 }), "metal");
    add(g, torusGeo(0.27, 0.045, 48), "metal", { p: [0, 2.62, 0] });
    add(g, turn([[0, 3.12], [0.05, 3.12], [0.05, 3.3], [0, 3.3]], { seg: 16 }), "light", { p: [0.1, 0, 0.08] });
    for (const s of [-1, 1]) { B.add(rodGeo(V3(0.1 + s * 0.04, 3.28, 0.08), V3(0.1 + s * 0.07, 3.34, 0.12), 0.012), "grey"); cable(B, [V3(0.1 + s * 0.07, 3.34, 0.12), V3(0.2 + s * 0.1, 3.38, 0.3), V3(0.15 + s * 0.12, 3.15, -0.5)], 0.006); }
    add(g, boxGeo(0.28, 0.16, 0.28, 0, 3.26, 0), "grey"); add(g, sphereGeo(0.09, 0, 3.2, 0), "light");
    add(g, boxGeo(0.5, 0.05, 0.5, 0, 3.34, 0), "light"); boltCircle(B, V3(0, 3.365, 0), UP, 0.2, 12, 0.012, 0.016);
    B.flush(g);
  });
  within(asm(K, "ftp", "Fuel (LH₂) turbopump", "Seven-stage axial pump spinning about 27,000 rpm, the first stage of the turbine series. It lifts liquid hydrogen at −253 °C to the main fuel valve.", [-1.6, 0.4, -0.4], [["Type", "7-stage axial"], ["Speed", "≈27,000 rpm"]], eng), (g) => {
    const B = bulk(), c = V3(-0.62, 0, 0);
    add(g, turn([[0, 2.35], [0.18, 2.35], [0.19, 2.6], [0.17, 3.15], [0, 3.15]], { seg: 48 }), "light", { p: c.toArray() });
    for (let i = 0; i < 7; i++) B.add(torusGeo(0.185 - i * 0.002, 0.009, 36).translate(c.x, 2.62 + i * 0.07, c.z), "grey");
    add(g, turn([[0, 2.28], [0.21, 2.28], [0.21, 2.42], [0, 2.42]], { seg: 48 }), "grey", { p: c.toArray() });
    boltCircle(B, V3(c.x, 2.42, c.z), UP, 0.19, 24, 0.007, 0.01);
    duct(B, [V3(c.x, 3.15, c.z), V3(c.x - 0.02, 3.4, c.z + 0.05), V3(c.x - 0.04, 3.62, c.z + 0.08)], 0.11, { bellows: [0.5], bolts: 14 });
    duct(B, [V3(c.x + 0.16, 2.95, c.z + 0.08), V3(c.x + 0.28, 2.85, c.z + 0.25), V3(-0.3, 2.7, 0.33)], 0.05, { bellows: [0.5], bolts: 8 });
    const p = sensor(B, V3(c.x - 0.18, 2.9, c.z), V3(-1, 0.2, 0), 0.016); cable(B, [p, V3(c.x - 0.3, 3.0, c.z - 0.2), V3(-0.2, 3.1, -0.48)], 0.005);
    B.flush(g);
  });
  within(asm(K, "otp", "LOX turbopump", "Single-stage centrifugal pump driven by the turbine exhaust of the fuel pump, about 8,700 rpm. A propellant-utilisation valve bleeds LOX back to the inlet to shift the mixture ratio.", [1.6, 0.4, -0.3], [["Type", "centrifugal, 1 stage"], ["Speed", "≈8,700 rpm"]], eng), (g) => {
    const B = bulk(), c = V3(0.62, 0, 0);
    add(g, turn([[0, 2.55], [0.2, 2.55], [0.22, 2.75, 1], [0.2, 3.1], [0, 3.1]], { seg: 48 }), "light", { p: c.toArray() });
    add(g, torusGeo(0.225, 0.045, 48, 5.0), "light", { p: [c.x, 2.75, c.z] });
    boltCircle(B, V3(c.x, 2.8, c.z), UP, 0.17, 24, 0.007, 0.01);
    duct(B, [V3(c.x, 3.1, c.z), V3(c.x + 0.02, 3.38, c.z + 0.04), V3(c.x + 0.03, 3.62, c.z + 0.06)], 0.1, { bellows: [0.5], bolts: 12 });
    duct(B, [V3(c.x - 0.2, 2.78, c.z + 0.05), V3(0.42, 2.98, 0.2), V3(0.3, 3.1, 0.25)], 0.05, { bellows: [0.4], bolts: 8 });
    const w = valve(B, V3(c.x + 0.22, 2.7, c.z - 0.22), V3(0, 1, 0), 0.05);
    cable(B, [w, V3(0.9, 2.9, -0.35), V3(0.4, 3.12, -0.5)], 0.005);
    B.flush(g);
  });
  within(asm(K, "gg", "Gas generator · hot-gas ducts", "Burns LH₂ and LOX to drive the fuel turbine; its exhaust then crosses over to drive the LOX turbine before being dumped into the nozzle. A bypass valve trims the split.", [0.6, 0.9, 1.6], [["Turbines", "in series, fuel then LOX"], ["Exhaust", "dumped at the 10 : 1 station"]], eng), (g) => {
    const B = bulk();
    add(g, turn([[0, 0], [0.08, 0], [0.08, 0.24], [0.05, 0.28, 1], [0, 0.29]], { seg: 20 }), "metal", { p: [0.36, 2.88, 0.42] });
    const w = valve(B, V3(0.36, 3.22, 0.42), V3(1, 0, 0), 0.045);
    duct(B, [V3(-0.62, 2.4, 0.05), V3(-0.35, 2.36, 0.42), V3(0.3, 2.42, 0.45), V3(0.62, 2.6, 0.08)], 0.06, { bolts: 10, bellows: [0.5] });
    duct(B, [V3(0.36, 2.88, 0.42), V3(0.0, 2.6, 0.45), V3(-0.45, 2.5, 0.2)], 0.045, { bolts: 8 });
    duct(B, [V3(0.64, 2.56, 0), V3(0.74, 2.0, 0.04), V3(0.8, 1.5, 0.02), V3(0.8, 1.16, 0)], 0.07, { bolts: 10, bellows: [0.3] });
    const bv = valve(B, V3(0.15, 2.45, 0.5), V3(1, 0, -0.2), 0.04);
    cable(B, [w, V3(0.2, 3.3, 0.2), V3(0.1, 3.15, -0.48)], 0.005); cable(B, [bv, V3(0.0, 2.7, 0.5), V3(0.05, 3.1, -0.48)], 0.005);
    B.flush(g);
  });
  within(asm(K, "valves", "Main valves", "Main oxidiser valve (two-stage opening for a soft start), main fuel valve, gas-generator control valve and propellant-utilisation valve, all worked by helium from the pneumatic control package.", [0.2, 1.4, 1.9], [["MOV", "2-stage opening"], ["Actuation", "helium pneumatics"]], eng), (g) => {
    const B = bulk();
    SHOW.dJ2.wire = [valve(B, V3(0.32, 3.1, 0.26), V3(-0.4, 0.2, -0.2), 0.07), valve(B, V3(-0.3, 2.72, 0.34), V3(0.3, -0.1, -0.3), 0.065)];
    B.flush(g);
  });
  within(asm(K, "tank", "Start tank · helium · pneumatics", "The 4.2 ft³ start tank holds gaseous hydrogen and helium to spin both turbines at start; it is refilled from the engine during the burn so the S-IVB J-2 can restart. Helium in a separate sphere drives the valves.", [0, 0.5, -2.0], [["Start tank", "H₂ + He, refilled in flight"], ["Pneumatics", "helium, regulated"]], eng), (g) => {
    const B = bulk();
    const st = V3(-0.36, 3.0, 0.62), he = V3(-0.62, 2.98, 0.3), pn = V3(0.05, 3.2, 0.38);
    add(g, sphereGeo(0.24, st.x, st.y, st.z, 40, 28), "light");
    add(g, torusGeo(0.242, 0.012, 48), "grey", { p: st.toArray() });
    for (const [dx, dz, tx, tz] of [[0.14, -0.14, 0.2, 0.32], [-0.14, -0.14, -0.4, 0.2], [0.0, 0.18, -0.2, 0.42]]) strut(B, st.clone().add(V3(dx, -0.17, dz)), V3(tx, 2.98, tz), 0.012);
    add(g, sphereGeo(0.12, he.x, he.y, he.z, 32, 20), "silver");
    add(g, torusGeo(0.122, 0.008, 32), "grey", { p: he.toArray() });
    add(g, boxGeo(0.22, 0.14, 0.16, pn.x, pn.y, pn.z), "grey");
    for (let i = 0; i < 5; i++) cable(B, [pn.clone().add(V3(-0.08 + i * 0.04, -0.07, 0.06)), pn.clone().add(V3(-0.1 + i * 0.07, -0.18, 0.1)), V3(0.34 - i * 0.16, 2.95 - i * 0.06, 0.32 - i * 0.02)], 0.007, { connector: false, role: "grey", clip: 0.3 });
    cable(B, [he.clone().add(V3(0.1, 0.06, 0.03)), V3(-0.3, 3.18, 0.4), pn.clone().add(V3(-0.11, 0, 0))], 0.009, { connector: false, role: "grey" });
    cable(B, [st.clone().add(V3(0.1, -0.2, -0.1)), V3(-0.25, 2.62, 0.35), V3(-0.5, 2.45, 0.08)], 0.03, { connector: false, role: "metal" });
    flange(B, V3(-0.5, 2.45, 0.08), V3(-0.4, -0.2, -0.3), 0.03, 0.05, 0.02, 6);
    B.flush(g);
  });
  within(asm(K, "elec", "Electrical control package · instrumentation", "The electrical control package sequences start, mainstage, cutoff and restart; spark exciters fire the ASI and gas-generator plugs; two instrumentation packages wire every transducer to telemetry.", [-0.6, 0.2, -2.2], [["Sequencer", "electrical control package"], ["Ignition", "2 spark exciters"]], eng), (g) => {
    const B = bulk();
    add(g, boxGeo(0.42, 0.24, 0.16, 0.12, 3.1, -0.52), "light");
    for (let i = 0; i < 5; i++) B.add(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 12).rotateX(Math.PI / 2).translate(-0.04 + i * 0.08, 3.12, -0.43), "dark");
    for (const x of [-0.42, 0.5]) add(g, boxGeo(0.12, 0.09, 0.1, x, 2.95, -0.4), "grey");
    add(g, boxGeo(0.2, 0.12, 0.1, 0.42, 3.15, -0.3), "silver");
    const ring = []; for (let i = 0; i <= 20; i++) { const a = 160 * DEG + (i / 20) * 300 * DEG; ring.push(polar(0.36, a, 2.86)); }
    bundle(B, ring, 5, 0.004, 0.014, { clamps: 0.35 });
    bundle(B, [V3(0.12, 3.1, -0.44), V3(0.0, 3.05, -0.36), polar(0.36, 180 * DEG, 2.88)], 6, 0.004, 0.016);
    for (const w of SHOW.dJ2.wire) cable(B, [w, w.clone().lerp(polar(0.36, Math.atan2(w.x, w.z), 2.86), 0.5).add(V3(0, 0.06, 0)), polar(0.36, Math.atan2(w.x, w.z), 2.86)], 0.005, { connector: false });
    for (const [r, deg, y] of [[0.25, 200, 2.9], [0.3, 250, 2.62], [0.25, 120, 2.85], [0.46, 160, 2.2], [0.75, 300, 1.35]]) { const a = deg * DEG, p = sensor(B, polar(r, a, y), polar(1, a), 0.014); cable(B, [p, polar(r + 0.12, a, y + 0.1), polar(0.36, a, 2.86)], 0.004, { connector: false }); }
    B.flush(g);
  });
  within(asm(K, "act", "Gimbal actuators", "Two hydraulic actuators, ±7° in pitch and yaw, powered by the stage's own hydraulic pump.", [-1.6, 0.6, 1.4], [["Range", "±7°"]], eng), (g) => {
    const B = bulk();
    for (const [a, b] of [[V3(0.15, 3.34, 0.6), V3(0.1, 2.86, 0.27)], [V3(-0.45, 3.34, -0.42), V3(-0.19, 2.86, -0.19)]]) {
      const m = a.clone().lerp(b, 0.55); B.add(rodGeo(a, m, 0.05, 14), "light"); B.add(rodGeo(m, b, 0.028, 12), "metal");
      for (const p of [a, b]) B.add(new THREE.SphereGeometry(0.045, 12, 8).translate(p.x, p.y, p.z), "grey");
      cable(B, [a.clone().lerp(b, 0.2), a.clone().lerp(b, 0.2).add(V3(0.12, 0.15, 0.1)), a.clone().add(V3(0.2, 0.02, 0.1))], 0.012, { connector: false, role: "grey" });
    }
    B.flush(g);
  });
  const fx = makeFX("J2", 0, { fade: 0.45, coolK: 0.4, len: Y0 + 2.4, r0: 0.95, spread: 0.2, pow: 0.9, rmax: 1.9, freq: 0.7, flow: 24, dens: 2.4, hot: 1.8, diam: 0.6, attack: 0.4, decay: 0.8 });
  eng.add(fx); SHOW[K].fx.push(fx);
  SHOW[K].eng = "J2"; SHOW[K].Y0 = Y0;
}

// ---------------- SPS (AJ10-137) ----------------
function buildDetailSPS() {
  const K = "dSPS", Y0 = 1.9;
  const root = showItem(K, { name: "Aerojet AJ10-137 SPS", by: "Aerojet General · Sacramento", desc: "Columbia's main engine: a pressure-fed hypergolic engine with no pumps, a redundant bipropellant valve, an ablative chamber and a radiation-cooled columbium-and-titanium nozzle extension. It braked Apollo 11 into lunar orbit and fired it home.", kv: [["Thrust", "20,500 lbf · 91.2 kN"], ["Isp", "314.5 s"], ["Propellants", "Aerozine 50 / N₂O₄"], ["Expansion", "62.5 : 1"], ["Nozzle exit", "2.5 m"], ["Restarts", "up to 50 rated"]] });
  const eng = new THREE.Group(); eng.position.y = Y0; eng.rotation.y = 15 * DEG; root.add(eng);
  const NZ = [[1.25, 0], [1.13, 0.5, 1], [0.99, 1.0, 1], [0.8, 1.55, 1], [0.66, 1.95, 1], [0.53, 2.35, 1], [0.39, 2.7]];
  const CH = [[0.39, 2.7], [0.3, 2.9, 1], [0.2, 3.08, 1], [0.16, 3.2, 1], [0.2, 3.36, 1], [0.25, 3.56, 1], [0.27, 3.8, 1], [0.28, 4.0]];
  within(asm(K, "ext", "Nozzle extension", "Radiation-cooled: columbium in the upper section, titanium below, glowing dull red during a long burn. Bolted to the ablative chamber at an area ratio of 6 : 1.", [0, -1.6, 0], [["Material", "columbium · titanium"], ["Cooling", "radiation"], ["Exit Ø", "2.5 m"]], eng), (g) => {
    const B = bulk();
    add(g, turn(NZ.slice(0, 5), { seg: 140 }), "silver", { side: DS, map: T.ringsSPS });
    add(g, turn(NZ.slice(4), { seg: 120 }), "metal", { side: DS, map: T.ringsSPS });
    add(g, turn([[1.25, 0], [1.3, 0.03], [1.3, 0.09], [1.23, 0.1]], { seg: 120 }), "light");
    for (const y of [0.55, 1.25]) add(g, torusGeo(rAt(NZ, y) + 0.012, 0.014, 120), "grey", { p: [0, y, 0] });
    flange(B, V3(0, 1.95, 0), UP, 0.66, 0.74, 0.03, 48);
    flange(B, V3(0, 2.7, 0), UP, 0.39, 0.48, 0.04, 36);
    B.flush(g);
  });
  within(asm(K, "cham", "Ablative chamber", "Silica-phenolic chamber and throat that char and erode in a controlled way, carrying heat away. No regenerative cooling is needed in a pressure-fed engine this size.", [0, 0, 0], [["Throat Ø", "≈0.32 m"], ["Feed", "pressure-fed by helium"]], eng), (g) => {
    const B = bulk();
    add(g, turn(CH, { seg: 96 }), "dark");
    for (const y of [2.9, 3.2, 3.6]) B.add(torusGeo(rAt(CH, y) + 0.012, 0.016, 64).translate(0, y, 0), "grey");
    flange(B, V3(0, 4.0, 0), UP, 0.28, 0.38, 0.04, 32);
    B.flush(g);
  });
  within(asm(K, "inj", "Injector · gimbal ring", "Like-on-like doublet injector with baffles against combustion instability. The engine swings in a two-axis gimbal ring carried on four trunnions.", [0, 1.1, 0], [["Gimbal", "2-axis ring"], ["Range", "about ±6°"]], eng), (g) => {
    const B = bulk();
    add(g, turn([[0.36, 4.02], [0.35, 4.16], [0.24, 4.24, 1], [0, 4.26]], { seg: 64 }), "metal");
    add(g, turn([[0.62, 3.72], [0.7, 3.72], [0.7, 3.84], [0.62, 3.84], [0.62, 3.72]], { seg: 64 }), "light");
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, p = polar(0.74, a, 3.78); B.add(aim(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 16), p, polar(1, a)), "grey"); B.add(rodGeo(polar(0.28, a, 3.78), polar(0.64, a, 3.78), 0.03), "grey"); }
    for (const a of [0, Math.PI]) B.add(rodGeo(polar(0.78, a, 3.78), polar(0.9, a, 4.6), 0.045), "light");
    B.flush(g);
  });
  within(asm(K, "bva", "Bipropellant valve", "Four ball valves in two parallel banks of two in series: any single valve can fail open or shut without losing the engine. Each bank is turned by nitrogen-pressure actuators fed from two small tanks.", [0, 2.0, 1.4], [["Ball valves", "4, series-parallel"], ["Actuation", "GN₂, 2 tanks"]], eng), (g) => {
    const B = bulk();
    add(g, boxGeo(0.62, 0.22, 0.34, 0, 4.42, 0), "light");
    SHOW.dSPS.wire = [];
    for (const x of [-0.2, 0.2]) for (const z of [-0.1, 0.1]) SHOW.dSPS.wire.push(valve(B, V3(x, 4.42, z * 1.8), V3(0, 0, 1), 0.07));
    for (const s of [-1, 1]) { add(g, sphereGeo(0.11, s * 0.42, 4.62, -0.3), "silver"); cable(B, [V3(s * 0.42, 4.62, -0.19), V3(s * 0.3, 4.58, -0.05), V3(s * 0.2, 4.5, 0.0)], 0.01, { connector: false, role: "grey" }); }
    B.flush(g);
  });
  within(asm(K, "lines", "Propellant feed lines", "Aerozine 50 and nitrogen tetroxide arrive from the service-module tanks through flex sections that follow the gimbal.", [1.4, 1.4, 0], [["Fuel", "Aerozine 50"], ["Oxidiser", "N₂O₄"]], eng), (g) => {
    const B = bulk();
    for (const s of [-1, 1]) duct(B, [V3(s * 0.2, 4.53, 0), V3(s * 0.22, 4.75, 0.05), V3(s * 0.4, 4.95, 0.1), V3(s * 0.45, 5.1, 0.1)], 0.06, { bellows: [0.55], bolts: 10 });
    for (const s of [-1, 1]) duct(B, [V3(s * 0.2, 4.31, 0), V3(s * 0.26, 4.2, 0.05), V3(s * 0.2, 4.16, 0.0)], 0.04, { bolts: 8 });
    B.flush(g);
  });
  within(asm(K, "act", "Gimbal actuators", "Two electromechanical actuators, pitch and yaw, each with redundant motors and clutches, steer the thrust through the spacecraft's centre of mass.", [-1.6, 1.0, -0.6], [["Type", "electromechanical"], ["Motors", "redundant"]], eng), (g) => {
    const B = bulk();
    for (const a of [Math.PI / 2, -0.3]) {
      const top = polar(0.95, a, 4.6), bot = polar(0.5, a, 2.76), m = top.clone().lerp(bot, 0.45);
      B.add(rodGeo(top, m, 0.06, 14), "light"); B.add(rodGeo(m, bot, 0.03, 12), "metal");
      const mot = top.clone().add(polar(0.12, a + Math.PI / 2, -0.1));
      B.add(aim(new THREE.CylinderGeometry(0.07, 0.07, 0.28, 16), mot, UP), "grey");
      for (const p of [top, bot]) B.add(new THREE.SphereGeometry(0.05, 12, 8).translate(p.x, p.y, p.z), "dark");
      cable(B, [mot.clone().add(V3(0, 0.14, 0)), mot.clone().add(V3(0, 0.35, 0.1)), V3(0, 4.62, -0.4)], 0.007);
    }
    B.flush(g);
  });
  within(asm(K, "elec", "Wiring · transducers", "Valve position switches, chamber-pressure and injector-temperature transducers, wired through a junction on the valve body to the spacecraft.", [-1.0, 0.3, 1.6], [["Sensors", "Pc, valve position, temperature"]], eng), (g) => {
    const B = bulk();
    add(g, boxGeo(0.22, 0.12, 0.12, 0, 4.58, -0.42), "grey");
    for (const w of SHOW.dSPS.wire) bundle(B, [w, w.clone().add(V3(0, 0.12, 0)), V3(0, 4.62, -0.36)], 3, 0.004, 0.01);
    for (const [deg, y] of [[30, 3.9], [150, 3.6], [260, 3.05], [330, 3.45]]) { const a = deg * DEG, p = sensor(B, polar(rAt(CH, y) + 0.01, a, y), polar(1, a), 0.016); cable(B, [p, polar(0.5, a, y + 0.1), polar(0.5, a, 4.4), V3(0, 4.55, -0.42)], 0.005, { connector: false }); }
    B.flush(g);
  });
  const fx = makeFX("HYP", 0, { fade: 0.45, coolK: 0.5, len: Y0 + 2.4, r0: 1.18, spread: 0.3, pow: 1, rmax: 2.2, freq: 0.9, flow: 18, dens: 4.4, hot: 1.8, attack: 0.25, decay: 0.7 });
  eng.add(fx); SHOW[K].fx.push(fx);
  SHOW[K].eng = "SPS"; SHOW[K].Y0 = Y0;
}

// ---------------- LM descent engine ----------------
function buildDetailDPS() {
  const K = "dDPS", Y0 = 1.5;
  const root = showItem(K, { name: "TRW LM descent engine", by: "TRW · Redondo Beach", desc: "The first throttleable rocket engine flown by people. A moveable pintle injector, linked to cavitating venturis in the feed lines, varies flow and thrust from 10 to 60 per cent and up to full thrust while keeping the mixture ratio constant.", kv: [["Thrust", "1,050–10,125 lbf"], ["Throttle", "10–60 % + full"], ["Isp", "311 s"], ["Propellants", "Aerozine 50 / N₂O₄"], ["Nozzle exit", "1.5 m"]] });
  const eng = new THREE.Group(); eng.position.y = Y0; eng.rotation.y = 20 * DEG; root.add(eng);
  const NZ = [[0.76, 0], [0.7, 0.35, 1], [0.6, 0.72, 1], [0.48, 1.0]];
  const CH = [[0.48, 1.0], [0.32, 1.25, 1], [0.18, 1.45, 1], [0.11, 1.58, 1], [0.15, 1.7, 1], [0.2, 1.85]];
  within(asm(K, "nz", "Nozzle extension", "Radiation-cooled columbium extension below an ablative throat section.", [0, -1.0, 0], [["Cooling", "radiation"], ["Exit Ø", "1.5 m"]], eng), (g) => {
    const B = bulk();
    add(g, turn(NZ, { seg: 120 }), "silver", { side: DS, map: T.ringsSPS });
    add(g, turn([[0.76, 0], [0.8, 0.03], [0.8, 0.08], [0.74, 0.09]], { seg: 96 }), "light");
    flange(B, V3(0, 1.0, 0), UP, 0.48, 0.56, 0.03, 36);
    B.flush(g);
  });
  within(asm(K, "cham", "Ablative chamber", "Ablative chamber and throat in a titanium case, wrapped in a thermal blanket on the vehicle.", [0, 0, 0], [["Throat", "ablative"]], eng), (g) => {
    add(g, turn(CH, { seg: 80 }), "dark");
    const B = bulk(); flange(B, V3(0, 1.85, 0), UP, 0.2, 0.29, 0.04, 24);
    for (const y of [1.2, 1.45]) B.add(torusGeo(rAt(CH, y) + 0.01, 0.012, 48).translate(0, y, 0), "grey");
    B.flush(g);
  });
  within(asm(K, "inj", "Pintle injector · throttle actuator", "A sliding sleeve on the central pintle opens or closes the injector slots as the throttle actuator moves it, mechanically tied to the flow-control valves upstream.", [0, 1.0, 0.4], [["Injector", "variable-area pintle"], ["Actuator", "electromechanical"]], eng), (g) => {
    const B = bulk();
    add(g, turn([[0.24, 1.87], [0.23, 1.98], [0.14, 2.04, 1], [0, 2.06]], { seg: 56 }), "metal");
    add(g, turn([[0, 2.04], [0.07, 2.04], [0.07, 2.42], [0, 2.42]], { seg: 20 }), "light");
    add(g, boxGeo(0.2, 0.16, 0.16, 0.18, 2.32, 0), "grey");
    B.add(rodGeo(V3(0.07, 2.32, 0), V3(0.3, 2.32, 0), 0.015), "metal");
    cable(B, [V3(0.28, 2.38, 0.08), V3(0.4, 2.48, 0.2), V3(0.1, 2.5, -0.35)], 0.006);
    B.flush(g);
  });
  within(asm(K, "valves", "Flow control · shutoff valves", "Two cavitating-venturi flow-control valves meter fuel and oxidiser in step with the pintle; four ball shutoff valves in series-parallel start and stop the engine.", [-1.3, 0.8, 0.6], [["Flow control", "cavitating venturi, 2"], ["Shutoff", "4 ball valves"]], eng), (g) => {
    const B = bulk();
    SHOW.dDPS.wire = [];
    for (const s of [-1, 1]) {
      duct(B, [V3(s * 0.12, 2.04, 0.08), V3(s * 0.32, 2.15, 0.18), V3(s * 0.48, 2.3, 0.1)], 0.035, { bolts: 8 });
      SHOW.dDPS.wire.push(valve(B, V3(s * 0.5, 2.35, 0.08), V3(0, 1, 0), 0.05));
      add(g, turn([[0, 0], [0.04, 0], [0.04, 0.2], [0, 0.2]], { seg: 14 }), "light", { p: [s * 0.5, 2.42, 0.08] });
      for (const z of [-0.12, 0.12]) SHOW.dDPS.wire.push(valve(B, V3(s * 0.52, 2.72, z), V3(0, 1, 0), 0.045));
    }
    B.flush(g);
  });
  within(asm(K, "gim", "Gimbal ring · trim actuators", "The DPS gimbal only trims: two screw-jack actuators keep the thrust line through the LM's shifting centre of mass by ±6°.", [1.3, 0.6, -0.4], [["Range", "±6°, trim only"]], eng), (g) => {
    const B = bulk();
    add(g, turn([[0.46, 1.62], [0.53, 1.62], [0.53, 1.72], [0.46, 1.72], [0.46, 1.62]], { seg: 64 }), "light");
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; B.add(aim(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 12), polar(0.56, a, 1.67), polar(1, a)), "grey"); B.add(rodGeo(polar(0.15, a, 1.67), polar(0.46, a, 1.67), 0.022), "grey"); }
    for (const a of [0.4, 0.4 + Math.PI / 2]) { const top = polar(0.7, a, 2.32), bot = polar(0.5, a, 1.7); B.add(rodGeo(top, bot.clone().lerp(top, 0.5), 0.035), "light"); B.add(rodGeo(bot.clone().lerp(top, 0.5), bot, 0.02), "metal"); B.add(aim(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 14), top.clone().add(V3(0, -0.02, 0)), UP), "grey"); }
    B.flush(g);
  });
  within(asm(K, "elec", "Wiring", "Throttle commands, valve position switches and chamber pressure wired to the LM's descent engine control assembly.", [-0.8, 0.2, -1.2], [["Commands", "throttle, on/off, trim"]], eng), (g) => {
    const B = bulk();
    add(g, boxGeo(0.2, 0.1, 0.1, 0, 2.38, -0.4), "grey");
    for (const w of SHOW.dDPS.wire) cable(B, [w, w.clone().add(V3(0, 0.1, -0.1)), V3(0, 2.4, -0.35)], 0.004, { connector: false });
    for (const deg of [200, 330, 60]) { const a = deg * DEG, p = sensor(B, polar(rAt(CH, 1.78) + 0.01, a, 1.78), polar(1, a), 0.014); cable(B, [p, polar(0.4, a, 2.0), V3(0, 2.36, -0.36)], 0.004, { connector: false }); }
    B.flush(g);
  });
  const fx = makeFX("HYP", 0, { fade: 0.45, coolK: 0.5, len: Y0 + 2.4, r0: 0.72, spread: 0.3, pow: 1, rmax: 1.3, freq: 1.0, flow: 16, dens: 5.0, hot: 1.8, attack: 0.25, decay: 0.6 });
  eng.add(fx); SHOW[K].fx.push(fx);
  SHOW[K].eng = "DPS"; SHOW[K].Y0 = Y0;
}

// ---------------- LM ascent engine ----------------
function buildDetailAPS() {
  const K = "dAPS", Y0 = 1.1;
  const root = showItem(K, { name: "Bell LM ascent engine", by: "Bell Aerosystems · Buffalo", desc: "The engine that had to work: fixed thrust, no gimbal, pressure-fed, with a redundant valve package, so Eagle could leave the Moon on a single start.", kv: [["Thrust", "3,500 lbf · 15.6 kN"], ["Isp", "311 s"], ["Burn (Apollo 11)", "434 s"], ["Propellants", "Aerozine 50 / N₂O₄"], ["Nozzle exit", "≈0.8 m"]] });
  const eng = new THREE.Group(); eng.position.y = Y0; root.add(eng);
  const NZ = [[0.4, 0], [0.34, 0.3, 1], [0.22, 0.6, 1], [0.12, 0.8, 1], [0.065, 0.92, 1], [0.1, 1.0, 1], [0.14, 1.1]];
  within(asm(K, "nz", "Ablative chamber and nozzle", "One ablative piece from chamber to exit, in a fibreglass case. No moving parts below the valves.", [0, -0.7, 0], [["Cooling", "ablative"], ["Gimbal", "none"]], eng), (g) => {
    const B = bulk();
    add(g, turn(NZ, { seg: 80 }), "dark", { side: DS });
    add(g, turn([[0.4, 0], [0.43, 0.02], [0.43, 0.06], [0.39, 0.07]], { seg: 64 }), "light");
    for (const y of [0.3, 0.6]) B.add(torusGeo(rAt(NZ, y) + 0.01, 0.012, 48).translate(0, y, 0), "grey");
    flange(B, V3(0, 1.1, 0), UP, 0.14, 0.22, 0.03, 16);
    B.flush(g);
  });
  within(asm(K, "inj", "Injector · valve package", "Injector with a redundant valve package: four ball valves in series-parallel, opened by helium-driven actuators.", [0, 0.7, 0.4], [["Valves", "4, series-parallel"]], eng), (g) => {
    const B = bulk();
    add(g, turn([[0.16, 1.12], [0.15, 1.2], [0.09, 1.25, 1], [0, 1.26]], { seg: 40 }), "metal");
    add(g, boxGeo(0.36, 0.12, 0.22, 0, 1.33, 0), "light");
    SHOW.dAPS.wire = [];
    for (const x of [-0.12, 0.12]) for (const z of [-0.07, 0.07]) SHOW.dAPS.wire.push(valve(B, V3(x, 1.33, z * 1.6), V3(0, 0, 1), 0.04));
    B.flush(g);
  });
  within(asm(K, "mount", "Mounting · feed lines", "Four struts hang the engine in the ascent stage's centre; two lines bring propellant from the tanks on either side of the cabin.", [0.9, 0.3, -0.6], [["Mount", "4 struts"]], eng), (g) => {
    const B = bulk();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; strut(B, polar(0.2, a, 1.1), polar(0.55, a, 1.46), 0.018); }
    for (const s of [-1, 1]) duct(B, [V3(s * 0.12, 1.39, 0), V3(s * 0.2, 1.43, 0.05), V3(s * 0.45, 1.46, 0.05)], 0.025, { bolts: 6 });
    B.flush(g);
  });
  within(asm(K, "elec", "Wiring", "Arm, fire and valve-position circuits from the ascent stage's control electronics.", [-0.8, 0.2, -0.6], [], eng), (g) => {
    const B = bulk();
    for (const w of SHOW.dAPS.wire) cable(B, [w, w.clone().add(V3(0, 0.08, -0.05)), V3(-0.2, 1.46, -0.2)], 0.003, { connector: false });
    const p = sensor(B, polar(0.15, 3.6, 1.12), polar(1, 3.6), 0.01); cable(B, [p, V3(-0.3, 1.3, -0.2), V3(-0.2, 1.45, -0.2)], 0.003, { connector: false });
    B.flush(g);
  });
  const fx = makeFX("HYP", 0, { fade: 0.45, coolK: 0.5, len: Y0 + 2.4, r0: 0.38, spread: 0.35, pow: 1, rmax: 0.75, freq: 1.2, flow: 14, dens: 6.0, hot: 1.8, attack: 0.2, decay: 0.6 });
  eng.add(fx); SHOW[K].fx.push(fx);
  SHOW[K].eng = "APS"; SHOW[K].Y0 = Y0;
}

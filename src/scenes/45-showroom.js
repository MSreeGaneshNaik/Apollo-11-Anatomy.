// ============================================================================
// 45 · SHOWROOM — registers the detailed engines and crew cabins with the
// parts index, the throttle and the camera. Each item stands on its own plate
// well away from the pad; only the selected one is drawn.
// ============================================================================
const SHOW_GROUPS = { dF1: "xF1", dJ2: "xJ2", dSPS: "xSPS", dDPS: "xDPS", dAPS: "xAPS" };
const SHOW_CAPS = {
  dALL: "The five engine types that flew Apollo 11, drawn to one scale and lined up on their nozzle exits. Ignite all fires them together; the row of engine buttons fires or cuts each one on its own. Every plume takes the colour of what it burns.",
  dF1: "One F-1 on its own, drawn down to its ducts, valves, transducers and wiring harness. Ignite fires it at the throttle and altitude set below; Take apart separates its ten assemblies, and clicking any assembly zooms in on it.",
  dJ2: "The J-2 on its own. Both turbopumps, the start tank that let the S-IVB engine relight for TLI, the valves and the harness are all here; click an assembly to zoom in.",
  dSPS: "Columbia's engine, firing as in vacuum. Take apart to see the four-ball bipropellant valve that made it single-failure tolerant.",
  dDPS: "The descent engine, firing as in vacuum. The throttle obeys the real engine's limits: 10–60 % continuously or full thrust, as the guidance computer flew it down to Tranquility Base.",
  dAPS: "The ascent engine: no throttle, no gimbal, pressure-fed, and one start that had to work.",
  dCM: "Columbia with a 140° wedge cut out: the heat-shield layers in section, three suited crew on their couches under the main display console, the navigation station at their feet, and the parachutes and thrusters packed outside the pressure vessel. Take apart lifts the apex cover and slides the couches out.",
  dLM: "Eagle on its descent stage with the right-hand wall of the cabin cut away: two crew standing at their windows on restraint cables, panels and keyboard in front, backpacks and life support behind. Take apart stages the ascent stage and spreads its systems out.",
};
const curShow = () => MENU_ITEMS[C.sel]?.show || null;
const SHOW_ROOT = new Set();
// The five engines stand in one row, to one scale, nozzle exits on a common line (y = 0). Each keeps its
// own display: only the selected one is drawn, so the row costs nothing until "All engines" is picked.
const LINEUP = ["dF1", "dJ2", "dSPS", "dDPS", "dAPS"];
const _bc = new THREE.Vector3();
function boxCorners(o, fn) {
  const b = o.geometry.boundingBox || (o.geometry.computeBoundingBox(), o.geometry.boundingBox);
  for (let i = 0; i < 8; i++) fn(_bc.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(o.matrixWorld));
}
function placeLineup() {
  const R = V3(Math.cos(CAM_AZ), 0, -Math.sin(CAM_AZ)), base = V3(1150, 0, 0), gap = 1.1;
  let cursor = 0;
  for (const k of LINEUP) {
    const S = SHOW[k], root = S.group;
    root.position.set(0, 0, 0); root.updateMatrixWorld(true);
    let lo = Infinity, hi = -Infinity;
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh) return;
      if (o.layers.mask === 1 << FX_LAYER) { const r = o.geometry.parameters.radiusTop * 0.8; lo = Math.min(lo, -r); hi = Math.max(hi, r); return; }
      boxCorners(o, (p) => { const d = p.dot(R); lo = Math.min(lo, d); hi = Math.max(hi, d); });
    });
    root.position.copy(base).addScaledVector(R, cursor - lo);
    root.position.y = -S.Y0;
    cursor += hi - lo + gap;
  }
}
function buildShowroom() {
  buildShowTextures();
  buildDetailF1(); buildDetailJ2(); buildDetailSPS(); buildDetailDPS(); buildDetailAPS();
  buildCabinCM(); buildCabinLM();
  for (const k in SHOW) SHOW_ROOT.add(SHOW[k].group);
  placeLineup();
  // bounding sphere of each display (with room for its taken-apart layout) for a tight camera depth range
  SCENE.updateMatrixWorld(true);
  const bx = new THREE.Box3(), all = new THREE.Box3();
  for (const k in SHOW) {
    bx.makeEmpty();
    SHOW[k].group.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) boxCorners(o, (p) => bx.expandByPoint(p)); });
    if (LINEUP.includes(k)) all.union(bx);
    const ex = SHOW[k].asm.reduce((m, a) => Math.max(m, a.ex.length()), 0);
    SHOW[k].sphere = bx.getBoundingSphere(new THREE.Sphere());
    SHOW[k].sphere.radius += ex + 2;
  }
  // "All engines": the row itself, assembled, with room below for the plumes
  MODULES.dALL = {
    name: "Apollo 11 engines · side by side", by: "Rocketdyne · Aerojet · TRW · Bell",
    desc: "All five engine types that flew the mission, to one scale and lined up on their nozzle exits: the 5.8 m F-1 down to the 1.3 m ascent engine. Fire them together or one at a time. Plume colour follows the propellants: kerosene burns orange, hydrogen nearly clear and blue, and the hypergolic Aerozine 50 with nitrogen tetroxide a translucent rose-orange.",
    kv: [["F-1 · RP-1 / LOX", "1,522,000 lbf SL"], ["J-2 · LH₂ / LOX", "232,250 lbf vac"], ["SPS · A-50 / N₂O₄", "20,500 lbf vac"], ["DPS · A-50 / N₂O₄", "1,050–10,125 lbf"], ["APS · A-50 / N₂O₄", "3,500 lbf vac"], ["Scale", "one scale for all five"]],
  };
  const lineAsm = LINEUP.flatMap((k) => SHOW[k].asm);
  SHOW.dALL = { key: "dALL", roots: LINEUP.map((k) => SHOW[k].group), asm: lineAsm, fx: LINEUP.map((k) => SHOW[k].fx[0]), lineup: true, view: { az: CAM_AZ, el: 12 * DEG }, frame: LINEUP.flatMap((k) => [k, ...SHOW[k].asm.map((a) => a.key)]) };
  all.min.y -= 6.5;
  SHOW.dALL.sphere = all.getBoundingSphere(new THREE.Sphere()); SHOW.dALL.sphere.radius += 3;
  const spread = { F1: [0.12, 0.9], J2: [0.12, 1.1], SPS: [0.4, 0.4], DPS: [0.4, 0.4], APS: [0.45, 0.45] };
  const code = { F1: "F-1", J2: "J-2", SPS: "SPS", DPS: "DPS", APS: "APS" };
  for (const [k, gk] of Object.entries(SHOW_GROUPS)) {
    const S = SHOW[k], fx = S.fx[0], base = Object.values(GROUPS).find((G) => G.eng === S.eng);
    ENGINE_SETS[gk] = [{ group: fx.parent, fx, name: code[S.eng], on: true }];
    GROUPS[gk] = { set: gk, eng: S.eng, label: code[S.eng], sub: code[S.eng], apart: false, alt: ["SPS", "DPS", "APS"].includes(S.eng) ? 1e6 : 0, item: k, show: k, plume: { len: fx.userData.baseLen, sSL: spread[S.eng][0], sVac: spread[S.eng][1] } };
    C.off[gk] = [0];
    FLOWN[gk] = FLOWN[base.set];
  }
  FLOWN.xJ2 = "S-II: 385 s · S-IVB: 150 s to orbit + 347 s for TLI";
  ENGINE_SETS.xALL = LINEUP.map((k) => { const fx = SHOW[k].fx[0]; return { group: fx.parent, fx, name: code[SHOW[k].eng], eng: SHOW[k].eng, g: SHOW_GROUPS[k], on: true }; });
  GROUPS.xALL = { set: "xALL", eng: "ALL", lineup: true, label: "All engines", sub: "5 types", apart: false, alt: 0, item: "dALL", show: "dALL" };
  C.off.xALL = LINEUP.map(() => 0); C.lstart = LINEUP.map(() => 0);
  const entry = (id, label, o) => [id, label, { mods: SHOW[id].frame || [id, ...SHOW[id].asm.map((a) => a.key)], info: [id], show: id, root: true, frame: SHOW[id].frame, ...o }];
  MENU.push(["Detailed engines", [
    entry("dALL", "All engines", { group: "xALL", below: 6.5 }),
    entry("dF1", "F-1", { group: "xF1" }),
    entry("dJ2", "J-2", { group: "xJ2" }),
    entry("dSPS", "SPS", { group: "xSPS" }),
    entry("dDPS", "Descent engine", { group: "xDPS" }),
    entry("dAPS", "Ascent engine", { group: "xAPS" }),
  ]], ["Crew quarters", [
    entry("dCM", "Columbia · command module cabin"),
    entry("dLM", "Eagle · lunar module cabin"),
  ]]);
  for (const [, items] of MENU.slice(-2)) for (const [id, label, o] of items) {
    MENU_ITEMS[id] = { id, label, ...o };
    if (SHOW[id].lineup) continue;
    for (const a of SHOW[id].asm) MENU_ITEMS[a.key] = { id: a.key, label: MODULES[a.key].name, mods: [a.key], info: [a.key], show: id, parent: id, group: o.group };
  }
}

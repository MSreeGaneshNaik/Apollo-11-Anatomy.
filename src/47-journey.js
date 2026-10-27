// ============================================================================
// 47 · THE JOURNEY — Apollo 11 from the pad to the Pacific on one Earth–Moon map.
// 1 unit = 1,000 km. Earth, Moon, their distance and every orbit are to scale.
// The coast legs are Earth-centred conics (vis-viva + Kepler) carried into the
// rotating Earth–Moon frame and blended into lunar hyperbolas near the Moon; the
// shapes are faithful in kind, not a flight reconstruction. Built on first visit.
// ============================================================================
const J_RE = 6.378, J_RM = 1.7374, J_DEM = 384.4, J_MU = 398600, J_MUM = 4902.8;
const J_ORIGIN = V3(-4000, 0, 0);
const J_MC = V3(J_DEM, 0, 0);
const J_WM = 360 / 655.72 * DEG;          // Moon's motion, rad per hour (the frame's rotation)
const J_SPIN = 14.492 * DEG;              // Earth turning in the Earth–Moon frame, rad per hour
const J_KSC = [28.608, -80.604], J_SPLASH = [13.317, -169.15], J_SITE = [0.674, 23.473];
const azv = (a, r = 1, y = 0) => V3(Math.cos(a) * r, y, -Math.sin(a) * r);   // azimuth a (counter-clockwise from +x, seen from north)
const ecef = (lat, lon) => V3(Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.sin(lat * DEG), -Math.cos(lat * DEG) * Math.sin(lon * DEG));
const getH = (s) => getSec(s) / 3600;
const J = { built: false, root: null, track: [], idx: {}, cur: 0, from: 0, to: 0, t: 1, get: 0, getFrom: 0, getTo: 0, colA: 0, colFrom: 0, colTo: 0, colOn: 0, lines: [], labels: [] };

// ---------------- phases ----------------
// id, label, GET, view {c: () => local centre, w, h}, marker, extra
const J_PHASES = [
  { id: "jAll", label: "Whole journey", get: "195:18:35", view: "all", craft: null,
    name: "Apollo 11 · the journey", sub: "8 d 3 h 18 min 35 s · 1.5 million km",
    desc: "The whole flight on one map: three hours in Earth orbit, three days out, a day in lunar orbit while Eagle went down and came back, and two and a half days home. Earth, Moon and their distance are to scale; the path is drawn as it looks from a frame that turns with the Moon, which is why it closes into a loop around each body.",
    kv: [["Launch", MISSION.launch], ["Landing", MISSION.landing], ["Lunar liftoff", MISSION.liftoffMoon], ["Splashdown", MISSION.splash], ["Duration", MISSION.duration], ["Lunar orbits", "30"]] },
  { id: "jLaunch", label: "Liftoff", get: "00:00:00.6", view: "launch", craft: "Saturn V AS-506",
    sub: "LC-39A · 16 Jul 1969 13:32:00 UTC",
    desc: "Five F-1s at 7.6 million lbf lift 2,938 tonnes off Pad 39A. The vehicle clears the tower in about 12 seconds, then rolls onto its flight azimuth and pitches over the Atlantic.",
    kv: [["GET", "00:00:00.6"], ["UTC", "16 Jul 1969 13:32:00"], ["Pad", "LC-39A, Kennedy Space Center"], ["Liftoff thrust", "7,610,000 lbf rated"], ["Liftoff mass", "2,938,315 kg"]] },
  { id: "jAscent", label: "Climb to orbit", get: "00:11:49.3", view: "launch", craft: "S-IVB + Apollo",
    sub: "Three stages in 11 min 39 s",
    desc: "The S-IC burns out at 2 min 42 s, 66 km up; the S-II takes over and the escape tower goes at 3 min 18 s. The S-II cuts off at 9 min 8 s and the S-IVB's single J-2 finishes the job, shutting down 11 min 39 s after liftoff at 25,562 ft/s.",
    kv: [["S-IC cutoff", "00:02:41.6 · 66.3 km · 9,031 ft/s"], ["S-II ignition", "00:02:43.0"], ["Escape tower off", "00:03:17.9"], ["S-II cutoff", "00:09:08.2 · 22,747 ft/s"], ["S-IVB cutoff", "00:11:39.3 · 25,562 ft/s"], ["Orbit insertion", "00:11:49.3"]] },
  { id: "jEPO", label: "Earth parking orbit", get: "01:30:00", view: "earth", craft: "S-IVB + Apollo",
    sub: "185.9 × 183.2 km · 88 min a lap",
    desc: "One and a half laps of Earth while the crew and Houston check every system before committing to the Moon. The S-IVB stays attached, its J-2 waiting for its second start.",
    kv: [["Orbit", MISSION.parking], ["Period", "88.2 min"], ["Time in orbit", "2 h 32 min"], ["Laps", "≈1.5"]] },
  { id: "jTLI", label: "Trans-lunar injection", get: "02:50:03.0", view: "tli", craft: "S-IVB + Apollo",
    sub: "S-IVB restart · 5 min 47 s",
    desc: "Over the Pacific the S-IVB's J-2 relights and burns for 5 min 47 s, raising the speed from 25,554 to 35,563 ft/s: nearly escape velocity, aimed at where the Moon will be three days later.",
    kv: [["Ignition", "02:44:16.2 · 25,554 ft/s"], ["Cutoff", "02:50:03.0 · 35,563 ft/s"], ["Burn", "346.8 s"], ["Altitude at cutoff", "322.7 km"]] },
  { id: "jTD", label: "Transposition & docking", get: "03:29:00", view: "td", craft: "Columbia + Eagle",
    sub: "CSM turns round, docks, pulls Eagle out",
    desc: "Columbia separates from the S-IVB, the adapter panels fall away, and Collins turns the CSM round to dock nose-to-nose with Eagle. At 4 h 17 min the joined spacecraft pull Eagle out of the stage, which is then sent off past the Moon.",
    kv: [["CSM separation", "03:17"], ["Docked with Eagle", "03:29"], ["Eagle extracted", "04:17:13"]] },
  { id: "jTLC", label: "Translunar coast", get: "40:00:00", view: "all", craft: "Columbia + Eagle",
    sub: "73 hours, slowing all the way",
    desc: "Earth's gravity bleeds the speed off for three days. The spacecraft rolls slowly to spread the Sun's heat (the 'barbecue roll') and makes one small midcourse correction; past about 62,000 km from the Moon its pull wins and the craft speeds up again.",
    kv: [["Duration", "≈73 h"], ["Midcourse correction", "26:44:58 · ≈20.9 ft/s"], ["Lunar sphere of influence", "61:39:55"], ["Start speed", "35,563 ft/s"]] },
  { id: "jLOI", label: "Lunar orbit insertion", get: "75:49:49.6", view: "loi", craft: "Columbia + Eagle",
    sub: "SPS burn behind the Moon, out of contact",
    desc: "Behind the Moon and out of radio contact, the SPS fires for six minutes against the direction of travel and the Moon captures the spacecraft. A second short burn four hours later rounds the orbit off.",
    kv: [["LOI-1", "75:49:49.6 · ≈2,924 ft/s"], ["LOI-2", "80:11:36 · ≈157.8 ft/s"], ["Final orbit", MISSION.lunarOrbit], ["Orbits flown", "30"]] },
  { id: "jUndock", label: "Eagle undocks", get: "100:13:38", view: "moon", craft: "Eagle · Columbia",
    sub: "“The Eagle has wings”",
    desc: "On the thirteenth orbit Armstrong and Aldrin, now in Eagle, separate from Columbia. Collins inspects the lander as it turns in front of him, then backs away.",
    kv: [["Undocking", "100:13:38"], ["In Eagle", "Armstrong, Aldrin"], ["In Columbia", "Collins"]] },
  { id: "jLand", label: "Powered descent & touchdown", get: "102:45:43", view: "land", craft: "Eagle",
    sub: "Tranquility Base · " + MISSION.site,
    desc: "Eagle drops to 15 km on the far side, then lights its descent engine for the 12½-minute braking descent. Through computer alarms and a boulder field Armstrong flies the last minutes by hand and sets down in the Sea of Tranquility.",
    kv: [["Descent orbit insertion", "101:36:14 · ≈74.2 ft/s"], ["Powered descent", "102:33:04"], ["Touchdown", "102:45:43"], ["UTC", MISSION.landing], ["Site", MISSION.site], ["Propellant left", "98 kg usable"]] },
  { id: "jEVA", label: "Moonwalk", get: "110:30:00", view: "moonwide", craft: "Eagle",
    sub: "2 h 31 min 40 s on the surface",
    desc: "Armstrong steps off the footpad at 02:56 UTC on 21 July; Aldrin follows twenty minutes later. They plant the flag, set out a seismometer and a laser reflector, and collect 21.55 kg of rock while Collins passes overhead every two hours.",
    kv: [["First step", "21 Jul 1969 · 02:56 UTC"], ["Moonwalk", MISSION.eva], ["Samples", MISSION.samples], ["Left behind", "seismometer · laser reflector · flag"]] },
  { id: "jLift", label: "Lunar liftoff", get: "124:22:00", view: "lift", craft: "Eagle ascent stage",
    sub: "APS · 7 min 14 s",
    desc: "The ascent stage fires off the descent stage, which stays behind as its launch pad, and climbs to a low orbit below and behind Columbia.",
    kv: [["Liftoff", "124:22:00"], ["UTC", MISSION.liftoffMoon], ["Ascent burn", "434 s · ≈6,055 ft/s"]] },
  { id: "jDock", label: "Rendezvous & docking", get: "128:03:00", view: "moon", craft: "Columbia + Eagle",
    sub: "Three and a half hours to catch Columbia",
    desc: "Eagle catches up from below over nearly two orbits and docks with Columbia. The crew and samples move across, and Eagle's ascent stage is cast off.",
    kv: [["Docking", "128:03"], ["Ascent stage jettisoned", "130:09:55"]] },
  { id: "jTEI", label: "Trans-Earth injection", get: "135:23:42", view: "loi", craft: "Columbia",
    sub: "SPS burn behind the Moon",
    desc: "Again on the far side, the SPS fires to break out of lunar orbit and send Columbia home.",
    kv: [["Ignition", "135:23:42"], ["Δv", "≈3,293 ft/s"]] },
  { id: "jTEC", label: "Trans-Earth coast", get: "165:00:00", view: "all", craft: "Columbia",
    sub: "Two and a half days home",
    desc: "Climbing out of the Moon's pull and then falling toward Earth, gaining speed the whole way.",
    kv: [["Duration", "≈59.7 h"], ["From", "135:23:42 TEI"], ["To", "195:03:06 entry interface"]] },
  { id: "jEntry", label: "Entry & splashdown", get: "195:18:35", view: "entry", craft: "Columbia (command module)",
    sub: "13°19′N 169°9′W · USS Hornet",
    desc: "The service module is cast off fifteen minutes before entry. The command module hits the atmosphere at 36,194 ft/s, rides its heat shield down through the blackout and lands under three parachutes in the Pacific, near USS Hornet.",
    kv: [["CM / SM separation", "194:49:19"], ["Entry interface", "195:03:06 · 121.9 km · 36,194 ft/s"], ["Splashdown", "195:18:35"], ["UTC", MISSION.splash], ["Position", "13°19′N 169°9′W"]] },
];
const J_BY = Object.fromEntries(J_PHASES.map((p, i) => [p.id, Object.assign(p, { i, gh: getH(p.get) })]));

// ---------------- geometry of the flight ----------------
function keplerE(M, e) { let E = e < 0.8 ? M : Math.PI; for (let k = 0; k < 30; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }
// Earth-centred ellipse, perigee q, apogee Q (units). Returns pos(τ) for τ hours after perigee (τ may be negative).
function conic(q, Q) {
  const a = (q + Q) / 2, e = (Q - q) / (Q + q), n = Math.sqrt(J_MU / Math.pow(a * 1000, 3)) * 3600;   // rad per hour
  return (tau) => {
    const E = keplerE(Math.abs(tau) * n, e), nu = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));
    return { r: a * (1 - e * Math.cos(E)), nu: Math.sign(tau) * nu };
  };
}
// Moon-centred hyperbola with periselene rp and eccentricity e: r at true anomaly ν
const hyp = (rp, e) => { const p = rp * (1 + e); return { r: (nu) => p / (1 + e * Math.cos(nu)), nu: (r) => Math.acos(clamp((p / r - 1) / e, -1, 1)) }; };

function buildTrack() {
  const T = [], mark = (k) => (J.idx[k] = T.length - 1), push = (p, gh) => T.push({ p, gh });
  const phiL = J.phiL;
  // ascent: KSC → insertion, 17.5° downrange
  const ins = phiL + 17.5 * DEG, rPark = J_RE + 0.1845;
  for (let i = 0; i <= 60; i++) { const s = i / 60, alt = 0.1845 * (1 - Math.pow(1 - s, 9)); push(azv(lerp(phiL, ins, s), J_RE + alt), s * getH("00:11:49.3")); }
  J.idx.jLaunch0 = 0; J.idx.jLaunch = 0; mark("jAscent");
  // parking orbit: 1.73 laps to TLI ignition
  const tIgn = getH("02:44:16.2"), tIns = getH("00:11:49.3"), laps = (tIgn - tIns) / (88.2 / 60);
  const phiT = ins + laps * TAU;
  for (let i = 1; i <= 360; i++) { const s = i / 360; push(azv(lerp(ins, phiT, s), rPark), lerp(tIns, tIgn, s)); if (i === 180) mark("jEPO"); }
  // TLI burn: 23.6° while climbing to 322.7 km
  const tCut = getH("02:50:03.0"), phiC = phiT + 23.6 * DEG;
  for (let i = 1; i <= 30; i++) { const s = i / 30; push(azv(lerp(phiT, phiC, s), lerp(rPark, J_RE + 0.3227, s * s)), lerp(tIgn, tCut, s)); }
  mark("jTLI");
  // outbound: ellipse from the cutoff point, carried into the turning frame, then the lunar hyperbola
  const out = conic(J_RE + 0.3227, 520), H = hyp(J_RM + 0.111, 1.46);
  const phiIn = phiC + J_WM * tCut;    // inertial azimuth of perigee
  let last = null;
  for (let tau = 0.01; tau < 90; tau *= 1.03) {
    const { r, nu } = out(tau), gh = tCut + tau, p = azv(phiIn + nu - J_WM * gh, r);
    const d = p.distanceTo(J_MC);
    if (d < 12 || (last && d > last.d && d < 60)) break;
    const w = smooth(40, 12, d), hp = J_MC.clone().add(azv(H.nu(d), d));
    push(p.lerp(hp, w), gh); last = { d, gh };
    if (!J.idx.jTD && gh > getH("03:29:00")) mark("jTD");
    if (!J.idx.jTLC && gh > 40) mark("jTLC");
  }
  const tLOI = getH("75:49:49.6");
  const nu0 = H.nu(last.d);
  for (let i = 1; i <= 80; i++) { const nu = nu0 * (1 - i / 80); push(J_MC.clone().add(azv(nu, H.r(nu))), lerp(last.gh, tLOI, i / 80)); }
  mark("jLOI");
  // lunar orbit (clockwise: azimuth decreasing) — laps compressed between events
  const rO = J_RM + 0.111, mpt = (a, r) => J_MC.clone().add(azv(a, r));
  const arc = (a0, a1, r0, r1, g0, g1, n, rf) => { for (let i = 1; i <= n; i++) { const s = i / n; push(mpt(lerp(a0, a1, s), rf ? rf(s) : lerp(r0, r1, s)), lerp(g0, g1, s)); } };
  const aU = -250 * DEG, aDOI = -321.5 * DEG, aPDI = (-141.5 - 360) * DEG, aSite = (-156.527 - 360) * DEG;
  arc(0, aU, rO, rO, tLOI, getH("100:13:38"), 140); mark("jUndock");
  arc(aU, aDOI, rO, rO, getH("100:13:38"), getH("101:36:14"), 40);
  arc(aDOI, aPDI, 0, 0, getH("101:36:14"), getH("102:33:04"), 120, (s) => J_RM + 0.015 + (0.111 - 0.015) * (0.5 + 0.5 * Math.cos(s * Math.PI)));
  // powered descent: 480 km downrange, altitude ∝ (range left)^0.45
  arc(aPDI, aSite, 0, 0, getH("102:33:04"), getH("102:45:43"), 90, (s) => J_RM + 0.015 * Math.pow(Math.max(0, 1 - s), 0.45));
  mark("jLand"); J.idx.jEVA = J.idx.jLand;
  push(T[T.length - 1].p.clone(), getH("124:22:00"));
  const aIns = aSite - 12 * DEG, aDock = aIns - 1.75 * TAU, aTEI = Math.floor(aDock / TAU) * TAU;
  arc(aSite, aIns, 0, 0, getH("124:22:00"), getH("124:29:14"), 40, (s) => J_RM + 0.0183 * Math.sqrt(s));
  mark("jLift");
  arc(aIns, aDock, 0, 0, getH("124:29:14"), getH("128:03:00"), 220, (s) => J_RM + lerp(0.0183, 0.111, smooth(0, 1, s)));
  mark("jDock");
  arc(aDock, aTEI, rO, rO, getH("128:03:00"), getH("135:23:42"), 140);
  mark("jTEI");
  // return: hyperbola out of lunar orbit, then an Earth-bound ellipse whose last part leans into the entry plane
  const tEI = getH("195:03:06"), ret = conic(J_RE + 0.12, 520);
  const S = J.splash, d0 = azv(J.phiEI);
  const n = V3().crossVectors(S.clone().normalize(), d0).normalize();
  const EIp = S.clone().normalize().applyAxisAngle(n, 25 * DEG).multiplyScalar(J_RE + 0.1219);
  const phiEI = J.phiEI;                                        // in-plane azimuth the conic aims at
  const lean = new THREE.Quaternion().setFromUnitVectors(azv(phiEI), EIp.clone().normalize());
  const phiPin = phiEI + J_WM * tEI, I = new THREE.Quaternion(), q = new THREE.Quaternion();
  const retPts = [];
  for (let tau = -0.01; tau > -80; tau *= 1.03) {
    const { r, nu } = ret(tau), gh = tEI + tau, p = azv(phiPin + nu - J_WM * gh, r);
    p.applyQuaternion(q.copy(I).slerp(lean, smooth(45, 10, r)));
    const d = p.distanceTo(J_MC), prev = retPts[retPts.length - 1];
    if (prev && d > prev.d && d < 60) break;
    retPts.push({ p, gh, d });
    if (d < 12) break;
  }
  retPts.reverse();
  const nuE = H.nu(retPts[0].d);
  for (let i = 1; i <= 80; i++) { const nu = -nuE * i / 80; push(J_MC.clone().add(azv(nu, H.r(nu))), lerp(getH("135:23:42"), retPts[0].gh, i / 80)); }
  for (const { p, gh, d } of retPts) {
    const w = smooth(40, 12, d), hp = J_MC.clone().add(azv(-H.nu(d), d));
    push(p.clone().lerp(hp, w), gh);
    if (!J.idx.jTEC && gh > 165) mark("jTEC");
  }
  // entry: 25° of great circle down to the splash point
  for (let i = 1; i <= 50; i++) { const s = i / 50; push(S.clone().normalize().applyAxisAngle(n, 25 * DEG * (1 - s)).multiplyScalar(lerp(J_RE + 0.1219, J_RE, Math.pow(s, 1.6))), lerp(tEI, getH("195:18:35"), s)); }
  mark("jEntry"); J.idx.jAll = T.length - 1;
  J.track = T;
}

// ---------------- screen-space lines (drawn in the FX pass, hidden behind bodies via the depth buffer) ----------------
const JLINE_VERT = /* glsl */`
attribute vec3 aPrev; attribute vec3 aNext; attribute float aSide; attribute float aDist; attribute float aProg;
uniform vec2 uRes; uniform float uW;
varying float vDist; varying float vProg; varying float vVZ; varying float vSide;
void main(){
  vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(aPrev, 1.0);
  vec4 n = projectionMatrix * modelViewMatrix * vec4(aNext, 1.0);
  vec2 h = uRes * 0.5, sc = c.xy / c.w * h, d1 = sc - p.xy / p.w * h, d2 = n.xy / n.w * h - sc;
  float l1 = length(d1), l2 = length(d2);
  vec2 t = (l1 > 1e-3 ? d1 / l1 : vec2(0.0)) + (l2 > 1e-3 ? d2 / l2 : vec2(0.0));
  t = length(t) > 1e-4 ? normalize(t) : vec2(1.0, 0.0);
  float hw = uW * 0.5 + 1.0;
  c.xy += vec2(-t.y, t.x) * aSide * hw / h * c.w;
  gl_Position = c;
  vVZ = -(modelViewMatrix * vec4(position, 1.0)).z; vDist = aDist; vProg = aProg; vSide = aSide * hw;
}`;
const JLINE_FRAG = /* glsl */`
uniform sampler2D tDepth; uniform vec2 uRes; uniform vec3 uCol, uColF;
uniform float uNear, uFar, uW, uPx, uProgress, uDash, uA, uAF, uHide;
varying float vDist; varying float vProg; varying float vVZ; varying float vSide;
void main(){
  float sd = texture2D(tDepth, gl_FragCoord.xy / uRes).r;
  float zs = uNear + sd * (uFar - uNear);
  float vis = (sd < 0.99999 && zs < vVZ - uPx * 4.0) ? uHide : 1.0;
  bool past = vProg <= uProgress;
  float a = past ? uA : uAF;
  if (!past && uDash > 0.0 && fract(vDist / (uPx * uDash)) > 0.55) a = 0.0;
  a *= clamp(uW * 0.5 + 0.5 - abs(vSide), 0.0, 1.0) * vis;
  if (a < 0.003) discard;
  gl_FragColor = vec4((past ? uCol : uColF) * a, a);
}`;
function jLine(pts, o = {}) {
  const n = pts.length, P = [], Pr = [], Nx = [], Sd = [], Ds = [], Pg = [], idx = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    if (i) acc += pts[i].distanceTo(pts[i - 1]);
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], pg = o.prog ? o.prog[i] : 0;
    for (const s of [-1, 1]) { P.push(pts[i].x, pts[i].y, pts[i].z); Pr.push(a.x, a.y, a.z); Nx.push(b.x, b.y, b.z); Sd.push(s); Ds.push(acc); Pg.push(pg); }
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("aPrev", new THREE.Float32BufferAttribute(Pr, 3));
  g.setAttribute("aNext", new THREE.Float32BufferAttribute(Nx, 3));
  g.setAttribute("aSide", new THREE.Float32BufferAttribute(Sd, 1));
  g.setAttribute("aDist", new THREE.Float32BufferAttribute(Ds, 1));
  g.setAttribute("aProg", new THREE.Float32BufferAttribute(Pg, 1));
  g.setIndex(idx);
  const m = new THREE.ShaderMaterial({
    vertexShader: JLINE_VERT, fragmentShader: JLINE_FRAG, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    uniforms: {
      tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uCol: { value: new THREE.Color() }, uColF: { value: new THREE.Color() },
      uNear: { value: 1 }, uFar: { value: 100 }, uW: { value: 2 }, uPx: { value: 1 }, uProgress: { value: o.prog ? 1e9 : -1 }, uDash: { value: o.dash ?? 0 }, uA: { value: o.a ?? 1 }, uAF: { value: o.af ?? 0.35 }, uHide: { value: o.hide ?? 0.18 },
    },
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.layers.set(FX_LAYER); mesh.frustumCulled = false; mesh.renderOrder = 20;
  mesh.userData.j = { w: o.w ?? 1.5, col: o.col ?? "ink", colF: o.colF ?? "ink", dash: o.dash ?? 0 };
  J.lines.push(mesh);
  return mesh;
}
const ring = (c, r, n = 256) => Array.from({ length: n + 1 }, (_, i) => c.clone().add(azv((i / n) * TAU, r)));

// ---------------- Earth and Moon textures ----------------
function earthTexture() {
  return TEX(4096, 2048, (P) => {
    const { g, w, h } = P, X = (lon) => ((lon + 180) / 360) * w, Y = (lat) => ((90 - lat) / 180) * h;
    for (const rg of LAND) {
      const pts = []; let off = 0, prev = null;
      for (let i = 0; i < rg.length; i += 2) {
        const raw = rg[i] / 5;
        if (prev !== null) { if (raw + off - prev > 180) off -= 360; else if (prev - (raw + off) > 180) off += 360; }
        pts.push([raw + off, rg[i + 1] / 5]); prev = raw + off;
      }
      for (const s of [-360, 0, 360]) {
        g.beginPath(); pts.forEach(([lo, la], k) => (k ? g.lineTo : g.moveTo).call(g, X(lo + s), Y(la))); g.closePath();
        g.fillStyle = "rgba(0,0,255,1)"; g.fill();
        g.strokeStyle = "rgba(0,255,0,0.8)"; g.lineWidth = 2.4; g.stroke();
      }
    }
    for (let lat = -60; lat <= 60; lat += 30) P.hline((lat + 90) / 180, lat ? 0.16 : 0.3, 2);
    for (let lon = -180; lon < 180; lon += 30) P.vline((lon + 180) / 360, 0.16, 2, 0.04, 0.96);
  });
}
function moonTexture() {
  return TEX(4096, 2048, (P) => {
    const { g, w, h } = P, X = (lon) => ((lon + 180) / 360) * w, Y = (lat) => ((90 - lat) / 180) * h;
    const blob = (lon, lat, rx, ry, ch, a) => {
      g.fillStyle = ch === "ink" ? `rgba(0,255,0,${a})` : `rgba(0,0,255,${a})`;
      for (const s of [-360, 0, 360]) { g.beginPath(); g.ellipse(X(lon + s), Y(lat), (rx / Math.max(0.2, Math.cos(lat * DEG)) / 360) * w, (ry / 180) * h, 0, 0, TAU); g.fill(); }
    };
    const crater = (lon, lat, r, a = 0.35, floor = 0) => {
      const rx = (r / Math.max(0.15, Math.cos(lat * DEG)) / 360) * w, ry = (r / 180) * h;
      if (floor) { g.fillStyle = `rgba(0,0,255,${floor})`; g.beginPath(); g.ellipse(X(lon), Y(lat), rx, ry, 0, 0, TAU); g.fill(); }
      g.strokeStyle = `rgba(0,255,0,${a})`; g.lineWidth = Math.max(1, Math.min(3, ry * 0.12));
      g.beginPath(); g.ellipse(X(lon), Y(lat), rx, ry, 0, 0, TAU); g.stroke();
    };
    // maria (near side, plus the few dark patches on the far side) as overlapping blobs
    const MARIA = [
      [-55, 20, 18, 16], [-65, 5, 14, 14], [-45, 32, 14, 10], [-48, -2, 12, 10], [-70, 25, 10, 12], [-60, 40, 10, 8],     // Procellarum
      [-16, 33, 18, 14], [-25, 39, 10, 8], [-5, 38, 8, 6],                                                               // Imbrium
      [17.5, 28, 10, 9], [31, 8, 12, 8.5], [24, 4, 7, 5], [38, 14, 8, 6], [21, 15, 4, 4],                               // Serenitatis, Tranquillitatis
      [59, 17, 8, 6.5], [51, -6, 8, 10], [48, -14, 6, 5], [35, -15, 5.5, 5],                                             // Crisium, Fecunditatis, Nectaris
      [-17, -20, 11, 9], [-23, -10, 6, 5], [-39, -24, 6, 6], [4, 13, 5, 4], [-31, 7, 8, 6], [1, 2, 4, 3],                // Nubium, Cognitum, Humorum, Vaporum, Insularum, Medii
      [-10, 56, 22, 4.5], [20, 57, 18, 4], [-35, 55, 10, 4], [86, 13, 4, 4], [87, -2, 4, 4], [89, -46, 7, 6],             // Frigoris, Marginis, Smythii, Australe
      [147, 27, 4, 4], [129, -21, 2, 2], [163, -34, 3, 3], [-95, -20, 4, 4],                                              // Moscoviense, Tsiolkovsky, Ingenii, Orientale
    ];
    for (const [lo, la, rx, ry] of MARIA) blob(lo, la, rx, ry, "alt", 0.8);
    // named craters
    for (const [lo, la, r, f] of [[-20, 9.6, 1.5], [-11.4, -43.3, 1.4], [-38, 8.1, 0.55], [-47.5, 23.7, 0.6], [-9.3, 51.6, 1.7, 0.7], [-68, -5.2, 2.8, 0.7],
      [61, -8.9, 2.1], [60.4, -25.3, 3], [26.4, -11.4, 1.6], [-14.4, -58.8, 3.8], [-1.9, -9.3, 2.5], [-3, -13.4, 1.9], [-4, 29.7, 1.4, 0.3], [-11.3, 14.5, 0.9], [29.9, 31.8, 1.6]])
      crater(lo, la, r, 0.5, f || 0);
    // the rest: a seeded scatter, many small and few large
    let s = 1969; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 1400; i++) { const lo = rnd() * 360 - 180, la = Math.asin(rnd() * 2 - 1) / DEG, r = 0.25 + Math.pow(rnd(), 5) * 3.5; crater(lo, la, r, 0.12 + 0.18 * rnd()); }
    for (let lat = -60; lat <= 60; lat += 30) P.hline((lat + 90) / 180, 0.06, 1.2);
  }, { aniso: 8 });
}

// ---------------- build ----------------
function journeyShell() {   // the empty root is registered at startup; its contents are built on first visit
  const g = mod("jMap"); g.position.copy(J_ORIGIN); g.visible = false;
  MODULES.jMap = { name: "The Journey", desc: "", kv: [] };
  SHOW.jMap = { key: "jMap", group: g, asm: [], fx: [], journey: true, view: { az: 0, el: 52 * DEG }, dynSphere: true };
  SHOW_ROOT.add(g); J.root = g;
  MODULES.jEarth = { name: "Earth", kv: [["Radius", "6,378 km"], ["Parking orbit", MISSION.parking]] };
  MODULES.jMoon = { name: "The Moon", kv: [["Radius", "1,737 km"], ["Distance", "384,400 km mean"]] };
  for (const p of J_PHASES) MODULES[p.id] = { name: p.name || p.label, desc: p.desc, kv: p.kv };
  MENU.push(["The Journey", J_PHASES.map((p) => [p.id, p.label, { mods: [], info: [p.id], show: "jMap", root: true, jv: p.view, onSelect: (prev) => journeyGo(p.id, prev !== "jMap") }])]);
  const [, items] = MENU[MENU.length - 1];
  for (const [id, label, o] of items) MENU_ITEMS[id] = { id, label, ...o };
}
function buildJourney() {
  if (J.built) return; J.built = true;
  const root = J.root;
  // Earth: KSC in the orbit plane at launch, the globe turning with mission time
  // Aim both coasts at the Moon: the outbound arrives 1° short of the Earth–Moon line (the Moon's leading side,
  // so it swings round the far side), the return leaves 1° past it. Everything near Earth follows back from that.
  const timeTo = (f, R) => { let lo = 0.01, hi = 200; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (f(m).r < R) lo = m; else hi = m; } return lo; };
  const tIns = getH("00:11:49.3"), tIgn = getH("02:44:16.2"), laps = (tIgn - tIns) / (88.2 / 60);
  { const out = conic(J_RE + 0.3227, 520), tau = timeTo(out, J_DEM), phiC = 1.0 * DEG - out(tau).nu + J_WM * tau;
    J.phiL = (((phiC - 23.6 * DEG - laps * TAU - 17.5 * DEG) % TAU) + TAU) % TAU; }
  { const ret = conic(J_RE + 0.12, 520), tau = timeTo(ret, J_DEM);
    J.phiEI = -1.0 * DEG + ret(tau).nu - J_WM * tau; }
  const tilt = new THREE.Group(), spin = new THREE.Group();
  const th0 = J.phiL - J_KSC[1] * DEG;
  const v1 = ecef(J_KSC[0], J_KSC[1]).applyAxisAngle(UP, th0);
  tilt.quaternion.setFromUnitVectors(v1, azv(J.phiL));
  // Earth turns at its real rate in this frame; over the lunar days a small offset is eased in so the
  // splashdown point lands ~25° downrange of where the return path meets the atmosphere (a drawing liberty).
  const tS = getH("195:18:35"), splashAt = (off) => ecef(J_SPLASH[0], J_SPLASH[1]).applyAxisAngle(UP, th0 + J_SPIN * tS + off).applyQuaternion(tilt.quaternion);
  let off = 0;
  for (let k = 0; k < 8; k++) { const sp = splashAt(off), a = Math.atan2(-sp.z, sp.x); off += Math.atan2(Math.sin(J.phiEI + 25 * DEG - a), Math.cos(J.phiEI + 25 * DEG - a)); }
  J.earthTh = (gh) => th0 + J_SPIN * gh + off * smooth(80, 130, gh);
  spin.rotation.y = J.earthTh(0);
  root.add(tilt); tilt.add(spin);
  J.spin = spin; J.tilt = tilt;
  J.splash = splashAt(off).multiplyScalar(J_RE);
  const eT = earthTexture(), mT = moonTexture();
  mod("jEarth", spin); within("jEarth", (g) => add(g, new THREE.SphereGeometry(J_RE, 160, 80), "sea", { map: eT, alt: "hi", inkA: 0.7, rim: 0.4 }));
  const mg = mod("jMoon", root); mg.position.copy(J_MC); mg.rotation.y = Math.PI;   // near side toward Earth
  within("jMoon", (g) => add(g, new THREE.SphereGeometry(J_RM, 160, 80), "light", { map: mT, inkA: 0.75, rim: 0.4 }));
  buildTrack();
  // lines: Moon's orbit (faint), parking and lunar orbits, the flown path
  J.moonRing = jLine(ring(V3(), J_DEM, 720), { w: 1, af: 0.18, dash: 9, hide: 0.5 }); root.add(J.moonRing);
  root.add(jLine(ring(V3(), J_RE + 0.1845), { w: 1.1, af: 0.3, hide: 0.1 }));
  root.add(jLine(ring(J_MC, J_RM + 0.111), { w: 1.1, af: 0.3, hide: 0.1 }));
  J.trackLine = jLine(J.track.map((t) => t.p), { w: 2.4, col: "hl", colF: "ink", a: 1, af: 0.38, dash: 7, hide: 0.2, prog: J.track.map((_, i) => i) });
  root.add(J.trackLine);
  for (const m of [...MODS.jEarth.meshes, ...MODS.jMoon.meshes]) PICK.push(m);
  journeyLabels();
}

// ---------------- labels and markers (HTML over the canvas) ----------------
const J_SITE_P = () => J_MC.clone().add(ecef(J_SITE[0], J_SITE[1] + 180).multiplyScalar(J_RM));
function journeyLabels() {
  const box = $("#jlab");
  const mk = (cls, html) => { const e = el("div", { class: "jl " + cls }, html); box.append(e); return e; };
  const at = (k) => J.track[J.idx[k]].p;
  J.labels = [
    { e: mk("body", "Earth"), p: () => V3(0, J_RE * 1.05, 0), on: (id) => ["jAll", "jTLC", "jTEC", "jTD"].includes(id) },
    { e: mk("body", "Moon"), p: () => J_MC.clone().add(V3(0, J_RM * 1.1, 0)), on: (id) => ["jAll", "jTLC", "jTEC", "jLOI", "jTEI"].includes(id) },
    { e: mk("note", "Outbound · 73 h"), p: () => midLeg(J.idx.jTLI, J.idx.jLOI, 0.36), on: (id) => ["jAll", "jTLC", "jTEC"].includes(id) },
    { e: mk("note", "Home · 60 h"), p: () => midLeg(J.idx.jTEI, J.idx.jEntry, 0.5), on: (id) => ["jAll", "jTLC", "jTEC"].includes(id) },
    { e: mk("site below", "LC-39A · Kennedy Space Center"), p: () => at("jLaunch0").clone().setLength(J_RE), on: (id) => ["jLaunch", "jAscent"].includes(id) },
    { e: mk("note below", "Orbit · 185.9 × 183.2 km"), p: () => at("jAscent"), on: (id) => id === "jAscent" },
    { e: mk("note", "Parking orbit · 88 min"), p: () => azv(J.phiL + 200 * DEG, J_RE + 0.1845), on: (id) => id === "jEPO" },
    { e: mk("note", "TLI · S-IVB, 5 min 47 s"), p: () => J.track[J.idx.jTLI - 15].p, on: (id) => id === "jTLI" },
    { e: mk("note", "Lunar orbit · " + MISSION.lunarOrbit), p: () => J_MC.clone().add(azv(60 * DEG, J_RM + 0.111)), on: (id) => ["jLOI", "jUndock", "jDock"].includes(id) },
    { e: mk("note below", "LOI · far side, out of contact"), p: () => at("jLOI"), on: (id) => id === "jLOI" },
    { e: mk("note below", "TEI · far side"), p: () => at("jTEI"), on: (id) => id === "jTEI" },
    { e: mk("note", "Powered descent · 12 min 39 s"), p: () => J.track[J.idx.jLand - 60].p, on: (id) => id === "jLand" },
    { e: mk("site below", "Tranquility Base"), p: J_SITE_P, on: (id) => ["jLand", "jEVA", "jLift"].includes(id) },
    { e: mk("note", "Entry interface · 121.9 km"), p: () => J.track[J.idx.jEntry - 50].p, on: (id) => id === "jEntry" },
    { e: mk("site below", "Splashdown · USS Hornet"), p: () => J.splash, on: (id) => id === "jEntry" },
  ];
  J.mk = mk("craft", "<i></i><span></span>");
  J.mk2 = mk("craft two", "<i></i><span>Columbia · Collins</span>");
}
const midLeg = (a, b, f) => { const X = J_DEM * f; for (let k = a; k < b; k++) if ((J.track[k].p.x - X) * (J.track[k + 1].p.x - X) <= 0) return J.track[k].p; return J.track[b].p; };
const _jp = new THREE.Vector3();
function journeyOverlay(camera) {
  const box = $("#jlab"), on = SHOW[curShow()]?.journey && J.built;
  box.hidden = !on; if (!on) return;
  const r = PIPE.renderer.domElement, W = r.clientWidth, H = r.clientHeight, id = C.sel;
  const place = (e, p, show) => {
    if (!show) { e.style.display = "none"; return; }
    _jp.copy(p).add(J_ORIGIN).project(camera);
    const x = (_jp.x + 1) / 2 * W, y = (1 - _jp.y) / 2 * H;
    const out = x < -40 || y < -20 || x > W + 40 || y > H + 20, flip = x > W * 0.66;
    e.style.display = out ? "none" : "";
    e.classList.toggle("flip", flip);
    e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` + (flip && !e.classList.contains("craft") ? " translateX(-100%)" : "");
  };
  for (const L of J.labels) place(L.e, L.p(), L.on(id));
  const ph = J_BY[id];
  place(J.mk, journeyPos(J.cur), !!ph?.craft || J.t < 1);
  if (ph) J.mk.querySelector("span").textContent = (J.t < 1 ? "" : (ph.craft || "")) || "";
  place(J.mk2, J_MC.clone().add(azv(J.colA, J_RM + 0.111)), J.colOn > 0.5);
}
function journeyPos(f) { const T = J.track, i = clamp(Math.floor(f), 0, T.length - 1), k = Math.min(T.length - 1, i + 1); return T[i].p.clone().lerp(T[k].p, f - i); }
// Columbia's own position while Eagle is away (azimuth around the Moon)
const J_COL = { jUndock: -250, jLand: -330, jEVA: -480, jLift: -560, jDock: -798.5 };
function journeyGo(id, enter) {
  buildJourney();
  const ph = J_BY[id], to = J.idx[id] ?? 0;
  J.from = enter ? to : J.cur; J.to = to; J.t = enter || REDUCED ? 1 : 0; J.cur = J.t >= 1 ? to : J.cur;
  J.getFrom = enter ? ph.gh : J.get; J.getTo = ph.gh; if (J.t >= 1) J.get = ph.gh;
  // the globe turns the short way between stages, so days-long hops don't spin it like a top
  J.thTo = J.earthTh(ph.gh); J.thFrom = enter || J.th === undefined ? J.thTo : J.th; if (J.t >= 1) J.th = J.thTo;
  const ca = J_COL[id];
  J.colOn = ["jLand", "jEVA", "jLift"].includes(id) ? 1 : 0;
  J.moonRing.visible = ph.view === "all";
  if (ca !== undefined) { J.colFrom = enter || !J.colPrev ? ca * DEG : J.colA; J.colTo = ca * DEG; if (J.t >= 1) J.colA = J.colTo; }
  J.colPrev = ca !== undefined;
  const v = journeyFrameBox(ph.view);
  if (enter) { CAM.az = v.az; CAM.el = v.el; CAM.fly = null; }
  else CAM.fly = { az: CAM.az + Math.atan2(Math.sin(v.az - CAM.az), Math.cos(v.az - CAM.az)), el: v.el };
}
function journeyFrame(dt) {
  if (!J.built || !SHOW[curShow()]?.journey) return false;
  const busy = J.t < 1;
  if (busy) {
    J.t = Math.min(1, J.t + dt / (Math.abs(J.to - J.from) > 600 ? 2.6 : 1.8));
    const e = ease(J.t);
    J.cur = lerp(J.from, J.to, e); J.get = lerp(J.getFrom, J.getTo, e); J.colA = lerp(J.colFrom, J.colTo, e);
    J.th = J.thFrom + Math.atan2(Math.sin(J.thTo - J.thFrom), Math.cos(J.thTo - J.thFrom)) * e;
  }
  J.spin.rotation.y = J.th;
  J.trackLine.material.uniforms.uProgress.value = C.sel === "jAll" ? 1e9 : J.cur;
  return busy;
}
// per-frame uniforms for the line pass (called by the pipeline just before the FX layer)
function journeyFX(camera, pipe) {
  if (!J.built || !J.root.visible) return;
  const px = (camera.top - camera.bottom) / pipe.ch, dpr = pipe.dpr || 1;
  for (const m of J.lines) {
    const u = m.material.uniforms, d = m.userData.j;
    u.tDepth.value = pipe.rtN.depthTexture; u.uRes.value.set(pipe.cw, pipe.ch);
    u.uNear.value = camera.near; u.uFar.value = camera.far; u.uPx.value = px; u.uW.value = d.w * dpr;
    u.uCol.value.copy(PAL[d.col]); u.uColF.value.copy(PAL[d.colF]);
    u.uDash.value = d.dash * dpr;
  }
}
// camera frame for a phase: centre (journey-local) and the width × height it needs
const lookAt = (dir, el) => ({ az: Math.atan2(dir.x, dir.z), el });   // camera over a direction, raised to el
function journeyFrameBox(view) {
  const T = (k) => J.track[J.idx[k]].p, E = V3(), M = J_MC, top = { az: 0, el: 52 * DEG };
  const siteView = lookAt(J_SITE_P().sub(M), 38 * DEG);
  switch (view) {
    case "all": return { c: V3(J_DEM / 2, 0, 0), w: J_DEM + 40, h: 60, az: 0, el: 64 * DEG };
    case "launch": { const a = T("jLaunch0"), b = T("jAscent"); return { c: a.clone().lerp(b, 0.5).setLength(J_RE + 0.12), w: 6, h: 3.6, ...lookAt(a.clone().lerp(b, 0.5), 34 * DEG) }; }
    case "earth": return { c: E, w: 16, h: 15, ...top };
    case "tli": return { c: T("jTLI").clone().multiplyScalar(0.35), w: 20, h: 17, ...top };
    case "td": { const p = T("jTD"); return { c: p.clone().multiplyScalar(0.5), w: p.length() + 16, h: p.length() * 0.6 + 14, ...top }; }
    case "loi": return { c: M.clone().add(V3(-1.5, 0, 0)), w: 11, h: 8.5, ...top };
    case "moon": return { c: M, w: 5.4, h: 4.6, ...top };
    case "moonwide": return { c: M, w: 5.2, h: 4.6, ...siteView };
    case "land": { const a = J.track[J.idx.jLand - 90].p, b = T("jLand"); return { c: a.clone().lerp(b, 0.5), w: 2.0, h: 1.5, ...siteView }; }
    case "lift": { const a = T("jLand"), b = T("jLift"); return { c: a.clone().lerp(b, 0.5), w: 2.0, h: 1.5, ...siteView }; }
    case "entry": { const b = J.splash; return { c: b.clone().multiplyScalar(0.55), w: 18, h: 15, ...lookAt(b, 40 * DEG) }; }
  }
  return { c: E, w: 20, h: 20, ...top };
}

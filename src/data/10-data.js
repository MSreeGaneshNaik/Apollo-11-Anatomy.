// ============================================================================
// 10 · TRUTH — every number shown on the page comes from here.
// Rated figures are from the sources listed in SOURCES; anything derived is
// computed below from those figures with standard physics (no tuning).
// ============================================================================
const LBF = 4.4482216152605;      // N per lbf (exact definition)
const LB = 0.45359237;            // kg per lb (exact)
const FT = 0.3048;                // m per ft (exact)
const G0 = 9.80665;               // standard gravity, m/s² (exact)
const P0 = 101325;                // sea-level standard pressure, Pa
const G_MOON = 1.625;             // lunar surface gravity, m/s²

// --- U.S. Standard Atmosphere 1976, geopotential layers to 86 km -------------
const ATM_LAYERS = [ // base height m, base temperature K, lapse K/m
  [0, 288.15, -0.0065], [11000, 216.65, 0], [20000, 216.65, 0.001], [32000, 228.65, 0.0028],
  [47000, 270.65, 0], [51000, 270.65, -0.0028], [71000, 214.65, -0.002], [84852, 186.946, 0],
];
const ATM_P = (() => { // base pressures, integrated layer by layer
  const R = 287.05287, out = [P0];
  for (let i = 0; i < ATM_LAYERS.length - 1; i++) {
    const [h0, T0, L] = ATM_LAYERS[i], h1 = ATM_LAYERS[i + 1][0], p = out[i];
    out.push(L === 0 ? p * Math.exp(-G0 * (h1 - h0) / (R * T0)) : p * Math.pow((T0 + L * (h1 - h0)) / T0, -G0 / (L * R)));
  }
  return out;
})();
function pressureAt(hGeometric) { // Pa
  const r0 = 6356766, h = (r0 * Math.max(0, hGeometric)) / (r0 + Math.max(0, hGeometric)); // geopotential
  const R = 287.05287;
  let i = ATM_LAYERS.length - 1;
  while (i > 0 && h < ATM_LAYERS[i][0]) i--;
  const [h0, T0, L] = ATM_LAYERS[i], p0 = ATM_P[i];
  if (h > 86000) return 0.3734 * Math.exp(-(h - 86000) / 6000); // thermosphere tail (≪1 N on any engine)
  return L === 0 ? p0 * Math.exp(-G0 * (h - h0) / (R * T0)) : p0 * Math.pow((T0 + L * (h - h0)) / T0, -G0 / (L * R));
}

// --- Engines (rated) ----------------------------------------------------------
// thrustVac / thrustSL in lbf; isp in s; mdot in kg/s where the source gives it.
const ENGINES = {
  F1: {
    id: "F1", name: "Rocketdyne F-1", stage: "S-IC", count: 5, maker: "Rocketdyne",
    thrustSL: 1522000, thrustVac: 1746000, ispSL: 263, ispVac: 304,
    pc: "70 bar (1,015 psi)", mr: "2.27 : 1 LOX / RP-1", eps: "16 : 1", prop: "RP-1 / LOX",
    mdotSourced: 1789 + 788, // LOX 1,789 + RP-1 788 kg/s
    length: 5.8, diameter: 3.7, dryMass: 8400, power: "≈55,000 bhp turbopump, 5,500 rpm",
    throttle: null, note: "Fixed thrust. Never throttled; the centre engine was shut down early (CECO).",
  },
  J2: {
    id: "J2", name: "Rocketdyne J-2", stage: "S-II / S-IVB", count: 6, maker: "Rocketdyne",
    thrustSL: 109302, thrustVac: 232250, ispSL: 200, ispVac: 421,
    pc: "52.6 bar (763 psi)", mr: "5.5 : 1 LOX / LH₂", eps: "27.5 : 1", prop: "LH₂ / LOX",
    length: 3.4, diameter: 2.1, dryMass: 1788, restart: "Restartable once (S-IVB TLI burn)",
    throttle: null, note: "Fixed thrust. Five on the S-II, one on the S-IVB, which restarted for TLI.",
  },
  SPS: {
    id: "SPS", name: "Aerojet AJ10-137 SPS", stage: "Service Module", count: 1, maker: "Aerojet General",
    thrustVac: 20500, ispVac: 314.5, prop: "Aerozine 50 / N₂O₄ (hypergolic)", nozzleLen: 3.88, nozzleExit: 2.5,
    burnLife: "750 s total, 50 restarts", throttle: null, note: "Fixed thrust, gimballed in two axes.",
  },
  DPS: {
    id: "DPS", name: "TRW LM Descent Engine", stage: "LM descent stage", count: 1, maker: "TRW",
    thrustVac: 10125, ispVac: 311, prop: "Aerozine 50 / N₂O₄ (hypergolic)", minThrust: 1050,
    throttle: { lo: 0.10, hi: 0.60, full: 1.0 }, // continuously throttleable 10–60 %, plus full thrust
    note: "The only throttleable engine on Apollo: 10–60 % continuously, or full thrust.",
  },
  APS: {
    id: "APS", name: "Bell LM Ascent Engine", stage: "LM ascent stage", count: 1, maker: "Bell Aerosystems",
    thrustVac: 3500, ispVac: 311, prop: "Aerozine 50 / N₂O₄ (hypergolic)", burn: 434,
    throttle: null, note: "Fixed thrust, no gimbal, pressure-fed. It had to work first time.",
  },
};

// Derived F-1 nozzle exit area from the rated sea-level / vacuum pair:
// F(p) = F_vac − p · A_e  ⇒  A_e = (F_vac − F_SL) / p₀
ENGINES.F1.Ae = (ENGINES.F1.thrustVac - ENGINES.F1.thrustSL) * LBF / P0; // m²
ENGINES.F1.De = Math.sqrt(4 * ENGINES.F1.Ae / Math.PI);                  // m

// Thrust of one engine (N) at geometric altitude h (m), at throttle fraction t.
function engineThrustN(e, h = 1e6, t = 1) {
  const E = ENGINES[e];
  if (e === "F1") return t * (E.thrustVac * LBF - pressureAt(h) * E.Ae);
  return t * E.thrustVac * LBF; // J-2 runs above ~67 km (≤ 10 Pa); others in vacuum
}
function engineMdot(e, h = 1e6, t = 1) { // kg/s
  const E = ENGINES[e];
  if (e === "F1") return t * E.mdotSourced;
  return engineThrustN(e, h, t) / (E.ispVac * G0);
}
function engineIsp(e, h = 1e6, t = 1) {
  const md = engineMdot(e, h, t);
  return md > 0 ? engineThrustN(e, h, t) / (md * G0) : ENGINES[e].ispVac;
}

// --- Vehicle -------------------------------------------------------------------
const VEHICLE = {
  name: "Saturn V AS-506", height: 110.646, liftoffMass: 2938315, leoPayload: 117934,
  liftoffMassLb: 6477875, heightFt: "363 ft 0.15 in",
};

// Module facts (displayed in the spec sheet and the hover readout).
const MODULES = {
  launcher: { desc: "Mobile Launcher 1 carried the vehicle from the Vehicle Assembly Building to the pad: a two-storey deck with a 45 ft square flame hole, four hold-down arms and three tail service masts.", name: "Mobile Launcher 1 · LC-39A", short: "Launcher", kv: [["Hold-down arms", "4"], ["Tail service masts", "3"], ["Swing arms", "9"], ["Flame hole", "45 ft square"]] },
  sic: { desc: "Boeing's first stage. Liquid oxygen above, RP-1 below, joined by an intertank, with four fins and engine fairings at the base. It burned 161.6 s and handed over at 66 km.", name: "S-IC first stage", short: "S-IC", by: "Boeing · Michoud", kv: [["Height", "42.06 m · 138 ft"], ["Diameter", "10.09 m · 33 ft 1 in"], ["Empty mass", "130,422 kg"], ["Loaded mass", "2,131,322 kg"], ["RP-1", "770,000 L"], ["LOX", "1,204,000 L"], ["Engines", "5 × F-1"], ["Burn (AS-506)", "CECO 135.2 s · OECO 161.6 s"]] },
  sicEngines: { desc: "Five Rocketdyne F-1s, the most powerful single-chamber liquid engines flown. The four outboard engines gimbal for steering; engine 105 in the centre is fixed.", name: "F-1 engine cluster", short: "5 × F-1", kv: [["Thrust SL", "5 × 1,522,000 lbf"], ["Thrust vac", "5 × 1,746,000 lbf"], ["Flow", "5 × 2,577 kg/s"], ["Isp", "263 s SL · 304 s vac"]] },
  siiInter: { desc: "The ring between the S-IC and S-II. It shrouds the five J-2s at launch and drops away in a second separation about 30 s after S-II ignition.", name: "S-IC / S-II interstage", short: "Interstage", kv: [["Jettisoned", "T+00:03:12 (≈30 s after S-II ignition)"], ["Ullage motors", "solid, fire at staging"]] },
  sii: { desc: "North American's hydrogen stage. A single common bulkhead separates the liquid-hydrogen tank above from the liquid-oxygen tank below, saving length and mass.", name: "S-II second stage", short: "S-II", by: "North American · Seal Beach", kv: [["Height", "24.87 m · 81 ft 7 in"], ["Diameter", "10.09 m"], ["Dry mass", "36,158 kg"], ["Loaded mass", "479,964 kg"], ["Propellant", "LH₂ / LOX"], ["Engines", "5 × J-2"], ["Burn (AS-506)", "T+2:43.0 → 9:08.2"]] },
  siiEngines: { desc: "Five J-2s in the same cross pattern as the F-1s. Centre engine 205 was shut down early on Apollo 11, at T+7:40.6.", name: "J-2 cluster (S-II)", short: "5 × J-2", kv: [["Thrust", "5 × 232,250 lbf vac"], ["Total", "1,161,250 lbf"], ["Isp", "421 s vac"]] },
  sivbInter: { desc: "The tapered aft interstage between the S-II and S-IVB. It carries the S-II's four retro-rockets and leaves with the S-II at separation.", name: "S-II / S-IVB interstage", short: "Aft interstage", kv: [["Stays with", "the S-II at separation"], ["Carries", "S-II retro-rockets"]] },
  sivb: { desc: "Douglas's third stage with one restartable J-2. It reached orbit, coasted for 2½ hours, then relit for trans-lunar injection. Two APS modules on the aft skirt handle attitude and ullage.", name: "S-IVB third stage", short: "S-IVB", by: "Douglas · Huntington Beach", kv: [["Height", "17.86 m · 58 ft 7 in"], ["Diameter", "6.60 m · 21 ft 8 in"], ["Dry mass", "11,273 kg"], ["Loaded mass", "119,119 kg"], ["Burn 1 (orbit)", "202,603 lbf avg · 150 s"], ["Burn 2 (TLI)", "201,061 lbf avg · 347 s"], ["APS modules", "2"]] },
  sivbEngine: { desc: "The S-IVB's J-2. It burned 150 s to reach orbit and restarted for the 347 s trans-lunar injection burn.", name: "J-2 (S-IVB)", short: "J-2", kv: [["Thrust", "232,250 lbf vac rated"], ["Restart", "1.5–6 h hold allowed"]] },
  iu: { desc: "IBM's 0.91 m ring of guidance electronics: the launch vehicle digital computer, the inertial platform and telemetry. It steered all three stages.", name: "Instrument Unit", short: "IU", by: "IBM · Huntsville", kv: [["Role", "Saturn V guidance computer, platform, telemetry"], ["Diameter", "6.60 m"], ["Height", "0.91 m · 3 ft"]] },
  sla: { desc: "Four-panel adapter joining the S-IVB to the Service Module. Eagle rode inside with its legs folded; after TLI the panels hinged open and were thrown clear.", name: "Spacecraft–LM Adapter", short: "SLA", kv: [["Length", "8.53 m · 28 ft"], ["Taper", "6.60 → 3.91 m"], ["Panels", "4, hinge open then jettison"], ["Holds", "LM-5 Eagle, legs folded"]] },
  lm: { desc: "Grumman's two-stage lander. The descent stage carried the throttleable engine and the landing gear, and stayed on the Moon as the ascent stage's launch platform.", name: "Lunar Module LM-5 Eagle", short: "LM Eagle", by: "Grumman", kv: [["Height", "6.99 m · 22 ft 11 in"], ["Leg spread", "9.4 m · 31 ft"], ["Launch mass", "15,102 kg"], ["Crew", "Armstrong · Aldrin"], ["Cabin volume", "6.7 m³"], ["Fuel at touchdown", "98 kg · 216 lb"]] },
  lmDescent: { desc: "Octagonal stage in gold Kapton blanket, with four legs, the MESA equipment bay beside the ladder, and surface probes on three footpads that lit the contact light.", name: "LM descent stage", short: "Descent stage", kv: [["Height", "3.23 m · 10 ft 7 in (legs out)"], ["Width", "4.29 m (9.4 m across the legs)"], ["Footpads", "37 in, probes on 3 legs"], ["Mass", "10,334 kg wet"], ["Engine", "TRW DPS 1,050–10,125 lbf"], ["Propellant", "≈8,200 kg in 4 tanks"]] },
  lmAscent: { desc: "The pressurised crew cabin: two triangular windows, the forward EVA hatch, the docking tunnel overhead, rendezvous radar, S-band dish and four RCS quads.", name: "LM ascent stage", short: "Ascent stage", kv: [["Height", "3.76 m · 12 ft 4 in"], ["Width", "4.29 m · 14 ft 1 in (with tanks)"], ["Crew compartment", "92 in Ø × 42 in"], ["Mass", "2,150 kg dry · 4,700 kg wet"], ["Engine", "Bell APS 3,500 lbf"], ["RCS", "16 × 100 lbf, 4 quads"]] },
  sm: { desc: "Six pie-shaped sectors around a central tunnel, holding the SPS engine and its propellant, three fuel cells, cryogenic oxygen and hydrogen, four RCS quads and the high-gain antenna.", name: "Service Module (CSM-107)", short: "SM", by: "North American · Downey", kv: [["Length", "4.52 m body · 7.49 m w/ nozzle"], ["Diameter", "3.91 m"], ["Mass", "24,520 kg"], ["SPS", "20,500 lbf · Isp 314.5 s"], ["RCS", "4 quads × 4 R-4D, 100 lbf"], ["Power", "3 fuel cells × 1.4 kW"]] },
  cm: { desc: "The only part that came home. Cabin for three, ablative heat shield, 12 RCS thrusters, the docking probe on top and three main parachutes under the forward cover.", name: "Command Module Columbia", short: "CM Columbia", by: "North American · Downey", kv: [["Height", "3.48 m"], ["Base diameter", "3.91 m"], ["Mass", "5,560 kg"], ["Habitable volume", "5.9 m³"], ["Heat shield", "phenolic ablator, 1.3–5.1 cm"], ["RCS", "12 × 93 lbf"], ["Mains", "3 × 25.5 m ringsail"]] },
  bpc: { desc: "A shell over the Command Module that kept launch heating and escape-motor exhaust off its windows and skin. It left with the tower at T+3:17.9.", name: "Boost Protective Cover", short: "BPC", kv: [["Height", "3.35 m · 11 ft"], ["Diameter", "3.96 m · 13 ft"], ["Mass", "≈318 kg · 700 lb"], ["Leaves with", "the escape tower"]] },
  les: { desc: "A solid-rocket tractor tower: its escape motor could pull the CM clear of a failing Saturn V. The jettison motor threw the whole tower away once the S-II was burning.", name: "Launch Escape System", short: "LES", kv: [["Length", "10.06 m · 33 ft"], ["Mass", "≈3,630 kg · 8,000 lb"], ["Escape motor", "≈147,000 lbf for 3.2 s"], ["Jettison motor", "≈31,500 lbf for ≈1 s"], ["Pitch motor", "≈2,400 lbf for ≈0.5 s"], ["Jettisoned", "T+00:03:17.9"]] },
  tower: { desc: "The launch umbilical tower. Nine swing arms fed propellant, power and air to the vehicle; arm 9 led the crew through the white room to the hatch.", name: "Launch Umbilical Tower", short: "LUT", kv: [["Swing arms", "9 · arm 9 = crew access"], ["Footprint", "40 ft square"]] },
  moon: { name: "Tranquility Base", short: "Mare Tranquillitatis", kv: [["Landed", "20 Jul 1969 · 20:17:40 UTC"], ["Site", "0°40′27″N 23°28′23″E"], ["EVA", "2 h 31 min 40 s"], ["Samples", "21.55 kg"]] },
  sea: { name: "North Pacific recovery zone", short: "Splashdown", kv: [["Splashdown", "24 Jul 1969 · 16:50:35 UTC"], ["Position", "13°19′N 169°9′W"], ["Ship", "USS Hornet"]] },
};

// --- As-flown Apollo 11 ascent (GET s, altitude ft, velocity ft/s) -------------
const ASCENT = [
  [0, 0, 0], [135.2, 145600, 6504.5], [161.6, 217655, 9030.6], [162.3, 219984, 9064.5], [163.0, 221881, 9059.1],
  [197.9, 315001, 9777.6], [460.6, 588152, 18761.7], [548.2, 609759, 22746.8], [549.2, 610014, 22756.7],
  [699.3, 617957, 25562.4], [709.3, 617735, 25567.9],
  [9856.2, 650558, 25554.0], [10203.0, 1058809, 35562.9], [10213.0, 1103215, 35538.5],
];
// Monotone cubic (Fritsch–Carlson) through the flight-table points.
function monotone(xs, ys) {
  const n = xs.length, d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
// The S-IC segment is cubic in time from rest (thrust ≫ drag early): the
// spline uses an extra anchor so altitude starts flat, as it physically does.
const altFt = monotone(ASCENT.map(r => r[0]), ASCENT.map(r => r[1]));
const velFt = monotone(ASCENT.map(r => r[0]), ASCENT.map(r => r[2]));

// --- Mission events (GET) used by the phase strip and the flight record --------
const EVENTS = [
  ["00:00:00.6", "Liftoff", "LC-39A, 16 Jul 1969 13:32:00 UTC"],
  ["00:02:15.2", "S-IC centre engine cutoff", "145,600 ft · 6,504.5 ft/s"],
  ["00:02:41.6", "S-IC outboard cutoff", "217,655 ft · 9,030.6 ft/s"],
  ["00:02:43.0", "S-II ignition", "221,881 ft · 9,059.1 ft/s"],
  ["00:03:17.9", "Launch escape tower jettison", "315,001 ft · 9,777.6 ft/s"],
  ["00:07:40.6", "S-II centre engine cutoff", "588,152 ft · 18,761.7 ft/s"],
  ["00:09:08.2", "S-II cutoff · separation", "609,759 ft · 22,746.8 ft/s"],
  ["00:11:39.3", "S-IVB cutoff (orbit)", "617,957 ft · 25,562.4 ft/s"],
  ["00:11:49.3", "Earth parking orbit", "185.9 × 183.2 km"],
  ["02:44:16.2", "S-IVB restart · TLI", "650,558 ft · 25,554.0 ft/s"],
  ["02:50:03.0", "TLI cutoff", "1,058,809 ft · 35,562.9 ft/s"],
  ["03:17", "CSM separation · SLA panels jettisoned", ""],
  ["03:29", "Docking with Eagle", ""],
  ["04:17:13", "Eagle extracted from S-IVB", ""],
  ["75:49:49.6", "Lunar orbit insertion 1", "≈2,924 ft/s retrograde"],
  ["80:11:36", "Lunar orbit insertion 2", "≈157.8 ft/s"],
  ["100:13:38", "Eagle undocks", ""],
  ["101:36:14", "Descent orbit insertion", "≈74.2 ft/s"],
  ["102:33:04", "Powered descent initiation", "DPS full thrust"],
  ["102:45:43", "Touchdown, Tranquility Base", "98 kg usable propellant left"],
  ["124:22:00", "Lunar liftoff", "APS 7 min 14 s · ≈6,055 ft/s"],
  ["128:03", "Docking with Columbia", ""],
  ["130:09:55", "Eagle ascent stage jettisoned", ""],
  ["135:23:42", "Trans-Earth injection", "≈3,293 ft/s"],
  ["194:49:19", "CM / SM separation", ""],
  ["195:03:06", "Entry interface", "400,000 ft · 36,194 ft/s"],
  ["195:18:35", "Splashdown", "13°19′N 169°9′W · USS Hornet"],
];
const getSec = (s) => s.split(":").reduce((a, v) => a * 60 + parseFloat(v), 0);

const MISSION = {
  crew: [["Neil A. Armstrong", "Commander"], ["Michael Collins", "Command Module Pilot"], ["Edwin E. “Buzz” Aldrin Jr.", "Lunar Module Pilot"]],
  launch: "16 Jul 1969 · 13:32:00 UTC · LC-39A",
  landing: "20 Jul 1969 · 20:17:40 UTC",
  site: "0°40′27″N 23°28′23″E",
  liftoffMoon: "21 Jul 1969 · 17:54:00 UTC",
  splash: "24 Jul 1969 · 16:50:35 UTC",
  duration: "8 d 3 h 18 min 35 s",
  orbits: 30, eva: "2 h 31 min 40 s", samples: "21.55 kg · 47.5 lb",
  parking: "185.9 × 183.2 km", lunarOrbit: "100.9 × 122.4 km",
};

// --- Landing simulator initial state (P66-style final approach) ---------------
// Mass is an estimate built only from sourced numbers: LM-5 launch mass
// (15,102 kg) minus usable descent propellant (≈8,200 kg) plus the 98 kg left
// at touchdown, then the 450 kg of propellant this short approach starts with.
const LANDER = { h0: 152.4, v0: -1.5, fuel0: 450, dryAtTouch: 15102 - 8200, fuelAtTouchReal: 98 };

const SOURCES = [
  ["NASA — Project Apollo technical diagrams", "https://www.nasa.gov/gallery/project-apollo-technical-diagrams/"],
  ["NASA ALSJ — CSM Launch Escape Subsystem (pp. 137–146)", "https://www.nasa.gov/wp-content/uploads/static/history/alsj/CSM15_Launch_Escape_Subsystem_pp137-146.pdf"],
  ["Apollo 11 LM-5 structures handout (Scribd)", "https://www.scribd.com/document/17511122/NASA-Apollo-11-Lunar-Module-Structures-Handout"],
  ["This Day in Aviation — AS-506 / Apollo 11 launch", "https://thisdayinaviation.com/tag/as-506"],
  ["Apollo 11 flight event table (Apollo Maniacs)", "https://apollomaniacs.com/apollo/flight11_table_e.htm"],
  ["Rocketdyne F-1", "https://en.wikipedia.org/wiki/Rocketdyne_F-1"],
  ["Rocketdyne J-2", "https://en.wikipedia.org/wiki/Rocketdyne_J-2"],
  ["Apollo command and service module", "https://en.wikipedia.org/wiki/Apollo_command_and_service_module"],
  ["Apollo Lunar Module", "https://en.wikipedia.org/wiki/Apollo_Lunar_Module"],
  ["Lunar Module Eagle", "https://en.wikipedia.org/wiki/Lunar_Module_Eagle"],
  ["Apollo 11", "https://en.wikipedia.org/wiki/Apollo_11"],
  ["Surface sensing probe (Space1)", "https://space1.com/Artifacts/Lunar_Module_Artifacts/Surface_Sensing_Probe/surface_sensing_probe.html"],
  ["Why was the Saturn V black and white? (Popular Science)", "https://www.popsci.com/why-was-saturn-v-black-and-white/"],
  ["Saturn V AS-506 launch vehicle flight evaluation (ibiblio)", "https://ibiblio.org/apollo/Documents/lvfea-AS506-Apollo11.pdf"],
];

// Number formatting
const fmt = (n, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtGET = (s) => {
  const neg = s < 0; s = Math.abs(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (neg ? "T−" : "T+") + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + x.toFixed(1).padStart(4, "0");
};

// Parts index: menu sections → items. mods = modules framed and lit; group = engine the throttle drives.
const MENU = [
  ["Overview", [["whole", "Whole vehicle", { mods: [] }]]],
  ["Stages", [
    ["sic", "S-IC first stage", { mods: ["sic"], group: "F1" }],
    ["sii", "S-II second stage", { mods: ["sii"], group: "J2II" }],
    ["sivb", "S-IVB third stage", { mods: ["sivb"], group: "J2IVB" }],
    ["iu", "Instrument Unit", { mods: ["iu"], apart: true }],
    ["inter", "Interstages", { mods: ["siiInter", "sivbInter"], apart: true, info: ["siiInter", "sivbInter"] }],
  ]],
  ["Engines", [
    ["f1", "F-1 × 5 · S-IC", { mods: ["sicEngines"], group: "F1" }],
    ["j2ii", "J-2 × 5 · S-II", { mods: ["siiEngines"], group: "J2II", apart: true }],
    ["j2ivb", "J-2 · S-IVB", { mods: ["sivbEngine"], group: "J2IVB", apart: true }],
    ["sps", "SPS · Service Module", { mods: ["sm"], group: "SPS", apart: true, info: ["sm"], belowFiring: 5 }],
    ["dps", "Descent engine · LM", { mods: ["lmDescent"], group: "DPS", apart: true, info: ["lmDescent"] }],
    ["aps", "Ascent engine · LM", { mods: ["lmAscent"], group: "APS", apart: true, info: ["lmAscent"] }],
  ]],
  ["Spacecraft", [
    ["les", "Launch escape tower", { mods: ["les"] }],
    ["bpc", "Boost protective cover", { mods: ["bpc"], apart: true }],
    ["cm", "Command Module Columbia", { mods: ["cm"], apart: true }],
    ["sm", "Service Module", { mods: ["sm"], group: "SPS", apart: true, belowFiring: 5 }],
    ["sla", "Spacecraft–LM adapter", { mods: ["sla"], apart: true }],
    ["lm", "Lunar Module Eagle", { mods: ["lm", "lmDescent", "lmAscent"], group: "DPS", apart: true }],
    ["lmAscent", "Eagle ascent stage", { mods: ["lmAscent"], group: "APS", apart: true }],
    ["lmDescent", "Eagle descent stage", { mods: ["lmDescent"], group: "DPS", apart: true }],
  ]],
  ["Ground", [
    ["launcher", "Mobile launcher", { mods: ["launcher"] }],
    ["tower", "Umbilical tower", { mods: ["tower"] }],
  ]],
];
const MENU_ITEMS = Object.fromEntries(MENU.flatMap(([, items]) => items.map(([id, label, o]) => [id, { id, label, ...o }])));
const MOD_TO_ITEM = { sicEngines: "f1", siiEngines: "j2ii", sivbEngine: "j2ivb", siiInter: "inter", sivbInter: "inter" };

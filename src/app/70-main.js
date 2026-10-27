// ============================================================================
// 70 · MAIN — build, pick, loop
// ============================================================================
let camera;
const _sc = new THREE.Vector3();
const STACK_SPHERE = new THREE.Sphere(new THREE.Vector3(0, 50, 0), 150);   // pad, tower, stack, plumes and the taken-apart layout
const _dynS = new THREE.Sphere();
const PICK = [];
const ENGINE_OF = new Map(); // engine root group → { set, i }
const HI = {};               // module key → current highlight

function boot() {
  readPalette();
  const canvas = $("#cv");
  try { const fp = localStorage.getItem("apollo-free"); CAM.free = fp === null ? matchMedia("(pointer: fine)").matches : fp === "1"; } catch (e) { CAM.free = matchMedia("(pointer: fine)").matches; }
  try { PIPE.init(canvas); let aa = "1"; try { aa = localStorage.getItem("apollo-aa") ?? "1"; } catch (e) {} if (aa === "0") PIPE.setAA(false); }
  catch (e) { $("#fig").insertAdjacentHTML("beforeend", `<div class="nogl">This drawing needs WebGL, which this browser has turned off. The specification sheets below still hold every figure.</div>`); buildUIStatic(); return; }
  buildTextures(); buildSpaceTextures();
  buildLauncher(); buildArms();
  buildSIC(); buildSII(); buildSIVB(); buildIU(); buildSLA(); buildLM(); buildCSM();
  buildShowroom();
  journeyShell();
  buildExtraFX(); registerEngineFX();
  for (const k in MODS) for (const m of MODS[k].meshes) PICK.push(m);
  for (const [name, set] of Object.entries(ENGINE_SETS)) set.forEach((e, i) => ENGINE_OF.set(e.group, { set: name, i }));
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  buildUI();

  const fig = $("#fig");
  const resize = () => {
    const r = fig.getBoundingClientRect();
    PIPE.resize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height)), Math.min(window.devicePixelRatio || 1, 3));
    UI.sync?.();
  };
  new ResizeObserver(resize).observe(fig); resize();
  matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener?.("change", resize);

  // theme
  const retheme = () => { readPalette(); ALL_MATS.forEach(applyRole); FX_LIST.forEach(applyFXColors); };
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", retheme);
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });

  // picking
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let pending = null;
  const pick = (ev) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(PICK.filter((m) => isShown(m)), false);
    return hits[0]?.object || null;
  };
  const engineOf = (o) => { while (o) { if (ENGINE_OF.has(o)) return ENGINE_OF.get(o); o = o.parent; } return null; };
  canvas.addEventListener("pointermove", (ev) => { pending = ev; });
  const ptrs = new Map(); let dragged = 0, lastPinch = null;
  const ndcOf = (ev) => { const r = canvas.getBoundingClientRect(); return new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); };
  // Drags are tracked on the window, so they survive leaving the canvas and never depend on pointer capture.
  const onMove = (ev) => {
    const p = ptrs.get(ev.pointerId); if (!p) return;
    const dx = ev.clientX - p.x, dy = ev.clientY - p.y; p.x = ev.clientX; p.y = ev.clientY;
    dragged += Math.abs(dx) + Math.abs(dy);
    if (dragged < 3) return;
    ev.preventDefault();
    if (ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (lastPinch) { panBy(mx - lastPinch.x, my - lastPinch.y); if (d > 0 && lastPinch.d > 0) zoomBy(lastPinch.d / d, ndcOf({ clientX: mx, clientY: my })); }
      lastPinch = { d, x: mx, y: my }; return;
    }
    const pan = CAM.dragMode === "pan" ? !(p.shift || ev.shiftKey) : (p.b === 1 || p.b === 2 || p.shift || ev.shiftKey);
    if (pan) panBy(dx, dy); else orbitBy(dx, dy);
    canvas.classList.add("dragging");
  };
  const onUp = (ev) => {
    ptrs.delete(ev.pointerId); if (ptrs.size < 2) lastPinch = null;
    if (!ptrs.size) { canvas.classList.remove("dragging"); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp); }
  };
  canvas.addEventListener("pointerdown", (ev) => {
    if (!CAM.free) { if (ev.pointerType !== "touch") fig.focus({ preventScroll: true }); dragged = 0; return; }
    ev.preventDefault();                                   // no text selection, no native drag-and-drop
    fig.focus({ preventScroll: true });
    if (!ptrs.size) { window.addEventListener("pointermove", onMove, { passive: false }); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp); }
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, b: ev.button, shift: ev.shiftKey });
    dragged = 0;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; lastPinch = { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  });
  canvas.addEventListener("dragstart", (ev) => ev.preventDefault());
  canvas.addEventListener("contextmenu", (ev) => { if (CAM.free) ev.preventDefault(); });
  canvas.addEventListener("wheel", (ev) => {
    if (!CAM.free && !ev.ctrlKey) return;                 // page scrolls normally until free cam is on (pinch-zoom on trackpads always works)
    ev.preventDefault();
    const k = ev.deltaMode === 1 ? 40 : ev.deltaMode === 2 ? 800 : 1;
    zoomBy(Math.exp(ev.deltaY * k * (ev.ctrlKey ? 0.01 : 0.0015)), ndcOf(ev));
  }, { passive: false });
  canvas.addEventListener("dblclick", () => { if (CAM.free) resetView(); });
  canvas.addEventListener("pointerleave", () => { pending = null; C.hover = null; setHotSpec(null); canvas.classList.remove("can-click"); });
  canvas.addEventListener("click", (ev) => {
    if (dragged > 4) return;                               // that was a drag, not a pick
    const o = pick(ev); if (!o) return;
    const k = o.userData.mod;
    if (SHOW[curShow()]?.lineup) { const e = k.split(".")[0]; if (SHOW[e]) selectItem(e); return; }   // in the row, a click opens that engine
    const id = MOD_TO_ITEM[k] || (MENU_ITEMS[k] ? k : null);
    if (id) selectItem(id);
  });
  const doHover = () => {
    if (!pending) return;
    const o = pick(pending); pending = null;
    const key = o ? o.userData.mod : null;
    canvas.classList.toggle("can-click", !!o);
    if (key !== C.hover) { C.hover = key; setHotSpec(key); UI.tick(true); }
  };

  // loop — runs only while the figure is on screen
  let visible = true, last = performance.now(), lastSig = "";
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) { last = performance.now(); requestAnimationFrame(frame); } }, { threshold: 0.01 }).observe(fig);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { last = performance.now(); requestAnimationFrame(frame); } });
  function frame(now) {
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    doHover();
    applyFrame(dt);
    const jBusy = journeyFrame(dt);
    // hover highlight
    for (const k in MODS) {
      const tgt = C.hover === k ? 1 : (MENU_ITEMS[C.sel]?.mods.includes(k) && !MENU_ITEMS[C.sel].root ? 0.3 : 0);
      HI[k] = (HI[k] || 0) + (tgt - (HI[k] || 0)) * Math.min(1, dt * 10);
      if (HI[k] < 0.002 && tgt === 0) { if (HI[k] !== 0) { HI[k] = 0; MODS[k].mats.forEach((m) => (m.uniforms.uHi.value = 0)); } continue; }
      MODS[k].mats.forEach((m) => (m.uniforms.uHi.value = HI[k]));
    }
    // skip drawing when nothing on screen can have changed
    const fxOn = jBusy || CAM.keys.size > 0 || FX_LIST.some((f) => f.userData.level > 0.0005 || f.userData.target > 0);
    const sig = `${CAM.target.x.toFixed(3)},${CAM.target.y.toFixed(3)},${CAM.target.z.toFixed(3)},${CAM.h.toFixed(3)},${C.exAmt.toFixed(4)},${C.sxAmt.toFixed(4)},${C.csmLift.toFixed(4)},${CAM.az.toFixed(4)},${CAM.el.toFixed(4)},${C.hover},${C.sel},${PIPE.w}x${PIPE.h},${Object.values(HI).map((v) => v.toFixed(3)).join("")},${PAL.bg.getHexString()}`;
    if (!fxOn && sig === lastSig) { UI.tick(); requestAnimationFrame(frame); return; }
    lastSig = sig;
    // camera
    const aspect = PIPE.w / PIPE.h, h = CAM.h / 2;
    camera.top = h; camera.bottom = -h; camera.left = -h * aspect; camera.right = h * aspect;
    camBasis();
    // Depth range hugs whatever is on show, so depth stays precise on phone GPUs (which read it at
    // half precision); a wide range made the outline pass draw contour bands across smooth surfaces.
    const show = SHOW[curShow()];
    // the journey map spans 400,000 km: there the depth range follows the zoom instead of the whole map
    const sph = show?.dynSphere ? _dynS.set(CAM.target, CAM.h * Math.max(aspect, 1) * 0.8 + 8) : show?.sphere || STACK_SPHERE;
    const toC = _sc.copy(sph.center).sub(CAM.target).dot(CAM_DIR), K = toC + sph.radius + 5;
    camera.position.copy(CAM.target).addScaledVector(CAM_DIR, K);
    camera.near = 1; camera.far = 2 * sph.radius + 10;
    camera.up.set(0, 1, 0);
    camera.lookAt(_sc.copy(camera.position).sub(CAM_DIR));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    PIPE.render(SCENE, camera);
    journeyOverlay(camera);
    UI.tick();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  performance.mark("apollo-built");
  // warm-up off the critical path: compile every shader (exhaust included) so the first Ignite doesn't stall,
  // and on desktops build the journey map in idle time so its first visit is instant
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
  const warm = (o) => { const R = PIPE.renderer; R.extensions.has("KHR_parallel_shader_compile") ? R.compileAsync(o, camera) : R.compile(o, camera); };
  idle(() => { try { warm(SCENE); } catch (e) {} }, { timeout: 3000 });
  if (!COARSE) idle(() => { try { buildJourney(); warm(J.root); } catch (e) { console.warn(e); } }, { timeout: 6000 });
  window.APOLLO = { SHOW, MENU_ITEMS, project: (key) => { const c = boxOf([key]).getCenter(V3()).project(camera), r = canvas.getBoundingClientRect(); return { x: Math.round(r.left + (c.x + 1) / 2 * r.width), y: Math.round(r.top + (1 - c.y) / 2 * r.height) }; }, zoomBy, orbitBy, panBy, resetView, setAA: (on) => { PIPE.setAA(on); UI.sync(); }, C, CAM, J, ignite, shutdown, fireOne, selectGroup, selectItem, setExplode, groupState, MODS, THREE, SCENE, PICK, isShown, get camera() { return camera; }, warp: (sec) => { for (let t = 0; t < sec; t += 1 / 30) { applyFrame(1 / 30); journeyFrame(1 / 30); } UI.sync(); } };
}
function buildUIStatic() { try { buildSheets(); } catch (e) {} }
boot();

// Regenerates src/05-land.js (coastlines for the Earth texture in The Journey) from
// Natural Earth 1:110m land via the world-atlas package. Run: npm run land
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";
const topo = JSON.parse(readFileSync("node_modules/world-atlas/land-110m.json", "utf8"));
const land = feature(topo, topo.objects.land);
const rings = [];
let pts = 0;
for (const f of land.features) {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) {
    const ring = poly[0];
    // area in deg² (shoelace) to drop specks
    let a = 0; for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    if (Math.abs(a / 2) < 2) continue;
    const flat = [];
    let px = null, py = null;
    for (const [x, y] of ring) { const X = Math.round(x * 5), Y = Math.round(y * 5); if (X === px && Y === py) continue; flat.push(X, Y); px = X; py = Y; }
    rings.push(flat); pts += flat.length / 2;
  }
}
const out = `// Coastlines: Natural Earth 1:110m land (public domain), via world-atlas. Rings of [lon·5, lat·5] pairs.\nconst LAND = ${JSON.stringify(rings)};\n`;
writeFileSync(process.argv[2] || "src/05-land.js", out);
console.log(rings.length, "rings", pts, "points", (out.length / 1024).toFixed(1), "KB");

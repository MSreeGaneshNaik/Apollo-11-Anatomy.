// Assembles src/* into one standalone page (apollo.html).
// JS parts are concatenated in order into a single module script.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const src = (f) => readFileSync(join("src", f), "utf8");
const jsFiles = readdirSync("src").filter((f) => /^\d\d-.*\.js$/.test(f)).sort();
const js = jsFiles.map((f) => `// ---- ${f} ----\n` + src(f)).join("\n");

const THREE_VER = "0.160.0";
const importmap = {
  imports: {
    three: `https://cdn.jsdelivr.net/npm/three@${THREE_VER}/build/three.module.min.js`,
    "three/addons/": `https://cdn.jsdelivr.net/npm/three@${THREE_VER}/examples/jsm/`,
  },
};

const page = `<title>Apollo 11 Anatomy</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Interactive 3D technical drawing of Apollo 11: Saturn V AS-506, CSM-107 Columbia and LM-5 Eagle.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
${src("style.css")}
</style>
${src("body.html")}
<script type="module">
${js}
</script>
`;
writeFileSync("apollo.html", page);
console.log("wrote apollo.html", (page.length / 1024).toFixed(1) + " KB", jsFiles.join(", "));

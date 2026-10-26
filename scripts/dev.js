// Servidor de desenvolvimento: imita a Vercel (arquivos estáticos + /api) e guarda
// configuração e mídias numa pasta local em vez do R2.
// Uso: ADMIN_PASSWORD=teste STORAGE_LOCAL=.local node scripts/dev.js
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.STORAGE_LOCAL = path.resolve(raiz, process.env.STORAGE_LOCAL || ".local");
const porta = Number(process.env.PORT || 3000);
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".mp4": "video/mp4", ".mov": "video/quicktime", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg" };

const lerCorpo = (req) => new Promise((ok) => { const p = []; req.on("data", (c) => p.push(c)); req.on("end", () => ok(Buffer.concat(p))); });

function servirArquivo(res, arq) {
  fs.stat(arq, (erro, st) => {
    if (erro || !st.isFile()) { res.statusCode = 404; return res.end("não encontrado"); }
    res.setHeader("Content-Type", TIPOS[path.extname(arq).toLowerCase()] || "application/octet-stream");
    fs.createReadStream(arq).pipe(res);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/__local/upload/") && req.method === "PUT") {
      const arq = path.join(process.env.STORAGE_LOCAL, decodeURIComponent(url.pathname.slice("/__local/upload/".length)));
      fs.mkdirSync(path.dirname(arq), { recursive: true });
      fs.writeFileSync(arq, await lerCorpo(req));
      return res.end();
    }
    if (url.pathname.startsWith("/__local/media/")) {
      return servirArquivo(res, path.join(process.env.STORAGE_LOCAL, decodeURIComponent(url.pathname.slice("/__local/media/".length))));
    }
    if (url.pathname.startsWith("/api/")) {
      const nome = url.pathname.slice(5).replace(/[^a-z-]/g, "");
      const { default: handler } = await import(pathToFileURL(path.join(raiz, "api", `${nome}.js`)).href);
      const bruto = (await lerCorpo(req)).toString("utf8");
      req.query = Object.fromEntries(url.searchParams);
      req.body = (req.headers["content-type"] || "").includes("json") && bruto ? JSON.parse(bruto) : bruto;
      return await handler(req, res);
    }
    let arq = path.join(raiz, decodeURIComponent(url.pathname));
    if (!arq.startsWith(raiz)) { res.statusCode = 403; return res.end(); }
    if (fs.existsSync(arq) && fs.statSync(arq).isDirectory()) arq = path.join(arq, "index.html");
    servirArquivo(res, arq);
  } catch (e) {
    console.error(e);
    res.statusCode = 500; res.end(String(e.message));
  }
}).listen(porta, () => console.log(`http://localhost:${porta}  (painel em /admin)`));

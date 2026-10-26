// Utilitários compartilhados pelas funções da Vercel (arquivos com "_" não viram rota).
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";

const env = process.env;
const CHAVE_CONFIG = "config/funil.json";

// ---------- respostas ----------
export function json(res, status, dados, cache = "no-store") {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache);
  res.end(JSON.stringify(dados));
}

export function corpo(req) {
  const b = req.body;
  if (b == null || b === "") return {};
  if (typeof b === "string") { try { return JSON.parse(b); } catch { return {}; } }
  if (Buffer.isBuffer(b)) { try { return JSON.parse(b.toString("utf8")); } catch { return {}; } }
  return b;
}

// ---------- autenticação ----------
const hash = (s) => crypto.createHash("sha256").update(String(s)).digest();
const segredo = () => hash("funil:" + (env.SESSION_SECRET || env.ADMIN_PASSWORD || ""));
const assinar = (p) => crypto.createHmac("sha256", segredo()).update(p).digest("hex");

export function senhaConfere(senha) {
  if (!env.ADMIN_PASSWORD) return false;
  return crypto.timingSafeEqual(hash(senha || ""), hash(env.ADMIN_PASSWORD));
}

export function criarToken() {
  const expira = String(Date.now() + 30 * 24 * 3600 * 1000); // 30 dias
  return `${expira}.${assinar(expira)}`;
}

export function autenticado(req) {
  if (!env.ADMIN_PASSWORD) return false;
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const [expira, assinatura] = token.split(".");
  if (!expira || !assinatura || assinatura.length !== 64) return false;
  const ok = crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(assinar(expira)));
  return ok && Number(expira) > Date.now();
}

// ---------- armazenamento (Cloudflare R2, ou pasta local em desenvolvimento) ----------
const pastaLocal = env.STORAGE_LOCAL;

function r2() {
  const faltando = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"].filter((k) => !env[k]);
  if (faltando.length) {
    const e = new Error(`Configuração incompleta na Vercel. Faltam as variáveis: ${faltando.join(", ")}`);
    e.status = 503;
    throw e;
  }
  return {
    cliente: new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" }),
    base: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}`,
    publico: env.R2_PUBLIC_URL.replace(/\/+$/, ""),
  };
}

export async function lerConfig() {
  if (pastaLocal) {
    try { return JSON.parse(await fs.readFile(path.join(pastaLocal, CHAVE_CONFIG), "utf8")); }
    catch { return null; }
  }
  const { cliente, base } = r2();
  const r = await cliente.fetch(`${base}/${CHAVE_CONFIG}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`R2 respondeu ${r.status} ao ler a configuração`);
  return r.json();
}

export async function salvarConfig(config) {
  const texto = JSON.stringify(config, null, 2);
  if (pastaLocal) {
    const arq = path.join(pastaLocal, CHAVE_CONFIG);
    await fs.mkdir(path.dirname(arq), { recursive: true });
    return fs.writeFile(arq, texto);
  }
  const { cliente, base } = r2();
  const r = await cliente.fetch(`${base}/${CHAVE_CONFIG}`, {
    method: "PUT", body: texto, headers: { "Content-Type": "application/json" },
  });
  if (!r.ok) throw new Error(`R2 respondeu ${r.status} ao salvar a configuração`);
}

// URL assinada para o navegador enviar o arquivo direto ao R2 (sem limite de tamanho da Vercel)
export async function urlDeEnvio(chave) {
  if (pastaLocal) return { url: `/__local/upload/${chave}`, publico: `/__local/media/${chave}` };
  const { cliente, base, publico } = r2();
  const assinado = await cliente.sign(`${base}/${chave}?X-Amz-Expires=3600`, { method: "PUT", aws: { signQuery: true } });
  return { url: assinado.url, publico: `${publico}/${chave}` };
}

// ---------- métricas (Upstash Redis via REST; opcional) ----------
const memoria = new Map(); // usado só em desenvolvimento local

export function metricasConfiguradas() {
  return Boolean(pastaLocal || env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL);
}

export async function redis(comandos) {
  if (pastaLocal) {
    return comandos.map(([cmd, chave, campo, n]) => {
      const h = memoria.get(chave) || {};
      if (cmd === "HINCRBY") { h[campo] = (Number(h[campo]) || 0) + Number(n); memoria.set(chave, h); return { result: h[campo] }; }
      if (cmd === "HGETALL") return { result: Object.entries(h).flat().map(String) };
      return { result: 1 };
    });
  }
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url) return null;
  const r = await fetch(`${url.replace(/\/+$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(comandos),
  });
  if (!r.ok) throw new Error(`Redis respondeu ${r.status}`);
  return r.json();
}

// Dia no fuso de Brasília (UTC-3), formato AAAA-MM-DD
export function diaBrasil(deslocamentoDias = 0) {
  const d = new Date(Date.now() - 3 * 3600 * 1000 - deslocamentoDias * 864e5);
  return d.toISOString().slice(0, 10);
}

import { json, corpo, redis, diaBrasil, metricasConfiguradas } from "./_lib.js";

const EVENTOS = new Set(["acesso", "etapa", "clique", "cta", "copiar_numero", "video_play", "video_fim", "audio_play"]);
const limpar = (s) => String(s || "").replace(/[\r\n|]/g, " ").slice(0, 80);

// Recebe eventos do site (sendBeacon). Guarda só contadores por dia, nada do visitante.
export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { erro: "Método não permitido" });
  const e = corpo(req);
  if (!EVENTOS.has(e.evento) || !metricasConfiguradas()) return json(res, 204, {});

  const campos = [];
  if (e.evento === "acesso") campos.push("acesso", `origem|${limpar(e.origem)}`);
  else if (e.evento === "etapa") campos.push(`etapa|${limpar(e.etapa)}`);
  else if (e.evento === "clique") campos.push(`clique|${limpar(e.etapa)}|${limpar(e.opcao)}`);
  else if (e.evento.startsWith("video") || e.evento === "audio_play") campos.push(`${e.evento}|${limpar(e.etapa)}`);
  else campos.push(e.evento);

  const chave = `funil:${diaBrasil()}`;
  try {
    await redis([...campos.map((c) => ["HINCRBY", chave, c, 1]), ["EXPIRE", chave, 60 * 60 * 24 * 180]]);
  } catch {}
  json(res, 204, {});
}

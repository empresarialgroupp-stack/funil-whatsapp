import { json, autenticado, redis, diaBrasil, metricasConfiguradas } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { erro: "Método não permitido" });
  if (!autenticado(req)) return json(res, 401, { erro: "Faça login novamente" });
  if (!metricasConfiguradas()) return json(res, 200, { configurado: false });

  const dias = Math.min(Math.max(Number((req.query && req.query.dias) || 7), 1), 90);
  const chaves = Array.from({ length: dias }, (_, i) => `funil:${diaBrasil(i)}`);
  try {
    const respostas = await redis(chaves.map((k) => ["HGETALL", k]));
    const total = {};
    for (const { result } of respostas || []) {
      for (let i = 0; i < (result || []).length; i += 2) {
        total[result[i]] = (total[result[i]] || 0) + Number(result[i + 1]);
      }
    }
    json(res, 200, { configurado: true, dias, total });
  } catch (e) {
    json(res, 500, { erro: e.message });
  }
}

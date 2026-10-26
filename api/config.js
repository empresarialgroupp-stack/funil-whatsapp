import { json, corpo, autenticado, lerConfig, salvarConfig } from "./_lib.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const config = await lerConfig();
      if (!config) return json(res, 404, { erro: "Nenhuma configuração salva ainda" });
      // Painel pede sem cache; o site aceita alguns segundos de cache na CDN
      const cache = req.query && req.query.fresco ? "no-store" : "public, s-maxage=5, stale-while-revalidate=30";
      return json(res, 200, config, cache);
    }

    if (req.method === "PUT") {
      if (!autenticado(req)) return json(res, 401, { erro: "Faça login novamente" });
      const config = corpo(req);
      const erro = validar(config);
      if (erro) return json(res, 400, { erro });
      await salvarConfig(config);
      return json(res, 200, { ok: true });
    }

    json(res, 405, { erro: "Método não permitido" });
  } catch (e) {
    json(res, e.status || 500, { erro: e.message });
  }
}

function validar(c) {
  if (!c || typeof c !== "object" || !c.perfil || !c.contato || !c.etapas) return "Configuração inválida";
  if (JSON.stringify(c).length > 500_000) return "Configuração grande demais";
  const ids = Object.keys(c.etapas);
  if (!ids.length) return "O funil precisa de pelo menos uma etapa";
  for (const id of ids) {
    const e = c.etapas[id];
    if (!Array.isArray(e.mensagens)) return `Etapa "${id}" sem mensagens`;
    if (!e.final && !(Array.isArray(e.opcoes) && e.opcoes.length)) return `Etapa "${id}" precisa de pelo menos uma opção`;
    for (const op of e.opcoes || []) {
      if (!ids.includes(op.proxima)) return `A opção "${op.texto}" aponta para uma etapa que não existe`;
    }
  }
  return null;
}

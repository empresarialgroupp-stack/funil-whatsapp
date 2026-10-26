import { json, corpo, autenticado, urlDeEnvio } from "./_lib.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { erro: "Método não permitido" });
    if (!autenticado(req)) return json(res, 401, { erro: "Faça login novamente" });
    const { nome, tipo } = corpo(req);
    if (!/^(image|video|audio)\//.test(tipo || "")) return json(res, 400, { erro: "Envie apenas imagem, vídeo ou áudio" });
    const limpo = String(nome || "arquivo")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-80);
    const chave = `midia/${Date.now()}-${limpo}`;
    json(res, 200, await urlDeEnvio(chave));
  } catch (e) {
    json(res, e.status || 500, { erro: e.message });
  }
}

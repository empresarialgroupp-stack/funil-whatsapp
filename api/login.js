import { json, corpo, senhaConfere, criarToken } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { erro: "Método não permitido" });
  if (!process.env.ADMIN_PASSWORD) return json(res, 503, { erro: "Defina ADMIN_PASSWORD nas variáveis da Vercel." });
  const { senha } = corpo(req);
  if (!senhaConfere(senha)) {
    await new Promise((r) => setTimeout(r, 800)); // freia tentativas em série
    return json(res, 401, { erro: "Senha incorreta" });
  }
  json(res, 200, { token: criarToken() });
}

(() => {
  const $ = (s) => document.querySelector(s);
  const CHAVE_TOKEN = "funil-admin-token";

  let config = null;   // roteiro sendo editado
  let sujo = false;    // há alterações não publicadas
  let enviando = 0;    // uploads em andamento

  const ROTULOS = {
    boas_vindas: "Abertura", estrutura: "Estrutura", fornecedor: "Fornecedor", produtos: "Produtos",
    preco: "Preço", venda: "Quando vender", ajuda: "Como eu ajudo", provas: "Provas", fim: "Final",
  };
  const TIPOS = { texto: "Texto", imagem: "Imagem", video: "Vídeo", audio: "Áudio" };
  const ACEITA = { imagem: "image/*", video: "video/*", audio: "audio/*" };

  // ---------- utilidades ----------
  function h(tag, attrs = {}, ...filhos) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (k === "class") n.className = v;
      else if (k in n && k !== "list") n[k] = v;
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const f of filhos.flat()) if (f != null && f !== false) n.append(f.nodeType ? f : document.createTextNode(f));
    return n;
  }
  const rotulo = (id) => ROTULOS[id] || id.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
  const srcMidia = (v) => (!v ? "" : /^(https?:)?\/\//.test(v) || v.startsWith("/") ? v : "/" + v);
  const tipoDe = (m) => (m.video != null ? "video" : m.audio != null ? "audio" : m.imagem != null ? "imagem" : "texto");
  const nomeArquivo = (v) => decodeURIComponent(String(v || "").split("/").pop()).replace(/^\d{10,}-/, "");

  let timerAviso;
  function aviso(texto, ruim = false) {
    const a = $("#aviso");
    a.textContent = texto; a.className = "aviso" + (ruim ? " ruim" : ""); a.hidden = false;
    clearTimeout(timerAviso); timerAviso = setTimeout(() => (a.hidden = true), ruim ? 6000 : 2500);
  }

  function marcarSujo() {
    sujo = true;
    atualizarBarra();
  }
  function atualizarBarra() {
    $("#barra-publicar").classList.toggle("sujo", sujo);
    $("#estado").textContent = enviando ? "Enviando arquivo..." : sujo ? "Alterações não publicadas" : "Tudo publicado";
    $("#publicar").disabled = !sujo || enviando > 0;
  }
  window.addEventListener("beforeunload", (e) => { if (sujo || enviando) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- API ----------
  async function api(caminho, { method = "GET", body } = {}) {
    const r = await fetch(caminho, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem(CHAVE_TOKEN) || ""}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const dados = r.status === 204 ? {} : await r.json().catch(() => ({}));
    if (r.status === 401 && caminho !== "/api/login") { sair(); throw new Error("Sessão expirada, entre de novo"); }
    if (!r.ok) { const e = new Error(dados.erro || `Erro ${r.status}`); e.status = r.status; throw e; }
    return dados;
  }

  // Envia o arquivo direto do navegador para o R2, sem passar pela Vercel
  async function enviarArquivo(arquivo, aoProgredir) {
    const { url, publico } = await api("/api/upload-url", { method: "POST", body: { nome: arquivo.name, tipo: arquivo.type } });
    await new Promise((ok, falha) => {
      const x = new XMLHttpRequest();
      x.open("PUT", url);
      x.setRequestHeader("Content-Type", arquivo.type);
      x.upload.onprogress = (e) => e.lengthComputable && aoProgredir(e.loaded / e.total);
      x.onload = () => (x.status < 300 ? ok() : falha(new Error(`O armazenamento recusou o arquivo (${x.status})`)));
      x.onerror = () => falha(new Error("Falha de rede no envio. Confira a regra de CORS do bucket no Cloudflare."));
      x.send(arquivo);
    });
    return publico;
  }

  // ---------- componentes ----------
  function campoTexto(titulo, obj, chave, { multilinha = false, tipo = "text", dica } = {}) {
    const entrada = multilinha
      ? h("textarea", { value: obj[chave] || "", oninput: (e) => { obj[chave] = e.target.value; marcarSujo(); } })
      : h("input", { type: tipo, value: obj[chave] || "", placeholder: dica || "", oninput: (e) => { obj[chave] = e.target.value; marcarSujo(); } });
    return h("label", { class: "campo" }, h("span", {}, titulo), entrada);
  }

  function campoMidia(tipo, valor, aoMudar) {
    const previa = h("div", { class: "previa" + (tipo === "audio" ? " audio" : "") });
    const nome = h("div", { class: "arquivo" });
    const barra = h("div", { class: "progresso", hidden: true }, h("div"));
    const entrada = h("input", { type: "file", accept: ACEITA[tipo], hidden: true });
    const botao = h("button", { class: "btn pequeno", type: "button", onclick: () => entrada.click() });

    function mostrar(v) {
      previa.innerHTML = "";
      const src = srcMidia(v);
      if (!src) previa.append("Sem arquivo");
      else if (tipo === "imagem") previa.append(h("img", { src, alt: "" }));
      else if (tipo === "video") previa.append(h("video", { src, muted: true, playsInline: true, preload: "metadata", controls: true }));
      else previa.append(h("audio", { src, controls: true, preload: "metadata" }));
      nome.textContent = v ? nomeArquivo(v) : "Nenhum arquivo escolhido";
      botao.textContent = v ? "Trocar arquivo" : "Escolher arquivo";
    }

    entrada.addEventListener("change", async () => {
      const arquivo = entrada.files[0];
      entrada.value = "";
      if (!arquivo) return;
      botao.disabled = true; barra.hidden = false; enviando++; atualizarBarra();
      const tamanho = (arquivo.size / 1048576).toFixed(1);
      nome.textContent = `Enviando ${arquivo.name} (${tamanho} MB)...`;
      try {
        const url = await enviarArquivo(arquivo, (p) => {
          barra.firstChild.style.width = `${Math.round(p * 100)}%`;
          nome.textContent = `Enviando ${arquivo.name}: ${Math.round(p * 100)}% de ${tamanho} MB`;
        });
        aoMudar(url);
        mostrar(url);
        marcarSujo();
        aviso("Arquivo enviado. Toque em Publicar para colocar no ar.");
      } catch (e) {
        mostrar(valor);
        aviso(e.message, true);
      } finally {
        botao.disabled = false; barra.hidden = true; barra.firstChild.style.width = "0"; enviando--; atualizarBarra();
      }
    });

    mostrar(valor);
    return h("div", { class: "midia" + (tipo === "audio" ? " coluna" : "") },
      previa, h("div", { class: "midia-info" }, nome, barra, h("div", {}, botao)), entrada);
  }

  function botaoIcone(texto, titulo, acao, desativado) {
    return h("button", { class: "icone", type: "button", title: titulo, "aria-label": titulo, disabled: desativado, onclick: acao }, texto);
  }

  function mover(lista, i, d) {
    const [x] = lista.splice(i, 1);
    lista.splice(i + d, 0, x);
    marcarSujo();
    renderFunil();
  }

  function trocarTipo(lista, i, novo) {
    const antiga = lista[i];
    const legenda = antiga.legenda;
    const m = novo === "texto" ? { texto: antiga.texto || "" }
      : novo === "imagem" ? { imagem: "", legenda }
      : novo === "video" ? { video: "", legenda, obrigatorio: true }
      : { audio: "" };
    if (m.legenda == null) delete m.legenda;
    lista[i] = m;
    marcarSujo();
    renderFunil();
  }

  function editorMensagem(lista, i) {
    const m = lista[i];
    const tipo = tipoDe(m);
    const seletor = h("select", { class: "tipo", onchange: (e) => trocarTipo(lista, i, e.target.value) },
      Object.entries(TIPOS).map(([v, t]) => h("option", { value: v, selected: v === tipo }, t)));

    const corpo = [];
    if (tipo === "texto") {
      corpo.push(campoTexto("Mensagem", m, "texto", { multilinha: true }));
    } else {
      corpo.push(campoMidia(tipo, m[tipo], (url) => (m[tipo] = url)));
      if (tipo !== "audio") corpo.push(campoTexto("Legenda (opcional)", m, "legenda", { multilinha: true }));
      if (tipo !== "imagem") {
        corpo.push(h("label", { class: "check" },
          h("input", { type: "checkbox", checked: !!m.obrigatorio, onchange: (e) => { m.obrigatorio = e.target.checked; marcarSujo(); } }),
          tipo === "video" ? "Obrigatório assistir até o fim para continuar" : "Obrigatório ouvir até o fim para continuar"));
      }
    }

    return h("div", { class: "mensagem" },
      h("div", { class: "mensagem-topo" }, seletor,
        h("div", { class: "acoes" },
          botaoIcone("↑", "Subir", () => mover(lista, i, -1), i === 0),
          botaoIcone("↓", "Descer", () => mover(lista, i, 1), i === lista.length - 1),
          botaoIcone("✕", "Remover mensagem", () => {
            if (!confirm("Remover esta mensagem?")) return;
            lista.splice(i, 1); marcarSujo(); renderFunil();
          }))),
      corpo);
  }

  function editorOpcao(etapa, j, ids) {
    const op = etapa.opcoes[j];
    return h("div", { class: "opcao" },
      h("div", { class: "mensagem-topo" }, h("strong", {}, `Botão ${j + 1}`),
        h("div", { class: "acoes" },
          botaoIcone("✕", "Remover botão", () => {
            if (etapa.opcoes.length === 1) return aviso("A etapa precisa de pelo menos um botão", true);
            etapa.opcoes.splice(j, 1); marcarSujo(); renderFunil();
          }))),
      campoTexto("Texto do botão", op, "texto"),
      h("div", { class: "campo" }, h("span", {}, "Imagem do botão"), campoMidia("imagem", op.imagem, (url) => (op.imagem = url))),
      h("label", { class: "campo" }, h("span", {}, "Leva para a etapa"),
        h("select", { onchange: (e) => { op.proxima = e.target.value; marcarSujo(); } },
          ids.map((id, n) => h("option", { value: id, selected: id === op.proxima }, `${n + 1}. ${rotulo(id)}`)))));
  }

  function renderFunil() {
    const alvo = $("#aba-funil");
    const rolagem = window.scrollY;
    const abertos = new Set([...alvo.querySelectorAll("details[open]")].map((d) => d.dataset.id));
    alvo.innerHTML = "";
    const ids = Object.keys(config.etapas);

    // Perfil e contato
    const perfil = h("details", { class: "cartao", "data-id": "perfil", open: abertos.size === 0 || abertos.has("perfil") },
      h("summary", {}, "Perfil e contato"),
      h("div", { class: "corpo" },
        h("div", { class: "campo" }, h("span", {}, "Foto de perfil"), campoMidia("imagem", config.perfil.foto, (url) => (config.perfil.foto = url))),
        h("div", { class: "grade" },
          campoTexto("Nome no topo do chat", config.perfil, "nome"),
          campoTexto("WhatsApp exibido", config.contato, "exibicao", { tipo: "tel", dica: "(81) 99999-9999" })),
        campoTexto("WhatsApp só números (55 + DDD)", config.contato, "whatsapp", { tipo: "tel", dica: "5581999999999" })));
    alvo.append(perfil);

    // Etapas
    ids.forEach((id, n) => {
      const etapa = config.etapas[id];
      const corpo = h("div", { class: "corpo" });
      corpo.append(h("p", { class: "subtitulo" }, "Mensagens"));
      etapa.mensagens.forEach((_, i) => corpo.append(editorMensagem(etapa.mensagens, i)));
      corpo.append(h("button", { class: "btn pequeno", type: "button", onclick: () => {
        etapa.mensagens.push({ texto: "" }); marcarSujo(); renderFunil();
      } }, "+ Adicionar mensagem"));

      if (etapa.final) {
        corpo.append(h("p", { class: "subtitulo" }, "Botão final e contato"),
          campoTexto("Texto do botão", etapa.final, "botao"),
          campoTexto("Link do botão", etapa.final, "link", { tipo: "url", dica: "https://..." }),
          campoTexto("Texto acima do número", etapa.final, "textoContato", { multilinha: true }),
          campoTexto("Aviso abaixo do número", etapa.final, "aviso"));
      } else {
        corpo.append(h("p", { class: "subtitulo" }, "Botões de resposta"));
        etapa.opcoes.forEach((_, j) => corpo.append(editorOpcao(etapa, j, ids)));
        corpo.append(h("button", { class: "btn pequeno", type: "button", onclick: () => {
          etapa.opcoes.push({ texto: "Nova resposta", proxima: ids[Math.min(n + 1, ids.length - 1)] }); marcarSujo(); renderFunil();
        } }, "+ Adicionar botão"));
      }

      alvo.append(h("details", { class: "cartao", "data-id": id, open: abertos.has(id) },
        h("summary", {}, h("span", { class: "num" }, String(n + 1)), rotulo(id),
          etapa.final ? h("span", { class: "etiqueta-final" }, "final") : null),
        corpo));
    });

    window.scrollTo(0, rolagem);
  }

  // ---------- números ----------
  async function renderNumeros(dias = 7) {
    const alvo = $("#aba-numeros");
    alvo.innerHTML = "";
    alvo.append(h("p", { class: "dica" }, "Carregando..."));
    let dados;
    try { dados = await api(`/api/metricas?dias=${dias}`); }
    catch (e) { alvo.innerHTML = ""; alvo.append(h("p", { class: "erro" }, e.message)); return; }
    alvo.innerHTML = "";

    if (!dados.configurado) {
      alvo.append(h("div", { class: "cartao" }, h("h2", {}, "Números ainda não ligados"),
        h("div", { class: "corpo" }, h("p", { class: "dica" },
          "Para ver quantas pessoas passam por cada etapa, conecte o Upstash Redis (grátis) ao projeto: ",
          "Vercel → projeto funil-whatsapp → Storage → Create Database → Upstash (Redis). ",
          "Depois disso os números aparecem aqui sozinhos."))));
      return;
    }

    const t = dados.total;
    const acessos = t.acesso || 0;
    const pct = (v) => (acessos ? Math.round((v / acessos) * 100) : 0);
    const periodo = h("select", { onchange: (e) => renderNumeros(Number(e.target.value)) },
      [1, 7, 30].map((d) => h("option", { value: d, selected: d === dias }, d === 1 ? "Hoje" : `Últimos ${d} dias`)));

    alvo.append(h("label", { class: "campo" }, h("span", {}, "Período"), periodo));
    alvo.append(h("div", { class: "kpis" },
      h("div", { class: "kpi" }, h("b", {}, String(acessos)), h("span", {}, "acessos")),
      h("div", { class: "kpi" }, h("b", {}, String(t.cta || 0)), h("span", {}, `cliques no botão final (${pct(t.cta || 0)}%)`)),
      h("div", { class: "kpi" }, h("b", {}, String(t.copiar_numero || 0)), h("span", {}, "copiaram o número"))));

    const linhas = Object.keys(config.etapas).map((id, n) => {
      const v = t[`etapa|${id}`] || 0;
      return h("tr", {},
        h("td", {}, `${n + 1}. ${rotulo(id)}`, h("div", { class: "barra-pct" }, h("div", { style: `width:${pct(v)}%` }))),
        h("td", { class: "n" }, String(v)),
        h("td", { class: "n" }, `${pct(v)}%`));
    });
    alvo.append(h("div", { class: "cartao" }, h("h2", {}, "Até onde as pessoas chegam"),
      h("div", { class: "corpo" },
        h("table", { class: "tabela" },
          h("thead", {}, h("tr", {}, h("th", {}, "Etapa"), h("th", { class: "n" }, "Pessoas"), h("th", { class: "n" }, "% do total"))),
          h("tbody", {}, linhas)),
        h("p", { class: "dica" }, "A maior queda entre uma etapa e a seguinte mostra onde mexer primeiro."))));

    const origens = Object.entries(t).filter(([k]) => k.startsWith("origem|")).sort((a, b) => b[1] - a[1]);
    if (origens.length) {
      alvo.append(h("div", { class: "cartao" }, h("h2", {}, "De onde vieram"),
        h("div", { class: "corpo" }, h("table", { class: "tabela" }, h("tbody", {},
          origens.map(([k, v]) => h("tr", {}, h("td", {}, nomeOrigem(k.slice(7))), h("td", { class: "n" }, String(v)))))),
          h("p", { class: "dica" }, "Use ?src=ig no link da bio do Instagram e ?src=tt no do TikTok."))));
    }
  }
  const nomeOrigem = (o) => ({ ig: "Instagram", tt: "TikTok", direto: "Direto / sem identificação" }[o] || o);

  // ---------- fluxo ----------
  async function carregar() {
    try { config = await api("/api/config?fresco=1"); }
    catch (e) {
      if (e.status !== 404) aviso(e.message, true);
      config = JSON.parse(JSON.stringify(window.FUNIL)); // primeira vez: parte do roteiro.js
    }
    sujo = false;
    atualizarBarra();
    renderFunil();
  }

  async function publicar() {
    const botao = $("#publicar");
    botao.disabled = true; botao.textContent = "Publicando...";
    try {
      await api("/api/config", { method: "PUT", body: config });
      sujo = false;
      aviso("Publicado! O site já mostra a nova versão.");
    } catch (e) {
      aviso(e.message, true);
    } finally {
      botao.textContent = "Publicar alterações";
      atualizarBarra();
    }
  }

  function sair() {
    localStorage.removeItem(CHAVE_TOKEN);
    $("#tela-painel").hidden = true;
    $("#tela-login").hidden = false;
  }

  function entrar() {
    $("#tela-login").hidden = true;
    $("#tela-painel").hidden = false;
    carregar();
  }

  $("#form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#erro-login").textContent = "";
    try {
      const { token } = await api("/api/login", { method: "POST", body: { senha: $("#senha").value } });
      localStorage.setItem(CHAVE_TOKEN, token);
      entrar();
    } catch (err) {
      $("#erro-login").textContent = err.message;
    }
  });

  document.querySelectorAll(".aba").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".aba").forEach((x) => x.classList.toggle("ativa", x === b));
    $("#aba-funil").hidden = b.dataset.aba !== "funil";
    $("#aba-numeros").hidden = b.dataset.aba !== "numeros";
    $("#barra-publicar").hidden = b.dataset.aba !== "funil";
    if (b.dataset.aba === "numeros") renderNumeros();
  }));
  $("#publicar").addEventListener("click", publicar);

  if (localStorage.getItem(CHAVE_TOKEN)) entrar(); else $("#tela-login").hidden = false;
})();

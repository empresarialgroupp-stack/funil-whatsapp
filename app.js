function iniciar(F) {
  const $ = (s) => document.querySelector(s);
  const chat = $("#chat"), painel = $("#painel"), opcoesEl = $("#opcoes"), dica = $("#dica span");
  const voltarBtn = $("#voltar"), barra = $("#progresso-barra"), statusEl = $("#status");

  const ordem = Object.keys(F.etapas);
  const params = new URLSearchParams(location.search);
  const origem = params.get("src") || params.get("utm_source") || "direto";
  const historico = []; // [{ id, nodes, resposta }]
  let execucao = 0;     // invalida etapas em andamento quando o lead volta

  const ICON = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>',
    mudo: '<svg viewBox="0 0 48 48"><path d="M8 18h8l10-8v28l-10-8H8z" fill="#f2f2f2"/><path d="M6 40 42 8" stroke="#e8467c" stroke-width="4" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 16 11" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 6l3 3 6-7M6 9l1 1 6-8"/></svg>',
  };
  const VELOCIDADES = [1, 1.5, 2];

  // ---------- utilidades ----------
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const hora = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const preencher = (t) => String(t).replaceAll("{nome}", F.perfil.nome);
  const tempo = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");
  const escapar = (t) => preencher(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function el(tag, classe, html) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (html != null) n.innerHTML = html;
    return n;
  }
  const rodapeMsg = (enviada) => `<span class="meta">${hora()}${enviada ? ICON.check : ""}</span>`;
  const rolar = () => requestAnimationFrame(() => (chat.scrollTop = chat.scrollHeight));

  const etapasRegistradas = new Set(); // conta cada etapa uma vez por visita
  function rastrear(evento, dados = {}) {
    const atual = historico[historico.length - 1];
    const payload = { evento, origem, etapa: atual && atual.id, ...dados };
    if (evento === "etapa") {
      if (etapasRegistradas.has(payload.etapa)) return;
      etapasRegistradas.add(payload.etapa);
    }
    try { window.va && window.va("event", { name: evento, data: payload }); } catch {}
    try { window.fbq && window.fbq("trackCustom", evento, payload); } catch {}
    try { window.ttq && window.ttq.track(evento, payload); } catch {}
    const endpoint = (F.rastreamento && F.rastreamento.endpoint) || "/api/evento";
    try { navigator.sendBeacon && navigator.sendBeacon(endpoint, JSON.stringify(payload)); } catch {}
  }

  function pausarOutras(atual) {
    document.querySelectorAll("video, audio").forEach((m) => { if (m !== atual && !m.muted) m.pause(); });
  }

  // ---------- mensagens ----------
  function msgTexto(m) {
    return el("div", "msg recebida", `<p>${escapar(m.texto)}</p>${rodapeMsg()}`);
  }

  function msgImagem(m) {
    const n = el("div", "msg recebida midia",
      `<img src="${m.imagem}" alt="">${m.legenda ? `<p>${escapar(m.legenda)}</p>` : ""}${rodapeMsg()}`);
    n.querySelector("img").addEventListener("load", rolar);
    return n;
  }

  function msgVideo(m) {
    const n = el("div", "msg recebida midia video" + (m.legenda ? " com-legenda" : ""), `
      <div class="video-box">
        <video src="${m.video}" playsinline muted loop preload="auto"></video>
        <button class="v-overlay" type="button"><strong>Seu vídeo já começou</strong>${ICON.mudo}<span>Clique para assistir com som</span></button>
        <button class="v-btn v-play" type="button" aria-label="Play">${ICON.play}</button>
        <button class="v-btn v-vel" type="button">1×</button>
        <div class="v-barra"><div></div></div>
      </div>
      ${m.legenda ? `<p>${escapar(m.legenda)}</p>${rodapeMsg()}` : ""}`);
    const video = n.querySelector("video"), overlay = n.querySelector(".v-overlay");
    const play = n.querySelector(".v-play"), vel = n.querySelector(".v-vel"), barraV = n.querySelector(".v-barra div");
    let vi = 0, comSom = false, resolver;
    const concluida = new Promise((r) => (resolver = r));

    // Prévia muda em loop até o lead tocar para ouvir; só conta como assistido com som.
    video.play().catch(() => {});
    const iniciarComSom = () => {
      comSom = true; overlay.hidden = true;
      video.loop = false; video.muted = false; video.currentTime = 0;
      pausarOutras(video); video.play().catch(() => {});
      rastrear("video_play", { video: m.video });
    };
    overlay.addEventListener("click", iniciarComSom);
    play.addEventListener("click", () => {
      if (!comSom) return iniciarComSom();
      if (video.paused) { pausarOutras(video); video.play(); } else video.pause();
    });
    vel.addEventListener("click", () => {
      vi = (vi + 1) % VELOCIDADES.length;
      video.playbackRate = VELOCIDADES[vi];
      vel.textContent = `${VELOCIDADES[vi]}×`.replace(".", ",");
    });
    video.addEventListener("play", () => (play.innerHTML = comSom ? ICON.pause : ICON.play));
    video.addEventListener("pause", () => (play.innerHTML = ICON.play));
    video.addEventListener("timeupdate", () => {
      if (comSom) barraV.style.width = `${(video.currentTime / video.duration) * 100}%`;
    });
    video.addEventListener("ended", () => {
      play.innerHTML = ICON.play;
      rastrear("video_fim", { video: m.video });
      resolver();
    });
    video.addEventListener("loadedmetadata", rolar);
    video.addEventListener("error", () => {
      n.querySelector(".video-box").innerHTML = '<div class="video-erro">Vídeo indisponível</div>';
      resolver(); // não trava o funil se o arquivo faltar
    });
    return { node: n, concluida };
  }

  function msgAudio(m) {
    const n = el("div", "msg recebida audio", `
      <button class="a-play" type="button" aria-label="Play">${ICON.play}</button>
      <div class="a-corpo">
        <div class="a-trilha"><div class="a-preench"></div><div class="a-ponto"></div></div>
        <div class="a-info"><span class="a-tempo">0:00</span><span>${escapar(F.perfil.nome)}</span></div>
      </div>
      <button class="a-vel" type="button">1×</button>
      <img class="a-avatar" src="${F.perfil.foto}" alt="">
      <audio src="${m.audio}" preload="metadata"></audio>`);
    const audio = n.querySelector("audio"), play = n.querySelector(".a-play"), vel = n.querySelector(".a-vel");
    const trilha = n.querySelector(".a-trilha"), preench = n.querySelector(".a-preench");
    const ponto = n.querySelector(".a-ponto"), tempoEl = n.querySelector(".a-tempo");
    let vi = 0, resolver;
    const concluida = new Promise((r) => (resolver = r));

    play.addEventListener("click", () => {
      if (audio.paused) { pausarOutras(audio); audio.play(); rastrear("audio_play", { audio: m.audio }); }
      else audio.pause();
    });
    vel.addEventListener("click", () => {
      vi = (vi + 1) % VELOCIDADES.length;
      audio.playbackRate = VELOCIDADES[vi];
      vel.textContent = `${VELOCIDADES[vi]}×`.replace(".", ",");
    });
    trilha.addEventListener("click", (e) => {
      const r = trilha.getBoundingClientRect();
      if (isFinite(audio.duration)) audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
    });
    audio.addEventListener("loadedmetadata", () => (tempoEl.textContent = tempo(audio.duration)));
    audio.addEventListener("play", () => (play.innerHTML = ICON.pause));
    audio.addEventListener("pause", () => (play.innerHTML = ICON.play));
    audio.addEventListener("timeupdate", () => {
      const p = (audio.currentTime / audio.duration) * 100 || 0;
      preench.style.width = ponto.style.left = `${p}%`;
      tempoEl.textContent = tempo(audio.currentTime);
    });
    audio.addEventListener("ended", () => { tempoEl.textContent = tempo(audio.duration); resolver(); });
    audio.addEventListener("error", resolver);
    return { node: n, concluida };
  }

  function msgEnviada(texto) {
    return el("div", "msg enviada", `<p>${escapar(texto)}</p>${rodapeMsg(true)}`);
  }

  // Simula "digitando..." com tempo proporcional ao tamanho do texto
  async function digitar(m, minhaExecucao) {
    const gravando = !!m.audio;
    statusEl.textContent = gravando ? "gravando áudio..." : "digitando...";
    const bolha = el("div", "msg recebida digitando", "<span></span><span></span><span></span>");
    chat.appendChild(bolha); rolar();
    const ms = m.texto ? Math.min(700 + m.texto.length * 18, 2600) : gravando ? 1800 : 1100;
    await esperar(ms);
    bolha.remove();
    if (minhaExecucao === execucao) statusEl.textContent = "online";
  }

  // ---------- etapas ----------
  function atualizarProgresso(id) {
    const i = ordem.indexOf(id);
    barra.style.width = `${((i + 1) / ordem.length) * 100}%`;
  }

  async function executarEtapa(id) {
    const minhaExecucao = ++execucao;
    const etapa = F.etapas[id];
    if (!etapa) return console.error(`Etapa "${id}" não existe no roteiro.js`);
    const registro = { id, nodes: [], resposta: null };
    historico.push(registro);
    atualizarProgresso(id);
    rastrear("etapa", { etapa: id });
    painel.hidden = true;

    const obrigatorias = [];
    for (const m of etapa.mensagens) {
      await digitar(m, minhaExecucao);
      if (minhaExecucao !== execucao) return;
      let node, concluida;
      if (m.video) ({ node, concluida } = msgVideo(m));
      else if (m.audio) ({ node, concluida } = msgAudio(m));
      else if (m.imagem) node = msgImagem(m);
      else node = msgTexto(m);
      if (m.obrigatorio && concluida) obrigatorias.push(concluida);
      chat.appendChild(node);
      registro.nodes.push(node);
      rolar();
      await esperar(400);
    }

    if (etapa.final) mostrarFinal(etapa.final);
    else mostrarOpcoes(etapa, obrigatorias, minhaExecucao);
  }

  async function mostrarOpcoes(etapa, obrigatorias, minhaExecucao) {
    opcoesEl.innerHTML = "";
    dica.parentElement.hidden = false;
    voltarBtn.hidden = historico.length < 2;
    painel.hidden = false;
    if (obrigatorias.length) {
      const temVideo = etapa.mensagens.some((m) => m.video && m.obrigatorio);
      dica.textContent = temVideo ? "Assista o vídeo até o final para continuar" : "Ouça o áudio até o final para continuar";
      await Promise.all(obrigatorias);
      if (minhaExecucao !== execucao) return;
    } else {
      dica.textContent = "Escolha uma resposta para continuar";
    }
    for (const op of etapa.opcoes) {
      const b = el("button", "opcao",
        `${op.imagem ? `<img src="${op.imagem}" alt="">` : ""}<span>${escapar(op.texto)}</span>`);
      b.type = "button";
      b.addEventListener("click", () => escolher(op));
      opcoesEl.appendChild(b);
    }
    rolar();
  }

  async function escolher(op) {
    const atual = historico[historico.length - 1];
    rastrear("clique", { etapa: atual.id, opcao: op.texto });
    painel.hidden = true;
    pausarOutras(null);
    atual.resposta = msgEnviada(op.texto);
    chat.appendChild(atual.resposta);
    rolar();
    await esperar(600);
    executarEtapa(op.proxima);
  }

  function voltar() {
    if (historico.length < 2) return;
    execucao++;
    const atual = historico.pop();
    atual.nodes.forEach((n) => n.remove());
    chat.querySelectorAll(".digitando").forEach((n) => n.remove());
    statusEl.textContent = "online";
    const anterior = historico[historico.length - 1];
    if (anterior.resposta) { anterior.resposta.remove(); anterior.resposta = null; }
    pausarOutras(null);
    atualizarProgresso(anterior.id);
    rastrear("voltar", { de: atual.id, para: anterior.id });
    mostrarOpcoes(F.etapas[anterior.id], [], execucao); // mídia já foi consumida, não trava de novo
  }

  function mostrarFinal(f) {
    opcoesEl.innerHTML = "";
    dica.parentElement.hidden = true;
    voltarBtn.hidden = historico.length < 2;
    const bloco = el("div", "", `
      <a class="cta" href="${f.link}" target="_blank" rel="noopener">${escapar(f.botao)}</a>
      <div class="contato">
        <p>${escapar(f.textoContato)}</p>
        <div class="fone"><strong>${escapar(F.contato.exibicao)}</strong><button type="button">Copiar</button></div>
        <small>${escapar(f.aviso)}</small>
      </div>`);
    bloco.querySelector(".cta").addEventListener("click", () => rastrear("cta", { link: f.link }));
    const copiar = bloco.querySelector(".fone button");
    copiar.addEventListener("click", async () => {
      const numero = F.contato.exibicao;
      try { await navigator.clipboard.writeText(numero); }
      catch {
        // Navegador interno do Instagram/TikTok às vezes bloqueia a área de transferência
        const t = el("textarea"); t.value = numero; document.body.appendChild(t);
        t.select(); try { document.execCommand("copy"); } catch {} t.remove();
      }
      copiar.textContent = "Copiado!";
      setTimeout(() => (copiar.textContent = "Copiar"), 2000);
      rastrear("copiar_numero");
    });
    opcoesEl.appendChild(bloco);
    painel.hidden = false;
    rolar();
  }

  voltarBtn.addEventListener("click", voltar);

  // Lightbox para ampliar prints
  const lightbox = $("#lightbox");
  chat.addEventListener("click", (e) => {
    if (e.target.matches(".midia img")) {
      lightbox.querySelector("img").src = e.target.src;
      lightbox.hidden = false;
    }
  });
  lightbox.addEventListener("click", () => (lightbox.hidden = true));

  // ---------- início ----------
  document.title = F.perfil.nome;
  $("#nome").textContent = F.perfil.nome;
  $("#avatar").src = F.perfil.foto;
  rastrear("acesso");
  setTimeout(() => executarEtapa(ordem[0]), 500);
}

// Usa o roteiro salvo pelo painel (/admin); sem ele, cai no roteiro.js do repositório.
fetch("/api/config")
  .then((r) => (r.ok ? r.json() : null))
  .catch(() => null)
  .then((config) => iniciar(config || window.FUNIL));

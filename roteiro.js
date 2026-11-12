// =====================================================================
//  ROTEIRO DO FUNIL — é o único arquivo que você precisa editar.
//  {nome} é trocado automaticamente pelo nome do perfil.
//
//  Tipos de mensagem:
//    { texto: "..." }
//    { imagem: "media/x.jpg", legenda: "..." }          (legenda opcional)
//    { video: "media/x.mp4", legenda: "...", obrigatorio: true }
//    { audio: "media/x.m4a", obrigatorio: false }
//  obrigatorio: true = o lead precisa assistir até o fim para liberar as opções.
//
//  Cada etapa termina com "opcoes" (botões) ou com "final" (botão de pagamento).
// =====================================================================

window.FUNIL = {
  perfil: {
    nome: "André",
    foto: "media/perfil.webp",
  },

  // Sem WhatsApp no final: o lead vai direto para o pagamento.
  contato: { whatsapp: "", exibicao: "" },

  rastreamento: { endpoint: "" },

  etapas: {
    boas_vindas: {
      mensagens: [
        { texto: "Oi! Sou o {nome} 👋 Essa é minha conversa automatizada pra te mostrar como começar e te liberar meu treinamento gratuito." },
        { imagem: "media/vendas-ao-vivo.webp", legenda: "Aqui vou te mostrar o caminho que trilhei pra vender + R$ 1k por dia no Mercado Livre sem ter estoque" },
        { texto: "Você está começando ou já vende pela internet?" },
      ],
      opcoes: [
        { texto: "Estou começando", imagem: "media/opcoes/comecando.webp", proxima: "estrutura" },
        { texto: "Já vendo pela internet", imagem: "media/opcoes/ja-vendo.webp", proxima: "ja_vende" },
      ],
    },

    ja_vende: {
      mensagens: [
        { texto: "Show! Então você já sabe como funciona vender online." },
        { texto: "O que eu vou te mostrar é como vender no Mercado Livre sem estoque, com um fornecedor integrado. Dá pra rodar junto com o que você já faz." },
      ],
      opcoes: [
        { texto: "Quero ver como funciona", imagem: "media/opcoes/entender.webp", proxima: "fornecedor" },
      ],
    },

    estrutura: {
      mensagens: [
        { texto: "Meu treinamento é gratuito, mas é pra quem tem compromisso de aplicar e já tem a estrutura pra começar, incluindo o fornecedor." },
        { texto: "Se você ainda não tem essa estrutura, eu te mostro agora o que precisa." },
      ],
      opcoes: [
        { texto: "Quero entender como funciona", imagem: "media/opcoes/entender.webp", proxima: "fornecedor" },
      ],
    },

    fornecedor: {
      mensagens: [
        { texto: "Fornecedor é a empresa que mantém os produtos em estoque e faz o envio quando você vende." },
        { texto: "A plataforma liga sua conta do Mercado Livre ao fornecedor. O acesso à plataforma é pago." },
        { video: "media/video-1.mp4", obrigatorio: true },
        { texto: "Se ainda não tem uma conta de vendedor no Mercado Livre, dá pra criar de graça, só com o CPF." },
      ],
      opcoes: [
        { texto: "Entendi, continuar", imagem: "media/opcoes/continuar.webp", proxima: "produtos" },
      ],
    },

    produtos: {
      mensagens: [
        { video: "media/video-2.mp4", obrigatorio: true },
        { texto: "Você escolhe os produtos do fornecedor que quer vender. A integração ajuda a criar seus anúncios." },
        { texto: "O próprio Mercado Livre divulga seus produtos no marketplace, sem você precisar pagar por anúncios." },
      ],
      opcoes: [
        { texto: "Como defino o preço dos produtos?", imagem: "media/opcoes/preco.webp", proxima: "preco" },
      ],
    },

    preco: {
      mensagens: [
        { texto: "Você define o percentual que quer acrescentar sobre o custo do produto." },
        { texto: "Exemplo... um produto de R$ 100 com acréscimo de 30% fica a R$ 130. Os R$ 30 de diferença ainda não são lucro: é preciso descontar taxas e demais custos." },
      ],
      opcoes: [
        { texto: "E quando vender?", imagem: "media/opcoes/quando-vender.svg", proxima: "venda" },
      ],
    },

    venda: {
      mensagens: [
        { texto: "Quando você vende, o próprio fornecedor separa o pedido e envia ao cliente. Você acompanha a venda e o fornecedor cuida de toda a logística." },
      ],
      opcoes: [
        { texto: "E como você me ajuda?", imagem: "media/opcoes/como-ajuda.svg", proxima: "ajuda" },
      ],
    },

    ajuda: {
      mensagens: [
        { texto: "Eu tenho um treinamento gratuito onde te ensino a montar sua loja, integrar o fornecedor e aplicar as estratégias de venda que eu uso." },
        { texto: "Pra participar, a única coisa que você precisa é o acesso ao fornecedor. É a mesma plataforma que eu uso, e sem ela não tem como aplicar o que eu ensino." },
        { audio: "media/audio-1.mp3" },
      ],
      opcoes: [
        { texto: "Gostei, como eu começo?", imagem: "media/opcoes/como-comecar.svg", proxima: "provas" },
      ],
    },

    provas: {
      mensagens: [
        { texto: "Bora! Antes, olha o resultado de quem já está aplicando 👇" },
        { video: "media/prova-1.mp4" },
        { imagem: "media/prova-2.svg" },
        { imagem: "media/prova-3.svg" },
        { texto: "Todos começaram do mesmo jeito: com o fornecedor certo e seguindo o passo a passo." },
        { texto: "Você já tem acesso a algum fornecedor?" },
      ],
      opcoes: [
        { texto: "Ainda não tenho", imagem: "media/opcoes/ainda-nao.svg", proxima: "fim" },
        { texto: "Já tenho um fornecedor", imagem: "media/opcoes/ja-tenho.svg", proxima: "fim" },
      ],
    },

    fim: {
      mensagens: [
        { texto: "Vou te passar o fornecedor que eu uso. É o mesmo das estratégias que eu ensino no treinamento, então a chance de você ter resultado é maior." },
        { texto: "Funciona assim:\n1️⃣ Você garante seu acesso ao fornecedor no botão abaixo.\n2️⃣ Assim que o pagamento for confirmado, você recebe o link do meu treinamento gratuito." },
      ],
      final: {
        botao: "Garantir meu acesso ao fornecedor",
        link: "https://logisfy.site/plus",
        aviso: "Pagamento seguro. O link do treinamento gratuito chega logo após a confirmação.",
      },
    },
  },
};

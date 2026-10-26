// =====================================================================
//  ROTEIRO DO FUNIL — é o único arquivo que você precisa editar.
//  {nome} é trocado automaticamente pelo nome do perfil.
//
//  Tipos de mensagem:
//    { texto: "..." }
//    { imagem: "media/x.svg", legenda: "..." }          (legenda opcional)
//    { video: "media/x.mp4", legenda: "...", obrigatorio: true }
//    { audio: "media/x.m4a", obrigatorio: false }
//  obrigatorio: true = o lead precisa assistir até o fim para liberar as opções.
//
//  Cada etapa termina com "opcoes" (botões) ou com "final" (CTA + contato).
//  Marcado com TODO = texto que não deu para ler nos prints.
// =====================================================================

window.FUNIL = {
  perfil: {
    nome: "Seu Nome",
    foto: "media/perfil.svg",
  },

  contato: {
    whatsapp: "5581999999999",        // só números, com 55 + DDD
    exibicao: "(81) 99999-9999",
  },

  // Opcional: URL que recebe os eventos (etapa/clique) via POST. Vazio = desligado.
  rastreamento: { endpoint: "" },

  etapas: {
    boas_vindas: {
      mensagens: [
        { texto: "Oi! Sou o {nome} 👋 Essa é minha conversa automatizada pra te mandar meu curso gratuito." },
        { imagem: "media/vendas-ao-vivo.svg", legenda: "Aqui vou te mostrar o caminho que trilhei pra vender + R$ 1k por dia no Mercado Livre sem ter estoque" },
        { texto: "Você está começando ou já vende pela internet?" },
      ],
      opcoes: [
        { texto: "Estou começando", imagem: "media/opcoes/comecando.svg", proxima: "estrutura" },
        // TODO: a ramificação de quem já vende não aparece nos prints — por enquanto segue o mesmo caminho
        { texto: "Já vendo pela internet", imagem: "media/opcoes/ja-vendo.svg", proxima: "estrutura" },
      ],
    },

    estrutura: {
      mensagens: [
        { texto: "Estou enviando meu curso pra quem tem compromisso de aplicar e já tem a estrutura para começar, incluindo acesso aos fornecedores." },
        { texto: "Se você ainda não tem essa estrutura, primeiro vou mostrar o que precisa organizar." },
      ],
      opcoes: [
        { texto: "Quero entender como funciona", imagem: "media/opcoes/entender.svg", proxima: "fornecedor" },
      ],
    },

    fornecedor: {
      mensagens: [
        { texto: "Fornecedor é a empresa que mantém os produtos e faz o envio dos produtos quando você vende." },
        { texto: "A plataforma liga sua conta do Mercado Livre ao fornecedor. O acesso à plataforma é pago." },
        { video: "media/video-1.mp4", obrigatorio: true },
        { texto: "Se ainda não tem uma conta de vendedor no Mercado Livre, dá pra criar de graça e só com o CPF para começar a vender." },
      ],
      opcoes: [
        { texto: "Entendi, continuar", imagem: "media/opcoes/continuar.svg", proxima: "produtos" },
      ],
    },

    produtos: {
      mensagens: [
        { video: "media/video-2.mp4", obrigatorio: true },
        { texto: "Você escolhe os produtos do fornecedor que quer vender. A integração ajuda a criar seus anúncios." },
        { texto: "O próprio Mercado Livre faz a divulgação gratuita pelo marketplace, sem a necessidade de pagar por anúncios." },
      ],
      opcoes: [
        { texto: "Como defino o preço dos produtos?", imagem: "media/opcoes/preco.svg", proxima: "preco" },
      ],
    },

    preco: {
      mensagens: [
        { texto: "Você define o percentual que quer acrescentar sobre o custo do produto." },
        { texto: "Exemplo... um produto de R$ 100 com acréscimo de 30% fica a R$ 130. Os R$ 30 de diferença ainda não são lucro, é preciso descontar taxas e demais custos." },
      ],
      opcoes: [
        { texto: "E quando vender?", imagem: "media/opcoes/quando-vender.svg", proxima: "venda" },
      ],
    },

    venda: {
      mensagens: [
        { texto: "Quando você vende, o próprio fornecedor separa o pedido e faz o envio ao cliente. Você acompanha toda a venda, enquanto o fornecedor toma conta de toda logística." },
      ],
      opcoes: [
        { texto: "E como você me ajuda?", imagem: "media/opcoes/como-ajuda.svg", proxima: "ajuda" },
      ],
    },

    ajuda: {
      mensagens: [
        { texto: "Eu tenho um projeto gratuito onde eu ajudo quem quer começar a criar sua loja, integrar fornecedores, mando meu curso gratuito e dou acompanhamento durante 21 dias." },
        { texto: "A meta é buscar 20 mil de faturamento nesse período com você aplicando as estratégias que vou passar." },
        { texto: "Lógico que não faço isso por ser bonzinho, a única coisa que eu recebo em troca pela ajuda é você só me passar 5% do lucro que eu te ajudar a fazer durante os 21 dias de projeto." },
        { audio: "media/audio-1.mp3" },
      ],
      opcoes: [
        { texto: "Gostei, como eu começo?", imagem: "media/opcoes/como-comecar.svg", proxima: "provas" },
      ],
    },

    provas: {
      mensagens: [
        { texto: "TODO: mensagem curta de resposta (ilegível no print)" },
        { texto: "TODO: mensagem que apresenta os resultados de alunos (ilegível no print)" },
        { imagem: "media/prova-1.svg" },
        { imagem: "media/prova-2.svg" },
        { imagem: "media/prova-3.svg" },
        { texto: "TODO: mensagens após os prints de resultado (ilegíveis no print)" },
        { texto: "TODO: pergunta sobre os acessos — ex.: Você já tem conta no Mercado Livre e acesso a fornecedores?" },
      ],
      opcoes: [
        { texto: "Já tenho todos, incluindo fornecedores", imagem: "media/opcoes/ja-tenho.svg", proxima: "fim" },
        // TODO: confirmar se existe essa opção no funil original
        { texto: "Ainda não tenho", imagem: "media/opcoes/ainda-nao.svg", proxima: "fim" },
      ],
    },

    fim: {
      mensagens: [
        { texto: "Vou te enviar o fornecedor que eu uso, é mais confiável já que uso ele faz tempo e a chance de eu te ajudar a ter resultados com ele é maior." },
        { texto: "Já que é o mesmo que eu uso para aplicar as estratégias de vendas." },
      ],
      final: {
        botao: "Acessar fornecedor",
        link: "https://SEU-LINK-AQUI",
        textoContato: "Cadastrou o fornecedor? Me chame para começar e receber o curso gratuito.",
        aviso: "Copie ou tire um print. Chame só após o cadastro.",
      },
    },
  },
};

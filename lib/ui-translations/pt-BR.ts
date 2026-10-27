import type { UIStrings } from '@/lib/ui-i18n'

export const ptBR: UIStrings = {
  nav: {
    docs: 'Documentação',
    blog: 'Blog',
    changelog: 'Registro de alterações',
    discord: 'Discord',
    joinDiscord: 'Entrar no Discord',
  },
  pageActions: {
    copyMarkdown: 'Copiar Markdown',
    copying: 'Copiando...',
    copied: 'Copiado!',
    copyFailed: 'Falha ao copiar',
    copyMarkdownAria: 'Copiar página como Markdown',
    open: 'Abrir',
    openAria: 'Abrir página em ferramentas externas',
    openInGitHub: 'Abrir no GitHub',
    openInLibreChat: 'Abrir no LibreChat',
    openInChatGPT: 'Abrir no ChatGPT',
    openInClaude: 'Abrir no Claude',
    openInGemini: 'Abrir no Gemini',
    openInPerplexity: 'Abrir no Perplexity',
    openInCursor: 'Abrir no Cursor',
  },
  feedback: {
    question: 'Como está este guia?',
    good: 'Bom',
    bad: 'Ruim',
    thanks: 'Obrigado pelo feedback!',
    submitAgain: 'Enviar novamente',
    placeholder: 'Algum feedback adicional? (opcional)',
    submit: 'Enviar',
    additionalAria: 'Feedback adicional',
  },
  version: {
    label: 'Versão',
    aria: 'Selecionar versão da documentação',
  },
  logoMenu: {
    openNewTab: 'Abrir em nova aba',
    logoPng: 'Logo (png)',
    logoSvg: 'Logo (svg)',
    docsLogoPng: 'Logo da documentação (png)',
    docsLogoSvg: 'Logo da documentação (svg)',
  },
  common: {
    learnMore: 'Saiba mais',
    getStarted: 'Começar',
    readDocs: 'Ler a documentação',
    viewFullGuide: 'Ver guia completo',
    recommended: 'Recomendado',
    prerequisites: 'Pré-requisitos',
    commands: 'Comandos',
    explore: 'Explorar',
    resources: 'Recursos',
  },
  resources: {
    changelog: { title: 'Registro de alterações', description: 'Últimas versões' },
    roadmap: { title: 'Roadmap 2026', description: 'O que está planejado' },
    discord: { title: 'Discord', description: 'Obter ajuda' },
  },
  docsHub: {
    sections: {
      deploy: 'Implantar',
      configure: 'Configurar',
      use: 'Usar',
      contribute: 'Contribuir',
    },
    items: {
      quickStart: { title: 'Início rápido', description: 'Configuração com Docker em 5 minutos' },
      local: { title: 'Instalação local', description: 'Docker, npm e Helm Chart' },
      remote: { title: 'Hospedagem remota', description: 'DigitalOcean, Railway e mais' },
      configuration: {
        title: 'Configuração',
        description: 'Variáveis de ambiente, YAML e autenticação',
      },
      customEndpoints: {
        title: 'Endpoints personalizados',
        description: 'Conecte Ollama, Deepseek, Groq e mais',
      },
      features: { title: 'Recursos', description: 'MCP, agentes, Code Interpreter, artefatos' },
      userGuides: {
        title: 'Guias do usuário',
        description: 'Predefinições, dicas e boas práticas',
      },
      development: {
        title: 'Desenvolvimento',
        description: 'Contribuição, arquitetura e depuração',
      },
    },
  },
  quickStartHub: {
    ariaLabel: 'Guias de início rápido',
    methods: {
      docker: {
        tag: 'Recomendado',
        time: '~5 min',
        description:
          'Tudo incluído — MongoDB, MeiliSearch e RAG API são executados automaticamente.',
        steps: [
          'Clone o repositório',
          'Copie .env.example para .env',
          'Execute docker compose up',
          'Abra localhost:3080 e cadastre-se',
        ],
        prereqs: ['Docker Desktop'],
      },
      npm: {
        tag: '',
        time: '~20 min',
        description:
          'Configuração manual com Node.js. Requer instâncias separadas de MongoDB e MeiliSearch.',
        steps: [
          'Clone e instale as dependências',
          'Configure .env e inicie o MongoDB',
          'Execute npm run backend',
          'Abra localhost:3080 e cadastre-se',
        ],
        prereqs: ['Node.js v24.22.1', 'Instância MongoDB'],
      },
      railway: {
        tag: 'Um clique',
        time: '~3 min',
        description:
          'Implante na nuvem instantaneamente. Sem configuração local, sem Docker, sem servidores para gerenciar.',
        steps: [
          'Clique no botão de implantação',
          'Conecte seu GitHub',
          'Defina as variáveis de ambiente',
        ],
        prereqs: ['Conta Railway', 'Conta GitHub'],
      },
    },
    afterInstallationHeading: 'Após a instalação',
    connectProviders: {
      title: 'Conectar provedores de IA',
      description:
        'Adicione OpenRouter, Ollama, Deepseek, Groq e outros serviços compatíveis com OpenAI',
    },
    exploreFeatures: {
      title: 'Recursos',
      description: 'Agentes, MCP, busca web, RAG, artefatos, geração de imagens e mais',
    },
    exploreUserGuides: {
      title: 'Guias do usuário',
      description: 'Aprenda a usar predefinições, provedores de IA e a navegar pela interface',
    },
  },
  featuresHub: {
    ariaLabel: 'Navegação de recursos',
    featuredHeading: 'Em destaque',
  },
  localInstallHub: {
    bundledHeading: 'Incluído com Docker',
    bundledNote:
      'Docker Compose gerencia todas as dependências. Com npm ou Helm, você instala e configura esses serviços separadamente.',
    chooseMethodHeading: 'Escolha um método',
    difficulty: {
      Beginner: 'Iniciante',
      Intermediate: 'Intermediário',
      Advanced: 'Avançado',
    },
    externalServicesRequired: 'Serviços externos necessários',
    methods: {
      docker: {
        description:
          'Tudo roda em contêineres. MongoDB, MeiliSearch, RAG API e Vector DB são incluídos automaticamente.',
      },
      npm: {
        description:
          'Execute o LibreChat diretamente com Node.js. Você gerencia serviços externos como MongoDB e MeiliSearch.',
      },
      helm: {
        description:
          'Implante no Kubernetes usando Helm. Melhor para clusters de produção e fluxos de infrastructure-as-code.',
      },
    },
    notRunningLocallyHeading: 'Não está executando localmente?',
    remoteHosting: {
      title: 'Hospedagem remota',
      description: 'DigitalOcean, Railway, Azure e mais',
    },
    envConfig: {
      title: 'Configuração .env',
      description: 'Guia aprofundado para variáveis de ambiente',
    },
  },
  footer: {
    headings: {
      about: 'Sobre',
      resources: 'Recursos',
      documentation: 'Documentação',
      blog: 'Blog',
      newsletter: 'Newsletter',
      legal: 'Legal',
    },
    items: {
      about: 'Sobre',
      contactUs: 'Fale conosco',
      features: 'Recursos',
      changelog: 'Registro de alterações',
      roadmap: 'Roadmap',
      demo: 'Demo',
      status: 'Status',
      getStarted: 'Começar',
      localInstall: 'Instalação local',
      remoteInstall: 'Instalação remota',
      blog: 'Blog',
      blogAuthors: 'Autores do blog',
      subscribe: 'Inscrever-se',
      unsubscribe: 'Cancelar inscrição',
      termsOfService: 'Termos de serviço',
      privacyPolicy: 'Política de privacidade',
      cookiePolicy: 'Política de cookies',
    },
  },
  toolkit: {
    credentials: {
      generate: 'Gerar credenciais',
      regenerate: 'Gerar novamente',
      generateAria: 'Gerar novas credenciais',
      regenerateAria: 'Gerar credenciais novamente',
      regionAria: 'Credenciais geradas',
      copy: 'Copiar',
      copying: 'Copiando...',
      copied: 'Copiado',
      copyFailed: 'Falha ao copiar',
      copyAria: 'Copiar {label}',
      valueAria: 'Valor de {label}',
      copyAll: 'Copiar tudo como .env',
      copiedAll: 'Copiado para a área de transferência!',
      copyAllAria: 'Copiar todas as credenciais como bloco .env',
      allCopiedStatus: 'Todas as 5 credenciais copiadas no formato KEY=value',
      allCopyFailedStatus:
        'Falha ao copiar para a área de transferência. Selecione e copie os valores manualmente.',
      emptyPrefix: 'Clique no botão acima para gerar credenciais aleatórias seguras para seu',
      emptySuffix: 'arquivo.',
      hints: {
        CREDS_KEY: 'Chave de criptografia para credenciais armazenadas',
        CREDS_IV: 'Vetor de inicialização para criptografia',
        JWT_SECRET: 'Segredo para assinar tokens de acesso',
        JWT_REFRESH_SECRET: 'Segredo para assinar tokens de atualização',
        MEILI_KEY: 'Chave mestra do MeiliSearch',
      },
    },
    yaml: {
      dropFile: 'Solte o arquivo YAML aqui',
      placeholder: 'Cole o conteúdo de librechat.yaml aqui ou arraste e solte um arquivo...',
      empty: 'Os resultados de validação aparecerão aqui quando você colar ou soltar YAML.',
      valid: 'YAML válido!',
      clear: 'Limpar',
      clearAria: 'Limpar editor',
      badIndentation:
        'Indentação incorreta na linha {line}. Cada entrada em YAML deve estar indentada corretamente.',
      errorAtLine: '{reason} na linha {line}',
      unknownError: 'Erro YAML desconhecido',
    },
  },
  home: {
    metaTitle: 'LibreChat - A plataforma de IA open-source',
    metaDescription:
      'LibreChat reúne todas as suas conversas de IA em uma interface unificada e personalizável.',
    starOnGitHub: 'Dar estrela no GitHub',
    starAria: 'Dar estrela ao LibreChat no GitHub — {count} estrelas',
    heroTitleTop: 'A plataforma',
    heroTitleBottom: 'de IA open-source',
    heroSubtitle:
      'LibreChat reúne todas as suas conversas de IA em uma interface unificada e personalizável',
    getStarted: 'Começar',
    getStartedAria: 'Começar com a documentação do LibreChat',
    tryDemo: 'Testar demo',
    tryDemoAria: 'Testar a demo do LibreChat',
    desktopLightAlt: 'Interface desktop do LibreChat no modo claro',
    desktopDarkAlt: 'Interface desktop do LibreChat no modo escuro',
    mobileLightAlt: 'Interface mobile do LibreChat no modo claro',
    mobileDarkAlt: 'Interface mobile do LibreChat no modo escuro',
    trustedBy: 'Confiado por empresas no mundo todo',
    featuresHeading: 'Tudo de que você precisa',
    featuresSubtitle: 'Uma plataforma completa para conversas com IA',
    primaryActionsAria: 'Ações principais',
    features: {
      agents: {
        title: 'Agentes',
        description:
          'Agentes avançados com manipulação de arquivos, interpretação de código e ações de API',
      },
      codeInterpreter: {
        title: 'Code Interpreter',
        description: 'Execute código em várias linguagens com segurança e sem configuração',
      },
      models: {
        title: 'Modelos',
        description: 'Seleção de modelos de IA incluindo Anthropic, AWS, OpenAI, Azure e mais',
      },
      artifacts: {
        title: 'Artefatos',
        description: 'Crie código React, HTML e diagramas Mermaid no chat',
      },
      search: {
        title: 'Busca',
        description: 'Pesquise mensagens, arquivos e trechos de código instantaneamente',
      },
      mcp: {
        title: 'MCP',
        description:
          'Conecte-se a qualquer ferramenta ou serviço com suporte a Model Context Protocol',
      },
      memory: {
        title: 'Memória',
        description: 'Contexto persistente entre conversas para que sua IA lembre de você',
      },
      webSearch: {
        title: 'Busca web',
        description:
          'Dê a qualquer modelo acesso à internet em tempo real com busca e reranking integrados',
      },
      authentication: {
        title: 'Autenticação',
        description:
          'SSO pronto para empresas com OAuth, SAML, LDAP e autenticação de dois fatores',
      },
    },
    learnMore: 'Saiba mais',
    communityHeading: 'Open source, movido pela comunidade',
    communitySubtitle:
      'Junte-se a milhares de desenvolvedores e organizações criando com LibreChat',
    githubStars: 'Estrelas no GitHub',
    dockerPulls: 'Downloads Docker',
    contributors: 'Colaboradores',
    communityLinksAria: 'Links da comunidade',
    githubAria: 'LibreChat no GitHub',
    discordAria: 'LibreChat no Discord',
    ctaHeading: 'Comece a criar com LibreChat',
    ctaSubtitle: 'Configure tudo em minutos com nosso guia de início rápido',
    quickstartGuide: 'Guia de início rápido',
    quickstartAria: 'Ler o guia de início rápido',
  },
}

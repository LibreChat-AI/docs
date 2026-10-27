import type { UIStrings } from '@/lib/ui-i18n'

export const es: UIStrings = {
  nav: {
    docs: 'Documentación',
    blog: 'Blog',
    changelog: 'Registro de cambios',
    discord: 'Discord',
    joinDiscord: 'Unirse a Discord',
  },
  pageActions: {
    copyMarkdown: 'Copiar Markdown',
    copying: 'Copiando...',
    copied: '¡Copiado!',
    copyFailed: 'Error al copiar',
    copyMarkdownAria: 'Copiar página como Markdown',
    open: 'Abrir',
    openAria: 'Abrir página en herramientas externas',
    openInGitHub: 'Abrir en GitHub',
    openInLibreChat: 'Abrir en LibreChat',
    openInChatGPT: 'Abrir en ChatGPT',
    openInClaude: 'Abrir en Claude',
    openInGemini: 'Abrir en Gemini',
    openInPerplexity: 'Abrir en Perplexity',
    openInCursor: 'Abrir en Cursor',
  },
  feedback: {
    question: '¿Qué te parece esta guía?',
    good: 'Buena',
    bad: 'Mala',
    thanks: '¡Gracias por tus comentarios!',
    submitAgain: 'Enviar de nuevo',
    placeholder: '¿Algún comentario adicional? (opcional)',
    submit: 'Enviar',
    additionalAria: 'Comentarios adicionales',
  },
  version: {
    label: 'Versión',
    aria: 'Seleccionar versión de la documentación',
  },
  logoMenu: {
    openNewTab: 'Abrir en una pestaña nueva',
    logoPng: 'Logotipo (png)',
    logoSvg: 'Logotipo (svg)',
    docsLogoPng: 'Logotipo de la documentación (png)',
    docsLogoSvg: 'Logotipo de la documentación (svg)',
  },
  common: {
    learnMore: 'Más información',
    getStarted: 'Comenzar',
    readDocs: 'Leer la documentación',
    viewFullGuide: 'Ver la guía completa',
    recommended: 'Recomendado',
    prerequisites: 'Requisitos previos',
    commands: 'Comandos',
    explore: 'Explorar',
    resources: 'Recursos',
  },
  // Shared resource cards used by both DocsHub and QuickStartHub.
  resources: {
    changelog: { title: 'Registro de cambios', description: 'Últimas versiones' },
    roadmap: { title: 'Hoja de ruta 2026', description: 'Lo que está planificado' },
    discord: { title: 'Discord', description: 'Obtén ayuda' },
  },
  docsHub: {
    sections: {
      deploy: 'Desplegar',
      configure: 'Configurar',
      use: 'Usar',
      contribute: 'Contribuir',
    },
    items: {
      quickStart: { title: 'Inicio rápido', description: 'Configuración con Docker en 5 minutos' },
      local: { title: 'Instalación local', description: 'Docker, npm y Helm Chart' },
      remote: { title: 'Alojamiento remoto', description: 'DigitalOcean, Railway y más' },
      configuration: {
        title: 'Configuración',
        description: 'Variables de entorno, YAML y autenticación',
      },
      customEndpoints: {
        title: 'Endpoints personalizados',
        description: 'Conecta Ollama, Deepseek, Groq y más',
      },
      features: {
        title: 'Funciones',
        description: 'MCP, agentes, intérprete de código, artefactos',
      },
      userGuides: {
        title: 'Guías de usuario',
        description: 'Ajustes preestablecidos, consejos y buenas prácticas',
      },
      development: {
        title: 'Desarrollo',
        description: 'Contribuciones, arquitectura y depuración',
      },
    },
  },
  quickStartHub: {
    ariaLabel: 'Guías de inicio rápido',
    methods: {
      docker: {
        tag: 'Recomendado',
        time: '~5 min',
        description: 'Todo incluido — MongoDB, MeiliSearch y RAG API se ejecutan automáticamente.',
        steps: [
          'Clonar el repositorio',
          'Copiar .env.example a .env',
          'Ejecutar docker compose up',
          'Abre localhost:3080 y regístrate',
        ],
        prereqs: ['Docker Desktop'],
      },
      npm: {
        tag: '',
        time: '~20 min',
        description:
          'Configuración manual con Node.js. Requiere instancias separadas de MongoDB y MeiliSearch.',
        steps: [
          'Clonar e instalar dependencias',
          'Configurar .env e iniciar MongoDB',
          'Ejecutar npm run backend',
          'Abre localhost:3080 y regístrate',
        ],
        prereqs: ['Node.js v24.22.1', 'Instancia de MongoDB'],
      },
      railway: {
        tag: 'Un clic',
        time: '~3 min',
        description:
          'Despliega en la nube al instante. Sin configuración local, sin Docker, sin servidores que gestionar.',
        steps: [
          'Haz clic en el botón de despliegue',
          'Conecta tu GitHub',
          'Define las variables de entorno',
        ],
        prereqs: ['Cuenta de Railway', 'Cuenta de GitHub'],
      },
    },
    afterInstallationHeading: 'Después de la instalación',
    connectProviders: {
      title: 'Conectar proveedores de IA',
      description:
        'Añade OpenRouter, Ollama, Deepseek, Groq y otros servicios compatibles con OpenAI',
    },
    exploreFeatures: {
      title: 'Funciones',
      description: 'Agentes, MCP, búsqueda web, RAG, artefactos, generación de imágenes y más',
    },
    exploreUserGuides: {
      title: 'Guías de usuario',
      description:
        'Aprende a usar los ajustes preestablecidos, los proveedores de IA y a navegar por la interfaz',
    },
  },
  featuresHub: {
    ariaLabel: 'Navegación de funciones',
    featuredHeading: 'Destacado',
  },
  localInstallHub: {
    bundledHeading: 'Incluido con Docker',
    bundledNote:
      'Docker Compose gestiona todas las dependencias. Con npm o Helm, instalas y configuras estos servicios por separado.',
    chooseMethodHeading: 'Elige un método',
    difficulty: {
      Beginner: 'Principiante',
      Intermediate: 'Intermedio',
      Advanced: 'Avanzado',
    },
    externalServicesRequired: 'Se requieren servicios externos',
    methods: {
      docker: {
        description:
          'Todo se ejecuta en contenedores. MongoDB, MeiliSearch, RAG API y Vector DB se incluyen automáticamente.',
      },
      npm: {
        description:
          'Ejecuta LibreChat directamente con Node.js. Tú mismo gestionas los servicios externos como MongoDB y MeiliSearch.',
      },
      helm: {
        description:
          'Despliega en Kubernetes usando Helm. Ideal para clústeres de producción y flujos de trabajo de infraestructura como código.',
      },
    },
    notRunningLocallyHeading: '¿No lo ejecutas localmente?',
    remoteHosting: {
      title: 'Alojamiento remoto',
      description: 'DigitalOcean, Railway, Azure y más',
    },
    envConfig: {
      title: 'Configuración de .env',
      description: 'Guía detallada de las variables de entorno',
    },
  },
  footer: {
    headings: {
      about: 'Acerca de',
      resources: 'Recursos',
      documentation: 'Documentación',
      blog: 'Blog',
      newsletter: 'Boletín',
      legal: 'Legal',
    },
    items: {
      about: 'Acerca de',
      contactUs: 'Contáctanos',
      features: 'Funciones',
      changelog: 'Registro de cambios',
      roadmap: 'Hoja de ruta',
      demo: 'Demo',
      status: 'Estado',
      getStarted: 'Comenzar',
      localInstall: 'Instalación local',
      remoteInstall: 'Instalación remota',
      blog: 'Blog',
      blogAuthors: 'Autores del blog',
      subscribe: 'Suscribirse',
      unsubscribe: 'Cancelar suscripción',
      termsOfService: 'Términos del servicio',
      privacyPolicy: 'Política de privacidad',
      cookiePolicy: 'Política de cookies',
    },
  },
  toolkit: {
    credentials: {
      generate: 'Generar credenciales',
      regenerate: 'Regenerar credenciales',
      generateAria: 'Generar nuevas credenciales',
      regenerateAria: 'Regenerar credenciales',
      regionAria: 'Credenciales generadas',
      copy: 'Copiar',
      copying: 'Copiando...',
      copied: 'Copiado',
      copyFailed: 'Error al copiar',
      copyAria: 'Copiar {label}',
      valueAria: 'Valor de {label}',
      copyAll: 'Copiar todo como .env',
      copiedAll: '¡Copiado al portapapeles!',
      copyAllAria: 'Copiar todas las credenciales como bloque .env',
      allCopiedStatus: 'Las 5 credenciales se copiaron en formato KEY=value',
      allCopyFailedStatus:
        'No se pudo copiar al portapapeles. Selecciona y copia los valores manualmente.',
      emptyPrefix:
        'Haz clic en el botón de arriba para generar credenciales aleatorias seguras para tu',
      emptySuffix: 'archivo.',
      hints: {
        CREDS_KEY: 'Clave de cifrado para credenciales almacenadas',
        CREDS_IV: 'Vector de inicialización para cifrado',
        JWT_SECRET: 'Secreto para firmar tokens de acceso',
        JWT_REFRESH_SECRET: 'Secreto para firmar tokens de actualización',
        MEILI_KEY: 'Clave maestra de MeiliSearch',
      },
    },
    yaml: {
      dropFile: 'Suelta el archivo YAML aquí',
      placeholder: 'Pega el contenido de librechat.yaml aquí, o arrastra y suelta un archivo...',
      empty: 'Los resultados de validación aparecerán aquí cuando pegues o sueltes contenido YAML.',
      valid: '¡El YAML es válido!',
      clear: 'Limpiar',
      clearAria: 'Limpiar editor',
      badIndentation:
        'Sangría incorrecta en la línea {line}. Cada entrada de YAML debe tener la sangría adecuada.',
      errorAtLine: '{reason} en la línea {line}',
      unknownError: 'Error YAML desconocido',
    },
  },
  home: {
    metaTitle: 'LibreChat - La plataforma de IA de código abierto',
    metaDescription:
      'LibreChat reúne todas tus conversaciones de IA en una interfaz unificada y personalizable.',
    starOnGitHub: 'Dar estrella en GitHub',
    starAria: 'Dale una estrella a LibreChat en GitHub — {count} estrellas',
    heroTitleTop: 'La plataforma de IA',
    heroTitleBottom: 'de código abierto',
    heroSubtitle:
      'LibreChat reúne todas tus conversaciones de IA en una interfaz unificada y personalizable',
    getStarted: 'Comenzar',
    getStartedAria: 'Comienza con la documentación de LibreChat',
    tryDemo: 'Probar la demo',
    tryDemoAria: 'Prueba la demo de LibreChat',
    desktopLightAlt: 'Interfaz de escritorio de LibreChat en modo claro',
    desktopDarkAlt: 'Interfaz de escritorio de LibreChat en modo oscuro',
    mobileLightAlt: 'Interfaz móvil de LibreChat en modo claro',
    mobileDarkAlt: 'Interfaz móvil de LibreChat en modo oscuro',
    trustedBy: 'Con la confianza de empresas de todo el mundo',
    featuresHeading: 'Todo lo que necesitas',
    featuresSubtitle: 'Una plataforma completa para conversaciones impulsadas por IA',
    primaryActionsAria: 'Acciones principales',
    features: {
      agents: {
        title: 'Agentes',
        description:
          'Agentes avanzados con gestión de archivos, interpretación de código y acciones de API',
      },
      codeInterpreter: {
        title: 'Intérprete de código',
        description: 'Ejecuta código en varios lenguajes de forma segura y sin configuración',
      },
      models: {
        title: 'Modelos',
        description: 'Selección de modelos de IA incluyendo Anthropic, AWS, OpenAI, Azure y más',
      },
      artifacts: {
        title: 'Artefactos',
        description: 'Crea código React, HTML y diagramas de Mermaid en el chat',
      },
      search: {
        title: 'Búsqueda',
        description: 'Busca mensajes, archivos y fragmentos de código al instante',
      },
      mcp: {
        title: 'MCP',
        description:
          'Conéctate a cualquier herramienta o servicio con compatibilidad con Model Context Protocol',
      },
      memory: {
        title: 'Memoria',
        description: 'Contexto persistente entre conversaciones para que tu IA te recuerde',
      },
      webSearch: {
        title: 'Búsqueda web',
        description:
          'Dale a cualquier modelo acceso a internet en tiempo real con búsqueda y reordenamiento integrados',
      },
      authentication: {
        title: 'Autenticación',
        description:
          'SSO listo para empresas con OAuth, SAML, LDAP y autenticación de dos factores',
      },
    },
    learnMore: 'Más información',
    communityHeading: 'Código abierto, impulsado por la comunidad',
    communitySubtitle:
      'Únete a miles de desarrolladores y organizaciones que construyen con LibreChat',
    githubStars: 'Estrellas en GitHub',
    dockerPulls: 'Descargas de Docker',
    contributors: 'Colaboradores',
    communityLinksAria: 'Enlaces de la comunidad',
    githubAria: 'LibreChat en GitHub',
    discordAria: 'LibreChat en Discord',
    ctaHeading: 'Empieza a construir con LibreChat',
    ctaSubtitle: 'Ponte en marcha en minutos con nuestra guía de inicio rápido',
    quickstartGuide: 'Guía de inicio rápido',
    quickstartAria: 'Lee la guía de inicio rápido',
  },
}

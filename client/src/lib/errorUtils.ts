/**
 * Utilitários para tratamento de erros específicos
 * Converte erros genéricos em mensagens úteis para o usuário
 */

export interface ErrorInfo {
  title: string;
  description: string;
  suggestion?: string;
}

/**
 * Analisa erros de upload e retorna mensagens específicas
 */
export function parseUploadError(error: any, response?: Response): ErrorInfo {
  // Erros de resposta HTTP
  if (response) {
    switch (response.status) {
      case 413:
        return {
          title: "Arquivos muito grandes",
          description: "Reduza o tamanho das imagens ou envie menos fotos por vez",
          suggestion: "Tente comprimir as imagens antes do upload"
        };
      case 401:
        return {
          title: "Sessão expirada",
          description: "Faça login novamente para continuar",
          suggestion: "Recarregue a página e entre novamente"
        };
      case 403:
        return {
          title: "Limite de uploads atingido",
          description: "Você atingiu o limite do seu plano atual",
          suggestion: "Considere fazer upgrade do seu plano"
        };
      case 404:
        return {
          title: "Projeto não encontrado",
          description: "O projeto foi removido ou você não tem mais acesso",
          suggestion: "Verifique se o projeto ainda existe"
        };
      case 429:
        return {
          title: "Muitas tentativas",
          description: "Aguarde alguns minutos antes de tentar novamente",
          suggestion: "Limite de requisições temporariamente excedido"
        };
      case 500:
      case 502:
      case 503:
        return {
          title: "Problema no servidor",
          description: "Nosso sistema está temporariamente indisponível",
          suggestion: "Tente novamente em alguns minutos"
        };
      default:
        return {
          title: "Erro durante o upload",
          description: "Erro desconhecido do servidor",
          suggestion: "Tente recarregar a página"
        };
    }
  }

  // Erros de rede/conexão
  if (error?.name === "TypeError" && error.message.includes("fetch")) {
    return {
      title: "Sem conexão com o servidor",
      description: "Verifique sua conexão com a internet",
      suggestion: "Tente novamente quando a conexão estiver estável"
    };
  }

  if (error?.name === "AbortError") {
    return {
      title: "Upload cancelado",
      description: "O upload foi interrompido",
      suggestion: "Tente novamente se necessário"
    };
  }

  if (error?.message?.includes("timeout")) {
    return {
      title: "Tempo limite excedido",
      description: "Conexão muito lenta ou arquivos muito grandes",
      suggestion: "Tente com menos fotos ou verifique sua conexão"
    };
  }

  // Erros específicos do sistema
  if (error instanceof Error) {
    const errorMsg = error.message.toLowerCase();

    if (errorMsg.includes("memory") || errorMsg.includes("heap")) {
      return {
        title: "Memória insuficiente",
        description: "Muitas fotos selecionadas para processar",
        suggestion: "Tente com menos imagens por vez"
      };
    }

    if (errorMsg.includes("storage") || errorMsg.includes("bucket") || errorMsg.includes("r2")) {
      return {
        title: "Erro no sistema de armazenamento",
        description: "Nosso servidor de arquivos está temporariamente indisponível",
        suggestion: "Tente novamente em alguns minutos"
      };
    }

    if (errorMsg.includes("quota") || errorMsg.includes("limit")) {
      return {
        title: "Limite de conta atingido",
        description: "Você atingiu o limite de uploads do seu plano",
        suggestion: "Considere fazer upgrade para continuar"
      };
    }

    if (errorMsg.includes("format") || errorMsg.includes("type")) {
      return {
        title: "Formato de arquivo inválido",
        description: "Apenas imagens JPG, PNG e WEBP são permitidas",
        suggestion: "Converta seus arquivos para um formato suportado"
      };
    }

    if (errorMsg.includes("cache") || errorMsg.includes("localstorage")) {
      return {
        title: "Problema no cache do navegador",
        description: "Cache do navegador corrompido ou cheio",
        suggestion: "Limpe o cache do navegador e tente novamente"
      };
    }

    if (errorMsg.includes("network") || errorMsg.includes("connection")) {
      return {
        title: "Problema de conexão",
        description: "Instabilidade na conexão com o servidor",
        suggestion: "Verifique sua internet e tente novamente"
      };
    }
  }

  // Erro genérico como fallback
  return {
    title: "Erro durante o upload",
    description: "Ocorreu um problema inesperado",
    suggestion: "Tente recarregar a página ou entre em contato com o suporte"
  };
}

/**
 * Analisa erros de autenticação
 */
export function parseAuthError(error: any, response?: Response): ErrorInfo {
  if (response?.status === 401) {
    return {
      title: "Credenciais inválidas",
      description: "Email ou senha incorretos",
      suggestion: "Verifique seus dados e tente novamente"
    };
  }

  if (response?.status === 403) {
    return {
      title: "Acesso negado",
      description: "Você não tem permissão para esta ação",
      suggestion: "Entre em contato com o administrador"
    };
  }

  if (response?.status === 429) {
    return {
      title: "Muitas tentativas de login",
      description: "Aguarde alguns minutos antes de tentar novamente",
      suggestion: "Tente usar a recuperação de senha se necessário"
    };
  }

  return parseUploadError(error, response);
}

/**
 * Analisa erros de projeto (criação, edição, etc.)
 */
export function parseProjectError(error: any, response?: Response): ErrorInfo {
  if (response?.status === 404) {
    return {
      title: "Projeto não encontrado",
      description: "O projeto foi removido ou você não tem acesso",
      suggestion: "Verifique se o projeto ainda existe"
    };
  }

  if (response?.status === 409) {
    return {
      title: "Conflito de dados",
      description: "Já existe um projeto com esse nome",
      suggestion: "Escolha um nome diferente para o projeto"
    };
  }

  return parseUploadError(error, response);
}

/**
 * Função utilitária para usar com toast
 */
export function showErrorToast(error: any, response?: Response, type: 'upload' | 'auth' | 'project' = 'upload') {
  let errorInfo: ErrorInfo;

  switch (type) {
    case 'auth':
      errorInfo = parseAuthError(error, response);
      break;
    case 'project':
      errorInfo = parseProjectError(error, response);
      break;
    default:
      errorInfo = parseUploadError(error, response);
  }

  return {
    title: errorInfo.title,
    description: errorInfo.suggestion ? 
      `${errorInfo.description}\n\n${errorInfo.suggestion}` : 
      errorInfo.description,
    variant: "destructive" as const
  };
}
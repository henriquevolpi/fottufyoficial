import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`Fazendo requisição ${method} para ${url}`, data ? data : '');
  
  try {
    // Detectar se estamos no preview do Replit
    const isReplitPreview = window.location.hostname.includes('replit.dev') || 
                            window.location.hostname.includes('repl.co') ||
                            window.parent !== window;
    
    // CRITICAL FIX: Enhanced request options with stronger credentials and headers
    const options: RequestInit = {
      method,
      credentials: "include", // Always include credentials
      headers: {
        // Always include these headers for better CORS support
        "X-Requested-With": "XMLHttpRequest",
        "Cache-Control": "no-cache",
        "Accept": "application/json",
        // Only add Content-Type when sending data
        ...(data ? { "Content-Type": "application/json" } : {}),
        // Para Replit, adicionar headers específicos
        ...(isReplitPreview ? {
          "X-Replit-Preview": "true",
          "Pragma": "no-cache"
        } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
    };
    
    // Log the full request configuration for debugging
    console.log(`Request configuration:`, { 
      url, 
      method, 
      credentials: options.credentials,
      headers: options.headers
    });
    
    // Log existing cookies para debug
    console.log('Cookies antes da requisição:', document.cookie);
    
    const res = await fetch(url, options);
    
    // Log the response including cookies
    console.log(`Resposta recebida de ${url}:`, {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      hasCookies: res.headers.has('set-cookie')
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Erro na requisição para ${url}:`, res.status, errorText);
      throw new Error(`${res.status}: ${errorText || res.statusText}`);
    }
    
    return res;
  } catch (error) {
    console.error(`Falha na requisição ${method} para ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    
    console.log(`Query request for ${url}`, {
      queryKey,
      on401: unauthorizedBehavior
    });
    
    // CRITICAL FIX: Enhanced fetch with proper credentials and headers
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Cache-Control": "no-cache" // Prevent caching issues with auth state
      }
    });
    
    // Log the response including headers
    console.log(`Query response from ${url}:`, {
      status: res.status,
      statusText: res.statusText, 
      headers: Object.fromEntries(res.headers.entries()),
      hasCookies: res.headers.has('set-cookie')
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log(`Returning null for 401 on ${url} as configured`);
      return null;
    }

    // Detailed error handling
    if (!res.ok) {
      try {
        const errorData = await res.json();
        console.error(`Error from ${url}:`, errorData);
        throw new Error(errorData.message || `${res.status}: ${res.statusText}`);
      } catch (e) {
        const errorText = await res.text();
        console.error(`Error text from ${url}:`, errorText);
        throw new Error(`${res.status}: ${errorText || res.statusText}`);
      }
    }
    
    // Parse JSON response
    const data = await res.json();
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

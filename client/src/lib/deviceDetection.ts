/**
 * Utilitário para detecção de dispositivos e capabilities
 * Apenas detecta e loga - não altera comportamento de upload
 */

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  browser: 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'other';
  isEmbeddedBrowser: boolean;
  estimatedRAM: 'low' | 'medium' | 'high' | 'unknown';
}

export interface BrowserCapabilities {
  supportsWebWorker: boolean;
  supportsLargeFormData: boolean;
  supportsFileAPI: boolean;
  supportsBlobURLs: boolean;
  maxConcurrentConnections: number;
}

export interface ConnectionInfo {
  type: '2g' | '3g' | '4g' | 'wifi' | 'unknown';
  effectiveType: string;
  downlink: number; // Mbps
  rtt: number; // ms
  isSlowConnection: boolean;
}

/**
 * Detecta informações do dispositivo atual
 */
export function detectDevice(): DeviceInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Detectar tipo de dispositivo
  let type: DeviceInfo['type'] = 'desktop';
  if (/mobile|android|iphone|ipod/.test(userAgent)) {
    type = 'mobile';
  } else if (/tablet|ipad/.test(userAgent)) {
    type = 'tablet';
  }
  
  // Detectar OS
  let os: DeviceInfo['os'] = 'unknown';
  if (/iphone|ipad|ipod/.test(userAgent)) {
    os = 'ios';
  } else if (/android/.test(userAgent)) {
    os = 'android';
  } else if (/windows/.test(userAgent)) {
    os = 'windows';
  } else if (/mac/.test(userAgent)) {
    os = 'macos';
  } else if (/linux/.test(userAgent)) {
    os = 'linux';
  }
  
  // Detectar browser
  let browser: DeviceInfo['browser'] = 'other';
  if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
    browser = 'safari';
  } else if (/chrome/.test(userAgent)) {
    browser = 'chrome';
  } else if (/firefox/.test(userAgent)) {
    browser = 'firefox';
  } else if (/edge/.test(userAgent)) {
    browser = 'edge';
  } else if (/samsungbrowser/.test(userAgent)) {
    browser = 'samsung';
  }
  
  // Detectar se é navegador incorporado
  const isEmbeddedBrowser = 
    /fbav|instagram|twitter|linkedin|wechat|line/.test(userAgent) ||
    userAgent.includes('webview') ||
    userAgent.includes('app');
  
  // Estimar RAM baseado em device
  let estimatedRAM: DeviceInfo['estimatedRAM'] = 'unknown';
  if (type === 'mobile') {
    if (os === 'ios') {
      // iPhones antigos geralmente têm menos RAM
      if (/iphone\s+os\s+[1-9]|iphone\s+os\s+1[0-3]/.test(userAgent)) {
        estimatedRAM = 'low';
      } else {
        estimatedRAM = 'medium';
      }
    } else if (os === 'android') {
      // Android é mais variado, assumir médio por padrão
      estimatedRAM = 'medium';
    }
  } else {
    estimatedRAM = 'high';
  }
  
  return {
    type,
    os,
    browser,
    isEmbeddedBrowser,
    estimatedRAM
  };
}

/**
 * Testa capabilities do navegador
 */
export function detectBrowserCapabilities(): BrowserCapabilities {
  const capabilities: BrowserCapabilities = {
    supportsWebWorker: false,
    supportsLargeFormData: false,
    supportsFileAPI: false,
    supportsBlobURLs: false,
    maxConcurrentConnections: 6
  };
  
  // Testar Web Workers
  try {
    capabilities.supportsWebWorker = typeof Worker !== 'undefined';
  } catch (e) {
    capabilities.supportsWebWorker = false;
  }
  
  // Testar File API
  try {
    capabilities.supportsFileAPI = 
      typeof File !== 'undefined' && 
      typeof FileReader !== 'undefined' && 
      typeof FormData !== 'undefined';
  } catch (e) {
    capabilities.supportsFileAPI = false;
  }
  
  // Testar Blob URLs
  try {
    capabilities.supportsBlobURLs = 
      typeof URL !== 'undefined' && 
      typeof URL.createObjectURL === 'function';
  } catch (e) {
    capabilities.supportsBlobURLs = false;
  }
  
  // Testar FormData com muitos arquivos (teste básico)
  try {
    const testFormData = new FormData();
    for (let i = 0; i < 100; i++) {
      testFormData.append(`test${i}`, 'test');
    }
    capabilities.supportsLargeFormData = true;
  } catch (e) {
    capabilities.supportsLargeFormData = false;
  }
  
  // Estimar conexões concorrentes baseado no navegador
  const userAgent = navigator.userAgent.toLowerCase();
  if (/mobile/.test(userAgent)) {
    capabilities.maxConcurrentConnections = 4; // Móbile geralmente tem menos
  } else if (/chrome/.test(userAgent)) {
    capabilities.maxConcurrentConnections = 6;
  } else if (/firefox/.test(userAgent)) {
    capabilities.maxConcurrentConnections = 6;
  } else if (/safari/.test(userAgent)) {
    capabilities.maxConcurrentConnections = 6;
  }
  
  return capabilities;
}

/**
 * Detecta informações de conexão (se disponível)
 */
export function detectConnection(): ConnectionInfo {
  const defaultInfo: ConnectionInfo = {
    type: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    isSlowConnection: false
  };
  
  // Usar Network Information API se disponível
  try {
    const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
    
    if (connection) {
      const info: ConnectionInfo = {
        type: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        isSlowConnection: false
      };
      
      // Determinar se é conexão lenta
      info.isSlowConnection = 
        info.effectiveType === '2g' || 
        info.effectiveType === 'slow-2g' ||
        (info.downlink > 0 && info.downlink < 1) ||
        (info.rtt > 0 && info.rtt > 1000);
      
      return info;
    }
  } catch (e) {
    // API não disponível
  }
  
  return defaultInfo;
}

/**
 * Loga informações completas do ambiente
 */
export function logEnvironmentInfo(): void {
  const device = detectDevice();
  const capabilities = detectBrowserCapabilities();
  const connection = detectConnection();
  
  console.log('=== DEVICE DETECTION ===');
  console.log('Device Info:', device);
  console.log('Browser Capabilities:', capabilities);
  console.log('Connection Info:', connection);
  console.log('Memory Info:', {
    jsHeapSizeLimit: (performance as any).memory?.jsHeapSizeLimit || 'unknown',
    totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 'unknown',
    usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 'unknown'
  });
  console.log('========================');
}

/**
 * Retorna configurações recomendadas baseadas no ambiente
 */
export function getRecommendedUploadSettings(): {
  batchSize: number;
  quality: number;
  useWebWorker: boolean;
  maxFileSize: number;
  warnings: string[];
} {
  const device = detectDevice();
  const capabilities = detectBrowserCapabilities();
  const connection = detectConnection();
  
  const settings = {
    batchSize: 30,
    quality: 0.9,
    useWebWorker: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    warnings: [] as string[]
  };
  
  // Ajustar baseado no device (apenas recomendações, não força)
  if (device.estimatedRAM === 'low') {
    settings.batchSize = 10;
    settings.quality = 0.8;
    settings.warnings.push('Dispositivo com pouca memória detectado - considere uploads menores');
  }
  
  if (device.isEmbeddedBrowser) {
    settings.warnings.push('Navegador incorporado detectado - para melhor experiência, use o navegador nativo');
  }
  
  if (!capabilities.supportsWebWorker) {
    settings.useWebWorker = false;
    settings.warnings.push('Web Workers não suportados - processamento será mais lento');
  }
  
  if (connection.isSlowConnection) {
    settings.warnings.push('Conexão lenta detectada - upload pode demorar mais');
  }
  
  return settings;
}
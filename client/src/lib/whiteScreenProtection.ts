/**
 * Sistema de proteção contra tela branca durante uploads
 * Monitora memory pressure, UI responsiveness e força cleanup quando necessário
 */

export interface MemoryStatus {
  usedMB: number;
  totalMB: number;
  usagePercentage: number;
  isLowMemory: boolean;
  isCriticalMemory: boolean;
}

export interface DeviceCapacity {
  isMobile: boolean;
  isLowPowerDevice: boolean;
  estimatedMaxSafeFiles: number;
  recommendedBatchSize: number;
}

/**
 * Monitora o status da memória em tempo real
 */
export function getMemoryStatus(): MemoryStatus {
  const memInfo = (window.performance as any)?.memory;
  
  if (!memInfo) {
    return {
      usedMB: 0,
      totalMB: 0,
      usagePercentage: 0,
      isLowMemory: false,
      isCriticalMemory: false
    };
  }

  const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
  const totalMB = Math.round(memInfo.totalJSHeapSize / 1024 / 1024);
  const usagePercentage = Math.round((memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100);

  return {
    usedMB,
    totalMB,
    usagePercentage,
    isLowMemory: usagePercentage > 75,
    isCriticalMemory: usagePercentage > 90
  };
}

/**
 * Detecta capacidade do dispositivo e recomenda configurações seguras
 */
export function detectDeviceCapacity(): DeviceCapacity {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const cores = navigator.hardwareConcurrency || 1;
  const isLowPowerDevice = cores <= 2 || isMobile;
  
  // Configurações conservadoras baseadas no dispositivo
  const estimatedMaxSafeFiles = isMobile ? 30 : isLowPowerDevice ? 100 : 200;
  const recommendedBatchSize = isMobile ? 10 : isLowPowerDevice ? 20 : 30;

  return {
    isMobile,
    isLowPowerDevice,
    estimatedMaxSafeFiles,
    recommendedBatchSize
  };
}

/**
 * Força limpeza de memória se disponível
 */
export function forceMemoryCleanup(): Promise<void> {
  return new Promise((resolve) => {
    // Força garbage collection se disponível
    if ((window as any).gc) {
      try {
        (window as any).gc();
      } catch (e) {
        console.warn('Manual garbage collection failed:', e);
      }
    }
    
    // Pausa para permitir limpeza
    setTimeout(() => {
      resolve();
    }, 100);
  });
}

/**
 * Verifica se é seguro continuar processamento
 */
export function isSafeToContinue(): boolean {
  const memory = getMemoryStatus();
  
  if (memory.isCriticalMemory) {
    console.warn(`🚨 CRITICAL MEMORY: ${memory.usagePercentage}% used`);
    return false;
  }
  
  // Verificar se browser ainda responde
  const start = performance.now();
  const dummy = document.createElement('div');
  document.body.appendChild(dummy);
  document.body.removeChild(dummy);
  const responseTime = performance.now() - start;
  
  if (responseTime > 100) { // >100ms para operação simples indica problema
    console.warn(`🚨 UI UNRESPONSIVE: ${responseTime}ms for DOM operation`);
    return false;
  }
  
  return true;
}

/**
 * Implementa pausa inteligente baseada no status do sistema
 */
export async function smartPause(): Promise<void> {
  const memory = getMemoryStatus();
  
  let pauseTime = 10; // Pausa base
  
  if (memory.isCriticalMemory) {
    pauseTime = 500; // Pausa longa para recuperação
    await forceMemoryCleanup();
  } else if (memory.isLowMemory) {
    pauseTime = 100; // Pausa média
  }
  
  await new Promise(resolve => setTimeout(resolve, pauseTime));
}

/**
 * Monitora UI responsiveness em tempo real
 */
export class UIResponsivenessMonitor {
  private isMonitoring = false;
  private lastCheck = 0;
  private unresponsiveCount = 0;
  private callback?: (isResponsive: boolean) => void;

  start(callback: (isResponsive: boolean) => void) {
    this.callback = callback;
    this.isMonitoring = true;
    this.lastCheck = performance.now();
    this.unresponsiveCount = 0;
    this.monitor();
  }

  stop() {
    this.isMonitoring = false;
    this.callback = undefined;
  }

  private monitor() {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const timeSinceLastCheck = now - this.lastCheck;
    
    // Se passou mais de 2 segundos desde última verificação, UI pode estar travada
    if (timeSinceLastCheck > 2000) {
      this.unresponsiveCount++;
      
      if (this.unresponsiveCount >= 2 && this.callback) {
        this.callback(false); // UI não responsiva
      }
    } else {
      this.unresponsiveCount = 0;
      if (this.callback) {
        this.callback(true); // UI responsiva
      }
    }
    
    this.lastCheck = now;
    
    // Agendar próxima verificação
    setTimeout(() => this.monitor(), 1000);
  }
}
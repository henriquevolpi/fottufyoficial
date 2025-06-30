/**
 * Sistema de analytics para uploads - apenas coleta dados, não altera comportamento
 * Totalmente seguro - se falhar, não afeta upload
 */

export interface UploadSession {
  sessionId: string;
  startTime: number;
  device: any;
  capabilities: any;
  connection: any;
  totalFiles: number;
  totalSizeBytes: number;
  events: UploadEvent[];
}

export interface UploadEvent {
  timestamp: number;
  type: 'start' | 'compression_start' | 'compression_end' | 'upload_start' | 'upload_progress' | 'upload_end' | 'error' | 'warning';
  data: any;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
}

class UploadAnalytics {
  private currentSession: UploadSession | null = null;
  private isEnabled: boolean = true;

  /**
   * Inicia uma nova sessão de analytics
   */
  startSession(totalFiles: number, totalSizeBytes: number, deviceInfo: any): string {
    try {
      const sessionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.currentSession = {
        sessionId,
        startTime: Date.now(),
        device: deviceInfo.device || {},
        capabilities: deviceInfo.capabilities || {},
        connection: deviceInfo.connection || {},
        totalFiles,
        totalSizeBytes,
        events: []
      };
      
      // Log inicial
      this.logEvent('start', {
        totalFiles,
        totalSizeBytes,
        avgFileSizeMB: (totalSizeBytes / totalFiles / 1024 / 1024).toFixed(2)
      });
      
      console.log(`[Upload Analytics] Sessão iniciada: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.warn('[Upload Analytics] Erro ao iniciar sessão:', error);
      return 'fallback_session';
    }
  }

  /**
   * Registra um evento da sessão atual
   */
  logEvent(type: UploadEvent['type'], data: any): void {
    if (!this.isEnabled || !this.currentSession) return;
    
    try {
      const memoryUsage = this.getMemoryUsage();
      
      const event: UploadEvent = {
        timestamp: Date.now(),
        type,
        data,
        memoryUsage
      };
      
      this.currentSession.events.push(event);
      
      // Log específico baseado no tipo
      switch (type) {
        case 'compression_start':
          console.log(`[Upload Analytics] Iniciando compressão de ${data.fileCount} arquivos`);
          break;
        case 'compression_end':
          console.log(`[Upload Analytics] Compressão concluída em ${data.durationMs}ms - Redução: ${data.compressionRatio}%`);
          break;
        case 'upload_progress':
          console.log(`[Upload Analytics] Progresso: ${data.percentage}% - ${data.filesProcessed}/${data.totalFiles} arquivos`);
          break;
        case 'error':
          console.error(`[Upload Analytics] Erro: ${data.message}`, data);
          break;
        case 'warning':
          console.warn(`[Upload Analytics] Aviso: ${data.message}`, data);
          break;
      }
      
      // Alertar sobre uso de memória alto
      if (memoryUsage && memoryUsage.percentage > 85) {
        this.logEvent('warning', {
          message: 'Alto uso de memória detectado',
          memoryPercentage: memoryUsage.percentage
        });
      }
    } catch (error) {
      // Falha silenciosa - não deve afetar upload
      console.warn('[Upload Analytics] Erro ao registrar evento:', error);
    }
  }

  /**
   * Finaliza a sessão atual e gera relatório
   */
  endSession(success: boolean, finalData?: any): void {
    if (!this.currentSession) return;
    
    try {
      const duration = Date.now() - this.currentSession.startTime;
      
      this.logEvent('upload_end', {
        success,
        durationMs: duration,
        durationSeconds: Math.round(duration / 1000),
        ...finalData
      });
      
      // Gerar relatório da sessão
      this.generateSessionReport();
      
      console.log(`[Upload Analytics] Sessão finalizada: ${this.currentSession.sessionId} - ${success ? 'Sucesso' : 'Falha'}`);
      
      // Salvar dados para análise futura (localStorage)
      this.saveSessionData();
      
      this.currentSession = null;
    } catch (error) {
      console.warn('[Upload Analytics] Erro ao finalizar sessão:', error);
    }
  }

  /**
   * Gera relatório detalhado da sessão
   */
  private generateSessionReport(): void {
    if (!this.currentSession) return;
    
    try {
      const session = this.currentSession;
      const events = session.events;
      
      // Calcular métricas
      const totalDuration = Date.now() - session.startTime;
      const compressionEvents = events.filter(e => e.type === 'compression_start' || e.type === 'compression_end');
      const progressEvents = events.filter(e => e.type === 'upload_progress');
      const errorEvents = events.filter(e => e.type === 'error');
      const warningEvents = events.filter(e => e.type === 'warning');
      
      // Relatório
      console.log('=== UPLOAD SESSION REPORT ===');
      console.log(`Session ID: ${session.sessionId}`);
      console.log(`Device: ${session.device.type} - ${session.device.os} - ${session.device.browser}`);
      console.log(`Files: ${session.totalFiles} (${(session.totalSizeBytes / 1024 / 1024).toFixed(2)} MB total)`);
      console.log(`Duration: ${Math.round(totalDuration / 1000)}s`);
      console.log(`Events: ${events.length} total`);
      console.log(`Errors: ${errorEvents.length}`);
      console.log(`Warnings: ${warningEvents.length}`);
      
      if (session.connection.isSlowConnection) {
        console.log('⚠️ Conexão lenta detectada');
      }
      
      if (session.device.isEmbeddedBrowser) {
        console.log('⚠️ Navegador incorporado detectado');
      }
      
      if (!session.capabilities.supportsWebWorker) {
        console.log('⚠️ Web Workers não suportados');
      }
      
      // Picos de memória
      const memoryPeaks = events.filter(e => e.memoryUsage && e.memoryUsage.percentage > 90);
      if (memoryPeaks.length > 0) {
        console.log(`⚠️ ${memoryPeaks.length} picos de memória detectados (>90%)`);
      }
      
      console.log('=============================');
    } catch (error) {
      console.warn('[Upload Analytics] Erro ao gerar relatório:', error);
    }
  }

  /**
   * Salva dados da sessão para análise futura
   */
  private saveSessionData(): void {
    if (!this.currentSession) return;
    
    try {
      const key = `upload_session_${this.currentSession.sessionId}`;
      const data = {
        ...this.currentSession,
        savedAt: Date.now()
      };
      
      localStorage.setItem(key, JSON.stringify(data));
      
      // Manter apenas as últimas 10 sessões
      this.cleanupOldSessions();
    } catch (error) {
      // Falha silenciosa - não é crítico
      console.warn('[Upload Analytics] Erro ao salvar sessão:', error);
    }
  }

  /**
   * Remove sessões antigas do localStorage
   */
  private cleanupOldSessions(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('upload_session_'));
      
      if (keys.length > 10) {
        // Ordenar por timestamp e remover as mais antigas
        const sessions = keys.map(key => ({
          key,
          data: JSON.parse(localStorage.getItem(key) || '{}')
        })).sort((a, b) => b.data.savedAt - a.data.savedAt);
        
        // Remover sessões excedentes
        sessions.slice(10).forEach(session => {
          localStorage.removeItem(session.key);
        });
      }
    } catch (error) {
      console.warn('[Upload Analytics] Erro na limpeza de sessões:', error);
    }
  }

  /**
   * Obtém informações de uso de memória
   */
  private getMemoryUsage(): UploadEvent['memoryUsage'] | undefined {
    try {
      const memory = (performance as any).memory;
      if (memory) {
        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
        };
      }
    } catch (error) {
      // API não disponível ou erro
    }
    return undefined;
  }

  /**
   * Desabilita analytics (para debugging)
   */
  disable(): void {
    this.isEnabled = false;
    console.log('[Upload Analytics] Analytics desabilitados');
  }

  /**
   * Habilita analytics
   */
  enable(): void {
    this.isEnabled = true;
    console.log('[Upload Analytics] Analytics habilitados');
  }

  /**
   * Obtém estatísticas de sessões anteriores
   */
  getPreviousSessionsStats(): any {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('upload_session_'));
      const sessions = keys.map(key => JSON.parse(localStorage.getItem(key) || '{}'));
      
      if (sessions.length === 0) return null;
      
      const stats = {
        totalSessions: sessions.length,
        successfulSessions: sessions.filter(s => {
          const lastEvent = s.events?.[s.events.length - 1];
          return lastEvent?.type === 'upload_end' && lastEvent?.data?.success;
        }).length,
        averageDuration: 0,
        commonIssues: [] as string[]
      };
      
      // Calcular duração média
      const durations = sessions.map(s => {
        const lastEvent = s.events?.[s.events.length - 1];
        return lastEvent?.data?.durationMs || 0;
      }).filter(d => d > 0);
      
      if (durations.length > 0) {
        stats.averageDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 1000);
      }
      
      // Identificar problemas comuns
      const issues = sessions.map(s => {
        const warnings = s.events?.filter((e: any) => e.type === 'warning') || [];
        return warnings.map((w: any) => w.data?.message || 'unknown');
      }).flat();
      
      const issueCounts = issues.reduce((acc: any, issue: string) => {
        acc[issue] = (acc[issue] || 0) + 1;
        return acc;
      }, {});
      
      stats.commonIssues = Object.entries(issueCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([issue]) => issue);
      
      return stats;
    } catch (error) {
      console.warn('[Upload Analytics] Erro ao obter estatísticas:', error);
      return null;
    }
  }
}

// Instância singleton
export const uploadAnalytics = new UploadAnalytics();

// Função helper para usar nos componentes
export function useUploadAnalytics() {
  return {
    startSession: uploadAnalytics.startSession.bind(uploadAnalytics),
    logEvent: uploadAnalytics.logEvent.bind(uploadAnalytics),
    endSession: uploadAnalytics.endSession.bind(uploadAnalytics),
    getPreviousStats: uploadAnalytics.getPreviousSessionsStats.bind(uploadAnalytics)
  };
}
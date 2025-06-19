/**
 * Sistema Completo de Proteção Contra Tela Branca
 * 
 * Combina todos os componentes de proteção em um sistema unificado:
 * - Indicador global sempre visível
 * - Overlay de emergência para casos extremos
 * - Detecção automática de travamentos
 * - Persistência de estado entre recarregamentos
 */

import React from 'react';
import { GlobalUploadIndicator } from './global-upload-indicator';
import { UploadFallbackOverlay } from './upload-fallback-overlay';
import { UploadDemoButton } from './upload-demo-button';
import { useGlobalUploadProtection } from '@/hooks/use-upload-protection';

export function UploadProtectionSystem() {
  const {
    uploadState,
    timeElapsed,
    estimatedTimeRemaining,
    showEmergencyOverlay,
    isUIResponsive
  } = useGlobalUploadProtection();

  const formatTimeRemaining = (seconds: number | null) => {
    if (!seconds) return 'Calculando...';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getDetailedMessage = () => {
    if (showEmergencyOverlay) {
      return `${uploadState.currentStep} • Tempo restante: ${formatTimeRemaining(estimatedTimeRemaining)}`;
    }
    return uploadState.currentStep;
  };

  return (
    <>
      {/* Indicador Global - Sempre visível durante uploads */}
      <GlobalUploadIndicator
        isUploading={uploadState.isActive}
        progress={uploadState.progress}
        currentStep={uploadState.currentStep}
        filesProcessed={uploadState.filesProcessed}
        totalFiles={uploadState.totalFiles}
      />

      {/* Overlay de Emergência - Apenas quando UI trava */}
      {showEmergencyOverlay && (
        <UploadFallbackOverlay
          isActive={uploadState.isActive}
          progress={uploadState.progress}
          message={getDetailedMessage()}
          timeElapsed={timeElapsed}
        />
      )}

      {/* Notificação de Status da UI (apenas para debug) */}
      {process.env.NODE_ENV === 'development' && uploadState.isActive && (
        <div className="fixed bottom-4 right-4 z-[9998] bg-gray-800 text-white text-xs p-2 rounded">
          UI Status: {isUIResponsive ? '✅ Responsiva' : '⚠️ Possível travamento'}
          <br />
          Tempo: {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
          {estimatedTimeRemaining && (
            <>
              <br />
              ETA: {formatTimeRemaining(estimatedTimeRemaining)}
            </>
          )}
        </div>
      )}

      {/* Botão de demonstração (apenas em desenvolvimento) */}
      <UploadDemoButton />
    </>
  );
}
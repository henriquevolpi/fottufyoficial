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
    </>
  );
}
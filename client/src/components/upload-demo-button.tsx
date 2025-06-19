/**
 * Botão de Demonstração do Sistema de Proteção
 * 
 * Este componente permite testar o sistema de proteção contra tela branca
 * simulando um upload longo para verificar se todos os indicadores funcionam corretamente.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { useGlobalUploadProtection } from '@/hooks/use-upload-protection';

export function UploadDemoButton() {
  const {
    startUpload,
    updateProgress,
    reportActivity,
    finishUpload,
    forceEmergencyMode,
    uploadState
  } = useGlobalUploadProtection();

  const simulateUpload = async () => {
    if (uploadState.isActive) {
      return; // Já tem upload ativo
    }

    // Simular upload de 100 fotos
    startUpload(100);

    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms por step
      
      const step = i <= 30 
        ? `Comprimindo imagens... ${Math.floor(i * 3.33)}/100`
        : i <= 90 
        ? `Enviando para o servidor... lote ${Math.floor((i-30)/10) + 1}/6`
        : `Finalizando projeto...`;
      
      updateProgress(i, step, Math.floor(i));
      reportActivity();
    }

    finishUpload();
  };

  const testEmergencyMode = () => {
    if (!uploadState.isActive) {
      startUpload(50);
      updateProgress(25, "Processando imagens...", 12);
    }
    forceEmergencyMode();
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Só mostrar em desenvolvimento
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9997] bg-gray-800 text-white p-3 rounded-lg text-xs">
      <div className="mb-2 font-medium">Teste Sistema Proteção</div>
      <div className="space-y-2">
        <Button 
          size="sm" 
          variant="outline"
          onClick={simulateUpload}
          disabled={uploadState.isActive}
          className="text-xs h-7"
        >
          Simular Upload
        </Button>
        <Button 
          size="sm" 
          variant="destructive"
          onClick={testEmergencyMode}
          className="text-xs h-7"
        >
          Testar Emergência
        </Button>
      </div>
      {uploadState.isActive && (
        <div className="mt-2 text-xs">
          Status: {Math.round(uploadState.progress)}%
        </div>
      )}
    </div>
  );
}
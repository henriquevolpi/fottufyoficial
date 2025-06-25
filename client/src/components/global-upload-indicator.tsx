/**
 * Indicador Global de Upload
 * 
 * Componente que fica sempre visível durante uploads grandes,
 * mesmo se o modal principal travar ou ficar inacessível.
 * Utiliza position: fixed com z-index alto para sempre estar visível.
 */

import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';

interface GlobalUploadIndicatorProps {
  isUploading: boolean;
  progress: number;
  currentStep: string;
  filesProcessed: number;
  totalFiles: number;
}

export function GlobalUploadIndicator({
  isUploading,
  progress,
  currentStep,
  filesProcessed,
  totalFiles
}: GlobalUploadIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isUploading) {
      setIsVisible(true);
    } else {
      // Esconder imediatamente quando não há upload
      setIsVisible(false);
    }
  }, [isUploading]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] bg-white shadow-2xl border border-gray-200 rounded-lg p-4 min-w-[400px] max-w-[500px]">
      <div className="flex items-center space-x-3">
        {/* Spinner animado */}
        <div className="flex-shrink-0">
          {isUploading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          ) : (
            <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-900">
              {isUploading ? 'Processando Fotos...' : 'Upload Concluído!'}
            </span>
            <span className="text-xs text-gray-500">
              {filesProcessed}/{totalFiles}
            </span>
          </div>

          <Progress value={progress} className="h-2 mb-2" />

          <div className="text-xs text-gray-600">
            {currentStep}
          </div>
        </div>
      </div>

      {/* Botão de cancelar (se necessário) */}
      {isUploading && (
        <div className="mt-3 text-center">
          <button 
            className="text-xs text-gray-500 hover:text-gray-700"
            onClick={() => {
              // Implementar cancelamento se necessário
              console.log('Upload cancelado pelo usuário');
            }}
          >
            Cancelar Upload
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Hook para gerenciar o estado global do upload
 * Pode ser usado em qualquer componente da aplicação
 */
export function useGlobalUploadState() {
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    progress: 0,
    currentStep: '',
    filesProcessed: 0,
    totalFiles: 0
  });

  const startUpload = (totalFiles: number) => {
    setUploadState({
      isUploading: true,
      progress: 0,
      currentStep: 'Iniciando processamento...',
      filesProcessed: 0,
      totalFiles
    });
  };

  const updateProgress = (progress: number, step: string, filesProcessed: number) => {
    setUploadState(prev => ({
      ...prev,
      progress,
      currentStep: step,
      filesProcessed
    }));
  };

  const finishUpload = () => {
    setUploadState(prev => ({
      ...prev,
      isUploading: false,
      progress: 100,
      currentStep: 'Upload concluído com sucesso!'
    }));
  };

  const resetUpload = () => {
    setUploadState({
      isUploading: false,
      progress: 0,
      currentStep: '',
      filesProcessed: 0,
      totalFiles: 0
    });
  };

  return {
    uploadState,
    startUpload,
    updateProgress,
    finishUpload,
    resetUpload
  };
}
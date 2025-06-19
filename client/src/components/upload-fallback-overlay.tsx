/**
 * Overlay de Fallback para Uploads
 * 
 * Sistema de segurança que detecta quando a interface principal pode estar travada
 * e exibe um overlay de emergência com progresso do upload.
 */

import React, { useEffect, useState } from 'react';

interface UploadFallbackOverlayProps {
  isActive: boolean;
  progress: number;
  message: string;
  timeElapsed: number;
}

export function UploadFallbackOverlay({
  isActive,
  progress,
  message,
  timeElapsed
}: UploadFallbackOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [heartbeat, setHeartbeat] = useState(0);

  // Detectar possível travamento da interface
  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      return;
    }

    // Mostrar overlay de segurança após 10 segundos sem resposta
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [isActive]);

  // Heartbeat visual para mostrar que o sistema está funcionando
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setHeartbeat(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[10000] flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          {/* Logo/Ícone */}
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>

          {/* Título */}
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Upload em Andamento
          </h2>

          {/* Progresso */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Mensagem atual */}
          <p className="text-gray-600 mb-4">
            {message}
          </p>

          {/* Tempo e heartbeat */}
          <div className="flex justify-between items-center text-sm text-gray-500 mb-6">
            <span>Tempo: {formatTime(timeElapsed)}</span>
            <div className="flex items-center">
              <div 
                className={`w-2 h-2 bg-green-500 rounded-full mr-2 ${
                  heartbeat % 2 === 0 ? 'opacity-100' : 'opacity-50'
                } transition-opacity duration-500`}
              ></div>
              <span>Sistema ativo</span>
            </div>
          </div>

          {/* Instruções */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <p className="mb-2">
              <strong>Não feche esta aba!</strong> O upload continua em segundo plano.
            </p>
            <p>
              Este processo pode levar alguns minutos dependendo do número de fotos.
            </p>
          </div>

          {/* Botão de emergência (opcional) */}
          <button 
            className="mt-4 text-xs text-blue-500 hover:text-blue-700 underline"
            onClick={() => {
              if (confirm('Tem certeza que deseja cancelar o upload? Todas as fotos enviadas até agora serão perdidas.')) {
                window.location.reload();
              }
            }}
          >
            Cancelar e Recarregar Página
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook para detectar travamentos e ativar overlay de fallback
 */
export function useUploadFallbackDetection() {
  const [isUIResponsive, setIsUIResponsive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const reportActivity = () => {
    setLastUpdate(Date.now());
    setIsUIResponsive(true);
  };

  const checkResponsiveness = () => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdate;
    
    // Se não há atividade por mais de 15 segundos, considerar travado
    if (timeSinceLastUpdate > 15000) {
      setIsUIResponsive(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(checkResponsiveness, 5000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  return {
    isUIResponsive,
    reportActivity
  };
}
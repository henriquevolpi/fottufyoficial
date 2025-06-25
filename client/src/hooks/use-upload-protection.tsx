/**
 * Hook para Sistema de Proteção Contra Tela Branca em Uploads
 * 
 * Implementa múltiplas camadas de proteção:
 * 1. Indicador global sempre visível
 * 2. Detecção de travamento da UI
 * 3. Overlay de emergência
 * 4. Persistência de estado via localStorage
 */

import { useState, useEffect, useCallback } from 'react';

interface UploadProtectionState {
  isActive: boolean;
  progress: number;
  currentStep: string;
  filesProcessed: number;
  totalFiles: number;
  startTime: number;
  lastActivity: number;
}

const STORAGE_KEY = 'fottufy_upload_state';
const INACTIVITY_THRESHOLD = 15000; // 15 segundos
const EMERGENCY_OVERLAY_DELAY = 10000; // 10 segundos

export function useUploadProtection() {
  const [state, setState] = useState<UploadProtectionState>(() => {
    // Sempre iniciar com estado limpo - não recuperar do localStorage
    // para evitar exibição desnecessária do sistema de proteção
    return {
      isActive: false,
      progress: 0,
      currentStep: '',
      filesProcessed: 0,
      totalFiles: 0,
      startTime: 0,
      lastActivity: Date.now()
    };
  });

  const [showEmergencyOverlay, setShowEmergencyOverlay] = useState(false);
  const [isUIResponsive, setIsUIResponsive] = useState(true);

  // Persistir estado no localStorage
  useEffect(() => {
    if (state.isActive) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state]);

  // Detectar inatividade da UI
  useEffect(() => {
    if (!state.isActive) return;

    const checkInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - state.lastActivity;
      
      if (timeSinceActivity > INACTIVITY_THRESHOLD) {
        setIsUIResponsive(false);
        
        // Mostrar overlay de emergência após delay adicional
        if (timeSinceActivity > EMERGENCY_OVERLAY_DELAY) {
          setShowEmergencyOverlay(true);
        }
      }
    }, 5000);

    return () => clearInterval(checkInterval);
  }, [state.isActive, state.lastActivity]);

  const startUpload = useCallback((totalFiles: number) => {
    const now = Date.now();
    setState({
      isActive: true,
      progress: 0,
      currentStep: 'Iniciando processamento de imagens...',
      filesProcessed: 0,
      totalFiles,
      startTime: now,
      lastActivity: now
    });
    setShowEmergencyOverlay(false);
    setIsUIResponsive(true);
  }, []);

  const updateProgress = useCallback((
    progress: number, 
    step: string, 
    filesProcessed: number
  ) => {
    const now = Date.now();
    setState(prev => ({
      ...prev,
      progress,
      currentStep: step,
      filesProcessed,
      lastActivity: now
    }));
    setIsUIResponsive(true);
    setShowEmergencyOverlay(false);
  }, []);

  const reportActivity = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastActivity: Date.now()
    }));
    setIsUIResponsive(true);
  }, []);

  const finishUpload = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false,
      progress: 100,
      currentStep: 'Upload concluído com sucesso!'
    }));
    setShowEmergencyOverlay(false);
    setIsUIResponsive(true);
    
    // Limpar localStorage após conclusão
    setTimeout(() => {
      localStorage.removeItem(STORAGE_KEY);
    }, 5000);
  }, []);

  const cancelUpload = useCallback(() => {
    setState({
      isActive: false,
      progress: 0,
      currentStep: '',
      filesProcessed: 0,
      totalFiles: 0,
      startTime: 0,
      lastActivity: Date.now()
    });
    setShowEmergencyOverlay(false);
    setIsUIResponsive(true);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const forceEmergencyMode = useCallback(() => {
    setShowEmergencyOverlay(true);
    setIsUIResponsive(false);
  }, []);

  // Calcular tempo decorrido
  const timeElapsed = state.startTime > 0 ? 
    Math.floor((Date.now() - state.startTime) / 1000) : 0;

  // Calcular ETA aproximado
  const estimatedTimeRemaining = () => {
    if (state.progress <= 0 || timeElapsed <= 0) return null;
    
    const estimatedTotal = (timeElapsed / state.progress) * 100;
    const remaining = estimatedTotal - timeElapsed;
    return Math.max(0, Math.floor(remaining));
  };

  return {
    // Estado atual
    uploadState: state,
    timeElapsed,
    estimatedTimeRemaining: estimatedTimeRemaining(),
    showEmergencyOverlay,
    isUIResponsive,
    
    // Ações
    startUpload,
    updateProgress,
    reportActivity,
    finishUpload,
    cancelUpload,
    forceEmergencyMode
  };
}

/**
 * Provider para compartilhar estado de upload globalmente
 */
import { createContext, useContext } from 'react';

const UploadProtectionContext = createContext<ReturnType<typeof useUploadProtection> | null>(null);

export function UploadProtectionProvider({ children }: { children: React.ReactNode }) {
  const uploadProtection = useUploadProtection();
  
  return (
    <UploadProtectionContext.Provider value={uploadProtection}>
      {children}
    </UploadProtectionContext.Provider>
  );
}

export function useGlobalUploadProtection() {
  const context = useContext(UploadProtectionContext);
  if (!context) {
    throw new Error('useGlobalUploadProtection deve ser usado dentro de UploadProtectionProvider');
  }
  return context;
}
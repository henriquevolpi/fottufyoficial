/**
 * VALIDADOR DE UPLOAD - SISTEMA DE PREVENÇÃO DE FALHAS
 * 
 * Sistema de validação preventiva para identificar e prevenir falhas
 * antes que aconteçam durante o processo de upload
 */

import { detectDevice, detectBrowserCapabilities, detectConnection } from './deviceDetection';

export interface UploadRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  category: 'memory' | 'network' | 'browser' | 'device' | 'files';
  message: string;
  recommendation: string;
  technical?: string;
}

export interface UploadValidation {
  isValid: boolean;
  risks: UploadRisk[];
  recommendations: string[];
  maxSafeFiles: number;
  estimatedDuration: number;
  shouldProceed: boolean;
}

/**
 * Valida se o upload pode ser executado com segurança
 */
export function validateUpload(files: File[]): UploadValidation {
  const risks: UploadRisk[] = [];
  const recommendations: string[] = [];
  
  const device = detectDevice();
  const capabilities = detectBrowserCapabilities();
  const connection = detectConnection();
  
  // 1. VALIDAÇÃO DE MEMÓRIA
  const memoryRisks = validateMemory(files, device);
  risks.push(...memoryRisks);
  
  // 2. VALIDAÇÃO DE ARQUIVOS
  const fileRisks = validateFiles(files);
  risks.push(...fileRisks);
  
  // 3. VALIDAÇÃO DE NAVEGADOR
  const browserRisks = validateBrowser(capabilities, files.length);
  risks.push(...browserRisks);
  
  // 4. VALIDAÇÃO DE CONEXÃO
  const networkRisks = validateNetwork(connection, files);
  risks.push(...networkRisks);
  
  // 5. VALIDAÇÃO DE DISPOSITIVO
  const deviceRisks = validateDevice(device, files.length);
  risks.push(...deviceRisks);
  
  // Calcular segurança geral
  const criticalRisks = risks.filter(r => r.level === 'critical').length;
  const highRisks = risks.filter(r => r.level === 'high').length;
  
  const shouldProceed = criticalRisks === 0 && highRisks < 2;
  const maxSafeFiles = calculateMaxSafeFiles(device, capabilities);
  const estimatedDuration = estimateUploadDuration(files, connection);
  
  // Gerar recomendações
  if (files.length > maxSafeFiles) {
    recommendations.push(`Reduza para ${maxSafeFiles} fotos ou menos para maior estabilidade`);
  }
  
  if (estimatedDuration > 300000) { // 5 minutos
    recommendations.push('Upload longo detectado - mantenha a aba ativa');
  }
  
  return {
    isValid: shouldProceed,
    risks,
    recommendations,
    maxSafeFiles,
    estimatedDuration,
    shouldProceed
  };
}

/**
 * Validação de memória disponível
 */
function validateMemory(files: File[], device: any): UploadRisk[] {
  const risks: UploadRisk[] = [];
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const totalSizeMB = totalSize / 1024 / 1024;
  
  // Estimar uso de memória (arquivo original + comprimido + buffers)
  const estimatedMemoryMB = totalSizeMB * 2.5;
  
  if (device.type === 'mobile' && estimatedMemoryMB > 100) {
    risks.push({
      level: 'high',
      category: 'memory',
      message: 'Muitas fotos para dispositivo móvel',
      recommendation: 'Reduza para menos de 50 fotos por vez',
      technical: `Memória estimada: ${estimatedMemoryMB.toFixed(0)}MB`
    });
  }
  
  if (estimatedMemoryMB > 500) {
    risks.push({
      level: 'critical',
      category: 'memory',
      message: 'Volume de fotos muito alto',
      recommendation: 'Divida em uploads menores (máximo 100 fotos)',
      technical: `Memória estimada: ${estimatedMemoryMB.toFixed(0)}MB`
    });
  }
  
  return risks;
}

/**
 * Validação de arquivos
 */
function validateFiles(files: File[]): UploadRisk[] {
  const risks: UploadRisk[] = [];
  
  // Verificar tipos de arquivo
  const invalidFiles = files.filter(file => 
    !file.type.startsWith('image/') || 
    !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
  );
  
  if (invalidFiles.length > 0) {
    const uniqueTypes = invalidFiles.reduce((types: string[], file) => {
      if (!types.includes(file.type)) {
        types.push(file.type);
      }
      return types;
    }, []);
    
    risks.push({
      level: 'medium',
      category: 'files',
      message: `${invalidFiles.length} arquivo(s) com tipo inválido`,
      recommendation: 'Use apenas JPEG, PNG ou WebP',
      technical: `Tipos encontrados: ${uniqueTypes.join(', ')}`
    });
  }
  
  // Verificar arquivos muito grandes
  const largeFiles = files.filter(file => file.size > 10 * 1024 * 1024); // 10MB
  
  if (largeFiles.length > 0) {
    risks.push({
      level: 'medium',
      category: 'files',
      message: `${largeFiles.length} arquivo(s) muito grande(s)`,
      recommendation: 'Arquivos acima de 10MB podem causar lentidão',
      technical: `Maior arquivo: ${(Math.max(...largeFiles.map(f => f.size)) / 1024 / 1024).toFixed(1)}MB`
    });
  }
  
  return risks;
}

/**
 * Validação de capacidades do navegador
 */
function validateBrowser(capabilities: any, fileCount: number): UploadRisk[] {
  const risks: UploadRisk[] = [];
  
  if (!capabilities.supportsWebWorker && fileCount > 20) {
    risks.push({
      level: 'medium',
      category: 'browser',
      message: 'Web Workers não suportados',
      recommendation: 'Processamento pode ser mais lento',
      technical: 'Compressão será feita na thread principal'
    });
  }
  
  if (!capabilities.supportsFileApi) {
    risks.push({
      level: 'critical',
      category: 'browser',
      message: 'File API não suportada',
      recommendation: 'Atualize seu navegador',
      technical: 'Navegador muito antigo'
    });
  }
  
  if (capabilities.browserName === 'safari' && fileCount > 100) {
    risks.push({
      level: 'high',
      category: 'browser',
      message: 'Safari com muitos arquivos',
      recommendation: 'Limite a 50 fotos por upload no Safari',
      technical: 'Safari tem limitações específicas de memória'
    });
  }
  
  return risks;
}

/**
 * Validação de conexão de rede
 */
function validateNetwork(connection: any, files: File[]): UploadRisk[] {
  const risks: UploadRisk[] = [];
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  
  if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
    risks.push({
      level: 'high',
      category: 'network',
      message: 'Conexão muito lenta detectada',
      recommendation: 'Aguarde conexão melhor ou reduza quantidade',
      technical: `Tipo: ${connection.effectiveType}`
    });
  }
  
  if (connection.saveData) {
    risks.push({
      level: 'medium',
      category: 'network',
      message: 'Modo economia de dados ativo',
      recommendation: 'Upload pode ser limitado pelo sistema',
      technical: 'Data Saver habilitado'
    });
  }
  
  // Estimar tempo com conexão lenta
  if (connection.downlink < 1 && totalSize > 50 * 1024 * 1024) { // 50MB
    risks.push({
      level: 'medium',
      category: 'network',
      message: 'Upload longo devido à conexão',
      recommendation: 'Mantenha aba ativa e aguarde',
      technical: `Velocidade: ${connection.downlink}Mbps`
    });
  }
  
  return risks;
}

/**
 * Validação específica do dispositivo
 */
function validateDevice(device: any, fileCount: number): UploadRisk[] {
  const risks: UploadRisk[] = [];
  
  if (device.type === 'mobile' && fileCount > 50) {
    risks.push({
      level: 'medium',
      category: 'device',
      message: 'Muitas fotos para dispositivo móvel',
      recommendation: 'Divida em uploads menores',
      technical: `Dispositivo: ${device.type}`
    });
  }
  
  if (device.os === 'ios' && device.version < 14 && fileCount > 30) {
    risks.push({
      level: 'high',
      category: 'device',
      message: 'iOS antigo com muitas fotos',
      recommendation: 'Limite a 20 fotos por vez',
      technical: `iOS ${device.version}`
    });
  }
  
  return risks;
}

/**
 * Calcula o número máximo seguro de arquivos
 */
function calculateMaxSafeFiles(device: any, capabilities: any): number {
  let maxFiles = 200; // Padrão desktop
  
  if (device.type === 'mobile') {
    maxFiles = 50;
  }
  
  if (device.type === 'tablet') {
    maxFiles = 100;
  }
  
  if (!capabilities.supportsWebWorker) {
    maxFiles = Math.floor(maxFiles * 0.7);
  }
  
  if (device.os === 'ios' && device.version < 14) {
    maxFiles = Math.min(maxFiles, 30);
  }
  
  return maxFiles;
}

/**
 * Estima duração do upload em milissegundos
 */
function estimateUploadDuration(files: File[], connection: any): number {
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const compressionTime = files.length * 500; // 500ms por foto
  
  // Estimar tempo de upload baseado na conexão
  let uploadSpeedBps = 1024 * 1024; // 1Mbps padrão
  
  if (connection.downlink) {
    uploadSpeedBps = connection.downlink * 1024 * 1024 * 0.8; // 80% da velocidade para upload
  }
  
  const uploadTime = (totalSize * 8) / uploadSpeedBps * 1000; // convertir para ms
  
  return compressionTime + uploadTime;
}

/**
 * Gera recomendações baseadas nos riscos
 */
export function generateSafetyRecommendations(validation: UploadValidation): string[] {
  const recs: string[] = [];
  
  const criticalRisks = validation.risks.filter(r => r.level === 'critical');
  const highRisks = validation.risks.filter(r => r.level === 'high');
  
  if (criticalRisks.length > 0) {
    recs.push('❌ Upload não recomendado - problemas críticos detectados');
    criticalRisks.forEach(risk => {
      recs.push(`• ${risk.message}: ${risk.recommendation}`);
    });
  } else if (highRisks.length > 0) {
    recs.push('⚠️ Upload possível mas com cuidados extras');
    highRisks.forEach(risk => {
      recs.push(`• ${risk.message}: ${risk.recommendation}`);
    });
  } else {
    recs.push('✅ Upload seguro - prosseguir normalmente');
  }
  
  return recs;
}
// client/src/components/ImageUploader.tsx

import { useState } from 'react'
import imageCompression from 'browser-image-compression'
import { useToast } from "@/hooks/use-toast";

interface ImageUploaderProps {
  projectId: string | number;
  onUploadSuccess?: () => void;
}

// Tamanho máximo do lote
const BATCH_SIZE = 30;

export function ImageUploader({ projectId, onUploadSuccess }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 })
  // Novo estado para rastrear o progresso do upload em tempo real
  const [uploadPercentage, setUploadPercentage] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'completed'>('idle')
  const { toast } = useToast()
  
  // ✨ FUNÇÃO OTIMIZADA PARA CÁLCULO DE PROGRESSO
  function calculateOptimizedProgress(
    loaded: number, 
    total: number, 
    batchIndex: number, 
    totalBatches: number, 
    batchSize: number,
    currentPercentage: number
  ): { percentage: number; smooth: boolean } {
    // Calcular progresso base do lote atual
    const rawBatchProgress = total > 0 ? (loaded / total) * 100 : 0;
    
    // Aplicar suavização inteligente baseada no tamanho do lote
    let batchProgress = rawBatchProgress;
    if (batchSize > 50) {
      // Para lotes grandes, progresso mais suave com boost inicial
      batchProgress = Math.max(5, rawBatchProgress * 1.1);
    } else if (batchSize > 20) {
      // Para lotes médios, progresso padrão
      batchProgress = Math.max(3, rawBatchProgress);
    } else {
      // Para lotes pequenos, progresso mais rápido
      batchProgress = Math.max(10, rawBatchProgress * 1.2);
    }
    
    // Limitar progresso do lote a 95% para feedback visual
    batchProgress = Math.min(batchProgress, 95);
    
    // Calcular contribuição de cada lote ao progresso total
    const batchWeight = 100 / totalBatches;
    const completedBatchesProgress = batchIndex * batchWeight;
    const currentBatchContribution = (batchProgress / 100) * batchWeight;
    
    // Calcular progresso total
    let totalProgress = completedBatchesProgress + currentBatchContribution;
    
    // Garantir progressão sempre crescente (anti-travamento visual)
    if (totalProgress <= currentPercentage && loaded > 0) {
      totalProgress = currentPercentage + 0.5; // Incremento pequeno mas perceptível
    }
    
    // Arredondar e limitar
    const finalPercentage = Math.min(Math.round(totalProgress), 95);
    
    return {
      percentage: finalPercentage,
      smooth: batchSize > 30 // Usar animação suave para lotes grandes
    };
  }

  // Função para processar um arquivo e comprimí-lo
  async function processFile(file: File) {
    const options = {
      maxWidthOrHeight: 970, // Largura máxima padronizada
      maxSizeMB: 5, // ⬅️ Aumentado o limite de tamanho após compressão para 5MB
      useWebWorker: true,
      quality: 0.9, // Qualidade padronizada
    }
    return await imageCompression(file, options)
  }

  // Função para enviar um lote de arquivos para a API com XMLHttpRequest para acompanhar o progresso
  async function uploadBatch(compressedFiles: File[], batchIndex: number, totalBatches: number, retryCount = 0): Promise<any> {
    const MAX_RETRIES = 2; // Máximo 2 tentativas adicionais
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      
      // Adicionar todos os arquivos do lote ao FormData
      compressedFiles.forEach(file => {
        formData.append('photos', file);
      });
      
      // Definir callbacks para acompanhar o progresso com modificações anti-travamento
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          // ✨ SISTEMA OTIMIZADO DE CÁLCULO DE PROGRESSO
          const progressInfo = calculateOptimizedProgress(
            event.loaded, 
            event.total, 
            batchIndex, 
            totalBatches, 
            compressedFiles.length,
            uploadPercentage
          );
          
          setUploadPercentage(progressInfo.percentage);
          setUploadStatus('uploading');
          
          console.log(`Lote ${batchIndex+1}/${totalBatches}: ${progressInfo.percentage}% - Upload em progresso`);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Não definimos como 'completed' aqui, pois isso acontecerá apenas quando todos os lotes forem processados
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            resolve({ files: compressedFiles.length }); // Fallback se o JSON for inválido
          }
        } else {
          setUploadStatus('idle');
          try {
            const errorData = JSON.parse(xhr.responseText);
            console.error('Erro ao enviar lote de imagens:', errorData);
            
            if (xhr.status === 403 && errorData.message?.includes('Upload limit')) {
              reject(new Error("Limite de upload atingido. Por favor, atualize seu plano para enviar mais fotos."));
            } else {
              reject(new Error(errorData.message || 'Erro desconhecido'));
            }
          } catch (e) {
            console.error('Erro ao enviar imagens (texto):', xhr.responseText);
            reject(new Error(xhr.responseText || xhr.statusText || 'Erro desconhecido'));
          }
        }
      };
      
      xhr.onerror = async () => {
        console.warn(`Erro de rede no lote ${batchIndex + 1}, tentativa ${retryCount + 1}`);
        
        if (retryCount < MAX_RETRIES) {
          // Aguardar antes de tentar novamente (backoff exponencial)
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          console.log(`Tentando novamente em ${delay}ms...`);
          
          setTimeout(() => {
            uploadBatch(compressedFiles, batchIndex, totalBatches, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, delay);
        } else {
          setUploadStatus('idle');
          reject(new Error(`Falha na conexão após ${MAX_RETRIES + 1} tentativas. Verifique sua internet.`));
        }
      };
      
      xhr.open('POST', `/api/projects/${projectId}/photos/upload`, true);
      // Incluir cookies para autenticação
      xhr.withCredentials = true;
      
      // Adicionar timeout para evitar uploads travados (30 segundos por lote)
      xhr.timeout = 30000;
      
      // Tratar timeout
      xhr.ontimeout = async () => {
        console.warn(`Timeout no lote ${batchIndex + 1}, tentativa ${retryCount + 1}`);
        
        if (retryCount < MAX_RETRIES) {
          // Para timeout, aumentamos o tempo limite na próxima tentativa
          const delay = 2000; // 2 segundos de espera
          console.log(`Timeout - tentando novamente em ${delay}ms...`);
          
          setTimeout(() => {
            uploadBatch(compressedFiles, batchIndex, totalBatches, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, delay);
        } else {
          setUploadStatus('idle');
          reject(new Error(`Upload excedeu tempo limite após ${MAX_RETRIES + 1} tentativas. Tente com menos fotos.`));
        }
      };
      
      xhr.send(formData);
    });
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    const filesArray = Array.from(files);
    
    // ✨ VALIDAÇÃO PRÉVIA DE CAPACIDADE DO DISPOSITIVO
    function checkDeviceCapability(fileCount: number): { critical: boolean; warning: boolean; message: string } {
      // Detectar tipo de dispositivo aproximadamente
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isLowMemoryDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      // Verificar suporte a File API
      if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
        return { 
          critical: true, 
          warning: false, 
          message: "Seu navegador não suporta upload de arquivos. Atualize para a versão mais recente." 
        };
      }
      
      // Dispositivos móveis com muitos arquivos
      if (isMobile && fileCount > 50) {
        return { 
          critical: false, 
          warning: true, 
          message: `Upload de ${fileCount} fotos em dispositivos móveis pode ser lento. Considere dividir em grupos menores.` 
        };
      }
      
      // Dispositivos com baixa memória
      if (isLowMemoryDevice && fileCount > 30) {
        return { 
          critical: false, 
          warning: true, 
          message: "Dispositivo com memória limitada detectado. Upload pode demorar mais que o normal." 
        };
      }
      
      // Safari com muitos arquivos
      if (isSafari && fileCount > 100) {
        return { 
          critical: false, 
          warning: true, 
          message: "Safari detectado com muitas imagens. Para melhor performance, limite a 50 fotos por upload." 
        };
      }
      
      return { critical: false, warning: false, message: "" };
    }
    
    const deviceCapability = checkDeviceCapability(filesArray.length);
    if (deviceCapability.critical) {
      toast({
        title: "Dispositivo não compatível",
        description: deviceCapability.message,
        variant: "destructive",
      });
      return;
    }
    
    if (deviceCapability.warning) {
      console.warn('Aviso de capacidade:', deviceCapability.message);
      toast({
        title: "Aviso de performance",
        description: deviceCapability.message,
        variant: "default",
      });
    }
    
    // Verificar arquivos acima de 2MB
    const oversizedFiles = filesArray.filter(file => file.size > MAX_FILE_SIZE);
    const validFiles = filesArray.filter(file => file.size <= MAX_FILE_SIZE);
    
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ');
      toast({
        title: "Arquivos muito grandes",
        description: `Envie apenas fotos abaixo de 2MB. Arquivos rejeitados: ${fileNames}`,
        variant: "destructive",
      });
      
      if (validFiles.length === 0) {
        return;
      }
    }

    setLoading(true)
    setUploadProgress({ current: 0, total: validFiles.length })
    setUploadPercentage(0)
    setUploadStatus('idle')

    try {
      // Se houver apenas um arquivo, mostrar preview
      if (validFiles.length === 1) {
        const previewFile = await processFile(validFiles[0])
        const previewUrl = URL.createObjectURL(previewFile)
        setPreview(previewUrl)
      }

      // Processar todos os arquivos válidos
      let totalUploaded = 0;
      let totalBatches = Math.ceil(validFiles.length / BATCH_SIZE);
      console.log(`Iniciando upload de ${validFiles.length} arquivos em ${totalBatches} lotes de até ${BATCH_SIZE} fotos cada.`);

      // Dividir arquivos em lotes e processar cada lote com recuperação de falhas
      const failedBatches = [];
      let successfulBatches = 0;
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        // Calcular o intervalo do lote atual
        const startIndex = batchIndex * BATCH_SIZE;
        const endIndex = Math.min((batchIndex + 1) * BATCH_SIZE, validFiles.length);
        const batchSize = endIndex - startIndex;
        
        console.log(`Processando lote ${batchIndex + 1}/${totalBatches} (${batchSize} arquivos)`);
        
        // Usar apenas os arquivos válidos (já filtrados)
        const batchFiles = validFiles.slice(startIndex, endIndex);
        
        // Comprimir arquivos em grupos menores para evitar sobrecarga de memória
        const compressedFiles = [];
        const COMPRESS_CHUNK_SIZE = 5; // Processar apenas 5 imagens por vez
        
        console.log(`Comprimindo lote ${batchIndex + 1}: ${batchFiles.length} imagens em chunks de ${COMPRESS_CHUNK_SIZE}`);
        
        for (let chunkStart = 0; chunkStart < batchFiles.length; chunkStart += COMPRESS_CHUNK_SIZE) {
          const chunk = batchFiles.slice(chunkStart, chunkStart + COMPRESS_CHUNK_SIZE);
          const chunkNumber = Math.floor(chunkStart / COMPRESS_CHUNK_SIZE) + 1;
          const totalChunks = Math.ceil(batchFiles.length / COMPRESS_CHUNK_SIZE);
          
          console.log(`Processando chunk ${chunkNumber}/${totalChunks} do lote ${batchIndex + 1}`);
          
          const chunkPromises = chunk.map(file => processFile(file));
          const chunkCompressed = await Promise.all(chunkPromises);
          compressedFiles.push(...chunkCompressed);
          
          // Pequena pausa entre chunks para não travar a UI e mostrar progresso
          if (chunkStart + COMPRESS_CHUNK_SIZE < batchFiles.length) {
            await new Promise(resolve => setTimeout(resolve, 200)); // Aumentado para 200ms
          }
        }
        
        console.log(`Lote ${batchIndex + 1} comprimido, enviando para o servidor...`);
        
        // Enviar o lote atual com tratamento de falhas
        try {
          const result = await uploadBatch(compressedFiles, batchIndex, totalBatches);
          
          // Atualizar o contador de progresso
          const batchUploaded = result.files?.length || result.totalUploaded || batchSize;
          totalUploaded += batchUploaded;
          successfulBatches++;
          setUploadProgress(prev => ({ ...prev, current: totalUploaded }));
          
          console.log(`✅ Lote ${batchIndex + 1} enviado com sucesso: ${batchUploaded} arquivos`);
        } catch (error) {
          console.error(`❌ Falha no lote ${batchIndex + 1}:`, error);
          
          // Armazenar lote que falhou para tentativa posterior
          failedBatches.push({
            batchIndex,
            files: compressedFiles,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
          
          // Continuar com próximos lotes mesmo se um falhar
          console.log(`Continuando com próximo lote...`);
        }
      }
      
      // Tentar reenviar lotes que falharam (uma tentativa adicional)
      if (failedBatches.length > 0) {
        console.log(`\n🔄 Tentando reenviar ${failedBatches.length} lotes que falharam...`);
        
        for (const failedBatch of failedBatches) {
          try {
            console.log(`Reenviando lote ${failedBatch.batchIndex + 1}...`);
            const result = await uploadBatch(failedBatch.files, failedBatch.batchIndex, totalBatches);
            
            const batchUploaded = result.files?.length || result.totalUploaded || failedBatch.files.length;
            totalUploaded += batchUploaded;
            successfulBatches++;
            setUploadProgress(prev => ({ ...prev, current: totalUploaded }));
            
            console.log(`✅ Lote ${failedBatch.batchIndex + 1} reenviado com sucesso!`);
          } catch (retryError) {
            console.error(`❌ Falha definitiva no lote ${failedBatch.batchIndex + 1}:`, retryError);
            
            // Mostrar toast para lotes que falharam definitivamente
            toast({
              title: `Lote ${failedBatch.batchIndex + 1} falhou`,
              description: `${failedBatch.files.length} fotos não foram enviadas. Tente novamente.`,
              variant: "destructive",
            });
          }
          
          // Pausa entre reenvios
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('Upload concluído com sucesso:', totalUploaded, 'arquivos');
      
      // Show success notification
      toast({
        title: "Upload concluído",
        description: `${totalUploaded} foto(s) enviada(s) com sucesso.`,
        variant: "default",
      });
      
      // Limpar preview após upload bem-sucedido
      setPreview(null)
      
      // Clear localStorage for this project to avoid cache issues
      try {
        if (typeof Storage !== 'undefined' && localStorage) {
          const storedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
          const filteredProjects = storedProjects.filter((p: any) => 
            p.id.toString() !== projectId.toString());
          localStorage.setItem('projects', JSON.stringify(filteredProjects));
          console.log('Cleared localStorage cache for project', projectId);
        }
      } catch (err) {
        console.warn('Failed to clear localStorage (storage may be disabled):', err);
      }
      
      // Chamar callback de sucesso se fornecido
      if (onUploadSuccess) {
        onUploadSuccess()
      }
    } catch (err) {
      console.error('Erro ao processar ou enviar imagens:', err)
      toast({
        title: "Erro ao processar imagens",
        description: err instanceof Error ? err.message : "Erro ao comprimir ou enviar as imagens",
        variant: "destructive",
      });
    } finally {
      // Definir status como 'completed' por um momento antes de desativar o carregamento
      // para que o usuário possa ver a mensagem "Upload completado!"
      setUploadStatus('completed')
      
      // Aguardar um breve momento para mostrar a mensagem de conclusão
      setTimeout(() => {
        setLoading(false)
        setUploadProgress({ current: 0, total: 0 })
        setUploadPercentage(0)
        // Redefine o status somente depois que o componente de carregamento desaparece
        setTimeout(() => {
          setUploadStatus('idle')
        }, 100)
      }, 1000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label 
          htmlFor="image-upload" 
          className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          <span>Selecionar arquivos de imagem</span>
          <input 
            id="image-upload" 
            type="file" 
            multiple
            accept="image/*" 
            onChange={handleImageChange}
            className="sr-only"
          />
        </label>
        <p className="text-xs text-gray-500">Formatos aceitos: JPG, PNG, GIF • Máximo 2MB por foto • Você pode selecionar vários arquivos</p>
      </div>
      
      {loading && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>
              {uploadStatus === 'completed' ? 'Upload completado!' : 'Processando e enviando...'}
            </span>
          </div>
          
          {/* Barra de progresso para o upload (versão melhorada) */}
          {(uploadStatus === 'uploading' || uploadStatus === 'completed') && (
            <div className="w-full mt-2">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full transition-all duration-500 ease-in-out ${
                    uploadStatus === 'completed' 
                      ? 'bg-green-500 animate-pulse' 
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                  }`}
                  style={{ width: `${uploadPercentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-1 px-1">
                <div className="text-xs text-gray-600 font-medium">
                  {uploadStatus === 'completed' 
                    ? 'Upload finalizado!' 
                    : uploadPercentage < 30 
                      ? "Preparando arquivos..." 
                      : uploadPercentage < 70 
                        ? "Enviando para o servidor..." 
                        : uploadPercentage < 90 
                          ? "Processando imagens..." 
                          : "Finalizando..."}
                </div>
                <div className="text-xs font-semibold">
                  {uploadPercentage}%
                </div>
              </div>
              {uploadStatus !== 'completed' && (
                <div className="text-xs text-gray-400 mt-1 text-center">
                  Por favor, não feche ou atualize a página durante o upload
                </div>
              )}
              {uploadStatus === 'completed' && (
                <div className="text-xs text-green-600 mt-1 text-center font-medium">
                  Upload finalizado com sucesso!
                </div>
              )}
            </div>
          )}
          
          {/* Progresso total de arquivos */}
          {uploadProgress.total > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Progresso total: {uploadProgress.current} de {uploadProgress.total} fotos ({Math.round((uploadProgress.current / uploadProgress.total) * 100)}%)
            </div>
          )}
        </div>
      )}
      
      {preview && (
        <div className="mt-2">
          <p className="text-sm font-medium text-gray-700 mb-1">Pré-visualização:</p>
          <div className="relative w-48 h-48 overflow-hidden rounded-md border border-gray-200">
            <img 
              src={preview} 
              alt="Pré-visualização" 
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  )
}
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
  async function uploadBatch(compressedFiles: File[], batchIndex: number, totalBatches: number): Promise<any> {
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
          // Definir um progresso mínimo de partida - evitar parecer travado
          let batchProgress = 15; // Começamos em 15% para feedback imediato

          // Se o upload realmente começou (mais de 3%)
          if (event.loaded > 0.03 * event.total) {
            // Com boost para lotes grandes (mais de 30 arquivos num lote)
            const loteBoost = compressedFiles.length > 30 ? 1.5 : 1.2;
            batchProgress = Math.round((event.loaded / event.total) * 100 * loteBoost);
            
            // Limitar ao máximo de 95% por lote
            batchProgress = Math.min(batchProgress, 95);
          }

          // Boost para arquivos grandes 
          if (compressedFiles.length > 50 && batchProgress < 20) {
            batchProgress = 20; // Começamos em 20% para lotes muito grandes
          }
          
          // Cada lote representa uma parte do progresso total,
          // mas adicionamos um peso extra ao lote atual para feedback
          const batchWeight = 100 / totalBatches;
          
          // Para muitos arquivos, aplicamos um boost inicial
          // e garantimos que a barra sempre avance
          const boostInicial = compressedFiles.length > 100 ? 10 : 5;
          
          // Calcular progresso total com boost
          const completedBatchesProgress = batchIndex * batchWeight;
          const currentBatchContribution = (batchProgress / 100) * batchWeight;
          
          // Sempre começar com pelo menos 5% mesmo para carregamentos grandes
          let totalProgress = Math.min(
            Math.max(boostInicial, Math.round(completedBatchesProgress + currentBatchContribution)),
            95 // Limitamos a 95% até que esteja realmente completo
          );
          
          // Técnica anti-travamento: se o progresso não avançou, forçar incremento
          // para dar feedback visual ao usuário
          const currentPercentage = uploadPercentage;
          if (totalProgress <= currentPercentage && event.loaded > 0) {
            totalProgress = currentPercentage + 1;
          }
          
          // Mover a barra gradualmente
          setUploadPercentage(totalProgress);
          setUploadStatus('uploading');
          
          console.log(`Lote ${batchIndex+1}/${totalBatches}: ${batchProgress}% - Progresso total: ${totalProgress}%`);
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
      
      xhr.onerror = () => {
        setUploadStatus('idle');
        reject(new Error('Erro de conexão durante o upload.'));
      };
      
      xhr.open('POST', `/api/projects/${projectId}/photos/upload`, true);
      // Incluir cookies para autenticação
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    const filesArray = Array.from(files);
    
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

      // Dividir arquivos em lotes e processar cada lote
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        // Calcular o intervalo do lote atual
        const startIndex = batchIndex * BATCH_SIZE;
        const endIndex = Math.min((batchIndex + 1) * BATCH_SIZE, validFiles.length);
        const batchSize = endIndex - startIndex;
        
        console.log(`Processando lote ${batchIndex + 1}/${totalBatches} (${batchSize} arquivos)`);
        
        // Usar apenas os arquivos válidos (já filtrados)
        const batchFiles = validFiles.slice(startIndex, endIndex);
        
        // Comprimir todos os arquivos do lote atual em paralelo
        const compressPromises = batchFiles.map(file => processFile(file));
        const compressedFiles = await Promise.all(compressPromises);
        
        console.log(`Lote ${batchIndex + 1} comprimido, enviando para o servidor...`);
        
        // Enviar o lote atual passando o índice e o número total de lotes
        const result = await uploadBatch(compressedFiles, batchIndex, totalBatches);
        
        // Atualizar o contador de progresso
        const batchUploaded = result.files?.length || result.totalUploaded || batchSize;
        totalUploaded += batchUploaded;
        setUploadProgress(prev => ({ ...prev, current: totalUploaded }));
        
        console.log(`Lote ${batchIndex + 1} enviado com sucesso: ${batchUploaded} arquivos`);
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
        const storedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
        const filteredProjects = storedProjects.filter((p: any) => 
          p.id.toString() !== projectId.toString());
        localStorage.setItem('projects', JSON.stringify(filteredProjects));
        console.log('Cleared localStorage cache for project', projectId);
      } catch (err) {
        console.error('Failed to clear localStorage:', err);
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
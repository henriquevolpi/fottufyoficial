// client/src/components/ImageUploader.tsx

import { useState } from 'react'
import imageCompression from 'browser-image-compression'
import { useToast } from "@/hooks/use-toast";

interface ImageUploaderProps {
  projectId: string | number;
  onUploadSuccess?: () => void;
}

// Tamanho máximo do lote
const BATCH_SIZE = 100;

export function ImageUploader({ projectId, onUploadSuccess }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 })
  const { toast } = useToast()

  // Função para processar um arquivo e comprimí-lo
  async function processFile(file: File) {
    const options = {
      maxWidthOrHeight: 720, // ⬅️ Aqui define o redimensionamento
      maxSizeMB: 0.3,
      useWebWorker: true,
    }
    return await imageCompression(file, options)
  }

  // Função para enviar um lote de arquivos para a API
  async function uploadBatch(compressedFiles: File[]) {
    const formData = new FormData()
    // Adicionar todos os arquivos do lote ao FormData
    compressedFiles.forEach(file => {
      formData.append('photos', file)
    })

    const response = await fetch(`/api/projects/${projectId}/photos/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include', // envia cookies (login)
    })

    if (!response.ok) {
      // Parse the error response
      try {
        const errorData = await response.json();
        console.error('Erro ao enviar lote de imagens:', errorData);
        
        // Check for specific error types and display appropriate message
        if (response.status === 403 && errorData.message?.includes('Upload limit')) {
          throw new Error("Limite de upload atingido. Por favor, atualize seu plano para enviar mais fotos.");
        } else {
          throw new Error(errorData.message || 'Erro desconhecido');
        }
      } catch (e) {
        // Fallback to text response if not JSON
        if (e instanceof Error) throw e;
        
        const errorText = await response.text();
        console.error('Erro ao enviar imagens (texto):', errorText);
        throw new Error(errorText || response.statusText);
      }
    }

    return await response.json();
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    setLoading(true)
    setUploadProgress({ current: 0, total: files.length })

    try {
      // Se houver apenas um arquivo, mostrar preview
      if (files.length === 1) {
        const previewFile = await processFile(files[0])
        const previewUrl = URL.createObjectURL(previewFile)
        setPreview(previewUrl)
      }

      // Processar todos os arquivos
      let totalUploaded = 0;
      let totalBatches = Math.ceil(files.length / BATCH_SIZE);
      console.log(`Iniciando upload de ${files.length} arquivos em ${totalBatches} lotes de até ${BATCH_SIZE} fotos cada.`);

      // Dividir arquivos em lotes e processar cada lote
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        // Calcular o intervalo do lote atual
        const startIndex = batchIndex * BATCH_SIZE;
        const endIndex = Math.min((batchIndex + 1) * BATCH_SIZE, files.length);
        const batchSize = endIndex - startIndex;
        
        console.log(`Processando lote ${batchIndex + 1}/${totalBatches} (${batchSize} arquivos)`);
        
        // Converter o FileList para um array para podermos fazer slice
        const filesArray = Array.from(files).slice(startIndex, endIndex);
        
        // Comprimir todos os arquivos do lote atual em paralelo
        const compressPromises = filesArray.map(file => processFile(file));
        const compressedFiles = await Promise.all(compressPromises);
        
        console.log(`Lote ${batchIndex + 1} comprimido, enviando para o servidor...`);
        
        // Enviar o lote atual
        const result = await uploadBatch(compressedFiles);
        
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
      setLoading(false)
      setUploadProgress({ current: 0, total: 0 })
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
        <p className="text-xs text-gray-500">Formatos aceitos: JPG, PNG, GIF • Você pode selecionar vários arquivos</p>
      </div>
      
      {loading && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processando e enviando...</span>
          </div>
          
          {uploadProgress.total > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Progresso: {uploadProgress.current} de {uploadProgress.total} fotos ({Math.round((uploadProgress.current / uploadProgress.total) * 100)}%)
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
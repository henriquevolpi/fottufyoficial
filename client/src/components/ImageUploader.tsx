// client/src/components/ImageUploader.tsx

import { useState } from 'react'
import imageCompression from 'browser-image-compression'

interface ImageUploaderProps {
  projectId: string | number;
  onUploadSuccess?: () => void;
}

export function ImageUploader({ projectId, onUploadSuccess }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)

    try {
      const options = {
        maxWidthOrHeight: 720, // ⬅️ Aqui define o redimensionamento
        maxSizeMB: 0.3,
        useWebWorker: true,
      }

      const compressedFile = await imageCompression(file, options)

      const previewUrl = URL.createObjectURL(compressedFile)
      setPreview(previewUrl)

      const formData = new FormData()
      formData.append('photos', compressedFile) // Alterado para 'photos' para corresponder à API

      const response = await fetch(`/api/projects/${projectId}/photos/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include', // envia cookies (login)
      })

      if (response.ok) {
        // Limpar preview após upload bem-sucedido
        setPreview(null)
        
        // Chamar callback de sucesso se fornecido
        if (onUploadSuccess) {
          onUploadSuccess()
        }
      } else {
        console.error('Erro ao enviar imagem:', await response.text())
      }
    } catch (err) {
      console.error('Erro ao processar ou enviar imagem:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label 
          htmlFor="image-upload" 
          className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          <span>Selecionar arquivo de imagem</span>
          <input 
            id="image-upload" 
            type="file" 
            accept="image/*" 
            onChange={handleImageChange}
            className="sr-only"
          />
        </label>
        <p className="text-xs text-gray-500">Formatos aceitos: JPG, PNG, GIF</p>
      </div>
      
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Processando e enviando...</span>
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
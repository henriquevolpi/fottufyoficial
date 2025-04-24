// client/src/components/ImageUploader.tsx

import { useState } from 'react'
import imageCompression from 'browser-image-compression'

export function ImageUploader() {
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
      formData.append('file', compressedFile)

      const response = await fetch('/api/projects/SEU_PROJECT_ID/photos/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include', // envia cookies (login)
      })

      if (response.ok) {
        alert('Imagem enviada com sucesso!')
      } else {
        alert('Erro ao enviar imagem')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao redimensionar/enviar imagem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleImageChange} />
      {loading && <p>Redimensionando e enviando...</p>}
      {preview && (
        <img src={preview} alt="Pré-visualização" style={{ maxWidth: '200px', marginTop: 10 }} />
      )}
    </div>
  )
}
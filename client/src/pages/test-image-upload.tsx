import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function TestImageUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Selecione uma imagem para fazer upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('photos', selectedFile);

      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro no upload: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Upload bem-sucedido:', data);
      
      if (data && data.files && data.files.length > 0 && data.files[0].url) {
        setUploadedImageUrl(data.files[0].url);
      } else if (data && data[0] && data[0].url) {
        // Caso a estrutura seja diferente do esperado
        setUploadedImageUrl(data[0].url);
      } else {
        console.error('Estrutura da resposta:', data);
        throw new Error('URL da imagem processada não encontrada na resposta');
      }
    } catch (err) {
      console.error('Erro ao fazer upload da imagem:', err);
      setError((err as Error).message || 'Erro desconhecido ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto mt-8 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Teste de Processamento de Imagem</CardTitle>
            <CardDescription>
              Esta página testa o redimensionamento para 720px de largura e a adição de marca d'água
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="image-upload">Selecione uma imagem</Label>
              <Input id="image-upload" type="file" accept="image/*" onChange={handleFileChange} className="mt-1" />
            </div>

            {previewUrl && (
              <div>
                <h3 className="text-sm font-medium mb-2">Imagem Original:</h3>
                <div className="border rounded-md overflow-hidden">
                  <img src={previewUrl} alt="Preview" className="max-w-full h-auto" />
                </div>
              </div>
            )}

            {uploadedImageUrl && (
              <div>
                <h3 className="text-sm font-medium mb-2">Imagem Processada:</h3>
                <div className="border rounded-md overflow-hidden">
                  <img 
                    src={uploadedImageUrl} 
                    alt="Uploaded" 
                    className="max-w-full h-auto" 
                    style={{ maxWidth: '100%' }} 
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">URL: {uploadedImageUrl}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || uploading} 
              className="w-full"
            >
              {uploading ? 'Enviando...' : 'Fazer Upload e Processar'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
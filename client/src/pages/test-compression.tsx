import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { compressMultipleImages, formatFileSize } from '@/lib/imageCompression';

export default function TestCompression() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [compressedFiles, setCompressedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressionStats, setCompressionStats] = useState<any[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      setCompressedFiles([]);
      setCompressionStats([]);
      setProgress(0);
    }
  };

  const handleCompress = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    
    console.log('[Test] Starting compression test...');

    try {
      const compressedResults = await compressMultipleImages(
        selectedFiles,
        {
          maxWidthOrHeight: 900,
          quality: 0.8,
          useWebWorker: true,
        },
        (processed, total) => {
          const progressPercent = (processed / total) * 100;
          setProgress(progressPercent);
        }
      );

      setCompressedFiles(compressedResults);
      
      // Calculate compression stats
      const stats = selectedFiles.map((original, index) => {
        const compressedFile = compressedResults[index];
        const originalSize = original.size;
        const compressedSize = compressedFile?.size || 0;
        const reduction = ((originalSize - compressedSize) / originalSize) * 100;
        
        return {
          filename: original.name,
          originalSize: formatFileSize(originalSize),
          compressedSize: formatFileSize(compressedSize),
          reduction: reduction.toFixed(1) + '%',
          originalBytes: originalSize,
          compressedBytes: compressedSize
        };
      });
      
      setCompressionStats(stats);
      console.log('[Test] Compression completed:', stats);
      
    } catch (error) {
      console.error('[Test] Compression failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalOriginalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const totalCompressedSize = compressedFiles.reduce((sum, file) => sum + file.size, 0);
  const totalReduction = totalOriginalSize > 0 ? 
    ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100 : 0;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Teste de Compressão de Imagens (Frontend)</CardTitle>
          <CardDescription>
            Teste do redimensionamento e compressão de imagens no navegador
            (Largura máxima: 900px, Qualidade: 80%)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                {selectedFiles.length} arquivo(s) selecionado(s) - 
                Tamanho total: {formatFileSize(totalOriginalSize)}
              </p>
              
              <Button 
                onClick={handleCompress}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Processando...' : 'Comprimir Imagens'}
              </Button>

              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-center">{progress.toFixed(0)}% concluído</p>
                </div>
              )}
            </div>
          )}

          {compressionStats.length > 0 && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Resultados da Compressão</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Tamanho Original:</span>
                    <span className="ml-2">{formatFileSize(totalOriginalSize)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Tamanho Comprimido:</span>
                    <span className="ml-2">{formatFileSize(totalCompressedSize)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Redução Total:</span>
                    <span className="ml-2 text-green-600">{totalReduction.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="font-medium">Processamento:</span>
                    <span className="ml-2 text-blue-600">Frontend (Browser)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Detalhes por Arquivo:</h4>
                <div className="max-h-64 overflow-y-auto">
                  {compressionStats.map((stat, index) => (
                    <div key={index} className="border rounded p-3 text-sm">
                      <div className="font-medium truncate">{stat.filename}</div>
                      <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-gray-600">
                        <div>Original: {stat.originalSize}</div>
                        <div>Comprimido: {stat.compressedSize}</div>
                        <div className="text-green-600">-{stat.reduction}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
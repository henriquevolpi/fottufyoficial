import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CopyNamesButtonProps {
  selectedPhotos: Array<{
    id: string;
    url: string;
    filename: string;
    originalName?: string;
  }>;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost" | "secondary";
}

export function CopyNamesButton({ 
  selectedPhotos, 
  className = "", 
  size = "sm",
  variant = "outline"
}: CopyNamesButtonProps) {
  const { toast } = useToast();

  const copyNamesWithoutExtension = async () => {
    if (!selectedPhotos || selectedPhotos.length === 0) {
      toast({
        title: "Nenhuma foto selecionada",
        description: "Não há fotos selecionadas para copiar os nomes.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Extrair nomes de arquivos e remover extensões
      const namesWithoutExtension = selectedPhotos.map(photo => {
        // Usar originalName se disponível, senão usar filename
        const fileName = photo.originalName || photo.filename;
        
        // Remover extensões comuns (case insensitive)
        const nameWithoutExt = fileName.replace(/\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i, '');
        
        return nameWithoutExt;
      });

      // Criar lista formatada
      const namesList = namesWithoutExtension.join('\n');
      
      // Copiar para clipboard
      await navigator.clipboard.writeText(namesList);
      
      toast({
        title: "Copiado com sucesso!",
        description: `${selectedPhotos.length} nome(s) de arquivo copiado(s) sem extensão.`,
      });
    } catch (error) {
      console.error('Erro ao copiar nomes:', error);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar os nomes para a área de transferência.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={copyNamesWithoutExtension}
      size={size}
      variant={variant}
      className={`${className}`}
      disabled={!selectedPhotos || selectedPhotos.length === 0}
    >
      <Copy className="h-4 w-4 mr-2" />
      Copiar nomes sem extensão
    </Button>
  );
}
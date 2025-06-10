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
        const fileName = photo.originalName || photo.filename || 'Arquivo sem nome';
        
        // Remover extensões comuns (case insensitive)
        const nameWithoutExt = fileName.replace(/\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i, '');
        
        return nameWithoutExt;
      });

      // Criar lista formatada
      const namesList = namesWithoutExtension.join('\n');
      
      // Verificar se clipboard API está disponível
      if (!navigator.clipboard) {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = namesList;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            toast({
              title: "Nomes copiados com sucesso!",
              description: `${selectedPhotos.length} nome(s) de arquivo copiado(s) sem extensão.`,
            });
          } else {
            throw new Error('Comando copy falhou');
          }
        } catch (err) {
          document.body.removeChild(textArea);
          throw err;
        }
      } else {
        // Usar clipboard API moderna
        await navigator.clipboard.writeText(namesList);
        toast({
          title: "Nomes copiados com sucesso!",
          description: `${selectedPhotos.length} nome(s) de arquivo copiado(s) sem extensão.`,
        });
      }
    } catch (error) {
      console.error('Erro ao copiar nomes:', error);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar os nomes para a área de transferência. Verifique as permissões do navegador.",
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
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, Image } from "lucide-react";
import { compressMultipleImages, isImageFile } from "@/lib/imageCompression";
import { useGlobalUploadProtection } from "@/hooks/use-upload-protection";
import { detectDevice, detectBrowserCapabilities, detectConnection, logEnvironmentInfo, getRecommendedUploadSettings } from "@/lib/deviceDetection";
import { useUploadAnalytics } from "@/lib/uploadAnalytics";
import { validateUpload, generateSafetyRecommendations } from "@/lib/uploadValidator";
import { saveUploadBackup, generateBackupSessionId, updateUploadProgress, removeUploadBackup } from "@/lib/uploadBackup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Interface para o objeto de projeto retornado pela API
interface ProjectResponse {
  id: number;
  publicId: string;
  name: string;
  clientName: string;
  clientEmail: string;
  photographerId: number;
  status: string;
  photos: Array<{
    id: string;
    url: string;
    filename: string;
  }>;
  selectedPhotos: string[];
  createdAt?: string;
}

// Form validation schema
const uploadFormSchema = z.object({
  nome: z
    .string()
    .min(3, { message: "Project name must be at least 3 characters" }),
  cliente: z
    .string()
    .min(3, { message: "Client name must be at least 3 characters" }),
  emailCliente: z.string().email({ message: "Invalid email address" }),
  dataEvento: z.string().min(1, { message: "Event date is required" }),
  observacoes: z.string().optional(),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload?: (project: any) => void;
}

export default function UploadModal({
  open,
  onClose,
  onUpload,
}: UploadModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "completed"
  >("idle");

  // Sistema de proteção contra tela branca
  const {
    startUpload,
    updateProgress,
    reportActivity,
    finishUpload,
    cancelUpload
  } = useGlobalUploadProtection();

  // Sistema de analytics e detecção (100% seguro)
  const analytics = useUploadAnalytics();

  // 🧹 SISTEMA DE LIMPEZA AGRESSIVA OTIMIZADO
  const aggressiveCleanup = (options: {
    urls?: string[];
    files?: File[];
    formData?: FormData[];
    forced?: boolean;
  } = {}) => {
    try {
      // Limpeza de URLs de preview
      if (options.urls) {
        options.urls.forEach(url => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        options.urls.length = 0;
      }
      
      // Limpeza de referências de arquivos
      if (options.files) {
        options.files.forEach((file, index) => {
          options.files![index] = null as any;
        });
        options.files.length = 0;
      }
      
      // 🆕 LIMPEZA DE FORMDATA - CRÍTICO
      if (options.formData) {
        options.formData.forEach((fd, index) => {
          try {
            // FormData não tem método clear, mas podemos nullificar a referência
            options.formData![index] = null as any;
          } catch (e) {}
        });
        options.formData.length = 0;
      }
      
      // Garbage collection forçado se crítico ou solicitado
      if (options.forced || typeof window !== 'undefined') {
        const memInfo = (window.performance as any)?.memory;
        const shouldForceGC = options.forced || (memInfo && memInfo.usedJSHeapSize > memInfo.totalJSHeapSize * 0.60);
        
        if (shouldForceGC && (window as any).gc) {
          try {
            // GC imediato para casos críticos
            if (options.forced) {
              (window as any).gc();
            }
            // GC com delay para não bloquear UI
            setTimeout(() => (window as any).gc(), 50);
          } catch (e) {}
        }
      }
    } catch (error) {
      console.warn('Erro na limpeza agressiva:', error);
    }
  };
  
  // Manter funções antigas para compatibilidade
  const cleanupPreviewUrls = (urls: string[]) => aggressiveCleanup({ urls });
  const cleanupFileReferences = (files: File[]) => aggressiveCleanup({ files, forced: true });

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      nome: "",
      cliente: "",
      emailCliente: "",
      dataEvento: new Date().toISOString().substring(0, 10),
      observacoes: "",
    },
  });

  const onSubmit = async (values: UploadFormValues) => {
    if (files.length === 0) {
      toast({
        title: "No photos selected",
        description: "Please select at least one photo for the project.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // ===== DETECÇÃO E VALIDAÇÃO PREVENTIVA (100% SEGURA) =====
    let deviceInfo = null;
    let sessionId = null;
    let recommendedSettings = null;
    let backupSessionId = null;
    
    try {
      // Detectar ambiente e capabilities (não afeta upload se falhar)
      deviceInfo = {
        device: detectDevice(),
        capabilities: detectBrowserCapabilities(),
        connection: detectConnection()
      };
      
      // Log completo do ambiente
      logEnvironmentInfo();
      
      // VALIDAÇÃO PREVENTIVA DE SEGURANÇA
      const validation = validateUpload(files);
      const safetyRecommendations = generateSafetyRecommendations(validation);
      
      // Exibir validação de segurança
      console.log('=== VALIDAÇÃO DE SEGURANÇA ===');
      safetyRecommendations.forEach(rec => {
        if (rec.includes('❌')) {
          console.error(rec);
        } else if (rec.includes('⚠️')) {
          console.warn(rec);
        } else {
          console.log(rec);
        }
      });
      
      // Mostrar riscos detectados
      if (validation.risks.length > 0) {
        console.log('=== RISCOS DETECTADOS ===');
        validation.risks.forEach(risk => {
          const level = risk.level === 'critical' ? '🔴' : 
                      risk.level === 'high' ? '🟠' : 
                      risk.level === 'medium' ? '🟡' : '🟢';
          console.log(`${level} ${risk.category.toUpperCase()}: ${risk.message}`);
          console.log(`   Recomendação: ${risk.recommendation}`);
          if (risk.technical) {
            console.log(`   Técnico: ${risk.technical}`);
          }
        });
        console.log('===============================');
      }
      
      // Criar sessão de backup
      backupSessionId = generateBackupSessionId();
      saveUploadBackup(backupSessionId, {
        projectData: {
          nome: values.nome,
          cliente: values.cliente,
          emailCliente: values.emailCliente,
          dataEvento: values.dataEvento,
          observacoes: values.observacoes || ""
        },
        files: files.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
          lastModified: f.lastModified
        }))
      });
      
      // Obter configurações recomendadas
      recommendedSettings = getRecommendedUploadSettings();
      
      // Iniciar analytics
      const totalSize = files.reduce((acc, file) => acc + file.size, 0);
      sessionId = analytics.startSession(files.length, totalSize, deviceInfo);
      
      // Mostrar warnings se houver
      if (recommendedSettings.warnings.length > 0) {
        console.log('=== AVISOS DE COMPATIBILIDADE ===');
        recommendedSettings.warnings.forEach(warning => {
          console.warn(`⚠️ ${warning}`);
        });
        console.log('===============================');
      }
    } catch (error) {
      // Falha silenciosa - não deve afetar upload
      console.warn('[Detecção] Erro na detecção do ambiente (upload continua):', error);
    }

    try {
      // Ativar sistema de proteção contra tela branca
      startUpload(files.length);
      
      // ETAPA 1: Redimensionar imagens no front-end antes do upload
      console.log(`[Frontend] Iniciando redimensionamento de ${files.length} imagens antes do upload`);
      
      // Analytics: início da compressão
      try {
        if (sessionId) {
          analytics.logEvent('compression_start', {
            fileCount: files.length,
            totalSizeMB: (files.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(2),
            deviceType: deviceInfo?.device?.type || 'unknown',
            webWorkerSupported: deviceInfo?.capabilities?.supportsWebWorker || false
          });
        }
      } catch (e) { /* Falha silenciosa */ }
      
      setUploadStatus("uploading");
      setUploadPercentage(10); // 10% - iniciando processamento
      
      // Reportar atividade para evitar detectar travamento
      reportActivity();

      // Redimensionar todas as imagens com progresso
      const compressedFiles = await compressMultipleImages(
        files,
        {
          maxWidthOrHeight: 970, // Largura máxima padronizada
          quality: 0.9, // Qualidade padronizada
          useWebWorker: true,
        },
        (processed, total) => {
          // Atualizar progresso do redimensionamento (10% a 40%)
          const compressionProgress = 10 + ((processed / total) * 30);
          setUploadPercentage(Math.round(compressionProgress));
          
          // Atualizar sistema de proteção global
          updateProgress(
            compressionProgress,
            `Comprimindo imagens... ${processed}/${total}`,
            processed
          );
          
          // Reportar atividade para evitar detectar travamento
          reportActivity();
        }
      );

      console.log(`[Frontend] Redimensionamento concluído: ${compressedFiles.length} imagens processadas`);
      
      // Analytics: fim da compressão
      try {
        if (sessionId) {
          const originalSize = files.reduce((acc, file) => acc + file.size, 0);
          const compressedSize = compressedFiles.reduce((acc, file) => acc + file.size, 0);
          const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
          
          analytics.logEvent('compression_end', {
            originalSizeMB: (originalSize / 1024 / 1024).toFixed(2),
            compressedSizeMB: (compressedSize / 1024 / 1024).toFixed(2),
            compressionRatio: parseFloat(compressionRatio),
            durationMs: Date.now() - (sessionId ? parseInt(sessionId.split('_')[1]) : Date.now())
          });
        }
      } catch (e) { /* Falha silenciosa */ }
      
      // Backup: compressão concluída
      try {
        if (backupSessionId) {
          updateUploadProgress(backupSessionId, 'upload', 40, compressedFiles.length, files.length);
        }
      } catch (e) { /* Falha silenciosa */ }
      
      setUploadPercentage(40); // 40% - redimensionamento concluído
      
      // Atualizar proteção global
      updateProgress(40, "Compressão concluída, iniciando upload...", compressedFiles.length);
      reportActivity();

      // ETAPA 2: Envio em lotes para evitar travamento do navegador
      console.log(`[Frontend] Iniciando envio em lotes de ${compressedFiles.length} imagens`);
      
      const projectData = {
        nome: values.nome,
        cliente: values.cliente,
        emailCliente: values.emailCliente,
        dataEvento: values.dataEvento,
        observacoes: values.observacoes || "",
      };

      // Importar função de upload em lotes dinamicamente
      const { uploadInBatches } = await import("@/lib/batchUpload");
      
      // Enviar imagens em lotes (progresso 40% a 100%)
      const batchResult = await uploadInBatches(
        compressedFiles,
        projectData,
        (percentage: number) => {
          setUploadPercentage(Math.round(percentage));
          
          // Atualizar sistema de proteção global
          updateProgress(
            percentage,
            `Enviando imagens para o servidor...`,
            Math.floor((percentage / 100) * files.length)
          );
          
          // Reportar atividade para evitar detectar travamento
          reportActivity();
        }
      );

      if (!batchResult.success) {
        throw new Error(batchResult.message || "Falha no upload em lotes");
      }

      setUploadStatus("completed");
      const newProject = batchResult.data;
      console.log("Projeto criado com sucesso via upload em lotes:", newProject);
      
      // Analytics: sucesso do upload
      try {
        if (sessionId) {
          analytics.endSession(true, {
            projectId: newProject.id || 'unknown',
            finalFileCount: newProject.photos?.length || files.length,
            success: true
          });
        }
      } catch (e) { /* Falha silenciosa */ }
      
      // Backup: upload concluído com sucesso
      try {
        if (backupSessionId) {
          updateUploadProgress(backupSessionId, 'completed', 100, files.length, files.length);
          // Remover backup após sucesso
          setTimeout(() => removeUploadBackup(backupSessionId), 5000);
        }
      } catch (e) { /* Falha silenciosa */ }
      
      // Finalizar sistema de proteção global
      finishUpload();

      // Create link for sharing (useful for console debugging)
      const shareableLink = `${window.location.origin}/project-view/${newProject.id}`;
      console.log("Link para compartilhamento criado:", shareableLink);

      // Show success message
      toast({
        title: "Project created successfully",
        description: `Project "${values.nome}" was created with ${files.length} photos.`,
      });

      // Format project data for dashboard display compatibility
      const formattedProject = {
        ...newProject,
        nome: newProject.name,
        cliente: newProject.clientName,
        emailCliente: newProject.clientEmail,
        fotos: newProject.photos ? newProject.photos.length : 0,
        selecionadas: newProject.selectedPhotos
          ? newProject.selectedPhotos.length
          : 0,
      };

      // Call the onUpload callback with the complete formatted project data
      if (onUpload) {
        onUpload(formattedProject);
      }

      // ETAPA 3: Limpeza de memória após upload bem-sucedido
      console.log(`[Frontend] Iniciando limpeza de memória após upload bem-sucedido`);
      
      // Liberar URLs de preview
      cleanupPreviewUrls(previews);
      console.log(`[Frontend] ${previews.length} URLs de preview liberadas`);
      
      // Limpar referências de arquivos originais
      const originalFilesCount = files.length;
      cleanupFileReferences(files);
      console.log(`[Frontend] ${originalFilesCount} referências de arquivos originais liberadas`);
      
      // Nota: Arquivos comprimidos são liberados automaticamente pela função uploadInBatches
      console.log(`[Frontend] Limpeza de memória concluída após upload bem-sucedido`);

      // Reset form and close modal only after project creation is confirmed
      form.reset();
      setFiles([]);
      setPreviews([]);
      setUploadPercentage(0);
      setUploadStatus("idle");
      onClose();
    } catch (error) {
      console.error("Error creating project:", error);
      
      // Analytics: erro no upload
      try {
        if (sessionId) {
          analytics.logEvent('error', {
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
            stage: 'upload',
            deviceInfo: deviceInfo?.device || {},
            filesCount: files.length
          });
          
          analytics.endSession(false, {
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } catch (e) { /* Falha silenciosa */ }
      
      // Backup: erro no upload
      try {
        if (backupSessionId) {
          updateUploadProgress(backupSessionId, 'failed', 0, 0, files.length);
          // Manter backup para possível recuperação
        }
      } catch (e) { /* Falha silenciosa */ }
      
      // Cancelar sistema de proteção global em caso de erro
      cancelUpload();
      
      // LIMPEZA DE MEMÓRIA EM CASO DE ERRO
      console.log(`[Frontend] Liberando memória devido a erro no upload`);
      
      // Liberar URLs de preview
      cleanupPreviewUrls(previews);
      console.log(`[Frontend] ${previews.length} URLs de preview liberadas após erro`);
      
      // Limpar referências de arquivos originais em caso de erro
      const originalFilesCount = files.length;
      if (originalFilesCount > 0) {
        cleanupFileReferences(files);
        console.log(`[Frontend] ${originalFilesCount} referências de arquivos originais liberadas após erro`);
      }
      
      // Tratamento específico para erro de limite de upload
      let errorTitle = "Erro ao criar projeto";
      let errorDescription = "Ocorreu um erro ao criar o projeto. Tente novamente.";
      
      if (error instanceof Error) {
        // Verificar se é um erro de resposta da API
        try {
          const errorResponse = JSON.parse(error.message);
          if (errorResponse.error === "UPLOAD_LIMIT_REACHED") {
            errorTitle = "Limite de uploads atingido";
            errorDescription = errorResponse.details || "Você atingiu o limite de uploads do seu plano atual.";
          } else {
            errorDescription = errorResponse.details || error.message;
          }
        } catch {
          // Se não conseguir parsear como JSON, é uma mensagem de erro simples
          if (error.message.includes("limit") || error.message.includes("limite")) {
            errorTitle = "Limite de uploads atingido";
            errorDescription = "Você atingiu o limite de uploads do seu plano. Verifique sua assinatura no painel ou entre em contato com nosso suporte.";
          } else {
            errorDescription = error.message;
          }
        }
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setUploadStatus("idle");
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (droppedFiles.length === 0) {
      toast({
        title: "Invalid files",
        description: "Please select only image files.",
        variant: "destructive",
      });
      return;
    }

    addFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const selectedFiles = Array.from(e.target.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    addFiles(selectedFiles);

    // Limpar o input para permitir selecionar os mesmos arquivos novamente
    e.target.value = "";
  };

  const addFiles = (newFiles: File[]) => {
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB em bytes
    
    // Verificar arquivos acima de 2MB
    const oversizedFiles = newFiles.filter(file => file.size > MAX_FILE_SIZE);
    const validFiles = newFiles.filter(file => file.size <= MAX_FILE_SIZE);
    
    // Se há arquivos muito grandes, mostrar aviso e bloquear
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ');
      toast({
        title: "Arquivos muito grandes",
        description: `Envie apenas fotos abaixo de 2MB. Arquivos rejeitados: ${fileNames}`,
        variant: "destructive",
      });
      
      // Se todos os arquivos são muito grandes, não adicionar nenhum
      if (validFiles.length === 0) {
        return;
      }
    }

    // Continuar apenas com os arquivos válidos
    const combinedFiles = [...files, ...validFiles];
    setFiles(combinedFiles);

    // Apenas atualizar a contagem de arquivos sem criar previews visuais
    // Isso é importante para que o resto da lógica continue funcionando
    setPreviews((prev) => [
      ...prev,
      ...Array(validFiles.length).fill("placeholder"),
    ]);
  };

  const removeFile = (index: number) => {
    // Liberar URL de preview específica antes de remover
    const urlToRevoke = previews[index];
    if (urlToRevoke && urlToRevoke.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRevoke);
      console.log(`[Frontend] URL de preview liberada: ${urlToRevoke}`);
    }

    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);

    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
  };

  // Limpar o estado quando o modal for fechado
  const handleClose = () => {
    if (!isSubmitting) {
      // Liberar URLs de preview antes de limpar
      cleanupPreviewUrls(previews);
      console.log(`[Frontend] ${previews.length} URLs de preview liberadas no fechamento do modal`);
      
      // Limpar referências de arquivos
      const filesCount = files.length;
      cleanupFileReferences(files);
      console.log(`[Frontend] ${filesCount} referências de arquivos liberadas no fechamento do modal`);
      
      form.reset();
      setFiles([]);
      setPreviews([]);
      setUploadPercentage(0);
      setUploadStatus("idle");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-gradient-to-br from-white/95 via-blue-50/20 to-indigo-50/30 shadow-2xl border border-white/20 rounded-2xl">
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-br from-white/95 via-blue-50/30 to-indigo-50/20 backdrop-blur-sm pb-6 rounded-t-2xl border-b border-blue-100/30">
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            ✨ Criar Novo Projeto
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-base leading-relaxed">
            Preencha os detalhes do projeto e faça upload das suas fotos. Todos os campos são obrigatórios para criar uma experiência completa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    📋 Nome do Projeto
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Casamento João & Maria" 
                      className="h-12 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/80 backdrop-blur-sm rounded-xl text-base shadow-sm transition-all" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cliente"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    👤 Nome do Cliente
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: João Silva" 
                      className="h-12 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/80 backdrop-blur-sm rounded-xl text-base shadow-sm transition-all" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emailCliente"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    📧 Email do Cliente
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="cliente@exemplo.com"
                      type="email"
                      className="h-12 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/80 backdrop-blur-sm rounded-xl text-base shadow-sm transition-all"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataEvento"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    📅 Data do Evento
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      className="h-12 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/80 backdrop-blur-sm rounded-xl text-base shadow-sm transition-all" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    📝 Observações
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anotações adicionais sobre o projeto..."
                      className="resize-none min-h-[100px] border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/80 backdrop-blur-sm rounded-xl text-base shadow-sm transition-all"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                📸 Fotos do Projeto
              </FormLabel>
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                  isDragging
                    ? "border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-[1.02]"
                    : "border-slate-300 bg-gradient-to-br from-slate-50/50 to-blue-50/30 hover:border-blue-300 hover:shadow-md"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-base font-medium text-slate-700 mb-2">
                    Arraste e solte suas fotos aqui
                  </p>
                  <p className="text-sm text-slate-500 mb-4">
                    ou clique no botão abaixo para selecionar
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-white/80 backdrop-blur-sm border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-blue-700 font-medium rounded-xl px-6 py-2 transition-all shadow-sm"
                    onClick={() => {
                      document.getElementById("file-upload")?.click();
                    }}
                  >
                    📁 Selecionar do Computador
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <p className="text-xs text-slate-500 mt-3 bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200">
                    ✨ JPG, PNG, GIF - sem limite de tamanho
                  </p>
                </div>
              </div>

              {previews.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-sm font-semibold text-slate-700">
                      {previews.length} foto{previews.length !== 1 ? "s" : ""} selecionada{previews.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Lista de nomes de arquivos */}
                  <div className="border border-slate-200 rounded-xl max-h-[280px] overflow-y-auto bg-white/60 backdrop-blur-sm shadow-sm">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-3 px-4 border-b border-slate-100 last:border-b-0 hover:bg-blue-50/50 transition-all group"
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                            <Image className="h-4 w-4 text-blue-600" />
                          </div>
                          <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Contador removido já que todas as fotos são exibidas na lista */}
                </div>
              )}
            </div>

            {isSubmitting && (
              <div className="w-full flex flex-col gap-3 mt-6 p-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 rounded-xl border border-blue-100/50 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-slate-700">
                    {uploadStatus === "completed" ? "✅ Upload concluído!" : "📤 Enviando fotos..."}
                  </p>
                </div>
                <div className="h-3 bg-white/60 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full transition-all duration-500 ease-out rounded-full ${
                      uploadStatus === "completed"
                        ? "bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse"
                        : "bg-gradient-to-r from-blue-500 to-indigo-600"
                    }`}
                    style={{
                      width:
                        uploadStatus === "completed"
                          ? "100%"
                          : `${uploadPercentage}%`,
                    }}
                  />
                </div>
                <div className="text-sm text-slate-600 text-center font-medium">
                  {uploadStatus === "completed"
                    ? "🎉 Projeto criado com sucesso!"
                    : `${uploadPercentage}% concluído`}
                </div>
              </div>
            )}

            <DialogFooter className="sticky bottom-0 z-10 bg-gradient-to-br from-white/95 via-blue-50/30 to-indigo-50/20 backdrop-blur-sm pt-6 mt-8 border-t border-blue-100/30 rounded-b-2xl">
              <div className="flex gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 h-12 border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium rounded-xl transition-all"
                >
                  ❌ Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30 border-0"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ⏳ Criando projeto...
                    </>
                  ) : (
                    "✨ Criar Projeto"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

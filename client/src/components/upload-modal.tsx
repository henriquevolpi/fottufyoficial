import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, Image } from "lucide-react";
import { compressMultipleImages, isImageFile } from "@/lib/imageCompression";
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

  // Função para liberar URLs de preview e limpar memória
  const cleanupPreviewUrls = (urlsToCleanup: string[]) => {
    urlsToCleanup.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  };

  // Função para limpar referências de arquivos e liberar memória
  const cleanupFileReferences = (filesToCleanup: File[]) => {
    // Forçar liberação das referências
    filesToCleanup.length = 0;
    
    // Sugerir garbage collection se disponível (apenas para debug)
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        setTimeout(() => (window as any).gc(), 100);
      } catch (e) {
        // Ignorar erro se gc não estiver disponível
      }
    }
  };

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

    try {
      // ETAPA 1: Redimensionar imagens no front-end antes do upload
      console.log(`[Frontend] Iniciando redimensionamento de ${files.length} imagens antes do upload`);
      
      setUploadStatus("uploading");
      setUploadPercentage(10); // 10% - iniciando processamento

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
        }
      );

      console.log(`[Frontend] Redimensionamento concluído: ${compressedFiles.length} imagens processadas`);
      setUploadPercentage(40); // 40% - redimensionamento concluído

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
        (percentage) => {
          setUploadPercentage(Math.round(percentage));
        }
      );

      if (!batchResult.success) {
        throw new Error(batchResult.message || "Falha no upload em lotes");
      }

      setUploadStatus("completed");
      const newProject = batchResult.data;
      console.log("Projeto criado com sucesso via upload em lotes:", newProject);

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
      
      toast({
        title: "Error creating project",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while creating the project. Please try again.",
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
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto backdrop-blur-sm bg-white/95 shadow-2xl border-0">
        <DialogHeader className="sticky top-0 z-10 bg-white pb-4">
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Fill in the project details and upload your photos. All fields are
            required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Wedding Photoshoot" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cliente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John and Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emailCliente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="client@example.com"
                      type="email"
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
                <FormItem>
                  <FormLabel>Event Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the project..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Photos</FormLabel>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-gray-300"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
              >
                <div className="flex flex-col items-center">
                  <Upload className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop photos here, or
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      document.getElementById("file-upload")?.click();
                    }}
                  >
                    Select from computer
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    JPG, PNG, GIF - sem limite de tamanho
                  </p>
                </div>
              </div>

              {previews.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">
                    {previews.length} photo{previews.length !== 1 ? "s" : ""}{" "}
                    selected
                  </p>

                  {/* Lista de nomes de arquivos */}
                  <div className="border rounded-md max-h-[260px] overflow-y-auto">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-2 overflow-hidden">
                          <Image className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <p className="text-sm truncate">{file.name}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
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
              <div className="w-full flex flex-col gap-2 mt-4">
                <div className="h-2 bg-gray-200 rounded overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ease-in-out ${
                      uploadStatus === "completed"
                        ? "bg-green-500 animate-pulse"
                        : "bg-primary"
                    }`}
                    style={{
                      width:
                        uploadStatus === "completed"
                          ? "100%"
                          : `${uploadPercentage}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1 text-center">
                  {uploadStatus === "completed"
                    ? "Upload completed!"
                    : `Uploading photos... ${uploadPercentage}%`}
                </div>
              </div>
            )}

            <DialogFooter className="sticky bottom-0 z-10 bg-white pt-4 mt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

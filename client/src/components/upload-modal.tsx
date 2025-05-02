import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, Image } from "lucide-react";
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
  nome: z.string().min(3, { message: "Project name must be at least 3 characters" }),
  cliente: z.string().min(3, { message: "Client name must be at least 3 characters" }),
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

export default function UploadModal({ open, onClose, onUpload }: UploadModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'completed'>('idle');

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
      // Create FormData for sending files
      const formData = new FormData();
      
      // Add project data with names matching the server API fields
      formData.append('name', values.nome);
      formData.append('clientName', values.cliente);
      formData.append('clientEmail', values.emailCliente);
      formData.append('date', values.dataEvento);
      formData.append('notes', values.observacoes || "");
      formData.append('photographerId', '1'); // Using default ID
      
      // Add photos to FormData - server expects 'photos' field name for multer
      files.forEach(file => {
        // Each file with the same field name 'photos' for multer array handling
        formData.append('photos', file);
      });
      
      // Add total count of photos
      formData.append('photoCount', files.length.toString());

      // Use a fallback approach for browsers that don't support FormData properly
      // Create JSON photosData as a backup - sem usar os previews visuais
      const photoDataJson = JSON.stringify(
        files.map(file => ({
          // Não enviamos URLs de preview, apenas o nome do arquivo que é suficiente
          // para o servidor processar o upload corretamente
          url: "",  // Campo vazio, o servidor usará os arquivos enviados diretamente
          filename: file.name
        }))
      );
      formData.append('photosData', photoDataJson);

      // Reset upload status
      setUploadStatus('uploading');
      setUploadPercentage(0);

      // Send data to API endpoint using XMLHttpRequest for upload progress tracking
      const newProject = await new Promise<ProjectResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            setUploadPercentage(percentage);
          }
        };
        
        // Handle completion
        xhr.onload = () => {
          setUploadStatus('completed');
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid JSON response from server'));
            }
          } else {
            let errorMessage = 'Failed to create project';
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              // If we can't parse JSON, use the status text
              errorMessage = `Server error: ${xhr.statusText}`;
            }
            reject(new Error(errorMessage));
          }
        };
        
        // Handle network errors
        xhr.onerror = () => {
          setUploadStatus('idle');
          reject(new Error('Network error occurred'));
        };
        
        // Send the request
        xhr.open('POST', '/api/projects', true);
        xhr.send(formData);
      });
      console.log("Projeto criado com sucesso na API:", newProject);
      
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
        selecionadas: newProject.selectedPhotos ? newProject.selectedPhotos.length : 0
      };

      // Call the onUpload callback with the complete formatted project data
      if (onUpload) {
        onUpload(formattedProject);
      }
      
      // Reset form and close modal only after project creation is confirmed
      form.reset();
      setFiles([]);
      setPreviews([]);
      onClose();

    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error creating project",
        description: error instanceof Error ? error.message : "An error occurred while creating the project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith("image/")
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

    const selectedFiles = Array.from(e.target.files).filter(
      file => file.type.startsWith("image/")
    );
    
    addFiles(selectedFiles);
    
    // Limpar o input para permitir selecionar os mesmos arquivos novamente
    e.target.value = "";
  };

  const addFiles = (newFiles: File[]) => {
    // Não há mais verificação de tamanho máximo - todos os arquivos são aceitos
    const validFiles: File[] = newFiles;
    
    // Continuar apenas com os arquivos válidos
    const combinedFiles = [...files, ...validFiles];
    setFiles(combinedFiles);
    
    // Apenas atualizar a contagem de arquivos sem criar previews visuais
    // Isso é importante para que o resto da lógica continue funcionando
    setPreviews(prev => [...prev, ...Array(validFiles.length).fill("placeholder")]);
  };

  const removeFile = (index: number) => {
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
      form.reset();
      setFiles([]);
      setPreviews([]);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 z-10 bg-white pb-4">
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Fill in the project details and upload your photos. All fields are required.
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
                  isDragging ? "border-primary bg-primary/10" : "border-gray-300"
                }`}
                onDragOver={e => {
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
                    {previews.length} photo{previews.length !== 1 ? "s" : ""} selected
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
                      uploadStatus === 'completed'
                        ? 'bg-green-500 animate-pulse'
                        : 'bg-primary'
                    }`}
                    style={{ width: uploadStatus === 'completed' ? '100%' : `${uploadPercentage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1 text-center">
                  {uploadStatus === 'completed'
                    ? 'Upload completed!'
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
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
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
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

// Schema para validação do formulário
const uploadFormSchema = z.object({
  nome: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  cliente: z.string().min(3, { message: "Cliente deve ter pelo menos 3 caracteres" }),
  emailCliente: z.string().email({ message: "Email inválido" }),
  dataEvento: z.string().min(1, { message: "Data é obrigatória" }),
  observacoes: z.string().optional(),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UploadModal({ open, onClose }: UploadModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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
      // Convert base64 images to a format ready for API submission
      const photoData = previews.map((preview, index) => ({
        url: preview, // Using the data URL for now, will be stored by the server
        filename: files[index].name,
      }));

      // Create project data according to API requirements
      const projectData = {
        name: values.nome,
        clientName: values.cliente,
        clientEmail: values.emailCliente,
        date: values.dataEvento,
        notes: values.observacoes || "",
        photographerId: 1, // Using default ID
        photos: photoData
      };

      // Send data to API endpoint
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project');
      }

      const newProject = await response.json();

      // Show success message
      toast({
        title: "Project created successfully",
        description: `Project "${values.nome}" was created with ${photoData.length} photos.`,
      });

      // Reset form and close modal
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
        title: "Arquivos inválidos",
        description: "Por favor, selecione apenas arquivos de imagem.",
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
    const combinedFiles = [...files, ...newFiles];
    setFiles(combinedFiles);

    // Criar previews para as novas imagens
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        if (e.target?.result) {
          setPreviews(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Fill in the project details and upload your photos.
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
                  <FormLabel>Data do Evento</FormLabel>
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
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais sobre o projeto..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Fotos</FormLabel>
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
                    Arraste e solte as fotos aqui, ou
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      document.getElementById("file-upload")?.click();
                    }}
                  >
                    Selecione do computador
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
                    JPG, PNG, GIF até 10MB
                  </p>
                </div>
              </div>

              {previews.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">
                    {previews.length} foto{previews.length !== 1 ? "s" : ""} selecionada{previews.length !== 1 ? "s" : ""}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="relative aspect-square rounded-md overflow-hidden border">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-white hover:text-red-400"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-6 w-6" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs truncate mt-1">
                          {files[index]?.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Projeto"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
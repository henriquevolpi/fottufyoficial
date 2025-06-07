import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Upload, Image } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { nanoid } from "nanoid";
import { uploadMultipleFiles } from "@/lib/fileUpload";

const uploadFormSchema = z.object({
  name: z.string().min(2, { message: "Project name must be at least 2 characters" }),
  clientName: z.string().min(2, { message: "Client name must be at least 2 characters" }),
  clientEmail: z.string().email({ message: "Please enter a valid email address" }),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

export default function UploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      name: "",
      clientName: "",
      clientEmail: "",
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
      
      // Verificar arquivos acima de 2MB
      const oversizedFiles = fileArray.filter(file => file.size > MAX_FILE_SIZE);
      const validFiles = fileArray.filter(file => file.size <= MAX_FILE_SIZE);
      
      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map(f => f.name).join(', ');
        toast({
          title: "Arquivos muito grandes",
          description: `Envie apenas fotos abaixo de 2MB. Arquivos rejeitados: ${fileNames}`,
          variant: "destructive",
        });
        
        if (validFiles.length === 0) {
          return;
        }
      }
      
      setSelectedFiles(validFiles);
      
      // Create thumbnails for preview only
      const newThumbnails = validFiles.map(file => URL.createObjectURL(file));
      setThumbnails(prev => [...prev, ...newThumbnails]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
      
      // Verificar arquivos acima de 2MB
      const oversizedFiles = fileArray.filter(file => file.size > MAX_FILE_SIZE);
      const validFiles = fileArray.filter(file => file.size <= MAX_FILE_SIZE);
      
      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map(f => f.name).join(', ');
        toast({
          title: "Arquivos muito grandes",
          description: `Envie apenas fotos abaixo de 2MB. Arquivos rejeitados: ${fileNames}`,
          variant: "destructive",
        });
        
        if (validFiles.length === 0) {
          return;
        }
      }
      
      setSelectedFiles(prev => [...prev, ...validFiles]);
      
      // Create thumbnails for preview only
      const newThumbnails = validFiles.map(file => URL.createObjectURL(file));
      setThumbnails(prev => [...prev, ...newThumbnails]);
    }
  }, [toast]);

  const onSubmit = async (values: UploadFormValues) => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one photo to upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Upload files to Supabase Storage and get permanent URLs
      toast({
        title: "Uploading photos",
        description: `Uploading ${selectedFiles.length} photos to storage...`,
      });
      
      // Upload each file and get permanent URLs
      const uploadedPhotos = await uploadMultipleFiles(selectedFiles);
      
      console.log(`Successfully uploaded ${uploadedPhotos.length} photos to storage`);
      
      // Create project with the permanent URLs
      const projectData = {
        name: values.name,
        clientName: values.clientName,
        clientEmail: values.clientEmail,
        photographerId: user?.id?.toString() || "",
        photos: uploadedPhotos // Use the permanent URLs from storage
      };
      
      console.log("Creating project with permanent URLs:", projectData);

      // Call API to create the project
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      toast({
        title: "Project created",
        description: `Successfully created project "${values.name}"`,
      });

      // Clean up thumbnails (browser memory)
      thumbnails.forEach(url => URL.revokeObjectURL(url));
      
      // Invalidate projects query and redirect to dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setLocation("/dashboard");
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Sidebar>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Create New P</h1>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Wedding Photos, Family Portrait, etc." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John Doe" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="client@example.com" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <FormLabel>Photos</FormLabel>
                <div 
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                    isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="space-y-1 text-center">
                    <Image className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>Upload files</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          multiple
                          accept="image/*"
                          onChange={handleFileChange}
                          ref={fileInputRef}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 10MB each
                    </p>
                  </div>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {thumbnails.map((thumbnail, idx) => (
                      <div key={idx} className="relative h-24 rounded overflow-hidden">
                        <div 
                          className="w-full h-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${thumbnail})` }}
                        />
                        <p className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs truncate px-1 py-0.5">
                          {selectedFiles[idx]?.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/dashboard")}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Sidebar>
  );
}

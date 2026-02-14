import React, { useEffect, useState, useRef, useCallback } from "react";
import PromotionalBanner from "@/components/PromotionalBanner";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { 
  BarChart, 
  Camera, 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  PlusCircle, 
  Search, 
  Filter, 
  ArrowUpRight,
  Loader2,
  X,
  Link as LinkIcon,
  RotateCcw,
  CreditCard,
  Settings,
  Key,
  HelpCircle,
  Shield,
  ShieldOff,
  MessageSquare,
  MessageCircle,
  Eye,
  Check,
  Image as ImageIcon,
  Moon,
  Sun,
  Send,
  Upload,
  Copy,
  Share2,
  Gift,
  Heart,
  Sparkles,
  Crown,
  ExternalLink,
  Award
} from "lucide-react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { CopyNamesButton } from "@/components/copy-names-button";
import { compressMultipleImages } from "@/lib/imageCompression";
import { PhotoComment } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import fottufinhopng from "@assets/fottufinhopng.webp";

// Dados fictícios para projetos
const PROJETOS_EXEMPLO = [
  {
    id: 1,
    nome: "Casamento Rodrigo e Ana",
    cliente: "Rodrigo Silva",
    emailCliente: "rodrigo.silva@example.com",
    data: "2023-04-15",
    status: "pendente",
    fotos: 3,
    selecionadas: 0,
    fotografoId: 1,
    photos: [
      {
        id: "photo-1",
        url: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "casal-1.jpg",
        selected: false
      },
      {
        id: "photo-2",
        url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "casal-2.jpg",
        selected: false
      },
      {
        id: "photo-3",
        url: "https://images.unsplash.com/photo-1546032996-6dfacbacbf3f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "casal-3.jpg",
        selected: false
      }
    ]
  },
  {
    id: 2,
    nome: "Aniversário de 15 anos - Maria",
    cliente: "Família Souza",
    emailCliente: "souza.familia@example.com",
    data: "2023-03-22",
    status: "revisado",
    fotos: 3,
    selecionadas: 2,
    fotografoId: 1,
    photos: [
      {
        id: "photo-4",
        url: "https://images.unsplash.com/photo-1551972578-f3e955bf9887?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "aniversario-1.jpg",
        selected: true
      },
      {
        id: "photo-5",
        url: "https://images.unsplash.com/photo-1525373698358-041e3a460346?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "aniversario-2.jpg",
        selected: true
      },
      {
        id: "photo-6",
        url: "https://images.unsplash.com/photo-1533294452740-9da4c4f8a416?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "aniversario-3.jpg",
        selected: false
      }
    ]
  },
  {
    id: 3,
    nome: "Ensaio Corporativo - Tech Inc",
    cliente: "Tech Incorporated",
    emailCliente: "contato@techinc.example.com",
    data: "2023-02-08",
    status: "finalizado",
    fotos: 3,
    selecionadas: 2,
    fotografoId: 1,
    photos: [
      {
        id: "photo-7",
        url: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "corporativo-1.jpg",
        selected: true
      },
      {
        id: "photo-8",
        url: "https://images.unsplash.com/photo-1573164574511-73c773193279?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "corporativo-2.jpg",
        selected: true
      },
      {
        id: "photo-9",
        url: "https://images.unsplash.com/photo-1551836022-aadb801c60e9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "corporativo-3.jpg",
        selected: false
      }
    ],
    finalizado: true
  },
  {
    id: 4,
    nome: "Evento de Lançamento - Natura",
    cliente: "Natura Cosméticos",
    emailCliente: "eventos@natura.example.com",
    data: "2023-01-30",
    status: "arquivado",
    fotos: 3,
    selecionadas: 3,
    fotografoId: 1,
    photos: [
      {
        id: "photo-10",
        url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "evento-1.jpg",
        selected: true
      },
      {
        id: "photo-11",
        url: "https://images.unsplash.com/photo-1511578314322-379afb476865?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "evento-2.jpg",
        selected: true
      },
      {
        id: "photo-12",
        url: "https://images.unsplash.com/photo-1505236858219-8359eb29e329?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "evento-3.jpg",
        selected: true
      }
    ],
    finalizado: true
  }
];

// Component for project cards
function ProjectCard({ project, onDelete, onViewComments }: { project: any, onDelete?: (id: number) => void, onViewComments?: (id: string) => void }) {
  // Note: We're using parameter renaming (projeto: project) to transition from Portuguese to English
  // while maintaining backward compatibility
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState(project?.status || "pending");
  const [showSelectionsModal, setShowSelectionsModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isTogglingWatermark, setIsTogglingWatermark] = useState(false);
  const [modalProject, setModalProject] = useState(project);
  const [showClientLinkModal, setShowClientLinkModal] = useState(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente": return "bg-yellow-100 text-yellow-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "revisado": return "bg-blue-100 text-blue-800";
      case "reviewed": return "bg-blue-100 text-blue-800";
      case "finalizado": return "bg-green-100 text-green-800";
      case "completed": return "bg-green-100 text-green-800";
      case "Completed": return "bg-green-100 text-green-800";
      case "arquivado": return "bg-gray-100 text-gray-800";
      case "archived": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case "pendente": return "Pendente";
      case "pending": return "Pendente";
      case "revisado": return "Revisado";
      case "reviewed": return "Revisado";
      case "finalizado": return "Finalizado";
      case "completed": return "Finalizado";
      case "Completed": return "Finalizado";
      case "arquivado": return "Arquivado";
      case "archived": return "Arquivado";
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US');
  };
  

  
  const handleEditGallery = () => {
    // Simulation - in a real app, would redirect to an edit page
    toast({
      title: "Edit gallery",
      description: `Opening project "${project.nome}" gallery for editing.`,
    });
    
    // Redirect to a project edit page
    setLocation(`/project/${project.id}/edit`);
  };
  
  const handleViewSelections = async () => {
    try {
      // Fetch the complete project data with photos
      const response = await fetch(`/api/projects/${project.id}`);
      if (response.ok) {
        const projectData = await response.json();
        setModalProject(projectData);
      } else {
        setModalProject(project);
      }
      setShowSelectionsModal(true);
    } catch (error) {
      console.error('Error fetching project details:', error);
      setModalProject(project);
      setShowSelectionsModal(true); // Still open modal even if fetch fails
    }
  };
  
  const handleDeleteProject = async () => {
    try {
      setIsDeleting(true);
      
      // Immediately call the parent component's delete handler for optimistic UI update
      if (onDelete) {
        onDelete(project.id);
      }
      
      // Close the modal immediately
      setShowDeleteConfirm(false);
      
      // Show informative message about deletion process
      const photoCount = project?.photos?.length || project?.fotos || 0;
      toast({
        title: "Projeto deletado!",
        description: `Aguarde alguns minutos enquanto removemos todos os ${photoCount} arquivos do servidor.`,
        duration: 8000, // Show for 8 seconds
      });
      
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível deletar o projeto. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleWatermark = async () => {
    try {
      setIsTogglingWatermark(true);
      
      const newWatermarkValue = !project.showWatermark;
      
      await apiRequest('PATCH', `/api/projects/${project.id}/watermark`, {
        showWatermark: newWatermarkValue
      });
      
      // Update local state
      project.showWatermark = newWatermarkValue;
      
      toast({
        title: "Marca d'água atualizada",
        description: `Marca d'água ${newWatermarkValue ? 'ativada' : 'desativada'} para este projeto.`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    } catch (error) {
      console.error('Error toggling watermark:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a configuração da marca d'água.",
        variant: "destructive"
      });
    } finally {
      setIsTogglingWatermark(false);
    }
  };
  
  return (
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <Card className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-3xl">
      <CardHeader className="p-6 pb-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-black text-slate-900 dark:text-white mb-1 leading-tight truncate">{project?.name || project?.nome || "Untitled Project"}</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 font-medium text-sm truncate">{project?.clientName || project?.cliente || "Unknown Client"}</CardDescription>
          </div>
          <Badge className={`${getStatusColor(status)} rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-0 shadow-sm shrink-0`}>
            {getStatusDisplayName(status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-4">
        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
            <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="font-bold text-slate-700 dark:text-slate-300">{formatDate(project?.data || new Date().toISOString())}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center text-sm bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-lg shadow-blue-500/20">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{project?.photos?.length || project?.fotos || 0}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">fotos</div>
            </div>
          </div>
          <div className="flex items-center text-sm bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center mr-3 shadow-lg shadow-purple-500/20">
              <Check className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{project?.selectedPhotos?.length || project?.selecionadas || 0}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">selecionadas</div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-4 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 w-full">
          {/* Comments button */}
          <Button 
            variant="ghost" 
            size="sm"
            className="text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 hover:text-purple-800 rounded-xl px-4 py-2.5 font-semibold transition-all duration-200 border border-purple-100"
            onClick={(e) => {
              e.stopPropagation();
              onViewComments?.(project.id);
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Comentários
          </Button>
          
          {/* View selections button */}
          {(project.selectedPhotos?.length > 0 || project.selecionadas > 0) && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 rounded-xl px-4 py-2.5 font-semibold transition-all duration-200 border border-emerald-100"
              onClick={handleViewSelections}
            >
              <FileText className="h-4 w-4 mr-2" />
              Ver Seleções
            </Button>
          )}
          
          {/* Watermark toggle button */}
          <Button 
            variant="ghost" 
            size="sm"
            className={`text-xs rounded-xl px-4 py-2.5 font-semibold transition-all duration-200 border ${project.showWatermark !== false 
              ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-100' 
              : 'text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-700 border-slate-200'
            }`}
            onClick={handleToggleWatermark}
            disabled={isTogglingWatermark}
            title={`Marca d'água ${project.showWatermark !== false ? 'ativada' : 'desativada'}`}
          >
            {isTogglingWatermark ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                {project.showWatermark !== false ? (
                  <Shield className="h-4 w-4 mr-2" />
                ) : (
                  <ShieldOff className="h-4 w-4 mr-2" />
                )}
                Marca d'água
              </>
            )}
          </Button>
          
          {/* Delete project button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg px-2 py-1.5 font-medium transition-all duration-200 border border-red-100"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Excluir projeto"
          >
            <X className="h-3 w-3 mr-1" />
            Excluir
          </Button>
        </div>
        
        <div className="flex gap-3 w-full">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-200 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-700 hover:border-slate-300 dark:hover:border-gray-500 rounded-xl py-2.5 px-2 sm:px-3 transition-all duration-200 min-w-0"
            onClick={() => setLocation(`/project/${project.id}`)}
          >
            <ArrowUpRight className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">Ver Detalhes</span>
            <span className="sm:hidden">Detalhes</span>
          </Button>
          
          <Button
            size="sm"
            className={`
              flex-1 text-xs sm:text-sm font-semibold text-white shadow-lg
              bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
              hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700
              hover:scale-105 hover:shadow-xl
              rounded-xl py-2.5 px-2 sm:px-3 transition-all duration-300 
              border border-blue-500/20
              min-w-0 truncate
            `}
            onClick={(e) => {
              e.stopPropagation();
              setShowClientLinkModal(true);
            }}
          >
            <LinkIcon className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">Link do Cliente</span>
            <span className="sm:hidden">Link</span>
          </Button>
        </div>
      </CardFooter>
      
      {/* Delete confirmation modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Excluir Projeto</DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Tem certeza que deseja excluir o projeto "{project?.name || project?.nome || 'Sem título'}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir Projeto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View selections modal */}
      <Dialog open={showSelectionsModal} onOpenChange={setShowSelectionsModal}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[900px] mx-auto max-h-[80vh] overflow-y-auto">
          <DialogHeader>
              <DialogTitle
                className="text-3xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent"
              >
                Fotos Selecionadas - {modalProject?.name || modalProject?.nome || 'Sem título'}
              </DialogTitle>
              <DialogDescription className="text-base mt-1">
              O cliente selecionou {modalProject?.selectedPhotos?.length || modalProject?.selecionadas || 0} de {modalProject?.photos?.length || modalProject?.fotos || 0} fotos.
            </DialogDescription>
          </DialogHeader>
          
          {(() => {
              if (!modalProject?.photos || modalProject.photos.length === 0) {
                return <p className="text-gray-500 text-center my-4">Nenhuma foto encontrada</p>;
              }
              
              let selectedPhotos: any[] = [];
              selectedPhotos = modalProject.photos.filter((photo: any) => photo.selected === true);
              if (selectedPhotos.length === 0 && modalProject.selectedPhotos && modalProject.selectedPhotos.length > 0) {
                selectedPhotos = modalProject.photos.filter((photo: any) => 
                  modalProject.selectedPhotos.includes(photo.id)
                );
              }
              if (selectedPhotos.length === 0 && modalProject.status === 'completed') {
                selectedPhotos = modalProject.photos.filter((photo: any) => 
                  photo.selected === true || photo.selected === 1 || photo.selected === "1"
                );
              }
              
              if (selectedPhotos.length === 0) {
                return <p className="text-gray-500 text-center my-4">Nenhuma foto selecionada pelo cliente</p>;
              }

              const namesWithoutExt = selectedPhotos.map((photo: any) => {
                const fileName = photo.originalName || photo.filename || 'Arquivo sem nome';
                return fileName.replace(/\.(jpg|jpeg|png|webp|gif|bmp|tiff|cr2|cr3|nef|arw|dng|raf|rw2|orf|pef)$/i, '');
              });

              const lightroomText = namesWithoutExt.map(n => `,${n}.`).join(' ').replace(/^,/, '');
              const windowsText = namesWithoutExt.map(n => `"${n}"`).join(' OR ');
              const macText = namesWithoutExt.map(n => `${n}.`).join(' OU ');

              const copyToClipboard = async (text: string, label: string) => {
                try {
                  if (!navigator.clipboard) {
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-9999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                  } else {
                    await navigator.clipboard.writeText(text);
                  }
                  toast({ title: "Copiado!", description: `Formato ${label} copiado para a área de transferência.` });
                } catch {
                  toast({ title: "Erro ao copiar", description: "Não foi possível copiar. Selecione o texto manualmente.", variant: "destructive" });
                }
              };

              return (
                <div className="my-4 space-y-4">
                  <div className="border rounded-lg p-3 sm:p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-gray-900">Usando Adobe Lightroom <span className="font-normal text-gray-500 text-xs">(utilize como "Filtro de biblioteca &gt; Texto" e marque: Nome do arquivo &gt; Contém &gt; Cole aqui)</span></p>
                      <Button size="sm" variant="outline" className="shrink-0 ml-2 text-xs" onClick={() => copyToClipboard(lightroomText, 'Lightroom')}>
                        <Copy className="h-3 w-3 mr-1" /> Copiar
                      </Button>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 sm:p-3 max-h-24 overflow-y-auto">
                      <p className="text-xs sm:text-sm font-mono text-gray-800 break-all select-all">{lightroomText}</p>
                    </div>
                  </div>

                  <div className="border rounded-lg p-3 sm:p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-gray-900">Usando o Windows <span className="font-normal text-gray-500 text-xs">(utilize na busca de arquivos do Explorer)</span></p>
                      <Button size="sm" variant="outline" className="shrink-0 ml-2 text-xs" onClick={() => copyToClipboard(windowsText, 'Windows')}>
                        <Copy className="h-3 w-3 mr-1" /> Copiar
                      </Button>
                    </div>
                    <div className="bg-gray-100 border border-gray-200 rounded p-2 sm:p-3 max-h-24 overflow-y-auto">
                      <p className="text-xs sm:text-sm font-mono text-gray-800 break-all select-all">{windowsText}</p>
                    </div>
                  </div>

                  <div className="border rounded-lg p-3 sm:p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-gray-900">Usando o Mac OS X <span className="font-normal text-gray-500 text-xs">(utilize na busca de arquivos do Finder)</span></p>
                      <Button size="sm" variant="outline" className="shrink-0 ml-2 text-xs" onClick={() => copyToClipboard(macText, 'Mac')}>
                        <Copy className="h-3 w-3 mr-1" /> Copiar
                      </Button>
                    </div>
                    <div className="bg-gray-100 border border-gray-200 rounded p-2 sm:p-3 max-h-24 overflow-y-auto">
                      <p className="text-xs sm:text-sm font-mono text-gray-800 break-all select-all">{macText}</p>
                    </div>
                  </div>
                </div>
              );
          })()}
          
          <DialogFooter className="mt-4">
            <Button onClick={() => setShowSelectionsModal(false)} className="w-full sm:w-auto">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Client Link Modal */}
      <Dialog open={showClientLinkModal} onOpenChange={setShowClientLinkModal}>
        <DialogContent className="sm:max-w-[500px] max-w-[95vw] bg-white rounded-2xl p-6">
          <DialogHeader>
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 mb-2 w-fit">
              Compartilhar Galeria
            </span>
            <DialogTitle className="text-xl font-black text-gray-900">
              Enviar para o Cliente
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm">
              Copie a mensagem e envie via WhatsApp ou e-mail.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-3">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                Olá! 📸<br/><br/>
                Suas fotos do projeto "<strong>{project?.name || project?.nome || 'Seu Projeto'}</strong>" estão prontas!<br/><br/>
                Acesse o link para ver e selecionar suas fotos favoritas:<br/><br/>
                <span className="text-blue-600 text-xs" style={{ wordBreak: 'break-all' }}>
                  {`${window.location.origin}/project-view/${project.id}`}
                </span><br/><br/>
                Qualquer dúvida, estou à disposição!
              </p>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-700 font-mono" style={{ wordBreak: 'break-all' }}>
                {`${window.location.origin}/project-view/${project.id}`}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 mt-5">
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl h-11"
              onClick={() => {
                const message = `Olá! 📸

Suas fotos do projeto "${project?.name || project?.nome || 'Seu Projeto'}" estão prontas!

Acesse o link para ver e selecionar suas fotos favoritas:

${window.location.origin}/project-view/${project.id}

Qualquer dúvida, estou à disposição!`;
                navigator.clipboard.writeText(message);
                toast({
                  title: "Mensagem copiada!",
                  description: "Mensagem completa copiada.",
                });
                setShowClientLinkModal(false);
              }}
            >
              <Check className="h-4 w-4 mr-2" />
              Copiar Mensagem Completa
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl font-semibold h-11"
              onClick={() => {
                const link = `${window.location.origin}/project-view/${project.id}`;
                navigator.clipboard.writeText(link);
                toast({
                  title: "Link copiado!",
                  description: "Link da galeria copiado.",
                });
              }}
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Copiar Apenas o Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
        </div>
  );
}

// Componente para o modal de upload
function UploadModal({
  open,
  onClose,
  onUpload,
}: {
  open: boolean;
  onClose: () => void;
  onUpload: (data: any) => void;
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { toast } = useToast();
  const { user } = useAuth();
  
  const uploadSchema = z.object({
    projectName: z.string().min(3, "Project name is required"),
    clientName: z.string().min(3, "Client name is required"),
    clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
    data: z.string().min(1, "Date is required"),
    includedPhotos: z.coerce.number().min(0).default(0),
    additionalPhotoPrice: z.coerce.number().min(0).default(0),
  });
  
  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      projectName: "",
      clientName: "",
      clientEmail: "",
      data: new Date().toISOString().split('T')[0],
      includedPhotos: 0,
      additionalPhotoPrice: 0,
    },
  });
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const newFiles = Array.from(event.target.files);
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    
    // Verificar arquivos acima de 2MB
    const oversizedFiles = newFiles.filter(file => file.size > MAX_FILE_SIZE);
    const validFiles = newFiles.filter(file => file.size <= MAX_FILE_SIZE);
    
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
    
    setSelectedFiles((prev) => [...prev, ...validFiles]);
    
    // Não geramos mais thumbnails, apenas registramos a quantidade de arquivos
    // para manter a contagem correta e permitir a remoção de arquivos
    setThumbnails(prev => [...prev, ...Array(validFiles.length).fill("placeholder")]);
  };
  
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setThumbnails((prev) => prev.filter((_, i) => i !== index));
  };
  
  const onSubmit = async (data: z.infer<typeof uploadSchema>) => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione ao menos uma foto para o projeto.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // ETAPA 1: Redimensionar imagens no front-end antes do upload
      console.log(`[Frontend Dashboard] Iniciando redimensionamento de ${selectedFiles.length} imagens antes do upload`);
      
      setUploadProgress(5); // 5% - iniciando processamento
      
      const compressedFiles = await compressMultipleImages(
        selectedFiles,
        {
          maxWidthOrHeight: 970, // Largura máxima padronizada
          quality: 0.9, // Qualidade padronizada
          useWebWorker: true,
        },
        (processed, total) => {
          // Atualizar progresso da compressão (5% a 25%)
          const compressionProgress = 5 + (processed / total) * 20;
          setUploadProgress(Math.round(compressionProgress));
        }
      );

      console.log(`[Frontend Dashboard] Redimensionamento concluído: ${compressedFiles.length} imagens processadas`);
      setUploadProgress(25); // 25% - compressão concluída
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('projectName', data.projectName);
      formData.append('clientName', data.clientName);
      formData.append('clientEmail', data.clientEmail || '');
      formData.append('data', data.data);
      formData.append('includedPhotos', data.includedPhotos?.toString() || '0');
      // Convert additionalPhotoPrice from Reais to Cents
      const priceInCents = Math.round(Number(data.additionalPhotoPrice || 0) * 100);
      formData.append('additionalPhotoPrice', priceInCents.toString());

      
      // Add photographer ID from the user context
      if (user && user.id) {
        formData.append('photographerId', user.id.toString());
      }
      
      // Append compressed files to FormData
      console.log(`[Frontend Debug] Adicionando ${compressedFiles.length} arquivos ao FormData`);
      compressedFiles.forEach((file, index) => {
        console.log(`[Frontend Debug] Arquivo ${index + 1}: ${file.name}, tipo: ${file.type}, tamanho: ${file.size} bytes`);
        formData.append('photos', file);
      });
      
      // Debug: log FormData entries
      console.log('[Frontend Debug] FormData entries:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
      
      // Use XMLHttpRequest para monitorar o progresso do upload
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Configuração melhorada do callback de progresso com boot inicial e impulso
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            // Começar a partir de 25% já que a compressão foi concluída
            // Para uploads grandes, começamos com 25% para feedback visual imediato
            let nextProgress = 25;
            
            // Se o upload já começou de verdade (mais de 3% carregado)
            if (event.loaded > 0.03 * event.total) {
              // Calcular percentual atual com um pequeno boost para uploads grandes
              // A fórmula abaixo mapeia o progresso real de upload para 25%-95%
              const boost = compressedFiles.length > 50 ? 1.25 : 1;
              const rawPercent = 25 + ((event.loaded / event.total) * 70 * boost);
              
              // Limitar o boost a 95% para garantir que não chegue a 100% antes do tempo
              nextProgress = Math.min(Math.round(rawPercent), 95);
            } else if (event.loaded > 0) {
              // Se estamos no início (menos de 3%), mas já começou, forçar entre 25-35%
              nextProgress = Math.max(25, Math.min(35, Math.round(25 + (event.loaded / event.total) * 300)));
            }
            
            // Para arquivos maiores que 10MB, aumentar o impulso inicial
            const totalSize = compressedFiles.reduce((acc, file) => acc + file.size, 0);
            const averageFileSize = totalSize / compressedFiles.length;
            
            if (averageFileSize > 10 * 1024 * 1024 && nextProgress < 10) {
              nextProgress = 10; // Começar em 10% para arquivos grandes
            }
            
            // Para mais de 100 arquivos, comportamento especial
            if (compressedFiles.length > 100) {
              // Progredir mais rápido no início para feedback visual
              if (event.loaded < 0.1 * event.total) {
                nextProgress = Math.max(nextProgress, 30);
              }
            }
            
            // Manter a barra em movimento para arquivos muito grandes
            const currentProgress = uploadProgress;
            if (nextProgress <= currentProgress && event.loaded > event.total * 0.1) {
              // Se parece travado mas o upload está progredindo, incrementar manualmente
              nextProgress = currentProgress + 1;
            }
            
            // Limitar a 98% até receber a resposta completa
            nextProgress = Math.min(nextProgress, 98);
            
            // Quando o upload realmente terminar no XHR, começar simulação do processamento no servidor
            if (event.loaded === event.total && nextProgress >= 90) {
              // Simular processamento no servidor com intervalos
              const simulateProcessing = () => {
                setUploadProgress(prev => {
                  if (prev < 98) {
                    return prev + 1;
                  }
                  return prev;
                });
              };
              
              // Incrementos mais frequentes para manter a barra em movimento
              const processingInterval = setInterval(simulateProcessing, 300);
              
              // Limpar o intervalo quando a resposta for recebida
              xhr.addEventListener('load', () => {
                clearInterval(processingInterval);
                // Definir como 100% quando realmente estiver completo
                setTimeout(() => setUploadProgress(100), 500);
              });
            }
            
            // Atualizar o progresso
            setUploadProgress(nextProgress);
          }
        };
        
        // Configurar callbacks de conclusão
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Erro ao processar resposta do servidor'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              if (errorData.error === "UPLOAD_LIMIT_REACHED") {
                reject({ isLimitError: true, details: errorData.details });
              } else {
                reject(new Error(errorData.message || 'Erro ao criar projeto'));
              }
            } catch {
              reject(new Error('Erro ao criar projeto'));
            }
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Erro de conexão ao enviar o projeto'));
        };
        
        // Enviar a requisição
        xhr.open('POST', '/api/projects');
        xhr.withCredentials = true;
        xhr.send(formData);
      });
      
      console.log("Project created:", result);
      
      // Format project data to match expected structure in the dashboard
      const formattedProject = {
        ...result,
        nome: result.name,                  // Map API field "name" to UI field "nome"
        cliente: result.clientName,         // Map API field "clientName" to UI field "cliente"
        emailCliente: result.clientEmail,   // Map API field "clientEmail" to UI field "emailCliente"
        fotos: result.photos ? result.photos.length : 0,  // Set photo count based on photos array length
        selecionadas: result.selectedPhotos ? result.selectedPhotos.length : 0  // Selected photos count
      };
      
      // Show success notification
      toast({
        title: "Projeto criado com sucesso",
        description: `O projeto "${data.projectName}" foi criado com ${compressedFiles.length} fotos redimensionadas.`,
      });
      
      // Call onUpload callback with the properly formatted project
      onUpload(formattedProject);
      
      // Reset form and close modal
      setSelectedFiles([]);
      setThumbnails([]);
      form.reset();
      onClose();
    } catch (error: any) {
      console.error("Error during upload:", error);
      if (error?.isLimitError) {
        toast({
          title: "Limite de uploads atingido",
          description: error.details || "Você atingiu o limite do seu plano. Verifique sua assinatura na dashboard ou entre em contato com o suporte.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao criar projeto",
          description: error?.message || "Ocorreu um erro durante o upload. Por favor, tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[700px] max-h-[90vh] overflow-y-auto mx-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-3xl">
        <DialogHeader className="pb-6">
          <span className="inline-block px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 w-fit">
            ✨ Nova Galeria
          </span>
          <DialogTitle className="text-3xl font-black text-slate-900 dark:text-white">
            Criar Novo Projeto
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mt-2">
            Preencha os detalhes do projeto e faça upload das suas fotos. Máximo 2MB por foto.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    📋 Nome da Galeria
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Casamento de João e Maria" 
                      className="h-14 border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-purple-500/20 bg-slate-50 dark:bg-slate-800 rounded-2xl text-base font-medium transition-all" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    👤 Nome do Cliente
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: João da Silva" 
                      className="h-14 border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-purple-500/20 bg-slate-50 dark:bg-slate-800 rounded-2xl text-base font-medium transition-all" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* FormField
              control={form.control}
              name="clientEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email do Cliente (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="cliente@exemplo.com (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            /> */}
            
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    📅 Data do Evento
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      className="h-14 border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-purple-500/20 bg-slate-50 dark:bg-slate-800 rounded-2xl text-base font-medium transition-all" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="includedPhotos"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      🖼️ Fotos Inclusas
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Ex: 20"
                        className="h-14 border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-purple-500/20 bg-slate-50 dark:bg-slate-800 rounded-2xl text-base font-medium transition-all" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalPhotoPrice"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      💰 Valor Foto Extra (R$)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="Ex: 25.00"
                        className="h-14 border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-purple-500/20 bg-slate-50 dark:bg-slate-800 rounded-2xl text-base font-medium transition-all" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            

            <div className="mt-8">
              <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                📸 Fotos do Projeto
              </label>
              <div className="relative group border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-10 text-center cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-all duration-300">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  disabled={isUploading}
                />
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-xl shadow-purple-500/20 group-hover:scale-110 transition-transform">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-lg font-black text-slate-700 dark:text-slate-200">
                    Clique ou arraste fotos
                  </p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    JPG, PNG, WEBP - até 2MB cada
                  </p>
                </div>
              </div>
            </div>
            
            {thumbnails.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      {thumbnails.length} foto(s) selecionada(s)
                    </h4>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Pronto
                  </span>
                </div>
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl max-h-[240px] overflow-y-auto bg-slate-50 dark:bg-slate-800/50">
                  {selectedFiles.map((file, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between py-3 px-4 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all group"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/10">
                          <Camera className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Barra de progresso de upload - Youze Style */}
            {isUploading && (
              <div className="w-full flex flex-col gap-4 mt-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20 animate-pulse">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-700 dark:text-slate-200">Processando {thumbnails.length} fotos</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {uploadProgress < 30 ? "Preparando arquivos..." : uploadProgress < 70 ? "Enviando para servidor..." : uploadProgress < 90 ? "Processando imagens..." : "Finalizando..."}
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">{uploadProgress}%</span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-600 transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                  Não feche a página durante o upload
                </p>
              </div>
            )}
            
            <DialogFooter className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-4 w-full">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  disabled={isUploading}
                  className="flex-1 h-14 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs tracking-widest uppercase rounded-2xl transition-all"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isUploading}
                  className="flex-1 h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black text-xs tracking-widest uppercase rounded-2xl shadow-xl shadow-purple-500/20 transition-all hover:scale-105 border-0"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Criar Projeto"
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

// Dynamic Dashboard Banner component
interface BannerData {
  imageUrl: string;
  linkUrl?: string;
  altText: string;
}

function DashboardBanner() {
  const { data: banner, isLoading } = useQuery<BannerData | null>({
    queryKey: ["/api/banner"],
  });

  if (isLoading || !banner || !banner.imageUrl) {
    return null;
  }

  // Garantir que o link tenha protocolo
  const getFullUrl = (url: string | undefined) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  };

  const bannerContent = (
    <img 
      src={banner.imageUrl} 
      alt={banner.altText || "Banner"} 
      className="w-full h-auto object-cover"
      data-testid="dashboard-banner-image"
    />
  );

  return (
    <div className="w-full mb-8 bg-white rounded-xl shadow-md overflow-hidden p-0" data-testid="dashboard-banner">
      {banner.linkUrl ? (
        <a 
          href={getFullUrl(banner.linkUrl)} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block hover:opacity-95 transition-opacity cursor-pointer"
          data-testid="dashboard-banner-link"
        >
          {bannerContent}
        </a>
      ) : (
        bannerContent
      )}
    </div>
  );
}

// Dashboard statistics component
function Statistics({ setLocation, user }: { setLocation: (path: string) => void; user: any }) {
  // Statistics data
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/user/stats"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Current user plan and stats data
  const userQuery = useQuery<any>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Calculate percentage based on real user data
  const calculatePlanInfo = () => {
    // Always ensure we have real data from API
    const user = userQuery.data;
    const stats = data;
    
    // Special case for new accounts or missing data - show free plan with 0 usage
    if (!user) {
      return {
        planType: "free",
        uploadLimit: 50,
        usedUploads: 0,
        percentageUsed: 0
      };
    }
    
    // Convert Portuguese plan names to English for consistency
    let planType = (user.planType || "free").toLowerCase();
    if (planType === "gratuito") planType = "free";
    if (planType === "basico" || planType === "básico") planType = "basic"; 
    if (planType === "padrao" || planType === "padrão") planType = "standard";
    if (planType === "ilimitado") planType = "unlimited";
    if (planType === "profissional") planType = "professional";
    
    // Default values if we don't have stats yet
    let uploadLimit = user.uploadLimit || 50;
    let usedUploads = user.usedUploads || 0;
    
    // Override with stats-specific values if available
    if (stats && stats.planInfo) {
      // Use the more accurate values from the stats endpoint
      uploadLimit = stats.planInfo.uploadLimit || uploadLimit;
      usedUploads = stats.planInfo.usedUploads || usedUploads;
    }
    
    // For new accounts, ensure we display real-time correct data
    if (planType === "free" && !("planType" in user)) {
      uploadLimit = 50;
      usedUploads = 0;
    }
    
    // Calculate percentage with safety check for divide-by-zero
    const percentageUsed = uploadLimit > 0 ? Math.round((usedUploads / uploadLimit) * 100) : 0;
    
    // Calculate days until renewal
    let daysUntilRenewal: number | null = null;
    if (user.subscriptionEndDate) {
      const endDate = new Date(user.subscriptionEndDate);
      const now = new Date();
      const diffTime = endDate.getTime() - now.getTime();
      daysUntilRenewal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysUntilRenewal < 0) daysUntilRenewal = 0;
    }
    
    return {
      planType: planType,
      uploadLimit: uploadLimit,
      usedUploads: usedUploads,
      percentageUsed: percentageUsed,
      daysUntilRenewal: daysUntilRenewal
    };
  };
  
  // Get real-time plan info or provide sensible defaults for new accounts
  const planInfo = calculatePlanInfo() || {
    planType: "free",
    uploadLimit: 50,
    usedUploads: 0,
    percentageUsed: 0,
    daysUntilRenewal: null
  };
  
  return (
    <div className="mb-6 sm:mb-10">
      {/* Section Header - Youze Style */}
      <div className="flex items-center gap-3 mb-3 sm:mb-5">
        <span className="px-3 py-1 sm:px-3 sm:py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest">
          📊 Métricas
        </span>
      </div>
      
      <div className={`grid gap-2 sm:gap-4 ${(user?.billingPeriod === 'yearly' || user?.isManualActivation || user?.role === 'admin') ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-4' : 'grid-cols-3 sm:grid-cols-3 lg:grid-cols-3'}`}>
        {/* Active projects card - Glassmorphism Style */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl sm:rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <Card className="relative border border-slate-100 dark:border-slate-800 shadow-lg sm:shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl sm:rounded-3xl overflow-hidden h-full">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:gap-4 mb-2 sm:mb-4">
                <div className="w-8 h-8 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform mb-1 sm:mb-0">
                  <BarChart className="h-4 w-4 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-[8px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Projetos</p>
                  <p className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300">Ativos</p>
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 sm:h-12 w-12 sm:w-20 mx-auto sm:mx-0" />
              ) : (
                <div className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white text-center sm:text-left">
                  {data?.activeProjects || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Monthly uploads card - TEMPORARIAMENTE OCULTO */}
        {/* <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-2xl sm:rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <Card className="relative border border-slate-100 dark:border-slate-800 shadow-lg sm:shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl sm:rounded-3xl overflow-hidden h-full">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:gap-4 mb-2 sm:mb-4">
                <div className="w-8 h-8 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform mb-1 sm:mb-0">
                  <Upload className="h-4 w-4 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-[8px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Uploads</p>
                  <p className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300">Este mês</p>
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 sm:h-12 w-12 sm:w-20 mx-auto sm:mx-0" />
              ) : (
                <div className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white text-center sm:text-left">
                  {data?.photosThisMonth || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div> */}

        {/* Upload usage card */}
        <div className="relative group">
          <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl blur-xl transition-opacity ${planInfo.planType !== 'free' ? 'bg-gradient-to-br from-slate-700 to-slate-900 opacity-25 group-hover:opacity-35' : 'bg-gradient-to-br from-emerald-500 to-teal-600 opacity-20 group-hover:opacity-30'}`}></div>
          <Card className={`relative shadow-lg sm:shadow-xl backdrop-blur-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl sm:rounded-3xl overflow-hidden h-full ${planInfo.planType !== 'free' ? 'border-2 border-slate-300 dark:border-slate-600 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900' : 'border border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80'}`}>
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:gap-4 mb-2 sm:mb-4">
                <div className={`w-8 h-8 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform mb-1 sm:mb-0 ${planInfo.planType !== 'free' ? 'bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-500/30' : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20'}`}>
                  {planInfo.planType !== 'free' ? (
                    <Crown className="h-4 w-4 sm:h-7 sm:w-7 text-white" />
                  ) : (
                    <CreditCard className="h-4 w-4 sm:h-7 sm:w-7 text-white" />
                  )}
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-[8px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Plano</p>
                  {planInfo.planType !== 'free' ? (
                    <div className="hidden sm:flex items-center gap-2">
                      <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 tracking-tight">
                        {planInfo.planType === 'basic' || planInfo.planType === 'basic_v2' ? 'Básico' : 
                         planInfo.planType === 'standard' || planInfo.planType === 'standard_v2' ? 'Fotógrafo' : 
                         planInfo.planType === 'professional' || planInfo.planType === 'professional_v2' ? 'Estúdio' : 
                         planInfo.planType.charAt(0).toUpperCase() + planInfo.planType.slice(1)}
                      </span>
                      {user?.billingPeriod === 'yearly' && (
                        <span className="text-[9px] px-2 py-0.5 bg-amber-100 text-amber-700 font-bold rounded-full uppercase tracking-wider">Anual</span>
                      )}
                    </div>
                  ) : (
                    <p className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300">
                      Gratuito
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-center sm:justify-between items-center">
                  <span className="hidden sm:block text-xs font-bold text-slate-500 uppercase tracking-wider">Uso</span>
                  <span className="text-[10px] sm:text-sm font-black text-purple-600 bg-purple-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                    {planInfo.usedUploads}/{planInfo.planType === "unlimited" ? "∞" : planInfo.uploadLimit}
                  </span>
                </div>
                <div className="w-full h-1.5 sm:h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-500"
                    style={{ width: planInfo.planType === "unlimited" ? "0%" : `${planInfo.percentageUsed}%` }}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="hidden sm:block px-4 pb-4 pt-0">
              <Button 
                className="w-full font-bold text-xs tracking-wide uppercase py-3 rounded-xl transition-all bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/20 hover:scale-105"
                onClick={() => setLocation("/subscription")}
              >
                <Settings className="mr-2 h-3 w-3" />
                Gerenciar Plano
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Portfolio card - Only for Annual Plan Users */}
        {(user?.billingPeriod === 'yearly' || user?.isManualActivation || user?.role === 'admin') && (
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl sm:rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <Card className="relative border border-slate-100 dark:border-slate-800 shadow-lg sm:shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl sm:rounded-3xl overflow-hidden h-full">
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center sm:gap-4 mb-2 sm:mb-4">
                  <div className="w-8 h-8 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform mb-1 sm:mb-0">
                    <Sparkles className="h-4 w-4 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-[8px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Portfólio</p>
                    <p className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300">Online</p>
                  </div>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-1">
                  <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
                  <span className="text-[9px] sm:text-xs font-bold text-amber-600 dark:text-amber-400">Anual</span>
                </div>
              </CardContent>
              <CardFooter className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0">
                <Link href="/meu-portfolio" className="w-full">
                  <Button 
                    size="sm"
                    className="w-full font-bold text-[10px] sm:text-xs tracking-wide uppercase py-1.5 sm:py-3 rounded-lg sm:rounded-xl transition-all bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20 hover:scale-105"
                  >
                    <ExternalLink className="mr-1 sm:mr-2 h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span className="hidden sm:inline">Acessar</span>
                    <span className="sm:hidden">Ver</span>
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Dashboard component
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  
  // State for managing projects
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // State for modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // State for referral modal
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [referralData, setReferralData] = useState<{ referralCode: string; referralLink: string } | null>(null);
  const [referralStats, setReferralStats] = useState<{ total: number; converted: number; bonusPhotos: number; isAmbassador: boolean } | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  
  // Theme state and logic
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  // Initialize theme on mount
  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
  }, [theme]);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Query for project comments
  const { data: comments = [], isLoading: commentsLoading } = useQuery<PhotoComment[]>({
    queryKey: [`/api/projects/${selectedProjectId}/comments`],
    enabled: !!selectedProjectId && commentsModalOpen,
  });

  // Mutation to mark comments as viewed
  const markCommentsAsViewedMutation = useMutation({
    mutationFn: async (commentIds: string[]) => {
      const response = await apiRequest("POST", "/api/comments/mark-viewed", { commentIds });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProjectId}/comments`] });
    },
  });

  // Handler to open comments modal
  const handleViewComments = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCommentsModalOpen(true);
  };

  // Handler to open referral modal
  const handleOpenReferralModal = async () => {
    setReferralModalOpen(true);
    setReferralLoading(true);
    
    try {
      // Buscar código e estatísticas em paralelo
      const [codeRes, statsRes] = await Promise.all([
        fetch('/api/referral/code'),
        fetch('/api/referral/stats')
      ]);
      
      if (codeRes.ok) {
        const codeData = await codeRes.json();
        setReferralData(codeData);
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setReferralStats(statsData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de indicação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus dados de indicação",
        variant: "destructive"
      });
    } finally {
      setReferralLoading(false);
    }
  };

  // Copy referral link to clipboard
  const copyReferralLink = () => {
    if (referralData?.referralLink) {
      navigator.clipboard.writeText(referralData.referralLink);
      toast({
        title: "Link copiado!",
        description: "Seu link de indicação foi copiado para a área de transferência",
      });
    }
  };
  
  // Carregar projetos
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        
        // Always fetch from API to ensure we only see current user's projects
        const response = await fetch('/api/projects');
        
        if (!response.ok) {
          throw new Error("Error loading projects");
        }
        
        const data = await response.json();
        console.log("Projects loaded from API:", data.length);
        
        // Save to localStorage with user-specific key to avoid mixing projects between users
        if (user && user.id) {
          localStorage.setItem(`projects_user_${user.id}`, JSON.stringify(data));
        }
        
        setProjects(data);
        setFilteredProjects(data);
      } catch (e) {
        console.error("Error loading data:", e);
        toast({
          title: "Error loading data",
          description: "An error occurred while loading projects. Please refresh the page.",
          variant: "destructive",
        });
        
        // Fallback to empty projects array if API call fails
        setProjects([]);
        setFilteredProjects([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only fetch if user is authenticated
    if (user && user.id) {
      fetchProjects();
    } else {
      // If no user, reset projects
      setProjects([]);
      setFilteredProjects([]);
      setIsLoading(false);
    }
  }, [toast, user]);
  
  const handleLogout = () => {
    // First remove user data from localStorage
    localStorage.removeItem("user");
    
    // Clear both the old and new format of project data
    localStorage.removeItem("projects");
    
    // Also remove user-specific project data if there's a user
    if (user && user.id) {
      localStorage.removeItem(`projects_user_${user.id}`);
    }
    
    // Then trigger the logout mutation to clear the auth state
    logoutMutation.mutate();
    
    // Redirect to auth page after logout
    setLocation("/auth");
  };
  
  // Handler for project deletion
  const handleDeleteProject = (id: number) => {
    // Find the project to be deleted to get its photo count
    const projectToDelete = projects.find(project => project.id === id);
    const photoCount = projectToDelete?.fotos || projectToDelete?.photos?.length || 0;
    
    // OPTIMISTIC UPDATE: Remove project from UI immediately
    setProjects(prevProjects => prevProjects.filter(project => project.id !== id));
    setFilteredProjects(prevProjects => prevProjects.filter(project => project.id !== id));
    
    // Update user-specific localStorage to reflect deletion immediately
    try {
      if (user && user.id) {
        const storageKey = `projects_user_${user.id}`;
        const storedProjects = localStorage.getItem(storageKey);
        if (storedProjects) {
          const parsedProjects = JSON.parse(storedProjects);
          const updatedProjects = parsedProjects.filter((p: any) => p.id !== id);
          localStorage.setItem(storageKey, JSON.stringify(updatedProjects));
        }
      }
    } catch (storageError) {
      console.error('Error updating localStorage:', storageError);
    }
    
    // Make API call to delete the project in the background
    apiRequest('DELETE', `/api/projects/${id}`)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to delete project');
    })
    .then(data => {
      console.log('Project deleted successfully on server:', data);
      
      // Refresh the user data and stats to update the upload count
      import('@/lib/queryClient').then(({ queryClient }) => {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      });
    })
    .catch(error => {
      console.error('Error deleting project on server:', error);
      
      // ROLLBACK: If server deletion fails, restore the project to the UI
      if (projectToDelete) {
        setProjects(prevProjects => [...prevProjects, projectToDelete]);
        setFilteredProjects(prevProjects => [...prevProjects, projectToDelete]);
        
        // Restore to localStorage as well
        try {
          if (user && user.id) {
            const storageKey = `projects_user_${user.id}`;
            const storedProjects = localStorage.getItem(storageKey);
            if (storedProjects) {
              const parsedProjects = JSON.parse(storedProjects);
              const updatedProjects = [...parsedProjects, projectToDelete];
              localStorage.setItem(storageKey, JSON.stringify(updatedProjects));
            }
          }
        } catch (storageError) {
          console.error('Error restoring localStorage:', storageError);
        }
        
        toast({
          title: "Erro ao deletar",
          description: "Não foi possível deletar o projeto no servidor. O projeto foi restaurado.",
          variant: "destructive",
        });
      }
    });
  };
  
  // Handler for project creation
  const handleProjectCreated = async (newProject: any) => {
    console.log("Project created, ensuring complete data...");
    
    // Proteção contra tela branca: Garantir que sempre temos dados válidos
    if (!newProject || !newProject.id) {
      console.warn("handleProjectCreated: newProject inválido, ignorando");
      return;
    }
    
    try {
      // Use a more reliable approach to get the complete project data
      // First, prepare the formatted project with whatever data we have now
      const initialFormattedProject = {
        ...newProject,
        id: newProject.id,
        nome: newProject.name || newProject.nome || 'Projeto',
        cliente: newProject.clientName || newProject.cliente || 'Cliente',
        emailCliente: newProject.clientEmail || newProject.emailCliente || '',
        fotos: newProject.photos ? newProject.photos.length : (newProject.fotos || 0),
        selecionadas: newProject.selectedPhotos ? newProject.selectedPhotos.length : (newProject.selecionadas || 0),
        status: newProject.status || "pending"
      };
      
      // Immediately add this to the projects list for a responsive UI experience
      try {
        const initialUpdatedProjects = [initialFormattedProject, ...projects.filter(p => p.id !== initialFormattedProject.id)];
        setProjects(initialUpdatedProjects);
        
        // Also update filtered projects right away
        if (currentTab === "all" || initialFormattedProject.status === getStatusFilter(currentTab)) {
          setFilteredProjects([initialFormattedProject, ...filteredProjects.filter(p => p.id !== initialFormattedProject.id)]);
        }
      } catch (stateError) {
        console.error("Erro ao atualizar estado dos projetos:", stateError);
        // Continua mesmo com erro - a UI já foi atualizada pelo modal
      }
      
      // Now make a separate call to get the complete and accurate data
      // Use a longer delay to ensure the server has fully processed everything
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fetch adicional do projeto completo - envolvido em try-catch para proteção
      try {
        const response = await fetch(`/api/projects/${newProject.id}`);
        
        if (!response.ok) {
          console.warn("Could not fetch complete project data, using initial data");
          // Não retorna - continua para atualizar cache
        } else {
          // Get the complete and accurate project data
          const completeProject = await response.json();
          console.log("Complete project data fetched:", completeProject);
          
          // Format for dashboard display with complete data
          const completeFormattedProject = {
            ...completeProject,
            nome: completeProject.name || 'Projeto',
            cliente: completeProject.clientName || 'Cliente',
            emailCliente: completeProject.clientEmail || '',
            fotos: completeProject.photos ? completeProject.photos.length : 0,
            selecionadas: completeProject.selectedPhotos ? completeProject.selectedPhotos.length : 0
          };
          
          // Update the projects state with the complete data
          const finalUpdatedProjects = [completeFormattedProject, ...projects.filter(p => p.id !== completeFormattedProject.id)];
          setProjects(finalUpdatedProjects);
          
          // Final update to filtered projects based on current tab and complete data
          if (currentTab === "all" || completeFormattedProject.status === getStatusFilter(currentTab)) {
            setFilteredProjects([completeFormattedProject, ...filteredProjects.filter(p => p.id !== completeFormattedProject.id)]);
          }
          
          // Update user-specific localStorage with the complete data
          try {
            if (user && user.id) {
              const storageKey = `projects_user_${user.id}`;
              localStorage.setItem(storageKey, JSON.stringify(finalUpdatedProjects));
            }
          } catch (storageErr) {
            console.warn("Erro ao salvar no localStorage:", storageErr);
          }
        }
      } catch (fetchError) {
        console.warn("Erro ao buscar projeto completo, usando dados iniciais:", fetchError);
        // Não lança erro - projeto já foi adicionado com dados iniciais
      }
      
      // Force a refresh of the entire projects list - também protegido
      try {
        const refreshResponse = await fetch('/api/projects');
        if (refreshResponse.ok) {
          const refreshedProjects = await refreshResponse.json();
          
          // Format the refreshed data
          const formattedProjects = (refreshedProjects || []).map((project: any) => ({
            ...project,
            nome: project.name || 'Projeto',
            cliente: project.clientName || 'Cliente',
            emailCliente: project.clientEmail || '',
            fotos: project.photos ? project.photos.length : 0,
            selecionadas: project.selectedPhotos ? project.selectedPhotos.length : 0
          }));
          
          // Update project states with the freshest data
          setProjects(formattedProjects);
          
          // Apply current filtering
          let filtered = formattedProjects;
          if (currentTab !== "all") {
            const statusFilter = getStatusFilter(currentTab);
            filtered = formattedProjects.filter(
              (project: any) => project.status === statusFilter
            );
          }
          
          // Apply search filter if any
          if (searchQuery && searchQuery.length > 0) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((project: any) => {
              const projectName = project.nome || project.name || '';
              const clientName = project.cliente || project.clientName || '';
              const clientEmail = project.emailCliente || project.clientEmail || '';
              
              return (
                projectName.toString().toLowerCase().includes(query) ||
                clientName.toString().toLowerCase().includes(query) ||
                clientEmail.toString().toLowerCase().includes(query)
              );
            });
          }
          
          setFilteredProjects(filtered);
        }
      } catch (refreshError) {
        console.warn("Erro ao atualizar lista de projetos:", refreshError);
        // Não lança erro - já temos os dados iniciais
      }
      
      // ✅ Invalidar cache do React Query - protegido contra erros
      console.log("Invalidating cache to update dashboard stats...");
      try {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        }, 500);
      } catch (cacheError) {
        console.warn("Erro ao invalidar cache:", cacheError);
      }
      
    } catch (error) {
      console.error("Error in project creation handling:", error);
      // We've already added the initial project data, so user still sees something
      // Não mostramos toast de erro para não confundir o usuário - projeto foi criado com sucesso
      console.log("Projeto foi criado, mas houve erro ao atualizar dados. Usuário pode atualizar a página.");
    }
  };
  
  // Function to convert the current tab to a status filter
  const getStatusFilter = (tab: string) => {
    switch (tab) {
      case "pending": return "pendente";
      case "reviewed": return "revisado";
      case "completed": return "finalizado";
      default: return "";
    }
  };
  
  // Filter projects by tab and search query
  useEffect(() => {
    let filtered = [...projects];
    
    // Apply tab filter
    if (currentTab !== "all") {
      const statusFilter = getStatusFilter(currentTab);
      filtered = filtered.filter(project => project.status === statusFilter);
    }
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => {
        // Verificar nome/name - aceitar ambos os formatos
        const projectName = project.nome || project.name || '';
        const clientName = project.cliente || project.clientName || '';
        const clientEmail = project.emailCliente || project.clientEmail || '';
        
        return (
          projectName.toString().toLowerCase().includes(query) ||
          clientName.toString().toLowerCase().includes(query) ||
          clientEmail.toString().toLowerCase().includes(query)
        );
      });
    }
    
    setFilteredProjects(filtered);
  }, [currentTab, searchQuery, projects]);
  
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-x-hidden">
      {/* Background Decorative Shapes - Youze Style */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <header className="sticky top-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 z-50">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                Fottufy
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/whats-new">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hidden md:flex items-center gap-2 rounded-xl text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-bold text-xs tracking-widest uppercase"
                >
                  <Sparkles className="h-4 w-4" />
                  Novidades
                </Button>
              </Link>
              <Button
                onClick={() => setUploadModalOpen(true)}
                size="lg"
                className="hidden sm:flex bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black text-xs tracking-widest uppercase rounded-2xl px-8 py-6 shadow-xl shadow-purple-500/20 transform transition-all hover:scale-105"
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Novo Projeto
              </Button>
              
              
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-lg">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </span>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleTheme} 
                className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                title={`Alternar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
              >
                {theme === 'light' ? <Moon className="h-5 w-5 text-slate-600" /> : <Sun className="h-5 w-5 text-slate-400" />}
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleLogout} 
                className="rounded-xl border-slate-200 dark:border-slate-700 font-bold text-xs tracking-widest uppercase py-6 px-6"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Hero Banner - Youze Premium Style */}
      <div className="relative overflow-hidden py-4 sm:py-8 bg-gradient-to-br from-white via-slate-50/50 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-purple-100/30 dark:bg-purple-900/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="relative container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 sm:gap-6 mb-2 sm:mb-6">
              <img
                src={fottufinhopng}
                alt="Fottufinho Mascote"
                className="w-12 h-12 sm:w-20 sm:h-20"
              />
              
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-none uppercase">
                <span className="text-slate-900 dark:text-white">
                  Olá, 
                </span>
                <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {user?.name?.split(' ')[0] || 'Fotógrafo'}
                </span>
              </h1>
              
              {(user as any)?.isAmbassador && (
                <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-full border border-amber-300 dark:border-amber-700">
                  <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Embaixador Fottufy</span>
                </div>
              )}
            </div>
            
            <p className="hidden sm:block text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-light max-w-2xl mx-auto leading-relaxed">
              Sua plataforma de elite para gerenciar projetos fotográficos.
            </p>
            
            {/* Mobile New Project Button removed visually */}
            {/* <Button
              onClick={() => setUploadModalOpen(true)}
              size="lg"
              className="sm:hidden mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black text-xs tracking-widest uppercase rounded-xl px-6 py-5 shadow-xl shadow-purple-500/20 transform transition-all hover:scale-105"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Novo Projeto
            </Button> */}
          </div>
        </div>
      </div>
      <main className="container mx-auto py-3 sm:py-6 px-3 sm:px-6">
        {/* Banner Dinâmico */}
        <DashboardBanner />

        {/* Aviso de novidades - Youze Style */}
        {user?.planType !== 'free' && (
        <div className="mt-0 mb-4 sm:mb-8 relative overflow-hidden">
          <div className="relative bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-xl sm:shadow-2xl shadow-purple-500/20">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl"></div>
            
            <div className="relative flex flex-row items-center gap-3 sm:gap-6">
              <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="font-black text-sm sm:text-2xl text-white uppercase tracking-tight mb-0.5 sm:mb-2">Recomende a Fottufy e ganhe um selo ❤️</p>
                <p className="font-light text-purple-100 text-xs sm:text-base leading-relaxed line-clamp-2 sm:line-clamp-none">+1.000 fotos extras no seu pacote por indicação!</p>
              </div>
              <button 
                onClick={handleOpenReferralModal}
                className="shrink-0 bg-white text-purple-700 font-black text-[10px] sm:text-xs tracking-widest uppercase px-4 sm:px-6 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl hover:scale-105 transition-transform"
              >
                Indicar Amigo
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Promotional Banner - only shown for free users */}
        {user?.planType === 'free' && <PromotionalBanner />}
        
        <Statistics setLocation={setLocation} user={user} />
        
        {/* Meus Projetos Section - Youze Style */}
        <div className="mt-16">
          {/* Section Header with Pill Badge */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
            <div>
              <span className="inline-block px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                📁 Galeria
              </span>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                Meus <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Projetos</span>
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 font-light mt-2">Gerencie suas galerias com elegância profissional</p>
            </div>
            
            <div className="flex items-center w-full sm:w-auto gap-4">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                  placeholder="Buscar projetos..."
                  className="pl-12 pr-4 py-7 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-lg shadow-xl focus:ring-purple-500/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="all" value={currentTab} onValueChange={setCurrentTab}>
            <div className="mb-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
              <div className="flex justify-start w-full xl:w-auto overflow-x-auto pb-4 xl:pb-0">
                <TabsList className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl h-auto shrink-0">
                  <TabsTrigger value="all" className="rounded-xl px-6 sm:px-8 py-4 font-black text-xs tracking-widest uppercase data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xl data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300">Todos</TabsTrigger>
                  <TabsTrigger value="pending" className="rounded-xl px-6 sm:px-8 py-4 font-black text-xs tracking-widest uppercase data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xl data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300">Pendentes</TabsTrigger>
                  <TabsTrigger value="completed" className="rounded-xl px-6 sm:px-8 py-4 font-black text-xs tracking-widest uppercase data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xl data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300">Finalizados</TabsTrigger>
                </TabsList>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                <Button
                  onClick={() => setUploadModalOpen(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black text-xs tracking-widest uppercase rounded-2xl px-8 py-7 shadow-2xl shadow-purple-500/20 transform transition-all hover:scale-105"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Novo Projeto
                </Button>
                
                <Button
                  onClick={() => window.open('https://www.transferxl.com', '_blank', 'noopener,noreferrer')}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-800 font-black text-xs tracking-widest uppercase rounded-2xl px-8 py-7 shadow-xl hover:bg-slate-50 dark:hover:bg-slate-800 transform transition-all hover:scale-105"
                  data-testid="button-send-files-fromsmash"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Enviar Prontas
                </Button>
              </div>
            </div>
            
            <TabsContent value="all" className="mt-0">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array(6).fill(null).map((_, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardHeader className="p-4">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <Skeleton className="h-4 w-1/3 mb-2" />
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Skeleton className="h-8 w-full" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-16 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border-0 dark:border dark:border-gray-700/50 shadow-lg shadow-slate-200/50 dark:shadow-black/30">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-2xl flex items-center justify-center">
                    <Camera className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Nenhum projeto encontrado</h3>
                  <p className="text-slate-600 dark:text-gray-400 mb-8 text-lg max-w-md mx-auto leading-relaxed">
                    {searchQuery 
                      ? "Tente ajustar seus filtros ou termos de pesquisa para encontrar seus projetos" 
                      : "Comece criando seu primeiro projeto fotográfico e organize suas fotos com elegância"
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onDelete={handleDeleteProject}
                      onViewComments={handleViewComments}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            {["pending", "reviewed", "completed", "Completed"].map(tab => (
              <TabsContent key={tab} value={tab} className="mt-0">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array(3).fill(null).map((_, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardHeader className="p-4">
                          <Skeleton className="h-6 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <Skeleton className="h-4 w-1/3 mb-2" />
                          <div className="flex justify-between">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-4 w-1/4" />
                          </div>
                        </CardContent>
                        <CardFooter className="p-4 pt-0">
                          <Skeleton className="h-8 w-full" />
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="text-center py-16 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border-0 dark:border dark:border-gray-700/50 shadow-lg shadow-slate-200/50 dark:shadow-black/30">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 rounded-2xl flex items-center justify-center">
                      <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
                      Nenhum projeto {getStatusFilter(tab)}
                    </h3>
                    <p className="text-slate-600 dark:text-gray-400 mb-8 text-lg max-w-md mx-auto leading-relaxed">
                      Os projetos aparecerão aqui quando forem marcados como {getStatusFilter(tab)}.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                      <ProjectCard 
                        key={project.id} 
                        project={project} 
                        onDelete={handleDeleteProject}
                        onViewComments={handleViewComments}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
      {/* Seção de redefinição de senha discreta no rodapé */}
      <div className="border-t border-slate-200/60 pt-4 pb-6 mt-6 bg-white/30 backdrop-blur-sm">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="text-slate-600 font-medium">
              © {new Date().getFullYear()} Fottufy. Todos os direitos reservados.
            </div>
            <div className="mt-6 md:mt-0 flex space-x-6">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center p-2 h-auto rounded-lg font-medium transition-all duration-200"
                onClick={() => setChangePasswordModalOpen(true)}
              >
                <Key className="h-4 w-4 mr-2" />
                Alterar minha senha
              </Button>
              <Link to="/forgot-password" className="text-sm text-slate-600 hover:text-blue-600 flex items-center p-2 rounded-lg hover:bg-blue-50 transition-all duration-200 font-medium">
                <HelpCircle className="h-4 w-4 mr-2" />
                Esqueceu sua senha?
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* Modal for uploading new projects */}
      <UploadModal 
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleProjectCreated}
      />
      {/* Modal for changing password */}
      <ChangePasswordModal
        open={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
      
      {/* Modal de Indicação */}
      <Dialog open={referralModalOpen} onOpenChange={setReferralModalOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg mx-auto max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg sm:text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
              <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              Indique e Ganhe!
              {referralStats?.isAmbassador && (
                <span className="ml-1 px-2 py-0.5 text-[10px] sm:text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-full">
                  Embaixador
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Indique amigos e ganhe +1.000 fotos extras!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4 py-2">
            {referralLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-600 text-sm">Carregando...</span>
              </div>
            ) : referralData ? (
              <>
                {/* Selo de Embaixador (se tiver) */}
                {referralStats?.isAmbassador && (
                  <div className="text-center p-2.5 sm:p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border-2 border-amber-300">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Award className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                      <span className="text-sm sm:text-base font-bold text-amber-700">Embaixador Fottufy</span>
                    </div>
                    <p className="text-xs text-amber-600">Você já indicou clientes que assinaram!</p>
                  </div>
                )}
                
                {/* Fotos Bônus Acumuladas */}
                {referralStats && referralStats.bonusPhotos > 0 && (
                  <div className="text-center p-2.5 sm:p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-600">Fotos extras ganhas</p>
                    <p className="text-2xl sm:text-3xl font-black text-green-600">+{referralStats.bonusPhotos.toLocaleString()}</p>
                  </div>
                )}
                
                {/* Link de indicação */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Seu link de indicação:</label>
                  <div className="flex gap-2">
                    <Input 
                      value={referralData.referralLink} 
                      readOnly 
                      className="flex-1 bg-gray-50 text-xs sm:text-sm h-9"
                    />
                    <Button onClick={copyReferralLink} className="bg-purple-600 hover:bg-purple-700 h-9 px-3">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Estatísticas */}
                {referralStats && (
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="text-center p-2.5 bg-blue-50 rounded-lg">
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">{referralStats.total}</p>
                      <p className="text-xs text-gray-600">Indicações</p>
                    </div>
                    <div className="text-center p-2.5 bg-green-50 rounded-lg">
                      <p className="text-xl sm:text-2xl font-bold text-green-600">{referralStats.converted}</p>
                      <p className="text-xs text-gray-600">Convertidas</p>
                    </div>
                  </div>
                )}
                
                {/* Informação */}
                <div className="flex items-start gap-2 p-2.5 sm:p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <Heart className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold mb-0.5">Como funciona?</p>
                    <p>Quando alguém assinar usando seu link, você ganha <strong>+1.000 fotos extras</strong>!</p>
                    <p className="mt-1 text-amber-700">Na 1ª indicação, ganha o selo de <strong>Embaixador</strong>!</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                Erro ao carregar dados. Tente novamente.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Comments Modal */}
      <Dialog open={commentsModalOpen} onOpenChange={setCommentsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle
              className="text-3xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent"
            >
              Comentários do Projeto
            </DialogTitle>
            <DialogDescription className="text-base mt-1">
      Visualize e gerencie comentários dos clientes nas fotos
    </DialogDescription>
  </DialogHeader>
  
  <div className="flex-1 overflow-y-auto">
    {commentsLoading ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Carregando comentários...</span>
      </div>
    ) : comments.length === 0 ? (
      <div className="text-center py-8">
        <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum comentário ainda</h3>
        <p className="text-gray-500">
          Os comentários dos clientes aparecerão aqui quando eles interagirem com as fotos.
        </p>
      </div>
    ) : (
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Cliente</p>
                  <p className="text-xs text-gray-500">
                    {new Date(comment.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              {!comment.isViewed && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  Novo
                </span>
              )}
            </div>
            
            {comment.photoId && comment.photoUrl && (
              <div className="flex items-start space-x-3 mb-3 p-3 bg-white rounded border">
                <div className="flex-shrink-0">
                  <img 
                    src={comment.photoUrl} 
                    alt={comment.photoOriginalName || comment.photoFilename || 'Foto'} 
                    className="w-16 h-16 object-cover rounded border"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {comment.photoOriginalName || comment.photoFilename || 'Arquivo sem nome'}
                  </p>
                  <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                    "{comment.comment}"
                  </p>
                </div>
              </div>
            )}

            {!comment.photoId && (
              <div className="mb-3">
                <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                  {comment.comment}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>

  <DialogFooter>
    <Button 
      variant="outline" 
      onClick={() => setCommentsModalOpen(false)}
    >
      Fechar
    </Button>
  </DialogFooter>
</DialogContent>
</Dialog>

    <div className="mt-16 mb-6 text-center">
      <p className="text-[10px] text-slate-400">
        A Fottufy é uma plataforma de <strong>seleção e entrega</strong> de fotos, não de armazenamento. Fotos de contas inativas podem ser removidas.{' '}
        <a href="https://fottufy.com/termos" target="_blank" rel="noopener" className="underline hover:text-slate-500 transition-colors">Saiba mais</a>
      </p>
    </div>
    </div>
  );
}
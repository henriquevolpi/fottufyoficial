import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit, Trash2, Share, Upload, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Portfolio {
  id: number;
  name: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  photos: PortfolioPhoto[];
}

interface PortfolioPhoto {
  id: number;
  photoUrl: string;
  originalName?: string;
  description?: string;
  order: number;
}

export default function PortfolioPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [newPortfolio, setNewPortfolio] = useState({
    name: "",
    description: "",
    isPublic: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user portfolios
  const { data: portfolios, isLoading } = useQuery({
    queryKey: ["/api/portfolios"],
    enabled: true
  });

  // Create portfolio mutation
  const createPortfolioMutation = useMutation({
    mutationFn: async (data: typeof newPortfolio) => {
      const response = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Erro ao criar portfólio");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      setIsCreateOpen(false);
      setNewPortfolio({ name: "", description: "", isPublic: true });
      toast({ title: "Portfólio criado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar portfólio", variant: "destructive" });
    }
  });

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .trim();
  };

  const handleCreatePortfolio = () => {
    if (!newPortfolio.name.trim()) {
      toast({ title: "Nome do portfólio é obrigatório", variant: "destructive" });
      return;
    }

    const slug = generateSlug(newPortfolio.name);
    createPortfolioMutation.mutate({
      ...newPortfolio,
      slug
    });
  };

  const copyPublicLink = (slug: string) => {
    const link = `${window.location.origin}/portfolio/${slug}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado para a área de transferência!" });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Meus Portfólios</h1>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Portfólio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Portfólio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do Portfólio</label>
                <Input
                  placeholder="Ex: Ensaio Casamento Amanda & João"
                  value={newPortfolio.name}
                  onChange={(e) => setNewPortfolio({ ...newPortfolio, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <Textarea
                  placeholder="Descrição do portfólio..."
                  value={newPortfolio.description}
                  onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newPortfolio.isPublic}
                  onChange={(e) => setNewPortfolio({ ...newPortfolio, isPublic: e.target.checked })}
                />
                <label htmlFor="isPublic" className="text-sm">Público (visível via link compartilhável)</label>
              </div>
              <Button 
                onClick={handleCreatePortfolio}
                disabled={createPortfolioMutation.isPending}
                className="w-full"
              >
                {createPortfolioMutation.isPending ? "Criando..." : "Criar Portfólio"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!portfolios || portfolios.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Image className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum portfólio criado</h3>
            <p className="text-gray-500 mb-4">
              Crie seu primeiro portfólio para compartilhar suas fotos com clientes
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Portfólio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map((portfolio: Portfolio) => (
            <Card key={portfolio.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gray-100 relative">
                {portfolio.coverImageUrl ? (
                  <img
                    src={portfolio.coverImageUrl}
                    alt={portfolio.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant={portfolio.isPublic ? "default" : "secondary"}>
                    {portfolio.isPublic ? "Público" : "Privado"}
                  </Badge>
                </div>
              </div>
              
              <CardHeader>
                <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                {portfolio.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{portfolio.description}</p>
                )}
                <p className="text-xs text-gray-500">
                  {portfolio.photos?.length || 0} fotos • Criado em{" "}
                  {new Date(portfolio.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </CardHeader>
              
              <CardContent>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyPublicLink(portfolio.slug)}
                  >
                    <Share className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
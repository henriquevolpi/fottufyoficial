import React, { useEffect, useRef, useCallback, memo } from 'react';

interface WatermarkOverlayProps {
  children: React.ReactNode;
  enabled: boolean;
  className?: string;
  // Otimização: permitir reutilização de canvas
  reuseCanvas?: boolean;
}

// Singleton canvas manager para otimização de memória
class WatermarkCanvasManager {
  private static instance: WatermarkCanvasManager;
  private canvasPool: HTMLCanvasElement[] = [];
  private activeCanvases = new Set<HTMLCanvasElement>();
  
  static getInstance(): WatermarkCanvasManager {
    if (!WatermarkCanvasManager.instance) {
      WatermarkCanvasManager.instance = new WatermarkCanvasManager();
    }
    return WatermarkCanvasManager.instance;
  }
  
  getCanvas(): HTMLCanvasElement {
    // Reutilizar canvas da pool se disponível
    const reusableCanvas = this.canvasPool.pop();
    if (reusableCanvas) {
      this.activeCanvases.add(reusableCanvas);
      return reusableCanvas;
    }
    
    // Criar novo canvas
    const canvas = document.createElement('canvas');
    this.activeCanvases.add(canvas);
    return canvas;
  }
  
  releaseCanvas(canvas: HTMLCanvasElement): void {
    this.activeCanvases.delete(canvas);
    
    // Limpar e adicionar à pool para reutilização
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
    }
    
    // Manter pool pequena para evitar acúmulo
    if (this.canvasPool.length < 3) {
      this.canvasPool.push(canvas);
    }
  }
  
  getActiveCanvasCount(): number {
    return this.activeCanvases.size;
  }
}

const WatermarkOverlay = memo(function WatermarkOverlay({ 
  children, 
  enabled, 
  className = "",
  reuseCanvas = true 
}: WatermarkOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isVisibleRef = useRef(true);
  
  // Otimização: debounce para redimensionamento
  const updateWatermark = useCallback(() => {
    if (!enabled || !containerRef.current || !canvasRef.current || !isVisibleRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    
    // Otimização: não redesenhar se dimensões não mudaram significativamente
    const currentWidth = Math.floor(rect.width);
    const currentHeight = Math.floor(rect.height);
    
    if (canvas.width === currentWidth && canvas.height === currentHeight) {
      return;
    }
    
    canvas.width = currentWidth;
    canvas.height = currentHeight;

    // Configurar texto da marca d'água
    const text = 'COPIA NAO AUTORIZADA';
    const fontSize = Math.max(16, Math.min(rect.width, rect.height) * 0.04);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calcular espaçamento
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;
    const spacingX = textWidth + 60;
    const spacingY = textHeight + 40;

    // Desenhar padrão repetitivo alternando entre cores claras e escuras
    let rowIndex = 0;
    for (let y = -spacingY; y < canvas.height + spacingY; y += spacingY) {
      let colIndex = 0;
      for (let x = -spacingX; x < canvas.width + spacingX; x += spacingX) {
        ctx.save();
        ctx.translate(x + spacingX / 2, y + spacingY / 2);
        ctx.rotate(-Math.PI / 6); // Rotação de 30 graus
        
        // Alternar entre cores claras e escuras em padrão xadrez
        const isDark = (rowIndex + colIndex) % 2 === 0;
        ctx.fillStyle = isDark 
          ? 'rgba(0, 0, 0, 0.4)'      // OPACIDADE PRETA: ajuste o último número (0.4) entre 0.1 e 1.0
          : 'rgba(255, 255, 255, 0.6)'; // OPACIDADE BRANCA: ajuste o último número (0.6) entre 0.1 e 1.0
        
        ctx.fillText(text, 0.2, 0.3);
        ctx.restore();
        colIndex++;
      }
      rowIndex++;
    }
  }, [enabled]);

  // Debounced version para performance
  const debouncedUpdateWatermark = useCallback(() => {
    // Usar requestAnimationFrame para melhor performance
    requestAnimationFrame(updateWatermark);
  }, [updateWatermark]);

  useEffect(() => {
    if (!enabled) return;

    const canvasManager = WatermarkCanvasManager.getInstance();
    
    // Obter canvas (reutilizado ou novo)
    if (reuseCanvas) {
      canvasRef.current = canvasManager.getCanvas();
    } else {
      canvasRef.current = document.createElement('canvas');
    }
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!container) return;
    
    // Adicionar canvas ao DOM
    canvas.className = "absolute inset-0 pointer-events-none z-10";
    container.appendChild(canvas);

    // Atualizar marca d'água inicialmente
    updateWatermark();

    // Intersection Observer para performance - só renderizar quando visível
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          debouncedUpdateWatermark();
        }
      },
      { threshold: 0.1 }
    );
    
    intersectionObserver.observe(container);

    // ResizeObserver otimizado
    resizeObserverRef.current = new ResizeObserver(debouncedUpdateWatermark);
    resizeObserverRef.current.observe(container);

    return () => {
      // Cleanup completo
      intersectionObserver.disconnect();
      
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      
      // Retornar canvas para a pool se usando reutilização
      if (reuseCanvas && canvasRef.current) {
        canvasManager.releaseCanvas(canvasRef.current);
      }
      
      canvasRef.current = null;
    };
  }, [enabled, reuseCanvas, updateWatermark, debouncedUpdateWatermark]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {children}
    </div>
  );
});

export { WatermarkOverlay };

// Debug helper para monitoramento de performance
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).getWatermarkStats = () => {
    const manager = WatermarkCanvasManager.getInstance();
    return {
      activeCanvases: manager.getActiveCanvasCount(),
      poolSize: manager['canvasPool'].length
    };
  };
}
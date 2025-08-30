import React, { useEffect, useRef } from 'react';

interface WatermarkOverlayProps {
  children: React.ReactNode;
  enabled: boolean;
  intensity?: number; // 0-100, padrão 25
  color?: 'white' | 'gray'; // padrão 'white'
  className?: string;
}

export function WatermarkOverlay({ 
  children, 
  enabled, 
  intensity = 25, 
  color = 'white', 
  className = "" 
}: WatermarkOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    const updateWatermark = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Limpar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Configurar estilo da marca d'água baseado nas configurações
      const text = '📷 fottufy';
      const fontSize = Math.max(18, Math.min(rect.width, rect.height) * 0.045);
      ctx.font = `${fontSize}px Arial, sans-serif`;
      
      // Aplicar cor e intensidade dinâmicas
      const normalizedIntensity = intensity / 100;
      const baseOpacity = normalizedIntensity * 0.4; // Máximo 40% de opacidade
      const strokeOpacity = normalizedIntensity * 0.2; // Máximo 20% para contorno
      
      if (color === 'white') {
        ctx.fillStyle = `rgba(255, 255, 255, ${baseOpacity})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${strokeOpacity})`;
      } else {
        ctx.fillStyle = `rgba(107, 114, 128, ${baseOpacity})`; // gray-500
        ctx.strokeStyle = `rgba(107, 114, 128, ${strokeOpacity})`;
      }
      
      ctx.lineWidth = 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Calcular espaçamento mais generoso para visual elegante
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;
      const spacingX = textWidth + 100; // Mais espaço horizontal
      const spacingY = textHeight + 60; // Mais espaço vertical

      // Desenhar linhas diagonais de fundo com cor dinâmica
      const lineOpacity = normalizedIntensity * 0.08;
      if (color === 'white') {
        ctx.strokeStyle = `rgba(255, 255, 255, ${lineOpacity})`;
      } else {
        ctx.strokeStyle = `rgba(107, 114, 128, ${lineOpacity})`;
      }
      ctx.lineWidth = 1;
      const lineSpacing = 80;
      
      // Linhas diagonais inclinadas
      for (let i = -canvas.width; i < canvas.width + canvas.height; i += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + canvas.height, canvas.height);
        ctx.stroke();
      }

      // Desenhar padrão repetitivo do texto com ícone de câmera
      for (let y = -spacingY; y < canvas.height + spacingY; y += spacingY) {
        for (let x = -spacingX; x < canvas.width + spacingX; x += spacingX) {
          ctx.save();
          ctx.translate(x + spacingX / 2, y + spacingY / 2);
          ctx.rotate(-Math.PI / 8); // Rotação mais suave (22.5 graus)
          
          // Desenhar texto com contorno sutil
          ctx.fillText(text, 0, 0);
          ctx.strokeText(text, 0, 0);
          
          ctx.restore();
        }
      }
    };

    // Atualizar marca d'água inicialmente
    updateWatermark();

    // Atualizar quando o container redimensionar
    const resizeObserver = new ResizeObserver(updateWatermark);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [enabled, intensity, color]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {children}
      {enabled && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-10"
          style={{ mixBlendMode: 'overlay' }}
        />
      )}
    </div>
  );
}
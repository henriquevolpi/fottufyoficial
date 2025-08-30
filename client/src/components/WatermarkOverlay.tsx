import React, { useEffect, useRef } from 'react';

interface WatermarkOverlayProps {
  children: React.ReactNode;
  enabled: boolean;
  className?: string;
}

export function WatermarkOverlay({ children, enabled, className = "" }: WatermarkOverlayProps) {
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

      // Configurar texto da marca d'água
      const text = 'fottufy (não copie)';
      const fontSize = Math.max(16, Math.min(rect.width, rect.height) * 0.04);
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Calcular espaçamento
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;
      const spacingX = textWidth + 60;
      const spacingY = textHeight + 40;

      // Desenhar padrão repetitivo
      for (let y = -spacingY; y < canvas.height + spacingY; y += spacingY) {
        for (let x = -spacingX; x < canvas.width + spacingX; x += spacingX) {
          ctx.save();
          ctx.translate(x + spacingX / 2, y + spacingY / 2);
          ctx.rotate(-Math.PI / 6); // Rotação de 30 graus
          ctx.fillText(text, 0, 0);
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
  }, [enabled]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {children}
      {enabled && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-10"
          style={{ mixBlendMode: 'multiply' }}
        />
      )}
    </div>
  );
}
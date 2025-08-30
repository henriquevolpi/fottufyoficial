import { useState, useEffect, useRef, useMemo } from 'react';

interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  buffer?: number;
  enabled?: boolean;
}

interface VirtualizationResult<T> {
  visibleItems: T[];
  totalHeight: number;
  offsetY: number;
  containerRef: React.RefObject<HTMLDivElement>;
  itemsPerRow: number;
  isVirtualizationActive: boolean;
}

export function useVirtualization<T>(
  items: T[],
  options: VirtualizationOptions
): VirtualizationResult<T> {
  const { itemHeight, containerHeight, buffer = 5, enabled = true } = options;
  
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Detectar número de colunas baseado na largura da tela
  const itemsPerRow = useMemo(() => {
    if (containerWidth === 0) return 4; // Default
    
    // Largura base de cada item (incluindo gap)
    const itemWidth = 320; // ~280px card + 40px gap
    const possibleColumns = Math.floor(containerWidth / itemWidth);
    
    // Limitar entre 1 e 6 colunas baseado no tamanho da tela
    if (containerWidth < 640) return 1;      // sm
    if (containerWidth < 768) return 2;      // md  
    if (containerWidth < 1024) return 3;     // lg
    if (containerWidth < 1280) return 4;     // xl
    if (containerWidth < 1536) return 5;     // 2xl
    return Math.min(possibleColumns, 6);     // Máximo 6 colunas
  }, [containerWidth]);
  
  // Calcular quantas linhas temos
  const totalRows = Math.ceil(items.length / itemsPerRow);
  const totalHeight = totalRows * itemHeight;
  
  // Calcular quais linhas estão visíveis
  const visibleRowStart = enabled ? Math.floor(scrollTop / itemHeight) : 0;
  const visibleRowEnd = enabled ? 
    Math.min(
      totalRows,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
    ) : totalRows;
  
  // Calcular offset
  const offsetY = enabled ? visibleRowStart * itemHeight : 0;
  
  // Obter itens visíveis
  const visibleItems = useMemo(() => {
    if (!enabled) return items;
    
    const startIndex = Math.max(0, (visibleRowStart - buffer) * itemsPerRow);
    const endIndex = Math.min(items.length, (visibleRowEnd + buffer) * itemsPerRow);
    
    return items.slice(startIndex, endIndex);
  }, [items, visibleRowStart, visibleRowEnd, itemsPerRow, buffer, enabled]);
  
  // Monitorar scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;
    
    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [enabled]);
  
  // Monitorar resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);
  
  // Determinar se virtualização está ativa
  const isVirtualizationActive = enabled && items.length > 50;
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    containerRef,
    itemsPerRow,
    isVirtualizationActive
  };
}

// Hook para detectar capacidades do dispositivo
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    isMobile: false,
    isLowEnd: false,
    hasGoodPerformance: true,
    maxPhotosPerPage: 144,
    shouldUseVirtualization: false
  });
  
  useEffect(() => {
    // Detectar mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    
    // Detectar dispositivo com baixa performance
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const memory = (navigator as any).deviceMemory || 4;
    
    const isLowEnd = hardwareConcurrency <= 2 || memory <= 2;
    const hasGoodPerformance = hardwareConcurrency >= 4 && memory >= 4;
    
    // Determinar configurações baseadas no dispositivo
    let maxPhotosPerPage = 144;
    let shouldUseVirtualization = false;
    
    if (isLowEnd) {
      maxPhotosPerPage = 50;
      shouldUseVirtualization = true;
    } else if (isMobile) {
      maxPhotosPerPage = 100;
      shouldUseVirtualization = true;
    }
    
    setCapabilities({
      isMobile,
      isLowEnd,
      hasGoodPerformance,
      maxPhotosPerPage,
      shouldUseVirtualization
    });
  }, []);
  
  return capabilities;
}
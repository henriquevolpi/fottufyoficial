import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, ShieldOff, Palette, Gauge } from 'lucide-react';

interface WatermarkSettings {
  enabled: boolean;
  intensity: number; // 0-100
  color: 'white' | 'gray';
}

interface WatermarkSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: WatermarkSettings) => void;
  currentSettings: WatermarkSettings;
  projectName?: string;
}

export function WatermarkSettingsModal({
  isOpen,
  onClose,
  onSave,
  currentSettings,
  projectName
}: WatermarkSettingsModalProps) {
  const [settings, setSettings] = useState<WatermarkSettings>(currentSettings);

  // Atualizar settings internos quando currentSettings mudar
  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const handleCancel = () => {
    setSettings(currentSettings); // Reset para valores originais
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Configurações da Marca d'Água
          </DialogTitle>
          <DialogDescription>
            {projectName ? 
              `Personalize a marca d'água para o projeto "${projectName}"`
              :
              "Personalize as configurações da marca d'água para este projeto"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Ativar/Desativar Marca d'Água */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              {settings.enabled ? (
                <Shield className="h-4 w-4 text-green-600" />
              ) : (
                <ShieldOff className="h-4 w-4 text-gray-400" />
              )}
              <Label htmlFor="watermark-enabled" className="text-sm font-medium">
                Ativar Marca d'Água
              </Label>
            </div>
            <Switch
              id="watermark-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          {/* Configurações avançadas - só aparecem se watermark estiver ativada */}
          {settings.enabled && (
            <>
              {/* Intensidade/Opacidade */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Gauge className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-medium">
                    Intensidade: {settings.intensity}%
                  </Label>
                </div>
                <div className="px-2">
                  <Slider
                    value={[settings.intensity]}
                    onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, intensity: value[0] }))
                    }
                    max={100}
                    min={10}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Sutil (10%)</span>
                    <span>Forte (100%)</span>
                  </div>
                </div>
              </div>

              {/* Cor da Marca d'Água */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Palette className="h-4 w-4 text-purple-600" />
                  <Label className="text-sm font-medium">Cor da Marca d'Água</Label>
                </div>
                <RadioGroup 
                  value={settings.color} 
                  onValueChange={(value: 'white' | 'gray') => 
                    setSettings(prev => ({ ...prev, color: value }))
                  }
                  className="flex space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="white" id="white" />
                    <Label htmlFor="white" className="text-sm flex items-center space-x-2">
                      <div className="w-4 h-4 bg-white border border-gray-300 rounded-full"></div>
                      <span>Branca</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="gray" id="gray" />
                    <Label htmlFor="gray" className="text-sm flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                      <span>Cinza</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Preview da configuração */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Preview:
                </Label>
                <div className="relative w-full h-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded overflow-hidden">
                  <div 
                    className="absolute inset-0 flex items-center justify-center text-sm font-medium pointer-events-none"
                    style={{
                      color: settings.color === 'white' ? 'white' : '#6B7280',
                      opacity: settings.intensity / 100,
                      background: settings.color === 'white' 
                        ? `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 70px)`
                        : `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(107,114,128,0.1) 35px, rgba(107,114,128,0.1) 70px)`
                    }}
                  >
                    📷 fottufy
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
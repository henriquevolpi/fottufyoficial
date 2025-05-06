import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Clock, Zap } from "lucide-react";
import { useLocation } from "wouter";

// Helper function to calculate time remaining
const getTimeRemaining = () => {
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  const totalSeconds = Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 1000));
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return {
    hours,
    minutes,
    seconds
  };
};

export default function PromotionalBanner() {
  const [, setLocation] = useLocation();
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());

  // Setup interval to update countdown timer
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);

    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Format time values to always have two digits
  const formatTimeValue = (value: number) => {
    return value.toString().padStart(2, '0');
  };

  return (
    <div className="w-full mb-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-md overflow-hidden">
      <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between text-white">
        <div className="flex flex-col md:flex-row items-center mb-4 md:mb-0">
          <Zap className="h-8 w-8 mr-3 mb-2 md:mb-0 animate-pulse" />
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold mb-1">
              🚨 50% de desconto hoje! A partir de R$14,90 - Planos promocionais disponíveis por tempo limitado!
            </h3>
            <p className="text-sm text-white/80">
              Aproveite e garanta mais espaço para suas fotos antes que essa oferta acabe.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2 mb-3 bg-white/20 py-2 px-4 rounded-lg">
            <Clock className="h-5 w-5" />
            <div className="grid grid-flow-col gap-1 text-center auto-cols-max">
              <div className="flex flex-col">
                <span className="font-mono text-xl">
                  {formatTimeValue(timeRemaining.hours)}
                </span>
                <span className="text-xs">horas</span>
              </div>
              <span className="text-xl">:</span>
              <div className="flex flex-col">
                <span className="font-mono text-xl">
                  {formatTimeValue(timeRemaining.minutes)}
                </span>
                <span className="text-xs">min</span>
              </div>
              <span className="text-xl">:</span>
              <div className="flex flex-col">
                <span className="font-mono text-xl">
                  {formatTimeValue(timeRemaining.seconds)}
                </span>
                <span className="text-xs">seg</span>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={() => setLocation('/subscription')} 
            className="w-full bg-white text-red-600 hover:bg-white/90 hover:text-red-700 font-bold"
          >
            Ver planos com desconto
          </Button>
        </div>
      </div>
    </div>
  );
}
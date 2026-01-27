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
    <div className="w-full mb-8 relative overflow-hidden">
      <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl sm:rounded-3xl shadow-2xl shadow-purple-500/25">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-fuchsia-400/20 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative p-5 sm:p-8 flex flex-col md:flex-row items-center justify-between text-white gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0">
              <Zap className="h-7 w-7 sm:h-8 sm:w-8 text-white animate-pulse" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-lg sm:text-2xl font-black uppercase tracking-tight mb-1">
                🚨 Planos a partir de R$19,90
              </h3>
              <p className="text-sm sm:text-base text-purple-100 font-light">
                Oferta por tempo limitado! Garanta mais espaço para suas fotos.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm py-3 px-5 rounded-2xl">
              <Clock className="h-5 w-5 text-purple-200" />
              <div className="flex items-center gap-1 text-center">
                <div className="flex flex-col items-center">
                  <span className="font-black text-xl sm:text-2xl">
                    {formatTimeValue(timeRemaining.hours)}
                  </span>
                  <span className="text-[10px] sm:text-xs uppercase tracking-wider text-purple-200">h</span>
                </div>
                <span className="font-black text-xl sm:text-2xl mx-0.5">:</span>
                <div className="flex flex-col items-center">
                  <span className="font-black text-xl sm:text-2xl">
                    {formatTimeValue(timeRemaining.minutes)}
                  </span>
                  <span className="text-[10px] sm:text-xs uppercase tracking-wider text-purple-200">m</span>
                </div>
                <span className="font-black text-xl sm:text-2xl mx-0.5">:</span>
                <div className="flex flex-col items-center">
                  <span className="font-black text-xl sm:text-2xl">
                    {formatTimeValue(timeRemaining.seconds)}
                  </span>
                  <span className="text-[10px] sm:text-xs uppercase tracking-wider text-purple-200">s</span>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={() => setLocation('/subscription')} 
              className="w-full bg-white text-purple-700 hover:bg-purple-50 hover:text-purple-800 font-black text-xs sm:text-sm tracking-widest uppercase px-6 py-5 sm:py-6 rounded-2xl shadow-xl hover:scale-105 transition-all duration-300"
            >
              Ver Planos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
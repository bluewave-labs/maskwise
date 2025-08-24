'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  title: string;
  description: string;
  features?: string[];
  className?: string;
  iconClassName?: string;
}

export function InfoTooltip({ 
  title, 
  description, 
  features = [], 
  className = "",
  iconClassName = "" 
}: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const iconRef = useRef<HTMLDivElement>(null);

  const updateTooltipPosition = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8
      });
    }
  };

  const handleMouseEnter = () => {
    updateTooltipPosition();
    setIsVisible(true);
  };

  return (
    <div className="relative inline-block">
      <div
        ref={iconRef}
        className={cn(
          "flex items-center justify-center w-4 h-4 rounded-full bg-gray-200/10 hover:bg-gray-200/20 transition-all duration-200 cursor-help group",
          iconClassName
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
      >
        <Info className="h-2.5 w-2.5 text-gray-400 group-hover:text-gray-300 transition-colors" />
      </div>

      {isVisible && (
        <div>
          <div className="fixed inset-0 z-[9998] pointer-events-none" />
          
          <div className={cn(
            "fixed z-[9999] w-80 p-4 rounded-xl shadow-2xl border bg-gray-900 border-gray-700 transform transition-all duration-200 ease-out animate-in fade-in-0 slide-in-from-top-2",
            className
          )}
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateX(-50%)'
          }}>
            <div className="relative z-10">
              <div className="flex items-start space-x-3 mb-3">
                <div className="flex-shrink-0 p-2 bg-blue-500/20 rounded-lg mt-0.5">
                  <Info className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-sm mb-1">
                    {title}
                  </h3>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>

              {features.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8"></div>
                    <div className="flex-1">
                      <p className="text-gray-400 text-xs font-medium mb-2">Key Features:</p>
                      <ul className="space-y-1">
                        {features.map((feature, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <div className="flex-shrink-0 w-1 h-1 bg-blue-400 rounded-full mt-2" />
                            <span className="text-gray-300 text-xs leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-gray-700" />
              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-gray-900 absolute top-0 left-1/2 -translate-x-1/2 translate-y-px" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
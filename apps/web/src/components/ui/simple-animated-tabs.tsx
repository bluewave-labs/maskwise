'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SimpleTab {
  label: string;
  value: string;
}

interface SimpleAnimatedTabsProps {
  tabs: SimpleTab[];
  defaultTab?: string;
  onTabChange?: (value: string) => void;
  className?: string;
}

const transition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.15
};

const getHoverAnimationProps = (hoveredRect: DOMRect, navRect: DOMRect) => ({
  x: hoveredRect.left - navRect.left + 4,
  y: hoveredRect.top - navRect.top + 2,
  width: hoveredRect.width - 8,
  height: hoveredRect.height - 4
});

export function SimpleAnimatedTabs({ 
  tabs, 
  defaultTab, 
  onTabChange, 
  className 
}: SimpleAnimatedTabsProps) {
  const [selectedTab, setSelectedTab] = React.useState(defaultTab || tabs[0]?.value || '');
  const [buttonRefs, setButtonRefs] = React.useState<Array<HTMLButtonElement | null>>([]);

  React.useEffect(() => {
    setButtonRefs((prev) => prev.slice(0, tabs.length));
  }, [tabs.length]);

  const navRef = React.useRef<HTMLDivElement>(null);
  const navRect = navRef.current?.getBoundingClientRect();

  const selectedIndex = tabs.findIndex(tab => tab.value === selectedTab);
  const selectedRect = buttonRefs[selectedIndex]?.getBoundingClientRect();

  const [hoveredTabIndex, setHoveredTabIndex] = React.useState<number | null>(null);
  const hoveredRect = buttonRefs[hoveredTabIndex ?? -1]?.getBoundingClientRect();

  const handleTabClick = (value: string) => {
    setSelectedTab(value);
    onTabChange?.(value);
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="relative flex w-full items-center justify-between border-b border-border overflow-x-auto overflow-y-hidden">
        <nav
          ref={navRef}
          className="flex flex-shrink-0 justify-center items-center relative z-0 py-2"
          onPointerLeave={() => setHoveredTabIndex(null)}>
          {tabs.map((tab, i) => {
            const isActive = selectedTab === tab.value;

            return (
              <button
                key={tab.value}
                ref={(el) => {
                  buttonRefs[i] = el;
                }}
                className="text-[13px] relative rounded-md flex items-center h-8 px-4 z-20 bg-transparent cursor-pointer select-none transition-colors"
                onPointerEnter={() => setHoveredTabIndex(i)}
                onFocus={() => setHoveredTabIndex(i)}
                onClick={() => handleTabClick(tab.value)}>
                <motion.span
                  className={cn('block', {
                    'text-zinc-500 dark:text-zinc-400': !isActive,
                    'text-black dark:text-white font-medium': isActive
                  })}>
                  <span>{tab.label}</span>
                </motion.span>
              </button>
            );
          })}

          <AnimatePresence>
            {hoveredRect && navRect && (
              <motion.div
                key="hover"
                className="absolute z-10 top-0 left-0 rounded-md bg-zinc-100 dark:bg-zinc-800"
                initial={{ ...getHoverAnimationProps(hoveredRect, navRect), opacity: 0 }}
                animate={{ ...getHoverAnimationProps(hoveredRect, navRect), opacity: 1 }}
                exit={{ ...getHoverAnimationProps(hoveredRect, navRect), opacity: 0 }}
                transition={transition}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {selectedRect && navRect && (
              <motion.div
                className="absolute z-10 bottom-0 left-0 h-[2px] bg-primary"
                initial={false}
                animate={{
                  width: selectedRect.width + 18,
                  x: `calc(${selectedRect.left - navRect.left - 9}px)`,
                  opacity: 1
                }}
                transition={transition}
              />
            )}
          </AnimatePresence>
        </nav>
      </div>
    </div>
  );
}
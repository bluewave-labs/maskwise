'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface Tab {
  label: string;
  value: string;
  content?: React.ReactNode;
  subRoutes?: string[];
}

interface AnimatedTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onTabChange?: (tab: Tab) => void;
  className?: string;
}

const transition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.15
};

const getHoverAnimationProps = (hoveredRect: DOMRect, navRect: DOMRect) => ({
  x: hoveredRect.left - navRect.left - 10,
  y: hoveredRect.top - navRect.top - 4,
  width: hoveredRect.width + 20,
  height: hoveredRect.height + 10
});

const useTabs = ({
  tabs,
  initialTabId,
  onChange
}: {
  tabs: Tab[];
  initialTabId: string;
  onChange?: (id: string) => void;
}) => {
  const [[selectedTabIndex, direction], setSelectedTab] = React.useState(() => {
    const indexOfInitialTab = tabs.findIndex((tab) => tab.value === initialTabId);
    return [indexOfInitialTab === -1 ? 0 : indexOfInitialTab, 0];
  });

  const handleTabChange = React.useCallback((newIndex: number) => {
    const tab = tabs[newIndex];
    if (tab && onChange) {
      onChange(tab.value);
    }
  }, [tabs, onChange]);

  React.useEffect(() => {
    handleTabChange(selectedTabIndex);
  }, [selectedTabIndex, handleTabChange]);

  return {
    tabProps: {
      tabs,
      selectedTabIndex,
      setSelectedTab
    },
    selectedTab: tabs[selectedTabIndex],
    contentProps: {
      direction,
      selectedTabIndex
    }
  };
};

const TabContent = ({ tab, className }: { tab: Tab; className?: string }) => {
  if (!tab.content) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={transition}
      className={cn("mt-4", className)}
    >
      {tab.content}
    </motion.div>
  );
};

const Tabs = ({ 
  tabs, 
  selectedTabIndex, 
  setSelectedTab 
}: { 
  tabs: Tab[]; 
  selectedTabIndex: number; 
  setSelectedTab: (input: [number, number]) => void 
}) => {
  const [buttonRefs, setButtonRefs] = React.useState<Array<HTMLButtonElement | null>>([]);

  React.useEffect(() => {
    setButtonRefs((prev) => prev.slice(0, tabs.length));
  }, [tabs.length]);

  const navRef = React.useRef<HTMLDivElement>(null);
  const navRect = navRef.current?.getBoundingClientRect();

  const selectedRect = buttonRefs[selectedTabIndex]?.getBoundingClientRect();

  const [hoveredTabIndex, setHoveredTabIndex] = React.useState<number | null>(null);
  const hoveredRect = buttonRefs[hoveredTabIndex ?? -1]?.getBoundingClientRect();

  return (
    <nav
      ref={navRef}
      className="flex flex-shrink-0 justify-center items-center relative z-0 py-2"
      onPointerLeave={() => setHoveredTabIndex(null)}>
      {tabs.map((item, i) => {
        const isActive = selectedTabIndex === i;

        return (
          <button
            key={item.value}
            className="text-[13px] relative rounded-md flex items-center h-8 px-4 z-20 bg-transparent cursor-pointer select-none transition-colors"
            onPointerEnter={() => setHoveredTabIndex(i)}
            onFocus={() => setHoveredTabIndex(i)}
            onClick={() => setSelectedTab([i, i > selectedTabIndex ? 1 : -1])}>
            <motion.span
              ref={(el) => {
                buttonRefs[i] = el as HTMLButtonElement;
              }}
              className={cn('block', {
                'text-zinc-500 dark:text-zinc-400': !isActive,
                'text-black dark:text-white font-medium': isActive
              })}>
              <span>{item.label}</span>
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
  );
};

export function AnimatedTabs({ 
  tabs, 
  defaultTab, 
  onTabChange, 
  className 
}: AnimatedTabsProps) {
  const [hookProps] = React.useState(() => {
    const initialTabId = defaultTab || tabs[0]?.value || '';

    return {
      tabs: tabs.map(({ label, value, subRoutes }) => ({
        label,
        value,
        subRoutes
      })),
      initialTabId,
      onChange: onTabChange
    };
  });

  const framer = useTabs(hookProps);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative flex w-full items-center justify-between border-b border-border overflow-x-auto overflow-y-hidden">
        <Tabs {...framer.tabProps} />
      </div>
      <AnimatePresence mode="wait">
        <TabContent tab={framer.selectedTab} />
      </AnimatePresence>
    </div>
  );
}
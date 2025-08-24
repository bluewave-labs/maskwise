'use client';

import { useEffect } from "react";
import { useMotionValue, useSpring, useInView } from "framer-motion";
import { useRef } from "react";

interface CounterProps {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  className?: string;
  format?: "number" | "percentage";
}

export default function Counter({
  value,
  direction = "up",
  delay = 0,
  className = "",
  format = "number"
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 200,
    restDelta: 0.001
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(direction === "down" ? 0 : value);
      }, delay * 1000);

      return () => clearTimeout(timer);
    }
  }, [motionValue, isInView, delay, value, direction]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        const formatted = format === "percentage" 
          ? `${Math.round(latest)}%` 
          : Intl.NumberFormat("en-US").format(Math.round(latest));
        ref.current.textContent = formatted;
      }
    });

    return () => unsubscribe();
  }, [springValue, format]);

  // Set initial value
  useEffect(() => {
    if (ref.current) {
      const initialValue = direction === "down" ? value : 0;
      const formatted = format === "percentage" 
        ? `${initialValue}%` 
        : Intl.NumberFormat("en-US").format(initialValue);
      ref.current.textContent = formatted;
    }
  }, []);

  return <span className={className} ref={ref} />;
}
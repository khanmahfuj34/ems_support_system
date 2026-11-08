"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number | null;
  duration?: number;
}

export function AnimatedCounter({
  value,
  duration = 850,
}: AnimatedCounterProps) {
  const [count, setCount] = useState<number>(0);
  const prevValueRef = useRef<number>(0);

  useEffect(() => {
    if (value === null) {
      return;
    }

    let frameId: number;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      frameId = requestAnimationFrame(() => {
        setCount(value);
        prevValueRef.current = value;
      });
      return () => {
        if (frameId) cancelAnimationFrame(frameId);
      };
    }

    const startValue = prevValueRef.current;
    const targetValue = value;
    let startTimestamp: number | null = null;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease-out cubic: 1 - (1 - progress)^3
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(
        startValue + (targetValue - startValue) * easeProgress,
      );

      setCount(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        prevValueRef.current = targetValue;
      }
    };

    frameId = requestAnimationFrame(step);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [value, duration]);

  if (value === null) {
    return <span>&mdash;</span>;
  }

  return <span>{count.toLocaleString()}</span>;
}

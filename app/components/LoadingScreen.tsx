'use client';

import dynamic from "next/dynamic";
import Image from "next/image";
import { Suspense, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DitherBackground = dynamic(() => import("@/components/Dither"), {
  ssr: false,
});

interface LoadingScreenProps {
  isReady: boolean;
}

const MIN_VISIBLE_DURATION_MS = 10000;

export const LoadingScreen = ({ isReady }: LoadingScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);
  const [isDitherReady, setIsDitherReady] = useState(false);
  const visibleSinceRef = useRef<number>(0);

  useEffect(() => {
    if (isReady) {
      if (!visibleSinceRef.current) {
        visibleSinceRef.current = performance.now();
      }

      const elapsed = performance.now() - visibleSinceRef.current;
      const remaining = Math.max(MIN_VISIBLE_DURATION_MS - elapsed, 0);

      const hideTimer = window.setTimeout(() => setIsVisible(false), remaining);
      const unmountTimer = window.setTimeout(
        () => setShouldRender(false),
        remaining + 850
      );

      return () => {
        window.clearTimeout(hideTimer);
        window.clearTimeout(unmountTimer);
      };
    }

    visibleSinceRef.current = performance.now();
    const frame = window.requestAnimationFrame(() => {
      setShouldRender(true);
      setIsVisible(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isReady]);


  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#120303]",
        "transition-opacity duration-700 ease-out",
        isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="absolute inset-0">
        <Suspense fallback={null}>
          <DitherBackground
            waveSpeed={0.045}
            waveFrequency={2.8}
            waveAmplitude={0.32}
            waveColor={[0.72, 0.12, 0.12]}
            colorNum={5}
            pixelSize={1.8}
            disableAnimation={false}
            enableMouseInteraction={false}
            mouseRadius={1.2}
            onReady={() => setIsDitherReady(true)}
          />
        </Suspense>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/30 to-black/80" />


      <div 
        className={cn(
          "relative z-10 flex flex-col items-center gap-8 px-6 text-center text-neutral-100",
          "transition-opacity duration-300",
          isDitherReady ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="relative flex h-40 w-40 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-red-500/30 bg-red-900/40 blur-3xl" />
          <span className="absolute inset-4 rounded-full border border-red-500/40 loading-rune-spin" />
          <span className="absolute inset-1 rounded-full border border-red-400/20 loading-rune-spin-reverse" />
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500/10 via-transparent to-red-400/20" />
            <Image
              src="/favicon.png"
              alt="Daggor crest"
              fill
              priority
              className="object-contain drop-shadow-[0_0_1.6rem_rgba(255,160,160,0.55)]"
            />
        </div>

        <div className="space-y-2">
          <p className="text-[0.7rem] uppercase tracking-[0.65em] text-red-200/70">
            Arcane Loading Ritual
          </p>
          <p className="text-3xl font-black tracking-tight text-red-50 drop-shadow-[0_0_1.25rem_rgba(0,0,0,0.9)]">
            Forging the Battlemap...
          </p>
          <p className="mx-auto max-w-sm text-sm font-medium text-neutral-300/90">
            Gathering heroes, aligning gridlines, and summoning the realm for play.
          </p>
        </div>
      </div>
    </div>
  );
};


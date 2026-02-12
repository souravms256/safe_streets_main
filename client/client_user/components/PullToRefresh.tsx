"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
    children: React.ReactNode;
    onRefresh: () => Promise<void>;
    disabled?: boolean;
}

export default function PullToRefresh({ children, onRefresh, disabled = false }: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef(0);
    const isPulling = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const THRESHOLD = 80;
    const MAX_PULL = 120;

    const canPull = useCallback(() => {
        if (disabled || isRefreshing) return false;
        // Only pull if scrolled to top
        return window.scrollY <= 0;
    }, [disabled, isRefreshing]);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            if (!canPull()) return;
            startY.current = e.touches[0].clientY;
            isPulling.current = true;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isPulling.current || !canPull()) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startY.current;

            if (diff > 0) {
                // Prevent default scrolling while pulling
                e.preventDefault();
                const distance = Math.min(diff * 0.5, MAX_PULL); // Apply resistance
                setPullDistance(distance);
            } else {
                isPulling.current = false;
                setPullDistance(0);
            }
        };

        const handleTouchEnd = async () => {
            if (!isPulling.current) return;
            isPulling.current = false;

            if (pullDistance >= THRESHOLD) {
                setIsRefreshing(true);
                setPullDistance(THRESHOLD);
                try {
                    await onRefresh();
                } finally {
                    setIsRefreshing(false);
                    setPullDistance(0);
                }
            } else {
                setPullDistance(0);
            }
        };

        const el = containerRef.current;
        if (!el) return;

        el.addEventListener("touchstart", handleTouchStart, { passive: true });
        el.addEventListener("touchmove", handleTouchMove, { passive: false });
        el.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            el.removeEventListener("touchstart", handleTouchStart);
            el.removeEventListener("touchmove", handleTouchMove);
            el.removeEventListener("touchend", handleTouchEnd);
        };
    }, [canPull, onRefresh, pullDistance]);

    const progress = Math.min(pullDistance / THRESHOLD, 1);

    return (
        <div ref={containerRef} className="relative md:hidden">
            {/* Pull indicator */}
            <div
                className="absolute left-0 right-0 flex items-center justify-center overflow-hidden transition-opacity"
                style={{
                    height: `${pullDistance}px`,
                    top: `-${pullDistance}px`,
                    opacity: progress,
                }}
            >
                <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg dark:bg-slate-800 ${isRefreshing ? "animate-spin" : ""
                        }`}
                    style={{
                        transform: `rotate(${progress * 360}deg)`,
                    }}
                >
                    <RefreshCw className="h-5 w-5 text-blue-500" />
                </div>
            </div>

            {/* Content with pull offset */}
            <div
                className="transition-transform"
                style={{
                    transform: `translateY(${pullDistance}px)`,
                    transitionDuration: isPulling.current ? "0ms" : "300ms",
                }}
            >
                {children}
            </div>
        </div>
    );
}

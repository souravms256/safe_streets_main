"use client";

import { motion, useReducedMotion } from "framer-motion";
import React from "react";

interface PageTransitionProps {
    children: React.ReactNode;
    className?: string;
}

export default function PageTransition({ children, className = "" }: PageTransitionProps) {
    const prefersReducedMotion = useReducedMotion();

    return (
        <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.1 : 0.18, ease: "easeOut" }}
            className={className}
            suppressHydrationWarning
        >
            {children}
        </motion.div>
    );
}

import React from "react";
import { Divide, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className = "",
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-12 text-center px-4 ${className}`}>
            <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800 ring-8 ring-slate-50 dark:ring-slate-900">
                <Icon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
                {title}
            </h3>
            <p className="mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                {description}
            </p>
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="outline" size="sm">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}

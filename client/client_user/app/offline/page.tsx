import React from "react";
import { WifiOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function OfflinePage() {
    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <WifiOff className="h-10 w-10 text-slate-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                You're Offline
            </h1>
            <p className="mt-3 max-w-sm text-slate-500 dark:text-slate-400">
                It looks like you've lost your internet connection. Some features may be unavailable until you're back online.
            </p>
            <div className="mt-8 flex gap-3">
                <Button onClick={() => window.location.reload()} variant="primary">
                    Try Again
                </Button>
                <Link href="/dashboard">
                    <Button variant="outline">Go to Dashboard</Button>
                </Link>
            </div>
        </div>
    );
}

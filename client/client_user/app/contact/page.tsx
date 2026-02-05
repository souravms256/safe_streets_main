"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";

export default function ContactPage() {
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate submission
        setTimeout(() => {
            setIsLoading(false);
            toast.success("Message sent successfully!");
        }, 1500);
    };

    return (
        <div className="bg-white py-24 sm:py-32 dark:bg-slate-950">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                        Contact Us
                    </h2>
                    <p className="mt-2 text-lg leading-8 text-slate-600 dark:text-slate-400">
                        Have questions or suggestions? We'd love to hear from you.
                    </p>
                </div>
                <div className="mx-auto mt-16 max-w-xl sm:mt-20">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                            <Input
                                label="First name"
                                id="first-name"
                                name="first-name"
                                type="text"
                                autoComplete="given-name"
                                required
                            />
                            <Input
                                label="Last name"
                                id="last-name"
                                name="last-name"
                                type="text"
                                autoComplete="family-name"
                                required
                            />
                        </div>
                        <Input
                            label="Email"
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                        />
                        <div>
                            <label
                                htmlFor="message"
                                className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                            >
                                Message
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                rows={4}
                                className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                                required
                            ></textarea>
                        </div>
                        <div className="mt-10">
                            <Button type="submit" className="w-full" isLoading={isLoading}>
                                Send Message
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const full_name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const dob = formData.get("dob") as string;

        try {
            // SignupRequest expects: full_name, email, password, dob?, role?
            await api.post("/auth/signup", {
                full_name,
                email,
                password,
                dob,
                role: "user"
            });

            alert("Account created successfully! Please log in.");
            router.push("/login");
        } catch (error) {
            console.error("Signup failed:", error);
            alert("Signup failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl dark:bg-slate-900">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Create an account
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Join SafeStreets and make a difference
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            autoComplete="name"
                            required
                            label="Full Name"
                            placeholder="John Doe"
                        />
                        <Input
                            id="dob"
                            name="dob"
                            type="date"
                            required
                            label="Date of Birth"
                        />
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            label="Email address"
                            placeholder="you@example.com"
                        />
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            required
                            label="Password"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={isLoading}
                        >
                            Create account
                        </Button>
                    </div>
                </form>

                <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});

    const router = useRouter();

    const validateForm = (formData: FormData): boolean => {
        const newErrors: { email?: string; password?: string; name?: string } = {};
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const name = formData.get("name") as string;

        if (!name || name.trim().length < 2) {
            newErrors.name = "Name must be at least 2 characters";
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = "Please enter a valid email address";
        }

        if (!password || password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget as HTMLFormElement);

        if (!validateForm(formData)) {
            toast.error("Please fix the errors below");
            return;
        }

        setIsLoading(true);

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

            toast.success("Account created successfully! Please log in.");
            router.push("/login");
        } catch (error) {
            console.error("Signup failed:", error);
            toast.error("Signup failed. Please try again.");
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
                            error={errors.name}
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
                            error={errors.email}
                        />
                        <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            required
                            label="Password"
                            placeholder="••••••••"
                            error={errors.password}
                            suffix={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            }
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

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import api from "@/services/api";
import { Eye, EyeOff } from "lucide-react";
import PageTransition from "@/components/PageTransition";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        try {
            const response = await api.post("/auth/login", { email, password });
            const { access_token, refresh_token } = response.data;

            localStorage.setItem("access_token", access_token);
            localStorage.setItem("refresh_token", refresh_token);

            router.push("/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl dark:bg-slate-900">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Welcome back
                        </h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Sign in to your SafeStreets account
                        </p>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
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
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                required
                                label="Password"
                                placeholder="••••••••"
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

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                />
                                <label
                                    htmlFor="remember-me"
                                    className="ml-2 block text-sm text-slate-900 dark:text-slate-300"
                                >
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <Link
                                    href="#"
                                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <div>
                            <Button
                                type="submit"
                                className="w-full"
                                isLoading={isLoading}
                            >
                                Sign in
                            </Button>
                        </div>
                    </form>

                    <div className="relative mt-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white px-2 text-slate-500 dark:bg-slate-900">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <Button variant="outline" className="w-full">
                            <svg
                                className="mr-2 h-5 w-5"
                                aria-hidden="true"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12.0003 20.45c-4.6667 0-8.4503-3.7836-8.4503-8.45 0-4.6667 3.7836-8.4503 8.4503-8.4503 4.6667 0 8.4503 3.7836 8.4503 8.4503 0 4.6667-3.7836 8.45 8.4503 8.45zm0-18.4606c-5.5186 0-10.0106 4.492-10.0106 10.0106 0 5.5186 4.492 10.0106 10.0106 10.0106 5.5186 0 10.0106-4.492 10.0106-10.0106 0-5.5186-4.492-10.0106-10.0106-10.0106z" />
                            </svg>
                            Google
                        </Button>
                        <Button variant="outline" className="w-full">
                            <svg
                                className="mr-2 h-5 w-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    d="M13.135 6.056c-.504-2.527-3.235-4.52-6.19-4.045-.583 3.12 2.115 5.758 5.445 5.532.221-.01.442-.023.66 -.044.254-1.12.355-1.996.085-1.443zm2.348 7.377c-.576.81-1.353 1.777-2.347 1.8-1.026.02-1.358-.606-2.535-.606-1.196 0-1.57.625-2.553.606-.992-.023-1.747-.99-2.38-1.905-1.294-1.87-2.288-5.325.938-7.927.79-.623 2.193-.507 2.766-.188.423.238.995.626 1.83.626.837 0 1.455-.425 2.155-.589.67-.156 2.016.142 2.923 1.25-.098.055-.956.55-1.91 1.76l.01.002c-1.353 1.898-.952 3.826 1.103 5.176z"
                                />
                            </svg>
                            Apple
                        </Button>
                    </div>

                    <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
                        Don&apos;t have an account?{" "}
                        <Link
                            href="/register"
                            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </PageTransition>
    );
}

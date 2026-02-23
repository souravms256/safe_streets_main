"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import api from "@/services/api";
import { ArrowLeft, Mail, KeyRound, CheckCircle2, Eye, EyeOff } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { AxiosError } from "axios";

type Step = "email" | "otp" | "success";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [devOtp, setDevOtp] = useState<string | null>(null);

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await api.post("/auth/forgot-password", { email });
            // MVP: OTP is returned in response for testing
            if (res.data.otp) setDevOtp(res.data.otp);
            setStep("otp");
        } catch (err) {
            const axiosErr = err as AxiosError<{ detail: string }>;
            setError(axiosErr.response?.data?.detail || "Failed to send reset code.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            await api.post("/auth/reset-password", {
                email,
                otp,
                new_password: newPassword,
            });
            setStep("success");
        } catch (err) {
            const axiosErr = err as AxiosError<{ detail: string }>;
            setError(axiosErr.response?.data?.detail || "Failed to reset password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-10 shadow-xl dark:bg-slate-900">
                    {/* Back link */}
                    <Link
                        href="/login"
                        className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Back to login
                    </Link>

                    {/* Step 1: Enter Email */}
                    {step === "email" && (
                        <>
                            <div className="text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20">
                                    <Mail className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Forgot your password?
                                </h2>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    Enter your email and we&apos;ll send you a reset code.
                                </p>
                            </div>

                            {error && (
                                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleRequestOtp} className="space-y-4">
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    label="Email address"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <Button type="submit" className="w-full" isLoading={isLoading}>
                                    Send Reset Code
                                </Button>
                            </form>
                        </>
                    )}

                    {/* Step 2: Enter OTP + New Password */}
                    {step === "otp" && (
                        <>
                            <div className="text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20">
                                    <KeyRound className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Enter reset code
                                </h2>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    Code sent to <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span>
                                </p>
                            </div>

                            {/* MVP: Show OTP for testing */}
                            {devOtp && (
                                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm dark:bg-amber-900/20 dark:border-amber-800">
                                    <p className="font-semibold text-amber-700 dark:text-amber-400">🔧 Dev Mode</p>
                                    <p className="text-amber-600 dark:text-amber-300 mt-1">
                                        Your OTP: <span className="font-mono font-bold text-lg tracking-widest">{devOtp}</span>
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <Input
                                    id="otp"
                                    type="text"
                                    required
                                    label="6-digit code"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    autoComplete="one-time-code"
                                />
                                <Input
                                    id="new-password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    label="New password"
                                    placeholder="Min 6 characters"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    suffix={
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    }
                                />
                                <Input
                                    id="confirm-password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    label="Confirm password"
                                    placeholder="Re-enter password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <Button type="submit" className="w-full" isLoading={isLoading}>
                                    Reset Password
                                </Button>
                            </form>

                            <button
                                onClick={() => { setStep("email"); setError(null); setDevOtp(null); }}
                                className="w-full text-center text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                            >
                                Use a different email
                            </button>
                        </>
                    )}

                    {/* Step 3: Success */}
                    {step === "success" && (
                        <div className="text-center py-4">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                Password reset!
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                Your password has been updated. You can now log in with your new password.
                            </p>
                            <Button onClick={() => router.push("/login")} className="w-full">
                                Go to Login
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
}

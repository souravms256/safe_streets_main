import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function AboutPage() {
    return (
        <div className="bg-white dark:bg-slate-950">
            <div className="relative isolate overflow-hidden bg-slate-900 py-16 sm:py-24 md:py-32">
                <Image
                    src="/images/about-community.png"
                    alt="Community volunteers"
                    fill
                    className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20"
                />
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl lg:mx-0">
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-6xl">
                            About SafeStreets
                        </h2>
                        <p className="mt-6 text-lg leading-8 text-slate-300">
                            We are an advanced civic technology platform dedicated to improving road safety through automated enforcement and community reporting.
                        </p>
                    </div>
                </div>
            </div>
            <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
                <div className="mx-auto max-w-2xl lg:mx-0">
                    <div className="mx-auto mt-16 max-w-2xl lg:mx-0 lg:max-w-none">
                        <div className="grid grid-cols-1 gap-x-8 gap-y-6 text-base font-semibold leading-7 text-slate-900 sm:grid-cols-2 md:lex dark:text-white lg:gap-x-10">
                            {[
                                { label: "Founded", value: "2023" },
                                { label: "Communities", value: "500+" },
                                { label: "Reports Resolved", value: "12k+" },
                                { label: "Active Users", value: "50k+" },
                            ].map((stat) => (
                                <div key={stat.label} className="flex flex-col-reverse gap-y-4">
                                    <dt className="text-base leading-7 text-slate-600 dark:text-slate-400">
                                        {stat.label}
                                    </dt>
                                    <dd className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">
                                        {stat.value}
                                    </dd>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mx-auto mt-16 max-w-2xl lg:mx-0">
                        <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Our Mission
                        </h3>
                        <p className="mt-6 text-base leading-7 text-slate-600 dark:text-slate-300">
                            At SafeStreets, we believe that safety is a collective responsibility. By empowering residents with easy-to-use reporting tools and real-time data, we bridge the gap between communities and local authorities. Our platform fosters transparency, accountability, and rapid response to ensuring that every street is a safe street.
                        </p>
                        <div className="mt-10">
                            <Link href="/register">
                                <Button>Join the Movement</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
}

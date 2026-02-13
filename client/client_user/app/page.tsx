"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { motion, Variants } from "framer-motion";

export default function Home() {
  // Animation variants
  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: (custom: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: custom * 0.1,
        duration: 0.6,
        ease: "easeOut",
      },
    }),
  };

  const fadeInRight: Variants = {
    hidden: { opacity: 0, x: 30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };


  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white pt-8 pb-12 md:pt-16 md:pb-20 lg:pt-24 lg:pb-28 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-x-12">
            <motion.div
              className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div
                variants={fadeInUp}
                custom={0}
                className="mb-8 flex"
              >
                <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-slate-600 ring-1 ring-slate-900/10 hover:ring-slate-900/20 dark:text-slate-400 dark:ring-white/10 dark:hover:ring-white/20 transition-all duration-300 hover:scale-105">
                  AI-powered real-time enforcement.{" "}
                  <Link href="/about" className="whitespace-nowrap font-semibold text-blue-600 dark:text-blue-400">
                    How it works <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                custom={1}
                className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-6xl dark:text-white"
              >
                Smarter Traffic, <span className="text-blue-600 inline-block">Safer Streets</span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                custom={2}
                className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300"
              >
                SafeStreets uses advanced AI to detect and report traffic violations instantly. From helmetless driving to no-parking enforcement, we help automate road safety.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                custom={3}
                className="mt-10 flex items-center gap-x-6"
              >
                <Link href="/register">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" className="rounded-full shadow-2xl shadow-blue-500/20">
                      Accredit Device
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/about">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" size="lg" className="group">
                      Live Demo{" "}
                      <span aria-hidden="true" className="ml-2 transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              className="mt-16 sm:mt-24 lg:mt-0 lg:flex-grow"
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              <motion.div
                className="relative aspect-[4/3] w-full max-w-lg mx-auto lg:max-w-none rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-900/10 rotate-2 hover:rotate-0 transition-transform duration-500 dark:ring-white/10"
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 6,
                  ease: "easeInOut"
                }}
              >
                <Image
                  src="/images/hero-traffic-tech.png"
                  alt="AI Traffic Monitoring System"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="bg-slate-50 py-12 md:py-24 sm:py-32 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Image Side */}
            <motion.div
              className="order-2 lg:order-1 relative h-[300px] md:h-[600px] w-full rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInRight}
            >
              <Image
                src="/images/feature-violation-detect.png"
                alt="Violation Detection Interface"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent flex items-end p-8">
                <motion.p
                  className="text-white font-medium text-lg"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Instant violation capture and reporting.
                </motion.p>
              </div>
            </motion.div>

            {/* Text Side */}
            <motion.div
              className="order-1 lg:order-2"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              <div className="max-w-lg">
                <motion.h2 variants={fadeInUp} className="text-base font-semibold leading-7 text-blue-600">
                  Automated Enforcement
                </motion.h2>
                <motion.p variants={fadeInUp} className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                  Detect. Capture. Report.
                </motion.p>
                <motion.p variants={fadeInUp} className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400">
                  Our app leverages computer vision to identify critical safety violations in real-time and report them to the respective authorities.
                </motion.p>
                <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-slate-600 lg:max-w-none dark:text-slate-400">
                  {[
                    {
                      name: "Helmetless Driving",
                      description:
                        "Automatically detects riders driving without helmets and captures license plate evidence.",
                      icon: (
                        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                        </svg>
                      )
                    },
                    {
                      name: "No Parking Violation",
                      description:
                        "Identifies vehicles parked in restricted zones and logs the duration and location.",
                      icon: (
                        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      )
                    },
                    {
                      name: "Triple Riding",
                      description:
                        "Detects more than two passengers on two-wheelers, a major cause of fatal accidents.",
                      icon: (
                        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                      )
                    },
                  ].map((feature) => (
                    <motion.div
                      key={feature.name}
                      variants={fadeInUp}
                      className="relative pl-10"
                    >
                      <dt className="text-base font-semibold leading-7 text-slate-900 dark:text-white">
                        <div className="absolute left-0 top-1">
                          {feature.icon}
                        </div>
                        {feature.name}
                      </dt>
                      <dd className="mt-1 text-base leading-7 text-slate-600 dark:text-slate-400">
                        {feature.description}
                      </dd>
                    </motion.div>
                  ))}
                </dl>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

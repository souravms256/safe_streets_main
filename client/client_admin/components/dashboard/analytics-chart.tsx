"use client";

import { useEffect, useRef, useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsChartProps {
    data: { date: string; count: number }[];
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setDimensions({ width, height });
                }
            }
        });

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const maxCount = Math.max(...data.map((d) => d.count), 1);

    return (
        <Card className="bg-black border-gray-800 col-span-1 lg:col-span-3">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-white">
                        Reports Over Time
                    </CardTitle>
                    <span className="text-xs font-medium text-gray-500 bg-white/5 px-2.5 py-1 rounded-full">
                        Last 7 days
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                <div ref={containerRef} className="h-[300px] w-full">
                    {dimensions.width > 0 && dimensions.height > 0 && (
                        <AreaChart
                            data={data}
                            width={dimensions.width}
                            height={dimensions.height}
                            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient
                                    id="colorCount"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor="#3b82f6"
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="#3b82f6"
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.04)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="date"
                                stroke="transparent"
                                tick={{ fill: "#6b7280", fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) =>
                                    new Date(value).toLocaleDateString(
                                        undefined,
                                        {
                                            month: "short",
                                            day: "numeric",
                                        }
                                    )
                                }
                            />
                            <YAxis
                                stroke="transparent"
                                tick={{ fill: "#6b7280", fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                                domain={[0, Math.ceil(maxCount * 1.2)]}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "rgba(0,0,0,0.85)",
                                    borderColor: "rgba(255,255,255,0.1)",
                                    borderRadius: "12px",
                                    padding: "10px 14px",
                                    color: "#fff",
                                    boxShadow:
                                        "0 10px 40px rgba(0,0,0,0.4)",
                                }}
                                itemStyle={{
                                    color: "#3b82f6",
                                    fontWeight: 600,
                                }}
                                labelStyle={{
                                    color: "#9ca3af",
                                    fontSize: "12px",
                                    marginBottom: "4px",
                                }}
                                labelFormatter={(value) =>
                                    new Date(value).toLocaleDateString(
                                        undefined,
                                        {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                        }
                                    )
                                }
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                fill="url(#colorCount)"
                                dot={{
                                    fill: "#000",
                                    stroke: "#3b82f6",
                                    strokeWidth: 2,
                                    r: 4,
                                }}
                                activeDot={{
                                    r: 6,
                                    fill: "#3b82f6",
                                    stroke: "#000",
                                    strokeWidth: 2,
                                }}
                                name="Reports"
                            />
                        </AreaChart>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

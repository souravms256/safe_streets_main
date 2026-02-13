"use client";

import { useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
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

    return (
        <Card className="bg-black border-gray-800 col-span-1 lg:col-span-3">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-white">Reports Over Time</CardTitle>
            </CardHeader>
            <CardContent>
                <div ref={containerRef} className="h-[300px] w-full">
                    {dimensions.width > 0 && dimensions.height > 0 && (
                        <LineChart
                            data={data}
                            width={dimensions.width}
                            height={dimensions.height}
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#666"
                                tick={{ fill: '#666' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            />
                            <YAxis
                                stroke="#666"
                                tick={{ fill: '#666' }}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#888' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#fff"
                                strokeWidth={2}
                                dot={{ fill: '#000', stroke: '#fff', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, fill: '#fff' }}
                            />
                        </LineChart>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

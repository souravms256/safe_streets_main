"use client";

import { useEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TypeChartProps {
    data: { name: string; value: number }[];
}

const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#f97316",
];

export function TypeChart({ data }: TypeChartProps) {
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

    const total = data.reduce((sum, d) => sum + d.value, 0);

    return (
        <Card className="bg-black border-gray-800 col-span-1">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-white">
                    Reports by Type
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div ref={containerRef} className="h-[200px] w-full">
                    {dimensions.width > 0 &&
                    dimensions.height > 0 &&
                    data.length > 0 ? (
                        <PieChart
                            width={dimensions.width}
                            height={dimensions.height}
                        >
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                                strokeWidth={0}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                        stroke="transparent"
                                    />
                                ))}
                            </Pie>
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
                                itemStyle={{ color: "#fff", fontWeight: 600 }}
                            />
                        </PieChart>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                            {data.length === 0 ? "No data available" : ""}
                        </div>
                    )}
                </div>

                {/* Custom Legend */}
                {data.length > 0 && (
                    <div className="mt-3 space-y-1.5 max-h-[120px] overflow-y-auto scrollbar-thin">
                        {data.map((item, index) => (
                            <div
                                key={item.name}
                                className="flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div
                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                        style={{
                                            backgroundColor:
                                                COLORS[index % COLORS.length],
                                        }}
                                    />
                                    <span className="text-xs text-gray-400 truncate">
                                        {item.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className="text-xs font-semibold text-white">
                                        {item.value}
                                    </span>
                                    <span className="text-[10px] text-gray-600">
                                        {total > 0
                                            ? `${Math.round(
                                                  (item.value / total) * 100
                                              )}%`
                                            : "0%"}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

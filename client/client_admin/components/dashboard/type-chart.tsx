"use client";

import { useEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TypeChartProps {
    data: { name: string; value: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

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

    return (
        <Card className="bg-black border-gray-800 col-span-1">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-white">Reports by Type</CardTitle>
            </CardHeader>
            <CardContent>
                <div ref={containerRef} className="h-[300px] w-full">
                    {dimensions.width > 0 && dimensions.height > 0 && data.length > 0 ? (
                        <PieChart width={dimensions.width} height={dimensions.height}>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="black" strokeWidth={2} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend wrapperStyle={{ color: '#888' }} />
                        </PieChart>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                            {data.length === 0 ? "No data available" : ""}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

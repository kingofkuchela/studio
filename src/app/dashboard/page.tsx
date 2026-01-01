"use client";

import React, { useMemo, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ComposedChart, Line } from 'recharts';
import type { Trade, DailyCandlestickData, DailyProfitLossDataPoint, CandlestickAggregationLevel } from '@/types';
import { calculateDashboardMetrics, generateCumulativePnlData, generatePnlCandlestickData, generateDailyProfitLossData } from '@/lib/tradeCalculations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, ArrowRightLeft, Percent, Bot, User, Flame } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SummaryCard from '@/components/dashboard/SummaryCard';
import MainLayout from '@/components/layout/MainLayout';
import { useAppContext } from '@/contexts/AppContext';
import { CandlestickShape, CustomCandlestickTooltip } from '@/components/shared/CandlestickChartComponents';
import DashboardActivityFeed from '@/components/dashboard/DashboardActivityFeed';
import DashboardCalendarView from '@/components/dashboard/DashboardCalendarView';

// Custom Tooltip for Cumulative P&L
const PnlTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 bg-background/90 border border-border rounded-lg shadow-lg text-xs backdrop-blur-sm">
                <p className="font-bold text-foreground mb-1">{new Date(label).toLocaleDateString()}</p>
                <p className="text-muted-foreground"><span className="font-medium text-foreground">Cumulative P&L:</span> <span className={payload[0].value >= 0 ? 'text-green-500' : 'text-red-500'}>{formatCurrency(payload[0].value)}</span></p>
            </div>
        );
    }
    return null;
};

// Custom Tooltip for Daily Profit/Loss
const DailyPnlTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const profit = payload.find((p: any) => p.dataKey === 'dailyProfit');
        const loss = payload.find((p: any) => p.dataKey === 'dailyLoss');
        return (
            <div className="p-2 bg-background/90 border border-border rounded-lg shadow-lg text-xs backdrop-blur-sm">
                <p className="font-bold text-foreground mb-1">{new Date(label + 'T00:00:00').toLocaleDateString()}</p>
                {profit && profit.value !== 0 && <p className="text-green-500"><span className="font-medium">Profit:</span> {formatCurrency(profit.value)}</p>}
                {loss && loss.value !== 0 && <p className="text-red-500"><span className="font-medium">Loss:</span> {formatCurrency(loss.value)}</p>}
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const { trades: allTradesForMode, edges, isLoading, tradingMode } = useAppContext();
    const trades = useMemo(() => {
        if (tradingMode === 'both') {
            const combined = [...allTradesForMode.real, ...allTradesForMode.theoretical];
            return Array.from(new Map(combined.map(t => [t.id, t])).values());
        }
        return allTradesForMode[tradingMode];
    }, [allTradesForMode, tradingMode]);

    const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
    const [candlestickAggregation, setCandlestickAggregation] = useState<CandlestickAggregationLevel>('day');

    const dashboardMetrics = useMemo(() => calculateDashboardMetrics(trades, edges[tradingMode] || []), [trades, edges, tradingMode]);
    const cumulativePnlData = useMemo(() => generateCumulativePnlData(trades), [trades]);
    const pnlCandlestickData = useMemo(() => generatePnlCandlestickData(trades, candlestickAggregation), [trades, candlestickAggregation]);
    const dailyProfitLossData = useMemo(() => generateDailyProfitLossData(trades), [trades]);
    
    if (isLoading) {
        return (
            <MainLayout>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[120px]" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <Skeleton className="h-[400px]" />
                    <Skeleton className="h-[400px]" />
                </div>
            </MainLayout>
        );
    }

    const candlestickYAxisDomain = useMemo(() => {
        if (pnlCandlestickData.length === 0) return [0, 0];
        const allValues = pnlCandlestickData.flatMap(d => d.rangeForBar);
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const padding = (max - min) * 0.1;
        return [min - padding, max + padding];
    }, [pnlCandlestickData]);
    

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <SummaryCard title="Net P&L" value={formatCurrency(dashboardMetrics.netPnl)} description={`Gross: ${formatCurrency(dashboardMetrics.totalPnl)}`} icon={TrendingUp} valueClassName={dashboardMetrics.netPnl >= 0 ? 'text-green-600' : 'text-red-600'} />
                    <SummaryCard title="Win Rate" value={`${dashboardMetrics.winLossRatio.toFixed(1)}%`} description={`${dashboardMetrics.wins} W / ${dashboardMetrics.losses} L`} icon={Percent} />
                    <SummaryCard title="Profit Factor" value={dashboardMetrics.profitFactor === Infinity ? "∞" : isNaN(dashboardMetrics.profitFactor) ? "N/A" : dashboardMetrics.profitFactor.toFixed(2)} description="Gross Profit / Gross Loss" icon={Flame} />
                    <SummaryCard title="Risk Reward" value={isFinite(dashboardMetrics.riskRewardRatio) ? `${dashboardMetrics.riskRewardRatio.toFixed(2)}:1` : 'N/A'} description="Avg Win / Avg Loss" icon={ArrowRightLeft} />
                    <SummaryCard title="Automated Trades" value={trades.filter(t => t.source === 'automated').length} description="Trades from automation engine" icon={Bot} />
                    <SummaryCard title="Manual Trades" value={trades.filter(t => t.source === 'manual').length} description="Trades entered manually" icon={User} />
                </div>

                <div className={cn("grid grid-cols-1 gap-6", isCalendarExpanded ? "hidden" : "lg:grid-cols-3")}>
                    <Card className="shadow-lg lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Cumulative Profit & Loss</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                {cumulativePnlData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={cumulativePnlData}>
                                            <defs>
                                                <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                            <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} hide />
                                            <YAxis tickFormatter={(value) => formatCurrency(value, {maximumFractionDigits: 0})} />
                                            <Tooltip content={<PnlTooltip />} />
                                            <Area type="monotone" dataKey="cumulativePnl" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorPnl)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (<div className="h-full flex items-center justify-center text-muted-foreground">No trades to display.</div>)}
                            </div>
                        </CardContent>
                    </Card>
                    <DashboardActivityFeed />
                </div>

                <div className={cn("grid grid-cols-1 gap-6", isCalendarExpanded ? "grid-cols-1" : "lg:grid-cols-3")}>
                    <DashboardCalendarView isExpanded={isCalendarExpanded} onToggleExpand={() => setIsCalendarExpanded(!isCalendarExpanded)} className={isCalendarExpanded ? "" : "lg:col-span-2"}/>
                    
                    <Card className={cn("shadow-lg", isCalendarExpanded ? "hidden" : "")}>
                        <CardHeader>
                            <CardTitle>Daily Profit / Loss</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <div className="h-[300px]">
                                {dailyProfitLossData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyProfitLossData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                        <XAxis dataKey="date" tickFormatter={(date) => new Date(date + 'T00:00:00').toLocaleDateString()} hide/>
                                        <YAxis tickFormatter={(value) => formatCurrency(value, {maximumFractionDigits: 0})}/>
                                        <Tooltip content={<DailyPnlTooltip />} />
                                        <Legend />
                                        <Bar dataKey="dailyProfit" fill="hsl(var(--chart-1))" name="Profit" stackId="a" />
                                        <Bar dataKey="dailyLoss" fill="hsl(var(--destructive))" name="Loss" stackId="a" />
                                    </BarChart>
                                </ResponsiveContainer>
                                ) : (<div className="h-full flex items-center justify-center text-muted-foreground">No trades to display.</div>)}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                 <Card className="shadow-lg">
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                            <CardTitle>P&L Candlestick Chart</CardTitle>
                            <CardDescription>Visualize your cumulative P&L journey as candlesticks over time.</CardDescription>
                        </div>
                         <Select value={candlestickAggregation} onValueChange={(value: CandlestickAggregationLevel) => setCandlestickAggregation(value)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Aggregate by..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="trade">By Trade</SelectItem>
                                <SelectItem value="day">By Day</SelectItem>
                                <SelectItem value="week">By Week</SelectItem>
                                <SelectItem value="month">By Month</SelectItem>
                                <SelectItem value="year">By Year</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px]">
                            {pnlCandlestickData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={pnlCandlestickData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" tickFormatter={(label) => label === "Total" ? "Total" : format(new Date(label), 'MMM d')} />
                                        <YAxis domain={candlestickYAxisDomain} tickFormatter={(value) => formatCurrency(value as number, {maximumFractionDigits: 0})} />
                                        <Tooltip content={<CustomCandlestickTooltip aggregationLevel={candlestickAggregation}/>} />
                                        <Bar dataKey="rangeForBar" shape={<CandlestickShape />} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (<div className="h-full flex items-center justify-center text-muted-foreground">No trades to display.</div>)}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
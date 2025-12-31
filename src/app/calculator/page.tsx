

"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Legend, XAxis, YAxis, Tooltip } from 'recharts';
import { subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, format, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useAppContext } from '@/contexts/AppContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import SummaryCard from '@/components/dashboard/SummaryCard';
import { AlertCircle, ArrowRight, BarChart3, Calculator, CalendarIcon, CheckCircle, Percent, Sigma, Target, DollarSign, Zap, Divide, Play, RefreshCw, HelpCircle, XCircle, Loader2 } from 'lucide-react';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { calculateDashboardMetrics } from '@/lib/tradeCalculations';
import AdvancedDateRangePicker from '@/components/shared/AdvancedDateRangePicker';

const GaugeChart: React.FC<{ value: number, target: number, label: string }> = ({ value, target, label }) => {
    const displayValue = Math.min(value, target); // Cap value at target for visualization
    const data = [
      { name: 'achieved', value: displayValue },
      { name: 'remaining', value: Math.max(0, target - displayValue) },
    ];
    const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--muted))'];
    const percentage = target > 0 ? (value / target) * 100 : 0;
  
    return (
      <div className="w-full h-full relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">
                {percentage.toFixed(0)}%
            </span>
            <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      </div>
    );
};

const TradeSlot: React.FC<{ status: 'win' | 'loss' | 'pending' }> = ({ status }) => {
    const baseClasses = "h-14 w-14 rounded-lg flex items-center justify-center border-2 transition-all duration-300 ease-in-out";
    const statusMap = {
        pending: {
            classes: "bg-muted/50 border-dashed border-border",
            icon: <HelpCircle className="h-7 w-7 text-muted-foreground" />
        },
        win: {
            classes: "bg-green-100 dark:bg-green-900/40 border-green-500 scale-105 shadow-lg",
            icon: <CheckCircle className="h-9 w-9 text-green-500" />
        },
        loss: {
            classes: "bg-red-100 dark:bg-red-900/40 border-red-500 scale-105 shadow-lg",
            icon: <XCircle className="h-9 w-9 text-red-500" />
        }
    };
    const current = statusMap[status];

    return (
        <div className={cn(baseClasses, current.classes)}>
            {current.icon}
        </div>
    );
};


export default function CalculatorPage() {
  const { trades: allTrades, edges: allEdges, isLoading } = useAppContext();
  const [prevPerformanceDateRange, setPrevPerformanceDateRange] = useState<DateRange | undefined>(undefined);

  const trades = useMemo(() => [...(allTrades.real || []), ...(allTrades.theoretical || [])], [allTrades]);
  const edges = useMemo(() => [...(allEdges.real || []), ...(allEdges.theoretical || [])], [allEdges]);

  const prevMonthStats = useMemo(() => {
    if (isLoading || !trades.length) {
      return {
        tradeCount: 0,
        winCount: 0,
        lossCount: 0,
        winLossRatio: 0,
        totalPnl: 0,
        riskRewardRatio: 0,
        profitFactor: NaN,
      };
    }
    
    let relevantTrades;

    if (prevPerformanceDateRange?.from) {
        const { from, to } = prevPerformanceDateRange;
        const startDate = startOfDay(from);
        const endDate = to ? endOfDay(to) : endOfDay(from);

        relevantTrades = trades.filter(trade => 
            trade.exitTime && isWithinInterval(parseISO(trade.exitTime), { start: startDate, end: endDate })
        );
    } else {
        // Fallback to previous month logic
        const now = new Date();
        const prevMonthStart = startOfMonth(subMonths(now, 1));
        const prevMonthEnd = endOfMonth(subMonths(now, 1));
        
        relevantTrades = trades.filter(trade => 
          trade.exitTime && isWithinInterval(parseISO(trade.exitTime), { start: prevMonthStart, end: prevMonthEnd })
        );
    }
    
    // Call the existing metrics calculation function
    return calculateDashboardMetrics(relevantTrades, edges);

  }, [trades, edges, isLoading, prevPerformanceDateRange]);

  const { targetTrades, targetWinRate } = useMemo(() => {
    if (!isLoading && prevMonthStats) {
      if (prevMonthStats.tradeCount > 0) {
        return {
          targetTrades: prevMonthStats.tradeCount,
          targetWinRate: Math.round(prevMonthStats.winLossRatio),
        };
      }
    }
    // Fallback if there's no data for the previous month or still loading
    return {
      targetTrades: 20,
      targetWinRate: 60,
    };
  }, [isLoading, prevMonthStats]);


  const currentMonthStats = useMemo(() => {
    if (isLoading || !trades.length) {
      return {
        tradeCount: 0,
        winCount: 0,
        lossCount: 0,
        winLossRatio: 0,
        totalPnl: 0,
        riskRewardRatio: 0,
        profitFactor: NaN,
      };
    }
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    
    const currentMonthTrades = trades.filter(trade => 
      trade.exitTime && isWithinInterval(parseISO(trade.exitTime), { start: currentMonthStart, end: now })
    );
    
    return calculateDashboardMetrics(currentMonthTrades, edges);
  }, [trades, edges, isLoading]);


  const projections = useMemo(() => {
    const { winCount: currentWins, lossCount: currentLosses, tradeCount: tradesSoFar, winLossRatio: currentWinRate } = currentMonthStats;
    const remainingTrades = Math.max(0, targetTrades - tradesSoFar);
    const targetTotalWins = Math.ceil(targetTrades * (targetWinRate / 100));
    const winsNeeded = Math.max(0, targetTotalWins - currentWins);
    const requiredWinRate = remainingTrades > 0 && winsNeeded > 0 ? (winsNeeded / remainingTrades) * 100 : 0;
    const lossesAllowed = targetTrades - targetTotalWins;
    const remainingLossesAllowed = Math.max(0, lossesAllowed - currentLosses);
    
    return {
      tradesSoFar,
      remainingTrades,
      targetTotalWins,
      winsNeeded,
      currentWinRate,
      requiredWinRate,
      remainingLossesAllowed
    };
  }, [targetTrades, targetWinRate, currentMonthStats]);

  const pathChartData = useMemo(() => [{
      name: "Trades",
      currentWins: currentMonthStats.winCount,
      winsNeeded: projections.winsNeeded,
      currentLosses: currentMonthStats.lossCount,
      lossesAllowed: projections.remainingLossesAllowed,
  }], [currentMonthStats, projections]);

  const pathChartConfig = {
      currentWins: { label: "Current Wins", color: "hsl(var(--chart-1))" },
      winsNeeded: { label: "Wins Needed", color: "hsl(var(--chart-2))" },
      currentLosses: { label: "Current Losses", color: "hsl(var(--destructive))" },
      lossesAllowed: { label: "Losses Allowed", color: "hsl(var(--chart-3))" },
  } satisfies ChartConfig;
  
  const [simulation, setSimulation] = useState<Array<'win' | 'loss' | 'pending'>>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (projections.remainingTrades >= 0) {
        setSimulation(Array(projections.remainingTrades).fill('pending'));
    }
  }, [projections.remainingTrades]);

  const runSimulation = async () => {
    setIsSimulating(true);

    // First, reset to pending with a slight delay to show the reset
    setSimulation(Array(projections.remainingTrades).fill('pending'));
    await new Promise(resolve => setTimeout(resolve, 200));

    const newSimulationResult: Array<'win' | 'loss' | 'pending'> = Array(projections.remainingTrades).fill('pending');
    const winProbability = projections.requiredWinRate > 100 ? 1 : (projections.requiredWinRate / 100);

    for (let i = 0; i < projections.remainingTrades; i++) {
        newSimulationResult[i] = Math.random() < winProbability ? 'win' : 'loss';
        setSimulation([...newSimulationResult]);
        await new Promise(resolve => setTimeout(resolve, 75)); // Delay for animation
    }

    setIsSimulating(false);
  };

  const resetSimulation = () => {
    if(isSimulating) return;
    setSimulation(Array(projections.remainingTrades).fill('pending'));
  };

  const winsInSimulation = simulation.filter(s => s === 'win').length;
  const lossesInSimulation = simulation.filter(s => s === 'loss').length;


  if (isLoading) {
    return (
      <MainLayout>
        <Skeleton className="h-8 w-1/3 mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[120px]" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <h2 className="text-3xl font-headline font-bold">Trading Success Odds Calculator</h2>
        
        <Card className="shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-headline text-xl">Historical Performance</CardTitle>
              <CardDescription>Select a date range to set the baseline for projections. Defaults to last month.</CardDescription>
            </div>
            <AdvancedDateRangePicker value={prevPerformanceDateRange} onValueChange={setPrevPerformanceDateRange} />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
              <SummaryCard title="Total Trades" value={prevMonthStats.tradeCount} icon={Sigma} size="compact" />
              <SummaryCard title="Wins" value={prevMonthStats.winCount} icon={CheckCircle} size="compact" valueClassName="text-green-600" />
              <SummaryCard title="Losses" value={prevMonthStats.lossCount} icon={AlertCircle} size="compact" valueClassName="text-red-600" />
              <SummaryCard title="Win Rate" value={`${prevMonthStats.winLossRatio.toFixed(1)}%`} icon={Percent} size="compact" />
              <SummaryCard
                title="Total P&L"
                value={formatCurrency(prevMonthStats.totalPnl)}
                icon={DollarSign}
                valueClassName={prevMonthStats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}
                size="compact"
              />
              <SummaryCard
                title="Risk Reward Ratio"
                value={isFinite(prevMonthStats.riskRewardRatio) ? `${prevMonthStats.riskRewardRatio.toFixed(2)} : 1` : 'N/A'}
                icon={Zap}
                description={!isFinite(prevMonthStats.riskRewardRatio) ? "Not enough data" : "Avg Win / Avg Loss"}
                size="compact"
              />
              <SummaryCard
                title="Profit Factor"
                value={
                  prevMonthStats.profitFactor === Infinity ? "∞" :
                  isNaN(prevMonthStats.profitFactor) ? "N/A" :
                  prevMonthStats.profitFactor.toFixed(2)
                }
                icon={Divide}
                description={
                  prevMonthStats.profitFactor === Infinity ? "No losses" :
                  isNaN(prevMonthStats.profitFactor) ? "No profit/loss" :
                  "Gross Profit / Loss"
                }
                valueClassName={
                  prevMonthStats.profitFactor === Infinity ? 'text-green-600' :
                  isNaN(prevMonthStats.profitFactor) ? '' :
                  prevMonthStats.profitFactor > 1.5 ? 'text-green-600' :
                  prevMonthStats.profitFactor < 1.0 ? 'text-red-600' :
                  ''
                }
                size="compact"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg h-full md:col-span-2">
            <CardHeader>
              <CardTitle className="font-headline">Current Month Progress</CardTitle>
              <CardDescription>Performance based on closed trades this month.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
                <SummaryCard title="Total Trades" value={currentMonthStats.tradeCount} icon={Sigma} size="compact" />
                <SummaryCard title="Wins" value={currentMonthStats.winCount} icon={CheckCircle} size="compact" valueClassName="text-green-600" />
                <SummaryCard title="Losses" value={currentMonthStats.lossCount} icon={AlertCircle} size="compact" valueClassName="text-red-600" />
                <SummaryCard title="Win Rate" value={`${currentMonthStats.winLossRatio.toFixed(1)}%`} icon={Percent} size="compact" />
                 <SummaryCard
                    title="Total P&L"
                    value={formatCurrency(currentMonthStats.totalPnl)}
                    icon={DollarSign}
                    valueClassName={currentMonthStats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}
                    size="compact"
                  />
                  <SummaryCard
                    title="Risk Reward Ratio"
                    value={isFinite(currentMonthStats.riskRewardRatio) ? `${currentMonthStats.riskRewardRatio.toFixed(2)} : 1` : 'N/A'}
                    icon={Zap}
                    description={!isFinite(currentMonthStats.riskRewardRatio) ? "Not enough data" : "Avg Win / Avg Loss"}
                    size="compact"
                  />
                  <SummaryCard
                    title="Profit Factor"
                    value={
                      currentMonthStats.profitFactor === Infinity ? "∞" :
                      isNaN(currentMonthStats.profitFactor) ? "N/A" :
                      currentMonthStats.profitFactor.toFixed(2)
                    }
                    icon={Divide}
                    description={
                      currentMonthStats.profitFactor === Infinity ? "No losses" :
                      isNaN(currentMonthStats.profitFactor) ? "No profit/loss" :
                      "Gross Profit / Loss"
                    }
                    valueClassName={
                      currentMonthStats.profitFactor === Infinity ? 'text-green-600' :
                      isNaN(currentMonthStats.profitFactor) ? '' :
                      currentMonthStats.profitFactor > 1.5 ? 'text-green-600' :
                      currentMonthStats.profitFactor < 1.0 ? 'text-red-600' :
                      ''
                    }
                    size="compact"
                  />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Live Projections</CardTitle>
                <CardDescription>What you need to do to reach your goals from this point forward.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard title="Remaining Trades" value={projections.remainingTrades} icon={Calculator} size="compact" />
                    <SummaryCard title="Wins Needed" value={projections.winsNeeded} icon={CheckCircle} size="compact" valueClassName="text-green-600" />
                    <SummaryCard title="Losses You Can Afford" value={projections.remainingLossesAllowed} icon={AlertCircle} size="compact" valueClassName="text-orange-500" />
                    <SummaryCard title="Required Win Rate" value={`${projections.requiredWinRate.toFixed(1)}%`} icon={Target} size="compact" valueClassName={projections.requiredWinRate > 100 ? "text-red-600" : "text-blue-600"} description={projections.requiredWinRate > 100 ? "Goal is impossible" : "On remaining trades"}/>
                </div>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline">Progress to Win Rate Target</CardTitle>
                    <CardDescription>Your current win rate vs. your target.</CardDescription>
                </CardHeader>
                <CardContent>
                    <GaugeChart value={projections.currentWinRate} target={targetWinRate} label="Target Win Rate" />
                </CardContent>
            </Card>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline">Path to Goal</CardTitle>
                     <CardDescription>Breakdown of trades required to meet your targets.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={pathChartConfig} className="h-[200px] w-full">
                        <BarChart data={pathChartData} layout="vertical" stackOffset="expand">
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" hide />
                            <Tooltip
                                cursor={{fill: 'hsl(var(--muted))'}}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Legend verticalAlign="top" />
                            <Bar dataKey="currentWins" stackId="a" fill="var(--color-currentWins)" radius={[4, 0, 0, 4]} isAnimationActive animationDuration={800} />
                            <Bar dataKey="currentLosses" stackId="a" fill="var(--color-currentLosses)" isAnimationActive animationDuration={800} />
                            <Bar dataKey="winsNeeded" stackId="a" fill="var(--color-winsNeeded)" isAnimationActive animationDuration={800} />
                            <Bar dataKey="lossesAllowed" stackId="a" fill="var(--color-lossesAllowed)" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={800} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>

        <Card className="shadow-lg">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="font-headline text-xl">Trade Path Simulation</CardTitle>
                    <CardDescription>
                        Simulate one possible outcome for your remaining trades based on the required win rate.
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button onClick={runSimulation} disabled={isSimulating || projections.remainingTrades === 0}>
                        {isSimulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Run Simulation
                    </Button>
                    <Button onClick={resetSimulation} variant="outline" disabled={isSimulating}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
            {projections.remainingTrades > 0 ? (
                <>
                    <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg justify-center">
                        {simulation.map((status, index) => (
                            <TradeSlot key={index} status={status} />
                        ))}
                    </div>
                    {!isSimulating && simulation.some(s => s !== 'pending') && (
                        <div className="mt-4 text-center font-medium text-lg">
                            Simulated Outcome: <span className="text-green-600 font-bold">{winsInSimulation} Wins</span> & <span className="text-red-600 font-bold">{lossesInSimulation} Losses</span>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No remaining trades to simulate based on your targets.</p>
                </div>
            )}
            </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}

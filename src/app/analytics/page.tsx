

"use client";

import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useAppContext } from '@/contexts/AppContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { calculatePerformanceByDimension, calculateRMultipleDistribution, calculatePerformanceByDayOfWeek, PerformanceMetric, RMultipleDistributionData, DayOfWeekPerformance } from '@/lib/analyticsCalculations';
import type { Trade, Edge, Formula, IndexType, PositionType, ExpiryType, RulesFollowedStatus } from '@/types';
import { TrendingUp, TrendingDown, Scale, Percent, BrainCircuit, RotateCcw } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { cn, formatCurrency } from '@/lib/utils';
import AdvancedDateRangePicker from '@/components/shared/AdvancedDateRangePicker';
import { startOfDay, endOfDay, isBefore, isAfter, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import MultiSelectFilterDropdown from '@/components/shared/MultiSelectFilterDropdown';
import { Button } from '@/components/ui/button';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const indexTypeOptions: { id: IndexType; name: IndexType }[] = [
  { id: 'NIFTY', name: 'NIFTY' },
  { id: 'SENSEX', name: 'SENSEX' },
];
const positionTypeOptions: { id: PositionType; name: PositionType }[] = [
  { id: 'Long', name: 'Long' },
  { id: 'Short', name: 'Short' },
];
const expiryTypeOptions: { id: ExpiryType; name: ExpiryType }[] = [
  { id: 'Expiry', name: 'Expiry' },
  { id: 'Non-Expiry', name: 'Non-Expiry' },
];
const rulesFollowedFilterOptions: { id: RulesFollowedStatus; name: RulesFollowedStatus }[] = [
  { id: 'RULES FOLLOW', name: 'RULES FOLLOW' },
  { id: 'NOT FOLLOW', name: 'NOT FOLLOW' },
  { id: 'PARTIALLY FOLLOW', name: 'PARTIALLY FOLLOW' },
  { id: 'ENTRY MISS', name: 'ENTRY MISS' },
];

// Custom Tooltip for Bar Charts
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as PerformanceMetric;
    return (
      <div className="p-2 bg-background/90 border border-border rounded-lg shadow-lg text-xs backdrop-blur-sm">
        <p className="font-bold text-foreground mb-2">{label}</p>
        <p className="text-muted-foreground"><span className="font-medium text-foreground">Total P&L:</span> <span className={data.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}>{formatCurrency(data.totalPnl)}</span></p>
        <p className="text-muted-foreground"><span className="font-medium text-foreground">Win Rate:</span> {data.winRate.toFixed(1)}%</p>
        <p className="text-muted-foreground"><span className="font-medium text-foreground">Avg P&L/Trade:</span> {formatCurrency(data.avgPnl)}</p>
        <p className="text-muted-foreground"><span className="font-medium text-foreground">Trades:</span> {data.tradeCount}</p>
        <p className="text-muted-foreground"><span className="font-medium text-foreground">Profit Factor:</span> {isFinite(data.profitFactor) ? data.profitFactor.toFixed(2) : '∞'}</p>
      </div>
    );
  }
  return null;
};

// Component for performance charts
const PerformanceChart: React.FC<{ data: PerformanceMetric[], title: string, description: string }> = ({ data, title, description }) => {
    const chartConfig = {
        totalPnl: { label: "Total P&L" },
    } satisfies ChartConfig;

    const totalTrades = useMemo(() => data.reduce((acc, item) => acc + item.tradeCount, 0), [data]);

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="font-headline text-xl">{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    {totalTrades > 0 && (
                        <Badge variant="secondary" className="text-sm shrink-0">
                            {totalTrades} Entries
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => formatCurrency(Number(value), { maximumFractionDigits: 0 })} />
                            <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} tick={{ fill: 'hsl(var(--foreground))' }} />
                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<CustomBarTooltip />} />
                            <Bar dataKey="totalPnl" name="Total P&L" radius={[0, 4, 4, 0]} isAnimationActive>
                                {data.map((entry) => (
                                    <Cell key={`cell-${entry.name}`} fill={entry.totalPnl >= 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data for this period.</div>
                )}
            </CardContent>
        </Card>
    );
};


export default function AnalyticsPage() {
    const { allTrades, edges: allEdges, formulas: allFormulas, isLoading, tradingMode } = useAppContext();
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const trades = useMemo(() => {
        if (tradingMode === 'both') {
          const combined = [...allTrades.real, ...allTrades.theoretical];
          return Array.from(new Map(combined.map(t => [t.id, t])).values());
        }
        return allTrades[tradingMode];
    }, [allTrades, tradingMode]);

    const edges = useMemo(() => allEdges[tradingMode], [allEdges, tradingMode]);
    const formulas = useMemo(() => allFormulas[tradingMode], [allFormulas, tradingMode]);

    const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
    const [selectedRulesFollowedStatusIds, setSelectedRulesFollowedStatusIds] = useState<RulesFollowedStatus[]>([]);
    const [selectedEntryFormulaIds, setSelectedEntryFormulaIds] = useState<string[]>([]);
    const [selectedStopLossFormulaIds, setSelectedStopLossFormulaIds] = useState<string[]>([]);
    const [selectedTargetFormulaIds, setSelectedTargetFormulaIds] = useState<string[]>([]);
    const [selectedIndexTypeIds, setSelectedIndexTypeIds] = useState<IndexType[]>([]);
    const [selectedPositionTypeIds, setSelectedPositionTypeIds] = useState<PositionType[]>([]);
    const [selectedExpiryTypeIds, setSelectedExpiryTypeIds] = useState<ExpiryType[]>([]);

    const optionEdges = useMemo(() => edges, [edges]);
    const entryFormulas = useMemo(() => formulas.filter(f => f.type === 'normal-entry' || f.type === 'breakout-entry'), [formulas]);
    const stopLossFormulas = useMemo(() => formulas.filter(f => f.type === 'stop-loss'), [formulas]);
    const targetFormulas = useMemo(() => formulas.filter(f => f.type === 'target-index' || f.type === 'target-option'), [formulas]);

    const cascadingFilters = useMemo(() => {
        if (isLoading) {
            return {
                optionEdgesWithCount: [],
                rulesFollowedFilterOptionsWithCount: [],
                entryFormulasWithCount: [],
                stopLossFormulasWithCount: [],
                targetFormulasWithCount: [],
                indexTypeOptionsWithCount: [],
                positionTypeOptionsWithCount: [],
                expiryTypeOptionsWithCount: [],
                preDateFilteredTrades: []
            };
        }

        const applyFilters = (tradesToFilter: Trade[], exclude: string[] = []) => {
            let tempTrades = [...tradesToFilter];
            if (selectedStrategyIds.length > 0 && !exclude.includes('strategyId'))
                tempTrades = tempTrades.filter(t => t.strategyId && selectedStrategyIds.includes(t.strategyId));
            if (selectedRulesFollowedStatusIds.length > 0 && !exclude.includes('rulesFollowed'))
                tempTrades = tempTrades.filter(t => t.rulesFollowed && selectedRulesFollowedStatusIds.includes(t.rulesFollowed));
            if (selectedEntryFormulaIds.length > 0 && !exclude.includes('entryFormulaId'))
                tempTrades = tempTrades.filter(t => t.entryFormulaId && selectedEntryFormulaIds.includes(t.entryFormulaId));
            if (selectedStopLossFormulaIds.length > 0 && !exclude.includes('stopLossFormulaIds'))
                tempTrades = tempTrades.filter(t => t.stopLossFormulaIds?.some(id => selectedStopLossFormulaIds.includes(id)));
            if (selectedTargetFormulaIds.length > 0 && !exclude.includes('targetFormulaIds'))
                tempTrades = tempTrades.filter(t => t.targetFormulaIds?.some(id => selectedTargetFormulaIds.includes(id)));
            if (selectedIndexTypeIds.length > 0 && !exclude.includes('index'))
                tempTrades = tempTrades.filter(t => t.index && selectedIndexTypeIds.includes(t.index));
            if (selectedPositionTypeIds.length > 0 && !exclude.includes('positionType'))
                tempTrades = tempTrades.filter(t => selectedPositionTypeIds.includes(t.positionType));
            if (selectedExpiryTypeIds.length > 0 && !exclude.includes('expiryType'))
                tempTrades = tempTrades.filter(t => selectedExpiryTypeIds.includes(t.expiryType));
            return tempTrades;
        };

        const createOptions = (key: keyof Trade, allOptions: { id: string, name: string }[], exclude: string[]) => {
            const filtered = applyFilters(trades, exclude);
            const availableIds = new Set(filtered.map(t => t[key]).filter(Boolean));
            return allOptions.filter(opt => availableIds.has(opt.id)).map(opt => ({
                id: opt.id,
                name: `${opt.name} (${filtered.filter(t => t[key] === opt.id).length})`
            }));
        };

        return {
            optionEdgesWithCount: createOptions('strategyId', optionEdges, ['strategyId']),
            rulesFollowedFilterOptionsWithCount: createOptions('rulesFollowed', rulesFollowedFilterOptions, ['rulesFollowed']),
            entryFormulasWithCount: createOptions('entryFormulaId', entryFormulas, ['entryFormulaId']),
            stopLossFormulasWithCount: createOptions('stopLossFormulaIds' as any, stopLossFormulas, ['stopLossFormulaIds']),
            targetFormulasWithCount: createOptions('targetFormulaIds' as any, targetFormulas, ['targetFormulaIds']),
            indexTypeOptionsWithCount: createOptions('index', indexTypeOptions, ['index']),
            positionTypeOptionsWithCount: createOptions('positionType', positionTypeOptions, ['positionType']),
            expiryTypeOptionsWithCount: createOptions('expiryType', expiryTypeOptions, ['expiryType']),
            preDateFilteredTrades: applyFilters(trades)
        };
    }, [
        trades, isLoading, edges, formulas, entryFormulas, stopLossFormulas, targetFormulas, optionEdges,
        selectedStrategyIds, selectedRulesFollowedStatusIds, selectedEntryFormulaIds, selectedStopLossFormulaIds,
        selectedTargetFormulaIds, selectedIndexTypeIds, selectedPositionTypeIds, selectedExpiryTypeIds
    ]);

    const filteredTrades = useMemo(() => {
        let tempFilteredTrades = cascadingFilters.preDateFilteredTrades.filter(trade => trade.outcome !== 'Open' && !!trade.exitTime);

        if (dateRange?.from || dateRange?.to) {
            tempFilteredTrades = tempFilteredTrades.filter(trade => {
                const tradeDate = parseISO(trade.exitTime!);
                const fromOk = dateRange.from ? !isBefore(tradeDate, startOfDay(dateRange.from)) : true;
                const toOk = dateRange.to ? !isAfter(tradeDate, endOfDay(dateRange.to)) : true;
                return fromOk && toOk;
            });
        }

        return tempFilteredTrades;
    }, [cascadingFilters.preDateFilteredTrades, dateRange]);

    const edgeMap = useMemo(() => new Map(optionEdges.map(s => [s.id, s.name])), [optionEdges]);
    const entryFormulaMap = useMemo(() => new Map(entryFormulas.map(f => [f.id, f.name])), [entryFormulas]);
    const stopLossFormulaMap = useMemo(() => new Map(stopLossFormulas.map(f => [f.id, f.name])), [stopLossFormulas]);
    const targetFormulaMap = useMemo(() => new Map(targetFormulas.map(f => [f.id, f.name])), [targetFormulas]);

    const edgePerformance = useMemo(() => calculatePerformanceByDimension(filteredTrades, 'strategyId', edgeMap), [filteredTrades, edgeMap]);
    const entryFormulaPerformance = useMemo(() => calculatePerformanceByDimension(filteredTrades, 'entryFormulaId', entryFormulaMap), [filteredTrades, entryFormulaMap]);
    const stopLossFormulaPerformance = useMemo(() => calculatePerformanceByDimension(filteredTrades, 'stopLossFormulaIds', stopLossFormulaMap), [filteredTrades, stopLossFormulaMap]);
    const targetFormulaPerformance = useMemo(() => calculatePerformanceByDimension(filteredTrades, 'targetFormulaIds', targetFormulaMap), [filteredTrades, targetFormulaMap]);
    
    const rMultipleData = useMemo(() => calculateRMultipleDistribution(filteredTrades), [filteredTrades]);
    const dayOfWeekPerformance = useMemo(() => calculatePerformanceByDayOfWeek(filteredTrades), [filteredTrades]);

    const handleResetAllFilters = () => {
        setDateRange(undefined);
        setSelectedStrategyIds([]);
        setSelectedRulesFollowedStatusIds([]);
        setSelectedEntryFormulaIds([]);
        setSelectedStopLossFormulaIds([]);
        setSelectedTargetFormulaIds([]);
        setSelectedIndexTypeIds([]);
        setSelectedPositionTypeIds([]);
        setSelectedExpiryTypeIds([]);
    };

    const ResetButton = () => (
        <TooltipProvider>
            <UITooltip>
                <TooltipTrigger asChild>
                    <Button
                        onClick={handleResetAllFilters}
                        className="h-9 px-3 bg-accent text-accent-foreground border border-input hover:bg-accent/90">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Reset All Filters & Sorting</p>
                </TooltipContent>
            </UITooltip>
        </TooltipProvider>
    );

    const filterBarContent = (
        <div className="flex items-center justify-end gap-2">
            <MultiSelectFilterDropdown filterNameSingular="Edge" filterNamePlural="Edges" options={cascadingFilters.optionEdgesWithCount} selectedIds={selectedStrategyIds} onSelectionChange={setSelectedStrategyIds} />
            <MultiSelectFilterDropdown filterNameSingular="Rule Status" filterNamePlural="Rule Statuses" options={cascadingFilters.rulesFollowedFilterOptionsWithCount} selectedIds={selectedRulesFollowedStatusIds} onSelectionChange={setSelectedRulesFollowedStatusIds as (ids: string[]) => void} />
            <MultiSelectFilterDropdown filterNameSingular="Entry Formula" filterNamePlural="Entry Formulas" options={cascadingFilters.entryFormulasWithCount} selectedIds={selectedEntryFormulaIds} onSelectionChange={setSelectedEntryFormulaIds} />
            <MultiSelectFilterDropdown filterNameSingular="SL Formula" filterNamePlural="SL Formulas" options={cascadingFilters.stopLossFormulasWithCount} selectedIds={selectedStopLossFormulaIds} onSelectionChange={setSelectedStopLossFormulaIds} />
            <MultiSelectFilterDropdown filterNameSingular="Target Formula" filterNamePlural="Target Formulas" options={cascadingFilters.targetFormulasWithCount} selectedIds={selectedTargetFormulaIds} onSelectionChange={setSelectedTargetFormulaIds} />
            <MultiSelectFilterDropdown filterNameSingular="Index Type" filterNamePlural="Index Types" options={cascadingFilters.indexTypeOptionsWithCount} selectedIds={selectedIndexTypeIds} onSelectionChange={setSelectedIndexTypeIds as (ids: string[]) => void} />
            <MultiSelectFilterDropdown filterNameSingular="Position Type" filterNamePlural="Position Types" options={cascadingFilters.positionTypeOptionsWithCount} selectedIds={selectedPositionTypeIds} onSelectionChange={setSelectedPositionTypeIds as (ids: string[]) => void} />
            <MultiSelectFilterDropdown filterNameSingular="Expiry Type" filterNamePlural="Expiry Types" options={cascadingFilters.expiryTypeOptionsWithCount} selectedIds={selectedExpiryTypeIds} onSelectionChange={setSelectedExpiryTypeIds as (ids: string[]) => void} />
            <AdvancedDateRangePicker value={dateRange} onValueChange={setDateRange} />
        </div>
    );
    
    const loadingFilterBarContent = (
        <div className="flex items-center justify-end gap-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-9 w-[110px]" />)}
            <Skeleton className="h-9 w-full sm:w-[300px]" />
        </div>
    );

    if (isLoading) {
        return (
            <MainLayout headerCenterContent={<Skeleton className="h-9 w-24" />} headerRightContent={loadingFilterBarContent}>
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-1/4" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Skeleton className="h-[400px]" />
                        <Skeleton className="h-[400px]" />
                        <Skeleton className="h-[400px]" />
                        <Skeleton className="h-[400px]" />
                    </div>
                </div>
            </MainLayout>
        );
    }
    
    const rMultipleChartConfig = {
        count: { label: "Trades" },
    } satisfies ChartConfig;

    const dayOfWeekChartConfig = {
        pnl: { label: "P&L", color: 'hsl(var(--chart-2))' },
    } satisfies ChartConfig;

    return (
        <MainLayout headerCenterContent={<ResetButton />} headerRightContent={filterBarContent}>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-headline font-bold flex items-center gap-3">
                            <BrainCircuit className="h-8 w-8 text-primary" />
                            Performance Edge
                        </h2>
                        <p className="text-muted-foreground mt-1">Deep dive into what drives your trading results.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <PerformanceChart 
                        data={edgePerformance}
                        title="Edge Performance"
                        description="Which of your edges are most profitable?"
                    />
                    <PerformanceChart 
                        data={entryFormulaPerformance}
                        title="Entry Formula Edge"
                        description="How well do your entry signals perform?"
                    />
                     <PerformanceChart 
                        data={stopLossFormulaPerformance}
                        title="Stop Loss Formula Performance"
                        description="Effectiveness of your stop loss strategies."
                    />
                     <PerformanceChart 
                        data={targetFormulaPerformance}
                        title="Target Formula Performance"
                        description="How often do your target strategies succeed?"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="shadow-lg lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="font-headline text-xl">R-Multiple Distribution</CardTitle>
                            <CardDescription>How your trades perform relative to your initial risk (Requires SL to be set).</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {rMultipleData.some(d => d.count > 0) ? (
                                <ChartContainer config={rMultipleChartConfig} className="h-[350px] w-full">
                                    <BarChart data={rMultipleData}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                        <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} isAnimationActive />
                                    </BarChart>
                                </ChartContainer>
                            ) : (
                                <div className="h-[350px] flex items-center justify-center text-muted-foreground">No trades with SL found to calculate R-Multiples.</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="font-headline text-xl">Day Of Week Edge</CardTitle>
                            <CardDescription>Your performance across the trading week.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           {dayOfWeekPerformance.some(d => d.trades > 0) ? (
                                <ChartContainer config={dayOfWeekChartConfig} className="h-[350px] w-full">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={dayOfWeekPerformance}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="name" />
                                        <PolarRadiusAxis angle={30} domain={['auto', 'auto']} tickFormatter={(value) => formatCurrency(Number(value), { maximumFractionDigits: 0 })} />
                                        <Radar name="P&L" dataKey="pnl" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} isAnimationActive/>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)}/>
                                    </RadarChart>
                                </ChartContainer>
                           ) : (
                                <div className="h-[350px] flex items-center justify-center text-muted-foreground">No trades to analyze by day.</div>
                           )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </MainLayout>
    );
}

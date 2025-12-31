
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import type { Trade, TradingMode, Edge, Formula, IndexType, PositionType, ExpiryType, RulesFollowedStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import { GitCompareArrows, ArrowUp, ArrowDown, Minus, RotateCcw, BrainCircuit } from 'lucide-react';
import { format, parseISO, isBefore, isAfter, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import MainLayout from '@/components/layout/MainLayout';
import type { DateRange } from 'react-day-picker';
import MultiSelectFilterDropdown from '@/components/shared/MultiSelectFilterDropdown';
import AdvancedDateRangePicker from '@/components/shared/AdvancedDateRangePicker';
import { Button } from '@/components/ui/button';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { useAppContext } from '@/contexts/AppContext';

type TradeDimension = 'strategyId' | 'entryFormulaId' | 'stopLossFormulaIds' | 'targetFormulaIds';

interface DivergenceMetric {
    name: string;
    realPnl: number;
    theoreticalPnl: number;
    divergence: number;
    realTradeCount: number;
    theoreticalTradeCount: number;
}

const calculateDivergenceByDimension = (
    realTrades: Trade[],
    theoreticalTrades: Trade[],
    dimensionKey: TradeDimension,
    dimensionMap: Map<string, string>
): DivergenceMetric[] => {
    const combinedPerformance: Record<string, {
        realPnl: number;
        realTradeCount: number;
        theoreticalPnl: number;
        theoreticalTradeCount: number;
    }> = {};

    const allKeys = new Set<string>();
    
    const extractKeys = (trades: Trade[]) => {
        trades.forEach(trade => {
            const keysOrKey = trade[dimensionKey as keyof Trade];
            const keys = Array.isArray(keysOrKey) ? keysOrKey : [keysOrKey];
            keys.forEach(key => key && allKeys.add(key));
        });
    };

    extractKeys(realTrades);
    extractKeys(theoreticalTrades);
    
    allKeys.forEach(key => {
        if (key && dimensionMap.has(key)) {
            combinedPerformance[key] = { realPnl: 0, realTradeCount: 0, theoreticalPnl: 0, theoreticalTradeCount: 0 };
        }
    });
    
    const processTrades = (trades: Trade[], mode: 'real' | 'theoretical') => {
        const tradeCountMap: Record<string, Set<string>> = {};

        trades.forEach(trade => {
            const keysOrKey = trade[dimensionKey as keyof Trade];
            const keys = Array.isArray(keysOrKey) ? keysOrKey : [keysOrKey];

            keys.forEach(key => {
                if (key && combinedPerformance[key] && trade.pnl !== undefined) {
                    if (!tradeCountMap[key]) tradeCountMap[key] = new Set();

                    if (!tradeCountMap[key].has(trade.id)) {
                        if (mode === 'theoretical') {
                            combinedPerformance[key].theoreticalPnl += trade.pnl;
                            combinedPerformance[key].theoreticalTradeCount++;
                        } else {
                            combinedPerformance[key].realPnl += trade.pnl;
                            combinedPerformance[key].realTradeCount++;
                        }
                        tradeCountMap[key].add(trade.id);
                    }
                }
            });
        });
    };

    processTrades(theoreticalTrades, 'theoretical');
    processTrades(realTrades, 'real');

    return Object.entries(combinedPerformance)
        .map(([id, data]) => ({
            name: dimensionMap.get(id) || 'Unknown',
            ...data,
            divergence: data.realPnl - data.theoreticalPnl,
        }))
        .filter(item => item.realTradeCount > 0 || item.theoreticalTradeCount > 0)
        .sort((a, b) => a.divergence - b.divergence);
};


const DivergenceAnalysisChart = ({ data, title, description }: { data: DivergenceMetric[], title: string, description: string }) => {
    
    const chartConfig: ChartConfig = {
        theoreticalPnl: {
            label: 'Theoretical P&L',
            color: 'hsl(var(--chart-2))',
        },
        realPnl: {
            label: 'Real P&L',
            color: 'hsl(var(--chart-1))',
        },
    };

    const DivergenceTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload as DivergenceMetric;
            return (
                <div className="p-2 bg-background/90 border border-border rounded-lg shadow-lg text-xs backdrop-blur-sm">
                    <p className="font-bold text-foreground mb-2">{label}</p>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center"><span className="font-medium text-foreground flex items-center"><div className="h-2 w-2 rounded-full mr-1.5" style={{backgroundColor: 'hsl(var(--chart-2))'}}/>Theoretical:</span> <span className="font-semibold">{formatCurrency(data.theoreticalPnl)} ({data.theoreticalTradeCount} trades)</span></div>
                        <div className="flex justify-between items-center"><span className="font-medium text-foreground flex items-center"><div className="h-2 w-2 rounded-full mr-1.5" style={{backgroundColor: 'hsl(var(--chart-1))'}}/>Real:</span> <span className="font-semibold">{formatCurrency(data.realPnl)} ({data.realTradeCount} trades)</span></div>
                        <div className={cn("flex justify-between items-center font-semibold", data.divergence >= 0 ? 'text-green-500' : 'text-red-500')}><span className="flex items-center"><div className="h-2 w-2 rounded-full mr-1.5 bg-current"/>Divergence:</span> <span>{formatCurrency(data.divergence)}</span></div>
                    </div>
                </div>
            );
        }
        return null;
    };


    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[400px] w-full">
                        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => formatCurrency(Number(value), { maximumFractionDigits: 0 })} />
                            <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} tick={{ fill: 'hsl(var(--foreground))' }} />
                            <Tooltip content={<DivergenceTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                            <Legend />
                            <Bar dataKey="theoreticalPnl" name="Theoretical" fill="var(--color-theoreticalPnl)" radius={[4, 4, 0, 0]} isAnimationActive />
                            <Bar dataKey="realPnl" name="Real" fill="var(--color-realPnl)" radius={[4, 4, 0, 0]} isAnimationActive />
                        </BarChart>
                    </ChartContainer>
                ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">No comparable data for this period.</div>
                )}
            </CardContent>
        </Card>
    );
};


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
  { id: 'NOT', name: 'NOT' },
  { id: 'PARTIALLY FOLLOW', name: 'PARTIALLY FOLLOW' },
  { id: 'ENTRY MISS', name: 'ENTRY MISS' },
];


export default function DivergenceAnalyticsPage() {
    const { allTrades, edges, formulas, isLoading } = useAppContext();

    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
    const [selectedRulesFollowedStatusIds, setSelectedRulesFollowedStatusIds] = useState<RulesFollowedStatus[]>([]);
    const [selectedEntryFormulaIds, setSelectedEntryFormulaIds] = useState<string[]>([]);
    const [selectedStopLossFormulaIds, setSelectedStopLossFormulaIds] = useState<string[]>([]);
    const [selectedTargetFormulaIds, setSelectedTargetFormulaIds] = useState<string[]>([]);
    const [selectedIndexTypeIds, setSelectedIndexTypeIds] = useState<IndexType[]>([]);
    const [selectedPositionTypeIds, setSelectedPositionTypeIds] = useState<PositionType[]>([]);
    const [selectedExpiryTypeIds, setSelectedExpiryTypeIds] = useState<ExpiryType[]>([]);

    const combinedEdges = useMemo(() => Array.from(new Map([...edges.real, ...edges.theoretical].map(e => [e.id, e])).values()), [edges]);
    const combinedFormulas = useMemo(() => Array.from(new Map([...formulas.real, ...formulas.theoretical].map(f => [f.id, f])).values()), [formulas]);
    
    const edgeMap = useMemo(() => new Map(combinedEdges.map(e => [e.id, e.name])), [combinedEdges]);
    const entryFormulaMap = useMemo(() => new Map(combinedFormulas.filter(f => f.type === 'normal-entry' || f.type === 'breakout-entry').map(f => [f.id, f.name])), [combinedFormulas]);
    const stopLossFormulaMap = useMemo(() => new Map(combinedFormulas.filter(f => f.type === 'stop-loss').map(f => [f.id, f.name])), [combinedFormulas]);
    const targetFormulaMap = useMemo(() => new Map(combinedFormulas.filter(f => f.type === 'target-index' || f.type === 'target-option').map(f => [f.id, f.name])), [combinedFormulas]);

    const entryFormulas = useMemo(() => combinedFormulas.filter(f => f.type === 'normal-entry' || f.type === 'breakout-entry'), [combinedFormulas]);
    const stopLossFormulas = useMemo(() => combinedFormulas.filter(f => f.type === 'stop-loss'), [combinedFormulas]);
    const targetFormulas = useMemo(() => combinedFormulas.filter(f => f.type === 'target-index' || f.type === 'target-option'), [combinedFormulas]);
    
    const cascadingFilters = useMemo(() => {
        const combinedTrades = [...allTrades.real, ...allTrades.theoretical];
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
                preDateFilteredRealTrades: [],
                preDateFilteredTheoreticalTrades: []
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
            const filtered = applyFilters(combinedTrades, exclude);
            const availableIds = new Set(filtered.map(t => t[key]).filter(Boolean));
            return allOptions.filter(opt => availableIds.has(opt.id)).map(opt => ({
                id: opt.id,
                name: `${opt.name} (${filtered.filter(t => t[key] === opt.id).length})`
            }));
        };

        return {
            optionEdgesWithCount: createOptions('strategyId', combinedEdges, ['strategyId']),
            rulesFollowedFilterOptionsWithCount: createOptions('rulesFollowed', rulesFollowedFilterOptions, ['rulesFollowed']),
            entryFormulasWithCount: createOptions('entryFormulaId', entryFormulas, ['entryFormulaId']),
            stopLossFormulasWithCount: createOptions('stopLossFormulaIds' as any, stopLossFormulas, ['stopLossFormulaIds']),
            targetFormulasWithCount: createOptions('targetFormulaIds' as any, targetFormulas, ['targetFormulaIds']),
            indexTypeOptionsWithCount: createOptions('index', indexTypeOptions, ['index']),
            positionTypeOptionsWithCount: createOptions('positionType', positionTypeOptions, ['positionType']),
            expiryTypeOptionsWithCount: createOptions('expiryType', expiryTypeOptions, ['expiryType']),
            preDateFilteredRealTrades: applyFilters(allTrades.real),
            preDateFilteredTheoreticalTrades: applyFilters(allTrades.theoretical)
        };
    }, [
        allTrades, isLoading, combinedEdges, entryFormulas, stopLossFormulas, targetFormulas,
        selectedStrategyIds, selectedRulesFollowedStatusIds, selectedEntryFormulaIds, selectedStopLossFormulaIds,
        selectedTargetFormulaIds, selectedIndexTypeIds, selectedPositionTypeIds, selectedExpiryTypeIds
    ]);

    const filteredTrades = useMemo(() => {
        const filterFunc = (trades: Trade[]) => {
            let tempFilteredTrades = trades.filter(trade => trade.outcome !== 'Open' && !!trade.exitTime);
    
            if (dateRange?.from || dateRange?.to) {
                tempFilteredTrades = tempFilteredTrades.filter(t => {
                    const tradeDate = parseISO(t.exitTime!);
                    const fromOk = dateRange.from ? !isBefore(tradeDate, startOfDay(dateRange.from)) : true;
                    const toOk = dateRange.to ? !isAfter(tradeDate, endOfDay(dateRange.to)) : true;
                    return fromOk && toOk;
                });
            }
            return tempFilteredTrades;
        }

        return {
            real: filterFunc(cascadingFilters.preDateFilteredRealTrades),
            theoretical: filterFunc(cascadingFilters.preDateFilteredTheoreticalTrades)
        }
    }, [cascadingFilters, dateRange]);

    const edgeDivergenceData = useMemo(() => calculateDivergenceByDimension(filteredTrades.real, filteredTrades.theoretical, 'strategyId', edgeMap), [filteredTrades, edgeMap]);
    const entryFormulaDivergenceData = useMemo(() => calculateDivergenceByDimension(filteredTrades.real, filteredTrades.theoretical, 'entryFormulaId', entryFormulaMap), [filteredTrades, entryFormulaMap]);
    const stopLossFormulaDivergenceData = useMemo(() => calculateDivergenceByDimension(filteredTrades.real, filteredTrades.theoretical, 'stopLossFormulaIds', stopLossFormulaMap), [filteredTrades, stopLossFormulaMap]);
    const targetFormulaDivergenceData = useMemo(() => calculateDivergenceByDimension(filteredTrades.real, filteredTrades.theoretical, 'targetFormulaIds', targetFormulaMap), [filteredTrades, targetFormulaMap]);

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
                    <Button onClick={handleResetAllFilters} className="h-9 px-3 bg-accent text-accent-foreground border border-input hover:bg-accent/90">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Reset All Filters</p></TooltipContent>
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
                    <Skeleton className="h-10 w-3/4" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Skeleton className="h-[480px]" />
                        <Skeleton className="h-[480px]" />
                        <Skeleton className="h-[480px]" />
                        <Skeleton className="h-[480px]" />
                    </div>
                </div>
            </MainLayout>
        );
    }
    
    return (
        <MainLayout headerCenterContent={<ResetButton />} headerRightContent={filterBarContent}>
            <div className="space-y-8">
                <div>
                    <h2 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <BrainCircuit className="h-8 w-8 text-primary" />
                        Divergence Analytics
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Identify which edges and formulas are causing the biggest performance gaps between your plan and your execution.
                    </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <DivergenceAnalysisChart
                        data={edgeDivergenceData}
                        title="Edge P&L Divergence"
                        description="Which edges are underperforming (or overperforming) your theoretical plan?"
                    />
                    <DivergenceAnalysisChart
                        data={entryFormulaDivergenceData}
                        title="Entry Formula P&L Divergence"
                        description="How does the reality of your entry signals compare to your backtesting?"
                    />
                    <DivergenceAnalysisChart
                        data={stopLossFormulaDivergenceData}
                        title="Stop Loss Formula P&L Divergence"
                        description="Are your real-world stop losses behaving as planned?"
                    />
                    <DivergenceAnalysisChart
                        data={targetFormulaDivergenceData}
                        title="Target Formula P&L Divergence"
                        description="Is the performance of your target strategies meeting expectations?"
                    />
                </div>
            </div>
        </MainLayout>
    );
}

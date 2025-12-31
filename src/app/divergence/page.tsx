

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ComposedChart, Area, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis, BarChart, Bar } from 'recharts';
import type { Trade, TradingMode, Edge, Formula, CumulativePnlDataPoint, IndexType, PositionType, ExpiryType, RulesFollowedStatus } from '@/types';
import { calculateDashboardMetrics, generateCumulativePnlData } from '@/lib/tradeCalculations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import { GitCompareArrows, ArrowUp, ArrowDown, Minus, RotateCcw, Target, Bot, CheckCheck, GitCommitHorizontal, Ban, ArrowRight } from 'lucide-react';
import { format, parseISO, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import MainLayout from '@/components/layout/MainLayout';
import type { DateRange } from 'react-day-picker';
import MultiSelectFilterDropdown from '@/components/shared/MultiSelectFilterDropdown';
import AdvancedDateRangePicker from '@/components/shared/AdvancedDateRangePicker';
import { Button } from '@/components/ui/button';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';


interface ComparisonMetrics {
  totalPnl: number;
  winLossRatio: number;
  riskRewardRatio: number;
  profitFactor: number;
  tradeCount: number;
  wins: number;
  losses: number;
}

interface DivergenceStats {
  aligned: ComparisonMetrics;
  entryMiss: ComparisonMetrics;
  notFollowed: ComparisonMetrics;
  partialReal: ComparisonMetrics;
  partialTheoretical: ComparisonMetrics;
}


interface PnlDivergenceData {
    date: string;
    realPnl: number;
    theoreticalPnl: number;
    divergence: number;
}


const DivergenceSummaryCard = ({ title, icon: Icon, stats }: { title: string; icon: React.ElementType, stats: ComparisonMetrics }) => {
    const winRateData = [{ name: 'Win Rate', value: stats.winLossRatio, fill: 'hsl(var(--chart-1))' }];
    
    return (
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
                <div className="flex justify-center items-center h-32">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart 
                            innerRadius="70%" 
                            outerRadius="100%" 
                            barSize={10} 
                            data={winRateData}
                            startAngle={90}
                            endAngle={-270}
                        >
                            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                            <RadialBar 
                                background={{ fill: 'hsl(var(--muted))' }} 
                                dataKey="value"
                                cornerRadius={10}
                                isAnimationActive
                            />
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">
                                {`${Math.round(stats.winLossRatio || 0)}%`}
                            </text>
                            <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-sm">
                                Win Rate
                            </text>
                        </RadialBarChart>
                    </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm pt-4 text-center">
                   <div>
                        <p className="text-muted-foreground">Net P&L</p>
                        <p className={cn("font-bold text-lg truncate", stats.totalPnl > 0 ? "text-green-600" : stats.totalPnl < 0 ? "text-red-600" : "text-foreground")}>{formatCurrency(stats.totalPnl)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Wins</p>
                        <p className="font-bold text-lg text-green-600">{stats.wins}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Losses</p>
                        <p className="font-bold text-lg text-red-600">{stats.losses}</p>
                    </div>
                     <div className="col-span-3 mt-1">
                        <p className="text-muted-foreground">Total Trades</p>
                        <p className="font-bold text-lg">{stats.tradeCount}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const PartialDivergenceCard = ({ partialReal, partialTheoretical }: { partialReal: ComparisonMetrics, partialTheoretical: ComparisonMetrics }) => {
    const pnlDifference = (partialReal.totalPnl || 0) - (partialTheoretical.totalPnl || 0);
    const winsDifference = (partialReal.wins || 0) - (partialTheoretical.wins || 0);
    const lossesDifference = (partialReal.losses || 0) - (partialTheoretical.losses || 0);
    const totalTrades = partialReal.tradeCount || 0;
    
    const DiffText = ({ value, positiveClass = 'text-green-600', negativeClass = 'text-red-600', isPnl = false, isLoss = false }: {value: number, positiveClass?: string, negativeClass?: string, isPnl?: boolean, isLoss?: boolean}) => {
        const pClass = isLoss ? negativeClass : positiveClass;
        const nClass = isLoss ? positiveClass : negativeClass;
        const formattedValue = isPnl ? formatCurrency(value) : (value > 0 ? `+${value}` : value);
        return (
            <span className={cn("font-bold", value > 0 ? pClass : value < 0 ? nClass : "")}>
                {formattedValue}
            </span>
        );
    };

    return (
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col col-span-1 md:col-span-2 xl:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-headline text-xl flex items-center gap-3">
                    <GitCommitHorizontal className="h-6 w-6 text-primary rotate-90" />
                    Partial Divergence
                </CardTitle>
                {totalTrades > 0 && <Badge variant="secondary">{totalTrades} Total Trades</Badge>}
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-around">
                <div className="grid grid-cols-2 gap-4">
                    {/* Theoretical Side */}
                    <div className="p-4 rounded-lg bg-muted/40 text-center">
                        <p className="font-semibold text-muted-foreground">Theoretical</p>
                        <p className={cn("text-2xl font-bold my-2", partialTheoretical.totalPnl > 0 ? "text-green-600" : partialTheoretical.totalPnl < 0 ? "text-red-600" : "")}>{formatCurrency(partialTheoretical.totalPnl)}</p>
                        <p className="text-sm"><span className="text-green-600 font-medium">{partialTheoretical.wins}</span> Wins / <span className="text-red-600 font-medium">{partialTheoretical.losses}</span> Losses</p>
                    </div>
                    {/* Real Side */}
                    <div className="p-4 rounded-lg bg-muted/40 text-center">
                        <p className="font-semibold text-muted-foreground">Real</p>
                        <p className={cn("text-2xl font-bold my-2", partialReal.totalPnl > 0 ? "text-green-600" : partialReal.totalPnl < 0 ? "text-red-600" : "")}>{formatCurrency(partialReal.totalPnl)}</p>
                        <p className="text-sm"><span className="text-green-600 font-medium">{partialReal.wins}</span> Wins / <span className="text-red-600 font-medium">{partialReal.losses}</span> Losses</p>
                    </div>
                </div>

                {/* Difference Summary */}
                <div className="mt-4 p-3 rounded-lg border-2 border-dashed flex justify-around items-center text-center">
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground">PNL Difference</p>
                        <DiffText value={pnlDifference} isPnl />
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground">Wins Difference</p>
                        <DiffText value={winsDifference} />
                    </div>
                     <div className="h-10 w-px bg-border" />
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground">Losses Difference</p>
                        <DiffText value={lossesDifference} isLoss />
                    </div>
                </div>

            </CardContent>
        </Card>
    );
};

const PnlDivergenceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as PnlDivergenceData;
        return (
            <div className="p-2 bg-background/90 border border-border rounded-lg shadow-lg text-xs backdrop-blur-sm">
                <p className="font-bold text-foreground mb-2">{format(parseISO(label), "PPP")}</p>
                <div className="space-y-1">
                    <div className="flex justify-between items-center"><span className="font-medium text-foreground flex items-center"><div className="h-2 w-2 rounded-full mr-1.5" style={{backgroundColor: 'hsl(var(--chart-1))'}}/>Real P&L:</span> <span className="font-semibold">{formatCurrency(data.realPnl)}</span></div>
                    <div className="flex justify-between items-center"><span className="font-medium text-foreground flex items-center"><div className="h-2 w-2 rounded-full mr-1.5" style={{backgroundColor: 'hsl(var(--chart-2))'}}/>Theoretical P&L:</span> <span className="font-semibold">{formatCurrency(data.theoreticalPnl)}</span></div>
                    <div className={cn("flex justify-between items-center font-semibold", data.divergence >= 0 ? 'text-green-500' : 'text-red-500')}><span className="flex items-center"><div className="h-2 w-2 rounded-full mr-1.5 bg-current"/>Divergence:</span> <span>{formatCurrency(data.divergence)}</span></div>
                </div>
            </div>
        );
    }
    return null;
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
  { id: 'NOT FOLLOW', name: 'NOT FOLLOW' },
  { id: 'PARTIALLY FOLLOW', name: 'PARTIALLY FOLLOW' },
  { id: 'ENTRY MISS', name: 'ENTRY MISS' },
];

export default function DivergenceDashboardPage() {
    const [allTrades, setAllTrades] = useState<{ real: Trade[]; theoretical: Trade[] }>({ real: [], theoretical: [] });
    const [allEdges, setAllEdges] = useState<{ real: Edge[]; theoretical: Edge[] }>({ real: [], theoretical: [] });
    const [allFormulas, setAllFormulas] = useState<{ real: Formula[]; theoretical: Formula[] }>({ real: [], theoretical: [] });
    const [isLoading, setIsLoading] = useState(true);

    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
    const [selectedRulesFollowedStatusIds, setSelectedRulesFollowedStatusIds] = useState<RulesFollowedStatus[]>([]);
    const [selectedEntryFormulaIds, setSelectedEntryFormulaIds] = useState<string[]>([]);
    const [selectedStopLossFormulaIds, setSelectedStopLossFormulaIds] = useState<string[]>([]);
    const [selectedTargetFormulaIds, setSelectedTargetFormulaIds] = useState<string[]>([]);
    const [selectedIndexTypeIds, setSelectedIndexTypeIds] = useState<IndexType[]>([]);
    const [selectedPositionTypeIds, setSelectedPositionTypeIds] = useState<PositionType[]>([]);
    const [selectedExpiryTypeIds, setSelectedExpiryTypeIds] = useState<ExpiryType[]>([]);


    useEffect(() => {
        setIsLoading(true);
        try {
            const loadData = (mode: TradingMode) => {
                const tradesKey = `tradeVisionApp_${mode}_trades`;
                const edgesKey = `tradeVisionApp_${mode}_edges`;
                const formulasKey = `tradeVisionApp_${mode}_formulas`;
                
                const storedTrades = localStorage.getItem(tradesKey);
                const storedEdges = localStorage.getItem(edgesKey);
                const storedFormulas = localStorage.getItem(formulasKey);
                
                const trades: Trade[] = storedTrades ? JSON.parse(storedTrades) : [];
                const edges: Edge[] = storedEdges ? JSON.parse(storedEdges) : [];
                const formulas: Formula[] = storedFormulas ? JSON.parse(storedFormulas) : [];

                return { trades, edges, formulas };
            };

            const realData = loadData('real');
            const theoreticalData = loadData('theoretical');

            setAllTrades({ real: realData.trades, theoretical: theoreticalData.trades });
            setAllEdges({ real: realData.edges, theoretical: theoreticalData.edges });
            setAllFormulas({ real: realData.formulas, theoretical: theoreticalData.formulas });
        } catch (error) {
            console.error("Error loading divergence data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const combinedEdges = useMemo(() => Array.from(new Map([...allEdges.real, ...allEdges.theoretical].map(e => [e.id, e])).values()), [allEdges]);
    const combinedFormulas = useMemo(() => Array.from(new Map([...allFormulas.real, ...allFormulas.theoretical].map(f => [f.id, f])).values()), [allFormulas]);
    
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
    
    const divergenceStats = useMemo((): DivergenceStats => {
      const allEdgesCombined = [...allEdges.real, ...allEdges.theoretical];

      const alignedTrades = filteredTrades.real.filter(t => t.executionMode === 'both' && t.closeMode === 'both');
      const entryMissTrades = filteredTrades.theoretical.filter(t => t.executionMode === 'theoretical' && t.closeMode === 'theoretical');
      const notFollowedTrades = filteredTrades.real.filter(t => t.executionMode === 'real' && t.closeMode === 'real');
      
      const partialDivergenceRealTrades = filteredTrades.real.filter(t => (t.executionMode === 'both' && t.closeMode === 'real') || (t.executionMode === 'real' && t.closeMode === 'both'));
      const partialDivergenceTheoTrades = filteredTrades.theoretical.filter(t => {
          return partialDivergenceRealTrades.some(realTrade => realTrade.id === t.id);
      });
      
      return {
          aligned: calculateDashboardMetrics(alignedTrades, allEdgesCombined) as ComparisonMetrics,
          entryMiss: calculateDashboardMetrics(entryMissTrades, allEdgesCombined) as ComparisonMetrics,
          notFollowed: calculateDashboardMetrics(notFollowedTrades, allEdgesCombined) as ComparisonMetrics,
          partialReal: calculateDashboardMetrics(partialDivergenceRealTrades, allEdgesCombined) as ComparisonMetrics,
          partialTheoretical: calculateDashboardMetrics(partialDivergenceTheoTrades, allEdgesCombined) as ComparisonMetrics,
      };

    }, [filteredTrades, allEdges.real, allEdges.theoretical]);

    const pnlDivergenceData = useMemo(() => {
        const realPnlData = generateCumulativePnlData(filteredTrades.real);
        const theoreticalPnlData = generateCumulativePnlData(filteredTrades.theoretical);
        
        const allDates = [...new Set([...realPnlData.map(d => d.date), ...theoreticalPnlData.map(d => d.date)])]
            .sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());

        let lastRealPnl = 0;
        let lastTheoreticalPnl = 0;
        const realPnlMap = new Map(realPnlData.map(d => [d.date, d.cumulativePnl]));
        const theoreticalPnlMap = new Map(theoreticalPnlData.map(d => [d.date, d.cumulativePnl]));

        return allDates.map(date => {
            lastRealPnl = realPnlMap.get(date) ?? lastRealPnl;
            lastTheoreticalPnl = theoreticalPnlMap.get(date) ?? lastTheoreticalPnl;
            const divergence = lastRealPnl - lastTheoreticalPnl;
            return { date, realPnl: lastRealPnl, theoreticalPnl: lastTheoreticalPnl, divergence };
        });
    }, [filteredTrades]);


    const divergenceGradientStops = useMemo(() => {
        const greenColor = "hsl(var(--chart-1))";
        const redColor = "hsl(var(--destructive))";
        const stops: { offset: string; color: string; opacity: number }[] = [];

        if (pnlDivergenceData.length > 0) {
            const values = pnlDivergenceData.map(d => d.divergence);
            const dataMin = Math.min(...values);
            const dataMax = Math.max(...values);
            const range = dataMax - dataMin;
            
            if (range === 0) {
                const flatColor = dataMin >= 0 ? greenColor : redColor;
                stops.push({ offset: "0%", color: flatColor, opacity: 0.4 });
                stops.push({ offset: "100%", color: flatColor, opacity: 0.1 });
            } else if (dataMax <= 0) {
                stops.push({ offset: "0%", color: redColor, opacity: 0.4 });
                stops.push({ offset: "100%", color: redColor, opacity: 0.1 });
            } else if (dataMin >= 0) {
                stops.push({ offset: "0%", color: greenColor, opacity: 0.4 });
                stops.push({ offset: "100%", color: greenColor, opacity: 0.1 });
            } else {
                const zeroOffset = (dataMax / range) * 100;
                stops.push({ offset: "0%", color: greenColor, opacity: 0.4 });
                stops.push({ offset: `${zeroOffset}%`, color: greenColor, opacity: 0.05 });
                stops.push({ offset: `${zeroOffset}%`, color: redColor, opacity: 0.05 });
                stops.push({ offset: "100%", color: redColor, opacity: 0.4 });
            }
        }
        return stops;
    }, [pnlDivergenceData]);
    
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Skeleton className="h-[250px]" />
                        <Skeleton className="h-[250px]" />
                        <Skeleton className="h-[250px]" />
                    </div>
                    <Skeleton className="h-[400px]" />
                </div>
            </MainLayout>
        );
    }
    
    return (
        <MainLayout headerCenterContent={<ResetButton />} headerRightContent={filterBarContent}>
            <div className="space-y-8">
                <div>
                    <h2 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <GitCompareArrows className="h-8 w-8 text-primary" />
                        Divergence Dashboard
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Compare your real-world trading against your theoretical strategies to find your edge.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <DivergenceSummaryCard title="Aligned Trades" icon={CheckCheck} stats={divergenceStats.aligned} />
                    <DivergenceSummaryCard title="Rules Not Followed" icon={Ban} stats={divergenceStats.notFollowed} />
                    <DivergenceSummaryCard title="Entry Misses" icon={Bot} stats={divergenceStats.entryMiss} />
                    <PartialDivergenceCard partialReal={divergenceStats.partialReal} partialTheoretical={divergenceStats.partialTheoretical} />
                </div>
                
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl">P&L Divergence Over Time</CardTitle>
                        <CardDescription>Visual comparison of your cumulative P&L growth between real and theoretical trading.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px] w-full">
                            {pnlDivergenceData.length > 1 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={pnlDivergenceData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis 
                                            dataKey="date" 
                                            tickFormatter={(date) => format(parseISO(date), 'MMM d, yy')}
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                        />
                                        <YAxis 
                                            tickFormatter={(val) => formatCurrency(val, { maximumFractionDigits: 0 })}
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                            width={80}
                                        />
                                        <Tooltip content={<PnlDivergenceTooltip />} />
                                        <Legend />
                                        <defs>
                                            <linearGradient id="divergenceGradient" x1="0" y1="0" x2="0" y2="1">
                                                {divergenceGradientStops.map((stop, index) => (
                                                    <stop key={index} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
                                                ))}
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="divergence" fill="url(#divergenceGradient)" stroke="none" name="Divergence" isAnimationActive/>
                                        <Line type="monotone" dataKey="theoreticalPnl" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Theoretical" dot={false} isAnimationActive/>
                                        <Line type="monotone" dataKey="realPnl" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Real" dot={false} isAnimationActive/>
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground">
                                    Not enough data to display P&L divergence chart. Log at least two trades in both modes.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </MainLayout>
    );
}

    

    

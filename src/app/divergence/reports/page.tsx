
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import type { Trade, Edge, Formula, IndexType, PositionType, ExpiryType, RulesFollowedStatus, PsychologyRule, ComparisonMetrics } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw, HeartPulse, Zap, CheckCircle, XCircle, AlertTriangle, LogIn, LogOut, BarChart3, Brain } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange, DayProps } from 'react-day-picker';
import { format, parseISO, startOfDay, endOfDay, isBefore, isAfter, differenceInCalendarMonths, startOfMonth, endOfMonth, isSameDay, addDays } from 'date-fns';
import MainLayout from '@/components/layout/MainLayout';
import MultiSelectFilterDropdown from '@/components/shared/MultiSelectFilterDropdown';
import AdvancedDateRangePicker from '@/components/shared/AdvancedDateRangePicker';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppContext } from '@/contexts/AppContext';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Legend, BarChart, Cell } from 'recharts';
import { calculateDashboardMetrics } from '@/lib/tradeCalculations';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const indexTypeOptions: { id: IndexType; name: IndexType }[] = [{ id: 'NIFTY', name: 'NIFTY' }, { id: 'SENSEX', name: 'SENSEX' }];
const positionTypeOptions: { id: PositionType; name: PositionType }[] = [{ id: 'Long', name: 'Long' }, { id: 'Short', name: 'Short' }];
const expiryTypeOptions: { id: ExpiryType; name: ExpiryType }[] = [{ id: 'Expiry', name: 'Expiry' }, { id: 'Non-Expiry', name: 'Non-Expiry' }];
const rulesFollowedFilterOptions: { id: RulesFollowedStatus; name: RulesFollowedStatus }[] = [{ id: 'RULES FOLLOW', name: 'RULES FOLLOW' }, { id: 'NOT FOLLOW', name: 'NOT FOLLOW' }, { id: 'PARTIALLY FOLLOW', name: 'PARTIALLY FOLLOW' }, { id: 'ENTRY MISS', name: 'ENTRY MISS' }];

interface DailyDivergenceStat {
    realPnl: number;
    alignedCount: number;
    notFollowCount: number;
    partialFollowCount: number;
    entryMissCount: number;
    totalRealTrades: number;
}


const getGridDimensions = (months: number): { cols: number; rows: number } => {
    if (months <= 1) return { cols: 1, rows: 1 };
    if (months <= 2) return { cols: 2, rows: 1 };
    if (months <= 3) return { cols: 3, rows: 1 };
    if (months <= 4) return { cols: 2, rows: 2 };
    if (months <= 6) return { cols: 3, rows: 2 };
    if (months <= 9) return { cols: 3, rows: 3 };
    return { cols: 4, rows: 3 }; // Fallback for > 9
};

const SegmentedDay = ({ stat, date }: { stat?: DailyDivergenceStat; date: Date }) => {
    if (!stat || (stat.totalRealTrades === 0 && stat.entryMissCount === 0)) {
        return (
            <div className="flex flex-col items-start justify-start p-1 w-full h-full">
                <span className="font-medium text-xs text-muted-foreground">{format(date, 'd')}</span>
            </div>
        );
    }
    
    const totalOpportunities = stat.totalRealTrades + stat.entryMissCount;
    const notFollowPct = (stat.notFollowCount / totalOpportunities) * 100;
    const alignedPct = (stat.alignedCount / totalOpportunities) * 100;
    const partialPct = (stat.partialFollowCount / totalOpportunities) * 100;
    const entryMissPct = (stat.entryMissCount / totalOpportunities) * 100;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex flex-col items-start justify-between p-1 w-full h-full">
                        <div className="flex justify-between w-full items-center">
                            <span className="font-bold text-xs text-foreground">{format(date, 'd')}</span>
                            <span className="font-mono text-xs text-muted-foreground">{totalOpportunities} Ops</span>
                        </div>
                        <div className="w-full flex-grow flex flex-col justify-end">
                            <p className={cn("text-sm font-bold truncate", stat.realPnl >= 0 ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300")}>
                                {formatCurrency(stat.realPnl, { maximumFractionDigits: 0 })}
                            </p>
                            <div className="w-full h-2 rounded-full flex overflow-hidden mt-1 bg-muted">
                                {notFollowPct > 0 && <div className="bg-red-500" style={{ width: `${notFollowPct}%` }} />}
                                {alignedPct > 0 && <div className="bg-green-500" style={{ width: `${alignedPct}%` }} />}
                                {partialPct > 0 && <div className="bg-yellow-400" style={{ width: `${partialPct}%` }} />}
                                {entryMissPct > 0 && <div className="bg-sky-500" style={{ width: `${entryMissPct}%` }} />}
                            </div>
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="text-sm space-y-1 p-1">
                        <p className="font-bold">{format(date, "PPP")}</p>
                        <p>Total Opportunities: {totalOpportunities}</p>
                        <hr className="my-1"/>
                        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-500"/>Not Followed: {stat.notFollowCount} ({notFollowPct.toFixed(0)}%)</p>
                        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-500"/>Aligned: {stat.alignedCount} ({alignedPct.toFixed(0)}%)</p>
                        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-yellow-400"/>Partial: {stat.partialFollowCount} ({partialPct.toFixed(0)}%)</p>
                        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-sky-500"/>Entry Missed: {stat.entryMissCount} ({entryMissPct.toFixed(0)}%)</p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};


function CustomDayContent(props: DayProps, dailyStats: Record<string, DailyDivergenceStat>) {
    const { date, displayMonth } = props;
    const isOutsideMonth = displayMonth.getMonth() !== date.getMonth();
    if (isOutsideMonth) {
      return <div className="flex flex-col items-start justify-start text-left w-full h-full rounded-none bg-transparent" />;
    }

    const buttonProps = (props as any).buttonProps || {} as React.ButtonHTMLAttributes<HTMLButtonElement>;
    const dateStr = format(date, 'yyyy-MM-dd');
    const stat = dailyStats[dateStr];
    
    let dayBaseBackground = "bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700";

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        dayBaseBackground = "bg-sky-100 dark:bg-sky-900/60 hover:bg-sky-200 dark:hover:bg-sky-800";
    } else if (stat) {
        const categories = [
            { count: stat.notFollowCount, color: "bg-red-300 dark:bg-red-800/70 hover:bg-red-400/80 dark:hover:bg-red-700/80" },
            { count: stat.alignedCount, color: "bg-green-300 dark:bg-green-800/70 hover:bg-green-400/80 dark:hover:bg-green-700/80" },
            { count: stat.partialFollowCount, color: "bg-yellow-300 dark:bg-yellow-800/70 hover:bg-yellow-400/80 dark:hover:bg-yellow-700/80" },
            { count: stat.entryMissCount, color: "bg-sky-300 dark:bg-sky-800/70 hover:bg-sky-400/80 dark:hover:bg-sky-700/80" }
        ];

        const dominantCategory = categories.reduce((prev, current) => (prev.count > current.count) ? prev : current);

        if (dominantCategory.count > 0) {
            dayBaseBackground = dominantCategory.color;
        }
    }


    return (
      <button {...buttonProps} type="button" className={cn("flex flex-col items-start justify-start text-left w-full h-full rounded-none transition-colors duration-150 p-0", dayBaseBackground)} disabled={props.disabled}>
          <SegmentedDay stat={stat} date={date}/>
      </button>
    );
}

const DivergenceCircle = ({ percentage }: { percentage: number }) => {
    let colorClass = 'bg-yellow-500 text-yellow-900';
    if (percentage > 100) {
        colorClass = 'bg-orange-500 text-orange-900';
    } else if (percentage === 100) {
        colorClass = 'bg-green-500 text-white';
    } else if (percentage <= 0) {
        colorClass = 'bg-red-500 text-white';
    }

    const displayText = !isFinite(percentage) ? '∞' : `${percentage.toFixed(0)}%`;

    return (
        <div className={cn("w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm", colorClass)}>
            {displayText}
        </div>
    );
};

const StatDisplay = ({ label, pnl, count, icon: StatIcon, colorClass, pnlTheo, showDivergence }: { label: string, pnl: number, count: number, icon: React.ElementType, colorClass: string, pnlTheo: number, showDivergence: boolean }) => {
    const divergence = pnl - pnlTheo;
    return (
        <div className="flex-1 p-2 rounded-lg bg-background/50 text-center">
            <p className={cn("text-xs font-semibold flex items-center justify-center gap-1.5", colorClass)}>
                <StatIcon className="h-4 w-4" />
                {label}
            </p>
            <p className={cn("text-lg font-bold mt-1", pnl >= 0 ? "text-green-600" : "text-red-600")}>
                {formatCurrency(pnl)}
            </p>
            <p className="text-xs text-muted-foreground">{count} trades</p>
            {showDivergence && (
                 <>
                    <p className="text-xs text-muted-foreground mt-2 border-t pt-1">Theo: {formatCurrency(pnlTheo)}</p>
                    <p className={cn("text-xs font-bold", divergence >= 0 ? "text-green-500" : "text-red-500")}>
                        Div: {formatCurrency(divergence)}
                    </p>
                </>
            )}
        </div>
    );
};

const PsychologyImpactCard = ({
    title,
    icon: Icon,
    data,
    psychologyRuleMap,
}: {
    title: string;
    icon: React.ElementType;
    data: any[];
    psychologyRuleMap: Map<string, string>;
}) => {
    
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    {title}
                </CardTitle>
                <CardDescription>P&amp;L breakdown by execution discipline when this factor is present.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {data.length > 0 ? data.map(item => (
                    <Card key={item.id} className="p-4 bg-muted/30">
                       <h4 className="font-semibold text-base mb-3">{psychologyRuleMap.get(item.id) || 'Unknown Rule'}</h4>
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                           <StatDisplay label="Followed" pnl={item.rulesFollow.pnl} count={item.rulesFollow.count} icon={CheckCircle} colorClass="text-green-600" pnlTheo={item.rulesFollow.theoreticalPnl} showDivergence={true} />
                           <StatDisplay label="Not Followed" pnl={item.notFollow.pnl} count={item.notFollow.count} icon={XCircle} colorClass="text-red-600" pnlTheo={item.notFollow.theoreticalPnl} showDivergence={true} />
                           <StatDisplay label="Partial" pnl={item.partialFollow.pnl} count={item.partialFollow.count} icon={AlertTriangle} colorClass="text-yellow-600" pnlTheo={item.partialFollow.theoreticalPnl} showDivergence={true} />
                       </div>
                    </Card>
                )) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No psychological data found for the selected period.</p>
                )}
            </CardContent>
        </Card>
    );
};

interface PsychologyErrorCount {
  name: string;
  count: number;
  fill: string;
}

export default function DivergenceReportsPage() {
    const { allTrades, edges, formulas, isLoading, psychologyRules } = useAppContext();
    const [psychologyChartMode, setPsychologyChartMode] = useState<'technical' | 'emotional'>('technical');

    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    const [dailyDivergenceStats, setDailyDivergenceStats] = useState<Record<string, DailyDivergenceStat>>({});
    const [numberOfMonths, setNumberOfMonths] = useState(1);
    const [calendarKey, setCalendarKey] = useState(Date.now());
    
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

    const entryFormulas = useMemo(() => combinedFormulas.filter(f => f.type === 'normal-entry' || f.type === 'breakout-entry'), [combinedFormulas]);
    const stopLossFormulas = useMemo(() => combinedFormulas.filter(f => f.type === 'stop-loss'), [combinedFormulas]);
    const targetFormulas = useMemo(() => combinedFormulas.filter(f => f.type === 'target-index' || f.type === 'target-option'), [combinedFormulas]);

    const cascadingFilters = useMemo(() => {
        const combinedTrades = [...(allTrades.real || []), ...(allTrades.theoretical || [])];
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
            preDateFilteredRealTrades: applyFilters(allTrades.real || []),
            preDateFilteredTheoreticalTrades: applyFilters(allTrades.theoretical || [])
        };
    }, [
        allTrades, isLoading, combinedEdges, entryFormulas, stopLossFormulas, targetFormulas,
        selectedStrategyIds, selectedRulesFollowedStatusIds, selectedEntryFormulaIds, selectedStopLossFormulaIds,
        selectedTargetFormulaIds, selectedIndexTypeIds, selectedPositionTypeIds, selectedExpiryTypeIds
    ]);

    const filteredTrades = useMemo(() => {
      const filterFunc = (trades: Trade[]) => {
        let temp = trades.filter(t => t.outcome !== 'Open' && !!t.exitTime);
        if (dateRange?.from || dateRange?.to) {
          temp = temp.filter(t => {
            const tradeDate = parseISO(t.exitTime!);
            const fromOk = dateRange.from ? !isBefore(tradeDate, startOfDay(dateRange.from)) : true;
            const toOk = dateRange.to ? !isAfter(tradeDate, endOfDay(dateRange.to)) : true;
            return fromOk && toOk;
          });
        }
        return temp;
      };
      return { real: filterFunc(cascadingFilters.preDateFilteredRealTrades), theoretical: filterFunc(cascadingFilters.preDateFilteredTheoreticalTrades) };
    }, [cascadingFilters, dateRange]);

    useEffect(() => {
        const stats: Record<string, DailyDivergenceStat> = {};
        const combined = [...filteredTrades.real, ...filteredTrades.theoretical];

        const allDaysInRange = new Set<string>();
        if (dateRange?.from) {
            const end = dateRange.to || dateRange.from;
            for (let day = startOfDay(dateRange.from); isBefore(day, endOfDay(end)); day = addDays(day, 1)) {
                allDaysInRange.add(format(day, 'yyyy-MM-dd'));
            }
        } else {
            combined.forEach(t => {
                if (t.exitTime) allDaysInRange.add(format(parseISO(t.exitTime), 'yyyy-MM-dd'));
            });
        }
    
        for (const dayKey of allDaysInRange) {
            const dailyRealTrades = filteredTrades.real.filter(t => t.exitTime && isSameDay(parseISO(t.exitTime), parseISO(dayKey)));
            const dailyTheoTrades = filteredTrades.theoretical.filter(t => t.exitTime && isSameDay(parseISO(t.exitTime), parseISO(dayKey)));
            
            stats[dayKey] = {
                realPnl: dailyRealTrades.reduce((acc, t) => acc + (t.pnl ?? 0), 0),
                alignedCount: dailyRealTrades.filter(t => t.rulesFollowed === 'RULES FOLLOW').length,
                notFollowCount: dailyRealTrades.filter(t => t.rulesFollowed === 'NOT FOLLOW').length,
                partialFollowCount: dailyRealTrades.filter(t => t.rulesFollowed === 'PARTIALLY FOLLOW').length,
                entryMissCount: dailyTheoTrades.filter(t => t.rulesFollowed === 'ENTRY MISS').length,
                totalRealTrades: dailyRealTrades.length,
            };
        }
        setDailyDivergenceStats(stats);
    }, [filteredTrades, dateRange]);


    const dailyReportData = useMemo(() => {
        const allDates = new Set([
            ...filteredTrades.real.map(t => format(parseISO(t.exitTime!), 'yyyy-MM-dd')),
            ...filteredTrades.theoretical.map(t => format(parseISO(t.exitTime!), 'yyyy-MM-dd')),
        ]);

        const reportRows = Array.from(allDates).map(date => {
            const dailyRealTrades = filteredTrades.real.filter(t => format(parseISO(t.exitTime!), 'yyyy-MM-dd') === date);
            const dailyTheoTrades = filteredTrades.theoretical.filter(t => format(parseISO(t.exitTime!), 'yyyy-MM-dd') === date);
            
            const createRuleStats = (trades: Trade[], status?: RulesFollowedStatus) => {
                const relevantTrades = status ? trades.filter(t => t.rulesFollowed === status) : trades;
                const wins = relevantTrades.filter(t => (t.pnl ?? 0) > 0);
                const losses = relevantTrades.filter(t => (t.pnl ?? 0) < 0);
                const winAmount = wins.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
                const lossAmount = losses.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
                return {
                    total: relevantTrades.length,
                    wins: wins.length,
                    losses: losses.length,
                    winAmount,
                    lossAmount,
                    pnl: winAmount + lossAmount,
                };
            };

            const theoRulesFollow = createRuleStats(dailyTheoTrades, 'RULES FOLLOW');
            const theoPartialFollow = createRuleStats(dailyTheoTrades, 'PARTIALLY FOLLOW');
            const theoEntryMiss = createRuleStats(dailyTheoTrades, 'ENTRY MISS');
            const theoGrandTotal = {
                total: dailyTheoTrades.length,
                pnl: theoRulesFollow.pnl + theoPartialFollow.pnl + theoEntryMiss.pnl,
            };

            const realRulesFollow = createRuleStats(dailyRealTrades, 'RULES FOLLOW');
            const realRulesNotFollow = createRuleStats(dailyRealTrades, 'NOT FOLLOW');
            const realPartialFollow = createRuleStats(dailyRealTrades, 'PARTIALLY FOLLOW');
            const realGrandTotal = dailyRealTrades.length;
            const realPnl = dailyRealTrades.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
            
            let completedPercentage = 0;
            if (theoGrandTotal.pnl > 0) {
              completedPercentage = (realPnl / theoGrandTotal.pnl) * 100;
            } else if (theoGrandTotal.pnl === 0) {
              completedPercentage = realPnl > 0 ? Infinity : (realPnl === 0 ? 100 : 0);
            } else { // Theoretical PnL is negative
                if (realPnl <= theoGrandTotal.pnl) { // Got a better result (less loss or a profit)
                    completedPercentage = 100;
                } else if (realPnl >= 0) { // Turned a loss into a profit
                    completedPercentage = 100;
                } else { // Lost more than planned
                    completedPercentage = (realPnl / theoGrandTotal.pnl) * 100;
                }
            }


            return {
                date,
                theoRulesFollow, theoPartialFollow, theoEntryMiss, theoGrandTotal,
                realRulesFollow, realRulesNotFollow, realPartialFollow, realGrandTotal, realPnl,
                completedPercentage,
                profitGap: theoGrandTotal.pnl - realPnl,
            };
        });

        return reportRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [filteredTrades]);

    const psychologyReportData = useMemo(() => {
        const createInitialStat = () => ({ pnl: 0, count: 0, theoreticalPnl: 0 });
    
        const store: Record<string, {
            id: string;
            rulesFollow: ReturnType<typeof createInitialStat>;
            notFollow: ReturnType<typeof createInitialStat>;
            partialFollow: ReturnType<typeof createInitialStat>;
        }> = {};
    
        const realTrades = filteredTrades.real || [];
        const theoTradesById = new Map((filteredTrades.theoretical || []).map(t => [t.id, t]));
        const psychologyRuleMap = new Map(psychologyRules.map(r => [r.id, r.text]));
    
        realTrades.forEach(realTrade => {
            const psycheIds = new Set([...(realTrade.technicalErrorIds || []), ...(realTrade.emotionIds || [])]);
    
            psycheIds.forEach(id => {
                if (!store[id]) {
                    store[id] = {
                        id,
                        rulesFollow: createInitialStat(),
                        notFollow: createInitialStat(),
                        partialFollow: createInitialStat(),
                    };
                }
                const entry = store[id];
                const realPnl = realTrade.pnl ?? 0;
                const theoPnl = theoTradesById.get(realTrade.id)?.pnl ?? 0;
    
                if (realTrade.rulesFollowed === 'RULES FOLLOW') {
                    entry.rulesFollow.pnl += realPnl;
                    entry.rulesFollow.theoreticalPnl += theoPnl;
                    entry.rulesFollow.count++;
                } else if (realTrade.rulesFollowed === 'NOT FOLLOW') {
                    entry.notFollow.pnl += realPnl;
                    entry.notFollow.theoreticalPnl += theoPnl;
                    entry.notFollow.count++;
                } else if (realTrade.rulesFollowed === 'PARTIALLY FOLLOW') {
                    entry.partialFollow.pnl += realPnl;
                    entry.partialFollow.theoreticalPnl += theoPnl;
                    entry.partialFollow.count++;
                }
            });
        });
    
        const technicalErrorRules = new Set(psychologyRules.filter(r => r.category === 'TECHNICAL ERRORS').map(r => r.id));
        const emotionRules = new Set(psychologyRules.filter(r => r.category === 'EMOTIONS').map(r => r.id));
    
        return {
            technicalErrors: Object.values(store).filter(item => technicalErrorRules.has(item.id)).sort((a, b) => b.notFollow.count - a.notFollow.count),
            emotions: Object.values(store).filter(item => emotionRules.has(item.id)).sort((a, b) => b.notFollow.count - a.notFollow.count),
            psychologyRuleMap,
        };
    }, [filteredTrades, psychologyRules]);
    
    const psychologyErrorChartData = useMemo((): PsychologyErrorCount[] => {
        const counts: Record<string, { id: string, name: string, count: number }> = {};
        
        const realTrades = filteredTrades.real || [];
        
        realTrades.forEach(trade => {
            const allErrors = new Set([...(trade.technicalErrorIds || []), ...(trade.emotionIds || [])]);
            allErrors.forEach(errorId => {
                const rule = psychologyRules.find(r => r.id === errorId);
                if (rule) {
                    if (!counts[rule.text]) {
                        counts[rule.text] = { id: rule.id, name: rule.text, count: 0 };
                    }
                    counts[rule.text].count++;
                }
            });
        });
    
        const techColors = ["hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(210 80% 60%)", "hsl(280 65% 60%)"];
        const emotionColors = ["hsl(340 80% 60%)", "hsl(300 80% 60%)", "hsl(0 80% 60%)", "hsl(260 80% 60%)", "hsl(320 70% 55%)"];
        
        return Object.values(counts).map(item => {
            const rule = psychologyRules.find(r => r.id === item.id);
            let fill = 'hsl(var(--muted-foreground))';
            if (rule) {
                const isTechnical = rule.category === 'TECHNICAL ERRORS';
                const isEmotional = rule.category === 'EMOTIONS';
                
                if (rule.text === "No Technical Errors" || rule.text === "No - Emotions") {
                    fill = 'hsl(var(--chart-1))'; // Green for no errors
                } else if (isTechnical) {
                    const index = psychologyRules.filter(r => r.category === 'TECHNICAL ERRORS').findIndex(r => r.id === rule.id);
                    fill = techColors[index % techColors.length];
                } else if (isEmotional) {
                    const index = psychologyRules.filter(r => r.category === 'EMOTIONS').findIndex(r => r.id === rule.id);
                    fill = emotionColors[index % emotionColors.length];
                }
            }
            return { ...item, fill };
        });
    }, [filteredTrades.real, psychologyRules]);


    useEffect(() => {
        let months = 1;
        if (dateRange?.from && dateRange.to) months = Math.abs(differenceInCalendarMonths(dateRange.to, dateRange.from)) + 1;
        setNumberOfMonths(months > 12 ? 12 : months < 1 ? 1 : months);
        setCalendarKey(Date.now());
    }, [dateRange]);

    const handleResetAllFilters = () => {
      setDateRange(undefined);
      setSelectedStrategyIds([]); setSelectedRulesFollowedStatusIds([]); setSelectedEntryFormulaIds([]); setSelectedStopLossFormulaIds([]); setSelectedTargetFormulaIds([]); setSelectedIndexTypeIds([]); setSelectedPositionTypeIds([]); setSelectedExpiryTypeIds([]);
    };
    const ResetButton = () => (<TooltipProvider><Tooltip><TooltipTrigger asChild><Button onClick={handleResetAllFilters} className="h-9 px-3"><RotateCcw className="mr-2 h-4 w-4" />Reset</Button></TooltipTrigger><TooltipContent><p>Reset All Filters</p></TooltipContent></Tooltip></TooltipProvider>);

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
    const loadingFilterBarContent = (<div className="flex items-center justify-end gap-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-9 w-[110px]" />)}<Skeleton className="h-9 w-full sm:w-[300px]" /></div>);
    const { cols, rows } = getGridDimensions(numberOfMonths);
    const monthStyle = { width: `calc(${100 / cols}% - 4px)`, height: `calc(${100 / rows}% - 4px)`, margin: '2px' };
    
    const PnlCell = ({ pnl }: { pnl: number }) => (
      <TableCell className={cn("text-right font-semibold", pnl > 0 ? 'text-green-600' : pnl < 0 ? 'text-red-600' : 'text-muted-foreground')}>
        {formatCurrency(pnl)}
      </TableCell>
    );

    const divergenceStats = useMemo(() => {
        const alignedTrades = filteredTrades.real.filter(t => t.rulesFollowed === 'RULES FOLLOW');
        const partialDivergenceTrades = filteredTrades.real.filter(t => t.rulesFollowed === 'PARTIALLY FOLLOW');
        const entryMissTrades = filteredTrades.theoretical.filter(t => t.rulesFollowed === 'ENTRY MISS');

        return {
            aligned: calculateDashboardMetrics(alignedTrades, combinedEdges) as ComparisonMetrics,
            partial: calculateDashboardMetrics(partialDivergenceTrades, combinedEdges) as ComparisonMetrics,
            entryMiss: calculateDashboardMetrics(entryMissTrades, combinedEdges) as ComparisonMetrics,
        };
    }, [filteredTrades, combinedEdges]);

    const { entryExecutionScore, exitExecutionScore } = useMemo(() => {
        const alignedCount = divergenceStats.aligned.tradeCount;
        const partialCount = divergenceStats.partial.tradeCount;
        const entryMissCount = divergenceStats.entryMiss.tradeCount;

        // Entry Execution
        const executedTrades = alignedCount + partialCount;
        const totalOpportunities = executedTrades + entryMissCount;
        const entryPercentage = totalOpportunities > 0 ? (executedTrades / totalOpportunities) * 100 : 0;

        // Exit Execution
        const totalExits = alignedCount + partialCount;
        const exitPercentage = totalExits > 0 ? (alignedCount / totalExits) * 100 : 0;

        return {
            entryExecutionScore: {
                percentage: isNaN(entryPercentage) ? 0 : entryPercentage,
                executed: executedTrades,
                total: totalOpportunities,
            },
            exitExecutionScore: {
                percentage: isNaN(exitPercentage) ? 0 : exitPercentage,
                aligned: alignedCount,
                total: totalExits
            }
        };
    }, [divergenceStats]);
    
    const currentVisibleChartData = useMemo(() => {
      const activeRules = psychologyChartMode === 'technical'
        ? psychologyRules.filter(r => r.category === 'TECHNICAL ERRORS')
        : psychologyRules.filter(r => r.category === 'EMOTIONS');
      
      const activeKeys = new Set(activeRules.map(r => r.text));
      
      return psychologyErrorChartData.filter(d => activeKeys.has(d.name));
    }, [psychologyChartMode, psychologyRules, psychologyErrorChartData]);

    if (isLoading) {
      return (<MainLayout headerCenterContent={<Skeleton className="h-9 w-24" />} headerRightContent={loadingFilterBarContent}><Skeleton className="h-[500px]" /></MainLayout>);
    }

    return (
      <MainLayout headerCenterContent={<ResetButton />} headerRightContent={filterBarContent}>
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-headline font-bold flex items-center gap-3"><CalendarIcon className="h-8 w-8 text-primary" />Divergence Calendar Report</h2>
            <p className="text-muted-foreground mt-1">Visualize your execution discipline. Compare your real P&amp;L against your theoretical goals daily.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
            <div className="space-y-6 lg:col-span-1">
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl flex items-center gap-3">
                            <LogIn className="h-6 w-6 text-primary" />
                            Entry Execution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col justify-center items-center">
                        {entryExecutionScore.total > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={150}>
                                    <RadialBarChart
                                        innerRadius="70%"
                                        outerRadius="100%"
                                        barSize={12}
                                        data={[{ name: 'execution', value: entryExecutionScore.percentage, fill: 'hsl(var(--primary))' }]}
                                        startAngle={90}
                                        endAngle={-270}
                                    >
                                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                        <RadialBar
                                            background={{ fill: 'hsl(var(--muted))' }}
                                            dataKey="value"
                                            cornerRadius={10}
                                        />
                                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-3xl font-bold">
                                            {`${Math.round(entryExecutionScore.percentage)}%`}
                                        </text>
                                    </RadialBarChart>
                                </ResponsiveContainer>
                                <p className="text-sm text-center text-muted-foreground mt-2">
                                    {entryExecutionScore.executed} of {entryExecutionScore.total} opportunities executed
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-center text-muted-foreground p-4 h-full flex items-center justify-center">No data to calculate execution score.</p>
                        )}
                    </CardContent>
                </Card>
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl flex items-center gap-3">
                            <LogOut className="h-6 w-6 text-primary" />
                            Exit Execution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col justify-center items-center">
                        {exitExecutionScore.total > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={150}>
                                    <RadialBarChart
                                        innerRadius="70%"
                                        outerRadius="100%"
                                        barSize={12}
                                        data={[{ name: 'execution', value: exitExecutionScore.percentage, fill: 'hsl(var(--chart-2))' }]}
                                        startAngle={90}
                                        endAngle={-270}
                                    >
                                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                        <RadialBar
                                            background={{ fill: 'hsl(var(--muted))' }}
                                            dataKey="value"
                                            cornerRadius={10}
                                        />
                                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-3xl font-bold">
                                            {`${Math.round(exitExecutionScore.percentage)}%`}
                                        </text>
                                    </RadialBarChart>
                                </ResponsiveContainer>
                                <p className="text-sm text-center text-muted-foreground mt-2">
                                    {exitExecutionScore.aligned} aligned exits out of {exitExecutionScore.total}
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-center text-muted-foreground p-4 h-full flex items-center justify-center">No data to calculate exit score.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            <Card className="shadow-lg h-full lg:col-span-5">
                <CardHeader><CardTitle className="font-headline text-xl">Execution Calendar</CardTitle><CardDescription>Daily breakdown of execution quality. Background color is determined by the dominant category for the day.</CardDescription></CardHeader>
                <CardContent className="p-2 aspect-video overflow-hidden">
                  <div key={calendarKey} className="h-full w-full">
                    <Calendar mode="range" month={dateRange?.from || new Date()} selected={dateRange} onSelect={setDateRange} disabled={isLoading} numberOfMonths={numberOfMonths} styles={{ month: monthStyle }} formatters={{formatWeekdayName: (date: Date) => format(date, numberOfMonths > 4 ? 'EEEEE' : 'EEE'),}} components={{IconLeft: () => <ChevronLeft className="h-4 w-4" />, IconRight: () => <ChevronRight className="h-4 w-4" />, Day: (props) => CustomDayContent(props, dailyDivergenceStats),}} className="p-0 size-full" classNames={{months: `flex flex-wrap content-start h-full w-full`, month: "flex flex-col border border-border/50 rounded-md", table: "w-full border-separate border-spacing-0 flex-grow flex flex-col", caption: cn("flex justify-center relative items-center", numberOfMonths > 9 ? "pt-0 pb-0" : "pt-0 pb-1"), caption_label: cn("font-headline", numberOfMonths > 9 ? "text-[9px]" : numberOfMonths > 6 ? "text-[10px]" : "text-xs"), nav: "space-x-0 flex items-center", nav_button: cn(buttonVariants({ variant: "outline" }), "bg-transparent p-0 opacity-50 hover:opacity-100 focus-visible:ring-0 rounded-sm", numberOfMonths > 9 ? "h-4 w-4" : "h-5 w-5"), nav_button_previous: "absolute left-0.5", nav_button_next: "absolute right-0.5", head_row: "flex w-full", head_cell: cn("text-center text-muted-foreground rounded-none w-full font-semibold p-0", numberOfMonths > 9 ? "text-[8px]" : numberOfMonths > 6 ? "text-[9px]" : "text-[10px]"), row: "flex w-full flex-1", cell: cn("p-px relative rounded-none flex-1 flex"), day: cn("w-full h-full", "rounded-none", "focus-visible:ring-0", "flex"), day_selected: "!bg-primary !text-primary-foreground", day_today: "ring-1 ring-primary", day_disabled: "pointer-events-none text-muted-foreground opacity-50", day_outside: "invisible", }} showOutsideDays={false} fixedWeeks />
                  </div>
                </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg">
            <CardHeader><CardTitle className="font-headline text-xl">Daily Divergence Breakdown</CardTitle><CardDescription>A detailed daily comparison of your theoretical plan versus your real-world execution.</CardDescription></CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table className="min-w-max text-xs">
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead rowSpan={3} className="sticky left-0 bg-muted/50 z-10 p-2 text-center align-middle border">DATE</TableHead>
                                <TableHead colSpan={13} className="p-2 text-center text-lg font-bold bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100 border">THEORETICAL</TableHead>
                                <TableHead colSpan={5} className="p-2 text-center text-lg font-bold bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 border">REAL</TableHead>
                                <TableHead rowSpan={3} className="p-2 text-center align-middle bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 border">Completed %</TableHead>
                                <TableHead rowSpan={3} className="p-2 text-center align-middle bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 border">Profit Gap</TableHead>
                                <TableHead rowSpan={3} className="p-2 text-center align-middle bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 border">Divergence</TableHead>
                            </TableRow>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead colSpan={4} className="p-1 text-center font-semibold bg-green-100 dark:bg-green-900/50 border">RULES FOLLOW</TableHead>
                                <TableHead colSpan={2} className="p-1 text-center font-semibold bg-yellow-100 dark:bg-yellow-900/50 border">PARTIAL FOLLOW</TableHead>
                                <TableHead colSpan={5} className="p-1 text-center font-semibold bg-sky-100 dark:bg-sky-900/50 border">ENTRY MISS</TableHead>
                                <TableHead colSpan={2} className="p-1 text-center font-semibold bg-teal-100 dark:bg-teal-900/50 border">Grand Total</TableHead>
                                <TableHead colSpan={4} className="p-1 text-center font-semibold bg-green-100 dark:bg-green-900/50 border">By Rule Status</TableHead>
                                <TableHead colSpan={1} rowSpan={2} className="p-1 text-center font-semibold align-middle bg-teal-100 dark:bg-teal-900/50 border">P&amp;L</TableHead>
                            </TableRow>
                             <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="p-1 text-center bg-yellow-50 dark:bg-yellow-900/30 border">TOTAL</TableHead><TableHead className="p-1 text-center bg-yellow-50 dark:bg-yellow-900/30 border">WINS</TableHead><TableHead className="p-1 text-center bg-red-50 dark:bg-red-900/30 border">LOSS</TableHead><TableHead className="p-1 text-center bg-green-50 dark:bg-green-900/30 border">P&amp;L</TableHead>
                                <TableHead className="p-1 text-center bg-yellow-50 dark:bg-yellow-900/30 border">TOTAL</TableHead><TableHead className="p-1 text-center bg-green-50 dark:bg-green-900/30 border">P&amp;L</TableHead>
                                <TableHead className="p-1 text-center bg-yellow-50 dark:bg-yellow-900/30 border">TOTAL</TableHead><TableHead className="p-1 text-center bg-yellow-50 dark:bg-yellow-900/30 border">WINS</TableHead><TableHead className="p-1 text-center bg-red-50 dark:bg-red-900/30 border">LOSS</TableHead><TableHead className="p-1 text-center bg-green-50 dark:bg-green-900/30 border">WIN AMT</TableHead><TableHead className="p-1 text-center bg-red-50 dark:bg-red-900/30 border">LOSS AMT</TableHead>
                                <TableHead className="p-1 text-center bg-yellow-50 dark:bg-yellow-900/30 border">TOTAL</TableHead><TableHead className="p-1 text-center bg-green-50 dark:bg-green-900/30 border">P&amp;L</TableHead>
                                <TableHead className="p-1 text-center bg-green-100 dark:bg-green-900/30 border">Follow</TableHead><TableHead className="p-1 text-center bg-red-100 dark:bg-red-900/30 border">Not</TableHead><TableHead className="p-1 text-center bg-yellow-100 dark:bg-yellow-900/30 border">Partial</TableHead><TableHead className="p-1 text-center bg-teal-100 dark:bg-teal-900/30 border">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dailyReportData.map(row => (
                                <TableRow key={row.date}>
                                    <TableCell className="sticky left-0 bg-background z-10 font-semibold border">{format(parseISO(row.date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell className="text-right border">{row.theoRulesFollow.total}</TableCell><TableCell className="text-right border">{row.theoRulesFollow.wins}</TableCell><TableCell className="text-right border">{row.theoRulesFollow.losses}</TableCell><PnlCell pnl={row.theoRulesFollow.pnl} />
                                    <TableCell className="text-right border">{row.theoPartialFollow.total}</TableCell><PnlCell pnl={row.theoPartialFollow.pnl} />
                                    <TableCell className="text-right border">{row.theoEntryMiss.total}</TableCell><TableCell className="text-right border">{row.theoEntryMiss.wins}</TableCell><TableCell className="text-right border">{row.theoEntryMiss.losses}</TableCell><PnlCell pnl={row.theoEntryMiss.winAmount ?? 0} /><PnlCell pnl={row.theoEntryMiss.lossAmount ?? 0} />
                                    <TableCell className="text-right border font-bold">{row.theoGrandTotal.total}</TableCell><PnlCell pnl={row.theoGrandTotal.pnl} />
                                    <TableCell className="text-right border">{row.realRulesFollow.total}</TableCell><TableCell className="text-right border">{row.realRulesNotFollow.total}</TableCell><TableCell className="text-right border">{row.realPartialFollow.total}</TableCell><TableCell className="text-right border font-bold">{row.realGrandTotal}</TableCell><PnlCell pnl={row.realPnl} />
                                    <TableCell className="text-right border font-bold">{isFinite(row.completedPercentage) ? `${row.completedPercentage.toFixed(2)}%` : 'N/A'}</TableCell>
                                    <PnlCell pnl={row.profitGap} />
                                    <TableCell className="flex justify-center items-center border-r"><DivergenceCircle percentage={row.completedPercentage} /></TableCell>
                                </TableRow>
                            ))}
                             {dailyReportData.length === 0 && (
                                <TableRow><TableCell colSpan={22} className="h-24 text-center">No trades found for the selected filters.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <Tabs value={psychologyChartMode} onValueChange={(value) => setPsychologyChartMode(value as 'technical' | 'emotional')}>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline text-xl flex items-center gap-3">
                            <Brain className="h-6 w-6 text-primary" />
                            Psychological Error Breakdown
                        </CardTitle>
                        <TabsList className="grid w-full max-w-[300px] grid-cols-2">
                            <TabsTrigger value="technical">Technical</TabsTrigger>
                            <TabsTrigger value="emotional">Emotional</TabsTrigger>
                        </TabsList>
                    </div>
                    <CardDescription>Total count of trades affected by each psychological error in the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                    {currentVisibleChartData.length > 0 ? (
                        <ChartContainer config={{}} className="h-[400px] w-full">
                            <BarChart data={currentVisibleChartData} layout="vertical" margin={{ left: 100 }}>
                                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} />
                                <XAxis type="number" dataKey="count" allowDecimals={false} />
                                <Tooltip
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    content={<ChartTooltipContent />}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {currentVisibleChartData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    ) : (
                        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                            <p>No trades with this type of psychological error in the selected period.</p>
                        </div>
                    )}
                </CardContent>
            </Tabs>
          </Card>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <PsychologyImpactCard 
              title="Technical Error Impact"
              icon={Zap}
              data={psychologyReportData.technicalErrors}
              psychologyRuleMap={psychologyReportData.psychologyRuleMap}
            />
             <PsychologyImpactCard 
              title="Emotion Impact"
              icon={HeartPulse}
              data={psychologyReportData.emotions}
              psychologyRuleMap={psychologyReportData.psychologyRuleMap}
            />
          </div>
        </div>
      </MainLayout>
    );
}

    

    


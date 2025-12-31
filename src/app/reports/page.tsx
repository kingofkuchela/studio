
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { calculatePeriodicPerformance, calculateHoldingTimeStats, calculateStreakStats, calculateMaxDrawdown, type PeriodicPerformance } from '@/lib/reportsCalculations';
import { generateCumulativePnlData, generateDailyPerformanceStats } from '@/lib/tradeCalculations';
import SummaryCard from '@/components/dashboard/SummaryCard';
import { TrendingUp, TrendingDown, ArrowRightLeft, Clock, Zap, Repeat, Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdvancedDateRangePicker from '@/components/shared/AdvancedDateRangePicker';
import type { DateRange, DayProps } from 'react-day-picker';
import { startOfDay, endOfDay, isBefore, isAfter, parseISO, format, differenceInCalendarMonths, startOfMonth, endOfMonth } from 'date-fns';
import type { DailyPerformanceStat, IndexType, PositionType, ExpiryType, RulesFollowedStatus, Formula, Edge, Trade } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { buttonVariants, Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import MultiSelectFilterDropdown from '@/components/shared/MultiSelectFilterDropdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const indexTypeOptions: { id: IndexType; name: IndexType }[] = [{ id: 'NIFTY', name: 'NIFTY' }, { id: 'SENSEX', name: 'SENSEX' }];
const positionTypeOptions: { id: PositionType; name: PositionType }[] = [{ id: 'Long', name: 'Long' }, { id: 'Short', name: 'Short' }];
const expiryTypeOptions: { id: ExpiryType; name: ExpiryType }[] = [{ id: 'Expiry', name: 'Expiry' }, { id: 'Non-Expiry', name: 'Non-Expiry' }];
const rulesFollowedFilterOptions: { id: RulesFollowedStatus; name: RulesFollowedStatus }[] = [{ id: 'RULES FOLLOW', name: 'RULES FOLLOW' }, { id: 'NOT FOLLOW', name: 'NOT FOLLOW' }, { id: 'PARTIALLY FOLLOW', name: 'PARTIALLY FOLLOW' }, { id: 'MISS THE ENTRY', name: 'MISS THE ENTRY' }];

// Helper function to determine the grid layout dimensions based on the number of months.
const getGridDimensions = (months: number): { cols: number; rows: number } => {
    if (months <= 1) return { cols: 1, rows: 1 };
    if (months <= 2) return { cols: 2, rows: 1 };
    if (months <= 3) return { cols: 3, rows: 1 };
    if (months <= 4) return { cols: 2, rows: 2 };
    if (months <= 6) return { cols: 3, rows: 2 };
    if (months <= 9) return { cols: 3, rows: 3 };
    if (months <= 12) return { cols: 4, rows: 3 }; 
    return { cols: 4, rows: 3 }; // Fallback for more than 12
};

// CustomDayContent for the calendar - now with dynamic sizing
function CustomDayContent(props: DayProps, dailyStats: Record<string, DailyPerformanceStat>, numberOfMonths: number) {
    const isOutsideMonth = props.displayMonth.getMonth() !== props.date.getMonth();
    
    if (isOutsideMonth) {
      return <div className="flex flex-col items-start justify-start text-left w-full h-full rounded-none bg-transparent" />;
    }

    const buttonProps = (props as any).buttonProps || {} as React.ButtonHTMLAttributes<HTMLButtonElement>;
    const dateStr = format(props.date, 'yyyy-MM-dd');
    const stat = dailyStats[dateStr];
    
    const isMedium = numberOfMonths >= 4;
    const isCompact = numberOfMonths >= 7;

    let dayBaseBackground = "bg-slate-100 dark:bg-slate-800/50";
    let pnlTextColor = "text-slate-700 dark:text-slate-300";
    let dateNumberColor = "text-slate-700 dark:text-slate-300";
    
    if (!props.disabled) {
      if (stat) {
        if (stat.pnl > 0) {
          dayBaseBackground = "bg-green-300 dark:bg-green-800/70";
          pnlTextColor = "text-green-900 dark:text-green-100";
          dateNumberColor = "text-green-800 dark:text-green-100";
        } else if (stat.pnl < 0) {
          dayBaseBackground = "bg-red-300 dark:bg-red-800/70";
          pnlTextColor = "text-red-900 dark:text-red-100";
          dateNumberColor = "text-red-800 dark:text-red-100";
        } else {
          dayBaseBackground = "bg-gray-300 dark:bg-gray-600/70";
          pnlTextColor = "text-gray-900 dark:text-gray-100";
          dateNumberColor = "text-gray-800 dark:text-gray-200";
        }
      } else {
        const dayOfWeek = props.date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          dayBaseBackground = "bg-sky-100 dark:bg-sky-900/60";
          dateNumberColor = "text-sky-800 dark:text-sky-200";
        }
      }
    } else {
      dayBaseBackground = "bg-muted/30 dark:bg-muted/20 opacity-60";
      dateNumberColor = "text-muted-foreground opacity-60";
    }

    return (
      <button
        {...buttonProps}
        type="button"
        className={cn(
          "flex flex-col items-start justify-start text-left w-full h-full rounded-none transition-colors duration-150 p-1",
          dayBaseBackground
        )}
        disabled={props.disabled}
      >
        <div className={cn(
            "font-medium leading-none",
            isCompact ? "text-[9px]" : isMedium ? "text-[10px]" : "text-xs",
            dateNumberColor
        )}>
          {format(props.date, 'd')}
        </div>
        {stat && (
          <div className="w-full text-right leading-tight mt-auto">
            <p className={cn("font-bold truncate", isCompact ? "text-xs" : isMedium ? "text-sm" : "text-base", pnlTextColor)}>
              {formatCurrency(stat.pnl, {maximumFractionDigits:0})}
            </p>
            <div className={cn("text-xs", isCompact ? "text-[8px]" : "text-[10px]", pnlTextColor, "opacity-90")}>
              <p>{stat.tradeCount}T</p>
            </div>
          </div>
        )}
      </button>
    );
}

export default function ReportsPage() {
    const { trades, edges, formulas, isLoading, tradingMode } = useAppContext();
    const allTrades = trades; // All trades for the current mode
    const activeFormulas = useMemo(() => formulas[tradingMode] || [], [formulas, tradingMode]);
    const activeEdges = useMemo(() => edges[tradingMode] || [], [edges, tradingMode]);


    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const today = new Date();
        return { from: startOfMonth(today), to: endOfMonth(today) };
    });
    const [periodType, setPeriodType] = useState<'daily' | 'monthly' | 'yearly'>('monthly');

    const [dailyStats, setDailyStats] = useState<Record<string, DailyPerformanceStat>>({});
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

    const entryFormulas = useMemo(() => activeFormulas.filter(f => f.type === 'normal-entry' || f.type === 'breakout-entry'), [activeFormulas]);
    const stopLossFormulas = useMemo(() => activeFormulas.filter(f => f.type === 'stop-loss'), [activeFormulas]);
    const targetFormulas = useMemo(() => activeFormulas.filter(f => f.type === 'target'), [activeFormulas]);
    const optionEdges = useMemo(() => activeEdges, [activeEdges]);

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
            if (selectedStopLossFormulaIds.length > 0 && !exclude.includes('stopLossFormulaId'))
                tempTrades = tempTrades.filter(t => t.stopLossFormulaIds?.some(id => selectedStopLossFormulaIds.includes(id)));
            if (selectedTargetFormulaIds.length > 0 && !exclude.includes('targetFormulaId'))
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
            const filtered = applyFilters(allTrades, exclude);
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
            preDateFilteredTrades: applyFilters(allTrades)
        };
    }, [
        allTrades, isLoading, activeEdges, activeFormulas, entryFormulas, stopLossFormulas, targetFormulas, optionEdges,
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
    
    useEffect(() => {
        if (!isLoading) {
            setDailyStats(generateDailyPerformanceStats(filteredTrades));
        }
    }, [filteredTrades, isLoading]);

    useEffect(() => {
        let months = 1;
        if (dateRange?.from && dateRange.to) {
            const diff = Math.abs(differenceInCalendarMonths(dateRange.to, dateRange.from)) + 1;
            months = diff > 12 ? 12 : diff < 1 ? 1 : diff;
        } else if (dateRange?.from) {
             months = 1;
        }
        setNumberOfMonths(months);
        setCalendarKey(Date.now());
    }, [dateRange]);

    const periodicPerformance = useMemo(() => calculatePeriodicPerformance(filteredTrades, periodType), [filteredTrades, periodType]);
    const holdingTimeStats = useMemo(() => calculateHoldingTimeStats(filteredTrades), [filteredTrades]);
    const streakStats = useMemo(() => calculateStreakStats(filteredTrades), [filteredTrades]);
    
    const cumulativePnlData = useMemo(() => generateCumulativePnlData(filteredTrades), [filteredTrades]);
    const drawdownInfo = useMemo(() => calculateMaxDrawdown(cumulativePnlData), [cumulativePnlData]);

    const handleResetAllFilters = () => {
        setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
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
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        onClick={handleResetAllFilters}
                        className="h-9 px-3 bg-accent text-accent-foreground border border-input hover:bg-accent/90">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Reset All Filters & Sorting</p></TooltipContent>
            </Tooltip>
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
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-10 w-1/4" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[120px]" />)}
                    </div>
                    <Skeleton className="h-[400px]" />
                    <Skeleton className="h-[500px]" />
                </div>
            </MainLayout>
        );
    }
    
    const formatPeriod = (period: string) => {
        if (periodType === 'daily') {
            try {
                return format(parseISO(period), 'MMM d, yyyy');
            } catch {
                return period;
            }
        }
        return period;
    }
    
    const getCurrentStreakText = () => {
        if (streakStats.currentStreakType === 'None' || streakStats.currentStreak === 0) {
            return "No active streak";
        }
        return `${streakStats.currentStreak} ${streakStats.currentStreakType}(s) in a row`;
    }

    const { cols, rows } = getGridDimensions(numberOfMonths);
    const monthStyle = {
        width: `calc(${100 / cols}% - 4px)`,
        height: `calc(${100 / rows}% - 4px)`,
        margin: '2px',
    };

    return (
        <MainLayout headerCenterContent={<ResetButton />} headerRightContent={filterBarContent}>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-headline font-bold">My Reports</h2>
                        <p className="text-muted-foreground mt-1">An overview of your trading performance and history.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    <SummaryCard title="Longest Win Streak" value={streakStats.longestWinStreak} icon={TrendingUp} size="compact" description="Consecutive winning trades" />
                    <SummaryCard title="Longest Loss Streak" value={streakStats.longestLossStreak} icon={TrendingDown} size="compact" description="Consecutive losing trades" />
                    <SummaryCard title="Current Streak" value={getCurrentStreakText()} icon={Repeat} size="compact" description={`Your current sequence of trades`} />
                    <SummaryCard title="Max Drawdown" value={formatCurrency(drawdownInfo.maxDrawdown)} icon={ArrowRightLeft} size="compact" description={`Peak was ${formatCurrency(drawdownInfo.peak)}`} valueClassName="text-red-600" />
                    <SummaryCard title="Avg. Win Hold Time" value={holdingTimeStats.avgWinHoldTime} icon={Clock} size="compact" description="Average duration of winning trades" />
                    <SummaryCard title="Avg. Loss Hold Time" value={holdingTimeStats.avgLossHoldTime} icon={Clock} size="compact" description="Average duration of losing trades" />
                </div>
                
                <Card className="shadow-lg">
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="font-headline text-xl">Periodic Performance Report</CardTitle>
                            <CardDescription>Your trading performance aggregated by day, month, or year.</CardDescription>
                        </div>
                        <Select value={periodType} onValueChange={(value: 'daily' | 'monthly' | 'yearly') => setPeriodType(value)}>
                             <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="capitalize">{periodType}</TableHead>
                                        <TableHead className="text-right">Gross P&L</TableHead>
                                        <TableHead className="text-right">Charges</TableHead>
                                        <TableHead className="text-right">Net P&L</TableHead>
                                        <TableHead className="text-right">Win Rate</TableHead>
                                        <TableHead className="text-right">Wins</TableHead>
                                        <TableHead className="text-right">Win Amt</TableHead>
                                        <TableHead className="text-right">Losses</TableHead>
                                        <TableHead className="text-right">Loss Amt</TableHead>
                                        <TableHead className="text-right">R:R</TableHead>
                                        <TableHead className="text-right">Profit Factor</TableHead>
                                        <TableHead className="text-right">Trades</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {periodicPerformance.length > 0 ? (
                                        periodicPerformance.map(item => (
                                            <TableRow key={item.period}>
                                                <TableCell className="font-medium">{formatPeriod(item.period)}</TableCell>
                                                <TableCell className={cn("text-right font-semibold", item.grossPnl > 0 ? 'text-green-600' : item.grossPnl < 0 ? 'text-red-600' : 'text-muted-foreground')}>
                                                    {formatCurrency(item.grossPnl)}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">({formatCurrency(item.totalCharges)})</TableCell>
                                                <TableCell className={cn("text-right font-bold", item.netPnl > 0 ? 'text-green-600' : 'text-red-600')}>
                                                    {formatCurrency(item.netPnl)}
                                                </TableCell>
                                                <TableCell className="text-right">{item.winRate.toFixed(1)}%</TableCell>
                                                <TableCell className="text-right text-green-600">{item.wins}</TableCell>
                                                <TableCell className="text-right text-green-600">{formatCurrency(item.grossProfit)}</TableCell>
                                                <TableCell className="text-right text-red-600">{item.losses}</TableCell>
                                                <TableCell className="text-right text-red-600">({formatCurrency(item.grossLoss)})</TableCell>
                                                <TableCell className="text-right">{isFinite(item.riskRewardRatio) ? item.riskRewardRatio.toFixed(2) : '∞'}</TableCell>
                                                <TableCell className="text-right">{isFinite(item.profitFactor) ? item.profitFactor.toFixed(2) : "∞"}</TableCell>
                                                <TableCell className="text-right">{item.tradeCount}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={12} className="h-24 text-center">
                                                No trades found for the selected period.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                 <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-primary"/>
                            Calendar Report
                        </CardTitle>
                        <CardDescription>Visual overview of your daily performance. Select a range above to view multiple months.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 aspect-video overflow-hidden">
                        <div key={calendarKey} className="h-full w-full">
                            <Calendar
                                mode="range"
                                month={dateRange?.from || new Date()}
                                selected={dateRange}
                                onSelect={setDateRange}
                                disabled={isLoading}
                                numberOfMonths={numberOfMonths}
                                styles={{ month: monthStyle }}
                                formatters={{
                                    formatWeekdayName: (date: Date) => format(date, numberOfMonths > 4 ? 'EEEEE' : 'EEE'),
                                }}
                                components={{
                                    IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                                    IconRight: () => <ChevronRight className="h-4 w-4" />,
                                    Day: (props) => CustomDayContent(props, dailyStats, numberOfMonths),
                                }}
                                className="p-0 size-full"
                                classNames={{
                                    months: `flex flex-wrap content-start h-full w-full`,
                                    month: "flex flex-col border border-border/50 rounded-md",
                                    table: "w-full border-separate border-spacing-0 flex-grow flex flex-col",
                                    caption: cn("flex justify-center relative items-center", numberOfMonths > 9 ? "pt-0 pb-0" : "pt-0 pb-1"),
                                    caption_label: cn("font-headline", numberOfMonths > 9 ? "text-[9px]" : numberOfMonths > 6 ? "text-[10px]" : "text-xs"),
                                    nav: "space-x-0 flex items-center",
                                    nav_button: cn(buttonVariants({ variant: "outline" }), "bg-transparent p-0 opacity-50 hover:opacity-100 focus-visible:ring-0 rounded-sm", numberOfMonths > 9 ? "h-4 w-4" : "h-5 w-5"),
                                    nav_button_previous: "absolute left-0.5",
                                    nav_button_next: "absolute right-0.5",
                                    head_row: "flex w-full",
                                    head_cell: cn("text-center text-muted-foreground rounded-none w-full font-semibold p-0", numberOfMonths > 9 ? "text-[8px]" : numberOfMonths > 6 ? "text-[9px]" : "text-[10px]"),
                                    row: "flex w-full flex-1",
                                    cell: cn("p-px relative rounded-none flex-1 flex"),
                                    day: cn("w-full h-full", "rounded-none", "focus-visible:ring-0", "flex"),
                                    day_selected: "!bg-primary !text-primary-foreground",
                                    day_today: "ring-1 ring-primary",
                                    day_disabled: "pointer-events-none text-muted-foreground opacity-50",
                                    day_outside: "invisible",
                                }}
                                showOutsideDays={false}
                                fixedWeeks
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}


"use client";

import React, { useMemo, useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import { HeartPulse, TrendingUp, TrendingDown, Percent, BrainCircuit, RotateCcw, CheckCircle, XCircle, AlertTriangle, GitCompareArrows, Sigma, DollarSign, LineChart, BarChart3, Bot } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import type { Trade, Edge, Formula, IndexType, PositionType, ExpiryType, RulesFollowedStatus, PsychologyRule } from '@/types';
import AdvancedDateRangePicker from '@/components/shared/AdvancedDateRangePicker';
import { startOfDay, endOfDay, isBefore, isAfter, parseISO, startOfMonth, endOfMonth, format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import MultiSelectFilterDropdown from '@/components/shared/MultiSelectFilterDropdown';
import { Button } from '@/components/ui/button';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CandlestickShape } from '@/components/shared/CandlestickChartComponents';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


const PsychologyDivergenceCard = ({ title, icon: Icon, stats, iconBgColor }: { title: string, icon: React.ElementType, stats: any, iconBgColor: string }) => {
    return (
        <Card className="shadow-lg">
            <CardHeader className="pb-2">
                <CardTitle className="font-headline text-lg flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-full", iconBgColor)}>
                       <Icon className="h-5 w-5 text-white" />
                    </div>
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
                 <div className="text-center bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-muted-foreground">DIVERGENCE</p>
                    <p className={cn("text-2xl font-bold", stats.divergence >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatCurrency(stats.divergence)}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center bg-background p-3 rounded-lg border">
                        <p className="text-xs font-semibold text-muted-foreground">Real P&amp;L</p>
                        <p className={cn("text-lg font-semibold", stats.realPnl >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(stats.realPnl)}
                        </p>
                    </div>
                    <div className="text-center bg-background p-3 rounded-lg border">
                        <p className="text-xs font-semibold text-muted-foreground">Theoretical P&amp;L</p>
                        <p className={cn("text-lg font-semibold", stats.theoreticalPnl >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(stats.theoreticalPnl)}
                        </p>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground text-center pt-2">Based on {stats.count} trades ({stats.winRate.toFixed(1)}% Win Rate)</p>
            </CardContent>
        </Card>
    );
};

const rulesFollowedFilterOptions: { id: RulesFollowedStatus; name: RulesFollowedStatus }[] = [
  { id: 'RULES FOLLOW', name: 'RULES FOLLOW' },
  { id: 'NOT FOLLOW', name: 'NOT FOLLOW' },
  { id: 'PARTIALLY FOLLOW', name: 'PARTIALLY FOLLOW' },
  { id: 'MISS THE ENTRY', name: 'MISS THE ENTRY' },
];

interface PsychologyErrorStats {
  id: string;
  name: string;
  count: number;
  realPnl: number;
  theoreticalPnl: number;
  divergencePnl: number;
  wins: number;
  losses: number;
  fill: string;
}

interface CumulativeScoreDataPoint {
    date: string;
    score: number;
}

interface PsychologicalCandleData {
  tradeId: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  pnl: number;
  symbol: string;
  body: [number, number];
  fill: string;
  stroke: string;
}

const PsychologicalCandleTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as PsychologicalCandleData;
        return (
            <div className="p-2 bg-background/90 border rounded-lg shadow-lg text-xs">
                <p className="font-bold text-foreground mb-1">{data.symbol} - {format(parseISO(data.date), 'MMM d, p')}</p>
                <p><span className="font-semibold">P&amp;L:</span> <span className={cn(data.pnl >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(data.pnl)}</span></p>
                 <p className="text-muted-foreground"><span className="font-medium">Open Score:</span> {data.open}</p>
                 <p className="text-muted-foreground"><span className="font-medium">High Score:</span> {data.high}</p>
                 <p className="text-muted-foreground"><span className="font-medium">Low Score:</span> {data.low}</p>
                 <p className="text-muted-foreground"><span className="font-medium">Close Score:</span> {data.close}</p>
            </div>
        );
    }
    return null;
};


export default function PsychologyDashboardPage() {
    const { allTrades, edges, formulas, psychologyRules, isLoading, tradingMode } = useAppContext();

    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const today = new Date();
        return { from: startOfMonth(today), to: endOfMonth(today) };
    });
    const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
    const [selectedPsychologyErrorIds, setSelectedPsychologyErrorIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'technical' | 'emotional'>('technical');
    const [selectedRulesFollowedStatusIds, setSelectedRulesFollowedStatusIds] = useState<RulesFollowedStatus[]>([]);
    const [entryMissScore, setEntryMissScore] = useState<-10|-5|0>(-10);
    const [isEntryMissFilter, setIsEntryMissFilter] = useState(false);

    useEffect(() => {
        setIsEntryMissFilter(selectedRulesFollowedStatusIds.includes('MISS THE ENTRY'));
    }, [selectedRulesFollowedStatusIds]);


    const baseTrades = useMemo(() => {
        return {
            real: [...(allTrades.real || [])],
            theoretical: [...(allTrades.theoretical || [])],
        }
    }, [allTrades]);

    const activeEdges = useMemo(() => {
        const combined = [...(edges.real || []), ...(edges.theoretical || [])];
        return Array.from(new Map(combined.map(e => [e.id, e])).values());
    }, [edges]);

    const technicalErrorOptions = useMemo(() => psychologyRules.filter(r => r.category === 'TECHNICAL ERRORS'), [psychologyRules]);
    const emotionOptions = useMemo(() => psychologyRules.filter(r => r.category === 'EMOTIONS'), [psychologyRules]);

    const filteredBaseTrades = useMemo(() => {
        const filterTrades = (trades: Trade[]) => {
            if (!trades) return [];
            let tempTrades = trades.filter(trade => trade.outcome !== 'Open' && !!trade.exitTime);

            if (dateRange?.from || dateRange?.to) {
                tempTrades = tempTrades.filter(trade => {
                    const tradeDate = parseISO(trade.exitTime!);
                    const fromOk = dateRange.from ? !isBefore(tradeDate, startOfDay(dateRange.from)) : true;
                    const toOk = dateRange.to ? !isAfter(tradeDate, endOfDay(dateRange.to)) : true;
                    return fromOk && toOk;
                });
            }
            if (selectedStrategyIds.length > 0) tempTrades = tempTrades.filter(t => t.strategyId && selectedStrategyIds.includes(t.strategyId));
            
            // Apply rules followed filter, but let psychology filters handle more specific cases
            if (selectedRulesFollowedStatusIds.length > 0) {
                tempTrades = tempTrades.filter(t => t.rulesFollowed && selectedRulesFollowedStatusIds.includes(t.rulesFollowed));
            }

            return tempTrades;
        }

        return {
            real: filterTrades(baseTrades.real),
            theoretical: filterTrades(baseTrades.theoretical)
        };
    }, [baseTrades, dateRange, selectedStrategyIds, selectedRulesFollowedStatusIds]);

    const tradesForTable = useMemo(() => {
        let sourceTrades: Trade[];

        // Start with the correct set of trades based on the primary filters.
        if (isEntryMissFilter) {
            // For ENTRY MISS, we only care about theoretical trades that were missed.
            sourceTrades = filteredBaseTrades.theoretical.filter(t => t.rulesFollowed === 'MISS THE ENTRY');
        } else if (tradingMode === 'theoretical') {
            sourceTrades = filteredBaseTrades.theoretical || [];
        } else {
             // For all other cases, we analyze the Real trades.
            sourceTrades = filteredBaseTrades.real || [];
        }

        // Now, if a specific psychological error is selected, further filter the list.
        if (selectedPsychologyErrorIds.length > 0) {
            const errorType = activeTab === 'technical' ? 'technicalErrorIds' : 'emotionIds';
            return sourceTrades.filter(t =>
                t[errorType]?.some(id => selectedPsychologyErrorIds.includes(id))
            );
        }
        
        // If no specific error is selected, return the list based on the initial filters.
        return sourceTrades;
    }, [isEntryMissFilter, filteredBaseTrades, selectedPsychologyErrorIds, activeTab, tradingMode]);

    const totalStats = useMemo(() => {
        const tradesToCount = tradesForTable;
        const totalTrades = tradesToCount.length;
        const wins = tradesToCount.filter(t => t.pnl && t.pnl > 0).length;
        const losses = tradesToCount.filter(t => t.pnl && t.pnl < 0).length;
        const pnl = tradesToCount.reduce((acc, t) => acc + (t.pnl || 0), 0);

        return { totalTrades, wins, losses, pnl };
    }, [tradesForTable]);
    
    const divergenceStats = useMemo(() => {
      const createInitialStat = () => ({ realPnl: 0, theoreticalPnl: 0, count: 0, wins: 0, losses: 0, winRate: 0, divergence: 0 });

      const stats = createInitialStat();
      const tradesToAnalyze = tradesForTable;
      const theoTradeMap = new Map(filteredBaseTrades.theoretical.map(t => [t.id, t]));

      tradesToAnalyze.forEach(trade => {
        const correspondingTheo = theoTradeMap.get(trade.id);
        const realPnl = trade.pnl ?? 0;
        const theoPnl = correspondingTheo?.pnl ?? (isEntryMissFilter ? realPnl : 0);

        stats.realPnl += realPnl;
        stats.theoreticalPnl += theoPnl;
        stats.count++;
        if (realPnl > 0) stats.wins++;
        if (realPnl < 0) stats.losses++;
      });
      
      stats.winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
      stats.divergence = stats.realPnl - stats.theoreticalPnl;
      
      return stats;

    }, [tradesForTable, filteredBaseTrades.theoretical, isEntryMissFilter]);


    const psychologyErrorChartData = useMemo((): PsychologyErrorStats[] => {
        const counts: Record<string, {
            id: string;
            name: string;
            realPnl: number;
            theoreticalPnl: number;
            wins: number;
            losses: number;
            count: number;
        }> = {};
        
        const sourceTrades = isEntryMissFilter ? filteredBaseTrades.theoretical.filter(t => t.rulesFollowed === 'MISS THE ENTRY') : filteredBaseTrades.real;
        const theoTradeMap = new Map(baseTrades.theoretical.map(t => [t.id, t]));

        if (!sourceTrades) return [];
    
        sourceTrades.forEach(trade => {
            const allErrors = new Set([...(trade.technicalErrorIds || []), ...(trade.emotionIds || [])]);
            if (trade.rulesFollowed) {
                allErrors.add(trade.rulesFollowed);
            }
            allErrors.forEach(errorIdOrStatus => {
                const rule = psychologyRules.find(r => r.id === errorIdOrStatus);
                const ruleName = rule ? rule.text : (rulesFollowedFilterOptions.some(r => r.id === errorIdOrStatus) ? errorIdOrStatus : null);

                if (ruleName) {
                    if (!counts[ruleName]) {
                        counts[ruleName] = { id: rule ? rule.id : errorIdOrStatus, name: ruleName, realPnl: 0, theoreticalPnl: 0, wins: 0, losses: 0, count: 0 };
                    }
                    const realPnl = trade.pnl ?? 0;
                    const correspondingTheo = theoTradeMap.get(trade.id);
                    const theoPnl = correspondingTheo?.pnl ?? realPnl;

                    counts[ruleName].count++;
                    counts[ruleName].realPnl += realPnl;
                    counts[ruleName].theoreticalPnl += theoPnl;
                    if (realPnl > 0) counts[ruleName].wins++;
                    if (realPnl < 0) counts[ruleName].losses++;
                }
            });
        });
    
        const techColors = ["hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(210 80% 60%)", "hsl(280 65% 60%)"];
        const emotionColors = ["hsl(340 80% 60%)", "hsl(300 80% 60%)", "hsl(0 80% 60%)", "hsl(260 80% 60%)"];
    
        return Object.values(counts)
          .map(item => {
            const rule = psychologyRules.find(r => r.id === item.id);
            let fill = 'hsl(var(--muted-foreground))';
            if (item.name === "MISS THE ENTRY") fill = 'hsl(330, 80%, 60%)';
            else if (rule) {
              const isTechnical = rule.category === 'TECHNICAL ERRORS';
              const isEmotional = rule.category === 'EMOTIONS';
              if (rule.text === "No Technical Errors" || rule.text === "No - Emotions") fill = 'hsl(var(--chart-1))'; 
              else if (isTechnical) fill = techColors[technicalErrorOptions.findIndex(r => r.id === rule.id) % techColors.length];
              else if (isEmotional) fill = emotionColors[emotionOptions.findIndex(r => r.id === rule.id) % emotionColors.length];
            } else if (rulesFollowedFilterOptions.some(r => r.id === item.name)) {
                if (item.name === "RULES FOLLOW") fill = 'hsl(var(--chart-1))';
                else if (item.name === "NOT FOLLOW") fill = 'hsl(var(--destructive))';
                else if (item.name === "PARTIALLY FOLLOW") fill = 'hsl(48 96% 51%)';
            }
            return {
                ...item,
                divergencePnl: item.realPnl - item.theoreticalPnl,
                pnl: item.realPnl, // Legacy 'pnl' field for existing tooltips that might use it
                fill
            };
          })
          .sort((a, b) => b.count - a.count);
    }, [filteredBaseTrades, isEntryMissFilter, psychologyRules, technicalErrorOptions, emotionOptions, baseTrades.theoretical]);


    const cumulativeScoreData = useMemo((): CumulativeScoreDataPoint[] => {
        let tradesToScore = isEntryMissFilter
          ? [...filteredBaseTrades.theoretical.filter(t => t.rulesFollowed === 'MISS THE ENTRY')]
          : [...(filteredBaseTrades.real || [])];

        if (selectedPsychologyErrorIds.length > 0) {
            const errorType = activeTab === 'technical' ? 'technicalErrorIds' : 'emotionIds';
            tradesToScore = tradesToScore.filter(t =>
                t[errorType]?.some(id => selectedPsychologyErrorIds.includes(id))
            );
        }
          
        const sortedTrades = tradesToScore
            .filter(trade => trade.rulesFollowed && trade.exitTime)
            .sort((a, b) => parseISO(a.exitTime!).getTime() - parseISO(b.exitTime!).getTime());

        let cumulativeScore = 0;
        return sortedTrades.map(trade => {
            switch (trade.rulesFollowed) {
                case 'RULES FOLLOW':
                    cumulativeScore += 10;
                    break;
                case 'NOT FOLLOW':
                    cumulativeScore -= 10;
                    break;
                case 'MISS THE ENTRY':
                    cumulativeScore += entryMissScore;
                    break;
                case 'PARTIALLY FOLLOW':
                case 'Divergence Flow':
                    cumulativeScore -= 5;
                    break;
                default:
                    break;
            }
            return {
                date: trade.exitTime!,
                score: cumulativeScore,
            };
        });
    }, [filteredBaseTrades, isEntryMissFilter, entryMissScore, selectedPsychologyErrorIds, activeTab]);
    
    const psychologicalCandleData = useMemo((): PsychologicalCandleData[] => {
        const tradeSource = isEntryMissFilter
            ? filteredBaseTrades.theoretical.filter(t => t.rulesFollowed === 'MISS THE ENTRY')
            : filteredBaseTrades.real;

        let tradesToAnalyze = tradeSource ? [...tradeSource] : [];
        
        if (selectedPsychologyErrorIds.length > 0) {
            const errorType = activeTab === 'technical' ? 'technicalErrorIds' : 'emotionIds';
            tradesToAnalyze = tradesToAnalyze.filter(t =>
                t[errorType]?.some(id => selectedPsychologyErrorIds.includes(id))
            );
        }

        const sortedTrades = tradesToAnalyze
            .filter(trade => trade.rulesFollowed && trade.exitTime)
            .sort((a, b) => parseISO(a.exitTime!).getTime() - parseISO(b.exitTime!).getTime());
        
        let cumulativeScore = 0;
    
        return sortedTrades.map(trade => {
            const open = cumulativeScore;
            let scoreChange = 0;
            let fill = 'hsl(var(--muted-foreground))';
            let stroke = fill;
    
            switch (trade.rulesFollowed) {
                case 'RULES FOLLOW':
                    scoreChange = 10 * 28800; 
                    fill = 'hsl(var(--chart-1))'; 
                    stroke = fill;
                    break;
                case 'NOT FOLLOW':
                    scoreChange = -10 * 28800; 
                    fill = 'hsl(var(--destructive))'; 
                    stroke = fill;
                    break;
                case 'MISS THE ENTRY':
                    scoreChange = entryMissScore * 28800; 
                    fill = 'hsl(330, 80%, 60%)';
                    stroke = fill;
                    break;
                case 'PARTIALLY FOLLOW':
                case 'Divergence Flow':
                    scoreChange = -5 * 28800; 
                    fill = 'hsl(48 96% 51%)'; 
                    stroke = fill;
                    break;
            }
            const close = open + scoreChange;
            
            const candle: PsychologicalCandleData = {
                tradeId: trade.id,
                date: trade.exitTime!,
                open: open,
                high: Math.max(open, close),
                low: Math.min(open, close),
                close: close,
                pnl: trade.pnl ?? 0,
                symbol: trade.symbol || '',
                body: [Math.min(open, close), Math.max(open, close)],
                fill: fill,
                stroke: stroke,
            };
            
            cumulativeScore = close;
            return candle;
        });
    }, [filteredBaseTrades, isEntryMissFilter, entryMissScore, selectedPsychologyErrorIds, activeTab]);

    const currentVisibleChartData = useMemo(() => {
        let chartData = psychologyErrorChartData;
      
        const activeRuleIds = new Set(
          (activeTab === 'technical' ? technicalErrorOptions : emotionOptions).map(r => r.id)
        );

        chartData = chartData.filter(d => activeRuleIds.has(d.id));

        if (selectedPsychologyErrorIds.length > 0) {
            chartData = chartData.filter(d => selectedPsychologyErrorIds.includes(d.id));
        }

        return chartData;
    }, [activeTab, psychologyErrorChartData, selectedPsychologyErrorIds, technicalErrorOptions, emotionOptions]);

    const handleResetAllFilters = () => {
        setDateRange(undefined);
        setSelectedStrategyIds([]);
        setSelectedPsychologyErrorIds([]);
        setSelectedRulesFollowedStatusIds([]);
    };

    if (isLoading) {
        return (
            <MainLayout><Skeleton className="h-screen w-full" /></MainLayout>
        );
    }
    
    const activePsychologyOptions = activeTab === 'technical' 
        ? technicalErrorOptions.map(o => ({id: o.id, name: o.text}))
        : emotionOptions.map(o => ({id: o.id, name: o.text}));

    const filterBarContent = (
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as 'technical' | 'emotional');
            setSelectedPsychologyErrorIds([]);
        }}>
            <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="emotional">Emotional</TabsTrigger>
            </TabsList>
        </Tabs>
        <MultiSelectFilterDropdown
            filterNameSingular={activeTab === 'technical' ? "Tech Error" : "Emotion"}
            filterNamePlural={activeTab === 'technical' ? "Tech Errors" : "Emotions"}
            options={activePsychologyOptions}
            selectedIds={selectedPsychologyErrorIds}
            onSelectionChange={setSelectedPsychologyErrorIds}
        />
        <MultiSelectFilterDropdown
            filterNameSingular="Rule Status"
            filterNamePlural="Rule Statuses"
            options={rulesFollowedFilterOptions}
            selectedIds={selectedRulesFollowedStatusIds}
            onSelectionChange={setSelectedRulesFollowedStatusIds as (ids: string[]) => void}
        />
        <MultiSelectFilterDropdown filterNameSingular="Edge" filterNamePlural="Edges" options={activeEdges} selectedIds={selectedStrategyIds} onSelectionChange={setSelectedStrategyIds} />
        <AdvancedDateRangePicker value={dateRange} onValueChange={setDateRange} />
      </div>
    );
    
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload as PsychologyErrorStats;
        return (
          <div className="p-2 bg-background/90 border rounded-lg shadow-lg text-xs space-y-1">
            <p className="font-bold text-foreground mb-1">{label}</p>
            <p><span className="font-semibold">Trades:</span> {data.count} ({data.wins}W / {data.losses}L)</p>
            <p><span className="font-semibold">Real P&L:</span> <span className={cn(data.realPnl >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(data.realPnl)}</span></p>
            <p><span className="font-semibold">Theoretical P&L:</span> <span className={cn(data.theoreticalPnl >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(data.theoreticalPnl)}</span></p>
            <p><span className="font-semibold">Divergence:</span> <span className={cn(data.divergencePnl >= 0 ? "text-green-500" : "text-red-500")}>{formatCurrency(data.divergencePnl)}</span></p>
          </div>
        );
      }
      return null;
    };
    
    const CumulativeScoreTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-2 bg-background/90 border rounded-lg shadow-lg text-xs">
                    <p className="font-bold text-foreground mb-1">{format(parseISO(label), 'MMM d, yyyy')}</p>
                    <p><span className="font-semibold">Score:</span> {payload[0].value}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <MainLayout headerRightContent={filterBarContent}>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-headline font-bold flex items-center gap-3">
                            <HeartPulse className="h-8 w-8 text-primary" />
                            Psychology Dashboard
                        </h2>
                        <p className="text-muted-foreground mt-1">Analyze the impact of your mindset on your trading performance.</p>
                    </div>
                     <Button onClick={handleResetAllFilters} variant="outline"><RotateCcw className="mr-2 h-4 w-4" />Reset Filters</Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="font-headline text-lg flex items-center gap-3">
                                <Sigma className="h-5 w-5 text-primary" />
                                {selectedPsychologyErrorIds.length > 0 ? "Filtered Trade Summary" : "Overall Trade Summary"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-2">
                             <div className="text-center bg-muted/50 p-3 rounded-lg">
                                <p className="text-xs font-semibold text-muted-foreground">TOTAL P&L</p>
                                <p className={cn("text-3xl font-bold", totalStats.pnl >= 0 ? "text-green-600" : "text-red-600")}>
                                    {formatCurrency(totalStats.pnl)}
                                </p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center bg-background p-3 rounded-lg border">
                                    <p className="text-xs font-semibold text-muted-foreground">Total</p>
                                    <p className="text-lg font-semibold">{totalStats.totalTrades}</p>
                                </div>
                                <div className="text-center bg-background p-3 rounded-lg border">
                                    <p className="text-xs font-semibold text-muted-foreground">Wins</p>
                                    <p className="text-lg font-semibold text-green-600">{totalStats.wins}</p>
                                </div>
                                <div className="text-center bg-background p-3 rounded-lg border">
                                    <p className="text-xs font-semibold text-muted-foreground">Losses</p>
                                    <p className="text-lg font-semibold text-red-600">{totalStats.losses}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <PsychologyDivergenceCard title="Divergence" icon={GitCompareArrows} stats={divergenceStats} iconBgColor="bg-orange-500" />
                </div>
                
                 <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl flex items-center gap-3"><LineChart className="h-6 w-6 text-primary"/>Cumulative Psychological Score</CardTitle>
                        <CardDescription>Tracks your discipline over time. (+10 for following rules, -10 for not following, -5 for partial).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {cumulativeScoreData.length > 1 ? (
                            <ChartContainer config={{}} className="h-[300px] w-full">
                                <AreaChart data={cumulativeScoreData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tickFormatter={(str) => format(parseISO(str), 'MMM d')} />
                                    <YAxis />
                                    <Tooltip content={<CumulativeScoreTooltip />} />
                                    <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                                </AreaChart>
                            </ChartContainer>
                        ) : (
                             <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                <p>Not enough data to display the cumulative score chart.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                 <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="font-headline text-xl flex items-center gap-3"><BarChart3 className="h-6 w-6 text-primary" />Cumulative Psychological Candlestick</CardTitle>
                                <CardDescription>Trade-by-trade visualization of your cumulative discipline score.</CardDescription>
                            </div>
                            <RadioGroup value={String(entryMissScore)} onValueChange={(v) => setEntryMissScore(Number(v) as -10 | -5 | 0)} className="flex items-center gap-3">
                                <Label>Entry Miss Score:</Label>
                                {[-10, -5, 0].map(val => (
                                    <div key={val} className="flex items-center space-x-2">
                                        <RadioGroupItem value={String(val)} id={`score-${val}`} />
                                        <Label htmlFor={`score-${val}`}>{val}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {psychologicalCandleData.length > 0 ? (
                           <ChartContainer config={{}} className="h-[350px] w-full">
                                <ComposedChart data={psychologicalCandleData} margin={{ left: 0, right: 12, top: 5, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tickFormatter={(str) => format(parseISO(str), 'p')} />
                                    <YAxis domain={[-15000, 15000]} />
                                    <Tooltip content={<PsychologicalCandleTooltip />} />
                                    <Bar dataKey="body" stroke="hsl(var(--border))">
                                      {psychologicalCandleData.map((d, i) => (
                                        <Cell key={`cell-${i}`} fill={d.fill} stroke={d.stroke} />
                                      ))}
                                    </Bar>
                                </ComposedChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                                <p>No trades with rule status in the selected period.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2 shadow-lg">
                      <Card>
                        <CardHeader>
                            <CardTitle>Psychology Distribution</CardTitle>
                            <CardDescription>Percentage breakdown of specific errors in the filtered trades.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {currentVisibleChartData.length > 0 ? (
                                <ChartContainer config={{}} className="h-[250px] w-full">
                                    <PieChart>
                                        <Pie data={currentVisibleChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name.substring(0,15)}... ${(percent * 100).toFixed(0)}%`} >
                                            {currentVisibleChartData.map((entry) => (
                                                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <UITooltip content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return <div className="p-2 bg-background/90 border rounded-lg shadow-lg text-xs"><p className="font-bold">{`${payload[0].name}: ${payload[0].value} trades`}</p></div>;
                                            }
                                            return null;
                                        }}/>
                                    </PieChart>
                                </ChartContainer>
                             ) : (
                                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                                    <p>No psychological data for the current selection.</p>
                                </div>
                             )}
                        </CardContent>
                      </Card>
                    </div>
                     <Card className="lg:col-span-3 shadow-lg">
                        <CardHeader>
                            <CardTitle>Psychological Error Breakdown</CardTitle>
                            <CardDescription>Total count and P&amp;L impact of trades affected by each psychological error.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {currentVisibleChartData.length > 0 ? (
                                <ChartContainer config={{}} className="h-[250px] w-full">
                                    <BarChart data={currentVisibleChartData} layout="vertical" margin={{ left: 120 }}>
                                        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{fontSize: 12, width: 200}} width={120} />
                                        <XAxis type="number" dataKey="count" allowDecimals={false} />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(var(--muted))' }}
                                            content={<CustomTooltip />}
                                        />
                                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                            {currentVisibleChartData.map((entry) => (
                                                <Cell key={entry.name} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            ) : (
                                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                                    <p>No trades with this type of psychological error in the selected period.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card className="shadow-lg">
                    <CardHeader><CardTitle>Filtered Trades</CardTitle><CardDescription>All trades matching the current filter criteria.</CardDescription></CardHeader>
                    <CardContent>
                         <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Symbol</TableHead>
                                        <TableHead>Tech Errors</TableHead>
                                        <TableHead>Emotions</TableHead>
                                        <TableHead className="text-right">Real P&amp;L</TableHead>
                                        <TableHead className="text-right">Theoretical P&amp;L</TableHead>
                                        <TableHead className="text-right">Divergence P&amp;L</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tradesForTable.length > 0 ? 
                                    tradesForTable.map(trade => {
                                        const theoTrade = filteredBaseTrades.theoretical.find(t => t.id === trade.id);
                                        const realPnl = trade.pnl ?? 0;
                                        const theoPnl = theoTrade?.pnl ?? realPnl; // Fallback to realPnl if no theo trade
                                        const divergencePnl = realPnl - theoPnl;

                                        return (
                                        <TableRow key={trade.id}>
                                            <TableCell>{trade.exitTime ? format(parseISO(trade.exitTime), 'MMM d, yyyy') : 'Open'}</TableCell>
                                            <TableCell>{trade.symbol}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {(trade.technicalErrorIds || []).map(id => (
                                                        <Badge key={id} variant="outline">{technicalErrorOptions.find(o=>o.id===id)?.text || 'Unknown'}</Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                             <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {(trade.emotionIds || []).map(id => (
                                                        <Badge key={id} variant="outline" className="bg-amber-100 dark:bg-amber-900/50">{emotionOptions.find(o=>o.id===id)?.text || 'Unknown'}</Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn("text-right font-semibold", realPnl >= 0 ? "text-green-600" : "text-red-600")}>
                                                {formatCurrency(realPnl)}
                                            </TableCell>
                                            <TableCell className={cn("text-right font-semibold", theoPnl >= 0 ? "text-green-600" : "text-red-600")}>
                                                {formatCurrency(theoPnl)}
                                            </TableCell>
                                            <TableCell className={cn("text-right font-semibold", divergencePnl >= 0 ? "text-green-600" : "text-red-600")}>
                                                {formatCurrency(divergencePnl)}
                                            </TableCell>
                                        </TableRow>
                                    )}) : <TableRow><TableCell colSpan={7} className="text-center h-24">No trades match the selected filters.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                         </div>
                    </CardContent>
                </Card>

            </div>
        </MainLayout>
    );
}


"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Settings, GitCommitHorizontal, PlusCircle, Trash2, CalendarIcon, AlertTriangle, Check, Edit2, BarChartHorizontal, Clock, ArrowDown, TrendingUp, TrendingDown, Copy, ChevronLeft, ChevronRight, MoreHorizontal, Bell, BellOff, BellRing, RefreshCw, XCircle } from 'lucide-react';
import { format, parseISO, startOfToday, isToday, eachDayOfInterval, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, isBefore, isAfter, differenceInCalendarMonths, startOfDay, endOfToday, isSameDay, addDays } from 'date-fns';
import { useAppContext } from '@/contexts/AppContext';
import type { TimeBlock, DailyPlan, TradingFlow, Edge, Formula, GlobalEvent, GlobalEventType, Btst } from '@/types';
import { useToast } from '@/hooks/use-toast';
import EdgeCard from '@/components/strategy/EdgeCard';
import MainLayout from '@/components/layout/MainLayout';
import PlanSettingsDialog from '@/components/link/PlanSettingsDialog';
import DeleteConfirmationDialog from '@/components/shared/DeleteConfirmationDialog';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import type { DateRange, DayProps } from 'react-day-picker';
import AdvancedDateRangePicker from '@/components/shared/AdvancedDateRangePicker';
import { Badge } from '@/components/ui/badge';
import AddEventDialog from '@/components/shared/AddEventDialog';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


const getConditionName = (block: TimeBlock, conditionMap: Map<string, string>, dateKey: string): string => {
    const overrideId = block.dailyOverrides?.[dateKey];
    const conditionIdToShow = overrideId || block.conditionId;

    if (block.conditionType === 'Custom') {
        return block.customConditionName || "Custom";
    }
    return conditionMap.get(conditionIdToShow) || "N/A";
}

const getEventColor = (type: GlobalEventType) => {
    switch (type) {
        case 'High Impact': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300 dark:border-red-700';
        case 'Medium Impact': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 border-orange-300 dark:border-orange-700';
        case 'Low Impact': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700';
        case 'Holiday': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-300 dark:border-blue-700';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
};

const RecurringBlockCard = ({ 
    block, 
    onEdit, 
    onDelete, 
    conditionMap, 
    isDue,
    onConfirm,
    conditionOptions,
    confirmedConditionId,
    onDoubleClick
}: { 
    block: TimeBlock, 
    onEdit: (block: TimeBlock) => void, 
    onDelete: (block: TimeBlock) => void, 
    conditionMap: Map<string, string>,
    isDue: boolean,
    onConfirm: (block: TimeBlock, conditionId: string) => void,
    conditionOptions: {id: string; name: string}[];
    confirmedConditionId?: string;
    onDoubleClick: (block: TimeBlock) => void;
}) => {
    const [selectedCondition, setSelectedCondition] = useState<string>('');
    const [isEditingConfirmation, setIsEditingConfirmation] = useState(false);

    useEffect(() => {
        // Reset editing state when the block or its confirmation changes
        setIsEditingConfirmation(false);
    }, [block.id, confirmedConditionId]);

    const handleConfirm = () => {
        if(selectedCondition) {
            onConfirm(block, selectedCondition);
            setIsEditingConfirmation(false);
        }
    }

    const isConfirmed = !!confirmedConditionId && !isEditingConfirmation;
    const isEditing = (isDue || isEditingConfirmation) && !isConfirmed;

    const getConditionTypeLabel = (type: TimeBlock['conditionType']): string => {
        if (type === 'E(15)') return 'E(15)';
        if (type === 'E(5)') return 'E(5)';
        if (type === 'BREAK SIDE') return 'Break Side';
        return type || 'N/A';
    };

    const cardBgColor = isConfirmed
        ? "bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600"
        : isEditing
        ? "bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-600"
        : "bg-muted/50";

    return (
        <div 
            className={cn("p-3 rounded-lg border transition-all duration-300", cardBgColor)}
            onDoubleClick={() => onDoubleClick(block)}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-2 items-center flex-grow">
                    {/* Column 1: Time */}
                    <div className="flex flex-col">
                        <p className="text-xs font-medium text-muted-foreground">Time</p>
                        <p className="font-bold text-lg flex items-center gap-1.5">{block.time} {block.isAlarmOn && <BellRing className="h-4 w-4 text-primary" />}</p>
                    </div>

                    <div className="flex flex-col">
                        <p className="text-xs font-medium text-muted-foreground">Condition Type</p>
                        <p className="text-sm font-semibold">{getConditionTypeLabel(block.conditionType)}</p>
                    </div>

                    {/* Column 2: Status */}
                     <div className="flex flex-col md:col-span-2">
                        <p className="text-xs font-medium text-muted-foreground">Status</p>
                        <div className="h-9 flex items-center">
                            {isConfirmed ? (
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsEditingConfirmation(true)}
                                    className="flex items-center justify-start gap-2 text-green-800 dark:text-green-200 h-auto p-1 text-left"
                                >
                                    <Check className="h-5 w-5 flex-shrink-0"/>
                                    <span className="text-sm font-semibold truncate" title={conditionMap.get(confirmedConditionId) || 'Confirmed'}>
                                        {conditionMap.get(confirmedConditionId) || 'Confirmed'}
                                    </span>
                                    <Edit2 className="h-3.5 w-3.5 ml-auto opacity-70"/>
                                </Button>
                            ) : isEditing ? (
                                <div className="flex w-full items-center gap-2">
                                    <Select value={selectedCondition || confirmedConditionId} onValueChange={setSelectedCondition}>
                                        <SelectTrigger className="flex-grow h-8 text-xs">
                                            <SelectValue placeholder="Confirm condition..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {conditionOptions.map(opt => (
                                                <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleConfirm} size="sm" className="h-8" disabled={!selectedCondition}>
                                        <Check className="h-4 w-4"/>
                                    </Button>
                                    {isEditingConfirmation && (
                                        <Button onClick={() => setIsEditingConfirmation(false)} variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                            <XCircle className="h-4 w-4"/>
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                 <p className="text-sm text-muted-foreground truncate" title={conditionMap.get(block.conditionId) || 'N/A'}>
                                    {conditionMap.get(block.conditionId) || 'Pending...'}
                                 </p>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Actions column */}
                <div className="flex items-center gap-2 flex-shrink-0 self-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(block)}>
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(block)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

const TargetInfo = ({ status, formulaIds, parameters, formulas }: { status?: string, formulaIds?: string[], parameters?: any[], formulas: Formula[] }) => {
    const formulaMap = useMemo(() => new Map(formulas.map(f => [f.id, f.name])), [formulas]);
    
    if (!status && (!formulaIds || formulaIds.length === 0) && (!parameters || parameters.length === 0)) {
        return <Badge variant="outline">None Defined</Badge>;
    }
    const formulaNames = formulaIds?.map(id => formulaMap.get(id)).filter(Boolean).join(', ') || 'N/A';
    
    return (
        <div className="space-y-1">
            {status && <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-300 dark:border-green-700">{status}</Badge>}
            {formulaIds && formulaIds.length > 0 && <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-300 dark:border-green-700">{formulaNames}</Badge>}
            {parameters && parameters.length > 0 && (
                <div className="space-y-1 mt-1 pl-2">
                    {parameters.map((param, index) => (
                        <div key={index} className="text-xs">
                           <Badge variant="outline" className="font-semibold">{param.key}:</Badge>
                           <span className="ml-1 text-muted-foreground">{param.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const FlowchartVisualizer = ({ 
    flow, 
    branchIndex,
    conditionMap, 
    edges, 
    formulas,
}: { 
    flow: TradingFlow, 
    branchIndex: number,
    conditionMap: Map<string, string>, 
    edges: any[], 
    formulas: any[],
}) => {
    const edgeMap = useMemo(() => new Map(edges.map(e => [e.id, e.name])), [edges]);

    return (
        <Card className="p-4 bg-background shadow-sm overflow-hidden">
             <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-semibold text-primary">
                    Branch {branchIndex + 1}
                </p>
            </div>

            <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-lg border-2 border-dashed w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <h5 className="font-semibold text-green-600 flex items-center gap-2"><TrendingUp /> Trend Path</h5>
                        <div className="text-xs space-y-2 pl-4 border-l-2 border-green-200">
                            <div>
                                <p className="font-medium">Edges:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                {flow.trendEdgeIds && flow.trendEdgeIds.length > 0
                                    ? flow.trendEdgeIds.map(id => <Badge key={id} variant="outline" className="bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 border-violet-300 dark:border-violet-700">{edgeMap.get(id) || 'Unknown'}</Badge>)
                                    : <Badge variant="outline">None</Badge>}
                                </div>
                            </div>
                            <div className="pt-1">
                                <p className="font-medium">Target 1:</p>
                                <TargetInfo status={flow.trendTargetStatus} formulaIds={flow.trendTargetFormulaIds} parameters={flow.trendTargetParameters} formulas={formulas} />
                            </div>
                            <div className="pt-1">
                                <p className="font-medium">Target 2:</p>
                                <TargetInfo status={flow.trendTarget2Status} formulaIds={flow.trendTarget2FormulaIds} parameters={flow.trendTarget2Parameters} formulas={formulas} />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h5 className="font-semibold text-red-600 flex items-center gap-2"><TrendingDown /> Opposite Path</h5>
                        <div className="text-xs space-y-2 pl-4 border-l-2 border-red-200">
                            <div>
                                <p className="font-medium">Edges:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {flow.oppositeEdgeIds && flow.oppositeEdgeIds.length > 0
                                    ? flow.oppositeEdgeIds.map(id => <Badge key={id} variant="outline" className="bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 border-violet-300 dark:border-violet-700">{edgeMap.get(id) || 'Unknown'}</Badge>)
                                    : <Badge variant="outline">None</Badge>}
                                </div>
                            </div>
                            <div className="pt-1">
                                <p className="font-medium">Target 1:</p>
                                <TargetInfo status={flow.oppositeTargetStatus} formulaIds={flow.oppositeTargetFormulaIds} parameters={flow.oppositeTargetParameters} formulas={formulas} />
                            </div>
                            <div className="pt-1">
                                <p className="font-medium">Target 2:</p>
                                <TargetInfo status={flow.oppositeTarget2Status} formulaIds={flow.oppositeTarget2FormulaIds} parameters={flow.oppositeTarget2Parameters} formulas={formulas} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default function LinkPage() {
    const { 
        dailyPlans, updateDailyPlan, dayTypes, breakSides, emaStatuses, ema5Statuses, openingObservations, first5MinCloses, first15MinCloses,
        candleConfirmations, ibCloses, ibBreaks, cprSizes, priceSensitivities, initialLows,
        edges, formulas, recurringBlocks, addRecurringBlock, updateRecurringBlock, deleteRecurringBlock, tradingFlows,
        globalEvents, addGlobalEvent, updateGlobalEvent, deleteGlobalEvent, btsts, updateRecurringBlockOverrides
    } = useAppContext();

    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
    const [reportDateRange, setReportDateRange] = useState<DateRange | undefined>({ from: startOfToday(), to: endOfToday() });
    const [isPlanSettingsOpen, setIsPlanSettingsOpen] = useState(false);
    const [blockToEdit, setBlockToEdit] = useState<TimeBlock | undefined>(undefined);
    const [blockToDelete, setBlockToDelete] = useState<TimeBlock | null>(null);
    const [isRecurringBlockAction, setIsRecurringBlockAction] = useState(false);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [selectedBlockDate, setSelectedBlockDate] = useState<Date>(startOfToday());

    // Event Management State
    const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<GlobalEvent | undefined>(undefined);
    const [eventToDelete, setEventToDelete] = useState<GlobalEvent | null>(null);

    // Notification state
    const [notificationPermission, setNotificationPermission] = useState('default');
    const lastNotifiedBlock = useRef<Record<string, string>>({});
    const audioRef = useRef<HTMLAudioElement>(null);
    
    // Request notification permission on mount
    useEffect(() => {
        if ("Notification" in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    const requestNotificationPermission = () => {
        if ("Notification" in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                setNotificationPermission(permission);
                toast({
                    title: "Notification Permissions",
                    description: `Permission status: ${permission}.`
                });
            });
        } else if (Notification.permission === 'denied') {
            toast({
                variant: 'destructive',
                title: "Permissions Denied",
                description: "You have previously denied notification permissions. Please enable them in your browser settings."
            });
        }
    };
    
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000); // Update every second
        setCurrentTime(new Date());
        return () => clearInterval(timer);
    }, []);

    const dateKeyForDisplay = useMemo(() => format(selectedBlockDate, 'yyyy-MM-dd'), [selectedBlockDate]);
    
    // Alarm logic
    useEffect(() => {
        if (!currentTime || notificationPermission !== 'granted') {
            return;
        }

        const todayKey = format(currentTime, 'yyyy-MM-dd');
        const currentFormattedTime = format(currentTime, 'HH:mm');
        
        const planForToday = dailyPlans.find(p => p.date === todayKey);
        // Use daily plan if it exists, otherwise fall back to recurring blocks template
        const blocksForToday = planForToday ? planForToday.blocks : recurringBlocks;

        blocksForToday.forEach(block => {
            const hasBeenConfirmedToday = block.dailyOverrides?.[todayKey];
            const lastNotifiedTimeForBlock = lastNotifiedBlock.current[block.id];
            
            if (block.isAlarmOn && block.time === currentFormattedTime && !hasBeenConfirmedToday && lastNotifiedTimeForBlock !== todayKey) {
                new Notification('Time Block Reminder', {
                    body: `Time to confirm: ${block.conditionType}`,
                    tag: block.id
                });
                
                // Play custom sound
                audioRef.current?.play().catch(error => console.error("Error playing sound:", error));
                
                lastNotifiedBlock.current[block.id] = todayKey;
            }
        });
    }, [currentTime, dailyPlans, recurringBlocks, notificationPermission]);

    const conditionMap = useMemo(() => {
        const allConditions = [
            ...dayTypes, ...breakSides, ...emaStatuses, ...ema5Statuses, ...openingObservations, ...first5MinCloses,
            ...first15MinCloses, ...candleConfirmations, ...ibCloses, ...ibBreaks,
            ...cprSizes, ...priceSensitivities, ...initialLows, ...btsts
        ];
        return new Map(allConditions.map(item => [item.id, item.name]));
    }, [dayTypes, breakSides, emaStatuses, ema5Statuses, openingObservations, first5MinCloses, first15MinCloses, candleConfirmations, ibCloses, ibBreaks, cprSizes, priceSensitivities, initialLows, btsts]);

    const allConditionsByType = useMemo(() => ({
        'Day Type': dayTypes,
        'BREAK SIDE': breakSides,
        'E(15)': emaStatuses,
        'E(5)': ema5Statuses,
        '1st 15 Min Open': openingObservations,
        '1st 5 Min Close': first5MinCloses,
        '1st 15 Min Close': first15MinCloses,
        'Candle Confirmation': candleConfirmations,
        'IB Close': ibCloses,
        'IB Break': ibBreaks,
        'Initial Low': initialLows,
        'CPR Size': cprSizes,
        'Price Sensitivity': priceSensitivities,
        'BTST': btsts,
        'Custom': [],
    }), [dayTypes, breakSides, emaStatuses, ema5Statuses, openingObservations, first5MinCloses, first15MinCloses, candleConfirmations, ibCloses, ibBreaks, cprSizes, priceSensitivities, initialLows, btsts]);

    const effectivePlanForSelectedDate = useMemo(() => {
        const plan = dailyPlans.find(p => p.date === dateKeyForDisplay);
        let blocksToShow;
        if (plan) {
            blocksToShow = plan.blocks;
        } else {
            blocksToShow = recurringBlocks.map(b => ({ ...b, isRecurring: true }));
        }
        return blocksToShow.sort((a, b) => a.time.localeCompare(b.time));
    }, [selectedBlockDate, dailyPlans, recurringBlocks, dateKeyForDisplay]);
    
    const handleOpenPlanSettings = (blockToFocus?: TimeBlock) => {
        const dateKey = format(selectedBlockDate, 'yyyy-MM-dd');
        const planForDay = dailyPlans.find(p => p.date === dateKey);

        const isBlockDailySpecific = planForDay?.blocks.some(b => b.id === blockToFocus?.id && !b.isRecurring) ?? false;
        
        setIsRecurringBlockAction(!isBlockDailySpecific);
    
        if (!planForDay) {
            const newPlan: DailyPlan = {
                date: dateKeyForDisplay,
                blocks: recurringBlocks.map(b => ({...b, isRecurring: true}))
            };
            updateDailyPlan(newPlan);
        }
        
        setBlockToEdit(blockToFocus || undefined);
        setIsPlanSettingsOpen(true);
    };

    const handleSavePlan = (planToSave: DailyPlan) => {
        updateDailyPlan(planToSave);
        toast({
            title: "Plan Saved",
            description: `Your plan for ${format(selectedBlockDate, "PPP")} has been updated.`,
        });
        setIsPlanSettingsOpen(false);
        setBlockToEdit(undefined);
    };

    const handleAddNewRecurringBlock = () => {
        setIsPlanSettingsOpen(true);
        setIsRecurringBlockAction(true);
        setBlockToEdit(undefined);
    };

    const handleAddNewNonRecurringBlock = () => {
        const dateKey = format(selectedBlockDate, 'yyyy-MM-dd');
        const planForDay = dailyPlans.find(p => p.date === dateKey);

        if (!planForDay) {
            const newPlan: DailyPlan = {
                date: dateKey,
                blocks: recurringBlocks.map(b => ({...b, isRecurring: true}))
            };
            updateDailyPlan(newPlan);
        }

        setIsPlanSettingsOpen(true);
        setIsRecurringBlockAction(false);
        setBlockToEdit(undefined);
    };
    
    const handleConfirmDueBlock = (block: TimeBlock, conditionId: string) => {
        const dateKey = format(selectedBlockDate, 'yyyy-MM-dd');
        
        // Update the master recurring block list first
        updateRecurringBlockOverrides(block.id, dateKey, conditionId);

        // Then update the daily plan
        let plan = dailyPlans.find(p => p.date === dateKey);
        if (!plan) {
            plan = {
                date: dateKey,
                blocks: recurringBlocks.map(b => ({...b, isRecurring: true}))
            };
        }
        
        const updatedBlocks = plan.blocks.map(b => {
            if (b.id === block.id) {
                return {
                    ...b,
                    dailyOverrides: {
                        ...(b.dailyOverrides || {}),
                        [dateKey]: conditionId
                    }
                };
            }
            return b;
        });

        updateDailyPlan({ ...plan, blocks: updatedBlocks });

        toast({
            title: `Condition set for ${block.time}`,
            description: `${block.conditionType}: ${conditionMap.get(conditionId) || 'N/A'}`
        });
    }

    const confirmDeleteBlock = () => {
        if (blockToDelete) {
            deleteRecurringBlock(blockToDelete.id);
            toast({ title: "Recurring Block Deleted" });
            setBlockToDelete(null);
        }
    };

    const confirmedConditions = useMemo(() => {
        const activeConditionIds = new Set<string>();
        const confirmedList: {type: TimeBlock['conditionType'], name: string}[] = [];

        if (!reportDateRange?.from) {
            return { activeConditionIds, confirmedList };
        }

        const range = eachDayOfInterval({
            start: startOfDay(reportDateRange.from),
            end: endOfDay(reportDateRange.to || reportDateRange.from),
        });

        for (const day of range) {
            const dateKey = format(day, 'yyyy-MM-dd');
            
            recurringBlocks.forEach(b => {
                const confirmedId = b.dailyOverrides?.[dateKey];
                if (confirmedId) {
                    activeConditionIds.add(confirmedId);
                    confirmedList.push({ type: b.conditionType, name: conditionMap.get(confirmedId) || 'Unknown' });
                }
            });
        }

        return { activeConditionIds, confirmedList };
    }, [recurringBlocks, reportDateRange, conditionMap]);

    const matchedFlows = useMemo(() => {
        const dateKey = format(selectedBlockDate, 'yyyy-MM-dd');
        const confirmedSequence = effectivePlanForSelectedDate
            .map(block => ({
                time: block.time,
                conditionType: block.conditionType,
                selectedConditionId: block.dailyOverrides?.[dateKey] || block.conditionId
            }))
            .filter(item => item.selectedConditionId) 
            .sort((a, b) => a.time.localeCompare(b.time))
            .map(({ conditionType, selectedConditionId }) => ({ conditionType, selectedConditionId: selectedConditionId! }));
        
        if (confirmedSequence.length === 0) {
            return [];
        }

        const matched = tradingFlows.filter(flow => {
            if (flow.conditions.length !== confirmedSequence.length) {
                return false; 
            }
            return flow.conditions.every((flowCond, index) => 
                flowCond.conditionType === confirmedSequence[index].conditionType &&
                flowCond.selectedConditionId === confirmedSequence[index].selectedConditionId
            );
        });
        
        return Object.values(matched.reduce((acc, flow) => {
            if (!acc[flow.name]) {
                acc[flow.name] = [];
            }
            acc[flow.name].push(flow);
            return acc;
        }, {} as Record<string, TradingFlow[]>));
    }, [selectedBlockDate, effectivePlanForSelectedDate, tradingFlows]);

    const reportChartData = useMemo(() => {
        const { confirmedList } = confirmedConditions;
        const typeDistribution = confirmedList.reduce((acc, curr) => {
            const type = curr.type || 'Custom';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const conditionCounts = confirmedList.reduce((acc, curr) => {
            acc[curr.name] = (acc[curr.name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            pieData: Object.entries(typeDistribution).map(([name, value]) => ({ name, value })),
            barData: Object.entries(conditionCounts).map(([name, value]) => ({ name, value })).sort((a,b) => a.value - b.value),
        };
    }, [confirmedConditions]);
    const PIE_CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];


    const isCurrentSelectedDateToday = isToday(selectedBlockDate);
    
    // Handlers for Global Events
    const handleSaveEvent = (eventData: Omit<GlobalEvent, 'id'>) => {
        if (eventToEdit) {
            updateGlobalEvent({ ...eventToEdit, ...eventData });
            toast({ title: 'Event Updated' });
        } else {
            addGlobalEvent(eventData);
            toast({ title: 'Event Added' });
        }
        setIsEventDialogOpen(false);
        setEventToEdit(undefined);
    };

    const confirmDeleteEvent = () => {
        if (eventToDelete) {
            deleteGlobalEvent(eventToDelete.id);
            toast({ title: 'Event Deleted' });
            setEventToDelete(null);
        }
    };

    const todaysEvents = useMemo(() => {
        const today = startOfToday();
        return globalEvents.filter(event => isSameDay(parseISO(event.date), today));
    }, [globalEvents]);

    const fourDayUpcomingEvents = useMemo(() => {
        const today = startOfToday();
        const fourDaysFromNow = endOfDay(addDays(today, 3)); // today + 3 more days = 4 days
        return globalEvents
            .filter(event => {
                const eventDate = parseISO(event.date);
                // Exclude today, check if it's after today and before the end of the 4th day
                return !isSameDay(eventDate, today) && isAfter(eventDate, today) && isBefore(eventDate, fourDaysFromNow);
            })
            .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    }, [globalEvents]);
    
    const headerCenterContent = useMemo(() => {
        if (!currentTime) return null;
        
        return (
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-lg font-semibold text-primary bg-muted px-3 py-1.5 rounded-md">
                    <Clock className="h-5 w-5 mr-2" />
                    {format(currentTime, 'p:ss')}
                </Badge>
                {todaysEvents.length > 0 && (
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="relative bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800 h-9">
                                <Bell className="h-4 w-4 mr-2" />
                                Today's Events ({todaysEvents.length})
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Today's Global Events</h4>
                                    <p className="text-sm text-muted-foreground">
                                    Key market events scheduled for today.
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    {todaysEvents.map(event => (
                                        <div key={event.id} className="grid grid-cols-3 items-center gap-4">
                                            <span className="col-span-2 truncate">{event.name}</span>
                                            <Badge variant="outline" className={cn("justify-self-end", getEventColor(event.type))}>{event.type}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}
                 {fourDayUpcomingEvents.length > 0 && (
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="relative bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-700 hover:bg-sky-200 dark:hover:bg-sky-800 h-9">
                                <Bell className="h-4 w-4 mr-2" />
                                Upcoming Events ({fourDayUpcomingEvents.length})
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Upcoming Events (Next 4 Days)</h4>
                                </div>
                                <div className="grid gap-2">
                                    {fourDayUpcomingEvents.map(event => (
                                        <div key={event.id} className="grid grid-cols-3 items-center gap-4">
                                            <span className="col-span-2 truncate">{event.name}</span>
                                            <Badge variant="outline" className="justify-self-end">{format(parseISO(event.date), 'MMM d')}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        );
    }, [currentTime, todaysEvents, fourDayUpcomingEvents]);
    
    const headerFarRightContent = useMemo(() => {
        if (!currentTime) return null;
        return (
            <Badge variant="outline" className="font-mono text-lg font-semibold text-primary bg-muted px-3 py-1.5 rounded-md">
                <CalendarIcon className="h-5 w-5 mr-2" />
                {format(currentTime, 'PPP')}
            </Badge>
        );
    }, [currentTime]);

    const upcomingEvents = useMemo(() => {
        const today = startOfToday();
        const oneMonthFromNow = addDays(today, 30);
        return globalEvents
            .filter(event => {
                const eventDate = parseISO(event.date);
                // Inclusive of today
                return (isSameDay(eventDate, today) || isAfter(eventDate, today)) && isBefore(eventDate, oneMonthFromNow);
            })
            .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    }, [globalEvents]);

    function BlockDatePickerDay(props: DayProps) {
        const { date, displayMonth } = props;
        if (!displayMonth) {
            return <div />;
        }
        const buttonProps = (props as any).buttonProps || {};

        const isOutsideMonth = displayMonth.getMonth() !== date.getMonth();
        if (isOutsideMonth) {
            return <div className={cn(buttonProps.className, 'opacity-0 pointer-events-none')} />;
        }

        const dateKey = format(date, 'yyyy-MM-dd');
        const totalBlocks = recurringBlocks.length;
        const confirmedCount = recurringBlocks.filter(b => b.dailyOverrides?.[dateKey]).length;
        const dayOfWeek = date.getDay();
        const isPastWeekday = isBefore(date, startOfToday()) && dayOfWeek > 0 && dayOfWeek < 6;

        let bgColor = "bg-background hover:bg-accent/50";
        
        if (isPastWeekday && totalBlocks > 0 && confirmedCount === 0) {
            bgColor = "bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800 text-white";
        } else if (confirmedCount > 0) {
            if (confirmedCount === totalBlocks) {
                bgColor = "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white";
            } else {
                bgColor = "bg-yellow-400 hover:bg-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-yellow-900";
            }
        } else if (dayOfWeek === 0 || dayOfWeek === 6) {
            bgColor = "bg-sky-500 hover:bg-sky-600 dark:bg-sky-700 dark:hover:bg-sky-800 text-white";
        }
        
        const handleDoubleClick = () => {
            setSelectedBlockDate(date);
            handleOpenPlanSettings();
        };

        return (
            <button
                {...buttonProps}
                type="button"
                className={cn(
                    "relative flex items-center justify-center p-0 w-full h-full rounded-md",
                    "transition-colors duration-150",
                    bgColor,
                    isSameDay(date, selectedBlockDate) && "ring-2 ring-primary ring-offset-background",
                )}
                onDoubleClick={handleDoubleClick}
            >
                <span className="font-medium">{format(date, 'd')}</span>
            </button>
        );
    }
    
    return (
        <MainLayout headerCenterContent={headerCenterContent} headerFarRightContent={headerFarRightContent}>
            {/* Hidden audio element for notifications */}
            <audio ref={audioRef} src="https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.wav" preload="auto" />
            <div className="space-y-6">
                {notificationPermission === 'default' && (
                    <Alert>
                        <BellRing className="h-4 w-4" />
                        <AlertTitle>Enable Notifications</AlertTitle>
                        <AlertDescription>
                            Get reminders for your time blocks. 
                            <Button variant="link" onClick={requestNotificationPermission} className="p-0 h-auto ml-1">Click here to enable notifications.</Button>
                        </AlertDescription>
                    </Alert>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                             <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-3xl font-headline font-bold">My Daily Recurring Blocks</CardTitle>
                                    <CardDescription className="mt-1">
                                        Your master template for {format(selectedBlockDate, "PPP")}.
                                    </CardDescription>
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                            "w-[280px] justify-start text-left font-normal",
                                            !selectedBlockDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedBlockDate ? format(selectedBlockDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={selectedBlockDate}
                                            onSelect={(d) => {
                                                if (d) {
                                                    setSelectedBlockDate(d);
                                                    setSelectedDate(d);
                                                }
                                            }}
                                            initialFocus
                                            month={selectedDate}
                                            onMonthChange={setSelectedDate}
                                            components={{ Day: BlockDatePickerDay }}
                                            classNames={{
                                                table: "w-full border-separate border-spacing-1",
                                                head_row: "flex gap-1",
                                                row: "flex w-full gap-1",
                                                cell: "h-9 w-9 p-0", // Make cells square
                                                day: "h-full w-full",
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </CardHeader>
                            <CardContent className="space-y-2">
                               {effectivePlanForSelectedDate.map(block => {
                                    if (!currentTime) return null;
                                    const confirmedConditionId = block.dailyOverrides?.[dateKeyForDisplay];
                                    
                                    let isDue = false;
                                    if (isToday(selectedBlockDate)) {
                                        const now = new Date();
                                        const [hours, minutes] = block.time.split(':');
                                        const blockDateTime = new Date(selectedBlockDate);
                                        blockDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                                        isDue = !confirmedConditionId && isBefore(blockDateTime, now);
                                    } else if (isBefore(startOfDay(selectedBlockDate), startOfToday())) {
                                        // For any past day, any unconfirmed block is due.
                                        isDue = !confirmedConditionId;
                                    }
                                    
                                    const conditionOptions = allConditionsByType[block.conditionType as keyof typeof allConditionsByType] || [];

                                    return (
                                        <RecurringBlockCard 
                                            key={block.id} 
                                            block={block} 
                                            onEdit={() => handleOpenPlanSettings(block)}
                                            onDelete={setBlockToDelete}
                                            conditionMap={conditionMap}
                                            isDue={isDue}
                                            onConfirm={handleConfirmDueBlock}
                                            conditionOptions={conditionOptions}
                                            confirmedConditionId={confirmedConditionId}
                                            onDoubleClick={() => handleOpenPlanSettings(block)}
                                        />
                                    );
                               })}
                               {effectivePlanForSelectedDate.length === 0 && (
                                   <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                     <p>No recurring blocks defined yet.</p>
                                     <p className="text-xs">Click "Add Recurring Block" to create your master template.</p>
                                   </div>
                               )}
                            </CardContent>
                            <CardFooter className="flex gap-2">
                                 <Button onClick={handleAddNewRecurringBlock}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Recurring Block
                                 </Button>
                                 <Button onClick={handleAddNewNonRecurringBlock} variant="secondary">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Non-Recurring Block
                                 </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3"><GitCommitHorizontal /> Flow Results</CardTitle>
                                <CardDescription>Matched trading flows based on the confirmed condition sequence for the selected day.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {matchedFlows.length > 0 ? (
                                    matchedFlows.map((flowGroup, groupIndex) => (
                                        <Card key={groupIndex} className="bg-muted/30">
                                            <CardHeader>
                                                <CardTitle className="text-lg">{flowGroup[0].name}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {flowGroup.map((flow, branchIndex) => (
                                                    <FlowchartVisualizer
                                                        key={flow.id}
                                                        flow={flow}
                                                        branchIndex={branchIndex}
                                                        conditionMap={conditionMap}
                                                        edges={edges}
                                                        formulas={formulas}
                                                    />
                                                ))}
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-muted-foreground">
                                        <p>No matching flows found for today's confirmed conditions.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-3"><CalendarIcon /> Global Events Calendar</CardTitle>
                            <CardDescription>An overview of key market events. Click "Add New Event" to log a global market event.</CardDescription>
                        </div>
                         <Button 
                            size="sm" 
                            onClick={() => { setEventToEdit(undefined); setIsEventDialogOpen(true); }}
                            className="bg-teal-600 text-teal-50 hover:bg-teal-700 dark:bg-teal-700 dark:text-teal-50 dark:hover:bg-teal-600"
                          >
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Event
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <EventCalendar
                            events={globalEvents}
                            selectedDate={selectedBlockDate}
                            setSelectedDate={setSelectedBlockDate}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Events (Next 30 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="max-h-60 overflow-y-auto">
                            {upcomingEvents.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Event</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {upcomingEvents.map(event => (
                                            <TableRow key={event.id}>
                                                <TableCell className="font-medium">{event.name}</TableCell>
                                                <TableCell>{format(parseISO(event.date), "PPP")}{event.time ? ` ${event.time}` : ''}</TableCell>
                                                <TableCell><Badge variant="outline" className={cn(getEventColor(event.type))}>{event.type}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => { setEventToEdit(event); setIsEventDialogOpen(true); }}><Edit2 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setEventToDelete(event)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No events scheduled for the next 30 days.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

            </div>
            
            <PlanSettingsDialog
                isOpen={isPlanSettingsOpen}
                onClose={() => setIsPlanSettingsOpen(false)}
                onSave={handleSavePlan}
                planDate={dateKeyForDisplay}
                initialBlockToFocus={blockToEdit}
                isRecurring={isRecurringBlockAction}
            />

            <DeleteConfirmationDialog
                isOpen={!!blockToDelete}
                onClose={() => setBlockToDelete(null)}
                onConfirm={confirmDeleteBlock}
                itemName={`recurring block at ${blockToDelete?.time}`}
            />
            
            <AddEventDialog 
                isOpen={isEventDialogOpen}
                onClose={() => setIsEventDialogOpen(false)}
                onSave={handleSaveEvent}
                initialData={eventToEdit}
            />
            
            <DeleteConfirmationDialog
                isOpen={!!eventToDelete}
                onClose={() => setEventToDelete(null)}
                onConfirm={confirmDeleteEvent}
                itemName={`the event "${eventToDelete?.name}"`}
            />
        </MainLayout>
    );
}

function EventCalendar({ events, selectedDate, setSelectedDate }: { events: GlobalEvent[], selectedDate: Date, setSelectedDate: (d: Date) => void }) {
    const eventsByDate = useMemo(() => {
        const map: Record<string, GlobalEvent[]> = {};
        events.forEach(event => {
            const dateKey = format(parseISO(event.date), 'yyyy-MM-dd');
            if (!map[dateKey]) {
                map[dateKey] = [];
            }
            map[dateKey].push(event);
        });
        return map;
    }, [events]);

    function EventDayContent(props: DayProps) {
        if (!props.displayMonth) {
          return <div />;
        }
        const { date, displayMonth } = props;
        const isOutsideMonth = displayMonth.getMonth() !== date.getMonth();
        if (isOutsideMonth) {
            return <div className="flex flex-col items-start justify-start text-left w-full h-full rounded-md bg-transparent" />;
        }
        const buttonProps = (props as any).buttonProps || {};
        const dateStr = format(props.date, 'yyyy-MM-dd');
        const dayEvents = eventsByDate[dateStr];
        const dayOfWeek = date.getDay();

        let dayBaseBackground = "bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200/70 dark:hover:bg-slate-700/50";
        let dateNumberColor = "text-slate-700 dark:text-slate-300";
        
        if (dayEvents) {
            dayBaseBackground = "bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200/80 dark:hover:bg-purple-800/70";
            dateNumberColor = "text-purple-800 dark:text-purple-200";
        } else if (dayOfWeek === 0 || dayOfWeek === 6) {
            dayBaseBackground = "bg-sky-100 dark:bg-sky-900/60 hover:bg-sky-200/80 dark:hover:bg-sky-800/70";
            dateNumberColor = "text-sky-800 dark:text-sky-200";
        }

        return (
            <button {...buttonProps} type="button" className={cn("flex flex-col items-start justify-start text-left p-1 w-full h-full rounded-md", dayBaseBackground)}>
                <div className={cn("font-medium text-xs sm:text-sm", dateNumberColor)}>{format(props.date, 'd')}</div>
                {dayEvents && (
                    <div className="mt-1 space-y-1 overflow-hidden w-full">
                        {dayEvents.slice(0, 2).map((event) => (
                           <Badge key={event.id} variant="outline" className={cn("block truncate text-xs font-normal w-full text-left justify-start", getEventColor(event.type))} title={`${event.time ? `${event.time} - ` : ''}${event.name}`}>
                                {event.time && <Clock className="h-3 w-3 mr-1.5 flex-shrink-0" />}
                                {event.name}
                            </Badge>
                        ))}
                        {dayEvents.length > 2 && <p className="text-xs text-muted-foreground mt-1">+{dayEvents.length - 2} more</p>}
                    </div>
                )}
            </button>
        );
    }

    return (
        <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            month={selectedDate}
            onMonthChange={setSelectedDate}
            components={{ Day: EventDayContent }}
            className="w-full"
            classNames={{
                table: "w-full border-separate border-spacing-1 table-fixed",
                head_row: "w-full",
                head_cell: "text-muted-foreground rounded-md w-full pb-1 text-sm text-center font-normal",
                row: "w-full",
                cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 border rounded-md h-32",
                day: "h-full w-full p-0 font-normal aria-selected:opacity-100",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "ring-2 ring-primary dark:ring-primary-foreground ring-offset-background dark:ring-offset-2",
                day_disabled: "text-muted-foreground opacity-50",
                day_outside: "invisible",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
            }}
        />
    );
}

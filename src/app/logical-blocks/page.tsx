
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GitBranch, CalendarIcon, Save, Edit, CheckCircle, Edit2, History } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Skeleton } from '@/components/ui/skeleton';
import { LogicalBlocksFormState } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import FlowCard from '@/components/logical-edge-flow/FlowCard';
import { format, isToday, parseISO, isSameDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ActivityLogDisplay from '@/components/shared/ActivityLogDisplay';


const currentSideStructureOptions = [
    { id: 'cs1', label: ' S(3) , S(5) & S(15) RESPECTS ' },
    { id: 'cs2', label: '"S(3) / S(5) " STRUCTURE RE - FORMED INTERNALLY' },
    { id: 'cs3', label: 'CHANGED ALL BUT "L" NOT PENETRATE' },
    { id: 'cs4', label: 'CHANGED ALL & "L" PENETRATE' },
    { id: 'cs5', label: 'S(15) ONLY REMAINS CONSTANT' },
    { id: 'cs6', label: 'S(5) AND S(15) ONLY REMAINS CONSTANT' },
    { id: 'cs7', label: 'CHANGED ALL BUT "L" NOT PENETRATE AND AND T(3) NOT HIT'},
];

const oppositeSideStructureOptions = [
    { id: 'os1', label: 'PENETRATE / CHANGED ALL' },
    { id: 'os2', label: 'S(3) AND S(5) CHANGED BUT S(15) REMAINS CONSTANT' },
    { id: 'os3', label: 'S(3) FORMED ONLY' },
    { id: 'os4', label: 'BOTH S(3) AND S(5) FORMED' },
    { id: 'os5', label: 'S(3) FORMED INTERNALLY' },
];

const defaultFormValues: LogicalBlocksFormState = {
  optionType: '' as const,
  dayType: '' as const,
  breakTime: '' as const,
  edgeId: '',
  selectedEdgeEntryIndex: '',
  oppositeOptionType: '' as const,
  oppositeEdgeId: '',
  oppositeSelectedEdgeEntryIndex: '',
  e15Status: '' as const,
  e5Status: '' as const,
  currentSideStructure: '',
  oppositeSideStructure: '',
  t3Condition: undefined,
};

// Helper to get initial form values directly
const getInitialFormStateForDate = (
    dateKey: string,
    logicalBlocksState: Record<string, LogicalBlocksFormState>,
    derivedState: any
): LogicalBlocksFormState => {
    const savedState = logicalBlocksState[dateKey] || defaultFormValues;
    let initialState: LogicalBlocksFormState = { ...savedState };

    if (isToday(parseISO(dateKey))) {
        const { newOptionType, newE15Status, newE5Status, newDayType } = derivedState;
        if (newOptionType && !initialState.optionType) initialState.optionType = newOptionType;
        if (newE15Status && !initialState.e15Status) initialState.e15Status = newE15Status;
        if (newE5Status && !initialState.e5Status) initialState.e5Status = newE5Status;
        if (newDayType && !initialState.dayType) initialState.dayType = newDayType;
    }

    const frozenEdgeDataRaw = typeof window !== 'undefined' ? localStorage.getItem(`logicalBlocks_frozenEdge_${dateKey}`) : null;
    if (frozenEdgeDataRaw) {
        try {
            const frozenData = JSON.parse(frozenEdgeDataRaw);
            initialState.edgeId = frozenData.edgeId;
            initialState.selectedEdgeEntryIndex = frozenData.selectedEdgeEntryIndex;
        } catch (e) {
            console.error("Failed to parse frozen edge data:", e);
        }
    }
    return initialState;
};


export default function LogicalBlocksPage() {
    const { 
      logicalEdgeFlows, edges: allEdges, formulas: allFormulas, isLoading,
      addEntryAlert, updateTargetsForOpenPositions,
      logicalBlocksState, updateLogicalBlocksState,
      dailyPlans, recurringBlocks, dayTypes, emaStatuses, ema5Statuses, first5MinCloses, first15MinCloses, cprSizes, addDayActivity, dayActivities
    } = useAppContext();
   
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const dateKey = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
    const { toast } = useToast();

    const [isEdgeSelectionFrozen, setIsEdgeSelectionFrozen] = useState(false);
    const [isPrimaryAlertCreatedToday, setIsPrimaryAlertCreatedToday] = useState(false);

    const edges = useMemo(() => Array.from(new Map([...(allEdges.real || []), ...(allEdges.theoretical || [])].map(e => [e.id, e])).values()), [allEdges]);
    const formulas = useMemo(() => Array.from(new Map([...(allFormulas.real || []), ...(allFormulas.theoretical || [])].map(f => [f.id, f])).values()), [allFormulas]);

    const trendSideEdges = useMemo(() => edges.filter(e => e.category === 'Trend Side'), [edges]);
    const oppositeSideEdges = useMemo(() => edges.filter(e => e.category === 'Opposite Side'), [edges]);
    
    const conditionMap = useMemo(() => {
        const allConditions = [
            ...dayTypes, ...emaStatuses, ...ema5Statuses, ...first5MinCloses, ...first15MinCloses, ...cprSizes
        ];
        return new Map(allConditions.map(item => [item.id, item.name]));
    }, [dayTypes, emaStatuses, ema5Statuses, first5MinCloses, first15MinCloses, cprSizes]);

    useEffect(() => {
      const hasAlert = dayActivities.some(activity => 
          isSameDay(parseISO(activity.timestamp), selectedDate) &&
          activity.event === 'Entry Alert Created'
      );
      setIsPrimaryAlertCreatedToday(hasAlert);
    }, [dayActivities, selectedDate]);
    
    const derivedStateFromTimeBlocks = useMemo(() => {
        const planForToday = dailyPlans.find(p => p.date === dateKey);
        const blocksForToday = planForToday?.blocks || recurringBlocks;

        const confirmedBlocks = blocksForToday
            .map(block => {
                const confirmedConditionId = block.dailyOverrides?.[dateKey];
                if (!confirmedConditionId) return null;
                return {
                    time: block.time,
                    conditionType: block.conditionType,
                    conditionId: confirmedConditionId,
                    conditionName: conditionMap.get(confirmedConditionId) || 'Unknown'
                };
            })
            .filter(Boolean)
            .sort((a, b) => a!.time.localeCompare(b!.time));
            
        let newOptionType: 'CE' | 'PE' | '' = '';
        let newE15Status: 'Positive' | 'Negative' | '' = '';
        let newE5Status: 'Positive' | 'Negative' | '' = '';
        let newDayType: 'Range' | 'Trend' | '' = '';

        const latestE15Block = [...confirmedBlocks].filter(b => b!.conditionType === 'E(15)').pop();
        if (latestE15Block) {
            const name = latestE15Block.conditionName.toLowerCase();
            if (name.includes('positive')) {
                newOptionType = 'CE';
                newE15Status = 'Positive';
            } else if (name.includes('negative')) {
                newOptionType = 'PE';
                newE15Status = 'Negative';
            }
        }
        
        const latestE5Block = [...confirmedBlocks].filter(b => b!.conditionType === 'E(5)').pop();
        if (latestE5Block) {
             const name = latestE5Block.conditionName.toLowerCase();
             if (name.includes('positive')) newE5Status = 'Positive';
             else if (name.includes('negative')) newE5Status = 'Negative';
        }

        const candleCloseBlocks = confirmedBlocks.filter(b => b!.conditionType === '1st 5 Min Close' || b!.conditionType === '1st 15 Min Close');
        if (candleCloseBlocks.length > 0) {
            const latestCandleCloseBlock = candleCloseBlocks[candleCloseBlocks.length - 1];
            if (latestCandleCloseBlock) {
              const name = latestCandleCloseBlock.conditionName.toLowerCase();
              if (name.includes('beyond pdh') || name.includes('beyond pdl')) {
                  newDayType = 'Trend';
              } else if (name.includes('above cpr') || name.includes('below cpr')) {
                  newDayType = 'Range';
              }
            }
        }

        return { newOptionType, newE15Status, newE5Status, newDayType };
    }, [dailyPlans, recurringBlocks, dateKey, conditionMap]);

    const initialFormStateForDate = useMemo(() => getInitialFormStateForDate(dateKey, logicalBlocksState, derivedStateFromTimeBlocks), [dateKey, logicalBlocksState, derivedStateFromTimeBlocks]);
    
    const form = useForm<LogicalBlocksFormState>({
        defaultValues: initialFormStateForDate
    });

    useEffect(() => {
        form.reset(initialFormStateForDate);
        const frozenEdgeDataRaw = typeof window !== 'undefined' ? localStorage.getItem(`logicalBlocks_frozenEdge_${dateKey}`) : null;
        setIsEdgeSelectionFrozen(!!frozenEdgeDataRaw);
    }, [initialFormStateForDate, form, dateKey]);


    const watchedValues = form.watch();
    const watchedEdgeId = form.watch('edgeId');
    const watchedOppositeEdgeId = form.watch('oppositeEdgeId');
    const watchedT3Condition = form.watch('t3Condition');

    const matchedFlow = useMemo(() => {
        if (!watchedValues.optionType || !watchedValues.dayType || !watchedValues.breakTime || !watchedValues.e15Status || !watchedValues.e5Status || !watchedValues.currentSideStructure || !watchedValues.oppositeSideStructure) {
          return null;
        }
      
        let potentialMatches = [...logicalEdgeFlows];
      
        potentialMatches = potentialMatches.filter(flow =>
            (!flow.optionTypes || flow.optionTypes.length === 0 || flow.optionTypes.includes(watchedValues.optionType as 'CE' | 'PE')) &&
            (!flow.dayTypes || flow.dayTypes.length === 0 || flow.dayTypes.includes(watchedValues.dayType as 'Range' | 'Trend')) &&
            (!flow.breakTimes || flow.breakTimes.length === 0 || flow.breakTimes.includes(watchedValues.breakTime as 'Before 12' | 'After 12' | 'NO BREAK')) &&
            (!flow.e15Statuses || flow.e15Statuses.length === 0 || flow.e15Statuses.includes(watchedValues.e15Status as 'Positive' | 'Negative')) &&
            (!flow.e5Statuses || flow.e5Statuses.length === 0 || flow.e5Statuses.includes(watchedValues.e5Status as 'Positive' | 'Negative')) &&
            (!flow.currentSideStructure || flow.currentSideStructure.length === 0 || flow.currentSideStructure.includes(watchedValues.currentSideStructure)) &&
            (!flow.oppositeSideStructure || flow.oppositeSideStructure.length === 0 || flow.oppositeSideStructure.includes(watchedValues.oppositeSideStructure)) &&
            (flow.t3Condition ? flow.t3Condition === watchedValues.t3Condition : true) &&
            // CRITICAL: Always match the frozen edge if it exists
            (isEdgeSelectionFrozen ? flow.edgeId === watchedValues.edgeId : true)
        );
        
        // CRITICAL: Always match the frozen edge entry if it exists
        const formEntryIndexStr = watchedValues.selectedEdgeEntryIndex;
        if (isEdgeSelectionFrozen && formEntryIndexStr !== undefined && formEntryIndexStr !== '') {
            const formEntryIndex = parseInt(formEntryIndexStr, 10);
            potentialMatches = potentialMatches.filter(flow => flow.selectedEdgeEntryIndex === formEntryIndex);
        }
      
        return potentialMatches.length > 0 ? potentialMatches[0] : null;
    }, [watchedValues, logicalEdgeFlows, isEdgeSelectionFrozen]);
    
    const isOppositeEdgeEnabled = useMemo(() => {
        const structure = watchedValues.oppositeSideStructure;
        return structure === 'S(3) FORMED ONLY' || structure === 'BOTH S(3) AND S(5) FORMED';
    }, [watchedValues.oppositeSideStructure]);

    const currentSelectedEdge = useMemo(() => edges.find(e => e.id === watchedEdgeId), [edges, watchedEdgeId]);
    const oppositeSelectedEdge = useMemo(() => edges.find(e => e.id === watchedOppositeEdgeId), [edges, watchedOppositeEdgeId]);
    const isSpecialEdgeSelected = currentSelectedEdge?.name === 'S(15) BEG ABOVE = E(15)';

    const availableEntries = useMemo(() => {
        if (!currentSelectedEdge?.entries) return [];
        if (!isSpecialEdgeSelected) {
            return currentSelectedEdge.entries.map((entry, index) => ({ ...entry, originalIndex: index }));
        }
        if (!watchedT3Condition) {
            return [];
        }
        return currentSelectedEdge.entries
            .map((entry, index) => ({ ...entry, originalIndex: index }))
            .filter((entry) => {
                if (watchedT3Condition === 'T(3) >= S(15)') {
                    return entry.originalIndex <= 5; // Entries 1-6
                }
                if (watchedT3Condition === 'S(15) > T(3)') {
                    return entry.originalIndex === 6 || entry.originalIndex === 7; // Entries 7-8
                }
                return false;
            });
    }, [currentSelectedEdge, isSpecialEdgeSelected, watchedT3Condition]);

    useEffect(() => {
        if (form.getValues('edgeId') !== watchedEdgeId) {
            form.setValue('selectedEdgeEntryIndex', '');
        }
    }, [watchedEdgeId, form]);

    useEffect(() => {
        if (form.getValues('t3Condition') !== watchedT3Condition) {
            form.setValue('selectedEdgeEntryIndex', '');
        }
    }, [watchedT3Condition, form]);

    useEffect(() => {
        if (form.getValues('oppositeEdgeId') !== watchedOppositeEdgeId) {
            form.setValue('oppositeSelectedEdgeEntryIndex', '');
        }
    }, [watchedOppositeEdgeId, form]);
    
    const handleSave = () => {
        const currentFormValues = form.getValues();
        const previousState = logicalBlocksState[dateKey] || defaultFormValues;
        const changes: Record<string, { before: any, after: any }> = {};

        // Compare and log changes
        for (const key of Object.keys(currentFormValues) as Array<keyof LogicalBlocksFormState>) {
            // Skip edge/entry if frozen, as it's handled separately
            if (isEdgeSelectionFrozen && (key === 'edgeId' || key === 'selectedEdgeEntryIndex')) continue;

            if (currentFormValues[key] !== previousState[key]) {
                changes[key] = { before: previousState[key] || 'Not Set', after: currentFormValues[key] || 'Not Set' };
            }
        }
        
        if(Object.keys(changes).length > 0) {
             addDayActivity('Logical Blocks Selections Saved', 'Engine', { changes });
        }

        updateLogicalBlocksState(dateKey, currentFormValues);
        toast({
            title: "Selections Saved",
            description: `Your logical blocks for ${format(selectedDate, "PPP")} have been saved.`,
        });
    };

    const handleSaveEdgeSelection = () => {
        const edgeId = form.getValues('edgeId');
        const selectedEdgeEntryIndex = form.getValues('selectedEdgeEntryIndex');

        if (!edgeId || !selectedEdgeEntryIndex) {
            toast({
                variant: 'destructive',
                title: "Incomplete Selection",
                description: "Please select both a Current Edge and an Edge Entry before saving.",
            });
            return;
        }
        const edgeName = edges.find(e => e.id === edgeId)?.name || 'Unknown Edge';
        const entryName = edges.find(e => e.id === edgeId)?.entries?.[parseInt(selectedEdgeEntryIndex)]?.name || 'Unknown Entry';
        
        addDayActivity('Logical Blocks Edge Selection Frozen', 'Settings', { notes: `Frozen to: ${edgeName} - ${entryName}` });

        const dataToSave = { edgeId, selectedEdgeEntryIndex };
        localStorage.setItem(`logicalBlocks_frozenEdge_${dateKey}`, JSON.stringify(dataToSave));
        setIsEdgeSelectionFrozen(true);
        toast({
            title: "Edge Selection Saved",
            description: "Your choices for Current Edge and Entry have been saved and frozen.",
        });
    };

    const handleEditEdgeSelection = () => {
        addDayActivity('Logical Blocks Edge Selection Unfrozen', 'Settings');
        localStorage.removeItem(`logicalBlocks_frozenEdge_${dateKey}`);
        setIsEdgeSelectionFrozen(false);
    };

    const todaysLog = useMemo(() => {
        return dayActivities.filter(d => isSameDay(parseISO(d.timestamp), selectedDate));
    }, [dayActivities, selectedDate]);

    if (isLoading) {
        return (
          <MainLayout>
            <Skeleton className="h-10 w-64 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
          </MainLayout>
        );
    }
    
    return (
        <MainLayout>
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-headline font-bold flex items-center gap-3"><GitBranch className="h-8 w-8 text-primary"/>Logical Blocks</h2>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-[280px] justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(d) => d && setSelectedDate(d)}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <Card>
                    <CardHeader>
                        <CardTitle>Logical Path</CardTitle>
                        <CardDescription>Select your conditions to find the matching logical flow.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <Card className="p-4 bg-muted/20 space-y-4">
                                    <FormField control={form.control} name="optionType" render={({ field }) => (
                                        <FormItem><FormLabel className="font-semibold">CURRENT OPTION TYPE</FormLabel><RadioGroup onValueChange={field.onChange} value={field.value} className="flex pt-2 gap-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="CE" /></FormControl><FormLabel className="font-normal">CE</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="PE" /></FormControl><FormLabel className="font-normal">PE</FormLabel></FormItem></RadioGroup></FormItem>
                                    )}/>
                                    
                                    <FormField control={form.control} name="edgeId" render={({ field }) => ( <FormItem><FormLabel className="font-semibold">CURRENT SELECT EDGE</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isEdgeSelectionFrozen}><FormControl><SelectTrigger><SelectValue placeholder="Select edge..." /></SelectTrigger></FormControl><SelectContent>{trendSideEdges.map(edge => <SelectItem key={edge.id} value={edge.id}>{edge.name}</SelectItem>)}</SelectContent></Select></FormItem> )} />
                                    
                                    {isSpecialEdgeSelected && (
                                        <FormField control={form.control} name="t3Condition" render={({ field }) => (
                                          <FormItem className="space-y-2">
                                              <FormLabel>T(3) Condition</FormLabel>
                                              <FormControl><RadioGroup onValueChange={field.onChange} value={field.value} disabled={isEdgeSelectionFrozen} className="flex gap-4">
                                                  <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="T(3) >= S(15)" /></FormControl><FormLabel className="font-normal">T(3) &gt;= S(15)</FormLabel></FormItem>
                                                  <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="S(15) > T(3)" /></FormControl><FormLabel className="font-normal">S(15) &gt; T(3)</FormLabel></FormItem>
                                              </RadioGroup></FormControl>
                                              <FormMessage />
                                          </FormItem>
                                        )}/>
                                    )}

                                    <FormField
                                        control={form.control}
                                        name="selectedEdgeEntryIndex"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold">CURRENT SELECT EDGE ENTRY</FormLabel>
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    key={watchedEdgeId || 'current-empty'}
                                                    onValueChange={field.onChange}
                                                    value={field.value || ''}
                                                    disabled={isEdgeSelectionFrozen || !watchedEdgeId || (isSpecialEdgeSelected && !watchedValues.t3Condition)}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                        <SelectValue placeholder="Select entry..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {availableEntries.map((entry) => (
                                                        <SelectItem key={entry.id} value={String(entry.originalIndex)}>
                                                            {entry.name}
                                                        </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {isEdgeSelectionFrozen ? (
                                                    <Button type="button" size="sm" variant="outline" onClick={handleEditEdgeSelection}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button type="button" size="sm" onClick={handleSaveEdgeSelection}>
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                  </Card>

                                  <Card className="p-4 bg-muted/20 space-y-4">
                                    <FormField control={form.control} name="oppositeOptionType" render={({ field }) => (
                                        <FormItem><FormLabel>OPPOSITE OPTION TYPE</FormLabel><RadioGroup onValueChange={field.onChange} value={field.value} className="flex pt-2 gap-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="CE" /></FormControl><FormLabel className="font-normal">CE</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="PE" /></FormControl><FormLabel className="font-normal">PE</FormLabel></FormItem></RadioGroup></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="oppositeEdgeId" render={({ field }) => ( <FormItem><FormLabel>OPPOSITE SELECT EDGE</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isOppositeEdgeEnabled}><FormControl><SelectTrigger><SelectValue placeholder="Select opposite edge..." /></SelectTrigger></FormControl><SelectContent>{oppositeSideEdges.map(edge => <SelectItem key={edge.id} value={edge.id}>{edge.name}</SelectItem>)}</SelectContent></Select></FormItem> )} />
                                    <FormField
                                        control={form.control}
                                        name="oppositeSelectedEdgeEntryIndex"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>OPPOSITE SELECT EDGE ENTRY</FormLabel>
                                            <Select
                                                key={watchedOppositeEdgeId || 'opposite-empty'}
                                                onValueChange={field.onChange}
                                                value={field.value || ''}
                                                disabled={!isOppositeEdgeEnabled || !watchedOppositeEdgeId}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                    <SelectValue placeholder="Select entry..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {(oppositeSelectedEdge?.entries || []).map((entry, index) => (
                                                    <SelectItem key={entry.id} value={String(index)}>
                                                        {entry.name}
                                                    </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                  </Card>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="dayType" render={({ field }) => (
                                        <FormItem><FormLabel>Day Type</FormLabel><RadioGroup onValueChange={field.onChange} value={field.value} className="flex pt-2 gap-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Range" /></FormControl><FormLabel className="font-normal">Range</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Trend" /></FormControl><FormLabel className="font-normal">Trend</FormLabel></FormItem></RadioGroup></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="breakTime" render={({ field }) => (
                                        <FormItem><FormLabel>Break</FormLabel><RadioGroup onValueChange={field.onChange} value={field.value} className="flex pt-2 gap-4 flex-wrap"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Before 12" /></FormControl><FormLabel className="font-normal">Before 12</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="After 12" /></FormControl><FormLabel className="font-normal">After 12</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="NO BREAK" /></FormControl><FormLabel className="font-normal">No Break</FormLabel></FormItem></RadioGroup></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                   <FormField control={form.control} name="e15Status" render={({ field }) => (<FormItem><FormLabel>E(15) Status</FormLabel><RadioGroup onValueChange={field.onChange} value={field.value} className="flex pt-2 gap-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Positive" /></FormControl><FormLabel className="font-normal">Positive</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Negative" /></FormControl><FormLabel className="font-normal">Negative</FormLabel></FormItem></RadioGroup></FormItem>)}/>
                                   <FormField control={form.control} name="e5Status" render={({ field }) => (<FormItem><FormLabel>E(5) Status</FormLabel><RadioGroup onValueChange={field.onChange} value={field.value} className="flex pt-2 gap-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Positive" /></FormControl><FormLabel className="font-normal">Positive</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Negative" /></FormControl><FormLabel className="font-normal">Negative</FormLabel></FormItem></RadioGroup></FormItem>)}/>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Define Hierarchical Logic Path</h4>
                                    <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                                        <FormField control={form.control} name="currentSideStructure" render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Current Side</FormLabel>
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col gap-2 mt-2">
                                              {currentSideStructureOptions.map(opt => (
                                                  <FormItem key={opt.id} className="flex items-center space-x-2 space-y-0">
                                                      <FormControl><RadioGroupItem value={opt.label} /></FormControl>
                                                      <FormLabel className="font-normal">{opt.label}</FormLabel>
                                                  </FormItem>
                                              ))}
                                            </RadioGroup>
                                          </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="oppositeSideStructure" render={({ field }) => (
                                           <FormItem>
                                            <FormLabel>Opposite Side</FormLabel>
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col gap-2 mt-2">
                                              {oppositeSideStructureOptions.map(opt => (
                                                  <FormItem key={opt.id} className="flex items-center space-x-2 space-y-0">
                                                      <FormControl><RadioGroupItem value={opt.label} /></FormControl>
                                                      <FormLabel className="font-normal">{opt.label}</FormLabel>
                                                  </FormItem>
                                              ))}
                                            </RadioGroup>
                                           </FormItem>
                                        )}/>
                                    </div>
                                </div>
                                <div className="flex justify-end items-center">
                                    <Button type="button" onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Selections
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Logical Result</CardTitle>
                        <CardDescription>The matching flow based on your selections will appear here.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {matchedFlow ? (
                            <FlowCard 
                                flow={matchedFlow} 
                                edges={edges} 
                                formulas={formulas}
                                selectedOppositeSideStructure={watchedValues.oppositeSideStructure}
                                selectedOppositeOptionType={watchedValues.oppositeOptionType}
                                onAddEntryAlert={addEntryAlert}
                                onUpdateTargets={updateTargetsForOpenPositions}
                                isPrimaryAlertCreated={isPrimaryAlertCreatedToday}
                            />
                        ) : (
                            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                                <p>No matching flow found.</p>
                                <p className="text-xs">
                                  Select all required conditions to see a result.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="font-headline text-xl flex items-center gap-3">
                        <History className="h-6 w-6 text-primary" />
                        Today's Log
                    </CardTitle>
                    <CardDescription>A log of actions performed on this page for the selected date.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ActivityLogDisplay activities={todaysLog} />
                </CardContent>
            </Card>
        </MainLayout>
    );
}


"use client";

import React, { useState, useMemo, useCallback } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import DayTypeForm from '@/components/day-type/DayTypeForm';
import DeleteConfirmationDialog from '@/components/shared/DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Edit2, Trash2, MoreHorizontal, BookOpenCheck, GitCommitHorizontal, Sunrise, BarChart3, MoveHorizontal, MoveVertical, Clock, Move, Sigma, GitBranch, ArrowDown, TrendingUp, TrendingDown, Copy, Briefcase, SplitSquareHorizontal } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import type { DayType, DayTypeFormData, EmaStatus, EmaStatusFormData, OpeningObservation, OpeningObservationFormData, CandleConfirmation, CandleConfirmationFormData, IbClose, CprSize, First5MinClose, IbBreak, First15MinClose, PriceSensitivity, TradingFlow, TradingFlowFormData, Formula, Edge, InitialLow, Btst, BtstFormData, PsychologyRule, PsychologyRuleFormData, Ema5Status, Ema5StatusFormData, BreakSide, BreakSideFormData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import TradingFlowForm from '@/components/market-journal/TradingFlowForm';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import PsychologyRuleForm from '@/components/psychology/PsychologyRuleForm';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { format, isToday, parseISO, isSameDay } from 'date-fns';


const simpleConditionFormSchema = z.object({
  name: z.string().min(3, 'Condition name must be at least 3 characters.'),
});

interface SimpleConditionFormProps {
  onSubmit: (data: { name: string }) => void;
  onCancel: () => void;
  initialData?: { name: string };
  title: string;
  description: string;
  formLabel: string;
  placeholder: string;
}

function SimpleConditionForm({ 
  onSubmit, 
  onCancel, 
  initialData, 
  title, 
  description, 
  formLabel, 
  placeholder 
}: SimpleConditionFormProps) {
  const form = useForm<z.infer<typeof simpleConditionFormSchema>>({
    resolver: zodResolver(simpleConditionFormSchema),
    defaultValues: initialData || { name: '' },
  });

  const handleSubmit = (values: z.infer<typeof simpleConditionFormSchema>) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{formLabel}</FormLabel>
              <FormControl>
                <Input placeholder={placeholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">
            {initialData ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  );
}


type DialogMode = 
  | { type: 'dayType', data?: DayType }
  | { type: 'breakSide', data?: BreakSide }
  | { type: 'emaStatus', data?: EmaStatus }
  | { type: 'ema5Status', data?: Ema5Status }
  | { type: 'openingObservation', data?: OpeningObservation }
  | { type: 'first5MinClose', data?: First5MinClose }
  | { type: 'first15MinClose', data?: First15MinClose }
  | { type: 'candleConfirmation', data?: CandleConfirmation }
  | { type: 'ibClose', data?: IbClose }
  | { type: 'ibBreak', data?: IbBreak }
  | { type: 'initialLow', data?: InitialLow }
  | { type: 'cprSize', data?: CprSize }
  | { type: 'priceSensitivity', data?: PriceSensitivity }
  | { type: 'btst', data?: Btst }
  | { type: 'tradingFlow', data?: TradingFlow }
  | { type: 'psychologyRule', data?: PsychologyRule }
  | null;

// Helper function for dialog titles
const getDialogTitle = (mode: DialogMode): string => {
    if (!mode) return '';
    const isEditing = !!mode.data;
    switch (mode.type) {
        case 'dayType': return isEditing ? 'Edit Day Type' : 'Create Day Type';
        case 'breakSide': return isEditing ? 'Edit Break Side' : 'Create Break Side';
        case 'tradingFlow': return isEditing ? 'Edit Trading Flow' : 'Create Trading Flow';
        case 'emaStatus': return isEditing ? 'Edit E(15)' : 'Create E(15)';
        case 'ema5Status': return isEditing ? 'Edit E(5)' : 'Create E(5)';
        case 'openingObservation': return isEditing ? 'Edit 1st 15 Min Open' : 'Create 1st 15 Min Open';
        case 'first5MinClose': return isEditing ? 'Edit 1st 5 Min Close' : 'Create 1st 5 Min Close';
        case 'first15MinClose': return isEditing ? 'Edit 1st 15 Min Close' : 'Create 1st 15 Min Close';
        case 'candleConfirmation': return isEditing ? 'Edit Candle Confirmation' : 'Create Candle Confirmation';
        case 'ibClose': return isEditing ? 'Edit IB Close Status' : 'Create IB Close Status';
        case 'ibBreak': return isEditing ? 'Edit IB Break' : 'Create IB Break';
        case 'initialLow': return isEditing ? 'Edit Initial Low' : 'Create Initial Low';
        case 'cprSize': return isEditing ? 'Edit CPR Size' : 'Create CPR Size';
        case 'priceSensitivity': return isEditing ? 'Edit Price Sensitivity' : 'Create Price Sensitivity';
        case 'btst': return isEditing ? 'Edit BTST Condition' : 'Create BTST Condition';
        case 'psychologyRule': return isEditing ? 'Edit Psychology Rule' : 'Create Psychology Rule';
        default: return '';
    }
}

// Helper function for dialog descriptions
const getDialogDescription = (mode: DialogMode): string => {
    if (!mode) return '';
    switch (mode.type) {
        case 'dayType': return 'Define a type of trading day by its name and a list of observable conditions.';
        case 'breakSide': return 'Define a break side condition.';
        case 'tradingFlow': return 'Define a sequence of conditions that maps to a specific outcome and edge.';
        case 'emaStatus': return 'Define a specific E(15) condition or status.';
        case 'ema5Status': return 'Define a specific E(5) condition or status.';
        case 'openingObservation': return "Define a specific condition for the 1st 15 minute candle's open.";
        case 'first5MinClose': return "Define a specific condition for the 1st 5 minute candle's close.";
        case 'first15MinClose': return "Define a specific condition for the 1st 15 minute candle's close.";
        case 'candleConfirmation': return 'Define a specific candlestick pattern or confirmation.';
        case 'ibClose': return 'Define a specific Initial Balance (IB) close condition.';
        case 'ibBreak': return 'Define a specific Initial Balance (IB) break condition.';
        case 'initialLow': return 'Define a specific Initial Low condition.';
        case 'cprSize': return 'Define a specific Central Pivot Range (CPR) size condition.';
        case 'priceSensitivity': return 'Define a specific price sensitivity level.';
        case 'btst': return 'Define a specific condition for Buy Today, Sell Tomorrow setups.';
        case 'psychologyRule': return 'Define a psychological rule or emotion.';
        default: return '';
    }
}

const DialogFormSwitcher = ({ mode, ...props }: { mode: DialogMode;[key: string]: any }) => {
    if (!mode) return null;
    switch (mode.type) {
        case 'dayType': return <DayTypeForm {...props} onSubmit={props.handleDayTypeFormSubmit} initialData={mode.data} />;
        case 'tradingFlow': return <TradingFlowForm {...props} onSubmit={props.handleFlowFormSubmit} initialData={mode.data} />;
        case 'psychologyRule': return <PsychologyRuleForm {...props} onSubmit={props.handlePsychologyFormSubmit} initialData={mode.data} />;
        case 'breakSide': return <SimpleConditionForm {...props} onSubmit={props.handleSimpleFormSubmit} initialData={mode.data} title="Break Side" description="Define a break side condition." formLabel="Break Side Name" placeholder="e.g., Break Up"/>;
        case 'emaStatus': return <SimpleConditionForm {...props} onSubmit={props.handleSimpleFormSubmit} initialData={mode.data} title="E(15)" description="Define an E(15) condition." formLabel="E(15) Status Name" placeholder="e.g., Positive"/>;
        case 'ema5Status': return <SimpleConditionForm {...props} onSubmit={props.handleSimpleFormSubmit} initialData={mode.data} title="E(5)" description="Define an E(5) condition." formLabel="E(5) Status Name" placeholder="e.g., Positive"/>;
        case 'openingObservation': return <SimpleConditionForm {...props} onSubmit={props.handleSimpleFormSubmit} initialData={mode.data} title="1st 15 Min Open" description="Define a condition based on the 1st 15 min open." formLabel="Condition Name" placeholder="e.g., Open > PDH"/>;
        case 'first5MinClose': return <SimpleConditionForm {...props} onSubmit={props.handleSimpleFormSubmit} initialData={mode.data} title="1st 5 Min Close" description="Define a condition based on the 1st 5 min close." formLabel="Condition Name" placeholder="e.g., Close > High"/>;
        case 'first15MinClose': return <SimpleConditionForm {...props} onSubmit={props.handleSimpleFormSubmit} initialData={mode.data} title="1st 15 Min Close" description="Define a condition based on the 1st 15 min close." formLabel="Condition Name" placeholder="e.g., Closed near 15m high"/>;
        case 'candleConfirmation': return <SimpleConditionForm {...props} onSubmit={props.handleSimpleFormSubmit} initialData={mode.data} title="Candle Confirmation" description="Define a candle condition." formLabel="Candle Confirmation Name" placeholder="e.g., Bullish Engulfing on 5min"/>;
        case 'ibClose': return <SimpleConditionForm {...props} onSubmit={props.handleSimpleFormSubmit} initialData={mode.data} title="IB Close" description="Define an IB condition." formLabel="IB Close Status Name" placeholder="e.g., IB close above high"/>;
        case 'ibBreak': return <SimpleConditionForm {...props} onSubmit={props.handleSimpleFormSubmit} initialData={mode.data} title="IB Break" description="Define an IB break condition." formLabel="IB Break Name" placeholder="e.g., Break above IB High"/>;
        case 'initialLow': return <SimpleConditionForm {...props} onSubmit={props.handleSimpleFormSubmit} initialData={mode.data} title="Initial Low" description="Define an initial low condition." formLabel="Condition Name" placeholder="e.g., Open = Low"/>;
        case 'cprSize': return <SimpleConditionForm {...props} onSubmit={props.handleSimpleFormSubmit} initialData={mode.data} title="CPR Size" description="Define a CPR size condition." formLabel="CPR Size Name" placeholder="e.g., Narrow CPR"/>;
        case 'priceSensitivity': return <SimpleConditionForm {...props} onSubmit={props.handleSimpleFormSubmit} initialData={mode.data} title="Price Sensitivity" description="Define a price sensitivity level." formLabel="Sensitivity Name" placeholder="e.g., Sensitive"/>;
        case 'btst': return <SimpleConditionForm {...props} onSubmit={props.handleSimpleFormSubmit} initialData={mode.data} title="BTST" description="Define a BTST condition." formLabel="Condition Name" placeholder="e.g., Strong closing"/>;
        default: return null;
    }
};

const TargetInfo = ({ status, formulaIds, parameters, formulas }: { status?: string, formulaIds?: string[], parameters?: any[], formulas: Formula[] }) => {
    const formulaMap = useMemo(() => new Map(formulas.map(f => [f.id, f.name])), [formulas]);
    if (!status && (!formulaIds || formulaIds.length === 0) && (!parameters || parameters.length === 0)) {
        return <p className="text-xs text-muted-foreground">No specific target defined.</p>;
    }
    const formulaNames = formulaIds?.map(id => formulaMap.get(id)).filter(Boolean).join(', ') || 'None';
    return (
        <div className="space-y-1">
            {status && <p><span className="font-medium">Status:</span> {status}</p>}
            {formulaIds && formulaIds.length > 0 && <div><span className="font-medium">Formulas:</span> {formulaNames}</div>}
            {parameters && parameters.length > 0 && (
                <div className="space-y-1">
                    <p className="font-medium">Parameters:</p>
                    <ul className="list-disc list-inside ml-4">
                        {parameters.map((param, index) => (
                            <li key={index}>
                                <span className="font-semibold">{param.key}:</span> {param.value}
                            </li>
                        ))}
                    </ul>
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
    onEdit,
    onDelete,
    onDuplicate
}: { 
    flow: TradingFlow, 
    branchIndex: number,
    conditionMap: Map<string, string>, 
    edges: any[], 
    formulas: any[],
    onEdit: () => void,
    onDelete: () => void,
    onDuplicate: () => void
}) => {
    const edgeMap = useMemo(() => new Map(edges.map(e => [e.id, e.name])), [edges]);

    return (
        <Card className="p-4 bg-background shadow-sm overflow-hidden">
             <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-semibold text-primary">
                    Branch {branchIndex + 1}
                </p>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                    <DropdownMenuItem onClick={onEdit}><Edit2 className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={onDuplicate}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex flex-col items-center gap-2">
                {flow.conditions.map((condition, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <ArrowDown className="h-6 w-6 text-muted-foreground" />}
                        <div className="p-3 rounded-md border text-center w-full max-w-md bg-muted/50">
                            <p className="font-semibold">{condition.conditionType}</p>
                            <p className="text-sm text-muted-foreground">{conditionMap.get(condition.selectedConditionId) || 'N/A'}</p>
                        </div>
                    </React.Fragment>
                ))}
                
                <ArrowDown className="h-6 w-6 text-muted-foreground" />

                <div className="p-3 rounded-lg border-2 border-dashed w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <h5 className="font-semibold text-green-600 flex items-center gap-2"><TrendingUp /> Trend Path</h5>
                        <div className="text-xs space-y-2 pl-4 border-l-2 border-green-200">
                            <div>
                                <p className="font-medium">Edges:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                {flow.trendEdgeIds && flow.trendEdgeIds.length > 0
                                    ? flow.trendEdgeIds.map(id => <Badge key={id} variant="secondary">{edgeMap.get(id) || 'Unknown'}</Badge>)
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
                                    ? flow.oppositeEdgeIds.map(id => <Badge key={id} variant="secondary">{edgeMap.get(id) || 'Unknown'}</Badge>)
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


export default function MarketJournalPage() {
  const { 
    dayTypes, addDayType, updateDayType, deleteDayType, 
    breakSides, addBreakSide, updateBreakSide, deleteBreakSide,
    emaStatuses, addEmaStatus, updateEmaStatus, deleteEmaStatus,
    ema5Statuses, addEma5Status, updateEma5Status, deleteEma5Status,
    openingObservations, addOpeningObservation, updateOpeningObservation, deleteOpeningObservation,
    first5MinCloses, addFirst5MinClose, updateFirst5MinClose, deleteFirst5MinClose,
    first15MinCloses, addFirst15MinClose, updateFirst15MinClose, deleteFirst15MinClose,
    candleConfirmations, addCandleConfirmation, updateCandleConfirmation, deleteCandleConfirmation,
    ibCloses, addIbClose, updateIbClose, deleteIbClose,
    ibBreaks, addIbBreak, updateIbBreak, deleteIbBreak,
    initialLows, addInitialLow, updateInitialLow, deleteInitialLow,
    cprSizes, addCprSize, updateCprSize, deleteCprSize,
    priceSensitivities, addPriceSensitivity, updatePriceSensitivity, deletePriceSensitivity,
    btsts, addBtst, updateBtst, deleteBtst,
    tradingFlows, addTradingFlow, updateTradingFlow, deleteTradingFlow, duplicateTradingFlow,
    psychologyRules, addPsychologyRule, updatePsychologyRule, deletePsychologyRule,
    edges,
    formulas: allFormulas,
    isLoading,
    recurringBlocks, 
    dailyPlans
  } = useAppContext();
  const { toast } = useToast();
  
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [itemToDelete, setItemToDelete] = useState<({ id: string, name: string, type: Exclude<DialogMode, null>['type'] }) | null>(null);

  const combinedFormulas = useMemo(() => [...(allFormulas.real || []), ...(allFormulas.theoretical || [])], [allFormulas]);
  const combinedEdges = useMemo(() => [...(edges.real || []), ...(edges.theoretical || [])], [edges]);

  const conditionMap = useMemo(() => {
    const allConditions = [
      ...dayTypes, ...breakSides, ...emaStatuses, ...(ema5Statuses || []), ...openingObservations, ...first5MinCloses, 
      ...first15MinCloses, ...candleConfirmations, ...ibCloses, ...ibBreaks, 
      ...initialLows, ...cprSizes, ...priceSensitivities, ...btsts
    ];
    return new Map(allConditions.map(item => [item.id, item.name]));
  }, [dayTypes, breakSides, emaStatuses, ema5Statuses, openingObservations, first5MinCloses, first15MinCloses, candleConfirmations, ibCloses, ibBreaks, initialLows, cprSizes, priceSensitivities, btsts]);

  const groupedFlows = useMemo(() => {
    return tradingFlows.reduce((acc, flow) => {
        if (!acc[flow.name]) {
            acc[flow.name] = [];
        }
        acc[flow.name].push(flow);
        return acc;
    }, {} as Record<string, TradingFlow[]>);
  }, [tradingFlows]);

  const matchedFlows = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const todayPlan = dailyPlans.find(p => p.date === todayKey);
    
    // Use today's plan if it exists, otherwise fall back to recurring blocks.
    const blocksForToday = todayPlan ? todayPlan.blocks : recurringBlocks;
  
    // 1. Get all unique confirmed condition IDs for today
    const confirmedConditionIdsForDay = new Set<string>();
    blocksForToday.forEach(block => {
      // A condition is only confirmed if it has a daily override for today.
      const confirmedId = block.dailyOverrides?.[todayKey];
      if (confirmedId) {
        confirmedConditionIdsForDay.add(confirmedId);
      }
    });
  
    if (confirmedConditionIdsForDay.size === 0) {
      return [];
    }
  
    // 2. Filter tradingFlows
    const matched = tradingFlows.filter(flow => {
      if (!flow.conditions || flow.conditions.length === 0) {
        return false; 
      }
      
      // 3. Check if all conditions required by the flow are present in today's confirmed conditions.
      // This is a "subset" check.
      return flow.conditions.every(conditionInFlow =>
        confirmedConditionIdsForDay.has(conditionInFlow.selectedConditionId)
      );
    });

    // Group matched flows by name
    return Object.values(matched.reduce((acc, flow) => {
        if (!acc[flow.name]) {
            acc[flow.name] = [];
        }
        acc[flow.name].push(flow);
        return acc;
    }, {} as Record<string, TradingFlow[]>));
  }, [dailyPlans, recurringBlocks, tradingFlows]);

  // Day Type Handlers
  const handleDayTypeFormSubmit = useCallback((data: DayTypeFormData) => {
    if (dialogMode?.type === 'dayType' && dialogMode.data) {
      updateDayType({ ...dialogMode.data, ...data });
      toast({ title: "Success", description: "Day Type updated successfully." });
    } else {
      addDayType(data);
      toast({ title: "Success", description: "Day Type added successfully." });
    }
    setDialogMode(null);
  }, [dialogMode, addDayType, updateDayType, toast]);
  
  const handlePsychologyFormSubmit = (data: PsychologyRuleFormData) => {
      if (dialogMode?.type === 'psychologyRule' && dialogMode.data) {
          updatePsychologyRule({ ...(dialogMode.data as PsychologyRule), ...data });
          toast({ title: "Success", description: "Psychology rule updated." });
      } else {
          addPsychologyRule(data);
          toast({ title: "Success", description: "New psychology rule created." });
      }
      setDialogMode(null);
  };

  const handleSimpleFormSubmit = useCallback((data: { name: string }) => {
    if (!dialogMode) return;
    
    const type = dialogMode.type;
    const isEditing = !!dialogMode.data;

    const action = isEditing ? 'updated' : 'created';
    let typeLabel = '';

    switch(type) {
        case 'breakSide': typeLabel="Break Side"; if (isEditing) updateBreakSide({ ...(dialogMode.data as BreakSide), ...data }); else addBreakSide(data); break;
        case 'emaStatus': typeLabel="E(15)"; if (isEditing) updateEmaStatus({ ...(dialogMode.data as EmaStatus), ...data }); else addEmaStatus(data); break;
        case 'ema5Status': typeLabel="E(5)"; if (isEditing) updateEma5Status({ ...(dialogMode.data as Ema5Status), ...data }); else addEma5Status(data); break;
        case 'openingObservation': typeLabel="1st 15 Min Open"; if (isEditing) updateOpeningObservation({ ...(dialogMode.data as OpeningObservation), ...data }); else addOpeningObservation(data); break;
        case 'first5MinClose': typeLabel="1st 5 Min Close"; if (isEditing) updateFirst5MinClose({ ...(dialogMode.data as First5MinClose), ...data }); else addFirst5MinClose(data); break;
        case 'first15MinClose': typeLabel="1st 15 Min Close"; if (isEditing) updateFirst15MinClose({ ...(dialogMode.data as First15MinClose), ...data }); else addFirst15MinClose(data); break;
        case 'candleConfirmation': typeLabel="Candle Confirmation"; if (isEditing) updateCandleConfirmation({ ...(dialogMode.data as CandleConfirmation), ...data }); else addCandleConfirmation(data); break;
        case 'ibClose': typeLabel="IB Close Status"; if (isEditing) updateIbClose({ ...(dialogMode.data as IbClose), ...data }); else addIbClose(data); break;
        case 'ibBreak': typeLabel="IB Break"; if (isEditing) updateIbBreak({ ...(dialogMode.data as IbBreak), ...data }); else addIbBreak(data); break;
        case 'initialLow': typeLabel="Initial Low"; if (isEditing) updateInitialLow({ ...(dialogMode.data as InitialLow), ...data }); else addInitialLow(data); break;
        case 'cprSize': typeLabel="CPR Size"; if (isEditing) updateCprSize({ ...(dialogMode.data as CprSize), ...data }); else addCprSize(data); break;
        case 'priceSensitivity': typeLabel="Price Sensitivity"; if (isEditing) updatePriceSensitivity({ ...(dialogMode.data as PriceSensitivity), ...data }); else addPriceSensitivity(data); break;
        case 'btst': typeLabel="BTST Condition"; if (isEditing) updateBtst({ ...(dialogMode.data as Btst), ...data }); else addBtst(data); break;
    }
    if (typeLabel) {
      toast({ title: "Success", description: `${typeLabel} ${action}.` });
    }
    setDialogMode(null);
  }, [
    dialogMode, toast, addBreakSide, updateBreakSide, addEmaStatus, updateEmaStatus, addEma5Status, updateEma5Status, addOpeningObservation, updateOpeningObservation,
    addFirst5MinClose, updateFirst5MinClose, addFirst15MinClose, updateFirst15MinClose,
    addCandleConfirmation, updateCandleConfirmation, addIbClose, updateIbClose,
    addIbBreak, updateIbBreak, addInitialLow, updateInitialLow, addCprSize, updateCprSize, addPriceSensitivity, updatePriceSensitivity, addBtst, updateBtst
  ]);

  const handleFlowFormSubmit = useCallback((data: TradingFlowFormData) => {
    if (dialogMode?.type === 'tradingFlow' && dialogMode.data) {
      updateTradingFlow({ ...dialogMode.data, ...data });
      toast({ title: "Success", description: "Trading Flow updated successfully." });
    } else {
      addTradingFlow(data);
      toast({ title: "Success", description: "Trading Flow added successfully." });
    }
    setDialogMode(null);
  }, [dialogMode, addTradingFlow, updateTradingFlow, toast]);

  const handleDuplicateFlow = (flowId: string) => {
    duplicateTradingFlow(flowId);
    toast({ title: "Flow Duplicated", description: "A copy of the flow has been created." });
  };
  
  const confirmDelete = useCallback(() => {
    if (!itemToDelete) return;
    switch (itemToDelete.type) {
      case 'dayType': deleteDayType(itemToDelete.id); break;
      case 'breakSide': deleteBreakSide(itemToDelete.id); break;
      case 'emaStatus': deleteEmaStatus(itemToDelete.id); break;
      case 'ema5Status': deleteEma5Status(itemToDelete.id); break;
      case 'openingObservation': deleteOpeningObservation(itemToDelete.id); break;
      case 'first5MinClose': deleteFirst5MinClose(itemToDelete.id); break;
      case 'first15MinClose': deleteFirst15MinClose(itemToDelete.id); break;
      case 'candleConfirmation': deleteCandleConfirmation(itemToDelete.id); break;
      case 'ibClose': deleteIbClose(itemToDelete.id); break;
      case 'ibBreak': deleteIbBreak(itemToDelete.id); break;
      case 'initialLow': deleteInitialLow(itemToDelete.id); break;
      case 'cprSize': deleteCprSize(itemToDelete.id); break;
      case 'priceSensitivity': deletePriceSensitivity(itemToDelete.id); break;
      case 'btst': deleteBtst(itemToDelete.id); break;
      case 'tradingFlow': deleteTradingFlow(itemToDelete.id); break;
      case 'psychologyRule': deletePsychologyRule(itemToDelete.id); break;
    }
    toast({ title: "Success", description: `${itemToDelete.type} "${itemToDelete.name}" deleted successfully.` });
    setItemToDelete(null);
  }, [
      itemToDelete, toast, deleteDayType, deleteBreakSide, deleteEmaStatus, deleteEma5Status, deleteOpeningObservation,
      deleteFirst5MinClose, deleteFirst15MinClose, deleteCandleConfirmation, deleteIbClose,
      deleteIbBreak, deleteInitialLow, deleteCprSize, deletePriceSensitivity, deleteBtst, deleteTradingFlow, deletePsychologyRule
  ]);

  const formulaMap = useMemo(() => new Map(combinedFormulas.map(f => [f.id, f.name])), [combinedFormulas]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[300px] w-full" />)}
        </div>
      </MainLayout>
    );
  }

  const renderDayTypeCard = (dayType: DayType) => (
    <Card key={dayType.id} className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex-row items-start justify-between">
        <CardTitle>{dayType.name}</CardTitle>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => setDialogMode({ type: 'dayType', data: dayType })}><Edit2 className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem><DropdownMenuItem onClick={() => setItemToDelete({ ...dayType, type: 'dayType' })} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </CardHeader>
      <CardContent>
        {dayType.conditions && dayType.conditions.length > 0 ? (
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {dayType.conditions.map((condition, index) => <li key={index}>{condition}</li>)}
          </ul>
        ) : (<p className="text-sm text-muted-foreground italic">No conditions defined.</p>)}
      </CardContent>
    </Card>
  );

  const renderSimpleConditionCard = (item: { id: string, name: string }, type: Exclude<DialogMode, null | {type: 'dayType'} | {type: 'tradingFlow'} | {type: 'psychologyRule'}>['type']) => (
    <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow">
       <CardContent className="p-3 flex items-center justify-between">
          <p className="font-medium">{item.name}</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent><DropdownMenuItem onClick={() => setDialogMode({ type, data: item as any })}><Edit2 className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem><DropdownMenuItem onClick={() => setItemToDelete({ ...item, type })} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
       </CardContent>
    </Card>
  );

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <Card className="flex flex-col h-full lg:col-span-1">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><BookOpenCheck className="h-6 w-6 text-primary" />Day Types</CardTitle>
                <Button onClick={() => setDialogMode({ type: 'dayType' })} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Create Day Type</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
              {dayTypes.length > 0 ? dayTypes.map(renderDayTypeCard) : (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10"><p>No Day Types defined yet.</p></div>
              )}
            </CardContent>
          </Card>
          
          <Card className="flex flex-col h-full">
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><BarChart3 className="h-6 w-6 text-primary" />Candle Confirmation</CardTitle>
                      <Button onClick={() => setDialogMode({ type: 'candleConfirmation' })} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Create</Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                  {candleConfirmations.length > 0 ? candleConfirmations.map(c => renderSimpleConditionCard(c, 'candleConfirmation')) : <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10"><p>No candle confirmations defined.</p></div>}
              </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><GitCommitHorizontal className="h-6 w-6 text-primary" />E(15)</CardTitle>
                      <Button onClick={() => setDialogMode({ type: 'emaStatus' })} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Create</Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                  {emaStatuses.length > 0 ? emaStatuses.map(s => renderSimpleConditionCard(s, 'emaStatus')) : <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10"><p>No E(15) statuses defined.</p></div>}
              </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><GitCommitHorizontal className="h-6 w-6 text-primary" />E(5)</CardTitle>
                      <Button onClick={() => setDialogMode({ type: 'ema5Status' })} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Create</Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                  {ema5Statuses.length > 0 ? ema5Statuses.map(s => renderSimpleConditionCard(s, 'ema5Status')) : <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10"><p>No E(5) statuses defined.</p></div>}
              </CardContent>
          </Card>
          
          <Card className="flex flex-col h-full">
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><Clock className="h-6 w-6 text-primary" />1st 5 Min Close</CardTitle>
                      <Button onClick={() => setDialogMode({ type: 'first5MinClose' })} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Create</Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                  {first5MinCloses.length > 0 ? first5MinCloses.map(s => renderSimpleConditionCard(s, 'first5MinClose')) : <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10"><p>No conditions defined.</p></div>}
              </CardContent>
          </Card>
          
          <Card className="flex flex-col h-full">
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><Sunrise className="h-6 w-6 text-primary" />1st 15 Min Open</CardTitle>
                      <Button onClick={() => setDialogMode({ type: 'openingObservation' })} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Create</Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                  {openingObservations.length > 0 ? openingObservations.map(s => renderSimpleConditionCard(s, 'openingObservation')) : <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10"><p>No conditions defined.</p></div>}
              </CardContent>
          </Card>
          
          <Card className="flex flex-col h-full">
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><Clock className="h-6 w-6 text-primary" />1st 15 Min Close</CardTitle>
                      <Button onClick={() => setDialogMode({ type: 'first15MinClose' })} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Create</Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                  {first15MinCloses.length > 0 ? first15MinCloses.map(s => renderSimpleConditionCard(s, 'first15MinClose')) : <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10"><p>No conditions defined.</p></div>}
              </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><MoveHorizontal className="h-6 w-6 text-primary" />IB Close Statuses</CardTitle>
                      <Button onClick={() => setDialogMode({ type: 'ibClose' })} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Create</Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                  {ibCloses.length > 0 ? ibCloses.map(s => renderSimpleConditionCard(s, 'ibClose')) : <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10"><p>No IB Close statuses defined.</p></div>}
              </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><Move className="h-6 w-6 text-primary" />IB Break</CardTitle>
                      <Button onClick={() => setDialogMode({ type: 'ibBreak' })} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Create</Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                  {ibBreaks.length > 0 ? ibBreaks.map(s => renderSimpleConditionCard(s, 'ibBreak')) : <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10"><p>No IB Break conditions defined.</p></div>}
              </CardContent>
          </Card>
          
          <Card className="flex flex-col h-full">
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><SplitSquareHorizontal className="h-6 w-6 text-primary" />Break Side</CardTitle>
                      <Button onClick={() => setDialogMode({ type: 'breakSide' })} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Create</Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                  {breakSides.length > 0 ? breakSides.map(s => renderSimpleConditionCard(s, 'breakSide')) : <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10"><p>No Break Side conditions defined.</p></div>}
              </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><TrendingDown className="h-6 w-6 text-primary" />Initial Low</CardTitle>
                      <Button onClick={() => setDialogMode({ type: 'initialLow' })} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Create</Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                  {initialLows.length > 0 ? initialLows.map(s => renderSimpleConditionCard(s, 'initialLow')) : <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10"><p>No Initial Low conditions defined.</p></div>}
              </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><MoveVertical className="h-6 w-6 text-primary" />CPR Size</CardTitle>
                      <Button onClick={() => setDialogMode({ type: 'cprSize' })} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Create</Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                  {cprSizes.length > 0 ? cprSizes.map(s => renderSimpleConditionCard(s, 'cprSize')) : <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10"><p>No CPR Sizes defined.</p></div>}
              </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><Sigma className="h-6 w-6 text-primary" />Price Sensitivity</CardTitle>
                      <Button onClick={() => setDialogMode({ type: 'priceSensitivity' })} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Create</Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                  {priceSensitivities.length > 0 ? priceSensitivities.map(s => renderSimpleConditionCard(s, 'priceSensitivity')) : <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10"><p>No sensitivities defined.</p></div>}
              </CardContent>
          </Card>
            
          <Card className="flex flex-col h-full">
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><Briefcase className="h-6 w-6 text-primary" />BTST</CardTitle>
                      <Button onClick={() => setDialogMode({ type: 'btst' })} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Create</Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                  {btsts.length > 0 ? btsts.map(s => renderSimpleConditionCard(s, 'btst')) : <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10"><p>No BTST conditions defined.</p></div>}
              </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3"><GitBranch className="h-6 w-6 text-primary" />Trading Flows</CardTitle>
                <CardDescription>Define logical sequences of market conditions to map to a specific Edge.</CardDescription>
              </div>
              <Button onClick={() => setDialogMode({ type: 'tradingFlow' })} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Create Flow</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {tradingFlows.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupedFlows).map(([flowName, flowsInGroup]) => (
                    <Card key={flowName} className="bg-muted/30">
                      <CardHeader>
                        <CardTitle className="text-lg">{flowName}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {flowsInGroup.map((flow, index) => (
                           <FlowchartVisualizer
                                key={flow.id}
                                flow={flow}
                                branchIndex={index}
                                conditionMap={conditionMap}
                                edges={combinedEdges}
                                formulas={combinedFormulas}
                                onEdit={() => setDialogMode({ type: 'tradingFlow', data: flow })}
                                onDelete={() => setItemToDelete({ ...flow, type: 'tradingFlow' })}
                                onDuplicate={() => handleDuplicateFlow(flow.id)}
                           />
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground p-10">
                  <p>No Trading Flows defined yet. Create one to map complex conditions to an Edge.</p>
                </div>
              )}
            </CardContent>
        </Card>
      </div>
      
      <Dialog open={!!dialogMode} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className={cn("sm:max-w-2xl", dialogMode?.type === 'tradingFlow' && "md:max-w-4xl max-h-[90vh] flex flex-col")}>
          {dialogMode && (
              <DialogHeader>
                  <DialogTitle>{getDialogTitle(dialogMode)}</DialogTitle>
                  <DialogDescription>{getDialogDescription(dialogMode)}</DialogDescription>
              </DialogHeader>
          )}
          
          <div className="flex-grow min-h-0 overflow-y-auto -mr-6 pr-6">
            <DialogFormSwitcher
              mode={dialogMode}
              onCancel={() => setDialogMode(null)}
              // Pass all possible handlers and data down
              handleDayTypeFormSubmit={handleDayTypeFormSubmit}
              handleSimpleFormSubmit={handleSimpleFormSubmit}
              handleFlowFormSubmit={handleFlowFormSubmit}
              handlePsychologyFormSubmit={handlePsychologyFormSubmit}
              edges={combinedEdges}
              dayTypes={dayTypes}
              emaStatuses={emaStatuses}
              ema5Statuses={ema5Statuses}
              openingObservations={openingObservations}
              first5MinCloses={first5MinCloses}
              first15MinCloses={first15MinCloses}
              candleConfirmations={candleConfirmations}
              ibCloses={ibCloses}
              ibBreaks={ibBreaks}
              initialLows={initialLows}
              cprSizes={cprSizes}
              priceSensitivities={priceSensitivities}
              btsts={btsts}
              psychologyRules={psychologyRules}
              formulas={combinedFormulas}
              breakSides={breakSides}
            />
          </div>

        </DialogContent>
      </Dialog>
      
      <DeleteConfirmationDialog 
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
        itemName={`the ${itemToDelete?.type} "${itemToDelete?.name}"`}
      />
    </MainLayout>
  );
}

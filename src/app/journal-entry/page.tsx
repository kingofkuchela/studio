
"use client";

import React, { useState, useMemo, useCallback, useEffect, ReactNode } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import SummaryCard from '@/components/dashboard/SummaryCard';
import { Zap, PlayCircle, StopCircle, CalendarIcon, Ban, PowerOff, ShieldAlert, CheckCircle, XCircle, DollarSign, TrendingUp, TrendingDown, Edit2, DatabaseZap, FilePlus, ArrowRight, Sigma, Plus, Minus, ArrowUpDown, Clock, Bot, History, CornerDownRight, Terminal, Settings, Target, Bell, Play, MoreHorizontal, Trash2, AlertTriangle, RefreshCw, HeartPulse, Brain, PlusCircle, Pencil, Check, LogIn, LogOut } from 'lucide-react';
import { format, isSameDay, parseISO, isToday } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { LiveOrder, Trade, AutomationEngineStatus, OrderStatus, TradeFormData, Formula, PositionType, ExpiryType, Edge, LiveOrderType, TradeLogEntry, DayActivity, TradeLoggingMode, PendingPullbackOrder, DayActivityDetails, IndexType, RulesFollowedStatus, PsychologyRule, PsychologyRuleFormData, EntryAlert } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import ModifyPositionDialog from '@/components/automation/ModifyPositionDialog';
import SquareOffDialog from '@/components/automation/SquareOffDialog';
import { type SquareOffFormValues } from '@/components/automation/SquareOffDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import TradeForm from '@/components/trade/TradeForm';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import MultiSelectFilterDropdown from '@/components/shared/MultiSelectFilterDropdown';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import ModifyOrderDialog from '@/components/automation/ModifyOrderDialog';
import TradeLimitDialog from '@/components/automation/TradeLimitDialog';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateTradeCharges } from '@/lib/tradeCalculations';
import CancelOrderDialog from '@/components/automation/CancelOrderDialog';
import BulkCancelDialog from '@/components/automation/BulkCancelDialog';
import { Switch } from '@/components/ui/switch';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import ExecuteOrderDialog from '@/components/automation/ExecuteOrderDialog';
import DeleteConfirmationDialog from '@/components/shared/DeleteConfirmationDialog';
import { Skeleton } from '@/components/ui/skeleton';
import EditActivityDialog from '@/components/activity/EditActivityDialog';
import PsychologyRuleForm from '@/components/psychology/PsychologyRuleForm';
import GlobalSettingsDialog from '@/components/automation/GlobalSettingsDialog';


// --- Reusable MultiSelect for Formulas ---
const MultiSelectFormulaField = ({
  value,
  onChange,
  placeholder,
  formulas,
}: {
  value?: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  formulas: Formula[];
}) => {
  const selectedFormulas = React.useMemo(
    () => formulas.filter(f => value?.includes(f.id)),
    [formulas, value]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start h-auto min-h-10 text-left">
          <div className="flex flex-wrap gap-1">
            {selectedFormulas.length > 0 ? (
              selectedFormulas.map(f => (
                <Badge key={f.id} variant="secondary" className="font-normal">
                  {f.name}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground font-normal">{placeholder}</span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <ScrollArea className="max-h-60">
          {formulas.map(formula => (
            <DropdownMenuCheckboxItem
              key={formula.id}
              checked={value?.includes(formula.id)}
              onCheckedChange={checked => {
                const currentIds = value || [];
                const newIds = checked
                  ? [...currentIds, formula.id]
                  : currentIds.filter(id => id !== formula.id);
                onChange(newIds);
              }}
              onSelect={e => e.preventDefault()}
            >
              {formula.name}
            </DropdownMenuCheckboxItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const reasonSchema = z.string().refine(val => val.trim().split(/\s+/).filter(Boolean).length >= 5, { message: "Reason must be at least 5 words." });

// --- New Dialog Component for Modifying Orders ---
const createModifyOrderFormSchema = (side: 'BUY' | 'SELL') => z.object({
  price: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "Price must be a positive number" }),
  quantity: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "Quantity must be a positive number" }),
  slPrice: z.string().transform(v => v === "" ? undefined : v).optional().refine(
    val => val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
    { message: "If provided, SL must be a non-negative number" }
  ),
  tpPrice: z.string().transform(v => v === "" ? undefined : v).optional().refine(
    val => val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
    { message: "If provided, Target must be a non-negative number" }
  ),
  entryFormulaIds: z.array(z.string()).optional(),
  stopLossFormulaIds: z.array(z.string()).optional(),
  targetFormulaIds: z.array(z.string()).optional(),
  reason: reasonSchema,
  // Hidden fields to preserve data
  index: z.string(),
  strikePrice: z.string(),
}).superRefine((data, ctx) => {
    if (!data.price) return;
    const price = parseFloat(data.price);
    const slPrice = data.slPrice ? parseFloat(data.slPrice) : undefined;
    const tpPrice = data.tpPrice ? parseFloat(data.tpPrice) : undefined;

    if (side === 'BUY') {
        if (slPrice !== undefined && slPrice >= price) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Stop Loss must be lower than the entry price for a BUY order.",
                path: ['slPrice'],
            });
        }
        if (tpPrice !== undefined && tpPrice <= price) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Target must be higher than the entry price for a BUY order.",
                path: ['tpPrice'],
            });
        }
    } else if (side === 'SELL') {
        if (slPrice !== undefined && slPrice <= price) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Stop Loss must be higher than the entry price for a SELL order.",
                path: ['slPrice'],
            });
        }
        if (tpPrice !== undefined && tpPrice >= price) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Target must be lower than the entry price for a SELL order.",
                path: ['tpPrice'],
            });
        }
    }
});

const manualEntryFormSchema = z.object({
  // New fields for historical entry
  entryTimeDate: z.date().optional(),
  entryTimeHours: z.string().optional(),
  entryTimeMinutes: z.string().optional(),
  // Existing fields
  index: z.enum(['NIFTY', 'SENSEX'], { required_error: "Index is required." }),
  strikePrice: z.string().min(1, { message: "Strike price is required." }),
  side: z.enum(['BUY', 'SELL'], { required_error: "Side is required." }),
  orderType: z.enum(['LIMIT', 'MARKET', 'SL-LMT'], { required_error: "Order type is required." }),
  price: z.string().optional(),
  triggerPrice: z.string().optional(),
  quantity: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "Lot size must be a positive number" }),
  slPrice: z.string().transform(v => v === "" ? undefined : v).optional().refine(
    val => val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
    { message: "If provided, SL must be a non-negative number" }
  ),
  tpPrice: z.string().transform(v => v === "" ? undefined : v).optional().refine(
    val => val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
    { message: "If provided, Target must be a non-negative number" }
  ),
  strategyId: z.string().optional(),
  selectedEdgeEntryIndex: z.string().optional(),
  entryFormulaIds: z.array(z.string()).optional(),
  stopLossFormulaIds: z.array(z.string()).optional(),
  targetFormulaIds: z.array(z.string()).optional(),
  expiryType: z.enum(['Expiry', 'Non-Expiry'], { required_error: "Expiry type is required." }),
  sourceFlowId: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.orderType === 'LIMIT' || data.orderType === 'SL-LMT') {
        if (!data.price || isNaN(parseFloat(data.price)) || parseFloat(data.price) <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Price must be a positive number for this order type.", path: ['price'] });
        }
    }
    if (data.orderType === 'SL-LMT') {
        if (!data.triggerPrice || isNaN(parseFloat(data.triggerPrice)) || parseFloat(data.triggerPrice) <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Trigger Price must be a positive number for SL-LMT orders.", path: ['triggerPrice'] });
        }
    }
    
    const price = data.price ? parseFloat(data.price) : undefined;
    const slPrice = data.slPrice ? parseFloat(data.slPrice) : undefined;
    const tpPrice = data.tpPrice ? parseFloat(data.tpPrice) : undefined;

    if (price !== undefined) {
        if (data.side === 'BUY') {
            if (slPrice !== undefined && slPrice >= price) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Stop Loss must be lower than the entry price for a BUY order.",
                    path: ['slPrice'],
                });
            }
            if (tpPrice !== undefined && tpPrice <= price) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Target must be higher than the entry price for a BUY order.",
                    path: ['tpPrice'],
                });
            }
        } else if (data.side === 'SELL') {
            if (slPrice !== undefined && slPrice <= price) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Stop Loss must be higher than the entry price for a SELL order.",
                    path: ['slPrice'],
                });
            }
            if (tpPrice !== undefined && tpPrice >= price) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Target must be lower than the entry price for a SELL order.",
                    path: ['tpPrice'],
                });
            }
        }
    }
});


interface ManualEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: z.infer<typeof manualEntryFormSchema>) => void;
  edges: Edge[];
  formulas: Formula[];
  pullbackData?: PendingPullbackOrder | null;
  alertData?: EntryAlert | null;
  isHistorical: boolean;
  journalDate?: Date;
}

const ManualEntryDialog: React.FC<ManualEntryDialogProps> = ({ isOpen, onClose, onSave, edges, formulas, pullbackData, alertData, isHistorical, journalDate }) => {
    const form = useForm<z.infer<typeof manualEntryFormSchema>>({
        resolver: zodResolver(manualEntryFormSchema),
        defaultValues: {
            index: 'NIFTY',
            strikePrice: '',
            price: '',
            triggerPrice: '',
            quantity: '',
            slPrice: '',
            tpPrice: '',
            side: 'BUY',
            orderType: 'LIMIT',
            expiryType: 'Non-Expiry',
            strategyId: undefined,
            selectedEdgeEntryIndex: undefined,
            entryFormulaIds: [],
            stopLossFormulaIds: [],
            targetFormulaIds: [],
            sourceFlowId: undefined,
            entryTimeDate: journalDate || new Date(),
            entryTimeHours: format(new Date(), 'HH'),
            entryTimeMinutes: format(new Date(), 'mm'),
        },
    });
    
    useEffect(() => {
        if (pullbackData && form) {
            const { originalTrade, edge, nextEntryIndex } = pullbackData;
            const nextEntry = edge.entries?.[nextEntryIndex];
            
            form.reset({
                index: originalTrade.index ?? 'NIFTY',
                strikePrice: originalTrade.strikePrice ?? '',
                side: originalTrade.positionType === 'Long' ? 'BUY' : 'SELL',
                orderType: 'LIMIT',
                quantity: String(originalTrade.quantity),
                price: String(originalTrade.entryPrice),
                slPrice: String(originalTrade.sl || ''),
                tpPrice: String(originalTrade.target || ''),
                expiryType: originalTrade.expiryType,
                strategyId: originalTrade.strategyId,
                selectedEdgeEntryIndex: String(nextEntryIndex),
                entryFormulaIds: nextEntry?.entryFormulaIds || [],
                stopLossFormulaIds: nextEntry?.stopLossFormulaIds || [],
                targetFormulaIds: nextEntry?.targetFormulaIds || [],
                entryTimeDate: journalDate || new Date(),
                entryTimeHours: format(new Date(), 'HH'),
                entryTimeMinutes: format(new Date(), 'mm'),
            });
        } else if (alertData && form) {
            const { edge, entryIndex, primaryTargetFormulaId } = alertData;
            const entry = edge.entries?.[entryIndex];
            form.reset({
                ...form.getValues(),
                strategyId: edge.id,
                selectedEdgeEntryIndex: String(entryIndex),
                entryFormulaIds: entry?.entryFormulaIds || [],
                stopLossFormulaIds: entry?.stopLossFormulaIds || [],
                targetFormulaIds: primaryTargetFormulaId ? [primaryTargetFormulaId] : (entry?.targetFormulaIds || []),
                sourceFlowId: alertData.flowId,
                entryTimeDate: journalDate || new Date(),
                entryTimeHours: format(new Date(), 'HH'),
                entryTimeMinutes: format(new Date(), 'mm'),
            });
        } else if (!pullbackData && !alertData) {
            form.reset({ 
                index: 'NIFTY',
                strikePrice: '',
                price: '',
                triggerPrice: '',
                quantity: '',
                slPrice: '',
                tpPrice: '',
                side: 'BUY',
                orderType: 'LIMIT',
                expiryType: 'Non-Expiry',
                strategyId: undefined,
                selectedEdgeEntryIndex: undefined,
                entryFormulaIds: [],
                stopLossFormulaIds: [],
                targetFormulaIds: [],
                entryTimeDate: journalDate || new Date(),
                entryTimeHours: format(new Date(), 'HH'),
                entryTimeMinutes: format(new Date(), 'mm'),
            });
        }
    }, [pullbackData, alertData, form, isOpen, journalDate]);


    const entryFormulas = useMemo(() => formulas.filter(f => f.type === 'normal-entry' || f.type === 'breakout-entry'), [formulas]);
    const stopLossFormulas = useMemo(() => formulas.filter(f => f.type === 'stop-loss'), [formulas]);
    const targetFormulas = useMemo(() => formulas.filter(f => f.type === 'target' || f.type === 'target-index' || f.type === 'target-option'), [formulas]);
    
    const orderType = form.watch('orderType');
    const strategyId = form.watch('strategyId');
    const selectedEdge = useMemo(() => edges.find(e => e.id === strategyId), [edges, strategyId]);

    const watchedSide = form.watch('side');
    const selectedEdgeEntryIndexStr = form.watch('selectedEdgeEntryIndex');

    const filteredEdges = useMemo(() => {
        if (watchedSide === 'BUY') {
            return edges.filter(e => e.category === 'Trend Side' || e.category === 'Opposite Side');
        }
        if (watchedSide === 'SELL') {
            return edges.filter(e => e.category === 'Short Edge');
        }
        return edges;
    }, [edges, watchedSide]);

    useEffect(() => {
        if (pullbackData || alertData) return;
        
        const currentStrategyId = form.getValues('strategyId');
        if (currentStrategyId && !filteredEdges.some(e => e.id === currentStrategyId)) {
            form.setValue('strategyId', undefined, { shouldValidate: true });
        }
        
        form.setValue('selectedEdgeEntryIndex', undefined);
        form.setValue('entryFormulaIds', []);
        form.setValue('stopLossFormulaIds', []);
        form.setValue('targetFormulaIds', []);
        
        if (selectedEdge?.entries && selectedEdge.entries.length === 1) {
            form.setValue('selectedEdgeEntryIndex', '0', { shouldValidate: true });
        }
    }, [strategyId, selectedEdge, form, pullbackData, alertData, filteredEdges]);

    useEffect(() => {
        if (pullbackData || alertData) return;
        if (selectedEdge && selectedEdgeEntryIndexStr !== undefined) {
            const entryIndex = parseInt(selectedEdgeEntryIndexStr, 10);
            const selectedEntry = selectedEdge.entries?.[entryIndex];
            if (selectedEntry) {
              form.setValue('entryFormulaIds', selectedEntry.entryFormulaIds || []);
              form.setValue('stopLossFormulaIds', selectedEntry.stopLossFormulaIds || []);
              form.setValue('targetFormulaIds', selectedEntry.targetFormulaIds || []);
            }
        } else {
            form.setValue('entryFormulaIds', []);
            form.setValue('stopLossFormulaIds', []);
            form.setValue('targetFormulaIds', []);
        }
    }, [selectedEdge, selectedEdgeEntryIndexStr, form, pullbackData, alertData]);


    const handleSubmit = (values: z.infer<typeof manualEntryFormSchema>) => {
        onSave(values);
        form.reset();
    };
    
    const dialogTitle = pullbackData ? `Create Pullback Entry #${pullbackData.nextEntryIndex + 1}` : 
                      alertData ? `Create Alerted Entry: ${alertData.edge.name}` : 
                      isHistorical ? 'Log Historical Trade' : 'Manual Order Entry';
    
    const dialogDescription = pullbackData ? `Based on winning trade for ${pullbackData.originalTrade.symbol}. Review and place order.` : 
                            alertData ? `Refined Target: ${alertData.primaryTargetFormulaName || 'Not Set'}. Review and place order.` :
                            isHistorical ? 'Manually log a completed trade from a previous day.' : 'Manually place a new pending order into the journal.';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>
                        {dialogDescription}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto -mr-6 pr-6">
                    <Form {...form}>
                        <form id="manualEntryForm" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pr-1">
                            {isHistorical && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="entryTimeDate" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Entry Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <div className="flex items-end gap-2">
                                        <FormField control={form.control} name="entryTimeHours" render={({ field }) => (
                                            <FormItem className="flex-1"><FormLabel>Entry Time (HH:MM)</FormLabel><FormControl><Input type="number" min="0" max="23" placeholder="HH" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <span className="pb-2 font-bold text-lg">:</span>
                                        <FormField control={form.control} name="entryTimeMinutes" render={({ field }) => (
                                            <FormItem className="flex-1 self-end"><FormControl><Input type="number" min="0" max="59" placeholder="MM" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="index" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Index</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2">
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="NIFTY" /></FormControl><FormLabel className="font-normal">NIFTY</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="SENSEX" /></FormControl><FormLabel className="font-normal">SENSEX</FormLabel></FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="strikePrice" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Strike Price</FormLabel>
                                        <FormControl><Input type="text" placeholder="e.g., 23500 or 23500CE" {...field} value={field.value ?? ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="side" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Side</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2">
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="BUY" /></FormControl><FormLabel className="font-normal">Buy</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="SELL" /></FormControl><FormLabel className="font-normal">Sell</FormLabel></FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="quantity" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Lot Size</FormLabel>
                                        <FormControl><Input type="number" step="1" placeholder="e.g., 50" {...field} value={field.value ?? ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                            <FormField
                                    control={form.control}
                                    name="orderType"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Order Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                            <SelectValue placeholder="Select an order type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="LIMIT">Limit</SelectItem>
                                            <SelectItem value="MARKET">Market</SelectItem>
                                            <SelectItem value="SL-LMT">SL-Limit</SelectItem>
                                        </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="expiryType" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Expiry Type</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2">
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Expiry" /></FormControl><FormLabel className="font-normal">Expiry</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Non-Expiry" /></FormControl><FormLabel className="font-normal">Non-Expiry</FormLabel></FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {(orderType === 'LIMIT' || orderType === 'SL-LMT') && (
                                    <FormField control={form.control} name="price" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Limit Price</FormLabel>
                                            <FormControl><Input type="number" step="0.01" placeholder="e.g., 150.00" {...field} value={field.value ?? ''} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                )}
                                {orderType === 'SL-LMT' && (
                                    <FormField control={form.control} name="triggerPrice" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Trigger Price</FormLabel>
                                            <FormControl><Input type="number" step="0.01" placeholder="e.g. 150.50" {...field} value={field.value ?? ''} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="strategyId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Edge (Optional)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an edge" /></SelectTrigger></FormControl>
                                          <SelectContent>
                                            <ScrollArea className="h-[200px]">
                                              {filteredEdges.map(edge => (<SelectItem key={edge.id} value={edge.id}>{edge.name}</SelectItem>))}
                                            </ScrollArea>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                {selectedEdge?.entries && selectedEdge.entries.length > 0 && (
                                    <FormField control={form.control} name="selectedEdgeEntryIndex" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Edge Entry</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select an entry" /></SelectTrigger></FormControl>
                                                <SelectContent>{selectedEdge.entries.map((entry, index) => (<SelectItem key={entry.id || index} value={String(index)}>{entry.name || `Entry ${index + 1}`}</SelectItem>))}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                )}
                            </div>
                            
                            <div className="space-y-2">
                                <FormField control={form.control} name="entryFormulaIds" render={({ field }) => (
                                    <FormItem><FormLabel>Entry Formulas</FormLabel><MultiSelectFormulaField {...field} placeholder="Select entry formulas..." formulas={entryFormulas} /><FormMessage /></FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <FormField control={form.control} name="stopLossFormulaIds" render={({ field }) => (
                                        <FormItem><FormLabel>SL Formulas</FormLabel><MultiSelectFormulaField {...field} placeholder="Select SL formulas..." formulas={stopLossFormulas} /><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="slPrice" render={({ field }) => (
                                        <FormItem><FormLabel>SL Price</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g. 145.50" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                                <div className="space-y-2">
                                    <FormField control={form.control} name="targetFormulaIds" render={({ field }) => (
                                        <FormItem><FormLabel>Target Formulas</FormLabel><MultiSelectFormulaField {...field} placeholder="Select target formulas..." formulas={targetFormulas} /><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="tpPrice" render={({ field }) => (
                                        <FormItem><FormLabel>Target Price</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g. 160.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                            </div>
                        </form>
                    </Form>
                </div>
                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="manualEntryForm">{isHistorical ? 'Log Historical Trade' : 'Add Manual Order'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const formSchemaModifyPosition = z.object({
  quantity: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "Lot Size must be a positive number" }),
  sl: z.string().transform(v => v === "" ? undefined : v).optional().refine(
    val => val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
    { message: "If provided, SL must be a non-negative number" }
  ),
  target: z.string().transform(v => v === "" ? undefined : v).optional().refine(
    val => val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
    { message: "If provided, Target must be a non-negative number" }
  ),
  stopLossFormulaIds: z.array(z.string()).optional(),
  targetFormulaIds: z.array(z.string()).optional(),
  reason: reasonSchema,
});

export default function JournalEntryPage() {
    const { addHistoricalTrade, openPositions, allTrades, edges: allEdges, formulas: allFormulas, updateTrade, addTrade, deleteTrade, addDayActivity, dayActivities, isLoading, longTradeLimit, shortTradeLimit, setTradeLimits, pendingPullbackOrders, clearPendingPullbackOrder, updateDayActivity, deleteActivityPermanently, tradingMode, psychologyRules, addPsychologyRule, updatePsychologyRule, deletePsychologyRule, entryAlerts, clearEntryAlert, addLiveOrder, cancelLiveOrder, getOpenOrders, logicalEdgeFlows, addPendingPullbackOrder } = useAppContext();
    const { toast } = useToast();
    const [journalDate, setJournalDate] = useState<Date | undefined>(new Date());
    
    const [orderToExecute, setOrderToExecute] = useState<LiveOrder | null>(null);
    const [orderToCancel, setOrderToCancel] = useState<LiveOrder | null>(null);
    const [orderToModify, setOrderToModify] = useState<LiveOrder | null>(null);
    const [positionToModify, setPositionToModify] = useState<Trade | null>(null);
    const [positionToSquareOff, setPositionToSquareOff] = useState<Trade | null>(null);
    const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
    const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
    const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false);
    
    const [isBulkCancelDialogOpen, setIsBulkCancelDialogOpen] = useState(false);
    const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [pullbackToCreate, setPullbackToCreate] = useState<PendingPullbackOrder | null>(null);
    const [alertToCreate, setAlertToCreate] = useState<EntryAlert | null>(null);
    const [activityToEdit, setActivityToEdit] = useState<DayActivity | null>(null);
    const [activityToDelete, setActivityToDelete] = useState<DayActivity | null>(null);
    const [isPsychologyFormOpen, setIsPsychologyFormOpen] = useState(false);
    const [editingPsychologyRule, setEditingPsychologyRule] = useState<Partial<PsychologyRule> | undefined>(undefined);
    const [psychologyRuleToDelete, setPsychologyRuleToDelete] = useState<PsychologyRule | null>(null);
    type EditingCell = { tradeId: string; column: 'technical' | 'emotion' } | null;
    const [editingCell, setEditingCell] = useState<EditingCell>(null);
    const [tempSelectValue, setTempSelectValue] = useState<string>('');
    const [activeEdgeIds, setActiveEdgeIds] = useState<string[]>([]);
    const [globalLotSize, setGlobalLotSize] = useState('75');
    const [globalPositionType, setGlobalPositionType] = useState<'Long' | 'Short' | 'Both'>('Both');
    const [globalExpiryType, setGlobalExpiryType] = useState<'Expiry' | 'Non-Expiry' | 'Both'>('Both');
    const [entryRestrictionTime, setEntryRestrictionTime] = useState('15:10');
    const [squareOffTime, setSquareOffTime] = useState('15:15');
    const [stage1Risk, setStage1Risk] = useState('10000');
    const [stage1Points, setStage1Points] = useState('150');
    const [totalFunds, setTotalFunds] = useState('1000000');
    const [availableToTrade, setAvailableToTrade] = useState('500000');
    const [singleTradeLossLimitAmount, setSingleTradeLossLimitAmount] = useState('2000');
    const [singleTradeLossLimitPoints, setSingleTradeLossLimitPoints] = useState('50');
    
    const [currentTime, setCurrentTime] = useState<string | null>(null);
    const openOrders = getOpenOrders();
    
    const isHistoricalMode = useMemo(() => journalDate && !isToday(journalDate), [journalDate]);

    useEffect(() => {
        const timer = setInterval(() => {
          setCurrentTime(new Date().toLocaleTimeString());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const technicalErrorOptions = useMemo(() => psychologyRules.filter(r => r.category === 'TECHNICAL ERRORS'), [psychologyRules]);
    const emotionOptions = useMemo(() => psychologyRules.filter(r => r.category === 'EMOTIONS'), [psychologyRules]);

    const handleEditPsychology = (tradeId: string, column: 'technical' | 'emotion', currentValue: string | undefined) => {
        setEditingCell({ tradeId, column });
        setTempSelectValue(currentValue || 'none');
    };
    
    const handleSavePsychology = (tradeId: string, column: 'technical' | 'emotion') => {
        const tradeToUpdate = closedPositions.find(t => t.id === tradeId);
        if (tradeToUpdate) {
            const key = column === 'technical' ? 'technicalErrorIds' : 'emotionIds';
            const newIds = tempSelectValue === 'none' ? [] : [tempSelectValue];
            updateTrade({ ...tradeToUpdate, [key]: newIds }, tradingMode);
            toast({ title: 'Success', description: `Trade updated.` });
        }
        setEditingCell(null);
        setTempSelectValue('');
    };

    const handlePsychologyFormSubmit = (data: PsychologyRuleFormData) => {
        if (editingPsychologyRule?.id) {
          updatePsychologyRule({...(editingPsychologyRule as PsychologyRule), ...data});
          toast({ title: "Success", description: "Rule updated." });
        } else {
          addPsychologyRule(data);
          toast({ title: "Success", description: "New psychology rule added." });
        }
        setIsPsychologyFormOpen(false);
        setEditingPsychologyRule(undefined);
    };
    
    const confirmDeletePsychologyRule = () => {
        if (psychologyRuleToDelete) {
            deletePsychologyRule(psychologyRuleToDelete.id);
            toast({ title: "Rule Deleted" });
            setPsychologyRuleToDelete(null);
        }
    };

    const renderPsychologyRuleCard = (rule: PsychologyRule) => (
      <Card key={rule.id} className="shadow-sm">
        <CardContent className="p-3 flex items-start gap-4">
            <p className="flex-grow text-sm text-muted-foreground">{rule.text}</p>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0 flex-shrink-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditingPsychologyRule(rule); setIsPsychologyFormOpen(true); }}>
                        <Edit2 className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPsychologyRuleToDelete(rule)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </CardContent>
      </Card>
    );

    const currentTradeLimits = useMemo(() => ({
        long: longTradeLimit,
        short: shortTradeLimit,
    }), [longTradeLimit, shortTradeLimit]);
    
    const closedPositions = useMemo(() => {
        if (!journalDate) return [];
        return allTrades[tradingMode].filter(t => {
            if (!t.exitTime || t.outcome === 'Open') return false;
            try {
                return isSameDay(parseISO(t.exitTime), journalDate);
            } catch (e) {
                return false;
            }
        });
    }, [allTrades, tradingMode, journalDate]);

    const cancelledOrders = useMemo(() => {
        if (!journalDate) return [];
        return dayActivities.filter(activity => {
            if (activity.event.toLowerCase().includes('cancel') && activity.cancellationData) {
                try {
                    return isSameDay(parseISO(activity.timestamp), journalDate);
                } catch (e) {
                    return false;
                }
            }
            return false;
        });
    }, [dayActivities, journalDate]);

    const todaysClosedPnl = useMemo(() => {
        return closedPositions.reduce((acc, p) => acc + (p.pnl || 0), 0);
    }, [closedPositions]);
    
    const todaysTradeCounts = useMemo(() => {
        if (isLoading || !journalDate) return { long: 0, short: 0 };
        const combined = [...allTrades.real, ...allTrades.theoretical];
        const uniqueTrades = Array.from(new Map(combined.map(t => [t.id, t])).values());

        const todaysTrades = uniqueTrades.filter(t => {
            try {
                return isSameDay(parseISO(t.entryTime), journalDate);
            } catch(e) { 
                return false; 
            }
        });
        
        return {
            long: todaysTrades.filter(t => t.positionType === 'Long').length,
            short: todaysTrades.filter(t => t.positionType === 'Short').length
        };
    }, [allTrades, isLoading, journalDate]);

    const isNewEntryDisabled = useMemo(() => {
        if (!journalDate) return true;
        
        return todaysTradeCounts.long >= longTradeLimit || todaysTradeCounts.short >= shortTradeLimit;
    }, [todaysTradeCounts, longTradeLimit, shortTradeLimit, journalDate]);

    const executionDiscipline = useMemo(() => {
        const todaysTrades = closedPositions;
        const alignedTrades = todaysTrades.filter(t => t.rulesFollowed === 'RULES FOLLOW').length;
        const totalTrades = todaysTrades.length;
        const percentage = totalTrades > 0 ? (alignedTrades / totalTrades) * 100 : 0;
        return { percentage, aligned: alignedTrades, total: totalTrades };
    }, [closedPositions]);


    useEffect(() => {
        if (!isLoading) {
            setActiveEdgeIds(allEdges[tradingMode].map(e => e.id));
        }
    }, [isLoading, allEdges, tradingMode]);
    
    const riskStats = useMemo(() => {
        const riskUsedAmount = todaysClosedPnl < 0 ? Math.abs(todaysClosedPnl) : 0;
        const dayRiskLimitAmount = parseFloat(stage1Risk) || 0;
        const dayRiskLimitPoints = parseFloat(stage1Points) || 0;
        
        const riskUsedPercentage = dayRiskLimitAmount > 0 ? (riskUsedAmount / dayRiskLimitAmount) : 0;
        
        const riskUsedPoints = riskUsedPercentage * dayRiskLimitPoints;
        
        const remainingRiskAmount = dayRiskLimitAmount - riskUsedAmount;
        const remainingPoints = dayRiskLimitPoints - riskUsedPoints;
        
        return {
            riskUsedAmount,
            dayRiskLimitAmount,
            riskUsedPoints,
            dayRiskLimitPoints,
            remainingRiskAmount,
            remainingPoints
        };
    }, [todaysClosedPnl, stage1Risk, stage1Points]);

    const handleSetLimits = (limits: { long: number; short: number }, reason: string) => {
        setTradeLimits(limits, reason);
        toast({
            title: "Trade Limits Updated",
            description: `New limits set. Long: ${limits.long}, Short: ${limits.short}.`
        });
    };

    const executeOrderAndCreatePosition = useCallback((orderToExecute: LiveOrder, executionPrice: number, mode: TradeLoggingMode, executionTime?: string) => {
        cancelLiveOrder(orderToExecute.id);
        
        const entryTime = executionTime || new Date().toISOString();

        const initialLog: TradeLogEntry[] = orderToExecute.log || [];
        initialLog.push({
            timestamp: entryTime,
            event: 'Position Opened',
            notes: `Executed from a ${orderToExecute.type} order.`,
            details: { executionPrice, edge: orderToExecute.edgeName }
        });

        const newPosition: Omit<Trade, 'id' | 'pnl' | 'outcome'> = {
            symbol: orderToExecute.symbol,
            positionType: orderToExecute.side === 'BUY' ? 'Long' : 'Short',
            index: orderToExecute.index,
            strikePrice: orderToExecute.strikePrice,
            entryPrice: executionPrice,
            quantity: orderToExecute.quantity,
            entryTime: entryTime,
            source: orderToExecute.source || 'manual',
            expiryType: orderToExecute.expiryType ?? 'Non-Expiry',
            strategyId: orderToExecute.strategyId,
            entryFormulaId: orderToExecute.entryFormulaIds?.[0], 
            stopLossFormulaIds: orderToExecute.stopLossFormulaIds,
            targetFormulaIds: orderToExecute.targetFormulaIds,
            sl: orderToExecute.slPrice,
            target: orderToExecute.tpPrice,
            log: initialLog,
            executionMode: mode,
            sourceEdgeEntryIndex: orderToExecute.sourceEdgeEntryIndex,
            sourceFlowId: orderToExecute.sourceFlowId,
        };
        try {
            addTrade(newPosition);
            toast({
                title: "Order Executed!",
                description: `Order filled at ${formatCurrency(executionPrice)} and moved to Open Positions.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Could Not Create Position',
                description: error.message,
            });
            addLiveOrder(orderToExecute); // Re-add the order if trade creation fails
        }
    }, [addTrade, toast, cancelLiveOrder, addLiveOrder]);
    
    const handleCancelAllOrders = useCallback((reason: string) => {
        const openOrders = getOpenOrders();
        if (openOrders.length > 0) {
            openOrders.forEach(order => {
                addDayActivity('Order Cancelled', 'Bulk Action', undefined, { order, reason });
                cancelLiveOrder(order.id);
            });
            toast({ title: "All Orders Cancelled", description: "All pending demo orders have been cancelled." });
        }
    }, [getOpenOrders, toast, addDayActivity, cancelLiveOrder]);
    
    const dashboardStats = useMemo(() => {
        const openUnrealizedPnl = 0;
        const grossPnl = todaysClosedPnl + openUnrealizedPnl;
        const totalCharges = closedPositions.reduce((acc, trade) => acc + calculateTradeCharges(trade), 0);
        const netPnl = grossPnl - totalCharges;
        
        return {
            grossPnl,
            netPnl,
            totalTrades: closedPositions.length,
            wins: closedPositions.filter(p => p.pnl !== undefined && p.pnl > 0).length,
            losses: closedPositions.filter(p => p.pnl !== undefined && p.pnl < 0).length,
        };
    }, [closedPositions, todaysClosedPnl]);

    const edges = allEdges[tradingMode];
    const formulas = allFormulas[tradingMode];
    
    const edgeMap = useMemo(() => new Map(edges.map(e => [e.id, e.name])), [edges]);
    const formulaMap = useMemo(() => new Map(formulas.map(f => [f.id, f.name])), [formulas]);

    const getNewEntryDisabledReason = () => {
        if (!journalDate) return "Journal date not set.";
        
        if (todaysTradeCounts.long >= longTradeLimit) {
            return "The daily limit for long trades has been reached.";
        }
        
        if (todaysTradeCounts.short >= shortTradeLimit) {
            return "The daily limit for short trades has been reached.";
        }

        return "New entries are currently disabled.";
    };

    const handleManualOrderSubmit = (values: z.infer<typeof manualEntryFormSchema>) => {
        const now = new Date();
        let createdAt: string;

        if (isHistoricalMode && values.entryTimeDate) {
            const entryDate = values.entryTimeDate;
            const hours = parseInt(values.entryTimeHours || format(now, 'HH'), 10);
            const minutes = parseInt(values.entryTimeMinutes || format(now, 'mm'), 10);
            createdAt = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), hours, minutes).toISOString();
        } else {
            createdAt = now.toISOString();
        }

        const newOrder: LiveOrder = {
            id: `ord-man-${Date.now()}`,
            symbol: `${values.index} ${values.strikePrice}`,
            index: values.index,
            strikePrice: values.strikePrice,
            type: values.orderType,
            side: values.side,
            quantity: parseFloat(values.quantity),
            price: values.price ? parseFloat(values.price) : 0,
            triggerPrice: values.triggerPrice ? parseFloat(values.triggerPrice) : undefined,
            status: 'PENDING',
            createdAt: createdAt,
            edgeName: edges.find(e => e.id === values.strategyId)?.name ?? 'Manual',
            slPrice: values.slPrice !== undefined ? parseFloat(values.slPrice) : undefined,
            tpPrice: values.tpPrice !== undefined ? parseFloat(values.tpPrice) : undefined,
            expiryType: values.expiryType,
            strategyId: values.strategyId,
            entryFormulaIds: values.entryFormulaIds,
            stopLossFormulaIds: values.stopLossFormulaIds,
            targetFormulaIds: values.targetFormulaIds,
            source: 'manual',
            sourceEdgeEntryIndex: values.selectedEdgeEntryIndex ? parseInt(values.selectedEdgeEntryIndex, 10) : undefined,
            sourceFlowId: values.sourceFlowId,
            log: [{
                timestamp: createdAt,
                event: isHistoricalMode ? 'Historical Order Logged' : 'Manual Order Placed',
                notes: isHistoricalMode ? 'Order created via historical log form.' : 'Order created via Journal Entry form.'
            }]
        };

        addLiveOrder(newOrder);
        toast({ title: isHistoricalMode ? "Historical Order Logged" : "Manual Order Added", description: `Pending ${newOrder.side} order for ${newOrder.symbol} created.` });
        setIsManualEntryOpen(false);
        
        if (pullbackToCreate) {
            clearPendingPullbackOrder(pullbackToCreate.id);
            setPullbackToCreate(null);
        }

        if (alertToCreate) {
            clearEntryAlert(alertToCreate.id);
            setAlertToCreate(null);
        }
    };

    const handleCancelOrderWithReason = useCallback((orderId: string, reason: string) => {
        const orderToCancel = getOpenOrders().find(o => o.id === orderId);
        if (!orderToCancel) return;

        addDayActivity('Order Cancelled', 'Bulk Action', undefined, { order: orderToCancel, reason });
        cancelLiveOrder(orderId);
        toast({ title: "Order Cancelled", description: `Order for ${orderToCancel.symbol} was cancelled.` });
        
        setOrderToCancel(null);
    }, [getOpenOrders, toast, addDayActivity, cancelLiveOrder]);
    
    const handleModifyOrder = useCallback((orderId: string, values: z.infer<ReturnType<typeof createModifyOrderFormSchema>>) => {
        const orderToModify = getOpenOrders().find(o => o.id === orderId);
        if (!orderToModify) return;

        const changes: Record<string, { before: any; after: any }> = {};
        const formatFormulas = (ids: string[] | undefined) => (ids && ids.length > 0) ? ids.map(id => formulaMap.get(id) || id).join(', ') : 'None';

        const newPrice = parseFloat(values.price);
        const newQuantity = parseFloat(values.quantity);
        const newSlPrice = values.slPrice ? parseFloat(values.slPrice) : undefined;
        const newTpPrice = values.tpPrice ? parseFloat(values.tpPrice) : undefined;
        const newEntryFormulaIds = values.entryFormulaIds || [];
        const newSlFormulaIds = values.stopLossFormulaIds || [];
        const newTargetFormulaIds = values.targetFormulaIds || [];
        
        if (newPrice !== orderToModify.price) changes.price = { before: orderToModify.price, after: newPrice };
        if (newQuantity !== orderToModify.quantity) changes.quantity = { before: orderToModify.quantity, after: newQuantity };
        if (newSlPrice !== orderToModify.slPrice) changes.slPrice = { before: orderToModify.slPrice ?? 'None', after: newSlPrice ?? 'None' };
        if (newTpPrice !== orderToModify.tpPrice) changes.tpPrice = { before: orderToModify.tpPrice ?? 'None', after: newTpPrice ?? 'None' };

        if (JSON.stringify((orderToModify.entryFormulaIds || []).sort()) !== JSON.stringify(newEntryFormulaIds.sort())) {
            changes.entryFormulas = { before: formatFormulas(orderToModify.entryFormulaIds), after: formatFormulas(newEntryFormulaIds) };
        }
        if (JSON.stringify((orderToModify.stopLossFormulaIds || []).sort()) !== JSON.stringify(newSlFormulaIds.sort())) {
            changes.stopLossFormulas = { before: formatFormulas(orderToModify.stopLossFormulaIds), after: formatFormulas(newSlFormulaIds) };
        }
        if (JSON.stringify((orderToModify.targetFormulaIds || []).sort()) !== JSON.stringify(newTargetFormulaIds.sort())) {
            changes.targetFormulas = { before: formatFormulas(orderToModify.targetFormulaIds), after: formatFormulas(newTargetFormulaIds) };
        }

        let newLog: TradeLogEntry[] = orderToModify.log || [];
        if (Object.keys(changes).length > 0) {
            newLog.push({
                timestamp: new Date().toISOString(),
                event: 'Order Modified Manually',
                notes: values.reason,
                details: { changes }
            });
        }

        const updatedOrder: LiveOrder = {
            ...orderToModify,
            price: newPrice,
            quantity: newQuantity,
            slPrice: newSlPrice,
            tpPrice: newTpPrice,
            entryFormulaIds: newEntryFormulaIds,
            stopLossFormulaIds: newSlFormulaIds,
            targetFormulaIds: newTargetFormulaIds,
            log: newLog
        };
        
        cancelLiveOrder(orderId);
        addLiveOrder(updatedOrder);
        toast({ title: "Order Modified", description: `Order for ${orderToModify?.symbol} has been updated.` });
        setOrderToModify(null);
    }, [getOpenOrders, formulas, formulaMap, addLiveOrder, cancelLiveOrder]);

    const handleSquareOff = useCallback((tradeId: string, values: SquareOffFormValues) => {
        const { tradingMode, exitDate, exitTimeHours, exitTimeMinutes } = values;
        
        let exitTime: string;
        if (isHistoricalMode && exitDate && exitTimeHours && exitTimeMinutes) {
            const exitDateTime = new Date(exitDate);
            exitDateTime.setHours(parseInt(exitTimeHours), parseInt(exitTimeMinutes));
            exitTime = exitDateTime.toISOString();
        } else {
            exitTime = new Date().toISOString();
        }

        const exitQuantity = parseFloat(values.quantity);
        const exitPrice = parseFloat(values.exitPrice);

        const realTrade = allTrades.real.find(t => t.id === tradeId);
        const theoreticalTrade = allTrades.theoretical.find(t => t.id === tradeId);

        const closeTrade = (tradeToClose: Trade, closeMode: TradeLoggingMode) => {
            const remainingQuantity = tradeToClose.quantity - exitQuantity;
            const logNote = remainingQuantity > 0 
                ? `Partial square off in ${closeMode} mode. Exited: ${exitQuantity}, Remaining: ${remainingQuantity}`
                : `Full square off in ${closeMode} mode`;

            const updatedTradeForClosure: Trade = {
                ...tradeToClose,
                quantity: exitQuantity,
                exitTime: exitTime,
                exitPrice: exitPrice,
                result: values.outcomeType === 'win' ? 'Target Hit' : 'SL Hit',
                exitFormulaId: values.exitFormulaId,
                closeMode: closeMode,
                log: [...(tradeToClose.log || []), {
                    timestamp: exitTime,
                    event: 'Position Closed Manually',
                    notes: values.reason || logNote,
                    details: { exitPrice, exitedQuantity: exitQuantity, reason: values.reason, closedIn: closeMode }
                }],
            };
            
            updateTrade(updatedTradeForClosure, closeMode);

            if (remainingQuantity > 0) {
                const updatedOriginalTrade: Trade = {
                    ...tradeToClose,
                    quantity: remainingQuantity,
                    log: [...(tradeToClose.log || []), {
                        timestamp: exitTime,
                        event: 'Position Reduced (Partial Exit)',
                        notes: `Remaining quantity: ${remainingQuantity}`,
                        details: { exitedQuantity: exitQuantity, remainingQuantity: remainingQuantity }
                    }]
                };
                updateTrade(updatedOriginalTrade, closeMode);
                toast({
                    title: `Partial Position Closed (${closeMode})`,
                    description: `${exitQuantity} units of ${tradeToClose.symbol} closed.`,
                });
            } else {
                 toast({
                    title: `Position Closed (${closeMode})`,
                    description: `${tradeToClose.symbol} position has been closed.`,
                });
            }
        };

        if (tradingMode === 'both') {
            if (realTrade) closeTrade(realTrade, 'both');
            if (theoreticalTrade && realTrade?.id !== theoreticalTrade?.id) closeTrade(theoreticalTrade, 'both');
        } else if (tradingMode === 'real' && realTrade) {
            closeTrade(realTrade, 'real');
        } else if (tradingMode === 'theoretical' && theoreticalTrade) {
            closeTrade(theoreticalTrade, 'theoretical');
        }

        setPositionToSquareOff(null);

        const tradeForPullbackCheck = theoreticalTrade || realTrade;
        if(tradeForPullbackCheck && values.outcomeType === 'win' && tradeForPullbackCheck.sourceFlowId) {
            const flow = logicalEdgeFlows.find(f => f.id === tradeForPullbackCheck.sourceFlowId);
            const followUpLogic = flow?.winFollowUp;
            if (followUpLogic?.nextEdgeId && followUpLogic.selectedEdgeEntryIndex !== undefined) {
                const nextEdge = edges.find(e => e.id === followUpLogic.nextEdgeId);
                if (nextEdge) {
                    addPendingPullbackOrder({
                        originalTrade: tradeForPullbackCheck,
                        nextEntryIndex: followUpLogic.selectedEdgeEntryIndex,
                        edge: nextEdge,
                    });
                     toast({
                        title: "Pullback Entry Alert!",
                        description: `A new pullback entry alert for ${nextEdge.name} has been added based on your winning trade.`,
                        className: "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-900 dark:text-teal-100 dark:border-teal-700"
                    });
                }
            }
        }

    }, [allTrades, updateTrade, toast, logicalEdgeFlows, edges, addPendingPullbackOrder, isHistoricalMode]);

    const handleModifyPosition = (tradeId: string, newValues: z.infer<typeof formSchemaModifyPosition>) => {
        const trade = openPositions.find(p => p.id === tradeId);
        if(!trade) return;
        
        const changes: Record<string, { before: any; after: any }> = {};
        const formatFormulas = (ids: string[] | undefined) => (ids && ids.length > 0) ? ids.map(id => formulaMap.get(id) || id).join(', ') : 'None';
        
        const newQuantity = parseFloat(newValues.quantity);
        if (newQuantity !== trade.quantity) {
            changes.quantity = { before: trade.quantity, after: newQuantity };
        }
        
        const newSl = newValues.sl ? parseFloat(newValues.sl) : undefined;
        if (newSl !== trade.sl) {
            changes.sl = { before: trade.sl ?? 'None', after: newSl ?? 'None' };
        }
        
        const newTarget = newValues.target ? parseFloat(newValues.target) : undefined;
        if (newTarget !== trade.target) {
            changes.target = { before: trade.target ?? 'None', after: newTarget ?? 'None' };
        }
    
        const oldSlFormulas = trade.stopLossFormulaIds || [];
        const newSlFormulas = newValues.stopLossFormulaIds || [];
        if (JSON.stringify(oldSlFormulas.slice().sort()) !== JSON.stringify(newSlFormulas.slice().sort())) {
            changes.stopLossFormulas = { before: formatFormulas(oldSlFormulas), after: formatFormulas(newSlFormulas) };
        }
        
        const oldTargetFormulas = trade.targetFormulaIds || [];
        const newTargetFormulas = newValues.targetFormulaIds || [];
        if (JSON.stringify(oldTargetFormulas.slice().sort()) !== JSON.stringify(newTargetFormulas.slice().sort())) {
            changes.targetFormulas = { before: formatFormulas(oldTargetFormulas), after: formatFormulas(newTargetFormulas) };
        }
    
        if (Object.keys(changes).length > 0) {
            const newLogEntry: TradeLogEntry = {
                timestamp: new Date().toISOString(),
                event: 'Position Modified Manually',
                notes: newValues.reason,
                details: { changes }
            };
    
            updateTrade({
                ...trade,
                quantity: newQuantity,
                sl: newSl,
                target: newTarget,
                stopLossFormulaIds: newSlFormulas,
                targetFormulaIds: newTargetFormulas,
                log: [...(trade.log || []), newLogEntry],
            }, trade.executionMode);
            toast({ title: "Position Modified", description: "Position details have been updated." });
        } else {
             toast({ title: "No Changes Detected", description: "The position details were not changed." });
        }
        
        setPositionToModify(null);
    };

    const handleHistoricalTradeSubmit = (data: TradeFormData) => {
        if (editingTrade) {
            const newLogEntry: TradeLogEntry = {
                timestamp: new Date().toISOString(),
                event: 'Trade Edited Post-Closure',
                notes: 'Manual correction of trade details after it was closed.'
            };
            const updatedTradeObject = { ...editingTrade, ...data, log: [...(editingTrade.log || []), newLogEntry] };
            updateTrade(updatedTradeObject, tradingMode);
            toast({ title: "Success", description: "Trade updated successfully." });
        } else {
            addHistoricalTrade(data);
        }
        setEditingTrade(null);
    };
    
    const handleJournalDateChange = (d: Date | undefined) => {
      if (d) {
        addDayActivity('Automation Date Changed', 'Settings', {
            changes: { 'Automation Date': { before: journalDate ? format(journalDate, "PPP") : "None", after: format(d, "PPP") } }
        });
        setJournalDate(d);
      }
    };
    
    const globalSettingsInitialValues = useMemo(() => ({
        entryRestrictionTime, squareOffTime, stage1Risk, stage1Points,
        totalFunds, availableToTrade, singleTradeLossLimitAmount, singleTradeLossLimitPoints,
        globalLotSize, activeEdgeIds, globalPositionType, globalExpiryType
    }), [
        entryRestrictionTime, squareOffTime, stage1Risk, stage1Points,
        totalFunds, availableToTrade, singleTradeLossLimitAmount, singleTradeLossLimitPoints,
        globalLotSize, activeEdgeIds, globalPositionType, globalExpiryType
    ]);

    const handleCreatePullback = (pullback: PendingPullbackOrder) => {
        setPullbackToCreate(pullback);
        setIsManualEntryOpen(true);
    };
    
    const handleCreateFromAlert = (alert: EntryAlert) => {
        setAlertToCreate(alert);
        setIsManualEntryOpen(true);
    };

    const handleExecuteOrder = (order: LiveOrder, price: number, mode: TradeLoggingMode, executionTime?: string) => {
        executeOrderAndCreatePosition(order, price, mode, executionTime);
        setOrderToExecute(null);
    };

    const handleDeleteRequest = (trade: Trade) => {
      setTradeToDelete(trade);
      setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (tradeToDelete) {
            deleteTrade(tradeToDelete.id);
            toast({
                title: "Trade Deleted",
                description: `The trade for ${tradeToDelete.symbol || 'ID: ' + tradeToDelete.id} has been permanently deleted.`,
            });
            setTradeToDelete(null);
        }
        setIsDeleteDialogOpen(false);
    };
    
    const handleUpdateActivity = (activityId: string, updates: { event?: string; notes?: string }) => {
        updateDayActivity(activityId, updates);
        setActivityToEdit(null);
    };

    const confirmDeleteActivity = () => {
        if (activityToDelete) {
            deleteActivityPermanently(activityToDelete.id);
            toast({
                title: "Log Entry Deleted",
                description: "The log entry has been permanently removed.",
            });
            setActivityToDelete(null);
        }
    };
    
    if (isLoading) {
        return (
            <MainLayout>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-44" />)}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Skeleton className="h-[400px]" />
                        <Skeleton className="h-[400px]" />
                    </div>
                    <Skeleton className="h-[300px]" />
                    <Skeleton className="h-[300px]" />
                </div>
            </MainLayout>
        );
    }
    
    const headerClock: ReactNode = (
        <div className="hidden sm:flex items-center gap-2 font-mono text-lg font-semibold text-primary bg-muted px-3 py-1 rounded-md">
            <Clock className="h-5 w-5" />
            {currentTime}
        </div>
    );

    const headerRightContent: ReactNode = (
        <div className="flex items-center gap-2 flex-wrap justify-end">
            
            {entryAlerts.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" className="relative bg-teal-200 text-teal-900 hover:bg-teal-300 dark:bg-teal-800 dark:text-teal-100 dark:hover:bg-teal-700">
                             <span className="relative flex h-3 w-3 -translate-x-1 -translate-y-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                            </span>
                            Entry Alerts ({entryAlerts.length})
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>Alerts from Logical Blocks</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {entryAlerts.map((alert) => (
                            <DropdownMenuItem key={alert.id} onSelect={() => handleCreateFromAlert(alert)} className="flex justify-between items-center">
                                <span>{alert.edge.name} / {alert.primaryTargetFormulaName || 'N/A'}</span>
                                <Badge>Create</Badge>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {pendingPullbackOrders.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" className="relative bg-amber-200 text-amber-900 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700">
                             <span className="relative flex h-3 w-3 -translate-x-1 -translate-y-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                            </span>
                            Pending Pullbacks ({pendingPullbackOrders.length})
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>Pending Pullback Entries</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {pendingPullbackOrders.map((pullback) => (
                            <DropdownMenuItem key={pullback.id} onSelect={() => handleCreatePullback(pullback)} className="flex justify-between items-center">
                                <span>{pullback.originalTrade.symbol} (Edge: {pullback.edge.name})</span>
                                <Badge>Create</Badge>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button 
                      onClick={() => setIsManualEntryOpen(true)}
                      variant="outline" 
                      size="sm" 
                      disabled={isNewEntryDisabled} 
                      className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary font-semibold"
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                       {isHistoricalMode ? 'Log Historical Trade' : 'Manual Entry'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {isNewEntryDisabled && (
                  <TooltipContent>
                    <p>{getNewEntryDisabledReason()}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            
            <Popover>
                <PopoverTrigger asChild>
                <Button variant={"outline"} size="sm" className={cn("w-full sm:w-[240px] justify-start text-left font-normal", !journalDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {journalDate ? format(journalDate, "PPP") : <span>Pick a date</span>}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={journalDate} onSelect={handleJournalDateChange} initialFocus />
                </PopoverContent>
            </Popover>
        </div>
    );

    return (
        <MainLayout headerCenterContent={headerClock} headerRightContent={headerRightContent}>
            
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 xl:grid-cols-5 gap-6">
                    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col xl:col-span-1">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-base font-medium font-body flex items-center justify-between">
                                Day's P&L
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 flex-grow flex flex-col justify-center">
                            <div className="grid grid-cols-2 gap-4">
                               <SummaryCard title="Gross P&L" value={formatCurrency(dashboardStats.grossPnl, { maximumFractionDigits: 0 })} size="compact" valueClassName={dashboardStats.grossPnl >= 0 ? 'text-green-600' : 'text-red-600'} />
                               <SummaryCard title="Net P&L" value={formatCurrency(dashboardStats.netPnl, { maximumFractionDigits: 0 })} size="compact" valueClassName={dashboardStats.netPnl >= 0 ? 'text-green-600' : 'text-red-600'} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-base font-medium font-body flex items-center justify-between">
                                Win / Loss
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 flex-grow flex flex-col justify-center">
                             <div className="grid grid-cols-2 gap-4">
                                <SummaryCard title="Wins" value={dashboardStats.wins} size="compact" valueClassName="text-green-600"/>
                                <SummaryCard title="Losses" value={dashboardStats.losses} size="compact" valueClassName="text-red-600"/>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-base font-medium font-body flex items-center justify-between">
                                Daily Trade Limits
                                <Target className="h-4 w-4 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 flex-grow flex flex-col justify-center">
                            <div className="text-sm text-muted-foreground space-y-2">
                                <p className="flex items-center gap-2 font-medium">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    <span>Long:</span>
                                    <span className="font-semibold text-foreground">{todaysTradeCounts.long} / {longTradeLimit}</span>
                                    <span className="ml-auto">({longTradeLimit - todaysTradeCounts.long} left)</span>
                                </p>
                                <p className="flex items-center gap-2 font-medium">
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                    <span>Short:</span>
                                    <span className="font-semibold text-foreground">{todaysTradeCounts.short} / {shortTradeLimit}</span>
                                    <span className="ml-auto">({shortTradeLimit - todaysTradeCounts.short} left)</span>
                                </p>
                                <p className="flex items-center gap-2 font-bold pt-2 border-t mt-3 text-base">
                                    <CheckCircle className="h-5 w-5 text-primary" />
                                    <span>Total Left:</span>
                                    <span className="font-semibold text-foreground ml-auto">{(longTradeLimit - todaysTradeCounts.long) + (shortTradeLimit - todaysTradeCounts.short)}</span>
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-base font-medium font-body flex items-center justify-between">
                                Execution Discipline
                                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 flex-grow flex flex-col justify-center items-center">
                            {executionDiscipline.total > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height={100}>
                                        <RadialBarChart
                                            innerRadius="70%"
                                            outerRadius="100%"
                                            barSize={10}
                                            data={[{ name: 'discipline', value: executionDiscipline.percentage, fill: 'hsl(var(--primary))' }]}
                                            startAngle={90}
                                            endAngle={-270}
                                        >
                                            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                            <RadialBar
                                                background={{ fill: 'hsl(var(--muted))' }}
                                                dataKey="value"
                                                cornerRadius={10}
                                            />
                                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">
                                                {`${Math.round(executionDiscipline.percentage)}%`}
                                            </text>
                                        </RadialBarChart>
                                    </ResponsiveContainer>
                                    <p className="text-xs text-center text-muted-foreground mt-1">
                                        {executionDiscipline.aligned} of {executionDiscipline.total} trades aligned
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-center text-muted-foreground p-4">No closed trades today.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-base font-medium font-body flex items-center justify-between">
                                Day's Risk Status
                                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 flex-grow flex flex-col justify-center">
                            <div className="text-sm text-muted-foreground space-y-2">
                                <p className="flex items-center justify-between font-medium">
                                    <span>Risk Used (₹):</span>
                                    <span className="font-semibold text-foreground">
                                        {formatCurrency(riskStats.riskUsedAmount, { maximumFractionDigits: 0 })} / {formatCurrency(riskStats.dayRiskLimitAmount, { maximumFractionDigits: 0 })}
                                    </span>
                                </p>
                                <p className="flex items-center justify-between font-medium">
                                    <span>Risk Used (Pts):</span>
                                    <span className="font-semibold text-foreground">
                                        {riskStats.riskUsedPoints.toFixed(0)} / {riskStats.dayRiskLimitPoints.toFixed(0)}
                                    </span>
                                </p>
                                <p className="flex items-center gap-2 font-bold pt-2 border-t mt-3 text-base">
                                    <span>Remaining Risk:</span>
                                    <span className="text-primary">
                                        {formatCurrency(riskStats.remainingRiskAmount, { maximumFractionDigits: 0 })} / {riskStats.remainingPoints.toFixed(0)} pts
                                    </span>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Open Orders ({openOrders.length})</CardTitle>
                                <CardDescription>Orders placed but not yet executed.</CardDescription>
                            </div>
                             <div className="flex items-center gap-2">
                                <Button variant="destructive" size="sm" onClick={() => setIsBulkCancelDialogOpen(true)} disabled={openOrders.length === 0}>Cancel All</Button>
                            </div>
                        </CardHeader>
                        <CardContent><Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order Details</TableHead>
                                    <TableHead className="text-right">Risk Amt.</TableHead>
                                    <TableHead className="text-right">Reward Amt.</TableHead>
                                    <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {openOrders.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No open orders.</TableCell></TableRow>}
                                {openOrders.map(order => {
                                    const riskAmount = (order.slPrice !== undefined) ? Math.abs(order.price - order.slPrice) * order.quantity : null;
                                    const rewardAmount = (order.tpPrice !== undefined) ? Math.abs(order.tpPrice - order.price) * order.quantity : null;
                                    const entryFormulas = order.entryFormulaIds?.map(id => formulaMap.get(id)).filter(Boolean) ?? [];
                                    const slFormulas = order.stopLossFormulaIds?.map(id => formulaMap.get(id)).filter(Boolean) ?? [];
                                    const targetFormulas = order.targetFormulaIds?.map(id => formulaMap.get(id)).filter(Boolean) ?? [];

                                    return (
                                        <TableRow key={order.id}>
                                            <TableCell>
                                                <div className="font-medium flex items-center gap-2">
                                                    <span>{order.symbol}</span>
                                                    <Badge variant="outline" className={cn(
                                                        order.side === 'BUY'
                                                        ? 'border-green-300 bg-green-100 text-green-800 dark:border-green-700 dark:bg-green-900/50 dark:text-green-200'
                                                        : 'border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-900/50 dark:text-red-200'
                                                    )}>
                                                        {order.side === 'BUY' ? 'Long' : 'Short'}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground mb-2">
                                                    <span>{order.type} {order.quantity} lots</span>
                                                    <span className="ml-2 font-mono">| {format(parseISO(order.createdAt), 'MMM d, HH:mm:ss')}</span>
                                                </div>
                                                <div className="text-xs space-y-1.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge variant="outline" className="bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 border-violet-300 dark:border-violet-700">{order.edgeName}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-semibold text-foreground shrink-0">Entry:</span>
                                                        <span className="text-muted-foreground">{formatCurrency(order.price)} @</span>
                                                        {entryFormulas.length > 0 ? entryFormulas.map(name => (
                                                            <Badge key={name} variant="outline" className="bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 border-sky-300 dark:border-sky-700 font-normal">{name}</Badge>
                                                        )) : (
                                                            <Badge variant="outline" className="bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 border-sky-300 dark:border-sky-700 font-normal">N/A</Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-semibold text-foreground shrink-0">SL:</span>
                                                        <span className="text-muted-foreground">{order.slPrice ? formatCurrency(order.slPrice) : 'N/A'} @</span>
                                                        {slFormulas.length > 0 ? slFormulas.map(name => (
                                                            <Badge key={name} variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300 dark:border-red-700 font-normal">{name}</Badge>
                                                        )) : (
                                                            <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300 dark:border-red-700 font-normal">N/A</Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-semibold text-foreground shrink-0">Target:</span>
                                                        <span className="text-muted-foreground">{order.tpPrice ? formatCurrency(order.tpPrice) : 'N/A'} @</span>
                                                        {targetFormulas.length > 0 ? targetFormulas.map(name => (
                                                            <Badge key={name} variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-300 dark:border-green-700 font-normal">{name}</Badge>
                                                        )) : (
                                                            <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-300 dark:border-green-700 font-normal">N/A</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                        <TableCell className="text-right">
                                            {riskAmount !== null ? (
                                                <Badge className="bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100 font-semibold hover:bg-red-200/80">
                                                    {formatCurrency(riskAmount)}
                                                </Badge>
                                            ) : <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {rewardAmount !== null ? (
                                                <Badge className="bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100 font-semibold hover:bg-green-200/80">
                                                    {formatCurrency(rewardAmount)}
                                                </Badge>
                                            ) : <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-row justify-center items-center gap-1">
                                                <Button size="sm" onClick={() => setOrderToExecute(order)} className="bg-green-600 hover:bg-green-700 text-white"><Play className="h-4 w-4 mr-1"/>Execute</Button>
                                                <Button size="sm" onClick={() => setOrderToModify(order)} className="bg-amber-500 hover:bg-amber-600 text-white">Modify</Button>
                                                <Button variant="destructive" size="sm" onClick={() => setOrderToCancel(order)}>Cancel</Button>
                                            </div>
                                        </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table></CardContent>
                    </Card>

                    <Card className="shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Open Positions ({openPositions.length})</CardTitle>
                                <CardDescription>Your current live trades.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent><Table>
                            <TableHeader><TableRow><TableHead>Position Details</TableHead><TableHead className="text-center">Execution Mode</TableHead><TableHead className="text-center">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {openPositions.length === 0 && <TableRow><TableCell colSpan={3} className="text-center">No open positions.</TableCell></TableRow>}
                                {openPositions.map(pos => {
                                    const entryName = formulaMap.get(pos.entryFormulaId || '') || 'N/A';
                                    const slFormulas = pos.stopLossFormulaIds?.map(id => formulaMap.get(id)).filter(Boolean) || [];
                                    const targetFormulas = pos.targetFormulaIds?.map(id => formulaMap.get(id)).filter(Boolean) || [];
                                    
                                    const executionMode = pos.executionMode;
                                    let badgeVariant: "default" | "destructive" | "secondary" | "outline" = "outline";
                                    let badgeClassName = "";
                                    let badgeText = "N/A";

                                    if (executionMode === 'both') {
                                        badgeVariant = 'default';
                                        badgeClassName = 'bg-green-600 hover:bg-green-700 border-transparent text-white';
                                        badgeText = "Both";
                                    } else if (executionMode === 'real') {
                                        badgeVariant = "destructive";
                                        badgeText = "Real";
                                    } else if (executionMode === 'theoretical') {
                                        badgeVariant = "secondary";
                                        badgeText = "Theoretical";
                                    }

                                    return (
                                    <TableRow key={pos.id}>
                                        <TableCell>
                                            <div className="font-medium flex items-center gap-2">
                                                <span>{pos.symbol}</span>
                                                <Badge variant="outline" className={cn(
                                                    pos.positionType === 'Long'
                                                    ? 'border-green-300 bg-green-100 text-green-800 dark:border-green-700 dark:bg-green-900/50 dark:text-green-200'
                                                    : 'border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-900/50 dark:text-red-200'
                                                )}>
                                                    {pos.positionType}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground mb-2">
                                                <span>Qty: {pos.quantity} @ {formatCurrency(pos.entryPrice)}</span>
                                                <span className="ml-2 font-mono">| {format(parseISO(pos.entryTime), 'MMM d, HH:mm:ss')}</span>
                                            </div>
                                            <div className="text-xs space-y-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="outline" className="bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 border-violet-300 dark:border-violet-700">{edgeMap.get(pos.strategyId || '') || 'N/A'}</Badge>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-semibold text-foreground shrink-0">Entry:</span>
                                                    <span className="text-muted-foreground">{formatCurrency(pos.entryPrice)} @</span>
                                                    <Badge variant="outline" className="bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 border-sky-300 dark:border-sky-700 font-normal">{entryName}</Badge>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-semibold text-foreground shrink-0">SL:</span>
                                                    <span className="text-muted-foreground">{pos.sl ? formatCurrency(pos.sl) : 'N/A'} @</span>
                                                    {slFormulas.length > 0 ? slFormulas.map(name => (
                                                        <Badge key={name} variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300 dark:border-red-700 font-normal">{name}</Badge>
                                                    )) : (
                                                        <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300 dark:border-red-700 font-normal">N/A</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-semibold text-foreground shrink-0">Target:</span>
                                                    <span className="text-muted-foreground">{pos.target ? formatCurrency(pos.target) : 'N/A'} @</span>
                                                    {targetFormulas.length > 0 ? targetFormulas.map(name => (
                                                        <Badge key={name} variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-300 dark:border-green-700 font-normal">{name}</Badge>
                                                    )) : (
                                                        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-300 dark:border-green-700 font-normal">N/A</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={badgeVariant} className={cn("capitalize", badgeClassName)}>{badgeText}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col sm:flex-row justify-center items-center gap-1">
                                                <Button size="sm" onClick={() => setPositionToSquareOff(pos)} className="bg-primary hover:bg-primary/90 text-primary-foreground">Square Off</Button>
                                                <Button size="sm" onClick={() => setPositionToModify(pos)} className="bg-amber-500 hover:bg-amber-600 text-white">Modify</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table></CardContent>
                    </Card>
                </div>
                
                <Card className="shadow-md">
                    <CardHeader><CardTitle>Closed Positions ({closedPositions.length})</CardTitle><CardDescription>Trades closed on the selected journal date.</CardDescription></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Position Details</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">P&amp;L</TableHead>
                                    <TableHead>Closed At</TableHead>
                                    <TableHead className="text-center">Divergence</TableHead>
                                    <TableHead className="w-[200px]">Technical Errors</TableHead>
                                    <TableHead className="w-[200px]">Emotions</TableHead>
                                    <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {closedPositions.length === 0 && <TableRow><TableCell colSpan={8} className="h-24 text-center">No closed positions for the selected date.</TableCell></TableRow>}
                                {closedPositions.map(pos => {
                                    const entryName = formulaMap.get(pos.entryFormulaId || '') || 'N/A';
                                    const exitFormula = formulas.find(f => f.id === pos.exitFormulaId);
                                    const wasExitedBySL = exitFormula?.type === 'stop-loss';
                                    const wasExitedByTarget = exitFormula?.type.startsWith('target-');
                                    
                                    const isEditingTechnical = editingCell?.tradeId === pos.id && editingCell.column === 'technical';
                                    const isEditingEmotion = editingCell?.tradeId === pos.id && editingCell.column === 'emotion';

                                    const selectedTechnicalError = technicalErrorOptions.find(o => o.id === pos.technicalErrorIds?.[0]);
                                    const selectedEmotion = emotionOptions.find(o => o.id === pos.emotionIds?.[0]);

                                    return (
                                        <TableRow key={pos.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium flex items-center gap-2">
                                                        {pos.parentId && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                    <CornerDownRight className="h-4 w-4 text-muted-foreground" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                    <p>Partial exit from trade ID: {pos.parentId}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                        <span>{pos.symbol}</span>
                                                        <Badge variant="outline" className={cn(
                                                            pos.positionType === 'Long'
                                                            ? 'border-green-300 bg-green-100 text-green-800 dark:border-green-700 dark:bg-green-900/50 dark:text-green-200'
                                                            : 'border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-900/50 dark:text-red-200'
                                                        )}>
                                                            {pos.positionType}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Qty: {pos.quantity} | Entry: {formatCurrency(pos.entryPrice)} | Exit: {formatCurrency(pos.exitPrice)}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2">
                                                    <Badge variant="outline" className="bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 border-violet-300 dark:border-violet-700">{edgeMap.get(pos.strategyId || '') || 'N/A'}</Badge>
                                                    | <Badge variant="outline" className="bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 border-sky-300 dark:border-sky-700 font-normal">Entry: {entryName}</Badge>
                                                    {exitFormula?.name && (
                                                        <>
                                                            | <Badge variant="outline" className={cn(
                                                                "font-normal",
                                                                wasExitedBySL && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300 dark:border-red-700",
                                                                wasExitedByTarget && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-300 dark:border-green-700"
                                                            )}>Exit: {exitFormula.name}</Badge>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {pos.result === 'Risk Limit Exit' ? (
                                                    <Badge variant="destructive" className="whitespace-nowrap bg-red-600 border-red-600 text-white hover:bg-red-700">
                                                        <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
                                                        {pos.result}
                                                    </Badge>
                                                ) : pos.result ? (
                                                    <Badge variant={'outline'} className={cn('whitespace-nowrap', {
                                                        'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300 dark:border-red-700': pos.result.toLowerCase().includes('sl'),
                                                        'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-300 dark:border-green-700': pos.result.toLowerCase().includes('target'),
                                                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700': !pos.result.toLowerCase().includes('sl') && !pos.result.toLowerCase().includes('target'),
                                                    })}>
                                                    {pos.result}
                                                    </Badge>
                                                ) : (
                                                    <span>-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className={cn("text-right font-semibold", (pos.pnl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(pos.pnl)}</TableCell>
                                            <TableCell>{pos.exitTime ? format(new Date(pos.exitTime), 'HH:mm:ss') : '-'}</TableCell>
                                            <TableCell className="text-center align-middle">
                                                <DivergenceIndicator trade={pos} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 min-w-[150px]">
                                                    {isEditingTechnical ? (
                                                        <>
                                                            <Select onValueChange={setTempSelectValue} defaultValue={tempSelectValue}>
                                                                <SelectTrigger className="h-8 text-xs flex-grow"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">None</SelectItem>
                                                                    {technicalErrorOptions.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.text}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                            <Button size="icon" className="h-8 w-8" onClick={() => handleSavePsychology(pos.id, 'technical')}><Check className="h-4 w-4" /></Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {!selectedTechnicalError ? (
                                                                <Badge variant="secondary">N/A</Badge>
                                                            ) : selectedTechnicalError.text === "No Technical Errors" ? (
                                                                <Badge variant="secondary" className="bg-green-100 text-green-900 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-100 border-green-200 dark:border-green-700">{selectedTechnicalError.text}</Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="bg-orange-100 text-orange-900 hover:bg-orange-100/80 dark:bg-orange-900/30 dark:text-orange-100 border-orange-200 dark:border-orange-700">{selectedTechnicalError.text}</Badge>
                                                            )}
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={() => handleEditPsychology(pos.id, 'technical', pos.technicalErrorIds?.[0])}><Pencil className="h-4 w-4" /></Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                 <div className="flex items-center gap-1 min-w-[150px]">
                                                    {isEditingEmotion ? (
                                                        <>
                                                            <Select onValueChange={setTempSelectValue} defaultValue={tempSelectValue}>
                                                                <SelectTrigger className="h-8 text-xs flex-grow"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">None</SelectItem>
                                                                    {emotionOptions.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.text}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                            <Button size="icon" className="h-8 w-8" onClick={() => handleSavePsychology(pos.id, 'emotion')}><Check className="h-4 w-4" /></Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {!selectedEmotion ? (
                                                                <Badge variant="secondary">N/A</Badge>
                                                            ) : selectedEmotion.text === "No - Emotions" ? (
                                                                <Badge variant="secondary" className="bg-green-100 text-green-900 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-100 border-green-200 dark:border-green-700">{selectedEmotion.text}</Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="bg-orange-100 text-orange-900 hover:bg-orange-100/80 dark:bg-orange-900/30 dark:text-orange-100 border-orange-200 dark:border-orange-700">{selectedEmotion.text}</Badge>
                                                            )}
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={() => handleEditPsychology(pos.id, 'emotion', pos.emotionIds?.[0])}><Pencil className="h-4 w-4" /></Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setEditingTrade(pos)}>
                                                            <Edit2 className="mr-2 h-4 w-4" />
                                                            <span>Edit</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDeleteRequest(pos)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            <span>Delete</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="shadow-md">
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle className="font-headline text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-red-600"/>Technical Errors</CardTitle>
                            <Button size="sm" variant="outline" onClick={()=>{ setEditingPsychologyRule({ category: 'TECHNICAL ERRORS' }); setIsPsychologyFormOpen(true); }}><PlusCircle className="mr-2 h-4 w-4"/>Log Error</Button>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {technicalErrorOptions.length > 0 ? technicalErrorOptions.map(renderPsychologyRuleCard) : <p className="text-sm text-center text-muted-foreground py-4">No technical errors logged.</p>}
                        </CardContent>
                    </Card>
                    <Card className="shadow-md">
                            <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle className="font-headline text-lg flex items-center gap-2"><HeartPulse className="h-5 w-5 text-pink-500"/>Emotions</CardTitle>
                            <Button size="sm" variant="outline" onClick={()=>{ setEditingPsychologyRule({ category: 'EMOTIONS' }); setIsPsychologyFormOpen(true); }}><PlusCircle className="mr-2 h-4 w-4"/>Log Emotion</Button>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {emotionOptions.length > 0 ? emotionOptions.map(renderPsychologyRuleCard) : <p className="text-sm text-center text-muted-foreground py-4">No emotions logged.</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Dialogs */}
             <ExecuteOrderDialog 
                isOpen={!!orderToExecute}
                onClose={() => setOrderToExecute(null)}
                onConfirm={handleExecuteOrder}
                order={orderToExecute}
                isHistorical={isHistoricalMode}
            />
            <TradeLimitDialog 
                isOpen={isLimitDialogOpen} 
                onClose={() => setIsLimitDialogOpen(false)} 
                onConfirm={handleSetLimits}
                currentLimits={currentTradeLimits}
            />
            <ManualEntryDialog 
                isOpen={isManualEntryOpen} 
                onClose={() => {
                    setIsManualEntryOpen(false);
                    setPullbackToCreate(null); 
                    setAlertToCreate(null);
                }}
                onSave={handleManualOrderSubmit} 
                edges={edges} 
                formulas={formulas}
                pullbackData={pullbackToCreate}
                alertData={alertToCreate}
                isHistorical={isHistoricalMode}
                journalDate={journalDate}
            />
            {orderToCancel && (
                <CancelOrderDialog 
                    isOpen={!!orderToCancel}
                    onClose={() => setOrderToCancel(null)}
                    onConfirm={handleCancelOrderWithReason}
                    order={orderToCancel}
                />
            )}
            <SquareOffDialog 
                isOpen={!!positionToSquareOff} 
                onClose={() => setPositionToSquareOff(null)} 
                onConfirm={handleSquareOff} 
                position={positionToSquareOff}
                formulas={formulas}
                isHistorical={isHistoricalMode}
                journalDate={journalDate}
              />
            {positionToModify && (
                <ModifyPositionDialog 
                    isOpen={!!positionToModify} 
                    onClose={() => setPositionToModify(null)} 
                    position={positionToModify} 
                    onSave={handleModifyPosition} 
                    formulas={formulas}
                />
            )}
            {orderToModify && (
                <ModifyOrderDialog 
                    isOpen={!!orderToModify} 
                    onClose={() => setOrderToModify(null)} 
                    order={orderToModify} 
                    onSave={handleModifyOrder}
                    formulas={formulas}
                />
            )}
            <BulkCancelDialog
                isOpen={isBulkCancelDialogOpen}
                onClose={() => setIsBulkCancelDialogOpen(false)}
                onConfirm={handleCancelAllOrders}
                orderCount={openOrders.length}
            />
            
            <DeleteConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                itemName={tradeToDelete ? `trade for ${tradeToDelete.symbol}` : 'this trade'}
            />
            
            <EditActivityDialog
                isOpen={!!activityToEdit}
                onClose={() => setActivityToEdit(null)}
                onSave={handleUpdateActivity}
                activity={activityToEdit}
            />
            <DeleteConfirmationDialog
                isOpen={!!activityToDelete}
                onClose={() => setActivityToDelete(null)}
                onConfirm={confirmDeleteActivity}
                itemName={activityToDelete ? `cancelled order log for "${activityToDelete.cancellationData?.order.symbol}"` : 'this item'}
            />
            <Dialog open={isPsychologyFormOpen} onOpenChange={setIsPsychologyFormOpen}>
                <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="font-headline">{editingPsychologyRule?.id ? 'Edit Rule' : 'Log New Rule'}</DialogTitle>
                    <DialogDescription>
                    Capture the specific error or emotion that influenced your trading.
                    </DialogDescription>
                </DialogHeader>
                <PsychologyRuleForm
                    onSubmit={handlePsychologyFormSubmit}
                    onCancel={() => setIsPsychologyFormOpen(false)}
                    initialData={editingPsychologyRule as PsychologyRule | undefined}
                />
                </DialogContent>
            </Dialog>

            <DeleteConfirmationDialog
                isOpen={!!psychologyRuleToDelete}
                onClose={() => setPsychologyRuleToDelete(null)}
                onConfirm={confirmDeletePsychologyRule}
                itemName="this psychology rule"
            />
             <Dialog open={!!editingTrade} onOpenChange={setEditingTrade}>
                <DialogContent className="sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-headline">Edit Trade</DialogTitle>
                    <DialogDescription>Update the details of your trade.</DialogDescription>
                </DialogHeader>
                <TradeForm
                    edges={edges}
                    formulas={formulas}
                    onSubmit={handleHistoricalTradeSubmit}
                    onCancel={() => setEditingTrade(null)}
                    initialData={editingTrade || undefined}
                    tradingMode={tradingMode}
                />
                </DialogContent>
            </Dialog>

        </MainLayout>
    );
}

const DivergenceIndicator = ({ trade }: { trade: Trade }) => {
    const { executionMode, closeMode } = trade;

    if (trade.outcome === 'Open') {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild><span><Minus className="h-4 w-4 text-muted-foreground" /></span></TooltipTrigger>
                    <TooltipContent><p>Divergence not applicable to open trades.</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    let indicator: React.ReactNode = <Minus className="h-4 w-4 text-muted-foreground" />;
    let tooltipText = "Divergence status could not be determined.";

    if (executionMode === 'both' && closeMode === 'both') {
        indicator = <CheckCircle className="h-5 w-5 text-green-500" />;
        tooltipText = 'Aligned: Executed and closed in both modes.';
    } else if (executionMode === 'real' && closeMode === 'real') {
        indicator = <XCircle className="h-5 w-5 text-red-500" />;
        tooltipText = 'Fully Diverged (Real Only): Executed and closed in real mode only.';
    } else if (executionMode === 'theoretical' && closeMode === 'theoretical') {
        indicator = <Bot className="h-5 w-5 text-cyan-500" />;
        tooltipText = 'Theoretical Only: Executed and closed in theoretical mode only.';
    } else if (executionMode === 'both' && closeMode === 'real') {
        indicator = <AlertTriangle className="h-5 w-5 text-amber-500" />;
        tooltipText = 'Partially Diverged: Aligned entry, but real-only exit.';
    } else if (executionMode === 'real' && closeMode === 'both') {
        indicator = <AlertTriangle className="h-5 w-5 text-amber-500" />;
        tooltipText = 'Partially Diverged: Real-only entry, but aligned exit.';
    } else if (executionMode === 'both' && closeMode === 'theoretical') {
        indicator = <AlertTriangle className="h-5 w-5 text-amber-500" />;
        tooltipText = 'Partially Diverged: Aligned entry, but theoretical-only exit.';
    } else if (executionMode === 'theoretical' && closeMode === 'both') {
        indicator = <AlertTriangle className="h-5 w-5 text-amber-500" />;
        tooltipText = 'Partially Diverged: Theoretical-only entry, but aligned exit.';
    } else {
        tooltipText = 'Divergence data not available for this trade.';
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild><span>{indicator}</span></TooltipTrigger>
                <TooltipContent><p>{tooltipText}</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};


"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Trade, Formula } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '../ui/switch';
import { ScrollArea } from '../ui/scroll-area';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';


const createFormSchema = (position: Trade) => z.object({
  quantity: z.string()
    .refine(v => !isNaN(parseFloat(v)), "Quantity must be a number.")
    .refine(v => parseFloat(v) > 0, "Quantity must be greater than 0.")
    .refine(v => parseFloat(v) <= position.quantity, `Quantity cannot exceed current position size of ${position.quantity}.`),
  exitPrice: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "Exit price must be a positive number" }),
  outcomeType: z.enum(['win', 'loss'], { required_error: "You must select Win or Loss." }),
  structureStatus: z.enum(['change', 'no-change']),
  targetBalance: z.enum(['yes', 'no']),
  exitFormulaId: z.string().optional(),
  reason: z.string().optional(),
  tradingMode: z.enum(['both', 'real', 'theoretical'], { required_error: "Please select a trading mode." }),
  // New fields for historical exit
  exitDate: z.date().optional(),
  exitTimeHours: z.string().optional(),
  exitTimeMinutes: z.string().optional(),
});

export type SquareOffFormValues = z.infer<ReturnType<typeof createFormSchema>>;

interface SquareOffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  position: Trade | null;
  onConfirm: (positionId: string, values: SquareOffFormValues) => void;
  formulas: Formula[];
  isHistorical?: boolean;
  journalDate?: Date;
}

export default function SquareOffDialog({ isOpen, onClose, position, onConfirm, formulas, isHistorical, journalDate }: SquareOffDialogProps) {
  const { toast } = useToast();
  
  const formSchema = useMemo(() => position ? createFormSchema(position) : z.object({}), [position]);

  const form = useForm<SquareOffFormValues>({
    resolver: zodResolver(formSchema),
  });

  const outcomeType = form.watch('outcomeType');
  const structureStatus = form.watch('structureStatus');
  const targetBalance = form.watch('targetBalance');
  const exitPrice = form.watch('exitPrice');
  const quantity = form.watch('quantity');

  const relevantTargetFormulas = useMemo(() => {
    if (!position || outcomeType !== 'win') return [];
    
    if (targetBalance === 'yes') {
        return formulas.filter(f => f.type === 'target' && f.subType === 'Regular');
    }

    if (structureStatus === 'change') {
      return formulas.filter(f => f.type === 'target' && f.subType === 'Structure Change');
    }
    const tradeTargetIds = new Set(position.targetFormulaIds || []);
    return formulas.filter(f => tradeTargetIds.has(f.id));
  }, [formulas, structureStatus, position, outcomeType, targetBalance]);

  const relevantStopLossFormulas = useMemo(() => {
    if (!position || outcomeType !== 'loss') return [];
    if (structureStatus === 'change') {
      return formulas.filter(f => f.type === 'stop-loss' && f.subType === 'Structure Change');
    }
    const tradeStopLossIds = new Set(position.stopLossFormulaIds || []);
    return formulas.filter(f => tradeStopLossIds.has(f.id));
  }, [formulas, structureStatus, position, outcomeType]);

  useEffect(() => {
    if (isOpen && position) {
      form.reset({
        quantity: String(position.quantity),
        exitPrice: '',
        outcomeType: undefined,
        structureStatus: 'no-change',
        targetBalance: 'no',
        exitFormulaId: undefined,
        reason: '',
        tradingMode: undefined,
        exitDate: isHistorical ? (journalDate || new Date()) : undefined,
        exitTimeHours: isHistorical ? format(new Date(), 'HH') : undefined,
        exitTimeMinutes: isHistorical ? format(new Date(), 'mm') : undefined,
      });
    }
  }, [isOpen, position, form, isHistorical, journalDate]);
  
  useEffect(() => {
      form.setValue('exitFormulaId', undefined);
  }, [outcomeType, structureStatus, targetBalance, form]);
  

  const handleOutcomeChange = (value: 'win' | 'loss') => {
      form.setValue('outcomeType', value, { shouldValidate: true });
      if (!position) return;
      
      if (value === 'win') {
          form.setValue('exitPrice', position.target ? String(position.target) : '', { shouldValidate: true });
      } else if (value === 'loss') {
          form.setValue('exitPrice', position.sl ? String(position.sl) : '', { shouldValidate: true });
      }
  };

  const calculatedPnl = useMemo(() => {
    if (!position) return null;
    const price = parseFloat(exitPrice);
    const qty = parseFloat(quantity);
    if (isNaN(price) || isNaN(qty) || qty <= 0) return null;

    if (position.positionType === 'Long') {
      return (price - position.entryPrice) * qty;
    }
    return (position.entryPrice - price) * qty;
  }, [exitPrice, quantity, position]);
  
  const handleSubmit = (values: SquareOffFormValues) => {
    if (!position) return;
    onConfirm(position.id, values);
    onClose();
  };

  if (!position) return null;

  const isPartialExit = parseFloat(form.getValues().quantity) < position.quantity;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Square Off: {position.symbol}</DialogTitle>
          <DialogDescription>
            Enter exit details to close this position. It will be moved to closed positions.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-6 -mr-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} id="squareOffForm" className="space-y-4">
              {isHistorical && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="exitDate" render={({ field }) => (
                          <FormItem className="flex flex-col">
                              <FormLabel>Exit Date</FormLabel>
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
                          <FormField control={form.control} name="exitTimeHours" render={({ field }) => (
                              <FormItem className="flex-1"><FormLabel>Time (HH:MM)</FormLabel><FormControl><Input type="number" min="0" max="23" placeholder="HH" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <span className="pb-2 font-bold text-lg">:</span>
                          <FormField control={form.control} name="exitTimeMinutes" render={({ field }) => (
                              <FormItem className="flex-1 self-end"><FormControl><Input type="number" min="0" max="59" placeholder="MM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                          )} />
                      </div>
                  </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity to Exit</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="exitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exit Price</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              {calculatedPnl !== null && (
                   <div className="text-sm font-medium text-center p-2 rounded-md bg-muted">
                      Estimated P&L:{' '}
                      <span className={cn(calculatedPnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {formatCurrency(calculatedPnl)}
                      </span>
                  </div>
              )}
              <div className="grid grid-cols-2 gap-4 items-center">
                <FormField
                  control={form.control}
                  name="outcomeType"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Outcome</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={handleOutcomeChange} value={field.value} className="flex gap-4">
                          <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="win" /></FormControl><FormLabel className="font-normal">Win</FormLabel></FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="loss" /></FormControl><FormLabel className="font-normal">Loss</FormLabel></FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="structureStatus"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-2">
                      <div className="space-y-0.5">
                        <FormLabel>Structure Status</FormLabel>
                        <FormDescription className="text-xs">
                          {field.value === 'change' ? "Change" : "No Change"}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === 'change'}
                          onCheckedChange={(checked) => field.onChange(checked ? 'change' : 'no-change')}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              {outcomeType === 'win' && (
                <FormField
                    control={form.control}
                    name="targetBalance"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Target Balance</FormLabel>
                          <FormDescription className="text-xs">
                            {field.value === 'yes' ? "Yes" : "No"}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value === 'yes'}
                            onCheckedChange={(checked) => field.onChange(checked ? 'yes' : 'no')}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
              )}
               <FormField
                  control={form.control}
                  name="tradingMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Log To</FormLabel>
                      <Select {...field} onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Rule" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="theoretical">Theoretical Only</SelectItem>
                          <SelectItem value="real">Real Only</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              {outcomeType === 'win' && (
                <FormField
                  control={form.control}
                  name="exitFormulaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Formula</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''} key={`target-${structureStatus}-${targetBalance}`}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select target formula..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <ScrollArea className="max-h-60">
                            {relevantTargetFormulas.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
              {outcomeType === 'loss' && (
                <FormField
                  control={form.control}
                  name="exitFormulaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stop Loss Formula</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''} key={`sl-${structureStatus}`}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select stop loss formula..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <ScrollArea className="max-h-60">
                              {relevantStopLossFormulas.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Exit (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Market conditions changed..." {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="squareOffForm" variant="destructive">{isPartialExit ? 'Confirm Partial Exit' : 'Confirm Full Exit'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

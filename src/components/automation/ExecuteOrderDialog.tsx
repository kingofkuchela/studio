
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { LiveOrder, TradingMode } from '@/types';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

const executeOrderFormSchema = z.object({
  executionPrice: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "Execution price must be a positive number" }),
  tradingMode: z.enum(['both', 'real', 'theoretical'], { required_error: "Please select a trading mode." }),
  executionDate: z.date().optional(),
  executionHours: z.string().optional(),
  executionMinutes: z.string().optional(),
});

interface ExecuteOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (order: LiveOrder, price: number, mode: 'both' | 'real' | 'theoretical', executionTime?: string) => void;
  order: LiveOrder | null;
  isHistorical?: boolean;
}

export default function ExecuteOrderDialog({ isOpen, onClose, onConfirm, order, isHistorical }: ExecuteOrderDialogProps) {
  const form = useForm<z.infer<typeof executeOrderFormSchema>>({
    resolver: zodResolver(executeOrderFormSchema),
  });

  useEffect(() => {
    if (order) {
      const executionTime = new Date(order.createdAt);
      form.reset({ 
        executionPrice: order.price ? String(order.price) : '',
        tradingMode: undefined,
        executionDate: isHistorical ? executionTime : new Date(),
        executionHours: isHistorical ? format(executionTime, 'HH') : format(new Date(), 'HH'),
        executionMinutes: isHistorical ? format(executionTime, 'mm') : format(new Date(), 'mm'),
      });
    }
  }, [order, form, isHistorical]);

  if (!order) return null;

  const handleSubmit = (values: z.infer<typeof executeOrderFormSchema>) => {
    let executionTime: string | undefined = undefined;
    if (isHistorical && values.executionDate && values.executionHours && values.executionMinutes) {
        const finalDate = new Date(values.executionDate);
        finalDate.setHours(parseInt(values.executionHours), parseInt(values.executionMinutes));
        executionTime = finalDate.toISOString();
    }
    onConfirm(order, parseFloat(values.executionPrice), values.tradingMode, executionTime);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manually Execute: {order.symbol}</DialogTitle>
          <DialogDescription>
            Enter the price at which this order was executed to move it to open positions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="executionPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Execution Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 150.55" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tradingMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Log To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
            </div>
             {isHistorical && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="executionDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Execution Date</FormLabel>
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
                        <FormField control={form.control} name="executionHours" render={({ field }) => (
                            <FormItem className="flex-1"><FormLabel>Time (HH:MM)</FormLabel><FormControl><Input type="number" min="0" max="23" placeholder="HH" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <span className="pb-2 font-bold text-lg">:</span>
                        <FormField control={form.control} name="executionMinutes" render={({ field }) => (
                            <FormItem className="flex-1 self-end"><FormControl><Input type="number" min="0" max="59" placeholder="MM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Execute Order</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

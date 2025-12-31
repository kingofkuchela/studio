
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Formula, LiveOrder } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Bell } from 'lucide-react';

const createFormSchema = (side: 'BUY' | 'SELL') => z.object({
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
  reason: z.string().refine(val => val.trim().split(/\s+/).length >= 5, {
    message: "Reason must be at least 5 words.",
  }),
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


interface ModifyOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: LiveOrder;
  onSave: (orderId: string, values: z.infer<ReturnType<typeof createFormSchema>>) => void;
  marketPrice?: number;
  formulas: Formula[];
}

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


export default function ModifyOrderDialog({ isOpen, onClose, order, onSave, marketPrice, formulas }: ModifyOrderDialogProps) {
    const formSchema = useMemo(() => createFormSchema(order.side), [order.side]);
    type FormValues = z.infer<typeof formSchema>;
    
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    const [wordCount, setWordCount] = useState(0);
    const reasonValue = form.watch("reason");

    useEffect(() => {
        if(isOpen) {
            form.reset({
                price: order.price.toString(),
                quantity: order.quantity.toString(),
                slPrice: order.slPrice?.toString() ?? '',
                tpPrice: order.tpPrice?.toString() ?? '',
                entryFormulaIds: order.entryFormulaIds ?? [],
                stopLossFormulaIds: order.stopLossFormulaIds ?? [],
                targetFormulaIds: order.targetFormulaIds ?? [],
                reason: '',
                index: order.index,
                strikePrice: order.strikePrice,
            });
        }
    }, [isOpen, order, form]);

    useEffect(() => {
        const words = reasonValue?.trim().split(/\s+/).filter(Boolean) || [];
        setWordCount(words.length);
    }, [reasonValue]);

    const entryFormulas = useMemo(() => formulas.filter(f => f.type === 'normal-entry' || f.type === 'breakout-entry'), [formulas]);
    const stopLossFormulas = useMemo(() => formulas.filter(f => f.type === 'stop-loss'), [formulas]);
    const targetFormulas = useMemo(() => formulas.filter(f => f.type === 'target-index' || f.type === 'target-option'), [formulas]);
    
    const handleSubmit = (values: FormValues) => {
        onSave(order.id, values);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        Modify Pending Order: {order.symbol}
                        {marketPrice !== undefined && (
                            <span className="text-muted-foreground font-normal text-sm ml-2">
                                @ {formatCurrency(marketPrice)}
                            </span>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        Update the details for this pending order.
                    </DialogDescription>
                </DialogHeader>
                <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-500/30">
                  <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-amber-800 dark:text-amber-300">Rule Reminder</AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    Please follow your trading rules before modifying existing entries. This action will be logged.
                  </AlertDescription>
                </Alert>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        {/* Hidden fields to preserve data */}
                        <FormField control={form.control} name="index" render={({ field }) => <Input type="hidden" {...field} />} />
                        <FormField control={form.control} name="strikePrice" render={({ field }) => <Input type="hidden" {...field} />} />

                        <div className="grid grid-cols-2 gap-4">
                           <FormField control={form.control} name="price" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Limit Price</FormLabel>
                                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 150.00" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="quantity" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Lot Size</FormLabel>
                                    <FormControl><Input type="number" step="1" placeholder="e.g., 50" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <div className="space-y-2">
                            <FormField control={form.control} name="entryFormulaIds" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Entry Formulas</FormLabel>
                                    <MultiSelectFormulaField {...field} placeholder="Select entry formulas..." formulas={entryFormulas} />
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <FormField control={form.control} name="stopLossFormulaIds" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>SL Formulas</FormLabel>
                                    <MultiSelectFormulaField {...field} placeholder="Select SL formulas..." formulas={stopLossFormulas} />
                                    <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="slPrice" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>SL Price</FormLabel>
                                    <FormControl><Input type="number" step="0.01" placeholder="e.g. 145.50" {...field} value={field.value ?? ''}/></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <div className="space-y-2">
                                <FormField control={form.control} name="targetFormulaIds" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Target Formulas</FormLabel>
                                    <MultiSelectFormulaField {...field} placeholder="Select target formulas..." formulas={targetFormulas} />
                                    <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="tpPrice" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Target Price</FormLabel>
                                    <FormControl><Input type="number" step="0.01" placeholder="e.g. 160.00" {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                         <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Why do you want to change this entry?</FormLabel>
                                <FormControl><Textarea placeholder="Describe your reasoning for this modification..." {...field} /></FormControl>
                                <FormMessage />
                                <p className="text-xs text-muted-foreground text-right">
                                    {wordCount} / 5 words
                                </p>
                                </FormItem>
                            )}
                         />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

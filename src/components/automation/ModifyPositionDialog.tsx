
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Formula, Trade } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Bell } from 'lucide-react';

const formSchema = z.object({
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
  reason: z.string().refine(val => val.trim().split(/\s+/).length >= 5, {
    message: "Reason must be at least 5 words.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface ModifyPositionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  position: Trade;
  onSave: (positionId: string, newValues: FormValues) => void;
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


export default function ModifyPositionDialog({ isOpen, onClose, position, onSave, marketPrice, formulas }: ModifyPositionDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: position.quantity.toString(),
      sl: position.sl?.toString() ?? '',
      target: position.target?.toString() ?? '',
      stopLossFormulaIds: position.stopLossFormulaIds ?? [],
      targetFormulaIds: position.targetFormulaIds ?? [],
      reason: '',
    },
  });

  const [wordCount, setWordCount] = useState(0);
  const reasonValue = form.watch("reason");

  useEffect(() => {
    if (isOpen) {
      form.reset({
        quantity: position.quantity.toString(),
        sl: position.sl?.toString() ?? '',
        target: position.target?.toString() ?? '',
        stopLossFormulaIds: position.stopLossFormulaIds ?? [],
        targetFormulaIds: position.targetFormulaIds ?? [],
        reason: '',
      });
    }
  }, [isOpen, position, form]);

  useEffect(() => {
      const words = reasonValue?.trim().split(/\s+/).filter(Boolean) || [];
      setWordCount(words.length);
  }, [reasonValue]);
  
  const stopLossFormulas = useMemo(() => formulas.filter(f => f.type === 'stop-loss'), [formulas]);
  const targetFormulas = useMemo(() => formulas.filter(f => f.type === 'target-index' || f.type === 'target-option'), [formulas]);

  const handleSubmit = (values: FormValues) => {
    onSave(position.id, values);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Modify Position: {position.symbol}
            {marketPrice !== undefined && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                    @ {formatCurrency(marketPrice)}
                </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Update the details for this open position.
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
             <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                    <FormLabel>Lot Size</FormLabel>
                    <FormControl><Input type="number" step="1" placeholder="e.g., 50" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <div className="space-y-2">
                <FormField control={form.control} name="stopLossFormulaIds" render={({ field }) => (
                    <FormItem>
                    <FormLabel>SL Formulas</FormLabel>
                    <MultiSelectFormulaField
                        {...field}
                        placeholder="Select SL formulas..."
                        formulas={stopLossFormulas}
                    />
                    <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="sl" render={({ field }) => (
                    <FormItem>
                    <FormLabel>SL Price</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g. 110.50" {...field} value={field.value ?? ''}/></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
            </div>
            <div className="space-y-2">
                <FormField control={form.control} name="targetFormulaIds" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Target Formulas</FormLabel>
                    <MultiSelectFormulaField
                        {...field}
                        placeholder="Select target formulas..."
                        formulas={targetFormulas}
                    />
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="target" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Target Price</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g. 150.00" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
            </div>
             <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Why do you want to change this position?</FormLabel>
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
}

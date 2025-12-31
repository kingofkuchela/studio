
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { TimeBlock, LinkEntryConditionType, DailyPlan } from '@/types';
import { Switch } from '../ui/switch';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

const conditionTypes: { value: Exclude<LinkEntryConditionType, 'Custom' | ''>, label: string }[] = [
  { value: 'Day Type', label: 'Day Type' },
  { value: 'E(15)', label: 'E(15)' },
  { value: 'E(5)', label: 'E(5)' },
  { value: '1st 15 Min Open', label: '1st 15 Min Open' },
  { value: '1st 5 Min Close', label: '1st 5 Min Close' },
  { value: '1st 15 Min Close', label: '1st 15 Min Close' },
  { value: 'Candle Confirmation', label: 'Candle Confirmation' },
  { value: 'IB Close', label: 'IB Close' },
  { value: 'IB Break', label: 'IB Break' },
  { value: 'CPR Size', label: 'CPR Size' },
  { value: 'Price Sensitivity', label: 'Price Sensitivity' },
  { value: 'Initial Low', label: 'Initial Low' },
  { value: 'BTST', label: 'BTST' },
  { value: 'BREAK SIDE', label: 'Break Side' },
];

const formSchema = z.object({
  blocks: z.array(z.object({
    id: z.string(),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time is required and must be in HH:mm format."),
    conditionType: z.enum(['Day Type', 'E(15)', 'E(5)', '1st 15 Min Open', '1st 5 Min Close', '1st 15 Min Close', 'Candle Confirmation', 'IB Close', 'IB Break', 'CPR Size', 'Price Sensitivity', 'Initial Low', 'BTST', 'BREAK SIDE', 'Custom', '']),
    conditionId: z.string().optional(),
    customConditionName: z.string().optional(),
    isRecurring: z.boolean(),
    isAlarmOn: z.boolean(),
    isFrozen: z.boolean(),
    dailyOverrides: z.record(z.string()).optional(), 
  })),
});

type FormValues = z.infer<typeof formSchema>;

interface PlanSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: DailyPlan) => void;
  planDate: string;
  initialBlockToFocus?: TimeBlock;
  isRecurring: boolean;
}

export default function PlanSettingsDialog({ isOpen, onClose, onSave, planDate, initialBlockToFocus, isRecurring }: PlanSettingsDialogProps) {
  const { dailyPlans, recurringBlocks, updateRecurringBlock, addRecurringBlock, dayTypes, breakSides, emaStatuses, ema5Statuses, openingObservations, first5MinCloses, first15MinCloses, candleConfirmations, ibCloses, ibBreaks, cprSizes, priceSensitivities, initialLows, btsts } = useAppContext();
  const blockRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const allConditions = {
      dayTypes, breakSides, emaStatuses, ema5Statuses, openingObservations, first5MinCloses, first15MinCloses, candleConfirmations, ibCloses, ibBreaks, cprSizes, priceSensitivities, initialLows, btsts
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      blocks: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "blocks",
  });
  
  useEffect(() => {
    if (isOpen) {
      const planForDay = dailyPlans.find(p => p.date === planDate);
      
      const blocksToShow = isRecurring 
        ? recurringBlocks 
        : planForDay?.blocks.filter(b => !b.isRecurring) || [];
      
      form.reset({ blocks: JSON.parse(JSON.stringify(blocksToShow)) });
      
      if(initialBlockToFocus?.id) {
          setTimeout(() => {
              const ref = blockRefs.current.get(initialBlockToFocus.id);
              ref?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
      }
    }
  }, [isOpen, planDate, dailyPlans, recurringBlocks, form, initialBlockToFocus, isRecurring]);

  const handleSubmit = (values: FormValues) => {
    if (isRecurring) {
      values.blocks.forEach(block => {
        const exists = recurringBlocks.some(rb => rb.id === block.id);
        if (exists) {
          updateRecurringBlock(block);
        } else {
          addRecurringBlock(block);
        }
      });
      onClose();
    } else {
      const existingPlan = dailyPlans.find(p => p.date === planDate);
      // Ensure we keep the recurring blocks for the day and only update the non-recurring ones.
      const recurringBlocksForDay = existingPlan?.blocks.filter(b => b.isRecurring) || [];
      const newPlan: DailyPlan = {
        date: planDate,
        blocks: [...recurringBlocksForDay, ...values.blocks],
      };
      onSave(newPlan);
    }
  };
  
  const conditionOptionMap = {
    'Day Type': allConditions.dayTypes,
    'BREAK SIDE': allConditions.breakSides,
    'E(15)': allConditions.emaStatuses,
    'E(5)': allConditions.ema5Statuses,
    '1st 15 Min Open': allConditions.openingObservations,
    '1st 5 Min Close': allConditions.first5MinCloses,
    '1st 15 Min Close': allConditions.first15MinCloses,
    'Candle Confirmation': allConditions.candleConfirmations,
    'IB Close': allConditions.ibCloses,
    'IB Break': allConditions.ibBreaks,
    'Initial Low': allConditions.initialLows,
    'CPR Size': allConditions.cprSizes,
    'Price Sensitivity': allConditions.priceSensitivities,
    'BTST': allConditions.btsts,
    'Custom': [],
  };

  const handleAddBlock = () => {
    append({
      id: `block-${Date.now()}-${Math.random()}`,
      time: '',
      conditionType: '',
      conditionId: '',
      isRecurring: isRecurring,
      isAlarmOn: false,
      isFrozen: false,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isRecurring ? "Manage Recurring Blocks" : `Manage Plan for ${planDate}`}</DialogTitle>
          <DialogDescription>
            {isRecurring ? "Edit your master daily template. These blocks appear every day." : "Manage the one-off time blocks for this specific day."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0 overflow-y-auto pr-6 -mr-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} id="plan-settings-form" className="space-y-4">
              {fields.length === 0 && !isRecurring && (
                 <Alert>
                    <AlertTitle>No Daily-Specific Blocks</AlertTitle>
                    <AlertDescription>
                      You are currently viewing the blocks for this specific day. Any blocks you add here will only apply to {planDate}. To edit the master template, close this dialog and edit a recurring block directly from the main Time Blocks page.
                    </AlertDescription>
                  </Alert>
              )}
              {fields.map((field, index) => {
                const isBlockRecurring = form.getValues().blocks[index].isRecurring;
                const isBlockFrozen = form.getValues().blocks[index].isFrozen;
                const fieldIsDisabled = isRecurring ? false : (isBlockRecurring || isBlockFrozen);
                
                return (
                    <Card 
                        key={field.id}
                        ref={(el) => blockRefs.current.set(field.id, el)}
                        className="p-4 bg-background"
                    >
                      <CardContent className="p-0">
                        <div 
                          className="flex flex-col md:flex-row items-start gap-4"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-grow w-full">
                            <FormField control={form.control} name={`blocks.${index}.time`} render={({ field }) => (
                              <FormItem><FormLabel>Time <span className="text-destructive">*</span></FormLabel><FormControl><Input type="time" {...field} disabled={fieldIsDisabled} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`blocks.${index}.conditionType`} render={({ field: typeField }) => (
                              <FormItem><FormLabel>Condition Type <span className="text-destructive">*</span></FormLabel>
                                <Select value={typeField.value || ''} onValueChange={(value) => {
                                    typeField.onChange(value);
                                    form.setValue(`blocks.${index}.conditionId`, '');
                                }} disabled={fieldIsDisabled}>
                                  <SelectTrigger><SelectValue placeholder="Select Type..." /></SelectTrigger>
                                  <SelectContent>{conditionTypes.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                                </Select>
                              <FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`blocks.${index}.conditionId`} render={({ field: condField }) => (
                              <FormItem><FormLabel>Condition</FormLabel>
                                <Select value={condField.value ?? ''} onValueChange={condField.onChange} disabled={fieldIsDisabled || !form.watch(`blocks.${index}.conditionType`)}>
                                  <SelectTrigger><SelectValue placeholder="Select Condition..." /></SelectTrigger>
                                  <SelectContent>{(conditionOptionMap[form.watch(`blocks.${index}.conditionType`) as keyof typeof conditionOptionMap] || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                              <FormMessage /></FormItem>
                            )} />
                            <div className="flex flex-row items-center justify-between gap-2 pt-2 sm:pt-0">
                              <div className="flex flex-col items-center">
                                <Label htmlFor={`repeat-${field.id}`} className="text-sm font-medium">Repeat Daily</Label>
                                <Switch id={`repeat-${field.id}`} checked={field.isRecurring} onCheckedChange={(checked) => update(index, {...form.getValues().blocks[index], isRecurring: checked})} disabled={!isRecurring && field.isRecurring} />
                              </div>
                              <div className="flex flex-col items-center">
                                <Label htmlFor={`alarm-${field.id}`} className="text-sm font-medium">Alarm</Label>
                                <Switch id={`alarm-${field.id}`} checked={field.isAlarmOn} onCheckedChange={(checked) => update(index, {...form.getValues().blocks[index], isAlarmOn: checked})} disabled={fieldIsDisabled} />
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 pt-2 md:pt-6">
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fieldIsDisabled}><Trash2 className="h-5 w-5 text-destructive" /></Button>
                          </div>
                        </div>
                         {fieldIsDisabled && !isRecurring && (
                            <p className="text-xs text-muted-foreground mt-2">This is a recurring block. To edit its template, close this dialog and edit it from the main Time Blocks page.</p>
                        )}
                      </CardContent>
                    </Card>
                )
              })}
              <Button type="button" onClick={handleAddBlock} variant="outline" className="mt-4"><PlusCircle className="mr-2 h-4 w-4"/>Add Time Block</Button>
            </form>
          </Form>
        </div>
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="plan-settings-form">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

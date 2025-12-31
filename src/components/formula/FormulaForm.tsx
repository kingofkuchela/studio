
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Formula, FormulaFormData } from '@/types';

const formSchema = z.object({
  name: z.string().min(1, 'Formula name is required'),
  type: z.enum(['normal-entry', 'breakout-entry', 'stop-loss', 'target'], { required_error: "Formula type is required." }),
  subType: z.enum(['Regular', 'Structure Change']).optional(),
  positionType: z.enum(['Long', 'Short', 'Both'], { required_error: "Position type is required." }),
  description: z.string().optional(),
});

interface FormulaFormProps {
  onSubmit: (data: FormulaFormData) => void;
  onCancel: () => void;
  initialData?: Formula;
}

export default function FormulaForm({ onSubmit, onCancel, initialData }: FormulaFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: '',
      type: 'normal-entry',
      subType: 'Regular',
      positionType: 'Both',
      description: '',
    },
  });

  const watchedType = form.watch('type');

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    // Ensure subType is only set for stop-loss or target formulas
    const finalValues = {
        ...values,
        subType: (values.type === 'stop-loss' || values.type === 'target') ? values.subType : undefined,
    };
    onSubmit(finalValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Formula Name</FormLabel>
              <FormControl><Input placeholder="e.g. EMA Crossover Alert" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="positionType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Position Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-row space-x-4"
                >
                  <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Both" /></FormControl><FormLabel className="font-normal">Both</FormLabel></FormItem>
                  <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Long" /></FormControl><FormLabel className="font-normal">Long</FormLabel></FormItem>
                  <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Short" /></FormControl><FormLabel className="font-normal">Short</FormLabel></FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Formula Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-4"
                >
                  <div>
                    <p className="font-medium text-sm mb-2">Entry</p>
                    <div className="flex flex-row space-x-4 pl-2">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="normal-entry" /></FormControl>
                            <FormLabel className="font-normal">Normal</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="breakout-entry" /></FormControl>
                            <FormLabel className="font-normal">Breakout</FormLabel>
                        </FormItem>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-2">Exit</p>
                    <div className="flex flex-row space-x-4 pl-2">
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="stop-loss" /></FormControl>
                        <FormLabel className="font-normal">Stop Loss</FormLabel>
                      </FormItem>
                       <FormItem className="flex items-center space-x-2 space-y-0">
                         <FormControl><RadioGroupItem value="target" /></FormControl>
                         <FormLabel className="font-normal">Target</FormLabel>
                       </FormItem>
                    </div>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {watchedType === 'stop-loss' && (
            <FormField
              control={form.control}
              name="subType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Stop Loss Sub-Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-row space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="Regular" /></FormControl>
                        <FormLabel className="font-normal">Regular</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="Structure Change" /></FormControl>
                        <FormLabel className="font-normal">Structure Change</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        )}
        
        {watchedType === 'target' && (
            <FormField
              control={form.control}
              name="subType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Target Sub-Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-row space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="Regular" /></FormControl>
                        <FormLabel className="font-normal">Regular</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="Structure Change" /></FormControl>
                        <FormLabel className="font-normal">Structure Change</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl><Textarea placeholder="Describe the formula details..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {initialData ? 'Update Formula' : 'Add Formula'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

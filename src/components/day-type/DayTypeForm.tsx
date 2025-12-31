
"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { DayType, DayTypeFormData } from '@/types';
import { PlusCircle, Trash2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(3, 'Day Type name must be at least 3 characters.'),
  conditions: z.array(z.string().min(1, 'Condition cannot be empty.')),
});

interface DayTypeFormProps {
  onSubmit: (data: DayTypeFormData) => void;
  onCancel: () => void;
  initialData?: DayType;
}

const predefinedConditions = [
    "1st 5 min open",
    "1st 5 Min Close",
    "EMA STATUS",
];

export default function DayTypeForm({ onSubmit, onCancel, initialData }: DayTypeFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || { name: '', conditions: [] },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions",
  });
  
  const [customCondition, setCustomCondition] = useState("");

  const handleAddCustomCondition = () => {
    if (customCondition.trim()) {
      append(customCondition.trim());
      setCustomCondition("");
    }
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
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
              <FormLabel>Day Type Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Bullish Trend Day" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div>
          <FormLabel>Conditions</FormLabel>
          <div className="mt-2 space-y-2">
            <FormLabel className="text-xs text-muted-foreground">Quick Add</FormLabel>
            <div className="flex flex-wrap gap-2">
                {predefinedConditions.map((cond) => (
                    <Button key={cond} type="button" variant="secondary" size="sm" onClick={() => append(cond)}>
                        {cond}
                    </Button>
                ))}
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {fields.map((item, index) => (
              <FormField
                key={item.id}
                control={form.control}
                name={`conditions.${index}`}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-sm text-muted-foreground pt-2">Rule {index + 1}:</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`e.g. RSI must be above 60`} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="shrink-0"
                        aria-label={`Remove condition ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
             <Input 
                value={customCondition}
                onChange={(e) => setCustomCondition(e.target.value)}
                placeholder="Or type a custom condition..."
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomCondition();
                    }
                }}
              />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCustomCondition}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">
            {initialData ? 'Update Day Type' : 'Create Day Type'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

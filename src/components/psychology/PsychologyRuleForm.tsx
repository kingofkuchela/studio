
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { PsychologyRule, PsychologyRuleFormData, PsychologyRuleCategory } from '@/types';

const categories: PsychologyRuleCategory[] = ['DAILY', 'FUNDAMENTAL RULES', 'NEW PSYCHOLOGY TIPS', 'TECHNICAL ERRORS', 'EMOTIONS'];

const formSchema = z.object({
  text: z.string().min(10, 'The rule must be at least 10 characters long.'),
  category: z.enum(categories, { required_error: 'You must select a category.'}),
});

interface PsychologyRuleFormProps {
  onSubmit: (data: PsychologyRuleFormData) => void;
  onCancel: () => void;
  initialData?: PsychologyRule;
}

export default function PsychologyRuleForm({ onSubmit, onCancel, initialData }: PsychologyRuleFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || { text: '', category: 'DAILY' },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Psychology Rule or Thought</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g. I will not let fear or greed dictate my trades."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Category</FormLabel>
              <FormControl>
                 <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2"
                >
                  {categories.map(cat => (
                    <FormItem key={cat} className="flex items-center space-x-2 space-y-0">
                      <FormControl><RadioGroupItem value={cat} /></FormControl>
                      <FormLabel className="font-normal capitalize">{cat.toLowerCase()}</FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {initialData ? 'Update Rule' : 'Add Rule'}
          </Button>
        </div>
      </form>
    </Form>
  );
}


"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { TradingBookEntry, TradingBookEntryFormData } from '@/types';
import { format, parseISO } from 'date-fns';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  content: z.string().min(1, 'Content cannot be empty.'),
  createdAtDate: z.date({ required_error: 'A valid date is required.' }),
  createdAtHours: z.string().regex(/^([01]\d|2[0-3])$/, "HH").min(1, "Hour is required."),
  createdAtMinutes: z.string().regex(/^[0-5]\d$/, "MM").min(1, "Minute is required."),
});

interface TradingBookFormProps {
  onSubmit: (data: TradingBookEntryFormData) => void;
  onCancel: () => void;
  initialData?: TradingBookEntry;
}

export default function TradingBookForm({ onSubmit, onCancel, initialData }: TradingBookFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          content: initialData.content,
          createdAtDate: parseISO(initialData.createdAt),
          createdAtHours: format(parseISO(initialData.createdAt), 'HH'),
          createdAtMinutes: format(parseISO(initialData.createdAt), 'mm'),
        }
      : {
          title: '',
          content: '',
          createdAtDate: new Date(),
          createdAtHours: format(new Date(), 'HH'),
          createdAtMinutes: format(new Date(), 'mm'),
        },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title / Heading</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Market Analysis for the Week" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ideas & Thoughts</FormLabel>
              <FormControl>
                <Textarea placeholder="Capture your insights here..." {...field} rows={8} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-3 gap-4">
            <FormField
            control={form.control}
            name="createdAtDate"
            render={({ field }) => (
                <FormItem className="col-span-3">
                    <FormLabel>Timestamp</FormLabel>
                    <FormControl>
                        <Input type="date" value={format(field.value, 'yyyy-MM-dd')} onChange={e => field.onChange(new Date(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="createdAtHours"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Hour</FormLabel>
                    <FormControl>
                        <Input type="number" min="0" max="23" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="createdAtMinutes"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Minute</FormLabel>
                    <FormControl>
                        <Input type="number" min="0" max="59" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {initialData ? 'Update Entry' : 'Add Entry'}
          </Button>
        </div>
      </form>
    </Form>
  );
}



"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell } from 'lucide-react';

const formSchema = z.object({
  longLimit: z.coerce.number().int().min(0, "Limit must be non-negative."),
  shortLimit: z.coerce.number().int().min(0, "Limit must be non-negative."),
  reason: z.string().refine(val => val.trim().split(/\s+/).length >= 5, {
    message: "Reason must be at least 5 words.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface TradeLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (limits: { long: number; short: number }, reason: string) => void;
  currentLimits: { long: number; short: number };
}

export default function TradeLimitDialog({ isOpen, onClose, onConfirm, currentLimits }: TradeLimitDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      longLimit: currentLimits.long,
      shortLimit: currentLimits.short,
      reason: '',
    },
  });

  const [wordCount, setWordCount] = useState(0);

  const reasonValue = form.watch("reason");

  useEffect(() => {
    const words = reasonValue?.trim().split(/\s+/).filter(Boolean) || [];
    setWordCount(words.length);
  }, [reasonValue]);

  useEffect(() => {
    if (isOpen) {
      form.reset({
        longLimit: currentLimits.long,
        shortLimit: currentLimits.short,
        reason: '',
      });
    }
  }, [isOpen, currentLimits, form]);

  const handleSubmit = (values: FormValues) => {
    onConfirm({ long: values.longLimit, short: values.shortLimit }, values.reason);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Daily Trade Limits</DialogTitle>
          <DialogDescription>
            You must provide a valid reason (at least 5 words) to update the trade limits for the day. This action will be logged.
          </DialogDescription>
        </DialogHeader>
        <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-500/30">
            <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-300">Heads Up!</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400">
                Changing trade limits mid-day can be risky. Ensure this aligns with your daily trading plan.
            </AlertDescription>
        </Alert>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="longLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Long Trades Limit</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shortLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Trades Limit</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Changing Limits</FormLabel>
                  <FormControl><Textarea placeholder="e.g., The market has shown a strong directional trend today..." {...field} /></FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground text-right">
                    {wordCount} / 5 words
                  </p>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Update Limits</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

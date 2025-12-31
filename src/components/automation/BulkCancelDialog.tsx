
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell } from 'lucide-react';

const formSchema = z.object({
  reason: z.string().refine(val => val.trim().split(/\s+/).filter(Boolean).length >= 5, {
    message: "Reason must be at least 5 words.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface BulkCancelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  orderCount: number;
}

export default function BulkCancelDialog({ isOpen, onClose, onConfirm, orderCount }: BulkCancelDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { reason: '' },
  });

  const [wordCount, setWordCount] = useState(0);
  const reasonValue = form.watch("reason");

  useEffect(() => {
    if (isOpen) form.reset({ reason: '' });
  }, [isOpen, form]);

  useEffect(() => {
    const words = reasonValue?.trim().split(/\s+/).filter(Boolean) || [];
    setWordCount(words.length);
  }, [reasonValue]);

  const handleSubmit = (values: FormValues) => {
    onConfirm(values.reason);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel All {orderCount} Orders?</DialogTitle>
          <DialogDescription>
            You must provide a valid reason to cancel all pending orders.
          </DialogDescription>
        </DialogHeader>
        <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-500/30">
          <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-300">Rule Reminder</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Please follow your trading rules before cancelling existing entries.
          </AlertDescription>
        </Alert>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Why are you cancelling all orders?</FormLabel>
                  <FormControl><Textarea placeholder="Describe your reasoning for this bulk cancellation..." {...field} /></FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground text-right">
                    {wordCount} / 5 words
                  </p>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Back</Button>
              <Button type="submit" variant="destructive">Confirm Cancellation</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

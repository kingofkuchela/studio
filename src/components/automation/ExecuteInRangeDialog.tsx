
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const formSchema = z.object({
  rangePoints: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, { message: "Range must be a non-negative number" }),
});

interface ExecuteInRangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rangePoints: number) => void;
  orderCount: number;
}

export default function ExecuteInRangeDialog({ isOpen, onClose, onConfirm, orderCount }: ExecuteInRangeDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rangePoints: '1',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ rangePoints: '1' });
    }
  }, [isOpen, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onConfirm(parseFloat(values.rangePoints));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Execute In-Range Orders</DialogTitle>
          <DialogDescription>
            Execute orders if the market price is within your specified tolerance. For a BUY order at 100 with a 2-point tolerance, it executes if the market is at or below 102. For a SELL at 100, it executes at or above 98.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="rangePoints"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Execution Tolerance (in absolute points)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 2.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Execute</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

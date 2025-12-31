
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { DayActivity } from '@/types';

const formSchema = z.object({
  event: z.string().min(1, 'Event name is required.'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditActivityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activityId: string, updates: FormValues) => void;
  activity: DayActivity | null;
}

export default function EditActivityDialog({ isOpen, onClose, onSave, activity }: EditActivityDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (activity) {
      form.reset({
        event: activity.event,
        notes: activity.cancellationData?.reason || activity.details?.notes || '',
      });
    }
  }, [activity, form]);

  const handleSubmit = (values: FormValues) => {
    if (activity) {
      onSave(activity.id, values);
    }
  };

  if (!activity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Activity Log</DialogTitle>
          <DialogDescription>
            You can modify the event name or add notes. Original values will be preserved.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="event"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Add or edit notes for this event..." {...field} /></FormControl>
                  <FormMessage />
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


"use client";

import React, { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import TradingBookForm from '@/components/trading-book/TradingBookForm';
import DeleteConfirmationDialog from '@/components/shared/DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Edit2, Trash2, MoreHorizontal } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import type { TradingBookEntry, TradingBookEntryFormData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, parseISO } from 'date-fns';

export default function TradingBookPage() {
  const { tradingBookEntries, addTradingBookEntry, updateTradingBookEntry, deleteTradingBookEntry, isLoading } = useAppContext();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TradingBookEntry | undefined>(undefined);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TradingBookEntry | null>(null);

  const sortedEntries = useMemo(() => 
    [...tradingBookEntries].sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()),
    [tradingBookEntries]
  );

  const handleAddEntry = () => {
    setEditingEntry(undefined);
    setIsFormOpen(true);
  };

  const handleEditEntry = (entry: TradingBookEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleDeleteEntry = (entry: TradingBookEntry) => {
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEntry = () => {
    if (entryToDelete) {
      deleteTradingBookEntry(entryToDelete.id);
      toast({ title: "Success", description: "Diary entry deleted successfully." });
      setEntryToDelete(null);
    }
    setIsDeleteDialogOpen(false);
  };

  const handleFormSubmit = (data: TradingBookEntryFormData) => {
    const createdAt = new Date(data.createdAtDate);
    createdAt.setHours(parseInt(data.createdAtHours, 10), parseInt(data.createdAtMinutes, 10));

    if (editingEntry) {
      updateTradingBookEntry({
        ...editingEntry,
        title: data.title,
        content: data.content,
        createdAt: createdAt.toISOString(),
      });
      toast({ title: "Success", description: "Entry updated successfully." });
    } else {
      addTradingBookEntry({
        title: data.title,
        content: data.content,
        createdAt: createdAt.toISOString(),
      });
      toast({ title: "Success", description: "New entry added to your diary." });
    }
    setIsFormOpen(false);
    setEditingEntry(undefined);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-headline font-bold">My Trading Diary</h2>
        <Button onClick={handleAddEntry} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Entry
        </Button>
      </div>

      <div className="space-y-6">
        {sortedEntries.length > 0 ? (
          sortedEntries.map(entry => (
            <Card key={entry.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-start justify-between pb-4">
                <CardTitle className="font-headline text-2xl">{entry.title}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditEntry(entry)}>
                      <Edit2 className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteEntry(entry)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="text-base text-muted-foreground whitespace-pre-wrap">{entry.content}</p>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground pt-4">
                <p>
                  Created: {format(parseISO(entry.createdAt), "PPP, p")}
                  {entry.updatedAt > entry.createdAt && (
                    <span className="italic"> (Edited: {format(parseISO(entry.updatedAt), "PPP, p")})</span>
                  )}
                </p>
              </CardFooter>
            </Card>
          ))
        ) : (
          <Card className="shadow-sm border-dashed">
            <CardContent className="p-10 text-center text-muted-foreground">
              <h3 className="text-lg font-semibold text-foreground">Your diary is empty.</h3>
              <p>Click "Add New Entry" to capture your first thought or idea.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingEntry ? 'Edit Diary Entry' : 'Add New Diary Entry'}</DialogTitle>
            <DialogDescription>
              {editingEntry ? 'Update your market thoughts or ideas.' : 'Capture your new thoughts, ideas, or observations.'}
            </DialogDescription>
          </DialogHeader>
          <TradingBookForm
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
            initialData={editingEntry}
          />
        </DialogContent>
      </Dialog>

      {entryToDelete && (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDeleteEntry}
          itemName={`diary entry "${entryToDelete.title}"`}
        />
      )}
    </MainLayout>
  );
}

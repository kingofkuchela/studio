
"use client";

import React, { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import EdgeForm from '@/components/strategy/StrategyForm';
import DeleteConfirmationDialog from '@/components/shared/DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import type { Edge, EdgeFormData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import EdgeCard from '@/components/strategy/EdgeCard';

export default function EdgesPage() {
  const { 
      edges: allEdges, tradingMode, addEdge, updateEdge, deleteEdge: contextDeleteEdge, duplicateEdge, formulas, 
      dayTypes, emaStatuses, openingObservations, first5MinCloses, first15MinCloses,
      candleConfirmations, ibCloses, ibBreaks, initialLows, cprSizes, priceSensitivities, btsts, isLoading, ema5Statuses
  } = useAppContext();
  
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEdge, setEditingEdge] = useState<Edge | undefined>(undefined);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [edgeToDelete, setEdgeToDelete] = useState<Edge | null>(null);
  
  const edges = useMemo(() => allEdges[tradingMode] || [], [allEdges, tradingMode]);

  const trendSideEdges = useMemo(() => edges.filter(s => s.category === 'Trend Side'), [edges]);
  const oppositeSideEdges = useMemo(() => edges.filter(s => s.category === 'Opposite Side'), [edges]);
  
  const uncategorizedEdges = useMemo(() => edges.filter(s => !s.category), [edges]);

  const handleAddEdge = () => {
    setEditingEdge(undefined);
    setIsFormOpen(true);
  };

  const handleEditEdge = (edge: Edge) => {
    setEditingEdge(edge);
    setIsFormOpen(true);
  };

  const handleDeleteEdge = (edge: Edge) => {
    setEdgeToDelete(edge);
    setIsDeleteDialogOpen(true);
  };

  const handleDuplicateEdge = (edgeId: string) => {
    duplicateEdge(edgeId);
    toast({
      title: "Edge Duplicated",
      description: "A copy of the edge has been created. You can now edit it.",
    });
  };

  const confirmDeleteEdge = () => {
    if (edgeToDelete) {
      contextDeleteEdge(edgeToDelete.id);
      toast({ title: "Success", description: `Edge '${edgeToDelete.name}' deleted successfully.` });
      setEdgeToDelete(null);
    }
    setIsDeleteDialogOpen(false);
  };

  const handleFormSubmit = (data: EdgeFormData) => {
    if (editingEdge) {
      updateEdge({ ...editingEdge, ...data });
      toast({ title: "Success", description: "Edge updated successfully." });
    } else {
      addEdge(data);
      toast({ title: "Success", description: "Edge added successfully." });
    }
    setIsFormOpen(false);
    setEditingEdge(undefined);
  };
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
        </div>
      </MainLayout>
    );
  }

  const renderEdgeCard = (edge: Edge) => (
    <EdgeCard 
      key={edge.id} 
      edge={edge} 
      formulas={formulas[tradingMode]} 
      onEdit={handleEditEdge} 
      onDelete={handleDeleteEdge} 
      onDuplicate={() => handleDuplicateEdge(edge.id)}
    />
  );

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-headline font-bold">My Edges</h2>
        <Button onClick={handleAddEdge} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Edge
        </Button>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          <Card className="shadow-lg flex flex-col">
            <CardHeader><CardTitle className="font-headline text-2xl">Trend Side</CardTitle></CardHeader>
            <CardContent className="space-y-4 flex-grow">
              {[...trendSideEdges, ...uncategorizedEdges].length > 0 ? [...trendSideEdges, ...uncategorizedEdges].map(renderEdgeCard) : (
                <div className="text-center text-muted-foreground py-10">No edges in this category.</div>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-lg flex flex-col">
            <CardHeader><CardTitle className="font-headline text-2xl">Opposite Side</CardTitle></CardHeader>
            <CardContent className="space-y-4 flex-grow">
              {oppositeSideEdges.length > 0 ? oppositeSideEdges.map(renderEdgeCard) : (
                <div className="text-center text-muted-foreground py-10">No edges in this category.</div>
              )}
            </CardContent>
          </Card>
        </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingEdge ? 'Edit Edge' : 'Add New Edge'}</DialogTitle>
            <DialogDescription>
              {editingEdge ? 'Update the details of your edge.' : 'Define a new edge.'}
            </DialogDescription>
          </DialogHeader>
          <EdgeForm
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
            initialData={editingEdge}
            formulas={formulas[tradingMode]}
            dayTypes={dayTypes}
            emaStatuses={emaStatuses}
            ema5Statuses={ema5Statuses}
            openingObservations={openingObservations}
            first5MinCloses={first5MinCloses}
            first15MinCloses={first15MinCloses}
            candleConfirmations={candleConfirmations}
            ibCloses={ibCloses}
            ibBreaks={ibBreaks}
            initialLows={initialLows}
            cprSizes={cprSizes}
            priceSensitivities={priceSensitivities}
            btsts={btsts}
          />
        </DialogContent>
      </Dialog>

      {edgeToDelete && (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setEdgeToDelete(null)}
          onConfirm={confirmDeleteEdge}
          itemName={`edge '${edgeToDelete.name}'`}
        />
      )}
    </MainLayout>
  );
}

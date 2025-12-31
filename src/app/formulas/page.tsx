
"use client";

import React, { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import FormulaForm from '@/components/formula/FormulaForm';
import DeleteConfirmationDialog from '@/components/shared/DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, LogIn, ShieldOff, Target, MoreHorizontal, Edit2, Trash2, LogOut, ArrowRightCircle, Zap, Box, Anchor } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import type { Formula, FormulaFormData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export default function FormulasPage() {
  const { formulas: allFormulas, tradingMode, addFormula, updateFormula, deleteFormula: contextDeleteFormula, isLoading } = useAppContext();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<Formula | undefined>(undefined);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formulaToDelete, setFormulaToDelete] = useState<Formula | null>(null);

  const formulas = useMemo(() => (allFormulas[tradingMode] || []).filter(f => f.positionType !== 'Short'), [allFormulas, tradingMode]);

  const normalEntryFormulas = useMemo(() => formulas.filter(f => f.type === 'normal-entry'), [formulas]);
  const breakoutEntryFormulas = useMemo(() => formulas.filter(f => f.type === 'breakout-entry'), [formulas]);
  const regularStopLossFormulas = useMemo(() => formulas.filter(f => f.type === 'stop-loss' && f.subType === 'Regular'), [formulas]);
  const structureChangeStopLossFormulas = useMemo(() => formulas.filter(f => f.type === 'stop-loss' && f.subType === 'Structure Change'), [formulas]);
  
  const regularTargetFormulas = useMemo(() => formulas.filter(f => f.type === 'target' && f.subType === 'Regular'), [formulas]);
  const structureChangeTargetFormulas = useMemo(() => formulas.filter(f => f.type === 'target' && f.subType === 'Structure Change'), [formulas]);

  const handleAddFormula = () => {
    setEditingFormula(undefined);
    setIsFormOpen(true);
  };

  const handleEditFormula = (formula: Formula) => {
    setEditingFormula(formula);
    setIsFormOpen(true);
  };

  const handleDeleteFormula = (formula: Formula) => {
    setFormulaToDelete(formula);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteFormula = () => {
    if (formulaToDelete) {
      contextDeleteFormula(formulaToDelete.id);
      toast({ title: "Success", description: `Formula '${formulaToDelete.name}' deleted successfully.` });
      setFormulaToDelete(null);
    }
    setIsDeleteDialogOpen(false);
  };

  const handleFormSubmit = (data: FormulaFormData) => {
    if (editingFormula) {
      updateFormula({ ...editingFormula, ...data });
      toast({ title: "Success", description: "Formula updated successfully." });
    } else {
      addFormula(data);
      toast({ title: "Success", description: "Formula added successfully." });
    }
    setIsFormOpen(false);
    setEditingFormula(undefined);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </MainLayout>
    );
  }

  const renderFormulaItem = (formula: Formula) => (
      <Card key={formula.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div><CardTitle className="font-headline text-xl">{formula.name}</CardTitle></div>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditFormula(formula)}><Edit2 className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteFormula(formula)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
          </CardHeader>
          <CardContent>
              <p className="text-sm text-muted-foreground">{formula.description || "No description provided."}</p>
          </CardContent>
      </Card>
  );

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-headline font-bold">My Formulas</h2>
        <Button onClick={handleAddFormula} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Formula
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
        {/* Entry Formulas */}
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-headline font-semibold flex items-center gap-3 text-green-600">
                    <LogIn className="h-6 w-6" />
                    Entry Formulas
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Normal Entry Section */}
                <div>
                    <h3 className="text-xl font-headline font-semibold mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-3 text-cyan-600">
                            <ArrowRightCircle className="h-5 w-5" />
                            Normal Entries
                        </span>
                        <Badge variant="secondary">{normalEntryFormulas.length}</Badge>
                    </h3>
                    <div className="space-y-4">
                        {normalEntryFormulas.length === 0 ? (
                            <Card className="shadow-sm border-dashed">
                                <CardContent className="p-6 text-center text-muted-foreground">
                                    No normal entry formulas defined yet.
                                </CardContent>
                            </Card>
                        ) : (
                            normalEntryFormulas.map(renderFormulaItem)
                        )}
                    </div>
                </div>

                {/* Breakout Entry Section */}
                <div>
                    <h3 className="text-xl font-headline font-semibold mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-3 text-indigo-600">
                            <Zap className="h-5 w-5" />
                            Breakout Entries
                        </span>
                        <Badge variant="secondary">{breakoutEntryFormulas.length}</Badge>
                    </h3>
                    <div className="space-y-4">
                        {breakoutEntryFormulas.length === 0 ? (
                            <Card className="shadow-sm border-dashed">
                                <CardContent className="p-6 text-center text-muted-foreground">
                                    No breakout entry formulas defined yet.
                                </CardContent>
                            </Card>
                        ) : (
                            breakoutEntryFormulas.map(renderFormulaItem)
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Exit Formulas */}
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-headline font-semibold flex items-center gap-3 text-orange-500">
                    <LogOut className="h-6 w-6" />
                    Exit Formulas
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Stop Loss Section */}
                 <div>
                    <h3 className="text-xl font-headline font-semibold mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-3 text-red-600">
                            <ShieldOff className="h-5 w-5" />
                            Stop Loss
                        </span>
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-semibold mb-2 text-muted-foreground flex justify-between items-center">
                                <span className="flex items-center gap-2"><Box className="h-4 w-4"/>Regular</span>
                                <Badge variant="outline">{regularStopLossFormulas.length}</Badge>
                            </h4>
                            <div className="space-y-4">
                                {regularStopLossFormulas.length === 0 ? (
                                    <Card className="shadow-sm border-dashed"><CardContent className="p-4 text-center text-muted-foreground text-sm">No regular SL formulas.</CardContent></Card>
                                ) : (
                                    regularStopLossFormulas.map(renderFormulaItem)
                                )}
                            </div>
                        </div>
                         <div>
                            <h4 className="font-semibold mb-2 text-muted-foreground flex justify-between items-center">
                                <span className="flex items-center gap-2"><Anchor className="h-4 w-4"/>Structure Change</span>
                                <Badge variant="outline">{structureChangeStopLossFormulas.length}</Badge>
                            </h4>
                             <div className="space-y-4">
                                {structureChangeStopLossFormulas.length === 0 ? (
                                    <Card className="shadow-sm border-dashed"><CardContent className="p-4 text-center text-muted-foreground text-sm">No structure change SLs.</CardContent></Card>
                                ) : (
                                    structureChangeStopLossFormulas.map(renderFormulaItem)
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Target Section */}
                <div>
                     <h3 className="text-xl font-headline font-semibold mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-3 text-blue-600">
                            <Target className="h-5 w-5" />
                            Targets
                        </span>
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-semibold mb-2 text-muted-foreground flex justify-between items-center">
                                <span className="flex items-center gap-2"><Box className="h-4 w-4"/>Regular</span>
                                <Badge variant="outline">{regularTargetFormulas.length}</Badge>
                            </h4>
                             <div className="space-y-4">
                                {regularTargetFormulas.length === 0 ? (
                                    <Card className="shadow-sm border-dashed"><CardContent className="p-4 text-center text-muted-foreground text-sm">No regular target formulas.</CardContent></Card>
                                ) : (
                                    regularTargetFormulas.map(renderFormulaItem)
                                )}
                             </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2 text-muted-foreground flex justify-between items-center">
                                <span className="flex items-center gap-2"><Anchor className="h-4 w-4"/>Structure Change</span>
                                <Badge variant="outline">{structureChangeTargetFormulas.length}</Badge>
                            </h4>
                             <div className="space-y-4">
                                {structureChangeTargetFormulas.length === 0 ? (
                                    <Card className="shadow-sm border-dashed"><CardContent className="p-4 text-center text-muted-foreground text-sm">No structure change targets.</CardContent></Card>
                                ) : (
                                    structureChangeTargetFormulas.map(renderFormulaItem)
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingFormula ? 'Edit Formula' : 'Add New Formula'}</DialogTitle>
            <DialogDescription>
              {editingFormula ? 'Update the details of your formula.' : 'Define a new trading formula.'}
            </DialogDescription>
          </DialogHeader>
          <FormulaForm
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
            initialData={editingFormula}
          />
        </DialogContent>
      </Dialog>

      {formulaToDelete && (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setFormulaToDelete(null)}
          onConfirm={confirmDeleteFormula}
          itemName={`formula '${formulaToDelete.name}'`}
        />
      )}
    </MainLayout>
  );
}

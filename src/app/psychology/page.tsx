

"use client";

import React, { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PsychologyRuleForm from '@/components/psychology/PsychologyRuleForm';
import DeleteConfirmationDialog from '@/components/shared/DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Edit2, Trash2, MoreHorizontal, Quote, Brain, Goal, Sparkles, Heart, Zap } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import type { PsychologyRule, PsychologyRuleFormData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function PsychologyPage() {
  const { psychologyRules, addPsychologyRule, updatePsychologyRule, deletePsychologyRule, isLoading } = useAppContext();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PsychologyRule | undefined>(undefined);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<PsychologyRule | null>(null);

  const handleAddRule = () => {
    setEditingRule(undefined);
    setIsFormOpen(true);
  };

  const handleEditRule = (rule: PsychologyRule) => {
    setEditingRule(rule);
    setIsFormOpen(true);
  };

  const handleDeleteRule = (rule: PsychologyRule) => {
    setRuleToDelete(rule);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteRule = () => {
    if (ruleToDelete) {
      deletePsychologyRule(ruleToDelete.id);
      toast({ title: "Success", description: "Psychology rule deleted successfully." });
      setRuleToDelete(null);
    }
    setIsDeleteDialogOpen(false);
  };

  const handleFormSubmit = (data: PsychologyRuleFormData) => {
    if (editingRule) {
      updatePsychologyRule({ ...editingRule, ...data });
      toast({ title: "Success", description: "Rule updated successfully." });
    } else {
      addPsychologyRule(data);
      toast({ title: "Success", description: "Rule added successfully." });
    }
    setIsFormOpen(false);
    setEditingRule(undefined);
  };

  const dailyRules = useMemo(() => psychologyRules.filter(r => r.category === 'DAILY'), [psychologyRules]);
  const fundamentalRules = useMemo(() => psychologyRules.filter(r => r.category === 'FUNDAMENTAL RULES'), [psychologyRules]);
  const newPsychologyTips = useMemo(() => psychologyRules.filter(r => r.category === 'NEW PSYCHOLOGY TIPS'), [psychologyRules]);


  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-32 w-full mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </MainLayout>
    );
  }

  const renderRuleItem = (rule: PsychologyRule) => (
    <Card key={rule.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 flex items-start gap-4">
        <p className="flex-grow text-sm text-muted-foreground">{rule.text}</p>
        <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditRule(rule)}><Edit2 className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteRule(rule)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-headline font-bold">My Psychology Rules</h2>
        <Button onClick={handleAddRule} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Rule
        </Button>
      </div>

       <Card className="mb-8 shadow-xl border-primary/20">
        <CardContent className="p-6 text-center">
          <Quote className="mx-auto h-12 w-12 text-primary/50 mb-4" />
          <p className="text-2xl font-headline italic text-foreground">
            &ldquo;Managing money is more important than earning money.&rdquo;
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline font-semibold flex items-center gap-3 text-cyan-600">
              <Brain className="h-6 w-6" />
              DAILY
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dailyRules.length > 0 
              ? dailyRules.map(renderRuleItem)
              : <p className="text-sm text-muted-foreground p-4 text-center">No daily rules defined yet.</p>
            }
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline font-semibold flex items-center gap-3 text-amber-600">
              <Goal className="h-6 w-6" />
              FUNDAMENTAL RULES
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fundamentalRules.length > 0 
              ? fundamentalRules.map(renderRuleItem)
              : <p className="text-sm text-muted-foreground p-4 text-center">No fundamental rules defined yet.</p>
            }
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline font-semibold flex items-center gap-3 text-purple-600">
              <Sparkles className="h-6 w-6" />
              NEW PSYCHOLOGY TIPS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {newPsychologyTips.length > 0 
              ? newPsychologyTips.map(renderRuleItem)
              : <p className="text-sm text-muted-foreground p-4 text-center">No new tips defined yet.</p>
            }
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingRule ? 'Edit Rule' : 'Add New Rule'}</DialogTitle>
            <DialogDescription>
              {editingRule ? 'Update your psychological trading principle.' : 'Add a new principle to guide your trading mindset.'}
            </DialogDescription>
          </DialogHeader>
          <PsychologyRuleForm
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
            initialData={editingRule}
          />
        </DialogContent>
      </Dialog>

      {ruleToDelete && (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setRuleToDelete(null)}
          onConfirm={confirmDeleteRule}
          itemName={`psychology rule`}
        />
      )}
    </MainLayout>
  );
}

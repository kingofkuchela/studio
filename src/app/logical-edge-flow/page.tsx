
"use client";

import React, { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, GitBranch, Upload, Download } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Edge, Formula, LogicalEdgeFlow, LogicalEdgeFlowFormData } from '@/types';
import DeleteConfirmationDialog from '@/components/shared/DeleteConfirmationDialog';
import LogicalEdgeFlowForm from '@/components/logical-edge-flow/LogicalEdgeFlowForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import FlowCard from '@/components/logical-edge-flow/FlowCard';
import { exportLogicalFlowsToJson } from '@/lib/jsonExporter';
import LogicalEdgeFlowImportDialog from '@/components/logical-edge-flow/LogicalEdgeFlowImportDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


export default function LogicalEdgeFlowPage() {
  const { logicalEdgeFlows, addLogicalEdgeFlow, updateLogicalEdgeFlow, deleteLogicalEdgeFlow, edges, formulas, isLoading } = useAppContext();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<LogicalEdgeFlow | undefined>(undefined);
  const [flowToDelete, setFlowToDelete] = useState<LogicalEdgeFlow | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const groupedFlows = useMemo(() => {
    const combinedEdges = [...(edges.real || []), ...(edges.theoretical || [])];
    const edgeMap = new Map(combinedEdges.map(e => [e.id, e.name]));

    // Stage 1: Group by Edge
    const groupsByEdge: Record<string, { edgeName: string; flows: LogicalEdgeFlow[] }> = {};
    logicalEdgeFlows.forEach(flow => {
        const edgeId = flow.edgeId || flow.oppositeEdgeId || 'uncategorized';
        if (!groupsByEdge[edgeId]) {
            groupsByEdge[edgeId] = {
                edgeName: edgeMap.get(edgeId) || 'Uncategorized',
                flows: []
            };
        }
        groupsByEdge[edgeId].flows.push(flow);
    });

    // Stage 2, 3, 4: Create nested structure
    const finalGroupedStructure = Object.values(groupsByEdge).map(edgeGroup => {
        const optionTypeGroups: Record<string, { resultTypeGroups: Record<string, { breakTimeGroups: Record<string, LogicalEdgeFlow[]> }> }> = {};

        edgeGroup.flows.forEach(flow => {
            const optionType = (flow.optionTypes && flow.optionTypes.length > 0) ? flow.optionTypes[0] : 'N/A';
            const resultType = flow.resultType || 'N/A';
            const breakTime = (flow.breakTimes && flow.breakTimes.length > 0) ? flow.breakTimes[0] : 'N/A';

            if (!optionTypeGroups[optionType]) {
                optionTypeGroups[optionType] = { resultTypeGroups: {} };
            }

            if (!optionTypeGroups[optionType].resultTypeGroups[resultType]) {
                optionTypeGroups[optionType].resultTypeGroups[resultType] = { breakTimeGroups: {} };
            }
            if (!optionTypeGroups[optionType].resultTypeGroups[resultType].breakTimeGroups[breakTime]) {
                optionTypeGroups[optionType].resultTypeGroups[resultType].breakTimeGroups[breakTime] = [];
            }
            optionTypeGroups[optionType].resultTypeGroups[resultType].breakTimeGroups[breakTime].push(flow);
        });

        return {
            edgeId: edgeGroup.flows[0]?.edgeId || edgeGroup.flows[0]?.oppositeEdgeId,
            edgeName: edgeGroup.edgeName,
            totalFlowsCount: edgeGroup.flows.length,
            optionTypeGroups: Object.entries(optionTypeGroups).map(([optionType, otg]) => {
                const resultTypeGroups = Object.entries(otg.resultTypeGroups).map(([resultType, rtg]) => {
                    const breakTimeGroups = Object.entries(rtg.breakTimeGroups).map(([breakTime, flows]) => ({
                        breakTime,
                        flows,
                        totalFlowsCount: flows.length,
                    })).sort((a,b) => a.breakTime.localeCompare(b.breakTime));

                    return {
                        resultType,
                        breakTimeGroups,
                        totalFlowsCount: breakTimeGroups.reduce((acc, btg) => acc + btg.totalFlowsCount, 0),
                    }
                }).sort((a,b) => a.resultType.localeCompare(b.resultType));

                return {
                    optionType: optionType,
                    resultTypeGroups,
                    totalFlowsCount: resultTypeGroups.reduce((acc, rtg) => acc + rtg.totalFlowsCount, 0),
                }
            }).filter(otg => otg.resultTypeGroups.length > 0)
        };
    }).sort((a,b) => a.edgeName.localeCompare(b.edgeName));

    return finalGroupedStructure;
  }, [logicalEdgeFlows, edges]);

  const handleAddFlow = () => {
    setEditingFlow(undefined);
    setIsFormOpen(true);
  };

  const handleEditFlow = (flow: LogicalEdgeFlow) => {
    setEditingFlow(flow);
    setIsFormOpen(true);
  };

  const handleDeleteFlow = (flow: LogicalEdgeFlow) => {
    setFlowToDelete(flow);
  };
  
  const handleDuplicateFlow = (flow: LogicalEdgeFlow) => {
    const { id, ...flowWithoutId } = flow;
    const newFlowData: LogicalEdgeFlowFormData = {
        ...flowWithoutId,
        name: `${flow.name} - Copy`,
    };
    addLogicalEdgeFlow(newFlowData);
    toast({ title: "Flow Duplicated", description: `A copy of "${flow.name}" was created.` });
  };

  const confirmDelete = () => {
    if (flowToDelete) {
      deleteLogicalEdgeFlow(flowToDelete.id);
      toast({ title: "Flow Deleted", description: `"${flowToDelete.name}" has been deleted.` });
      setFlowToDelete(null);
    }
  };

  const handleFormSubmit = (data: Omit<LogicalEdgeFlowFormData, 'selectedEdgeEntryIndex' | 'oppositeSelectedEdgeEntryIndex'> & { selectedEdgeEntryIndex?: string, oppositeSelectedEdgeEntryIndex?: string }) => {
    const finalData: LogicalEdgeFlowFormData = {
        ...data,
        selectedEdgeEntryIndex: data.selectedEdgeEntryIndex !== undefined && data.selectedEdgeEntryIndex !== ''
            ? parseInt(data.selectedEdgeEntryIndex, 10)
            : undefined,
        oppositeSelectedEdgeEntryIndex: data.oppositeSelectedEdgeEntryIndex !== undefined && data.oppositeSelectedEdgeEntryIndex !== ''
            ? parseInt(data.oppositeSelectedEdgeEntryIndex, 10)
            : undefined,
        winFollowUp: data.winFollowUp ? {
          ...data.winFollowUp,
          selectedEdgeEntryIndex: data.winFollowUp.selectedEdgeEntryIndex !== undefined && data.winFollowUp.selectedEdgeEntryIndex !== ''
            ? parseInt(data.winFollowUp.selectedEdgeEntryIndex, 10)
            : undefined,
        } : undefined,
        oppositeFollowUp: data.oppositeFollowUp ? {
          ...data.oppositeFollowUp,
          selectedEdgeEntryIndex: data.oppositeFollowUp.selectedEdgeEntryIndex !== undefined && data.oppositeFollowUp.selectedEdgeEntryIndex !== ''
            ? parseInt(data.oppositeFollowUp.selectedEdgeEntryIndex, 10)
            : undefined,
        } : undefined,
    };

    if (editingFlow) {
      updateLogicalEdgeFlow({ ...editingFlow, ...finalData });
      toast({ title: "Success", description: "Logical edge flow updated successfully." });
    } else {
      addLogicalEdgeFlow(finalData);
      toast({ title: "Success", description: "New logical edge flow created." });
    }
    setIsFormOpen(false);
    setEditingFlow(undefined);
  };

  const handleExportJson = () => {
    if (logicalEdgeFlows.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "There are no logical flows to export." });
      return;
    }
    exportLogicalFlowsToJson(logicalEdgeFlows);
    toast({ title: "Export Successful", description: "Your logical flows have been exported to a JSON file." });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-headline font-bold flex items-center gap-3"><GitBranch className="h-8 w-8 text-primary"/>Logical Edge Flow</h2>
        <div className="flex gap-2">
          <Button onClick={() => setIsImportDialogOpen(true)} variant="outline">
              <Upload className="mr-2 h-4 w-4" /> Import JSON
          </Button>
          <Button onClick={handleExportJson} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export JSON
          </Button>
          <Button onClick={() => handleAddFlow()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Flow
          </Button>
        </div>
      </div>

       <div className="space-y-6">
        {groupedFlows.length > 0 ? (
           <Accordion type="multiple" className="w-full space-y-4">
             {groupedFlows.map(edgeGroup => (
               <Card key={edgeGroup.edgeId || 'uncategorized'}>
                 <AccordionItem value={edgeGroup.edgeId || 'uncategorized'} className="border-b-0">
                    <AccordionTrigger className="p-4 hover:no-underline">
                      <CardHeader className="p-0 text-left">
                        <CardTitle>{edgeGroup.edgeName} <span className="text-muted-foreground font-normal">({edgeGroup.totalFlowsCount} Flows)</span></CardTitle>
                      </CardHeader>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-3">
                       <Accordion type="multiple" className="w-full space-y-3">
                         {edgeGroup.optionTypeGroups.map(otGroup => (
                           <Card key={otGroup.optionType} className="bg-muted/30">
                              <AccordionItem value={otGroup.optionType} className="border-b-0">
                                <AccordionTrigger className="px-3 py-2 hover:no-underline">
                                  <h3 className="font-semibold text-base">{otGroup.optionType} Flows <span className="text-muted-foreground font-normal">({otGroup.totalFlowsCount})</span></h3>
                                </AccordionTrigger>
                                <AccordionContent className="px-3 pb-3 space-y-3">
                                   <Accordion type="multiple" className="w-full space-y-3">
                                     {otGroup.resultTypeGroups.map(rtGroup => (
                                        <Card key={rtGroup.resultType} className="bg-background">
                                          <AccordionItem value={rtGroup.resultType} className="border-b-0">
                                              <AccordionTrigger className="px-3 py-2 hover:no-underline">
                                                  <h4 className="font-medium">{rtGroup.resultType} <span className="font-normal text-muted-foreground">({rtGroup.totalFlowsCount} flows)</span></h4>
                                              </AccordionTrigger>
                                              <AccordionContent className="px-3 pb-3 space-y-3">
                                                 <Accordion type="multiple" className="w-full space-y-3">
                                                    {rtGroup.breakTimeGroups.map(btGroup => (
                                                      <Card key={btGroup.breakTime} className="bg-muted/20">
                                                        <AccordionItem value={btGroup.breakTime} className="border-b-0">
                                                            <AccordionTrigger className="px-3 py-2 hover:no-underline">
                                                                <h5 className="font-normal">{btGroup.breakTime} <span className="text-muted-foreground">({btGroup.totalFlowsCount} flows)</span></h5>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="px-3 pb-3 space-y-4">
                                                                {btGroup.flows.map(flow => (
                                                                    <FlowCard key={flow.id} flow={flow} onEdit={handleEditFlow} onDelete={handleDeleteFlow} onDuplicate={handleDuplicateFlow} edges={[...edges.real, ...edges.theoretical]} formulas={[...formulas.real, ...formulas.theoretical]} isPrimaryAlertCreated={false} />
                                                                ))}
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                      </Card>
                                                    ))}
                                                  </Accordion>
                                              </AccordionContent>
                                          </AccordionItem>
                                        </Card>
                                     ))}
                                   </Accordion>
                                </AccordionContent>
                              </AccordionItem>
                           </Card>
                         ))}
                       </Accordion>
                    </AccordionContent>
                 </AccordionItem>
               </Card>
             ))}
           </Accordion>
        ) : (
            <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                    <p className="font-semibold">No logical flows defined yet.</p>
                    <p>Click "Create New Flow" to build your first logical path.</p>
                </CardContent>
            </Card>
        )}
      </div>

       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingFlow ? 'Edit Logical Edge Flow' : 'Create New Logical Edge Flow'}</DialogTitle>
            <DialogDescription>
                Define a hierarchical path of conditions to determine a specific target for an edge.
            </DialogDescription>
          </DialogHeader>
          <LogicalEdgeFlowForm
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
            initialData={editingFlow}
            edges={[...edges.real, ...edges.theoretical]}
            formulas={[...formulas.real, ...formulas.theoretical]}
          />
        </DialogContent>
      </Dialog>
      
      <DeleteConfirmationDialog 
        isOpen={!!flowToDelete}
        onClose={() => setFlowToDelete(null)}
        onConfirm={confirmDelete}
        itemName={`the flow "${flowToDelete?.name}"`}
      />

      <LogicalEdgeFlowImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
      />
    </MainLayout>
  );
}


"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit2, Trash2, TrendingUp, TrendingDown, ArrowRight, ChevronsRight, CornerDownRight, Copy, CheckCircle, XCircle, Target, Bell } from 'lucide-react';
import type { Edge, Formula, LogicalEdgeFlow, EntryAlert } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/AppContext';
import { format } from 'date-fns';

export const TargetInfo = ({
    status,
    formulaIds,
    parameters,
    formulas
}: {
    status?: string;
    formulaIds?: string[];
    parameters?: { key: string; value: string }[];
    formulas: Formula[];
}) => {
    const formulaMap = useMemo(() => new Map(formulas.map(f => [f.id, f.name])), [formulas]);
    
    if (!status && (!formulaIds || formulaIds.length === 0) && (!parameters || parameters.length === 0)) {
        return <p className="text-xs text-muted-foreground">None Defined</p>;
    }

    const formulaNames = formulaIds?.map(id => formulaMap.get(id)).filter(Boolean) || [];

    return (
        <div className="space-y-1 text-xs">
            {status && <Badge variant="secondary" className="mb-1">{status}</Badge>}
            {formulaNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {formulaNames.map(name => <Badge key={name} variant="outline" className="font-normal">{name}</Badge>)}
                </div>
            )}
            {parameters && parameters.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                    {parameters.map((param, index) => (
                        <div key={index} className="flex items-center gap-1">
                           <span className="font-semibold">{param.key}:</span>
                           <span className="text-muted-foreground">{param.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const FlowCard = ({ 
    flow, 
    onEdit, 
    onDelete, 
    onDuplicate, 
    edges, 
    formulas,
    selectedOppositeSideStructure,
    selectedOppositeOptionType,
    onAddEntryAlert,
    onUpdateTargets,
    isPrimaryAlertCreated,
}: { 
    flow: LogicalEdgeFlow, 
    onEdit?: (flow: LogicalEdgeFlow) => void, 
    onDelete?: (flow: LogicalEdgeFlow) => void, 
    onDuplicate?: (flow: LogicalEdgeFlow) => void, 
    edges: Edge[], 
    formulas: Formula[],
    selectedOppositeSideStructure?: string,
    selectedOppositeOptionType?: 'CE' | 'PE' | '',
    onAddEntryAlert?: (alert: Omit<EntryAlert, 'id' | 'createdAt'>) => void;
    onUpdateTargets?: (flow: LogicalEdgeFlow, followUpType?: 'win' | 'opposite') => void;
    isPrimaryAlertCreated: boolean;
}) => {
    const { toast } = useToast();
    const { dayActivities } = useAppContext();
    const [isAlertCreatedForThisFlow, setIsAlertCreatedForThisFlow] = useState(false);

    useEffect(() => {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        // Check if an alert for this specific flow on this day has already been created
        const hasAlert = dayActivities.some(activity =>
            activity.event === 'Entry Alert Created' &&
            activity.details?.notes?.includes(flow.name) &&
            format(new Date(activity.timestamp), 'yyyy-MM-dd') === todayKey
        );
        setIsAlertCreatedForThisFlow(hasAlert);
    }, [dayActivities, flow.name]);


    const edgeMap = useMemo(() => new Map(edges.map(e => [e.id, e.name])), [edges]);
    const formulaMap = useMemo(() => new Map(formulas.map(f => [f.id, f.name])), [formulas]);

    const primaryEdgeName = flow.edgeId ? edgeMap.get(flow.edgeId) : 'N/A';
    const selectedEdge = edges.find(e => e.id === flow.edgeId);
    const selectedEntry = selectedEdge?.entries?.[flow.selectedEdgeEntryIndex ?? -1];
    const selectedEntryName = selectedEntry?.name || (flow.selectedEdgeEntryIndex !== undefined ? `Entry ${flow.selectedEdgeEntryIndex + 1}` : 'N/A');

    const nextEdge = edges.find(e => e.id === flow.winFollowUp?.nextEdgeId);
    const nextEdgeEntryIndex = flow.winFollowUp?.selectedEdgeEntryIndex;
    const nextEdgeEntry = (nextEdgeEntryIndex !== undefined && nextEdge?.entries) ? nextEdge.entries[nextEdgeEntryIndex] : undefined;
    const nextEdgeEntryName = nextEdgeEntry?.name || (nextEdgeEntryIndex !== undefined ? `Entry ${nextEdgeEntryIndex + 1}` : 'N/A');

    const oppositeFollowUpEdge = edges.find(e => e.id === flow.oppositeFollowUp?.nextEdgeId);
    const oppositeFollowUpEntryIndex = flow.oppositeFollowUp?.selectedEdgeEntryIndex;
    const oppositeFollowUpEntry = (oppositeFollowUpEntryIndex !== undefined && oppositeFollowUpEdge?.entries) ? oppositeFollowUpEdge.entries[oppositeFollowUpEntryIndex] : undefined;
    const oppositeFollowUpEntryName = oppositeFollowUpEntry?.name || (oppositeFollowUpEntryIndex !== undefined ? `Entry ${oppositeFollowUpEntryIndex + 1}` : 'N/A');


    const targetFormulaNames = useMemo(() => 
        flow.targetFormulaIds?.map(id => formulaMap.get(id)).filter(Boolean) || [],
    [flow.targetFormulaIds, formulaMap]);

    const handleCreateAlertFromPrimary = () => {
        if (isPrimaryAlertCreated) {
            toast({ variant: 'default', title: 'Alert Already Created Today', description: 'A primary entry alert has already been created for today. You can only create one per day.' });
            return;
        }

        const edge = edges.find(e => e.id === flow.edgeId);
        if (!edge) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not find the associated edge.' });
            return;
        }

        const primaryTargetFormulaId = flow.targetFormulaIds?.[0];
        const primaryTargetFormulaName = primaryTargetFormulaId ? formulaMap.get(primaryTargetFormulaId) : undefined;
        
        const alertData = {
            edge: edge,
            entryIndex: flow.selectedEdgeEntryIndex ?? 0,
            primaryTargetFormulaId,
            primaryTargetFormulaName,
            flowId: flow.id 
        };

        onAddEntryAlert?.(alertData);
        setIsAlertCreatedForThisFlow(true);
    };
    
    const handleCreateAlertFromFollowUp = (type: 'win' | 'opposite') => {
        const followUp = type === 'win' ? flow.winFollowUp : flow.oppositeFollowUp;
        if (!followUp?.nextEdgeId) {
            toast({ variant: 'destructive', title: 'Error', description: 'No "Next Edge" is defined in the follow-up logic.' });
            return;
        }
        const edge = edges.find(e => e.id === followUp.nextEdgeId);
        if (!edge) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not find the associated "Next Edge" for the follow-up.' });
            return;
        }
        const primaryTargetFormulaId = followUp.trendTargetFormulaIds?.[0];
        const primaryTargetFormulaName = primaryTargetFormulaId ? formulaMap.get(primaryTargetFormulaId) : undefined;
        onAddEntryAlert?.({
            edge: edge,
            entryIndex: followUp.selectedEdgeEntryIndex ?? 0,
            primaryTargetFormulaId,
            primaryTargetFormulaName,
            flowId: flow.id,
        });
    };
    
    const handleUpdateTargetsForFlow = (followUpType?: 'win' | 'opposite') => {
      onUpdateTargets?.(flow, followUpType);
      const message = followUpType 
        ? `Targets for open positions updated based on ${followUpType} follow-up logic.`
        : `Targets for open positions updated based on primary logic.`;
      toast({ title: 'Targets Updated', description: message });
    }

    const shouldShowConditionalActions = useMemo(() => {
        if (!flow.winFollowUp) {
          return false;
        }
        
        const isStructureMatch = selectedOppositeSideStructure === "BOTH S(3) AND S(5) FORMED";
        if (!isStructureMatch) {
            return false;
        }
        
        return false;
    }, [flow.winFollowUp, selectedOppositeSideStructure, selectedOppositeOptionType]);

    return (
        <Card className="shadow-md hover:shadow-lg transition-shadow bg-background/50">
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle className="font-headline text-xl">{flow.name}</CardTitle>
                </div>
                 <div className="flex gap-1 flex-wrap justify-end">
                    <Button variant="secondary" size="sm" onClick={handleCreateAlertFromPrimary} disabled={isPrimaryAlertCreated} className={cn(isAlertCreatedForThisFlow && "bg-green-200 text-green-900 hover:bg-green-200 cursor-not-allowed", isPrimaryAlertCreated && !isAlertCreatedForThisFlow && "cursor-not-allowed", !isPrimaryAlertCreated && "bg-teal-200 text-teal-900 hover:bg-teal-300 dark:bg-teal-800 dark:text-teal-100 dark:hover:bg-teal-700")}>
                        {isAlertCreatedForThisFlow ? <CheckCircle className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4"/>}
                        {isAlertCreatedForThisFlow ? 'Alert Sent' : 'Create Entry Alert'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleUpdateTargetsForFlow()} className="bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"><Target className="mr-2 h-4 w-4"/>Update Target</Button>
                    {onEdit && onDelete && onDuplicate && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => onEdit(flow)}><Edit2 className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDuplicate(flow)}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDelete(flow)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 border-2 border-dashed rounded-lg flex flex-col gap-4">
                     <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="font-semibold text-base px-3 py-1 bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 border-violet-300 dark:border-violet-700">{primaryEdgeName}</Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline" className="text-base px-3 py-1">{selectedEntryName}</Badge>
                        </div>
                    </div>

                    <div>
                        <div className="flex flex-wrap gap-2">
                            {targetFormulaNames.length > 0 ? (
                                targetFormulaNames.map((name, index) => (
                                    <Badge 
                                        key={name} 
                                        variant={index === 0 ? "default" : "secondary"}
                                        className={cn(
                                            index === 0 && "bg-primary text-primary-foreground text-base px-3 py-1 shadow",
                                            index > 0 && "font-normal"
                                        )}
                                    >
                                        {index === 0 && <Target className="mr-2 h-4 w-4" />}
                                        {name}
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Primary Target Not Set</p>
                            )}
                        </div>
                    </div>
                     {flow.notes && <p className="text-xs italic text-muted-foreground pt-2 border-t mt-2">Notes: "{flow.notes}"</p>}
                </div>

                {flow.winFollowUp && (
                  <div className="pl-6 relative">
                    <CornerDownRight className="absolute -left-1 top-5 h-6 w-6 text-green-500"/>
                    <div className="p-4 border-2 border-green-500/50 rounded-lg flex flex-col gap-4 bg-green-500/5">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-green-700 dark:text-green-300">On Win: 2nd Entry Logic</h4>
                          <div className="flex gap-1">
                              <Button variant="secondary" size="sm" onClick={() => handleCreateAlertFromFollowUp('win')} className="h-7 bg-teal-100 text-teal-800 hover:bg-teal-200 dark:bg-teal-900 dark:text-teal-100 dark:hover:bg-teal-800"><Bell className="mr-1.5 h-3.5 w-3.5"/>Alert</Button>
                              <Button variant="outline" size="sm" onClick={() => handleUpdateTargetsForFlow('win')} className="h-7 bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"><Target className="mr-1.5 h-3.5 w-3.5"/>Update</Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <span className="font-medium">Next Edge:</span>
                          <Badge variant="secondary">{edgeMap.get(flow.winFollowUp.nextEdgeId || '') || 'Not Set'}</Badge>
                          <Badge variant="outline">{nextEdgeEntryName}</Badge>
                        </div>
                        <div className="pt-1">
                          <p className="font-medium text-xs text-muted-foreground">Target 1:</p>
                          <TargetInfo status={flow.winFollowUp.trendTargetStatus} formulaIds={flow.winFollowUp.trendTargetFormulaIds} parameters={flow.winFollowUp.trendTargetParameters} formulas={formulas} />
                        </div>
                        <div className="pt-1">
                            <p className="font-medium text-xs text-muted-foreground">Target 2:</p>
                            <TargetInfo status={flow.winFollowUp.trendTarget2Status} formulaIds={flow.winFollowUp.trendTarget2FormulaIds} parameters={flow.winFollowUp.trendTarget2Parameters} formulas={formulas} />
                        </div>
                        {flow.winFollowUp.notes && <p className="text-xs italic text-muted-foreground">Notes: "{flow.winFollowUp.notes}"</p>}
                    </div>
                  </div>
                )}
                {flow.lossFollowUp && (
                   <div className="pl-6 relative">
                    <CornerDownRight className="absolute -left-1 top-5 h-6 w-6 text-red-500"/>
                    <div className="p-4 border-2 border-red-500/50 rounded-lg flex flex-col gap-4 bg-red-500/5">
                        <h4 className="font-semibold text-red-700 dark:text-red-300">On Loss: Follow-up Logic</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <span className="font-medium">Next Edge:</span>
                           <Badge variant="secondary">{edgeMap.get(flow.lossFollowUp.nextEdgeId || '') || 'Not Set'}</Badge>
                        </div>
                        {flow.lossFollowUp.notes && <p className="text-xs italic text-muted-foreground">Notes: "{flow.lossFollowUp.notes}"</p>}
                    </div>
                  </div>
                )}

                {(flow.oppositeFollowUp) && (
                  <div className="pl-6 relative">
                    <CornerDownRight className="absolute -left-1 top-5 h-6 w-6 text-blue-500"/>
                    <div className="p-4 border-2 border-blue-500/50 rounded-lg flex flex-col gap-4 bg-blue-500/5">
                        <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-blue-700 dark:text-blue-300">Follow-up Action for OPPOSITE</h4>
                            <div className="flex gap-1">
                                <Button variant="secondary" size="sm" onClick={() => handleCreateAlertFromFollowUp('opposite')} className="h-7 bg-teal-100 text-teal-800 hover:bg-teal-200 dark:bg-teal-900 dark:text-teal-100 dark:hover:bg-teal-800"><Bell className="mr-1.5 h-3.5 w-3.5"/>Alert</Button>
                                <Button variant="outline" size="sm" onClick={() => handleUpdateTargetsForFlow('opposite')} className="h-7 bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"><Target className="mr-1.5 h-3.5 w-3.5"/>Update</Button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <span className="font-medium">Next Edge:</span>
                          <Badge variant="secondary">{edgeMap.get(flow.oppositeFollowUp.nextEdgeId || '') || 'Not Set'}</Badge>
                          <Badge variant="outline">{oppositeFollowUpEntryName}</Badge>
                        </div>
                        <div className="pt-1">
                          <p className="font-medium text-xs text-muted-foreground">Target:</p>
                          <TargetInfo status={flow.oppositeFollowUp.trendTargetStatus} formulaIds={flow.oppositeFollowUp.trendTargetFormulaIds} parameters={flow.oppositeFollowUp.trendTargetParameters} formulas={formulas} />
                        </div>
                        {flow.oppositeFollowUp.notes && <p className="text-xs italic text-muted-foreground">Notes: "{flow.oppositeFollowUp.notes}"</p>}
                    </div>
                  </div>
                )}

            </CardContent>
        </Card>
    );
};

export default FlowCard;
    

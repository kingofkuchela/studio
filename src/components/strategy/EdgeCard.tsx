
"use client";

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit2, Trash2, ArrowRight, Copy } from 'lucide-react';
import type { Edge, Formula } from '@/types';
import { Badge } from '@/components/ui/badge';

interface EdgeCardProps {
    edge: Edge;
    formulas: Formula[];
    onEdit?: (edge: Edge) => void;
    onDelete?: (edge: Edge) => void;
    onDuplicate?: (edge: Edge) => void;
}

export const EdgeCard: React.FC<EdgeCardProps> = ({ edge, formulas, onEdit, onDelete, onDuplicate }) => {
    const formulaMap = useMemo(() => new Map(formulas.map(f => [f.id, f.name])), [formulas]);

    return (
        <Card key={edge.id} className="shadow-sm hover:shadow-md transition-shadow duration-200 border-4 border-neutral-400 dark:border-neutral-700">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                    <CardTitle className="font-headline text-xl">
                        {edge.name}
                    </CardTitle>
                </div>
                {(onEdit || onDelete || onDuplicate) && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {onEdit && <DropdownMenuItem onClick={() => onEdit(edge)}><Edit2 className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>}
                            {onDuplicate && <DropdownMenuItem onClick={() => onDuplicate(edge)}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>}
                            {onDelete && <DropdownMenuItem onClick={() => onDelete(edge)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </CardHeader>
            <CardContent>
                {edge.description && <p className="text-sm text-muted-foreground">{edge.description}</p>}
                {!edge.description && <p className="text-sm text-muted-foreground italic">No description provided.</p>}
                
                {edge.rules && edge.rules.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-sm font-semibold text-foreground mb-2">Rules:</h4>
                        <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground pl-2">
                            {edge.rules.map((rule, index) => (
                                <li key={index} className="pl-1">{rule}</li>
                            ))}
                        </ol>
                    </div>
                )}

                {edge.entries && edge.entries.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-sm font-semibold text-foreground mb-2">Edge Entries:</h4>
                        <div className="space-y-3">
                            {edge.entries.map((entry, index) => {
                                const entryFormulas = entry.entryFormulaIds?.map(id => formulaMap.get(id)).filter(Boolean) || [];
                                const slFormulas = entry.stopLossFormulaIds?.map(id => formulaMap.get(id)).filter(Boolean) || [];
                                const targetFormulas = entry.targetFormulaIds?.map(id => formulaMap.get(id)).filter(Boolean) || [];
                                return (
                                    <div key={entry.id} className="text-xs p-2 bg-muted/50 rounded-md">
                                        <p className="font-medium text-foreground mb-2">{entry.name || `Entry ${index + 1}`}</p>
                                        <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {entryFormulas.map(name => <Badge key={name} variant="outline" className="font-normal">{name}</Badge>)}
                                            </div>
                                            <ArrowRight className="h-3 w-3" />
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {slFormulas.map(name => <Badge key={name} variant="outline" className="font-normal">{name}</Badge>)}
                                            </div>
                                            <ArrowRight className="h-3 w-3" />
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {targetFormulas.map(name => <Badge key={name} variant="outline" className="font-normal">{name}</Badge>)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default EdgeCard;

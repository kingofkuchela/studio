
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings } from 'lucide-react';
import type { Edge } from '@/types';
import MultiSelectFilterDropdown from '../shared/MultiSelectFilterDropdown';

const GlobalSettingsDialog = ({
    isOpen,
    onClose,
    onSave,
    initialValues,
    edges,
    onOpenTradeLimitDialog,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (changes: Record<string, any>, newValues: Record<string, any>) => void;
    initialValues: Record<string, any>;
    edges: Edge[];
    onOpenTradeLimitDialog: () => void;
}) => {
    // Internal state for all form fields
    const [entryRestrictionTime, setEntryRestrictionTime] = useState(initialValues.entryRestrictionTime);
    const [squareOffTime, setSquareOffTime] = useState(initialValues.squareOffTime);
    const [stage1Risk, setStage1Risk] = useState(initialValues.stage1Risk);
    const [stage1Points, setStage1Points] = useState(initialValues.stage1Points);
    const [totalFunds, setTotalFunds] = useState(initialValues.totalFunds);
    const [availableToTrade, setAvailableToTrade] = useState(initialValues.availableToTrade);
    const [singleTradeLossLimitAmount, setSingleTradeLossLimitAmount] = useState(initialValues.singleTradeLossLimitAmount);
    const [singleTradeLossLimitPoints, setSingleTradeLossLimitPoints] = useState(initialValues.singleTradeLossLimitPoints);
    const [globalLotSize, setGlobalLotSize] = useState(initialValues.globalLotSize);
    const [activeEdgeIds, setActiveEdgeIds] = useState(initialValues.activeEdgeIds);
    const [globalPositionType, setGlobalPositionType] = useState(initialValues.globalPositionType);
    const [globalExpiryType, setGlobalExpiryType] = useState(initialValues.globalExpiryType);

    useEffect(() => {
        if (isOpen) {
            setEntryRestrictionTime(initialValues.entryRestrictionTime || '15:10');
            setSquareOffTime(initialValues.squareOffTime || '15:15');
            setStage1Risk(initialValues.stage1Risk || '10000');
            setStage1Points(initialValues.stage1Points || '150');
            setTotalFunds(initialValues.totalFunds || '1000000');
            setAvailableToTrade(initialValues.availableToTrade || '500000');
            setSingleTradeLossLimitAmount(initialValues.singleTradeLossLimitAmount || '2000');
            setSingleTradeLossLimitPoints(initialValues.singleTradeLossLimitPoints || '50');
            setGlobalLotSize(initialValues.globalLotSize || '75');
            setActiveEdgeIds(initialValues.activeEdgeIds || []);
            setGlobalPositionType(initialValues.globalPositionType || 'Both');
            setGlobalExpiryType(initialValues.globalExpiryType || 'Both');
        }
    }, [isOpen, initialValues]);

    const handleSaveChanges = () => {
        const newValues = {
            entryRestrictionTime, squareOffTime, stage1Risk, stage1Points,
            totalFunds, availableToTrade, singleTradeLossLimitAmount, singleTradeLossLimitPoints,
            globalLotSize, activeEdgeIds, globalPositionType, globalExpiryType
        };
        const changes: Record<string, any> = {};

        for (const key in newValues) {
            const oldValue = initialValues[key as keyof typeof initialValues];
            const newValue = newValues[key as keyof typeof newValues];
            
            if (Array.isArray(oldValue)) {
                if (JSON.stringify(oldValue.sort()) !== JSON.stringify(newValue.sort())) {
                    changes[key] = { before: oldValue, after: newValue };
                }
            } else if (oldValue !== newValue) {
                changes[key] = { before: oldValue, after: newValue };
            }
        }
        
        onSave(changes, newValues);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="font-headline text-xl flex items-center gap-3">
                        <Settings className="h-6 w-6 text-primary"/>
                        Global Settings
                    </DialogTitle>
                    <DialogDescription>
                        Configure the core risk, time, and fund parameters for the application. Hover over labels for details.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto -mr-6 pr-6">
                  <div className="space-y-6">
                    <div className="p-4 border rounded-lg bg-background">
                        <h4 className="font-semibold mb-4 text-lg">Time Limits</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Label htmlFor="entryRestrictionTime" className="cursor-help">Entry Restriction Time</Label></TooltipTrigger><TooltipContent><p>The system will not place new automated entries after this time.</p></TooltipContent></Tooltip></TooltipProvider>
                                <Input id="entryRestrictionTime" type="time" value={entryRestrictionTime || ''} onChange={(e) => setEntryRestrictionTime(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Label htmlFor="squareOffTime" className="cursor-help">Auto Square-off Time</Label></TooltipTrigger><TooltipContent><p>All open positions will be automatically squared off at this time.</p></TooltipContent></Tooltip></TooltipProvider>
                                <Input id="squareOffTime" type="time" value={squareOffTime || ''} onChange={(e) => setSquareOffTime(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-background">
                        <h4 className="font-semibold mb-4 text-lg">Risk Limits</h4>
                        <div className="space-y-4">
                            <div>
                                <h5 className="font-medium mb-2 text-md">Day's Risk Limits</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><TooltipProvider><Tooltip><TooltipTrigger asChild><Label htmlFor="stage1Risk" className="cursor-help">Day Risk (₹)</Label></TooltipTrigger><TooltipContent><p>When daily loss hits this amount, new entries are blocked.</p></TooltipContent></Tooltip></TooltipProvider><Input id="stage1Risk" value={stage1Risk || ''} onChange={(e) => setStage1Risk(e.target.value)} /></div>
                                    <div className="space-y-2"><TooltipProvider><Tooltip><TooltipTrigger asChild><Label htmlFor="stage1Points" className="cursor-help">Day Risk (Pts)</Label></TooltipTrigger><TooltipContent><p>When daily loss hits this many points, new entries are blocked.</p></TooltipContent></Tooltip></TooltipProvider><Input id="stage1Points" value={stage1Points || ''} onChange={(e) => setStage1Points(e.target.value)} /></div>
                                </div>
                            </div>
                            <div>
                                <h5 className="font-medium mb-2 text-md">Single Trade Loss Limit</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><TooltipProvider><Tooltip><TooltipTrigger asChild><Label htmlFor="singleTradeLossLimitAmount" className="cursor-help">Amount (₹)</Label></TooltipTrigger><TooltipContent><p>Maximum loss allowed for any single trade, in currency.</p></TooltipContent></Tooltip></TooltipProvider><Input id="singleTradeLossLimitAmount" value={singleTradeLossLimitAmount || ''} onChange={(e) => setSingleTradeLossLimitAmount(e.target.value)} /></div>
                                    <div className="space-y-2"><TooltipProvider><Tooltip><TooltipTrigger asChild><Label htmlFor="singleTradeLossLimitPoints" className="cursor-help">Points</Label></TooltipTrigger><TooltipContent><p>Maximum loss allowed for any single trade, in points.</p></TooltipContent></Tooltip></TooltipProvider><Input id="singleTradeLossLimitPoints" value={singleTradeLossLimitPoints || ''} onChange={(e) => setSingleTradeLossLimitPoints(e.target.value)} /></div>
                                </div>
                            </div>
                        </div>
                    </div>

                     <div className="p-4 border rounded-lg bg-background">
                        <h4 className="font-semibold mb-4 text-lg">Trade Parameters</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Label htmlFor="globalLotSize" className="cursor-help">Global Lot Size</Label></TooltipTrigger><TooltipContent><p>The default number of lots/shares for each trade.</p></TooltipContent></Tooltip></TooltipProvider>
                                <Input id="globalLotSize" value={globalLotSize || ''} onChange={(e) => setGlobalLotSize(e.target.value)} />
                           </div>
                           <div className="space-y-2">
                               <Label>Daily Trade Limits</Label>
                               <Button onClick={onOpenTradeLimitDialog} variant="outline" className="w-full">Set Long/Short Trade Limits</Button>
                           </div>
                        </div>
                     </div>

                    <div className="p-4 border rounded-lg bg-background">
                        <h4 className="font-semibold mb-4 text-lg">Trade Filters</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="space-y-2"><Label>Active Edges</Label><MultiSelectFilterDropdown filterNameSingular="Active Edge" filterNamePlural="Active Edges" options={edges.map(e => ({ id: e.id, name: e.name }))} selectedIds={activeEdgeIds} onSelectionChange={setActiveEdgeIds} /></div>
                             <div className="space-y-2"><Label>Position Type</Label><Select value={globalPositionType || 'Both'} onValueChange={setGlobalPositionType}><SelectTrigger><SelectValue placeholder="Position Type" /></SelectTrigger><SelectContent><SelectItem value="Long">Long</SelectItem><SelectItem value="Short">Short</SelectItem><SelectItem value="Both">Both</SelectItem></SelectContent></Select></div>
                             <div className="space-y-2"><Label>Expiry Type</Label><Select value={globalExpiryType || 'Both'} onValueChange={setGlobalExpiryType}><SelectTrigger><SelectValue placeholder="Expiry Type" /></SelectTrigger><SelectContent><SelectItem value="Expiry">Expiry</SelectItem><SelectItem value="Non-Expiry">Non-Expiry</SelectItem><SelectItem value="Both">Both</SelectItem></SelectContent></Select></div>
                        </div>
                    </div>

                     <div className="p-4 border rounded-lg bg-background">
                        <h4 className="font-semibold mb-4 text-lg">Fund Management</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Label htmlFor="totalFunds" className="cursor-help">Total Funds (₹)</Label></TooltipTrigger><TooltipContent><p>The total capital in your account.</p></TooltipContent></Tooltip></TooltipProvider>
                                <Input id="totalFunds" value={totalFunds || ''} onChange={(e) => setTotalFunds(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Label htmlFor="availableToTrade" className="cursor-help">Available to Trade (₹)</Label></TooltipTrigger><TooltipContent><p>The amount of funds available for new trades.</p></TooltipContent></Tooltip></TooltipProvider>
                                <Input id="availableToTrade" value={availableToTrade || ''} onChange={(e) => setAvailableToTrade(e.target.value)} />
                            </div>
                         </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSaveChanges}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default GlobalSettingsDialog;

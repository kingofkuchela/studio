
"use client";

import React, { useMemo, useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Edge, LogicalEdgeFlow, LogicalEdgeFlowFormData, Formula } from '@/types';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { ChevronsDown, PlusCircle, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';


const followUpSchema = z.object({
  nextEdgeId: z.string().optional(),
  selectedEdgeEntryIndex: z.string().optional(),
  notes: z.string().optional(),
});


const winFollowUpSchema = z.object({
  notes: z.string().optional(),
  nextEdgeId: z.string().optional(),
  selectedEdgeEntryIndex: z.string().optional(),
  // Targets for the second entry
  trendTargetStatus: z.string().optional(),
  trendTargetFormulaIds: z.array(z.string()).optional(),
  trendTargetParameters: z.array(z.object({ key: z.string().min(1), value: z.string().min(1) })).optional(),
  trendTarget2Status: z.string().optional(),
  trendTarget2FormulaIds: z.array(z.string()).optional(),
  trendTarget2Parameters: z.array(z.object({ key: z.string().min(1), value: z.string().min(1) })).optional(),
});

const oppositeFollowUpSchema = z.object({
  notes: z.string().optional(),
  nextEdgeId: z.string().optional(),
  selectedEdgeEntryIndex: z.string().optional(),
  trendTargetStatus: z.string().optional(),
  trendTargetFormulaIds: z.array(z.string()).optional(),
  trendTargetParameters: z.array(z.object({ key: z.string().min(1), value: z.string().min(1) })).optional(),
});


const formSchema = z.object({
  name: z.string().min(3, 'Flow name must be at least 3 characters.'),
  optionTypes: z.array(z.enum(['CE', 'PE'])).optional(),
  dayTypes: z.array(z.enum(['Range', 'Trend'])).optional(),
  breakTimes: z.array(z.enum(['Before 12', 'After 12', 'NO BREAK'])).optional(),
  edgeId: z.string().optional(),
  selectedEdgeEntryIndex: z.string().optional(),
  t3Condition: z.enum(['T(3) >= S(15)', 'S(15) > T(3)']).optional(),
  e15Statuses: z.array(z.enum(['Positive', 'Negative'])).optional(),
  e5Statuses: z.array(z.enum(['Positive', 'Negative'])).optional(),
  
  // Optional Opposite fields
  oppositeOptionTypes: z.array(z.enum(['CE', 'PE'])).optional(),
  oppositeEdgeId: z.string().optional(),
  oppositeSelectedEdgeEntryIndex: z.string().optional(),

  // Initial Path
  currentSideStructure: z.array(z.string()).min(1, 'At least one current-side structure is required.'),
  oppositeSideStructure: z.array(z.string()).min(1, 'At least one opposite-side structure is required.'),

  targetFormulaIds: z.array(z.string()).optional(),
  parameters: z.array(z.object({ key: z.string().min(1), value: z.string().min(1) })).optional(),
  resultType: z.enum(['Win', 'Loss'], { required_error: 'You must select a result type.' }),
  notes: z.string().optional(),

  // Follow-up Actions
  lossFollowUp: followUpSchema.optional(),
  winFollowUp: winFollowUpSchema.optional(),
  oppositeFollowUp: oppositeFollowUpSchema.optional(),
});

interface LogicalEdgeFlowFormProps {
  onSubmit: (data: LogicalEdgeFlowFormData) => void;
  onCancel: () => void;
  initialData?: LogicalEdgeFlow;
  edges: Edge[];
  formulas: Formula[];
}

const currentSideStructureOptions = [
    ' S(3) , S(5) & S(15) RESPECTS ',
    '"S(3) / S(5) " STRUCTURE RE - FORMED INTERNALLY',
    'CHANGED ALL BUT "L" NOT PENETRATE',
    'CHANGED ALL & "L" PENETRATE',
    'S(15) ONLY REMAINS CONSTANT',
    'S(5) AND S(15) ONLY REMAINS CONSTANT',
    'CHANGED ALL BUT "L" NOT PENETRATE AND AND T(3) NOT HIT',
];

const oppositeSideStructureOptions = [
    'PENETRATE / CHANGED ALL',
    'S(3) AND S(5) CHANGED BUT S(15) REMAINS CONSTANT',
    'S(3) FORMED ONLY',
    'BOTH S(3) AND S(5) FORMED',
    'S(3) FORMED INTERNALLY',
];

const MultiSelectField = ({
  value,
  onChange,
  placeholder,
  options,
}: {
  value?: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  options: { id: string; name: string }[] | undefined;
}) => {
  const selectedOptions = React.useMemo(
    () => (options || []).filter(f => value?.includes(f.id)),
    [options, value]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start h-auto min-h-10 text-left">
          <div className="flex flex-wrap gap-1">
            {selectedOptions.length > 0 ? (
              selectedOptions.map(f => (
                <Badge key={f.id} variant="secondary" className="font-normal">
                  {f.name}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground font-normal">{placeholder}</span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <ScrollArea className="max-h-60">
          {(options || []).map(option => (
            <DropdownMenuCheckboxItem
              key={option.id}
              checked={value?.includes(option.id)}
              onCheckedChange={checked => {
                const currentIds = value || [];
                const newIds = checked
                  ? [...currentIds, option.id]
                  : currentIds.filter(id => id !== option.id);
                onChange(newIds);
              }}
              onSelect={e => e.preventDefault()}
            >
              {option.name}
            </DropdownMenuCheckboxItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


const getDefaultValues = (): z.infer<typeof formSchema> => ({
  name: '',
  optionTypes: [],
  dayTypes: [],
  breakTimes: [],
  edgeId: '',
  selectedEdgeEntryIndex: '',
  oppositeOptionTypes: [],
  oppositeEdgeId: '',
  oppositeSelectedEdgeEntryIndex: '',
  targetFormulaIds: [],
  parameters: [],
  resultType: 'Win',
  currentSideStructure: [],
  oppositeSideStructure: [],
  notes: '',
  e15Statuses: [],
  e5Statuses: [],
  t3Condition: undefined,
  lossFollowUp: {
    nextEdgeId: '',
    selectedEdgeEntryIndex: '',
    notes: '',
  },
  winFollowUp: {
    nextEdgeId: '',
    selectedEdgeEntryIndex: '',
    notes: '',
    trendTargetStatus: '',
    trendTargetFormulaIds: [],
    trendTargetParameters: [],
    trendTarget2Status: '',
    trendTarget2FormulaIds: [],
    trendTarget2Parameters: [],
  },
  oppositeFollowUp: {
    nextEdgeId: '',
    selectedEdgeEntryIndex: '',
    trendTargetStatus: '',
    trendTargetFormulaIds: [],
    trendTargetParameters: [],
    notes: ''
  }
});

const getInitialDataForForm = (initialData?: LogicalEdgeFlow): z.infer<typeof formSchema> => {
    if (!initialData) {
        return getDefaultValues();
    }
    
    // Create a deep copy of the default values to avoid mutation
    const defaultValues = getDefaultValues();
    
    // Safely merge initialData into the default structure
    const mergedData = {
        ...defaultValues,
        ...initialData,
        currentSideStructure: Array.isArray(initialData.currentSideStructure) ? initialData.currentSideStructure : (initialData.currentSideStructure ? [initialData.currentSideStructure] : []),
        oppositeSideStructure: Array.isArray(initialData.oppositeSideStructure) ? initialData.oppositeSideStructure : (initialData.oppositeSideStructure ? [initialData.oppositeSideStructure] : []),
        selectedEdgeEntryIndex: initialData.selectedEdgeEntryIndex !== undefined ? String(initialData.selectedEdgeEntryIndex) : '',
        oppositeSelectedEdgeEntryIndex: initialData.oppositeSelectedEdgeEntryIndex !== undefined ? String(initialData.oppositeSelectedEdgeEntryIndex) : '',
        winFollowUp: {
            ...defaultValues.winFollowUp,
            ...(initialData.winFollowUp || {}),
            selectedEdgeEntryIndex: initialData.winFollowUp?.selectedEdgeEntryIndex !== undefined ? String(initialData.winFollowUp.selectedEdgeEntryIndex) : '',
        },
        lossFollowUp: {
            ...defaultValues.lossFollowUp,
            ...(initialData.lossFollowUp || {}),
            selectedEdgeEntryIndex: initialData.lossFollowUp?.selectedEdgeEntryIndex !== undefined ? String(initialData.lossFollowUp.selectedEdgeEntryIndex) : '',
        },
        oppositeFollowUp: {
            ...defaultValues.oppositeFollowUp,
            ...(initialData.oppositeFollowUp || {}),
            selectedEdgeEntryIndex: initialData.oppositeFollowUp?.selectedEdgeEntryIndex !== undefined ? String(initialData.oppositeFollowUp.selectedEdgeEntryIndex) : '',
        },
    };
    
    return mergedData;
};

export default function LogicalEdgeFlowForm({ onSubmit, onCancel, initialData, edges, formulas }: LogicalEdgeFlowFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialDataForForm(initialData),
  });
  
  useEffect(() => {
    form.reset(getInitialDataForForm(initialData));
  }, [initialData, form]);

  const trendSideEdges = useMemo(() => edges.filter(e => e.category === 'Trend Side'), [edges]);
  const oppositeSideEdges = useMemo(() => edges.filter(e => e.category === 'Opposite Side'), [edges]);

  const watchedEdgeId = form.watch('edgeId');
  const watchedOppositeEdgeId = form.watch('oppositeEdgeId');
  const watchedT3Condition = form.watch('t3Condition');
  const watchedWinFollowUpNextEdgeId = form.watch('winFollowUp.nextEdgeId');
  const watchedLossFollowUpNextEdgeId = form.watch('lossFollowUp.nextEdgeId');
  const watchedOppositeFollowUpNextEdgeId = form.watch('oppositeFollowUp.nextEdgeId');

  const selectedEdge = useMemo(() => edges.find(e => e.id === watchedEdgeId), [edges, watchedEdgeId]);
  const oppositeSelectedEdge = useMemo(() => edges.find(e => e.id === watchedOppositeEdgeId), [edges, watchedOppositeEdgeId]);
  const winFollowUpNextEdge = useMemo(() => edges.find(e => e.id === watchedWinFollowUpNextEdgeId), [edges, watchedWinFollowUpNextEdgeId]);
  const lossFollowUpNextEdge = useMemo(() => edges.find(e => e.id === watchedLossFollowUpNextEdgeId), [edges, watchedLossFollowUpNextEdgeId]);
  const oppositeFollowUpNextEdge = useMemo(() => edges.find(e => e.id === watchedOppositeFollowUpNextEdgeId), [edges, watchedOppositeFollowUpNextEdgeId]);

  const isSpecialEdgeSelected = selectedEdge?.name === 'S(15) BEG ABOVE = E(15)';

  useEffect(() => {
    if (form.getValues('edgeId') !== watchedEdgeId) {
      form.setValue('selectedEdgeEntryIndex', '');
      if (!isSpecialEdgeSelected) {
        form.setValue('t3Condition', undefined);
      }
    }
  }, [watchedEdgeId, form, isSpecialEdgeSelected]);
  
  useEffect(() => {
    if (form.getValues('t3Condition') !== watchedT3Condition && isSpecialEdgeSelected) {
      form.setValue('selectedEdgeEntryIndex', '');
    }
  }, [watchedT3Condition, form, isSpecialEdgeSelected]);
  
  useEffect(() => {
    if (form.getValues('winFollowUp.nextEdgeId') !== watchedWinFollowUpNextEdgeId) {
      form.setValue('winFollowUp.selectedEdgeEntryIndex', '');
    }
  }, [watchedWinFollowUpNextEdgeId, form]);

  useEffect(() => {
    if (form.getValues('lossFollowUp.nextEdgeId') !== watchedLossFollowUpNextEdgeId) {
      form.setValue('lossFollowUp.selectedEdgeEntryIndex', '');
    }
  }, [watchedLossFollowUpNextEdgeId, form]);
  
  useEffect(() => {
    if (form.getValues('oppositeFollowUp.nextEdgeId') !== watchedOppositeFollowUpNextEdgeId) {
      form.setValue('oppositeFollowUp.selectedEdgeEntryIndex', '');
    }
  }, [watchedOppositeFollowUpNextEdgeId, form]);


  const availableEntries = useMemo(() => {
    if (!selectedEdge?.entries) return [];
    if (!isSpecialEdgeSelected) {
      return selectedEdge.entries.map((entry, index) => ({ ...entry, originalIndex: index }));
    }
    if (!watchedT3Condition) {
      return [];
    }
    return selectedEdge.entries
      .map((entry, index) => ({ ...entry, originalIndex: index }))
      .filter((entry) => {
        if (watchedT3Condition === 'T(3) >= S(15)') {
            return entry.originalIndex <= 5; // Entries 1-6
        }
        if (watchedT3Condition === 'S(15) > T(3)') {
            return entry.originalIndex === 6 || entry.originalIndex === 7; // Entries 7-8
        }
        return false;
      });
  }, [selectedEdge, isSpecialEdgeSelected, watchedT3Condition]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values as LogicalEdgeFlowFormData);
  };
  
  const targetFormulas = useMemo(() => formulas.filter(f => f.type === 'target-index' || f.type === 'target-option'), [formulas]);
  
  const { fields: paramFields, append: appendParam, remove: removeParam } = useFieldArray({ control: form.control, name: "parameters" });
  const { fields: winFollowUpTrendParams, append: appendWinFollowUpTrendParam, remove: removeWinFollowUpTrendParam } = useFieldArray({ control: form.control, name: "winFollowUp.trendTargetParameters" });
  const { fields: winFollowUpTrend2Params, append: appendWinFollowUpTrend2Param, remove: removeWinFollowUpTrend2Param } = useFieldArray({ control: form.control, name: "winFollowUp.trendTarget2Parameters" });
  const { fields: oppositeFollowUpParams, append: appendOppositeFollowUpParam, remove: removeOppositeFollowUpParam } = useFieldArray({ control: form.control, name: "oppositeFollowUp.trendTargetParameters" });
  
  const CheckboxGroup = ({ field, options, formLabel }: { field: any, options: {id: string, label: string}[], formLabel: string}) => (
      <FormItem className="space-y-2">
          <FormLabel>{formLabel}</FormLabel>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
              {options.map((opt) => (
                <FormField
                  key={opt.id}
                  control={form.control}
                  name={field.name}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(opt.id)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...(field.value || []), opt.id])
                              : field.onChange((field.value || []).filter((value: string) => value !== opt.id))
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">{opt.label}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
          </div>
          <FormMessage />
      </FormItem>
  );

  const CurrentSidePathSelector = () => (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-semibold text-center">Current Side</h4>
      <FormField
        control={form.control}
        name="currentSideStructure"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Structure Condition(s)</FormLabel>
            <div className="flex flex-col gap-2">
              {currentSideStructureOptions.map((optionValue) => (
                 <FormField
                  key={optionValue}
                  control={form.control}
                  name="currentSideStructure"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(optionValue)}
                          onCheckedChange={(checked) => {
                            const currentValues = field.value || [];
                            return checked
                              ? field.onChange([...currentValues, optionValue])
                              : field.onChange(currentValues.filter((value) => value !== optionValue));
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">{optionValue}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const OppositeSidePathSelector = () => (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-semibold text-center">Opposite Side</h4>
      <FormField
        control={form.control}
        name="oppositeSideStructure"
        render={({ field }) => (
           <FormItem>
            <FormLabel>Structure Condition(s)</FormLabel>
            <div className="flex flex-col gap-2">
              {oppositeSideStructureOptions.map((optionValue) => (
                <FormField
                  key={optionValue}
                  control={form.control}
                  name="oppositeSideStructure"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(optionValue)}
                          onCheckedChange={(checked) => {
                            const currentValues = field.value || [];
                            return checked
                              ? field.onChange([...currentValues, optionValue])
                              : field.onChange(currentValues.filter((value) => value !== optionValue));
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">{optionValue}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
  
  const TargetConfigurator = ({
    title,
    icon,
    statusFieldName,
    formulaIdsFieldName,
    paramsFieldName,
    paramFields,
    appendParam,
    removeParam
  }: {
    title: string,
    icon: React.ReactNode,
    statusFieldName: any,
    formulaIdsFieldName: any,
    paramsFieldName: any,
    paramFields: any[],
    appendParam: (p: any) => void,
    removeParam: (i: number) => void
  }) => (
    <Card className="p-4 bg-background">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <FormField control={form.control} name={statusFieldName} render={({ field }) => (
          <FormItem><FormLabel>Target Status (Optional)</FormLabel><FormControl><Input placeholder="e.g., Bullish Continuation" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name={formulaIdsFieldName} render={({ field }) => (
          <FormItem><FormLabel>Target Formulas</FormLabel><MultiSelectField {...field} placeholder="Select target formulas..." options={targetFormulas} /><FormMessage /></FormItem>
        )} />
        <div className="space-y-2 pt-2 pl-2 border-l-2 ml-1">
          <FormLabel>Parameters</FormLabel>
          <div className="space-y-3">
            {paramFields.map((item, index) => (
              <div key={item.id} className="flex items-end gap-2">
                <FormField control={form.control} name={`${paramsFieldName}.${index}.key`} render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel className="text-xs">Parameter Name</FormLabel><FormControl><Input placeholder="e.g., Min Volume" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name={`${paramsFieldName}.${index}.value`} render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel className="text-xs">Parameter Value</FormLabel><FormControl><Input placeholder="e.g., > 1M" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeParam(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendParam({ key: '', value: '' })}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Parameter
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Form {...form}>
       <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col max-h-[70vh]">
         <ScrollArea className="flex-grow pr-6 -mr-6">
          <div className="space-y-6">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>1. Flow Name</FormLabel><FormControl><Input placeholder="e.g., Bullish Continuation Target" {...field} /></FormControl><FormMessage /></FormItem> )} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <FormField control={form.control} name="dayTypes" render={({ field }) => (
                  <CheckboxGroup field={field} formLabel="Day Type" options={[{id: 'Range', label: 'Range'}, {id: 'Trend', label: 'Trend'}]} />
              )} />
              <FormField control={form.control} name="breakTimes" render={({ field }) => (
                  <CheckboxGroup field={field} formLabel="Break" options={[{id: 'Before 12', label: 'Before 12'}, {id: 'After 12', label: 'After 12'}, {id: 'NO BREAK', label: 'No Break'}]} />
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <Card className="p-4 bg-muted/20">
                <div className="space-y-4">
                  <FormField control={form.control} name="optionTypes" render={({ field }) => (
                      <CheckboxGroup field={field} formLabel="CURRENT OPTION TYPE (Optional)" options={[{id: 'CE', label: 'CE'}, {id: 'PE', label: 'PE'}]} />
                  )} />
                  <FormField control={form.control} name="edgeId" render={({ field }) => ( <FormItem><FormLabel className="font-semibold">CURRENT SELECT EDGE (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select the edge this logic applies to" /></SelectTrigger></FormControl><SelectContent>{trendSideEdges.map(edge => <SelectItem key={edge.id} value={edge.id}>{edge.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                  
                  {isSpecialEdgeSelected && (
                    <FormField control={form.control} name="t3Condition" render={({ field }) => (
                      <FormItem className="space-y-2">
                          <FormLabel>T(3) Condition</FormLabel>
                          <FormControl><RadioGroup onValueChange={field.onChange} value={field.value ?? ''} className="flex gap-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="T(3) >= S(15)" /></FormControl><FormLabel className="font-normal">T(3) &gt;= S(15)</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="S(15) > T(3)" /></FormControl><FormLabel className="font-normal">S(15) &gt; T(3)</FormLabel></FormItem></RadioGroup></FormControl><FormMessage />
                      </FormItem>
                    )}/>
                  )}

                  <FormField control={form.control} name="selectedEdgeEntryIndex" render={({ field }) => ( <FormItem><FormLabel className="font-semibold">CURRENT SELECT EDGE ENTRY (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''} disabled={!selectedEdge || (isSpecialEdgeSelected && !watchedT3Condition)}><FormControl><SelectTrigger><SelectValue placeholder="Select an entry from the edge" /></SelectTrigger></FormControl><SelectContent>{(availableEntries).map((entry) => <SelectItem key={entry.id} value={String(entry.originalIndex)}>{entry.name || `Entry ${entry.originalIndex + 1}`}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                </div>
              </Card>

              <Card className="p-4 bg-muted/20">
                <div className="space-y-4">
                  <FormField control={form.control} name="oppositeOptionTypes" render={({ field }) => (
                     <CheckboxGroup field={field} formLabel="OPPOSITE OPTION TYPE (Optional)" options={[{id: 'CE', label: 'CE'}, {id: 'PE', label: 'PE'}]} />
                  )} />
                  <FormField control={form.control} name="oppositeEdgeId" render={({ field }) => ( <FormItem><FormLabel>OPPOSITE SELECT EDGE (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select the opposite edge" /></SelectTrigger></FormControl><SelectContent>{oppositeSideEdges.map(edge => <SelectItem key={edge.id} value={edge.id}>{edge.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="oppositeSelectedEdgeEntryIndex" render={({ field }) => ( <FormItem><FormLabel>OPPOSITE SELECT EDGE ENTRY (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''} disabled={!oppositeSelectedEdge}><FormControl><SelectTrigger><SelectValue placeholder="Select an entry from the edge" /></SelectTrigger></FormControl><SelectContent>{(oppositeSelectedEdge?.entries || []).map((entry, index) => <SelectItem key={entry.id} value={String(index)}>{entry.name || `Entry ${index + 1}`}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                </div>
              </Card>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="e15Statuses" render={({ field }) => (
                    <CheckboxGroup field={field} formLabel="E(15) Status" options={[{id: 'Positive', label: 'Positive'}, {id: 'Negative', label: 'Negative'}]} />
                )} />
                 <FormField control={form.control} name="e5Statuses" render={({ field }) => (
                     <CheckboxGroup field={field} formLabel="E(5) Status" options={[{id: 'Positive', label: 'Positive'}, {id: 'Negative', label: 'Negative'}]} />
                )} />
            </div>


            <Card className="p-4 border-dashed"><CardHeader className="p-0 mb-4"><CardTitle className="text-lg">4. Define Hierarchical Logic Path</CardTitle></CardHeader>
              <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                <CurrentSidePathSelector />
                <OppositeSidePathSelector />
              </CardContent>
            </Card>
            
             <Card className="p-4 bg-primary/5"><CardHeader className="p-0 mb-4"><CardTitle className="text-lg text-primary">6. Define Resulting Target Formulas</CardTitle></CardHeader>
              <CardContent className="p-0">
                <FormField control={form.control} name="targetFormulaIds" render={({ field }) => (
                  <FormItem>
                    <MultiSelectField {...field} placeholder="Select target formulas..." options={targetFormulas} />
                    <FormMessage />
                  </FormItem> 
                )} />
              </CardContent>
            </Card>

            <FormField
                control={form.control}
                name="resultType"
                render={({ field }) => (
                    <FormItem className="space-y-2">
                    <FormLabel>7. Select Result Type</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Win" /></FormControl><FormLabel className="font-normal">Win</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Loss" /></FormControl><FormLabel className="font-normal">Loss</FormLabel></FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            
            {form.watch('resultType') === 'Win' && (
              <>
                <div className="space-y-2 pt-2">
                    <FormLabel>8. Parameters (Optional)</FormLabel>
                    <div className="space-y-3 p-4 border rounded-lg">
                        {paramFields.map((item, index) => (
                        <div key={item.id} className="flex items-end gap-2">
                            <FormField control={form.control} name={`parameters.${index}.key`} render={({ field }) => (
                            <FormItem className="flex-1"><FormLabel className="text-xs">Parameter Name</FormLabel><FormControl><Input placeholder="e.g., Min Volume" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`parameters.${index}.value`} render={({ field }) => (
                            <FormItem className="flex-1"><FormLabel className="text-xs">Parameter Value</FormLabel><FormControl><Input placeholder="e.g., &gt; 1M" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeParam(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendParam({ key: '', value: '' })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Parameter
                        </Button>
                    </div>
                </div>
                
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                      <FormLabel>9. Notes (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="Add any notes or context for this primary flow..." {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                  </FormItem>
                )} />

                <div className="flex justify-center"><ChevronsDown className="h-6 w-6 text-muted-foreground" /></div>

                  <Card className="p-4 border-green-600/30 bg-green-500/5">
                    <CardHeader className="p-0 mb-4"><CardTitle className="text-lg text-green-700 dark:text-green-300">On Win: 2nd Entry Logic</CardTitle></CardHeader>
                    <CardContent className="p-0 space-y-4">
                      <FormField control={form.control} name="winFollowUp.nextEdgeId" render={({ field }) => ( <FormItem><FormLabel>Next Edge for 2nd Entry</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select the next edge" /></SelectTrigger></FormControl><SelectContent>{edges.map(edge => <SelectItem key={edge.id} value={edge.id}>{edge.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="winFollowUp.selectedEdgeEntryIndex" render={({ field }) => ( <FormItem><FormLabel>Edge Entry for 2nd Entry</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''} disabled={!winFollowUpNextEdge}><FormControl><SelectTrigger><SelectValue placeholder="Select an entry from the next edge" /></SelectTrigger></FormControl><SelectContent>{(winFollowUpNextEdge?.entries || []).map((entry, index) => <SelectItem key={entry.id} value={String(index)}>{entry.name || `Entry ${index + 1}`}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                      
                      <div className="space-y-4">
                        <TargetConfigurator 
                          title="2nd Entry Target 1"
                          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                          statusFieldName="winFollowUp.trendTargetStatus"
                          formulaIdsFieldName="winFollowUp.trendTargetFormulaIds"
                          paramsFieldName="winFollowUp.trendTargetParameters"
                          paramFields={winFollowUpTrendParams}
                          appendParam={appendWinFollowUpTrendParam}
                          removeParam={removeWinFollowUpTrendParam}
                        />
                         <TargetConfigurator 
                          title="2nd Entry Target 2 (Optional)"
                          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                          statusFieldName="winFollowUp.trendTarget2Status"
                          formulaIdsFieldName="winFollowUp.trendTarget2FormulaIds"
                          paramsFieldName="winFollowUp.trendTarget2Parameters"
                          paramFields={winFollowUpTrend2Params}
                          appendParam={appendWinFollowUpTrend2Param}
                          removeParam={removeWinFollowUpTrend2Param}
                        />
                      </div>

                      <FormField control={form.control} name="winFollowUp.notes" render={({ field }) => ( <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Enter info for the 2nd entry..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    </CardContent>
                  </Card>
            </>
            )}
            
             {form.watch('resultType') === 'Loss' && (
                  <Card className="p-4 border-red-600/30 bg-red-500/5">
                    <CardHeader className="p-0 mb-4"><CardTitle className="text-lg text-red-700 dark:text-red-300">On Loss: Follow-up Logic</CardTitle></CardHeader>
                    <CardContent className="p-0 space-y-4">
                      <FormField control={form.control} name="lossFollowUp.nextEdgeId" render={({ field }) => ( <FormItem><FormLabel>Next Edge for RE-Entry</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select the next edge for re-entry" /></SelectTrigger></FormControl><SelectContent>{edges.map(edge => <SelectItem key={edge.id} value={edge.id}>{edge.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="lossFollowUp.selectedEdgeEntryIndex" render={({ field }) => ( <FormItem><FormLabel>Edge Entry for RE-Entry</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''} disabled={!lossFollowUpNextEdge}><FormControl><SelectTrigger><SelectValue placeholder="Select an entry from the next edge" /></SelectTrigger></FormControl><SelectContent>{(lossFollowUpNextEdge?.entries || []).map((entry, index) => <SelectItem key={entry.id} value={String(index)}>{entry.name || `Entry ${index + 1}`}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="lossFollowUp.notes" render={({ field }) => ( <FormItem><FormLabel>Notes / Instructions</FormLabel><FormControl><Textarea placeholder="Enter instructions for this loss scenario..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    </CardContent>
                  </Card>
                )}


                {(form.getValues().oppositeSideStructure?.includes('BOTH S(3) AND S(5) FORMED') || form.getValues().oppositeSideStructure?.includes('S(3) FORMED ONLY') || form.getValues().oppositeSideStructure?.includes('S(3) FORMED INTERNALLY')) && (
                  <Card className="p-4 border-blue-600/30 bg-blue-500/5">
                    <CardHeader className="p-0 mb-4"><CardTitle className="text-lg text-blue-700 dark:text-blue-300">Follow-up Action for OPPOSITE (Optional)</CardTitle></CardHeader>
                    <CardContent className="p-0 space-y-4">
                        <FormField control={form.control} name="oppositeFollowUp.nextEdgeId" render={({ field }) => ( <FormItem><FormLabel>Next Edge for Opposite Entry</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select the next edge for the opposite side" /></SelectTrigger></FormControl><SelectContent>{edges.map(edge => <SelectItem key={edge.id} value={edge.id}>{edge.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="oppositeFollowUp.selectedEdgeEntryIndex" render={({ field }) => ( <FormItem><FormLabel>Edge Entry for Opposite Entry</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''} disabled={!oppositeFollowUpNextEdge}><FormControl><SelectTrigger><SelectValue placeholder="Select an entry from the next edge" /></SelectTrigger></FormControl><SelectContent>{(oppositeFollowUpNextEdge?.entries || []).map((entry, index) => <SelectItem key={entry.id} value={String(index)}>{entry.name || `Entry ${index + 1}`}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                        <TargetConfigurator 
                            title="Opposite Entry Target"
                            icon={<TrendingDown className="h-5 w-5 text-blue-600" />}
                            statusFieldName="oppositeFollowUp.trendTargetStatus"
                            formulaIdsFieldName="oppositeFollowUp.trendTargetFormulaIds"
                            paramsFieldName="oppositeFollowUp.trendTargetParameters"
                            paramFields={oppositeFollowUpParams}
                            appendParam={appendOppositeFollowUpParam}
                            removeParam={removeOppositeFollowUpParam}
                          />
                        <FormField control={form.control} name="oppositeFollowUp.notes" render={({ field }) => ( <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Enter info for the opposite entry..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    </CardContent>
                  </Card>
                )}
              
            
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 flex justify-end gap-2 pt-4 mt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">
            {initialData ? 'Update Flow' : 'Create Flow'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

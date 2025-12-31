

"use client";

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, TrendingDown, TrendingUp, X, ArrowDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { TradingFlowFormData, TradingFlow, LinkEntryConditionType, DayType, EmaStatus, OpeningObservation, First5MinClose, First15MinClose, CandleConfirmation, IbClose, IbBreak, CprSize, PriceSensitivity, Edge, Formula, Btst, Ema5Status } from '@/types';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  name: z.string().min(3, "Flow name must be at least 3 characters."),
  conditions: z.array(z.object({
    conditionType: z.enum(['Day Type', 'E(15)', 'E(5)', '1st 5 Min Close', '1st 15 Min Open', '1st 15 Min Close', 'Candle Confirmation', 'IB Close', 'IB Break', 'CPR Size', 'Price Sensitivity', 'BTST']),
    selectedConditionId: z.string().min(1, "Please select a condition."),
  })).min(1, "At least one condition is required."),
  trendEdgeIds: z.array(z.string()).optional(),
  oppositeEdgeIds: z.array(z.string()).optional(),
  
  trendTargetStatus: z.string().optional(),
  trendTargetFormulaIds: z.array(z.string()).optional(),
  trendTargetParameters: z.array(z.object({
    key: z.string().min(1, "Parameter name cannot be empty."),
    value: z.string().min(1, "Parameter value cannot be empty."),
  })).optional(),
  
  trendTarget2Status: z.string().optional(),
  trendTarget2FormulaIds: z.array(z.string()).optional(),
  trendTarget2Parameters: z.array(z.object({
    key: z.string().min(1, "Parameter name cannot be empty."),
    value: z.string().min(1, "Parameter value cannot be empty."),
  })).optional(),
  
  oppositeTargetStatus: z.string().optional(),
  oppositeTargetFormulaIds: z.array(z.string()).optional(),
  oppositeTargetParameters: z.array(z.object({
    key: z.string().min(1, "Parameter name cannot be empty."),
    value: z.string().min(1, "Parameter value cannot be empty."),
  })).optional(),

  oppositeTarget2Status: z.string().optional(),
  oppositeTarget2FormulaIds: z.array(z.string()).optional(),
  oppositeTarget2Parameters: z.array(z.object({
    key: z.string().min(1, "Parameter name cannot be empty."),
    value: z.string().min(1, "Parameter value cannot be empty."),
  })).optional(),
});

interface TradingFlowFormProps {
  onSubmit: (data: TradingFlowFormData) => void;
  onCancel: () => void;
  initialData?: TradingFlow;
  edges: Edge[];
  formulas: Formula[];
  dayTypes: DayType[];
  emaStatuses: EmaStatus[];
  ema5Statuses: Ema5Status[];
  openingObservations: OpeningObservation[];
  first5MinCloses: First5MinClose[];
  first15MinCloses: First15MinClose[];
  candleConfirmations: CandleConfirmation[];
  ibCloses: IbClose[];
  ibBreaks: IbBreak[];
  cprSizes: CprSize[];
  priceSensitivities: PriceSensitivity[];
  btsts: Btst[];
}

const conditionTypes: Exclude<LinkEntryConditionType, 'Custom'>[] = [
  'Day Type',
  'E(15)',
  'E(5)',
  '1st 5 Min Close',
  '1st 15 Min Open',
  '1st 15 Min Close',
  'Candle Confirmation',
  'IB Close',
  'IB Break',
  'CPR Size',
  'Price Sensitivity',
  'BTST'
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
  options: { id: string; name: string }[];
}) => {
  const selectedOptions = React.useMemo(
    () => options.filter(f => value?.includes(f.id)),
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
          {options.map(option => (
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

export default function TradingFlowForm({ 
  onSubmit, onCancel, initialData, edges, formulas, ...conditionData 
}: TradingFlowFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData 
      ? { 
          ...initialData,
          trendEdgeIds: initialData.trendEdgeIds ?? [],
          oppositeEdgeIds: initialData.oppositeEdgeIds ?? [],
          conditions: initialData.conditions.map(c => ({...c, id: undefined})), 
          trendTargetParameters: initialData.trendTargetParameters || [],
          oppositeTargetParameters: initialData.oppositeTargetParameters || [],
          trendTarget2Parameters: initialData.trendTarget2Parameters || [],
          oppositeTarget2Parameters: initialData.oppositeTarget2Parameters || [],
        }
      : { 
          name: '', trendEdgeIds: [], oppositeEdgeIds: [], conditions: [], 
          trendTargetStatus: '', trendTargetFormulaIds: [], trendTargetParameters: [],
          trendTarget2Status: '', trendTarget2FormulaIds: [], trendTarget2Parameters: [],
          oppositeTargetStatus: '', oppositeTargetFormulaIds: [], oppositeTargetParameters: [],
          oppositeTarget2Status: '', oppositeTarget2FormulaIds: [], oppositeTarget2Parameters: [],
        },
  });

  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  const { fields: trendParamFields, append: appendTrendParam, remove: removeTrendParam } = useFieldArray({ control: form.control, name: "trendTargetParameters" });
  const { fields: trend2ParamFields, append: appendTrend2Param, remove: removeTrend2Param } = useFieldArray({ control: form.control, name: "trendTarget2Parameters" });
  const { fields: oppositeParamFields, append: appendOppositeParam, remove: removeOppositeParam } = useFieldArray({ control: form.control, name: "oppositeTargetParameters" });
  const { fields: opposite2ParamFields, append: appendOpposite2Param, remove: removeOpposite2Param } = useFieldArray({ control: form.control, name: "oppositeTarget2Parameters" });

  const targetFormulas = React.useMemo(() => formulas.filter(f => f.type === 'target-index' || f.type === 'target-option'), [formulas]);

  const conditionMap = {
    'Day Type': conditionData.dayTypes,
    'E(15)': conditionData.emaStatuses,
    'E(5)': conditionData.ema5Statuses,
    '1st 15 Min Open': conditionData.openingObservations,
    '1st 5 Min Close': conditionData.first5MinCloses,
    '1st 15 Min Close': conditionData.first15MinCloses,
    'Candle Confirmation': conditionData.candleConfirmations,
    'IB Close': conditionData.ibCloses,
    'IB Break': conditionData.ibBreaks,
    'CPR Size': conditionData.cprSizes,
    'Price Sensitivity': conditionData.priceSensitivities,
    'BTST': conditionData.btsts,
  };

  const watchedConditions = form.watch('conditions');

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
  };
  
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
       <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
         <div className="flex-grow min-h-0 overflow-y-auto -mr-6 pr-6 space-y-6">
            <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Flow Name</FormLabel><FormControl><Input placeholder="e.g., PDH Breakout Flow" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <div className="space-y-2">
                <FormLabel>Conditions (In chronological order)</FormLabel>
                <div className="space-y-3">
                  {conditionFields.map((item, index) => (
                      <React.Fragment key={item.id}>
                        {index > 0 && <div className="flex justify-center"><ArrowDown className="h-5 w-5 text-muted-foreground" /></div>}
                        <Card className="p-3 bg-muted/50">
                          <CardContent className="p-0 flex items-end gap-2">
                              <FormField control={form.control} name={`conditions.${index}.conditionType`} render={({ field }) => (
                                  <FormItem className="flex-1"><FormLabel className="text-xs">Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger></FormControl><SelectContent>{conditionTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                              )} />
                              <FormField control={form.control} name={`conditions.${index}.selectedConditionId`} render={({ field }) => (
                                  <FormItem className="flex-1"><FormLabel className="text-xs">Condition</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger disabled={!watchedConditions[index]?.conditionType}><SelectValue placeholder="Select condition..." /></SelectTrigger></FormControl><SelectContent>{(conditionMap[watchedConditions[index]?.conditionType as keyof typeof conditionMap] || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                              )} />
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeCondition(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </CardContent>
                        </Card>
                      </React.Fragment>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendCondition({ conditionType: 'Day Type', selectedConditionId: '' })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Condition
                </Button>
                <FormMessage>{form.formState.errors.conditions?.root?.message}</FormMessage>
            </div>
            
            <div className="flex justify-center"><ArrowDown className="h-6 w-6 text-muted-foreground" /></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4 rounded-lg border-2 border-dashed p-4">
                    <h3 className="font-semibold text-green-600 flex items-center gap-2"><TrendingUp /> Trend Path</h3>
                    <FormField control={form.control} name="trendEdgeIds" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">Trend Edges (Optional)</FormLabel>
                          <MultiSelectField {...field} placeholder="Select trend edges..." options={edges} />
                          <FormMessage />
                        </FormItem>
                    )} />
                    <TargetConfigurator
                      title="Trend Target 1"
                      icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                      statusFieldName="trendTargetStatus"
                      formulaIdsFieldName="trendTargetFormulaIds"
                      paramsFieldName="trendTargetParameters"
                      paramFields={trendParamFields}
                      appendParam={appendTrendParam}
                      removeParam={removeTrendParam}
                    />
                    <TargetConfigurator
                      title="Trend Target 2 (Optional)"
                      icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                      statusFieldName="trendTarget2Status"
                      formulaIdsFieldName="trendTarget2FormulaIds"
                      paramsFieldName="trendTarget2Parameters"
                      paramFields={trend2ParamFields}
                      appendParam={appendTrend2Param}
                      removeParam={removeTrend2Param}
                    />
                </div>
                <div className="space-y-4 rounded-lg border-2 border-dashed p-4">
                    <h3 className="font-semibold text-red-600 flex items-center gap-2"><TrendingDown /> Opposite Path</h3>
                    <FormField control={form.control} name="oppositeEdgeIds" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">Opposite Edges (Optional)</FormLabel>
                        <MultiSelectField {...field} placeholder="Select opposite edges..." options={edges} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <TargetConfigurator
                      title="Opposite Target 1"
                      icon={<TrendingDown className="h-5 w-5 text-red-600" />}
                      statusFieldName="oppositeTargetStatus"
                      formulaIdsFieldName="oppositeTargetFormulaIds"
                      paramsFieldName="oppositeTargetParameters"
                      paramFields={oppositeParamFields}
                      appendParam={appendOppositeParam}
                      removeParam={removeOppositeParam}
                    />
                    <TargetConfigurator
                      title="Opposite Target 2 (Optional)"
                      icon={<TrendingDown className="h-5 w-5 text-red-600" />}
                      statusFieldName="oppositeTarget2Status"
                      formulaIdsFieldName="oppositeTarget2FormulaIds"
                      paramsFieldName="oppositeTarget2Parameters"
                      paramFields={opposite2ParamFields}
                      appendParam={appendOpposite2Param}
                      removeParam={removeOpposite2Param}
                    />
                </div>
            </div>
        </div>
        <div className="flex-shrink-0 flex justify-end gap-2 pt-4 mt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">{initialData ? 'Update Flow' : 'Create Flow'}</Button>
        </div>
      </form>
    </Form>
  );
}

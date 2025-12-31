
"use client";

import React, { useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Edge, EdgeFormData, Formula, EdgeEntry, EdgeCategory, DayType, EmaStatus, Ema5Status, OpeningObservation, First5MinClose, First15MinClose, CandleConfirmation, IbClose, IbBreak, CprSize, PriceSensitivity, InitialLow, Btst, BreakSide } from '@/types';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

const edgeCategories = z.enum(['Trend Side', 'Opposite Side', 'Short Edge']);
const shortEdgeSubTypes = z.enum(['Trend Side', 'Opposite Side']);

const formSchema = z.object({
  name: z.string().min(1, 'Edge name is required'),
  category: edgeCategories,
  shortEdgeSubType: shortEdgeSubTypes.optional(),
  description: z.string().optional(),
  rules: z.array(z.string()).optional(),
  entries: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "Entry name is required."),
    entryFormulaIds: z.array(z.string()).optional(),
    stopLossFormulaIds: z.array(z.string()).optional(),
    targetFormulaIds: z.array(z.string()).optional(),
  })).optional(),
  // Condition Mappings
  dayTypeIds: z.array(z.string()).optional(),
  emaStatusIds: z.array(z.string()).optional(),
  ema5StatusIds: z.array(z.string()).optional(),
  openingObservationIds: z.array(z.string()).optional(),
  first5MinCloseIds: z.array(z.string()).optional(),
  first15MinCloseIds: z.array(z.string()).optional(),
  candleConfirmationIds: z.array(z.string()).optional(),
  ibCloseIds: z.array(z.string()).optional(),
  ibBreakIds: z.array(z.string()).optional(),
  initialLowIds: z.array(z.string()).optional(),
  cprSizeIds: z.array(z.string()).optional(),
  priceSensitivities: z.array(z.string()).optional(),
  btstIds: z.array(z.string()).optional(),
  breakSideIds: z.array(z.string()).optional(),
}).refine(data => {
    if (data.category === 'Short Edge' && !data.shortEdgeSubType) {
        return false;
    }
    return true;
}, {
    message: "Sub-type is required for Short Edge",
    path: ["shortEdgeSubType"],
});

interface EdgeFormProps {
  onSubmit: (data: EdgeFormData) => void;
  onCancel: () => void;
  initialData?: Edge;
  formulas?: Formula[];
  dayTypes: DayType[];
  breakSides: BreakSide[];
  emaStatuses: EmaStatus[];
  ema5Statuses: Ema5Status[];
  openingObservations: OpeningObservation[];
  first5MinCloses: First5MinClose[];
  first15MinCloses: First15MinClose[];
  candleConfirmations: CandleConfirmation[];
  ibCloses: IbClose[];
  ibBreaks: IbBreak[];
  initialLows: InitialLow[];
  cprSizes: CprSize[];
  priceSensitivities: PriceSensitivity[];
  btsts: Btst[];
}

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


export default function EdgeForm({ 
    onSubmit, 
    onCancel, 
    initialData, 
    formulas = [],
    dayTypes,
    breakSides,
    emaStatuses,
    ema5Statuses,
    openingObservations,
    first5MinCloses,
    first15MinCloses,
    candleConfirmations,
    ibCloses,
    ibBreaks,
    initialLows,
    cprSizes,
    priceSensitivities,
    btsts,
}: EdgeFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData 
      ? { ...initialData, rules: initialData.rules || [], entries: initialData.entries || [] } 
      : { 
          name: '', category: 'Trend Side', description: '', rules: [], entries: [],
          dayTypeIds: [], emaStatusIds: [], ema5StatusIds: [], openingObservationIds: [], first5MinCloseIds: [], first15MinCloseIds: [],
          candleConfirmationIds: [], ibCloseIds: [], ibBreakIds: [], initialLowIds: [], cprSizeIds: [], priceSensitivities: [], btstIds: [], breakSideIds: []
        },
  });

  const { fields: ruleFields, append: appendRule, remove: removeRule } = useFieldArray({
    control: form.control,
    name: "rules",
  });

  const { fields: entryFields, append: appendEntry, remove: removeEntry } = useFieldArray({
    control: form.control,
    name: "entries",
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
  };

  const watchedCategory = form.watch('category');

  const filteredFormulas = useMemo(() => {
    if (watchedCategory === 'Short Edge') {
      return formulas.filter(f => f.positionType === 'Short' || f.positionType === 'Both');
    }
    // For 'Trend Side' and 'Opposite Side'
    return formulas.filter(f => f.positionType === 'Long' || f.positionType === 'Both');
  }, [formulas, watchedCategory]);

  const entryFormulas = React.useMemo(() => filteredFormulas.filter(f => f.type === 'normal-entry' || f.type === 'breakout-entry'), [filteredFormulas]);
  const stopLossFormulas = React.useMemo(() => filteredFormulas.filter(f => f.type === 'stop-loss'), [filteredFormulas]);
  const targetFormulas = React.useMemo(() => filteredFormulas.filter(f => f.type === 'target' || f.type === 'target-index' || f.type === 'target-option'), [filteredFormulas]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Edge Name</FormLabel>
              <FormControl><Input placeholder="e.g. Breakout Strategy" {...field} className="font-code" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Category</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1 sm:flex-row sm:space-x-4 sm:space-y-0"
                >
                  {(['Trend Side', 'Opposite Side', 'Short Edge'] as EdgeCategory[]).map(cat => (
                    <FormItem key={cat} className="flex items-center space-x-2 space-y-0">
                      <FormControl><RadioGroupItem value={cat} /></FormControl>
                      <FormLabel className="font-normal">{cat}</FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedCategory === 'Short Edge' && (
            <FormField
              control={form.control}
              name="shortEdgeSubType"
              render={({ field }) => (
                <FormItem className="space-y-3 pl-4 border-l-2">
                  <FormLabel>Short Edge Sub-Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-row space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="Trend Side" /></FormControl>
                        <FormLabel className="font-normal">Trend Side</FormLabel>
                      </FormItem>
                       <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="Opposite Side" /></FormControl>
                        <FormLabel className="font-normal">Opposite Side</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        )}


        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl><Textarea placeholder="Describe the edge..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Card className="p-4 bg-background">
            <CardHeader className="p-0 mb-4">
                <CardTitle className="text-lg">Market Conditions (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                <FormField control={form.control} name="dayTypeIds" render={({ field }) => (<FormItem><FormLabel>Day Types</FormLabel><MultiSelectField {...field} placeholder="Any day type..." options={dayTypes} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="breakSideIds" render={({ field }) => (<FormItem><FormLabel>Break Sides</FormLabel><MultiSelectField {...field} placeholder="Any break side..." options={breakSides} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="emaStatusIds" render={({ field }) => (<FormItem><FormLabel>E(15)</FormLabel><MultiSelectField {...field} placeholder="Any E(15) status..." options={emaStatuses} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="ema5StatusIds" render={({ field }) => (<FormItem><FormLabel>E(5)</FormLabel><MultiSelectField {...field} placeholder="Any E(5) status..." options={ema5Statuses} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="openingObservationIds" render={({ field }) => (<FormItem><FormLabel>1st 15 Min Open</FormLabel><MultiSelectField {...field} placeholder="Any 15m open..." options={openingObservations} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="first5MinCloseIds" render={({ field }) => (<FormItem><FormLabel>1st 5 Min Close</FormLabel><MultiSelectField {...field} placeholder="Any 5m close..." options={first5MinCloses} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="first15MinCloseIds" render={({ field }) => (<FormItem><FormLabel>1st 15 Min Close</FormLabel><MultiSelectField {...field} placeholder="Any 15m close..." options={first15MinCloses} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="candleConfirmationIds" render={({ field }) => (<FormItem><FormLabel>Candle Confirmations</FormLabel><MultiSelectField {...field} placeholder="Any confirmation..." options={candleConfirmations} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="ibCloseIds" render={({ field }) => (<FormItem><FormLabel>IB Closes</FormLabel><MultiSelectField {...field} placeholder="Any IB close..." options={ibCloses} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="ibBreakIds" render={({ field }) => (<FormItem><FormLabel>IB Breaks</FormLabel><MultiSelectField {...field} placeholder="Any IB break..." options={ibBreaks} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="initialLowIds" render={({ field }) => (<FormItem><FormLabel>Initial Lows</FormLabel><MultiSelectField {...field} placeholder="Any initial low..." options={initialLows} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="cprSizeIds" render={({ field }) => (<FormItem><FormLabel>CPR Sizes</FormLabel><MultiSelectField {...field} placeholder="Any CPR size..." options={cprSizes} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="priceSensitivities" render={({ field }) => (<FormItem><FormLabel>Price Sensitivities</FormLabel><MultiSelectField {...field} placeholder="Any sensitivity..." options={priceSensitivities} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="btstIds" render={({ field }) => (<FormItem><FormLabel>BTST</FormLabel><MultiSelectField {...field} placeholder="Any BTST condition..." options={btsts} /><FormMessage /></FormItem>)} />
            </CardContent>
        </Card>

        <div>
          <FormLabel>Rules (Optional)</FormLabel>
          <div className="mt-2 space-y-3">
            {ruleFields.map((item, index) => (
              <FormField
                key={item.id}
                control={form.control}
                name={`rules.${index}`}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-sm text-muted-foreground pt-2">Rule {index + 1}:</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`e.g. RSI must be above 60`} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRule(index)}
                        className="shrink-0"
                        aria-label={`Remove rule ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => appendRule("")}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        </div>
        
        <div>
          <FormLabel>Edge Entries</FormLabel>
          <div className="mt-2 space-y-3">
            {entryFields.map((item, index) => (
              <Card key={item.id} className="p-4 bg-secondary/50">
                <CardContent className="p-0 space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <FormField
                      control={form.control}
                      name={`entries.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormLabel className="text-base font-semibold">Entry {index + 1}</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Inverse Entry, SL Entry..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEntry(index)}
                      className="shrink-0 h-7 w-7 ml-4"
                      aria-label={`Remove entry ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`entries.${index}.entryFormulaIds`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Entry Formulas</FormLabel>
                          <MultiSelectField
                            {...field}
                            placeholder="Select entry formulas..."
                            options={entryFormulas}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`entries.${index}.stopLossFormulaIds`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">StopLoss Formulas</FormLabel>
                           <MultiSelectField
                            {...field}
                            placeholder="Select SL formulas..."
                            options={stopLossFormulas}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`entries.${index}.targetFormulaIds`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Target Formulas</FormLabel>
                           <MultiSelectField
                            {...field}
                            placeholder="Select target formulas..."
                            options={targetFormulas}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
           <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => appendEntry({ id: `new-${Math.random()}`, name: '', entryFormulaIds: [], stopLossFormulaIds: [], targetFormulaIds: [] })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Edge Entry
          </Button>
        </div>


        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {initialData ? 'Update Edge' : 'Add Edge'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

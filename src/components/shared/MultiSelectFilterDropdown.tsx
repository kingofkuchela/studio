
"use client";

import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { X as XIcon, Filter } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  name: string;
}

interface OptionGroup {
  label: string;
  options: Option[];
}

interface MultiSelectFilterDropdownProps {
  filterNameSingular: string;
  filterNamePlural: string;
  options?: Option[];
  optionGroups?: OptionGroup[];
  selectedIds: string[];
  onSelectionChange: (newSelectedIds: string[]) => void;
}

export default function MultiSelectFilterDropdown({
  filterNameSingular,
  filterNamePlural,
  options,
  optionGroups,
  selectedIds,
  onSelectionChange,
}: MultiSelectFilterDropdownProps) {
  const allOptions = useMemo(() => {
    if (optionGroups) {
      return optionGroups.flatMap(g => g.options);
    }
    return options || [];
  }, [options, optionGroups]);

  const handleToggleItem = (itemId: string) => {
    const newSelectedIds = selectedIds.includes(itemId)
      ? selectedIds.filter(id => id !== itemId)
      : [...selectedIds, itemId];
    onSelectionChange(newSelectedIds);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleSelectAll = () => {
    onSelectionChange(allOptions.map(option => option.id));
  };

  const handleSelectGroup = (groupIds: string[]) => {
    onSelectionChange([...new Set([...selectedIds, ...groupIds])]);
  };

  const getTriggerText = () => {
    if (selectedIds.length === 0 || selectedIds.length === allOptions.length) {
      return `All ${filterNamePlural}`;
    }
    if (selectedIds.length === 1) {
      const selectedOption = allOptions.find(option => option.id === selectedIds[0]);
      return selectedOption ? selectedOption.name : `1 ${filterNameSingular}`;
    }
    return `${selectedIds.length} ${filterNamePlural}`;
  };

  const selectedOptions = allOptions.filter(option => selectedIds.includes(option.id));
  const isFiltered = selectedIds.length > 0;

  const renderContent = () => {
    if (optionGroups) {
      return (
        <ScrollArea className="max-h-[250px] overflow-y-auto">
          {optionGroups.map(group => (
            <React.Fragment key={group.label}>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => handleSelectGroup(group.options.map(o => o.id))}>
                Select all from this group
              </DropdownMenuItem>
              {group.options.map(option => (
                <DropdownMenuCheckboxItem
                  key={option.id}
                  checked={selectedIds.includes(option.id)}
                  onCheckedChange={() => handleToggleItem(option.id)}
                  onSelect={(e) => e.preventDefault()}
                  className="text-xs"
                >
                  {option.name}
                </DropdownMenuCheckboxItem>
              ))}
            </React.Fragment>
          ))}
        </ScrollArea>
      );
    }

    return (
      <ScrollArea className="max-h-[150px] overflow-y-auto">
        {options?.map(option => (
          <DropdownMenuCheckboxItem
            key={option.id}
            checked={selectedIds.includes(option.id)}
            onCheckedChange={() => handleToggleItem(option.id)}
            onSelect={(e) => e.preventDefault()}
            className="text-xs"
          >
            {option.name}
          </DropdownMenuCheckboxItem>
        ))}
      </ScrollArea>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 text-[10px] px-2 w-full sm:w-auto justify-start sm:max-w-[200px]",
            isFiltered && "bg-accent hover:bg-accent/90 text-accent-foreground border-transparent"
          )}
        >
          <Filter className="h-3 w-3 shrink-0" />
          <span className="truncate">{getTriggerText()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>{`Filter by ${filterNamePlural}`}</DropdownMenuLabel>
        
        {selectedOptions.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-xs text-muted-foreground">Selected:</div>
            <ScrollArea className="max-h-[100px] overflow-y-auto">
                <div className="p-2 space-y-1">
                {selectedOptions.map(option => (
                    <Badge
                    key={option.id}
                    variant="secondary"
                    className="flex items-center justify-between text-xs"
                    >
                    <span className="truncate max-w-[180px]">{option.name}</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); 
                            handleToggleItem(option.id);
                        }}
                        className="ml-1 p-0.5 rounded-full hover:bg-muted-foreground/20"
                        aria-label={`Remove ${option.name}`}
                    >
                        <XIcon className="h-3 w-3" />
                    </button>
                    </Badge>
                ))}
                </div>
            </ScrollArea>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onSelect={handleSelectAll} disabled={selectedIds.length === allOptions.length && allOptions.length > 0}>
          Select All
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleClearAll} disabled={selectedIds.length === 0}>
          Clear All Selections
        </DropdownMenuItem>
        
        {renderContent()}

      </DropdownMenuContent>
    </DropdownMenu>
  );
}

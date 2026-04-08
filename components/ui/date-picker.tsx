"use client";

import * as React from "react";
import { format, parse, setMonth, setYear, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState<Date>(value || new Date());

  React.useEffect(() => {
    if (value) setViewDate(value);
  }, [value]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal text-base px-4 py-6 h-auto",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-5 w-5" />
          {value
            ? format(value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* Quick year/month navigation */}
        <div className="flex items-center gap-2 p-3 pb-0">
          <Select
            value={String(viewDate.getMonth())}
            onValueChange={(v) => {
              const newDate = setMonth(viewDate, parseInt(v));
              setViewDate(newDate);
            }}
          >
            <SelectTrigger className="flex-1 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {format(new Date(2024, m, 1), "MMMM", { locale: ptBR })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(viewDate.getFullYear())}
            onValueChange={(v) => {
              const newDate = setYear(viewDate, parseInt(v));
              setViewDate(newDate);
            }}
          >
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
          month={viewDate}
          onMonthChange={setViewDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

interface MonthPickerProps {
  /** Value as "YYYY-MM" string */
  value?: string;
  /** Callback with "YYYY-MM" string */
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MonthPicker({
  value,
  onChange,
  placeholder = "Selecione o mes",
  className,
  disabled,
}: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  const selectedYear = value ? parseInt(value.slice(0, 4)) : currentYear;
  const selectedMonth = value ? parseInt(value.slice(5, 7)) - 1 : new Date().getMonth();
  const [viewYear, setViewYear] = React.useState(selectedYear);

  const handleSelect = (month: number) => {
    const y = String(viewYear);
    const m = String(month + 1).padStart(2, "0");
    onChange?.(`${y}-${m}`);
    setOpen(false);
  };

  const displayText = value
    ? format(new Date(selectedYear, selectedMonth, 1), "MMMM 'de' yyyy", {
        locale: ptBR,
      })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal text-base px-4 py-6 h-auto",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-5 w-5" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-4" align="start">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewYear((y) => y - 1)}
          >
            &larr;
          </Button>
          <Select
            value={String(viewYear)}
            onValueChange={(v) => setViewYear(parseInt(v))}
          >
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewYear((y) => y + 1)}
          >
            &rarr;
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {months.map((m) => {
            const isSelected = viewYear === selectedYear && m === selectedMonth;
            return (
              <Button
                key={m}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className="h-10 text-sm capitalize"
                onClick={() => handleSelect(m)}
              >
                {format(new Date(2024, m, 1), "MMM", { locale: ptBR })}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface YearPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function YearPicker({
  value,
  onChange,
  placeholder = "Selecione o ano",
  className,
  disabled,
}: YearPickerProps) {
  const [open, setOpen] = React.useState(false);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - i);
  const selectedYear = value ? parseInt(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal text-base px-4 py-6 h-auto",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-5 w-5" />
          {selectedYear ? String(selectedYear) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-4" align="start">
        <div className="grid grid-cols-4 gap-2">
          {years.map((y) => (
            <Button
              key={y}
              variant={y === selectedYear ? "default" : "outline"}
              size="sm"
              className="h-10"
              onClick={() => {
                onChange?.(String(y));
                setOpen(false);
              }}
            >
              {y}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

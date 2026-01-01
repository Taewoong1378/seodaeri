"use client";

import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange?: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  accentColor?: "blue" | "emerald" | "purple" | "orange";
}

const accentColors = {
  blue: {
    icon: "text-blue-500",
    ring: "focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400",
    todayBtn: "text-blue-600 hover:bg-blue-50",
  },
  emerald: {
    icon: "text-emerald-500",
    ring: "focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-400",
    todayBtn: "text-emerald-600 hover:bg-emerald-50",
  },
  purple: {
    icon: "text-purple-500",
    ring: "focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-400",
    todayBtn: "text-purple-600 hover:bg-purple-50",
  },
  orange: {
    icon: "text-orange-500",
    ring: "focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:border-orange-400",
    todayBtn: "text-orange-600 hover:bg-orange-50",
  },
};

function DatePicker({
  value,
  onChange,
  placeholder = "날짜 선택",
  className,
  disabled = false,
  accentColor = "blue",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  const date = React.useMemo(() => {
    if (!value) return undefined;
    try {
      return parse(value, "yyyy-MM-dd", new Date());
    } catch {
      return undefined;
    }
  }, [value]);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && onChange) {
      onChange(format(selectedDate, "yyyy-MM-dd"));
    }
    setOpen(false);
  };

  const colors = accentColors[accentColor];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-12 rounded-xl bg-white border-gray-200 hover:bg-white hover:border-gray-300 shadow-sm transition-all",
            colors.ring,
            !date && "text-gray-400",
            className
          )}
        >
          <CalendarIcon className={cn("mr-2 h-4 w-4", colors.icon)} />
          {date ? (
            <span className="text-gray-900">
              {format(date, "yyyy년 M월 d일", { locale: ko })}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            autoFocus
            className="p-4"
          />
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 text-xs font-medium"
              onClick={() => {
                if (onChange) onChange("");
                setOpen(false);
              }}
            >
              선택 해제
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 text-xs font-bold", colors.todayBtn)}
              onClick={() => {
                if (onChange) onChange(format(new Date(), "yyyy-MM-dd"));
                setOpen(false);
              }}
            >
              오늘 날짜 선택
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };

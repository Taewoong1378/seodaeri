"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type * as React from "react";
import { DayPicker } from "react-day-picker";
import { ko } from "date-fns/locale";
import "react-day-picker/style.css";

import { cn } from "../lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={ko}
      showOutsideDays={showOutsideDays}
      className={cn("p-3 rdp-custom", className)}
      classNames={{
        months: "rdp-months",
        month: "rdp-month",
        month_caption: "rdp-month_caption flex justify-center pt-1 relative items-center h-10",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "rdp-nav",
        button_previous:
          "rdp-button_previous absolute left-1 top-1 h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 text-foreground hover:bg-muted rounded-lg flex items-center justify-center transition-colors",
        button_next:
          "rdp-button_next absolute right-1 top-1 h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 text-foreground hover:bg-muted rounded-lg flex items-center justify-center transition-colors",
        month_grid: "rdp-month_grid w-full border-collapse",
        weekdays: "rdp-weekdays",
        weekday: "rdp-weekday text-muted-foreground font-medium text-[0.8rem] w-9 h-9",
        week: "rdp-week",
        day: "rdp-day h-9 w-9 p-0 text-center text-sm",
        day_button:
          "rdp-day_button h-9 w-9 p-0 font-normal text-foreground hover:bg-muted rounded-lg transition-colors inline-flex items-center justify-center",
        selected:
          "rdp-selected bg-blue-500 text-white hover:bg-blue-600 hover:text-white rounded-lg",
        today: "rdp-today bg-muted text-foreground rounded-lg font-semibold",
        outside: "rdp-outside text-muted-foreground opacity-40",
        disabled: "rdp-disabled text-muted-foreground opacity-50",
        hidden: "rdp-hidden invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") {
            return <ChevronLeft className="h-4 w-4" />;
          }
          return <ChevronRight className="h-4 w-4" />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

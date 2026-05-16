"use client";
import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Regional presets (India) — avoids browser-local midnight ambiguity. */
const REGIONAL_TZ = "Asia/Kolkata";

const istNow = () => dayjs().tz(REGIONAL_TZ);

/** UTC presets when `presetTimezone=\"utc\"` — rare; finance uses IST (default). */
const utcNowDayjs = () => dayjs.utc();

const predefinedRanges = [
  { label: "All", value: "all" },
  { separator: true },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { separator: true },
  { label: "Last 7 days", value: "last7days" },
  { label: "Last 14 days", value: "last14days" },
  { separator: true },
  { label: "Last month", value: "lastMonth" },
  { label: "This month", value: "thisMonth" },
  { label: "This year", value: "thisYear" },
];

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * @param {'ist' | 'utc'} [presetTimezone] — default `ist` (Asia/Kolkata) matches Wix Admin India listings; pass `utc` only for explicit UTC aggregates.
 */
export default function DateRangePicker({ selectedRange, onSelect, onCancel, presetTimezone = 'ist' }) {
  const presetsUtc = presetTimezone === 'utc';
  const [isOpen, setIsOpen] = useState(false);
  
  // Normalize selected range to ensure valid Date objects
  const normalizeRange = (range) => {
    if (!range) return { from: null, to: null };
    
    let from = null;
    let to = null;
    
    // Convert to Date objects if not already
    if (range.from) {
      if (range.from instanceof Date) {
        from = range.from;
      } else {
        from = new Date(range.from);
      }
      // Validate date
      if (isNaN(from.getTime())) {
        from = null;
      }
    }
    
    if (range.to) {
      if (range.to instanceof Date) {
        to = range.to;
      } else {
        to = new Date(range.to);
      }
      // Validate date
      if (isNaN(to.getTime())) {
        to = null;
      }
    }
    
    return { from, to };
  };
  
  const [tempRange, setTempRange] = useState(() => normalizeRange(selectedRange));
  const [currentMonth, setCurrentMonth] = useState(() => {
    const norm = normalizeRange(selectedRange);
    return norm?.from || new Date();
  });

  useEffect(() => {
    if (selectedRange?.all) {
      setTempRange({ from: null, to: null });
      return;
    }
    const normalized = normalizeRange(selectedRange);
    setTempRange(normalized);
    if (normalized.from) {
      setCurrentMonth(normalized.from);
    }
  }, [selectedRange]);

  const handlePredefinedRange = (value) => {
    if (value === "all") {
      onSelect({ all: true });
      setIsOpen(false);
      return;
    }

    let from;
    let to;

    switch (value) {
      case "today":
        if (presetsUtc) {
          const d = utcNowDayjs();
          from = d.startOf("day").toDate();
          to = d.endOf("day").toDate();
        } else {
          from = istNow().startOf("day").toDate();
          to = istNow().endOf("day").toDate();
        }
        break;
      case "yesterday": {
        const y = presetsUtc ? utcNowDayjs().subtract(1, "day") : istNow().subtract(1, "day");
        from = y.startOf("day").toDate();
        to = y.endOf("day").toDate();
        break;
      }
      case "last7days":
        from = presetsUtc
          ? utcNowDayjs().subtract(6, "day").startOf("day").toDate()
          : istNow().subtract(6, "day").startOf("day").toDate();
        to = presetsUtc ? utcNowDayjs().endOf("day").toDate() : istNow().endOf("day").toDate();
        break;
      case "last14days":
        from = presetsUtc
          ? utcNowDayjs().subtract(13, "day").startOf("day").toDate()
          : istNow().subtract(13, "day").startOf("day").toDate();
        to = presetsUtc ? utcNowDayjs().endOf("day").toDate() : istNow().endOf("day").toDate();
        break;
      case "lastMonth": {
        const lm = presetsUtc ? utcNowDayjs().subtract(1, "month") : istNow().subtract(1, "month");
        from = lm.startOf("month").toDate();
        to = lm.endOf("month").toDate();
        break;
      }
      case "thisMonth":
        if (presetsUtc) {
          const d = utcNowDayjs();
          from = d.startOf("month").toDate();
          to = d.endOf("month").toDate();
        } else {
          from = istNow().startOf("month").toDate();
          to = istNow().endOf("month").toDate();
        }
        break;
      case "thisYear":
        if (presetsUtc) {
          const d = utcNowDayjs();
          from = d.startOf("year").toDate();
          to = d.endOf("year").toDate();
        } else {
          from = istNow().startOf("year").toDate();
          to = istNow().endOf("year").toDate();
        }
        break;
      default:
        return;
    }

    // Normalize and validate the range — commit immediately so parent views (e.g. finance dashboard) refetch
    const normalized = normalizeRange({ from, to });
    setTempRange(normalized);
    if (normalized.from && normalized.to) {
      const a = normalized.from <= normalized.to ? normalized.from : normalized.to;
      const b = normalized.from <= normalized.to ? normalized.to : normalized.from;
      onSelect({ from: a, to: b });
      setIsOpen(false);
    }
  };

  const handleDateSelect = (range) => {
    // react-day-picker passes the entire range object in range mode
    if (range && typeof range === 'object') {
      // Ensure dates are valid Date objects
      const from = range.from ? new Date(range.from) : null;
      const to = range.to ? new Date(range.to) : null;
      
      // Validate dates
      if (from && !isNaN(from.getTime())) {
        if (to && !isNaN(to.getTime())) {
          // Both dates chosen — normalize order, apply immediately (no need to press Apply unless adjusting)
          const start = from <= to ? from : to;
          const end = from <= to ? to : from;
          setTempRange({ from: start, to: end });
          onSelect({ from: start, to: end });
          setIsOpen(false);
        } else {
          // Only from date is valid
          setTempRange({ from, to: null });
        }
      } else if (!from && !to) {
        // Clear selection
        setTempRange({ from: null, to: null });
      }
    } else if (range === undefined || range === null) {
      // Clear selection
      setTempRange({ from: null, to: null });
    }
  };

  const handleApply = () => {
    // Validate dates before applying
    if (tempRange.from && !isNaN(tempRange.from.getTime()) && 
        tempRange.to && !isNaN(tempRange.to.getTime())) {
      // Ensure from is before to
      const from = tempRange.from <= tempRange.to ? tempRange.from : tempRange.to;
      const to = tempRange.from <= tempRange.to ? tempRange.to : tempRange.from;
      onSelect({ from, to });
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    const normalized = normalizeRange(selectedRange);
    setTempRange(normalized);
    setIsOpen(false);
    if (onCancel) {
      onCancel();
    }
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
  };

  const handleMonthSelect = (monthIndex) => {
    const newMonth = new Date(currentMonth.getFullYear(), monthIndex, 1);
    setCurrentMonth(newMonth);
    // Highlight the entire month
    const from = startOfMonth(newMonth);
    const to = endOfMonth(newMonth);
    setTempRange({ from, to });
  };

  const handleYearSelect = (year) => {
    const newMonth = new Date(year, currentMonth.getMonth(), 1);
    setCurrentMonth(newMonth);
    // Highlight the entire month of the selected year
    const from = startOfMonth(newMonth);
    const to = endOfMonth(newMonth);
    setTempRange({ from, to });
  };

  // Generate years for dropdown (starting from 2025 to current year + 10 years)
  const currentYear = new Date().getFullYear();
  const startYear = 2025;
  const endYear = currentYear + 10;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  const getRangeText = () => {
    if (selectedRange?.all) {
      return "All dates";
    }
    const displayRange = isOpen ? tempRange : normalizeRange(selectedRange);
    try {
      if (displayRange.from && displayRange.to) {
        const fromDate = new Date(displayRange.from);
        const toDate = new Date(displayRange.to);
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          return `${format(fromDate, "MMM d, yyyy")} - ${format(toDate, "MMM d, yyyy")}`;
        }
      } else if (displayRange.from) {
        const fromDate = new Date(displayRange.from);
        if (!isNaN(fromDate.getTime())) {
          return `${format(fromDate, "MMM d, yyyy")} - ...`;
        }
      }
    } catch (error) {
      console.error('Error formatting date range:', error);
    }
    return "Select date range";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("min-w-[280px] justify-start text-left font-normal", !selectedRange?.all && !tempRange.from && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getRangeText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 max-h-[600px] overflow-y-auto" align="start">
        <div className="flex">
          {/* Left Sidebar - Predefined Ranges */}
          <div className="border-r border-gray-200 p-4 w-48 max-h-[400px] overflow-y-auto">
            <div className="space-y-1">
              {predefinedRanges.map((item, index) => {
                if (item.separator) {
                  return <div key={`sep-${index}`} className="border-t border-gray-200 my-2" />;
                }
                return (
                  <button
                    key={item.value}
                    onClick={() => handlePredefinedRange(item.value)}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar View */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded font-semibold">
                      {format(currentMonth, "MMMM")}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {months.map((month, index) => (
                      <DropdownMenuItem
                        key={index}
                        onClick={() => handleMonthSelect(index)}
                      >
                        {month}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded font-semibold">
                      {format(currentMonth, "yyyy")}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-[200px] overflow-y-auto">
                    {years.map((year) => (
                      <DropdownMenuItem
                        key={year}
                        onClick={() => handleYearSelect(year)}
                      >
                        {year}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <button
                onClick={() => navigateMonth(1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <CalendarComponent
              mode="range"
              selected={tempRange.from || tempRange.to ? tempRange : undefined}
              onSelect={handleDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border-0"
              components={{
                Caption: () => null, // Hide default caption
              }}
              classNames={{
                month_caption: "hidden", // Hide month caption
                nav: "hidden", // Hide navigation arrows
                day_button: "relative flex size-9 items-center justify-center whitespace-nowrap rounded-lg p-0 text-gray-900 outline-offset-2 focus:outline-none group-data-[disabled]:pointer-events-none focus-visible:z-10 hover:bg-gray-100 group-data-[selected]:bg-blue-50 group-data-[selected]:text-blue-700 group-data-[disabled]:text-gray-300 group-data-[disabled]:line-through group-data-[outside]:text-gray-300 group-data-[outside]:group-data-[selected]:text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500/50",
                range_start: "bg-blue-100 text-blue-900 rounded-l-lg",
                range_end: "bg-blue-100 text-blue-900 rounded-r-lg",
                range_middle: "bg-blue-50 text-blue-700",
              }}
            />

            {/* Selected Range Display and Actions */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  {(() => {
                    if (selectedRange?.all) {
                      return "All dates (no range filter)";
                    }
                    try {
                      if (tempRange.from && tempRange.to) {
                        const fromDate = new Date(tempRange.from);
                        const toDate = new Date(tempRange.to);
                        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
                          return `${format(fromDate, "MMM d, yyyy")} - ${format(toDate, "MMM d, yyyy")}`;
                        }
                      } else if (tempRange.from) {
                        const fromDate = new Date(tempRange.from);
                        if (!isNaN(fromDate.getTime())) {
                          return `${format(fromDate, "MMM d, yyyy")} - ...`;
                        }
                      }
                    } catch (error) {
                      console.error('Error formatting date:', error);
                    }
                    return "Select date range";
                  })()}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancel} className="px-4">
                  Cancel
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={!tempRange.from || !tempRange.to}
                  className="px-4 bg-blue-600 hover:bg-blue-700"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

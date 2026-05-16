"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function WheelPagination({
  totalPages = 50,
  visibleCount = 5,
  className,
  onChange,
  currentPage = 0, // 0-indexed
  onPageChange, // For controlled component
}) {
  const [active, setActive] = useState(currentPage || 0);
  const containerRef = useRef(null);

  // Update active when currentPage prop changes (for controlled usage)
  useEffect(() => {
    if (currentPage !== undefined && currentPage !== null && currentPage !== active) {
      setActive(currentPage);
    }
  }, [currentPage, active]);

  const prevPage = () => {
    const newPage = Math.max(active - 1, 0);
    setActive(newPage);
    if (onPageChange) onPageChange(newPage);
    if (onChange) onChange(newPage);
  };
  
  const nextPage = () => {
    const newPage = Math.min(active + 1, totalPages - 1);
    setActive(newPage);
    if (onPageChange) onPageChange(newPage);
    if (onChange) onChange(newPage);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const handleWheel = (e) => {
      e.preventDefault();
      setActive((currentActive) => {
        let newPage;
        if (e.deltaY < 0) {
          newPage = Math.max(currentActive - 1, 0);
        } else if (e.deltaY > 0) {
          newPage = Math.min(currentActive + 1, totalPages - 1);
        } else {
          return currentActive;
        }
        
        if (newPage !== currentActive) {
          // Call callbacks with the new page
          if (onPageChange) onPageChange(newPage);
          if (onChange) onChange(newPage);
          return newPage;
        }
        return currentActive;
      });
    };
    
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [totalPages, onPageChange, onChange]);

  // Determine visible pages based on active
  const getVisiblePages = () => {
    const pages = [];
    const half = Math.floor(visibleCount / 2);
    let start = active - half;
    let end = active + half;

    if (start < 0) {
      end += -start;
      start = 0;
    }
    if (end > totalPages - 1) {
      start -= end - (totalPages - 1);
      end = totalPages - 1;
      if (start < 0) start = 0;
    }

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex items-center gap-2 p-4 select-none cursor-pointer",
        className
      )}
    >
      {/* Previous arrow */}
      <Button
        variant="ghost"
        size="icon"
        onClick={prevPage}
        disabled={active === 0}
        className="text-gray-400 hover:text-[#3f2e73] disabled:opacity-40 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      {/* Page numbers carousel */}
      <div className="flex gap-2">
        {visiblePages.map((p) => (
          <motion.div
            key={p}
            layout
            animate={{ scale: active === p ? 1.2 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full font-medium text-sm min-h-[32px] min-w-[32px] transition-colors",
              active === p
                ? "bg-[#3f2e73] text-white border border-[#3f2e73]"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            )}
            onClick={() => {
              setActive(p);
              // Immediately call the callback for instant feedback
              if (onPageChange) onPageChange(p);
              if (onChange) onChange(p);
            }}
          >
            {p + 1}
          </motion.div>
        ))}
      </div>

      {/* Next arrow */}
      <Button
        variant="ghost"
        size="icon"
        onClick={nextPage}
        disabled={active === totalPages - 1}
        className="text-gray-400 hover:text-[#3f2e73] disabled:opacity-40 transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}


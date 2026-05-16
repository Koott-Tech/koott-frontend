"use client" 

import * as React from "react"
import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const Counter = ({
  start = 0,
  end,
  duration = end,
  className,
  fontSize = 30,
  ...rest
}) => {
  const [value, setValue] = useState(start);
  const padding = 10;
  const height = fontSize + padding;

  useEffect(() => {
    if (value >= end) return;
    
    const interval = setInterval(() => {
      setValue((prev) => {
        if (prev < end) {
          return prev + 1;
        }
        return prev;
      });
    }, (duration / (end - start)) * 1000);

    return () => clearInterval(interval);
  }, [value, end, start, duration]);

  return (
    <div
      style={{ fontSize }}
      {...rest}
      className={cn(
        "flex overflow-hidden rounded px-2 leading-none text-primary font-bold ",
        className
      )}
    >
      {value >= 100000 && <Digit place={100000} value={value} height={height} />}
      {value >= 10000 && <Digit place={10000} value={value} height={height} />}
      {value >= 1000 && <Digit place={1000} value={value} height={height} />}
      {value >= 100 && <Digit place={100} value={value} height={height} />}
      {value >= 10 && <Digit place={10} value={value} height={height} />}
      <Digit place={1} value={value} height={height} />
    </div>
  );
};

function Digit({ place, value, height }) {
  let valueRoundedToPlace = Math.floor(value / place);
  let animatedValue = useSpring(valueRoundedToPlace, {
    stiffness: 50,
    damping: 20
  });

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace]);

  return (
    <div style={{ height }} className="relative w-[1ch] tabular-nums">
      {[...Array(10)].map((_, i) => (
        <Number key={i} mv={animatedValue} number={i} height={height} />
      ))}
    </div>
  );
}

function Number({ mv, number, height }) {
  let y = useTransform(mv, (latest) => {
    let placeValue = latest % 10;
    let offset = (10 + number - placeValue) % 10;

    let memo = offset * height;

    if (offset > 5) {
      memo -= 10 * height;
    }

    return memo;
  });

  return (
    <motion.span
      style={{ y }}
      className="absolute inset-0 flex items-center justify-center"
    >
      {number}
    </motion.span>
  );
}

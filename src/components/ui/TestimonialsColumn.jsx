"use client";
import React from "react";
import { motion } from "framer-motion";

export default function TestimonialsColumn({ className = "", testimonials, duration = 14 }) {
  return (
    <div className={className}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{ duration, repeat: Infinity, ease: "linear", repeatType: "loop" }}
        className="flex flex-col gap-6 pb-6 bg-background"
      >
        {new Array(2).fill(0).map((_, loopIndex) => (
          <React.Fragment key={loopIndex}>
            {testimonials.map(({ text, image, name, role }, i) => (
              <div key={`${loopIndex}-${i}`} className="p-6 md:p-8 rounded-3xl border shadow-lg shadow-black/5 max-w-xs w-full bg-white">
                <div className="text-sm md:text-base leading-relaxed">{text}</div>
                <div className="flex items-center gap-3 mt-4">
                  <img src={image} alt={name} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                  <div className="flex flex-col">
                    <div className="font-medium tracking-tight leading-5">{name}</div>
                    <div className="leading-5 opacity-60 tracking-tight text-sm">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}



"use client";

import { useEffect, useRef } from "react";

export default function LoadingScreen({ message = "", isVisible = true }) {
  const prevVisibleRef = useRef(isVisible);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!overlayRef.current) return;

    // Initialize opacity on mount
    if (prevVisibleRef.current === undefined) {
      overlayRef.current.style.opacity = isVisible ? "1" : "0";
      overlayRef.current.style.transition = "none";
      prevVisibleRef.current = isVisible;
      return;
    }

    if (prevVisibleRef.current && !isVisible) {
      // Fade out: set transition first, then change opacity
      overlayRef.current.style.transition = "opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)";
      // Force a reflow to ensure transition is applied before opacity change
      void overlayRef.current.offsetHeight;
      // Change opacity in next frame for smooth fade-out
      requestAnimationFrame(() => {
        if (overlayRef.current) {
          overlayRef.current.style.opacity = "0";
        }
      });
    } else if (isVisible && !prevVisibleRef.current) {
      // Fade in: no transition, appear instantly
      overlayRef.current.style.transition = "none";
      overlayRef.current.style.opacity = "1";
    } else if (isVisible) {
      // When visible, always have transition ready for smooth fade-out
      overlayRef.current.style.transition = "opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)";
      overlayRef.current.style.opacity = "1";
    }
    
    prevVisibleRef.current = isVisible;
  }, [isVisible]);

  return (
    <div
      ref={overlayRef}
      data-nextjs-scroll-focus-boundary
      className="loading-screen-overlay"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        fontFamily: "Arial, Helvetica, sans-serif",
        overflow: "hidden",
        margin: 0,
        padding: 0,
        // Opacity and transition are controlled dynamically via useEffect
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: "#111827",
        }}
      >
        <div
          className="loading-logo"
          style={{
            width: "240px",
            height: "79px",
            margin: "0 auto",
            backgroundImage: "url('/mainlogo.webp')",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            animation: "pulseScale 2s ease-in-out infinite",
          }}
        />
        {message ? (
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "1rem",
              color: "#4b5563",
              letterSpacing: "0.05em",
            }}
          >
            {message}
          </p>
        ) : null}
      </div>
      <style>
        {`
          @keyframes pulseScale {
            0% { transform: scale(1); opacity: 0.9; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(1); opacity: 0.9; }
          }
          .loading-screen-overlay {
            will-change: opacity;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
          }
          @media (max-width: 767px) {
            .loading-logo {
              width: 200px !important;
              height: 66px !important;
            }
          }
        `}
      </style>
    </div>
  );
}

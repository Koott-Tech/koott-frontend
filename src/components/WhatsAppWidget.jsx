"use client";
import { useState, useRef, useEffect } from 'react';

export default function WhatsAppWidget() {
  // Fixed offset from bottom and right (same for mobile and desktop)
  const BOTTOM_OFFSET = 40; // Fixed 40px from bottom on all devices (moved up from 20px)
  const RIGHT_OFFSET = 20; // Fixed 20px from right on all devices

  const [position, setPosition] = useState({ x: null, y: null }); // null means use right/bottom CSS
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [wasDragged, setWasDragged] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const widgetRef = useRef(null);

  // Set initial position to bottom right after mount with fixed offset
  useEffect(() => {
    if (typeof window !== 'undefined' && widgetRef.current && !isPositioned) {
      const widget = widgetRef.current;
      const rect = widget.getBoundingClientRect();
      const x = window.innerWidth - rect.width - RIGHT_OFFSET;
      const y = window.innerHeight - rect.height - BOTTOM_OFFSET;
      setPosition({ x, y });
      setIsPositioned(true);
    }
  }, [isPositioned]);

  // Handle window resize to keep widget in bounds with fixed offset
  useEffect(() => {
    if (!isPositioned) return;
    
    const handleResize = () => {
      const widget = widgetRef.current;
      if (widget && !isDragging && position.x !== null && position.y !== null) {
        const maxX = window.innerWidth - widget.offsetWidth - RIGHT_OFFSET;
        const maxY = window.innerHeight - widget.offsetHeight - BOTTOM_OFFSET;
        setPosition(prev => ({
          x: Math.min(Math.max(0, prev.x), maxX),
          y: Math.min(Math.max(0, prev.y), maxY)
        }));
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDragging, isPositioned, position.x, position.y]);

  // Handle mouse/touch events for dragging
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only handle left mouse button
    
    const widget = widgetRef.current;
    if (!widget) return;

    // Convert from right/bottom to left/top if not yet positioned
    if (position.x === null || position.y === null) {
      const rect = widget.getBoundingClientRect();
      const x = rect.left;
      const y = rect.top;
      setPosition({ x, y });
      setIsPositioned(true);
    }

    const rect = widget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    setWasDragged(false);
    
    e.preventDefault();
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const widget = widgetRef.current;
    if (!widget) return;

    // Convert from right/bottom to left/top if not yet positioned
    if (position.x === null || position.y === null) {
      const rect = widget.getBoundingClientRect();
      const x = rect.left;
      const y = rect.top;
      setPosition({ x, y });
      setIsPositioned(true);
    }

    const rect = widget.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;

    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    setWasDragged(false);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Keep widget within viewport bounds
      const widget = widgetRef.current;
      if (!widget) return;

      const maxX = window.innerWidth - widget.offsetWidth - RIGHT_OFFSET;
      const maxY = window.innerHeight - widget.offsetHeight - BOTTOM_OFFSET;

      // Check if there was actual movement
      const movedX = Math.abs(newX - position.x);
      const movedY = Math.abs(newY - position.y);
      if (movedX > 5 || movedY > 5) {
        setWasDragged(true);
      }

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleTouchMove = (e) => {
      e.preventDefault(); // Prevent scrolling while dragging
      const touch = e.touches[0];
      const newX = touch.clientX - dragOffset.x;
      const newY = touch.clientY - dragOffset.y;

      const widget = widgetRef.current;
      if (!widget) return;

      const maxX = window.innerWidth - widget.offsetWidth - RIGHT_OFFSET;
      const maxY = window.innerHeight - widget.offsetHeight - BOTTOM_OFFSET;

      // Check if there was actual movement
      const movedX = Math.abs(newX - position.x);
      const movedY = Math.abs(newY - position.y);
      if (movedX > 5 || movedY > 5) {
        setWasDragged(true);
      }

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Small delay to reset drag flag after click detection
      setTimeout(() => {
        setWasDragged(false);
      }, 150);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      setTimeout(() => {
        setWasDragged(false);
      }, 150);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

      return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset, position]);

  // WhatsApp link with pre-filled message
  const whatsappUrl = "https://wa.me/919539007766?text=Hi%20Koott%2C%20I%27d%20like%20to%20know%20more%20about%20your%20services.";

  // Use right/bottom if not positioned yet, otherwise use left/top for dragging
  const positionStyle = position.x !== null && position.y !== null
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: 'auto',
        bottom: 'auto'
      }
    : {
        right: `${RIGHT_OFFSET}px`,
        bottom: `${BOTTOM_OFFSET}px`,
        left: 'auto',
        top: 'auto'
      };

  const isTooltipVisible = isHovering && !isDragging;

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          .whatsapp-widget-container {
            touch-action: none;
            -webkit-tap-highlight-color: transparent;
          }
          @media (max-width: 768px) {
            .whatsapp-widget-button {
              width: 56px !important;
              height: 56px !important;
              min-width: 56px !important;
              min-height: 56px !important;
            }
            .whatsapp-widget-icon {
              width: 26px !important;
              height: 26px !important;
            }
          }
          @media (min-width: 769px) {
            .whatsapp-widget-button {
              width: 64px !important;
              height: 64px !important;
              min-width: 64px !important;
              min-height: 64px !important;
            }
            .whatsapp-widget-icon {
              width: 32px !important;
              height: 32px !important;
            }
          }
          .whatsapp-tooltip {
            position: absolute;
            bottom: 110%;
            left: 50%;
            transform: translate(-50%, 0);
            background: #ffffff;
            color: #111827;
            padding: 6px 14px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
            box-shadow: 0 10px 15px -3px rgba(63, 46, 115, 0.25);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease, transform 0.25s ease;
            white-space: nowrap;
          }
          .whatsapp-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 10px solid #ffffff;
            filter: drop-shadow(0 4px 6px rgba(63, 46, 115, 0.18));
          }
          .whatsapp-tooltip.visible {
            opacity: 1;
            transform: translate(-50%, -6px);
          }
          @media (max-width: 640px) {
            .whatsapp-tooltip {
              font-size: 10px;
              padding: 4px 10px;
              max-width: 140px;
              line-height: 1.25;
              white-space: normal;
              text-align: center;
              bottom: 105%;
            }
            .whatsapp-tooltip::after {
              border-left-width: 6px;
              border-right-width: 6px;
              border-top-width: 8px;
            }
          }
          @keyframes whatsappSlowShake {
            0%, 60%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
            10% { transform: translate3d(-3px, -2px, 0) rotate(-2deg); }
            20% { transform: translate3d(3px, -1px, 0) rotate(2deg); }
            30% { transform: translate3d(-2px, 1px, 0) rotate(-1.5deg); }
            40% { transform: translate3d(2px, 2px, 0) rotate(1.5deg); }
            50% { transform: translate3d(0, 0, 0) rotate(0deg); }
          }
          .whatsapp-widget-wiggle {
            animation: whatsappSlowShake 6s ease-in-out infinite;
          }
        `
      }} />
      <div
        ref={widgetRef}
        className="fixed z-50 cursor-move select-none whatsapp-widget-container"
        style={{
          ...positionStyle,
          transition: isDragging ? 'none' : 'left 0.2s ease-out, top 0.2s ease-out, right 0.2s ease-out, bottom 0.2s ease-out',
          pointerEvents: 'auto'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={(e) => {
          setIsHovering(false);
          handleTouchStart(e);
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div className={`whatsapp-tooltip ${isTooltipVisible ? 'visible' : ''}`}>
            Hi... I’m movable
          </div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
            className={`block w-14 h-14 rounded-full hover:shadow-xl transition-shadow duration-200 flex items-center justify-center whatsapp-widget-button ${!isDragging ? 'whatsapp-widget-wiggle' : ''}`}
          style={{
            backgroundColor: '#ffffff', // White background like header
            boxShadow: '0 10px 15px -3px rgba(63, 46, 115, 0.3), 0 4px 6px -2px rgba(63, 46, 115, 0.2), 0 0 20px rgba(63, 46, 115, 0.15)', // Same shadow color as "Get started" button (#025545) with more color
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation'
          }}
          onClick={(e) => {
            // Prevent click if widget was dragged
            if (wasDragged) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="whatsapp-widget-icon"
            style={{
              width: '28px',
              height: '28px'
            }}
          >
            <path
              d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
              fill="#025545"
            />
          </svg>
        </a>
        </div>
      </div>
    </>
  );
}


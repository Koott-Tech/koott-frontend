"use client";

/**
 * @deprecated This component is no longer used. 
 * Payment processing has been migrated from PayU to Razorpay.
 * Razorpay uses its own built-in checkout modal, so this component is obsolete.
 * 
 * This file is kept for reference only and can be safely deleted.
 */

import { useEffect, useMemo, useRef } from "react";

const DEFAULT_ORIGINS = typeof window !== "undefined" ? [window.location.origin] : [];

export default function PayUPaymentModal({
  isOpen,
  onClose,
  redirectUrl,
  payuParams,
  onPaymentResult
}) {
  const formRef = useRef(null);
  const frameName = useMemo(() => `payu-frame-${Date.now()}-${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleMessage = (event) => {
      // Restrict to our own origin (PayU redirects back to our domain before postMessage)
      if (!DEFAULT_ORIGINS.includes(event.origin)) return;
      const data = event.data || {};
      if (data.type !== "PAYU_PAYMENT_RESULT") return;

      if (onPaymentResult) {
        onPaymentResult({
          status: data.status || "unknown",
          payload: data.payload || {}
        });
      } else if (onClose) {
        onClose();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isOpen, onClose, onPaymentResult]);

  useEffect(() => {
    if (!isOpen || !redirectUrl || !payuParams || !formRef.current) return;

    // Submit the PayU form inside iframe as soon as modal opens
    formRef.current.submit();
  }, [isOpen, redirectUrl, payuParams]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-3xl h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <p className="text-sm font-semibold text-gray-900">Secure Payment</p>
            <p className="text-xs text-gray-500">Complete your payment without leaving the page</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 inline-flex items-center justify-center rounded-full p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close payment window"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>

        <div className="flex-1 bg-gray-50">
          <iframe
            name={frameName}
            title="PayU Secure Payment"
            className="w-full h-full bg-white"
            allow="payment *"
          />
        </div>

        <div className="px-4 py-3 border-t bg-white text-xs text-gray-500">
          Having trouble? You can close this window to cancel and try again.
        </div>

        <form
          ref={formRef}
          action={redirectUrl}
          method="POST"
          target={frameName}
          className="hidden"
        >
          {payuParams &&
            Object.entries(payuParams).map(([key, value]) => (
              <input key={key} type="hidden" name={key} defaultValue={value ?? ""} />
            ))}
        </form>
      </div>
    </div>
  );
}


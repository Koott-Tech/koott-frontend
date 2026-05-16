"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function QuickContactModal({ open, onClose, onSaved }) {
  const { login, token, user, isRemembered } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [childName, setChildName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setFirstName("");
      setLastName("");
      setPhone("");
      setChildName("");
      setCountryCode("+91");
      return;
    }

    const profile = user?.profile || user || {};
    // Only set values if they exist and are not "Pending", "Update", or empty
    const invalidValues = ["Pending", "Update", "pending", "update"];
    if (profile.first_name && !invalidValues.includes(profile.first_name) && profile.first_name.trim() !== "") {
      setFirstName(profile.first_name);
    } else {
      setFirstName("");
    }
    if (profile.last_name && !invalidValues.includes(profile.last_name) && profile.last_name.trim() !== "") {
      setLastName(profile.last_name);
    } else {
      setLastName("");
    }
    if (profile.child_name && !invalidValues.includes(profile.child_name) && profile.child_name.trim() !== "") {
      setChildName(profile.child_name);
    } else {
      setChildName("");
    }

    const invalidPhoneValues = ["Pending", "Update", "pending", "update", "+91"];
    if (profile.phone_number && !invalidPhoneValues.includes(profile.phone_number) && profile.phone_number.trim() !== "") {
      const raw = String(profile.phone_number).trim();
      const digitsOnly = raw.replace(/[^\d+]/g, "");

      let extractedCode = "+91";
      let numberOnly = digitsOnly;

      if (digitsOnly.startsWith("+")) {
        const match = digitsOnly.match(/^\+\d{1,4}/);
        if (match) {
          extractedCode = match[0];
          numberOnly = digitsOnly.slice(match[0].length);
        }
      } else if (digitsOnly.length > 10) {
        const match = digitsOnly.match(/^(\d{1,4})/);
        if (match) {
          extractedCode = `+${match[1]}`;
          numberOnly = digitsOnly.slice(match[1].length);
        }
      }

      setCountryCode(extractedCode);
      setPhone(numberOnly.replace(/\D/g, ""));
    } else {
      setPhone("");
      setCountryCode("+91");
    }
  }, [open, user]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError("");
    if (!firstName || !lastName || !phone) {
      setError("Please fill first name, last name and phone number");
      return;
    }
    try {
      setIsSaving(true);
      const { clientApi } = await import("@/lib/backendApi");
      const sanitizedPhone = phone.replace(/\D/g, "");
      const fullPhone = `${countryCode}${sanitizedPhone}`;
      await clientApi.updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone_number: fullPhone,
        child_name: childName || null,
      });
      
      // If onSaved callback is provided (booking flow), refresh auth context without reloading
      // This preserves booking state (selectedDate, selectedTime, selectedPackage)
      if (onSaved) {
      try {
          const { authApi } = await import("@/lib/backendApi");
        const refreshed = await authApi.getProfile({ silent: true });
        const userData = refreshed?.data?.user || refreshed?.data;
        if (userData && token) {
          login(userData, token, { remember: isRemembered });
        }
      } catch (e) {
        // ignore refresh errors; booking flow can continue
      }
        onSaved();
        onClose?.();
      } else {
        // If no callback (standalone usage), reload page to update header
      onClose?.();
        window.location.reload();
      }
    } catch (err) {
      setError(err?.message || "Failed to save details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4" onClick={(e)=>{ if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`w-full max-w-[420px] rounded-xl bg-white shadow-xl transition-all duration-500 ease-out opacity-100 translate-y-0`}>
        <div className="relative p-4">
          <h6 className="text-center text-gray-900 text-base md:text-lg font-semibold">Add your details</h6>
          <button aria-label="Close" onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {error && <div className="mx-4 mt-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm" style={{ color: '#2C1A4A' }}>{error}</div>}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <input
            value={firstName}
            onChange={(e)=>setFirstName(e.target.value)}
            placeholder="First Name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#3f2e73]"
            required
          />
          <input
            value={lastName}
            onChange={(e)=>setLastName(e.target.value)}
            placeholder="Last Name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#3f2e73]"
            required
          />
          <input
            value={childName}
            onChange={(e)=>setChildName(e.target.value)}
            placeholder="Child Name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#3f2e73]"
          />
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e)=>setCountryCode(e.target.value)}
              className="w-28 rounded-md border border-gray-300 px-3 py-2 bg-gray-50 outline-none focus:ring-2 focus:ring-[#3f2e73]"
            >
              <option value="+91">🇮🇳 +91</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+33">🇫🇷 +33</option>
              <option value="+49">🇩🇪 +49</option>
              <option value="+61">🇦🇺 +61</option>
              <option value="+65">🇸🇬 +65</option>
              <option value="+81">🇯🇵 +81</option>
              <option value="+971">🇦🇪 +971</option>
              <option value="+966">🇸🇦 +966</option>
            </select>
            <input
              value={phone}
              onChange={(e)=>setPhone(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Phone Number"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#3f2e73]"
              type="tel"
              inputMode="tel"
              required
            />
          </div>
          <button type="submit" disabled={isSaving} className="w-full rounded-md bg-[#3f2e73] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? 'Saving…' : 'Save & Continue'}</button>
        </form>
      </div>
    </div>
  );
}



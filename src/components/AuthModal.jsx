"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/backendApi";
import { validatePassword } from "@/utils/passwordValidation";
// import { isClientContactComplete } from "@/lib/contactValidation"; // Removed - contact details collected during signup
// import GoogleSignIn from "@/components/GoogleSignIn"; // Commented out - users login with email/password only

export default function AuthModal({
  open,
  onClose,
  defaultTab = "login",
  onAuthSuccess,
  preventReload = false, // Prevent page reload when true (e.g., for booking flow)
  signupButtonText = "Create account", // Custom text for signup button (default: "Create account")
  loginButtonText = "Sign in" // Custom text for login button (default: "Sign in")
  // onRequireContactInfo // Removed - contact details collected during signup
}) {
  const { login, isRemembered } = useAuth();

  const [activeTab, setActiveTab] = useState(defaultTab); // 'login' | 'signup'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [showEmailExistsMessage, setShowEmailExistsMessage] = useState(false);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(isRemembered ?? true);

  // Signup form state
  const [signup, setSignup] = useState({ 
    fullName: "", 
    countryCode: "+91", 
    phoneNumber: "", 
    email: "", 
    password: "",
    clientMessage: "",
    termsAccepted: false,
    therapyAgreementAccepted: false
  });
  const [signupShowPassword, setSignupShowPassword] = useState(false);

  // Forgot password minimal state
  const [showForgot, setShowForgot] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState(1);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  
  // Password validation states
  const [signupPasswordValidation, setSignupPasswordValidation] = useState({ valid: false, unmetRequirements: [] });
  const [resetPasswordValidation, setResetPasswordValidation] = useState({ valid: false, unmetRequirements: [] });

  const closeAndReset = useCallback(() => {
    setError("");
    setSuccessMessage("");
    setIsLoading(false);
    setShowForgot(false);
    setForgotStep(1);
    setShowEmailExistsMessage(false);
    onClose?.();
    setRememberMe(false);
    // Reset signup form
    setSignup({ 
      fullName: "", 
        countryCode: "+91", 
      phoneNumber: "", 
      email: "", 
      password: "",
      clientMessage: "",
      termsAccepted: false,
      therapyAgreementAccepted: false
    });
    // Reset password validations
    setSignupPasswordValidation({ valid: false, unmetRequirements: [] });
    setResetPasswordValidation({ valid: false, unmetRequirements: [] });
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setMounted(false);
      return;
    }
    setMounted(false);
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, [open]);

  // Reset to defaultTab when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  useEffect(() => {
    if (open) {
      setRememberMe(!!isRemembered);
      // Check for stored auth error when modal opens
      if (typeof window !== 'undefined') {
        const storedError = localStorage.getItem('auth_error');
        if (storedError) {
          setError(storedError);
          localStorage.removeItem('auth_error');
        }
      }
    }
  }, [open, isRemembered]);

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    setIsLoading(true);
    setError("");
    try {
      // This login works for ALL roles: client, admin, psychologist, finance, superadmin
      // The backend /api/auth/login endpoint handles all roles and returns { user, token }
      const data = await authApi.login({ email, password });
      const loggedInUser = data?.data?.user;
      const token = data?.data?.token;

      // Pass remember preference - works for all roles
      login(loggedInUser, token, { remember: rememberMe });
      // Call onAuthSuccess first, then check for pending booking
      try { 
        await onAuthSuccess?.(loggedInUser); 
      } catch (err) {
        console.error('Error in onAuthSuccess callback:', err);
      }
      
      // Check if there are pending booking details (from therapist profile page or free assessment page)
      const pendingBooking = localStorage.getItem('pendingBookingDetails');
      const pendingFreeAssessment = localStorage.getItem('freeAssessmentPendingBooking');
      const hasPendingBooking = (pendingBooking || pendingFreeAssessment) && preventReload;
      
      if (hasPendingBooking) {
        console.log('✅ Login successful with pending booking - parent will handle booking flow');
        // Reset form state but don't close modal yet (parent will close it)
        setError("");
        setSuccessMessage("");
        setIsLoading(false);
        setShowForgot(false);
        setForgotStep(1);
        setOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
        setResetPasswordValidation({ valid: false, unmetRequirements: [] });
        setShowNewPassword(false);
        setShowConfirmNewPassword(false);
        setRememberMe(false);
        // Reset signup form
        setSignup({ 
          fullName: "", 
                countryCode: "+91", 
          phoneNumber: "", 
          email: "", 
          password: "",
          clientMessage: "",
          termsAccepted: false,
          therapyAgreementAccepted: false
        });
        setSignupPasswordValidation({ valid: false, unmetRequirements: [] });
        setShowEmailExistsMessage(false);
        // Don't call onClose here - parent (therapist-profile page) will handle closing and booking
      } else {
        // Normal login flow (from header or other pages) - no pending booking
        console.log('✅ Login successful - normal flow, closing modal');
      closeAndReset();
      // Reload the page to refresh auth state
        if (!preventReload) {
          if (loggedInUser?.role === 'admin') {
            window.location.href = '/admin';
          } else if (loggedInUser?.role === 'psychologist') {
            window.location.href = '/psychologist';
          } else if (loggedInUser?.role === 'finance') {
            window.location.href = '/finance';
          } else if (loggedInUser?.role === 'superadmin') {
            window.location.href = '/superadmin';
          } else {
            window.location.reload();
          }
        }
      }
    } catch (err) {
      const msg = err?.message || "Login failed. Please try again.";
      // Check if it's a "user not found" type error - suggest signup
      const errorMsgLower = msg.toLowerCase();
      if (errorMsgLower.includes('user not found') ||
          errorMsgLower.includes('new to MyKoott') ||
          errorMsgLower.includes('no account found') ||
          errorMsgLower.includes('account does not exist') ||
          errorMsgLower.includes('invalid credentials') ||
          errorMsgLower.includes('incorrect email or password') ||
          (errorMsgLower.includes('authentication required') && !errorMsgLower.includes('session expired'))) {
        setError("No account found with this email. Please create a new account.");
        // Pre-fill email in signup form and switch to signup tab
        setSignup(prev => ({ ...prev, email: email }));
        setActiveTab('signup');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e?.preventDefault?.();
    setIsLoading(true);
    setError("");
    
    // Validation
    if (!signup.fullName || signup.fullName.trim().length === 0) {
      setError("Full name is required");
      setIsLoading(false);
      return;
    }
    
    if (!signup.phoneNumber || signup.phoneNumber.trim().length === 0) {
      setError("Mobile number is required");
      setIsLoading(false);
      return;
    }
    
    // Validate password using password policy
    const passwordValidation = validatePassword(signup.password);
    if (!passwordValidation.valid) {
      setError(`Password requirements not met: ${passwordValidation.unmetRequirements.join(', ')}`);
      setIsLoading(false);
      return;
    }
    
    if (!signup.termsAccepted) {
      setError("You must accept the Terms and Conditions");
      setIsLoading(false);
      return;
    }
    
    if (!signup.therapyAgreementAccepted) {
      setError("You must accept the Therapy Agreement");
      setIsLoading(false);
      return;
    }
    
    try {
      // Combine country code with phone number
      const fullPhoneNumber = `${signup.countryCode}${signup.phoneNumber.trim()}`;
      
      // Split full name into first and last name
      const nameParts = signup.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const registrationData = {
        email: signup.email,
        password: signup.password,
        role: "client",
        first_name: firstName,
        last_name: lastName,
        phone_number: fullPhoneNumber,
        child_name: signup.childName?.trim() || null,
        client_message: signup.clientMessage?.trim() || null,
        terms_accepted: signup.termsAccepted,
        therapy_agreement_accepted: signup.therapyAgreementAccepted
      };
      
      const data = await authApi.registerClient(registrationData);
      console.log('✅ Signup successful, calling login()...', {
        hasUser: !!data.data.user,
        hasToken: !!data.data.token,
        userRole: data.data.user?.role
      });
      login(data.data.user, data.data.token, { remember: rememberMe });
      
      // Verify auth was stored
      setTimeout(() => {
        const storedToken = localStorage.getItem('authToken') || localStorage.getItem('token');
        const storedUser = localStorage.getItem('userData') || localStorage.getItem('user');
        console.log('🔍 Auth storage verification:', {
          storedToken: !!storedToken,
          storedUser: !!storedUser,
          allAuthKeys: Object.keys(localStorage).filter(k => k.toLowerCase().includes('auth') || k.toLowerCase().includes('token') || k.toLowerCase().includes('user'))
        });
      }, 100);
      
      // Call onAuthSuccess first, then check for pending booking
      try { 
        await onAuthSuccess?.(data.data.user); 
      } catch (err) {
        console.error('Error in onAuthSuccess callback:', err);
      }
      
      // Check if there are pending booking details (from therapist profile page or free assessment page)
      const pendingBooking = localStorage.getItem('pendingBookingDetails');
      const pendingFreeAssessment = localStorage.getItem('freeAssessmentPendingBooking');
      const hasPendingBooking = (pendingBooking || pendingFreeAssessment) && preventReload;
      
      if (hasPendingBooking) {
        console.log('✅ Signup successful with pending booking - parent will handle booking flow');
        // Reset form state but don't close modal yet (parent will close it)
        setError("");
        setSuccessMessage("");
        setIsLoading(false);
        setShowForgot(false);
        setForgotStep(1);
        setOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
        setResetPasswordValidation({ valid: false, unmetRequirements: [] });
        setShowNewPassword(false);
        setShowConfirmNewPassword(false);
        setRememberMe(false);
        // Reset signup form
        setSignup({ 
          fullName: "", 
                countryCode: "+91", 
          phoneNumber: "", 
          email: "", 
          password: "",
          clientMessage: "",
          termsAccepted: false,
          therapyAgreementAccepted: false
        });
        setSignupPasswordValidation({ valid: false, unmetRequirements: [] });
        setShowEmailExistsMessage(false);
        // Don't call onClose here - parent (therapist-profile page) will handle closing and booking
      } else {
        // Normal signup flow (from header or other pages) - no pending booking
        console.log('✅ Signup successful - normal flow, closing modal');
      closeAndReset();
      // Reload the page to refresh auth state
        if (!preventReload) {
      window.location.reload();
        }
      }
    } catch (err) {
      // Extract error message - could be in different formats
      let msg = err?.message || err?.error || err?.toString() || "Registration failed. Please try again.";
      
      // Debug: Log the error to see what we're getting
      console.log('🔍 Registration error caught:', {
        err,
        message: err?.message,
        error: err?.error,
        msg
      });
      
      // Check if error is about email already existing
      // Check the error message (case-insensitive)
      const errorMsgLower = String(msg).toLowerCase();
      
      // Check for various forms of "email already exists" messages
      const isDuplicateEmail = 
          errorMsgLower.includes('already exists') || 
          errorMsgLower.includes('email already') ||
          errorMsgLower.includes('client with this email') ||
          errorMsgLower.includes('user with this email') ||
          errorMsgLower.includes('account with this email') ||
          errorMsgLower.includes('duplicate') ||
          errorMsgLower.includes('unique constraint') ||
          errorMsgLower.includes('please login instead') ||
          errorMsgLower.includes('login instead');
      
      console.log('🔍 Is duplicate email?', isDuplicateEmail, 'Message:', errorMsgLower);
      
      if (isDuplicateEmail) {
        setShowEmailExistsMessage(true);
        setError(""); // Clear generic error
      } else {
      setError(msg);
        setShowEmailExistsMessage(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Removed maybePromptContactInfo - contact details are now collected during signup

  const handleSendOTP = async (e) => {
    e?.preventDefault?.();
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await authApi.sendPasswordResetOTP(email);
      setForgotStep(2);
      setError(""); // Clear any previous errors
      setSuccessMessage("OTP sent to your email address. Please check your inbox.");
    } catch (err) {
      const msg = err?.message || "Failed to send OTP. Please try again.";
      setError(msg);
      setSuccessMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault?.();
    if (!otp?.trim()) return setError("Please enter the OTP");
    if (!newPassword?.trim()) return setError("Please enter a new password");
    // Validate password using password policy
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      setError(`Password requirements not met: ${passwordValidation.unmetRequirements.join(', ')}`);
      return;
    }
    if (newPassword !== confirmNewPassword) return setError("Passwords do not match");
    setIsLoading(true);
    setError("");
    try {
      await authApi.resetPassword(email, otp, newPassword);
      setError("");
      setSuccessMessage("Password reset successfully! You can now log in.");
      // Reset form and go back to login after a short delay
      setTimeout(() => {
        setShowForgot(false);
        setForgotStep(1);
        setOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
        setSuccessMessage("");
        setActiveTab("login");
      }, 2000);
    } catch (err) {
      const msg = err?.message || "Failed to reset password. Please try again.";
      setError(msg);
      setSuccessMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-2"
      onClick={(e)=>{ if (e.target === e.currentTarget) closeAndReset(); }}
      style={{ display: open ? undefined : "none" }}
    >
      <div className={`w-full max-w-[520px] rounded-xl bg-white shadow-xl py-3 transition-all duration-500 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Header with logo and close */}
        <div className="relative px-3 py-3">
          <div className="w-36 h-10 mx-auto bg-center bg-no-repeat bg-contain" style={{ backgroundImage: "url('/logo.png')" }} />
          <button aria-label="Close" onClick={closeAndReset} className="absolute right-3 top-3 text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {/* Title removed as requested */}

        {error && (
          <div className="mx-4 mt-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm" style={{ color: '#012f23' }}>{error}</div>
        )}
        {showEmailExistsMessage && (
          <div className="mx-4 mt-2 p-3 text-sm" style={{ color: '#012f23' }}>
            <p className="mb-2">An account with this email already exists. Please login instead.</p>
            <button
              type="button"
              onClick={() => {
                setShowEmailExistsMessage(false);
                setActiveTab("login");
                setError("");
                // Pre-fill email in login form
                setEmail(signup.email);
              }}
              className="w-full rounded-md bg-[#025545] px-3 py-2 text-sm font-semibold text-white hover:bg-[#012f23] transition-colors"
            >
              Go to Login
            </button>
          </div>
        )}
        {successMessage && (
          <div className="mx-4 mt-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{successMessage}</div>
        )}

        {/* Body */}
        <div className="p-3">
          {/* Forgot Password */}
          <div className="mx-auto w-full max-w-[360px] px-0">
          {showForgot ? (
            forgotStep === 1 ? (
              <form onSubmit={handleSendOTP} className="space-y-3">
                <div>
                  <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#025545]" placeholder="Email address" />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={()=>{ setShowForgot(false); setForgotStep(1); setError(""); }} className="flex-1 rounded-md border px-3 py-2 text-sm">Back to login</button>
                  <button type="submit" disabled={isLoading} className="flex-1 rounded-md bg-[#025545] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{isLoading ? 'Sending…' : 'Send OTP'}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <input type="text" value={otp} onChange={(e)=>setOtp(e.target.value)} maxLength={6} required className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#025545]" placeholder="OTP code (6 digits)" />
                </div>
                <div>
                  <div className="relative">
                    <input 
                      type={showNewPassword ? 'text' : 'password'} 
                      value={newPassword} 
                      onChange={(e) => {
                        const newPwd = e.target.value;
                        setNewPassword(newPwd);
                        // Validate password on change
                        const validation = validatePassword(newPwd);
                        setResetPasswordValidation(validation);
                      }} 
                      required 
                      className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-[#025545]" 
                      placeholder="New password" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowNewPassword(!showNewPassword)} 
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm hover:text-gray-700"
                    >
                      {showNewPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {newPassword && !resetPasswordValidation.valid && (
                    <div className="mt-2 text-xs text-gray-600">
                      <p className="font-medium mb-1">Password must include:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {resetPasswordValidation.unmetRequirements.map((req, idx) => (
                          <li key={idx} className="text-red-600">{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div>
                  <div className="relative">
                    <input 
                      type={showConfirmNewPassword ? 'text' : 'password'} 
                      value={confirmNewPassword} 
                      onChange={(e)=>setConfirmNewPassword(e.target.value)} 
                      required 
                      className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-[#025545]" 
                      placeholder="Confirm new password" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} 
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm hover:text-gray-700"
                    >
                      {showConfirmNewPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={()=>{ setForgotStep(1); setOtp(""); setNewPassword(""); setConfirmNewPassword(""); setError(""); setResetPasswordValidation({ valid: false, unmetRequirements: [] }); setShowNewPassword(false); setShowConfirmNewPassword(false); }} className="flex-1 rounded-md border px-3 py-2 text-sm">Back</button>
                  <button type="submit" disabled={isLoading || !resetPasswordValidation.valid || newPassword !== confirmNewPassword} className="flex-1 rounded-md bg-[#025545] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{isLoading ? 'Resetting…' : 'Reset Password'}</button>
                </div>
              </form>
            )
          ) : (
            <>
              {activeTab === "login" ? (
                <form onSubmit={handleLogin} className="space-y-3">
                  {/* Google Sign-In commented out - users login with email/password */}
                  {/* <GoogleSignIn onSuccess={()=>closeAndReset()} onError={(err)=>setError(err?.message || 'Google Sign-In failed.')} />
                  <div className="flex items-center gap-3"><div className="h-px flex-1 bg-gray-200" /><div className="text-xs text-gray-500">or</div><div className="h-px flex-1 bg-gray-200" /></div> */}
                  <div>
                    <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#025545]" placeholder="Email" />
                  </div>
                  <div>
                    <div className="relative">
                      <input type={showPassword ? 'text':'password'} value={password} onChange={(e)=>setPassword(e.target.value)} required className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-[#025545]" placeholder="Password" />
                      <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{showPassword ? '🙈' : '👁️'}</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer"
                        checked={rememberMe}
                        onChange={(e)=>setRememberMe(e.target.checked)}
                        style={{ accentColor: '#025545' }}
                      />
                      <span>Remember me</span>
                    </label>
                    <button type="button" onClick={()=>{ setShowForgot(true); setForgotStep(1); setError(""); }} className="text-[#025545] hover:text-black">Forgot password?</button>
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full rounded-md bg-[#025545] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{isLoading ? 'Signing in…' : loginButtonText}</button>
                  <div className="text-center mt-3 text-sm text-gray-600">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={()=>{ 
                        setActiveTab("signup"); 
                        setError(""); 
                        // Pre-fill email if available
                        if (email) {
                          setSignup(prev => ({ ...prev, email: email }));
                        }
                      }}
                      className="text-[#025545] hover:text-black font-medium"
                    >
                      Sign up
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="space-y-3">
                  {/* Already a user? Login - moved to top */}
                  <div className="text-center mb-2 text-sm text-gray-600">
                    Already a user?{" "}
                    <button
                      type="button"
                      onClick={()=>{ setActiveTab("login"); setError(""); }}
                      className="text-[#025545] hover:text-black font-medium"
                    >
                      Login
                    </button>
                  </div>
                  
                  <div>
                    <input 
                      type="text" 
                      value={signup.fullName} 
                      onChange={(e)=>setSignup(s=>({...s, fullName: e.target.value}))} 
                      required 
                      className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#025545]" 
                      placeholder="Full Name *" 
                    />
                  </div>
                  
                  <div className="relative flex gap-2">
                    <select
                      value={signup.countryCode}
                      onChange={(e)=>setSignup(s=>({...s, countryCode: e.target.value}))}
                      className="rounded-md border border-gray-300 px-2 py-2 outline-none focus:ring-2 focus:ring-[#025545] text-sm"
                      style={{ width: '100px', flexShrink: 0 }}
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+966">🇸🇦 +966</option>
                      <option value="+65">🇸🇬 +65</option>
                      <option value="+60">🇲🇾 +60</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+64">🇳🇿 +64</option>
                      <option value="+27">🇿🇦 +27</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+39">🇮🇹 +39</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+31">🇳🇱 +31</option>
                      <option value="+32">🇧🇪 +32</option>
                      <option value="+41">🇨🇭 +41</option>
                      <option value="+46">🇸🇪 +46</option>
                      <option value="+47">🇳🇴 +47</option>
                      <option value="+45">🇩🇰 +45</option>
                      <option value="+358">🇫🇮 +358</option>
                      <option value="+351">🇵🇹 +351</option>
                      <option value="+353">🇮🇪 +353</option>
                      <option value="+48">🇵🇱 +48</option>
                      <option value="+420">🇨🇿 +420</option>
                      <option value="+36">🇭🇺 +36</option>
                      <option value="+40">🇷🇴 +40</option>
                      <option value="+7">🇷🇺 +7</option>
                      <option value="+81">🇯🇵 +81</option>
                      <option value="+82">🇰🇷 +82</option>
                      <option value="+86">🇨🇳 +86</option>
                      <option value="+852">🇭🇰 +852</option>
                      <option value="+886">🇹🇼 +886</option>
                      <option value="+66">🇹🇭 +66</option>
                      <option value="+62">🇮🇩 +62</option>
                      <option value="+63">🇵🇭 +63</option>
                      <option value="+84">🇻🇳 +84</option>
                      <option value="+880">🇧🇩 +880</option>
                      <option value="+94">🇱🇰 +94</option>
                      <option value="+92">🇵🇰 +92</option>
                      <option value="+977">🇳🇵 +977</option>
                      <option value="+95">🇲🇲 +95</option>
                      <option value="+855">🇰🇭 +855</option>
                      <option value="+856">🇱🇦 +856</option>
                      <option value="+673">🇧🇳 +673</option>
                      <option value="+670">🇹🇱 +670</option>
                    </select>
                    <div className="relative flex-1">
                      <input 
                        type="tel" 
                        value={signup.phoneNumber} 
                        onChange={(e)=>setSignup(s=>({...s, phoneNumber: e.target.value.replace(/\D/g, '')}))} 
                        required
                        className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 outline-none focus:ring-2 focus:ring-[#025545]" 
                        placeholder="Mobile Number *" 
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
                            fill="#025545"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <input 
                      type="email" 
                      value={signup.email} 
                      onChange={(e)=>setSignup(s=>({...s, email: e.target.value}))} 
                      required 
                      className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#025545]" 
                      placeholder="Email *" 
                    />
                  </div>
                  
                  <div>
                    <textarea 
                      value={signup.clientMessage} 
                      onChange={(e)=>setSignup(s=>({...s, clientMessage: e.target.value}))} 
                      rows={3}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#025545]" 
                      placeholder="Any message for us? (Optional)" 
                    />
                  </div>
                  
                  <div>
                    <div className="relative">
                      <input 
                        type={signupShowPassword ? 'text':'password'} 
                        value={signup.password} 
                        onChange={(e) => {
                          const newPassword = e.target.value;
                          setSignup(s => ({ ...s, password: newPassword }));
                          // Validate password on change
                          const validation = validatePassword(newPassword);
                          setSignupPasswordValidation(validation);
                        }} 
                        required 
                        className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-[#025545]" 
                        placeholder="Password *" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setSignupShowPassword(!signupShowPassword)} 
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm hover:text-gray-700"
                      >
                        {signupShowPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {signup.password && !signupPasswordValidation.valid && (
                      <div className="mt-2 text-xs text-gray-600">
                        <p className="font-medium mb-1">Password must include:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {signupPasswordValidation.unmetRequirements.map((req, idx) => (
                            <li key={idx} className="text-red-600">{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 mt-0.5 cursor-pointer"
                        checked={signup.termsAccepted}
                        onChange={(e)=>setSignup(s=>({...s, termsAccepted: e.target.checked}))}
                        required
                        style={{ accentColor: '#025545', cursor: 'pointer' }}
                      />
                      <span>I accept the <a href="/terms-and-conditions" target="_blank" className="text-[#025545] hover:underline">Terms and Conditions</a> *</span>
                    </label>
                    <label className="flex items-start gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 mt-0.5 cursor-pointer"
                        checked={signup.therapyAgreementAccepted}
                        onChange={(e)=>setSignup(s=>({...s, therapyAgreementAccepted: e.target.checked}))}
                        required
                        style={{ accentColor: '#025545', cursor: 'pointer' }}
                      />
                      <span>I accept the <a href="/therapy-agreement" target="_blank" className="text-[#025545] hover:underline">Therapy Agreement</a> *</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer"
                        checked={rememberMe}
                        onChange={(e)=>setRememberMe(e.target.checked)}
                        style={{ accentColor: '#025545' }}
                      />
                      <span>Remember me</span>
                    </label>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={
                      isLoading || 
                      !signup.fullName?.trim() || 
                      !signup.phoneNumber?.trim() || 
                      !signup.email?.trim() || 
                      !signup.password || 
                      !signupPasswordValidation.valid ||
                      !signup.termsAccepted || 
                      !signup.therapyAgreementAccepted
                    } 
                    className="w-full rounded-md bg-[#025545] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed mb-3"
                  >
                    {isLoading ? 'Creating…' : signupButtonText}
                  </button>
                </form>
              )}
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}



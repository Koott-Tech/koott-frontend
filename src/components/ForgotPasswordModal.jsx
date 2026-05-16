"use client";
import { useState } from "react";
import { X, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { authApi } from "../lib/backendApi";
import { useNotification } from "../contexts/NotificationContext";
import { validatePassword } from "../utils/passwordValidation";

export default function ForgotPasswordModal({ isOpen, onClose, onBackToLogin }) {
  const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: success
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({ valid: false, unmetRequirements: [] });
  const { showError, showSuccess } = useNotification();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await authApi.sendPasswordResetOTP(email);
      setStep(2);
      showSuccess("OTP sent to your email address", "Check Your Email");
    } catch (error) {
      console.error("Send OTP error:", error);
      const errorMessage = error.message || "Failed to send OTP. Please try again.";
      setError(errorMessage);
      showError(errorMessage, "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!otp.trim()) {
      setError("Please enter the OTP");
      return;
    }
    
    if (!newPassword.trim()) {
      setError("Please enter a new password");
      return;
    }
    
    // Validate password using password policy
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setError(`Password requirements not met: ${validation.unmetRequirements.join(', ')}`);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await authApi.resetPassword(email, otp, newPassword);
      setStep(3);
      showSuccess("Password reset successfully! You can now log in with your new password.", "Success");
    } catch (error) {
      console.error("Reset password error:", error);
      const errorMessage = error.message || "Failed to reset password. Please try again.";
      setError(errorMessage);
      showError(errorMessage, "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setPasswordValidation({ valid: false, unmetRequirements: [] });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setPasswordValidation({ valid: false, unmetRequirements: [] });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h6>
                {step === 1 && "Forgot Password"}
                {step === 2 && "Reset Password"}
                {step === 3 && "Success"}
              </h6>
              <p className="text-sm text-gray-600">
                {step === 1 && "Enter your email to receive reset instructions"}
                {step === 2 && "Enter OTP and new password"}
                {step === 3 && "Password reset completed"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <ArrowLeft className="h-4 w-4 inline mr-2" />
                  Back to Login
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: isLoading ? "#9ca3af" : "#3f2e73"
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.backgroundColor = "#1d1733";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.backgroundColor = "#3f2e73";
                    }
                  }}
                >
                  {isLoading ? "Sending..." : "Send OTP"}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OTP Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Check your email for the 6-digit code
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      const newPwd = e.target.value;
                      setNewPassword(newPwd);
                      // Validate password on change
                      const validation = validatePassword(newPwd);
                      setPasswordValidation(validation);
                    }}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm hover:text-gray-700"
                  >
                    {showNewPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {newPassword && !passwordValidation.valid && (
                  <div className="mt-2 text-xs text-gray-600">
                    <p className="font-medium mb-1">Password must include:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {passwordValidation.unmetRequirements.map((req, idx) => (
                        <li key={idx} className="text-red-600">{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm hover:text-gray-700"
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleBackToStep1}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <ArrowLeft className="h-4 w-4 inline mr-2" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !passwordValidation.valid || newPassword !== confirmPassword}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-green-800 mb-2">
                  Password Reset Successful!
                </h3>
                <p className="text-sm text-green-700">
                  Your password has been reset successfully. You can now log in with your new password.
                </p>
              </div>

              <button
                onClick={onBackToLogin}
                className="w-full px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  backgroundColor: "#3f2e73"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#1d1733";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#3f2e73";
                }}
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

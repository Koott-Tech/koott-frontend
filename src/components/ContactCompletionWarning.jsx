"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, User, Phone, Baby, X } from "lucide-react";

export default function ContactCompletionWarning({ 
  isOpen, 
  onClose, 
  incompleteFields = [],
  onCompleteProfile 
}) {
  const router = useRouter();

  const handleCompleteProfile = () => {
    onClose();
    router.push('/profile/profile');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Complete Your Profile
              </h2>
              <p className="text-sm text-gray-600">
                Required before booking sessions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-700 mb-4">
              To book therapy sessions, please complete your contact information first. This helps us provide better care for your child.
            </p>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-orange-800 mb-2">Missing Information:</h3>
              <ul className="space-y-1">
                {incompleteFields.map((field, index) => (
                  <li key={index} className="flex items-center text-sm text-orange-700">
                    {field.key === 'first_name' && <User className="h-4 w-4 mr-2" />}
                    {field.key === 'last_name' && <User className="h-4 w-4 mr-2" />}
                    {field.key === 'phone_number' && <Phone className="h-4 w-4 mr-2" />}
                    {(field.key === 'child_name' || field.key === 'child_age') && <Baby className="h-4 w-4 mr-2" />}
                    {field.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-blue-800 mb-1">Why is this required?</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Ensures we can contact you for session updates</li>
              <li>• Helps psychologists prepare personalized care</li>
              <li>• Required for insurance and billing purposes</li>
              <li>• Improves the quality of therapy sessions</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleCompleteProfile}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Complete Profile
          </button>
        </div>
      </div>
    </div>
  );
}

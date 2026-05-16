'use client';

import React, { createContext, useContext, useState } from 'react';
import NotificationPopup from '../components/NotificationPopup';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    duration: 5000,
    showCloseButton: true,
    actions: null
  });

  const showNotification = ({
    type = 'info',
    title = '',
    message = '',
    duration = 5000,
    showCloseButton = true,
    actions = null
  }) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message,
      duration,
      showCloseButton,
      actions
    });
  };

  const showSuccess = (message, title = 'Success', options = {}) => {
    showNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  };

  const showError = (message, title = 'Error', options = {}) => {
    showNotification({
      type: 'error',
      title,
      message,
      duration: 7000, // Longer duration for errors
      ...options
    });
  };

  const showWarning = (message, title = 'Warning', options = {}) => {
    showNotification({
      type: 'warning',
      title,
      message,
      ...options
    });
  };

  const showInfo = (message, title = 'Info', options = {}) => {
    showNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  };

  const closeNotification = () => {
    setNotification(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  const showConfirmDialog = ({
    title = 'Confirm',
    message = '',
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning'
  }) => {
    const actions = (
      <>
        <button
          onClick={() => {
            closeNotification();
            if (onCancel) onCancel();
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {cancelText}
        </button>
        <button
          onClick={() => {
            closeNotification();
            if (onConfirm) onConfirm();
          }}
          className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            type === 'error' 
              ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              : type === 'warning'
              ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          {confirmText}
        </button>
      </>
    );

    showNotification({
      type,
      title,
      message,
      duration: 0, // No auto-close for confirm dialogs
      showCloseButton: false,
      actions
    });
  };

  const value = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirmDialog,
    closeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationPopup
        isOpen={notification.isOpen}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        duration={notification.duration}
        showCloseButton={notification.showCloseButton}
        actions={notification.actions}
      />
    </NotificationContext.Provider>
  );
};

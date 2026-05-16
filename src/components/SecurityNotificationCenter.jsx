"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, CheckCircle, Clock, Bot, Shield } from 'lucide-react';
import { getStoredToken } from '@/lib/authStorage';

const SecurityNotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch recent security alerts
  const fetchNotifications = async () => {
    try {
      const token = getStoredToken();
      
      // Check if token exists and is valid
      if (!token || token === 'null' || token.length < 10) {
        console.error('❌ Invalid or missing token for notifications');
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/security/alerts?limit=10&acknowledged=false`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.data.alerts);
        setUnreadCount(data.data.alerts.length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Acknowledge notification
  const acknowledgeNotification = async (alertId) => {
    try {
      const token = getStoredToken();
      
      // Check if token exists and is valid
      if (!token || token === 'null' || token.length < 10) {
        console.error('❌ Invalid or missing token for acknowledge request');
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/security/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(alert => alert.id !== alertId));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error acknowledging notification:', error);
    }
  };

  // Get severity icon and color
  const getSeverityInfo = (severity) => {
    const info = {
      low: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
      medium: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
      high: { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-100' },
      critical: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' }
    };
    return info[severity] || info.medium;
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return alertTime.toLocaleDateString();
  };

  useEffect(() => {
    fetchNotifications();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Shield className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Security Alerts
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No active security alerts</p>
                <p className="text-sm">All systems secure</p>
              </div>
            ) : (
              notifications.map((alert) => {
                const severityInfo = getSeverityInfo(alert.severity);
                const Icon = severityInfo.icon;
                
                return (
                  <div
                    key={alert.id}
                    className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${severityInfo.bgColor}`}>
                        <Icon className={`w-4 h-4 ${severityInfo.color}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {alert.type.replace(/_/g, ' ').toUpperCase()}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {formatTime(alert.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">
                          {alert.data.ip && `IP: ${alert.data.ip}`}
                          {alert.data.confidence && ` • ${alert.data.confidence}% confidence`}
                        </p>
                        
                        {alert.data.reasons && alert.data.reasons.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {alert.data.reasons.slice(0, 2).join(', ')}
                            {alert.data.reasons.length > 2 && '...'}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${severityInfo.bgColor} ${severityInfo.color}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          
                          <button
                            onClick={() => acknowledgeNotification(alert.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Acknowledge
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-gray-200">
            <a
              href="/admin"
              className="block w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All Security Alerts →
            </a>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default SecurityNotificationCenter;

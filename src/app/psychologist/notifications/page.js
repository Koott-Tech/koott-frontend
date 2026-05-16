'use client';

import React, { useState, useEffect } from 'react';
import { psychologistApi } from '../../../lib/backendApi';
import { useAuth } from '../../../contexts/AuthContext';

const NotificationsPage = () => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'

  useEffect(() => {
    if (user && token) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user, token, filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter === 'unread') {
        params.unread_only = true;
      }
      
      const response = await psychologistApi.getNotifications(params);
      if (response.success) {
        setNotifications(response.data.notifications);
      } else {
        setError('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await psychologistApi.getUnreadNotificationCount();
      if (response.success) {
        setUnreadCount(response.data.unread_count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await psychologistApi.markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      // Update unread count
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await psychologistApi.markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await psychologistApi.deleteNotification(notificationId);
      
      // Remove from local state
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      // Update unread count
      fetchUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateTimeString) => {
    const now = new Date();
    const notificationTime = new Date(dateTimeString);
    const diffMs = now - notificationTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      return `${diffDays} days ago`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white p-4 rounded-lg shadow">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h6 className="font-bold text-gray-900">
            Notifications
          </h6>
        </div>

        {/* Stats and Actions */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#3f2e73]">{notifications.length}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
                <div className="text-sm text-gray-600">Unread</div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-[#3f2e73] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter === 'all' ? 'Show Unread Only' : 'Show All'}
              </button>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Mark All Read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-gray-500 text-lg">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </div>
              <p className="text-gray-400 mt-2">
                {filter === 'unread' 
                  ? 'You\'re all caught up!' 
                  : 'Notifications about session reschedules will appear here'
                }
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow p-4 sm:p-6 transition-all hover:shadow-md ${
                  !notification.is_read ? 'border-l-4 border-[#3f2e73]' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-gray-900">
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#3f2e73]/10 text-[#3f2e73]">
                          New
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-700 mb-3">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>📅 {formatDateTime(notification.created_at)}</span>
                      <span>⏰ {getTimeAgo(notification.created_at)}</span>
                      {notification.client_name && (
                        <span>👤 {notification.client_name}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 text-[#3f2e73] hover:bg-[#3f2e73]/10 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete notification"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More Button (for future pagination) */}
        {notifications.length > 0 && (
          <div className="mt-6 text-center">
            <button className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors">
              Load More Notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;












"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { messagesApi } from "../../../lib/backendApi";
import { useNotification } from "../../../contexts/NotificationContext";
import { 
  Send,
  MessageSquare, 
  User, 
  Calendar,
  Clock,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function PsychologistMessagesPage() {
  const { user } = useAuth();
  const { showError } = useNotification();
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [showChatScreen, setShowChatScreen] = useState(false);
  const messagesEndRef = useRef(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Only load once when component first mounts
    if (!hasLoadedRef.current) {
      loadConversations();
      hasLoadedRef.current = true;
    }
  }, []);

  // Focus on input when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      // Focus on the input field after a short delay
      setTimeout(() => {
        const input = document.querySelector('input[type="text"]');
        if (input) {
          input.focus();
        }
      }, 100);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await messagesApi.getConversations();
      console.log('Psychologist conversations response:', response);
      
      // Handle both response formats
      let conversationsData = [];
      if (response.success && response.message && response.message.conversations) {
        conversationsData = response.message.conversations;
      } else if (response.data && response.data.conversations) {
        conversationsData = response.data.conversations;
      } else if (Array.isArray(response)) {
        conversationsData = response;
      }
      
      console.log('Parsed conversations:', conversationsData);
      // Deduplicate conversations by ID to avoid double listing
      const seenIds = new Set();
      const uniqueConversations = (conversationsData || []).filter((c) => {
        const id = c?.id;
        if (!id) return true; // keep if id is missing to avoid dropping data
        if (seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });
      setConversations(uniqueConversations);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError(err.message);
      showError(`Failed to load conversations: ${err.message}`, 'Load Error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    // Prevent loading messages for the same conversation
    if (messages.length > 0 && messages[0]?.conversation_id === conversationId) {
      console.log('Messages already loaded for conversation:', conversationId);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await messagesApi.getMessages(conversationId);
      console.log('Messages API response:', response);
      
      const messagesData = response.data?.messages || response.message?.messages || [];
      console.log('Parsed messages:', messagesData);
      
      // Ensure we have valid messages
      const validMessages = messagesData.filter(message => message && message.id);
      console.log('Valid messages:', validMessages);
      
      setMessages(validMessages);
      
      // Mark messages as read (non-blocking)
      messagesApi.markAsRead(conversationId).catch(err => 
        console.error('Failed to mark messages as read:', err)
      );
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err.message);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setIsSending(true);
      const response = await messagesApi.sendMessage(selectedConversation.id, {
        content: newMessage.trim(),
        messageType: 'text'
      });

      console.log('Send message response:', response);

      // Add new message to the list - handle both response formats
      let newMessageData = null;
      if (response.success && response.message && response.message.message) {
        newMessageData = response.message.message;
      } else if (response.data && response.data.message) {
        newMessageData = response.data.message;
      } else if (response.message) {
        newMessageData = response.message;
      }

      if (newMessageData) {
        console.log('Adding new message to UI:', newMessageData);
        setMessages(prev => [...prev, newMessageData]);
        setNewMessage("");
      } else {
        console.error('Could not extract message data from response:', response);
        setError('Message sent but could not update UI. Please refresh.');
      }

      // Update conversation in list
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, last_message_at: new Date().toISOString() }
            : conv
        )
      );
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
  };

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
    // Show chat screen when conversation is selected
    setShowChatScreen(true);
  };

  const handleBackToConversations = () => {
    // Go back to conversation list
    setShowChatScreen(false);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeSlot = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return '';
    const parts = timeStr.trim().split(':');
    const hour = parseInt(parts[0], 10);
    const minute = parts[1] ? parseInt(parts[1], 10) : 0;
    if (Number.isNaN(hour)) return '';
    const d = new Date(2000, 0, 1, hour, minute);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getConversationName = (conversation) => {
    return `${conversation.client?.first_name} ${conversation.client?.last_name}`;
  };

  const getConversationSubtitle = (conversation) => {
    const session = conversation.session;
    if (!session?.scheduled_date) return '—';
    const dateStr = formatDate(session.scheduled_date);
    const timeStr = session.scheduled_time ? formatTimeSlot(session.scheduled_time) : '';
    return timeStr ? `${dateStr}, ${timeStr}` : dateStr;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#3f2e73] mx-auto"></div>
          <p className="mt-4 text-sm text-slate-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-7 w-7 text-red-400" />
          </div>
          <p className="text-slate-700 font-medium">Something went wrong</p>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const getInitials = (conversation) => {
    const first = conversation.client?.first_name?.charAt(0) || '';
    const last = conversation.client?.last_name?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return formatDate(timestamp);
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <p role="heading" aria-level={1} className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">Messages</p>
          {showChatScreen && (
            <button
              onClick={handleBackToConversations}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>

        {/* Conversations List - minimal card */}
        <div className={`${showChatScreen ? 'hidden' : 'block'}`}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#3f2e73]"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-slate-700 font-medium">No conversations yet</p>
              <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">When clients message you, they’ll appear here.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
              </div>
              <ul className="divide-y divide-slate-100">
                {conversations.map((conversation) => {
                  const isSelected = selectedConversation?.id === conversation.id;
                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => handleConversationSelect(conversation)}
                        className={`w-full flex items-center gap-4 px-4 py-4 text-left transition-colors duration-150 ${
                          isSelected
                            ? 'bg-[#3f2e73]/5'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium ${
                          isSelected ? 'bg-[#3f2e73] text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {getInitials(conversation)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {getConversationName(conversation)}
                          </p>
                          <p className="text-sm text-slate-500 truncate mt-0.5">
                            {getConversationSubtitle(conversation)}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0 tabular-nums">
                          {getRelativeTime(conversation.last_message_at)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Chat Screen - Full Height WhatsApp Style */}
        {showChatScreen && selectedConversation && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col" style={{ height: '100vh' }}>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-3 flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <button
                onClick={handleBackToConversations}
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="w-10 h-10 bg-[#3f2e73]/10 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-[#3f2e73]" />
              </div>
              <div className="flex-1">
                <h6 className="font-medium text-gray-900">
                  {getConversationName(selectedConversation)}
                </h6>
                <p className="text-sm text-gray-500">
                  Session: {formatDate(selectedConversation.session?.scheduled_date)}
                </p>
              </div>
              <div className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Active</span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3f2e73] mx-auto"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-lg font-medium mb-2">Start a conversation</p>
                  <p className="text-sm">Type a message below to begin chatting with {getConversationName(selectedConversation)}</p>
                </div>
              ) : (
                messages
                  .filter(message => message && message.id)
                  .map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        (message?.sender_type || '') === user?.role ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          (message?.sender_type || '') === user?.role
                            ? 'bg-[#3f2e73] text-white'
                            : 'bg-white text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message?.content || 'Message content unavailable'}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {formatTime(message?.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input - Fixed at Bottom */}
            <div className="bg-white border-t border-gray-200 p-3 sm:p-4 flex-shrink-0">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder={`Type a message to ${getConversationName(selectedConversation)}...`}
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3f2e73]"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="bg-[#3f2e73] text-white p-2 rounded-full hover:bg-[#1d1733] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

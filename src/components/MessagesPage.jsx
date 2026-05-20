"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { messagesApi } from "../lib/backendApi";
import { normalizeImageUrl } from "@/utils/urlNormalizer";
import { 
  Send, 
  MessageSquare, 
  User, 
  Calendar,
  Clock,
  ArrowLeft
} from "lucide-react";

// Hook to handle viewport height changes (for mobile keyboard)
const useViewportHeight = () => {
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(window.innerHeight);
    };
    
    window.addEventListener('resize', updateHeight);
    // Handle mobile keyboard
    window.addEventListener('visualViewport', updateHeight);
    
    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('visualViewport', updateHeight);
    };
  }, []);
  
  return viewportHeight;
};

export default function MessagesPage({ session = null }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showChatScreen, setShowChatScreen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const viewportHeight = useViewportHeight();

  useEffect(() => {
    // Only load once when component first mounts
    if (!hasLoadedRef.current) {
      loadConversations();
      hasLoadedRef.current = true;
    }
  }, []);

  // Check for conversation ID from sessionStorage after conversations are loaded
  // This is for when navigating from sessions page - auto-open the chat
  useEffect(() => {
    const storedConversationId = sessionStorage.getItem('selectedConversationId');
    if (storedConversationId && conversations.length > 0) {
      const targetConversation = conversations.find(conv => conv.id === storedConversationId);
      if (targetConversation && targetConversation.id !== selectedConversation?.id) {
        setSelectedConversation(targetConversation);
        setShowChatScreen(true); // Auto-open chat when coming from sessions page
        sessionStorage.removeItem('selectedConversationId');
      }
    }
  }, [conversations, selectedConversation]);

  // Don't auto-select conversations - let user click to select
  useEffect(() => {
    // Removed auto-selection logic
  }, [conversations, selectedConversation]);

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

  // Auto-select conversation if session is provided
  useEffect(() => {
    if (session && session.conversationId && conversations.length > 0) {
      const targetConversation = conversations.find(conv => conv.id === session.conversationId);
      if (targetConversation && targetConversation.id !== selectedConversation?.id) {
        setSelectedConversation(targetConversation);
        // Show chat screen for session-specific conversations
        setShowChatScreen(true);
      }
    }
  }, [session?.conversationId, conversations, selectedConversation?.id]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Only scroll within the messages container, not the entire page
      const messagesContainer = messagesEndRef.current.parentElement;
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  };

  const loadConversations = async (forceReload = false) => {
    // Prevent reloading if conversations are already loaded (unless forced)
    if (conversations.length > 0 && !forceReload && !sessionStorage.getItem('selectedConversationId')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await messagesApi.getConversations();
      
      // Check different possible response structures
      // Backend returns: { success: true, message: '...', data: { conversations: [...] } }
      let conversationsData = [];
      if (response.data && response.data.conversations && Array.isArray(response.data.conversations)) {
        conversationsData = response.data.conversations;
      } else if (response.success && response.data && Array.isArray(response.data)) {
        conversationsData = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        conversationsData = response.data.data;
      } else if (response.data && response.data.data && response.data.data.conversations) {
        conversationsData = response.data.data.conversations;
      } else if (response.success && response.message && response.message.conversations) {
        conversationsData = response.message.conversations;
      } else if (response.data && Array.isArray(response.data)) {
        conversationsData = response.data;
      } else if (response.data && response.data.conversations) {
        conversationsData = response.data.conversations;
      } else if (response.conversations) {
        conversationsData = response.conversations;
      } else if (Array.isArray(response)) {
        conversationsData = response;
      }
      
      setConversations(conversationsData);
      
      // Check if we have a stored conversation ID to auto-select
      const storedConversationId = sessionStorage.getItem('selectedConversationId');
      if (storedConversationId) {
        const targetConversation = conversationsData.find(conv => conv.id === storedConversationId);
        if (targetConversation) {
          setSelectedConversation(targetConversation);
          // Auto-open chat screen when navigating from sessions page
          setShowChatScreen(true);
          sessionStorage.removeItem('selectedConversationId');
        }
      }
      
      // If no conversations loaded but we have a session, create a mock conversation
      if (conversationsData.length === 0 && session) {
        // If session has a conversationId, try to load that conversation first
        if (session.conversationId && !session.conversationId.startsWith('mock-')) {
          try {
            const conversationResponse = await messagesApi.getMessages(session.conversationId);
            if (conversationResponse && conversationResponse.data) {
              // Create a real conversation object
              const realConversation = {
                id: session.conversationId,
                psychologist: {
                  first_name: session.psychologist?.first_name || 'Dr.',
                  last_name: session.psychologist?.last_name || 'Therapist'
                },
                session: {
                  scheduled_date: session.scheduled_date,
                  scheduled_time: session.scheduled_time,
                  status: session.status
                },
                last_message_at: new Date().toISOString(),
                messages: conversationResponse.data.messages || []
              };
              setConversations([realConversation]);
              setSelectedConversation(realConversation);
              return;
            }
          } catch (err) {
            // Failed to load conversation, will fallback to mock
          }
        }
        
        // Fallback to mock conversation
        const mockConversation = {
          id: session.conversationId || 'mock-conversation-id',
          psychologist: {
            first_name: session.psychologist?.first_name || 'Dr.',
            last_name: session.psychologist?.last_name || 'Therapist'
          },
          session: {
            scheduled_date: session.scheduled_date,
            scheduled_time: session.scheduled_time,
            status: session.status
          },
          last_message_at: new Date().toISOString(),
          messages: []
        };
        setConversations([mockConversation]);
        setSelectedConversation(mockConversation);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError(err.message);
      
      // Fallback: create mock conversation if API fails
      if (session) {
        const fallbackConversation = {
          id: session.conversationId || 'fallback-conversation-id',
          psychologist: {
            first_name: session.psychologist?.first_name || 'Dr.',
            last_name: session.psychologist?.last_name || 'Therapist'
          },
          session: {
            scheduled_date: session.scheduled_date,
            scheduled_time: session.scheduled_time,
            status: session.status
          },
          last_message_at: new Date().toISOString(),
          messages: []
        };
        setConversations([fallbackConversation]);
        setSelectedConversation(fallbackConversation);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    // Prevent loading messages for the same conversation
    if (messages.length > 0 && messages[0]?.conversation_id === conversationId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Don't try to load messages for mock/fallback conversations
      if (conversationId.startsWith('mock-') || conversationId.startsWith('fallback-')) {
        setMessages([]);
        return;
      }
      
      const response = await messagesApi.getMessages(conversationId);
      
      const messagesData = response.data?.messages || response.message?.messages || [];
      
      // Ensure we have valid messages
      const validMessages = messagesData.filter(message => message && message.id);
      
      setMessages(validMessages);
      
      // Mark messages as read (non-blocking, don't let errors cause logout)
      messagesApi.markAsRead(conversationId).catch(err => {
        console.error('Failed to mark messages as read (non-critical):', err);
        // Don't throw or set error - this is a non-critical operation
      });
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
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    // Don't send messages to mock conversations
    if (selectedConversation.id.startsWith('mock-') || selectedConversation.id.startsWith('fallback-')) {
      setError('Please wait for the conversation to be properly created. Try refreshing the page.');
      return;
    }

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Set sending state to prevent duplicate sends
    setIsSending(true);
    
    // Create optimistic message for immediate UI update
    const optimisticMessage = {
      id: tempId,
      content: messageContent,
      sender_type: user?.role,
      sender_id: user?.id,
      created_at: new Date().toISOString(),
      isOptimistic: true
    };

    // Clear input immediately for better UX
    setNewMessage("");
    
    // Add optimistic message to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Update conversation in list immediately
    setConversations(prev => 
      prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { ...conv, last_message_at: new Date().toISOString() }
          : conv
      )
    );

    try {
      const response = await messagesApi.sendMessage(selectedConversation.id, {
        content: messageContent,
        messageType: 'text'
      });

      // Extract real message data from response
      let newMessageData = null;
      if (response.success && response.message && response.message.message) {
        newMessageData = response.message.message;
      } else if (response.data && response.data.message) {
        newMessageData = response.data.message;
      } else if (response.message) {
        newMessageData = response.message;
      }

      if (newMessageData) {
        // Replace optimistic message with real message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId 
              ? { ...newMessageData, isOptimistic: false }
              : msg
          )
        );
      } else {
        // If we can't get real message, keep optimistic one but mark as sent
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId 
              ? { ...msg, isOptimistic: false, status: 'sent' }
              : msg
          )
        );
        console.error('Could not extract message data from response:', response);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      // Restore message to input
      setNewMessage(messageContent);
      
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

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getConversationName = (conversation) => {
    if (user?.role === 'client') {
      return `${conversation.psychologist?.first_name} ${conversation.psychologist?.last_name}`;
    } else {
      return `${conversation.client?.first_name} ${conversation.client?.last_name}`;
    }
  };

  const getConversationSubtitle = (conversation) => {
    if (user?.role === 'client') {
      return `Session: ${formatDate(conversation.session?.scheduled_date)}`;
    } else {
      const age = conversation.client?.child_age;
      return `Child: ${conversation.client?.child_name || '—'} (${(age != null && age !== '' && String(age).toLowerCase() !== 'pending') ? `${age} years` : 'null'})`;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <MessageSquare className="h-6 w-6" style={{ color: '#025545' }} />
          <h5 className="text-gray-900">Messages</h5>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Conversations List */}
        <div className={`${showChatScreen ? 'hidden' : 'block'} w-full bg-gray-50 rounded-lg overflow-y-auto`} style={{ maxHeight: 'calc(100vh - 250px)' }}>
          <div className="p-4">
            <h6 className="text-gray-900 mb-3">Conversations</h6>
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto" style={{ borderBottomColor: '#025545' }}></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h6 className="text-gray-900 mb-2">No conversations yet</h6>
                <p className="text-gray-600 mb-4">Start a conversation with your booked psychologist</p>
                <button
                  onClick={() => window.location.href = '/profile/sessions'}
                  className="px-4 py-2 text-white rounded-lg transition-colors"
                  style={{ backgroundColor: '#025545' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#012f23'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#025545'}
                >
                  View Sessions
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => handleConversationSelect(conversation)}
                    className={`p-5 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?.id === conversation.id
                        ? 'border'
                        : 'bg-white hover:bg-gray-100'
                    }`}
                    style={selectedConversation?.id === conversation.id ? { backgroundColor: '#f2fff1', borderColor: '#025545' } : {}}
                  >
                    <div className="flex items-center justify-between space-x-6">
                      <div className="flex items-center space-x-6 flex-1 min-w-0">
                        <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f2fff1' }}>
                          {conversation.psychologist?.cover_image_url ? (
                            <img 
                              src={normalizeImageUrl(conversation.psychologist.cover_image_url)}
                              alt={getConversationName(conversation)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-6 w-6" style={{ color: '#025545' }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="text-gray-900 truncate">
                            {getConversationName(conversation)}
                          </h6>
                          <p className="text-gray-500 truncate">
                            {getConversationSubtitle(conversation)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConversationSelect(conversation);
                        }}
                        className="text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 flex-shrink-0"
                        style={{ backgroundColor: '#025545' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#012f23'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#025545'}
                      >
                        Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div 
          className={`${showChatScreen ? 'flex' : 'hidden'} w-full flex-col bg-white border border-gray-200 rounded-lg overflow-hidden`} 
          style={{ 
            height: typeof window !== 'undefined' && window.innerWidth >= 1024 
              ? 'calc(100vh - 250px)' 
              : `${viewportHeight - 200}px`,
            maxHeight: typeof window !== 'undefined' && window.innerWidth >= 1024 
              ? 'calc(100vh - 250px)' 
              : `${viewportHeight - 200}px`
          }}
        >
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b bg-white flex-shrink-0 z-10">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleBackToConversations}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f2fff1' }}>
                    {selectedConversation.psychologist?.cover_image_url ? (
                      <img 
                        src={normalizeImageUrl(selectedConversation.psychologist.cover_image_url)}
                        alt={getConversationName(selectedConversation)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5" style={{ color: '#025545' }} />
                    )}
                  </div>
                  <div>
                    <h6 className="text-gray-900">
                      {getConversationName(selectedConversation)}
                    </h6>
                    <p className="text-gray-500">
                      {getConversationSubtitle(selectedConversation)}
                    </p>
                    <p className="text-green-600">
                      ✓ Conversation active
                    </p>
                    {selectedConversation.id.startsWith('mock-') || selectedConversation.id.startsWith('fallback-') ? (
                      <p className="text-orange-600">
                        ⚠ Temporary conversation - refresh to connect
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0 }}>
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto" style={{ borderBottomColor: '#025545' }}></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-lg font-medium mb-2">Start a conversation</p>
                    <p className="text-sm">Type a message below to begin chatting with {getConversationName(selectedConversation)}</p>
                  </div>
                ) : (
                  messages
                    .filter(message => message && message.id) // Filter out undefined/null messages
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
                              ? 'text-white'
                              : 'bg-gray-200 text-gray-900'
                          } ${message?.isOptimistic ? 'opacity-70' : ''}`}
                          style={(message?.sender_type || '') === user?.role ? { backgroundColor: '#025545' } : {}}
                        >
                          <p className="text-sm">{message?.content || 'Message content unavailable'}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs opacity-70">
                              {formatTime(message?.created_at)}
                            </p>
                            {message?.isOptimistic && (
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#025545' }}></div>
                                <span className="text-xs opacity-70">Sending...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input - Fixed at bottom */}
              <div className="p-4 border-t bg-white flex-shrink-0 z-10" style={{ marginTop: 'auto' }}>
                {/* Disclaimer - Only show for clients */}
                {user?.role === 'client' && (
                  <p className="text-[10px] text-gray-500 mb-2 px-1" style={{ fontSize: '10px', lineHeight: '1.2' }}>
                    This is not an instant message service. Our psychologists will respond as soon as they are free.
                  </p>
                )}
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder={`Type a message to ${getConversationName(selectedConversation)}...`}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': '#025545' }}
                    onFocus={(e) => { 
                      e.currentTarget.style.borderColor = '#025545'; 
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(63, 46, 115, 0.2)';
                      // On mobile, scroll input into view when keyboard opens
                      if (window.innerWidth < 1024) {
                        setTimeout(() => {
                          e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        }, 300);
                      }
                    }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ backgroundColor: '#025545' }}
                    onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#012f23')}
                    onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#025545')}
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

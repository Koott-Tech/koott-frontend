"use client";
import { createContext, useContext } from 'react';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  // Simple messaging without real-time features
  const value = {
    socket: null,
    isConnected: false,
    joinConversation: () => console.log('Messaging via API calls'),
    leaveConversation: () => console.log('Messaging via API calls'),
    sendTypingIndicator: () => console.log('Typing indicators disabled')
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

'use client';

import { createContext, useContext } from 'react';

export const AdminSidebarContext = createContext(null);

export function useAdminSidebar() {
  const ctx = useContext(AdminSidebarContext);
  return ctx;
}

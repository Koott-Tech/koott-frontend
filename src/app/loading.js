import LoadingScreen from "@/components/LoadingScreen";

/**
 * Root-level loading.tsx for Next.js App Router
 * 
 * This is automatically shown by Next.js during:
 * - Route transitions
 * - Suspense boundaries
 * - Data fetching
 * 
 * No timers, no delays - Next.js handles timing automatically
 */
export default function RootLoading() {
  return <LoadingScreen />;
}

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#3f2e73]"></div>
        <p className="text-gray-600 text-sm">Loading admin dashboard…</p>
      </div>
    </div>
  );
}










































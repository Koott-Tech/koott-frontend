export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2" style={{ borderBottomColor: '#025545' }}></div>
        <p className="text-gray-600 text-sm">Loading your profile…</p>
      </div>
    </div>
  );
}










































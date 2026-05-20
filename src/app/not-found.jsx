import Link from "next/link";

export const metadata = {
  title: "Page Not Found - Koott",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-5xl font-bold mb-4" style={{ color: '#025545' }}>404</h1>
        <h2 className="text-2xl font-semibold mb-2" style={{ color: '#025545' }}>Page not found</h2>
        <p className="text-gray-600 mb-6">
          Oops! We couldn&apos;t find the page you were looking for. It might have been moved or deleted.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center w-full py-3 px-4 text-base font-semibold text-white rounded-lg transition-colors duration-200 bg-[#025545] hover:bg-[#012f23]"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}



"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi } from "@/lib/backendApi";
import { Eye, Edit, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminEventPagesCmsListPage() {
  const { isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "";
  const base =
    pathname.startsWith("/superadmin/admin/events-cms") ? "/superadmin/admin/events-cms" : "/admin/events-cms";

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated() || (!hasRole("admin") && !hasRole("superadmin"))) {
        router.push("/");
        return;
      }
      fetchPages();
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  useEffect(() => {
    if (!authLoading && isAuthenticated() && (hasRole("admin") || hasRole("superadmin"))) {
      fetchPages();
    }
  }, [debouncedSearchTerm]);

  const fetchPages = async () => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      setError("");
      const response = await adminApi.getEventPagesAdmin({
        search: debouncedSearchTerm,
        limit: 50,
      });
      if (response?.success) {
        const list = response.data?.pages;
        setPages(Array.isArray(list) ? list : []);
      } else {
        setError(response?.message || "Failed to load event pages");
        setPages([]);
      }
    } catch (err) {
      setError(err?.message || "Error fetching event pages");
      console.error("Error fetching event pages:", err);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this event page?")) return;
    try {
      await adminApi.deleteEventPage(id);
      await fetchPages();
    } catch (e) {
      alert(e?.message || "Error deleting event page");
    }
  };

  const filteredPages = pages.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      p.slug.toLowerCase().includes(q) ||
      (p.seo_title || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading event pages...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h5 className="font-bold text-gray-900">Event pages</h5>
          <p className="text-gray-600 mt-2">Manage workshop landing pages at /events/[slug]</p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`${base}/create`)}
          className="bg-[#189e4f] text-white px-6 py-3 rounded-lg hover:bg-[#189e4f] transition-colors duration-200"
        >
          Create New Event Page
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search pages</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by slug or SEO title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
            >
              <option value="all">All status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredPages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No event pages found</p>
            <button
              type="button"
              onClick={() => router.push(`${base}/create`)}
              className="mt-4 bg-[#189e4f] text-white px-6 py-3 rounded-lg hover:bg-[#189e4f] transition-colors duration-200"
            >
              Create your first event page
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPages.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {p.seo_title || "Untitled page"}
                        </div>
                        <div className="text-sm text-gray-500">/events/{p.slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          p.status === "published"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100"
                            title="Actions"
                          >
                            <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => window.open(`/events/${p.slug}`, "_blank")}
                            className="cursor-pointer"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => router.push(`${base}/${p.id}/edit`)}
                            className="cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(p.id)}
                            className="cursor-pointer text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

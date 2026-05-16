"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Eye } from "lucide-react"

export default function SessionsFilterTable({ 
  sessions = [], 
  isLoading = false,
  onViewSession,
  currentPage = 1,
  totalPages = 1,
  totalSessions = 0,
  onPageChange,
}) {
  const [selectedRows, setSelectedRows] = useState(new Set())

  // No filtering - use sessions directly (filtering is handled by parent component via dateRange)
  const filteredData = useMemo(() => {
    return sessions
  }, [sessions])

  const toggleRow = (id) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev)
      newSet.has(id) ? newSet.delete(id) : newSet.add(id)
      return newSet
    })
  }

  const formatTime = (time) => {
    if (!time) return 'N/A'
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status, session) => {
    const isTimePassed = () => {
      if (!session.scheduled_date || !session.scheduled_time) return false
      const sessionDateTime = new Date(`${session.scheduled_date}T${session.scheduled_time}`)
      return sessionDateTime < new Date()
    }

    const displayStatus = status === 'booked' && isTimePassed() ? 'Pending' : status
    const variant = displayStatus === 'completed' ? 'secondary' : 
                   displayStatus === 'cancelled' ? 'destructive' : 
                   displayStatus === 'no_show' ? 'destructive' : 
                   displayStatus === 'Pending' ? 'secondary' : 'default'

    return <Badge variant={variant}>{displayStatus}</Badge>
  }


  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Table */}
      <div className="max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3f2e73]"></div>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10 border-b">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                    onCheckedChange={(checked) =>
                      setSelectedRows(checked ? new Set(filteredData.map((d) => d.id)) : new Set())
                    }
                  />
                </TableHead>
                <TableHead>Session Details</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Psychologist</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    No sessions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((session) => (
                  <TableRow key={session.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Checkbox 
                        checked={selectedRows.has(session.id)} 
                        onCheckedChange={() => toggleRow(session.id)} 
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">
                          Session #{session.id?.slice(0, 8)}
                          {session.session_type === 'free_assessment' && (
                            <Badge variant="secondary" className="ml-2">Free Assessment</Badge>
                          )}
                          {(session.session_type === 'assessment' || session.type === 'assessment') && (
                            <Badge variant="secondary" className="ml-2">Assessment</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(session.scheduled_date)} at {formatTime(session.scheduled_time)}
                        </div>
                        {session.status === 'rescheduled' && session.original_scheduled_date && (
                          <div className="text-xs text-amber-600 mt-0.5">
                            Originally: {formatDate(session.original_scheduled_date)}
                          </div>
                        )}
                        {session.package && (
                          <div className="text-xs text-gray-400">
                            Package: {session.package.package_type}
                            {(() => {
                              const pkg = session.package || {};
                              const totalSessions = pkg.total_sessions || pkg.session_count || 0;
                              const sessionNum = pkg.session_number ?? pkg.session_index;
                              
                              if (totalSessions > 0 && sessionNum != null) {
                                return ` (${sessionNum}/${totalSessions})`;
                              } else if (totalSessions > 0) {
                                return ` (${totalSessions} sessions)`;
                              }
                              return '';
                            })()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">
                        {session.client?.first_name} {session.client?.last_name}
                      </div>
                      {session.client?.child_name && (
                        <div className="text-xs text-gray-500">
                          Child: {session.client.child_name} ({session.client.child_age} years)
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {session.session_type === 'free_assessment' ? (
                        <div className="text-sm text-gray-900">Free Assessment</div>
                      ) : (
                        <div className="text-sm text-gray-900">
                          {session.psychologist?.first_name} {session.psychologist?.last_name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(session.status, session)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => onViewSession && onViewSession(session)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter className="sticky bottom-0 bg-white border-t">
              <TableRow>
                <TableCell colSpan={5}>Total Sessions</TableCell>
                <TableCell className="font-medium">{filteredData.length}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>
    </div>
  )
}

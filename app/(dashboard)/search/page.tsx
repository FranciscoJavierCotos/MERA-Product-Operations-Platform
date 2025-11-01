"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchBar } from "@/components/shared/search-bar";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { searchTickets } from "@/lib/supabase/queries/tickets";
import { Ticket } from "@/types/ticket.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatDate } from "@/lib/utils/date";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function SearchPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = async (query: string) => {
    setLoading(true);
    setHasSearched(true);
    setSearchQuery(query);
    try {
      const supabase = createClient();
      const results = await searchTickets(supabase, query);
      setTickets(results);
    } catch (error) {
      console.error("Search error:", error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Search</h1>
        <p className="mt-2 text-sm text-gray-700">
          Search for tickets, tasks, and more
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Support Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchBar
            placeholder='Search tickets by title or description... (use "quotes" for exact match)'
            onSearch={handleSearch}
          />
          <div className="mt-4 text-xs text-gray-500">
            <p>
              💡 <strong>Search tips:</strong> Type normally for fuzzy search,
              or use "quotes" for exact phrase matching
            </p>
          </div>

          {loading && (
            <div className="mt-8 flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && hasSearched && tickets.length === 0 && (
            <div className="mt-8 text-center text-gray-500 py-12">
              <p className="text-sm">
                No tickets found matching "{searchQuery}"
              </p>
              <p className="text-xs mt-2">
                Try adjusting your search terms or removing quotes for a broader
                search
              </p>
            </div>
          )}

          {!loading && tickets.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-gray-600 mb-4">
                Found {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
              </p>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <Link
                            href={`/tickets/${ticket.id}`}
                            className="hover:underline"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                #{ticket.ticket_number} {ticket.title}
                              </p>
                              <p className="text-sm text-gray-500 line-clamp-1">
                                {ticket.description}
                              </p>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ticket.status} />
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={ticket.priority} />
                        </TableCell>
                        <TableCell>
                          {ticket.assigned_user ? (
                            <div className="flex items-center gap-2">
                              <UserAvatar
                                name={ticket.assigned_user.full_name}
                                avatarUrl={ticket.assigned_user.avatar_url}
                              />
                              <span className="text-sm">
                                {ticket.assigned_user.full_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {formatDate(ticket.created_at)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {!loading && !hasSearched && (
            <div className="mt-8 text-center text-gray-500 py-12">
              <p className="text-sm">Enter a search query to find tickets</p>
              <p className="text-xs mt-2">
                Search through ticket titles and descriptions
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

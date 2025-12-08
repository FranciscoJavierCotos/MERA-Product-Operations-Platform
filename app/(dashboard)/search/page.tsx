"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchBar } from "@/components/shared/search-bar";
import { useState, useEffect, useRef } from "react";
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
import { useNavigation } from "@/lib/hooks/use-navigation";
import { useSearchParams } from "next/navigation";
import { highlightText } from "@/lib/utils/highlight";

export default function SearchPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { savePageState, getPageState } = useNavigation();
  const hasRestoredState = useRef(false);
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q");

  // Restore search state when returning to page or handle URL query
  useEffect(() => {
    // Only restore once when component mounts or pathname changes back to this page
    if (!hasRestoredState.current) {
      // Check if there's a query parameter in the URL
      if (urlQuery) {
        console.log("Searching from URL query:", urlQuery);
        handleSearch(urlQuery);
      } else {
        const savedState = getPageState();
        if (savedState?.searchQuery) {
          console.log("Restoring search state:", savedState);
          setSearchQuery(savedState.searchQuery);
          setTickets(savedState.tickets || []);
          setHasSearched(savedState.hasSearched || false);
        }
      }
      hasRestoredState.current = true;
    }
  }, [getPageState, urlQuery]);

  const handleSearch = async (query: string) => {
    setLoading(true);
    setHasSearched(true);
    setSearchQuery(query);
    try {
      const supabase = createClient();
      const results = await searchTickets(supabase, query);
      setTickets(results);

      // Save search state for when user returns
      savePageState({
        searchQuery: query,
        tickets: results,
        hasSearched: true,
      });
    } catch (error) {
      console.error("Search error:", error);
      setTickets([]);
      savePageState({
        searchQuery: query,
        tickets: [],
        hasSearched: true,
      });
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
            defaultValue={searchQuery}
          />
          <div className="mt-4 text-xs text-gray-500">
            <p>
              💡 <strong>Search tips:</strong> Type normally for fuzzy search,
              or use &quot;quotes&quot; for exact phrase matching
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
                No tickets found matching &quot;{searchQuery}&quot;
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
                      <TableHead>Functional Team</TableHead>
                      <TableHead>Support Team</TableHead>
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
                                #{ticket.ticket_number}{" "}
                                {highlightText(ticket.title, searchQuery)}
                              </p>
                              <p className="text-sm text-gray-500 line-clamp-1">
                                {highlightText(
                                  ticket.description || "",
                                  searchQuery
                                )}
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
                          <span className="text-sm text-gray-600">
                            {ticket.functional_team?.name || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {ticket.support_team?.name || "-"}
                          </span>
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

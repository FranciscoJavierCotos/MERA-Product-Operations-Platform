"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Ticket,
  FolderKanban,
  Clock4,
  PanelTopOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

const RECENT_SEARCHES_KEY = "navbar_recent_searches";
const MAX_RECENT_SEARCHES = 6;

interface NavbarSearchProps {
  className?: string;
  onOpenCommandPalette?: () => void;
}

type SuggestionItem =
  | {
      id: string;
      type: "search" | "recent";
      label: string;
      description: string;
      value: string;
      icon: typeof Search;
    }
  | {
      id: string;
      type: "scope";
      label: string;
      description: string;
      value: string;
      icon: typeof Search;
    }
  | {
      id: string;
      type: "palette";
      label: string;
      description: string;
      icon: typeof PanelTopOpen;
    };

export function NavbarSearch({
  className,
  onOpenCommandPalette,
}: NavbarSearchProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (!raw) {
        return;
      }

      const parsed: unknown = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        const normalized = parsed.filter(
          (item): item is string => typeof item === "string",
        );
        setRecentSearches(normalized.slice(0, MAX_RECENT_SEARCHES));
      }
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const saveRecentSearch = (rawQuery: string) => {
    const normalized = rawQuery.trim();
    if (!normalized) {
      return;
    }

    setRecentSearches((previous) => {
      const next = [
        normalized,
        ...previous.filter((value) => value !== normalized),
      ].slice(0, MAX_RECENT_SEARCHES);

      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const runSearch = (rawQuery: string) => {
    const normalized = rawQuery.trim();
    if (!normalized) {
      return;
    }

    saveRecentSearch(normalized);
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(normalized)}`);
  };

  const suggestionItems = useMemo<SuggestionItem[]>(() => {
    const trimmed = query.trim();
    const items: SuggestionItem[] = [];

    if (trimmed) {
      items.push({
        id: "search-main",
        type: "search",
        label: `Search for \"${trimmed}\"`,
        description: "Run global ticket search",
        value: trimmed,
        icon: Search,
      });

      const ticketNumber = trimmed.match(/^#?(\d+)$/);
      if (ticketNumber) {
        const normalized = `#${ticketNumber[1]}`;
        items.push({
          id: "search-ticket",
          type: "search",
          label: `Find ticket ${normalized}`,
          description: "Search by ticket number",
          value: normalized,
          icon: Ticket,
        });
      }
    } else {
      recentSearches.forEach((recent) => {
        items.push({
          id: `recent-${recent}`,
          type: "recent",
          label: recent,
          description: "Recent search",
          value: recent,
          icon: Clock4,
        });
      });
    }

    items.push(
      {
        id: "scope-ticket",
        type: "scope",
        label: "Ticket scope",
        description: "Type ticket: followed by title, number, or keywords",
        value: "ticket: ",
        icon: Ticket,
      },
      {
        id: "scope-project",
        type: "scope",
        label: "Project scope",
        description: "Type project: followed by key or project name",
        value: "project: ",
        icon: FolderKanban,
      },
    );

    items.push({
      id: "open-palette",
      type: "palette",
      label: "Open command palette",
      description: "Use Ctrl+K or Cmd+K for quick actions",
      icon: PanelTopOpen,
    });

    return items;
  }, [query, recentSearches]);

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [query, showSuggestions]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const handleSuggestionAction = (item: SuggestionItem) => {
    if (item.type === "palette") {
      setShowSuggestions(false);
      onOpenCommandPalette?.();
      return;
    }

    if (item.type === "scope") {
      setQuery(item.value);
      setShowSuggestions(true);
      return;
    }

    setQuery(item.value);
    runSearch(item.value);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <div ref={containerRef} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search tickets, tasks, and projects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(event) => {
            if (!showSuggestions || suggestionItems.length === 0) {
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveSuggestionIndex((current) =>
                Math.min(current + 1, suggestionItems.length - 1),
              );
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveSuggestionIndex((current) => Math.max(current - 1, 0));
            }

            if (event.key === "Enter") {
              const suggestion = suggestionItems[activeSuggestionIndex];
              if (suggestion) {
                event.preventDefault();
                handleSuggestionAction(suggestion);
              }
            }

            if (event.key === "Escape") {
              event.preventDefault();
              setShowSuggestions(false);
            }
          }}
          className="h-10 border-gray-200 bg-gray-50 pl-10 pr-20 transition-colors focus:bg-white"
        />

        <button
          type="button"
          onClick={() => onOpenCommandPalette?.()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-50"
          aria-label="Open command palette"
        >
          Ctrl K
        </button>

        {showSuggestions && suggestionItems.length > 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-lg border bg-white shadow-lg">
            <ul className="max-h-72 overflow-y-auto py-1">
              {suggestionItems.map((item, index) => {
                const Icon = item.icon;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSuggestionAction(item)}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      className={cn(
                        "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors",
                        index === activeSuggestionIndex
                          ? "bg-primary-50 text-gray-900"
                          : "hover:bg-gray-50",
                      )}
                    >
                      <Icon className="mt-0.5 h-4 w-4 text-gray-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {item.label}
                        </span>
                        <span className="block truncate text-xs text-gray-500">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </form>
  );
}

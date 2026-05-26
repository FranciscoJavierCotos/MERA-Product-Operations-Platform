"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Compass,
  FolderKanban,
  History,
  Search,
  Ticket,
  CheckSquare,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { useNavigation } from "@/lib/hooks/use-navigation";
import type { UserRole } from "@/types/user.types";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: UserRole;
}

type CommandGroup = "create" | "navigate" | "recent" | "search";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  group: CommandGroup;
  icon: LucideIcon;
  href: string;
  keywords: string[];
}

const GROUP_LABELS: Record<CommandGroup, string> = {
  create: "Create",
  navigate: "Navigate",
  recent: "Recent",
  search: "Search",
};

const NAV_COMMANDS: CommandItem[] = [
  {
    id: "nav-dashboard",
    label: "Go to dashboard",
    description: "Overview and operational widgets",
    group: "navigate",
    icon: Compass,
    href: "/dashboard",
    keywords: ["dashboard", "home", "overview"],
  },
  {
    id: "nav-my-tasks",
    label: "Go to my tasks",
    description: "Track and complete assigned tasks",
    group: "navigate",
    icon: CheckSquare,
    href: "/tasks",
    keywords: ["tasks", "my tasks", "todo"],
  },
  {
    id: "nav-my-tickets",
    label: "Go to my tickets",
    description: "Tickets currently assigned to me",
    group: "navigate",
    icon: Ticket,
    href: "/my-tickets",
    keywords: ["tickets", "my tickets", "assigned"],
  },
  {
    id: "nav-all-tickets",
    label: "Go to all tickets",
    description: "Browse all support requests",
    group: "navigate",
    icon: Ticket,
    href: "/tickets",
    keywords: ["tickets", "all tickets", "queue"],
  },
  {
    id: "nav-projects",
    label: "Go to projects",
    description: "Sprint and work item management",
    group: "navigate",
    icon: FolderKanban,
    href: "/projects",
    keywords: ["projects", "scrum", "backlog"],
  },
  {
    id: "nav-search",
    label: "Go to search",
    description: "Advanced ticket search page",
    group: "navigate",
    icon: Search,
    href: "/search",
    keywords: ["search", "find", "query"],
  },
];

function formatPathLabel(path: string) {
  if (path === "/dashboard") {
    return "Dashboard";
  }

  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/-/g, " "))
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" / ");
}

export function CommandPalette({
  open,
  onOpenChange,
  role,
}: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { getRecentPaths } = useNavigation();

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const createCommands = useMemo<CommandItem[]>(() => {
    const commands: CommandItem[] = [
      {
        id: "create-ticket",
        label: "Create ticket",
        description: "Open new ticket form",
        group: "create",
        icon: Ticket,
        href: "/tickets/new",
        keywords: ["create", "ticket", "new"],
      },
    ];

    if (role !== "client") {
      commands.push(
        {
          id: "create-task",
          label: "Create task",
          description: "Open task composer",
          group: "create",
          icon: CheckSquare,
          href: "/tasks?create=1",
          keywords: ["create", "task", "new"],
        },
        {
          id: "create-project",
          label: "Create project",
          description: "Open project setup form",
          group: "create",
          icon: FolderKanban,
          href: "/projects/new",
          keywords: ["create", "project", "new"],
        },
      );
    }

    return commands;
  }, [role]);

  const recentCommands = useMemo<CommandItem[]>(() => {
    return getRecentPaths(5).map((path) => ({
      id: `recent-${path}`,
      label: `Recent: ${formatPathLabel(path)}`,
      description: path,
      group: "recent",
      icon: History,
      href: path,
      keywords: ["recent", "history", path],
    }));
  }, [getRecentPaths, pathname]);

  const searchCommands = useMemo<CommandItem[]>(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      return [];
    }

    const commands: CommandItem[] = [
      {
        id: "search-text",
        label: `Search for \"${trimmed}\"`,
        description: "Run a global ticket search",
        group: "search",
        icon: Search,
        href: `/search?q=${encodeURIComponent(trimmed)}`,
        keywords: ["search", trimmed],
      },
    ];

    const ticketNumber = trimmed.match(/^#?(\d+)$/);

    if (ticketNumber) {
      const normalized = `#${ticketNumber[1]}`;
      commands.unshift({
        id: "search-ticket-number",
        label: `Find ticket ${normalized}`,
        description: "Search by ticket number",
        group: "search",
        icon: Ticket,
        href: `/search?q=${encodeURIComponent(normalized)}`,
        keywords: ["ticket", "number", normalized],
      });
    }

    return commands;
  }, [query]);

  const commands = useMemo(() => {
    const base = [
      ...createCommands,
      ...NAV_COMMANDS,
      ...recentCommands,
      ...searchCommands,
    ];
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      return base.filter((command) => command.href !== pathname);
    }

    return base
      .filter((command) => command.href !== pathname)
      .filter((command) => {
        const haystack =
          `${command.label} ${command.description} ${command.keywords.join(" ")}`.toLowerCase();
        return haystack.includes(trimmed);
      });
  }, [createCommands, pathname, query, recentCommands, searchCommands]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const selectedCommand = commands[activeIndex];

  const runCommand = (command: CommandItem) => {
    onOpenChange(false);
    router.push(command.href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>

        <div className="border-b px-4 py-3">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((current) =>
                  Math.min(current + 1, Math.max(commands.length - 1, 0)),
                );
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) => Math.max(current - 1, 0));
              }

              if (event.key === "Enter" && selectedCommand) {
                event.preventDefault();
                runCommand(selectedCommand);
              }
            }}
            placeholder="Search anything, jump to a page, or create a record..."
            className="h-11 border-0 bg-transparent px-0 text-base focus-visible:ring-0"
          />
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {commands.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No commands found for this search.
            </div>
          ) : (
            commands.map((command, index) => {
              const Icon = command.icon;
              const showGroupLabel =
                index === 0 || commands[index - 1].group !== command.group;

              return (
                <div key={command.id}>
                  {showGroupLabel && (
                    <p className="px-2 pb-1 pt-3 text-xs font-semibold text-muted-foreground first:pt-1">
                      {GROUP_LABELS[command.group]}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => runCommand(command)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors",
                      index === activeIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60",
                    )}
                  >
                    <span className="mt-0.5 rounded-md border border-border bg-background p-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {command.label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {command.description}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          <span>Up/Down to move, Enter to run, Esc to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

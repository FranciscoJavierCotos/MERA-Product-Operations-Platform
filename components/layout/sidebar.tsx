"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  CheckSquare,
  Search,
  User,
  Brain,
  FolderKanban,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Role = "admin" | "support_lead" | "support_member" | "client";

const navigation: Array<{
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}> = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Tasks", href: "/tasks", icon: CheckSquare },
  { name: "My Tickets", href: "/my-tickets", icon: User },
  { name: "All Tickets", href: "/tickets", icon: Ticket },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Search", href: "/search", icon: Search },
  { name: "AI Knowledge", href: "/knowledge", icon: Brain, adminOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];

interface SidebarProps {
  role?: Role;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  role,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps = {}) {
  const pathname = usePathname();
  const [isToggleHovered, setIsToggleHovered] = useState(false);
  const items = navigation.filter(
    (item) => !item.adminOnly || role === "admin",
  );

  return (
    <div
      className={cn(
        "hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-[width] duration-200",
        isCollapsed ? "md:w-20" : "md:w-64",
      )}
    >
      <div className="flex-1 flex flex-col min-h-0 bg-gray-800">
        <div
          className={cn(
            "relative flex items-center h-16 flex-shrink-0 bg-gray-900",
            isCollapsed ? "justify-center px-2" : "px-4",
          )}
        >
          {isCollapsed ? (
            <h1
              className={cn(
                "text-white text-xl font-bold tracking-tight transition-transform duration-300 ease-out",
                isToggleHovered ? "-translate-x-3" : "translate-x-0",
              )}
            >
              M
            </h1>
          ) : (
            <div className="flex flex-col">
              <h1 className="text-white text-xl font-bold tracking-tight">
                MERA
              </h1>
              <span className="text-gray-400 text-xs leading-none">
                Product Operations
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            onMouseEnter={() => setIsToggleHovered(true)}
            onMouseLeave={() => setIsToggleHovered(false)}
            onFocus={() => setIsToggleHovered(true)}
            onBlur={() => setIsToggleHovered(false)}
            className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand menu" : "Collapse menu"}
          >
            {isCollapsed ? (
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    isActive
                      ? "bg-gray-900 text-white border-l-2 border-primary-400"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white border-l-2 border-transparent",
                    isCollapsed ? "justify-center px-2" : "pl-[7px] pr-2",
                    "group flex items-center py-2 text-sm font-medium rounded-md transition-colors",
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive
                        ? "text-primary-300"
                        : "text-gray-400 group-hover:text-gray-300",
                      isCollapsed ? "mr-0 h-6 w-6" : "mr-3 h-6 w-6",
                      "flex-shrink-0",
                    )}
                    aria-hidden="true"
                  />
                  {!isCollapsed && item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

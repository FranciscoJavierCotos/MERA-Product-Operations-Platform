"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  CheckSquare,
  Search,
  User,
  Brain,
  FolderKanban,
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
  { name: "All Tickets", href: "/tickets", icon: Ticket },
  { name: "My Tickets", href: "/my-tickets", icon: User },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "My Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Search", href: "/search", icon: Search },
  { name: "AI Knowledge", href: "/knowledge", icon: Brain, adminOnly: true },
];

export function Sidebar({ role }: { role?: Role } = {}) {
  const pathname = usePathname();
  const items = navigation.filter((item) => !item.adminOnly || role === "admin");

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-gray-800">
        <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
          <h1 className="text-white text-xl font-bold">Support Desk</h1>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white",
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md"
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive
                        ? "text-gray-300"
                        : "text-gray-400 group-hover:text-gray-300",
                      "mr-3 flex-shrink-0 h-6 w-6"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

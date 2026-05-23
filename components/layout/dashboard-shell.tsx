"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Profile } from "@/types/user.types";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";

const SIDEBAR_STORAGE_KEY = "dashboard-sidebar-collapsed";

interface DashboardShellProps {
  user: Profile;
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false);

  useEffect(() => {
    const storedPreference = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (storedPreference === "true") {
      setIsCollapsed(true);
    }
    setHasLoadedPreference(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedPreference) {
      return;
    }

    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
  }, [hasLoadedPreference, isCollapsed]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar
        role={user.role}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((previous) => !previous)}
      />
      <div
        className={cn(
          "flex flex-col flex-1 transition-[padding-left] duration-200",
          isCollapsed ? "md:pl-20" : "md:pl-64",
        )}
      >
        <Navbar user={user} />
        <main className="flex-1">
          <div className="py-6">
            <div className="w-full px-4 sm:px-6 lg:px-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

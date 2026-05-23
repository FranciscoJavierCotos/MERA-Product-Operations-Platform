"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/format";
import { Profile } from "@/types/user.types";
import { GoBackButton } from "./go-back-button";
import { useNavigation } from "@/lib/hooks/use-navigation";
import { NavbarSearch } from "./navbar-search";
import { CommandPalette } from "./command-palette";
import { TopbarCreateMenu } from "./topbar-create-menu";

const WORK_STATUS_KEY = "topbar_work_status";

type WorkStatus = "available" | "focus" | "offline";

const WORK_STATUS_OPTIONS: Array<{
  value: WorkStatus;
  label: string;
  description: string;
  dotClassName: string;
}> = [
  {
    value: "available",
    label: "Available",
    description: "Ready for incoming work",
    dotClassName: "bg-emerald-500",
  },
  {
    value: "focus",
    label: "Focus",
    description: "Heads-down on deep work",
    dotClassName: "bg-amber-500",
  },
  {
    value: "offline",
    label: "Offline",
    description: "Away from keyboard",
    dotClassName: "bg-gray-400",
  },
];

function getPageLabel(pathname: string): string {
  if (pathname === "/dashboard") {
    return "Dashboard";
  }

  if (pathname === "/") {
    return "Home";
  }

  const [firstSegment] = pathname.split("/").filter(Boolean);

  if (!firstSegment) {
    return "Workspace";
  }

  return firstSegment
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

interface NavbarProps {
  user: Profile | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { clearHistory } = useNavigation();
  const [mounted, setMounted] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [workStatus, setWorkStatus] = useState<WorkStatus>("available");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "k"
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      const isTypingField =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        !!target?.isContentEditable;

      if (isTypingField) {
        return;
      }

      event.preventDefault();
      setIsCommandPaletteOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WORK_STATUS_KEY);

      if (raw === "available" || raw === "focus" || raw === "offline") {
        setWorkStatus(raw);
      }
    } catch {
      setWorkStatus("available");
    }
  }, []);

  const currentStatus = useMemo(
    () =>
      WORK_STATUS_OPTIONS.find((option) => option.value === workStatus) ??
      WORK_STATUS_OPTIONS[0],
    [workStatus],
  );

  const handleWorkStatusChange = (status: string) => {
    if (status !== "available" && status !== "focus" && status !== "offline") {
      return;
    }

    setWorkStatus(status);
    localStorage.setItem(WORK_STATUS_KEY, status);
  };

  const handleLogout = async () => {
    // Clear navigation history on logout
    clearHistory();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (!user) return null;

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm">
        <div className="h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex h-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <GoBackButton showText={false} className="shrink-0" />
              <div className="hidden h-6 w-px bg-gray-200 sm:block" />

              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-md bg-primary-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
                  MERA
                </div>

                <div className="hidden sm:flex sm:flex-col sm:leading-tight">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Workspace
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {getPageLabel(pathname)}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden max-w-xl flex-1 md:flex">
              <NavbarSearch
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              />
            </div>

            <div className="flex items-center gap-2">
              <TopbarCreateMenu role={user.role} />

              {mounted ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full"
                    >
                      <Avatar>
                        <AvatarFallback className="bg-primary text-white">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-white"
                        aria-hidden="true"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${currentStatus.dotClassName}`}
                        />
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.full_name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator />

                    <DropdownMenuLabel className="text-xs uppercase tracking-wide text-gray-500">
                      Work status
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={workStatus}
                      onValueChange={handleWorkStatusChange}
                    >
                      {WORK_STATUS_OPTIONS.map((status) => (
                        <DropdownMenuRadioItem
                          key={status.value}
                          value={status.value}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${status.dotClassName}`}
                            />
                            <span className="flex flex-col">
                              <span className="text-sm">{status.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {status.description}
                              </span>
                            </span>
                          </div>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="cursor-pointer">
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/search" className="cursor-pointer">
                        Advanced search
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handleLogout}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary text-white">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              )}
            </div>
          </div>

          <div className="pb-2 md:hidden">
            <NavbarSearch
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            />
          </div>
        </div>
      </div>

      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        role={user.role}
      />
    </>
  );
}

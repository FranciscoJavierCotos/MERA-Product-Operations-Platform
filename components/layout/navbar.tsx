"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/format";
import { Profile } from "@/types/user.types";
import { GoBackButton } from "./go-back-button";
import { useNavigation } from "@/lib/hooks/use-navigation";
import { NavbarSearch } from "./navbar-search";

interface NavbarProps {
  user: Profile | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const { clearHistory } = useNavigation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    // Clear navigation history on logout
    clearHistory();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (!user) return null;

  return (
    <div className="bg-white shadow-sm">
      <div className="w-full">
        <div className="flex justify-between h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 flex-1 mr-4">
            <GoBackButton showText={true} />
            <div className="h-6 w-px bg-gray-300 hidden sm:block" />
            <h2 className="text-2xl font-bold text-gray-900 whitespace-nowrap">
              Support Ticket System
            </h2>
            <div className="hidden md:flex flex-1 max-w-2xl mx-4">
              <NavbarSearch />
            </div>
          </div>
          <div className="flex items-center">
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
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
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
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
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
      </div>
    </div>
  );
}

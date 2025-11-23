"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export function NavbarSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search tickets..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white"
        />
      </div>
    </form>
  );
}

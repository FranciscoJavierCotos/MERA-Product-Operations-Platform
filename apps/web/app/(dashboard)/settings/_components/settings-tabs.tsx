"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { UsersTab } from "./users-tab";
import { TeamsTab } from "./teams-tab";
import { TicketConfigTab } from "./ticket-config-tab";
import { TagsTab } from "./tags-tab";
import { SlaTab } from "./sla-tab";
import type { Profile } from "@/types/user.types";
import type { Team } from "@/types/team.types";
import type {
  TicketStatusRow,
  TicketPriorityRow,
  TicketCategoryRow,
  TicketTagRow,
} from "@/types/ticket.types";
import type { SlaPolicy } from "@/types/sla.types";

interface SettingsTabsProps {
  profiles: Profile[];
  teams: Team[];
  statuses: TicketStatusRow[];
  priorities: TicketPriorityRow[];
  categories: TicketCategoryRow[];
  tags: TicketTagRow[];
  slaPolicies: SlaPolicy[];
}

export function SettingsTabs({
  profiles,
  teams,
  statuses,
  priorities,
  categories,
  tags,
  slaPolicies,
}: SettingsTabsProps) {
  return (
    <Tabs defaultValue="users" className="space-y-6">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="teams">Teams</TabsTrigger>
        <TabsTrigger value="ticket-config">Ticket Config</TabsTrigger>
        <TabsTrigger value="tags">Tags</TabsTrigger>
        <TabsTrigger value="sla">SLA Policies</TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        <UsersTab profiles={profiles} teams={teams} />
      </TabsContent>

      <TabsContent value="teams">
        <TeamsTab teams={teams} />
      </TabsContent>

      <TabsContent value="ticket-config">
        <TicketConfigTab
          statuses={statuses}
          priorities={priorities}
          categories={categories}
        />
      </TabsContent>

      <TabsContent value="tags">
        <TagsTab tags={tags} />
      </TabsContent>

      <TabsContent value="sla">
        <SlaTab policies={slaPolicies} priorities={priorities} />
      </TabsContent>
    </Tabs>
  );
}

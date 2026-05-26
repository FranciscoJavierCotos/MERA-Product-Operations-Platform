"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskStats as TaskStatsType } from "@/types/task.types";
import { CheckCircle2, Clock, AlertTriangle, ListTodo } from "lucide-react";

interface TaskStatsProps {
  stats: TaskStatsType;
  isLoading?: boolean;
}

export function TaskStats({ stats, isLoading }: TaskStatsProps) {
  if (isLoading) {
    return <TaskStatsSkeleton />;
  }

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Total Tasks"
        value={stats.total}
        icon={ListTodo}
        iconClassName="text-blue-500"
      />
      <StatCard
        title="Pending"
        value={stats.pending}
        icon={Clock}
        iconClassName="text-yellow-500"
      />
      <StatCard
        title="Completed"
        value={stats.completed}
        icon={CheckCircle2}
        iconClassName="text-green-500"
        subtitle={`${completionRate}% completion rate`}
      />
      <StatCard
        title="Overdue"
        value={stats.overdue}
        icon={AlertTriangle}
        iconClassName={
          stats.overdue > 0
            ? "text-red-500"
            : "text-gray-400 dark:text-gray-500"
        }
        valueClassName={
          stats.overdue > 0
            ? "text-red-600 dark:text-red-400"
            : undefined
        }
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  valueClassName?: string;
  subtitle?: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  valueClassName,
  subtitle,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${iconClassName}`} />
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold tabular-nums ${
            valueClassName || "text-gray-900 dark:text-gray-50"
          }`}
        >
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TaskStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-20 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-4 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-12 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import Link from "next/link";
import type { ComponentType } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketNavigationButtonsProps {
  firstTicketId: string | null;
  previousTicketId: string | null;
  nextTicketId: string | null;
}

interface NavigationButtonProps {
  href: string | null;
  ariaLabel: string;
  icon: ComponentType<{ className?: string }>;
}

function NavigationButton({
  href,
  ariaLabel,
  icon: Icon,
}: NavigationButtonProps) {
  if (!href) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled
        aria-label={ariaLabel}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      asChild
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
    >
      <Link href={href} aria-label={ariaLabel}>
        <Icon className="h-4 w-4" />
      </Link>
    </Button>
  );
}

export function TicketNavigationButtons({
  firstTicketId,
  previousTicketId,
  nextTicketId,
}: TicketNavigationButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      <NavigationButton
        href={firstTicketId ? `/tickets/${firstTicketId}` : null}
        ariaLabel="Go to first ticket in My Tickets"
        icon={ChevronsLeft}
      />
      <NavigationButton
        href={previousTicketId ? `/tickets/${previousTicketId}` : null}
        ariaLabel="Go to previous ticket in My Tickets"
        icon={ChevronLeft}
      />
      <NavigationButton
        href={nextTicketId ? `/tickets/${nextTicketId}` : null}
        ariaLabel="Go to next ticket in My Tickets"
        icon={ChevronRight}
      />
    </div>
  );
}

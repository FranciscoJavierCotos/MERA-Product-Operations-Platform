import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/format";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  className?: string;
}

export function UserAvatar({ name, avatarUrl, className }: UserAvatarProps) {
  return (
    <Avatar className={className}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className="bg-primary text-white text-xs leading-none">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

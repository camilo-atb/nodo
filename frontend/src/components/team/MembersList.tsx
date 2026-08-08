import type { PersonRef } from '@nodo/contracts';
import { Avatar } from '@/components/base/Avatar';
import { Badge } from '@/components/base/Badge';

interface MembersListProps {
  members: PersonRef[];
  leadId: string;
}

export function MembersList({ members, leadId }: MembersListProps) {
  return (
    <ul className="space-y-2">
      {members.map((member) => (
        <li key={member.id} className="flex items-center gap-3">
          <Avatar name={member.displayName} size="sm" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-white font-medium">{member.displayName}</span>
            <span className="text-xs text-muted-2">@{member.handle}</span>
            {member.id === leadId && <Badge color="accent">Lead</Badge>}
          </div>
        </li>
      ))}
    </ul>
  );
}

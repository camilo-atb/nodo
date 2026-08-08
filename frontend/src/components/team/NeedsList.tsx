import type { NeedRef } from '@nodo/contracts';
import { Badge } from '@/components/base/Badge';

interface NeedsListProps {
  needs: NeedRef[];
}

export function NeedsList({ needs }: NeedsListProps) {
  if (needs.length === 0) {
    return <p className="text-xs text-muted-2">No requirements listed yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {needs.map((need) => (
        <Badge key={need.slug} color={need.priority === 'required' ? 'accent' : 'muted'}>
          {need.label}
          {need.priority === 'required' && (
            <span className="ml-1 text-[8px] opacity-70">●</span>
          )}
        </Badge>
      ))}
    </div>
  );
}

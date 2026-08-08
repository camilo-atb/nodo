import type { SuggestionDTO } from '@nodo/contracts';
import { Card } from '@/components/base/Card';
import { Badge } from '@/components/base/Badge';
import { Button } from '@/components/base/Button';

interface SuggestionCardProps {
  suggestion: SuggestionDTO;
  onApply?: () => void;
}

export function SuggestionCard({ suggestion, onApply }: SuggestionCardProps) {
  const scorePercent = Math.round(suggestion.score * 100);

  return (
    <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent/[0.04] to-transparent">
      {/* Score indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-accent">{scorePercent}%</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-2 font-semibold">match</span>
        </div>
        <Badge color="accent">
          {suggestion.direction === 'team_needs_person' ? 'Team invite' : 'Suggested'}
        </Badge>
      </div>

      {/* Names */}
      <div className="mb-2">
        {suggestion.direction === 'team_needs_person' ? (
          <p className="text-sm text-white">
            <span className="font-semibold">{suggestion.teamName}</span>
            <span className="text-muted"> needs </span>
            <span className="font-semibold">{suggestion.personName}</span>
          </p>
        ) : (
          <p className="text-sm text-white">
            <span className="font-semibold">{suggestion.personName}</span>
            <span className="text-muted"> → </span>
            <span className="font-semibold">{suggestion.teamName}</span>
          </p>
        )}
      </div>

      {/* Matched skills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {suggestion.matchedSkills.map((skill) => (
          <Badge key={skill.slug} color={skill.priority === 'required' ? 'accent' : 'muted'}>
            {skill.label}
          </Badge>
        ))}
      </div>

      {/* Rationale */}
      <p className="text-xs text-muted leading-relaxed mb-3">{suggestion.rationale}</p>

      {/* Action */}
      {onApply && (
        <Button onClick={onApply} className="w-full text-xs">
          Apply
        </Button>
      )}
    </Card>
  );
}

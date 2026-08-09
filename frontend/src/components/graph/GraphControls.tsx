/**
 * Filter controls overlay for the graph panel.
 */

import type { GraphFilter } from '@/types/ui';
import { getNodeColor } from '@/utils/graphStyles';
import type { NodeKind } from '@nodo/contracts';

interface GraphControlsProps {
  filter: GraphFilter;
  onFilterChange: (filter: GraphFilter) => void;
}

interface ToggleItem {
  key: keyof GraphFilter;
  label: string;
  kind: NodeKind;
}

const toggles: ToggleItem[] = [
  { key: 'showPersons', label: 'Person', kind: 'person' },
  { key: 'showTeams', label: 'Team', kind: 'team' },
  { key: 'showSkills', label: 'Skill', kind: 'skill' },
];

export function GraphControls({ filter, onFilterChange }: GraphControlsProps) {
  function toggle(key: keyof GraphFilter) {
    onFilterChange({ ...filter, [key]: !filter[key] });
  }

  return (
    <div className="absolute top-3 right-3 flex flex-col gap-1.5 p-2 rounded-lg bg-panel/80 backdrop-blur-sm border border-border z-10">
      {toggles.map(({ key, label, kind }) => {
        const active = filter[key];
        const color = getNodeColor(kind);
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-opacity ${
              active ? 'opacity-100' : 'opacity-40'
            } hover:opacity-100`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: color }}
            />
            <span className="text-white/80">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

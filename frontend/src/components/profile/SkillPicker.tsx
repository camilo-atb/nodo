import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { SkillRef, SkillCategory } from '@nodo/contracts';
import { Spinner } from '@/components/base/Spinner';

interface SkillPickerProps {
  value: string[];
  onChange: (slugs: string[]) => void;
}

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  mobile: 'Mobile',
  'data-ai': 'Data & AI',
  design: 'Design',
  product: 'Product',
  infra: 'Infrastructure',
  other: 'Other',
};

export function SkillPicker({ value, onChange }: SkillPickerProps) {
  const [vocabulary, setVocabulary] = useState<SkillRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [freeText, setFreeText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ skills: SkillRef[] }>('/v1/skills')
      .then((res) => {
        if (!cancelled) setVocabulary(res.skills);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = vocabulary.filter(
    (s) => !value.includes(s.slug) && s.label.toLowerCase().includes(query.toLowerCase()),
  );

  const grouped = filtered.reduce<Record<string, SkillRef[]>>((acc, skill) => {
    const cat = skill.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  function addSkill(slug: string) {
    if (!value.includes(slug)) {
      onChange([...value, slug]);
    }
    setQuery('');
    setOpen(false);
  }

  function removeSkill(slug: string) {
    onChange(value.filter((s) => s !== slug));
  }

  function handleFreeTextAdd() {
    const slug = freeText.trim().toLowerCase().replace(/\s+/g, '-');
    if (slug && !value.includes(slug)) {
      onChange([...value, slug]);
    }
    setFreeText('');
  }

  function getLabel(slug: string): string {
    const skill = vocabulary.find((s) => s.slug === slug);
    return skill ? skill.label : slug;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted text-sm">
        <Spinner size="sm" />
        <span>Loading skills...</span>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted">Skills autocomplete unavailable. Enter skills manually:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFreeTextAdd(); } }}
            placeholder="e.g. react, typescript..."
            className="flex-1 rounded-lg bg-panel-2 border border-border px-3 py-2 text-sm text-white placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="button"
            onClick={handleFreeTextAdd}
            className="px-3 py-2 text-sm rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
          >
            Add
          </button>
        </div>
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {value.map((slug) => (
              <span
                key={slug}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-accent/10 text-accent border border-accent/20"
              >
                {slug}
                <button
                  type="button"
                  onClick={() => removeSkill(slug)}
                  className="ml-1 text-accent/60 hover:text-accent"
                  aria-label={`Remove ${slug}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative space-y-2">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search skills..."
        className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2 text-sm text-white placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-accent"
      />

      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg bg-panel-2 border border-border shadow-lg">
          {Object.entries(grouped).map(([category, skills]) => (
            <div key={category}>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-2">
                {CATEGORY_LABELS[category as SkillCategory] ?? category}
              </div>
              {skills.map((skill) => (
                <button
                  key={skill.slug}
                  type="button"
                  onClick={() => addSkill(skill.slug)}
                  className="w-full px-3 py-1.5 text-left text-sm text-white hover:bg-white/5 transition-colors"
                >
                  {skill.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((slug) => (
            <span
              key={slug}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-accent/10 text-accent border border-accent/20"
            >
              {getLabel(slug)}
              <button
                type="button"
                onClick={() => removeSkill(slug)}
                className="ml-1 text-accent/60 hover:text-accent"
                aria-label={`Remove ${getLabel(slug)}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

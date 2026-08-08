import { useState } from 'react';
import { Button } from '@/components/base/Button';

interface RecoveryCodeDisplayProps {
  code: string;
  onContinue: () => void;
}

export function RecoveryCodeDisplay({ code, onContinue }: RecoveryCodeDisplayProps) {
  const [saved, setSaved] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto space-y-8 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Your Recovery Code</h2>
        <p className="text-sm text-muted">
          This is the only way to recover your account. Keep it somewhere safe.
        </p>
      </div>

      <div className="rounded-xl bg-panel-2 border border-border p-6">
        <code className="block text-2xl font-mono font-bold text-green tracking-wider break-all select-all">
          {code}
        </code>
      </div>

      <div className="rounded-lg bg-red/5 border border-red/20 p-4">
        <p className="text-sm text-red font-medium">
          ⚠️ Save this code. It's the only way to recover your account.
        </p>
      </div>

      <label className="flex items-center justify-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="w-4 h-4 rounded border-border bg-panel-2 text-violet focus:ring-violet focus:ring-offset-0 accent-violet"
        />
        <span className="text-sm text-muted group-hover:text-white transition-colors">
          I've saved my recovery code
        </span>
      </label>

      <Button
        onClick={onContinue}
        disabled={!saved}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  );
}

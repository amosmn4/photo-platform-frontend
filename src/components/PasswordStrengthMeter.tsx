import React from 'react';
import { getPasswordStrength } from '../utils/passwordStrength';

const BAR_COLOR = ['bg-mark', 'bg-mark', 'bg-safelight', 'bg-safelight', 'bg-ok'];

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = getPasswordStrength(password);

  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? BAR_COLOR[score] : 'bg-hairline'}`} />
        ))}
      </div>
      <p className="mt-1 text-xs text-ink-faint">{label}</p>
    </div>
  );
}

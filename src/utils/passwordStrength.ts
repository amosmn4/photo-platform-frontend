export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

/**
 * Lightweight heuristic strength meter — no external dependency (zxcvbn
 * etc.) since this is the only place in the app that would need one.
 * Rewards length and character variety, not just a checklist of classes.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const clamped = Math.min(score, 4) as PasswordStrength['score'];
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score: clamped, label: labels[clamped] };
}

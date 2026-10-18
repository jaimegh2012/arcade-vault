// SPEC 13: reglas de complejidad de contraseña. Puro: lo usan las actions (servidor) y la pista (cliente).
// Los símbolos coinciden con el conjunto de "Password requirements" de Supabase Auth.
export const PASSWORD_MIN = 8;

export const PASSWORD_RULES = [
  { id: "min", label: `${PASSWORD_MIN}+ caracteres`, missing: "al menos 8 caracteres" },
  { id: "lower", label: "minúscula", missing: "una minúscula" },
  { id: "upper", label: "MAYÚSCULA", missing: "una mayúscula" },
  { id: "digit", label: "número", missing: "un número" },
  { id: "symbol", label: "símbolo", missing: "un símbolo" },
] as const;

export type PasswordRuleId = (typeof PASSWORD_RULES)[number]["id"];

const CHECKS: Record<PasswordRuleId, (p: string) => boolean> = {
  min: (p) => p.length >= PASSWORD_MIN,
  lower: (p) => /[a-z]/.test(p),
  upper: (p) => /[A-Z]/.test(p),
  digit: (p) => /[0-9]/.test(p),
  symbol: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/.test(p),
};

export function passwordChecks(password: string): Record<PasswordRuleId, boolean> {
  return {
    min: CHECKS.min(password),
    lower: CHECKS.lower(password),
    upper: CHECKS.upper(password),
    digit: CHECKS.digit(password),
    symbol: CHECKS.symbol(password),
  };
}

// Mensaje en español con lo que falta, o undefined si cumple todo.
export function passwordComplexityError(password: string) {
  const checks = passwordChecks(password);
  const missing = PASSWORD_RULES.filter((r) => !checks[r.id]).map((r) => r.missing);
  if (missing.length === 0) return undefined;
  return `La contraseña necesita ${missing.join(", ")}.`;
}

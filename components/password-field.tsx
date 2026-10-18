"use client";

import { useId, useState } from "react";

import { PASSWORD_RULES, passwordChecks } from "@/lib/password";

type Props = {
  label?: string;
  name?: string;
  error?: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  // Pista de complejidad en vivo (registro y nueva clave; no en login).
  showRules?: boolean;
};

export default function PasswordField({
  label = "Contraseña",
  name = "password",
  error,
  autoComplete,
  minLength,
  showRules,
}: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const checks = passwordChecks(value);

  return (
    <div className={"field" + (error ? " has-error" : "")}>
      <label htmlFor={id}>{label}</label>
      <div className="pw-wrap">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder="••••••••"
          autoComplete={autoComplete}
          minLength={minLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? `${id}-err` : null, showRules ? `${id}-rules` : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          onChange={showRules ? (e) => setValue(e.target.value) : undefined}
          required
        />
        <button
          type="button"
          className="pw-toggle"
          aria-pressed={visible}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? "OCULTAR" : "MOSTRAR"}
        </button>
      </div>
      {showRules && (
        <ul id={`${id}-rules`} className="pw-rules" aria-label="Requisitos de la contraseña">
          {PASSWORD_RULES.map((r) => (
            <li key={r.id} className={checks[r.id] ? "ok" : undefined}>
              <span className="sr-only">{checks[r.id] ? "Cumplido: " : "Falta: "}</span>
              {r.label}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <div id={`${id}-err`} className="field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

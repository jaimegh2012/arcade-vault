"use client";

import { useId, useState } from "react";

type Props = {
  label?: string;
  name?: string;
  error?: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
};

export default function PasswordField({
  label = "Contraseña",
  name = "password",
  error,
  autoComplete,
  minLength,
}: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);

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
          aria-describedby={error ? `${id}-err` : undefined}
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
      {error && (
        <div id={`${id}-err`} className="field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

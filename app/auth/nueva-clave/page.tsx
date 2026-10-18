"use client";

import { useActionState } from "react";
import Link from "next/link";

import { updatePassword, type AuthState } from "@/app/auth/actions";
import PasswordField from "@/components/password-field";

const INITIAL: AuthState = { ok: false };

export default function NuevaClavePage() {
  const [state, action, pending] = useActionState(updatePassword, INITIAL);

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">NUEVA CONTRASEÑA</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ELIGE UNA CLAVE DE 8 CARACTERES O MÁS
          </div>
        </div>

        <form action={action}>
          {state.error && (
            <div className="auth-alert" role="alert">
              {state.error}{" "}
              <Link href="/auth" className="auth-link" style={{ display: "inline", padding: 0 }}>
                Ir a iniciar sesión
              </Link>
            </div>
          )}
          <PasswordField
            label="Contraseña nueva"
            autoComplete="new-password"
            error={state.fieldErrors?.password}
            showRules
          />
          <button
            className="btn lg"
            type="submit"
            disabled={pending}
            style={{ width: "100%", marginTop: 8 }}
          >
            {pending ? "GUARDANDO…" : "GUARDAR Y ENTRAR"}
          </button>
        </form>
      </div>
    </div>
  );
}

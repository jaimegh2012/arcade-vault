"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";

import {
  requestPasswordReset,
  signIn,
  signInWithOAuth,
  signUp,
  type AuthState,
  type OAuthProvider,
} from "@/app/auth/actions";
import PasswordField from "@/components/password-field";

type View = "in" | "up" | "reset";

const INITIAL: AuthState = { ok: false };

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <div id={id} className="field-error" role="alert">
      {message}
    </div>
  );
}

function GeneralError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="auth-alert" role="alert">
      {message}
    </div>
  );
}

function SignInForm({ onReset }: { onReset: () => void }) {
  const [state, action, pending] = useActionState(signIn, INITIAL);
  const [email, setEmail] = useState("");

  return (
    <form action={action}>
      <GeneralError message={state.error} />
      <div className="field">
        <label htmlFor="in-email">Correo electrónico</label>
        <input
          id="in-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jugador@vault.gg"
          autoComplete="email"
          required
        />
      </div>
      <PasswordField autoComplete="current-password" />
      <button
        className="btn lg"
        type="submit"
        disabled={pending}
        style={{ width: "100%", marginTop: 8 }}
      >
        {pending ? "CONECTANDO…" : "ENTRAR AL VAULT"}
      </button>
      <button type="button" className="auth-link" onClick={onReset}>
        ¿Olvidaste tu contraseña?
      </button>
    </form>
  );
}

function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, INITIAL);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action}>
      <GeneralError message={state.error} />
      <div className={"field" + (errors.username ? " has-error" : "")}>
        <label htmlFor="up-username">Usuario</label>
        <input
          id="up-username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="px_kai"
          autoComplete="username"
          maxLength={12}
          aria-invalid={errors.username ? true : undefined}
          aria-describedby={errors.username ? "up-username-err" : undefined}
          required
        />
        <FieldError id="up-username-err" message={errors.username} />
      </div>
      <div className={"field" + (errors.email ? " has-error" : "")}>
        <label htmlFor="up-email">Correo electrónico</label>
        <input
          id="up-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jugador@vault.gg"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "up-email-err" : undefined}
          required
        />
        <FieldError id="up-email-err" message={errors.email} />
      </div>
      <PasswordField autoComplete="new-password" error={errors.password} showRules />
      <button
        className="btn lg"
        type="submit"
        disabled={pending}
        style={{ width: "100%", marginTop: 8 }}
      >
        {pending ? "CONECTANDO…" : "CREAR Y JUGAR"}
      </button>
    </form>
  );
}

function ResetForm({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState(requestPasswordReset, INITIAL);
  const [email, setEmail] = useState("");
  const emailError = state.fieldErrors?.email;

  return (
    <form action={action}>
      <p className="auth-sub">
        Escribe tu correo y te enviaremos un enlace para elegir una contraseña nueva.
      </p>
      {state.ok && (
        <div className="auth-notice" role="status">
          Si existe una cuenta con ese correo, recibirás un mensaje con el enlace.
        </div>
      )}
      <GeneralError message={state.error} />
      <div className={"field" + (emailError ? " has-error" : "")}>
        <label htmlFor="reset-email">Correo electrónico</label>
        <input
          id="reset-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jugador@vault.gg"
          autoComplete="email"
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "reset-email-err" : undefined}
          required
        />
        <FieldError id="reset-email-err" message={emailError} />
      </div>
      <button
        className="btn lg"
        type="submit"
        disabled={pending}
        style={{ width: "100%", marginTop: 8 }}
      >
        {pending ? "ENVIANDO…" : "ENVIAR ENLACE"}
      </button>
      <button type="button" className="auth-link" onClick={onBack}>
        Volver a iniciar sesión
      </button>
    </form>
  );
}

export default function AuthView({ oauthError }: { oauthError: boolean }) {
  const [view, setView] = useState<View>("in");
  const [oauthMessage, setOauthMessage] = useState<string | null>(
    oauthError ? "No se pudo iniciar sesión con el proveedor. Inténtalo de nuevo." : null,
  );
  const [oauthPending, startOAuth] = useTransition();

  const goOAuth = (provider: OAuthProvider) => {
    setOauthMessage(null);
    startOAuth(async () => {
      // En éxito la action redirige al proveedor; solo regresa si hubo error.
      const res = await signInWithOAuth(provider);
      if (res?.error) setOauthMessage(res.error);
    });
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            {view === "reset" ? "RECUPERAR CONTRASEÑA" : "ACCESO AL SISTEMA · v2.6"}
          </div>
        </div>

        {view !== "reset" && (
          <div className="auth-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={view === "in"}
              className={view === "in" ? "on" : ""}
              onClick={() => setView("in")}
            >
              INICIAR SESIÓN
            </button>
            <button
              role="tab"
              aria-selected={view === "up"}
              className={view === "up" ? "on" : ""}
              onClick={() => setView("up")}
            >
              CREAR CUENTA
            </button>
          </div>
        )}

        {oauthMessage && view !== "reset" && <GeneralError message={oauthMessage} />}

        {view === "in" && <SignInForm onReset={() => setView("reset")} />}
        {view === "up" && <SignUpForm />}
        {view === "reset" && <ResetForm onBack={() => setView("in")} />}

        {view !== "reset" && (
          <>
            <Link
              className="btn ghost"
              href="/"
              style={{ width: "100%", marginTop: 10, textAlign: "center" }}
            >
              JUGAR COMO INVITADO
            </Link>

            <div className="auth-divider">O CONTINÚA CON</div>
            <div className="social">
              <button
                className="btn ghost"
                type="button"
                disabled={oauthPending}
                onClick={() => goOAuth("google")}
              >
                ◆ GOOGLE
              </button>
              <button
                className="btn ghost"
                type="button"
                disabled={oauthPending}
                onClick={() => goOAuth("github")}
              >
                ▣ GITHUB
              </button>
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}

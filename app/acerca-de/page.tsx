"use client";

import { useActionState, useState, type FormEvent } from "react";
import HighlightIcon, { type HighlightKind } from "@/components/highlight-icon";
import { useReveal } from "@/hooks/use-reveal";
import { sendContact, type ContactState } from "./actions";

const HIGHLIGHTS: { i: HighlightKind; t: string; c: string }[] = [
  { i: "HEART", t: "HECHO CON ❤️ PARA JUGADORES", c: "magenta" },
  { i: "BROWSER", t: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", c: "cyan" },
  { i: "PLANT", t: "PROYECTO EN CONSTANTE CRECIMIENTO", c: "green" },
];

const EMPTY_FORM = { name: "", email: "", msg: "" };

const IDLE: ContactState = { status: "idle" };

function ContactForm({ onReset }: { onReset: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const [state, formAction, pending] = useActionState(
    async (prev: ContactState, formData: FormData) => {
      const next = await sendContact(prev, formData);
      if (next.status === "error") {
        setForm(next.fields);
        triggerShake();
      }
      return next;
    },
    IDLE,
  );

  // Validación de cliente: campos vacíos → shake sin llamar al servidor
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      e.preventDefault();
      triggerShake();
    }
  };

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
    >
      {state.status !== "success" ? (
        <>
          <div className="field">
            <label htmlFor="name">NOMBRE</label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label htmlFor="email">CORREO ELECTRÓNICO</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label htmlFor="msg">MENSAJE</label>
            <textarea
              id="msg"
              name="msg"
              rows={5}
              value={form.msg}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          />
          {state.status === "error" && (
            <div className="terminal-success term-error fade-in" role="alert">
              <div className="term-body">
                <div className="line error">[ERROR] {state.message}</div>
              </div>
            </div>
          )}
          <button
            className="btn xl press"
            type="submit"
            disabled={pending}
            style={{ width: "100%" }}
          >
            {pending ? "ENVIANDO…" : <>▶&nbsp;&nbsp;ENVIAR MENSAJE</>}
          </button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span><span className="dot y"></span><span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line"><span className="prompt">vault@arcade:~$</span> ./send_message --to=team</div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {state.name.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button
                className="btn ghost"
                type="button"
                onClick={onReset}
              >
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

export default function AcercaDe() {
  useReveal();
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="about fade-in">
      {/* ABOUT */}
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
        <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra misión es preservar y celebrar
          los arcades que definieron una generación, haciéndolos accesibles para todos, en cualquier lugar
          y sin costo.
        </p>

        <div className="highlight-row">
          {HIGHLIGHTS.map((h, i) => (
            <div key={h.i} className={"highlight " + h.c} style={{ transitionDelay: i * 80 + "ms" }}>
              <HighlightIcon kind={h.i} />
              <div className="hl-text pixel">{h.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* divider banner */}
      <div className="about-divider reveal" aria-hidden="true">
        <div className="div-bar"></div>
        <div className="div-pixels">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} style={{ animationDelay: i * 80 + "ms" }}></span>
          ))}
        </div>
        <div className="div-bar"></div>
      </div>

      {/* CONTACT */}
      <section className="about-contact reveal">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
            <h2 className="contact-title">CONTÁCTANOS</h2>
            <p className="contact-sub">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente quieres saludar?
              Escríbenos.
            </p>
            <div className="contact-tips">
              <div className="tip"><span className="tip-led"></span>RESPUESTA EN 24-48H</div>
              <div className="tip"><span className="tip-led y"></span>SUGERENCIAS BIENVENIDAS</div>
              <div className="tip"><span className="tip-led m"></span>SIN SPAM, JAMÁS</div>
            </div>
          </div>

          <ContactForm key={formKey} onReset={() => setFormKey((k) => k + 1)} />
        </div>
      </section>
    </div>
  );
}

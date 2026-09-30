"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { setUser as persistUser, useUser } from "@/lib/session";

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const user = useUser();

  const isActive = (name: "inicio" | "biblioteca" | "salon" | "about" | "auth") => {
    if (name === "inicio") return pathname === "/";
    if (name === "biblioteca") return pathname.startsWith("/biblioteca") || pathname.startsWith("/juegos");
    if (name === "salon") return pathname.startsWith("/salon");
    if (name === "about") return pathname.startsWith("/acerca-de");
    return pathname.startsWith("/auth");
  };

  const handleSignOut = () => {
    persistUser(null);
  };

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={() => setOpen(false)}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isActive("inicio") ? "active" : ""}>
            Inicio
          </Link>
          <Link href="/biblioteca" className={isActive("biblioteca") ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/salon" className={isActive("salon") ? "active" : ""}>
            Salón de la Fama
          </Link>
          <Link href="/acerca-de" className={isActive("about") ? "active" : ""}>
            Acerca de
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={handleSignOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={() => setOpen(false)}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link
          href="/"
          className={isActive("inicio") ? "active" : ""}
          onClick={() => setOpen(false)}
        >
          Inicio
        </Link>
        <Link
          href="/biblioteca"
          className={isActive("biblioteca") ? "active" : ""}
          onClick={() => setOpen(false)}
        >
          Biblioteca
        </Link>
        <Link
          href="/salon"
          className={isActive("salon") ? "active" : ""}
          onClick={() => setOpen(false)}
        >
          Salón de la Fama
        </Link>
        <Link
          href="/acerca-de"
          className={isActive("about") ? "active" : ""}
          onClick={() => setOpen(false)}
        >
          Acerca de
        </Link>
        <Link
          href="/auth"
          className={isActive("auth") ? "active" : ""}
          onClick={() => setOpen(false)}
        >
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { syncSession, useUser } from "@/lib/session";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const user = useUser();

  // Tras navegar (login/registro/logout hechos por Server Action) se resincroniza la sesión.
  useEffect(() => {
    void syncSession();
  }, [pathname]);

  // Dropdown de usuario: se cierra con clic fuera o Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const isActive = (name: "inicio" | "biblioteca" | "salon" | "about" | "auth") => {
    if (name === "inicio") return pathname === "/";
    if (name === "biblioteca")
      return pathname.startsWith("/biblioteca") || pathname.startsWith("/juegos");
    if (name === "salon") return pathname.startsWith("/salon");
    if (name === "about") return pathname.startsWith("/acerca-de");
    return pathname.startsWith("/auth");
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    setOpen(false);
    startSignOut(async () => {
      await signOut();
      await syncSession();
      router.refresh();
    });
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
          <div className="user-menu" ref={menuRef}>
            <button
              className="btn ghost auth-btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {user.name} ▾
            </button>
            {menuOpen && (
              <div className="user-menu-list" role="menu">
                <button role="menuitem" onClick={handleSignOut} disabled={signingOut} autoFocus>
                  {signingOut ? "SALIENDO…" : "CERRAR SESIÓN"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">
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
        {user ? (
          <>
            <div className="panel-user">{user.name}</div>
            <button className="panel-signout" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? "Saliendo…" : "Cerrar sesión"}
            </button>
          </>
        ) : (
          <Link
            href="/auth"
            className={isActive("auth") ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            Iniciar Sesión
          </Link>
        )}
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

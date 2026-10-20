"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Total de especies en PokeAPI; al pasarlo se vuelve al #1
const TOTAL = 1025;

const artwork = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

export default function PokemonCounter() {
  const [count, setCount] = useState(1);
  const [named, setNamed] = useState<{ id: number; name: string } | null>(null);

  const id = ((count - 1) % TOTAL) + 1;

  // El nombre llega de PokeAPI; si falla, queda solo el número de Pokédex
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { name: string }) => setNamed({ id, name: data.name }))
      .catch(() => {});
    return () => ctrl.abort();
  }, [id]);

  const name = named?.id === id ? named.name : null;

  return (
    <section className="poke-counter fade-in">
      <div className="poke-screen">
        <div className="poke-count pixel neon-yellow" aria-live="polite">
          {count}
        </div>
        <div className="poke-art">
          <Image
            key={id}
            src={artwork(id)}
            alt={name ?? `Pokémon número ${id}`}
            width={475}
            height={475}
            sizes="(max-width: 600px) 70vw, 320px"
            priority
            unoptimized
          />
        </div>
        <div className="poke-name">
          <span className="poke-dex">#{String(id).padStart(4, "0")}</span>
          <span className="poke-label">{name ?? "…"}</span>
        </div>
      </div>

      <div className="poke-actions">
        <button className="btn xl press" type="button" onClick={() => setCount((n) => n + 1)}>
          +1
        </button>
        <button className="btn ghost" type="button" onClick={() => setCount(1)}>
          Reiniciar
        </button>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState, type JSX } from "react";
import Image from "next/image";

// Total de especies en PokeAPI; al pasarlo se vuelve al #1
const TOTAL = 1025;

type Species = { id: number; name: string };

function artworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

// Convierte el contador (1, 2, 3…) en número de Pokédex, volviendo al #1 tras TOTAL
function toDexId(count: number): number {
  return ((count - 1) % TOTAL) + 1;
}

export default function PokemonCounter(): JSX.Element {
  const [count, setCount] = useState(1);
  const [species, setSpecies] = useState<Species | null>(null);

  const id = toDexId(count);
  // Solo se muestra el nombre si corresponde al Pokémon actual
  const name = species?.id === id ? species.name : null;

  // El nombre llega de PokeAPI; si falla, queda solo el número de Pokédex
  useEffect(() => {
    const controller = new AbortController();

    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<{ name: string }>;
      })
      .then((data) => setSpecies({ id, name: data.name }))
      .catch(() => {});

    return () => controller.abort();
  }, [id]);

  return (
    <section className="poke-counter fade-in">
      <div className="poke-screen">
        <div className="poke-count pixel neon-yellow" aria-live="polite">
          {count}
        </div>
        <div className="poke-art">
          <Image
            key={id}
            src={artworkUrl(id)}
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

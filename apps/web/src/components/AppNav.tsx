"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./AppNav.module.css";

export function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const login = query.trim();
    if (login) router.push(`/participant/${encodeURIComponent(login)}`);
  }

  return (
    <nav className={styles.nav} aria-label="Primary">
      <Link className={styles.brand} href="/card">S21 STAT CARD</Link>
      <div className={styles.links}>
        <Link className={pathname.startsWith("/card") ? styles.active : undefined} href="/card">My Card</Link>
        <Link className={pathname.startsWith("/browse") ? styles.active : undefined} href="/browse">Browse</Link>
      </div>
      <form className={styles.search} onSubmit={handleSearch} role="search">
        <input
          aria-label="Search by exact login"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Exact login..."
          autoComplete="off"
          enterKeyHint="search"
        />
        <button className="clip-small" type="submit">Search</button>
      </form>
    </nav>
  );
}

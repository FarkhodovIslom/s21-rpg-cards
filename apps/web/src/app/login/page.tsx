"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, describeError, login } from "@/lib/api";
import styles from "./login.module.css";

function ExpiredNotice() {
  const searchParams = useSearchParams();
  if (!searchParams.has("expired")) return null;
  return (
    <p className={styles.expired} role="status">
      Your session has expired — sign in again.
    </p>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await login(loginValue.trim(), password);
      setPassword("");
      router.replace("/card");
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) {
        setError("Login yoki parol xato");
      } else if (caught instanceof ApiError) {
        setError(describeError(caught));
      } else {
        setError("Unable to sign in. Try again.");
      }
    } finally {
      setPassword("");
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={`${styles.panel} clip-outer`} aria-labelledby="login-title">
        <div className={`${styles.panelInner} clip-inner`}>
          <p className={styles.eyebrow}>SCHOOL 21 // CHARACTER ARCHIVE</p>
          <h1 id="login-title">Enter the archive</h1>
          <p className={styles.intro}>Sign in with your School 21 account to reveal your stat card.</p>
          <Suspense fallback={null}>
            <ExpiredNotice />
          </Suspense>
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label} htmlFor="login">Login</label>
            <input id="login" value={loginValue} onChange={(event) => setLoginValue(event.target.value)} autoComplete="username" required />
            <label className={styles.label} htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button className={`${styles.submit} clip-small`} type="submit" disabled={pending}>
              {pending ? "Opening archive..." : "Open stat card"}
            </button>
          </form>
          <p className={styles.note}>Your password is used only for authentication and is never stored in the browser.</p>
        </div>
      </section>
    </main>
  );
}

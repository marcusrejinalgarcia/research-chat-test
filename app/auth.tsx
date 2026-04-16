"use client";

import { FormEvent, useState, useTransition } from "react";
import { signInMock } from "./actions/auth";
import { Chat } from "./chat";
import { useAuthStore } from "./store/auth";

export function Auth() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      await signInMock(email);
      login(email.trim() || "you@example.com");
    });
  }

  if (isLoggedIn) {
    return <Chat />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-6 py-12 text-[#15171f]">
      <section className="w-full max-w-sm">
        <div className="mb-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-normal text-[#5b6270]">
            AI Research Chat UI Demo
          </p>
          <h1 className="text-4xl font-semibold tracking-normal">
            Sign in to continue
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#343946]">
              Email
            </span>
            <input
              className="h-12 w-full rounded-lg border border-[#cfd4df] bg-white px-4 text-base outline-none transition focus:border-[#1d6bff] focus:ring-4 focus:ring-[#1d6bff]/15"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#343946]">
              Password
            </span>
            <input
              className="h-12 w-full rounded-lg border border-[#cfd4df] bg-white px-4 text-base outline-none transition focus:border-[#1d6bff] focus:ring-4 focus:ring-[#1d6bff]/15"
              type="password"
              placeholder="********"
            />
          </label>

          <button
            className="h-12 w-full rounded-lg bg-[#15171f] px-4 text-base font-semibold text-white transition hover:bg-[#2b2f3a] focus:outline-none focus:ring-4 focus:ring-[#15171f]/20 disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

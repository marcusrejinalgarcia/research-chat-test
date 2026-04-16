"use server";

import { cookies } from "next/headers";

export async function signInMock(email: string) {
  const cookieStore = await cookies();
  const userEmail = email.trim() || "you@example.com";

  cookieStore.set({
    name: "mock-auth",
    value: "logged-in",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  cookieStore.set({
    name: "mock-user-email",
    value: userEmail,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function signOutMock() {
  const cookieStore = await cookies();

  cookieStore.delete("mock-auth");
  cookieStore.delete("mock-user-email");
}

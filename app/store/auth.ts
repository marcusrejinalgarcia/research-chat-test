"use client";

import { create } from "zustand";

type AuthState = {
  email: string;
  isLoggedIn: boolean;
  login: (email: string) => void;
  logout: () => void;
  setLoggedIn: (isLoggedIn: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  email: "",
  isLoggedIn: false,
  login: (email) => set({ email, isLoggedIn: true }),
  logout: () => set({ email: "", isLoggedIn: false }),
  setLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
}));

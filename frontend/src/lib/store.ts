import { create } from "zustand";
import { api } from "./api";

interface AuthState {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: any) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: (token: string, user: any) => {
    api.setToken(token);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    api.clearToken();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    const token = api.getToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      api.clearToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

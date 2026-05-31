"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface User {
  fullName: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<string | null>;
  logout: () => Promise<void>;
  signInWithOtp: (email: string) => Promise<string | null>;
  verifySignInOtp: (email: string, token: string) => Promise<string | null>;
  updateProfile: (fullName: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "sizzling_hub_user";

let supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!supabase) supabase = createClient();
  return supabase;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check Supabase session
  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabase();

        const {
          data: { session },
        } = await sb.auth.getSession();
        if (session?.user) {
          const { data: profile } = await sb
            .from("profiles")
            .select("full_name, role")
            .eq("id", session.user.id)
            .maybeSingle();
          const fullName =
            profile?.full_name ||
            (session.user.user_metadata?.full_name as string) ||
            session.user.email ||
            "";
          setUser({
            fullName,
            email: session.user.email || "",
            role: (profile?.role as string) || "customer",
          });
        }
      } catch {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) setUser(JSON.parse(stored));
        } catch {
          // ignore
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!email.trim()) return "Email is required.";
      if (!password) return "Password is required.";

      const sb = getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials"))
          return "Incorrect email or password. Please try again.";
        if (error.message.includes("Email not confirmed"))
          return "Please confirm your email before logging in.";
        return error.message;
      }

      if (data.session?.user) {
        const { data: profile } = await sb
          .from("profiles")
          .select("full_name, role")
          .eq("id", data.session.user.id)
          .maybeSingle();
        const fullName = profile?.full_name || (data.session.user.user_metadata?.full_name as string) || data.session.user.email || "";
        const u: User = {
          fullName,
          email: data.session.user.email || "",
          role: (profile?.role as string) || "customer",
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        setUser(u);
      }
      return null;
    },
    []
  );

  const register = useCallback(
    async (
      fullName: string,
      email: string,
      password: string,
      confirmPassword: string
    ): Promise<string | null> => {
      if (!fullName.trim()) return "Full name is required.";
      if (!email.trim()) return "Email is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return "Please enter a valid email address.";
      if (password.length < 8)
        return "Password must be at least 8 characters long.";
      if (!/[A-Z]/.test(password))
        return "Password must contain at least one uppercase letter.";
      if (!/[a-z]/.test(password))
        return "Password must contain at least one lowercase letter.";
      if (!/[0-9]/.test(password))
        return "Password must contain at least one number.";
      if (!/[^A-Za-z0-9]/.test(password))
        return "Password must contain at least one special character.";
      if (password !== confirmPassword) return "Passwords do not match.";

      const sb = getSupabase();

      const { data: profile } = await sb
          .from("profiles")
          .select("*")
          .eq("email", email.trim())
          .maybeSingle();

      if (profile) {
        return "An account with this email already exists.";
      }

      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });

      if (error) {
        return error.message;
      }

      // If email confirmation is off (dev), auto-login
      if (data.session?.user) {
        const u: User = {
          fullName: fullName.trim(),
          email: data.session.user.email || email.toLowerCase(),
          role: "customer",
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        setUser(u);
        return null;
      }

      return "check-email";
    },
    []
  );

  const logout = useCallback(async () => {
    const sb = getSupabase();
    await sb.auth.signOut();
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (fullName: string): Promise<string | null> => {
      if (!fullName.trim()) return "Name cannot be empty.";

      const sb = getSupabase();
      const {
        data: { session },
      } = await sb.auth.getSession();

      if (!session?.user) return "You must be logged in.";

      const { error } = await sb
        .from("profiles")
        .update({
          full_name: fullName.trim(),
        })
        .eq("id", session.user.id);

      if (error) return error.message;

      const updated: User = {
        fullName: fullName.trim(),
        email: session.user.email || user?.email || "",
        role: user?.role || "customer",
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setUser(updated);
      return null;
    },
    [user?.email]
  );

  const signInWithOtp = useCallback(
    async (email: string): Promise<string | null> => {
      if (!email.trim()) return "Please enter your email address.";

      const sb = getSupabase();
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });

      if (error) {
        if (error.message.includes("User not found"))
          return "No account found with this email.";
        return error.message;
      }
      return null;
    },
    []
  );

  const verifySignInOtp = useCallback(
    async (email: string, token: string): Promise<string | null> => {
      if (!email.trim()) return "Email is required.";
      if (!token.trim() || token.length !== 8) return "Please enter a valid 8-digit code.";

      const sb = getSupabase();
      const { data, error } = await sb.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (error) {
        if (error.message.includes("expired"))
          return "Code has expired. Please request a new one.";
        if (error.message.includes("Invalid"))
          return "Invalid code. Please try again.";
        return error.message;
      }

      if (data?.session?.user) {
        const { data: profile } = await sb
          .from("profiles")
          .select("full_name, role")
          .eq("id", data.session.user.id)
          .maybeSingle();
        const fullName =
          profile?.full_name ||
          (data.session.user.user_metadata?.full_name as string) ||
          data.session.user.email ||
          "";
        const u: User = {
          fullName,
          email: data.session.user.email || "",
          role: (profile?.role as string) || "customer",
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        setUser(u);
      }
      return null;
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        signInWithOtp,
        verifySignInOtp,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
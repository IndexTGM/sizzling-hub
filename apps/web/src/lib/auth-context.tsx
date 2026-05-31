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
  isRecovery: boolean;
  isResetFlow: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<string | null>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  sendOtp: (email: string) => Promise<string | null>;
  verifyOtp: (email: string, token: string) => Promise<string | null>;
  updatePassword: (newPassword: string) => Promise<string | null>;
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
  const [isRecovery, setIsRecovery] = useState(false);
  const [isResetFlow, setIsResetFlow] = useState(false);

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

  const updatePassword = useCallback(
    async (newPassword: string): Promise<string | null> => {
      if (!newPassword || newPassword.length < 8)
        return "Password must be at least 8 characters long.";
      if (!/[A-Z]/.test(newPassword))
        return "Password must contain at least one uppercase letter.";
      if (!/[a-z]/.test(newPassword))
        return "Password must contain at least one lowercase letter.";
      if (!/[0-9]/.test(newPassword))
        return "Password must contain at least one number.";
      if (!/[^A-Za-z0-9]/.test(newPassword))
        return "Password must contain at least one special character.";

      const sb = getSupabase();
      const { error } = await sb.auth.updateUser({ password: newPassword });

      if (error) return error.message;

      // Password updated — reload session to get user data
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (session?.user) {
        const fullName =
          (session.user.user_metadata?.full_name as string) ||
          session.user.email ||
          "";
        const u: User = {
          fullName,
          email: session.user.email || "",
          role: user?.role || "customer",
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        setUser(u);
        setIsRecovery(false);
        setIsResetFlow(false);
      }
      return null;
    },
    []
  );

  const sendOtp = useCallback(
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

  const verifyOtp = useCallback(
    async (email: string, token: string): Promise<string | null> => {
      if (!email.trim()) return "Email is required.";
      if (!token.trim() || token.length !== 6) return "Please enter a valid 6-digit code.";

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
        setIsResetFlow(true);
        // Don't set user — let RecoveryForm handle it after password update
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
        // Fetch full_name from profiles table (joins on auth.users.id)
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
        return null; // logged in immediately
      }

      // Email confirmation required — return success message
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

      // Update existing profile row
      const { error } = await sb
        .from("profiles")
        .update({
          full_name: fullName.trim(),
        })
        .eq("id", session.user.id);

      if (error) return error.message;

      // Update local state
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

  const resetPassword = useCallback(
    async (email: string): Promise<string | null> => {
      if (!email.trim()) return "Please enter your email address.";

      const sb = getSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/`,
      });

      if (error) {
        if (error.message.includes("User not found"))
          return "No account found with this email.";
        return error.message;
      }

      return null; // success
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isRecovery,
        isResetFlow,
        login,
        register,
        logout,
        resetPassword,
        sendOtp,
        verifyOtp,
        updatePassword,
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
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
import * as companyEmailValidator from 'company-email-validator';

function isValidEmail(email: string): boolean {
  return !companyEmailValidator.isCompanyEmail(email);
}

function validatePhone(phone?: string): string | null {
  if (!phone || !phone.trim()) return "Phone number is required.";
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  if (cleaned.length < 7) return "Phone number is too short.";
  if (cleaned.length > 15) return "Phone number is too long.";
  if (!/^\+?\d+$/.test(cleaned)) return "Phone number can only contain digits and a leading +.";
  return null;
}

export interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  phone?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  register: (
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    confirmPassword: string,
    phone: string
  ) => Promise<string | null>;
  logout: () => Promise<void>;
  signInWithOtp: (email: string) => Promise<string | null>;
  verifySignInOtp: (email: string, token: string) => Promise<string | null>;
  updateProfile: (username: string, firstName: string, lastName: string, phone?: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "sizzling_hub_user";

let supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!supabase) supabase = createClient();
  return supabase;
}

function buildUser(
  id: string,
  sessionUser: { email?: string; user_metadata?: Record<string, unknown> },
  profile?: { username?: string; first_name?: string; last_name?: string; role?: string; phone?: string | null } | null
): User {
  return {
    id,
    username:
      profile?.username ||
      (sessionUser.user_metadata?.username as string) ||
      sessionUser.email?.split("@")[0] ||
      "",
    first_name:
      profile?.first_name ||
      (sessionUser.user_metadata?.first_name as string) ||
      "",
    last_name:
      profile?.last_name ||
      (sessionUser.user_metadata?.last_name as string) ||
      "",
    email: sessionUser.email || "",
    role: (profile?.role as string) || "customer",
    phone: profile?.phone ?? (sessionUser.user_metadata?.phone as string) ?? null,
  };
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
            .select("username, first_name, last_name, role, phone")
            .eq("id", session.user.id)
            .maybeSingle();
          const u = buildUser(session.user.id, session.user, profile);
          setUser(u);
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
    async (username: string, password: string): Promise<string | null> => {
      if (!username.trim()) return "Username is required.";
      if (!password) return "Password is required.";

      const sb = getSupabase();

      // Look up email by username via RPC (bypasses RLS)
      const { data: email } = await sb.rpc("get_email_by_username", {
        p_username: username.trim().toLowerCase(),
      });

      if (!email) return "Incorrect username or password. Please try again.";

      const { data, error } = await sb.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials"))
          return "Incorrect username or password. Please try again.";
        if (error.message.includes("Email not confirmed"))
          return "Please confirm your email before logging in.";
        return error.message;
      }

      if (data.session?.user) {
        const { data: fullProfile } = await sb
          .from("profiles")
          .select("username, first_name, last_name, role, phone")
          .eq("id", data.session.user.id)
          .maybeSingle();
        const u = buildUser(data.session.user.id, data.session.user, fullProfile);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        setUser(u);
      }
      return null;
    },
    []
  );

  const register = useCallback(
    async (
      username: string,
      firstName: string,
      lastName: string,
      email: string,
      password: string,
      confirmPassword: string,
      phone: string,
    ): Promise<string | null> => {
      if (!username.trim()) return "Username is required.";
      if (username.trim().length < 3)
        return "Username must be at least 3 characters.";
      if (!/^[a-zA-Z0-9_]+$/.test(username.trim()))
        return "Username can only contain letters, numbers, and underscores.";
      if (!firstName.trim()) return "First name is required.";
      if (!lastName.trim()) return "Last name is required.";
      if (!email.trim()) return "Email is required.";
      if (!isValidEmail(email))
        return "Please enter a valid email address.";
      const phoneErr = validatePhone(phone);
      if (phoneErr) return phoneErr;
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
      const usernameLower = username.trim().toLowerCase();
      const phoneClean = phone.trim();

      // Check if username is taken
      const { data: existingUsername } = await sb
        .from("profiles")
        .select("id")
        .eq("username", usernameLower)
        .maybeSingle();

      if (existingUsername) return "That username is already taken.";

      // Check if email is taken
      const { data: existingEmail } = await sb
        .from("profiles")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (existingEmail) return "An account with this email already exists.";

      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: usernameLower,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phoneClean,
          },
        },
      });

      if (error) {
        return error.message;
      }

      // If email confirmation is off (dev), auto-login
      if (data.session?.user) {
        const u: User = {
          id: data.session.user.id,
          username: usernameLower,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: data.session.user.email || email.toLowerCase(),
          role: "customer",
          phone: phoneClean,
        };
        // Update profile with phone
        await sb.from("profiles").update({ phone: phoneClean }).eq("id", u.id);
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
    async (username: string, firstName: string, lastName: string, phone?: string): Promise<string | null> => {
      if (!username.trim()) return "Username cannot be empty.";
      if (!firstName.trim()) return "First name cannot be empty.";
      if (!lastName.trim()) return "Last name cannot be empty.";
      const phoneErr = validatePhone(phone);
      if (phoneErr) return phoneErr;

      const sb = getSupabase();
      const {
        data: { session },
      } = await sb.auth.getSession();

      if (!session?.user) return "You must be logged in.";

      const usernameLower = username.trim().toLowerCase();
      const phoneClean = phone?.trim() || null;

      // Check if username is taken by someone else
      const { data: existing } = await sb
        .from("profiles")
        .select("id")
        .eq("username", usernameLower)
        .neq("id", session.user.id)
        .maybeSingle();

      if (existing) return "That username is already taken.";

      const updateData: Record<string, unknown> = {
        username: usernameLower,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      };
      if (phoneClean !== undefined) {
        updateData.phone = phoneClean;
      }

      const { error } = await sb
        .from("profiles")
        .update(updateData)
        .eq("id", session.user.id);

      if (error) return error.message;

      // Re-fetch the full profile from DB to get the authoritative role
      const { data: freshProfile } = await sb
        .from("profiles")
        .select("username, first_name, last_name, role, phone")
        .eq("id", session.user.id)
        .maybeSingle();

      const updated = buildUser(session.user.id, session.user, freshProfile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setUser(updated);
      return null;
    },
    [user]
  );

  const signInWithOtp = useCallback(
    async (email: string): Promise<string | null> => {
      if (!email.trim()) return "Please enter your email address.";
      if (!isValidEmail(email)) return "Please enter a valid email address.";

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
        const { data: profile } = await sb
          .from("profiles")
          .select("username, first_name, last_name, role, phone")
          .eq("id", data.session.user.id)
          .maybeSingle();
        const u = buildUser(data.session.user.id, data.session.user, profile);
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
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

export interface User {
  id: string;
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
  resetPassword: (email: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await loadProfile(session.user.id, session.user.email || "");
        }
      } catch {
        // not logged in
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadProfile(userId: string, fallbackEmail: string) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", userId)
      .maybeSingle();
    setUser({
      id: userId,
      fullName: profile?.full_name || fallbackEmail.split("@")[0],
      email: fallbackEmail,
      role: (profile?.role as string) || "customer",
    });
  }

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!email.trim()) return "Email is required.";
      if (!password) return "Password is required.";

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials"))
          return "Incorrect email or password. Please try again.";
        return error.message;
      }

      if (data.session?.user) {
        await loadProfile(data.session.user.id, email);
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
      if (password !== confirmPassword) return "Passwords do not match.";

      const { data: existing } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email.trim())
        .maybeSingle();

      if (existing) {
        return "An account with that email already exists.";
      }

      const { data, error } = await supabase.auth.signUp({
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
        await loadProfile(data.session.user.id, email);
        return null;
      }

      return "check-email";
    },
    []
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const resetPassword = useCallback(
    async (email: string): Promise<string | null> => {
      if (!email.trim()) return "Please enter your email address.";
      // Backend not implemented yet
      return null;
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, resetPassword }}
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
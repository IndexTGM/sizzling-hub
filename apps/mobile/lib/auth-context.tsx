import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import * as companyEmailValidator from "company-email-validator";

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  register: (
    username: string,
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<string | null>;
  logout: () => Promise<void>;
  signInWithOtp: (email: string) => Promise<string | null>;
  verifySignInOtp: (email: string, token: string) => Promise<string | null>;
  updateProfile: (username: string, fullName: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function isValidEmail(email: string): boolean {
  return !companyEmailValidator.isCompanyEmail(email);
}

function buildUser(
  id: string,
  sessionUser: { email?: string; user_metadata?: Record<string, unknown> },
  profile?: { username?: string; full_name?: string; role?: string } | null
): User {
  return {
    id,
    username:
      profile?.username ||
      (sessionUser.user_metadata?.username as string) ||
      sessionUser.email?.split("@")[0] ||
      "",
    fullName:
      profile?.full_name ||
      (sessionUser.user_metadata?.full_name as string) ||
      sessionUser.email ||
      "",
    email: sessionUser.email || "",
    role: (profile?.role as string) || "customer",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, full_name, role")
            .eq("id", session.user.id)
            .maybeSingle();
          setUser(buildUser(session.user.id, session.user, profile));
        }
      } catch {
        // not logged in
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      if (!username.trim()) return "Username is required.";
      if (!password) return "Password is required.";

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", username.trim().toLowerCase())
        .maybeSingle();

      if (!profile?.email) return "No account found with that username.";

      const { data, error } = await supabase.auth.signInWithPassword({
        email: profile.email,
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
        const { data: fullProfile } = await supabase
          .from("profiles")
          .select("username, full_name, role")
          .eq("id", data.session.user.id)
          .maybeSingle();
        setUser(buildUser(data.session.user.id, data.session.user, fullProfile));
      }
      return null;
    },
    []
  );

  const register = useCallback(
    async (
      username: string,
      fullName: string,
      email: string,
      password: string,
      confirmPassword: string
    ): Promise<string | null> => {
      if (!username.trim()) return "Username is required.";
      if (username.trim().length < 3)
        return "Username must be at least 3 characters.";
      if (!/^[a-zA-Z0-9_]+$/.test(username.trim()))
        return "Username can only contain letters, numbers, and underscores.";
      if (!fullName.trim()) return "Full name is required.";
      if (!email.trim()) return "Email is required.";
      if (!isValidEmail(email)) return "Please enter a valid email address.";
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

      const usernameLower = username.trim().toLowerCase();

      const { data: existingUsername } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", usernameLower)
        .maybeSingle();
      if (existingUsername) return "That username is already taken.";

      const { data: existingEmail } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();
      if (existingEmail) return "An account with this email already exists.";

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: usernameLower,
            full_name: fullName.trim(),
          },
        },
      });

      if (error) return error.message;

      if (data.session?.user) {
        setUser({
          id: data.session.user.id,
          username: usernameLower,
          fullName: fullName.trim(),
          email: data.session.user.email || email.toLowerCase(),
          role: "customer",
        });
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

  const signInWithOtp = useCallback(
    async (email: string): Promise<string | null> => {
      if (!email.trim()) return "Please enter your email address.";
      if (!isValidEmail(email)) return "Please enter a valid email address.";

      const { error } = await supabase.auth.signInWithOtp({
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
      if (!token.trim() || token.length !== 6)
        return "Please enter a valid 6-digit code.";

      const { data, error } = await supabase.auth.verifyOtp({
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
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, full_name, role")
          .eq("id", data.session.user.id)
          .maybeSingle();
        setUser(buildUser(data.session.user.id, data.session.user, profile));
      }
      return null;
    },
    []
  );

  const updateProfile = useCallback(
    async (username: string, fullName: string): Promise<string | null> => {
      if (!username.trim()) return "Username cannot be empty.";
      if (!fullName.trim()) return "Name cannot be empty.";

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return "You must be logged in.";

      const usernameLower = username.trim().toLowerCase();

      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", usernameLower)
        .neq("id", session.user.id)
        .maybeSingle();
      if (existing) return "That username is already taken.";

      const { error } = await supabase
        .from("profiles")
        .update({
          username: usernameLower,
          full_name: fullName.trim(),
        })
        .eq("id", session.user.id);
      if (error) return error.message;

      setUser({
        id: session.user.id,
        username: usernameLower,
        fullName: fullName.trim(),
        email: session.user.email || user?.email || "",
        role: user?.role || "customer",
      });
      return null;
    },
    [user]
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
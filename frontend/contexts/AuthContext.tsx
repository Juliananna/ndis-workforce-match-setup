import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import backend from "~backend/client";

interface User {
  userId: string;
  email: string;
  role: string;
  isVerified: boolean;
  isAdmin: boolean;
  isSysAdmin: boolean;
  isComplianceOfficer: boolean;
  isSalesAgent: boolean;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("ndis_token"));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async (t: string) => {
    try {
      const data = await backend.with({ auth: async () => ({ authorization: `Bearer ${t}` }) }).users.me();
      setUser({
        userId: data.userId,
        email: data.email,
        role: data.role,
        isVerified: data.isVerified,
        isAdmin: data.isAdmin,
        isSysAdmin: data.isSysAdmin,
        isComplianceOfficer: data.isComplianceOfficer,
        isSalesAgent: data.isSalesAgent,
      });
    } catch {
      localStorage.removeItem("ndis_token");
      setToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMe(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (newToken: string) => {
    localStorage.setItem("ndis_token", newToken);
    setToken(newToken);
    await fetchMe(newToken);
  };

  const logout = () => {
    localStorage.removeItem("ndis_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

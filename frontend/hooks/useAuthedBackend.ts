import { useMemo } from "react";
import backend from "~backend/client";
import { useAuth } from "../contexts/AuthContext";

export function useAuthedBackend() {
  const { token } = useAuth();
  return useMemo(() => {
    if (!token) return null;
    return backend.with({ auth: async () => ({ authorization: `Bearer ${token}` }) });
  }, [token]);
}

import { useAuth } from "../contexts/AuthContext";

export function useWorkerAuth() {
  const auth = useAuth();
  const isWorker = auth.user?.role === "WORKER";
  return { ...auth, isWorker };
}

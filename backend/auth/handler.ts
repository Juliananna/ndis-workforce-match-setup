import { APIError, Gateway, Header } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { verifyToken } from "./jwt";

interface AuthParams {
  authorization?: Header<"Authorization">;
}

export interface AuthData {
  userID: string;
  email: string;
  role: string;
}

export const auth = authHandler<AuthParams, AuthData>(async (params) => {
  const token = params.authorization?.replace("Bearer ", "");
  if (!token) {
    throw APIError.unauthenticated("missing token");
  }
  try {
    const payload = await verifyToken(token);
    return {
      userID: payload.userID,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    throw APIError.unauthenticated("invalid or expired token");
  }
});

export const gateway = new Gateway({ authHandler: auth });

import { SignJWT, jwtVerify } from "jose";
import { secret } from "encore.dev/config";

const jwtSecret = secret("JwtSecret");

export interface TokenPayload {
  userID: string;
  email: string;
  role: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  const key = new TextEncoder().encode(jwtSecret());
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const key = new TextEncoder().encode(jwtSecret());
  const { payload } = await jwtVerify(token, key);
  return {
    userID: payload["userID"] as string,
    email: payload["email"] as string,
    role: payload["role"] as string,
  };
}

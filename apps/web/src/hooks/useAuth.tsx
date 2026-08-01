import { BrowserProvider } from "ethers";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { NetworkId } from "@sahaj/shared-types";
import { authApi, type AuthSession } from "../api/endpoints";
import { configureApiAuth } from "../api/client";

interface AuthUser {
  id: string;
  address: string;
  email: string | null;
  role: "user" | "admin";
}

interface AuthContextValue {
  user: AuthUser | null;
  connecting: boolean;
  error: string | null;
  connectAndSignIn: () => Promise<void>;
  signOut: () => void;
  getSigner: () => Promise<import("ethers").JsonRpcSigner>;
}

const STORAGE_KEY = "sahaj.session";
const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: AuthSession | null): void {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<string | null> => {
    const current = readStoredSession();
    if (!current) return null;
    try {
      const next = await authApi.refresh(current.refreshToken);
      writeStoredSession(next);
      setSession(next);
      return next.accessToken;
    } catch {
      writeStoredSession(null);
      setSession(null);
      return null;
    }
  }, []);

  useEffect(() => {
    configureApiAuth(
      () => readStoredSession()?.accessToken ?? null,
      () => refresh(),
    );
  }, [refresh]);

  const getSigner = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("No wallet extension found. Install MetaMask or another EVM wallet to continue.");
    }
    const provider = new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    return provider.getSigner();
  }, []);

  const connectAndSignIn = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const signer = await getSigner();
      const address = await signer.getAddress();
      const networkId: NetworkId = "arc";

      const { nonce } = await authApi.requestNonce(address, networkId);
      const message = `Sign this message to authenticate with Sahaj Wallet.\n\nNonce:${nonce}`;
      const signature = await signer.signMessage(message);

      const newSession = await authApi.verify(address, nonce, signature, networkId);
      writeStoredSession(newSession);
      setSession(newSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect wallet");
    } finally {
      setConnecting(false);
    }
  }, [getSigner]);

  const signOut = useCallback(() => {
    const current = readStoredSession();
    if (current) authApi.logout(current.refreshToken).catch(() => undefined);
    writeStoredSession(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      connecting,
      error,
      connectAndSignIn,
      signOut,
      getSigner,
    }),
    [session, connecting, error, connectAndSignIn, signOut, getSigner],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

import type { NetworkConfig, NetworkId, TokenBalance } from "@sahaj/shared-types";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { walletApi } from "../api/endpoints";
import { useAuth } from "./useAuth";

interface BalanceEntry {
  native: TokenBalance;
  usdc: TokenBalance;
  loading: boolean;
  error: string | null;
}

interface NetworkContextValue {
  networks: NetworkConfig[];
  activeNetwork: NetworkConfig | null;
  setActiveNetworkId: (id: NetworkId) => void;
  balances: Partial<Record<NetworkId, BalanceEntry>>;
  refreshBalance: (networkId: NetworkId) => Promise<void>;
  refreshAllBalances: () => Promise<void>;
  loadingNetworks: boolean;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [networks, setNetworks] = useState<NetworkConfig[]>([]);
  const [activeNetworkId, setActiveNetworkId] = useState<NetworkId | null>(null);
  const [balances, setBalances] = useState<Partial<Record<NetworkId, BalanceEntry>>>({});
  const [loadingNetworks, setLoadingNetworks] = useState(true);

  useEffect(() => {
    walletApi
      .listNetworks()
      .then(({ networks: list }) => {
        setNetworks(list);
        const defaultNetwork = list.find((n) => n.isDefault) ?? list[0];
        if (defaultNetwork) setActiveNetworkId(defaultNetwork.id);
      })
      .finally(() => setLoadingNetworks(false));
  }, []);

  const refreshBalance = useCallback(
    async (networkId: NetworkId) => {
      if (!user) return;
      setBalances((prev) => ({
        ...prev,
        [networkId]: { ...(prev[networkId] ?? {}), loading: true, error: null } as BalanceEntry,
      }));
      try {
        const { native, usdc } = await walletApi.getBalance(networkId, user.address);
        setBalances((prev) => ({ ...prev, [networkId]: { native, usdc, loading: false, error: null } }));
      } catch (err) {
        setBalances((prev) => ({
          ...prev,
          [networkId]: {
            ...(prev[networkId] ?? ({} as BalanceEntry)),
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load balance",
          },
        }));
      }
    },
    [user],
  );

  const refreshAllBalances = useCallback(async () => {
    await Promise.all(networks.map((n) => refreshBalance(n.id)));
  }, [networks, refreshBalance]);

  useEffect(() => {
    if (user && networks.length > 0) {
      refreshAllBalances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, networks.length]);

  const activeNetwork = useMemo(() => networks.find((n) => n.id === activeNetworkId) ?? null, [networks, activeNetworkId]);

  const value: NetworkContextValue = {
    networks,
    activeNetwork,
    setActiveNetworkId: (id) => setActiveNetworkId(id),
    balances,
    refreshBalance,
    refreshAllBalances,
    loadingNetworks,
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetworks(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetworks must be used within NetworkProvider");
  return ctx;
}

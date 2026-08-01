import { useMemo } from "react";
import { useNetworks } from "../hooks/useNetworks";
import "./BalanceHero.css";

/**
 * The page's thesis: one number, the total USDC a user controls right now,
 * regardless of which chain it happens to sit on. Everything else on the
 * dashboard exists to explain or act on this figure.
 */
export function BalanceHero() {
  const { networks, balances, loadingNetworks, refreshAllBalances } = useNetworks();

  const total = useMemo(() => {
    return networks.reduce((sum, network) => {
      const entry = balances[network.id];
      if (!entry || entry.error) return sum;
      return sum + Number(entry.usdc.formatted || 0);
    }, 0);
  }, [networks, balances]);

  const anyLoading = networks.some((n) => balances[n.id]?.loading);

  return (
    <section className="hero surface">
      <div className="hero__top">
        <span className="text-muted hero__eyebrow">Total USDC · every network</span>
        <button className="btn btn-ghost hero__refresh" onClick={() => refreshAllBalances()} disabled={loadingNetworks || anyLoading}>
          {anyLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <div className="hero__amount display mono">
        {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
        <span className="hero__symbol">USDC</span>
      </div>
      <p className="text-muted hero__hint">Balances settle instantly on Arc — other networks reflect on-chain state directly.</p>
    </section>
  );
}

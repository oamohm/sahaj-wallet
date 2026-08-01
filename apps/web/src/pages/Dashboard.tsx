import { useState } from "react";
import { Link } from "react-router-dom";
import type { NetworkConfig } from "@sahaj/shared-types";
import { useAuth } from "../hooks/useAuth";
import { useNetworks } from "../hooks/useNetworks";
import { ConnectButton } from "../components/ConnectButton";
import { NetworkRail } from "../components/NetworkRail";
import { BalanceHero } from "../components/BalanceHero";
import { NetworkCard } from "../components/NetworkCard";
import { SendModal } from "../components/SendModal";
import { FaucetModal } from "../components/FaucetModal";
import "./Dashboard.css";

export function Dashboard() {
  const { user } = useAuth();
  const { networks, activeNetwork, setActiveNetworkId, loadingNetworks } = useNetworks();
  const [sendTarget, setSendTarget] = useState<NetworkConfig | null>(null);
  const [faucetTarget, setFaucetTarget] = useState<NetworkConfig | null>(null);

  if (!user) return null;

  return (
    <div className="dashboard">
      <header className="dashboard__nav">
        <span className="display dashboard__brand">Sahaj Wallet</span>
        <nav className="dashboard__navlinks">
          <Link className="btn btn-ghost" to="/stake">
            Stake
          </Link>
          <Link className="btn btn-ghost" to="/rewards">
            Rewards
          </Link>
          <ConnectButton />
        </nav>
      </header>

      {loadingNetworks ? (
        <p className="text-muted">Loading networks…</p>
      ) : (
        <>
          <NetworkRail networks={networks} activeId={activeNetwork?.id ?? null} onSelect={setActiveNetworkId} />
          <BalanceHero />

          <section className="dashboard__grid">
            {networks.map((network) => (
              <NetworkCard
                key={network.id}
                network={network}
                isActive={network.id === activeNetwork?.id}
                onSelect={() => setActiveNetworkId(network.id)}
                onSend={() => setSendTarget(network)}
                onFaucet={() => setFaucetTarget(network)}
              />
            ))}
          </section>
        </>
      )}

      {sendTarget && <SendModal network={sendTarget} onClose={() => setSendTarget(null)} />}
      {faucetTarget && <FaucetModal network={faucetTarget} onClose={() => setFaucetTarget(null)} />}
    </div>
  );
}

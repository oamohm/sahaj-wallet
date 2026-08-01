import type { NetworkConfig } from "@sahaj/shared-types";
import { useNetworks } from "../hooks/useNetworks";
import "./NetworkCard.css";

interface NetworkCardProps {
  network: NetworkConfig;
  isActive: boolean;
  onSelect: () => void;
  onSend: () => void;
  onFaucet: () => void;
}

export function NetworkCard({ network, isActive, onSelect, onSend, onFaucet }: NetworkCardProps) {
  const { balances } = useNetworks();
  const entry = balances[network.id];

  return (
    <article className={`ncard surface${isActive ? " ncard--active" : ""}`} onClick={onSelect}>
      <header className="ncard__head">
        <div>
          <h3 className="display ncard__name">{network.displayName}</h3>
          <span className="text-muted ncard__chain">chain {network.chainId}</span>
        </div>
        {network.isTestnet && <span className="ncard__pill">testnet</span>}
      </header>

      <div className="ncard__balances">
        <div>
          <span className="text-muted ncard__label">USDC</span>
          <div className="mono ncard__value">
            {entry?.loading ? "…" : entry?.error ? "—" : (entry?.usdc.formatted ?? "0")}
          </div>
        </div>
        <div>
          <span className="text-muted ncard__label">{network.nativeCurrency.symbol}</span>
          <div className="mono ncard__value ncard__value--muted">
            {entry?.loading ? "…" : entry?.error ? "—" : (entry?.native.formatted ?? "0")}
          </div>
        </div>
      </div>

      {entry?.error && <p className="ncard__error">{entry.error}</p>}

      <footer className="ncard__actions">
        <button
          className="btn btn-primary"
          onClick={(e) => {
            e.stopPropagation();
            onSend();
          }}
        >
          Send
        </button>
        {network.isTestnet && (
          <button
            className="btn"
            onClick={(e) => {
              e.stopPropagation();
              onFaucet();
            }}
          >
            Get test funds
          </button>
        )}
        <a
          className="btn btn-ghost ncard__explorer"
          href={network.explorerUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          Explorer ↗
        </a>
      </footer>
    </article>
  );
}

import { useState } from "react";
import type { NetworkConfig } from "@sahaj/shared-types";
import { faucetApi, type FaucetResult } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import "./Modal.css";

interface FaucetModalProps {
  network: NetworkConfig;
  onClose: () => void;
}

export function FaucetModal({ network, onClose }: FaucetModalProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<FaucetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function claim() {
    setStatus("loading");
    setError(null);
    try {
      const res = await faucetApi.request(network.id as "arc" | "giwa", user!.address);
      setResult(res);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Faucet request failed");
      setStatus("error");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal surface" onClick={(e) => e.stopPropagation()}>
        <header className="modal__head">
          <h2 className="display">Get test funds — {network.displayName}</h2>
          <button className="btn btn-ghost modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <p className="text-muted">
          We'll ask the official {network.displayName} faucet to send testnet tokens to your connected address
          <span className="mono"> {user.address.slice(0, 8)}…{user.address.slice(-6)}</span>. Limited to one claim per 24 hours.
        </p>

        {status === "idle" && (
          <button className="btn btn-primary" onClick={claim}>
            Request test funds
          </button>
        )}

        {status === "loading" && <p className="text-muted">Contacting the faucet…</p>}

        {status === "done" && result && (
          <div className={`faucet-result faucet-result--${result.mode}`}>
            <p>{result.message}</p>
            {result.mode === "manual" && result.faucetUrl && (
              <a className="btn btn-primary" href={result.faucetUrl} target="_blank" rel="noreferrer">
                Open official faucet ↗
              </a>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="faucet-result faucet-result--manual">
            <p>{error}</p>
            {network.faucetUrl && (
              <a className="btn btn-primary" href={network.faucetUrl} target="_blank" rel="noreferrer">
                Open official faucet ↗
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

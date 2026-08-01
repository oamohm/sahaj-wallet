import { useState } from "react";
import type { NetworkConfig } from "@sahaj/shared-types";
import { useAuth } from "../hooks/useAuth";
import { useNetworks } from "../hooks/useNetworks";
import { walletApi } from "../api/endpoints";
import { sendUsdcExternal } from "../lib/sendUsdc";
import "./Modal.css";

interface SendModalProps {
  network: NetworkConfig;
  onClose: () => void;
}

type Route = "external" | "circle";
type Status = "idle" | "signing" | "broadcasting" | "recording" | "done" | "error";

export function SendModal({ network, onClose }: SendModalProps) {
  const { getSigner } = useAuth();
  const { refreshBalance } = useNetworks();
  const [route, setRoute] = useState<Route>("external");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [circleWalletId, setCircleWalletId] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(toAddress);
  const isValidAmount = /^\d+(\.\d+)?$/.test(amount) && Number(amount) > 0;
  const canSubmit = isValidAddress && isValidAmount && (route === "external" || circleWalletId.trim().length > 0);

  async function submitExternal() {
    setStatus("signing");
    setError(null);
    try {
      const signer = await getSigner();
      setStatus("broadcasting");
      const hash = await sendUsdcExternal(signer, network, toAddress, amount);
      setTxHash(hash);
      setStatus("recording");
      await walletApi.recordExternalTx(network.id, hash);
      setStatus("done");
      refreshBalance(network.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setStatus("error");
    }
  }

  async function submitCircle() {
    setStatus("broadcasting");
    setError(null);
    try {
      const result = await walletApi.sendFromCircle(circleWalletId.trim(), toAddress, amount, network.id);
      setTxHash(result.id);
      setStatus("done");
      refreshBalance(network.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setStatus("error");
    }
  }

  function handleSubmit() {
    if (!canSubmit) return;
    if (route === "external") submitExternal();
    else submitCircle();
  }

  const busy = status === "signing" || status === "broadcasting" || status === "recording";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal surface" onClick={(e) => e.stopPropagation()}>
        <header className="modal__head">
          <h2 className="display">Send USDC — {network.displayName}</h2>
          <button className="btn btn-ghost modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {status !== "done" && (
          <>
            <div className="route-toggle">
              <button
                className={`btn ${route === "external" ? "route-toggle__active" : ""}`}
                onClick={() => setRoute("external")}
                disabled={busy}
              >
                My wallet
              </button>
              <button
                className={`btn ${route === "circle" ? "route-toggle__active" : ""}`}
                onClick={() => setRoute("circle")}
                disabled={busy}
              >
                Circle wallet
              </button>
            </div>
            <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
              {route === "external"
                ? "You sign in your own wallet (MetaMask). We never see your private key — only the resulting transaction."
                : "Sent instantly from your Circle-managed wallet. No gas, no signing prompt."}
            </p>

            {route === "circle" && (
              <div className="field">
                <label htmlFor="circleWalletId">Circle wallet ID</label>
                <input
                  id="circleWalletId"
                  value={circleWalletId}
                  onChange={(e) => setCircleWalletId(e.target.value)}
                  placeholder="From your linked Circle wallets"
                  disabled={busy}
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="toAddress">Recipient address</label>
              <input
                id="toAddress"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="0x…"
                disabled={busy}
              />
            </div>

            <div className="field">
              <label htmlFor="amount">Amount (USDC)</label>
              <input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" disabled={busy} />
            </div>

            {error && <p className="send-error">{error}</p>}

            <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit || busy}>
              {status === "signing" && "Confirm in wallet…"}
              {status === "broadcasting" && "Broadcasting…"}
              {status === "recording" && "Verifying…"}
              {status === "idle" || status === "error" ? `Send ${amount || ""} USDC`.trim() : null}
            </button>
          </>
        )}

        {status === "done" && (
          <div className="send-result">
            <p>Transaction submitted successfully.</p>
            {txHash && route === "external" && (
              <a className="btn btn-primary" href={`${network.explorerUrl}/tx/${txHash}`} target="_blank" rel="noreferrer">
                View on explorer ↗
              </a>
            )}
            {txHash && route === "circle" && <p className="mono text-muted">Transfer ID: {txHash}</p>}
            <button className="btn" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

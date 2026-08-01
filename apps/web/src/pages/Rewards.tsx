import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { rewardApi, type RewardClaimItem, type RewardEventItem } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { useNetworks } from "../hooks/useNetworks";
import "./Rewards.css";

const REWARD_TYPE_LABEL: Record<string, string> = {
  task_completion: "Task completed",
  campaign_bonus: "Campaign bonus",
  referral: "Referral bonus",
  manual_grant: "Bonus grant",
};

export function Rewards() {
  const { user } = useAuth();
  const { networks, activeNetwork } = useNetworks();
  const [balance, setBalance] = useState<{ claimableUsdc: string; totalUsdcEarned: string; totalUsdcClaimed: string } | null>(null);
  const [history, setHistory] = useState<RewardEventItem[]>([]);
  const [claims, setClaims] = useState<RewardClaimItem[]>([]);
  const [destination, setDestination] = useState(user?.address ?? "");
  const [networkId, setNetworkId] = useState(activeNetwork?.id ?? "arc");
  const [amount, setAmount] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [b, h, c] = await Promise.all([rewardApi.getBalance(), rewardApi.getHistory(1, 25), rewardApi.listClaims()]);
    setBalance(b);
    setHistory(h.items);
    setClaims(c.claims);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(destination);
  const isValidAmount = /^\d+(\.\d+)?$/.test(amount) && Number(amount) > 0 && (!balance || Number(amount) <= Number(balance.claimableUsdc));

  async function handleClaim() {
    if (!isValidAddress || !isValidAmount) return;
    setClaiming(true);
    setClaimError(null);
    try {
      await rewardApi.claim(amount, networkId, destination);
      setAmount("");
      await loadAll();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard__nav">
        <span className="display dashboard__brand">Sahaj Wallet</span>
        <Link className="btn btn-ghost" to="/">
          ← Back to wallet
        </Link>
      </header>
      <div className="rewards">
      <section className="rewards__balance surface">
        <span className="text-muted rewards__eyebrow">Claimable rewards</span>
        <div className="display mono rewards__amount">{loading ? "…" : (balance?.claimableUsdc ?? "0")} USDC</div>
        <div className="rewards__subrow text-muted">
          <span>Earned: <span className="mono">{balance?.totalUsdcEarned ?? "0"}</span></span>
          <span>Claimed: <span className="mono">{balance?.totalUsdcClaimed ?? "0"}</span></span>
        </div>
      </section>

      <section className="rewards__claim surface">
        <h3 className="display">Claim to a wallet</h3>
        <div className="field">
          <label htmlFor="claim-network">Network</label>
          <select id="claim-network" value={networkId} onChange={(e) => setNetworkId(e.target.value as typeof networkId)}>
            {networks.map((n) => (
              <option key={n.id} value={n.id}>
                {n.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="claim-dest">Destination address</label>
          <input id="claim-dest" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="0x…" />
        </div>
        <div className="field">
          <label htmlFor="claim-amount">Amount (USDC)</label>
          <input id="claim-amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        {claimError && <p className="send-error">{claimError}</p>}
        <button className="btn btn-primary" onClick={handleClaim} disabled={!isValidAddress || !isValidAmount || claiming}>
          {claiming ? "Submitting…" : "Claim"}
        </button>
      </section>

      <section className="rewards__list surface">
        <h3 className="display">Reward history</h3>
        {history.length === 0 && !loading && <p className="text-muted">No rewards earned yet — complete a campaign task to start earning.</p>}
        <ul className="rewards__events">
          {history.map((event) => (
            <li key={event.id} className="rewards__event">
              <div>
                <span className="rewards__event-type">{REWARD_TYPE_LABEL[event.type] ?? event.type}</span>
                <span className="text-muted rewards__event-date">{new Date(event.createdAt).toLocaleDateString()}</span>
              </div>
              <span className="mono rewards__event-amount">
                +{event.usdcAmount} USDC{event.xpAmount > 0 && <span className="text-muted"> · +{event.xpAmount} XP</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rewards__list surface">
        <h3 className="display">Claim status</h3>
        {claims.length === 0 && !loading && <p className="text-muted">No claims submitted yet.</p>}
        <ul className="rewards__events">
          {claims.map((claim) => (
            <li key={claim.id} className="rewards__event">
              <div>
                <span className={`rewards__status rewards__status--${claim.status}`}>{claim.status}</span>
                <span className="text-muted rewards__event-date">{new Date(claim.createdAt).toLocaleDateString()}</span>
              </div>
              <span className="mono rewards__event-amount">{claim.usdcAmount} USDC · {claim.networkId}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
    </div>
  );
}

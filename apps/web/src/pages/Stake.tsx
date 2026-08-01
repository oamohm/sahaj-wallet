import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { stakeApi, walletApi, type StakePosition, type StakeTerm } from "../api/endpoints";
import { useNetworks } from "../hooks/useNetworks";
import "./Stake.css";

interface CircleWalletOption {
  id: string;
  networkId: string;
  address: string;
}

export function Stake() {
  const { networks } = useNetworks();
  const [terms, setTerms] = useState<StakeTerm[]>([]);
  const [positions, setPositions] = useState<StakePosition[]>([]);
  const [circleWallets, setCircleWallets] = useState<CircleWalletOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [sourceWalletId, setSourceWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [lockDays, setLockDays] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const [termsRes, positionsRes, walletsRes] = await Promise.all([
      stakeApi.getTerms(),
      stakeApi.list(),
      walletApi.listMine(),
    ]);
    setTerms(termsRes.terms);
    setPositions(positionsRes.positions);
    setCircleWallets(walletsRes.wallets.filter((w) => w.provider === "circle"));
    if (!lockDays && termsRes.terms.length > 0) setLockDays(termsRes.terms[0]!.lockDays);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTerm = terms.find((t) => t.lockDays === lockDays);
  const projectedYield = useMemo(() => {
    if (!selectedTerm || !amount || Number(amount) <= 0) return null;
    const yieldAmount = ((Number(amount) * selectedTerm.apyBps) / 10_000) * (selectedTerm.lockDays / 365);
    return yieldAmount.toFixed(6);
  }, [selectedTerm, amount]);

  const isValidAmount = /^\d+(\.\d+)?$/.test(amount) && Number(amount) > 0;
  const canSubmit = isValidAmount && sourceWalletId && lockDays !== null;

  async function handleStake() {
    if (!canSubmit || lockDays === null) return;
    const wallet = circleWallets.find((w) => w.id === sourceWalletId);
    if (!wallet) return;

    setSubmitting(true);
    setError(null);
    try {
      await stakeApi.create(wallet.networkId as never, sourceWalletId, amount, lockDays);
      setAmount("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Staking failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw(positionId: string) {
    setWithdrawingId(positionId);
    setError(null);
    try {
      await stakeApi.withdraw(positionId);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setWithdrawingId(null);
    }
  }

  function networkName(id: string) {
    return networks.find((n) => n.id === id)?.displayName ?? id;
  }

  return (
    <div className="dashboard">
      <header className="dashboard__nav">
        <span className="display dashboard__brand">Sahaj Wallet</span>
        <Link className="btn btn-ghost" to="/">
          ← Back to wallet
        </Link>
      </header>

      <div className="stake">
        <section className="stake__intro surface">
          <span className="text-muted stake__eyebrow">Fixed-term USDC yield · testnet demo</span>
          <h2 className="display">Stake USDC, earn a predictable return</h2>
          <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>
            Lock USDC from a Circle-managed wallet for a fixed term at a fixed, published APY. This is a testnet
            demonstration funded by the platform treasury — not a live lending market.
          </p>
        </section>

        <section className="stake__form surface">
          <h3 className="display">New stake</h3>

          {circleWallets.length === 0 && !loading && (
            <p className="text-muted">
              You need a Circle-managed wallet first — create one from the wallet dashboard, then come back here.
            </p>
          )}

          {circleWallets.length > 0 && (
            <>
              <div className="field">
                <label htmlFor="stake-wallet">Circle wallet</label>
                <select id="stake-wallet" value={sourceWalletId} onChange={(e) => setSourceWalletId(e.target.value)}>
                  <option value="">Select a wallet…</option>
                  {circleWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {networkName(w.networkId)} · {w.address.slice(0, 8)}…{w.address.slice(-6)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="stake-amount">Amount (USDC)</label>
                <input id="stake-amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>

              <div className="stake__terms">
                {terms.map((term) => (
                  <button
                    key={term.lockDays}
                    className={`btn stake__term${lockDays === term.lockDays ? " stake__term--active" : ""}`}
                    onClick={() => setLockDays(term.lockDays)}
                  >
                    {term.lockDays}d · {(term.apyBps / 100).toFixed(2)}% APY
                  </button>
                ))}
              </div>

              {projectedYield && (
                <p className="stake__preview mono">
                  Projected yield: <strong>{projectedYield} USDC</strong> over {lockDays} days
                </p>
              )}

              {error && <p className="send-error">{error}</p>}

              <button className="btn btn-primary" onClick={handleStake} disabled={!canSubmit || submitting}>
                {submitting ? "Locking funds…" : "Stake"}
              </button>
            </>
          )}
        </section>

        <section className="stake__list surface">
          <h3 className="display">Your positions</h3>
          {positions.length === 0 && !loading && <p className="text-muted">No stakes yet.</p>}
          <ul className="stake__positions">
            {positions.map((p) => {
              const matured = new Date(p.maturesAt).getTime() <= Date.now();
              return (
                <li key={p.id} className="stake__position">
                  <div className="stake__position-main">
                    <span className={`stake__status stake__status--${p.status}`}>{p.status}</span>
                    <span className="mono">{p.principalUsdc} USDC</span>
                    <span className="text-muted">
                      {networkName(p.networkId)} · {p.lockDays}d @ {(p.apyBps / 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="stake__position-meta text-muted">
                    {p.status === "active" &&
                      (matured ? "Matured — ready to withdraw" : `Matures ${new Date(p.maturesAt).toLocaleDateString()}`)}
                    {p.status === "withdrawn" && p.yieldUsdc && `Paid out with ${p.yieldUsdc} USDC yield`}
                    {p.status === "failed" && (p.failureReason ?? "Withdrawal failed")}
                  </div>
                  {p.status === "active" && matured && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleWithdraw(p.id)}
                      disabled={withdrawingId === p.id}
                    >
                      {withdrawingId === p.id ? "Withdrawing…" : "Withdraw"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

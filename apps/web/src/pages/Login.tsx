import { useAuth } from "../hooks/useAuth";
import "./Login.css";

export function Login() {
  const { connecting, error, connectAndSignIn } = useAuth();

  return (
    <div className="login">
      <div className="login__card surface">
        <span className="text-muted login__eyebrow">Sahaj Wallet</span>
        <h1 className="display login__title">One wallet, every network.</h1>
        <p className="text-muted login__body">
          Hold, send, and earn USDC across Arc, Giwa, and the major EVM chains — starting on Arc, where USDC settles as the
          network's native asset.
        </p>
        <button className="btn btn-primary login__cta" onClick={connectAndSignIn} disabled={connecting}>
          {connecting ? "Confirm in wallet…" : "Connect wallet to continue"}
        </button>
        {error && <p className="login__error">{error}</p>}
        <p className="text-muted login__fineprint">
          We only ever ask you to sign a message to prove wallet ownership — never a transaction, never your keys.
        </p>
      </div>
    </div>
  );
}

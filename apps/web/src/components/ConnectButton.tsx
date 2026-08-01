import { useAuth } from "../hooks/useAuth";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ConnectButton() {
  const { user, connecting, error, connectAndSignIn, signOut } = useAuth();

  if (user) {
    return (
      <div className="connect">
        <span className="mono connect__address">{shortAddress(user.address)}</span>
        <button className="btn btn-ghost" onClick={signOut}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="connect">
      <button className="btn btn-primary" onClick={connectAndSignIn} disabled={connecting}>
        {connecting ? "Confirm in wallet…" : "Connect wallet"}
      </button>
      {error && <span className="connect__error">{error}</span>}
    </div>
  );
}

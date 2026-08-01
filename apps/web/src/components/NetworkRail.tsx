import type { NetworkConfig, NetworkId } from "@sahaj/shared-types";
import "./NetworkRail.css";

interface NetworkRailProps {
  networks: NetworkConfig[];
  activeId: NetworkId | null;
  onSelect: (id: NetworkId) => void;
}

/**
 * Renders every enabled network as a station on a single rail line — the
 * literal shape of "one wallet, every network." Order follows how a user
 * would actually reach for these chains (home network first, then testnets,
 * then mainnets), so position on the rail carries real meaning rather than
 * being decorative numbering.
 */
export function NetworkRail({ networks, activeId, onSelect }: NetworkRailProps) {
  const ordered = [...networks].sort((a, b) => {
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    if (a.isTestnet !== b.isTestnet) return a.isTestnet ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <div className="rail" role="tablist" aria-label="Select network">
      <div className="rail__track" aria-hidden="true" />
      <div className="rail__stations">
        {ordered.map((network) => {
          const isActive = network.id === activeId;
          return (
            <button
              key={network.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`rail__station${isActive ? " rail__station--active" : ""}`}
              onClick={() => onSelect(network.id)}
            >
              <span className="rail__dot">
                {isActive && <span className="rail__dot-pulse" aria-hidden="true" />}
              </span>
              <span className="rail__label">
                {network.displayName}
                {network.isTestnet && <span className="rail__badge">testnet</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

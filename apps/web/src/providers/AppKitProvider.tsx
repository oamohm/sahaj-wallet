import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function AppKitProvider({ children }: Props) {
  // अभी सिर्फ wrapper है। अगले step में WalletConnect/AppKit जोड़ेंगे।
  return <>{children}</>;
}

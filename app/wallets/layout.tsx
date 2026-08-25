import { WalletsFooter } from "@/components/wallets/wallets-footer";

type WalletsLayoutProps = LayoutProps<"/wallets">;

// Page chrome: fill the viewport so the footer sits under the wallet list.
export default function WalletsLayout({ children }: WalletsLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {children}
      <WalletsFooter />
    </div>
  );
}

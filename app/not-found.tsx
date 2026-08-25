import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

// Static 404 for unknown paths
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <BrandMark size="lg" />
        <p className="text-base text-muted-foreground">The page does not exist.</p>
        <Link href="/" className="text-sm text-ink underline underline-offset-4">
          Back to connect
        </Link>
      </div>
    </main>
  );
}

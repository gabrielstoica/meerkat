import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  size?: "sm" | "lg";
};

// Meerkat wordmark with a three-dot lookout mark.
export function BrandMark({ className, size = "sm" }: BrandMarkProps) {
  const isLarge = size === "lg";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 grid-cols-1 gap-1",
          isLarge ? "gap-1.5" : "gap-1"
        )}
      >
        <span className={cn("rounded-full bg-copper", isLarge ? "size-2" : "size-1.5")} />
        <span
          className={cn(
            "rounded-full bg-ink/80",
            isLarge ? "size-2 translate-x-1.5" : "size-1.5 translate-x-1"
          )}
        />
        <span className={cn("rounded-full bg-ink/45", isLarge ? "size-2" : "size-1.5")} />
      </span>
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-ink",
          isLarge ? "text-5xl md:text-6xl" : "text-xl"
        )}
      >
        Meerkat
      </span>
    </div>
  );
}

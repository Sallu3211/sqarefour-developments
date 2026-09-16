import clsx from "clsx";

/**
 * Placeholder "SD" monogram — swap for the real Squarefour Developments logo
 * from Settings > Branding once it's provided (no redeploy needed).
 */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-xl bg-slate-900 font-black text-amber-400",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      SD
    </div>
  );
}

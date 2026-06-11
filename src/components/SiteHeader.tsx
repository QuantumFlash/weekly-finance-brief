import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          <span className="text-[15px] font-semibold tracking-tight text-zinc-50">
            Weekly Finance Brief
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-6">
          <Link
            href="/issues"
            className="hidden text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100 sm:block"
          >
            Archive
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Sign in
          </Link>
          <Link
            href="/#signup"
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition-all hover:bg-emerald-300 hover:shadow-[0_0_24px_rgba(52,211,153,0.35)]"
          >
            Start free week
          </Link>
        </nav>
      </div>
    </header>
  );
}

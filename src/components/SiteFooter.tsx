import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-semibold text-zinc-200">
              Weekly Finance Brief
            </span>
          </div>
          <p className="max-w-md text-xs leading-5 text-zinc-500">
            Educational information only — never investment advice, and never a
            recommendation to buy or sell anything.
          </p>
        </div>
        <nav className="flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/issues" className="transition-colors hover:text-zinc-100">
            Archive
          </Link>
          <Link href="/account" className="transition-colors hover:text-zinc-100">
            Account
          </Link>
          <Link href="/login" className="transition-colors hover:text-zinc-100">
            Sign in
          </Link>
        </nav>
        <p className="text-xs text-zinc-600">© 2026 Weekly Finance Brief</p>
      </div>
    </footer>
  );
}

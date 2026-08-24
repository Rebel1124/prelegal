"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getEmail, isLoggedIn, logout } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/documents", label: "Documents" },
  { href: "/documents/mine", label: "My Documents" },
];

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/");
      return;
    }
    setEmail(getEmail());
  }, [router]);

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/documents" className="text-sm font-semibold text-brand-navy">
              Prelegal
            </Link>
            <nav className="flex gap-4 text-sm">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    pathname === link.href
                      ? "font-medium text-brand-blue"
                      : "text-brand-gray hover:text-brand-navy"
                  }
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {email && <span className="text-brand-gray">{email}</span>}
            <button type="button" onClick={handleLogout} className="text-brand-gray hover:text-brand-navy">
              Log out
            </button>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}

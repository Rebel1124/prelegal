"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isLoggedIn, logout } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/");
    }
  }, [router]);

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div>
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl justify-end px-4 py-2">
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Log out
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

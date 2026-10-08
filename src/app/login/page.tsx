"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Temporary: the email/password form is disabled (original saved in
// backup-login/login-page.tsx.bak). Entry is a single button on the home page.
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}

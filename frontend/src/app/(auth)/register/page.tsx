import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Create Your Account | Aethel Academy",
  description: "Join our learning community.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}

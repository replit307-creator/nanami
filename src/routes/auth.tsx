import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy auth page redirected to /login and /register.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  component: () => null,
});

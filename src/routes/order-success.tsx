import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bike, Check, MessageSquare, Sparkles } from "lucide-react";
import { buildWhatsappMessage, cleanWhatsappNumber, rupiah, useStore } from "@/lib/store";

export const Route = createFileRoute("/order-success")({
  validateSearch: (search: Record<string, unknown>): { code?: string | undefined } => ({
    code: typeof search["code"] === "string" && search["code"] ? search["code"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Order Placed — Nanami Kitchen" },
      {
        name: "description",
        content: "Your order has been placed successfully and sent to the owner's WhatsApp.",
      },
      { property: "og:title", content: "Order Placed — Nanami Kitchen" },
      {
        property: "og:description",
        content: "Your order details have been sent to WhatsApp.",
      },
    ],
  }),
  component: OrderSuccess,
});

function OrderSuccess() {
  const navigate = useNavigate();
  const { code } = Route.useSearch();
  const { orders, settings, profile } = useStore((s) => ({
    orders: s.orders,
    settings: s.settings,
    profile: s.profile,
  }));

  const order = useMemo(() => {
    if (code) {
      const found = orders.find((o) => o.code.trim().toUpperCase() === code.trim().toUpperCase());
      if (found) return found;
    }
    return orders[0] ?? null;
  }, [orders, code]);

  if (!order) {
    return (
      <div className="min-h-screen bg-neutral-950 text-foreground flex justify-center selection:bg-primary selection:text-primary-foreground">
        <div className="w-full max-w-md min-h-screen bg-background relative sm:shadow-2xl sm:border-x sm:border-border/40 px-4 pt-5 flex flex-col items-center justify-center text-center">
          <p className="text-muted-foreground">No recent order found.</p>
          <Link
            to="/"
            className="mt-4 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const targetWa = cleanWhatsappNumber(settings.whatsapp);
  const waUrl = `https://wa.me/${targetWa}?text=${encodeURIComponent(buildWhatsappMessage(order, settings))}`;

  return (
    <div className="min-h-screen bg-neutral-950 text-foreground flex justify-center selection:bg-primary selection:text-primary-foreground">
      <div className="w-full max-w-md min-h-screen bg-background relative sm:shadow-2xl sm:border-x sm:border-border/40 px-4 pt-8 pb-10 flex flex-col">
        {/* Success icon with confetti */}
        <div className="relative flex flex-col items-center pt-6 text-center">
          <div className="relative">
            <span
              aria-hidden
              className="absolute -left-10 top-2 size-2 rotate-45 rounded-sm bg-primary"
            />
            <span
              aria-hidden
              className="absolute -left-6 -top-4 size-3 rotate-12 rounded-sm bg-[oklch(0.78_0.14_85)]"
            />
            <span
              aria-hidden
              className="absolute -right-8 top-0 size-2 -rotate-12 rounded-full bg-primary"
            />
            <span
              aria-hidden
              className="absolute -right-5 -top-5 size-2.5 rotate-45 rounded-sm bg-[oklch(0.65_0.05_80)]"
            />
            <span
              aria-hidden
              className="absolute -left-8 top-10 size-2 -rotate-45 rounded-full bg-[oklch(0.75_0.12_95)]"
            />
            <span
              aria-hidden
              className="absolute -right-10 top-12 size-2.5 rotate-45 rounded-sm bg-primary/80"
            />

            <div className="flex size-24 sm:size-28 items-center justify-center rounded-full bg-primary shadow-[0_0_40px_-8px_var(--color-primary)]">
              <Check className="size-12 sm:size-14 text-primary-foreground" strokeWidth={3} />
            </div>
          </div>

          <h1 className="mt-6 text-2xl font-bold text-foreground sm:text-3xl">
            Order Successfully Placed!
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-sm">
            Order details and customer information are prepared for the Owner&apos;s WhatsApp (
            <span className="font-semibold text-foreground">+{targetWa}</span>).
          </p>
        </div>

        {/* Order summary card */}
        <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Order No.</span>
            <span className="font-mono text-base font-bold text-foreground">#{order.code}</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Type & Payment</span>
            <span className="text-sm font-semibold capitalize text-foreground">
              {order.type} · {order.paymentMethod}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-base text-muted-foreground">Total Amount</span>
            <span className="text-2xl font-bold text-primary">{rupiah(order.total)}</span>
          </div>
        </section>

        {/* Actions */}
        <div className="mt-auto space-y-3 pt-8">
          <Link
            to="/tracking"
            search={{ code: order.code }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md transition hover:brightness-105"
          >
            <Bike className="size-5" />
            Track Live Kitchen Status (#{order.code})
          </Link>

          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--wa),oklch(0.7_0.17_158))] py-3.5 text-sm font-bold text-wa-foreground shadow-[0_8px_24px_-8px_var(--color-wa)] transition hover:brightness-105"
          >
            <MessageSquare className="size-5" />
            Re-open Owner WhatsApp Chat
          </a>

          {profile.signedIn ? (
            <button
              onClick={() => navigate({ to: "/orders" })}
              className="w-full rounded-2xl bg-secondary py-3.5 text-sm font-bold text-foreground hover:bg-secondary/80"
            >
              View My Order History
            </button>
          ) : (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-center">
              <p className="text-xs text-muted-foreground">
                Enjoyed ordering as guest? Save your address & earn loyalty points:
              </p>
              <Link
                to="/register"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <Sparkles className="size-3.5" /> Create an Account
              </Link>
            </div>
          )}

          <Link
            to="/"
            className="flex w-full items-center justify-center rounded-2xl border border-border bg-transparent py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

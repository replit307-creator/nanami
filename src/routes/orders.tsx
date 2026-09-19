import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  buildWhatsappMessage,
  cleanWhatsappNumber,
  rupiah,
  useStore,
  type Order,
} from "@/lib/store";

const FLOW = ["Pending Payment", "Cooking", "Out for Delivery", "Completed"];
const PICKUP_FLOW = ["Pending Payment", "Cooking", "Ready for Pickup", "Completed"];

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Order Tracking — Nanami Kitchen" },
      {
        name: "description",
        content: "Track your Nanami Kitchen order from payment to cooking and delivery.",
      },
      { property: "og:title", content: "Order Tracking — Nanami Kitchen" },
      { property: "og:description", content: "Live status of your order." },
    ],
  }),
  component: Orders,
});

function Orders() {
  const orders = useStore((s) => s.orders);

  return (
    <AppShell hideCartBar>
      <h1 className="text-2xl font-bold">My orders</h1>
      {orders.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No orders yet.{" "}
          <Link to="/menu" className="text-primary">
            Start ordering
          </Link>
        </p>
      )}
      <div className="mt-4 space-y-4">
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    </AppShell>
  );
}

function OrderCard({ order }: { order: Order }) {
  const settings = useStore((s) => s.settings);
  const flow = order.type === "delivery" ? FLOW : PICKUP_FLOW;
  const index = flow.indexOf(order.status);
  const targetWa = cleanWhatsappNumber(settings.whatsapp);

  return (
    <article className="glow-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">{order.code}</p>
          <p className="text-xs capitalize text-muted-foreground">
            {order.type} · {new Date(order.createdAt).toLocaleString("id-ID")}
          </p>
        </div>
        <button
          aria-label="Send to WhatsApp Owner"
          onClick={() =>
            window.open(
              `https://wa.me/${targetWa}?text=${encodeURIComponent(buildWhatsappMessage(order, settings))}`,
              "_blank",
            )
          }
          className="flex items-center gap-1.5 rounded-xl bg-wa/15 px-2.5 py-1.5 text-xs font-bold text-wa hover:bg-wa/25 transition"
        >
          <MessageSquare className="size-3.5" />
          WhatsApp
        </button>
      </div>

      {order.status === "Cancelled" ? (
        <p className="mt-3 rounded-lg bg-destructive/15 px-3 py-2 text-xs text-destructive">
          Order cancelled
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {flow.map((step, i) => (
            <li key={step} className="flex items-center gap-2 text-xs">
              <span className={`size-2.5 rounded-full ${i <= index ? "bg-primary" : "bg-muted"}`} />
              <span className={i <= index ? "text-foreground" : "text-muted-foreground"}>
                {step}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        {(order.lines || []).map((l) => (
          <p key={l.id}>
            {l.qty}x {l.name}
            {l.optionLabels && l.optionLabels.length ? ` (${l.optionLabels.join(", ")})` : ""}
          </p>
        ))}
        <p className="pt-1 text-sm font-bold text-primary">{rupiah(order.total)}</p>
      </div>
    </article>
  );
}

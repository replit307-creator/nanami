import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/saved-address")({
  head: () => ({
    meta: [
      { title: "Saved Address — Nanami Kitchen" },
      {
        name: "description",
        content: "Choose one of your saved delivery addresses or add a new one.",
      },
      { property: "og:title", content: "Saved Address — Nanami Kitchen" },
      {
        property: "og:description",
        content: "Choose one of your saved delivery addresses or add a new one.",
      },
    ],
  }),
  component: SavedAddressPage,
});

const FALLBACK = [
  { label: "Home", address: "12 Independence Avenue, Windhoek Central, Windhoek" },
  { label: "Office", address: "45 Sam Nujoma Drive, Klein Windhoek, Windhoek" },
  { label: "Other", address: "88 Robert Mugabe Avenue, Windhoek" },
];

function labelFor(address: string, index: number) {
  if (index === 0) return "Home";
  if (index === 1) return "Office";
  return "Other";
}

function SavedAddressPage() {
  const navigate = useNavigate();
  const { addresses, current } = useStore((s) => ({
    addresses: s.profile.addresses,
    current: s.profile.address,
  }));

  const items = useMemo(
    () =>
      addresses && addresses.length > 0
        ? addresses.map((a, i) => ({ label: labelFor(a, i), address: a }))
        : FALLBACK,
    [addresses],
  );

  const [selected, setSelected] = useState(
    items.findIndex((it) => it.address === current) >= 0
      ? items.findIndex((it) => it.address === current)
      : 0,
  );

  function choose(index: number) {
    const item = items[index];
    if (!item) return;
    setSelected(index);
    actions.updateProfile({ address: item.address });
    actions.saveAddress(item.address);
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-foreground flex justify-center selection:bg-primary selection:text-primary-foreground">
      <div className="w-full max-w-md min-h-screen bg-background relative sm:shadow-2xl sm:border-x sm:border-border/40 px-4 pt-5 pb-10 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ to: "/checkout" });
              }
            }}
            aria-label="Back"
            className="text-foreground"
          >
            <ArrowLeft className="size-6" />
          </button>
          <h1 className="text-2xl font-semibold">Saved Address</h1>
        </div>

        {/* Address cards */}
        <div className="mt-6 space-y-4">
          {items.map((item, index) => {
            const active = index === selected;
            return (
              <button
                key={`${item.label}-${item.address}`}
                onClick={() => choose(index)}
                className="flex w-full items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-colors"
              >
                <MapPin
                  className={`mt-1 size-6 shrink-0 ${
                    active ? "fill-primary text-primary" : "text-muted-foreground"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-foreground">{item.label}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.address}
                  </p>
                </div>
                <span
                  aria-hidden
                  className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    active ? "border-primary" : "border-muted-foreground"
                  }`}
                >
                  {active && <span className="size-2.5 rounded-full bg-primary" />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Add new address */}
        <div className="mt-auto pt-8">
          <button
            onClick={() => navigate({ to: "/address" })}
            className="w-full rounded-2xl bg-secondary py-4 text-lg font-semibold text-secondary-foreground transition-opacity hover:opacity-90"
          >
            Add New Address
          </button>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronLeft, Clock, Flame, Heart, Minus, Plus, Share2, Star } from "lucide-react";
import {
  actions,
  rupiah,
  useStore,
  resolveMenuImage,
  handleImageError,
  type MenuItem,
} from "@/lib/store";

export const Route = createFileRoute("/menu/$itemId")({
  loader: () => null,
  head: () => ({
    meta: [
      { title: "Menu Details — Nanami Kitchen" },
      {
        name: "description",
        content:
          "Customize your dish — size, spice level and extra toppings — then add it to your cart.",
      },
      { property: "og:title", content: "Menu Details — Nanami Kitchen" },
      { property: "og:description", content: "Customize your dish and add it to your cart." },
    ],
  }),
  component: MenuDetailPage,
});

// Deterministic pseudo-rating per item so it stays stable between visits.
function ratingFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const rating = (4.5 + (h % 5) / 10).toFixed(1);
  const reviews = 80 + (h % 120);
  return { rating, reviews };
}

function MenuDetailPage() {
  const { itemId } = Route.useParams();
  const menu = useStore((s) => s.menu);
  const item = menu.find((m) => m.id === itemId) as MenuItem | undefined;
  if (!item) return <MenuDetailNotFound />;
  return <MenuDetailContent item={item} />;
}

function MenuDetailContent({ item }: { item: MenuItem }) {
  const navigate = useNavigate();
  const activeGroups = useMemo(
    () => (item.groups || []).filter((g) => g.enabled !== false),
    [item.groups],
  );

  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    activeGroups.forEach((g) => {
      init[g.id] = g.type === "single" ? [(g.choices || [])[0]?.id ?? ""] : [];
    });
    return init;
  });
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [liked, setLiked] = useState(false);

  const { unitPrice, labels } = useMemo(() => {
    let price = item.price || 0;
    const lbls: string[] = [];
    activeGroups.forEach((g) => {
      (selected[g.id] ?? []).forEach((cid) => {
        const c = (g.choices || []).find((x) => x.id === cid);
        if (c) {
          price += Number(c.price) || 0;
          lbls.push(c.name);
        }
      });
    });
    return { unitPrice: price, labels: lbls };
  }, [item, selected, activeGroups]);

  function toggle(groupId: string, type: "single" | "multi", choiceId: string) {
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (type === "single") return { ...prev, [groupId]: [choiceId] };
      return {
        ...prev,
        [groupId]: current.includes(choiceId)
          ? current.filter((c) => c !== choiceId)
          : [...current, choiceId],
      };
    });
  }

  function handleShare() {
    const text = `Check out ${item.name} at Nanami Kitchen! ${item.description || ""}`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: item.name, text, url }).catch(() => {});
    } else if (typeof window !== "undefined") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }

  const { rating, reviews } = ratingFor(item.id);
  const isSpice = (name: string) => /spic/i.test(name);
  const isSize = (name: string) => /size/i.test(name);

  return (
    <div className="min-h-screen bg-neutral-950 text-foreground flex justify-center selection:bg-primary selection:text-primary-foreground">
      <div className="w-full max-w-md min-h-screen bg-background relative sm:shadow-2xl sm:border-x sm:border-border/40 pb-32 flex flex-col">
        {/* Hero */}
        <div className="relative">
          <img
            src={resolveMenuImage(item.image)}
            alt={item.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => handleImageError(e)}
            className="h-64 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background" />
          <button
            onClick={() => navigate({ to: "/menu" })}
            aria-label="Back"
            className="absolute left-4 top-4 rounded-full bg-background/70 p-2 backdrop-blur hover:bg-background transition"
          >
            <ChevronLeft className="size-6" />
          </button>
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <button
              onClick={handleShare}
              aria-label="Share"
              className="rounded-full bg-background/70 p-2 backdrop-blur hover:bg-background transition"
            >
              <Share2 className="size-5" />
            </button>
            <button
              onClick={() => setLiked((v) => !v)}
              aria-label="Favorite"
              className="rounded-full bg-background/70 p-2 backdrop-blur hover:bg-background transition"
            >
              <Heart
                className={`size-5 transition-colors ${liked ? "fill-primary text-primary" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="space-y-6 px-4 pt-2 flex-1">
          {/* Title, price, rating */}
          <div>
            <h1 className="text-2xl font-bold">{item.name}</h1>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xl sm:text-2xl font-bold text-primary">{rupiah(item.price)}</p>
              <p className="flex items-center gap-1.5 text-sm">
                <Star className="size-4 sm:size-5 fill-primary text-primary" />
                <span className="text-base sm:text-lg font-bold">{rating}</span>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  ({reviews} reviews)
                </span>
              </p>
            </div>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>

            {/* Prep time & dietary badges */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {item.prepMinutes ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  Prep ~{item.prepMinutes} mins
                </span>
              ) : null}
              {item.badges?.map((b) => (
                <span
                  key={b}
                  className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {b}
                </span>
              ))}
            </div>

            {!item.available && (
              <p className="mt-2 text-xs sm:text-sm font-semibold text-destructive">Sold out</p>
            )}
          </div>

          {/* Option groups */}
          {activeGroups.map((g) => (
            <div key={g.id}>
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold">{g.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {g.type === "single" ? "Choose one" : "Optional"}
                </span>
              </div>

              {g.type === "single" && (isSize(g.name) || isSpice(g.name)) ? (
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
                  {g.choices.map((c) => {
                    const active = (selected[g.id] ?? []).includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggle(g.id, g.type, c.id)}
                        className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-3 sm:p-4 text-left transition-colors ${
                          active ? "border-primary bg-primary/10" : "border-border bg-secondary/40"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {isSpice(g.name) ? (
                            <span className="flex">
                              {Array.from({
                                length: c.id === "mild" ? 1 : c.id === "medium" ? 2 : 3,
                              }).map((_, i) => (
                                <Flame
                                  key={i}
                                  className={`size-3.5 sm:size-4 ${
                                    c.id === "hot"
                                      ? "fill-destructive text-destructive"
                                      : "fill-primary text-primary"
                                  }`}
                                />
                              ))}
                            </span>
                          ) : (
                            <span
                              className={`flex size-4 sm:size-5 items-center justify-center rounded-full border-2 ${
                                active ? "border-primary" : "border-muted-foreground/50"
                              }`}
                            >
                              {active && (
                                <span className="size-2 sm:size-2.5 rounded-full bg-primary" />
                              )}
                            </span>
                          )}
                          <span className="text-xs sm:text-sm font-semibold">{c.name}</span>
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {c.price > 0 ? rupiah(item.price + c.price) : rupiah(item.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : g.type === "multi" ? (
                <div className="mt-3 space-y-2.5 sm:space-y-3">
                  {g.choices.map((c) => {
                    const active = (selected[g.id] ?? []).includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggle(g.id, g.type, c.id)}
                        className="flex w-full items-center gap-3 text-left p-2 rounded-xl hover:bg-secondary/30 transition"
                      >
                        <span
                          className={`flex size-6 sm:size-7 items-center justify-center rounded-lg border-2 transition-colors shrink-0 ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/50"
                          }`}
                        >
                          {active && <Check className="size-3.5 sm:size-4" />}
                        </span>
                        <span className="flex-1 text-xs sm:text-sm font-medium">{c.name}</span>
                        {c.price > 0 && (
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            +{rupiah(c.price)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {g.choices.map((c) => {
                    const active = (selected[g.id] ?? []).includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggle(g.id, g.type, c.id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs sm:text-sm transition-colors ${
                          active
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-secondary/40 text-muted-foreground"
                        }`}
                      >
                        <span>{c.name}</span>
                        <span>{c.price > 0 ? `+ ${rupiah(c.price)}` : ""}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Special Request */}
          {item.specialRequestEnabled !== false && (
            <div>
              <h2 className="text-base sm:text-lg font-bold">Special Request</h2>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. no MSG, less spicy, sauce on the side"
                className="mt-2 w-full rounded-xl border border-input bg-secondary/40 px-3 py-2.5 text-xs sm:text-sm outline-none focus:border-primary"
              />
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-md border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:border-x sm:border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-secondary/40 px-3 py-2">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-5 text-center text-sm font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                aria-label="Increase quantity"
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <button
              disabled={!item.available}
              onClick={() => {
                actions.addToCart({
                  itemId: item.id,
                  name: item.name,
                  unitPrice,
                  qty,
                  optionLabels: labels,
                  note,
                });
                navigate({ to: "/cart" });
              }}
              className="flex-1 rounded-2xl bg-primary py-3 px-3 text-xs font-bold text-primary-foreground disabled:opacity-30 hover:opacity-95 transition truncate"
            >
              Add to Cart · {rupiah(unitPrice * qty)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MenuDetailNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <p className="text-muted-foreground">Menu item not found.</p>
      <Link
        to="/menu"
        className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground"
      >
        Back to menu
      </Link>
    </div>
  );
}

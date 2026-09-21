import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  actions,
  CATEGORIES,
  getAvailableCategories,
  rupiah,
  useStore,
  resolveMenuImage,
  handleImageError,
  type Category,
} from "@/lib/store";

type MenuSearch = { category?: Category };

export const Route = createFileRoute("/menu/")({
  validateSearch: (search: Record<string, unknown>): MenuSearch => {
    const raw = search["category"] as Category | undefined;
    return raw ? { category: raw } : {};
  },
  head: () => ({
    meta: [
      { title: "Menu — Nanami Kitchen" },
      {
        name: "description",
        content:
          "Browse meals, snacks, drinks and combos from Nanami Kitchen and add them in one tap.",
      },
      { property: "og:title", content: "Menu — Nanami Kitchen" },
      { property: "og:description", content: "Meals, snacks, drinks and combos ready to order." },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const { category } = Route.useSearch();
  const { menu, cms } = useStore((s) => ({ menu: s.menu, cms: s.cms }));
  const categories = getAvailableCategories(cms, menu);
  const categoryNames = cms?.categoryNames || {};

  const [tab, setTab] = useState<string>(category ?? categories[0] ?? "Meals");
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Ensure active tab matches an existing category
  const activeTab = categories.some((c) => c.toLowerCase() === tab.toLowerCase())
    ? tab
    : categories[0] || tab;

  const list = menu.filter((m) =>
    q
      ? m.name.toLowerCase().includes(q.toLowerCase())
      : m.category?.toLowerCase() === activeTab.toLowerCase(),
  );

  return (
    <AppShell>
      <header className="flex items-center gap-2 py-0.5">
        <button
          onClick={() => window.history.back()}
          aria-label="Back"
          className="-ml-1 p-1 text-foreground hover:bg-secondary/40 rounded-lg transition"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-xl font-bold">Menu</h1>
        <button
          onClick={() => setSearchOpen((v) => !v)}
          aria-label="Search menu"
          className="ml-auto p-1 text-foreground hover:bg-secondary/40 rounded-lg transition"
        >
          <Search className="size-5" />
        </button>
      </header>

      {searchOpen && (
        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-input bg-secondary/40 px-3 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search menu..."
            className="w-full bg-transparent text-xs outline-none"
          />
        </div>
      )}

      <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => {
              setTab(c);
              setQ("");
            }}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab.toLowerCase() === c.toLowerCase() && !q
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {categoryNames[c] || c}
          </button>
        ))}
      </div>

      <div className="mt-2 space-y-1.5">
        {list.map((m) => (
          <div key={m.id} className="glow-card flex items-center gap-2.5 rounded-xl p-2">
            <Link
              to="/menu/$itemId"
              params={{ itemId: m.id }}
              aria-label={m.name}
              className="shrink-0"
            >
              <img
                src={resolveMenuImage(m.image)}
                alt={m.name}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => handleImageError(e)}
                className="size-18 sm:size-20 rounded-lg object-cover"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to="/menu/$itemId" params={{ itemId: m.id }} className="block w-full text-left">
                <p className="line-clamp-1 text-xs sm:text-sm font-bold">{m.name}</p>
                <p className="mt-0.5 text-xs font-semibold text-primary">{rupiah(m.price)}</p>
                {!m.available && (
                  <p className="mt-0.5 text-[10px] font-bold text-destructive">Sold out</p>
                )}
              </Link>
              <div className="mt-1 flex justify-end">
                <button
                  disabled={!m.available}
                  aria-label={`Add ${m.name}`}
                  onClick={() =>
                    actions.addToCart({
                      itemId: m.id,
                      name: m.name,
                      unitPrice: m.price,
                      qty: 1,
                      optionLabels: [],
                      note: "",
                    })
                  }
                  className="rounded-md bg-primary p-1 text-primary-foreground disabled:opacity-30 transition hover:brightness-105 active:scale-95"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">No items found.</p>
        )}
      </div>
    </AppShell>
  );
}

import { useState, useEffect, useMemo, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Eye,
  Settings as SettingsIcon,
  HelpCircle,
  ExternalLink,
  Smartphone,
  Info,
  Layers,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell, SectionCard, fieldClass } from "@/components/dashboard/DashboardShell";
import {
  actions,
  useStore,
  type Settings,
  type Order,
  cleanWhatsappNumber,
  formatWhatsappDisplayNumber,
  buildWhatsappMessage,
  WHATSAPP_VARIABLES,
  WHATSAPP_PRESETS,
} from "@/lib/store";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { StickySaveBar } from "@/components/StickySaveBar";
import { UnsavedChangesPrompt } from "@/components/UnsavedChangesPrompt";

export const Route = createFileRoute("/owner/whatsapp")({
  head: () => ({
    meta: [
      { title: "WhatsApp Ordering & Message Settings — Owner Panel" },
      {
        name: "description",
        content:
          "Customize your restaurant's WhatsApp recipient phone number, automated message templates, placeholders, and formatting guidelines.",
      },
      { property: "og:title", content: "WhatsApp Settings — Nanami Kitchen" },
      {
        property: "og:description",
        content: "Configure WhatsApp ordering number and message templates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OwnerWhatsappSettingsPage,
});

// Sample realistic orders for real-time preview
const SAMPLE_ORDERS: { id: string; name: string; tag: string; order: Order }[] = [
  {
    id: "sample-delivery",
    name: "Standard Delivery (With Options & Voucher)",
    tag: "Delivery",
    order: {
      id: "ord-sample-1",
      code: "NK-4820",
      createdAt: Date.now(),
      type: "delivery",
      lines: [
        {
          id: "l1",
          itemId: "m1",
          name: "Teriyaki Chicken Bento",
          unitPrice: 110,
          qty: 2,
          optionLabels: ["Large", "Fried Egg"],
          note: "Extra teriyaki sauce on the side please",
        },
        {
          id: "l2",
          itemId: "m3",
          name: "Iced Milk Tea",
          unitPrice: 35,
          qty: 2,
          optionLabels: ["Regular"],
          note: "Less ice, normal sugar",
        },
      ],
      subtotal: 290,
      discount: 20,
      voucherCode: "NANAMI20",
      deliveryFee: 25,
      vatPercent: 15,
      vatAmount: 43.5,
      total: 338.5,
      status: "Pending Payment",
      paid: false,
      paymentMethod: "Bank Transfer / Instant EFT",
      pointsEarned: 2,
      etaMinutes: 25,
      customer: {
        name: "Jessica Taylor",
        phone: "0834567890",
        address: "Unit 14, Rosebank Crest, 42 Oxford Road, Windhoek",
        deliveryNote: "Ring buzzer 14, leave at front reception if unavailable",
        lat: -22.5609,
        lng: 17.0658,
        mapsUrl: "https://www.google.com/maps?q=-22.560900,17.065800",
      },
      accountId: "demo-user",
    },
  },
  {
    id: "sample-pickup",
    name: "Quick Pickup / Takeaway",
    tag: "Pickup",
    order: {
      id: "ord-sample-2",
      code: "NK-1092",
      createdAt: Date.now(),
      type: "pickup",
      lines: [
        {
          id: "l3",
          itemId: "m2",
          name: "Crispy Smashed Chicken",
          unitPrice: 85,
          qty: 1,
          optionLabels: ["Extra Hot", "Mozzarella Cheese"],
          note: "Very spicy please!",
        },
        {
          id: "l4",
          itemId: "m4",
          name: "Crispy Snack Platter",
          unitPrice: 65,
          qty: 1,
          optionLabels: [],
          note: "",
        },
      ],
      subtotal: 150,
      discount: 0,
      voucherCode: "",
      deliveryFee: 0,
      vatPercent: 0,
      vatAmount: 0,
      total: 150,
      status: "Pending Payment",
      paid: false,
      paymentMethod: "Cash on Pickup",
      pointsEarned: 1,
      etaMinutes: 15,
      customer: {
        name: "David Smith",
        phone: "0812345678",
        address: "Pickup in Kitchen",
        deliveryNote: "Arriving around 12:30 PM",
      },
      accountId: "demo-user",
    },
  },
  {
    id: "sample-large",
    name: "Large Family & Combo Catering",
    tag: "Combo",
    order: {
      id: "ord-sample-3",
      code: "NK-8831",
      createdAt: Date.now(),
      type: "delivery",
      lines: [
        {
          id: "l5",
          itemId: "m5",
          name: "Crispy Chicken & Tea Combo",
          unitPrice: 110,
          qty: 3,
          optionLabels: ["Medium"],
          note: "Separate drink packaging",
        },
        {
          id: "l6",
          itemId: "m6",
          name: "Signature Chili Jar (150ml)",
          unitPrice: 45,
          qty: 2,
          optionLabels: [],
          note: "",
        },
      ],
      subtotal: 420,
      discount: 50,
      voucherCode: "BIGFEAST",
      deliveryFee: 0,
      vatPercent: 15,
      vatAmount: 55.5,
      total: 425.5,
      status: "Pending Payment",
      paid: false,
      paymentMethod: "eWallet / Pay2Cell",
      pointsEarned: 4,
      etaMinutes: 30,
      customer: {
        name: "Michael Chen",
        phone: "0829998877",
        address: "7th Floor, Silicon Tower, Windhoek",
        deliveryNote: "Call on arrival",
      },
      accountId: "demo-user",
    },
  },
];

const COUNTRY_CODES = [
  { code: "264", label: "🇳🇦 Namibia (+264)" },
  { code: "27", label: "🇿🇦 South Africa (+27)" },
  { code: "62", label: "🇮🇩 Indonesia (+62)" },
  { code: "1", label: "🇺🇸 United States / Canada (+1)" },
  { code: "44", label: "🇬🇧 United Kingdom (+44)" },
  { code: "65", label: "🇸🇬 Singapore (+65)" },
  { code: "60", label: "🇲🇾 Malaysia (+60)" },
  { code: "61", label: "🇦🇺 Australia (+61)" },
];

function OwnerWhatsappSettingsPage() {
  const globalSettings = useStore((s) => s.settings);
  const [localSettings, setLocalSettings] = useState<Settings>(() => globalSettings);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "guide" | "test">("editor");
  const [selectedSampleId, setSelectedSampleId] = useState<string>("sample-delivery");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isDirty, markSaved, resetToSnapshot, blocker } = useUnsavedChanges(localSettings);

  useEffect(() => {
    setLocalSettings(globalSettings);
    markSaved(globalSettings);
  }, [globalSettings, markSaved]);

  const currentTemplate = useMemo(() => {
    return localSettings.whatsappTemplate ?? WHATSAPP_PRESETS.standard.template;
  }, [localSettings.whatsappTemplate]);

  const selectedSample = useMemo(() => {
    return SAMPLE_ORDERS.find((s) => s.id === selectedSampleId) || SAMPLE_ORDERS[0];
  }, [selectedSampleId]);

  // Generate live WhatsApp message text using the current local settings
  const previewMessageText = useMemo(() => {
    return buildWhatsappMessage(selectedSample.order, {
      ...localSettings,
      whatsappTemplate: currentTemplate,
    });
  }, [selectedSample.order, localSettings, currentTemplate]);

  const handleFieldChange = (patch: Partial<Settings>) => {
    setLocalSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await actions.updateSettings(localSettings);
      markSaved(localSettings);
      toast.success("WhatsApp settings and template saved successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save WhatsApp settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const snapshot = resetToSnapshot();
    setLocalSettings(snapshot);
    toast.info("Changes reverted to saved snapshot.");
  };

  const applyPreset = (presetKey: "standard" | "compact" | "receipt") => {
    const preset = WHATSAPP_PRESETS[presetKey];
    handleFieldChange({
      whatsappPreset: presetKey,
      whatsappTemplate: preset.template,
      whatsappHeader: preset.header,
      whatsappFooter: preset.footer,
    });
    toast.success(`Loaded "${preset.name}" template preset.`);
  };

  const insertToken = (token: string) => {
    const el = textareaRef.current;
    if (!el) {
      handleFieldChange({
        whatsappTemplate: (currentTemplate || "") + " " + token,
        whatsappPreset: "custom",
      });
      return;
    }

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const currentVal = el.value;
    const newVal = currentVal.substring(0, start) + token + currentVal.substring(end);

    handleFieldChange({
      whatsappTemplate: newVal,
      whatsappPreset: "custom",
    });

    // Re-focus and position cursor right after the inserted token
    setTimeout(() => {
      el.focus();
      const newCursorPos = start + token.length;
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);

    toast.success(`Inserted ${token}`);
  };

  const copyToken = (token: string) => {
    navigator.clipboard?.writeText(token);
    setCopiedToken(token);
    toast.success(`Copied ${token} to clipboard`);
    setTimeout(() => setCopiedToken(null), 1500);
  };

  const copyPreviewText = () => {
    navigator.clipboard?.writeText(previewMessageText);
    setCopiedPreview(true);
    toast.success("Copied rendered WhatsApp message to clipboard!");
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  const openWhatsAppTest = () => {
    const phone = cleanWhatsappNumber(localSettings.whatsapp);
    const encoded = encodeURIComponent(previewMessageText);
    const url = `https://wa.me/${phone}?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const resetToFactoryDefault = () => {
    if (confirm("Reset WhatsApp template to the original factory default?")) {
      handleFieldChange({
        whatsappTemplate: WHATSAPP_PRESETS.standard.template,
        whatsappPreset: "standard",
        whatsappHeader: WHATSAPP_PRESETS.standard.header,
        whatsappFooter: WHATSAPP_PRESETS.standard.footer,
      });
      toast.success("Reset template to Standard Default.");
    }
  };

  const formattedDisplayPhone = formatWhatsappDisplayNumber(localSettings.whatsapp);
  const cleanedPhone = cleanWhatsappNumber(localSettings.whatsapp);

  return (
    <DashboardShell
      role="owner"
      title="WhatsApp Ordering & Message Settings"
      subtitle="Configure recipient WhatsApp phone number, customize automated order message templates, and preview real-time customer messages."
    >
      <div className="space-y-6 pb-24">
        {/* Top Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Recipient Number</p>
              <p className="text-sm font-semibold truncate text-foreground">
                {formattedDisplayPhone}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">wa.me/{cleanedPhone}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Active Template Style</p>
              <p className="text-sm font-semibold capitalize text-foreground">
                {localSettings.whatsappPreset || "Standard Detailed"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {currentTemplate.length} characters in template
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Auto Redirection</p>
              <p className="text-sm font-semibold text-emerald-600">Active on Checkout</p>
              <p className="text-[11px] text-muted-foreground">Opens WhatsApp after order</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "editor"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Number & Template Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "guide"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Formatting Guide & Variables</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("test")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "test"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Live Interactive Preview</span>
          </button>
        </div>

        {/* TAB 1: Number & Template Editor */}
        {activeTab === "editor" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Config & Template Editor (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* WhatsApp Contact Number Section */}
              <SectionCard
                title="1. WhatsApp Recipient Contact"
                description="The destination WhatsApp phone number where all customer orders and payment confirmations will be sent."
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Country Code Helper
                      </label>
                      <select
                        className={fieldClass}
                        onChange={(e) => {
                          const code = e.target.value;
                          if (!code) return;
                          const cur = localSettings.whatsapp.replace(/\D/g, "");
                          // If current already starts with 0, replace with country code
                          if (cur.startsWith("0")) {
                            handleFieldChange({ whatsapp: code + cur.slice(1) });
                          } else {
                            handleFieldChange({ whatsapp: code + cur });
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select a country code...
                        </option>
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-[11px] text-muted-foreground mt-1 block">
                        Quickly prefix standard international country codes.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        WhatsApp Number (International Format)
                      </label>
                      <input
                        type="text"
                        value={localSettings.whatsapp}
                        onChange={(e) => handleFieldChange({ whatsapp: e.target.value })}
                        placeholder="e.g. 27812345678 or 0812345678"
                        className={fieldClass}
                      />
                      <span className="text-[11px] text-muted-foreground mt-1 block">
                        Include country code without '+' (e.g. 27 for SA, 62 for ID).
                      </span>
                    </div>
                  </div>

                  {/* Clean number validation pill & direct test link */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 text-xs font-bold">
                        ✓
                      </span>
                      <span className="text-xs text-muted-foreground">Clean Target URL:</span>
                      <code className="text-xs font-mono font-medium text-foreground bg-background px-2 py-0.5 rounded border border-border">
                        https://wa.me/{cleanedPhone}
                      </code>
                    </div>

                    <button
                      type="button"
                      onClick={openWhatsAppTest}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Test Target Link</span>
                    </button>
                  </div>
                </div>
              </SectionCard>

              {/* Template Preset Selector */}
              <SectionCard
                title="2. Choose Template Preset"
                description="Select a starter layout or customize the message body with dynamic variable placeholders."
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(["standard", "compact", "receipt"] as const).map((presetKey) => {
                    const preset = WHATSAPP_PRESETS[presetKey];
                    const isSelected = localSettings.whatsappPreset === presetKey;
                    return (
                      <button
                        key={presetKey}
                        type="button"
                        onClick={() => applyPreset(presetKey)}
                        className={`text-left p-3.5 rounded-xl border transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                            : "border-border bg-card hover:bg-secondary/40 hover:border-muted-foreground/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-foreground">{preset.name}</span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              {/* Template Editor Section */}
              <SectionCard
                title="3. Custom Message Template Editor"
                description="Use WhatsApp formatting (*bold*, _italic_) and dynamic tokens ({order_code}, {items}, {total}) to craft your custom message format."
                action={
                  <button
                    type="button"
                    onClick={resetToFactoryDefault}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Default</span>
                  </button>
                }
              >
                <div className="space-y-4">
                  {/* Quick Token Insertion Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        Quick Insert Variables (Click to Add at Cursor)
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {WHATSAPP_VARIABLES.length} available tokens
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2.5 rounded-xl bg-secondary/30 border border-border">
                      {WHATSAPP_VARIABLES.map((v) => (
                        <button
                          key={v.token}
                          type="button"
                          onClick={() => insertToken(v.token)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-background hover:bg-primary hover:text-primary-foreground border border-border text-foreground transition-all shadow-xs group"
                          title={`${v.description} (e.g. ${v.example})`}
                        >
                          <span>{v.token}</span>
                          <span className="text-[9px] opacity-60 group-hover:opacity-100">+</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main Textarea Template */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Message Body Template
                    </label>
                    <textarea
                      ref={textareaRef}
                      value={currentTemplate}
                      onChange={(e) =>
                        handleFieldChange({
                          whatsappTemplate: e.target.value,
                          whatsappPreset: "custom",
                        })
                      }
                      rows={14}
                      className={`${fieldClass} font-mono text-xs leading-relaxed resize-y bg-secondary/20`}
                      placeholder="Write your WhatsApp message template here..."
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
                      <span>
                        WhatsApp supports markdown: *bold*, _italic_, ~strike~, ```code```
                      </span>
                      <span>{currentTemplate.length} chars</span>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Right Column: Live Mockup Preview (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Sample Order Selector */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Live Sample Preview
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Simulated Output
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Switch sample order data to test how your template behaves with different delivery
                  types and vouchers:
                </p>

                <div className="space-y-1.5">
                  {SAMPLE_ORDERS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => setSelectedSampleId(sample.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                        selectedSampleId === sample.id
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/30"
                          : "hover:bg-secondary/60 text-muted-foreground"
                      }`}
                    >
                      <span className="truncate">{sample.name}</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-background border border-border">
                        {sample.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Realistic WhatsApp Chat Bubble Mockup */}
              <div className="rounded-2xl border border-emerald-900/10 bg-gradient-to-b from-[#e5ddd5]/30 to-[#e5ddd5]/10 dark:from-zinc-900 dark:to-zinc-950 overflow-hidden shadow-md">
                {/* Chat Top Bar */}
                <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs">
                      NK
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">
                        {localSettings.storeName || "Nanami Kitchen"}
                      </p>
                      <p className="text-[10px] text-emerald-200 leading-tight">
                        {formattedDisplayPhone} • Online
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={copyPreviewText}
                      className="p-1.5 rounded-lg hover:bg-emerald-700/50 text-emerald-100 transition-colors"
                      title="Copy rendered message text"
                    >
                      {copiedPreview ? (
                        <Check className="w-4 h-4 text-emerald-300" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={openWhatsAppTest}
                      className="p-1.5 rounded-lg hover:bg-emerald-700/50 text-emerald-100 transition-colors"
                      title="Open in WhatsApp"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Chat Message Bubble Canvas */}
                <div className="p-4 space-y-2 max-h-[460px] overflow-y-auto">
                  {/* Timestamp header */}
                  <div className="flex justify-center">
                    <span className="text-[10px] font-medium bg-background/80 dark:bg-zinc-800 text-muted-foreground px-2.5 py-0.5 rounded-full shadow-2xs">
                      Today, 12:45 PM
                    </span>
                  </div>

                  {/* Speech Bubble (Customer message sent to store) */}
                  <div className="flex justify-end">
                    <div className="max-w-[92%] bg-[#dcf8c6] dark:bg-emerald-950/80 border border-emerald-700/10 text-zinc-900 dark:text-emerald-100 rounded-2xl rounded-tr-xs p-3.5 shadow-sm text-xs space-y-2">
                      <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed select-text">
                        {previewMessageText}
                      </pre>

                      <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-500 dark:text-emerald-300/60 pt-1">
                        <span>12:45 PM</span>
                        <span className="text-sky-500 font-bold">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="p-3 bg-card border-t border-border flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    Live customer checkout format
                  </span>
                  <button
                    type="button"
                    onClick={openWhatsAppTest}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <span>Test on WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Formatting Guide & Variables */}
        {activeTab === "guide" && (
          <div className="space-y-6">
            <SectionCard
              title="WhatsApp Text Formatting Syntax"
              description="Learn how to style bold headings, italic notes, lists, and monospace code in WhatsApp messages."
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Bold Text</span>
                    <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      *text*
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Wrap words in asterisks to make them <strong>bold</strong>.
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground bg-secondary/50 p-1.5 rounded">
                    *NEW ORDER #NK-101*
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Italic Text</span>
                    <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      _text_
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Wrap words in underscores to make them <em>italic</em>.
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground bg-secondary/50 p-1.5 rounded">
                    _Please confirm order_
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Strikethrough</span>
                    <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      ~text~
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Wrap words in tildes to strikethrough.
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground bg-secondary/50 p-1.5 rounded">
                    ~Old Price~ *New Price*
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Monospace Code</span>
                    <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      ```text```
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Wrap in triple backticks for clean monospace alignment.
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground bg-secondary/50 p-1.5 rounded">
                    ```RECEIPT #1024```
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Available Dynamic Variable Tokens"
              description="Click on any token to copy it to your clipboard. These tokens will be automatically substituted with actual customer and cart data during checkout."
            >
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-secondary/60 border-b border-border text-foreground font-semibold">
                      <th className="py-2.5 px-3">Token</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Example Output</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {WHATSAPP_VARIABLES.map((v) => (
                      <tr key={v.token} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-primary">{v.token}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground">
                            {v.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-foreground">{v.description}</td>
                        <td className="py-2 px-3 text-muted-foreground font-mono">{v.example}</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => copyToken(v.token)}
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-secondary/50 hover:bg-secondary transition-colors"
                          >
                            {copiedToken === v.token ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard
              title="How WhatsApp Checkout Ordering Works"
              description="Overview of the customer ordering lifecycle with WhatsApp integration."
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-foreground">Customer Places Order</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Customer selects menu items, enters delivery address, picks their payment
                    method, and taps "Place Order".
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-foreground">
                    Instant WhatsApp Redirection
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The app formats the order using your customized template and redirects the
                    customer directly to your WhatsApp chat with the message pre-filled.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-foreground">Confirmation & Cooking</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Staff receives the customer message, verifies proof of payment, and changes the
                    order status to Cooking on the Kitchen Board.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* TAB 3: Live Interactive Preview */}
        {activeTab === "test" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <SectionCard
                title="Select Order Scenario"
                description="Test how your template dynamically renders under different ordering conditions."
              >
                <div className="space-y-2">
                  {SAMPLE_ORDERS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => setSelectedSampleId(sample.id)}
                      className={`w-full text-left p-3 rounded-xl text-xs border transition-all ${
                        selectedSampleId === sample.id
                          ? "bg-primary/10 border-primary text-foreground font-semibold"
                          : "border-border bg-card hover:bg-secondary/40 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-foreground">{sample.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-semibold">
                          {sample.order.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                        <span>{sample.order.lines.length} items in cart</span>
                        <span>
                          Total: {localSettings.currencySymbol || "N$"} {sample.order.total}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Direct WhatsApp Test Actions"
                description="Send this test message directly to your real WhatsApp application."
              >
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={openWhatsAppTest}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>Open in WhatsApp Application</span>
                  </button>

                  <button
                    type="button"
                    onClick={copyPreviewText}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-colors"
                  >
                    {copiedPreview ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Message Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Message Text to Clipboard</span>
                      </>
                    )}
                  </button>
                </div>
              </SectionCard>
            </div>

            <div className="lg:col-span-7">
              <SectionCard
                title="Full Rendered Output"
                description="This is the exact string generated and passed to the customer's WhatsApp chat."
              >
                <div className="rounded-xl bg-secondary/30 border border-border p-4 font-mono text-xs leading-relaxed overflow-x-auto select-text whitespace-pre-wrap">
                  {previewMessageText}
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Save Bar */}
      <StickySaveBar isDirty={isDirty} onSave={handleSave} onReset={handleReset} saving={saving} />
      <UnsavedChangesPrompt blocker={blocker} />
    </DashboardShell>
  );
}

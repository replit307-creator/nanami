import { useState } from "react";
import {
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  Info,
  Landmark,
  RotateCcw,
  Smartphone,
  User,
  Wallet,
  Wifi,
} from "lucide-react";
import { type CheckoutCms, type Settings, defaultCheckoutCms } from "@/lib/store";
import { SectionCard, fieldClass } from "./DashboardShell";

interface CheckoutCmsSectionProps {
  checkout: CheckoutCms;
  onChange: (patch: Partial<CheckoutCms>) => void;
  onSaveToast?: () => void;
  settings?: Settings;
  onUpdateSettings?: (patch: Partial<Settings>) => void;
}

export function CheckoutCmsSection({
  checkout,
  onChange,
  onSaveToast,
  settings,
  onUpdateSettings,
}: CheckoutCmsSectionProps) {
  const current = checkout || defaultCheckoutCms;

  // State for preview payment method selection
  const [previewPayment, setPreviewPayment] = useState<"ewallet" | "bank" | "cod">("ewallet");
  const [copied, setCopied] = useState(false);
  const [previewName, setPreviewName] = useState(current.defaultFullName || "Nanami Owner");
  const [previewPhone, setPreviewPhone] = useState(current.defaultPhone || "0834567890");

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const updateField = <K extends keyof CheckoutCms>(field: K, value: CheckoutCms[K]) => {
    onChange({ [field]: value });
    onSaveToast?.();

    // Also sync to global settings if relevant
    if (onUpdateSettings) {
      if (field === "ewalletNumber") {
        onUpdateSettings({ ewallet: String(value) });
      } else if (field === "bankName") {
        onUpdateSettings({ bankName: String(value) });
      } else if (field === "bankAccountNumber") {
        onUpdateSettings({ bankAccount: String(value) });
      } else if (field === "bankAccountName") {
        onUpdateSettings({ bankHolder: String(value) });
      } else if (field === "codEnabled") {
        onUpdateSettings({ codEnabled: Boolean(value) });
      }
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset all checkout CMS content to default values?")) {
      onChange(defaultCheckoutCms);
      setPreviewName(defaultCheckoutCms.defaultFullName);
      setPreviewPhone(defaultCheckoutCms.defaultPhone);
      onSaveToast?.();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="size-5 text-primary" />
            Checkout Page CMS & Customizer
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage customer details, payment methods, accounts, and instructions with real-time live
            preview.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition"
        >
          <RotateCcw className="size-3.5" />
          Reset Checkout Defaults
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: EDIT FORM & CONTROLS */}
        <div className="space-y-6 lg:col-span-7">
          {/* SECTION 1: YOUR DETAILS */}
          <SectionCard
            title="1. Customer Details (Your Details)"
            description="Customize the labels and initial prefilled values for customer contact information."
          >
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Card Title</label>
                <input
                  type="text"
                  value={current.detailsTitle ?? "Your Details"}
                  onChange={(e) => updateField("detailsTitle", e.target.value)}
                  placeholder="Your Details"
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Full Name Label</label>
                  <input
                    type="text"
                    value={current.fullNameLabel ?? "Full Name"}
                    onChange={(e) => updateField("fullNameLabel", e.target.value)}
                    placeholder="Full Name"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Default / Sample Name
                  </label>
                  <input
                    type="text"
                    value={current.defaultFullName ?? "Nanami Owner"}
                    onChange={(e) => {
                      updateField("defaultFullName", e.target.value);
                      setPreviewName(e.target.value);
                    }}
                    placeholder="Nanami Owner"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    WhatsApp Number Label
                  </label>
                  <input
                    type="text"
                    value={current.phoneLabel ?? "WhatsApp Number"}
                    onChange={(e) => updateField("phoneLabel", e.target.value)}
                    placeholder="WhatsApp Number"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Default / Sample WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={current.defaultPhone ?? "0834567890"}
                    onChange={(e) => {
                      updateField("defaultPhone", e.target.value);
                      setPreviewPhone(e.target.value);
                    }}
                    placeholder="0834567890"
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* SECTION 2: PAYMENT METHODS */}
          <SectionCard
            title="2. Payment Methods (Options List)"
            description="Toggle active status and edit display titles and subtitles for each payment option."
          >
            <div className="space-y-4">
              {/* Method A: eWallet */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Wallet className="size-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">eWallet / Pay2Cell</span>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={current.ewalletEnabled !== false}
                      onChange={(e) => updateField("ewalletEnabled", e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-muted after:absolute after:top-[2px] after:left-[2px] after:size-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
                    <span className="ml-2 text-xs font-medium text-muted-foreground">
                      {current.ewalletEnabled !== false ? "Active" : "Disabled"}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Option Label
                    </label>
                    <input
                      type="text"
                      value={current.ewalletLabel ?? "eWallet / Pay2Cell"}
                      onChange={(e) => updateField("ewalletLabel", e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Subtitle / Instruction
                    </label>
                    <input
                      type="text"
                      value={current.ewalletSub ?? "(Scan QR or Mobile Transfer)"}
                      onChange={(e) => updateField("ewalletSub", e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>

              {/* Method B: Bank Transfer */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Landmark className="size-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      Bank Transfer / Instant EFT
                    </span>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={current.bankEnabled !== false}
                      onChange={(e) => updateField("bankEnabled", e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-muted after:absolute after:top-[2px] after:left-[2px] after:size-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
                    <span className="ml-2 text-xs font-medium text-muted-foreground">
                      {current.bankEnabled !== false ? "Active" : "Disabled"}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Option Label
                    </label>
                    <input
                      type="text"
                      value={current.bankLabel ?? "Bank Transfer / Instant EFT"}
                      onChange={(e) => updateField("bankLabel", e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Subtitle / Instruction
                    </label>
                    <input
                      type="text"
                      value={current.bankSub ?? "(ATM/MBANK/IBANK)"}
                      onChange={(e) => updateField("bankSub", e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>

              {/* Method C: Cash on Delivery */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Banknote className="size-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">Cash on Delivery</span>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={current.codEnabled !== false}
                      onChange={(e) => updateField("codEnabled", e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-muted after:absolute after:top-[2px] after:left-[2px] after:size-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
                    <span className="ml-2 text-xs font-medium text-muted-foreground">
                      {current.codEnabled !== false ? "Active" : "Disabled"}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Option Label
                    </label>
                    <input
                      type="text"
                      value={current.codLabel ?? "Cash on Delivery"}
                      onChange={(e) => updateField("codLabel", e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Subtitle / Instruction
                    </label>
                    <input
                      type="text"
                      value={current.codSub ?? "(For Pickup & Delivery)"}
                      onChange={(e) => updateField("codSub", e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* SECTION 3: PAYMENT INSTRUCTIONS */}
          <SectionCard
            title="3. Payment Instructions & Transfer Accounts"
            description="Configure account details, step guidelines, copy buttons, and upload proof note."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Section Header Title
                  </label>
                  <input
                    type="text"
                    value={current.instructionsTitle ?? "Payment Instructions"}
                    onChange={(e) => updateField("instructionsTitle", e.target.value)}
                    placeholder="Payment Instructions"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Step 1 Headline Text
                  </label>
                  <input
                    type="text"
                    value={current.step1Text ?? "1. Transfer to the following account:"}
                    onChange={(e) => updateField("step1Text", e.target.value)}
                    placeholder="1. Transfer to the following account:"
                    className={fieldClass}
                  />
                </div>
              </div>

              {/* E-Wallet Account Info */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <Wallet className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    E-Wallet Account Details
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Account Header Title
                    </label>
                    <input
                      type="text"
                      value={current.ewalletTitle ?? "E-Wallet"}
                      onChange={(e) => updateField("ewalletTitle", e.target.value)}
                      placeholder="E-Wallet"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={current.ewalletAccountName ?? "Nanami Kitchen"}
                      onChange={(e) => updateField("ewalletAccountName", e.target.value)}
                      placeholder="Nanami Kitchen"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Number / Provider Info
                    </label>
                    <input
                      type="text"
                      value={current.ewalletNumber ?? "0812345678 (Capitec Pay / SnapScan)"}
                      onChange={(e) => updateField("ewalletNumber", e.target.value)}
                      placeholder="0812345678 (Capitec Pay / SnapScan)"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Copy Button Label
                    </label>
                    <input
                      type="text"
                      value={current.copyButtonText ?? "Copy"}
                      onChange={(e) => updateField("copyButtonText", e.target.value)}
                      placeholder="Copy"
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>

              {/* Bank Transfer Account Info */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <Landmark className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Bank Transfer (EFT) Account Details
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={current.bankName ?? "First National Bank (FNB)"}
                      onChange={(e) => updateField("bankName", e.target.value)}
                      placeholder="First National Bank (FNB)"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Badge / Code (e.g. EFT)
                    </label>
                    <input
                      type="text"
                      value={current.bankTitle ?? "EFT"}
                      onChange={(e) => updateField("bankTitle", e.target.value)}
                      placeholder="EFT"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={current.bankAccountName ?? "Nanami Kitchen CC"}
                      onChange={(e) => updateField("bankAccountName", e.target.value)}
                      placeholder="Nanami Kitchen CC"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={current.bankAccountNumber ?? "62123456789"}
                      onChange={(e) => updateField("bankAccountNumber", e.target.value)}
                      placeholder="62123456789"
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>

              {/* COD Note */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <Banknote className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Cash on Delivery Instructions Note
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={
                    current.codInstructions ??
                    "Pay in cash when your order arrives or when you pick it up. Please prepare the exact amount if possible."
                  }
                  onChange={(e) => updateField("codInstructions", e.target.value)}
                  className={fieldClass}
                />
              </div>

              {/* Step 2 Headline */}
              <div>
                <label className="text-xs font-semibold text-foreground">
                  Step 2 Headline & Proof Upload Note
                </label>
                <textarea
                  rows={2}
                  value={
                    current.step2Text ??
                    "2.Upload proof of payment (Screenshot) in the WhatsApp chat after ordering."
                  }
                  onChange={(e) => updateField("step2Text", e.target.value)}
                  placeholder="2.Upload proof of payment (Screenshot) in the WhatsApp chat after ordering."
                  className={fieldClass}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* RIGHT COLUMN: STICKY REAL-TIME LIVE PREVIEW */}
        <div className="space-y-4 lg:col-span-5">
          <div className="sticky top-6">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Live Checkout Preview
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">Interactive</span>
            </div>

            {/* Mobile Device Frame */}
            <div className="relative mx-auto w-full max-w-[380px] overflow-hidden rounded-[36px] border-[8px] border-neutral-800 bg-background shadow-2xl">
              {/* Device Top Bar */}
              <div className="flex h-6 items-center justify-between bg-neutral-900 px-5 text-[11px] font-semibold text-neutral-400">
                <span>09:41</span>
                <div className="h-3 w-16 rounded-full bg-neutral-800" />
                <div className="flex items-center gap-1.5">
                  <Wifi className="size-3" />
                  <div className="h-2 w-3.5 rounded-xs border border-neutral-400 bg-neutral-400" />
                </div>
              </div>

              {/* App Screen Content */}
              <div className="max-h-[640px] overflow-y-auto p-4 space-y-4 no-scrollbar">
                {/* Checkout Header */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-secondary p-1 text-xs text-foreground">
                      &larr;
                    </span>
                    <span className="text-sm font-bold text-foreground">Checkout</span>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                    Step 2 of 3
                  </span>
                </div>

                {/* 1. Live Your Details */}
                <section className="rounded-xl border border-border bg-card p-3 shadow-xs">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <User className="size-3.5 text-primary" />
                    {current.detailsTitle || "Your Details"}
                  </h3>
                  <div className="mt-2 space-y-2">
                    <label className="block text-[11px] text-muted-foreground">
                      {current.fullNameLabel || "Full Name"}
                      <input
                        type="text"
                        value={previewName}
                        onChange={(e) => setPreviewName(e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-input bg-secondary/40 px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </label>
                    <label className="block text-[11px] text-muted-foreground">
                      {current.phoneLabel || "WhatsApp Number"}
                      <input
                        type="text"
                        value={previewPhone}
                        onChange={(e) => setPreviewPhone(e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-input bg-secondary/40 px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </label>
                  </div>
                </section>

                {/* 2. Live Payment Methods List */}
                <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                  {/* eWallet */}
                  {current.ewalletEnabled !== false && (
                    <button
                      type="button"
                      onClick={() => setPreviewPayment("ewallet")}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition ${
                        previewPayment === "ewallet" ? "bg-primary/5" : "hover:bg-secondary/30"
                      }`}
                    >
                      <Wallet className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-foreground">
                          {current.ewalletLabel || "eWallet / Pay2Cell"}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {current.ewalletSub || "(Scan QR or Mobile Transfer)"}
                        </span>
                      </div>
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          previewPayment === "ewallet"
                            ? "border-primary"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {previewPayment === "ewallet" && (
                          <span className="size-2 rounded-full bg-primary" />
                        )}
                      </span>
                    </button>
                  )}

                  {/* Bank */}
                  {current.bankEnabled !== false && (
                    <button
                      type="button"
                      onClick={() => setPreviewPayment("bank")}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left border-t border-border transition ${
                        previewPayment === "bank" ? "bg-primary/5" : "hover:bg-secondary/30"
                      }`}
                    >
                      <Landmark className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-foreground">
                          {current.bankLabel || "Bank Transfer / Instant EFT"}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {current.bankSub || "(ATM/MBANK/IBANK)"}
                        </span>
                      </div>
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          previewPayment === "bank"
                            ? "border-primary"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {previewPayment === "bank" && (
                          <span className="size-2 rounded-full bg-primary" />
                        )}
                      </span>
                    </button>
                  )}

                  {/* COD */}
                  {current.codEnabled !== false && (
                    <button
                      type="button"
                      onClick={() => setPreviewPayment("cod")}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left border-t border-border transition ${
                        previewPayment === "cod" ? "bg-primary/5" : "hover:bg-secondary/30"
                      }`}
                    >
                      <Banknote className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-foreground">
                          {current.codLabel || "Cash on Delivery"}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {current.codSub || "(For Pickup & Delivery)"}
                        </span>
                      </div>
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          previewPayment === "cod" ? "border-primary" : "border-muted-foreground/40"
                        }`}
                      >
                        {previewPayment === "cod" && (
                          <span className="size-2 rounded-full bg-primary" />
                        )}
                      </span>
                    </button>
                  )}
                </section>

                {/* 3. Live Payment Instructions */}
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {current.instructionsTitle || "Payment Instructions"}
                  </h3>

                  {previewPayment === "cod" ? (
                    <div className="mt-2.5 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground leading-relaxed">
                      <p>
                        {current.codInstructions ||
                          "Pay in cash when your order arrives or when you pick it up. Please prepare the exact amount if possible."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="mr-1.5 font-semibold text-foreground">1.</span>
                        {current.step1Text || "Transfer to the following account:"}
                      </p>

                      {/* Account Card */}
                      <div className="mt-2 flex items-center justify-between gap-2.5 rounded-xl border border-border bg-card p-3 shadow-xs">
                        <div className="min-w-0 flex-1">
                          {previewPayment === "bank" ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-[10px] font-black text-primary">
                                  {current.bankTitle || "EFT"}
                                </span>
                                <span className="text-xs font-bold text-foreground truncate">
                                  {current.bankName || "First National Bank (FNB)"}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Account Name:{" "}
                                <span className="font-medium text-foreground">
                                  {current.bankAccountName || "Nanami Kitchen CC"}
                                </span>
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Account No:{" "}
                                <span className="font-mono font-bold text-foreground">
                                  {current.bankAccountNumber || "62123456789"}
                                </span>
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs font-bold text-foreground">
                                {current.ewalletTitle || "E-Wallet"}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Account Name:{" "}
                                <span className="font-medium text-foreground">
                                  {current.ewalletAccountName || "Nanami Kitchen"}
                                </span>
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Number:{" "}
                                <span className="font-mono font-bold text-foreground">
                                  {current.ewalletNumber || "0812345678 (Capitec Pay / SnapScan)"}
                                </span>
                              </p>
                            </>
                          )}
                        </div>

                        {/* Working Copy Button */}
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              previewPayment === "bank"
                                ? current.bankAccountNumber || "62123456789"
                                : current.ewalletNumber || "0812345678",
                            )
                          }
                          className="flex shrink-0 items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-secondary/80 active:scale-95 transition"
                        >
                          {copied ? (
                            <>
                              <CheckCircle2 className="size-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              <span>{current.copyButtonText || "Copy"}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Step 2 note */}
                      <p className="mt-3 text-xs text-muted-foreground leading-snug">
                        <span className="mr-1.5 font-semibold text-foreground">2.</span>
                        {current.step2Text ||
                          "Upload proof of payment (Screenshot) in the WhatsApp chat after ordering."}
                      </p>
                    </>
                  )}
                </div>

                {/* Continue button mock */}
                <div className="pt-2">
                  <div className="w-full rounded-full bg-primary py-3 text-center text-xs font-bold text-primary-foreground shadow-xs">
                    Continue &rarr;
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

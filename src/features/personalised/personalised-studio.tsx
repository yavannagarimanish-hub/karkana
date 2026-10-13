'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Product } from '@/core/domain/product';
import { pricePaise, primaryImage } from '@/core/domain/product';
import { formatINR } from '@/core/domain/money';
import { useCart } from '@/features/cart/cart-provider';
import { Button } from '@/ui/button';
import { Field, Input } from '@/ui/field';
import { QuantityStepper } from '@/ui/quantity-stepper';
import { Badge } from '@/ui/badge';

export interface PersonalisedStudioProps {
  templates: Product[];
  initialTemplateId?: string;
  isStandalonePage?: boolean;
}

const GREETING_PRESETS = [
  'Happy Diwali',
  'Warm Wishes',
  'Grand Celebration',
  'Best Compliments',
  'Shubh Deepavali',
];

export function PersonalisedStudio({
  templates,
  initialTemplateId,
  isStandalonePage: _isStandalonePage = false,
}: PersonalisedStudioProps) {
  const { add } = useCart();

  // Selected template
  const [selectedId, setSelectedId] = React.useState<string>(
    initialTemplateId || templates[0]?.id || 'KRK132',
  );

  const selectedTemplate = React.useMemo(() => {
    return templates.find((t) => t.id === selectedId) || templates[0];
  }, [templates, selectedId]);

  // Personalisation inputs
  const [customerName, setCustomerName] = React.useState('');
  const [greeting, setGreeting] = React.useState('Happy Diwali');
  const [customGreeting, setCustomGreeting] = React.useState('');
  const [isCustomGreeting, setIsCustomGreeting] = React.useState(false);

  // Uploaded photo state
  const [photoPreviewUrl, setPhotoPreviewUrl] = React.useState<string | null>(null);
  const [photoKey, setPhotoKey] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadFilename, setUploadFilename] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Transform / Position controls
  const [scale, setScale] = React.useState(100);
  const [offsetX, setOffsetX] = React.useState(0);
  const [offsetY, setOffsetY] = React.useState(0);

  // Cart controls
  const [quantity, setQuantity] = React.useState(1);
  const [added, setAdded] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const studioRef = React.useRef<HTMLDivElement>(null);

  const activeGreeting = isCustomGreeting ? customGreeting.trim() || 'Happy Diwali' : greeting;
  const templateArtwork = selectedTemplate
    ? primaryImage(selectedTemplate) || '/uploads/products/KRK132_main.jpg'
    : '/uploads/products/KRK132_main.jpg';
  const unitPrice = selectedTemplate ? pricePaise(selectedTemplate) : 49900;
  const totalPrice = unitPrice * quantity;

  const scrollToStudio = () => {
    studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    setUploadProgress(15);
    setUploadFilename(file.name);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'personalization');

      setUploadProgress(45);
      const response = await fetch('/api/v1/uploads', {
        method: 'POST',
        body: form,
      });

      setUploadProgress(85);
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Upload failed. Please choose a valid image file.');
      }

      setPhotoPreviewUrl(payload.previewUrl || payload.url);
      setPhotoKey(payload.key);
      setScale(100);
      setOffsetX(0);
      setOffsetY(0);
      setUploadProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setUploadFilename(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddToCart = () => {
    setError(null);

    if (!photoKey && !photoPreviewUrl) {
      setError('Please upload your photograph to personalize this box.');
      scrollToStudio();
      return;
    }

    if (!customerName.trim()) {
      setError('Please enter the name to be printed on your celebration box.');
      scrollToStudio();
      return;
    }

    if (!selectedTemplate) {
      setError('Please select a box template.');
      return;
    }

    const structuredDetails = {
      name: customerName.trim(),
      greeting: activeGreeting,
      scale,
      offsetX,
      offsetY,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
    };

    add({
      productId: selectedTemplate.id,
      quantity,
      personalizationImage: photoKey || photoPreviewUrl,
      customizationNotes: `Printed Name: ${structuredDetails.name}${activeGreeting ? ` (${activeGreeting})` : ''} | Layout: ${structuredDetails.scale}% zoom, X:${structuredDetails.offsetX}px, Y:${structuredDetails.offsetY}px`,
      unitPricePaise: unitPrice,
      variantLabel: `Personalized Box (${selectedTemplate.name})`,
      parentTitle: selectedTemplate.name,
    });

    setAdded(true);
    window.setTimeout(() => setAdded(false), 5000);
  };

  return (
    <div className="space-y-16">
      {/* ── 1. Bespoke Hero & Concept Introduction ── */}
      <div className="relative overflow-hidden rounded-sm border border-hairline-strong bg-void p-6 sm:p-12 lg:p-16">
        {/* Subtle decorative background gradient */}
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-ember/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full bg-ember/5 blur-3xl" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="live-dot font-mono text-xs font-bold uppercase tracking-[0.2em] text-ember">
              Bespoke Pyrotechnic Atelier
            </span>
            <Badge tone="ember">Exclusive Edition</Badge>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-fg uppercase sm:text-4xl lg:text-5xl">
            Create Your Own <br />
            <span className="text-ember">Personalised Celebration Box</span>
          </h1>

          <p className="text-sm leading-relaxed text-fg-muted sm:text-base">
            Turn your celebrations into unforgettable keepsakes. We print your personal portrait and family name directly onto an authentic Sivakasi celebration firecracker box, hand-packed with premium artisanal crackers.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              size="lg"
              variant="solid"
              onClick={scrollToStudio}
              className="px-8 font-mono text-xs uppercase tracking-[0.16em]"
            >
              Create Your Own →
            </Button>
            <a
              href="#how-it-works"
              className="inline-flex h-11 items-center px-5 font-mono text-xs uppercase tracking-[0.14em] text-fg-muted transition-colors hover:text-fg"
            >
              How It Works ↓
            </a>
          </div>
        </div>
      </div>

      {/* ── 2. The 3-Step Process Explanation ── */}
      <div id="how-it-works" className="scroll-mt-24 space-y-6">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ember">
            The Bespoke Process
          </span>
          <span className="font-mono text-[11px] text-fg-dim">3 Simple Steps</span>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-sm border border-hairline bg-panel p-6 space-y-3">
            <span className="font-mono text-2xl font-bold text-ember">01</span>
            <h3 className="text-base font-bold uppercase tracking-wide text-fg">
              Select Your Box
            </h3>
            <p className="text-xs leading-relaxed text-fg-muted">
              Choose from our curated collection of celebratory box templates designed for family festivals, parties, and weddings.
            </p>
          </div>

          <div className="rounded-sm border border-hairline bg-panel p-6 space-y-3">
            <span className="font-mono text-2xl font-bold text-ember">02</span>
            <h3 className="text-base font-bold uppercase tracking-wide text-fg">
              Upload & Personalise
            </h3>
            <p className="text-xs leading-relaxed text-fg-muted">
              Upload your photograph (JPG, PNG, WebP, HEIC). Adjust scale and position, and type your custom name and greeting in real-time.
            </p>
          </div>

          <div className="rounded-sm border border-hairline bg-panel p-6 space-y-3">
            <span className="font-mono text-2xl font-bold text-ember">03</span>
            <h3 className="text-base font-bold uppercase tracking-wide text-fg">
              Handcrafted & Shipped
            </h3>
            <p className="text-xs leading-relaxed text-fg-muted">
              Each box is custom-printed and packed in Sivakasi, then securely dispatched directly to your doorstep with Cash on Delivery.
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. The Interactive Personalisation Studio ── */}
      <div
        ref={studioRef}
        id="customise-studio"
        className="scroll-mt-24 rounded-sm border border-hairline-strong bg-panel p-5 sm:p-8 lg:p-10 space-y-8"
      >
        <div className="border-b border-hairline pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="live-dot font-mono text-xs font-bold uppercase tracking-[0.16em] text-ember">
              Interactive Customisation Studio
            </span>
            <h2 className="mt-1 text-2xl font-extrabold uppercase tracking-wide text-fg sm:text-3xl">
              Design Your Box
            </h2>
          </div>
          <div className="text-right">
            <span className="label text-fg-dim">All-Inclusive Price</span>
            <p className="numeric text-2xl font-bold text-fg">{formatINR(unitPrice)}</p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-sm border border-status-danger/60 bg-status-danger/10 p-4 text-sm text-status-danger"
          >
            {error}
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* ── Left Column: Live Box Preview ── */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-fg">
                Real-Time Box Preview
              </label>
              <span className="text-[11px] font-mono text-ember">
                {photoPreviewUrl ? '● Live Rendering' : '○ Awaiting Photograph'}
              </span>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-sm border border-hairline-strong bg-void shadow-2xl">
              {/* Background template artwork */}
              <div className="absolute inset-0 z-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={templateArtwork}
                  alt={selectedTemplate?.name ?? 'Personalised Box'}
                  className="size-full object-cover opacity-90 transition-opacity duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />
              </div>

              {/* Photo placement portal */}
              <div className="absolute inset-x-8 top-12 bottom-24 z-10 flex items-center justify-center overflow-hidden rounded-sm border border-dashed border-ember/70 bg-black/60 backdrop-blur-xs">
                {photoPreviewUrl ? (
                  <div
                    className="relative size-full select-none"
                    style={{
                      transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale / 100})`,
                      transition: 'transform 0.05s ease-out',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreviewUrl}
                      alt="Customer photograph"
                      className="size-full object-contain pointer-events-none"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group flex flex-col items-center justify-center p-6 text-center transition-colors hover:text-ember"
                  >
                    <span className="text-4xl text-ember transition-transform group-hover:scale-110">📷</span>
                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-fg">
                      Your Photo Prints Here
                    </p>
                    <p className="mt-1 text-[11px] text-fg-muted">
                      Click to upload family portrait or photo
                    </p>
                  </button>
                )}
              </div>

              {/* Gold/Ember Name Plaque at bottom of box */}
              <div className="absolute inset-x-4 bottom-3 z-20 rounded-xs border border-ember/60 bg-black/85 px-4 py-2.5 text-center backdrop-blur-sm shadow-lg">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ember">
                  {activeGreeting}
                </p>
                <p className="truncate text-sm font-extrabold tracking-wide text-white uppercase sm:text-base">
                  {customerName.trim() || 'YOUR NAME HERE'}
                </p>
              </div>
            </div>

            {/* Photo Pan & Zoom adjustments (shown when photo is uploaded) */}
            {photoPreviewUrl && (
              <div className="rounded-sm border border-hairline bg-panel-raised p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-fg">
                    Adjust Photo Position & Zoom
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setScale(100);
                      setOffsetX(0);
                      setOffsetY(0);
                    }}
                    className="text-[11px] font-mono uppercase tracking-[0.12em] text-ember hover:underline"
                  >
                    Reset Center
                  </button>
                </div>

                {/* Scale Zoom Slider */}
                <div>
                  <div className="flex justify-between text-xs text-fg-muted">
                    <span>Zoom Scale</span>
                    <span className="font-mono">{scale}%</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setScale((s) => Math.max(50, s - 10))}
                      className="grid size-7 place-items-center rounded-xs border border-hairline text-sm text-fg hover:border-ember"
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value))}
                      className="h-1.5 flex-1 cursor-pointer accent-ember"
                    />
                    <button
                      type="button"
                      onClick={() => setScale((s) => Math.min(200, s + 10))}
                      className="grid size-7 place-items-center rounded-xs border border-hairline text-sm text-fg hover:border-ember"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Pan Controls (Nudge) */}
                <div>
                  <span className="text-xs text-fg-muted">Nudge Position</span>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOffsetX((x) => x - 8)}
                      className="rounded-xs border border-hairline px-2.5 py-1 text-xs font-mono text-fg hover:border-ember"
                    >
                      ← Left
                    </button>
                    <button
                      type="button"
                      onClick={() => setOffsetY((y) => y - 8)}
                      className="rounded-xs border border-hairline px-2.5 py-1 text-xs font-mono text-fg hover:border-ember"
                    >
                      ↑ Up
                    </button>
                    <button
                      type="button"
                      onClick={() => setOffsetY((y) => y + 8)}
                      className="rounded-xs border border-hairline px-2.5 py-1 text-xs font-mono text-fg hover:border-ember"
                    >
                      ↓ Down
                    </button>
                    <button
                      type="button"
                      onClick={() => setOffsetX((x) => x + 8)}
                      className="rounded-xs border border-hairline px-2.5 py-1 text-xs font-mono text-fg hover:border-ember"
                    >
                      Right →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: Customisation Panel ── */}
          <div className="lg:col-span-6 space-y-6">
            {/* Step 1: Template Selection */}
            {templates.length > 1 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-fg">
                    1. Choose Box Template
                  </label>
                  <span className="font-mono text-[11px] text-fg-dim">
                    {templates.length} Designs
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {templates.map((tpl) => {
                    const isCurrent = tpl.id === selectedId;
                    const img = primaryImage(tpl);
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setSelectedId(tpl.id)}
                        className={`group relative flex flex-col items-center rounded-sm border p-2 text-left transition-all ${
                          isCurrent
                            ? 'border-ember bg-ember/10 ring-1 ring-ember'
                            : 'border-hairline bg-panel-raised hover:border-hairline-strong'
                        }`}
                      >
                        <div className="relative aspect-square w-full overflow-hidden rounded-xs bg-void">
                          {img ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={img}
                              alt={tpl.name}
                              className="size-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="grid size-full place-items-center text-xs text-fg-ghost">Box</div>
                          )}
                        </div>
                        <span className="mt-2 block w-full truncate text-[11px] font-semibold uppercase tracking-wider text-fg">
                          {tpl.name}
                        </span>
                        <span className="numeric block w-full text-[10px] text-fg-dim">
                          {formatINR(pricePaise(tpl))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Upload Photograph */}
            <div className="space-y-3 rounded-sm border border-hairline bg-panel-raised p-4">
              <label className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-fg">
                2. Upload Your Photograph
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant={photoPreviewUrl ? 'outline' : 'solid'}
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="font-mono text-xs uppercase tracking-[0.14em]"
                >
                  {uploading
                    ? `Uploading (${uploadProgress}%)…`
                    : photoPreviewUrl
                    ? 'Change Photograph'
                    : 'Choose Photograph →'}
                </Button>

                {uploadFilename && (
                  <span className="truncate text-xs text-fg-muted font-mono max-w-[200px]">
                    {uploadFilename}
                  </span>
                )}
              </div>

              {uploading && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-void">
                  <div
                    className="h-full bg-ember transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              <p className="text-[11px] text-fg-dim">
                Supported: JPEG, PNG, WebP, HEIC · Up to 10 MB. High-resolution portrait recommended.
              </p>
            </div>

            {/* Step 3: Custom Inscription Details */}
            <div className="space-y-4 rounded-sm border border-hairline bg-panel-raised p-4">
              <label className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-fg">
                3. Custom Inscription & Greeting
              </label>

              {/* Greeting Selection */}
              <div>
                <span className="text-xs text-fg-muted">Celebration Greeting</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {GREETING_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setGreeting(preset);
                        setIsCustomGreeting(false);
                      }}
                      className={`rounded-xs px-2.5 py-1 text-xs font-mono transition-colors ${
                        !isCustomGreeting && greeting === preset
                          ? 'border border-ember bg-ember text-white'
                          : 'border border-hairline bg-panel text-fg-muted hover:text-fg'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomGreeting(true)}
                    className={`rounded-xs px-2.5 py-1 text-xs font-mono transition-colors ${
                      isCustomGreeting
                        ? 'border border-ember bg-ember text-white'
                        : 'border border-hairline bg-panel text-fg-muted hover:text-fg'
                    }`}
                  >
                    Custom…
                  </button>
                </div>

                {isCustomGreeting && (
                  <div className="mt-2">
                    <Input
                      value={customGreeting}
                      onChange={(e) => setCustomGreeting(e.target.value)}
                      placeholder="e.g. Wedding Celebration, Happy New Year"
                      maxLength={40}
                      className="font-mono text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Customer Name */}
              <Field
                label="Name to Print on Box"
                hint="e.g. The Sharma Family, Priya & Siddharth, or your company name"
              >
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter name (max 40 characters)"
                  maxLength={40}
                  className="font-mono text-sm uppercase tracking-wider"
                />
              </Field>
            </div>

            {/* Step 4: Quantity & Purchase */}
            <div className="space-y-4 rounded-sm border border-hairline-strong bg-void p-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="label text-fg-dim">Total Amount</span>
                  <p className="numeric text-2xl font-extrabold text-fg">
                    {formatINR(totalPrice)}
                  </p>
                  <p className="text-[11px] text-fg-dim">
                    {quantity} &times; {formatINR(unitPrice)} · Inclusive of all taxes
                  </p>
                </div>

                <QuantityStepper
                  value={quantity}
                  onChange={setQuantity}
                  label="Box Quantity"
                />
              </div>

              <Button
                size="lg"
                variant="solid"
                onClick={handleAddToCart}
                disabled={uploading}
                className="w-full py-3.5 font-mono text-xs font-bold uppercase tracking-[0.16em]"
              >
                {!photoKey && !photoPreviewUrl
                  ? 'Upload Photograph to Proceed'
                  : !customerName.trim()
                  ? 'Enter Printed Name to Proceed'
                  : `Add to Cart — ${formatINR(totalPrice)}`}
              </Button>

              {added && (
                <div className="flex items-center justify-between rounded-xs border border-status-success/50 bg-status-success/10 p-3 text-xs text-status-success">
                  <span>✓ Added personalised box to your cart!</span>
                  <Link
                    href="/cart"
                    className="font-mono font-bold uppercase tracking-wider text-ember underline"
                  >
                    View Cart →
                  </Link>
                </div>
              )}

              <p className="text-center font-mono text-[11px] text-fg-dim">
                Handcrafted & Packed in Sivakasi · Cash on Delivery Available
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

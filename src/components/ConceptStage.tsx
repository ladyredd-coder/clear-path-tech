import React, { useState } from 'react';
import { Download, Film, RefreshCw, Sparkles, Upload } from 'lucide-react';
import { ConceptSlot, LogoAsset } from '../types/studio';
import { downloadLogoAsPng, downloadSvgMarkup } from '../utils/exportAndMotion';

interface ConceptStageProps {
  slots: ConceptSlot[];
  selectedAsset: LogoAsset | null;
  onSelectAsset: (asset: LogoAsset) => void;
  onRetrySlot: (slotIndex: number) => void;
  onSendToMotion: (asset: LogoAsset) => void;
  onUploadFile: (file: File) => void;
  onLoadSample: (sampleKey: 'orbital' | 'vesper') => void;
}

type ProofSurface = 'charcoal' | 'paper' | 'slate';

export const ConceptStage: React.FC<ConceptStageProps> = ({
  slots,
  selectedAsset,
  onSelectAsset,
  onRetrySlot,
  onSendToMotion,
  onUploadFile,
  onLoadSample,
}) => {
  const [proofSurface, setProofSurface] = useState<ProofSurface>('charcoal');

  const proofClasses: Record<ProofSurface, string> = {
    charcoal: 'bg-[#101114] studio-grid-bg border-white/[0.08]',
    paper: 'bg-[#F5F3EE] studio-grid-light border-black/[0.08]',
    slate: 'bg-[#262A34] border-white/[0.1]',
  };

  if (slots.length === 0 && !selectedAsset) {
    return (
      <section className="flex-1 studio-grid-bg p-8 lg:p-12 flex items-center justify-center">
        <div className="max-w-2xl w-full border border-white/[0.08] bg-[#17191E]/95 rounded-xl p-8 lg:p-10">
          <div className="text-xs font-medium text-[#E5A93C]">
            Identity & Motion Workspace
          </div>
          <h1 className="mt-2 font-display text-3xl lg:text-4xl font-semibold tracking-tight text-[#F3F4F6] text-balance">
            Design side-by-side logo concepts, then bring your mark to life.
          </h1>
          <p className="mt-4 text-sm lg:text-base text-[#9CA3AF] leading-relaxed max-w-xl">
            Describe your company in the brief rail, choose a style direction and 1K, 2K, or 4K output resolution, and compare multiple art-directed concepts before animating into 16:9 or 9:16 video.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 gap-4 pt-6 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => onLoadSample('orbital')}
              className="text-left p-4 rounded-lg bg-[#101114] border border-white/[0.08] hover:border-[#E5A93C] transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#F3F4F6] group-hover:text-[#E5A93C] transition-colors">
                  Try Tech Brief
                </span>
                <Sparkles className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#E5A93C] transition-colors" />
              </div>
              <p className="mt-1.5 text-xs text-[#9CA3AF] leading-relaxed">
                Kestrel Orbital — autonomous satellite logistics with minimalist geometric marks.
              </p>
            </button>

            <label className="text-left p-4 rounded-lg bg-[#101114] border border-white/[0.08] hover:border-[#E5A93C] transition-colors cursor-pointer group">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#F3F4F6] group-hover:text-[#E5A93C] transition-colors">
                  Upload Existing Logo
                </span>
                <Upload className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#E5A93C] transition-colors" />
              </div>
              <p className="mt-1.5 text-xs text-[#9CA3AF] leading-relaxed">
                Bring your own PNG, JPG, or WebP logo directly into the studio to animate.
              </p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadFile(f);
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 studio-grid-bg p-6 lg:p-8 flex flex-col gap-8 min-w-0">
      {slots.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h1 className="font-display text-xl font-semibold text-[#F3F4F6]">
                Generated Logo Concepts
              </h1>
              <p className="mt-0.5 text-xs text-[#9CA3AF]">
                Select any mark to proof contrast or send directly to the Motion Stage.
              </p>
            </div>
            <div className="font-mono text-xs tabular-nums text-[#9CA3AF]">
              {slots.filter((s) => s.status === 'ready').length} / {slots.length} ready
            </div>
          </div>

          <div
            className={`grid gap-5 ${
              slots.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : slots.length === 3
                ? 'grid-cols-1 md:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
            }`}
          >
            {slots.map((slot) => {
              const isSelected =
                slot.asset && selectedAsset && slot.asset.id === selectedAsset.id;

              return (
                <div
                  key={slot.slotIndex}
                  className={`rounded-xl border bg-[#17191E] overflow-hidden flex flex-col transition-colors ${
                    isSelected
                      ? 'border-[#E5A93C]'
                      : 'border-white/[0.08] hover:border-white/[0.2]'
                  }`}
                >
                  <div className="relative aspect-square bg-[#101114] flex items-center justify-center overflow-hidden">
                    {slot.status === 'loading' && (
                      <div className="w-full h-full p-6 flex flex-col items-center justify-center gap-3">
                        <div className="w-24 h-24 rounded-xl bg-white/[0.05] animate-pulse" />
                        <span className="font-mono text-xs text-[#9CA3AF]">
                          Rendering {slot.variationLabel}...
                        </span>
                      </div>
                    )}

                    {slot.status === 'error' && (
                      <div className="p-6 text-center flex flex-col items-center gap-3">
                        <p className="text-xs text-red-400 leading-relaxed max-w-[240px]">
                          {slot.error || 'Concept generation failed.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => onRetrySlot(slot.slotIndex)}
                          className="h-9 px-3 rounded-lg bg-[#1E2128] border border-white/[0.12] hover:border-[#E5A93C] text-xs font-medium text-[#F3F4F6] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry Slot</span>
                        </button>
                      </div>
                    )}

                    {slot.status === 'ready' && slot.asset && (
                      <button
                        type="button"
                        onClick={() => onSelectAsset(slot.asset!)}
                        className="w-full h-full focus:outline-none group"
                        aria-label={`Select ${slot.variationLabel} concept`}
                      >
                        <img
                          src={slot.asset.dataUrl}
                          alt={`${slot.asset.companyName} ${slot.variationLabel} logo concept`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-3 transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                      </button>
                    )}
                  </div>

                  <div className="p-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#F3F4F6] truncate">
                        {slot.variationLabel}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#9CA3AF] truncate">
                        <span>{slot.asset?.styleLabel ?? 'Queued'}</span>
                        {slot.asset && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {slot.asset.resolutionLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {slot.status === 'ready' && slot.asset && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            void downloadLogoAsPng(
                              slot.asset!.dataUrl,
                              slot.asset!.resolutionLabel,
                              `${slot.asset!.companyName.toLowerCase().replace(/\s+/g, '-') || 'logo'}-${slot.slotIndex + 1}.png`
                            )
                          }
                          title={`Download ${slot.asset.resolutionLabel} PNG`}
                          aria-label="Download PNG"
                          className="w-9 h-9 rounded-lg bg-[#1E2128] border border-white/[0.08] hover:border-white/[0.25] flex items-center justify-center text-[#9CA3AF] hover:text-[#F3F4F6] transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onSendToMotion(slot.asset!)}
                          className="h-9 px-3 rounded-lg bg-[#1E2128] border border-white/[0.12] hover:border-[#E5A93C] hover:text-[#E5A93C] text-xs font-semibold text-[#F3F4F6] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>Animate</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedAsset && (
        <div className="border border-white/[0.08] bg-[#17191E] rounded-xl p-6 flex flex-col lg:flex-row gap-6 items-stretch">
          <div
            className={`w-full lg:w-72 aspect-square rounded-lg border flex items-center justify-center shrink-0 overflow-hidden transition-colors ${proofClasses[proofSurface]}`}
          >
            <img
              src={selectedAsset.dataUrl}
              alt={`${selectedAsset.companyName} active logo proof`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain p-5"
            />
          </div>

          <div className="flex-1 flex flex-col justify-between gap-6 min-w-0">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#F3F4F6]">
                    {selectedAsset.companyName || 'Selected Artwork'} — {selectedAsset.variationLabel}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
                    <span>{selectedAsset.source === 'uploaded' ? 'Uploaded Image' : selectedAsset.styleLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{selectedAsset.resolutionLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedAsset.createdAt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 p-1 rounded-lg bg-[#101114] border border-white/[0.08]">
                  {(
                    [
                      { id: 'charcoal', label: 'Charcoal' },
                      { id: 'paper', label: 'Light Paper' },
                      { id: 'slate', label: 'Slate' },
                    ] as Array<{ id: ProofSurface; label: string }>
                  ).map((surface) => (
                    <button
                      key={surface.id}
                      type="button"
                      onClick={() => setProofSurface(surface.id)}
                      className={`h-8 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        proofSurface === surface.id
                          ? 'bg-[#1E2128] text-[#F3F4F6]'
                          : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                      }`}
                    >
                      {surface.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-sm text-[#9CA3AF] leading-relaxed max-w-2xl">
                Proof how this mark holds contrast across dark charcoal and daylight paper surfaces, download the master PNG, or send it to the Motion Stage to render a 16:9 or 9:16 animated reveal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => onSendToMotion(selectedAsset)}
                className="h-10 px-5 rounded-lg bg-[#E5A93C] hover:bg-[#EDB955] text-[#101114] text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Film className="w-4 h-4" />
                <span>Animate Selected Logo</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  void downloadLogoAsPng(
                    selectedAsset.dataUrl,
                    selectedAsset.resolutionLabel,
                    `${selectedAsset.companyName.toLowerCase().replace(/\s+/g, '-') || 'logo'}-${selectedAsset.resolutionLabel}.png`
                  )
                }
                className="h-10 px-4 rounded-lg bg-[#1E2128] border border-white/[0.12] hover:border-white/[0.25] text-sm font-medium text-[#F3F4F6] inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG ({selectedAsset.resolutionLabel})</span>
              </button>

              {selectedAsset.svgMarkup && (
                <button
                  type="button"
                  onClick={() =>
                    downloadSvgMarkup(
                      selectedAsset.svgMarkup!,
                      `${selectedAsset.companyName.toLowerCase().replace(/\s+/g, '-') || 'logo'}.svg`
                    )
                  }
                  className="h-10 px-4 rounded-lg bg-[#1E2128] border border-white/[0.12] hover:border-white/[0.25] text-sm font-medium text-[#F3F4F6] inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download SVG</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

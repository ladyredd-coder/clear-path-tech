import React, { useRef, useState } from 'react';
import { Upload, Wand2 } from 'lucide-react';
import {
  BrandBrief,
  EngineMode,
  ImageResolution,
  LOGO_STYLE_PRESETS,
  LogoStyleId,
} from '../types/studio';

interface BriefRailProps {
  engineMode: EngineMode;
  onChangeEngineMode: (mode: EngineMode) => void;
  brief: BrandBrief;
  onChangeBrief: (next: BrandBrief) => void;
  onGenerate: () => void;
  onUploadFile: (file: File) => void;
  isGenerating: boolean;
  onLoadSample: (sampleKey: 'orbital' | 'vesper') => void;
}

const RESOLUTIONS: ImageResolution[] = ['1K', '2K', '4K'];
const CONCEPT_COUNTS: Array<2 | 3 | 4> = [2, 3, 4];

export const BriefRail: React.FC<BriefRailProps> = ({
  engineMode,
  onChangeEngineMode,
  brief,
  onChangeBrief,
  onGenerate,
  onUploadFile,
  isGenerating,
  onLoadSample,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateField = <K extends keyof BrandBrief>(key: K, value: BrandBrief[K]) => {
    onChangeBrief({ ...brief, [key]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUploadFile(file);
    }
  };

  const canSubmit =
    !isGenerating && (brief.companyName.trim().length > 0 || brief.description.trim().length > 0);

  return (
    <aside className="w-full lg:w-[380px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#17191E] p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-[#9CA3AF]">API Key Mode</span>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#101114] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => onChangeEngineMode('free')}
            className={`h-9 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              engineMode === 'free'
                ? 'bg-[#E5A93C] text-[#101114] font-semibold'
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            Free Key · Vector
          </button>
          <button
            type="button"
            onClick={() => onChangeEngineMode('paid')}
            className={`h-9 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              engineMode === 'paid'
                ? 'bg-[#E5A93C] text-[#101114] font-semibold'
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            Paid Key · Pro 4K
          </button>
        </div>
        <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
          {engineMode === 'free'
            ? 'Uses Gemini 4 Hydrogen to design scalable SVG logos & browser-rendered motion.'
            : 'Uses Gemini 3 Pro Image (1K–4K) & Gemini Omni Flash for MP4 video.'}
        </p>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-base font-semibold text-[#F3F4F6]">
          Brand Brief
        </h2>
        <div className="flex items-center gap-3 text-xs text-[#9CA3AF]">
          <button
            type="button"
            onClick={() => onLoadSample('orbital')}
            className="hover:text-[#E5A93C] transition-colors whitespace-nowrap shrink-0"
          >
            Sample: Tech
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => onLoadSample('vesper')}
            className="hover:text-[#E5A93C] transition-colors whitespace-nowrap shrink-0"
          >
            Sample: Atelier
          </button>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onGenerate();
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="company-name" className="text-xs font-medium text-[#9CA3AF]">
            Company Name
          </label>
          <input
            id="company-name"
            type="text"
            value={brief.companyName}
            onChange={(e) => updateField('companyName', e.target.value)}
            placeholder="e.g. Northstar Robotics"
            className="h-11 px-3.5 rounded-lg bg-[#101114] border border-white/[0.1] text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#E5A93C] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="company-desc" className="text-xs font-medium text-[#9CA3AF]">
            Description & Symbol Ideas
          </label>
          <textarea
            id="company-desc"
            rows={3}
            value={brief.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe what your company builds, its personality, and any visual motifs to explore..."
            className="p-3.5 rounded-lg bg-[#101114] border border-white/[0.1] text-sm text-[#F3F4F6] placeholder:text-[#6B7280] leading-relaxed resize-none focus:outline-none focus:border-[#E5A93C] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[#9CA3AF]">Style Preset</span>
          <div className="grid grid-cols-2 gap-2.5">
            {LOGO_STYLE_PRESETS.map((preset) => {
              const selected = brief.stylePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => updateField('stylePreset', preset.id as LogoStyleId)}
                  className={`text-left p-3 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93C] ${
                    selected
                      ? 'bg-[#1E2128] border-[#E5A93C] text-[#F3F4F6]'
                      : 'bg-[#101114]/60 border-white/[0.08] text-[#9CA3AF] hover:border-white/[0.18] hover:text-[#F3F4F6]'
                  }`}
                >
                  <div className="text-xs font-semibold leading-snug text-[#F3F4F6]">
                    {preset.label}
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-[#9CA3AF]">
                    {preset.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="palette-hint" className="text-xs font-medium text-[#9CA3AF]">
            Color Direction (Optional)
          </label>
          <input
            id="palette-hint"
            type="text"
            value={brief.paletteHint}
            onChange={(e) => updateField('paletteHint', e.target.value)}
            placeholder="e.g. Brushed silver, obsidian, warm amber"
            className="h-10 px-3.5 rounded-lg bg-[#101114] border border-white/[0.1] text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#E5A93C] transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[#9CA3AF]">Output Size</span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#101114] border border-white/[0.08]">
              {RESOLUTIONS.map((size) => {
                const active = brief.imageSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => updateField('imageSize', size)}
                    className={`h-8 rounded-md font-mono text-xs font-medium tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#E5A93C] text-[#101114]'
                        : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[#9CA3AF]">Concepts</span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#101114] border border-white/[0.08]">
              {CONCEPT_COUNTS.map((count) => {
                const active = brief.conceptCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => updateField('conceptCount', count)}
                    className={`h-8 rounded-md font-mono text-xs font-medium tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#1E2128] text-[#F3F4F6] border border-white/[0.14]'
                        : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                    }`}
                  >
                    {count}x
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-11 px-4 rounded-lg bg-[#E5A93C] hover:bg-[#EDB955] disabled:opacity-45 disabled:pointer-events-none text-[#101114] text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#17191E]"
        >
          <Wand2 className="w-4 h-4 shrink-0" />
          <span>{isGenerating ? 'Designing Concepts...' : 'Generate Logo Concepts'}</span>
        </button>
      </form>

      <div className="pt-5 border-t border-white/[0.08] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#9CA3AF]">Or Upload Existing Logo</span>
          <span className="font-mono text-[11px] text-[#6B7280]">PNG · JPG · WEBP</span>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`p-4 rounded-lg border border-dashed cursor-pointer transition-colors flex items-center gap-3 ${
            isDragging
              ? 'border-[#E5A93C] bg-[#E5A93C]/10'
              : 'border-white/[0.14] bg-[#101114]/50 hover:border-white/[0.28]'
          }`}
        >
          <div className="w-9 h-9 rounded-md bg-[#1E2128] border border-white/[0.08] flex items-center justify-center shrink-0">
            <Upload className="w-4 h-4 text-[#E5A93C]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#F3F4F6]">
              Upload photo or logo artwork
            </div>
            <div className="text-[11px] text-[#9CA3AF] truncate">
              Drop file here or click to browse for animation
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </aside>
  );
};

import React, { useRef, useState } from 'react';
import { MessageSquare, Upload, Wand2 } from 'lucide-react';
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
  onOpenChat: () => void;
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
  onOpenChat,
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
    <aside className="w-full lg:w-[380px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-6 flex flex-col gap-6">
      <button
        type="button"
        onClick={onOpenChat}
        className="w-full p-3.5 rounded-xl bg-[#EEF2FF] border border-indigo-200 hover:border-[#4F46E5] text-left flex items-center gap-3 transition-colors group"
      >
        <div className="w-9 h-9 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center shrink-0">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-900 group-hover:text-[#4F46E5] transition-colors">
            Not sure what you want?
          </div>
          <div className="text-[11px] text-slate-600 truncate">
            Chat with Gemini Brand Guide for ideas
          </div>
        </div>
      </button>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-slate-600">API Key Mode</span>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#F1F5F9] border border-slate-200">
          <button
            type="button"
            onClick={() => onChangeEngineMode('free')}
            className={`h-9 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              engineMode === 'free'
                ? 'bg-white text-[#4F46E5] font-semibold shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Free Key · Vector
          </button>
          <button
            type="button"
            onClick={() => onChangeEngineMode('paid')}
            className={`h-9 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              engineMode === 'paid'
                ? 'bg-white text-[#4F46E5] font-semibold shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Paid Key · Pro 4K
          </button>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {engineMode === 'free'
            ? 'Uses Gemini 4 Hydrogen to design scalable SVG logos & browser-rendered motion.'
            : 'Uses Gemini 3 Pro Image (1K–4K) & Gemini Omni Flash for MP4 video.'}
        </p>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Brand Brief
        </h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => onLoadSample('orbital')}
            className="hover:text-[#4F46E5] transition-colors whitespace-nowrap shrink-0"
          >
            Sample: Tech
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => onLoadSample('vesper')}
            className="hover:text-[#4F46E5] transition-colors whitespace-nowrap shrink-0"
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
          <label htmlFor="company-name" className="text-xs font-medium text-slate-600">
            Company Name
          </label>
          <input
            id="company-name"
            type="text"
            value={brief.companyName}
            onChange={(e) => updateField('companyName', e.target.value)}
            placeholder="e.g. Sunbeam Bakery"
            className="h-11 px-3.5 rounded-lg bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="company-desc" className="text-xs font-medium text-slate-600">
            Description & Symbol Ideas
          </label>
          <textarea
            id="company-desc"
            rows={3}
            value={brief.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe what your company builds, its personality, and any visual motifs to explore..."
            className="p-3.5 rounded-lg bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 leading-relaxed resize-none focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-600">Style Preset</span>
          <div className="grid grid-cols-2 gap-2.5">
            {LOGO_STYLE_PRESETS.map((preset) => {
              const selected = brief.stylePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => updateField('stylePreset', preset.id as LogoStyleId)}
                  className={`text-left p-3 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${
                    selected
                      ? 'bg-[#EEF2FF] border-[#4F46E5] text-slate-900'
                      : 'bg-[#F8FAFC] border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <div className="text-xs font-semibold leading-snug text-slate-900">
                    {preset.label}
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-slate-500">
                    {preset.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="palette-hint" className="text-xs font-medium text-slate-600">
            Color Direction (Optional)
          </label>
          <input
            id="palette-hint"
            type="text"
            value={brief.paletteHint}
            onChange={(e) => updateField('paletteHint', e.target.value)}
            placeholder="e.g. Sky blue, mint green, clean white"
            className="h-10 px-3.5 rounded-lg bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-slate-600">Output Size</span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#F1F5F9] border border-slate-200">
              {RESOLUTIONS.map((size) => {
                const active = brief.imageSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => updateField('imageSize', size)}
                    className={`h-8 rounded-md font-mono text-xs font-medium tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#4F46E5] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-slate-600">Concepts</span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#F1F5F9] border border-slate-200">
              {CONCEPT_COUNTS.map((count) => {
                const active = brief.conceptCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => updateField('conceptCount', count)}
                    className={`h-8 rounded-md font-mono text-xs font-medium tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
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
          className="h-11 px-4 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-45 disabled:pointer-events-none text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <Wand2 className="w-4 h-4 shrink-0" />
          <span>{isGenerating ? 'Designing Concepts...' : 'Generate Logo Concepts'}</span>
        </button>
      </form>

      <div className="pt-5 border-t border-slate-200 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">Or Upload Existing Logo</span>
          <span className="font-mono text-[11px] text-slate-400">PNG · JPG · WEBP</span>
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
              ? 'border-[#4F46E5] bg-[#EEF2FF]'
              : 'border-slate-300 bg-[#F8FAFC] hover:border-[#4F46E5]'
          }`}
        >
          <div className="w-9 h-9 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0">
            <Upload className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-900">
              Upload photo or logo artwork
            </div>
            <div className="text-[11px] text-slate-500 truncate">
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

import React, { useRef, useState } from 'react';
import {
  Download,
  Film,
  Loader2,
  Monitor,
  Repeat,
  RotateCcw,
  Smartphone,
  Upload,
} from 'lucide-react';
import {
  AnimationAsset,
  EngineMode,
  LogoAsset,
  MOTION_PRESETS,
  MotionPresetId,
  VideoAspectRatio,
} from '../types/studio';

interface MotionStageProps {
  engineMode: EngineMode;
  onChangeEngineMode: (mode: EngineMode) => void;
  logos: LogoAsset[];
  selectedLogo: LogoAsset | null;
  onSelectLogo: (asset: LogoAsset) => void;
  onUploadFile: (file: File) => void;
  aspectRatio: VideoAspectRatio;
  onChangeAspectRatio: (ratio: VideoAspectRatio) => void;
  duration: '5s' | '8s' | '10s';
  onChangeDuration: (duration: '5s' | '8s' | '10s') => void;
  motionPresetId: MotionPresetId;
  onSelectMotionPreset: (presetId: MotionPresetId) => void;
  motionPrompt: string;
  onChangeMotionPrompt: (prompt: string) => void;
  onGenerateAnimation: () => void;
  onCancelAnimation: () => void;
  animationStatus: 'idle' | 'processing' | 'completed' | 'failed';
  elapsedSeconds: number;
  animationError: string | null;
  activeAnimation: AnimationAsset | null;
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const MotionStage: React.FC<MotionStageProps> = ({
  engineMode,
  onChangeEngineMode,
  logos,
  selectedLogo,
  onSelectLogo,
  onUploadFile,
  aspectRatio,
  onChangeAspectRatio,
  duration,
  onChangeDuration,
  motionPresetId,
  onSelectMotionPreset,
  motionPrompt,
  onChangeMotionPrompt,
  onGenerateAnimation,
  onCancelAnimation,
  animationStatus,
  elapsedSeconds,
  animationError,
  activeAnimation,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLooping, setIsLooping] = useState(true);

  const isBusy = animationStatus === 'processing';
  const canGenerate = Boolean(selectedLogo) && !isBusy;

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play();
    }
  };

  return (
    <section className="flex-1 flex flex-col lg:flex-row min-w-0">
      <aside className="w-full lg:w-[380px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#17191E] p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[#9CA3AF]">Animation Engine</span>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#101114] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => onChangeEngineMode('free')}
              className={`h-8 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                engineMode === 'free'
                  ? 'bg-[#E5A93C] text-[#101114] font-semibold'
                  : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              Free Key · Canvas
            </button>
            <button
              type="button"
              onClick={() => onChangeEngineMode('paid')}
              className={`h-8 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                engineMode === 'paid'
                  ? 'bg-[#E5A93C] text-[#101114] font-semibold'
                  : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              Paid Key · Omni AI
            </button>
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-base font-semibold text-[#F3F4F6]">
            Motion Controls
          </h2>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-medium text-[#E5A93C] hover:text-[#EDB955] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                onUploadFile(f);
                e.target.value = '';
              }
            }}
            className="hidden"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[#9CA3AF]">Source Mark</span>
          {selectedLogo ? (
            <div className="p-3 rounded-lg bg-[#101114] border border-white/[0.08] flex items-center gap-3">
              <img
                src={selectedLogo.dataUrl}
                alt={selectedLogo.variationLabel}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded object-contain bg-[#17191E] border border-white/[0.06] p-1 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#F3F4F6] truncate">
                  {selectedLogo.companyName || 'Uploaded Artwork'}
                </div>
                <div className="mt-0.5 text-[11px] text-[#9CA3AF] truncate">
                  {selectedLogo.variationLabel} · {selectedLogo.resolutionLabel}
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-lg border border-dashed border-white/[0.14] bg-[#101114]/60 hover:border-[#E5A93C] text-left transition-colors"
            >
              <div className="text-xs font-medium text-[#F3F4F6]">No logo selected</div>
              <div className="mt-0.5 text-[11px] text-[#9CA3AF]">
                Click to upload a photo or generate logos in Concept Studio.
              </div>
            </button>
          )}

          {logos.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-1">
              {logos.slice(0, 8).map((logo) => {
                const active = selectedLogo?.id === logo.id;
                return (
                  <button
                    key={logo.id}
                    type="button"
                    onClick={() => onSelectLogo(logo)}
                    title={`${logo.companyName} — ${logo.variationLabel}`}
                    className={`w-11 h-11 rounded-md border bg-[#101114] p-1 shrink-0 transition-colors ${
                      active
                        ? 'border-[#E5A93C]'
                        : 'border-white/[0.08] hover:border-white/[0.25]'
                    }`}
                  >
                    <img
                      src={logo.dataUrl}
                      alt={logo.variationLabel}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[#9CA3AF]">Aspect Ratio</span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#101114] border border-white/[0.08]">
              <button
                type="button"
                onClick={() => onChangeAspectRatio('16:9')}
                className={`h-9 rounded-md font-mono text-xs font-medium tabular-nums inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  aspectRatio === '16:9'
                    ? 'bg-[#E5A93C] text-[#101114]'
                    : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>16:9</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeAspectRatio('9:16')}
                className={`h-9 rounded-md font-mono text-xs font-medium tabular-nums inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  aspectRatio === '9:16'
                    ? 'bg-[#E5A93C] text-[#101114]'
                    : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>9:16</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[#9CA3AF]">Clip Length</span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#101114] border border-white/[0.08]">
              {(['5s', '8s', '10s'] as const).map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => onChangeDuration(len)}
                  className={`h-9 rounded-md font-mono text-xs font-medium tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                    duration === len
                      ? 'bg-[#1E2128] text-[#F3F4F6] border border-white/[0.14]'
                      : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                  }`}
                >
                  {len}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[#9CA3AF]">Motion Direction</span>
          <div className="grid grid-cols-2 gap-2.5">
            {MOTION_PRESETS.map((preset) => {
              const selected = motionPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectMotionPreset(preset.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selected
                      ? 'bg-[#1E2128] border-[#E5A93C]'
                      : 'bg-[#101114]/60 border-white/[0.08] hover:border-white/[0.18]'
                  }`}
                >
                  <div className="text-xs font-semibold text-[#F3F4F6]">{preset.label}</div>
                  <div className="mt-1 text-[11px] leading-snug text-[#9CA3AF]">
                    {preset.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="motion-prompt" className="text-xs font-medium text-[#9CA3AF]">
            Animation Prompt
          </label>
          <textarea
            id="motion-prompt"
            rows={4}
            value={motionPrompt}
            onChange={(e) => onChangeMotionPrompt(e.target.value)}
            placeholder="Describe how your logo animates, lights up, or reveals..."
            className="p-3.5 rounded-lg bg-[#101114] border border-white/[0.1] text-sm text-[#F3F4F6] placeholder:text-[#6B7280] leading-relaxed resize-none focus:outline-none focus:border-[#E5A93C] transition-colors"
          />
        </div>

        {isBusy ? (
          <button
            type="button"
            onClick={onCancelAnimation}
            className="h-11 px-4 rounded-lg bg-[#1E2128] border border-white/[0.14] hover:border-red-400/60 text-sm font-semibold text-[#F3F4F6] flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Cancel Render</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={!canGenerate}
            onClick={onGenerateAnimation}
            className="h-11 px-4 rounded-lg bg-[#E5A93C] hover:bg-[#EDB955] disabled:opacity-45 disabled:pointer-events-none text-[#101114] text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Film className="w-4 h-4 shrink-0" />
            <span>Generate Animation</span>
          </button>
        )}
      </aside>

      <div className="flex-1 studio-grid-bg p-6 lg:p-10 flex flex-col items-center justify-center gap-6 min-w-0">
        <div className="w-full max-w-4xl flex flex-col gap-4 items-center">
          <div className="w-full flex items-center justify-between gap-4 text-xs text-[#9CA3AF]">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#F3F4F6]">Motion Preview Stage</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{aspectRatio}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{duration}</span>
            </div>
            {animationStatus === 'processing' && (
              <div className="font-mono tabular-nums text-[#E5A93C]">
                Elapsed {formatSeconds(elapsedSeconds)}
              </div>
            )}
          </div>

          <div
            className={`relative rounded-xl border border-white/[0.1] bg-[#0B0C0E] overflow-hidden flex items-center justify-center transition-all ${
              aspectRatio === '16:9'
                ? 'w-full aspect-video'
                : 'w-full max-w-[360px] aspect-[9/16]'
            }`}
          >
            {activeAnimation && animationStatus === 'completed' ? (
              <video
                ref={videoRef}
                key={activeAnimation.videoUrl}
                src={activeAnimation.videoUrl}
                controls
                autoPlay
                loop={isLooping}
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            ) : selectedLogo ? (
              <>
                <img
                  src={selectedLogo.dataUrl}
                  alt={`${selectedLogo.companyName} keyframe`}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-contain p-10 transition-opacity duration-200 ${
                    isBusy ? 'opacity-25' : 'opacity-95'
                  }`}
                />
                {isBusy && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-[#101114]/55 backdrop-blur-[2px]">
                    <Loader2 className="w-7 h-7 text-[#E5A93C] animate-spin" />
                    <div className="text-sm font-medium text-[#F3F4F6]">
                      Rendering animated brand reveal...
                    </div>
                    <div className="font-mono text-xs tabular-nums text-[#9CA3AF]">
                      {aspectRatio} · {duration} · {formatSeconds(elapsedSeconds)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center flex flex-col items-center gap-3 max-w-sm">
                <Film className="w-7 h-7 text-[#6B7280]" />
                <div className="text-sm font-medium text-[#F3F4F6]">
                  Select or upload a logo to animate
                </div>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Choose any generated concept from Concept Studio or upload a PNG, JPG, or WebP mark to render a {aspectRatio} animation.
                </p>
              </div>
            )}
          </div>

          {animationStatus === 'failed' && animationError && (
            <div className="w-full p-4 rounded-lg border border-red-500/30 bg-red-500/10 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-red-300 leading-relaxed">{animationError}</p>
              <button
                type="button"
                onClick={onGenerateAnimation}
                className="h-9 px-3.5 rounded-lg bg-[#1E2128] border border-white/[0.12] hover:border-[#E5A93C] text-xs font-medium text-[#F3F4F6] whitespace-nowrap shrink-0"
              >
                Retry Animation
              </button>
            </div>
          )}

          {activeAnimation && animationStatus === 'completed' && (
            <div className="w-full p-4 rounded-xl border border-white/[0.08] bg-[#17191E] flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#F3F4F6] truncate">
                  {activeAnimation.companyName || 'Brand'} — {activeAnimation.motionPresetLabel}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-[#9CA3AF]">
                  <span className="font-mono tabular-nums">{activeAnimation.aspectRatio}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{activeAnimation.duration}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeAnimation.createdAt}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLooping((prev) => !prev)}
                  className={`h-9 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    isLooping
                      ? 'bg-[#1E2128] border-[#E5A93C]/60 text-[#E5A93C]'
                      : 'bg-[#101114] border-white/[0.1] text-[#9CA3AF] hover:text-[#F3F4F6]'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>{isLooping ? 'Loop On' : 'Loop Off'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReplay}
                  className="h-9 px-3 rounded-lg bg-[#1E2128] border border-white/[0.1] hover:border-white/[0.25] text-xs font-medium text-[#F3F4F6] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Replay</span>
                </button>

                <a
                  href={
                    activeAnimation.videoUrl.startsWith('blob:')
                      ? activeAnimation.videoUrl
                      : `${activeAnimation.videoUrl}?download=1`
                  }
                  download={`forma-logo-animation.${activeAnimation.fileExtension}`}
                  className="h-9 px-4 rounded-lg bg-[#E5A93C] hover:bg-[#EDB955] text-[#101114] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {activeAnimation.fileExtension.toUpperCase()}</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

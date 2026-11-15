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
  AnimationEasing,
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
  easing: AnimationEasing;
  onChangeEasing: (easing: AnimationEasing) => void;
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
  easing,
  onChangeEasing,
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
      <aside className="w-full lg:w-[380px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-600">Animation Engine</span>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#F1F5F9] border border-slate-200">
            <button
              type="button"
              onClick={() => onChangeEngineMode('free')}
              className={`h-8 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                engineMode === 'free'
                  ? 'bg-white text-[#4F46E5] font-semibold shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Free Key · Canvas
            </button>
            <button
              type="button"
              onClick={() => onChangeEngineMode('paid')}
              className={`h-8 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                engineMode === 'paid'
                  ? 'bg-white text-[#4F46E5] font-semibold shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paid Key · Omni AI
            </button>
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Motion Controls
          </h2>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-medium text-[#4F46E5] hover:text-[#4338CA] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
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
          <span className="text-xs font-medium text-slate-600">Source Mark</span>
          {selectedLogo ? (
            <div className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 flex items-center gap-3">
              <img
                src={selectedLogo.dataUrl}
                alt={selectedLogo.variationLabel}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded object-contain bg-white border border-slate-200 p-1 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {selectedLogo.companyName || 'Uploaded Artwork'}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                  {selectedLogo.variationLabel} · {selectedLogo.resolutionLabel}
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-lg border border-dashed border-slate-300 bg-[#F8FAFC] hover:border-[#4F46E5] text-left transition-colors"
            >
              <div className="text-xs font-medium text-slate-900">No logo selected</div>
              <div className="mt-0.5 text-[11px] text-slate-500">
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
                    className={`w-11 h-11 rounded-md border bg-white p-1 shrink-0 transition-colors ${
                      active
                        ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/20'
                        : 'border-slate-200 hover:border-slate-300'
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
            <span className="text-xs font-medium text-slate-600">Aspect Ratio</span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#F1F5F9] border border-slate-200">
              <button
                type="button"
                onClick={() => onChangeAspectRatio('16:9')}
                className={`h-9 rounded-md font-mono text-xs font-medium tabular-nums inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  aspectRatio === '16:9'
                    ? 'bg-[#4F46E5] text-white'
                    : 'text-slate-600 hover:text-slate-900'
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
                    ? 'bg-[#4F46E5] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>9:16</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-slate-600">Clip Length</span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#F1F5F9] border border-slate-200">
              {(['5s', '8s', '10s'] as const).map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => onChangeDuration(len)}
                  className={`h-9 rounded-md font-mono text-xs font-medium tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                    duration === len
                      ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {len}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-600">Animation Easing</span>
          <div
            className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#F1F5F9] border border-slate-200"
            role="group"
            aria-label="Animation Easing"
          >
            {(
              [
                { id: 'ease-in', label: 'Ease In' },
                { id: 'ease-out', label: 'Ease Out' },
                { id: 'linear', label: 'Linear' },
                { id: 'bouncy', label: 'Bouncy' },
              ] as Array<{ id: AnimationEasing; label: string }>
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={easing === option.id}
                onClick={() => onChangeEasing(option.id)}
                className={`h-9 px-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  easing === option.id
                    ? 'bg-[#4F46E5] text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-600">Motion Direction</span>
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
                      ? 'bg-[#EEF2FF] border-[#4F46E5]'
                      : 'bg-[#F8FAFC] border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-900">{preset.label}</div>
                  <div className="mt-1 text-[11px] leading-snug text-slate-500">
                    {preset.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="motion-prompt" className="text-xs font-medium text-slate-600">
            Animation Prompt
          </label>
          <textarea
            id="motion-prompt"
            rows={4}
            value={motionPrompt}
            onChange={(e) => onChangeMotionPrompt(e.target.value)}
            placeholder="Describe how your logo animates, lights up, or reveals..."
            className="p-3.5 rounded-lg bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 leading-relaxed resize-none focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-colors"
          />
        </div>

        {isBusy ? (
          <button
            type="button"
            onClick={onCancelAnimation}
            className="h-11 px-4 rounded-lg bg-white border border-slate-300 hover:border-red-400 text-sm font-semibold text-slate-800 flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Cancel Render</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={!canGenerate}
            onClick={onGenerateAnimation}
            className="h-11 px-4 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-45 disabled:pointer-events-none text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Film className="w-4 h-4 shrink-0" />
            <span>Generate Animation</span>
          </button>
        )}
      </aside>

      <div className="flex-1 studio-grid-bg p-6 lg:p-10 flex flex-col items-center justify-center gap-6 min-w-0">
        <div className="w-full max-w-4xl flex flex-col gap-4 items-center">
          <div className="w-full flex items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">Motion Preview Stage</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{aspectRatio}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{duration}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{easing}</span>
            </div>
            {animationStatus === 'processing' && (
              <div className="font-mono tabular-nums text-[#4F46E5] font-medium">
                Elapsed {formatSeconds(elapsedSeconds)}
              </div>
            )}
          </div>

          <div
            className={`relative rounded-xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center transition-all shadow-sm ${
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
                className="w-full h-full object-contain bg-slate-950"
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-white/80 backdrop-blur-[2px]">
                    <Loader2 className="w-7 h-7 text-[#4F46E5] animate-spin" />
                    <div className="text-sm font-medium text-slate-900">
                      Rendering animated brand reveal...
                    </div>
                    <div className="font-mono text-xs tabular-nums text-slate-600">
                      {aspectRatio} · {duration} · {formatSeconds(elapsedSeconds)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center flex flex-col items-center gap-3 max-w-sm">
                <Film className="w-7 h-7 text-slate-400" />
                <div className="text-sm font-medium text-slate-900">
                  Select or upload a logo to animate
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Choose any generated concept from Concept Studio or upload a PNG, JPG, or WebP mark to render a {aspectRatio} animation.
                </p>
              </div>
            )}
          </div>

          {animationStatus === 'failed' && animationError && (
            <div className="w-full p-4 rounded-lg border border-red-200 bg-red-50 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-red-700 leading-relaxed">{animationError}</p>
              <button
                type="button"
                onClick={onGenerateAnimation}
                className="h-9 px-3.5 rounded-lg bg-white border border-red-200 hover:border-red-400 text-xs font-medium text-red-700 whitespace-nowrap shrink-0"
              >
                Retry Animation
              </button>
            </div>
          )}

          {activeAnimation && animationStatus === 'completed' && (
            <div className="w-full p-4 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {activeAnimation.companyName || 'Brand'} — {activeAnimation.motionPresetLabel}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
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
                      ? 'bg-[#EEF2FF] border-indigo-200 text-[#4F46E5]'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>{isLooping ? 'Loop On' : 'Loop Off'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReplay}
                  className="h-9 px-3 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-800 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
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
                  className="h-9 px-4 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
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

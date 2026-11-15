import React, { useState } from 'react';
import { Download, Film, Image as ImageIcon } from 'lucide-react';
import { AnimationAsset, LogoAsset } from '../types/studio';
import { downloadLogoAsPng } from '../utils/exportAndMotion';

interface SessionReelProps {
  logos: LogoAsset[];
  animations: AnimationAsset[];
  onAnimateLogo: (asset: LogoAsset) => void;
  onSelectAnimation: (anim: AnimationAsset) => void;
  onGoToStudio: () => void;
}

type ReelFilter = 'all' | 'logos' | 'animations';

export const SessionReel: React.FC<SessionReelProps> = ({
  logos,
  animations,
  onAnimateLogo,
  onSelectAnimation,
  onGoToStudio,
}) => {
  const [filter, setFilter] = useState<ReelFilter>('all');

  const showLogos = filter === 'all' || filter === 'logos';
  const showAnimations = filter === 'all' || filter === 'animations';
  const isEmpty = logos.length === 0 && animations.length === 0;

  return (
    <section className="flex-1 studio-grid-bg p-6 lg:p-10 flex flex-col gap-8 max-w-6xl w-full mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F3F4F6]">
            Session Reel
          </h1>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            All generated logo concepts, uploaded marks, and rendered animations from this session.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#17191E] border border-white/[0.08]">
          {(
            [
              { id: 'all', label: `All (${logos.length + animations.length})` },
              { id: 'logos', label: `Logos (${logos.length})` },
              { id: 'animations', label: `Animations (${animations.length})` },
            ] as Array<{ id: ReelFilter; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-[#1E2128] text-[#F3F4F6]'
                  : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div className="border border-white/[0.08] bg-[#17191E] rounded-xl p-10 text-center flex flex-col items-center gap-4">
          <ImageIcon className="w-8 h-8 text-[#6B7280]" />
          <div>
            <h2 className="font-display text-lg font-semibold text-[#F3F4F6]">
              Your session reel is empty
            </h2>
            <p className="mt-1 text-sm text-[#9CA3AF] max-w-md">
              Generate company logo concepts or upload an existing mark to start building your visual and motion assets.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToStudio}
            className="h-10 px-5 rounded-lg bg-[#E5A93C] hover:bg-[#EDB955] text-[#101114] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            Open Concept Studio
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {showAnimations && animations.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-base font-semibold text-[#F3F4F6]">
                Rendered Animations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {animations.map((anim) => (
                  <div
                    key={anim.id}
                    className="rounded-xl border border-white/[0.08] bg-[#17191E] overflow-hidden flex flex-col"
                  >
                    <div className="aspect-video bg-[#0B0C0E] flex items-center justify-center overflow-hidden">
                      <video
                        src={anim.videoUrl}
                        controls
                        loop
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#F3F4F6] truncate">
                          {anim.companyName || 'Brand'} · {anim.motionPresetLabel}
                        </div>
                        <div className="mt-0.5 text-xs text-[#9CA3AF] font-mono tabular-nums">
                          {anim.aspectRatio} · {anim.duration} · {anim.createdAt}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onSelectAnimation(anim)}
                          className="h-8 px-2.5 rounded-md bg-[#1E2128] border border-white/[0.1] hover:border-[#E5A93C] text-xs font-medium text-[#F3F4F6] whitespace-nowrap shrink-0"
                        >
                          Open
                        </button>
                        <a
                          href={
                            anim.videoUrl.startsWith('blob:')
                              ? anim.videoUrl
                              : `${anim.videoUrl}?download=1`
                          }
                          download={`forma-logo-animation.${anim.fileExtension}`}
                          aria-label={`Download ${anim.fileExtension.toUpperCase()}`}
                          className="w-8 h-8 rounded-md bg-[#E5A93C] hover:bg-[#EDB955] text-[#101114] flex items-center justify-center"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showLogos && logos.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-base font-semibold text-[#F3F4F6]">
                Logo Concepts & Uploads
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {logos.map((logo) => (
                  <div
                    key={logo.id}
                    className="rounded-xl border border-white/[0.08] bg-[#17191E] overflow-hidden flex flex-col"
                  >
                    <div className="aspect-square bg-[#101114] p-4 flex items-center justify-center">
                      <img
                        src={logo.dataUrl}
                        alt={`${logo.companyName} ${logo.variationLabel}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-4 border-t border-white/[0.08] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#F3F4F6] truncate">
                          {logo.companyName || 'Uploaded Mark'}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#9CA3AF] truncate">
                          {logo.variationLabel} · {logo.resolutionLabel}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            void downloadLogoAsPng(
                              logo.dataUrl,
                              logo.resolutionLabel,
                              `${logo.companyName.toLowerCase().replace(/\s+/g, '-') || 'logo'}.png`
                            )
                          }
                          aria-label="Download PNG"
                          className="w-8 h-8 rounded-md bg-[#1E2128] border border-white/[0.08] hover:border-white/[0.25] flex items-center justify-center text-[#9CA3AF] hover:text-[#F3F4F6]"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onAnimateLogo(logo)}
                          className="h-8 px-2.5 rounded-md bg-[#1E2128] border border-white/[0.1] hover:border-[#E5A93C] hover:text-[#E5A93C] text-xs font-medium text-[#F3F4F6] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <Film className="w-3 h-3" />
                          <span>Animate</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

import { useEffect, useRef, useState } from 'react';
import { BriefRail } from './components/BriefRail';
import { ConceptStage } from './components/ConceptStage';
import { MotionStage } from './components/MotionStage';
import { SessionReel } from './components/SessionReel';
import { StudioView, TopBar } from './components/TopBar';
import {
  AnimationAsset,
  BrandBrief,
  CONCEPT_VARIATIONS,
  ConceptSlot,
  EngineMode,
  LOGO_STYLE_PRESETS,
  LogoAsset,
  MOTION_PRESETS,
  MotionChoreography,
  MotionPresetId,
  VideoAspectRatio,
} from './types/studio';
import {
  rasterizeToPngDataUrl,
  renderFreeMotionVideo,
} from './utils/exportAndMotion';

const DEFAULT_BRIEF: BrandBrief = {
  companyName: '',
  description: '',
  stylePreset: 'minimalist-geometric',
  paletteHint: '',
  imageSize: '1K',
  conceptCount: 3,
};

function formatTimeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const [engineMode, setEngineMode] = useState<EngineMode>('free');
  const [activeView, setActiveView] = useState<StudioView>('concepts');
  const [brief, setBrief] = useState<BrandBrief>(DEFAULT_BRIEF);

  const [slots, setSlots] = useState<ConceptSlot[]>([]);
  const [logos, setLogos] = useState<LogoAsset[]>([]);
  const [selectedLogo, setSelectedLogo] = useState<LogoAsset | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [duration, setDuration] = useState<'5s' | '8s' | '10s'>('5s');
  const [motionPresetId, setMotionPresetId] = useState<MotionPresetId>('kinetic-assembly');
  const [motionPrompt, setMotionPrompt] = useState<string>(() =>
    MOTION_PRESETS[0].buildPrompt('')
  );
  const [animationStatus, setAnimationStatus] = useState<
    'idle' | 'processing' | 'completed' | 'failed'
  >('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [animationError, setAnimationError] = useState<string | null>(null);
  const [animations, setAnimations] = useState<AnimationAsset[]>([]);
  const [activeAnimation, setActiveAnimation] = useState<AnimationAsset | null>(null);

  const pollTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRunIdRef = useRef<number>(0);

  const stopPollingTimers = () => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (elapsedTimerRef.current !== null) {
      window.clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPollingTimers();
    };
  }, []);

  const isGeneratingConcepts = slots.some((s) => s.status === 'loading');

  const generateSingleConcept = async (
    targetBrief: BrandBrief,
    targetMode: EngineMode,
    slotIndex: number
  ): Promise<void> => {
    const variation = CONCEPT_VARIATIONS[slotIndex % CONCEPT_VARIATIONS.length];
    const styleObj =
      LOGO_STYLE_PRESETS.find((s) => s.id === targetBrief.stylePreset) ||
      LOGO_STYLE_PRESETS[0];

    setSlots((prev) =>
      prev.map((slot) =>
        slot.slotIndex === slotIndex
          ? { ...slot, status: 'loading', error: undefined }
          : slot
      )
    );

    try {
      const endpoint =
        targetMode === 'free' ? '/api/logos/generate-vector' : '/api/logos/generate';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: targetBrief.companyName,
          description: targetBrief.description,
          stylePreset: targetBrief.stylePreset,
          paletteHint: targetBrief.paletteHint,
          imageSize: targetBrief.imageSize,
          variationIndex: slotIndex,
        }),
      });

      const data = (await response.json()) as {
        dataUrl?: string;
        svgMarkup?: string;
        mimeType?: string;
        error?: string;
      };

      if (!response.ok || !data.dataUrl) {
        throw new Error(data.error || 'Logo generation failed.');
      }

      const newAsset: LogoAsset = {
        id: crypto.randomUUID(),
        source: 'generated',
        engine: targetMode,
        dataUrl: data.dataUrl,
        svgMarkup: data.svgMarkup,
        mimeType: data.mimeType || 'image/png',
        companyName: targetBrief.companyName.trim() || 'Untitled Brand',
        styleLabel: styleObj.label,
        variationLabel: variation.label,
        resolutionLabel: targetBrief.imageSize,
        createdAt: formatTimeLabel(),
      };

      setSlots((prev) =>
        prev.map((slot) =>
          slot.slotIndex === slotIndex
            ? { ...slot, status: 'ready', asset: newAsset, error: undefined }
            : slot
        )
      );
      setLogos((prev) => [newAsset, ...prev]);
      setSelectedLogo((current) => current ?? newAsset);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to generate logo concept.';
      setSlots((prev) =>
        prev.map((slot) =>
          slot.slotIndex === slotIndex
            ? { ...slot, status: 'error', error: msg }
            : slot
        )
      );
    }
  };

  const handleGenerateConcepts = (overrideBrief?: BrandBrief) => {
    const activeBrief = overrideBrief ?? brief;
    setBannerError(null);
    setActiveView('concepts');
    setSelectedLogo(null);

    const initialSlots: ConceptSlot[] = Array.from(
      { length: activeBrief.conceptCount },
      (_, idx) => ({
        slotIndex: idx,
        variationLabel: CONCEPT_VARIATIONS[idx % CONCEPT_VARIATIONS.length].label,
        status: 'loading',
      })
    );
    setSlots(initialSlots);

    for (let i = 0; i < activeBrief.conceptCount; i++) {
      void generateSingleConcept(activeBrief, engineMode, i);
    }
  };

  const handleLoadSample = (sampleKey: 'orbital' | 'vesper') => {
    const sampleBrief: BrandBrief =
      sampleKey === 'orbital'
        ? {
            companyName: 'Kestrel Orbital',
            description:
              'Autonomous orbital logistics and precision satellite servicing platform. Sharp trajectory lines, falcon wing geometry, and high-altitude engineering.',
            stylePreset: 'minimalist-geometric',
            paletteHint: 'Deep space charcoal, crisp platinum white, and signal amber',
            imageSize: brief.imageSize,
            conceptCount: brief.conceptCount,
          }
        : {
            companyName: 'Maison Vesper',
            description:
              'Botanical evening fragrance and bespoke glass apothecary studio. Crescent moon, distilled glass vessels, and timeless architectural elegance.',
            stylePreset: 'heritage-emblem',
            paletteHint: 'Obsidian black, champagne brass, and warm ivory',
            imageSize: brief.imageSize,
            conceptCount: brief.conceptCount,
          };

    setBrief(sampleBrief);
    setMotionPrompt(
      (
        MOTION_PRESETS.find((p) => p.id === motionPresetId) || MOTION_PRESETS[0]
      ).buildPrompt(sampleBrief.companyName)
    );
  };

  const handleUploadFile = (file: File) => {
    setBannerError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        setBannerError('Unable to read the selected image file.');
        return;
      }
      const companyLabel =
        brief.companyName.trim() ||
        file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');

      const uploadedAsset: LogoAsset = {
        id: crypto.randomUUID(),
        source: 'uploaded',
        engine: 'upload',
        dataUrl,
        mimeType: file.type || 'image/png',
        companyName: companyLabel,
        styleLabel: 'Uploaded Artwork',
        variationLabel: 'Custom Upload',
        resolutionLabel: 'Custom',
        createdAt: formatTimeLabel(),
      };

      setLogos((prev) => [uploadedAsset, ...prev]);
      setSelectedLogo(uploadedAsset);
      setMotionPrompt(
        (
          MOTION_PRESETS.find((p) => p.id === motionPresetId) || MOTION_PRESETS[0]
        ).buildPrompt(uploadedAsset.companyName)
      );
      setActiveView('motion');
    };
    reader.onerror = () => {
      setBannerError('Failed to load the uploaded image.');
    };
    reader.readAsDataURL(file);
  };

  const handleSendToMotion = (asset: LogoAsset) => {
    setSelectedLogo(asset);
    setMotionPrompt(
      (
        MOTION_PRESETS.find((p) => p.id === motionPresetId) || MOTION_PRESETS[0]
      ).buildPrompt(asset.companyName)
    );
    setAnimationError(null);
    if (animationStatus === 'failed') {
      setAnimationStatus('idle');
    }
    setActiveView('motion');
  };

  const handleSelectMotionPreset = (presetId: MotionPresetId) => {
    setMotionPresetId(presetId);
    const preset = MOTION_PRESETS.find((p) => p.id === presetId) || MOTION_PRESETS[0];
    setMotionPrompt(preset.buildPrompt(selectedLogo?.companyName || brief.companyName));
  };

  const handleGenerateAnimation = async () => {
    if (!selectedLogo) return;

    stopPollingTimers();
    const runId = Date.now();
    activeRunIdRef.current = runId;

    setAnimationStatus('processing');
    setAnimationError(null);
    setElapsedSeconds(0);
    setActiveAnimation(null);

    const presetObj =
      MOTION_PRESETS.find((p) => p.id === motionPresetId) || MOTION_PRESETS[0];

    const finalizeVideo = (
      videoUrl: string,
      mimeType: string,
      fileExtension: 'mp4' | 'webm',
      interactionId: string
    ) => {
      stopPollingTimers();
      const completedAnim: AnimationAsset = {
        id: crypto.randomUUID(),
        interactionId,
        sourceLogoId: selectedLogo.id,
        sourceLogoUrl: selectedLogo.dataUrl,
        companyName: selectedLogo.companyName,
        aspectRatio,
        duration,
        motionPresetLabel: presetObj.label,
        motionPrompt,
        videoUrl,
        mimeType,
        fileExtension,
        createdAt: formatTimeLabel(),
      };
      setActiveAnimation(completedAnim);
      setAnimations((prev) => [completedAnim, ...prev]);
      setAnimationStatus('completed');
    };

    if (engineMode === 'free') {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        let choreography: MotionChoreography = {
          entranceStyle:
            motionPresetId === 'studio-rim-light'
              ? 'sweep'
              : motionPresetId === 'fluid-reveal'
              ? 'fluid'
              : motionPresetId === 'cinema-showcase'
              ? 'showcase'
              : 'assemble',
          backgroundTop: '#14171D',
          backgroundBottom: '#08090C',
          accentColor: '#E5A93C',
          glowIntensity: 0.45,
          sweepAngleDeg: 28,
          zoomScale: 1.07,
          rotationDeg: 0,
          particleCount: 18,
        };

        try {
          const choreoRes = await fetch('/api/animate/choreograph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              motionPrompt,
              motionPresetId,
              companyName: selectedLogo.companyName,
            }),
          });
          if (choreoRes.ok) {
            const choreoData = (await choreoRes.json()) as {
              choreography?: MotionChoreography;
            };
            if (choreoData.choreography) {
              choreography = choreoData.choreography;
            }
          }
        } catch (choreoErr) {
          if (controller.signal.aborted) return;
          // Use deterministic preset choreography if choreography request fails transiently
        }

        if (activeRunIdRef.current !== runId || controller.signal.aborted) return;

        const rendered = await renderFreeMotionVideo({
          imageUrl: selectedLogo.dataUrl,
          aspectRatio,
          duration,
          choreography,
          companyName: selectedLogo.companyName,
          signal: controller.signal,
          onProgress: (sec) => {
            if (activeRunIdRef.current === runId) {
              setElapsedSeconds(sec);
            }
          },
        });

        if (activeRunIdRef.current !== runId || controller.signal.aborted) return;
        finalizeVideo(
          rendered.videoUrl,
          rendered.mimeType,
          rendered.fileExtension,
          `local-${runId}`
        );
      } catch (err) {
        if (activeRunIdRef.current !== runId || controller.signal.aborted) return;
        stopPollingTimers();
        setAnimationStatus('failed');
        setAnimationError(
          err instanceof Error ? err.message : 'Unable to render browser animation.'
        );
      }
      return;
    }

    // Paid Mode: Gemini Interactions API (gemini-omni-1.2-flash)
    elapsedTimerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    try {
      const preparedImage = await rasterizeToPngDataUrl(
        selectedLogo.dataUrl,
        selectedLogo.mimeType
      );

      const startRes = await fetch('/api/animate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: preparedImage.dataUrl,
          mimeType: preparedImage.mimeType,
          motionPrompt,
          aspectRatio,
          duration,
        }),
      });

      const startData = (await startRes.json()) as {
        interactionId?: string;
        status?: string;
        videoUrl?: string;
        mimeType?: string;
        error?: string;
      };

      if (activeRunIdRef.current !== runId) return;

      if (!startRes.ok) {
        throw new Error(startData.error || 'Failed to start logo animation.');
      }

      if (startData.status === 'completed' && startData.videoUrl) {
        finalizeVideo(
          startData.videoUrl,
          startData.mimeType || 'video/mp4',
          'mp4',
          startData.interactionId || ''
        );
        return;
      }

      if (!startData.interactionId) {
        throw new Error('Server did not return an interaction ID for video polling.');
      }

      const interactionId = startData.interactionId;
      let pollInFlight = false;

      pollTimerRef.current = window.setInterval(async () => {
        if (pollInFlight || activeRunIdRef.current !== runId) return;
        pollInFlight = true;
        try {
          const pollRes = await fetch(`/api/animate/${encodeURIComponent(interactionId)}`);
          const pollData = (await pollRes.json()) as {
            status?: string;
            videoUrl?: string;
            mimeType?: string;
            error?: string;
          };

          if (activeRunIdRef.current !== runId) return;

          if (!pollRes.ok || pollData.status === 'failed') {
            stopPollingTimers();
            setAnimationStatus('failed');
            setAnimationError(pollData.error || 'Video animation failed.');
            return;
          }

          if (pollData.status === 'completed' && pollData.videoUrl) {
            finalizeVideo(
              pollData.videoUrl,
              pollData.mimeType || 'video/mp4',
              'mp4',
              interactionId
            );
          }
        } catch (pollErr) {
          if (activeRunIdRef.current !== runId) return;
          stopPollingTimers();
          setAnimationStatus('failed');
          setAnimationError(
            pollErr instanceof Error ? pollErr.message : 'Lost connection while polling render.'
          );
        } finally {
          pollInFlight = false;
        }
      }, 3000);
    } catch (err) {
      if (activeRunIdRef.current !== runId) return;
      stopPollingTimers();
      setAnimationStatus('failed');
      setAnimationError(
        err instanceof Error ? err.message : 'Unable to generate animated logo.'
      );
    }
  };

  const handleCancelAnimation = () => {
    activeRunIdRef.current = 0;
    stopPollingTimers();
    setAnimationStatus('idle');
    setElapsedSeconds(0);
  };

  const handleNewBrief = () => {
    setBrief(DEFAULT_BRIEF);
    setSlots([]);
    setSelectedLogo(null);
    setBannerError(null);
    setActiveView('concepts');
  };

  return (
    <div className="min-h-screen bg-[#101114] text-[#F3F4F6] flex flex-col">
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        onNewBrief={handleNewBrief}
        logoCount={logos.length}
        animationCount={animations.length}
      />

      {bannerError && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/30 text-xs text-red-300 flex items-center justify-between gap-4">
          <span>{bannerError}</span>
          <button
            type="button"
            onClick={() => setBannerError(null)}
            className="text-xs font-medium text-red-200 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row min-w-0">
        {activeView === 'concepts' && (
          <>
            <BriefRail
              engineMode={engineMode}
              onChangeEngineMode={setEngineMode}
              brief={brief}
              onChangeBrief={setBrief}
              onGenerate={() => handleGenerateConcepts()}
              onUploadFile={handleUploadFile}
              isGenerating={isGeneratingConcepts}
              onLoadSample={handleLoadSample}
            />
            <ConceptStage
              slots={slots}
              selectedAsset={selectedLogo}
              onSelectAsset={setSelectedLogo}
              onRetrySlot={(idx) => void generateSingleConcept(brief, engineMode, idx)}
              onSendToMotion={handleSendToMotion}
              onUploadFile={handleUploadFile}
              onLoadSample={handleLoadSample}
            />
          </>
        )}

        {activeView === 'motion' && (
          <MotionStage
            engineMode={engineMode}
            onChangeEngineMode={setEngineMode}
            logos={logos}
            selectedLogo={selectedLogo}
            onSelectLogo={(asset) => {
              setSelectedLogo(asset);
              setMotionPrompt(
                (
                  MOTION_PRESETS.find((p) => p.id === motionPresetId) || MOTION_PRESETS[0]
                ).buildPrompt(asset.companyName)
              );
            }}
            onUploadFile={handleUploadFile}
            aspectRatio={aspectRatio}
            onChangeAspectRatio={setAspectRatio}
            duration={duration}
            onChangeDuration={setDuration}
            motionPresetId={motionPresetId}
            onSelectMotionPreset={handleSelectMotionPreset}
            motionPrompt={motionPrompt}
            onChangeMotionPrompt={setMotionPrompt}
            onGenerateAnimation={() => void handleGenerateAnimation()}
            onCancelAnimation={handleCancelAnimation}
            animationStatus={animationStatus}
            elapsedSeconds={elapsedSeconds}
            animationError={animationError}
            activeAnimation={activeAnimation}
          />
        )}

        {activeView === 'reel' && (
          <SessionReel
            logos={logos}
            animations={animations}
            onAnimateLogo={handleSendToMotion}
            onSelectAnimation={(anim) => {
              const matchingLogo = logos.find((l) => l.id === anim.sourceLogoId) || null;
              if (matchingLogo) setSelectedLogo(matchingLogo);
              setAspectRatio(anim.aspectRatio);
              setDuration(anim.duration);
              setMotionPrompt(anim.motionPrompt);
              setActiveAnimation(anim);
              setAnimationStatus('completed');
              setActiveView('motion');
            }}
            onGoToStudio={() => setActiveView('concepts')}
          />
        )}
      </main>
    </div>
  );
}

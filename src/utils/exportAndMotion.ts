import { ImageResolution, MotionChoreography, VideoAspectRatio } from '../types/studio';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for export.'));
    img.src = src;
  });
}

export function downloadSvgMarkup(svgMarkup: string, filename: string) {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  triggerBlobDownload(blob, filename);
}

export async function downloadLogoAsPng(
  dataUrl: string,
  resolution: ImageResolution | 'Custom',
  filename: string
) {
  const targetPx =
    resolution === '4K' ? 4096 : resolution === '2K' ? 2048 : 1024;
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = targetPx;
  canvas.height = targetPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  ctx.clearRect(0, 0, targetPx, targetPx);
  const scale = Math.min(targetPx / (img.width || targetPx), targetPx / (img.height || targetPx));
  const drawW = (img.width || targetPx) * scale;
  const drawH = (img.height || targetPx) * scale;
  const dx = (targetPx - drawW) / 2;
  const dy = (targetPx - drawH) / 2;
  ctx.drawImage(img, dx, dy, drawW, drawH);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  );
  if (!blob) throw new Error('Failed to encode PNG.');
  triggerBlobDownload(blob, filename);
}

export async function rasterizeToPngDataUrl(
  dataUrl: string,
  mimeType: string
): Promise<{ dataUrl: string; mimeType: string }> {
  if (mimeType !== 'image/svg+xml') {
    return { dataUrl, mimeType };
  }
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.fillStyle = '#101114';
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.drawImage(img, 0, 0, 1024, 1024);
  return {
    dataUrl: canvas.toDataURL('image/png'),
    mimeType: 'image/png',
  };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function pickSupportedRecorderMime(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

export async function renderFreeMotionVideo(params: {
  imageUrl: string;
  aspectRatio: VideoAspectRatio;
  duration: '5s' | '8s' | '10s';
  choreography: MotionChoreography;
  companyName: string;
  onProgress?: (elapsedSec: number) => void;
  signal?: AbortSignal;
}): Promise<{ videoUrl: string; mimeType: string; fileExtension: 'mp4' | 'webm' }> {
  const { imageUrl, aspectRatio, duration, choreography, companyName, onProgress, signal } =
    params;

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('This browser does not support video recording via MediaRecorder.');
  }

  const width = aspectRatio === '16:9' ? 1280 : 720;
  const height = aspectRatio === '16:9' ? 720 : 1280;
  const durationSec = parseInt(duration, 10) || 5;
  const durationMs = durationSec * 1000;

  const img = await loadImage(imageUrl);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  const mimeType = pickSupportedRecorderMime();
  const stream = canvas.captureStream(30);
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_500_000 })
    : new MediaRecorder(stream);

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  const particles = Array.from({ length: choreography.particleCount }, (_, i) => ({
    x: ((i * 73 + 19) % 100) / 100,
    y: ((i * 41 + 7) % 100) / 100,
    r: 1.2 + (i % 3) * 0.9,
    speed: 0.03 + (i % 5) * 0.012,
    alpha: 0.16 + (i % 4) * 0.08,
  }));

  const maxLogoBox = Math.min(width, height) * 0.54;
  const imgAspect = (img.width || 512) / (img.height || 512);
  const logoW = imgAspect >= 1 ? maxLogoBox : maxLogoBox * imgAspect;
  const logoH = imgAspect >= 1 ? maxLogoBox / imgAspect : maxLogoBox;

  const stoppedPromise = new Promise<{
    videoUrl: string;
    mimeType: string;
    fileExtension: 'mp4' | 'webm';
  }>((resolve, reject) => {
    recorder.onstop = () => {
      if (signal?.aborted) {
        reject(new Error('Animation cancelled.'));
        return;
      }
      const actualMime = recorder.mimeType || mimeType || 'video/webm';
      const blob = new Blob(chunks, { type: actualMime });
      const videoUrl = URL.createObjectURL(blob);
      resolve({
        videoUrl,
        mimeType: actualMime,
        fileExtension: actualMime.includes('mp4') ? 'mp4' : 'webm',
      });
    };
    recorder.onerror = () => {
      reject(new Error('Browser video encoder encountered an error.'));
    };
  });

  recorder.start(250);
  let startTime: number | null = null;
  let lastReportedSec = -1;

  const drawFrame = (now: number) => {
    if (signal?.aborted) {
      if (recorder.state !== 'inactive') recorder.stop();
      return;
    }

    if (startTime === null) {
      startTime = now;
    }

    const elapsed = Math.max(0, now - startTime);
    const progress = Math.max(0, Math.min(1, elapsed / durationMs));
    const currentSec = Math.floor(elapsed / 1000);
    if (currentSec !== lastReportedSec) {
      lastReportedSec = currentSec;
      onProgress?.(currentSec);
    }

    // 1. Studio gradient backdrop
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, choreography.backgroundTop);
    bgGrad.addColorStop(1, choreography.backgroundBottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle radial accent glow behind mark
    const glowPulse = 0.75 + 0.25 * easeInOutSine((progress * 2) % 1);
    const glowRadius = Math.max(12, Math.min(width, height) * 0.48);
    const radGrad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      10,
      width / 2,
      height / 2,
      glowRadius
    );
    const alphaVal = Math.max(0, Math.min(255, Math.round(choreography.glowIntensity * glowPulse * 75)));
    const alphaHex = alphaVal.toString(16).padStart(2, '0');
    radGrad.addColorStop(0, `${choreography.accentColor}${alphaHex}`);
    radGrad.addColorStop(1, `${choreography.accentColor}00`);
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Ambient particles
    for (const p of particles) {
      const normY = (((p.y - progress * p.speed) % 1) + 1) % 1;
      const py = normY * height;
      const px = p.x * width;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(0.5, p.r), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
      ctx.fill();
    }

    // 4. Logo motion transform
    const enterT = Math.max(0, Math.min(1, progress / 0.35));
    const enterEase = easeOutCubic(enterT);
    const holdT = Math.max(0, (progress - 0.35) / 0.65);

    let scale = 1;
    let alpha = 1;
    let rotRad = 0;

    if (choreography.entranceStyle === 'assemble') {
      scale = 0.78 + 0.22 * enterEase + 0.03 * holdT;
      alpha = enterEase;
      rotRad = ((1 - enterEase) * choreography.rotationDeg * Math.PI) / 180;
    } else if (choreography.entranceStyle === 'fluid') {
      scale = 0.9 + 0.1 * enterEase + 0.04 * holdT;
      alpha = enterEase;
    } else if (choreography.entranceStyle === 'sweep') {
      scale = 0.96 + 0.04 * enterEase + 0.04 * holdT;
      alpha = Math.min(1, enterEase * 1.15);
    } else {
      scale = 0.92 + (choreography.zoomScale - 0.92) * easeInOutSine(progress);
      alpha = Math.min(1, progress / 0.22);
    }

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rotRad);
    ctx.scale(Math.max(0.01, scale), Math.max(0.01, scale));
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    if (choreography.entranceStyle === 'fluid' && progress < 0.45) {
      const revealRadius = Math.max(
        0,
        Math.max(logoW, logoH) * 0.85 * easeOutCubic(Math.max(0, Math.min(1, progress / 0.45)))
      );
      ctx.beginPath();
      ctx.arc(0, 0, revealRadius, 0, Math.PI * 2);
      ctx.clip();
    }

    ctx.drawImage(img, -logoW / 2, -logoH / 2, logoW, logoH);

    // 5. Studio rim light sweep
    if (progress > 0.18 && progress < 0.85) {
      const sweepProgress = (progress - 0.18) / 0.67;
      const sweepSpan = logoW * 1.8;
      const sweepX = -sweepSpan / 2 + sweepSpan * sweepProgress;
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const rad = (choreography.sweepAngleDeg * Math.PI) / 180;
      ctx.rotate(rad);
      const sheen = ctx.createLinearGradient(sweepX - 70, 0, sweepX + 70, 0);
      sheen.addColorStop(0, 'rgba(255,255,255,0)');
      sheen.addColorStop(0.5, 'rgba(255,255,255,0.28)');
      sheen.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(-logoW, -logoH, logoW * 2, logoH * 2);
      ctx.restore();
    }

    ctx.restore();

    // 6. Subtle framing accent rule + brand caption near bottom
    if (companyName.trim()) {
      const labelAlpha = easeOutCubic(Math.min(1, Math.max(0, (progress - 0.25) / 0.3)));
      ctx.save();
      ctx.globalAlpha = labelAlpha * 0.85;
      ctx.fillStyle = choreography.accentColor;
      const barW = 36 * labelAlpha;
      ctx.fillRect(width / 2 - barW / 2, height / 2 + logoH / 2 + 26, barW, 2);
      ctx.fillStyle = '#E5E7EB';
      ctx.font = '500 18px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(companyName.trim(), width / 2, height / 2 + logoH / 2 + 56);
      ctx.restore();
    }

    if (elapsed < durationMs) {
      requestAnimationFrame(drawFrame);
    } else if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  requestAnimationFrame(drawFrame);
  return stoppedPromise;
}

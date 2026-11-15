export type EngineMode = 'free' | 'paid';

export type ImageResolution = '1K' | '2K' | '4K';

export type VideoAspectRatio = '16:9' | '9:16';

export type AnimationEasing = 'ease-in' | 'ease-out' | 'linear' | 'bouncy';

export type LogoStyleId =
  | 'minimalist-geometric'
  | 'heritage-emblem'
  | 'dimensional-3d'
  | 'illustrated-mascot';

export type MotionPresetId =
  | 'kinetic-assembly'
  | 'studio-rim-light'
  | 'fluid-reveal'
  | 'cinema-showcase';

export interface LogoStylePreset {
  id: LogoStyleId;
  label: string;
  subtitle: string;
  promptDirective: string;
}

export interface MotionPreset {
  id: MotionPresetId;
  label: string;
  subtitle: string;
  buildPrompt: (companyName: string) => string;
}

export interface BrandBrief {
  companyName: string;
  description: string;
  stylePreset: LogoStyleId;
  paletteHint: string;
  imageSize: ImageResolution;
  conceptCount: 2 | 3 | 4;
}

export interface LogoAsset {
  id: string;
  source: 'generated' | 'uploaded';
  engine: EngineMode | 'upload';
  dataUrl: string;
  svgMarkup?: string;
  mimeType: string;
  companyName: string;
  styleLabel: string;
  variationLabel: string;
  designNote?: string;
  resolutionLabel: ImageResolution | 'Custom';
  createdAt: string;
}

export interface ConceptSlot {
  slotIndex: number;
  variationLabel: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  asset?: LogoAsset;
  error?: string;
}

export interface MotionChoreography {
  entranceStyle: 'assemble' | 'sweep' | 'fluid' | 'showcase';
  backgroundTop: string;
  backgroundBottom: string;
  accentColor: string;
  glowIntensity: number;
  sweepAngleDeg: number;
  zoomScale: number;
  rotationDeg: number;
  particleCount: number;
}

export interface AnimationAsset {
  id: string;
  interactionId: string;
  sourceLogoId: string;
  sourceLogoUrl: string;
  companyName: string;
  aspectRatio: VideoAspectRatio;
  duration: '5s' | '8s' | '10s';
  easing: AnimationEasing;
  motionPresetLabel: string;
  motionPrompt: string;
  videoUrl: string;
  mimeType: string;
  fileExtension: 'mp4' | 'webm';
  createdAt: string;
}

export interface SuggestedBrief {
  ready: boolean;
  companyName: string;
  description: string;
  stylePreset: LogoStyleId;
  paletteHint: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  quickPrompts?: string[];
  suggestedBrief?: SuggestedBrief;
}

export const LOGO_STYLE_PRESETS: LogoStylePreset[] = [
  {
    id: 'minimalist-geometric',
    label: 'Minimalist Geometric',
    subtitle: 'Clean vector marks & precision wordmarks',
    promptDirective:
      'Minimalist modern geometric vector logo design, clean crisp shapes, intentional negative space, Swiss design precision, balanced proportions, flat studio presentation on a solid neutral backdrop, no mockup clutter',
  },
  {
    id: 'heritage-emblem',
    label: 'Heritage Emblem',
    subtitle: 'Classic crests, seals & bespoke monograms',
    promptDirective:
      'Classic heritage brand emblem and bespoke monogram crest logo, refined linework, architectural symmetry, timeless serif or engraved seal aesthetic, crisp studio presentation on a solid dark or neutral backdrop, no busy paper mockups',
  },
  {
    id: 'dimensional-3d',
    label: 'Dimensional 3D',
    subtitle: 'Sculpted metallic, glass & architectural icons',
    promptDirective:
      'Sculpted dimensional 3D brand icon logo, brushed anodized metal and smoked optical glass materials, crisp studio rim lighting, clean centered composition on a matte charcoal studio backdrop, sharp edges, ultra-clean commercial render',
  },
  {
    id: 'illustrated-mascot',
    label: 'Illustrated Mascot',
    subtitle: 'Expressive character badges & bold marks',
    promptDirective:
      'Expressive modern illustrated mascot and emblem badge logo, confident bold ink silhouettes, clean limited color palette, cohesive vector character mark centered on a clean solid backdrop, high legibility at small and large scales',
  },
];

export const MOTION_PRESETS: MotionPreset[] = [
  {
    id: 'kinetic-assembly',
    label: 'Kinetic Assembly',
    subtitle: 'Precision geometric pieces glide and lock cleanly',
    buildPrompt: (companyName) =>
      `Smooth luxury motion graphics brand reveal for ${companyName || 'the company'}. The elements of this exact logo subtly separate into layered planes and glide smoothly back into place with crisp architectural easing, settling into a sharp static end frame. Clean studio lighting, no text distortion.`,
  },
  {
    id: 'studio-rim-light',
    label: 'Studio Rim Light',
    subtitle: 'Specular studio sweep across tactile surfaces',
    buildPrompt: (companyName) =>
      `Cinematic studio product reveal for ${companyName || 'the company'}. A soft directional light beam sweeps gracefully across the exact logo surface, highlighting subtle metallic bevels and depth with a gentle micro-parallax camera drift while keeping the logo shape faithful and centered.`,
  },
  {
    id: 'fluid-reveal',
    label: 'Fluid Ink Reveal',
    subtitle: 'Organic motion energy resolves into crisp form',
    buildPrompt: (companyName) =>
      `High-craft fluid motion reveal for ${companyName || 'the company'}. Ethereal flowing strokes and subtle particles coalesce smoothly around the canvas to form and illuminate this exact logo mark in crisp high contrast, holding steady on the finished emblem.`,
  },
  {
    id: 'cinema-showcase',
    label: 'Cinema Showcase',
    subtitle: 'Slow dramatic push-in with subtle depth ambiance',
    buildPrompt: (companyName) =>
      `Refined theatrical title card animation for ${companyName || 'the company'}. Slow, deliberate camera push-in toward this exact centered logo with subtle atmospheric dust motes, gentle breathing glow, and rock-solid brand legibility throughout.`,
  },
];

export const CONCEPT_VARIATIONS: Array<{ label: string; angle: string }> = [
  {
    label: 'Primary Symbol',
    angle:
      'Focus on an iconic standalone symbol mark centered cleanly with generous breathing room.',
  },
  {
    label: 'Icon & Wordmark',
    angle:
      'Compose a balanced lockup pairing a distinctive geometric symbol with bespoke typography spelling the company name cleanly.',
  },
  {
    label: 'Monogram Stamp',
    angle:
      'Design a compact interlocking monogram or bold negative-space stamp crafted from the company initials.',
  },
  {
    label: 'Editorial Badge',
    angle:
      'Create a structured framed brand mark or seal composition with disciplined symmetry and sharp silhouette contrast.',
  },
];

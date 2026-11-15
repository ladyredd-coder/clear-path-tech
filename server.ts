import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface CachedVideo {
  buffer: Buffer;
  mimeType: string;
  createdAt: number;
}

const videoCache = new Map<string, CachedVideo>();
const MAX_CACHED_VIDEOS = 20;

function storeCachedVideo(buffer: Buffer, mimeType: string): string {
  if (videoCache.size >= MAX_CACHED_VIDEOS) {
    const oldestKey = videoCache.keys().next().value;
    if (oldestKey) {
      videoCache.delete(oldestKey);
    }
  }
  const id = crypto.randomUUID();
  videoCache.set(id, { buffer, mimeType, createdAt: Date.now() });
  return id;
}

interface ParsedError {
  status: number;
  message: string;
}

function formatGeminiError(err: unknown): ParsedError {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const lower = rawMessage.toLowerCase();
  console.error('[GeminiError]', rawMessage);

  if (rawMessage === 'MISSING_API_KEY') {
    return {
      status: 400,
      message:
        'Gemini API key is not configured. Please add a billing-enabled API key in Settings > Secrets.',
    };
  }
  if (lower.includes('api_key_invalid') || lower.includes('api key not valid')) {
    return {
      status: 400,
      message:
        'The configured Gemini API key is invalid. Please check your key in Settings > Secrets.',
    };
  }
  if (lower.includes('permission_denied') || lower.includes('403')) {
    return {
      status: 403,
      message:
        'Permission denied for this model. Ensure a billing-enabled Gemini API key is selected in Settings > Secrets.',
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      status: 429,
      message:
        'Quota exceeded or paid tier required for this model. Upgrade or select a billing-enabled API key in Settings > Secrets.',
    };
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 404,
      message: `Requested model or resource was not found: ${rawMessage}`,
    };
  }
  return {
    status: 500,
    message: rawMessage || 'Unexpected server error while calling Gemini API.',
  };
}

const STYLE_DIRECTIVES: Record<string, string> = {
  'minimalist-geometric':
    'Minimalist modern geometric vector logo design, crisp clean geometry, purposeful negative space, Swiss precision, flat studio mark, no realistic packaging mockups.',
  'heritage-emblem':
    'Classic heritage brand emblem and bespoke monogram crest, refined symmetrical linework, architectural seal craftsmanship, centered cleanly, no mockups.',
  'dimensional-3d':
    'Sculpted dimensional 3D brand icon logo using layered gradients, highlights, and depth planes, crisp studio lighting, sharp commercial render.',
  'illustrated-mascot':
    'Expressive modern illustrated mascot or emblem badge logo, confident bold silhouette, cohesive limited palette, clean vector character or object mark.',
};

const VARIATION_ANGLES: string[] = [
  'Primary standalone iconic symbol mark illustrating the core product or metaphor, centered with generous margin.',
  'Balanced lockup pairing a bespoke illustrated or geometric symbol on top/left with clean custom typography spelling the company name.',
  'Clever negative-space monogram or interlocking letterform crafted directly from the company initials and domain.',
  'Structured framed crest, shield, or organic badge composition with high-contrast silhouette clarity.',
];

async function extractVideoFromInteraction(
  interaction: {
    output_video?: { data?: string; uri?: string; mime_type?: string };
    steps?: Array<{
      type?: string;
      content?: Array<{ type?: string; data?: string; uri?: string; mime_type?: string }>;
    }>;
  },
  apiKey: string
): Promise<{ videoUrl: string; mimeType: string } | null> {
  let videoPart = interaction.output_video;

  if (!videoPart && Array.isArray(interaction.steps)) {
    for (let i = interaction.steps.length - 1; i >= 0; i--) {
      const step = interaction.steps[i];
      if (step.type === 'model_output' && Array.isArray(step.content)) {
        const found = step.content.find((c) => c.type === 'video');
        if (found) {
          videoPart = found;
          break;
        }
      }
    }
  }

  if (!videoPart) {
    return null;
  }

  const mimeType = videoPart.mime_type || 'video/mp4';

  if (videoPart.data) {
    const buffer = Buffer.from(videoPart.data, 'base64');
    const id = storeCachedVideo(buffer, mimeType);
    return { videoUrl: `/api/videos/${id}`, mimeType };
  }

  if (videoPart.uri) {
    const response = await fetch(videoPart.uri, {
      headers: {
        'x-goog-api-key': apiKey,
        'User-Agent': 'aistudio-build',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch generated video (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fetchedMime = response.headers.get('content-type') || mimeType;
    const id = storeCachedVideo(buffer, fetchedMime);
    return { videoUrl: `/api/videos/${id}`, mimeType: fetchedMime };
  }

  return null;
}

function sanitizeSvg(rawSvg: string): string {
  let svg = rawSvg.trim();
  const match = svg.match(/<svg[\s\S]*<\/svg>/i);
  if (match) {
    svg = match[0];
  }
  svg = svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');

  if (!/xmlns\s*=/i.test(svg)) {
    svg = svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/viewBox\s*=/i.test(svg)) {
    svg = svg.replace(/<svg/i, '<svg viewBox="0 0 512 512"');
  }
  return svg;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/logos/generate', async (req: Request, res: Response) => {
    try {
      const {
        companyName,
        description,
        stylePreset = 'minimalist-geometric',
        paletteHint = '',
        imageSize = '1K',
        variationIndex = 0,
      } = req.body as {
        companyName?: string;
        description?: string;
        stylePreset?: string;
        paletteHint?: string;
        imageSize?: string;
        variationIndex?: number;
      };

      if (!companyName?.trim() && !description?.trim()) {
        res.status(400).json({ error: 'Please provide a company name or description.' });
        return;
      }

      const validSizes = new Set(['1K', '2K', '4K']);
      const resolvedSize = validSizes.has(imageSize) ? imageSize : '1K';
      const styleDirective =
        STYLE_DIRECTIVES[stylePreset] || STYLE_DIRECTIVES['minimalist-geometric'];
      const angle = VARIATION_ANGLES[variationIndex % VARIATION_ANGLES.length];

      const promptParts = [
        `Design an original, high-craft company logo for "${companyName?.trim() || 'the brand'}".`,
        description?.trim() ? `Company & Brand Brief: ${description.trim()}.` : '',
        `Style Direction: ${styleDirective}`,
        `Composition Angle: ${angle}`,
        paletteHint?.trim()
          ? `Color Palette: ${paletteHint.trim()}.`
          : 'Color Palette: Cohesive, intentional 2 to 3 color brand palette with strong contrast.',
        'Critical Requirements: Center the logo cleanly with generous padding, sharp edges, no watermarks, no realistic desk/paper/t-shirt mockups, and no blurry text.',
      ].filter(Boolean);

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: promptParts.join('\n') }],
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1',
            imageSize: resolvedSize,
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      let imageData: string | undefined;
      let mimeType = 'image/png';
      let modelNote = '';

      for (const part of parts) {
        if (part.inlineData?.data && !imageData) {
          imageData = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'image/png';
        } else if (part.text) {
          modelNote += part.text;
        }
      }

      if (!imageData) {
        res.status(502).json({
          error: modelNote.trim() || 'No image was returned by gemini-3-pro-image-preview.',
        });
        return;
      }

      res.json({
        dataUrl: `data:${mimeType};base64,${imageData}`,
        mimeType,
        imageSize: resolvedSize,
      });
    } catch (err) {
      const parsed = formatGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  app.post('/api/logos/generate-vector', async (req: Request, res: Response) => {
    try {
      const {
        companyName,
        description,
        stylePreset = 'minimalist-geometric',
        paletteHint = '',
        variationIndex = 0,
        avoidConcepts = [],
        creativeSeed,
      } = req.body as {
        companyName?: string;
        description?: string;
        stylePreset?: string;
        paletteHint?: string;
        variationIndex?: number;
        avoidConcepts?: string[];
        creativeSeed?: number;
      };

      if (!companyName?.trim() && !description?.trim()) {
        res.status(400).json({ error: 'Please provide a company name or description.' });
        return;
      }

      const styleDirective =
        STYLE_DIRECTIVES[stylePreset] || STYLE_DIRECTIVES['minimalist-geometric'];
      const angle = VARIATION_ANGLES[variationIndex % VARIATION_ANGLES.length];
      const seedVal =
        typeof creativeSeed === 'number' && Number.isFinite(creativeSeed)
          ? Math.abs(Math.floor(creativeSeed))
          : Math.floor(Math.random() * 1_000_000) + variationIndex * 997;

      const avoidBlock =
        Array.isArray(avoidConcepts) && avoidConcepts.length > 0
          ? `Do NOT repeat or resemble any of these previously generated logo concepts—invent a completely fresh visual metaphor and silhouette:\n${avoidConcepts
              .slice(0, 8)
              .map((c, idx) => `- Previous concept ${idx + 1}: ${c}`)
              .join('\n')}`
          : '';

      const prompt = [
        `You are a senior brand identity designer crafting an original, distinctive SVG logo for "${companyName?.trim() || 'the brand'}".`,
        description?.trim()
          ? `Company & Brand Brief (PRIMARY SOURCE OF TRUTH — build your visual metaphor directly from this): ${description.trim()}.`
          : '',
        `Style Direction: ${styleDirective}`,
        `Composition Angle (Slot ${variationIndex + 1}): ${angle}`,
        paletteHint?.trim()
          ? `Color Palette: ${paletteHint.trim()}.`
          : 'Color Palette: Choose a fresh, welcoming 2 to 3 color palette tailored to this specific industry and brand mood (avoid defaulting to dark gray/gold unless requested).',
        avoidBlock,
        'Creative & SVG Craftsmanship Rules:',
        '- Invent a specific, recognizable visual metaphor rooted in the company name and description (e.g., botanical leaves, waves, wings, flames, arches, animals, tools, food, stars, musical forms). NEVER default to generic concentric circles or plain empty hexagons.',
        '- Output a complete standalone <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">.',
        '- Build expressive, well-proportioned vector artwork using 5 to 16 clean <path>, <circle>, <polygon>, <rect>, and <defs> gradient elements (keep path data concise and crisp so it renders rapidly).',
        '- Keep the outer canvas background transparent (do NOT draw a full-bleed 512x512 background square) so the logo looks great on both white paper and dark surfaces.',
        '- Keep all artwork comfortably inside x: 64..448 and y: 64..448 so nothing touches or clips at the edges.',
        '- Never use external URLs, <image>, <script>, or animation tags inside the SVG.',
      ]
        .filter(Boolean)
        .join('\n');

      const ai = getAiClient();
      const runSingleVector = async (useLite: boolean) =>
        ai.models.generateContent({
          model: useLite ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            seed: seedVal,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                rationale: {
                  type: Type.STRING,
                  description:
                    'One short sentence naming the concrete visual metaphor drawn in this SVG.',
                },
                svg: {
                  type: Type.STRING,
                  description: 'Complete valid <svg viewBox="0 0 512 512">...</svg> markup.',
                },
              },
              required: ['rationale', 'svg'],
            },
          },
        });

      let response;
      try {
        response = await runSingleVector(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
        if (msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) {
          await new Promise((r) => setTimeout(r, 800));
          response = await runSingleVector(true);
        } else {
          throw err;
        }
      }

      const rawText = (response.text ?? '{}').trim();
      const parsedJson = JSON.parse(rawText) as { svg?: string; rationale?: string };
      if (!parsedJson.svg || !parsedJson.svg.includes('<svg')) {
        res.status(502).json({ error: 'Model did not return valid SVG logo markup.' });
        return;
      }

      const cleanSvg = sanitizeSvg(parsedJson.svg);
      const base64Svg = Buffer.from(cleanSvg, 'utf8').toString('base64');

      res.json({
        svgMarkup: cleanSvg,
        dataUrl: `data:image/svg+xml;base64,${base64Svg}`,
        mimeType: 'image/svg+xml',
        rationale: parsedJson.rationale || '',
      });
    } catch (err) {
      console.error('Vector logo generation error:', err);
      const parsed = formatGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  app.post('/api/logos/generate-vector-batch', async (req: Request, res: Response) => {
    const {
      companyName,
      description,
      stylePreset = 'minimalist-geometric',
      paletteHint = '',
      conceptCount = 3,
      avoidConcepts = [],
      creativeSeed,
    } = req.body as {
      companyName?: string;
      description?: string;
      stylePreset?: string;
      paletteHint?: string;
      conceptCount?: number;
      avoidConcepts?: string[];
      creativeSeed?: number;
    };

    if (!companyName?.trim() && !description?.trim()) {
      res.status(400).json({ error: 'Please provide a company name or description.' });
      return;
    }

    const resolvedCount = Math.min(4, Math.max(2, Math.round(Number(conceptCount) || 3)));
    const styleDirective =
      STYLE_DIRECTIVES[stylePreset] || STYLE_DIRECTIVES['minimalist-geometric'];
    const seedVal =
      typeof creativeSeed === 'number' && Number.isFinite(creativeSeed)
        ? Math.abs(Math.floor(creativeSeed))
        : Math.floor(Math.random() * 1_000_000);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendEvent = (eventName: string, payload: unknown) => {
      if (res.writableEnded) return;
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    sendEvent('status', { phase: 'starting', count: resolvedCount });

    const keepaliveTimer = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': keepalive\n\n');
      }
    }, 2000);

    let clientDisconnected = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
      }
      clearInterval(keepaliveTimer);
    });

    try {
      const slotSpecs = Array.from({ length: resolvedCount }, (_, idx) => {
        const angle = VARIATION_ANGLES[idx % VARIATION_ANGLES.length];
        return `Slot ${idx + 1} (slotIndex: ${idx}): ${angle}`;
      }).join('\n');

      const avoidBlock =
        Array.isArray(avoidConcepts) && avoidConcepts.length > 0
          ? `Do NOT repeat or resemble any of these previous concepts:\n${avoidConcepts
              .slice(0, 8)
              .map((c, idx) => `- Previous concept ${idx + 1}: ${c}`)
              .join('\n')}`
          : '';

      const prompt = [
        `You are a senior brand identity designer creating ${resolvedCount} completely distinct, original SVG logo concepts side-by-side for "${companyName?.trim() || 'the brand'}".`,
        description?.trim()
          ? `Company & Brand Brief (PRIMARY SOURCE OF TRUTH): ${description.trim()}.`
          : '',
        `Style Direction: ${styleDirective}`,
        paletteHint?.trim()
          ? `Color Palette: ${paletteHint.trim()}.`
          : 'Color Palette: Choose a welcoming 2 to 3 color palette tailored to this business (never default to dark gray/gold unless requested).',
        `Creative Exploration Seed: #${seedVal}.`,
        avoidBlock,
        'Required Slots (each MUST use a genuinely different visual metaphor and silhouette from the other slots):',
        slotSpecs,
        'Strict SVG Rules for EVERY concept:',
        '- Output a standalone <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">.',
        '- Craft rich, agency-quality vector marks using 6 to 14 layered primitives (<path>, <circle>, <rect rx="...">, <polygon>, <defs><linearGradient>...</linearGradient></defs>, and crisp negative-space cutouts). Never output plain unstyled boxes.',
        '- Keep the canvas background transparent (NO full-bleed 512x512 background rect).',
        '- Keep all artwork inside x: 64..448 and y: 64..448.',
        '- Never use external URLs, <image>, <script>, or animation tags.',
      ]
        .filter(Boolean)
        .join('\n');

      const ai = getAiClient();
      const buildRequestParams = (useLite: boolean) => ({
        model: useLite ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          seed: seedVal,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              concepts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    slotIndex: {
                      type: Type.INTEGER,
                      description: 'Zero-based slot index (0, 1, 2, or 3).',
                    },
                    rationale: {
                      type: Type.STRING,
                      description: 'One short sentence naming the specific visual metaphor drawn.',
                    },
                    svg: {
                      type: Type.STRING,
                      description: 'Complete valid <svg viewBox="0 0 512 512">...</svg> markup.',
                    },
                  },
                  required: ['slotIndex', 'rationale', 'svg'],
                },
              },
            },
            required: ['concepts'],
          },
        },
      });

      let stream;
      try {
        stream = await ai.models.generateContentStream(buildRequestParams(false));
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
        const isRateLimit = msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota');
        if (isRateLimit && !clientDisconnected) {
          await new Promise((r) => setTimeout(r, 800));
          stream = await ai.models.generateContentStream(buildRequestParams(true));
        } else {
          throw err;
        }
      }

      let fullText = '';
      if (stream) {
        for await (const chunk of stream) {
          if (clientDisconnected) break;
          if (chunk.text) {
            fullText += chunk.text;
          }
        }
      }

      if (clientDisconnected) {
        clearInterval(keepaliveTimer);
        return;
      }

      const parsedJson = JSON.parse(fullText.trim() || '{}') as {
        concepts?: Array<{ slotIndex?: number; rationale?: string; svg?: string }>;
      };
      const items = Array.isArray(parsedJson.concepts) ? parsedJson.concepts : [];

      if (items.length === 0) {
        sendEvent('error', {
          error: 'Model did not return SVG logo concepts. Please try again.',
        });
      } else {
        for (let i = 0; i < resolvedCount; i++) {
          const item = items.find((c) => c.slotIndex === i) || items[i];
          if (item?.svg && item.svg.includes('<svg')) {
            const cleanSvg = sanitizeSvg(item.svg);
            const base64Svg = Buffer.from(cleanSvg, 'utf8').toString('base64');
            sendEvent('slot', {
              slotIndex: i,
              svgMarkup: cleanSvg,
              dataUrl: `data:image/svg+xml;base64,${base64Svg}`,
              mimeType: 'image/svg+xml',
              rationale: item.rationale || '',
            });
          } else {
            sendEvent('slotError', {
              slotIndex: i,
              error: 'Concept slot returned incomplete SVG markup.',
            });
          }
        }
        sendEvent('done', { count: resolvedCount });
      }
    } catch (err) {
      console.error('Batch vector logo generation error:', err);
      const parsed = formatGeminiError(err);
      sendEvent('error', { error: parsed.message });
    } finally {
      clearInterval(keepaliveTimer);
      if (!res.writableEnded) {
        res.end();
      }
    }
  });

  app.post('/api/animate/choreograph', async (req: Request, res: Response) => {
    try {
      const { motionPrompt = '', motionPresetId = 'kinetic-assembly', companyName = '' } =
        req.body as {
          motionPrompt?: string;
          motionPresetId?: string;
          companyName?: string;
        };

      const ai = getAiClient();
      const runChoreograph = async (useLite: boolean) =>
        ai.models.generateContent({
          model: useLite ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen',
          contents: [
            `Create canvas animation parameters for an animated brand logo reveal for "${companyName || 'the company'}".`,
            `Motion Preset: ${motionPresetId}.`,
            `User Motion Prompt: ${motionPrompt || 'Clean studio reveal with subtle rim light sweep.'}`,
            'Return valid hex colors (#RRGGBB) with deep studio background contrast and a refined accent color matching the mood of the prompt.',
          ].join('\n'),
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                entranceStyle: {
                  type: Type.STRING,
                  description: 'One of: assemble, sweep, fluid, showcase',
                },
                backgroundTop: { type: Type.STRING, description: 'Hex color like #111318' },
                backgroundBottom: { type: Type.STRING, description: 'Hex color like #07080A' },
                accentColor: { type: Type.STRING, description: 'Hex highlight color like #E5A93C' },
                glowIntensity: { type: Type.NUMBER, description: 'Number between 0.1 and 0.9' },
                sweepAngleDeg: { type: Type.NUMBER, description: 'Angle in degrees -60 to 60' },
                zoomScale: { type: Type.NUMBER, description: 'Target zoom scale 1.02 to 1.15' },
                rotationDeg: { type: Type.NUMBER, description: 'Subtle entrance rotation -12 to 12' },
                particleCount: { type: Type.INTEGER, description: 'Ambient particles 0 to 40' },
              },
              required: [
                'entranceStyle',
                'backgroundTop',
                'backgroundBottom',
                'accentColor',
                'glowIntensity',
                'sweepAngleDeg',
                'zoomScale',
                'rotationDeg',
                'particleCount',
              ],
            },
          },
        });

      let response;
      try {
        response = await runChoreograph(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
        if (msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) {
          await new Promise((r) => setTimeout(r, 600));
          response = await runChoreograph(true);
        } else {
          throw err;
        }
      }

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const validStyles = new Set(['assemble', 'sweep', 'fluid', 'showcase']);
      const fallbackStyle =
        motionPresetId === 'studio-rim-light'
          ? 'sweep'
          : motionPresetId === 'fluid-reveal'
          ? 'fluid'
          : motionPresetId === 'cinema-showcase'
          ? 'showcase'
          : 'assemble';

      res.json({
        choreography: {
          entranceStyle: validStyles.has(String(parsed.entranceStyle))
            ? parsed.entranceStyle
            : fallbackStyle,
          backgroundTop:
            typeof parsed.backgroundTop === 'string' && /^#[0-9a-f]{6}$/i.test(parsed.backgroundTop)
              ? parsed.backgroundTop
              : '#14171D',
          backgroundBottom:
            typeof parsed.backgroundBottom === 'string' &&
            /^#[0-9a-f]{6}$/i.test(parsed.backgroundBottom)
              ? parsed.backgroundBottom
              : '#090A0D',
          accentColor:
            typeof parsed.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(parsed.accentColor)
              ? parsed.accentColor
              : '#E5A93C',
          glowIntensity: Math.min(0.9, Math.max(0.1, Number(parsed.glowIntensity) || 0.45)),
          sweepAngleDeg: Math.min(60, Math.max(-60, Number(parsed.sweepAngleDeg) || 28)),
          zoomScale: Math.min(1.16, Math.max(1.01, Number(parsed.zoomScale) || 1.06)),
          rotationDeg: Math.min(15, Math.max(-15, Number(parsed.rotationDeg) || 0)),
          particleCount: Math.min(40, Math.max(0, Math.round(Number(parsed.particleCount) || 18))),
        },
      });
    } catch (err) {
      const parsed = formatGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { messages = [], currentBrief } = req.body as {
        messages?: Array<{ role: 'user' | 'assistant'; text: string }>;
        currentBrief?: {
          companyName?: string;
          description?: string;
          stylePreset?: string;
          paletteHint?: string;
        };
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Please send at least one message.' });
        return;
      }

      const conversationTranscript = messages
        .slice(-12)
        .map((m) => `${m.role === 'user' ? 'Client' : 'Brand Guide'}: ${m.text}`)
        .join('\n');

      const briefContext = currentBrief
        ? `Current brief in editor — Company Name: "${currentBrief.companyName || '(blank)'}", Description: "${currentBrief.description || '(blank)'}", Style: "${currentBrief.stylePreset || 'minimalist-geometric'}", Colors: "${currentBrief.paletteHint || '(none)'}".`
        : '';

      const ai = getAiClient();
      const runChat = async (useLite: boolean) =>
        ai.models.generateContent({
          model: useLite ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen',
          contents: [
            briefContext,
            'Conversation so far:',
            conversationTranscript,
            'Respond warmly as the Brand Guide. Keep your reply concise (2–4 friendly sentences). If the client is still unsure, ask 1–2 simple questions (like what they sell, who their customers are, or what feeling they want—modern, cozy, bold, playful). As soon as you have enough information to propose a strong logo direction (or if they ask for ideas), set suggestedBrief.ready = true with concrete, thoughtful values they can apply directly to their brief.',
          ]
            .filter(Boolean)
            .join('\n\n'),
          config: {
            systemInstruction:
              'You are the friendly, welcoming Gemini Brand Guide inside Forma Studio. You help clients who are unsure what they want for their company logo discover clear visual symbols, typography styles, and welcoming color palettes. Never use technical jargon. Valid stylePreset values are strictly: "minimalist-geometric", "heritage-emblem", "dimensional-3d", "illustrated-mascot".',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.STRING,
                  description: 'Friendly, encouraging conversational response.',
                },
                quickPrompts: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2 to 3 short clickable follow-up replies the client might tap next.',
                },
                suggestedBrief: {
                  type: Type.OBJECT,
                  properties: {
                    ready: {
                      type: Type.BOOLEAN,
                      description: 'True when there is enough context to apply a concrete logo brief.',
                    },
                    companyName: { type: Type.STRING },
                    description: {
                      type: Type.STRING,
                      description: 'Rich visual logo description with clear symbols and mood.',
                    },
                    stylePreset: {
                      type: Type.STRING,
                      description:
                        'One of: minimalist-geometric, heritage-emblem, dimensional-3d, illustrated-mascot',
                    },
                    paletteHint: {
                      type: Type.STRING,
                      description: '2 to 3 harmonious colors with friendly mood.',
                    },
                  },
                  required: ['ready'],
                },
              },
              required: ['reply', 'quickPrompts'],
            },
          },
        });

      let response;
      try {
        response = await runChat(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
        if (msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) {
          await new Promise((r) => setTimeout(r, 600));
          response = await runChat(true);
        } else {
          throw err;
        }
      }

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as {
        reply?: string;
        quickPrompts?: string[];
        suggestedBrief?: {
          ready?: boolean;
          companyName?: string;
          description?: string;
          stylePreset?: string;
          paletteHint?: string;
        };
      };

      const validStyles = new Set([
        'minimalist-geometric',
        'heritage-emblem',
        'dimensional-3d',
        'illustrated-mascot',
      ]);

      const cleanBrief =
        parsed.suggestedBrief?.ready && parsed.suggestedBrief.description
          ? {
              ready: true,
              companyName: parsed.suggestedBrief.companyName || currentBrief?.companyName || '',
              description: parsed.suggestedBrief.description,
              stylePreset: validStyles.has(String(parsed.suggestedBrief.stylePreset))
                ? parsed.suggestedBrief.stylePreset
                : 'minimalist-geometric',
              paletteHint: parsed.suggestedBrief.paletteHint || '',
            }
          : undefined;

      res.json({
        reply:
          parsed.reply ||
          'Tell me a little bit about what your company does and the feeling you want customers to get—we will shape a great logo together.',
        quickPrompts: Array.isArray(parsed.quickPrompts)
          ? parsed.quickPrompts.slice(0, 3)
          : [],
        suggestedBrief: cleanBrief,
      });
    } catch (err) {
      const parsed = formatGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  app.post('/api/animate/start', async (req: Request, res: Response) => {
    try {
      const {
        imageBase64,
        mimeType = 'image/png',
        motionPrompt,
        aspectRatio = '16:9',
        duration = '5s',
      } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        motionPrompt?: string;
        aspectRatio?: string;
        duration?: string;
      };

      if (!imageBase64) {
        res.status(400).json({ error: 'A logo or image is required to generate an animation.' });
        return;
      }

      const validRatios = new Set(['16:9', '9:16']);
      const resolvedRatio = validRatios.has(aspectRatio) ? (aspectRatio as '16:9' | '9:16') : '16:9';

      const validDurations = new Set(['3s', '4s', '5s', '6s', '7s', '8s', '9s', '10s']);
      const resolvedDuration = validDurations.has(duration) ? duration : '5s';

      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      const promptText =
        motionPrompt?.trim() ||
        'Smooth luxury brand logo reveal animation. Subtle studio lighting sweeps across this exact logo mark with gentle kinetic polish, keeping the logo recognizable and centered.';

      const ai = getAiClient();
      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input: [
            {
              type: 'image',
              mime_type: mimeType,
              data: cleanBase64,
            },
            {
              type: 'text',
              text: promptText,
            },
          ],
          background: true,
          store: true,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: resolvedRatio,
            duration: resolvedDuration,
          },
        },
        { timeout: 300000 }
      );

      if (interaction.status === 'completed') {
        const apiKey = process.env.GEMINI_API_KEY || '';
        const extracted = await extractVideoFromInteraction(interaction, apiKey);
        if (extracted) {
          res.json({
            interactionId: interaction.id,
            status: 'completed',
            videoUrl: extracted.videoUrl,
            mimeType: extracted.mimeType,
          });
          return;
        }
      }

      if (interaction.status === 'failed' || interaction.status === 'cancelled') {
        const errText =
          interaction.errors?.map((e) => e.message).filter(Boolean).join('; ') ||
          'Video generation failed.';
        res.status(500).json({ error: errText });
        return;
      }

      res.json({
        interactionId: interaction.id,
        status: interaction.status || 'in_progress',
      });
    } catch (err) {
      const parsed = formatGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  app.get('/api/animate/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '');
      if (!id) {
        res.status(400).json({ error: 'Interaction ID is required.' });
        return;
      }

      const ai = getAiClient();
      const interaction = await ai.interactions.get(id);

      if (interaction.status === 'completed') {
        const apiKey = process.env.GEMINI_API_KEY || '';
        const extracted = await extractVideoFromInteraction(interaction, apiKey);
        if (!extracted) {
          res.status(502).json({
            status: 'failed',
            error: 'Video interaction completed, but no video payload was returned.',
          });
          return;
        }
        res.json({
          interactionId: interaction.id,
          status: 'completed',
          videoUrl: extracted.videoUrl,
          mimeType: extracted.mimeType,
        });
        return;
      }

      if (interaction.status === 'failed' || interaction.status === 'cancelled') {
        const errText =
          interaction.errors?.map((e) => e.message).filter(Boolean).join('; ') ||
          `Animation ${interaction.status}.`;
        res.json({
          interactionId: interaction.id,
          status: 'failed',
          error: errText,
        });
        return;
      }

      res.json({
        interactionId: interaction.id,
        status: interaction.status || 'in_progress',
      });
    } catch (err) {
      const parsed = formatGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  app.get('/api/videos/:id', (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    const cached = videoCache.get(id);
    if (!cached) {
      res.status(404).json({ error: 'Video not found or expired from session cache.' });
      return;
    }

    const { buffer, mimeType } = cached;
    const totalLength = buffer.length;

    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="forma-logo-animation-${id.slice(0, 8)}.mp4"`);
    }

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
      if (Number.isNaN(start) || start >= totalLength || end >= totalLength) {
        res.status(416).setHeader('Content-Range', `bytes */${totalLength}`).end();
        return;
      }
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });
      res.end(buffer.subarray(start, end + 1));
      return;
    }

    res.writeHead(200, {
      'Content-Length': totalLength,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    });
    res.end(buffer);
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Forma Studio listening on http://0.0.0.0:${PORT}`);
  });
  server.requestTimeout = 360000;
}

startServer().catch((err) => {
  console.error('Failed to start Forma Studio server:', err);
  process.exit(1);
});

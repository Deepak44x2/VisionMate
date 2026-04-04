import * as cocoSsd from '@tensorflow-models/coco-ssd';
import type { ObjectDetection } from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

export interface LocalLocateResult {
  found: boolean;
  confidence: number;
  x: number;
  y: number;
  area: number;
  detectedLabel: string;
}

let modelPromise: Promise<ObjectDetection> | null = null;

export const canonicalizeTargetLabel = (target: string): string => {
  const t = normalize(target);
  if (!t) return t;
  if (t.includes('bottle')) return 'bottle';
  if (t.includes('cup') || t.includes('mug') || t.includes('glass')) return 'cup';
  if (t.includes('phone') || t.includes('mobile') || t.includes('smartphone') || t.includes('cell phone')) return 'cell phone';
  if (t.includes('laptop') || t.includes('notebook')) return 'laptop';
  if (t.includes('keyboard')) return 'keyboard';
  if (t.includes('mouse')) return 'mouse';
  if (t.includes('chair') || t.includes('seat')) return 'chair';
  if (t.includes('book')) return 'book';
  if (t.includes('tv') || t.includes('television') || t.includes('monitor') || t.includes('screen')) return 'tv';
  if (t.includes('remote')) return 'remote';
  if (t.includes('keys') || t.includes('key')) return 'key';
  if (t.includes('wallet') || t.includes('purse')) return 'wallet';
  if (t.includes('box') || t.includes('carton') || t.includes('package')) return 'box';
  if (t.includes('bag') || t.includes('backpack') || t.includes('handbag')) return 'backpack';
  return t;
};

const normalize = (v: string) => v.toLowerCase().trim();

export const loadLocalDetector = async (): Promise<void> => {
  if (!modelPromise) {
    modelPromise = cocoSsd.load({ base: 'lite_mobilenet_v2' });
  }
  await modelPromise;
};

export const locateTargetLocally = async (
  source: HTMLCanvasElement,
  target: string
): Promise<LocalLocateResult | null> => {
  if (!modelPromise) return null;
  const model = await modelPromise;
  const preds = await model.detect(source);
  if (!preds.length) return null;

  const canonical = canonicalizeTargetLabel(target);
  const best = preds
    .map((p) => {
      const cls = normalize(p.class);
      const ok = cls === normalize(canonical);
      return { p, s: ok ? p.score : 0 };
    })
    .sort((a, b) => b.s - a.s)[0];

  if (!best || best.s < 0.35) return null;
  const [x, y, w, h] = best.p.bbox;
  const width = source.width || 1;
  const height = source.height || 1;
  const centerX = (x + w / 2) / width;
  const centerY = (y + h / 2) / height;
  const area = (w * h) / (width * height);
  return {
    found: true,
    confidence: best.s,
    x: Math.min(1, Math.max(0, centerX)),
    y: Math.min(1, Math.max(0, centerY)),
    area: Math.min(1, Math.max(0, area)),
    detectedLabel: best.p.class,
  };
};
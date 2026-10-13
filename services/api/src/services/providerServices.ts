import type { ProviderResult } from "@orvix/types";
import { env } from "../env.js";

export interface OcrExtraction {
  rawText: string;
  fields: Record<string, unknown>;
  confidence: number;
}

export interface FoodPhotoDetection {
  label: string;
  confidence: number;
  estimatedQuantity?: number;
  estimatedUnit?: string;
}

export interface BarcodeProviderProduct {
  barcode: string;
  name: string;
  brand?: string;
  nutrients?: Record<string, number | null>;
}

function notConfigured<T>(provider: string | undefined, capability: string): ProviderResult<T> {
  return {
    configured: false,
    provider: provider ?? null,
    message: `${capability} provider is not configured. Add provider credentials to .env to enable real processing.`
  };
}

export class BarcodeProvider {
  async lookup(barcode: string): Promise<ProviderResult<BarcodeProviderProduct>> {
    if (!env.BARCODE_PROVIDER || !env.BARCODE_API_KEY) {
      return notConfigured(env.BARCODE_PROVIDER, "Barcode lookup");
    }
    return {
      configured: true,
      provider: env.BARCODE_PROVIDER,
      message: `Provider ${env.BARCODE_PROVIDER} is configured, but adapter implementation must be enabled for barcode ${barcode}.`
    };
  }
}

export class OcrProvider {
  async extractNutritionLabel(_imageUrl: string): Promise<ProviderResult<OcrExtraction>> {
    if (!env.OCR_PROVIDER || !env.OCR_API_KEY) {
      return notConfigured(env.OCR_PROVIDER, "OCR");
    }
    return {
      configured: true,
      provider: env.OCR_PROVIDER,
      message: `Provider ${env.OCR_PROVIDER} is configured; production adapter should call the provider API here.`
    };
  }
}

export class VisionProvider {
  async detectFoods(_imageUrl: string): Promise<ProviderResult<FoodPhotoDetection[]>> {
    if (!env.VISION_PROVIDER || !env.VISION_API_KEY) {
      return notConfigured(env.VISION_PROVIDER, "Vision food detection");
    }
    return {
      configured: true,
      provider: env.VISION_PROVIDER,
      message: `Provider ${env.VISION_PROVIDER} is configured; production adapter should call the vision model here.`
    };
  }
}

export class AiProvider {
  async chat(_prompt: string, _context: unknown): Promise<ProviderResult<{ text: string }>> {
    if (!env.AI_PROVIDER || !env.AI_API_KEY) {
      return notConfigured(env.AI_PROVIDER, "AI coaching");
    }
    return {
      configured: true,
      provider: env.AI_PROVIDER,
      message: `Provider ${env.AI_PROVIDER} is configured; production adapter should call the model here.`
    };
  }
}

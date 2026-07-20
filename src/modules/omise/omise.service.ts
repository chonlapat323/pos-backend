import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ChargeStatus =
  'successful' | 'failed' | 'pending' | 'reversed' | 'expired';

type OmiseCharge = {
  id: string;
  status: ChargeStatus;
  amount: number;
  currency: string;
  description?: string;
  expires_at?: string;
  source?: {
    scannable_code?: {
      image?: { download_uri?: string };
    };
  };
};

/**
 * The SVG is XML, so a literal `+` inside the base64 payload can be written as the numeric
 * entity `&#43;` - left as-is, that corrupts the base64 alphabet and produces a garbage/
 * unreadable image once decoded. Unescape the handful of entities that can plausibly appear.
 */
function unescapeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCharCode(Number(code)),
    );
}

/**
 * Omise's PromptPay QR "scannable_code" download is a decorative SVG (bank header + logo +
 * a TEST MODE banner) with the actual scannable QR embedded as a raster <image>, positioned
 * outside the SVG's own declared viewBox - it renders clipped/blank in any spec-compliant SVG
 * renderer (confirmed on-device, not an RN-specific quirk). Pull the raw QR PNG straight out of
 * the markup instead of rendering the wrapper: it's the largest data:image/png <image> tag (the
 * other PNG in there is a small centered bank-logo overlay, not the scannable pattern itself).
 */
function extractQrImageUri(svg: string): string {
  const candidates = [...svg.matchAll(/<image[^>]*>/g)]
    .map((match) => match[0])
    .map((tag) => ({
      width: Number(tag.match(/width="(\d+)"/)?.[1] ?? 0),
      href: tag.match(/href="(data:image\/png;base64,[^"]+)"/)?.[1],
    }))
    .filter((candidate): candidate is { width: number; href: string } =>
      Boolean(candidate.href),
    );

  candidates.sort((a, b) => b.width - a.width);
  const href = candidates[0]?.href ?? '';
  return href ? unescapeXmlEntities(href) : '';
}

@Injectable()
export class OmiseService {
  private readonly logger = new Logger(OmiseService.name);
  private readonly apiUrl = 'https://api.omise.co';

  constructor(private readonly configService: ConfigService) {}

  private get authHeader(): string {
    const secretKey = this.configService.getOrThrow<string>('OMISE_SECRET_KEY');
    return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
  }

  async createPromptPayCharge(params: {
    amountThb: number;
    description: string;
  }): Promise<{ chargeId: string; qrImageUri: string; expiresAt: string }> {
    const amountSatangs = Math.round(params.amountThb * 100);

    const sourceRes = await fetch(`${this.apiUrl}/sources`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'promptpay',
        amount: amountSatangs,
        currency: 'thb',
      }),
    });
    const sourceData = (await sourceRes.json()) as Record<string, unknown> & {
      id?: string;
      message?: string;
    };
    if (!sourceRes.ok) {
      throw new Error(
        sourceData.message ?? 'Failed to create PromptPay source',
      );
    }

    const chargeRes = await fetch(`${this.apiUrl}/charges`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountSatangs,
        currency: 'thb',
        source: sourceData.id,
        description: params.description,
      }),
    });
    const charge = (await chargeRes.json()) as OmiseCharge & {
      message?: string;
    };
    if (!chargeRes.ok) {
      throw new Error(charge.message ?? 'Failed to create PromptPay charge');
    }

    const downloadUri =
      charge.source?.scannable_code?.image?.download_uri ?? '';
    let qrImageUri = '';
    if (downloadUri) {
      try {
        const imgRes = await fetch(downloadUri);
        if (imgRes.ok) qrImageUri = extractQrImageUri(await imgRes.text());
      } catch (error) {
        this.logger.warn(
          `[createPromptPayCharge] QR fetch failed: ${String(error)}`,
        );
      }
    }

    const expiresAt =
      charge.expires_at ?? new Date(Date.now() + 15 * 60 * 1000).toISOString();
    return { chargeId: charge.id, qrImageUri, expiresAt };
  }

  async getCharge(chargeId: string): Promise<OmiseCharge> {
    const res = await fetch(`${this.apiUrl}/charges/${chargeId}`, {
      headers: { Authorization: this.authHeader },
    });
    const data = (await res.json()) as OmiseCharge & { message?: string };
    if (!res.ok) throw new Error(data.message ?? 'Failed to get charge');
    return data;
  }
}

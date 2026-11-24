import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return ['192', '512', 'maskable'].map(variant => ({ variant }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ variant: string }> },
) {
  const { variant } = await params;
  const size = variant === '192' ? 192 : 512;
  // Keep the official artwork inside the maskable icon's central safe circle.
  const artwork = Math.round(size * (variant === 'maskable' ? 0.70 : 1));
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <svg width={artwork} height={artwork} viewBox="0 0 512 512">
          <path fill="#00319D" d="M60 55H205V70C190 70 170 75 170 110V402C170 437 190 442 205 442V457H60V442C75 442 95 437 95 402V110C95 75 75 70 60 70Z" />
          <path fill="#00319D" d="M307 55H452V70C437 70 417 75 417 110V402C417 437 437 442 452 442V457H307V442C322 442 342 437 342 402V110C342 75 322 70 307 70Z" />
          <path fill="#00319D" d="M170 210H342V285L256 235 170 285Z" />
          <path fill="#FCC20A" d="M210 442V335C210 300 230 285 256 285C282 285 302 300 302 335V442Z" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}

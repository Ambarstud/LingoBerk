import type { Persona } from './types';

// Avatar images: direct Pollinations (static, browser-cacheable)
export function getPersonaImageUrl(persona: Persona, size = 400): string {
  if (!persona.imagePrompt) return '';
  const seed = persona.imageSeed ?? 1;
  return `/api/image?prompt=${encodeURIComponent(persona.imagePrompt)}&seed=${seed}&w=${size}&h=${size}`;
}

// AI-generated scene images: routed through our server to avoid browser IP rate limits
export function getPersonaGeneratedImageUrl(persona: Persona, scenePrompt: string): string {
  const base = persona.imageStyle ?? persona.imagePrompt ?? 'young woman';
  const full = `${base}, ${scenePrompt}, photorealistic, high quality, natural lighting`;
  const seed = Math.floor(Math.random() * 9000) + 1000;
  return `/api/image?prompt=${encodeURIComponent(full)}&seed=${seed}`;
}

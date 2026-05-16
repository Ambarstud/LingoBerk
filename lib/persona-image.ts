import type { Persona } from './types';

const BASE = 'https://image.pollinations.ai/prompt';
const COMMON = 'nologo=true&safe=false&model=flux';

export function getPersonaImageUrl(persona: Persona, size = 400): string {
  if (!persona.imagePrompt) return '';
  const encoded = encodeURIComponent(persona.imagePrompt);
  const seed = persona.imageSeed ?? 1;
  return `${BASE}/${encoded}?width=${size}&height=${size}&seed=${seed}&${COMMON}`;
}

export function getPersonaGeneratedImageUrl(persona: Persona, scenePrompt: string): string {
  const base = persona.imageStyle ?? persona.imagePrompt ?? 'young woman';
  const full = `${base}, ${scenePrompt}, photorealistic, high quality, natural lighting`;
  const encoded = encodeURIComponent(full);
  const seed = Math.floor(Math.random() * 9000) + 1000;
  return `${BASE}/${encoded}?width=480&height=640&seed=${seed}&${COMMON}`;
}

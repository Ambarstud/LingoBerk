import type { Persona } from './types';

export function getPersonaImageUrl(persona: Persona, size = 400): string {
  if (!persona.imagePrompt) return '';
  const encoded = encodeURIComponent(persona.imagePrompt);
  const seed = persona.imageSeed ?? 1;
  return `https://image.pollinations.ai/prompt/${encoded}?width=${size}&height=${size}&seed=${seed}&nologo=true&enhance=true`;
}

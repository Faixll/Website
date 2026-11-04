import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

/** The six hero files the client will drop into public/hero. The video switches on only when all exist (checked at build). */
export const HERO_FILES = ['hero-portrait-720.mp4', 'hero-portrait-720.webm', 'poster-portrait.jpg', 'hero-landscape-720.mp4', 'hero-landscape-720.webm', 'poster-landscape.jpg'];

export function heroVideoReady() {
  return HERO_FILES.every((f) => fs.existsSync(path.join(process.cwd(), 'public', 'hero', f)));
}

import sharp from "sharp";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { TenantContext } from "../tenant";
import { getProject } from "../projects/repository";
import { getGenerationImage } from "../generations/repository";
import { getCreativeState } from "./repository";

type Database = NodePgDatabase<Record<string, never>>;
const escapeXml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
function lines(value: string, maxChars: number) {
  const words = value.trim().split(/\s+/);
  const output: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > maxChars && line) { output.push(line); line = word; }
    else line = (line + " " + word).trim();
  }
  if (line) output.push(line);
  return output.slice(0, 3);
}
export async function renderContactSheet(db: Database, tenant: TenantContext, projectId: string) {
  const project = await getProject(db, tenant, projectId);
  const state = await getCreativeState(db, tenant, projectId);
  if (!project || !state) return null;
  if (!state.frames.length) return { empty: true as const };
  const width = 1600;
  const height = 220 + Math.ceil(state.frames.length / 2) * 830 + 90;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#141a18"/>`,
    `<text x="70" y="64" fill="#d0f95d" font-family="Arial,sans-serif" font-size="20" letter-spacing="5">FRAMEHOUSE / VISUAL STORY</text>`,
    `<text x="70" y="135" fill="#f5f4ec" font-family="Arial,sans-serif" font-size="50" font-weight="700">${escapeXml(project.title)}</text>`,
    `<line x1="70" x2="1530" y1="170" y2="170" stroke="#566157"/>`,
  ];
  const composites: { input: Buffer; left: number; top: number }[] = [];
  for (let index = 0; index < state.frames.length; index++) {
    const frame = state.frames[index];
    const image = await getGenerationImage(db, tenant, projectId, frame.generationId);
    if (!image) return null;
    const x = 70 + (index % 2) * 740;
    const y = 210 + Math.floor(index / 2) * 830;
    const square = await sharp(image).rotate().resize(700, 700, { fit: "cover" }).png().toBuffer();
    composites.push({ input: square, left: x, top: y });
    parts.push(`<text x="${x}" y="${y + 737}" fill="#d0f95d" font-family="Arial,sans-serif" font-size="23" font-weight="700">${String(index + 1).padStart(2, "0")}</text>`);
    lines(frame.caption, 48).forEach((line, row) => parts.push(`<text x="${x + 52}" y="${y + 737 + row * 28}" fill="#f5f4ec" font-family="Arial,sans-serif" font-size="23">${escapeXml(line)}</text>`));
  }
  parts.push(`</svg>`);
  const base = Buffer.from(parts.join(""));
  const png = await sharp(base).composite(composites).png().toBuffer();
  if (!(await getProject(db, tenant, projectId))) return null;
  return { empty: false as const, png };
}

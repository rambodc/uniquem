// Letter-size Safety completion record. Black text, one green rule, the Uniquem mark. Standard fonts only.
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const GREEN = rgb(0.08, 0.45, 0.36);
const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.33, 0.33, 0.33);
const PAGE = { w: 612, h: 792 }, M = 48;
const when = (iso) => iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) : "";

function wrap(text, font, size, width) {
  const words = text.split(/\s+/), lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** PDF bytes for one employee's Safety record. `report` is the object from safetyReport. */
export async function safetyReportPdf(report) {
  const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(readFileSync(new URL("./brand/uniquem-mark.png", import.meta.url)));
  const pages = [];
  const add = () => { const page = pdf.addPage([PAGE.w, PAGE.h]); pages.push(page); return { page, y: PAGE.h - M }; };
  let { page, y } = add();
  const rule = () => { page.drawRectangle({ x: M, y: y - 2, width: PAGE.w - M * 2, height: 2, color: GREEN }); y -= 14; };
  const text = (value, { size = 10, face = font, color = INK, x = M } = {}) => { page.drawText(value, { x, y, size, font: face, color }); y -= size + 4; };
  const need = (height) => { if (y - height < 56) ({ page, y } = add()); };
  const logoSize = 28;
  page.drawImage(logo, { x: M, y: y - logoSize + 8, width: logoSize, height: logoSize });
  page.drawText("UNIQUEM", { x: M + logoSize + 8, y: y - 6, size: 14, font: bold, color: GREEN });
  page.drawText("Safety training record", { x: M + logoSize + 8, y: y - 22, size: 11, font, color: INK });
  y -= 40;
  rule();
  text(report.name, { size: 13, face: bold });
  text(`${report.email}  ·  ${report.company}`, { color: MUTED });
  text(`Report generated ${when(report.generatedAt)} (America/Edmonton)`, { size: 9, color: MUTED });
  y -= 6;
  for (const lesson of report.lessons) {
    const topics = lesson.passed && lesson.topics?.length ? lesson.topics.join(" · ") : lesson.passed ? "Topics were not recorded for this completion." : "";
    const topicLines = topics ? wrap(topics, font, 9, PAGE.w - M * 2) : [];
    need(36 + topicLines.length * 12);
    text(`${lesson.category}  ·  ${lesson.title}`, { size: 11, face: bold });
    if (!lesson.passed) { text(`Version ${lesson.version}  ·  Not completed`, { size: 9, color: MUTED }); y -= 4; continue; }
    const count = lesson.correct != null && lesson.total ? `${lesson.correct}/${lesson.total}, ${lesson.score}%` : lesson.score != null ? `${lesson.score}% (question count was not recorded)` : "score was not recorded";
    text(`Version ${lesson.version}  ·  Completed ${when(lesson.completedAt)}  ·  ${count}  ·  PASS`, { size: 9 });
    for (const line of topicLines) text(line, { size: 9, color: MUTED });
    y -= 4;
  }
  need(88);
  y -= 8;
  rule();
  const attestation = wrap("I confirm I have reviewed and understood the safety training listed above.", font, 10, PAGE.w - M * 2);
  for (const line of attestation) text(line, { size: 10 });
  y -= 16;
  text("Employee signature ______________________________    Date ______________", { size: 10 });
  y -= 10;
  text("Supervisor signature ____________________________    Date ______________", { size: 10 });
  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

// Responsive image helper. Smaller copies (name-480w.webp, -800w, -1200w) sit next
// to each original in public/images, so phones download a fraction of the bytes.
const WIDTHS = [480, 800, 1200];
const intrinsic: Record<string, number> = {
  "/images/uniquem/oilfield-chemicals-hero-v3.webp": 1672,
  "/images/uniquem/industrial-facility.webp": 1672,
  "/images/uniquem/materials-warehouse.webp": 1448,
  "/images/technology-3d.webp": 1693,
  "/images/about-team-connected.webp": 1536,
  "/images/uniquem-laboratory-chemical-testing.webp": 1586,
  "/images/products/elixir-pallet.webp": 1390,
};
const widthOf = (src: string) => intrinsic[src] ?? (/^\/images\/products\/[\w-]+\.webp$/.test(src) ? 1254 : 0);

/** Props for <img>: srcSet + sizes when variants exist, otherwise just src. */
export function responsive(src: string, sizes: string) {
  const width = widthOf(src);
  if (!width) return { src };
  const srcSet = [...WIDTHS.filter((w) => w < width).map((w) => `${src.replace(/\.webp$/, `-${w}w.webp`)} ${w}w`), `${src} ${width}w`].join(", ");
  return { src, srcSet, sizes };
}

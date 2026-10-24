import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const logoSource = "public/Logo Ecclesia em Azul e Dourado.png";
const iconSource = "public/Ícone de Igreja Dourado em 3D Glossy.png";

await mkdir("public/brand", { recursive: true });
await mkdir("public/icons", { recursive: true });

await sharp(logoSource)
  .resize(900, 900, { fit: "contain" })
  .webp({ quality: 90 })
  .toFile("public/brand/ecclesia-logo.webp");

await sharp(logoSource)
  .resize(900, 900, { fit: "contain" })
  .png({ compressionLevel: 9 })
  .toFile("public/brand/ecclesia-logo.png");

await sharp(logoSource)
  .resize(240, 240, {
    fit: "contain",
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  })
  .flatten({ background: "#ffffff" })
  .png({ compressionLevel: 9 })
  .toFile("public/brand/ecclesia-email-logo.png");

await sharp(iconSource)
  .trim({ threshold: 1 })
  .resize(256, 256, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .webp({ quality: 92 })
  .toFile("public/brand/ecclesia-icon.webp");

async function buildIcon(size, contentRatio, output) {
  const contentSize = Math.round(size * contentRatio);
  const content = await sharp(iconSource)
    .trim({ threshold: 1 })
    .resize(contentSize, contentSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 11, g: 27, b: 51, alpha: 1 },
    },
  })
    .composite([{ input: content, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(output);
}

await Promise.all([
  buildIcon(192, 0.84, "public/icons/icon-192.png"),
  buildIcon(512, 0.84, "public/icons/icon-512.png"),
  buildIcon(192, 0.68, "public/icons/icon-maskable-192.png"),
  buildIcon(512, 0.68, "public/icons/icon-maskable-512.png"),
  buildIcon(180, 0.82, "public/icons/apple-touch-icon.png"),
  buildIcon(32, 0.9, "public/icons/favicon-32.png"),
  buildIcon(16, 0.94, "public/icons/favicon-16.png"),
]);

const generated = [
  "public/brand/ecclesia-logo.webp",
  "public/brand/ecclesia-logo.png",
  "public/brand/ecclesia-email-logo.png",
  "public/brand/ecclesia-icon.webp",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "public/icons/icon-maskable-192.png",
  "public/icons/icon-maskable-512.png",
  "public/icons/apple-touch-icon.png",
  "public/icons/favicon-32.png",
  "public/icons/favicon-16.png",
];

for (const file of generated) {
  const meta = await sharp(file).metadata();
  console.log(`${file} — ${meta.width}x${meta.height} — ${meta.format}`);
}

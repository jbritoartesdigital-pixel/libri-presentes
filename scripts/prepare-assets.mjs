import { mkdir, copyFile } from "node:fs/promises";
import { dirname } from "node:path";

async function copy(src, dest) {
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(src, dest);
}

await mkdir("public/vendor/fonts", { recursive: true });
await copy("node_modules/qrcode-generator/qrcode.js", "public/vendor/qrcode-generator.js");
await copy("node_modules/@tabler/icons-webfont/dist/tabler-icons.min.css", "public/vendor/tabler-icons.min.css");
await copy("node_modules/@tabler/icons-webfont/dist/fonts/tabler-icons.woff2", "public/vendor/fonts/tabler-icons.woff2");
console.log("Vendor assets preparados: QR + CSS + WOFF2 principal.");
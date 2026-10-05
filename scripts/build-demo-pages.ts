import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";

const output = "dist-demo";
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ["index.html", "iframe.html", "parent.js", "iframe.js", "utils.js", "style.css"]) {
  await copyFile(`demo/${file}`, `${output}/${file}`);
}
// Match the existing deployment: unknown URLs must not fall back to the demo.
await writeFile(`${output}/404.html`, '<!doctype html><html lang="en"><title>Not found</title><h1>Not found</h1></html>');

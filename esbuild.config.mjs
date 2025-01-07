import esbuild from "esbuild";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if we want to run in watch mode
const isWatch = process.argv.includes("--watch");

// Wrap your build in an async function
async function buildPlugin() {
  const buildOptions = {
    entryPoints: [resolve(__dirname, "main.ts")],
    outdir: resolve(__dirname),
    bundle: true,
    platform: "browser",
    format: "cjs",
    external: ["obsidian"],  // Don’t bundle Obsidian
    sourcemap: false,        // Turn on if you want source maps
  };

  // Create a “build context”
  const ctx = await esbuild.context(buildOptions);

  if (isWatch) {
    // Watch for file changes and rebuild automatically
    await ctx.watch();
    console.log("Watching for changes...");
  } else {
    // Build once, then dispose
    await ctx.rebuild();
    ctx.dispose();
    console.log("Build complete.");
  }
}

// Run the build
buildPlugin().catch((error) => {
  console.error(error);
  process.exit(1);
});
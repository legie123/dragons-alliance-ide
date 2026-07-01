// Ensure node-pty's spawn-helper keeps its execute bit inside the packaged app
// (otherwise posix_spawnp fails at runtime). Runs after electron-builder packs.
const { chmodSync, existsSync } = require("node:fs");
const { join } = require("node:path");

exports.default = async function afterPack(context) {
  const appName = context.packager.appInfo.productFilename;
  const root = join(
    context.appOutDir,
    `${appName}.app`,
    "Contents",
    "Resources",
    "app.asar.unpacked",
    "node_modules",
    "node-pty",
    "prebuilds",
  );
  for (const plat of ["darwin-arm64", "darwin-x64"]) {
    const helper = join(root, plat, "spawn-helper");
    if (existsSync(helper)) {
      chmodSync(helper, 0o755);
      console.log("[after-pack] chmod +x", helper);
    }
  }
};

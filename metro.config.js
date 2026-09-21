const http = require("http");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// expo-sqlite's web worker imports wa-sqlite.wasm; Metro only resolves it
// when wasm is an asset extension (and not treated as a JS source file).
config.resolver.assetExts.push("wasm");
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (extension) => extension !== "wasm",
);
config.resolver.unstable_enablePackageExports = true;

// expo-sqlite's web backend (wa-sqlite over OPFS) needs SharedArrayBuffer,
// which browsers only expose in a cross-origin-isolated context. Expo
// Router's manifest middleware answers "/" before Metro's own
// `enhanceMiddleware` chain runs, so setting headers there never reaches
// the root document — patching the HTTP server's "request" event is the
// only hook that fires before any middleware, including that one.
const originalEmit = http.Server.prototype.emit;
http.Server.prototype.emit = function patchedEmit(event, ...args) {
  if (event === "request") {
    const [, response] = args;
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  }
  return originalEmit.call(this, event, ...args);
};

module.exports = withNativeWind(config, { input: "./src/global.css" });

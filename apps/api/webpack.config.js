const path = require("path");
const nodeExternals = require("webpack-node-externals");

/** @param {import('webpack').Configuration} options */
module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
        // Bundle workspace packages from TS source (they are ESM-only in dist)
        allowlist: [/^@buildiq\/(types|validation|permissions|pricing)(\/|$)/],
      }),
    ],
    resolve: {
      ...options.resolve,
      alias: {
        ...(options.resolve && options.resolve.alias),
        "@buildiq/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
        "@buildiq/validation": path.resolve(__dirname, "../../packages/validation/src/index.ts"),
        "@buildiq/permissions": path.resolve(__dirname, "../../packages/permissions/src/index.ts"),
        "@buildiq/pricing": path.resolve(__dirname, "../../packages/pricing/src/index.ts"),
        "@buildiq/prisma-client": path.resolve(__dirname, "node_modules/@buildiq/prisma-client"),
      },
      extensions: [".ts", ".js", ".json"],
    },
  };
};

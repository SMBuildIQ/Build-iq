import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { colors, nativeTheme, cssVariables, tokens } from "./index";

describe("design-tokens", () => {
  it("exposes Supply Monkey orange accent", () => {
    assert.equal(colors("light")["accent.primary"], "#FF8833");
    assert.equal(tokens.radius.none, 0);
  });

  it("builds native theme and css", () => {
    const t = nativeTheme("dark");
    assert.equal(t.colors.accent, "#FF8833");
    assert.match(cssVariables("light"), /--bq-accent-primary:\s*#FF8833/);
  });
});

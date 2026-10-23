import { test } from "node:test";
import assert from "node:assert/strict";
import { haircutMultiplier, liveOdds } from "../src/lib/odds";

test("haircut multiplier", () => {
  assert.equal(haircutMultiplier(0.25), 0.7890625);
  assert.equal(haircutMultiplier(0.5), 0.9375);
  assert.equal(haircutMultiplier(0.75), 0.9921875);
  assert.equal(haircutMultiplier(1), 1);
});

test("liveOdds acceptance", () => {
  // empty pool then 5 on new outcome -> 1x
  assert.equal(liveOdds("date", [], "x", 5), 1);
});

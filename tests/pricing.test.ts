import assert from "node:assert/strict";
import { test } from "node:test";
import {
  products,
  priceError,
  filterProducts,
  isChanged,
  readDrafts,
} from "../src/lib/products";
test("blank means no change; zero, negatives, malformed and excessive precision are invalid", () => {
  assert.equal(priceError(""), null);
  assert.equal(isChanged(products[0], { "1": "" }), false);
  assert.equal(isChanged(products[0], { "1": "155000.00" }), false);
  for (const value of ["0", "-1", "12.345", "1e5", "NaN", "1000000000"])
    assert.ok(priceError(value), value);
  assert.equal(priceError("152000.50"), null);
});
test("search and brand/collection filters combine, with variant-specific edits", () => {
  const filters = {
    query: "HAI-HSU",
    brand: "Haier",
    collection: "Air Conditioners",
    status: "Active",
    editedOnly: true,
  };
  assert.deepEqual(
    filterProducts(products, filters, { "13": "120000" }).map((p) => p.id),
    ["13"],
  );
  assert.equal(
    filterProducts(products, { ...filters, brand: "Gree" }, { "13": "120000" })
      .length,
    0,
  );
});
test("stored drafts reject corrupt values and unknown variant IDs", () => {
  assert.deepEqual(readDrafts("{broken"), {});
  assert.deepEqual(readDrafts("[]"), {});
  assert.deepEqual(readDrafts('{"1":"152000","2":null,"unknown":"7"}'), {
    "1": "152000",
  });
});

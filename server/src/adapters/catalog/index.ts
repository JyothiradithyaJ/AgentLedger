import type { CatalogPort } from "../../ports/catalog.port.js";
import { DummyJsonCatalogAdapter } from "./dummyJsonCatalog.js";
import { MockCatalogAdapter } from "./mockCatalog.js";
import { ResilientCatalogAdapter } from "./resilientCatalog.js";
import { env } from "../../config/env.js";

export const createCatalogAdapter = (): CatalogPort => {
  const mockCatalog = new MockCatalogAdapter();
  if (env.CATALOG_PROVIDER === "dummyjson") {
    const dummyJson = new DummyJsonCatalogAdapter();
    return new ResilientCatalogAdapter(dummyJson, mockCatalog);
  }
  return mockCatalog;
};

export {
  DummyJsonCatalogAdapter,
  MockCatalogAdapter,
  ResilientCatalogAdapter
};

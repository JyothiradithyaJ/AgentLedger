import type { CatalogProduct } from "@agentledger/shared";
import type { CatalogPort, CatalogSearchOptions } from "../../ports/catalog.port.js";
import { logger } from "../../observability/logger.js";
import { MockCatalogAdapter } from "./mockCatalog.js";

export class ResilientCatalogAdapter implements CatalogPort {
  private readonly primary: CatalogPort;
  private readonly fallback: CatalogPort;
  private currentLastSource: CatalogProduct["source"] = "mock";

  constructor(primary: CatalogPort, fallback: CatalogPort = new MockCatalogAdapter()) {
    this.primary = primary;
    this.fallback = fallback;
  }

  get lastSource(): CatalogProduct["source"] {
    return this.currentLastSource;
  }

  async search(options: CatalogSearchOptions): Promise<CatalogProduct[]> {
    try {
      const results = await this.primary.search(options);
      if (results.length > 0) {
        this.currentLastSource = "dummyjson";
        return results;
      }
      logger.warn({ options }, "Primary catalog search returned 0 results. Falling back to mock catalog.");
      this.currentLastSource = "mock";
      return await this.fallback.search(options);
    } catch (err) {
      logger.warn({ err, options }, "Primary catalog search failed or timed out. Falling back to mock catalog.");
      this.currentLastSource = "mock";
      return await this.fallback.search(options);
    }
  }

  async getById(id: string): Promise<CatalogProduct | null> {
    if (id.startsWith("mock:")) {
      this.currentLastSource = "mock";
      return this.fallback.getById(id);
    }

    try {
      const item = await this.primary.getById(id);
      if (item !== null) {
        this.currentLastSource = "dummyjson";
        return item;
      }
      logger.warn({ id }, "Primary catalog getById returned null. Falling back to mock catalog.");
      this.currentLastSource = "mock";
      return await this.fallback.getById(id);
    } catch (err) {
      logger.warn({ err, id }, "Primary catalog getById failed or timed out. Falling back to mock catalog.");
      this.currentLastSource = "mock";
      return await this.fallback.getById(id);
    }
  }
}

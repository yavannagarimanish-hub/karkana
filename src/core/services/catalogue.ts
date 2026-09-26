import {
  catalogueCounts,
  DEFAULT_PAGE_SIZE,
  filterProducts,
  paginate,
  sectionWithProducts,
  sortProducts,
  type CatalogueCounts,
  type CatalogueFilter,
  type Page,
  type SectionWithProducts,
} from '../domain/catalogue';
import {
  MODULE_SLUGS,
  PRODUCT_MODULES,
  moduleFromSlug,
  type Product,
  type ProductModule,
} from '../domain/product';
import type { Repositories } from '../ports';

export interface ModuleCard {
  module: ProductModule;
  slug: string;
  count: number;
  idRange: { first: string; last: string } | null;
  topCategories: string[];
  /** Cheapest visible product in the module, in paise. */
  fromPricePaise: number | null;
}

export interface HomeView {
  sections: SectionWithProducts[];
  counts: CatalogueCounts;
  moduleCards: ModuleCard[];
}

export interface ModuleView {
  module: ProductModule;
  slug: string;
  products: Product[];
  page: Page<Product>;
  counts: CatalogueCounts;
  categories: string[];
  filter: CatalogueFilter;
}

export interface ProductView {
  product: Product;
  related: Product[];
}

export function createCatalogueService(repos: Repositories) {
  /** Storefront catalogue: visible products only. */
  function storefrontProducts() {
    return repos.products.list({ includeHidden: false });
  }

  async function home(): Promise<HomeView> {
    const [products, sections] = await Promise.all([storefrontProducts(), repos.sections.list()]);
    const counts = catalogueCounts(products);

    const moduleCards: ModuleCard[] = PRODUCT_MODULES.map((module) => {
      const inModule = products.filter((product) => product.module === module);
      const moduleCounts = catalogueCounts(inModule);
      const prices = inModule.map((product) => product.price).filter((price) => price > 0);

      return {
        module,
        slug: MODULE_SLUGS[module],
        count: moduleCounts.total,
        idRange: moduleCounts.idRange,
        topCategories: moduleCounts.categories.slice(0, 4).map((category) => category.name),
        fromPricePaise: prices.length > 0 ? Math.round(Math.min(...prices) * 100) : null,
      };
    });

    return {
      sections: sectionWithProducts(sections, products),
      counts,
      moduleCards,
    };
  }

  async function modulePage(
    slug: string,
    filter: CatalogueFilter = {},
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<ModuleView | null> {
    // Not named `module` — that identifier is reserved by Next.js.
    const catalogueModule = moduleFromSlug(slug);
    if (!catalogueModule) return null;

    const products = await storefrontProducts();
    const filtered = filterProducts(products, { ...filter, module: catalogueModule });

    return {
      module: catalogueModule,
      slug: MODULE_SLUGS[catalogueModule],
      products: filtered,
      page: paginate(filtered, page, pageSize),
      counts: catalogueCounts(filtered),
      categories: catalogueCounts(
        products.filter((product) => product.module === catalogueModule),
      ).categories.map((category) => category.name),
      filter,
    };
  }

  async function searchPage(
    query: string,
    filter: CatalogueFilter = {},
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<{
    query: string;
    products: Product[];
    page: Page<Product>;
    counts: CatalogueCounts;
  }> {
    const products = await storefrontProducts();
    const filtered = query.trim()
      ? filterProducts(products, { ...filter, search: query })
      : sortProducts(products, filter.sort ?? 'position');

    return {
      query,
      products: filtered,
      page: paginate(filtered, page, pageSize),
      counts: catalogueCounts(filtered),
    };
  }

  async function product(id: string, relatedLimit = 4): Promise<ProductView | null> {
    const product = await repos.products.findById(id);
    if (!product || !product.isVisible) return null;

    const siblings = await storefrontProducts();
    const related = siblings
      .filter((candidate) => candidate.id !== product.id && candidate.module === product.module)
      .filter((candidate) => candidate.category === product.category || candidate.brand === product.brand)
      .slice(0, relatedLimit);

    // Fall back to same-module products when the category has no siblings.
    if (related.length < relatedLimit) {
      const filler = siblings
        .filter((candidate) => candidate.id !== product.id && candidate.module === product.module)
        .filter((candidate) => !related.some((item) => item.id === candidate.id))
        .slice(0, relatedLimit - related.length);
      related.push(...filler);
    }

    return { product, related };
  }

  /** Aggregate used by the hero and the footer — never hardcoded in JSX. */
  async function counts(): Promise<CatalogueCounts> {
    return catalogueCounts(await storefrontProducts());
  }

  return { home, modulePage, searchPage, product, counts };
}

export type CatalogueService = ReturnType<typeof createCatalogueService>;

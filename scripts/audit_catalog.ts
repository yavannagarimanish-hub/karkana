import { getAppServices } from '../src/infra/db';
import { buildProductFamilies } from '../src/core/domain/catalog-families';

async function audit() {
  const services = await getAppServices();
  const allProducts = await services.repos.products.list({ includeHidden: true });
  const activeProducts = allProducts.filter((p) => p.isVisible);
  const hiddenProducts = allProducts.filter((p) => !p.isVisible);

  const activeWithImages = activeProducts.filter((p) => p.images && p.images.length > 0);
  const activeWithoutImages = activeProducts.filter((p) => !p.images || p.images.length === 0);

  const families = buildProductFamilies(allProducts);

  const seenSkus = new Set<string>();
  const duplicateSkus: string[] = [];

  for (const f of families) {
    for (const v of f.variants) {
      if (seenSkus.has(v.id)) {
        duplicateSkus.push(v.id);
      }
      seenSkus.add(v.id);
    }
  }

  const orphanActive = activeProducts.filter((p) => !seenSkus.has(p.id));

  console.log('=== CATALOG AUDIT REPORT ===');
  console.log('TOTAL SOURCE PRODUCTS:', allProducts.length);
  console.log('ACTIVE PRODUCTS:', activeProducts.length);
  console.log('HIDDEN PRODUCTS:', hiddenProducts.length);
  console.log('ACTIVE PRODUCTS WITH IMAGES:', activeWithImages.length);
  console.log('ACTIVE PRODUCTS WITHOUT IMAGES:', activeWithoutImages.length);
  console.log('TOTAL CUSTOMER PARENT FAMILIES:', families.length);
  console.log(`ACTIVE PRODUCTS REPRESENTED: ${seenSkus.size}/${activeProducts.length}`);
  console.log('ORPHAN ACTIVE PRODUCTS:', orphanActive.length);
  console.log('DUPLICATE SKU MAPPINGS:', duplicateSkus.length);

  console.log('\n=== COMPLETE FAMILY BREAKDOWN ===');
  families.forEach((f, index) => {
    const skus = f.variants.map((v) => `${v.id} (${v.label})`).join(', ');
    console.log(`${index + 1}. [${f.section}] ${f.title} (${f.variants.length} variant${f.variants.length > 1 ? 's' : ''}): ${skus}`);
  });

  process.exit(0);
}

audit().catch((err) => {
  console.error(err);
  process.exit(1);
});

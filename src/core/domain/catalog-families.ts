import type { Product } from './product';
import { pricePaise, mrpPaise, primaryImage } from './product';

export const PRIMARY_SECTIONS = [
  'LADIS',
  'MIRCHI',
  'BIG BLASTS',
  'SPARKLES',
  'CHAKRAS',
  'FLOWER POTS',
  'FANCY ITEMS',
  'ROCKETS',
  'SKYSHOTS',
] as const;

export type PrimarySection = (typeof PRIMARY_SECTIONS)[number];

export const PRIMARY_SECTION_SLUGS: Record<PrimarySection, string> = {
  LADIS: 'ladis',
  MIRCHI: 'mirchi',
  'BIG BLASTS': 'big-blasts',
  SPARKLES: 'sparkles',
  CHAKRAS: 'chakras',
  'FLOWER POTS': 'flower-pots',
  'FANCY ITEMS': 'fancy-items',
  ROCKETS: 'rockets',
  SKYSHOTS: 'skyshots',
};

export const PRIMARY_SECTION_DESCRIPTIONS: Record<PrimarySection, string> = {
  LADIS: 'Traditional garland crackers & multi-sound strings',
  MIRCHI: 'Rapid-fire micro bijili & crackling strips',
  'BIG BLASTS': 'Sound shells, atom bombs & hydro blasts',
  SPARKLES: 'Sparklers, pencils & glittering effects',
  CHAKRAS: 'Ground spinners & circular wheels',
  'FLOWER POTS': 'Fountains, koti & conic sparkle pots',
  'FANCY ITEMS': 'Novelty crackers, matchboxes & color fountains',
  ROCKETS: 'Whistling missiles & sky rockets',
  SKYSHOTS: 'Multi-shot repeater cakes & aerial burst comets',
};

export function sectionFromSlug(slug: string): PrimarySection | null {
  const norm = slug.toLowerCase().replace(/[\s_]+/g, '-');
  for (const [sec, s] of Object.entries(PRIMARY_SECTION_SLUGS)) {
    if (s === norm || sec.toLowerCase() === norm || sec.toLowerCase().replace(/[\s_]+/g, '-') === norm) {
      return sec as PrimarySection;
    }
  }
  return null;
}

export interface ProductVariant {
  id: string; // Underlying SKU e.g. "KRK001"
  label: string; // e.g. "7 cm" or "1000 Wala"
  product: Product;
  pricePaise: number;
  mrpPaise: number | null;
  image: string | null;
  inStock: boolean;
}

export interface ProductFamily {
  id: string; // Family slug or primary SKU ID
  title: string;
  section: PrimarySection;
  description: string;
  variants: ProductVariant[];
  defaultVariant: ProductVariant;
  fromPricePaise: number;
  maxPricePaise: number;
  hasMultipleVariants: boolean;
  inStock: boolean;
}

interface GroupDefinition {
  familyId: string;
  title: string;
  section: PrimarySection;
  description: string;
  items: Array<{ sku: string; label: string }>;
}

const GROUPED_DEFINITIONS: GroupDefinition[] = [
  {
    familyId: 'sparklers-electric',
    title: 'Electric Sparklers',
    section: 'SPARKLES',
    description: 'Classic crackling white-gold illumination in multiple lengths for safe celebration.',
    items: [
      { sku: 'KRK001', label: '7 cm' },
      { sku: 'KRK003', label: '10 cm' },
      { sku: 'KRK007', label: '12 cm' },
      { sku: 'KRK010', label: '15 cm' },
      { sku: 'KRK012', label: '30 cm' },
      { sku: 'KRK016', label: '50 cm' },
    ],
  },
  {
    familyId: 'sparklers-colour',
    title: 'Colour Sparklers',
    section: 'SPARKLES',
    description: 'Vibrant chromatic pyrotechnic sparklers in multiple sizes.',
    items: [
      { sku: 'KRK002', label: '7 cm' },
      { sku: 'KRK004', label: '10 cm' },
      { sku: 'KRK008', label: '12 cm' },
      { sku: 'KRK011', label: '15 cm' },
      { sku: 'KRK013', label: '30 cm' },
      { sku: 'KRK017', label: '50 cm' },
    ],
  },
  {
    familyId: 'sparklers-green',
    title: 'Green Sparklers',
    section: 'SPARKLES',
    description: 'Radiant emerald flame sparklers constructed for pure festive glow.',
    items: [
      { sku: 'KRK005', label: '10 cm' },
      { sku: 'KRK009', label: '12 cm' },
      { sku: 'KRK014', label: '30 cm' },
      { sku: 'KRK140', label: '15 cm' },
    ],
  },
  {
    familyId: 'sparklers-red',
    title: 'Red Sparklers',
    section: 'SPARKLES',
    description: 'Vivid ruby crimson sparks with smooth extended burn.',
    items: [
      { sku: 'KRK006', label: '10 cm' },
      { sku: 'KRK139', label: '12 cm' },
      { sku: 'KRK141', label: '15 cm' },
      { sku: 'KRK015', label: '30 cm' },
    ],
  },
  {
    familyId: 'twinkling-star-sparklers',
    title: 'Twinkling Star Sparklers',
    section: 'SPARKLES',
    description: 'Glittering starlight effect with gentle crackling cadence.',
    items: [
      { sku: 'KRK049', label: 'Small' },
      { sku: 'KRK050', label: 'Deluxe' },
    ],
  },
  {
    familyId: 'twinkling-star-deluxe-pack',
    title: 'Twinkling Star Celebration Pack',
    section: 'SPARKLES',
    description: 'Special edition sparkling starlight fountains across 1.5 inch and 4 inch profiles.',
    items: [
      { sku: 'KRK170', label: '1.5" (5 Pcs)' },
      { sku: 'KRK171', label: '1.5" (10 Pcs)' },
      { sku: 'KRK172', label: '1.5" Vels' },
      { sku: 'KRK173', label: '4" Deluxe' },
      { sku: 'KRK174', label: '4" Heavy' },
    ],
  },
  {
    familyId: 'sparkler-pencils-classic',
    title: 'Festive Sparkler Pencils',
    section: 'SPARKLES',
    description: 'Slender luminous pyrotechnic pencils projecting consistent radiant flames.',
    items: [
      { sku: 'KRK175', label: '7 cm' },
      { sku: 'KRK176', label: '10 cm' },
      { sku: 'KRK177', label: '15 cm' },
      { sku: 'KRK178', label: '18 cm' },
    ],
  },
  {
    familyId: 'mirchi-red-bijili',
    title: 'Red Bijili Crackers',
    section: 'MIRCHI',
    description: 'Crisp, rapid acoustic crackle made with traditional Sivakasi craft.',
    items: [
      { sku: 'KRK037', label: "50's Pkt" },
      { sku: 'KRK038', label: "100's Pkt" },
    ],
  },
  {
    familyId: 'red-bijili-50s-edition',
    title: "Red Bijili 50's Special Editions",
    section: 'MIRCHI',
    description: "Specially wrapped 50-count bijili sound crackers in classic colour formulations.",
    items: [
      { sku: 'KRK188', label: 'White' },
      { sku: 'KRK189', label: 'Gold' },
      { sku: 'KRK190', label: 'WNR GT' },
      { sku: 'KRK191', label: 'Coronation' },
    ],
  },
  {
    familyId: 'red-bijili-100s-edition',
    title: "Red Bijili 100's Master Editions",
    section: 'MIRCHI',
    description: "High-tempo Sivakasi bijili sound strings in 100-count premium packings.",
    items: [
      { sku: 'KRK192', label: 'Gold' },
      { sku: 'KRK193', label: 'DPM' },
      { sku: 'KRK194', label: 'WNR GT' },
      { sku: 'KRK195', label: 'Cat VML' },
      { sku: 'KRK196', label: 'RGT' },
    ],
  },
  {
    familyId: 'traditional-garland-ladis',
    title: 'Traditional Garland Ladis',
    section: 'LADIS',
    description: 'Classic continuous festive string crackers ranging from 100 to 25,000 shots.',
    items: [
      { sku: 'KRK068', label: '100 Wala' },
      { sku: 'KRK069', label: '200 Wala' },
      { sku: 'KRK070', label: '300 Wala' },
      { sku: 'KRK032', label: '1000 Wala' },
      { sku: 'KRK033', label: '2000 Wala' },
      { sku: 'KRK034', label: '5000 Wala' },
      { sku: 'KRK035', label: '10000 Wala' },
      { sku: 'KRK036', label: '25000 Wala' },
    ],
  },
  {
    familyId: 'garland-ladis-standard',
    title: 'Festive Garland Ladis Standard',
    section: 'LADIS',
    description: 'Standard sequence celebration garland ladis crafted for thunderous cadence.',
    items: [
      { sku: 'KRK180', label: '1000 Wala' },
      { sku: 'KRK181', label: '2000 Wala' },
      { sku: 'KRK182', label: '5000 Wala' },
      { sku: 'KRK183', label: '10000 Wala' },
    ],
  },
  {
    familyId: 'laxmi-crackers-classic',
    title: 'Laxmi Ground Crackers',
    section: 'LADIS',
    description: 'Traditional auspicious acoustic ground crackers in multiple packet sizes.',
    items: [
      { sku: 'KRK142', label: '3.5" (15 Pkt)' },
      { sku: 'KRK143', label: '4" (10 Pkt)' },
      { sku: 'KRK144', label: '4" Dlx (10 Pkt)' },
    ],
  },
  {
    familyId: 'gold-lakshmi-crackers',
    title: 'Gold Lakshmi Crackers',
    section: 'LADIS',
    description: 'Premium gold-wrapped single sound festive crackers.',
    items: [
      { sku: 'KRK148', label: '4"' },
      { sku: 'KRK149', label: '4" Deluxe' },
    ],
  },
  {
    familyId: 'multi-sound-ground-crackers',
    title: 'Multi-Sound Ground Crackers',
    section: 'LADIS',
    description: 'Successive acoustic detonation crackers for festive excitement.',
    items: [
      { sku: 'KRK150', label: '2 Sound' },
      { sku: 'KRK151', label: '3 Sound' },
    ],
  },
  {
    familyId: 'flower-pots-classic',
    title: 'Classic Flower Pots',
    section: 'FLOWER POTS',
    description: 'Ground fountain fountainheads casting tall showers of golden and silver stars.',
    items: [
      { sku: 'KRK024', label: 'Small' },
      { sku: 'KRK025', label: 'Big' },
      { sku: 'KRK026', label: 'Special' },
      { sku: 'KRK027', label: 'Ashoka' },
      { sku: 'KRK153', label: 'Giant' },
    ],
  },
  {
    familyId: 'colour-koti-deluxe',
    title: 'Colour Koti Deluxe',
    section: 'FLOWER POTS',
    description: 'Vivid ground cone fountain fountains projecting bursts of chromatic stars.',
    items: [
      { sku: 'KRK154', label: '5 Pcs' },
      { sku: 'KRK155', label: '10 Pcs' },
    ],
  },
  {
    familyId: 'ground-chakkars-classic',
    title: 'Ground Chakkars',
    section: 'CHAKRAS',
    description: 'High-speed spinning wheels generating radial circles of brilliant fire.',
    items: [
      { sku: 'KRK029', label: 'Big (10 Pcs)' },
      { sku: 'KRK160', label: 'Big (25 Pcs)' },
      { sku: 'KRK030', label: 'Special' },
      { sku: 'KRK031', label: 'Deluxe' },
    ],
  },
  {
    familyId: 'ground-chakkars-heavy',
    title: 'Heavy Ground Chakkars',
    section: 'CHAKRAS',
    description: 'Weighted high-velocity rotary chakkar wheels casting dense fiery halos.',
    items: [
      { sku: 'KRK161', label: 'Special Heavy' },
      { sku: 'KRK162', label: 'Deluxe Heavy' },
    ],
  },
  {
    familyId: 'zamin-chakkars-classic',
    title: 'Zamin Chakkars',
    section: 'CHAKRAS',
    description: 'Precision ground spinners with wide luminous halos.',
    items: [
      { sku: 'KRK046', label: 'Ashoka' },
      { sku: 'KRK047', label: 'Special' },
      { sku: 'KRK048', label: 'Deluxe' },
    ],
  },
  {
    familyId: 'colour-matches-collection',
    title: 'Colour Matches Collection',
    section: 'FANCY ITEMS',
    description: 'Child-friendly sparkling novelty colour matchbox sticks casting gentle festive glow.',
    items: [
      { sku: 'KRK156', label: 'Big Kids' },
      { sku: 'KRK157', label: 'Classic 5 in 1' },
      { sku: 'KRK158', label: 'Captain' },
      { sku: 'KRK159', label: 'Top 10' },
    ],
  },
  {
    familyId: 'peacock-fountain-novelty',
    title: 'Peacock Multi-Hole Fountains',
    section: 'FANCY ITEMS',
    description: 'Exotic radial plumage ground fountains ejecting multi-stage sparkling cascades.',
    items: [
      { sku: 'KRK215', label: '5-Hole Small' },
      { sku: 'KRK216', label: '3-Hole Medium' },
      { sku: 'KRK217', label: 'Jumbo' },
    ],
  },
  {
    familyId: 'multi-sound-rockets',
    title: 'Multi-Sound Rockets',
    section: 'ROCKETS',
    description: 'Skyward soaring rockets detonating in successive acoustic blasts.',
    items: [
      { sku: 'KRK116', label: '2 Sound' },
      { sku: 'KRK117', label: '3 Sound' },
    ],
  },
  {
    familyId: 'multicolour-aerial-shots',
    title: 'Multicolour Repeating Aerial Shots',
    section: 'SKYSHOTS',
    description: 'Repeating high-altitude aerial cakes ejecting vivid chromatic bursts.',
    items: [
      { sku: 'KRK039', label: '30 Shot' },
      { sku: 'KRK040', label: '60 Shot' },
      { sku: 'KRK041', label: '120 Shot' },
      { sku: 'KRK042', label: '240 Shot' },
    ],
  },
  {
    familyId: 'skyshots-repeater-cakes',
    title: 'Sky Shots Repeater Cakes',
    section: 'SKYSHOTS',
    description: 'Precision multi-shot aerial battery cakes ejecting vibrant starbursts.',
    items: [
      { sku: 'KRK198', label: '12 Shot' },
      { sku: 'KRK199', label: '10 Shot' },
      { sku: 'KRK200', label: '30 Shot' },
      { sku: 'KRK201', label: '60 Shot' },
      { sku: 'KRK202', label: '120 Shot' },
    ],
  },
  {
    familyId: 'crackling-aerial-shots',
    title: 'Crackling Aerial Shots',
    section: 'SKYSHOTS',
    description: 'Aerial repeater cakes with crackling palm and glittering comet tails.',
    items: [
      { sku: 'KRK105', label: '25 Shot' },
      { sku: 'KRK106', label: '50 Shot' },
      { sku: 'KRK107', label: '100 Shot' },
    ],
  },
];

export function assignPrimarySection(product: Product): PrimarySection {
  const name = product.name.toUpperCase();
  const cat = (product.category || '').toUpperCase();

  if (name.includes('BIJILI') || name.includes('MIRCHI')) return 'MIRCHI';
  if (
    name.includes('WALA') ||
    name.includes('CHORSA') ||
    (cat === 'GROUND CRACKERS' &&
      (name.includes('DELUXE') ||
        name.includes('GIANT') ||
        name.includes('LAXMI') ||
        name.includes('LAKSHMI') ||
        name.includes('SOUND') ||
        name.includes('LION') ||
        name.includes('FIGHTER') ||
        name.includes('HULK')) &&
      !name.includes('PEACOCK') &&
      !name.includes('BAHUBALI') &&
      !name.includes('JOKER') &&
      !name.includes('KURUVI') &&
      !name.includes('HERCULES'))
  ) {
    return 'LADIS';
  }
  if (product.id === 'KRK113' || product.id === 'KRK164' || cat === 'ROCKETS' || name.includes('ROCKET')) return 'ROCKETS';
  if (
    cat === 'ATOM BOMBS' ||
    name.includes('BOMB') ||
    name.includes('HYDRO') ||
    name.includes('KURUVI') ||
    name.includes('BAHUBALI') ||
    name.includes('HERCULES') ||
    name.includes('JOKER')
  ) {
    return 'BIG BLASTS';
  }
  if (
    cat === 'SPARKLERS' ||
    name.includes('SPARKLE') ||
    name.includes('CANDLE') ||
    name.includes('PENCIL') ||
    name.includes('FOUNTAIN') ||
    name.includes('SHOWER')
  ) {
    return 'SPARKLES';
  }
  if (cat === 'CHAKKARS' || name.includes('CHAKKAR') || name.includes('WHEEL') || name.includes('SPINNER')) {
    return 'CHAKRAS';
  }
  if (cat === 'FLOWER POTS' || name.includes('FLOWER POT') || name.includes('COLOUR FLOWERS') || name.includes('COLOUR KOTI')) {
    return 'FLOWER POTS';
  }
  if (cat === 'AERIAL SHOTS' || name.includes('SHOT') || name.includes('SKYSHOT') || name.includes('COMET')) {
    return 'SKYSHOTS';
  }
  return 'FANCY ITEMS';
}

/**
 * Builds all product families from a full list of source products.
 * Grouped families combine matching SKUs into selectable variants.
 * Standalone items become individual families with a single variant.
 */
export function buildProductFamilies(products: readonly Product[]): ProductFamily[] {
  const productMap = new Map<string, Product>();
  products.forEach((p) => productMap.set(p.id, p));

  const handledSkus = new Set<string>();
  const families: ProductFamily[] = [];

  // 1. Grouped Families
  for (const group of GROUPED_DEFINITIONS) {
    const variants: ProductVariant[] = [];
    for (const item of group.items) {
      const prod = productMap.get(item.sku);
      if (prod && prod.isVisible) {
        handledSkus.add(prod.id);
        variants.push({
          id: prod.id,
          label: item.label,
          product: prod,
          pricePaise: pricePaise(prod),
          mrpPaise: mrpPaise(prod),
          image: primaryImage(prod),
          inStock: prod.inStock,
        });
      }
    }

    if (variants.length > 0) {
      const prices = variants.map((v) => v.pricePaise);
      const fromPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const anyInStock = variants.some((v) => v.inStock);

      families.push({
        id: group.familyId,
        title: group.title,
        section: group.section,
        description: group.description,
        variants,
        defaultVariant: variants[0]!,
        fromPricePaise: fromPrice,
        maxPricePaise: maxPrice,
        hasMultipleVariants: variants.length > 1,
        inStock: anyInStock,
      });
    }
  }

  // 2. Standalone Families (preserving every single product that wasn't grouped)
  for (const prod of products) {
    if (handledSkus.has(prod.id) || !prod.isVisible) continue;

    const price = pricePaise(prod);
    const mrp = mrpPaise(prod);
    const variant: ProductVariant = {
      id: prod.id,
      label: prod.unit || 'Standard',
      product: prod,
      pricePaise: price,
      mrpPaise: mrp,
      image: primaryImage(prod),
      inStock: prod.inStock,
    };

    families.push({
      id: prod.id,
      title: prod.name,
      section: assignPrimarySection(prod),
      description: prod.description || prod.shortDescription || '',
      variants: [variant],
      defaultVariant: variant,
      fromPricePaise: price,
      maxPricePaise: price,
      hasMultipleVariants: false,
      inStock: prod.inStock,
    });
  }

  return families;
}

/**
 * Finds the product family associated with a given SKU ID or family ID.
 */
export function findFamilyForProductOrId(
  idOrSku: string,
  products: readonly Product[],
): { family: ProductFamily; selectedVariant: ProductVariant } | null {
  const families = buildProductFamilies(products);

  for (const family of families) {
    if (family.id.toLowerCase() === idOrSku.toLowerCase()) {
      return { family, selectedVariant: family.defaultVariant };
    }
    const matchingVariant = family.variants.find((v) => v.id.toLowerCase() === idOrSku.toLowerCase());
    if (matchingVariant) {
      return { family, selectedVariant: matchingVariant };
    }
  }

  return null;
}


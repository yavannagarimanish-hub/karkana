import fs from 'fs';
import path from 'path';
import { getProducts } from './db';
import { CatalogueValidationReport, ValidationIssue } from '@/types';

export function runCatalogueValidation(): CatalogueValidationReport {
  const products = getProducts();
  const totalProducts = products.length;

  const duplicateIds: { id: string; count: number }[] = [];
  const missingIds: { row: number; name?: string }[] = [];
  const missingNames: { id: string }[] = [];
  const invalidPrices: { id: string; name: string; mrp?: number | null; price?: number | null; issue: string }[] = [];
  const incorrectDiscounts: { id: string; name: string; mrp: number; price: number; listedDiscount: string; calculatedDiscount: string; diff: number }[] = [];
  const missingImages: { id: string; name: string; image?: string; issue: string }[] = [];
  const missingDescriptions: { id: string; name: string }[] = [];
  const missingCategories: { id: string; name: string }[] = [];
  const missingBrands: { id: string; name: string }[] = [];
  const missingStockValues: { id: string; name: string }[] = [];
  const otherSchemaViolations: { id: string; name: string; field: string; issue: string }[] = [];

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const incompleteOptional: ValidationIssue[] = [];
  const productsRequiringAttentionSet = new Set<string>();

  // Check ID duplicates
  const idCounts = new Map<string, number>();
  products.forEach((p) => {
    if (p.id) {
      idCounts.set(p.id, (idCounts.get(p.id) || 0) + 1);
    }
  });

  idCounts.forEach((count, id) => {
    if (count > 1) {
      duplicateIds.push({ id, count });
      errors.push({
        id,
        productName: id,
        field: 'Product ID',
        issue: `Duplicate Product ID found (${count} occurrences)`,
        severity: 'ERROR',
      });
      productsRequiringAttentionSet.add(id);
    }
  });

  products.forEach((p, idx) => {
    const pId = p.id || `UNKNOWN_ROW_${idx + 1}`;
    let requiresAttention = false;

    // 1. Missing ID
    if (!p.id || !p.id.trim()) {
      missingIds.push({ row: idx + 1, name: p.name });
      errors.push({
        id: pId,
        productName: p.name || 'Unnamed',
        field: 'Product ID',
        issue: 'Product ID is missing or empty',
        severity: 'ERROR',
      });
      requiresAttention = true;
    }

    // 2. Missing Name
    if (!p.name || !p.name.trim()) {
      missingNames.push({ id: pId });
      errors.push({
        id: pId,
        productName: 'Missing Name',
        field: 'Product Name',
        issue: 'Product Name is missing',
        severity: 'ERROR',
      });
      requiresAttention = true;
    } else {
      // Check leading/trailing whitespace
      if (p.name !== p.name.trim()) {
        otherSchemaViolations.push({
          id: pId,
          name: p.name,
          field: 'Product Name',
          issue: `Leading or trailing whitespace detected in name: "${p.name}"`,
        });
        warnings.push({
          id: pId,
          productName: p.name,
          field: 'Product Name',
          issue: `Leading/trailing whitespace in name: "${p.name}"`,
          severity: 'WARNING',
        });
        requiresAttention = true;
      }

      // Check known typos in name
      const knownTypos: Record<string, string> = {
        'GROUMD': 'Typo "GROUMD" (should be GROUND)',
        'ELECCTRIC': 'Typo "ELECCTRIC" (should be ELECTRIC)',
        'DELUXE3': 'Typo "DELUXE3" (suspicious trailing digit)',
        'BHOPOCHAKKAR': 'Suspicious spelling "BHOPOCHAKKAR"',
        'ROCKETT': 'Typo "ROCKETT" (should be ROCKET)',
        'FIRECRAACKER': 'Typo "FIRECRAACKER" (double A)',
      };

      Object.entries(knownTypos).forEach(([needle, reason]) => {
        if (p.name.includes(needle)) {
          otherSchemaViolations.push({
            id: pId,
            name: p.name,
            field: 'Product Name',
            issue: reason,
          });
          warnings.push({
            id: pId,
            productName: p.name,
            field: 'Product Name',
            issue: reason,
            severity: 'WARNING',
          });
          requiresAttention = true;
        }
      });

      // Check lowercase formatting
      if (p.name === p.name.toLowerCase() && p.name !== p.name.toUpperCase()) {
        otherSchemaViolations.push({
          id: pId,
          name: p.name,
          field: 'Product Name',
          issue: `Product name is completely lowercase: "${p.name}"`,
        });
        warnings.push({
          id: pId,
          productName: p.name,
          field: 'Product Name',
          issue: `Lowercase formatting inconsistency: "${p.name}"`,
          severity: 'WARNING',
        });
        requiresAttention = true;
      }
    }

    // 3. Missing Categories
    if (!p.category || !p.category.trim()) {
      missingCategories.push({ id: pId, name: p.name });
      errors.push({
        id: pId,
        productName: p.name,
        field: 'Category',
        issue: 'Product Category is missing',
        severity: 'ERROR',
      });
      requiresAttention = true;
    } else if (p.category === 'Others' || p.category === 'Other') {
      otherSchemaViolations.push({
        id: pId,
        name: p.name,
        field: 'Category',
        issue: `Unclassified generic category: "${p.category}"`,
      });
      warnings.push({
        id: pId,
        productName: p.name,
        field: 'Category',
        issue: `Generic category assigned: "${p.category}" (consider classifying into Rockets/Aerial Shots/Chakkars)`,
        severity: 'WARNING',
      });
      requiresAttention = true;
    }

    // 4. Missing Brands
    if (!p.brand || !p.brand.trim()) {
      missingBrands.push({ id: pId, name: p.name });
      warnings.push({
        id: pId,
        productName: p.name,
        field: 'Brand Name',
        issue: 'Brand Name is missing or empty',
        severity: 'WARNING',
      });
      requiresAttention = true;
    }

    // 5. Invalid MRP / Selling Price
    const mrp = p.original_price;
    const price = p.price;

    if (!mrp || mrp <= 0 || isNaN(mrp)) {
      invalidPrices.push({ id: pId, name: p.name, mrp, price, issue: `Invalid or missing MRP: ${p.raw_mrp || mrp}` });
      errors.push({
        id: pId,
        productName: p.name,
        field: 'MRP',
        issue: `Invalid MRP value: ${p.raw_mrp || mrp}`,
        severity: 'ERROR',
      });
      requiresAttention = true;
    }

    if (!price || price <= 0 || isNaN(price)) {
      invalidPrices.push({ id: pId, name: p.name, mrp, price, issue: `Invalid or zero Selling Price: ${p.raw_selling_price || price}` });
      errors.push({
        id: pId,
        productName: p.name,
        field: 'Selling Price',
        issue: `Invalid Selling Price: ${p.raw_selling_price || price}`,
        severity: 'ERROR',
      });
      requiresAttention = true;
    }

    if (mrp && price && price > mrp) {
      invalidPrices.push({ id: pId, name: p.name, mrp, price, issue: `Selling price (₹${price}) exceeds MRP (₹${mrp})` });
      errors.push({
        id: pId,
        productName: p.name,
        field: 'Selling Price',
        issue: `Selling price (₹${price}) is higher than MRP (₹${mrp})`,
        severity: 'ERROR',
      });
      requiresAttention = true;
    }

    // 6. Incorrect Discounts
    if (mrp && price && mrp > 0) {
      const calculatedExact = ((mrp - price) / mrp) * 100;
      const calculatedRound = Math.round(calculatedExact);
      const rawDiscStr = String(p.discount_percent || '').replace('%', '').trim();
      const listedDisc = parseInt(rawDiscStr, 10);

      if (!isNaN(listedDisc)) {
        if (Math.abs(calculatedExact - listedDisc) > 0.5) {
          const diff = Number((calculatedExact - listedDisc).toFixed(2));
          incorrectDiscounts.push({
            id: pId,
            name: p.name,
            mrp,
            price,
            listedDiscount: `${listedDisc}%`,
            calculatedDiscount: `${calculatedRound}% (${calculatedExact.toFixed(2)}%)`,
            diff,
          });
          warnings.push({
            id: pId,
            productName: p.name,
            field: 'Discount %',
            issue: `Discount discrepancy: Listed ${listedDisc}% vs calculated ${calculatedRound}% (${calculatedExact.toFixed(2)}%) on MRP ₹${mrp}, SP ₹${price}`,
            severity: 'WARNING',
            details: `Difference: ${diff > 0 ? '+' : ''}${diff}%`,
          });
          requiresAttention = true;
        }
      }
    }

    // 7. Missing Images (Checking if filename provided and whether file physically exists on disk)
    const imgFilename = p.images && p.images.length > 0 ? p.images[0] : '';
    if (!imgFilename) {
      missingImages.push({ id: pId, name: p.name, issue: 'No image specified in catalogue' });
      warnings.push({
        id: pId,
        productName: p.name,
        field: 'Main Image',
        issue: 'No image specified in catalogue record',
        severity: 'WARNING',
      });
      requiresAttention = true;
    } else {
      const cleanImgName = path.basename(imgFilename);
      const checkPaths = [
        path.join(process.cwd(), 'public', 'uploads', 'products', cleanImgName),
        path.join(process.cwd(), 'public', 'images', cleanImgName),
        path.join(process.cwd(), 'public', cleanImgName),
      ];
      const exists = checkPaths.some((cp) => fs.existsSync(cp));
      if (!exists) {
        missingImages.push({
          id: pId,
          name: p.name,
          image: cleanImgName,
          issue: `Image file "${cleanImgName}" not present in public storage`,
        });
        warnings.push({
          id: pId,
          productName: p.name,
          field: 'Main Image',
          issue: `Image file "${cleanImgName}" does not exist on disk`,
          severity: 'WARNING',
        });
        requiresAttention = true;
      }
    }

    // 8. Missing Stock Values
    if (p.stock_quantity === null || p.stock_quantity === undefined || isNaN(Number(p.stock_quantity))) {
      missingStockValues.push({ id: pId, name: p.name });
      warnings.push({
        id: pId,
        productName: p.name,
        field: 'Stock Quantity',
        issue: 'Stock quantity is undefined/empty in catalogue',
        severity: 'WARNING',
      });
      requiresAttention = true;
    }

    // 9. Missing Descriptions & Optional Incomplete Fields
    if (!p.description || !p.description.trim()) {
      missingDescriptions.push({ id: pId, name: p.name });
      incompleteOptional.push({
        id: pId,
        productName: p.name,
        field: 'Description',
        issue: 'Description is empty',
        severity: 'INCOMPLETE',
      });
      requiresAttention = true;
    }

    if (!p.short_description || !p.short_description.trim()) {
      incompleteOptional.push({
        id: pId,
        productName: p.name,
        field: 'Short Description',
        issue: 'Short description is not provided',
        severity: 'INCOMPLETE',
      });
      requiresAttention = true;
    }

    if (!p.subcategory || !p.subcategory.trim()) {
      incompleteOptional.push({
        id: pId,
        productName: p.name,
        field: 'Subcategory',
        issue: 'Subcategory is unassigned',
        severity: 'INCOMPLETE',
      });
      requiresAttention = true;
    }

    if (!p.safety_instructions || !p.safety_instructions.trim()) {
      incompleteOptional.push({
        id: pId,
        productName: p.name,
        field: 'Safety Instructions',
        issue: 'Safety instructions not provided',
        severity: 'INCOMPLETE',
      });
      requiresAttention = true;
    }

    if (!p.unit || !p.unit.trim()) {
      incompleteOptional.push({
        id: pId,
        productName: p.name,
        field: 'Unit',
        issue: 'Unit packaging measurement is empty',
        severity: 'INCOMPLETE',
      });
      requiresAttention = true;
    }

    if (requiresAttention) {
      productsRequiringAttentionSet.add(pId);
    }
  });

  return {
    totalProducts,
    duplicateIds,
    missingIds,
    missingNames,
    invalidPrices,
    incorrectDiscounts,
    missingImages,
    missingDescriptions,
    missingCategories,
    missingBrands,
    missingStockValues,
    otherSchemaViolations,
    errors,
    warnings,
    incompleteOptional,
    productsRequiringAttentionCount: productsRequiringAttentionSet.size,
    productsRequiringAttentionIds: Array.from(productsRequiringAttentionSet),
  };
}

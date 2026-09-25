import React from 'react';
import { Product } from '@/types';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8 [column-fill:_balance]">
      {products.map((product) => (
        <div key={product.id} className="break-inside-avoid mb-8">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}

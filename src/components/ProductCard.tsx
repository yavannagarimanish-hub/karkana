import React from 'react';
import Link from 'next/link';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const hasImage = product.images && product.images.length > 0 && product.images[0];

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block border border-white/10 bg-black hover:border-white/40 transition-all duration-300"
    >
      {/* Spacious Product Image Area */}
      <div className="relative aspect-[4/5] w-full bg-white/[0.02] overflow-hidden flex items-center justify-center border-b border-white/5">
        {hasImage ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <span className="text-white/20 text-xs font-mono tracking-widest uppercase">
              NO IMAGE UPLOADED
            </span>
          </div>
        )}

        {/* Minimal Module Indicator Tag */}
        <div className="absolute top-4 left-4">
          <span className="px-2.5 py-1 text-[9px] font-mono tracking-widest uppercase bg-black/80 backdrop-blur-sm border border-white/10 text-white/70">
            {product.module}
          </span>
        </div>

        {!product.in_stock && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex items-center justify-center">
            <span className="text-kred font-mono text-xs tracking-widest uppercase border border-kred px-4 py-1.5">
              OUT OF STOCK
            </span>
          </div>
        )}
      </div>

      {/* Minimal Supporting Information: Product Name & Price */}
      <div className="p-6 space-y-2">
        <h3 className="text-sm uppercase tracking-widest font-bold text-white group-hover:text-kred transition-colors line-clamp-1">
          {product.name}
        </h3>
        <div className="flex items-center space-x-3 text-sm font-mono">
          <span className="text-white font-bold tracking-wider">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-white/30 line-through text-xs">
              ₹{product.original_price.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

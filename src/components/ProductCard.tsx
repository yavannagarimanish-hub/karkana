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
      {/* 
        Adaptive Image Container:
        - No fixed aspect-ratio, no fixed height
        - object-fit: contain strictly enforced
        - Generous inner breathing room (p-6)
        - Adapts to Tall, Wide, or Square product packaging naturally
      */}
      <div className="relative w-full bg-white/[0.015] border-b border-white/5 flex items-center justify-center p-4 sm:p-8">
        {hasImage ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-auto object-contain object-center transition-transform duration-300 group-hover:scale-[1.01]"
            style={{
              aspectRatio: product.aspect_ratio ? `${product.aspect_ratio}` : 'auto',
            }}
          />
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <span className="text-white/20 text-xs font-mono tracking-widest uppercase">
              NO IMAGE ASSIGNED
            </span>
          </div>
        )}

        {/* Minimal Module / Brand Badge */}
        <div className="absolute top-4 left-4 flex items-center space-x-2">
          <span className="px-2.5 py-1 text-[9px] font-mono tracking-widest uppercase bg-black/85 backdrop-blur-sm border border-white/10 text-white/70">
            {product.module}
          </span>
          {product.brand && (
            <span className="hidden sm:inline-block px-2 py-1 text-[9px] font-mono tracking-widest uppercase bg-black/85 backdrop-blur-sm border border-white/10 text-white/40">
              {product.brand}
            </span>
          )}
        </div>

        {!product.in_stock && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <span className="text-kred font-mono text-xs tracking-widest uppercase border border-kred px-4 py-1.5">
              OUT OF STOCK
            </span>
          </div>
        )}
      </div>

      {/* Minimal Supporting Information: Product Name & Price */}
      <div className="p-4 sm:p-6 space-y-2">
        <h3 className="text-sm uppercase tracking-widest font-bold text-white group-hover:text-kred transition-colors line-clamp-2">
          {product.name}
        </h3>
        <div className="flex items-center space-x-3 text-sm font-mono pt-1">
          <span className="text-white font-bold tracking-wider">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-white/30 line-through text-xs">
              ₹{product.original_price.toLocaleString('en-IN')}
            </span>
          )}
          {product.discount_percent && (
            <span className="text-[11px] font-mono text-kred uppercase tracking-wider">
              {product.discount_percent}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

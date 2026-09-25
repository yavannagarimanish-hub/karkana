'use client';

import React, { useEffect, useState } from 'react';
import { Product, ProductModule } from '@/types';
import SectionHeader from '@/components/SectionHeader';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | ProductModule | 'POPULAR' | 'FEATURED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [moduleVal, setModuleVal] = useState<ProductModule>('BASIC');
  const [category, setCategory] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [inStock, setInStock] = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products?all=true');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setImageUrl('');
    setDescription('');
    setPrice('');
    setOriginalPrice('');
    setModuleVal('BASIC');
    setCategory('Classics');
    setIsVisible(true);
    setInStock(true);
    setIsPopular(false);
    setIsFeatured(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setImageUrl(p.images?.[0] || '');
    setDescription(p.description || '');
    setPrice(String(p.price));
    setOriginalPrice(p.original_price ? String(p.original_price) : '');
    setModuleVal(p.module);
    setCategory(p.category);
    setIsVisible(p.is_visible);
    setInStock(p.in_stock);
    setIsPopular(p.is_popular);
    setIsFeatured(p.is_featured);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setFormError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'product');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setImageUrl(data.url);
      } else {
        setFormError(data.error || 'Failed to upload product image');
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      setFormError('Error uploading product image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      setFormError('Name and Price are mandatory.');
      return;
    }

    const payload = {
      name: name.trim(),
      images: imageUrl ? [imageUrl] : [],
      description: description.trim(),
      price: Number(price),
      original_price: originalPrice ? Number(originalPrice) : undefined,
      module: moduleVal,
      category: category.trim() || 'General',
      is_visible: isVisible,
      in_stock: inStock,
      is_popular: isPopular,
      is_featured: isFeatured,
    };

    try {
      if (editingProduct) {
        // Update
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setIsModalOpen(false);
          fetchProducts();
        } else {
          setFormError(data.error || 'Failed to update product');
        }
      } else {
        // Create
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setIsModalOpen(false);
          fetchProducts();
        } else {
          setFormError(data.error || 'Failed to create product');
        }
      }
    } catch (err) {
      console.error('Save product error:', err);
      setFormError('An unexpected network error occurred.');
    }
  };

  const handleToggle = async (productId: string, field: keyof Product, currentVal: boolean) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !currentVal }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, [field]: !currentVal } : p))
        );
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleDelete = async (productId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently remove "${name}" from catalogue?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (activeFilter === 'BASIC' || activeFilter === 'CUSTOMIZED' || activeFilter === 'PERSONALIZED') {
      if (p.module !== activeFilter) return false;
    } else if (activeFilter === 'POPULAR') {
      if (!p.is_popular) return false;
    } else if (activeFilter === 'FEATURED') {
      if (!p.is_featured) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    return true;
  });

  return (
    <div className="space-y-12">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-8 border-b border-white/10">
        <SectionHeader
          number="01"
          title="PRODUCT INVENTORY"
          subtitle="CONFIGURE FORMULATIONS, PRICING, VISIBILITY & REPOSITORY ASSETS"
        />

        <button
          type="button"
          onClick={openCreateModal}
          className="px-8 py-4 bg-white text-black font-bold uppercase font-mono text-xs tracking-widest hover:bg-kred hover:text-white transition-all duration-300"
        >
          + ADD NEW PRODUCT
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-2 overflow-x-auto text-xs font-mono uppercase tracking-wider pb-2 md:pb-0">
          {(['ALL', 'BASIC', 'CUSTOMIZED', 'PERSONALIZED', 'POPULAR', 'FEATURED'] as const).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                className={`px-4 py-2 border transition-colors whitespace-nowrap ${
                  activeFilter === tab
                    ? 'border-white bg-white text-black font-bold'
                    : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="FILTER BY NAME / CATEGORY..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border border-white/20 p-2.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white uppercase"
          />
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="py-24 text-center font-mono text-xs tracking-widest text-white/40 uppercase animate-pulse">
          QUERYING PRODUCT REPOSITORY...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-24 border border-white/10 bg-white/[0.01] text-center p-8">
          <div className="w-12 h-[1px] bg-kred mx-auto mb-6" />
          <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-2">
            NO PRODUCTS MATCH FILTER
          </h3>
          <p className="text-white/40 text-xs font-mono mb-6">
            Click &quot;+ ADD NEW PRODUCT&quot; to insert the first real catalogue item.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-6 py-3 border border-white/20 text-white font-mono text-xs uppercase tracking-widest hover:border-kred hover:text-kred transition-colors"
          >
            CREATE FIRST PRODUCT
          </button>
        </div>
      ) : (
        <div className="border border-white/10 bg-white/[0.01] overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-white/40 uppercase tracking-widest">
                <th className="p-4">POS</th>
                <th className="p-4">PRODUCT</th>
                <th className="p-4">MODULE</th>
                <th className="p-4">PRICE</th>
                <th className="p-4 text-center">VISIBLE</th>
                <th className="p-4 text-center">STOCK</th>
                <th className="p-4 text-center">POPULAR</th>
                <th className="p-4 text-center">FEATURED</th>
                <th className="p-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.map((p) => {
                const hasImg = p.images && p.images.length > 0 && p.images[0];
                return (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Position */}
                    <td className="p-4 text-white/40 font-bold">#{p.display_position}</td>

                    {/* Product & Image */}
                    <td className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-16 border border-white/10 bg-white/5 p-1 flex-shrink-0 flex items-center justify-center">
                          {hasImg ? (
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <span className="text-[9px] text-white/30 uppercase">NO IMG</span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white uppercase text-sm">{p.name}</div>
                          <div className="text-[11px] text-white/40">{p.category}</div>
                        </div>
                      </div>
                    </td>

                    {/* Module */}
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 text-[10px] border uppercase ${
                          p.module === 'PERSONALIZED'
                            ? 'border-kred/50 text-kred'
                            : 'border-white/20 text-white/70'
                        }`}
                      >
                        {p.module}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="p-4">
                      <div className="text-white font-bold">
                        ₹{p.price.toLocaleString('en-IN')}
                      </div>
                      {p.original_price && p.original_price > p.price && (
                        <div className="text-white/30 line-through text-[11px]">
                          ₹{p.original_price.toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>

                    {/* Visible Toggle */}
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(p.id, 'is_visible', p.is_visible)}
                        className={`px-2.5 py-1 text-[10px] uppercase border transition-colors ${
                          p.is_visible
                            ? 'border-white text-white'
                            : 'border-white/20 text-white/30'
                        }`}
                      >
                        {p.is_visible ? 'SHOWN' : 'HIDDEN'}
                      </button>
                    </td>

                    {/* Stock Toggle */}
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(p.id, 'in_stock', p.in_stock)}
                        className={`px-2.5 py-1 text-[10px] uppercase border transition-colors ${
                          p.in_stock
                            ? 'border-white text-white'
                            : 'border-kred text-kred'
                        }`}
                      >
                        {p.in_stock ? 'IN STOCK' : 'OUT'}
                      </button>
                    </td>

                    {/* Popular Toggle */}
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(p.id, 'is_popular', p.is_popular)}
                        className={`px-2.5 py-1 text-[10px] uppercase border transition-colors ${
                          p.is_popular
                            ? 'border-kred text-kred bg-kred/10'
                            : 'border-white/20 text-white/30'
                        }`}
                      >
                        {p.is_popular ? '★ POPULAR' : 'OFF'}
                      </button>
                    </td>

                    {/* Featured Toggle */}
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(p.id, 'is_featured', p.is_featured)}
                        className={`px-2.5 py-1 text-[10px] uppercase border transition-colors ${
                          p.is_featured
                            ? 'border-white text-white bg-white/10'
                            : 'border-white/20 text-white/30'
                        }`}
                      >
                        {p.is_featured ? '✦ FEATURED' : 'OFF'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right space-x-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="text-white hover:text-kred underline uppercase"
                      >
                        EDIT
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.name)}
                        className="text-white/40 hover:text-kred uppercase"
                      >
                        DELETE
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="border border-white/20 bg-black max-w-2xl w-full p-8 sm:p-12 space-y-8 my-8">
            <div className="flex justify-between items-start border-b border-white/10 pb-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-kred block mb-1">
                  {editingProduct ? 'MODIFY CATALOGUE ITEM' : 'NEW COMMISSION SETUP'}
                </span>
                <h3 className="text-2xl font-bold uppercase tracking-wider text-white">
                  {editingProduct ? 'EDIT PRODUCT' : 'ADD PRODUCT'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/50 hover:text-white font-mono text-sm uppercase"
              >
                [CLOSE ×]
              </button>
            </div>

            {formError && (
              <div className="p-4 border border-kred bg-kred/10 text-kred text-xs font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-6">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                  PRODUCT NAME *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 1000 Wala Imperial Red Garland"
                  className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white"
                />
              </div>

              {/* Module & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                    PRIMARY MODULE *
                  </label>
                  <select
                    value={moduleVal}
                    onChange={(e) => setModuleVal(e.target.value as ProductModule)}
                    className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white focus:outline-none focus:border-white uppercase"
                  >
                    <option value="BASIC">BASIC</option>
                    <option value="CUSTOMIZED">CUSTOMIZED</option>
                    <option value="PERSONALIZED">PERSONALIZED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                    CATEGORY / CLASSIFICATION
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Garlands, Rockets, Aerial"
                    className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white uppercase"
                  />
                </div>
              </div>

              {/* Price & MRP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                    SELLING PRICE (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 1450"
                    className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                    ORIGINAL / MRP PRICE (₹ OPTIONAL)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="e.g. 2100"
                    className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              {/* Image Upload Area */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                  PRODUCT PHOTOGRAPH
                </label>
                {imageUrl ? (
                  <div className="flex items-center space-x-6 p-4 border border-white/20">
                    <div className="w-24 h-24 p-1.5 border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
                      <img
                        src={imageUrl}
                        alt="Product preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono text-white/60 block truncate max-w-xs">
                        {imageUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="text-xs font-mono uppercase text-kred hover:underline"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-white/20 p-6 text-center hover:border-white transition-colors">
                    <input
                      type="file"
                      id="admin-product-file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                    <label htmlFor="admin-product-file" className="cursor-pointer block space-y-2">
                      <span className="text-xs font-mono uppercase tracking-widest text-white block">
                        {uploadingImage ? 'UPLOADING...' : 'SELECT PRODUCT IMAGE FILE'}
                      </span>
                      <span className="text-[10px] font-mono text-white/40 block">
                        Supports JPG, PNG, WEBP
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                  DESCRIPTION / SPECIFICATIONS
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Composition details, acoustic level, packaging specifications..."
                  className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white"
                />
              </div>

              {/* Status Toggles Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 font-mono text-xs">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                    className="accent-kred"
                  />
                  <span>VISIBLE</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="accent-kred"
                  />
                  <span>IN STOCK</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="accent-kred"
                  />
                  <span className="text-kred">POPULAR</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="accent-kred"
                  />
                  <span>FEATURED</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-white/10 flex justify-end space-x-4 font-mono text-xs tracking-widest">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 border border-white/20 text-white hover:border-white uppercase"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-white text-black font-bold uppercase hover:bg-kred hover:text-white transition-colors"
                >
                  {editingProduct ? 'SAVE CHANGES' : 'CREATE PRODUCT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

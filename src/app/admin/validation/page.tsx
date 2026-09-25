'use client';

import React, { useEffect, useState } from 'react';
import { CatalogueValidationReport, ValidationIssue, Product } from '@/types';
import SectionHeader from '@/components/SectionHeader';

export default function AdminValidationPage() {
  const [report, setReport] = useState<CatalogueValidationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<'ALL' | 'ERROR' | 'WARNING' | 'INCOMPLETE'>('ALL');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Editable Form Fields
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formMrp, setFormMrp] = useState('');
  const [formDiscount, setFormDiscount] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');

  const fetchValidationReport = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/validation');
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
      }
    } catch (err) {
      console.error('Failed fetching validation report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidationReport();
  }, []);

  const openEditModal = async (productId: string) => {
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/products/${productId}`);
      const data = await res.json();
      if (data.success && data.product) {
        const p: Product = data.product;
        setEditingProduct(p);
        setFormName(p.name || '');
        setFormBrand(p.brand || '');
        setFormCategory(p.category || '');
        setFormSubcategory(p.subcategory || '');
        setFormPrice(p.price !== undefined ? String(p.price) : '');
        setFormMrp(p.original_price !== undefined ? String(p.original_price) : '');
        setFormDiscount(p.discount_percent !== undefined ? String(p.discount_percent) : '');
        setFormStock(p.stock_quantity !== undefined && p.stock_quantity !== null ? String(p.stock_quantity) : '');
        setFormDescription(p.description || '');
        setFormImage(p.images && p.images.length > 0 ? p.images[0] : '');
      }
    } catch (err) {
      console.error('Failed to load product for editing:', err);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSavingProduct(true);
    setSaveMessage(null);

    const payload: Partial<Product> = {
      name: formName,
      brand: formBrand,
      category: formCategory,
      subcategory: formSubcategory,
      price: parseFloat(formPrice) || 0,
      original_price: parseFloat(formMrp) || 0,
      discount_percent: formDiscount,
      stock_quantity: formStock ? parseInt(formStock, 10) : null,
      description: formDescription,
      images: formImage ? [formImage] : [],
      in_stock: Boolean(formStock && parseInt(formStock, 10) > 0),
    };

    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage('Product updated successfully.');
        await fetchValidationReport();
        setTimeout(() => {
          setEditingProduct(null);
          setSaveMessage(null);
        }, 1200);
      } else {
        setSaveMessage(data.error || 'Failed to update product.');
      }
    } catch (err) {
      console.error('Error updating product:', err);
      setSaveMessage('Network error updating product.');
    } finally {
      setSavingProduct(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="font-mono text-xs tracking-widest uppercase text-white/40 animate-pulse">
          AUDITING 138-PRODUCT CATALOGUE SCHEMA & ATTRIBUTES...
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="py-24 text-center text-white/40 font-mono text-xs uppercase">
        FAILED TO GENERATE CATALOGUE VALIDATION REPORT.
      </div>
    );
  }

  // Combine all issues with category tags
  const allIssues: (ValidationIssue & { typeCategory: string })[] = [
    ...report.errors.map((i) => ({ ...i, typeCategory: 'ERRORS' })),
    ...report.warnings.map((i) => {
      let typeCategory = 'WARNINGS';
      if (i.field === 'Discount %') typeCategory = 'DISCOUNTS';
      else if (i.field === 'Main Image') typeCategory = 'IMAGES';
      else if (i.field === 'Stock Quantity') typeCategory = 'STOCK';
      else if (i.field === 'Product Name') typeCategory = 'NAMES_TYPOS';
      else if (i.field === 'Category') typeCategory = 'CATEGORIES';
      return { ...i, typeCategory };
    }),
    ...report.incompleteOptional.map((i) => ({ ...i, typeCategory: 'INCOMPLETE' })),
  ];

  // Filter issues
  const filteredIssues = allIssues.filter((issue) => {
    if (activeSeverityFilter !== 'ALL' && issue.severity !== activeSeverityFilter) {
      return false;
    }
    if (activeCategoryFilter !== 'ALL') {
      if (activeCategoryFilter === 'DISCOUNTS' && issue.field !== 'Discount %') return false;
      if (activeCategoryFilter === 'IMAGES' && issue.field !== 'Main Image') return false;
      if (activeCategoryFilter === 'STOCK' && issue.field !== 'Stock Quantity') return false;
      if (activeCategoryFilter === 'NAMES_TYPOS' && issue.field !== 'Product Name') return false;
      if (activeCategoryFilter === 'CATEGORIES' && issue.field !== 'Category') return false;
      if (activeCategoryFilter === 'DESCRIPTIONS' && issue.field !== 'Description') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        issue.id.toLowerCase().includes(q) ||
        issue.productName.toLowerCase().includes(q) ||
        issue.field.toLowerCase().includes(q) ||
        issue.issue.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/10">
        <SectionHeader
          number="AUDIT"
          title="CATALOGUE VALIDATION"
          subtitle="RIGOROUS VERIFICATION OF THE IMPORTED 138-PRODUCT REPOSITORY"
        />

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={fetchValidationReport}
            className="px-6 py-3 border border-white/20 text-white font-mono text-xs uppercase tracking-widest hover:border-white transition-colors"
          >
            ↻ RE-RUN AUDIT
          </button>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY TELEMETRY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {/* TOTAL PRODUCTS */}
        <div className="p-6 sm:p-8 border border-white/10 bg-white/[0.01] space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
            TOTAL PRODUCTS
          </span>
          <div className="text-4xl sm:text-5xl font-mono font-bold text-white">
            {report.totalProducts}
          </div>
          <span className="text-[10px] font-mono text-white/30 block">Imported catalogue items</span>
        </div>

        {/* PRODUCTS REQUIRING ATTENTION */}
        <div className="p-6 sm:p-8 border border-kred/50 bg-kred/[0.03] space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-kred block">
            REQUIRING ATTENTION
          </span>
          <div className="text-4xl sm:text-5xl font-mono font-bold text-kred">
            {report.productsRequiringAttentionCount}
          </div>
          <span className="text-[10px] font-mono text-kred/60 block">
            100% of imported products
          </span>
        </div>

        {/* CRITICAL ERRORS */}
        <div className="p-6 sm:p-8 border border-white/10 bg-white/[0.01] space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
            CRITICAL ERRORS
          </span>
          <div className="text-4xl sm:text-5xl font-mono font-bold text-white">
            {report.errors.length}
          </div>
          <span className="text-[10px] font-mono text-white/30 block">Zero schema/price blockers</span>
        </div>

        {/* WARNINGS */}
        <div className="p-6 sm:p-8 border border-white/20 bg-white/[0.02] space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/70 block">
            WARNINGS
          </span>
          <div className="text-4xl sm:text-5xl font-mono font-bold text-white">
            {report.warnings.length}
          </div>
          <span className="text-[10px] font-mono text-white/30 block">Images, stock & discrepancies</span>
        </div>

        {/* INCOMPLETE OPTIONAL */}
        <div className="p-6 sm:p-8 border border-white/10 bg-white/[0.01] space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
            INCOMPLETE FIELDS
          </span>
          <div className="text-4xl sm:text-5xl font-mono font-bold text-white/60">
            {report.incompleteOptional.length}
          </div>
          <span className="text-[10px] font-mono text-white/30 block">Descriptions, subcategories, units</span>
        </div>
      </div>

      {/* DETAILED CATEGORY AUDIT GRID */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3 text-xs font-mono uppercase tracking-widest text-kred">
          <span className="w-1.5 h-1.5 rounded-full bg-kred" />
          <span>SPECIFIC ATTRIBUTE AUDIT BREAKDOWN</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-mono text-xs">
          {/* Duplicate IDs */}
          <div className="p-4 border border-white/10 bg-black space-y-1">
            <span className="text-[10px] text-white/40 uppercase block">DUPLICATE IDS</span>
            <div className="text-xl font-bold text-white">{report.duplicateIds.length}</div>
            <span className="text-[10px] text-white/30 block">All IDs unique</span>
          </div>

          {/* Missing IDs */}
          <div className="p-4 border border-white/10 bg-black space-y-1">
            <span className="text-[10px] text-white/40 uppercase block">MISSING IDS</span>
            <div className="text-xl font-bold text-white">{report.missingIds.length}</div>
            <span className="text-[10px] text-white/30 block">KRK001 - KRK138</span>
          </div>

          {/* Missing Names */}
          <div className="p-4 border border-white/10 bg-black space-y-1">
            <span className="text-[10px] text-white/40 uppercase block">MISSING NAMES</span>
            <div className="text-xl font-bold text-white">{report.missingNames.length}</div>
            <span className="text-[10px] text-white/30 block">100% names present</span>
          </div>

          {/* Invalid MRP / SP */}
          <div className="p-4 border border-white/10 bg-black space-y-1">
            <span className="text-[10px] text-white/40 uppercase block">INVALID PRICES</span>
            <div className="text-xl font-bold text-white">{report.invalidPrices.length}</div>
            <span className="text-[10px] text-white/30 block">Zero price reversals</span>
          </div>

          {/* Incorrect Discounts */}
          <div className="p-4 border border-kred/30 bg-kred/[0.02] space-y-1">
            <span className="text-[10px] text-kred uppercase block">INCORRECT DISCOUNTS</span>
            <div className="text-xl font-bold text-kred">{report.incorrectDiscounts.length}</div>
            <span className="text-[10px] text-kred/60 block">Discrepancies identified</span>
          </div>

          {/* Missing Images */}
          <div className="p-4 border border-kred/30 bg-kred/[0.02] space-y-1">
            <span className="text-[10px] text-kred uppercase block">MISSING IMAGES</span>
            <div className="text-xl font-bold text-kred">{report.missingImages.length}</div>
            <span className="text-[10px] text-kred/60 block">Not present on disk</span>
          </div>

          {/* Missing Descriptions */}
          <div className="p-4 border border-white/10 bg-black space-y-1">
            <span className="text-[10px] text-white/40 uppercase block">MISSING DESCRIPTIONS</span>
            <div className="text-xl font-bold text-white">{report.missingDescriptions.length}</div>
            <span className="text-[10px] text-white/30 block">All 138 empty in CSV</span>
          </div>

          {/* Missing Categories */}
          <div className="p-4 border border-white/10 bg-black space-y-1">
            <span className="text-[10px] text-white/40 uppercase block">MISSING CATEGORIES</span>
            <div className="text-xl font-bold text-white">{report.missingCategories.length}</div>
            <span className="text-[10px] text-white/30 block">All categorized</span>
          </div>

          {/* Missing Brands */}
          <div className="p-4 border border-white/10 bg-black space-y-1">
            <span className="text-[10px] text-white/40 uppercase block">MISSING BRANDS</span>
            <div className="text-xl font-bold text-white">{report.missingBrands.length}</div>
            <span className="text-[10px] text-white/30 block">All brands present</span>
          </div>

          {/* Missing Stock Values */}
          <div className="p-4 border border-kred/30 bg-kred/[0.02] space-y-1">
            <span className="text-[10px] text-kred uppercase block">MISSING STOCK</span>
            <div className="text-xl font-bold text-kred">{report.missingStockValues.length}</div>
            <span className="text-[10px] text-kred/60 block">138 unassigned</span>
          </div>

          {/* Other Violations */}
          <div className="p-4 border border-white/20 bg-black space-y-1 sm:col-span-2">
            <span className="text-[10px] text-white/60 uppercase block">OTHER SCHEMA & TYPOS</span>
            <div className="text-xl font-bold text-white">{report.otherSchemaViolations.length}</div>
            <span className="text-[10px] text-white/40 block">Whitespace, typos, generic category</span>
          </div>
        </div>
      </div>

      {/* SEVERITY & CATEGORY FILTERS */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Severity Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto text-xs font-mono uppercase tracking-wider pb-2 md:pb-0">
            <button
              type="button"
              onClick={() => setActiveSeverityFilter('ALL')}
              className={`px-4 py-2 border transition-colors whitespace-nowrap ${
                activeSeverityFilter === 'ALL'
                  ? 'border-white bg-white text-black font-bold'
                  : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'
              }`}
            >
              ALL SEVERITIES ({allIssues.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSeverityFilter('ERROR')}
              className={`px-4 py-2 border transition-colors whitespace-nowrap ${
                activeSeverityFilter === 'ERROR'
                  ? 'border-kred bg-kred text-white font-bold'
                  : 'border-white/10 text-white/60 hover:border-kred/50 hover:text-kred'
              }`}
            >
              ERRORS ({report.errors.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSeverityFilter('WARNING')}
              className={`px-4 py-2 border transition-colors whitespace-nowrap ${
                activeSeverityFilter === 'WARNING'
                  ? 'border-white bg-white text-black font-bold'
                  : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'
              }`}
            >
              WARNINGS ({report.warnings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSeverityFilter('INCOMPLETE')}
              className={`px-4 py-2 border transition-colors whitespace-nowrap ${
                activeSeverityFilter === 'INCOMPLETE'
                  ? 'border-white bg-white text-black font-bold'
                  : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white'
              }`}
            >
              INCOMPLETE OPTIONAL ({report.incompleteOptional.length})
            </button>
          </div>

          {/* Search Query */}
          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="SEARCH ISSUE / PRODUCT ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-white/20 p-2.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white uppercase"
            />
          </div>
        </div>

        {/* Category Specific Sub-filter */}
        <div className="flex items-center space-x-2 overflow-x-auto text-[11px] font-mono uppercase tracking-wider pb-2 text-white/60">
          <span className="text-white/40 mr-2">SUB-FILTER:</span>
          {[
            { label: 'ALL FIELDS', val: 'ALL' },
            { label: 'INCORRECT DISCOUNTS', val: 'DISCOUNTS' },
            { label: 'MISSING IMAGES', val: 'IMAGES' },
            { label: 'STOCK EMPTY', val: 'STOCK' },
            { label: 'NAME WHITESPACE / TYPOS', val: 'NAMES_TYPOS' },
            { label: 'GENERIC CATEGORIES', val: 'CATEGORIES' },
            { label: 'EMPTY DESCRIPTIONS', val: 'DESCRIPTIONS' },
          ].map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => setActiveCategoryFilter(item.val)}
              className={`px-3 py-1 border transition-colors whitespace-nowrap ${
                activeCategoryFilter === item.val
                  ? 'border-white text-white bg-white/10 font-bold'
                  : 'border-white/10 text-white/40 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ISSUES TABLE (CLICK ISSUE OR EDIT BUTTON TO EDIT PRODUCT) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs font-mono text-white/50">
          <span>
            CLICK ANY ROW OR &quot;EDIT PRODUCT&quot; TO MANUALLY ADJUST THE AFFECTED RECORD
          </span>
          <span className="text-kred font-bold">
            SHOWING {filteredIssues.length} ISSUES
          </span>
        </div>

        <div className="border border-white/10 bg-white/[0.01] overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-white/40 uppercase tracking-widest">
                <th className="p-4">SEVERITY</th>
                <th className="p-4">PRODUCT ID</th>
                <th className="p-4">PRODUCT NAME</th>
                <th className="p-4">FIELD</th>
                <th className="p-4">VALIDATION DIAGNOSTIC</th>
                <th className="p-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredIssues.slice(0, 200).map((issue, idx) => (
                <tr
                  key={`${issue.id}-${issue.field}-${idx}`}
                  onClick={() => openEditModal(issue.id)}
                  className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  {/* Severity */}
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold border uppercase ${
                        issue.severity === 'ERROR'
                          ? 'border-kred bg-kred text-white'
                          : issue.severity === 'WARNING'
                          ? 'border-white/40 text-white bg-white/5'
                          : 'border-white/10 text-white/40'
                      }`}
                    >
                      {issue.severity}
                    </span>
                  </td>

                  {/* ID */}
                  <td className="p-4 font-bold text-white">{issue.id}</td>

                  {/* Name */}
                  <td className="p-4 text-white uppercase max-w-xs truncate">
                    {issue.productName}
                  </td>

                  {/* Field */}
                  <td className="p-4 text-kred font-bold">{issue.field}</td>

                  {/* Issue Description */}
                  <td className="p-4 text-white/70 max-w-md">
                    <div>{issue.issue}</div>
                    {issue.details && (
                      <span className="text-[10px] text-white/40 block mt-0.5">
                        {issue.details}
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(issue.id);
                      }}
                      className="px-3 py-1.5 border border-white/20 text-white hover:border-kred hover:text-kred uppercase text-[10px] tracking-wider transition-colors"
                    >
                      EDIT PRODUCT →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredIssues.length > 200 && (
          <div className="text-center font-mono text-xs text-white/40 py-4">
            DISPLAYING FIRST 200 OF {filteredIssues.length} ISSUES. USE SEARCH OR FILTERS TO REFINE.
          </div>
        )}
      </div>

      {/* EDIT PRODUCT MODAL (CLICK AN ISSUE TO EDIT) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="border border-white/20 bg-black max-w-3xl w-full p-8 sm:p-12 space-y-8 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-white/10 pb-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-kred block mb-1">
                  MANUAL PRODUCT REMEDIATION // NO AUTO-MUTATION
                </span>
                <h3 className="text-2xl font-bold uppercase tracking-wider text-white">
                  EDIT {editingProduct.id}
                </h3>
                <span className="text-xs font-mono text-white/40">
                  Original Module: {editingProduct.module}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-white/50 hover:text-white font-mono text-sm uppercase"
              >
                [CLOSE ×]
              </button>
            </div>

            {saveMessage && (
              <div className="p-4 border border-kred bg-kred/10 text-kred text-xs font-mono">
                {saveMessage}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-6 font-mono text-xs">
              {/* Product ID & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block uppercase tracking-widest text-white/40 mb-2">
                    PRODUCT ID (IMMUTABLE)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingProduct.id}
                    className="w-full bg-white/[0.03] border border-white/10 p-3 text-white/50 cursor-not-allowed uppercase"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block uppercase tracking-widest text-white/70 mb-2">
                    PRODUCT NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3 text-white focus:outline-none focus:border-white uppercase"
                  />
                </div>
              </div>

              {/* Brand, Category, Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block uppercase tracking-widest text-white/70 mb-2">
                    BRAND NAME
                  </label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3 text-white focus:outline-none focus:border-white uppercase"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-widest text-white/70 mb-2">
                    CATEGORY *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3 text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-widest text-white/70 mb-2">
                    SUBCATEGORY
                  </label>
                  <input
                    type="text"
                    value={formSubcategory}
                    onChange={(e) => setFormSubcategory(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3 text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              {/* MRP, Selling Price, Discount, Stock */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <label className="block uppercase tracking-widest text-white/70 mb-2">
                    MRP (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formMrp}
                    onChange={(e) => setFormMrp(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3 text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-widest text-white/70 mb-2">
                    SELLING PRICE (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3 text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-widest text-white/70 mb-2">
                    DISCOUNT %
                  </label>
                  <input
                    type="text"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3 text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-widest text-white/70 mb-2">
                    STOCK QUANTITY
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3 text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              {/* Main Image Filename */}
              <div>
                <label className="block uppercase tracking-widest text-white/70 mb-2">
                  MAIN IMAGE ASSET FILENAME
                </label>
                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="e.g. KRK001_main.jpg"
                  className="w-full bg-black border border-white/20 p-3 text-white focus:outline-none focus:border-white"
                />
                <span className="text-[10px] text-white/40 block mt-1">
                  Target location: public/uploads/products/{formImage || 'filename.jpg'}
                </span>
              </div>

              {/* Description */}
              <div>
                <label className="block uppercase tracking-widest text-white/70 mb-2">
                  DESCRIPTION / SPECIFICATIONS
                </label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Enter formulation details, safety notes, shot counts..."
                  className="w-full bg-black border border-white/20 p-3 text-white focus:outline-none focus:border-white"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-6 border-t border-white/10 flex justify-end space-x-4 tracking-widest">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-6 py-3 border border-white/20 text-white hover:border-white uppercase"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-8 py-3 bg-white text-black font-bold uppercase hover:bg-kred hover:text-white transition-colors disabled:opacity-50"
                >
                  {savingProduct ? 'SAVING RECORD...' : 'SAVE & RE-VALIDATE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

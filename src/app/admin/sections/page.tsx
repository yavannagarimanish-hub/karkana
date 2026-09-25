'use client';

import React, { useEffect, useState } from 'react';
import { StorefrontSection } from '@/types';
import SectionHeader from '@/components/SectionHeader';

export default function AdminSectionsPage() {
  const [sections, setSections] = useState<StorefrontSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<StorefrontSection | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sections');
      const data = await res.json();
      if (data.success) {
        setSections(data.sections || []);
      }
    } catch (err) {
      console.error('Failed fetching sections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const openEditModal = (s: StorefrontSection) => {
    setEditingSection(s);
    setTitle(s.title);
    setSubtitle(s.subtitle);
    setIsVisible(s.is_visible);
  };

  const handleToggleVisibility = async (section: StorefrontSection) => {
    try {
      const res = await fetch(`/api/sections/${section.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: !section.is_visible }),
      });
      const data = await res.json();
      if (data.success) {
        setSections((prev) =>
          prev.map((s) => (s.id === section.id ? { ...s, is_visible: !s.is_visible } : s))
        );
      }
    } catch (err) {
      console.error('Failed to toggle section:', err);
    }
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;

    try {
      const res = await fetch(`/api/sections/${editingSection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim(),
          is_visible: isVisible,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSections((prev) =>
          prev.map((s) => (s.id === editingSection.id ? data.section : s))
        );
        setEditingSection(null);
      }
    } catch (err) {
      console.error('Save section error:', err);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-8 border-b border-white/10">
        <SectionHeader
          number="04"
          title="STOREFRONT SECTIONS"
          subtitle="CONTROL ARCHITECTURAL VISIBILITY AND HEADINGS ON THE HOMEPAGE"
        />

        <div className="text-xs font-mono tracking-widest text-white/40 uppercase">
          {sections.length} DYNAMIC MODULES
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center font-mono text-xs tracking-widest text-white/40 uppercase animate-pulse">
          CONFIGURING STOREFRONT TOPOLOGY...
        </div>
      ) : (
        <div className="border border-white/10 bg-white/[0.01] divide-y divide-white/10 font-mono text-xs">
          {sections.map((sec, idx) => (
            <div
              key={sec.id}
              className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-white/[0.01] transition-colors"
            >
              <div className="flex items-start space-x-6">
                <span className="text-xl font-bold text-white/30">0{idx + 1}</span>
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-base font-bold uppercase text-white tracking-wider">
                      {sec.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-[9px] uppercase border ${
                        sec.is_visible
                          ? 'border-white/40 text-white'
                          : 'border-white/10 text-white/30'
                      }`}
                    >
                      {sec.is_visible ? 'ACTIVE ON HOMEPAGE' : 'HIDDEN'}
                    </span>
                  </div>
                  <p className="text-white/40 text-[11px] uppercase tracking-wider">
                    {sec.subtitle || 'NO SUBTITLE SPECIFIED'}
                  </p>
                  <div className="text-[10px] text-white/30 pt-1">
                    KEY: {sec.key.toUpperCase()} {'//'} POSITION: {sec.display_position}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(sec)}
                  className={`px-4 py-2 border uppercase font-mono text-xs transition-colors ${
                    sec.is_visible
                      ? 'border-white text-white hover:border-kred hover:text-kred'
                      : 'border-white/20 text-white/40 hover:border-white hover:text-white'
                  }`}
                >
                  {sec.is_visible ? 'HIDE SECTION' : 'SHOW ON HOMEPAGE'}
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(sec)}
                  className="px-4 py-2 bg-white text-black font-bold uppercase font-mono text-xs hover:bg-kred hover:text-white transition-colors"
                >
                  EDIT
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT SECTION MODAL */}
      {editingSection && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
          <div className="border border-white/20 bg-black max-w-xl w-full p-8 sm:p-12 space-y-8">
            <div className="flex justify-between items-start border-b border-white/10 pb-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-kred block mb-1">
                  MODULE CONFIGURATION
                </span>
                <h3 className="text-2xl font-bold uppercase tracking-wider text-white">
                  EDIT SECTION
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="text-white/50 hover:text-white font-mono text-sm uppercase"
              >
                [CLOSE ×]
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="space-y-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                  SECTION TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white focus:outline-none focus:border-white uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                  SUBTITLE / SLOGAN
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white focus:outline-none focus:border-white uppercase"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-3 cursor-pointer font-mono text-xs">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                    className="accent-kred"
                  />
                  <span>DISPLAY THIS SECTION ON CUSTOMER HOMEPAGE</span>
                </label>
              </div>

              <div className="pt-6 border-t border-white/10 flex justify-end space-x-4 font-mono text-xs tracking-widest">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-6 py-3 border border-white/20 text-white hover:border-white uppercase"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-white text-black font-bold uppercase hover:bg-kred hover:text-white transition-colors"
                >
                  SAVE SECTION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

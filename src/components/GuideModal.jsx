"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const formatDisplayName = (slug) => {
  if (!slug) return '';
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function GuideModal({ open, onClose, defaultCategory = null }) {
  if (!open) return null;

  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState('root');
  const [selected, setSelected] = useState(null);
  const [selectedSubmenuItem, setSelectedSubmenuItem] = useState(null);
  const [submenu, setSubmenu] = useState({ loading: false, items: [], grouped: null, error: null });
  const [submenuStage, setSubmenuStage] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const router = useRouter();
  useEffect(() => {
    // Trigger stagger animation on mount
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    // Reset state when modal opens; optionally jump to a default submenu
    if (open) {
      setSelectedSubmenuItem(null);
      setMounted(false);
      if (defaultCategory) {
        setSelected(defaultCategory);
        setStage('submenu');
        setSubmenuStage('categories');
        setSelectedCategory(null);
        fetchSubmenu(defaultCategory);
      } else {
        setStage('root');
        setSelected(null);
        setSubmenuStage('categories');
        setSelectedCategory(null);
        setTimeout(() => setMounted(true), 50);
      }
    }
  }, [open, defaultCategory]);

  const options = [
    {
      key: 'counselling',
      title: "Child Counseling",
      description: "A safe space for your kids to express & grow.",
      image: "/Child Counseling.webp",
    },
    {
      key: 'assessments',
      title: "Child Assessment",
      description: "Find your child's needs & strengths to grow.",
      image: "/Child Assessment.webp",
    },
    {
      key: 'better-parenting',
      title: "Better Parenting",
      description: "Learn, Connect & Build a wonderful home.",
      image: "/Better parenting.webp",
    },
  ];

  const headingByKey = useMemo(() => ({
    'counselling': 'Choose a counseling service',
    'assessments': 'Choose an assessment',
    'better-parenting': 'Choose a better parenting program',
  }), []);

  const counsellingCategoryHeadings = {
    emotional: 'Emotional & Mental Health',
    development: 'Child Development & Learning',
    behaviour: 'Behaviour & Confidence Building',
    stress: 'Stress & Academic Support',
    trauma: 'Trauma & Healing'
  };

  const assessmentsCategoryHeadings = {
    adhd: 'ADHD',
    ebs: 'Emotional & Behavioral Screening',
    intelligence: 'Intelligence Test',
    projective: 'Projective Tests'
  };

  const fetchSubmenu = async (key) => {
    try {
      setSubmenu({ loading: true, items: [], grouped: null, error: null });
      // Use BACKEND_URL consistently (same as other components)
      const base = process.env.NEXT_PUBLIC_BACKEND_URL 
        ? process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/api\/?$/, '') // Remove /api suffix if present
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001');
      
      if (key === 'counselling') {
        const res = await fetch(`${base}/api/counselling?limit=50`, { 
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const json = await res.json();
        const services = json?.data?.services || json?.message?.services || json?.services || [];
        
        if (!Array.isArray(services)) {
          console.warn('GuideModal: Invalid services data format', json);
          throw new Error('Invalid response format');
        }
        const grouped = { emotional: [], development: [], behaviour: [], stress: [], trauma: [] };
        services
          .filter(s => s.status === 'published' && s.category && s.slug)
          .filter(s => {
            // Filter out any service with slug that matches category names or invalid patterns
            // This prevents 404 errors when Razorpay or other crawlers try to access pages like
            // /counselling/emotional-and-mental-health which don't exist (these are category headers, not actual pages)
            const invalidSlugs = ['emotional-and-mental-health', 'emotional-mental-health', 'emotional', 'mental-health'];
            return !invalidSlugs.includes(s.slug.toLowerCase());
          })
          .forEach(s => {
            if (grouped[s.category]) {
              grouped[s.category].push({
                title: formatDisplayName(s.slug),
                slug: s.slug,
                href: `/counselling/${s.slug}`,
                order: s.menu_order || 0
              });
            }
          });
        Object.keys(grouped).forEach(cat => grouped[cat].sort((a,b)=>a.order-b.order));
        
        // Check if we have any data
        const hasData = Object.values(grouped).some(cat => cat.length > 0);
        if (!hasData) {
          setSubmenu({ loading: false, items: [], grouped: null, error: 'No services available' });
        } else {
          setSubmenu({ loading: false, items: [], grouped, error: null });
        }
        requestAnimationFrame(() => setMounted(true));
      } else if (key === 'assessments') {
        const res = await fetch(`${base}/api/assessments?limit=50`, { 
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const json = await res.json();
        const assessments = json?.data?.assessments || json?.message?.assessments || json?.assessments || json?.message || [];
        
        if (!Array.isArray(assessments)) {
          console.warn('GuideModal: Invalid assessments data format', json);
          throw new Error('Invalid response format');
        }
        const grouped = { adhd: [], ebs: [], intelligence: [], projective: [] };
        (assessments || [])
          .filter(a => a.status === 'published' && a.category)
          .forEach(a => {
            if (grouped[a.category]) {
              grouped[a.category].push({
                title: formatDisplayName(a.slug),
                slug: a.slug,
                href: `/assessments/${a.slug}`,
                order: a.menu_order || 0
              });
            }
          });
        Object.keys(grouped).forEach(cat => grouped[cat].sort((a,b)=>a.order-b.order));
        
        // Check if we have any data
        const hasData = Object.values(grouped).some(cat => cat.length > 0);
        if (!hasData) {
          setSubmenu({ loading: false, items: [], grouped: null, error: 'No assessments available' });
        } else {
          setSubmenu({ loading: false, items: [], grouped, error: null });
        }
        requestAnimationFrame(() => setMounted(true));
      } else if (key === 'better-parenting') {
        const res = await fetch(`${base}/api/better-parenting?limit=50`, { 
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const json = await res.json();
        const pages = json?.data?.pages || json?.message?.pages || json?.pages || [];
        
        if (!Array.isArray(pages)) {
          console.warn('GuideModal: Invalid pages data format', json);
          throw new Error('Invalid response format');
        }
        const items = pages.filter(p => p.status === 'published').map(p => ({
          title: formatDisplayName(p.slug),
          slug: p.slug,
          href: `/better-parenting/${p.slug}`,
          order: p.menu_order || 0
        })).sort((a, b) => a.order - b.order);
        
        if (items.length === 0) {
          setSubmenu({ loading: false, items: [], grouped: null, error: 'No programs available' });
        } else {
          setSubmenu({ loading: false, items, grouped: null, error: null });
        }
        requestAnimationFrame(() => setMounted(true));
      }
    } catch (e) {
      console.error('Error fetching submenu:', e);
      setSubmenu({ loading: false, items: [], grouped: null, error: 'Failed to load options. Please try again.' });
      requestAnimationFrame(() => setMounted(true));
    }
  };

  const handleOptionClick = (key) => {
    setSelected(key);
    setTimeout(() => {
      setStage('submenu');
      setMounted(false);
      fetchSubmenu(key);
    }, 350);
  };

  const handleBack = () => {
    if (stage === 'submenu' && submenuStage === 'items') {
      setSelectedSubmenuItem(null);
      setSelectedCategory(null);
      setSubmenuStage('categories');
      setMounted(true);
      return;
    }
    setStage('root');
    setSelected(null);
    setSelectedSubmenuItem(null);
    setSelectedCategory(null);
    setSubmenuStage('categories');
    setSubmenu({ loading: false, items: [], grouped: submenu.grouped || null });
    setMounted(true);
  };

  const handleSubmenuItemClick = (item) => {
    setSelectedSubmenuItem(item.slug);
    // Fade out other items, then navigate
    setTimeout(() => {
      router.push(item.href);
      onClose?.();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm" onClick={(e)=>{ if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="w-full max-w-[520px]">
        {stage === 'root' && (
          <div className="space-y-4">
            <div className="px-1">
              <h6 className="text-center text-white/95 text-base md:text-lg font-semibold">Let’s get started — choose</h6>
            </div>
            {options.map((opt, idx) => (
              <button key={idx} type="button" onClick={() => handleOptionClick(opt.key)} className="block w-full text-left">
                <div
                  className={`flex items-center gap-3 p-3 md:p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${selected && selected !== opt.key ? 'opacity-0 translate-y-2 scale-[0.98]' : ''}`}
                  style={{ transitionDelay: `${idx * 220}ms` }}
                >
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <Image 
                      src={opt.image} 
                      alt={opt.title} 
                      fill 
                      className="object-cover" 
                      sizes="(max-width: 768px) 80px, 96px"
                      unoptimized={false}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-base md:text-lg font-semibold text-gray-900">{opt.title}</div>
                    <div className="text-sm text-gray-600 mt-0.5">{opt.description}</div>
                  </div>
                  <div className="text-gray-400">→</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {stage === 'submenu' && (
          <div className="relative">
            {/* Floating header - does not push options down */}
            <div className="absolute left-0 right-0 flex items-center justify-between px-1" style={{ top: -40 }}>
              <button type="button" onClick={handleBack} className="text-white/80 hover:text-white text-xs md:text-sm">← Back</button>
              <div className="text-white/90 text-xs md:text-sm font-medium leading-none">{headingByKey[selected] || 'Choose an option'}</div>
              <div className="w-4" />
            </div>
            {submenu.loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-white/80 text-sm">Loading...</div>
              </div>
            ) : submenu.error ? (
              <div className="space-y-3">
                <div className="text-gray-600 text-sm bg-white p-4 rounded-xl border border-gray-200 text-center">
                  {submenu.error}
                </div>
                <button
                  type="button"
                  onClick={() => fetchSubmenu(selected)}
                  className="w-full p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-900"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {selected !== 'better-parenting' && submenu.grouped && submenuStage === 'categories' && (
                  <div className="space-y-3">
                    {Object.entries(submenu.grouped).map(([cat, items], idx) => (
                      items.length > 0 && (
                        <button
                          key={cat}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedCategory(cat);
                            setMounted(false);
                            setTimeout(() => {
                              setSubmenuStage('items');
                              setTimeout(() => setMounted(true), 50);
                            }, 200);
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedCategory(cat);
                            setMounted(false);
                            setTimeout(() => {
                              setSubmenuStage('items');
                              setTimeout(() => setMounted(true), 50);
                            }, 200);
                          }}
                          className={`w-full text-left transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                          style={{ transitionDelay: `${idx * 220}ms`, touchAction: 'manipulation' }}
                        >
                          <div className="flex items-center justify-between p-3 md:p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50">
                            <div className="text-sm md:text-base font-semibold text-gray-900">
                              {(selected === 'counselling' ? counsellingCategoryHeadings[cat] : assessmentsCategoryHeadings[cat]) || cat}
                            </div>
                            <div className="text-gray-400">→</div>
                          </div>
                        </button>
                      )
                    ))}
                  </div>
                )}

                {selected !== 'better-parenting' && submenu.grouped && submenuStage === 'items' && selectedCategory && (
                  <div className="space-y-3">
                    {(submenu.grouped[selectedCategory] || []).map((item, idx) => (
                      <button
                        key={item.slug || idx}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSubmenuItemClick(item);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSubmenuItemClick(item);
                        }}
                        className={`w-full text-left transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${selectedSubmenuItem && selectedSubmenuItem !== item.slug ? 'opacity-0 translate-y-2 scale-[0.98] pointer-events-none' : ''}`}
                        style={{ transitionDelay: `${idx * 220}ms`, touchAction: 'manipulation' }}
                      >
                        <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100">
                        <div className="flex-1">
                          <div className="text-sm md:text-base font-medium text-gray-900">{item.title}</div>
                        </div>
                          <div className="text-gray-400">→</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selected === 'better-parenting' && (
                  <div className="space-y-3">
                    {submenu.items.map((item, idx) => (
                      <button
                        key={item.slug || idx}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSubmenuItemClick(item);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSubmenuItemClick(item);
                        }}
                        className={`w-full text-left transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${selectedSubmenuItem && selectedSubmenuItem !== item.slug ? 'opacity-0 translate-y-2 scale-[0.98] pointer-events-none' : ''}`}
                        style={{ transitionDelay: `${idx * 220}ms`, touchAction: 'manipulation' }}
                      >
                        <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100">
                          <div className="flex-1">
                            <div className="text-sm md:text-base font-medium text-gray-900">{item.title}</div>
                          </div>
                          <div className="text-gray-400">→</div>
                        </div>
                      </button>
                    ))}
                    {submenu.items.length === 0 && !submenu.error && (
                      <div className="text-gray-600 text-sm bg-white p-3 rounded-xl border border-gray-200">No options found.</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



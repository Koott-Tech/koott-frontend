"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../contexts/AuthContext";
import GuideModal from "@/components/GuideModal";
import AuthModal from "@/components/AuthModal";
import QuickContactModal from "@/components/QuickContactModal";
import { authApi } from "../lib/backendApi";

export default function Header() {
  const [isFindCareOpen, setIsFindCareOpen] = useState(false);
  const [isForProvidersOpen, setIsForProvidersOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isBetterParentingOpen, setIsBetterParentingOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileFindCareOpen, setIsMobileFindCareOpen] = useState(false);
  const [isMobileForProvidersOpen, setIsMobileForProvidersOpen] = useState(false);
  const [isMobileAboutOpen, setIsMobileAboutOpen] = useState(false);
  const [isMobileResourcesOpen, setIsMobileResourcesOpen] = useState(false);
  const [isMobileBetterParentingOpen, setIsMobileBetterParentingOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showQuickContact, setShowQuickContact] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [clickedSubmenu, setClickedSubmenu] = useState(null);
  const [isAssessmentsOpen, setIsAssessmentsOpen] = useState(false);
  const [isMobileAssessmentsOpen, setIsMobileAssessmentsOpen] = useState(false);
  const [isMobileAssessmentsSubmenuOpen, setIsMobileAssessmentsSubmenuOpen] = useState({
    adhd: false,
    ebs: false,
    intelligence: false,
    projective: false,
  });
  const [isMobileSubmenuOpen, setIsMobileSubmenuOpen] = useState({
    emotional: false,
    development: false,
    behaviour: false,
    stress: false,
    trauma: false,
    adhd: false
  });
  const [counsellingMenuItems, setCounsellingMenuItems] = useState({
    emotional: [],
    development: [],
    behaviour: [],
    stress: [],
    trauma: []
  });
  const [betterParentingMenuItems, setBetterParentingMenuItems] = useState([]);
  const [assessmentsMenuItems, setAssessmentsMenuItems] = useState({
    adhd: [],
    ebs: [],
    intelligence: [],
    projective: []
  });
  const [profileData, setProfileData] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, hasRole, isLoading: authLoading } = useAuth();

  const formatDisplayName = (slug) => {
    if (!slug) return '';
    return slug
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Don't check for errors until auth has finished loading
    if (authLoading) return;
    
    const shouldShow = sessionStorage.getItem("showQuickContact");
    if (shouldShow === "true") {
      setShowQuickContact(true);
      sessionStorage.removeItem("showQuickContact");
    }
    
    // Check for auth errors and show modal only if user is not authenticated
    const authError = localStorage.getItem("auth_error");
    if (authError) {
      // If user exists or is authenticated, clear error silently
      if (user || isAuthenticated()) {
        localStorage.removeItem("auth_error");
      } else {
        // Only show modal if user is definitely not authenticated
      setShowAuthModal(true);
      localStorage.removeItem("auth_error");
    }
    }
  }, [authLoading, user, isAuthenticated]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isMobileMenuOpen]);

  // Fetch profile data for authenticated users
  useEffect(() => {
    const fetchProfile = async () => {
      if (user && isAuthenticated() && !profileData) {
        try {
          const response = await authApi.getProfile({ silent: true });
          if (response?.data?.user) {
            const profile = response.data.user.profile || response.data.user;
            setProfileData(profile);
          }
        } catch (error) {
          // Silently fail - non-critical
        }
      }
    };
    
    fetchProfile();
  }, [user]);

  // Fetch counselling menu items from API
  useEffect(() => {
    const fetchCounsellingMenu = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/counselling?limit=50`);
        
        if (!response.ok) {
          // Silently fail if backend is not available
          return;
        }
        
        const data = await response.json();
        
        const services = data?.data?.services || data?.message?.services;
        if (data.success && Array.isArray(services)) {
          // Group services by category
          const grouped = {
            emotional: [],
            development: [],
            behaviour: [],
            stress: [],
            trauma: []
          };
          
          services
            .filter(service => service.status === 'published' && service.category && service.slug)
            .filter(service => {
              // Filter out any service with slug that matches category names or invalid patterns
              // This prevents 404 errors when Razorpay or other crawlers try to access pages like
              // /counselling/emotional-and-mental-health which don't exist (these are category headers, not actual pages)
              const invalidSlugs = ['emotional-and-mental-health', 'emotional-mental-health', 'emotional', 'mental-health'];
              return !invalidSlugs.includes(service.slug.toLowerCase());
            })
            .forEach(service => {
              if (grouped[service.category]) {
                grouped[service.category].push({
                  name: formatDisplayName(service.slug),
                  url: `/counselling/${service.slug}`,
                  order: service.menu_order || 0
                });
              }
            });
          
          // Sort each category by menu_order
          Object.keys(grouped).forEach(category => {
            grouped[category].sort((a, b) => a.order - b.order);
          });
          
          // Debug: counselling grouped counts
          try {
            const counts = Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.length]));
          } catch (_) {}

          setCounsellingMenuItems(grouped);
        }
      } catch (error) {
        // Silently fail - backend might not be running
      }
    };
    
    fetchCounsellingMenu();
  }, []);

  // Fetch assessments menu items from API (dynamic like counselling)
  useEffect(() => {
    const fetchAssessmentsMenu = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/assessments?limit=50`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        const assessments = data?.data?.assessments || data?.message?.assessments;
        if (data.success && Array.isArray(assessments)) {
          const grouped = {
            adhd: [],
            ebs: [],
            intelligence: [],
            projective: []
          };
          assessments
            .filter(item => item.status === 'published' && item.category)
            .forEach(item => {
              if (grouped[item.category]) {
                grouped[item.category].push({
                  name: formatDisplayName(item.slug),
                  url: `/assessments/${item.slug}`,
                  order: item.menu_order || 0
                });
              }
            });
          Object.keys(grouped).forEach(category => {
            grouped[category].sort((a, b) => a.order - b.order);
          });
          // Debug: assessments grouped counts
          try {
            const counts = Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.length]));
          } catch (_) {}
          setAssessmentsMenuItems(grouped);
        }
      } catch (error) {
        // Silently fail
      }
    };
    fetchAssessmentsMenu();
  }, []);

  // Fetch better parenting menu (flat, ordered)
  useEffect(() => {
    const fetchBetterParentingMenu = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/better-parenting?limit=50`);
        if (!response.ok) return;
        const data = await response.json();
        const pages = data?.data?.pages || data?.message?.pages;
        if (data.success && Array.isArray(pages)) {
          const items = pages
            .filter(p => p.status === 'published')
            .map(p => ({
              name: formatDisplayName(p.slug),
              url: `/better-parenting/${p.slug}`,
              order: p.menu_order || 0
            }))
            .sort((a, b) => a.order - b.order);
          setBetterParentingMenuItems(items);
        }
      } catch (_) {}
    };
    fetchBetterParentingMenu();
  }, []);

  // Close user name dropdown when clicking outside or on route change
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-menu-dropdown')) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    setIsUserMenuOpen(false);
  }, [pathname]);

  // Close submenu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideDropdown = event.target.closest('.counselling-dropdown') || event.target.closest('.assessments-dropdown');

      // Close submenus
      if (clickedSubmenu && !isInsideDropdown) {
        setClickedSubmenu(null);
      }
      
      // Close main dropdowns - exclude navigation buttons
      if (!event.target.closest('.header-dropdown') && 
          !event.target.closest('.counselling-dropdown') && 
          !event.target.closest('.assessments-dropdown') &&
          !event.target.closest('nav')) {
        setIsFindCareOpen(false);
        setIsForProvidersOpen(false);
        setIsAboutOpen(false);
        setIsResourcesOpen(false);
        setIsAssessmentsOpen(false);
        setIsBetterParentingOpen(false);
      }
    };

    const handleTouchOutside = (event) => {
      const isInsideDropdown = event.target.closest('.counselling-dropdown') || event.target.closest('.assessments-dropdown');

      // Close submenus
      if (clickedSubmenu && !isInsideDropdown) {
        setClickedSubmenu(null);
      }
      
      // Close main dropdowns - exclude navigation buttons
      if (!event.target.closest('.header-dropdown') && 
          !event.target.closest('.counselling-dropdown') && 
          !event.target.closest('.assessments-dropdown') &&
          !event.target.closest('nav')) {
        setIsFindCareOpen(false);
        setIsForProvidersOpen(false);
        setIsAboutOpen(false);
        setIsResourcesOpen(false);
        setIsAssessmentsOpen(false);
        setIsBetterParentingOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleTouchOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleTouchOutside);
    };
  }, [clickedSubmenu, isFindCareOpen, isForProvidersOpen, isAboutOpen, isResourcesOpen, isAssessmentsOpen, isBetterParentingOpen]);

  const handleBlogClick = () => {
    router.push('/blog');
  };

  const handleHomeClick = () => {
    router.push('/');
  };

  const handleTherapyTypeClick = (therapyType) => {
    // Therapy type pages have been removed
    // Redirect to guide page instead
    router.push('/online-child-psychologist');
    setIsFindCareOpen(false);
  };

  const handleFAQClick = () => {
    router.push('/faq');
    setIsFindCareOpen(false);
  };

  const handleGetStartedClick = () => {
    router.push('/');
    setIsFindCareOpen(false);
  };

  const handleAboutClick = () => {
    router.push('/about');
  };

  const handleCompanyClick = () => {
    router.push('/about');
    setIsAboutOpen(false);
  };

  const handleCareerClick = () => {
    router.push('/career');
    setIsAboutOpen(false);
  };

  const handleLoginClick = () => {
    setShowAuthModal(true);
  };

  const handleLogout = () => {
    logout();
    // If on therapist profile page, stay there; otherwise redirect to home
    if (!pathname?.includes('/therapist-profile')) {
      router.push('/');
    }
    setIsUserMenuOpen(false);
  };

  const handleProfileClick = () => {
    if (user?.role === 'superadmin') {
      router.push('/superadmin'); // Redirect superadmin to superadmin dashboard
    } else if (user?.role === 'admin') {
      router.push('/admin');
    } else if (user?.role === 'psychologist') {
      router.push('/psychologist');
    } else if (user?.role === 'finance') {
      router.push('/finance'); // Redirect finance role to finance dashboard
    } else if (user?.role === 'event_organizer') {
      router.push('/event-organizer');
    } else {
      router.push('/profile');
    }
    setIsUserMenuOpen(false);
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'admin': 'Admin',
      'superadmin': 'Super Admin',
      'psychologist': 'Psychologist',
      'finance': 'Finance',
      'event_organizer': 'Event Organizer',
      'client': 'Client',
      'user': 'User'
    };
    return roleMap[role] || role;
  };

  const getUserDisplayName = () => {
    if (!user) return 'User';
    
    // Priority 1: Use name from profileData if available (most up-to-date)
    // Check if last_name exists and is not empty/default values
    const hasValidLastName = (lastName) => {
      return lastName && lastName.trim() && lastName.trim() !== 'Update' && lastName.trim() !== '';
    };
    
    // Priority 1: Use name from profileData (from API)
    if (profileData?.first_name) {
      if (hasValidLastName(profileData?.last_name)) {
      return `${profileData.first_name} ${profileData.last_name}`.trim();
      }
      return profileData.first_name.trim();
    }
    
    // Priority 2: Use name from user.profile (from AuthContext)
    if (user.profile?.first_name) {
      if (hasValidLastName(user.profile?.last_name)) {
      return `${user.profile.first_name} ${user.profile.last_name}`.trim();
      }
      return user.profile.first_name.trim();
    }
    
    // Priority 3: Use name directly from user object
    if (user.first_name) {
      if (hasValidLastName(user.last_name)) {
        return `${user.first_name} ${user.last_name}`.trim();
      }
      return user.first_name.trim();
    }
    
    // Priority 4: Use partial name (first_name only or last_name only)
    if (user.profile?.first_name) {
      return user.profile.first_name.trim();
    }
    if (user.first_name) {
      return user.first_name;
    }
    
    // For admins/superadmins, show email
    if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'event_organizer') {
      return user.email;
    }
    
    // Only fallback to email if absolutely no name is available anywhere
    return user.email || 'User';
  };

  const getUserInitial = () => {
    if (!user) return 'U';
    
    const displayName = getUserDisplayName();
    
    // For admins, use first letter of email
    if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'event_organizer') {
      return displayName.charAt(0).toUpperCase();
    }
    
    // For others, use first letter of name
    return displayName.charAt(0).toUpperCase();
  };

  const toggleMobileSubmenu = (submenuKey) => {
    setIsMobileSubmenuOpen(prev => ({
      ...prev,
      [submenuKey]: !prev[submenuKey]
    }));
  };

  return (
    <>
    <style dangerouslySetInnerHTML={{__html: `
      /* Override global h2 styles for header menu items with maximum specificity */
      header.w-full.bg-white.fixed h2.header-nav-item {
        font-size: 16px !important;
        line-height: 1.2 !important;
        letter-spacing: -0.40px !important;
        margin: 0 !important;
      }
      /* Desktop submenu headers */
      header .counselling-dropdown h2,
      header .assessments-dropdown h2,
      header .header-dropdown h2 {
        font-size: 16px !important;
        line-height: 1.2 !important;
        margin: 0 !important;
      }
      /* Desktop individual menu items (14px) - target by inline style content */
      header .counselling-dropdown h2[style*="fontSize: '14px'"],
      header .assessments-dropdown h2[style*="fontSize: '14px'"] {
        font-size: 14px !important;
        line-height: 1.2 !important;
        margin: 0 0 0.5rem 0 !important;
      }
      /* Mobile main menu items - increased from 15px to 18px */
      @media (max-width: 1279px) {
        header.w-full.bg-white.fixed h2.header-nav-item {
          font-size: 18px !important;
          line-height: 1.3 !important;
        }
      }
      /* Mobile submenu and individual items - specific overrides using class selectors */
      @media (max-width: 1279px) {
        /* Override CMS submenu category headers in mobile view using class */
        header .xl\\:hidden h2.mobile-submenu-header {
          font-size: 15px !important;
          line-height: 1.3 !important;
          margin: 0 !important;
          font-weight: 500 !important;
        }
        /* Override individual CMS menu items in mobile view using class */
        header .xl\\:hidden h2.mobile-menu-item {
          font-size: 14px !important;
          line-height: 1.3 !important;
          margin: 0 0 0.25rem 0 !important;
          font-weight: 400 !important;
        }
        /* Additional specific overrides for nested mobile menu items */
        header .xl\\:hidden .ml-4 h2.mobile-submenu-header,
        header .xl\\:hidden div[class*="px-4"] h2.mobile-submenu-header {
          font-size: 15px !important;
          line-height: 1.3 !important;
        }
        header .xl\\:hidden .ml-2 h2.mobile-menu-item,
        header .xl\\:hidden div[class*="ml-2"] h2.mobile-menu-item {
          font-size: 14px !important;
          line-height: 1.3 !important;
        }
        /* Override Better Parenting and other span-based menu items */
        header .xl\\:hidden span.mobile-menu-item-text {
          font-size: 14px !important;
          line-height: 1.3 !important;
        }
      }
    `}} />
    <header className="w-full bg-white fixed top-0 left-0 right-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-[50px]">
        <div className="flex h-16 items-center justify-between">
          {/* Left group: Brand + Nav */}
          <div className="flex items-center gap-5 lg:gap-8">
            <div className="flex items-center">
              <a 
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  handleHomeClick();
                }}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                aria-label="MyKoott - Go to homepage"
              >
                <img 
                  src="/logo.png"
                  alt="MyKoott"
                  width={120}
                  height={40}
                  className="object-contain"
                />
              </a>
            </div>

            <nav className="hidden xl:block">
              <ul className="flex items-center gap-6 text-base font-medium text-gray-800">
                <li className="relative group">
                  <button 
                    className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900"
                    onClick={() => {
                      if (isFindCareOpen) {
                        setIsFindCareOpen(false);
                      } else {
                        setIsFindCareOpen(true);
                        setIsForProvidersOpen(false);
                        setIsAboutOpen(false);
                        setIsResourcesOpen(false);
                        setIsBetterParentingOpen(false);
                        setIsAssessmentsOpen(false);
                      }
                    }}
                  >
                  <h2 className="header-nav-item inline-block" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>Counselling</h2>
                    <ChevronUpIcon className={`transition-transform ${isFindCareOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <span className="pointer-events-none absolute -bottom-3 left-0 h-0.5 w-0 bg-indigo-700 transition-all duration-150 group-hover:w-[calc(100%-1.25rem)]"></span>
                  
                  {/* Counselling Dropdown */}
                  {isFindCareOpen && (
                    <div className="counselling-dropdown header-dropdown absolute top-full left-1/2 transform -translate-x-1/2 w-96 bg-white rounded-lg shadow-lg border border-gray-100 pt-4 pb-2 z-50 mt-4">
                      {/* Counselling Services */}
                      <div className="px-6 pb-4">
                        <div className="space-y-3">
                          {/* Emotional & Mental Health */}
                          <div 
                            className="relative"
                            onMouseEnter={() => {
                              setActiveSubmenu('emotional');
                              setClickedSubmenu(null);
                            }}
                            onMouseLeave={(e) => {
                              const relatedTarget = e.relatedTarget;
                              if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                                setActiveSubmenu(null);
                              }
                            }}
                          >
                              <div 
                                className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 transition-all duration-200"
                                onClick={() => {
                                  setClickedSubmenu(clickedSubmenu === 'emotional' ? null : 'emotional');
                                  setActiveSubmenu(null);
                                }}
                              >
                                <h2 className="text-gray-900 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>Emotional & Mental Health</h2>
                              <svg className="w-4 h-4 text-gray-500 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                            {/* Hover/Click dropdown */}
                            {(activeSubmenu === 'emotional' || clickedSubmenu === 'emotional') && (
                              <div 
                                className="absolute left-full top-0 -ml-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50"
                                onMouseEnter={() => setActiveSubmenu('emotional')}
                                onMouseLeave={() => setActiveSubmenu(null)}
                              >
                              {counsellingMenuItems.emotional.map((service, index) => (
                                <div 
                                  key={index}
                                  className="py-2 cursor-pointer hover:bg-gray-50 px-4 transition-all duration-200"
                                  onClick={() => {
                                    router.push(service.url);
                                    setClickedSubmenu(null);
                                    setIsFindCareOpen(false);
                                  }}
                                >
                                  <h2 className="text-gray-700 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.2', margin: '0 0 0.5rem 0' }}>{service.name}</h2>
                                </div>
                              ))}
                              </div>
                            )}
                          </div>

                          {/* Child Development & Learning */}
                          <div 
                            className="relative"
                            onMouseEnter={() => {
                              setActiveSubmenu('development');
                              setClickedSubmenu(null);
                            }}
                            onMouseLeave={(e) => {
                              const relatedTarget = e.relatedTarget;
                              if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                                setActiveSubmenu(null);
                              }
                            }}
                          >
                              <div 
                                className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 transition-all duration-200"
                                onClick={() => {
                                  setClickedSubmenu(clickedSubmenu === 'development' ? null : 'development');
                                  setActiveSubmenu(null);
                                }}
                              >
                                <h2 className="text-gray-900 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>Child Development & Learning</h2>
                              <svg className="w-4 h-4 text-gray-500 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                            {/* Hover/Click dropdown */}
                            {(activeSubmenu === 'development' || clickedSubmenu === 'development') && (
                              <div 
                                className="absolute left-full top-0 -ml-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50"
                                onMouseEnter={() => setActiveSubmenu('development')}
                                onMouseLeave={() => setActiveSubmenu(null)}
                              >
                              {counsellingMenuItems.development.map((service, index) => (
                                <div 
                                  key={index}
                                  className="py-2 cursor-pointer hover:bg-gray-50 px-4 transition-all duration-200"
                                  onClick={() => {
                                    router.push(service.url);
                                    setClickedSubmenu(null);
                                    setIsFindCareOpen(false);
                                  }}
                                >
                                  <h2 className="text-gray-700 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.2', margin: '0 0 0.5rem 0' }}>{service.name}</h2>
                                </div>
                              ))}
                              </div>
                            )}
                          </div>

                          {/* Behaviour & Confidence Building */}
                          <div 
                            className="relative"
                            onMouseEnter={() => {
                              setActiveSubmenu('behaviour');
                              setClickedSubmenu(null);
                            }}
                            onMouseLeave={(e) => {
                              const relatedTarget = e.relatedTarget;
                              if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                                setActiveSubmenu(null);
                              }
                            }}
                          >
                              <div 
                                className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 transition-all duration-200"
                                onClick={() => {
                                  setClickedSubmenu(clickedSubmenu === 'behaviour' ? null : 'behaviour');
                                  setActiveSubmenu(null);
                                }}
                              >
                                <h2 className="text-gray-900 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>Behaviour & Confidence Building</h2>
                              <svg className="w-4 h-4 text-gray-500 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                            {/* Hover/Click dropdown */}
                            {(activeSubmenu === 'behaviour' || clickedSubmenu === 'behaviour') && (
                              <div 
                                className="absolute left-full top-0 -ml-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50"
                                onMouseEnter={() => setActiveSubmenu('behaviour')}
                                onMouseLeave={() => setActiveSubmenu(null)}
                              >
                              {counsellingMenuItems.behaviour.map((service, index) => (
                                <div 
                                  key={index}
                                  className="py-2 cursor-pointer hover:bg-gray-50 px-4 transition-all duration-200"
                                  onClick={() => {
                                    router.push(service.url);
                                    setClickedSubmenu(null);
                                    setIsFindCareOpen(false);
                                  }}
                                >
                                  <h2 className="text-gray-700 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.2', margin: '0 0 0.5rem 0' }}>{service.name}</h2>
                                </div>
                              ))}
                              </div>
                            )}
                          </div>

                          {/* Stress & Academic Support */}
                          <div 
                            className="relative"
                            onMouseEnter={() => {
                              setActiveSubmenu('stress');
                              setClickedSubmenu(null);
                            }}
                            onMouseLeave={(e) => {
                              const relatedTarget = e.relatedTarget;
                              if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                                setActiveSubmenu(null);
                              }
                            }}
                          >
                              <div 
                                className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 transition-all duration-200"
                                onClick={() => {
                                  setClickedSubmenu(clickedSubmenu === 'stress' ? null : 'stress');
                                  setActiveSubmenu(null);
                                }}
                              >
                                <h2 className="text-gray-900 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>Stress & Academic Support</h2>
                              <svg className="w-4 h-4 text-gray-500 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                            {/* Hover/Click dropdown */}
                            {(activeSubmenu === 'stress' || clickedSubmenu === 'stress') && (
                              <div 
                                className="absolute left-full top-0 -ml-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50"
                                onMouseEnter={() => setActiveSubmenu('stress')}
                                onMouseLeave={() => setActiveSubmenu(null)}
                              >
                              {counsellingMenuItems.stress.map((service, index) => (
                                <div 
                                  key={index}
                                  className="py-2 cursor-pointer hover:bg-gray-50 px-4 transition-all duration-200"
                                  onClick={() => {
                                    router.push(service.url);
                                    setClickedSubmenu(null);
                                    setIsFindCareOpen(false);
                                  }}
                                >
                                  <h2 className="text-gray-700 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.2', margin: '0 0 0.5rem 0' }}>{service.name}</h2>
                                </div>
                              ))}
                              </div>
                            )}
                          </div>

                          {/* Trauma & Healing */}
                          <div 
                            className="relative"
                            onMouseEnter={() => {
                              setActiveSubmenu('trauma');
                              setClickedSubmenu(null);
                            }}
                            onMouseLeave={(e) => {
                              const relatedTarget = e.relatedTarget;
                              if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                                setActiveSubmenu(null);
                              }
                            }}
                          >
                              <div 
                                className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 transition-all duration-200"
                                onClick={() => {
                                  setClickedSubmenu(clickedSubmenu === 'trauma' ? null : 'trauma');
                                  setActiveSubmenu(null);
                                }}
                              >
                                <h2 className="text-gray-900 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>Trauma & Healing</h2>
                              <svg className="w-4 h-4 text-gray-500 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                            {/* Hover/Click dropdown */}
                            {(activeSubmenu === 'trauma' || clickedSubmenu === 'trauma') && (
                              <div 
                                className="absolute left-full top-0 -ml-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50"
                                onMouseEnter={() => setActiveSubmenu('trauma')}
                                onMouseLeave={() => setActiveSubmenu(null)}
                              >
                              {counsellingMenuItems.trauma.map((service, index) => (
                                <div 
                                  key={index}
                                  className="py-2 cursor-pointer hover:bg-gray-50 px-4 transition-all duration-200"
                                  onClick={() => {
                                    router.push(service.url);
                                    setClickedSubmenu(null);
                                    setIsFindCareOpen(false);
                                  }}
                                >
                                  <h2 className="text-gray-700 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.2', margin: '0 0 0.5rem 0' }}>{service.name}</h2>
                                </div>
                              ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                          
                    </div>
                  )}
                </li>

                {/* Assessments Dropdown (desktop) - moved just after Counselling */}
                <li className="relative group">
                  <button 
                    className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900"
                    onClick={() => {
                      if (isAssessmentsOpen) {
                        setIsAssessmentsOpen(false);
                      } else {
                        setIsAssessmentsOpen(true);
                        setIsFindCareOpen(false);
                        setIsForProvidersOpen(false);
                        setIsAboutOpen(false);
                        setIsResourcesOpen(false);
                        setIsBetterParentingOpen(false);
                      }
                    }}
                  >
                    <h2 className="header-nav-item inline-block" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>Assessments</h2>
                    <ChevronUpIcon className={`transition-transform ${isAssessmentsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <span className="pointer-events-none absolute -bottom-3 left-0 h-0.5 w-0 bg-indigo-700 transition-all duration-150 group-hover:w-[calc(100%-1.25rem)]"></span>

                  {isAssessmentsOpen && (
                    <div className="header-dropdown assessments-dropdown absolute top-full left-1/2 transform -translate-x-1/2 w-96 bg-white rounded-lg shadow-lg border border-gray-100 py-4 z-50 mt-4">
                      <div className="px-6 pb-4 border-b border-gray-200">
                        <div className="space-y-3">
                          {/* ADHD */}
                          <div className="relative"
                            onMouseEnter={() => { setActiveSubmenu('assess-adhd'); setClickedSubmenu(null); }}
                            onMouseLeave={(e) => { const rt = e.relatedTarget; if (!rt || !e.currentTarget.contains(rt)) setActiveSubmenu(null); }}
                          >
                            <div className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 transition-all duration-200"
                              onClick={() => { setClickedSubmenu(clickedSubmenu === 'assess-adhd' ? null : 'assess-adhd'); setActiveSubmenu(null); }}>
                              <h2 className="text-gray-900 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>ADHD</h2>
                              <svg className="w-4 h-4 text-gray-500 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                            {(activeSubmenu === 'assess-adhd' || clickedSubmenu === 'assess-adhd') && (
                              <div className="absolute left-full top-0 -ml-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50"
                                onMouseEnter={() => setActiveSubmenu('assess-adhd')} onMouseLeave={() => setActiveSubmenu(null)}>
                                {assessmentsMenuItems.adhd.map((item, idx) => (
                                  <div key={idx} className="py-2 cursor-pointer hover:bg-gray-50 px-4 transition-all duration-200"
                                    onClick={() => { router.push(item.url); setClickedSubmenu(null); setIsAssessmentsOpen(false); }}>
                                    <h2 className="text-gray-700 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.2', margin: '0 0 0.5rem 0' }}>{item.name}</h2>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Emotional & Behavioral Screening */}
                          <div className="relative"
                            onMouseEnter={() => { setActiveSubmenu('assess-ebs'); setClickedSubmenu(null); }}
                            onMouseLeave={(e) => { const rt = e.relatedTarget; if (!rt || !e.currentTarget.contains(rt)) setActiveSubmenu(null); }}
                          >
                            <div className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 transition-all duration-200"
                              onClick={() => { setClickedSubmenu(clickedSubmenu === 'assess-ebs' ? null : 'assess-ebs'); setActiveSubmenu(null); }}>
                              <h2 className="text-gray-900 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>Emotional & Behavioral Screening</h2>
                              <svg className="w-4 h-4 text-gray-500 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                            {(activeSubmenu === 'assess-ebs' || clickedSubmenu === 'assess-ebs') && (
                              <div className="absolute left-full top-0 -ml-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50"
                                onMouseEnter={() => setActiveSubmenu('assess-ebs')} onMouseLeave={() => setActiveSubmenu(null)}>
                                {assessmentsMenuItems.ebs.map((item, idx) => (
                                  <div key={idx} className="py-2 cursor-pointer hover:bg-gray-50 px-4 transition-all duration-200"
                                    onClick={() => { router.push(item.url); setClickedSubmenu(null); setIsAssessmentsOpen(false); }}>
                                    <h2 className="text-gray-700 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.2', margin: '0 0 0.5rem 0' }}>{item.name}</h2>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Intelligence Test */}
                          <div className="relative"
                            onMouseEnter={() => { setActiveSubmenu('assess-intelligence'); setClickedSubmenu(null); }}
                            onMouseLeave={(e) => { const rt = e.relatedTarget; if (!rt || !e.currentTarget.contains(rt)) setActiveSubmenu(null); }}
                          >
                            <div className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 transition-all duration-200"
                              onClick={() => { setClickedSubmenu(clickedSubmenu === 'assess-intelligence' ? null : 'assess-intelligence'); setActiveSubmenu(null); }}>
                              <h2 className="text-gray-900 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>Intelligence Test</h2>
                              <svg className="w-4 h-4 text-gray-500 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                            {(activeSubmenu === 'assess-intelligence' || clickedSubmenu === 'assess-intelligence') && (
                              <div className="absolute left-full top-0 -ml-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50"
                                onMouseEnter={() => setActiveSubmenu('assess-intelligence')} onMouseLeave={() => setActiveSubmenu(null)}>
                                {assessmentsMenuItems.intelligence.map((item, idx) => (
                                  <div key={idx} className="py-2 cursor-pointer hover:bg-gray-50 px-4 transition-all duration-200"
                                    onClick={() => { router.push(item.url); setClickedSubmenu(null); setIsAssessmentsOpen(false); }}>
                                    <h2 className="text-gray-700 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.2', margin: '0 0 0.5rem 0' }}>{item.name}</h2>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Projective Tests */}
                          <div className="relative"
                            onMouseEnter={() => { setActiveSubmenu('assess-projective'); setClickedSubmenu(null); }}
                            onMouseLeave={(e) => { const rt = e.relatedTarget; if (!rt || !e.currentTarget.contains(rt)) setActiveSubmenu(null); }}
                          >
                            <div className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 transition-all duration-200"
                              onClick={() => { setClickedSubmenu(clickedSubmenu === 'assess-projective' ? null : 'assess-projective'); setActiveSubmenu(null); }}>
                              <h2 className="text-gray-900 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>Projective Tests</h2>
                              <svg className="w-4 h-4 text-gray-500 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                            {(activeSubmenu === 'assess-projective' || clickedSubmenu === 'assess-projective') && (
                              <div className="absolute left-full top-0 -ml-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50"
                                onMouseEnter={() => setActiveSubmenu('assess-projective')} onMouseLeave={() => setActiveSubmenu(null)}>
                                {assessmentsMenuItems.projective.map((item, idx) => (
                                  <div key={idx} className="py-2 cursor-pointer hover:bg-gray-50 px-4 transition-all duration-200"
                                    onClick={() => { router.push(item.url); setClickedSubmenu(null); setIsAssessmentsOpen(false); }}>
                                    <h2 className="text-gray-700 hover:translate-x-1 transition-all duration-200" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.2', margin: '0 0 0.5rem 0' }}>{item.name}</h2>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="px-6 pt-4">
                        <button
                          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                          onClick={() => {
                            router.push('/free-assessment');
                            setIsAssessmentsOpen(false);
                          }}
                        >
                          <span>Free 20 Min Assessment</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </li>
                
                {/* Better Parenting */}
                <li className="relative group">
                  <button 
                    className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900"
                    onClick={() => {
                      if (isBetterParentingOpen) {
                        setIsBetterParentingOpen(false);
                      } else {
                        setIsBetterParentingOpen(true);
                        setIsFindCareOpen(false);
                        setIsForProvidersOpen(false);
                        setIsAboutOpen(false);
                        setIsResourcesOpen(false);
                        setIsAssessmentsOpen(false);
                      }
                    }}
                  >
                    <h2 className="header-nav-item inline-block" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>Better Parenting</h2>
                    <ChevronUpIcon className={`transition-transform ${isBetterParentingOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <span className="pointer-events-none absolute -bottom-3 left-0 h-0.5 w-0 bg-indigo-700 transition-all duration-150 group-hover:w-[calc(100%-1.25rem)]"></span>

                  {isBetterParentingOpen && (
                    <div className="header-dropdown absolute top-full left-0 mt-4 w-96 bg-white rounded-lg shadow-lg border border-gray-100 py-4 z-50">
                      <div className="px-4 space-y-2">
                        {betterParentingMenuItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 flex items-center gap-3 transition-all duration-200"
                            onClick={() => {
                              router.push(item.url);
                              setIsBetterParentingOpen(false);
                            }}
                          >
                            <span className="text-gray-700 text-sm hover:translate-x-1 transition-all duration-200">
                              {item.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
                <li className="relative group">
                  <button 
                    className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900"
                    onClick={() => {
                      if (isAboutOpen) {
                        setIsAboutOpen(false);
                      } else {
                        setIsAboutOpen(true);
                        setIsFindCareOpen(false);
                        setIsForProvidersOpen(false);
                        setIsBetterParentingOpen(false);
                        setIsResourcesOpen(false);
                        setIsAssessmentsOpen(false);
                        setIsBetterParentingOpen(false);
                        setIsAssessmentsOpen(false);
                      }
                    }}
                  >
                    <h2 className="header-nav-item inline-block" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>About Us</h2>
                    <ChevronUpIcon className={`transition-transform ${isAboutOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <span className="pointer-events-none absolute -bottom-3 left-0 h-0.5 w-0 bg-indigo-700 transition-all duration-150 group-hover:w-[calc(100%-1.25rem)]"></span>
                  
                                     {/* About Us Dropdown */}
                   {isAboutOpen && (
                     <div className="header-dropdown absolute top-full left-0 mt-4 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-4 z-50">
                       <div className="px-4 space-y-2">
                         <div 
                           className="py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 flex items-center gap-3"
                           onClick={handleCompanyClick}
                         >
                          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="text-gray-700 text-base font-medium">Company</span>
                         </div>
                         <div 
                           className="py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 flex items-center gap-3"
                           onClick={handleCareerClick}
                         >
                          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                          </svg>
                          <span className="text-gray-700 text-base font-medium">Career</span>
                         </div>
                       </div>
                     </div>
                   )}
                </li>
                <li className="relative group">
                  <button 
                    className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900"
                    onClick={() => {
                      if (isResourcesOpen) {
                        setIsResourcesOpen(false);
                      } else {
                        setIsResourcesOpen(true);
                        setIsFindCareOpen(false);
                        setIsForProvidersOpen(false);
                        setIsAboutOpen(false);
                        setIsBetterParentingOpen(false);
                        setIsAssessmentsOpen(false);
                      }
                    }}
                  >
                  <h2 className="header-nav-item inline-block" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>Resources</h2>
                    <ChevronUpIcon className={`transition-transform ${isResourcesOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <span className="pointer-events-none absolute -bottom-3 left-0 h-0.5 w-0 bg-indigo-700 transition-all duration-150 group-hover:w-[calc(100%-1.25rem)]"></span>
                  
                  {/* Resources Dropdown */}
                  {isResourcesOpen && (
                    <div className="header-dropdown absolute top-full left-0 mt-4 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-4 z-50">
                      <div className="px-4 space-y-2">
                        <div 
                          className="py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 flex items-center gap-3"
                          onClick={() => {
                            router.push('/blog');
                            setIsResourcesOpen(false);
                          }}
                        >
                          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                          </svg>
                          <span className="text-gray-700 text-base font-medium">Blog</span>
                        </div>
                        <div 
                          className="py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 flex items-center gap-3"
                          onClick={() => {
                            router.push('/faq');
                            setIsResourcesOpen(false);
                          }}
                        >
                          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-gray-700 text-base font-medium">FAQ</span>
                        </div>
                        <div 
                          className="py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2 flex items-center gap-3"
                          onClick={() => {
                            router.push('/events');
                            setIsResourcesOpen(false);
                          }}
                        >
                          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-gray-700 text-base font-medium">Events</span>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
                <li className="relative group">
                  <button 
                    className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900"
                    onClick={() => {
                      router.push('/online-child-psychologist');
                    }}
                  >
                    <h2 className="header-nav-item inline-block" style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.2', margin: 0 }}>View Therapists</h2>
                  </button>
                  <span className="pointer-events-none absolute -bottom-3 left-0 h-0.5 w-0 bg-indigo-700 transition-all duration-150 group-hover:w-[calc(100%-1.25rem)]"></span>
                </li>

              </ul>
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Desktop Actions */}
            <div className="hidden xl:flex items-center gap-4">
            {isAuthenticated() ? (
              /* Logged in user menu */
              <div className="relative user-menu-dropdown">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 text-base font-medium text-gray-800 hover:text-gray-900 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <img 
                      src="/logo.png"
                      alt={getUserDisplayName()}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <span className="text-indigo-700 font-semibold text-xs" style={{ display: 'none' }}>
                      {getUserInitial()}
                    </span>
                  </div>
                  <span>{getUserDisplayName()}</span>
                  <ChevronUpIcon className={`transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* User dropdown menu */}
                {isUserMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-4 z-50">
                    <div className="px-4 pb-3">
                      {!hasRole('client') ? (
                        <>
                      <div className="text-sm font-medium text-gray-900">{getUserDisplayName()}</div>
                      <div className="text-xs text-gray-500">{user?.email}</div>
                      <div className="text-xs text-indigo-600 font-medium mt-1">
                        {getRoleDisplayName(user?.role)}
                      </div>
                        </>
                      ) : (
                        <div className="text-xs text-gray-500">{user?.email}</div>
                      )}
                    </div>
                    <div className="px-4 pt-3 space-y-2">
                      <button
                        onClick={handleProfileClick}
                        className="w-full text-left py-2 px-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md cursor-pointer"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left py-2 px-2 text-sm text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Login button for non-authenticated users */
              <button 
                onClick={handleLoginClick}
                className="inline-flex items-center gap-1 text-base font-medium text-gray-800 hover:text-gray-900 cursor-pointer group relative mr-2"
              >
                <span className="relative">
                  Login
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gray-800 transition-all duration-300 ease-out group-hover:w-full"></span>
                </span>
              </button>
            )}
            <button 
              onClick={() => router.push('/online-child-psychologist')} 
              className="inline-flex items-center rounded-full px-3 md:px-4 xl:px-6 py-2 text-sm md:text-base font-semibold text-white shadow-sm transition-colors duration-200"
              style={{ backgroundColor: '#025545' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#012f23'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#025545'}
            >
              Book Now
            </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {!isMobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Sidebar */}
        <div 
          className={`xl:hidden fixed inset-0 z-50 flex flex-col transition-all duration-500 ease-in-out ${
            isMobileMenuOpen 
              ? 'opacity-100 visible' 
              : 'opacity-0 invisible pointer-events-none'
          }`}
        >
          {/* Backdrop Overlay */}
          <div 
            className={`fixed inset-0 bg-white/30 backdrop-blur-[1px] transition-opacity duration-500 ease-in-out ${
              isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ willChange: 'opacity' }}
          />
          
          {/* Sidebar Panel */}
          <div 
            className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl flex flex-col transform will-change-transform ${
              isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ 
              transform: isMobileMenuOpen ? 'translate3d(0, 0, 0)' : 'translate3d(100%, 0, 0)',
              transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
              contain: 'layout style paint',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            {/* Header with Logo and Close Button */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center">
                <a 
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    handleHomeClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  aria-label="MyKoott - Go to homepage"
                >
                  <img 
                    src="/logo.png"
                    alt="MyKoott"
                    width={120}
                    height={40}
                    className="object-contain"
                  />
                </a>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile Menu Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* User Profile Section - Moved to Top */}
              {isAuthenticated() && (
                <div className="border-b border-gray-200 pb-6 mb-6">
                  <div className="flex flex-col items-center text-center py-2">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center mb-3 flex-shrink-0">
                      <img 
                        src="/logo.png"
                        alt={getUserDisplayName()}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <span className="text-indigo-700 font-semibold text-base" style={{ display: 'none' }}>
                        {getUserInitial()}
                      </span>
                    </div>
                    {hasRole('client') ? (
                      <div className="text-sm text-gray-500">{user?.email}</div>
                    ) : (
                    <div>
                      <div className="text-base font-medium text-gray-900">{getUserDisplayName()}</div>
                      {/* Only show email if it's different from display name */}
                      {getUserDisplayName() !== user?.email && (
                        <div className="text-sm text-gray-500 mt-1">{user?.email}</div>
                      )}
                      <div className="text-sm text-indigo-600 font-medium mt-1">
                        {getRoleDisplayName(user?.role)}
                      </div>
                    </div>
                    )}
                  </div>
                  
                  {/* Dashboard Button */}
                  <button
                    onClick={() => {
                      handleProfileClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-3 px-4 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 mt-4 text-center"
                  >
                    Dashboard
                  </button>
                </div>
              )}

              {/* Login/Get Started Section for Non-Authenticated Users */}
              {!isAuthenticated() && (
                <div className="border-b border-gray-200 pb-6 mb-6 space-y-3">
                  {/* Login Button */}
                  <button
                    onClick={() => {
                      handleLoginClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-3 px-4 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200"
                  >
                    Login
                  </button>
                  
                  {/* Book Now Button */}
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      router.push('/online-child-psychologist');
                    }}
                    className="w-full py-3 px-4 text-base font-semibold text-white rounded-lg transition-colors duration-200"
                    style={{ backgroundColor: '#025545' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#012f23'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#025545'}
                  >
                    Book Now
                  </button>
                </div>
              )}

              {/* Navigation Links */}
              <div className="space-y-2">
                {/* Counselling Dropdown */}
                <div className="border-b border-gray-100">
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-md px-2 py-2"
                    onClick={() => {
                      if (isMobileFindCareOpen) {
                        setIsMobileFindCareOpen(false);
                      } else {
                        setIsMobileFindCareOpen(true);
                        setIsMobileForProvidersOpen(false);
                        setIsMobileAboutOpen(false);
                        setIsMobileResourcesOpen(false);
                        setIsMobileBetterParentingOpen(false);
                      }
                    }}
                  >
                    <h2 className="text-gray-900 header-nav-item" style={{ fontSize: '18px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>Counselling</h2>
                    <svg className={`w-4 h-4 text-gray-600 transition-transform ${isMobileFindCareOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  
                  {/* Counselling Dropdown Content */}
                  {isMobileFindCareOpen && (
                    <div className="ml-4 space-y-1 py-2">
                      <div className="px-4 py-1 space-y-1">
                        {/* Emotional & Mental Health */}
                        <div>
                          <div 
                            className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                            onClick={() => toggleMobileSubmenu('emotional')}
                          >
                            <h2 className="text-gray-900 mobile-submenu-header" style={{ fontSize: '15px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>Emotional & Mental Health</h2>
                            <svg className={`w-4 h-4 text-gray-500 transition-transform ${isMobileSubmenuOpen.emotional ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {isMobileSubmenuOpen.emotional && (
                            <div className="ml-2 space-y-1">
                              {counsellingMenuItems.emotional.map((service, index) => (
                                <div 
                                  key={index}
                                  className="py-0.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                                  onClick={() => {
                                    router.push(service.url);
                                    setIsMobileMenuOpen(false);
                                  }}
                                >
                                  <h2 className="text-gray-700 mobile-menu-item" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.3', margin: '0 0 0.25rem 0' }}>{service.name}</h2>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Child Development & Learning */}
                        <div>
                          <div 
                            className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                            onClick={() => toggleMobileSubmenu('development')}
                          >
                            <h2 className="text-gray-900 mobile-submenu-header" style={{ fontSize: '15px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>Child Development & Learning</h2>
                            <svg className={`w-4 h-4 text-gray-500 transition-transform ${isMobileSubmenuOpen.development ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {isMobileSubmenuOpen.development && (
                            <div className="ml-2 space-y-1">
                              {counsellingMenuItems.development.map((service, index) => (
                                <div 
                                  key={index}
                                  className="py-0.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                                  onClick={() => {
                                    router.push(service.url);
                                    setIsMobileMenuOpen(false);
                                  }}
                                >
                                  <h2 className="text-gray-700 mobile-menu-item" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.3', margin: '0 0 0.25rem 0' }}>{service.name}</h2>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Behaviour & Confidence Building */}
                        <div>
                          <div 
                            className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                            onClick={() => toggleMobileSubmenu('behaviour')}
                          >
                            <h2 className="text-gray-900 mobile-submenu-header" style={{ fontSize: '15px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>Behaviour & Confidence Building</h2>
                            <svg className={`w-4 h-4 text-gray-500 transition-transform ${isMobileSubmenuOpen.behaviour ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {isMobileSubmenuOpen.behaviour && (
                            <div className="ml-2 space-y-1">
                              {counsellingMenuItems.behaviour.map((service, index) => (
                                <div 
                                  key={index}
                                  className="py-0.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                                  onClick={() => {
                                    router.push(service.url);
                                    setIsMobileMenuOpen(false);
                                  }}
                                >
                                  <h2 className="text-gray-700 mobile-menu-item" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.3', margin: '0 0 0.25rem 0' }}>{service.name}</h2>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Stress & Academic Support */}
                        <div>
                          <div 
                            className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                            onClick={() => toggleMobileSubmenu('stress')}
                          >
                            <h2 className="text-gray-900 mobile-submenu-header" style={{ fontSize: '15px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>Stress & Academic Support</h2>
                            <svg className={`w-4 h-4 text-gray-500 transition-transform ${isMobileSubmenuOpen.stress ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {isMobileSubmenuOpen.stress && (
                            <div className="ml-2 space-y-1">
                              {counsellingMenuItems.stress.map((service, index) => (
                                <div 
                                  key={index}
                                  className="py-0.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                                  onClick={() => {
                                    router.push(service.url);
                                    setIsMobileMenuOpen(false);
                                  }}
                                >
                                  <h2 className="text-gray-700 mobile-menu-item" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.3', margin: '0 0 0.25rem 0' }}>{service.name}</h2>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Trauma & Healing */}
                        <div>
                          <div 
                            className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                            onClick={() => toggleMobileSubmenu('trauma')}
                          >
                            <h2 className="text-gray-900 mobile-submenu-header" style={{ fontSize: '15px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>Trauma & Healing</h2>
                            <svg className={`w-4 h-4 text-gray-500 transition-transform ${isMobileSubmenuOpen.trauma ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {isMobileSubmenuOpen.trauma && (
                            <div className="ml-2 space-y-1">
                              {counsellingMenuItems.trauma.map((service, index) => (
                                <div 
                                  key={index}
                                  className="py-0.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                                  onClick={() => {
                                    router.push(service.url);
                                    setIsMobileMenuOpen(false);
                                  }}
                                >
                                  <h2 className="text-gray-700 mobile-menu-item" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.3', margin: '0 0 0.25rem 0' }}>{service.name}</h2>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Better Parenting (mobile) removed */}

                {/* Assessments (mobile) */}
                <div className="border-b border-gray-100">
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-md px-2 py-2"
                    onClick={() => {
                      if (isMobileAssessmentsOpen) {
                        setIsMobileAssessmentsOpen(false);
                      } else {
                        setIsMobileAssessmentsOpen(true);
                        setIsMobileFindCareOpen(false);
                        setIsMobileForProvidersOpen(false);
                        setIsMobileAboutOpen(false);
                        setIsMobileResourcesOpen(false);
                        setIsMobileBetterParentingOpen(false);
                      }
                    }}
                  >
                    <h2 className="text-gray-900 header-nav-item" style={{ fontSize: '18px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>Assessments</h2>
                    <svg className={`w-4 h-4 text-gray-600 transition-transform ${isMobileAssessmentsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {isMobileAssessmentsOpen && (
                    <div className="ml-4 space-y-1 py-2">
                      <div className="px-4 py-1">
                        <div className="space-y-1">
                          {/* ADHD */}
                          <div 
                            className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                            onClick={() => setIsMobileAssessmentsSubmenuOpen(prev => ({ ...prev, adhd: !prev.adhd }))}
                          >
                            <h2 className="text-gray-900 mobile-submenu-header" style={{ fontSize: '15px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>ADHD</h2>
                            <svg className={`w-4 h-4 text-gray-500 transition-transform ${isMobileAssessmentsSubmenuOpen.adhd ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {isMobileAssessmentsSubmenuOpen.adhd && (
                            <div className="ml-2 space-y-1">
                              {assessmentsMenuItems.adhd.map((item, idx) => (
                                <div key={idx} className="py-1 cursor-pointer hover:bg-gray-50 rounded-md px-2" onClick={() => { router.push(item.url); setIsMobileMenuOpen(false); }}>
                                  <h2 className="text-gray-700 mobile-menu-item" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.3', margin: '0 0 0.25rem 0' }}>{item.name}</h2>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Emotional & Behavioral Screening */}
                          <div 
                            className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                            onClick={() => setIsMobileAssessmentsSubmenuOpen(prev => ({ ...prev, ebs: !prev.ebs }))}
                          >
                            <h2 className="text-gray-900 mobile-submenu-header" style={{ fontSize: '15px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>Emotional & Behavioral Screening</h2>
                            <svg className={`w-4 h-4 text-gray-500 transition-transform ${isMobileAssessmentsSubmenuOpen.ebs ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {isMobileAssessmentsSubmenuOpen.ebs && (
                            <div className="ml-2 space-y-1">
                              {assessmentsMenuItems.ebs.map((item, idx) => (
                                <div key={idx} className="py-1 cursor-pointer hover:bg-gray-50 rounded-md px-2" onClick={() => { router.push(item.url); setIsMobileMenuOpen(false); }}>
                                  <h2 className="text-gray-700 mobile-menu-item" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.3', margin: '0 0 0.25rem 0' }}>{item.name}</h2>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Intelligence Test */}
                          <div 
                            className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                            onClick={() => setIsMobileAssessmentsSubmenuOpen(prev => ({ ...prev, intelligence: !prev.intelligence }))}
                          >
                            <h2 className="text-gray-900 mobile-submenu-header" style={{ fontSize: '15px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>Intelligence Test</h2>
                            <svg className={`w-4 h-4 text-gray-500 transition-transform ${isMobileAssessmentsSubmenuOpen.intelligence ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {isMobileAssessmentsSubmenuOpen.intelligence && (
                            <div className="ml-2 space-y-1">
                              {assessmentsMenuItems.intelligence.map((item, idx) => (
                                <div key={idx} className="py-1 cursor-pointer hover:bg-gray-50 rounded-md px-2" onClick={() => { router.push(item.url); setIsMobileMenuOpen(false); }}>
                                  <h2 className="text-gray-700 mobile-menu-item" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.3', margin: '0 0 0.25rem 0' }}>{item.name}</h2>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Projective Tests */}
                          <div 
                            className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                            onClick={() => setIsMobileAssessmentsSubmenuOpen(prev => ({ ...prev, projective: !prev.projective }))}
                          >
                            <h2 className="text-gray-900 mobile-submenu-header" style={{ fontSize: '15px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>Projective Tests</h2>
                            <svg className={`w-4 h-4 text-gray-500 transition-transform ${isMobileAssessmentsSubmenuOpen.projective ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {isMobileAssessmentsSubmenuOpen.projective && (
                            <div className="ml-2 space-y-1">
                              {assessmentsMenuItems.projective.map((item, idx) => (
                                <div key={idx} className="py-1 cursor-pointer hover:bg-gray-50 rounded-md px-2" onClick={() => { router.push(item.url); setIsMobileMenuOpen(false); }}>
                                  <h2 className="text-gray-700 mobile-menu-item" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.3', margin: '0 0 0.25rem 0' }}>{item.name}</h2>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="px-4 pt-4">
                        <button
                          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium text-gray-900 hover:bg-gray-50 transition-colors duration-200"
                          onClick={() => {
                            router.push('/free-assessment');
                            setIsMobileMenuOpen(false);
                            setIsMobileAssessmentsOpen(false);
                          }}
                        >
                          <span>Free 20 Min Assessment</span>
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Better Parenting (mobile) */}
                <div className="border-b border-gray-100">
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-md px-2 py-2"
                    onClick={() => {
                      if (isMobileBetterParentingOpen) {
                        setIsMobileBetterParentingOpen(false);
                      } else {
                        setIsMobileBetterParentingOpen(true);
                        setIsMobileFindCareOpen(false);
                        setIsMobileForProvidersOpen(false);
                        setIsMobileAboutOpen(false);
                        setIsMobileResourcesOpen(false);
                      }
                    }}
                  >
                    <h2 className="text-gray-900 header-nav-item" style={{ fontSize: '18px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>Better Parenting</h2>
                    <svg className={`w-4 h-4 text-gray-600 transition-transform ${isMobileBetterParentingOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {isMobileBetterParentingOpen && (
                    <div className="ml-4 space-y-1 py-2">
                      <div className="px-4 py-1 space-y-1">
                        {betterParentingMenuItems.map((item, idx) => (
                          <div key={idx} className="py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2 transition-all duration-200" onClick={() => { router.push(item.url); setIsMobileMenuOpen(false); }}>
                            <span className="text-gray-700 mobile-menu-item-text hover:translate-x-1 transition-all duration-200" style={{ fontSize: '14px' }}>{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* About Us Dropdown */}
                <div className="border-b border-gray-100">
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-md px-2 py-2"
                    onClick={() => {
                      if (isMobileAboutOpen) {
                        setIsMobileAboutOpen(false);
                      } else {
                        setIsMobileAboutOpen(true);
                        setIsMobileFindCareOpen(false);
                        setIsMobileForProvidersOpen(false);
                        setIsMobileBetterParentingOpen(false);
                        setIsMobileResourcesOpen(false);
                      }
                    }}
                  >
                    <h2 className="text-gray-900 header-nav-item" style={{ fontSize: '18px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>About Us</h2>
                    <svg className={`w-4 h-4 text-gray-600 transition-transform ${isMobileAboutOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  
                  {/* About Us Dropdown Content */}
                  {isMobileAboutOpen && (
                    <div className="ml-4 space-y-1 py-2">
                      <div className="px-4 py-1">
                        <div className="space-y-1">
                          <div 
                            className="py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                            onClick={() => {
                              handleCompanyClick();
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <span className="text-gray-700" style={{ fontSize: '14px' }}>Company</span>
                          </div>
                          <div 
                            className="py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                            onClick={() => {
                              handleCareerClick();
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <span className="text-gray-700" style={{ fontSize: '14px' }}>Career</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resources Dropdown */}
                <div className="border-b border-gray-100">
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-md px-2 py-2"
                    onClick={() => {
                      if (isMobileResourcesOpen) {
                        setIsMobileResourcesOpen(false);
                      } else {
                        setIsMobileResourcesOpen(true);
                        setIsMobileFindCareOpen(false);
                        setIsMobileForProvidersOpen(false);
                        setIsMobileAboutOpen(false);
                        setIsMobileBetterParentingOpen(false);
                      }
                    }}
                  >
                    <h2 className="text-gray-900 header-nav-item" style={{ fontSize: '18px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>Resources</h2>
                    <svg className={`w-4 h-4 text-gray-600 transition-transform ${isMobileResourcesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  
                  {/* Resources Dropdown Content */}
                  {isMobileResourcesOpen && (
                    <div className="ml-4 space-y-1 py-2">
                      <div className="px-4 py-1">
                        <div className="space-y-1">
                          <div 
                            className="py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                            onClick={() => {
                              router.push('/blog');
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <span className="text-gray-700" style={{ fontSize: '14px' }}>Blog</span>
                          </div>
                          <div 
                            className="py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                            onClick={() => {
                              router.push('/faq');
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <span className="text-gray-700" style={{ fontSize: '14px' }}>FAQ</span>
                          </div>
                          <div 
                            className="py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                            onClick={() => {
                              router.push('/events');
                              setIsMobileMenuOpen(false);
                              setIsMobileResourcesOpen(false);
                            }}
                          >
                            <span className="text-gray-700" style={{ fontSize: '14px' }}>Events</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* View Therapists */}
                <div className="border-b border-gray-100">
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-md px-2 py-2"
                    onClick={() => {
                      router.push('/online-child-psychologist');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <h2 className="text-gray-900 header-nav-item" style={{ fontSize: '18px', fontWeight: 500, lineHeight: '1.3', margin: 0 }}>View Therapists</h2>
                  </div>
                </div>
              </div>
              
              {/* Logout Button at Bottom for Authenticated Users */}
              {isAuthenticated() && (
                <div className="border-t border-gray-200 pt-4 mt-6">
                  <button
                    onClick={() => {
                      handleLogout();
                    }}
                    className="w-full py-3 px-4 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
    {showGuide && (
      <GuideModal open={showGuide} onClose={() => setShowGuide(false)} />
    )}
    {showAuthModal && (
      <AuthModal
        open={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          // Clear any auth error when modal is closed
          localStorage.removeItem("auth_error");
        }}
        onRequireContactInfo={() => setShowQuickContact(true)}
      />
    )}
    <QuickContactModal
      open={showQuickContact}
      onClose={() => setShowQuickContact(false)}
      onSaved={() => setShowQuickContact(false)}
    />
    </>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-5 w-5 text-gray-600"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.192l3.71-2.96a.75.75 0 0 1 .94 1.17l-4.24 3.38a.75.75 0 0 1-.94 0l-4.24-3.38a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronUpIcon({ className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={`h-5 w-5 text-gray-600 ${className}`}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.192l3.71-2.96a.75.75 0 0 1 .94 1.17l-4.24 3.38a.75.75 0 0 1-.94 0l-4.24-3.38a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}



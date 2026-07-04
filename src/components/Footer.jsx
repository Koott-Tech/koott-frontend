"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import BlogNewsletterFooterCta from "./BlogNewsletterFooterCta";

export default function Footer({ isHomePage = false, isCmsPage = false, isTherapistProfile = false }) {
    const [openSections, setOpenSections] = useState({});
    const [counsellingMenu, setCounsellingMenu] = useState({
        emotional: [],
        development: [],
        behaviour: [],
        stress: [],
        trauma: []
    });
    const [assessmentsMenu, setAssessmentsMenu] = useState({
        adhd: [],
        ebs: [],
        intelligence: [],
        projective: []
    });
    const [betterParentingMenu, setBetterParentingMenu] = useState([]);
    const pathname = usePathname();
    const router = useRouter();
    const isEventsPage = pathname === '/events' || pathname.startsWith('/events/');
    const isBlogPage = pathname === '/blog' || pathname.startsWith('/blog/');

    const formatDisplayName = (slug) => {
        if (!slug) return '';
        return slug
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const toggleSection = (section) => {
        setOpenSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Fetch counselling menu from API (same source as header)
    useEffect(() => {
        async function fetchCounselling() {
            try {
                const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
                const res = await fetch(`${base}/api/counselling?limit=50`, { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json();
                const services = Array.isArray(data)
                    ? data
                    : (
                        data?.data?.services
                        || data?.message?.services
                        || data?.services
                        || data?.data
                        || []
                    );
                const grouped = { emotional: [], development: [], behaviour: [], stress: [], trauma: [] };
                (services || [])
                    .filter(item => item?.status === 'published' && item?.category && item?.slug)
                    .filter(item => {
                        // Filter out any service with slug that matches category names or invalid patterns
                        // This prevents 404 errors when Razorpay or other crawlers try to access pages like
                        // /counselling/emotional-and-mental-health which don't exist (these are category headers, not actual pages)
                        const invalidSlugs = ['emotional-and-mental-health', 'emotional-mental-health', 'emotional', 'mental-health'];
                        return !invalidSlugs.includes(item.slug.toLowerCase());
                    })
                    .forEach(item => {
                        const category = item.category.toLowerCase();
                        if (!grouped[category]) return;
                        grouped[category].push({
                            title: formatDisplayName(item.slug), // Use formatted slug name like header
                            url: `/counselling/${item.slug}`,
                            order: item?.menu_order || 0
                        });
                    });
                Object.keys(grouped).forEach(k => grouped[k].sort((a, b) => a.order - b.order));
                setCounsellingMenu(grouped);
            } catch (_) {
                // swallow
            }
        }
        fetchCounselling();
    }, []);

    // Fetch assessments menu from API (same source/format as header)
    useEffect(() => {
        async function fetchAssessments() {
            try {
                const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
                const res = await fetch(`${base}/api/assessments?limit=50`, { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json();
                const list = data?.data?.assessments
                    || data?.message?.assessments
                    || data?.assessments
                    || data?.data
                    || [];
                const grouped = { adhd: [], ebs: [], intelligence: [], projective: [] };
                (list || [])
                    .filter(item => item?.status === 'published' && item?.category && item?.slug)
                    .forEach(item => {
                        const cat = item.category.toLowerCase();
                        if (!grouped[cat]) return;
                        grouped[cat].push({
                            title: formatDisplayName(item.slug), // Use formatted slug name like header
                            url: `/assessments/${item.slug}`,
                            order: item?.menu_order || 0
                        });
                    });
                Object.keys(grouped).forEach(k => grouped[k].sort((a, b) => a.order - b.order));
                setAssessmentsMenu(grouped);
            } catch (_) {
                // swallow
            }
        }
        fetchAssessments();
    }, []);

    // Fetch better parenting pages (flat list, ordered) - same logic as Header
    useEffect(() => {
        async function fetchBetterParenting() {
            try {
                const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
                const res = await fetch(`${base}/api/better-parenting?limit=50`, { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json();
                const pages = data?.data?.pages || data?.message?.pages;
                if (data.success && Array.isArray(pages)) {
                    const items = pages
                        .filter(p => p.status === 'published')
                        .map(p => ({
                            title: formatDisplayName(p.slug), // Already using formatted slug name like header
                            url: `/better-parenting/${p.slug}`,
                            order: p.menu_order || 0
                        }))
                        .sort((a, b) => a.order - b.order);
                    setBetterParentingMenu(items);
                }
            } catch (_) {
                // swallow
            }
        }
        fetchBetterParenting();
    }, []);
    return (
        <footer className={`w-full ${isTherapistProfile ? 'mt-0' : 'mt-14'}`} style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <style jsx>{`
                /* Override h2 main menu items (footer) - h5 text-white */
                /* Ensure these override global h2 styles from globals.css */
                h2.footer-main-menu-item,
                .footer-main-menu-item {
                    font-size: 22px !important;
                    font-weight: 400 !important;
                    line-height: 1.2 !important;
                    letter-spacing: normal !important;
                    margin: 0 0 1.5rem 0 !important; /* Add bottom margin to increase space below heading */
                    font-family: 'Work Sans', Arial, Helvetica, sans-serif !important;
                }
                /* Override h2 submenu items (footer) - text-base font-normal */
                h2.footer-submenu-item,
                .footer-submenu-item {
                    font-size: 16px !important;
                    font-weight: 400 !important;
                    line-height: 1.2 !important;
                    letter-spacing: normal !important;
                    margin: 0 !important;
                    font-family: 'Work Sans', Arial, Helvetica, sans-serif !important;
                }
                /* Override h2 individual menu items (footer) - text-sm */
                h2.footer-individual-menu-item,
                .footer-individual-menu-item {
                    font-size: 14px !important;
                    font-weight: 400 !important;
                    line-height: 1.2 !important;
                    letter-spacing: normal !important;
                    margin: 0 0 0.75rem 0 !important; /* Increased bottom margin for more spacing between items */
                    font-family: 'Work Sans', Arial, Helvetica, sans-serif !important;
                }
                .footer-individual-menu-item:last-child {
                    margin-bottom: 0 !important; /* Remove margin from last item */
                }
                @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
                    .footer-heading {
                        font-size: 32px;
                        line-height: 1.1;
                        font-weight: 600;
                    }
                    .footer-description {
                        line-height: 1.2;
                    }
                }
                @media (max-width: 767px) {
                    h4.footer-heading {
                        font-size: 24px;
                        line-height: 1.1 !important;
                        font-weight: 600;
                        text-align: center;
                        padding-left: 0;
                        padding-right: 0;
                    }
                    .footer-description {
                        font-size: 13px !important;
                        line-height: 1.1;
                    }
                    .footer-main-menu-item {
                        margin-bottom: 0.25rem !important;
                    }
                    .footer-submenu-item {
                        font-size: 17px !important;
                    }
                    .footer-individual-menu-item {
                        font-size: 16px !important;
                        margin-bottom: 0.375rem !important;
                    }
                }
                .copyright-symbol {
                    color: #025545 !important;
                }
                p .copyright-symbol {
                    color: #025545 !important;
                }
                .p2 .copyright-symbol {
                    color: #025545 !important;
                }
            `}</style>
            {/* New section above footer */}
            {isHomePage ? (
                // Home page footer wrapper design (match CMS heading/paragraph styles)
                <div className="w-full py-12 md:py-16 px-8 md:px-16 lg:px-24" style={{ 
                    background: 'linear-gradient(to bottom, #f2fff1, #e0d8ff)'
                }}>
                    <div className="text-center max-w-full mx-auto px-4">
                        <h4 className="footer-heading mb-2 font-semibold max-w-full" style={{ lineHeight: '1.1' }}>
                            Start Your Child's Therapy Journey Today
                        </h4>
                        <p className="footer-description text-sm md:text-base text-gray-700 mb-8 max-w-full">
                            Connect with a trusted child psychologist in-network who can support your child's mental well-being.
                        </p>
                        <button 
                            className="bg-gray-800 hover:bg-gray-900 text-white font-normal py-2 px-4 md:py-3 md:px-6 rounded-full text-sm md:text-base transition-colors duration-200"
                            onClick={() => router.push('/online-child-psychologist')}
                        >
                            Get started
                        </button>
                    </div>
                </div>
            ) : isEventsPage ? (
                // Events pages footer wrapper design
                <div className="w-full py-12 md:py-14 px-8 md:px-16 lg:px-24" style={{
                    background: 'linear-gradient(to bottom, #f2fff1, #d7fec5, #d7fec5)'
                }}>
                    <div className="text-center max-w-4xl mx-auto px-4">
                        <h4 className="footer-heading mb-2 font-semibold">
                            Ready to join?
                        </h4>
                        <p className="footer-description text-sm md:text-base text-gray-700 mb-8">
                            Explore upcoming sessions, reserve your seat, and start your family learning journey with MyKoott.
                        </p>
                        <button
                            className="text-white px-5 py-2 md:px-7 md:py-2.5 rounded-3xl text-sm md:text-base font-semibold transition-all duration-200 shadow-sm"
                            style={{ backgroundColor: '#025545' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#012f23')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#025545')}
                            onClick={() => router.push('/events/MyKoott-summer-workshops-2026#register')}
                        >
                            Register now
                        </button>
                    </div>
                </div>
            ) : isBlogPage ? (
                <BlogNewsletterFooterCta />
            ) : (
                // CMS pages footer wrapper design (current design)
                <div className="w-full py-12 md:py-14 px-8 md:px-16 lg:px-24" style={{ 
                    background: 'linear-gradient(to bottom, #f2fff1, #d7fec5, #d7fec5)'
                }}>
                    <div className="text-center max-w-4xl mx-auto px-4">
                        <h4 className="footer-heading mb-2 font-semibold">
                            {pathname === '/about' 
                                ? " We're  here to listen, guide, and support." 
                                : "Confused where\nto start?"}
                        </h4>
                        <p className="footer-description text-sm md:text-base text-gray-700 mb-8">
                            {pathname === '/about'
                                ? 'Care doesn’t end here.'
                                : 'Book a free 20 minutes session with our child psychologist.'}
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <a
                                href={pathname === '/about' ? "/#choose-your-guide" : "https://wa.me/919539007766?text=Hi%20MyKoott%2C%20I%27d%20like%20to%20know%20more%20about%20your%20services."}
                                className="px-4 py-2 md:px-6 md:py-2.5 rounded-3xl text-sm md:text-base font-semibold transition-all duration-200"
                                style={{ backgroundColor: 'transparent', color: '#025545', boxShadow: 'inset 0 0 0 2px #025545' }}
                                onClick={(e) => {
                                    if (pathname === '/about') {
                                        e.preventDefault();
                                        window.location.href = '/#choose-your-guide';
                                    }
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#025545'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #025545'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#025545'; e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #025545'; }}
                            >
                                {pathname === '/about' ? 'Start Your Care' : 'WhatsApp Us'}
                            </a>
                            <button 
                                className="text-white px-5 py-2 md:px-7 md:py-2.5 rounded-3xl text-sm md:text-base font-semibold transition-all duration-200 shadow-sm" 
                                style={{ backgroundColor: '#025545' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#012f23'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#025545'}
                                onClick={() => router.push('/online-child-psychologist')}
                            >
                                {pathname === '/about' ? 'Join Our Team' : 'Book  Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Original footer content */}
            <div className="w-full py-8 md:py-16" style={{ backgroundColor: '#15171A' }}>
                {/* Top horizontal line at the very beginning */}
                <div className="absolute top-0 left-0 w-full h-3 bg-white"></div>
                
                <div className="w-full flex flex-col px-8 md:px-16 lg:px-24 mt-2 md:mt-4">
                    {/* Main footer content - header-like FAQ dropdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-12 lg:gap-8 xl:gap-16">
                        {/* Counselling (mirrors header nested submenu) */}
                        <div className="space-y-1 md:space-y-5 text-left">
                            <button
                                onClick={() => toggleSection('counselling')}
                                className="md:hidden flex items-center justify-between w-full cursor-pointer text-white text-left"
                            >
                                <h2 className="footer-main-menu-item text-white text-left" suppressHydrationWarning>Counseling</h2>
                                <svg className={`w-5 h-5 transition-transform duration-200 ${openSections.counselling ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            <h2 className="footer-main-menu-item hidden md:block text-white mb-8 text-left" suppressHydrationWarning>Counseling</h2>
                            <div className={`${openSections.counselling ? 'block' : 'hidden md:block'} space-y-1 md:space-y-3 text-left`}>
                                {/* Category: Emotional & Mental Health */}
                                <div className="space-y-1 text-left">
                                    <button
                                        onClick={() => toggleSection('c_emotional')}
                                        className="flex w-full items-center justify-between font-normal text-white/90 cursor-pointer text-left"
                                    >
                                        <h2 className="footer-submenu-item text-left" suppressHydrationWarning>Emotional & Mental Health</h2>
                                        
                                        <svg className={`w-4 h-4 transition-transform ${openSections.c_emotional ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <ul className={`ml-2 pl-2 border-l border-white/20 space-y-2 text-left ${openSections.c_emotional ? 'block' : 'hidden'}`}>
                                        {counsellingMenu.emotional.map((item) => (
                                            <li key={item.url} className="text-left"><a href={item.url} className="text-white hover:text-green-200 transition-colors duration-200 text-left block"><h2 className="footer-individual-menu-item" suppressHydrationWarning>{item.title}</h2></a></li>
                                        ))}
                                    </ul>
                                </div>
                                {/* Category: Child Development & Learning */}
                                <div className="space-y-1 mt-1 md:mt-2 text-left">
                                    <button
                                        onClick={() => toggleSection('c_development')}
                                        className="flex w-full items-center justify-between font-normal text-white/90 cursor-pointer text-left"
                                    >
                                        <h2 className="footer-submenu-item text-left" suppressHydrationWarning>Child Development & Learning</h2>
                                        <svg className={`w-4 h-4 transition-transform ${openSections.c_development ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <ul className={`ml-2 pl-2 border-l border-white/20 space-y-2 text-left ${openSections.c_development ? 'block' : 'hidden'}`}>
                                        {counsellingMenu.development.map((item) => (
                                            <li key={item.url} className="text-left"><a href={item.url} className="text-white hover:text-green-200 transition-colors duration-200 text-left block"><h2 className="footer-individual-menu-item" suppressHydrationWarning>{item.title}</h2></a></li>
                                        ))}
                                    </ul>
                                </div>
                                {/* Category: Behaviour & Confidence */}
                                <div className="space-y-1 mt-1 md:mt-2 text-left">
                                    <button
                                        onClick={() => toggleSection('c_behaviour')}
                                        className="flex w-full items-center justify-between font-normal text-white/90 cursor-pointer text-left"
                                    >
                                        <h2 className="footer-submenu-item text-left" suppressHydrationWarning>Behaviour & Confidence</h2>
                                        <svg className={`w-4 h-4 transition-transform ${openSections.c_behaviour ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <ul className={`ml-2 pl-2 border-l border-white/20 space-y-2 text-left ${openSections.c_behaviour ? 'block' : 'hidden'}`}>
                                        {counsellingMenu.behaviour.map((item) => (
                                            <li key={item.url} className="text-left"><a href={item.url} className="text-white hover:text-green-200 transition-colors duration-200 text-left block"><h2 className="footer-individual-menu-item" suppressHydrationWarning>{item.title}</h2></a></li>
                                        ))}
                                    </ul>
                                </div>
                                {/* Category: Stress & Academic Support */}
                                <div className="space-y-1 mt-1 md:mt-2 text-left">
                                    <button
                                        onClick={() => toggleSection('c_stress')}
                                        className="flex w-full items-center justify-between font-normal text-white/90 cursor-pointer text-left"
                                    >
                                        <h2 className="footer-submenu-item text-left" suppressHydrationWarning>Stress & Academic Support</h2>
                                        <svg className={`w-4 h-4 transition-transform ${openSections.c_stress ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <ul className={`ml-2 pl-2 border-l border-white/20 space-y-2 text-left ${openSections.c_stress ? 'block' : 'hidden'}`}>
                                        {counsellingMenu.stress.map((item) => (
                                            <li key={item.url} className="text-left"><a href={item.url} className="text-white hover:text-green-200 transition-colors duration-200 text-left block"><h2 className="footer-individual-menu-item" suppressHydrationWarning>{item.title}</h2></a></li>
                                        ))}
                                    </ul>
                                </div>
                                {/* Category: Trauma & Healing */}
                                <div className="space-y-1 mt-1 md:mt-2 text-left">
                                    <button
                                        onClick={() => toggleSection('c_trauma')}
                                        className="flex w-full items-center justify-between font-normal text-white/90 cursor-pointer text-left"
                                    >
                                        <h2 className="footer-submenu-item text-left" suppressHydrationWarning>Trauma & Healing</h2>
                                        <svg className={`w-4 h-4 transition-transform ${openSections.c_trauma ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <ul className={`ml-2 pl-2 border-l border-white/20 space-y-2 text-left ${openSections.c_trauma ? 'block' : 'hidden'}`}>
                                        {counsellingMenu.trauma.map((item) => (
                                            <li key={item.url} className="text-left"><a href={item.url} className="text-white hover:text-green-200 transition-colors duration-200 text-left block"><h2 className="footer-individual-menu-item" suppressHydrationWarning>{item.title}</h2></a></li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        {/* Assessments (mirrors header groups) */}
                        <div className="space-y-1 md:space-y-5 text-left">
                            <button
                                onClick={() => toggleSection('assessments')}
                                className="md:hidden flex items-center justify-between w-full cursor-pointer text-white text-left"
                            >
                                <h2 className="footer-main-menu-item text-white text-left" suppressHydrationWarning>Assessments</h2>
                                <svg className={`w-5 h-5 transition-transform duration-200 ${openSections.assessments ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            <h2 className="footer-main-menu-item hidden md:block text-white mb-8 text-left" suppressHydrationWarning>Assessments</h2>
                            <div className={`${openSections.assessments ? 'block' : 'hidden md:block'} space-y-1 md:space-y-3 text-left`}>
                                {/* ADHD Assessments */}
                                <div className="space-y-1 text-left">
                                    <button
                                        onClick={() => toggleSection('a_adhd')}
                                        className="flex w-full items-center justify-between font-normal text-white/90 cursor-pointer text-left"
                                    >
                                        <h2 className="footer-submenu-item text-left" suppressHydrationWarning>ADHD</h2>
                                        <svg className={`w-4 h-4 transition-transform ${openSections.a_adhd ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <ul className={`ml-2 pl-2 border-l border-white/20 space-y-2 text-left ${openSections.a_adhd ? 'block' : 'hidden'}`}>
                                        {assessmentsMenu.adhd.map((item) => (
                                            <li key={item.url} className="text-left"><a href={item.url} className="text-white hover:text-green-200 transition-colors duration-200 text-left block"><h2 className="footer-individual-menu-item" suppressHydrationWarning>{item.title}</h2></a></li>
                                        ))}
                                    </ul>
                                </div>
                                {/* EBS Assessments */}
                                <div className="space-y-1 mt-1 md:mt-2 text-left">
                                    <button
                                        onClick={() => toggleSection('a_ebs')}
                                        className="flex w-full items-center justify-between font-normal text-white/90 cursor-pointer text-left"
                                    >
                                        <h2 className="footer-submenu-item text-left" suppressHydrationWarning>Emotional & Behavioural Scales</h2>
                                        <svg className={`w-4 h-4 transition-transform ${openSections.a_ebs ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <ul className={`ml-2 pl-2 border-l border-white/20 space-y-2 text-left ${openSections.a_ebs ? 'block' : 'hidden'}`}>
                                        {assessmentsMenu.ebs.map((item) => (
                                            <li key={item.url} className="text-left"><a href={item.url} className="text-white hover:text-green-200 transition-colors duration-200 text-left block"><h2 className="footer-individual-menu-item" suppressHydrationWarning>{item.title}</h2></a></li>
                                        ))}
                                    </ul>
                                </div>
                                {/* Intelligence Assessments */}
                                <div className="space-y-1 mt-1 md:mt-2 text-left">
                                    <button
                                        onClick={() => toggleSection('a_intelligence')}
                                        className="flex w-full items-center justify-between font-normal text-white/90 cursor-pointer text-left"
                                    >
                                        <h2 className="footer-submenu-item text-left" suppressHydrationWarning>Intelligence</h2>
                                        <svg className={`w-4 h-4 transition-transform ${openSections.a_intelligence ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <ul className={`ml-2 pl-2 border-l border-white/20 space-y-2 text-left ${openSections.a_intelligence ? 'block' : 'hidden'}`}>
                                        {assessmentsMenu.intelligence.map((item) => (
                                            <li key={item.url} className="text-left"><a href={item.url} className="text-white hover:text-green-200 transition-colors duration-200 text-left block"><h2 className="footer-individual-menu-item" suppressHydrationWarning>{item.title}</h2></a></li>
                                        ))}
                                    </ul>
                                </div>
                                {/* Projective Assessments */}
                                <div className="space-y-1 mt-1 md:mt-2 text-left">
                                    <button
                                        onClick={() => toggleSection('a_projective')}
                                        className="flex w-full items-center justify-between font-normal text-white/90 cursor-pointer text-left"
                                    >
                                        <h2 className="footer-submenu-item text-left" suppressHydrationWarning>Projective</h2>
                                        <svg className={`w-4 h-4 transition-transform ${openSections.a_projective ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <ul className={`ml-2 pl-2 border-l border-white/20 space-y-2 text-left ${openSections.a_projective ? 'block' : 'hidden'}`}>
                                        {assessmentsMenu.projective.map((item) => (
                                            <li key={item.url} className="text-left"><a href={item.url} className="text-white hover:text-green-200 transition-colors duration-200 text-left block"><h2 className="footer-individual-menu-item" suppressHydrationWarning>{item.title}</h2></a></li>
                                        ))}
                                    </ul>
                                </div>
                                {/* Free 20 Min Assessment */}
                                <div className="mt-2 pt-2 md:mt-4 md:pt-4 border-t border-white/20">
                                    <a 
                                        href="/free-assessment"
                                        className="flex items-center justify-between text-base font-medium text-white hover:text-green-200 transition-colors duration-200 text-left"
                                    >
                                        <h2 className="footer-submenu-item" suppressHydrationWarning>Free 20 Min Assessment</h2>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Better Parenting (flat list) */}
                        <div className="space-y-1 md:space-y-5 text-left">
                            <button
                                onClick={() => toggleSection('better_parenting')}
                                className="md:hidden flex items-center justify-between w-full cursor-pointer text-white text-left"
                            >
                                <h2 className="footer-main-menu-item text-white text-left" suppressHydrationWarning>Better Parenting</h2>
                                <svg className={`w-5 h-5 transition-transform duration-200 ${openSections.better_parenting ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            <h2 className="footer-main-menu-item hidden md:block text-white mb-8 text-left" suppressHydrationWarning>Better Parenting</h2>
                            <ul className={`space-y-1 md:space-y-3 text-base leading-relaxed text-left ${openSections.better_parenting ? 'block' : 'hidden md:block'}`}>
                                {betterParentingMenu.map((item) => (
                                    <li key={item.url} className="text-left"><a href={item.url} className="text-white font-medium text-left block"><h2 className="footer-individual-menu-item" suppressHydrationWarning>{item.title}</h2></a></li>
                                ))}
                            </ul>
                        </div>
                        {/* About Us */}
                        <div className="space-y-1 md:space-y-5 text-left">
                            <button
                                onClick={() => toggleSection('about')}
                                className="md:hidden flex items-center justify-between w-full cursor-pointer text-white text-left"
                            >
                                <h2 className="footer-main-menu-item text-white text-left" suppressHydrationWarning>About Us</h2>
                                <svg className={`w-5 h-5 transition-transform duration-200 ${openSections.about ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            <h2 className="footer-main-menu-item hidden md:block text-white mb-8 text-left" suppressHydrationWarning>About Us</h2>
                            <ul className={`space-y-1 text-base leading-relaxed text-left ${openSections.about ? 'block' : 'hidden md:block'}`}>
                                <li className="text-left"><a href="/about" className="text-white hover:text-green-200 transition-colors duration-200 font-medium text-left block"><h2 className="footer-individual-menu-item">Company</h2></a></li>
                                <li className="text-left"><a href="/career" className="text-white hover:text-green-200 transition-colors duration-200 font-medium text-left block"><h2 className="footer-individual-menu-item">Career</h2></a></li>
                                <li className="text-left"><a href="/faq" className="text-white hover:text-green-200 transition-colors duration-200 font-medium text-left block"><h2 className="footer-individual-menu-item">FAQ</h2></a></li>
                                <li className="text-left"><a href="/blog" className="text-white hover:text-green-200 transition-colors duration-200 font-medium text-left block"><h2 className="footer-individual-menu-item">Blog</h2></a></li>
                                <li className="text-left"><a href="/events" className="text-white hover:text-green-200 transition-colors duration-200 font-medium text-left block"><h2 className="footer-individual-menu-item">Events</h2></a></li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Help/Emergency section and bottom bar */}
                <div className="w-full flex flex-col justify-center px-8 md:px-16 lg:px-24 mt-4">
                    <div className="w-full h-px my-8 bg-white/40"></div>
                    <div className="mt-0 text-white">
                        <h5 className="mb-4 text-left md:text-left "><span className="italic text-[20px] md:text-[28px]" style={{ color: '#eae5ff' }}>We're</span> <span className="text-[22px] md:text-[28px]">MyKoott</span></h5>
                        <div className="space-y-3 text-left md:text-left">
                            
                            <div className="text-base md:text-lg text-white/70 leading-[1] p2">
                             A team of psychologists who believe every child and parent deserves understanding, guidance, and a space to grow emotionally and happily.
                            </div>
                            <div className="w-full h-px mt-10 mb-3 bg-white/40"></div>

                            <div className="text-white/70 leading-[1]" style={{ fontSize: '13px' }}>
                            If you're in crisis or need immediate help, please contact your local emergency helpline (India (24×7) 1800-891-4416) or visit the nearest hospital.
                            </div>
                           
                          
                        </div>
                        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 text-white/90 text-sm mt-6">
                            <p className="p2 text-center xl:text-left">
                                <span style={{ color: '#025545', display: 'inline-block', marginRight: '2px' }}>©</span> MyKoott by MyKoott Care Pvt. Ltd. All rights reserved
                            </p>
                            <div className="flex flex-wrap items-center justify-center xl:justify-end gap-x-6 gap-y-3">
                                <a href="/terms-and-conditions" className="hover:text-white transition-colors">TERMS AND CONDITIONS</a>
                                <a href="/privacy-policy" className="hover:text-white transition-colors">PRIVACY POLICY</a>
                                <a href="/therapy-agreement" className="hover:text-white transition-colors">THERAPY AGREEMENT</a>
                                <a href="/refund-policy" className="hover:text-white transition-colors">REFUND POLICY</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

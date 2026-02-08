'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Menu, X, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/browser';

interface DropdownItem {
    label: string;
    href: string;
    description?: string;
}

interface NavItem {
    label: string;
    href?: string;
    dropdown?: DropdownItem[];
}

const navItems: NavItem[] = [
    { label: 'Home', href: '/' },
    {
        label: 'Products',
        dropdown: [
            { label: 'Signal Processing', href: '/signal-processing', description: 'Wavelet-based feature extraction' },
            { label: 'Machine Learning', href: '/machine-learning', description: 'SVM classification & prediction' },
            { label: 'Data Analysis', href: '/data-analysis', description: 'Statistical analysis & visualization' },
            { label: 'Data Acquisition', href: '/data-acquisition', description: 'NI DAQ integration software' },
        ],
    },
    { label: 'Contact', href: '/contact' },
];

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        let isMounted = true;

        const initSession = async () => {
            const { data } = await supabase.auth.getUser();
            if (isMounted) {
                setIsAuthenticated(!!data.user);
            }
        };

        initSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted) {
                setIsAuthenticated(!!session?.user);
            }
        });

        return () => {
            isMounted = false;
            authListener.subscription.unsubscribe();
        };
    }, [supabase]);

    const handleMouseEnter = (label: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setActiveDropdown(label);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setActiveDropdown(null);
        }, 150);
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4">
            <nav
                className="max-w-6xl mx-auto rounded-full px-4 transition-all duration-500 ease-out"
                style={{
                    background: scrolled
                        ? 'rgba(255, 255, 255, 0.3)'
                        : 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(24px) saturate(1.6)',
                    WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
                    boxShadow: scrolled
                        ? '0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                        : '0 4px 20px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                }}
            >
                <div className="flex justify-between items-center py-3.5 px-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#BC6C4F] to-orange-300 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"></path>
                            </svg>
                        </div>
                        <span className="text-xl font-semibold tracking-tight font-sans" style={{ color: '#2C2420' }}>
                            sibilytics<span style={{ color: '#BC6C4F' }}>.ai</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1" ref={dropdownRef}>
                        {navItems.map((item) => (
                            <div
                                key={item.label}
                                className="relative"
                                onMouseEnter={() => item.dropdown && handleMouseEnter(item.label)}
                                onMouseLeave={handleMouseLeave}
                            >
                                {item.dropdown ? (
                                    <>
                                        <button
                                            className="flex items-center gap-1 px-4 py-2 rounded-full font-medium transition-all text-sm"
                                            style={{ color: '#3D342B' }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.color = '#BC6C4F';
                                                e.currentTarget.style.background = 'rgba(188, 108, 79, 0.08)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.color = '#3D342B';
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            {item.label}
                                            <ChevronDown
                                                className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === item.label ? 'rotate-180' : ''}`}
                                            />
                                        </button>

                                        {/* Dropdown */}
                                        {activeDropdown === item.label && (
                                            <div
                                                className="absolute top-full left-0 mt-3 w-72 rounded-2xl overflow-hidden animate-fade-in"
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.7)',
                                                    backdropFilter: 'blur(30px) saturate(1.8)',
                                                    WebkitBackdropFilter: 'blur(30px) saturate(1.8)',
                                                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
                                                    border: '1px solid rgba(255, 255, 255, 0.5)',
                                                }}
                                            >
                                                <div className="p-2">
                                                    {item.dropdown.map((dropdownItem) => (
                                                        <Link
                                                            key={dropdownItem.label}
                                                            href={dropdownItem.href}
                                                            className="flex flex-col gap-1 p-3 rounded-xl transition-all group"
                                                            style={{ color: '#2C2420' }}
                                                            onClick={() => setActiveDropdown(null)}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(188, 108, 79, 0.08)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <span className="font-semibold transition-colors group-hover:text-[#BC6C4F]" style={{ color: 'inherit' }}>
                                                                {dropdownItem.label}
                                                            </span>
                                                            {dropdownItem.description && (
                                                                <span className="text-sm" style={{ color: '#786B61' }}>
                                                                    {dropdownItem.description}
                                                                </span>
                                                            )}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Link
                                        href={item.href!}
                                        className="px-4 py-2 rounded-full font-medium transition-all text-sm"
                                        style={{ color: '#3D342B' }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = '#BC6C4F';
                                            e.currentTarget.style.background = 'rgba(188, 108, 79, 0.08)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = '#3D342B';
                                            e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        {item.label}
                                    </Link>
                                )}
                            </div>
                        ))}

                        {/* Divider */}
                        <div className="h-5 w-px mx-2" style={{ background: 'rgba(61, 52, 43, 0.15)' }}></div>

                        {/* CTA Button */}
                        {!isAuthenticated && (
                            <Link
                                href="/signup"
                                className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm transition-all cursor-pointer"
                                style={{
                                    background: 'linear-gradient(135deg, #BC6C4F, #A05A41)',
                                    color: '#FFFFFF',
                                    boxShadow: '0 4px 15px rgba(188, 108, 79, 0.3)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = '0 6px 25px rgba(188, 108, 79, 0.45)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(188, 108, 79, 0.3)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                Try It Free
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-full transition-colors"
                        style={{ color: '#2C2420' }}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div
                        className="md:hidden animate-fade-in rounded-b-3xl overflow-hidden"
                        style={{ borderTop: '1px solid rgba(61, 52, 43, 0.1)' }}
                    >
                        <div className="px-4 py-4 space-y-2">
                            {navItems.map((item) => (
                                <div key={item.label}>
                                    {item.dropdown ? (
                                        <div className="space-y-1">
                                            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: '#786B61' }}>
                                                {item.label}
                                            </div>
                                            {item.dropdown.map((dropdownItem) => (
                                                <Link
                                                    key={dropdownItem.label}
                                                    href={dropdownItem.href}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className="block font-medium py-2 px-4 rounded-lg transition-colors"
                                                    style={{ color: '#2C2420' }}
                                                >
                                                    {dropdownItem.label}
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <Link
                                            href={item.href!}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block font-medium py-2 px-4 rounded-lg transition-colors"
                                            style={{ color: '#2C2420' }}
                                        >
                                            {item.label}
                                        </Link>
                                    )}
                                </div>
                            ))}

                            {!isAuthenticated && (
                                <div className="pt-4" style={{ borderTop: '1px solid rgba(61, 52, 43, 0.1)' }}>
                                    <Link
                                        href="/signup"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-full font-semibold transition-colors cursor-pointer"
                                        style={{ background: 'linear-gradient(135deg, #BC6C4F, #A05A41)', color: '#FFFFFF' }}
                                    >
                                        Try It Free
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            )}

                            <div className="flex items-center justify-center gap-4 pt-3">
                                <a href="mailto:sibilyticsai@gmail.com" className="flex items-center gap-2 transition-opacity hover:opacity-100" style={{ color: '#786B61' }}>
                                    <Mail className="w-4 h-4" />
                                    <span className="text-sm">Email Us</span>
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </nav>
        </div>
    );
}

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
    const dropdownRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const supabase = useMemo(() => createClient(), []);

    // Close dropdown when clicking outside
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
            {/* Floating Navbar Container */}
            <nav className="max-w-6xl mx-auto bg-slate-900/95 backdrop-blur-md rounded-full shadow-2xl border border-slate-700/50 px-2">
                <div className="flex justify-between items-center h-14 px-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
                        <Image
                            src="/footer-logo.png"
                            alt="Sibilytics Logo"
                            width={36}
                            height={36}
                            className="h-9 w-9 object-contain"
                        />
                        <span className="text-white font-semibold text-lg tracking-tight">sibilytics<span className="text-emerald-400">.ai</span></span>
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
                                            className="flex items-center gap-1 px-4 py-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 font-medium transition-all text-sm"
                                        >
                                            {item.label}
                                            <ChevronDown
                                                className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === item.label ? 'rotate-180' : ''
                                                    }`}
                                            />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {activeDropdown === item.label && (
                                            <div className="absolute top-full left-0 mt-3 w-72 bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden animate-fade-in">
                                                <div className="p-2">
                                                    {item.dropdown.map((dropdownItem) => (
                                                        <Link
                                                            key={dropdownItem.label}
                                                            href={dropdownItem.href}
                                                            className="flex flex-col gap-1 p-3 rounded-xl hover:bg-white/10 transition-colors group"
                                                            onClick={() => setActiveDropdown(null)}
                                                        >
                                                            <span className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                                                                {dropdownItem.label}
                                                            </span>
                                                            {dropdownItem.description && (
                                                                <span className="text-sm text-slate-400">
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
                                        className="px-4 py-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 font-medium transition-all text-sm"
                                    >
                                        {item.label}
                                    </Link>
                                )}
                            </div>
                        ))}

                        {/* Divider */}
                        <div className="h-5 w-px bg-slate-600 mx-2"></div>

                        {/* CTA Button */}
                        {!isAuthenticated && (
                            <Link
                                href="/signup"
                                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2 rounded-full font-semibold text-sm transition-all shadow-lg shadow-emerald-500/25"
                            >
                                Try It Free
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-full text-white hover:bg-white/10 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-700/50 animate-fade-in rounded-b-3xl overflow-hidden">
                        <div className="px-4 py-4 space-y-2">
                            {navItems.map((item) => (
                                <div key={item.label}>
                                    {item.dropdown ? (
                                        <div className="space-y-1">
                                            <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                                {item.label}
                                            </div>
                                            {item.dropdown.map((dropdownItem) => (
                                                <Link
                                                    key={dropdownItem.label}
                                                    href={dropdownItem.href}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className="block text-white hover:text-emerald-400 hover:bg-white/10 font-medium py-2 px-4 rounded-lg transition-colors"
                                                >
                                                    {dropdownItem.label}
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <Link
                                            href={item.href!}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block text-white hover:text-emerald-400 hover:bg-white/10 font-medium py-2 px-4 rounded-lg transition-colors"
                                        >
                                            {item.label}
                                        </Link>
                                    )}
                                </div>
                            ))}

                            {!isAuthenticated && (
                                <div className="pt-4 border-t border-slate-700/50">
                                    <Link
                                        href="/signup"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center justify-center gap-2 bg-emerald-500 text-white py-3 px-4 rounded-full font-semibold hover:bg-emerald-400 transition-colors"
                                    >
                                        Try It Free
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            )}

                            <div className="flex items-center justify-center gap-4 pt-3">
                                <a href="mailto:sybilyticsai@gmail.com" className="flex items-center gap-2 text-slate-400 hover:text-white">
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

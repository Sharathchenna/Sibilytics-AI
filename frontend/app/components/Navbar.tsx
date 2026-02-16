'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Menu, X, Mail, ArrowRight, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
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
            { label: 'Regression Analysis', href: '/regression', description: 'Curve fitting & regression models' },
            { label: 'Data Analysis', href: '/data-analysis', description: 'Statistical analysis & visualization' },
            { label: 'Data Acquisition', href: '/data-acquisition', description: 'NI DAQ integration software' },
        ],
    },
    { label: 'Contact', href: '/contact' },
];

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const supabase = useMemo(() => createClient(), []);
    const pathname = usePathname();
    const router = useRouter();

    // Reset state on route change
    useEffect(() => {
        setMobileMenuOpen(false);
        setActiveDropdown(null);
        setScrolled(false);
        window.scrollTo(0, 0);
    }, [pathname]);

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
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
                setProfileDropdownOpen(false);
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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setProfileDropdownOpen(false);
        router.push('/');
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4">
            <nav
                className="max-w-6xl mx-auto rounded-full px-4 transition-all duration-500 ease-out"
                style={{
                    background: scrolled
                        ? 'rgba(255, 255, 255, 0.9)'
                        : 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: scrolled
                        ? '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                        : '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                }}
            >
                <div className="flex justify-between items-center py-3.5 px-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-1 hover:opacity-80 transition-opacity flex-shrink-0">
                        <Image src="/dop-logo.svg" alt="DOP logo" width={56} height={38} className="w-14 h-9 object-contain" />
                        <span className="text-xl font-semibold tracking-tight font-sans" style={{ color: '#2C2420' }}>
                            sibilytics<span style={{ color: '#BC6C4F' }}>-ai</span>
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
                                            aria-haspopup="true"
                                            aria-expanded={activeDropdown === item.label}
                                            aria-label={`${item.label} menu`}
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
                                                aria-hidden="true"
                                            />
                                        </button>

                                        {/* Dropdown */}
                                        {activeDropdown === item.label && (
                                            <div
                                                role="menu"
                                                aria-label={`${item.label} submenu`}
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
                                                            role="menuitem"
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

                        {/* CTA Button or Profile */}
                        {!isAuthenticated ? (
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
                        ) : (
                            <div className="relative" ref={profileDropdownRef}>
                                <button
                                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                    className="p-2 rounded-full transition-all"
                                    style={{
                                        background: profileDropdownOpen ? 'rgba(188, 108, 79, 0.1)' : 'transparent',
                                        color: '#BC6C4F',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!profileDropdownOpen) {
                                            e.currentTarget.style.background = 'rgba(188, 108, 79, 0.08)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!profileDropdownOpen) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                    aria-label="Profile menu"
                                    aria-expanded={profileDropdownOpen}
                                >
                                    <User className="w-5 h-5" />
                                </button>

                                {/* Profile Dropdown */}
                                {profileDropdownOpen && (
                                    <div
                                        className="absolute right-0 mt-2 w-48 rounded-2xl shadow-xl overflow-hidden animate-fade-in"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.98)',
                                            backdropFilter: 'blur(16px)',
                                            border: '1px solid rgba(61, 52, 43, 0.1)',
                                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                                        }}
                                    >
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                                            style={{ color: '#3D342B' }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(188, 108, 79, 0.08)';
                                                e.currentTarget.style.color = '#BC6C4F';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.color = '#3D342B';
                                            }}
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span className="font-medium text-sm">Logout</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-full transition-colors"
                        style={{ color: '#2C2420' }}
                        aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                        aria-expanded={mobileMenuOpen}
                        aria-controls="mobile-navigation"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div
                        id="mobile-navigation"
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

                            <div className="pt-4" style={{ borderTop: '1px solid rgba(61, 52, 43, 0.1)' }}>
                                {!isAuthenticated ? (
                                    <Link
                                        href="/signup"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-full font-semibold transition-colors cursor-pointer"
                                        style={{ background: 'linear-gradient(135deg, #BC6C4F, #A05A41)', color: '#FFFFFF' }}
                                    >
                                        Try It Free
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                ) : (
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full font-semibold transition-colors"
                                        style={{ 
                                            background: 'rgba(188, 108, 79, 0.1)',
                                            color: '#BC6C4F',
                                            border: '1px solid rgba(188, 108, 79, 0.2)'
                                        }}
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Logout
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center justify-center gap-4 pt-3">
                                <a 
                                    href="mailto:sibilyticsai@gmail.com" 
                                    className="flex items-center gap-2 transition-opacity hover:opacity-100" 
                                    style={{ color: '#786B61' }}
                                    aria-label="Email us at sibilyticsai@gmail.com"
                                >
                                    <Mail className="w-4 h-4" aria-hidden="true" />
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

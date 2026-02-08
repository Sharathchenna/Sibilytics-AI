'use client';
import { Mail, Activity } from 'lucide-react';
import Link from 'next/link';

interface FooterProps {
    visitorCount?: number | null;
}

export default function Footer({ visitorCount }: FooterProps) {
    const quickLinks = [
        { label: 'Home', href: '/' },
        { label: 'Signal Processing', href: '/signal-processing' },
        { label: 'Machine Learning', href: '/machine-learning' },
        { label: 'Data Analysis', href: '/data-analysis' },
        { label: 'Data Acquisition', href: '/data-acquisition' },
        { label: 'Contact', href: '/contact' },
    ];

    return (
        <footer className="bg-[#2C2420] text-[#D6CFC7] py-20 border-t border-white/5 relative overflow-hidden">
            <div className="absolute -top-[200px] -right-[200px] w-[500px] h-[500px] bg-[#BC6C4F]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#BC6C4F] to-orange-300 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"></path>
                            </svg>
                        </div>
                        <span className="text-xl font-semibold text-white tracking-tight" style={{ fontFamily: 'var(--font-jakarta)' }}>
                            sibilytics<span className="text-[#BC6C4F]">.ai</span>
                        </span>
                    </div>
                    <p className="text-sm leading-relaxed font-jakarta" style={{ color: '#D6CFC7', opacity: 0.8 }}>
                    Advanced signal processing platform for wavelet-based feature extraction from sensor signals. A powerful tool for researchers, engineers, and data analysts working with time-series data.
                </p>        
                    <div className="flex items-center gap-2 text-sm cursor-pointer">
                        <Mail className="w-4 h-4" style={{ color: '#D6CFC7' }} />
                        <a 
                            href="mailto:sibilyticsai@gmail.com"
                            className="transition-colors"
                            style={{ color: '#D6CFC7' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#BC6C4F';
                                e.currentTarget.previousElementSibling && ((e.currentTarget.previousElementSibling as HTMLElement).style.color = '#BC6C4F');
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#D6CFC7';
                                e.currentTarget.previousElementSibling && ((e.currentTarget.previousElementSibling as HTMLElement).style.color = '#D6CFC7');
                            }}
                        >
                            sibilyticsai@gmail.com
                        </a>
                    </div>
                </div>

                <div>
                    <h4 className="text-white font-bold mb-6" style={{ fontFamily: 'var(--font-jakarta)' }}>Quick Links</h4>
                    <ul className="space-y-3 text-sm" style={{ fontFamily: 'var(--font-jakarta)' }}>
                        {quickLinks.map((link) => (
                            <li key={link.href}>
                                <Link 
                                    href={link.href} 
                                    className="transition-colors"
                                    style={{ color: '#D6CFC7' }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#BC6C4F'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#D6CFC7'}
                                >
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="hidden lg:block"></div>

                <div className="flex flex-col justify-end lg:items-end">
                    <div className="text-sm opacity-60 mb-2" style={{ fontFamily: 'var(--font-jakarta)' }}>
                        © {new Date().getFullYear()} Sibilytics AI. All rights reserved.
                    </div>
                    {visitorCount !== null && visitorCount !== undefined && (
                        <div className="flex items-center gap-2 text-xs opacity-50 bg-white/5 px-3 py-1 rounded-full">
                            <Activity className="w-3 h-3" />
                            <span style={{ fontFamily: 'var(--font-jakarta)' }}>
                                Unique Visitors: <span className="text-[#BC6C4F] font-mono">{visitorCount.toLocaleString()}</span>
                            </span>
                        </div>
                    )}
                    {visitorCount === null || visitorCount === undefined ? (
                        <div className="flex items-center gap-2 text-xs opacity-50 bg-white/5 px-3 py-1 rounded-full">
                            <Activity className="w-3 h-3" />
                            <span style={{ fontFamily: 'var(--font-jakarta)' }}>
                                Unique Visitors: <span className="text-[#BC6C4F] font-mono">630</span>
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>
        </footer>
    );
}

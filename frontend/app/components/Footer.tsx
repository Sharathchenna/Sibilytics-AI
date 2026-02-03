'use client';
import { Mail, Activity } from 'lucide-react';
import Link from 'next/link';

interface FooterProps {
    visitorCount?: number | null;
}

export default function Footer({ visitorCount }: FooterProps) {
    return (
        <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16 relative z-10">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid md:grid-cols-3 gap-10 mb-12">
                    {/* Company Info */}
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                            <img
                                src="/footer-logo.png"
                                alt="Sibilytics.ai"
                                className="h-12 w-12 object-contain"
                            />
                            <span className="text-white font-bold text-2xl tracking-tight">sibilytics<span className="text-emerald-400">.ai</span></span>
                        </div>
                        <p className="text-white text-sm leading-relaxed mb-6">
                            Advanced signal processing platform for wavelet-based feature extraction from sensor signals.
                            A powerful tool for researchers, engineers, and data analysts working with time-series data.
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                <a href="mailto:sybilyticsai@gmail.com" className="text-white hover:text-emerald-400 transition-colors text-sm font-medium break-all">
                                    sybilyticsai@gmail.com
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-2xl font-bold mb-8 text-white">Quick Links</h4>
                        <ul className="space-y-3 text-sm mt-3">
                            <li><Link href="/" className="text-gray-400 hover:text-white hover:translate-x-1 inline-block transition-all">Home</Link></li>
                            <li><Link href="/signal-processing" className="text-gray-400 hover:text-purple-400 hover:translate-x-1 inline-block transition-all">Signal Processing</Link></li>
                            <li><Link href="/machine-learning" className="text-gray-400 hover:text-purple-400 hover:translate-x-1 inline-block transition-all">Machine Learning</Link></li>
                            <li><Link href="/data-analysis" className="text-gray-400 hover:text-purple-400 hover:translate-x-1 inline-block transition-all">Data Analysis</Link></li>
                            <li><Link href="/data-acquisition" className="text-gray-400 hover:text-purple-400 hover:translate-x-1 inline-block transition-all">Data Acquisition</Link></li>
                            <li><Link href="/contact" className="text-gray-400 hover:text-white hover:translate-x-1 inline-block transition-all">Contact</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Copyright */}
                <div className="border-t border-gray-700 pt-8 text-center">
                    <p className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} Sibilytics AI. All rights reserved.
                    </p>
                    {visitorCount !== null && visitorCount !== undefined && (
                        <p className="text-gray-500 text-xs mt-3 flex items-center justify-center gap-2">
                            <Activity className="w-3 h-3" />
                            <span>Unique Visitors: <span className="font-semibold text-emerald-400">{visitorCount.toLocaleString()}</span></span>
                        </p>
                    )}
                </div>
            </div>
        </footer>
    );
}

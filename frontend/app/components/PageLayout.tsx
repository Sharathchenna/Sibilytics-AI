'use client';
import { ReactNode } from 'react';
import Image from 'next/image';
import Navbar from './Navbar';
import Footer from './Footer';

interface PageLayoutProps {
    children: ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
    return (
        <div className="min-h-screen relative" style={{ background: 'linear-gradient(to bottom, #FDFCF8 0%, #FDFCF8 40%, #ffffff 100%)' }}>
            {/* Translucent Logo Watermark Overlay */}
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
                <Image
                    src="/logo-new.jpg"
                    alt=""
                    aria-hidden="true"
                    width={800}
                    height={800}
                    className="w-[60%] max-w-4xl h-auto object-contain opacity-[0.05]"
                    priority
                />
            </div>

            {/* Navigation */}
            <Navbar />

            {/* Main Content - add top padding for fixed navbar */}
            <main className="relative z-10 pt-20">
                {children}
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}

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
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-emerald-50/50 to-white relative">
            {/* Translucent Logo Watermark Overlay */}
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                <Image
                    src="/logo-new.jpg"
                    alt="Sybilytics Background"
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

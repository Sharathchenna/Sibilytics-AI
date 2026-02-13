'use client';
import DataVisualization from '../components/DataVisualization';
import { BarChart3, PieChart, LineChart, Table2 } from 'lucide-react';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ScrollIndicator from '../components/ScrollIndicator';

export default function DataAnalysisPage() {
    return (
        <div className="min-h-screen relative" style={{ background: 'linear-gradient(to bottom, #EFF6FF 0%, #EFF6FF 40%, #ffffff 100%)' }}>
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

            {/* Main Content */}
            <main className="relative z-10 pt-20">
            {/* Hero Section */}
            <div className="relative py-16 md:py-24 overflow-hidden" style={{ backgroundColor: '#EFF6FF' }}>
                {/* Animated Blob Background */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-[10%] -right-[5%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" style={{ backgroundColor: '#DBEAFE' }}></div>
                    <div className="absolute top-[30%] -left-[5%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" style={{ backgroundColor: '#E0F2FE' }}></div>
                    <div className="absolute -bottom-[10%] left-[30%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" style={{ backgroundColor: '#BAE6FD' }}></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-6 z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-white/80 border px-4 py-2 rounded-full text-sm font-semibold mb-8 backdrop-blur-sm animate-fade-in" style={{ borderColor: '#DBEAFE', color: '#3B82F6', fontFamily: 'var(--font-jakarta)' }}>
                            <BarChart3 className="w-4 h-4" />
                            Data Analysis & Visualization
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight animate-fade-in" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                            Interactive <br />
                            <span className="italic" style={{ color: '#3B82F6' }}>Data Mining</span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg md:text-xl mb-10 leading-relaxed max-w-3xl mx-auto font-light animate-fade-in" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                            Visualize your data with powerful statistical analysis tools. Create interactive charts,
                            explore correlations, and export comprehensive reports.
                        </p>

                        {/* Feature highlights */}
                        <div className="flex flex-wrap justify-center gap-4 mb-8">
                            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-5 py-3 rounded-full shadow-md hover:shadow-lg transition-shadow" style={{ border: '1px solid rgba(235,229,223,0.5)' }}>
                                <LineChart className="w-5 h-5" style={{ color: '#3B82F6' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>Time Series Plots</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-5 py-3 rounded-full shadow-md hover:shadow-lg transition-shadow" style={{ border: '1px solid rgba(235,229,223,0.5)' }}>
                                <PieChart className="w-5 h-5" style={{ color: '#8B5CF6' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>Statistical Charts</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-5 py-3 rounded-full shadow-md hover:shadow-lg transition-shadow" style={{ border: '1px solid rgba(235,229,223,0.5)' }}>
                                <Table2 className="w-5 h-5" style={{ color: '#BC6C4F' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>CSV Export</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Visualization Component */}
            <DataVisualization />
            </main>

            {/* Scroll Indicator */}
            <ScrollIndicator message="Explore data tools below" />

            {/* Footer */}
            <Footer />
        </div>
    );
}

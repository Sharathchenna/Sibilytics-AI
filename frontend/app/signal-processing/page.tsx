'use client';
import PageLayout from '../components/PageLayout';
import SignalProcessor from '../components/SignalProcessor';
import { Activity, Waves, BarChart3 } from 'lucide-react';

export default function SignalProcessingPage() {
    return (
        <PageLayout>
            {/* Hero Section */}
            <div className="relative py-16 md:py-24" style={{ backgroundColor: '#FDFCF8' }}>
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-fade-in" style={{ backgroundColor: '#DCE3D6', color: '#4A5D3F', fontFamily: 'var(--font-jakarta)' }}>
                            <Activity className="w-4 h-4" />
                            Signal Processing & Feature Extraction
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight animate-fade-in" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                            Wavelet-Based
                            <span style={{ color: '#BC6C4F' }}> Signal Analysis</span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg md:text-xl mb-8 leading-relaxed max-w-3xl mx-auto animate-fade-in" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                            Upload sensor data in .txt, .csv, .xlsx, or .lvm formats and process using the powerful
                            Biorthogonal (bior) wavelet with dynamic decomposition levels (1-20).
                        </p>

                        {/* Feature highlights */}
                        <div className="flex flex-wrap justify-center gap-4 mb-8">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm" style={{ border: '1px solid #EBE5DF' }}>
                                <Waves className="w-5 h-5" style={{ color: '#4A5D3F' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>FFT & STFT Analysis</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm" style={{ border: '1px solid #EBE5DF' }}>
                                <BarChart3 className="w-5 h-5" style={{ color: '#8B5CF6' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>Wavelet Decomposition</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm" style={{ border: '1px solid #EBE5DF' }}>
                                <Activity className="w-5 h-5" style={{ color: '#BC6C4F' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>Feature Extraction</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Signal Processor Component */}
            <SignalProcessor />
        </PageLayout>
    );
}

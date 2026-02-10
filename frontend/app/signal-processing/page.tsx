'use client';
import PageLayout from '../components/PageLayout';
import SignalProcessor from '../components/SignalProcessor';
import { Activity, Waves, BarChart3 } from 'lucide-react';

export default function SignalProcessingPage() {
    return (
        <PageLayout>
            {/* Hero Section */}
            <div className="relative py-16 md:py-24 overflow-hidden" style={{ backgroundColor: '#FDFCF8' }}>
                {/* Animated Blob Background */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-[10%] -right-[5%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" style={{ backgroundColor: '#DCE3D6' }}></div>
                    <div className="absolute top-[30%] -left-[5%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" style={{ backgroundColor: '#F5E6D3' }}></div>
                    <div className="absolute -bottom-[10%] left-[30%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" style={{ backgroundColor: '#E8DDD0' }}></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-6 z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-white/80 border px-4 py-2 rounded-full text-sm font-semibold mb-8 backdrop-blur-sm animate-fade-in" style={{ borderColor: '#DCE3D6', color: '#4A5D3F', fontFamily: 'var(--font-jakarta)' }}>
                            <Activity className="w-4 h-4" />
                            Signal Processing & Feature Extraction
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight animate-fade-in" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                            Wavelet-Based <br />
                            <span className="italic" style={{ color: '#BC6C4F' }}>Signal Analysis</span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg md:text-xl mb-10 leading-relaxed max-w-3xl mx-auto font-light animate-fade-in" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                            Upload sensor data in .txt, .csv, .xlsx, or .lvm formats and process using the powerful
                            Biorthogonal (bior) wavelet with dynamic decomposition levels (1-20).
                        </p>

                        {/* Feature highlights */}
                        <div className="flex flex-wrap justify-center gap-4 mb-8">
                            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-5 py-3 rounded-full shadow-md hover:shadow-lg transition-shadow" style={{ border: '1px solid rgba(235,229,223,0.5)' }}>
                                <Waves className="w-5 h-5" style={{ color: '#4A5D3F' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>FFT & STFT Analysis</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-5 py-3 rounded-full shadow-md hover:shadow-lg transition-shadow" style={{ border: '1px solid rgba(235,229,223,0.5)' }}>
                                <BarChart3 className="w-5 h-5" style={{ color: '#8B5CF6' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>Wavelet Decomposition</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-5 py-3 rounded-full shadow-md hover:shadow-lg transition-shadow" style={{ border: '1px solid rgba(235,229,223,0.5)' }}>
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

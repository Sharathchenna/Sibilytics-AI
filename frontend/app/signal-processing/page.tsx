'use client';
import PageLayout from '../components/PageLayout';
import SignalProcessor from '../components/SignalProcessor';
import { Activity, Waves, BarChart3 } from 'lucide-react';

export default function SignalProcessingPage() {
    return (
        <PageLayout>
            {/* Hero Section */}
            <div className="relative py-16 md:py-24">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-fade-in">
                            <Activity className="w-4 h-4" />
                            Signal Processing & Feature Extraction
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight animate-fade-in">
                            Wavelet-Based
                            <span className="text-emerald-600"> Signal Analysis</span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-3xl mx-auto animate-fade-in">
                            Upload sensor data in .txt, .csv, .xlsx, or .lvm formats and process using the powerful
                            Biorthogonal (bior) wavelet with dynamic decomposition levels (1-20).
                        </p>

                        {/* Feature highlights */}
                        <div className="flex flex-wrap justify-center gap-4 mb-8">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                                <Waves className="w-5 h-5 text-blue-600" />
                                <span className="text-slate-700 font-medium">FFT & STFT Analysis</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                                <BarChart3 className="w-5 h-5 text-purple-600" />
                                <span className="text-slate-700 font-medium">Wavelet Decomposition</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                                <Activity className="w-5 h-5 text-emerald-600" />
                                <span className="text-slate-700 font-medium">Feature Extraction</span>
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

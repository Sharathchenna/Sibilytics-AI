'use client';
import PageLayout from '../components/PageLayout';
import { Download, Usb, Settings, FileText, ArrowRight } from 'lucide-react';

export default function DataAcquisitionPage() {
    return (
        <PageLayout>
            {/* Hero Section */}
            <div className="relative py-16 md:py-24" style={{ backgroundColor: '#F5F0EB' }}>
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-fade-in" style={{ backgroundColor: '#E0F2E9', color: '#4A5D3F', fontFamily: 'var(--font-jakarta)' }}>
                            <Usb className="w-4 h-4" />
                            Data Acquisition System
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight animate-fade-in" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                            NI DAQ
                            <span style={{ color: '#4A5D3F' }}> Integration</span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg md:text-xl mb-8 leading-relaxed max-w-3xl mx-auto animate-fade-in" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                            Record any signal including voltage, current, force, acceleration, pressure, sound, and temperature
                            using National Instruments DAQ devices.
                        </p>

                        {/* Feature highlights */}
                        <div className="flex flex-wrap justify-center gap-4 mb-8">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm" style={{ border: '1px solid #EBE5DF' }}>
                                <Usb className="w-5 h-5" style={{ color: '#4A5D3F' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>NI DAQ Compatible</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm" style={{ border: '1px solid #EBE5DF' }}>
                                <Settings className="w-5 h-5" style={{ color: '#BC6C4F' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>Easy Configuration</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm" style={{ border: '1px solid #EBE5DF' }}>
                                <FileText className="w-5 h-5" style={{ color: '#BC6C4F' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>Documentation Included</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="py-16 bg-white">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12" style={{ border: '1px solid #EBE5DF' }}>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 rounded-xl" style={{ backgroundColor: '#4A5D3F' }}>
                                <Download className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>Signal Acquisition Software</h2>
                                <p style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>Developed by SibilyticsAI</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <p className="text-lg leading-relaxed" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                This data acquisition software can record any signal such as
                                <strong style={{ color: '#4A5D3F' }}> voltage, current, force, acceleration, pressure, sound, temperature</strong>, and more.
                                The only requirement is that the sensor must be connected through any
                                <strong style={{ color: '#4A5D3F' }}> National Instruments (NI) DAQ device</strong>.
                            </p>

                            <div className="rounded-xl p-6" style={{ background: 'linear-gradient(to right, #E0F2E9, #F5F0EB)', border: '1px solid #DCE3D6' }}>
                                <h3 className="font-semibold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>Supported Signals:</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {['Voltage', 'Current', 'Force', 'Acceleration', 'Pressure', 'Sound', 'Temperature', 'Vibration'].map((signal) => (
                                        <div key={signal} className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4A5D3F' }}></div>
                                            <span style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>{signal}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl p-6" style={{ backgroundColor: '#FEF3E7', borderLeft: '4px solid #BC6C4F' }}>
                                <p className="leading-relaxed" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                    Please use the link below to download the software and the instructions.
                                    <strong style={{ color: '#BC6C4F' }}> Kindly read the instructions carefully</strong> to ensure effective signal acquisition.
                                </p>
                            </div>

                            <div className="flex justify-center pt-6">
                                <a
                                    href="https://pub-4b511d5c17ef4b7584e1f710b59f759e.r2.dev/Signal%20acquisition-%20SibilyticsAI.zip"
                                    download
                                    className="inline-flex items-center gap-3 px-8 py-4 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                    style={{ background: 'linear-gradient(to right, #4A5D3F, #BC6C4F)', fontFamily: 'var(--font-jakarta)' }}
                                >
                                    <Download className="w-6 h-6" />
                                    Download Software Package
                                    <ArrowRight className="w-5 h-5" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}

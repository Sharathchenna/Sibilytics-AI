'use client';
import PageLayout from '../components/PageLayout';
import { Download, Usb, Settings, FileText, ArrowRight } from 'lucide-react';

export default function DataAcquisitionPage() {
    return (
        <PageLayout>
            {/* Hero Section */}
            <div className="relative py-16 md:py-24">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-fade-in">
                            <Usb className="w-4 h-4" />
                            Data Acquisition System
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight animate-fade-in">
                            NI DAQ
                            <span className="text-indigo-600"> Integration</span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-3xl mx-auto animate-fade-in">
                            Record any signal including voltage, current, force, acceleration, pressure, sound, and temperature
                            using National Instruments DAQ devices.
                        </p>

                        {/* Feature highlights */}
                        <div className="flex flex-wrap justify-center gap-4 mb-8">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                                <Usb className="w-5 h-5 text-indigo-600" />
                                <span className="text-slate-700 font-medium">NI DAQ Compatible</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                                <Settings className="w-5 h-5 text-blue-600" />
                                <span className="text-slate-700 font-medium">Easy Configuration</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                                <FileText className="w-5 h-5 text-emerald-600" />
                                <span className="text-slate-700 font-medium">Documentation Included</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="py-16 bg-white">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-slate-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-indigo-600 rounded-xl">
                                <Download className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Signal Acquisition Software</h2>
                                <p className="text-slate-600">Developed by SibilyticsAI</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <p className="text-gray-700 text-lg leading-relaxed">
                                This data acquisition software can record any signal such as
                                <strong className="text-indigo-600"> voltage, current, force, acceleration, pressure, sound, temperature</strong>, and more.
                                The only requirement is that the sensor must be connected through any
                                <strong className="text-indigo-600"> National Instruments (NI) DAQ device</strong>.
                            </p>

                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
                                <h3 className="font-semibold text-slate-800 mb-3">Supported Signals:</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {['Voltage', 'Current', 'Force', 'Acceleration', 'Pressure', 'Sound', 'Temperature', 'Vibration'].map((signal) => (
                                        <div key={signal} className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                            <span className="text-slate-700">{signal}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-amber-50 rounded-xl p-6 border-l-4 border-amber-500">
                                <p className="text-gray-700 leading-relaxed">
                                    Please use the link below to download the software and the instructions.
                                    <strong className="text-amber-700"> Kindly read the instructions carefully</strong> to ensure effective signal acquisition.
                                </p>
                            </div>

                            <div className="flex justify-center pt-6">
                                <a
                                    href="https://pub-4b511d5c17ef4b7584e1f710b59f759e.r2.dev/Signal%20acquisition-%20SibilyticsAI.zip"
                                    download
                                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-blue-700 hover:scale-105 shadow-lg hover:shadow-xl transition-all"
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

'use client';
import PageLayout from '../components/PageLayout';
import DataVisualization from '../components/DataVisualization';
import { BarChart3, PieChart, LineChart, Table2 } from 'lucide-react';

export default function DataAnalysisPage() {
    return (
        <PageLayout>
            {/* Hero Section */}
            <div className="relative py-16 md:py-24" style={{ backgroundColor: '#FDFCF8' }}>
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-fade-in" style={{ backgroundColor: '#EFF6FF', color: '#3B82F6', fontFamily: 'var(--font-jakarta)' }}>
                            <BarChart3 className="w-4 h-4" />
                            Data Analysis & Visualization
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight animate-fade-in" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                            Interactive
                            <span style={{ color: '#3B82F6' }}> Data Mining</span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg md:text-xl mb-8 leading-relaxed max-w-3xl mx-auto animate-fade-in" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                            Visualize your data with powerful statistical analysis tools. Create interactive charts,
                            explore correlations, and export comprehensive reports.
                        </p>

                        {/* Feature highlights */}
                        <div className="flex flex-wrap justify-center gap-4 mb-8">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm" style={{ border: '1px solid #EBE5DF' }}>
                                <LineChart className="w-5 h-5" style={{ color: '#3B82F6' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>Time Series Plots</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm" style={{ border: '1px solid #EBE5DF' }}>
                                <PieChart className="w-5 h-5" style={{ color: '#8B5CF6' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>Statistical Charts</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm" style={{ border: '1px solid #EBE5DF' }}>
                                <Table2 className="w-5 h-5" style={{ color: '#BC6C4F' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>CSV Export</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Visualization Component */}
            <DataVisualization />
        </PageLayout>
    );
}

'use client';
import PageLayout from '../components/PageLayout';
import DataVisualization from '../components/DataVisualization';
import { BarChart3, PieChart, LineChart, Table2 } from 'lucide-react';

export default function DataAnalysisPage() {
    return (
        <PageLayout>
            {/* Hero Section */}
            <div className="relative bg-gradient-to-b from-blue-50 to-white py-16 md:py-24">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-fade-in">
                            <BarChart3 className="w-4 h-4" />
                            Data Analysis & Visualization
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight animate-fade-in">
                            Interactive
                            <span className="text-blue-600"> Data Mining</span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-3xl mx-auto animate-fade-in">
                            Visualize your data with powerful statistical analysis tools. Create interactive charts,
                            explore correlations, and export comprehensive reports.
                        </p>

                        {/* Feature highlights */}
                        <div className="flex flex-wrap justify-center gap-4 mb-8">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                                <LineChart className="w-5 h-5 text-blue-600" />
                                <span className="text-slate-700 font-medium">Time Series Plots</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                                <PieChart className="w-5 h-5 text-purple-600" />
                                <span className="text-slate-700 font-medium">Statistical Charts</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                                <Table2 className="w-5 h-5 text-emerald-600" />
                                <span className="text-slate-700 font-medium">CSV Export</span>
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

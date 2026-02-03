'use client';
import PageLayout from '../components/PageLayout';
import SVMClassifier from '../components/SVMClassifier';
import { Brain, Target, TrendingUp, Zap } from 'lucide-react';

export default function MachineLearningPage() {
    return (
        <PageLayout>
            {/* Hero Section */}
            <div className="relative bg-gradient-to-b from-purple-50 to-white py-16 md:py-24">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-fade-in">
                            <Brain className="w-4 h-4" />
                            Machine Learning Module
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight animate-fade-in">
                            SVM-Based
                            <span className="text-purple-600"> Classification</span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-3xl mx-auto animate-fade-in">
                            Leverage Support Vector Machine classification for accurate predictions on your
                            extracted features. Train models, evaluate performance, and make real-time predictions.
                        </p>

                        {/* Feature highlights */}
                        <div className="flex flex-wrap justify-center gap-4 mb-8">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                                <Target className="w-5 h-5 text-purple-600" />
                                <span className="text-slate-700 font-medium">High Accuracy</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                                <span className="text-slate-700 font-medium">Model Training</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                                <Zap className="w-5 h-5 text-emerald-600" />
                                <span className="text-slate-700 font-medium">Real-Time Prediction</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SVM Classifier Component */}
            <SVMClassifier />
        </PageLayout>
    );
}

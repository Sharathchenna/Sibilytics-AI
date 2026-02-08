'use client';
import PageLayout from '../components/PageLayout';
import SVMClassifier from '../components/SVMClassifier';
import { Brain, Target, TrendingUp, Zap } from 'lucide-react';

export default function MachineLearningPage() {
    return (
        <PageLayout>
            {/* Hero Section */}
            <div className="relative py-16 md:py-24" style={{ backgroundColor: '#F5F0EB' }}>
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-fade-in" style={{ backgroundColor: '#F5F0FF', color: '#8B5CF6', fontFamily: 'var(--font-jakarta)' }}>
                            <Brain className="w-4 h-4" />
                            Machine Learning Module
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight animate-fade-in" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                            SVM-Based
                            <span style={{ color: '#8B5CF6' }}> Classification</span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg md:text-xl mb-8 leading-relaxed max-w-3xl mx-auto animate-fade-in" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                            Leverage Support Vector Machine classification for accurate predictions on your
                            extracted features. Train models, evaluate performance, and make real-time predictions.
                        </p>

                        {/* Feature highlights */}
                        <div className="flex flex-wrap justify-center gap-4 mb-8">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm" style={{ border: '1px solid #EBE5DF' }}>
                                <Target className="w-5 h-5" style={{ color: '#8B5CF6' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>High Accuracy</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm" style={{ border: '1px solid #EBE5DF' }}>
                                <TrendingUp className="w-5 h-5" style={{ color: '#BC6C4F' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>Model Training</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm" style={{ border: '1px solid #EBE5DF' }}>
                                <Zap className="w-5 h-5" style={{ color: '#BC6C4F' }} />
                                <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>Real-Time Prediction</span>
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

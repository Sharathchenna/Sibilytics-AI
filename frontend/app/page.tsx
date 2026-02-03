'use client';
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { ArrowRight, Activity, Waves, BarChart3, Download, Brain } from "lucide-react";

export default function Home() {
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  // Fetch visitor count on page load with hybrid tracking
  useEffect(() => {
    const trackVisitor = async () => {
      try {
        let sessionId = localStorage.getItem('visitor_session_id');
        if (!sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('visitor_session_id', sessionId);
        }

        const response = await fetch('https://visitor-counter.ksingh-869.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json() as { count?: number };
        if (data.count !== undefined) {
          setVisitorCount(data.count);
        }
      } catch (error) {
        console.error('Error tracking visitor:', error);
      }
    };

    trackVisitor();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-emerald-50/50 to-white relative">
      {/* Translucent Logo Watermark Overlay */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <Image
          src="/logo-new.jpg"
          alt="Sybilytics Background"
          width={800}
          height={800}
          className="w-[60%] max-w-4xl h-auto object-contain opacity-[0.05]"
          priority
        />
      </div>

      {/* Navigation */}
      <Navbar />

      {/* Hero Section - Modern & Clean */}
      <div className="relative py-20 md:py-32 z-10 pt-32 md:pt-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-8 animate-fade-in">
              <Activity className="w-4 h-4" />
              Advanced AI-Powered Signal Processing
            </div>

            {/* Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight animate-fade-in">
              Feature Extraction and
              <span className="text-emerald-600"> ML-based Prediction</span> Platform
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-3xl mx-auto animate-fade-in">
              Advanced signal processing for sensor data analysis, feature extraction, optimization, and machine learning-based prediction.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
              <Link href="/signal-processing"
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-emerald-700 shadow-sm hover:shadow-md transition-all">
                Try It Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#products"
                className="inline-flex items-center justify-center gap-2 bg-white text-slate-700 border-2 border-slate-300 px-8 py-4 rounded-lg font-semibold text-lg hover:border-slate-400 hover:bg-slate-50 transition-all">
                Explore Products
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="py-20 bg-white relative z-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold">About Sibilytics AI</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
              Intelligent <span className="text-emerald-600">Signal Processing</span><br />
              for Research & Industry
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-md p-8 md:p-10 border border-slate-200">
            <p className="text-gray-700 text-lg leading-relaxed mb-6">
              <strong className="text-emerald-600">Sibilytics AI</strong> is an advanced web-based platform designed for <strong>feature extraction</strong> from sensor and denoised signals, which can subsequently be used for <strong>machine learning-based analyses</strong> such as classification, clustering, and prediction.
            </p>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 mb-6">
              <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-emerald-600" />
                Comprehensive Visualizations
              </h4>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0"></div>
                  <span><strong>Time-domain plots</strong> for both raw and denoised signals</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0"></div>
                  <span><strong>FFT plots</strong> for raw signals, denoised signals, and wavelet coefficients</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0"></div>
                  <span><strong>Wavelet decomposition plots</strong> (approximation & detail coefficients)</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-l-4 border-emerald-600">
              <p className="text-gray-800 text-lg leading-relaxed font-medium">
                A powerful and user-friendly tool for <strong>researchers, engineers, and data analysts</strong> working with time-series sensor data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div id="products" className="py-20 bg-slate-50 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-block mb-4">
              <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold">Our Products</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Comprehensive Signal Analysis Tools</h2>
            <p className="text-slate-600 text-lg">Powerful features for time-series sensor data processing and analysis</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Signal Processing Card */}
            <Link href="/signal-processing" className="group">
              <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 h-full">
                <div className="mb-6 inline-block p-4 bg-emerald-100 rounded-xl group-hover:bg-emerald-600 transition-colors">
                  <Activity className="w-10 h-10 text-emerald-600 group-hover:text-white transition-colors" />
                </div>
                <h4 className="text-2xl font-bold mb-4 text-gray-800 group-hover:text-emerald-600 transition-colors">
                  Signal Processing
                </h4>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Wavelet-based feature extraction with time-domain visualization, FFT analysis, and comprehensive statistical features.
                </p>
                <span className="text-emerald-600 font-semibold inline-flex items-center gap-2">
                  Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>

            {/* Machine Learning Card */}
            <Link href="/machine-learning" className="group">
              <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 h-full">
                <div className="mb-6 inline-block p-4 bg-purple-100 rounded-xl group-hover:bg-purple-600 transition-colors">
                  <Brain className="w-10 h-10 text-purple-600 group-hover:text-white transition-colors" />
                </div>
                <h4 className="text-2xl font-bold mb-4 text-gray-800 group-hover:text-purple-600 transition-colors">
                  Machine Learning
                </h4>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  SVM classification and prediction module with interactive visualizations and model training capabilities.
                </p>
                <span className="text-purple-600 font-semibold inline-flex items-center gap-2">
                  Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>

            {/* Data Analysis Card */}
            <Link href="/data-analysis" className="group">
              <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 h-full">
                <div className="mb-6 inline-block p-4 bg-blue-100 rounded-xl group-hover:bg-blue-600 transition-colors">
                  <BarChart3 className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <h4 className="text-2xl font-bold mb-4 text-gray-800 group-hover:text-blue-600 transition-colors">
                  Data Analysis
                </h4>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Statistical analysis and visualization tools for comprehensive data exploration and insights.
                </p>
                <span className="text-blue-600 font-semibold inline-flex items-center gap-2">
                  Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>

            {/* Data Acquisition Card */}
            <Link href="/data-acquisition" className="group">
              <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 h-full">
                <div className="mb-6 inline-block p-4 bg-indigo-100 rounded-xl group-hover:bg-indigo-600 transition-colors">
                  <Download className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors" />
                </div>
                <h4 className="text-2xl font-bold mb-4 text-gray-800 group-hover:text-indigo-600 transition-colors">
                  Data Acquisition
                </h4>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  NI DAQ integration software for recording voltage, current, force, acceleration, and more.
                </p>
                <span className="text-indigo-600 font-semibold inline-flex items-center gap-2">
                  Download <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer visitorCount={visitorCount} />
    </div>
  );
}

'use client';
import { useState, useEffect } from "react";
import Image from "next/image";
import SignalProcessor from "./components/SignalProcessor";
import SVMClassifier from "./components/SVMClassifier";
import DataVisualization from "./components/DataVisualization";
import { Menu, X, Mail, ArrowRight, MapPin, Loader2, CheckCircle, Activity, Waves, BarChart3, Download, Image as ImageIcon, Calculator, Brain } from "lucide-react";

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  // Fetch visitor count on page load with hybrid tracking
  useEffect(() => {
    const trackVisitor = async () => {
      try {
        // Get or create a session ID in localStorage
        let sessionId = localStorage.getItem('visitor_session_id');
        if (!sessionId) {
          // Generate a unique session ID
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('visitor_session_id', sessionId);
        }

        // Send POST request to standalone worker
        const response = await fetch('https://visitor-counter.ksingh-869.workers.dev', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json() as {
          count?: number;
          success?: boolean;
          counted?: boolean;
          message?: string;
          debug?: any;
        };

        if (data.count !== undefined) {
          setVisitorCount(data.count);
        }

        // Log debug information
        console.log('=== Visitor Counter Debug Info ===');
        console.log('Count:', data.count);
        console.log('Counted this visit:', data.counted);
        console.log('Message:', data.message);
        if (data.debug) {
          console.log('KV Debug:', data.debug);
        }
        console.log('================================');

        // Optional: Log whether this visit was counted (for debugging)
        if (data.counted) {
          console.log('✅ New unique visitor counted');
        } else {
          console.log('ℹ️ Already counted in the last week');
        }
      } catch (error) {
        console.error('Error tracking visitor:', error);
      }
    };

    trackVisitor();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error for this field
    if (formErrors[e.target.name]) {
      setFormErrors({ ...formErrors, [e.target.name]: '' });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) errors.phone = 'Phone is required';
    if (!formData.subject.trim()) errors.subject = 'Subject is required';
    if (!formData.message.trim()) errors.message = 'Message is required';

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json() as { error?: string; success?: boolean };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setSubmitSuccess(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      console.error('Submission error:', error);
      setFormErrors({
        submit: error instanceof Error ? error.message : 'Failed to send message. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative">
      {/* Translucent Logo Watermark Overlay */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <Image
          src="/logo1.png"
          alt="Sybilytics Background"
          width={800}
          height={800}
          className="w-[60%] max-w-4xl h-auto object-contain opacity-[0.03]"
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="border-b border-slate-200 sticky top-0 z-50 backdrop-blur-sm relative" style={{ backgroundColor: '#FDFEFE' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16 sm:h-18 md:h-20">
            {/* Logo */}
            <a href="#" className="flex items-center hover:opacity-80 transition-opacity py-2">
              <img
                src="/logo.svg"
                alt="Sybilytics.ai"
                className="w-32 h-auto object-contain sm:w-36 md:w-40 lg:w-44"
              />
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 ml-auto pl-12">
              <a href="#" className="text-slate-700 hover:text-emerald-600 font-medium transition-colors">
                Home
              </a>
              <a href="#solutions" className="text-slate-700 hover:text-emerald-600 font-medium transition-colors">
                Solutions
              </a>
              <a href="#signal-processing" className="font-medium transition-colors" style={{ color: '#9333ea' }}>
                Signal analysis & feature extraction
              </a>
              <a href="#svm-classification" className="font-medium transition-colors" style={{ color: '#9333ea' }}>
                Machine Learning Module
              </a>
              <a href="#data-analysis" className="font-medium transition-colors" style={{ color: '#9333ea' }}>
                Data Mining
              </a>
              <a href="#contact" className="text-slate-700 hover:text-emerald-600 font-medium transition-colors">
                Contact
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 shadow-lg animate-fade-in" style={{ backgroundColor: '#FDFEFE' }}>
            <div className="px-4 py-4 space-y-3">
              <a href="#" onClick={() => setMobileMenuOpen(false)}
                 className="block text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 font-medium py-2 px-4 rounded-lg transition-colors">
                Home
              </a>
              <a href="#solutions" onClick={() => setMobileMenuOpen(false)}
                 className="block text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 font-medium py-2 px-4 rounded-lg transition-colors">
                Solutions
              </a>
              <a href="#signal-processing" onClick={() => setMobileMenuOpen(false)}
                 className="block hover:bg-purple-50 font-medium py-2 px-4 rounded-lg transition-colors" style={{ color: '#9333ea' }}>
                Signal analysis & feature extraction
              </a>
              <a href="#svm-classification" onClick={() => setMobileMenuOpen(false)}
                 className="block hover:bg-purple-50 font-medium py-2 px-4 rounded-lg transition-colors" style={{ color: '#9333ea' }}>
                Machine Learning Module
              </a>
              <a href="#data-analysis" onClick={() => setMobileMenuOpen(false)}
                 className="block hover:bg-purple-50 font-medium py-2 px-4 rounded-lg transition-colors" style={{ color: '#9333ea' }}>
                Data Mining
              </a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)}
                 className="block text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 font-medium py-2 px-4 rounded-lg transition-colors">
                Contact
              </a>
              <div className="flex items-center justify-center gap-4 pt-3 border-t border-gray-200">
                <a href="mailto:sybilyticsai@gmail.com" className="flex items-center gap-2 text-gray-700 hover:text-emerald-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">Email Us</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Modern & Clean */}
      <div className="relative bg-gradient-to-b from-emerald-50 to-white py-20 md:py-32 z-10">
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
              <a href="#signal-processing"
                 className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-emerald-700 shadow-sm hover:shadow-md transition-all">
                Try It Now
                <ArrowRight className="w-5 h-5" />
              </a>
              <a href="#solutions"
                 className="inline-flex items-center justify-center gap-2 bg-white text-slate-700 border-2 border-slate-300 px-8 py-4 rounded-lg font-semibold text-lg hover:border-slate-400 hover:bg-slate-50 transition-all">
                Explore Solutions
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
              Users can upload signal data in <span className="font-semibold">.txt</span>, <span className="font-semibold">.csv</span>, <span className="font-semibold">.xlsx</span>, or <span className="font-semibold">.lvm</span> formats, which can then be processed using the powerful <strong>Biorthogonal (bior) wavelet</strong>.
              The application offers dynamic control over the wavelet decomposition level (1–20), providing flexibility to accommodate diverse analysis requirements.
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
                  <span><strong>STFT spectrograms</strong> for both raw and denoised signals</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0"></div>
                  <span><strong>FFT plots</strong> for raw signals, denoised signals, and wavelet coefficients</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0"></div>
                  <span><strong>Wavelet decomposition plots</strong> (approximation & detail coefficients)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0"></div>
                  <span><strong>Correlation plots</strong> (approximation & detail coefficients)</span>
                </li>
              </ul>
            </div>

            <p className="text-gray-700 text-lg leading-relaxed mb-6">
              Users can <strong>download any plot as a PNG image</strong> for presentations and reports. Beyond visualization, the app extracts <strong>statistical, energy-based, and entropy-based features</strong> from both signal versions, with the option to download the features as CSV files for further analysis.
            </p>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-l-4 border-emerald-600">
              <p className="text-gray-800 text-lg leading-relaxed font-medium">
                <strong className="text-emerald-600">Sibilytics AI</strong> is a powerful and user-friendly tool for <strong>researchers, engineers, and data analysts</strong> working with time-series sensor data and looking to perform fast, interactive, and insightful signal processing.
              </p>
            </div>

            <div className="mt-8 text-center">
              <a href="#solutions"
                 className="inline-block bg-emerald-600 text-white px-10 py-4 rounded-lg font-bold text-lg hover:bg-emerald-700 hover:scale-105 shadow-lg hover:shadow-xl transition-all">
                Explore Features
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Solutions Section */}
      <div id="solutions" className="py-20 bg-slate-50 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-block mb-4">
              <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold">Platform Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Comprehensive Signal Analysis Tools</h2>
            <p className="text-slate-600 text-lg">Powerful features for time-series sensor data processing and analysis</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Card 1 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 group">
              <div className="mb-6 inline-block p-4 bg-emerald-100 rounded-xl group-hover:bg-emerald-600 transition-colors">
                <Activity className="w-10 h-10 text-emerald-600 group-hover:text-white transition-colors" />
              </div>
              <h4 className="text-xl font-bold mb-4 text-gray-800 group-hover:text-emerald-600 transition-colors">
                Time-Domain Visualization
              </h4>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Comprehensive time-domain plots for both raw and denoised signals with interactive visualization and downloadable PNG exports.
              </p>
              <a href="#signal-processing" className="text-emerald-600 font-semibold hover:text-emerald-700 inline-flex items-center gap-2 group/link">
                Try It Now <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-500 group">
              <div className="mb-6 inline-block p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                <Waves className="w-10 h-10 text-white" />
              </div>
              <h4 className="text-xl font-bold mb-4 text-gray-800 group-hover:text-blue-600 transition-colors">
                Wavelet Decomposition
              </h4>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Dynamic wavelet analysis with 1-20 decomposition levels using Biorthogonal wavelets for advanced signal processing.
              </p>
              <a href="#signal-processing" className="text-blue-600 font-semibold hover:text-blue-700 inline-flex items-center gap-2 group/link">
                Explore <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Feature Card 3 */}
            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-purple-500 group">
              <div className="mb-6 inline-block p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl group-hover:scale-110 transition-transform">
                <BarChart3 className="w-10 h-10 text-white" />
              </div>
              <h4 className="text-xl font-bold mb-4 text-gray-800 group-hover:text-purple-600 transition-colors">
                FFT Analysis
              </h4>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Fast Fourier Transform plots for raw signals, denoised signals, and wavelet coefficients with frequency domain insights.
              </p>
              <a href="#signal-processing" className="text-purple-600 font-semibold hover:text-purple-700 inline-flex items-center gap-2 group/link">
                Analyze <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Feature Card 4 */}
            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-orange-500 group">
              <div className="mb-6 inline-block p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl group-hover:scale-110 transition-transform">
                <ImageIcon className="w-10 h-10 text-white" />
              </div>
              <h4 className="text-xl font-bold mb-4 text-gray-800 group-hover:text-orange-600 transition-colors">
                STFT Spectrograms
              </h4>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Time-frequency spectrograms using Short-Time Fourier Transform for both raw and denoised signals with heatmap visualization.
              </p>
              <a href="#signal-processing" className="text-orange-600 font-semibold hover:text-orange-700 inline-flex items-center gap-2 group/link">
                Visualize <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Feature Card 5 */}
            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-teal-500 group">
              <div className="mb-6 inline-block p-4 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl group-hover:scale-110 transition-transform">
                <Calculator className="w-10 h-10 text-white" />
              </div>
              <h4 className="text-xl font-bold mb-4 text-gray-800 group-hover:text-teal-600 transition-colors">
                Statistical Features
              </h4>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Extract comprehensive statistical, energy-based, and entropy-based features with downloadable CSV reports.
              </p>
              <a href="#signal-processing" className="text-teal-600 font-semibold hover:text-teal-700 inline-flex items-center gap-2 group/link">
                Extract <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Feature Card 6 */}
            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-indigo-500 group">
              <div className="mb-6 inline-block p-4 bg-gradient-to-br from-indigo-500 to-blue-700 rounded-2xl group-hover:scale-110 transition-transform">
                <Download className="w-10 h-10 text-white" />
              </div>
              <h4 className="text-xl font-bold mb-4 text-gray-800 group-hover:text-indigo-600 transition-colors">
                Multi-Format Support
              </h4>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Upload .txt and .lvm files with correlation plots (approximation & detail coefficients) and batch processing capabilities.
              </p>
              <a href="#signal-processing" className="text-indigo-600 font-semibold hover:text-indigo-700 inline-flex items-center gap-2 group/link">
                Upload <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Signal Processing Section */}
      <SignalProcessor />

      {/* SVM Classification Section */}
      <SVMClassifier />

      {/* Data Analysis Section */}
      <DataVisualization />

      {/* Get in Touch Section */}
      <div id="contact" className="py-20 bg-gradient-to-b from-white to-gray-50 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-block mb-4">
              <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold">Contact Us</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              Get in Touch
            </h2>
            <p className="text-gray-600 text-lg">
              Send us an email or give us a call. We're here to help with your data science needs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Send us a Message</h3>

              {submitSuccess && (
                <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg flex items-center gap-3 animate-fade-in">
                  <CheckCircle className="w-5 h-5" />
                  <p className="font-medium">Thank you! Your message has been sent successfully.</p>
                </div>
              )}

              {formErrors.submit && (
                <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center gap-3 animate-fade-in">
                  <Mail className="w-5 h-5" />
                  <p className="font-medium">{formErrors.submit}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your Name *"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
                  />
                  {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
                </div>

                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address *"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
                  />
                  {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
                </div>

                <div>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number *"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border ${formErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
                  />
                  {formErrors.phone && <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>}
                </div>

                <div>
                  <input
                    type="text"
                    name="subject"
                    placeholder="Subject *"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border ${formErrors.subject ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
                  />
                  {formErrors.subject && <p className="mt-1 text-sm text-red-600">{formErrors.subject}</p>}
                </div>

                <div>
                  <textarea
                    name="message"
                    placeholder="Your Message *"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={5}
                    className={`w-full px-4 py-3 border ${formErrors.message ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none`}
                  />
                  {formErrors.message && <p className="mt-1 text-sm text-red-600">{formErrors.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-lg font-bold text-lg hover:from-emerald-700 hover:to-teal-700 hover:scale-105 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Contact Us
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-8 rounded-2xl text-white shadow-xl">
                <h3 className="text-2xl text-white font-bold mb-6">Contact Information</h3>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    
                    
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-white">Email</h4>
                      <a href="mailto:sybilyticsai@gmail.com" className="text-white hover:text-emerald-100 text-lg transition-colors font-medium break-all">
                        sybilyticsai@gmail.com
                      </a>
                    </div>
                  </div>
                </div>

                <a href="https://www.google.com/maps/place/BITS+Pilani+Hyderabad+Campus" target="_blank" rel="noopener noreferrer"
                   className="mt-8 w-full bg-white text-emerald-600 py-3 rounded-lg font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
                  <MapPin className="w-5 h-5" />
                  View on Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-10 mb-12">
            {/* Company Info */}
            <div className="md:col-span-2">
              <div className="flex items-center mb-6">
                <img
                  src="/logo-footer.png"
                  alt="Sybilytics.ai"
                  className="w-40 h-auto object-contain sm:w-44 md:w-48 lg:w-52"
                />
              </div>
              <p className="text-white text-sm leading-relaxed mb-6">
                Advanced signal processing platform for wavelet-based feature extraction from sensor signals.
                A powerful tool for researchers, engineers, and data analysts working with time-series data.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <a href="mailto:sybilyticsai@gmail.com" className="text-white hover:text-emerald-400 transition-colors text-sm font-medium break-all">
                    sybilyticsai@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-2xl font-bold mb-8 text-white">Quick Links</h4>
              <ul className="space-y-3 text-sm mt-3">
                <li><a href="#" className="text-gray-400 hover:text-white hover:translate-x-1 inline-block transition-all">Home</a></li>
                <li><a href="#solutions" className="text-gray-400 hover:text-white hover:translate-x-1 inline-block transition-all">Solutions</a></li>
                <li><a href="#signal-processing" className="text-gray-400 hover:text-purple-400 hover:translate-x-1 inline-block transition-all">Signal Processing & feature extraction</a></li>
                <li><a href="#svm-classification" className="text-gray-400 hover:text-purple-400 hover:translate-x-1 inline-block transition-all">Machine Learning Module</a></li>
                <li><a href="#data-analysis" className="text-gray-400 hover:text-purple-400 hover:translate-x-1 inline-block transition-all">Data Mining</a></li>
                <li><a href="#contact" className="text-gray-400 hover:text-white hover:translate-x-1 inline-block transition-all">Contact</a></li>
              </ul>
            </div>

          </div>

          {/* Copyright */}
          <div className="border-t border-gray-700 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Sibilytics AI. All rights reserved.
            </p>
            {visitorCount !== null && (
              <p className="text-gray-500 text-xs mt-3 flex items-center justify-center gap-2">
                <Activity className="w-3 h-3" />
                <span>Unique Visitors: <span className="font-semibold text-emerald-400">{visitorCount.toLocaleString()}</span></span>
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

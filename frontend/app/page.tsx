'use client';
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollIndicator from "./components/ScrollIndicator";
import { ArrowRight, Activity, BarChart2, Cpu, Users, Zap, Database } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-b from-[#FDFCF8] via-[#FDFCF8] to-white relative">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section - Earth Toned with Animated Blobs */}
      <div className="relative pt-40 pb-20 lg:pt-52 lg:pb-32 overflow-hidden" style={{ backgroundColor: '#FDFCF8' }}>
        {/* Animated Blob Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" style={{ backgroundColor: '#F5F0EB' }}></div>
          <div className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" style={{ backgroundColor: '#E8DCCF' }}></div>
          <div className="absolute -bottom-[20%] left-[20%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" style={{ backgroundColor: '#FBECE6' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/80 border px-4 py-1.5 rounded-full shadow-sm mb-8 backdrop-blur-sm" style={{ borderColor: '#EBE5DF' }}>
            <Activity className="w-4 h-4" style={{ color: '#BC6C4F' }} aria-hidden="true" />
            <span className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#786B61' }}>Advanced AI-Powered Signal Processing</span>
          </div>

          {/* Heading with Playfair Display */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
            Feature Extraction and <br />
            <span className="italic" style={{ color: '#BC6C4F' }}>ML-based Prediction</span> Platform
          </h1>

          {/* Description */}
          <div className="w-full flex justify-center">
            <p className="text-lg md:text-xl max-w-3xl mb-10 leading-relaxed font-light text-center" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
              Advanced signal processing for sensor data analysis, feature extraction, optimization, and machine learning-based prediction.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signal-processing"
              className="w-full sm:w-auto bg-[#BC6C4F] hover:bg-[#A05A41] text-white px-8 py-4 rounded-full text-base font-semibold transition-all shadow-xl hover:shadow-orange-900/20 flex items-center justify-center gap-2 cursor-pointer"
              aria-label="Try signal processing now">
              Try It Now
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
            <a href="#products"
              className="w-full sm:w-auto bg-white text-[#3D342B] hover:bg-[#F5F0EB] px-8 py-4 rounded-full text-base font-semibold transition-all shadow-md flex items-center justify-center" style={{ border: '1px solid #EBE5DF' }}>
              Explore Products
            </a>
          </div>

          {/* Glass Card Mockup - Desktop Only */}
          <div 
            className="mt-20 relative mx-auto max-w-5xl rounded-2xl overflow-hidden shadow-2xl bg-white/40 backdrop-blur-sm p-4 hidden md:block transform hover:scale-[1.01] transition-transform duration-700" 
            style={{ border: '1px solid rgba(255,255,255,0.5)' }}
            aria-label="Platform dashboard preview"
            role="img"
          >
            <div className="rounded-xl bg-white overflow-hidden shadow-inner" style={{ border: '1px solid rgba(235,229,223,0.5)' }}>
              {/* Browser Chrome */}
              <div className="h-12 flex items-center px-4 gap-2" style={{ backgroundColor: '#FDFCF8', borderBottom: '1px solid #EBE5DF' }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E5B8A5' }}></div>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#D4C3B5' }}></div>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C2CDC3' }}></div>
                </div>
                <div className="ml-4 h-6 w-64 rounded-full opacity-50" style={{ backgroundColor: '#F5F0EB' }}></div>
              </div>
              {/* Dashboard Content */}
              <div className="p-8 grid grid-cols-12 gap-6 h-[400px] bg-gradient-to-br from-white" style={{ backgroundImage: 'linear-gradient(to bottom right, white, #FDFCF8)' }}>
                <div className="col-span-3 space-y-4">
                  <div className="h-8 w-3/4 rounded animate-pulse" style={{ backgroundColor: 'rgba(245,240,235,0.5)' }}></div>
                  <div className="h-4 w-1/2 rounded animate-pulse" style={{ backgroundColor: 'rgba(245,240,235,0.3)' }}></div>
                  <div className="space-y-2 mt-8">
                    <div className="h-12 w-full rounded-lg flex items-center px-3" style={{ backgroundColor: 'rgba(188,108,79,0.1)', border: '1px solid rgba(188,108,79,0.2)' }}>
                      <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: '#BC6C4F' }}></div>
                      <div className="h-2 w-20 rounded" style={{ backgroundColor: 'rgba(188,108,79,0.2)' }}></div>
                    </div>
                    <div className="h-12 w-full bg-white rounded-lg flex items-center px-3" style={{ border: '1px solid #EBE5DF' }}>
                      <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: 'rgba(120,107,97,0.3)' }}></div>
                      <div className="h-2 w-20 rounded" style={{ backgroundColor: 'rgba(120,107,97,0.1)' }}></div>
                    </div>
                    <div className="h-12 w-full bg-white rounded-lg flex items-center px-3" style={{ border: '1px solid #EBE5DF' }}>
                      <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: 'rgba(120,107,97,0.3)' }}></div>
                      <div className="h-2 w-20 rounded" style={{ backgroundColor: 'rgba(120,107,97,0.1)' }}></div>
                    </div>
                  </div>
                </div>
                <div className="col-span-9 bg-white rounded-xl shadow-sm p-6 relative overflow-hidden" style={{ border: '1px solid rgba(235,229,223,0.3)' }}>
                  {/* Signal Visualization */}
                  <svg className="w-full h-full" style={{ color: 'rgba(188,108,79,0.2)' }} preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true">
                    <path d="M0,50 Q10,20 20,50 T40,50 T60,50 T80,50 T100,50" fill="none" stroke="currentColor" strokeWidth="2"></path>
                    <path d="M0,50 Q15,80 30,50 T60,50 T90,50" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5"></path>
                  </svg>
                  <div className="absolute bottom-6 left-6 right-6 h-32 bg-gradient-to-t from-white via-white/80 to-transparent flex items-end justify-between">
                    <div className="space-y-2">
                      <div className="h-2 w-32 rounded" style={{ backgroundColor: '#EBE5DF' }}></div>
                      <div className="h-2 w-20 rounded" style={{ backgroundColor: 'rgba(235,229,223,0.5)' }}></div>
                    </div>
                    <div className="h-10 w-32 rounded-lg shadow-lg flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#BC6C4F' }}>Analyze Signal</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Section - Earth Toned */}
      <div className="py-24 relative" style={{ backgroundColor: '#FDFCF8' }}>
        <div className="max-w-7xl mx-auto px-6">
          {/* Badge and Heading */}
          <div className="text-center mb-16">
            <span className="bg-[#DCE3D6] text-[#4A5D3F] px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase inline-block mb-6" style={{ fontFamily: 'var(--font-jakarta)' }}>About Sibilytics AI</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
              Intelligent <span style={{ color: '#BC6C4F' }}>Signal Processing</span> <br />
              for Research & Industry
            </h2>
            <div className="w-24 h-1 mx-auto rounded-full opacity-60" style={{ backgroundColor: '#BC6C4F' }}></div>
          </div>

          {/* Main Content Card */}
          <div className="bg-white rounded-[2rem] p-8 md:p-12 lg:p-16 shadow-xl relative overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.6)' }}>
            {/* Decorative Blob */}
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4" style={{ backgroundColor: '#FDFCF8' }}></div>

            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <p className="text-lg leading-relaxed" style={{ color: '#786B61' }}>
                  <strong style={{ color: '#3D342B', fontWeight: 'bold' }}>Sibilytics AI</strong> is an advanced web-based platform designed for <strong style={{ color: '#3D342B' }}>feature extraction</strong> from sensor and denoised signals, which can subsequently be used for <strong style={{ color: '#3D342B' }}>machine learning-based analyses</strong> such as classification, clustering, and prediction.
                </p>

                {/* Visualization Features Card */}
                <div className="rounded-2xl p-8" style={{ backgroundColor: '#F2F6F0', border: '1px solid #E1E8DD' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-white p-2 rounded-lg shadow-sm" aria-hidden="true">
                      <BarChart2 className="w-6 h-6" style={{ color: '#5D7052' }} />
                    </div>
                    <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>Comprehensive Visualizations</h3>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full" style={{ backgroundColor: '#5D7052' }}></div>
                      <span style={{ color: '#786B61' }}><strong style={{ color: '#3D342B' }}>Time-domain plots</strong> for both raw and denoised signals</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full" style={{ backgroundColor: '#5D7052' }}></div>
                      <span style={{ color: '#786B61' }}><strong style={{ color: '#3D342B' }}>FFT plots</strong> for raw signals, denoised signals, and wavelet coefficients</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full" style={{ backgroundColor: '#5D7052' }}></div>
                      <span style={{ color: '#786B61' }}><strong style={{ color: '#3D342B' }}>Wavelet decomposition plots</strong> (approximation & detail coefficients)</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                {/* Quote Block */}
                <div className="p-8 rounded-2xl relative" style={{ backgroundColor: '#FAF7F5', borderLeft: '4px solid #BC6C4F' }}>
                  <p className="text-xl font-medium italic leading-relaxed" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                    &quot;A powerful and user-friendly tool for researchers, engineers, and data analysts working with time-series sensor data.&quot;
                  </p>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="p-6 rounded-xl text-center hover:shadow-lg transition-shadow" style={{ backgroundColor: '#FDFCF8', border: '1px solid #EBE5DF' }}>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm" aria-hidden="true">
                      <Users className="w-6 h-6" style={{ color: '#BC6C4F' }} />
                    </div>
                    <h4 className="font-bold" style={{ color: '#3D342B' }}>Collaborative</h4>
                  </div>
                  <div className="p-6 rounded-xl text-center hover:shadow-lg transition-shadow" style={{ backgroundColor: '#FDFCF8', border: '1px solid #EBE5DF' }}>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm" aria-hidden="true">
                      <Zap className="w-6 h-6" style={{ color: '#BC6C4F' }} />
                    </div>
                    <h4 className="font-bold" style={{ color: '#3D342B' }}>Real-time</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <ScrollIndicator message="Discover our products" />

      {/* Products Section */}
      <div id="products" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          {/* Badge and Heading */}
          <div className="text-center mb-16">
            <span className="px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase inline-block mb-6" style={{ backgroundColor: '#EBE5DF', color: '#786B61', fontFamily: 'var(--font-jakarta)' }}>Our Products</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>Comprehensive Signal Analysis Tools</h2>
            <p className="text-lg" style={{ color: '#786B61' }}>Powerful features for time-series sensor data processing and analysis</p>
          </div>

          {/* Products Grid - 2x2 */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Signal Processing */}
            <div className="group rounded-2xl p-10 relative overflow-hidden hover:shadow-2xl transition-all duration-300" style={{ backgroundColor: '#FDFCF8', border: '1px solid #F3EFEA' }}>
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity" aria-hidden="true">
                <Activity className="w-32 h-32" style={{ color: '#BC6C4F' }} />
              </div>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#E8F3E9' }} aria-hidden="true">
                <Activity className="w-8 h-8" style={{ color: '#4A5D3F' }} />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-[#BC6C4F] transition-colors" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>Signal Processing</h3>
              <p className="mb-8 leading-relaxed" style={{ color: '#786B61' }}>
                Wavelet-based feature extraction with time-domain visualization, FFT analysis, and comprehensive statistical features.
              </p>
              <Link href="/signal-processing" className="inline-flex items-center font-semibold transition-colors" style={{ color: '#4A5D3F' }} aria-label="Explore signal processing">
                Explore
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>

            {/* Machine Learning */}
            <div className="group rounded-2xl p-10 relative overflow-hidden hover:shadow-2xl transition-all duration-300" style={{ backgroundColor: '#FDFCF8', border: '1px solid #F3EFEA' }}>
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity" aria-hidden="true">
                <Cpu className="w-32 h-32" style={{ color: '#BC6C4F' }} />
              </div>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#F5F0FF' }} aria-hidden="true">
                <Cpu className="w-8 h-8" style={{ color: '#8B5CF6' }} />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-[#BC6C4F] transition-colors" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>Machine Learning</h3>
              <p className="mb-8 leading-relaxed" style={{ color: '#786B61' }}>
                SVM classification and prediction module with interactive visualizations and model training capabilities.
              </p>
              <Link href="/machine-learning" className="inline-flex items-center font-semibold transition-colors" style={{ color: '#8B5CF6' }} aria-label="Explore machine learning">
                Explore
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>

            {/* Data Analysis */}
            <div className="group rounded-2xl p-10 relative overflow-hidden hover:shadow-2xl transition-all duration-300" style={{ backgroundColor: '#FDFCF8', border: '1px solid #F3EFEA' }}>
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity" aria-hidden="true">
                <BarChart2 className="w-32 h-32" style={{ color: '#BC6C4F' }} />
              </div>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#EFF6FF' }} aria-hidden="true">
                <BarChart2 className="w-8 h-8" style={{ color: '#3B82F6' }} />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-[#BC6C4F] transition-colors" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>Data Analysis</h3>
              <p className="mb-8 leading-relaxed" style={{ color: '#786B61' }}>
                Statistical analysis and visualization tools for comprehensive data exploration and insights.
              </p>
              <Link href="/data-analysis" className="inline-flex items-center font-semibold transition-colors" style={{ color: '#3B82F6' }} aria-label="Explore data analysis">
                Explore
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>

            {/* Data Acquisition */}
            <div className="group rounded-2xl p-10 relative overflow-hidden hover:shadow-2xl transition-all duration-300" style={{ backgroundColor: '#FDFCF8', border: '1px solid #F3EFEA' }}>
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity" aria-hidden="true">
                <Database className="w-32 h-32" style={{ color: '#BC6C4F' }} />
              </div>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#FFF4F0' }} aria-hidden="true">
                <Database className="w-8 h-8" style={{ color: '#BC6C4F' }} />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-[#BC6C4F] transition-colors" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>Data Acquisition</h3>
              <p className="mb-8 leading-relaxed" style={{ color: '#786B61' }}>
                NI DAQ integration software for recording voltage, current, force, acceleration, and more.
              </p>
              <Link href="/data-acquisition" className="inline-flex items-center font-semibold transition-colors" style={{ color: '#BC6C4F' }} aria-label="Download data acquisition software">
                Download
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer visitorCount={visitorCount} />
    </div>
  );
}

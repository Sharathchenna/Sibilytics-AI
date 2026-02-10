'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #FDFCF8, #F5F0EB)' }}>
      {/* Animated Blob Backgrounds */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob" style={{ backgroundColor: '#F5E6D3' }}></div>
        <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000" style={{ backgroundColor: '#E0E7D6' }}></div>
        <div className="absolute -bottom-[10%] left-[40%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-4000" style={{ backgroundColor: '#EBE5DF' }}></div>
      </div>

      {/* Content */}
      <div className="text-center px-4 relative z-10">
        <h1 className="text-8xl md:text-9xl font-bold mb-4 animate-fade-in" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>404</h1>
        <h2 className="text-3xl md:text-4xl font-semibold mb-6 animate-fade-in" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
          Page <span className="italic" style={{ color: '#BC6C4F' }}>Not Found</span>
        </h2>
        <p className="text-lg md:text-xl mb-10 max-w-md mx-auto font-light animate-fade-in" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-lg hover:shadow-xl animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, #BC6C4F, #A05A41)',
            color: '#FFFFFF',
            fontFamily: 'var(--font-jakarta)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(188, 108, 79, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(188, 108, 79, 0.3)';
          }}
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}









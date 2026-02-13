'use client';
import { ChevronDown, ChevronsDown } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ScrollIndicatorProps {
  message?: string;
  className?: string;
}

export default function ScrollIndicator({ 
  message = "Scroll to explore", 
  className = "" 
}: ScrollIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Hide the indicator after scrolling down 100px
      if (window.scrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 100,
      behavior: 'smooth'
    });
  };

  return (
    <>
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        @keyframes pulse-ring {
          0% { 
            transform: scale(0.95);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.7;
          }
          100% { 
            transform: scale(0.95);
            opacity: 1;
          }
        }
        
        @keyframes slide-down {
          0%, 100% { transform: translateY(0px); opacity: 0.6; }
          50% { transform: translateY(6px); opacity: 1; }
        }
        
        @keyframes glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        
        .scroll-indicator-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .scroll-indicator-ring {
          animation: pulse-ring 2s ease-in-out infinite;
        }
        
        .scroll-chevron-1 {
          animation: slide-down 1.5s ease-in-out infinite;
        }
        
        .scroll-chevron-2 {
          animation: slide-down 1.5s ease-in-out infinite 0.2s;
        }
        
        .scroll-glow {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>
      
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        } ${className}`}
      >
        <div className="scroll-indicator-float">
          {/* Outer glow ring - subtle */}
          <div 
            className="absolute inset-0 rounded-full blur-lg scroll-glow pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(188,108,79,0.2) 0%, rgba(188,108,79,0) 70%)',
              transform: 'scale(1.2)',
            }}
          />
          
          {/* Pulsing ring effect */}
          <div 
            className="absolute inset-0 rounded-full scroll-indicator-ring pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(188,108,79,0.08) 0%, rgba(139,92,246,0.08) 100%)',
              border: '1px solid rgba(188,108,79,0.15)',
            }}
          />
          
          {/* Main button - compact */}
          <button
            onClick={scrollToContent}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative flex items-center gap-1.5 px-4 py-2 rounded-full cursor-pointer group overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,252,248,0.88) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(188,108,79,0.2)',
              boxShadow: `
                0 4px 16px rgba(188,108,79,0.12),
                0 1px 4px rgba(120,107,97,0.08),
                inset 0 1px 0 rgba(255,255,255,0.8)
              `,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isHovered ? 'translateY(-1px) scale(1.02)' : 'translateY(0) scale(1)',
            }}
            aria-label="Scroll down to see more content"
          >
            {/* Hover gradient overlay */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
              style={{
                background: 'linear-gradient(135deg, rgba(188,108,79,0.04) 0%, rgba(139,92,246,0.04) 100%)',
              }}
            />
            
            {/* Message text - smaller */}
            <span 
              className="relative text-xs font-semibold tracking-wide transition-all duration-300" 
              style={{ 
                fontFamily: 'var(--font-jakarta)', 
                color: '#786B61',
                textShadow: '0 1px 1px rgba(255,255,255,0.6)',
              }}
            >
              {message}
            </span>
            
            {/* Compact icon */}
            <div className="relative flex items-center justify-center">
              <ChevronDown 
                className="w-3.5 h-3.5 scroll-chevron-1 transition-all duration-300 group-hover:translate-y-0.5" 
                style={{ 
                  color: '#BC6C4F',
                  filter: 'drop-shadow(0 1px 2px rgba(188,108,79,0.2))',
                }} 
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </div>
            
            {/* Bottom gradient accent - thin */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-full overflow-hidden"
            >
              <div 
                className="h-full transition-all duration-400 ease-out"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(188,108,79,0.5), rgba(139,92,246,0.3), transparent)',
                  transform: isHovered ? 'translateX(0)' : 'translateX(-100%)',
                }}
              />
            </div>
          </button>
        </div>
      </div>
    </>
  );
}

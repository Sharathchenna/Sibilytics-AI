import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sibilytics AI - Advanced Signal Processing & Feature Extraction Platform",
  description: "Wavelet-based signal processing for sensor data analysis. Upload .txt/.lvm files for comprehensive FFT, STFT, and statistical feature extraction with Biorthogonal wavelet decomposition.",
  keywords: ["signal processing", "wavelet decomposition", "feature extraction", "sensor data", "FFT analysis", "STFT spectrogram", "time-series analysis", "biorthogonal wavelet", "BITS Pilani", "SVM classification", "machine learning"],
  authors: [{ name: "Sibilytics AI - BITS Pilani" }],
  icons: {
    icon: [
      { url: '/dop-logo.svg', type: 'image/svg+xml' },
    ],
    apple: '/dop-logo.svg',
    shortcut: '/dop-logo.svg',
  },
  openGraph: {
    title: "Sibilytics AI - Wavelet-Based Feature Extraction Platform",
    description: "Advanced signal processing platform for researchers and engineers. Comprehensive visualization and statistical analysis tools.",
    type: "website",
    locale: "en_IN",
    siteName: "Sibilytics AI",
    images: [
      {
        url: '/dop-logo.svg',
        width: 1200,
        height: 630,
        alt: 'Sibilytics AI - Signal Processing Platform',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sibilytics AI - Signal Processing Platform",
    description: "Wavelet-based feature extraction from sensor signals with comprehensive visualization tools.",
    images: ['/dop-logo.svg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${plusJakartaSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

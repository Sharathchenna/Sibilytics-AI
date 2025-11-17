import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Abilytics - Advanced Signal Processing & Feature Extraction Platform",
  description: "Wavelet-based signal processing for sensor data analysis. Upload .txt/.lvm files for comprehensive FFT, STFT, and statistical feature extraction with Biorthogonal wavelet decomposition.",
  keywords: ["signal processing", "wavelet decomposition", "feature extraction", "sensor data", "FFT analysis", "STFT spectrogram", "time-series analysis", "biorthogonal wavelet", "BITS Pilani", "SVM classification", "machine learning"],
  authors: [{ name: "Abilytics - BITS Pilani" }],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: "Abilytics - Wavelet-Based Feature Extraction Platform",
    description: "Advanced signal processing platform for researchers and engineers. Comprehensive visualization and statistical analysis tools.",
    type: "website",
    locale: "en_IN",
    siteName: "Abilytics",
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Abilytics - Signal Processing Platform',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Abilytics - Signal Processing Platform",
    description: "Wavelet-based feature extraction from sensor signals with comprehensive visualization tools.",
    images: ['/logo.png'],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

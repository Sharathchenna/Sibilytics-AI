'use client';
import { useState } from 'react';
import { Mail, MapPin, Loader2, CheckCircle, Send, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ScrollIndicator from '../components/ScrollIndicator';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

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

            const data = await response.json() as { success?: boolean; error?: string };

            if (data.success) {
                setSubmitSuccess(true);
                setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
                setTimeout(() => setSubmitSuccess(false), 5000);
            } else {
                setFormErrors({ submit: data.error || 'Failed to send message. Please try again.' });
            }
        } catch {
            setFormErrors({ submit: 'An error occurred. Please try again later.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen relative" style={{ background: 'linear-gradient(to bottom, #FEF3E7 0%, #FEF3E7 40%, #ffffff 100%)' }}>
            {/* Translucent Logo Watermark Overlay */}
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
                <Image
                    src="/logo-new.jpg"
                    alt=""
                    aria-hidden="true"
                    width={800}
                    height={800}
                    className="w-[60%] max-w-4xl h-auto object-contain opacity-[0.05]"
                    priority
                />
            </div>

            {/* Navigation */}
            <Navbar />

            {/* Main Content */}
            <main className="relative z-10 pt-20">
            {/* Hero Section */}
            <div className="relative py-16 md:py-24 overflow-hidden" style={{ backgroundColor: '#FEF3E7' }}>
                {/* Animated Blob Background */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-[10%] -right-[5%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" style={{ backgroundColor: '#FFE4CC' }}></div>
                    <div className="absolute top-[30%] -left-[5%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" style={{ backgroundColor: '#FFD9B3' }}></div>
                    <div className="absolute -bottom-[10%] left-[30%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" style={{ backgroundColor: '#FFF0E0' }}></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-6 z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-white/80 border px-4 py-2 rounded-full text-sm font-semibold mb-8 backdrop-blur-sm animate-fade-in" style={{ borderColor: '#DCE3D6', color: '#4A5D3F', fontFamily: 'var(--font-jakarta)' }}>
                            <MessageSquare className="w-4 h-4" aria-hidden="true" />
                            Contact Us
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight animate-fade-in" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                            Get in <br />
                            <span className="italic" style={{ color: '#BC6C4F' }}>Touch</span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg md:text-xl mb-10 leading-relaxed max-w-3xl mx-auto font-light animate-fade-in" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                            Have questions about our signal processing platform?
                            Send us a message or reach out directly via email.
                        </p>
                    </div>
                </div>
            </div>

            {/* Contact Section */}
            <div className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Contact Form */}
                        <div className="bg-white p-8 rounded-2xl shadow-xl" style={{ border: '1px solid #EBE5DF' }}>
                            <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>Send us a Message</h3>

                            {submitSuccess && (
                                <div 
                                    className="mb-6 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg flex items-center gap-3 animate-fade-in"
                                    role="alert"
                                    aria-live="polite"
                                >
                                    <CheckCircle className="w-5 h-5" aria-hidden="true" />
                                    <p className="font-medium">Thank you! Your message has been sent successfully.</p>
                                </div>
                            )}

                            {formErrors.submit && (
                                <div 
                                    className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center gap-3 animate-fade-in"
                                    role="alert"
                                    aria-live="assertive"
                                >
                                    <Mail className="w-5 h-5" aria-hidden="true" />
                                    <p className="font-medium">{formErrors.submit}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5" aria-label="Contact form">
                                <div>
                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="Your Name *"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        aria-label="Your name"
                                        aria-required="true"
                                        aria-invalid={!!formErrors.name}
                                        aria-describedby={formErrors.name ? "name-error" : undefined}
                                        className={`w-full px-4 py-3 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg transition-all focus:border-[#BC6C4F] focus:outline-none`}
                                        style={{ fontFamily: 'var(--font-jakarta)' }}
                                    />
                                    {formErrors.name && <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">{formErrors.name}</p>}
                                </div>

                                <div>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Email Address *"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        aria-label="Email address"
                                        aria-required="true"
                                        aria-invalid={!!formErrors.email}
                                        aria-describedby={formErrors.email ? "email-error" : undefined}
                                        className={`w-full px-4 py-3 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg transition-all focus:border-[#BC6C4F] focus:outline-none`}
                                        style={{ fontFamily: 'var(--font-jakarta)' }}
                                    />
                                    {formErrors.email && <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">{formErrors.email}</p>}
                                </div>

                                <div>
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="Phone Number *"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        inputMode="tel"
                                        aria-label="Phone number"
                                        aria-required="true"
                                        aria-invalid={!!formErrors.phone}
                                        aria-describedby={formErrors.phone ? "phone-error" : undefined}
                                        className={`w-full px-4 py-3 border ${formErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg transition-all focus:border-[#BC6C4F] focus:outline-none`}
                                        style={{ fontFamily: 'var(--font-jakarta)' }}
                                    />
                                    {formErrors.phone && <p id="phone-error" className="mt-1 text-sm text-red-600" role="alert">{formErrors.phone}</p>}
                                </div>

                                <div>
                                    <input
                                        type="text"
                                        name="subject"
                                        placeholder="Subject *"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        aria-label="Subject"
                                        aria-required="true"
                                        aria-invalid={!!formErrors.subject}
                                        aria-describedby={formErrors.subject ? "subject-error" : undefined}
                                        className={`w-full px-4 py-3 border ${formErrors.subject ? 'border-red-500' : 'border-gray-300'} rounded-lg transition-all focus:border-[#BC6C4F] focus:outline-none`}
                                        style={{ fontFamily: 'var(--font-jakarta)' }}
                                    />
                                    {formErrors.subject && <p id="subject-error" className="mt-1 text-sm text-red-600" role="alert">{formErrors.subject}</p>}
                                </div>

                                <div>
                                    <textarea
                                        name="message"
                                        placeholder="Your Message *"
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        rows={5}
                                        aria-label="Your message"
                                        aria-required="true"
                                        aria-invalid={!!formErrors.message}
                                        aria-describedby={formErrors.message ? "message-error" : undefined}
                                        className={`w-full px-4 py-3 border ${formErrors.message ? 'border-red-500' : 'border-gray-300'} rounded-lg transition-all resize-none focus:border-[#BC6C4F] focus:outline-none`}
                                        style={{ fontFamily: 'var(--font-jakarta)' }}
                                    />
                                    {formErrors.message && <p id="message-error" className="mt-1 text-sm text-red-600" role="alert">{formErrors.message}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    aria-label={isSubmitting ? "Sending message, please wait" : "Send message"}
                                    className="w-full text-white py-4 rounded-lg font-bold text-lg hover:scale-105 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 cursor-pointer"
                                    style={{ background: 'linear-gradient(to right, #BC6C4F, #4A5D3F)', fontFamily: 'var(--font-jakarta)' }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Send Message
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-8">
                            <div className="p-8 rounded-2xl text-white shadow-xl" style={{ background: 'linear-gradient(to bottom right, #BC6C4F, #4A5D3F)' }}>
                                <h3 className="text-2xl text-white font-bold mb-6" style={{ fontFamily: 'var(--font-playfair)' }}>Contact Information</h3>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white/20 rounded-lg" aria-hidden="true">
                                            <Mail className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-2 text-white" style={{ fontFamily: 'var(--font-playfair)' }}>Email</h4>
                                            <a href="mailto:sibilyticsai@gmail.com" className="text-white text-lg transition-colors font-medium break-all" style={{ fontFamily: 'var(--font-jakarta)' }} aria-label="Email us at sibilyticsai@gmail.com">
                                                sibilyticsai@gmail.com
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                <a href="https://www.google.com/maps/place/BITS+Pilani+Hyderabad+Campus" target="_blank" rel="noopener noreferrer"
                                    className="mt-8 w-full bg-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                                    style={{ color: '#BC6C4F', fontFamily: 'var(--font-jakarta)' }}
                                    aria-label="View BITS Pilani Hyderabad Campus location on Google Maps (opens in new window)"
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEF3E7'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                                    <MapPin className="w-5 h-5" aria-hidden="true" />
                                    View on Google Maps
                                </a>
                            </div>

                            <div className="p-8 rounded-2xl" style={{ background: 'linear-gradient(to bottom right, #F5F0EB, #FDFCF8)', border: '1px solid #EBE5DF' }}>
                                <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>Quick Response</h3>
                                <p className="leading-relaxed" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                    We typically respond to all inquiries within 24-48 hours during business days.
                                    For urgent matters, please reach out via email directly.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </main>

            {/* Scroll Indicator */}
            <ScrollIndicator message="Fill the form below" />

            {/* Footer */}
            <Footer />
        </div>
    );
}

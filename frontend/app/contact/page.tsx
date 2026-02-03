'use client';
import { useState } from 'react';
import PageLayout from '../components/PageLayout';
import { Mail, MapPin, Loader2, CheckCircle, Send, MessageSquare } from 'lucide-react';

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
        <PageLayout>
            {/* Hero Section */}
            <div className="relative bg-gradient-to-b from-teal-50 to-white py-16 md:py-24">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-fade-in">
                            <MessageSquare className="w-4 h-4" />
                            Contact Us
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight animate-fade-in">
                            Get in
                            <span className="text-teal-600"> Touch</span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-3xl mx-auto animate-fade-in">
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
                                        className={`w-full px-4 py-3 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all`}
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
                                        className={`w-full px-4 py-3 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all`}
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
                                        className={`w-full px-4 py-3 border ${formErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all`}
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
                                        className={`w-full px-4 py-3 border ${formErrors.subject ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all`}
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
                                        className={`w-full px-4 py-3 border ${formErrors.message ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none`}
                                    />
                                    {formErrors.message && <p className="mt-1 text-sm text-red-600">{formErrors.message}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white py-4 rounded-lg font-bold text-lg hover:from-teal-700 hover:to-emerald-700 hover:scale-105 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
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
                            <div className="bg-gradient-to-br from-teal-600 to-emerald-600 p-8 rounded-2xl text-white shadow-xl">
                                <h3 className="text-2xl text-white font-bold mb-6">Contact Information</h3>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white/20 rounded-lg">
                                            <Mail className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-2 text-white">Email</h4>
                                            <a href="mailto:sybilyticsai@gmail.com" className="text-white hover:text-teal-100 text-lg transition-colors font-medium break-all">
                                                sybilyticsai@gmail.com
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                <a href="https://www.google.com/maps/place/BITS+Pilani+Hyderabad+Campus" target="_blank" rel="noopener noreferrer"
                                    className="mt-8 w-full bg-white text-teal-600 py-3 rounded-lg font-bold hover:bg-teal-50 transition-colors flex items-center justify-center gap-2">
                                    <MapPin className="w-5 h-5" />
                                    View on Google Maps
                                </a>
                            </div>

                            <div className="bg-gradient-to-br from-slate-100 to-slate-50 p-8 rounded-2xl border border-slate-200">
                                <h3 className="text-xl font-bold text-slate-800 mb-4">Quick Response</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    We typically respond to all inquiries within 24-48 hours during business days.
                                    For urgent matters, please reach out via email directly.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}

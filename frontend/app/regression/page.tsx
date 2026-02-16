'use client';
import { useRef, useState } from 'react';
import { TrendingUp, Upload, Activity, LineChart, ScatterChart, Zap, Target } from 'lucide-react';
import ScrollIndicator from '../components/ScrollIndicator';
import { API_BASE_URL } from '@/lib/api';
import { createClient } from '@/lib/supabase/browser';

type RegressionType = 'curve-fit' | 'linear' | 'logistic' | 'polynomial';

const getAuthHeaders = async (): Promise<HeadersInit> => {
    try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (accessToken) {
            return { Authorization: `Bearer ${accessToken}` };
        }
    } catch {
        // no-op; backend will return 401 if unauthenticated
    }

    return {};
};

export default function RegressionPage() {
    const [activeTab, setActiveTab] = useState<RegressionType>('curve-fit');
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [columns, setColumns] = useState<string[]>([]);
    const [sampleData, setSampleData] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Record<string, unknown> | null>(null);
    const [error, setError] = useState('');

    // Curve Fit specific states
    const [xColumn, setXColumn] = useState('');
    const [yColumn, setYColumn] = useState('');
    const [zColumn, setZColumn] = useState('');
    const [modelType, setModelType] = useState('polynomial');
    const [degree, setDegree] = useState(2);
    const [customEquation, setCustomEquation] = useState('');

    // Linear/Polynomial specific states
    const [linearXColumns, setLinearXColumns] = useState<string[]>([]);
    const [linearYColumns, setLinearYColumns] = useState<string[]>([]);
    const [linearXSelection, setLinearXSelection] = useState('');
    const [linearYSelection, setLinearYSelection] = useState('');
    const [polynomialXColumns, setPolynomialXColumns] = useState<string[]>([]);
    const [polynomialYColumns, setPolynomialYColumns] = useState<string[]>([]);
    const [polynomialXSelection, setPolynomialXSelection] = useState('');
    const [polynomialYSelection, setPolynomialYSelection] = useState('');

    // Logistic specific states
    const [targetColumn, setTargetColumn] = useState('');

    const tabs = [
        { id: 'curve-fit', label: 'Curve Fit', icon: Activity, color: '#8B5CF6' },
        { id: 'linear', label: 'Linear', icon: LineChart, color: '#3B82F6' },
        { id: 'logistic', label: 'Logistic', icon: TrendingUp, color: '#10B981' },
        { id: 'polynomial', label: 'Polynomial', icon: ScatterChart, color: '#F59E0B' }
    ];

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setError('');
        setResults(null);
        setLinearXColumns([]);
        setLinearYColumns([]);
        setLinearXSelection('');
        setLinearYSelection('');
        setPolynomialXColumns([]);
        setPolynomialYColumns([]);
        setPolynomialXSelection('');
        setPolynomialYSelection('');

        const formData = new FormData();
        formData.append('file', uploadedFile);

        try {
            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: formData,
            });

            if (!response.ok) throw new Error('Failed to parse file');

            const data = await response.json() as { columns?: string[]; sample_data?: Record<string, unknown>[] };
            setColumns(data.columns || []);
            setSampleData((data.sample_data || []).slice(0, 5));
        } catch {
            setColumns([]);
            setSampleData([]);
            setError('Failed to parse file. Please check the format.');
        }
    };

    const addLinearXColumn = () => {
        if (linearXSelection && !linearXColumns.includes(linearXSelection)) {
            setLinearXColumns((prev) => [...prev, linearXSelection]);
        }
        setLinearXSelection('');
    };

    const addLinearYColumn = () => {
        if (linearYSelection && !linearYColumns.includes(linearYSelection)) {
            setLinearYColumns((prev) => [...prev, linearYSelection]);
        }
        setLinearYSelection('');
    };

    const addPolynomialXColumn = () => {
        if (polynomialXSelection && !polynomialXColumns.includes(polynomialXSelection)) {
            setPolynomialXColumns((prev) => [...prev, polynomialXSelection]);
        }
        setPolynomialXSelection('');
    };

    const addPolynomialYColumn = () => {
        if (polynomialYSelection && !polynomialYColumns.includes(polynomialYSelection)) {
            setPolynomialYColumns((prev) => [...prev, polynomialYSelection]);
        }
        setPolynomialYSelection('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Please upload a file');
            return;
        }

        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            let endpoint = '';
            
            if (activeTab === 'curve-fit') {
                if (!xColumn || !yColumn || !zColumn) {
                    throw new Error('Please select all required columns');
                }
                formData.append('x_column', xColumn);
                formData.append('y_column', yColumn);
                formData.append('z_column', zColumn);
                formData.append('model_type', modelType);
                if (modelType === 'polynomial') {
                    formData.append('degree', degree.toString());
                }
                if (modelType === 'custom' && customEquation) {
                    formData.append('custom_equation', customEquation);
                }
                endpoint = `${API_BASE_URL}/api/regression/curve-fit`;
            } else if (activeTab === 'linear') {
                if (linearXColumns.length === 0 || linearYColumns.length === 0) {
                    throw new Error('Please provide X and Y columns');
                }
                formData.append('x_columns', linearXColumns.join(', '));
                formData.append('y_columns', linearYColumns.join(', '));
                endpoint = `${API_BASE_URL}/api/regression/linear`;
            } else if (activeTab === 'logistic') {
                if (!targetColumn) {
                    throw new Error('Please select target column');
                }
                formData.append('target_column', targetColumn);
                endpoint = `${API_BASE_URL}/api/regression/logistic`;
            } else if (activeTab === 'polynomial') {
                if (polynomialXColumns.length === 0 || polynomialYColumns.length === 0) {
                    throw new Error('Please provide X and Y columns');
                }
                formData.append('x_columns', polynomialXColumns.join(', '));
                formData.append('y_columns', polynomialYColumns.join(', '));
                formData.append('degree', degree.toString());
                endpoint = `${API_BASE_URL}/api/regression/polynomial`;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json() as { detail?: string };
                throw new Error(errorData.detail || 'Analysis failed');
            }

            const data = await response.json() as Record<string, unknown>;
            setResults(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to perform regression analysis');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setColumns([]);
        setSampleData([]);
        setResults(null);
        setError('');
        setLoading(false);
        setXColumn('');
        setYColumn('');
        setZColumn('');
        setModelType('polynomial');
        setDegree(2);
        setCustomEquation('');
        setLinearXColumns([]);
        setLinearYColumns([]);
        setLinearXSelection('');
        setLinearYSelection('');
        setPolynomialXColumns([]);
        setPolynomialYColumns([]);
        setPolynomialXSelection('');
        setPolynomialYSelection('');
        setTargetColumn('');

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleTabChange = (tab: RegressionType) => {
        setActiveTab(tab);
        resetForm();
    };

    return (
        <div className="min-h-screen relative" style={{ background: 'linear-gradient(to bottom, rgba(253,252,248,0.3) 0%, rgba(253,252,248,0.5) 8%, rgba(253,252,248,0.7) 12%, rgba(253,252,248,0.85) 16%, rgba(253,252,248,0.95) 20%, #FDFCF8 30%, #FDFCF8 100%)' }}>
            {/* Main Content */}
            <main className="relative z-10 pt-20">
                {/* Hero Section */}
                <div className="relative py-16 md:py-24 overflow-hidden">
                    {/* Animated Blob Background */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                        <div className="absolute -top-[10%] -left-[5%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" style={{ backgroundColor: '#F5EFE7' }}></div>
                        <div className="absolute top-[30%] -right-[5%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" style={{ backgroundColor: '#FDDFC7' }}></div>
                        <div className="absolute -bottom-[10%] left-[30%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" style={{ backgroundColor: '#FBE8D9' }}></div>
                    </div>

                    <div className="relative max-w-7xl mx-auto px-6 z-10">
                        <div className="text-center max-w-4xl mx-auto">
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 bg-white/80 border px-4 py-2 rounded-full text-sm font-semibold mb-8 backdrop-blur-sm animate-fade-in" style={{ borderColor: '#FFDFD0', color: '#EA580C', fontFamily: 'var(--font-jakarta)' }}>
                                <TrendingUp className="w-4 h-4" />
                                Regression Analysis Module
                            </div>

                            {/* Heading */}
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight animate-fade-in" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                                Advanced <br />
                                <span className="italic" style={{ color: '#EA580C' }}>Regression Models</span>
                            </h1>

                            {/* Description */}
                            <p className="text-lg md:text-xl mb-10 leading-relaxed max-w-3xl mx-auto font-light animate-fade-in" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                Powerful curve fitting, linear modeling, classification, and polynomial regression
                                with automated parameter optimization and real-time visualization.
                            </p>

                            {/* Feature highlights */}
                            <div className="flex flex-wrap justify-center gap-4 mb-8">
                                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-5 py-3 rounded-full shadow-md hover:shadow-lg transition-shadow" style={{ border: '1px solid rgba(235,229,223,0.5)' }}>
                                    <Activity className="w-5 h-5" style={{ color: '#EA580C' }} />
                                    <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>3D Surface Fitting</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-5 py-3 rounded-full shadow-md hover:shadow-lg transition-shadow" style={{ border: '1px solid rgba(235,229,223,0.5)' }}>
                                    <Target className="w-5 h-5" style={{ color: '#F97316' }} />
                                    <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>Auto-Optimization</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-5 py-3 rounded-full shadow-md hover:shadow-lg transition-shadow" style={{ border: '1px solid rgba(235,229,223,0.5)' }}>
                                    <Zap className="w-5 h-5" style={{ color: '#F97316' }} />
                                    <span className="font-medium" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>Real-Time Analysis</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analysis Section */}
                <div className="py-16 bg-white">
                    <div className="max-w-6xl mx-auto px-6">
                        {/* Tabs - Matching site design */}
                        <div className="flex flex-wrap justify-center gap-3 mb-12">
                            {tabs.map((tab) => {
                                const IconComponent = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id as RegressionType)}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
                                            activeTab === tab.id 
                                                ? 'shadow-lg transform scale-105' 
                                                : 'shadow-md hover:shadow-lg'
                                        }`}
                                        style={{
                                            backgroundColor: activeTab === tab.id ? tab.color : '#FFFFFF',
                                            color: activeTab === tab.id ? '#FFFFFF' : tab.color,
                                            border: `2px solid ${tab.color}`,
                                            fontFamily: 'var(--font-jakarta)'
                                        }}
                                    >
                                        <IconComponent className="w-4 h-4" />
                                        <span className="text-sm">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Form Container */}
                        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12" style={{ border: '1px solid #EBE5DF' }}>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* File Upload */}
                                <div>
                                    <label className="block text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                        Upload Dataset
                                    </label>
                                    <div className="relative">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv,.txt,.lvm,.xlsx,.xls"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            id="file-upload"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-orange-400 transition-colors"
                                            style={{ borderColor: '#FFDFD0', backgroundColor: '#FDFCF8' }}
                                        >
                                            <Upload className="w-5 h-5" style={{ color: '#EA580C' }} />
                                            <span style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                {file ? file.name : 'Choose file (CSV, TXT, LVM, XLSX)'}
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Available Columns Info */}
                                {columns.length > 0 && (
                                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#F9F6F3', border: '1px solid #EBE5DF' }}>
                                        <p className="text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#EA580C' }}>
                                            Available Columns:
                                        </p>
                                        <p className="text-sm" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                            {columns.join(', ')}
                                        </p>
                                    </div>
                                )}

                                {sampleData.length > 0 && (
                                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#F9F6F3', border: '1px solid #EBE5DF' }}>
                                        <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-jakarta)', color: '#EA580C' }}>
                                            Data Preview (First 5 Rows)
                                        </p>
                                        <div className="overflow-x-auto rounded-lg bg-white" style={{ border: '1px solid #EBE5DF' }}>
                                            <table className="w-full text-sm" style={{ fontFamily: 'var(--font-jakarta)' }}>
                                                <thead style={{ backgroundColor: '#F3EEE8', color: '#3D342B' }}>
                                                    <tr>
                                                        {Object.keys(sampleData[0]).map((column) => (
                                                            <th key={column} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                                                                {column}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sampleData.map((row, rowIdx) => (
                                                        <tr key={rowIdx} style={{ borderTop: '1px solid #EBE5DF' }}>
                                                            {Object.keys(sampleData[0]).map((column) => (
                                                                <td key={`${rowIdx}-${column}`} className="px-3 py-2 whitespace-nowrap" style={{ color: '#786B61' }}>
                                                                    {String(row[column] ?? '')}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Conditional Form Fields Based on Active Tab */}
                                {columns.length > 0 && (
                                    <>
                                        {/* CURVE FIT FORM */}
                                        {activeTab === 'curve-fit' && (
                                            <>
                                                <div className="grid md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                            X Column
                                                        </label>
                                                        <select
                                                            value={xColumn}
                                                            onChange={(e) => setXColumn(e.target.value)}
                                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                            style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                        >
                                                            <option value="">Select X</option>
                                                            {columns.map((col) => (
                                                                <option key={col} value={col}>{col}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                            Y Column
                                                        </label>
                                                        <select
                                                            value={yColumn}
                                                            onChange={(e) => setYColumn(e.target.value)}
                                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                            style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                        >
                                                            <option value="">Select Y</option>
                                                            {columns.map((col) => (
                                                                <option key={col} value={col}>{col}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                            Z Column (Output)
                                                        </label>
                                                        <select
                                                            value={zColumn}
                                                            onChange={(e) => setZColumn(e.target.value)}
                                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                            style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                        >
                                                            <option value="">Select Z</option>
                                                            {columns.map((col) => (
                                                                <option key={col} value={col}>{col}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        Model Type
                                                    </label>
                                                    <select
                                                        value={modelType}
                                                        onChange={(e) => setModelType(e.target.value)}
                                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                        style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                    >
                                                        <option value="polynomial">Polynomial Surface</option>
                                                        <option value="exponential">Exponential Surface</option>
                                                        <option value="logarithmic">Logarithmic Surface</option>
                                                        <option value="power">Power Law Surface</option>
                                                        <option value="custom">Custom Equation</option>
                                                    </select>
                                                </div>

                                                {modelType === 'polynomial' && (
                                                    <div>
                                                        <label className="block text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                            Polynomial Degree: {degree}
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="10"
                                                            value={degree}
                                                            onChange={(e) => setDegree(parseInt(e.target.value))}
                                                            className="w-full"
                                                        />
                                                        <div className="flex justify-between text-xs mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                            <span>1</span>
                                                            <span>10</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {modelType === 'custom' && (
                                                    <div>
                                                        <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                            Custom Equation
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={customEquation}
                                                            onChange={(e) => setCustomEquation(e.target.value)}
                                                            placeholder="e.g., a*(x^b)*(y^c) or a*np.exp(b*x) + c*y"
                                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                            style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                        />
                                                        <p className="text-sm mt-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                            Use x, y for variables and a, b, c, d... for parameters
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* LINEAR REGRESSION FORM */}
                                        {activeTab === 'linear' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        X Columns (Input Features)
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <select
                                                            value={linearXSelection}
                                                            onChange={(e) => setLinearXSelection(e.target.value)}
                                                            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                        >
                                                            <option value="">Select X column</option>
                                                            {columns.map((col) => (
                                                                <option key={col} value={col}>{col}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={addLinearXColumn}
                                                            className="px-4 py-2 rounded-lg font-semibold text-white"
                                                            style={{ backgroundColor: '#3B82F6', fontFamily: 'var(--font-jakarta)' }}
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    {linearXColumns.length > 0 && (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {linearXColumns.map((col) => (
                                                                <button
                                                                    key={col}
                                                                    type="button"
                                                                    onClick={() => setLinearXColumns((prev) => prev.filter((c) => c !== col))}
                                                                    className="px-3 py-1 rounded-full text-sm"
                                                                    style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontFamily: 'var(--font-jakarta)' }}
                                                                >
                                                                    {col} ×
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <p className="text-sm mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                        Select one at a time from dropdown, then click Add
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        Y Columns (Output Targets)
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <select
                                                            value={linearYSelection}
                                                            onChange={(e) => setLinearYSelection(e.target.value)}
                                                            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                        >
                                                            <option value="">Select Y column</option>
                                                            {columns.map((col) => (
                                                                <option key={col} value={col}>{col}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={addLinearYColumn}
                                                            className="px-4 py-2 rounded-lg font-semibold text-white"
                                                            style={{ backgroundColor: '#3B82F6', fontFamily: 'var(--font-jakarta)' }}
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    {linearYColumns.length > 0 && (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {linearYColumns.map((col) => (
                                                                <button
                                                                    key={col}
                                                                    type="button"
                                                                    onClick={() => setLinearYColumns((prev) => prev.filter((c) => c !== col))}
                                                                    className="px-3 py-1 rounded-full text-sm"
                                                                    style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontFamily: 'var(--font-jakarta)' }}
                                                                >
                                                                    {col} ×
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <p className="text-sm mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                        Select one at a time from dropdown, then click Add
                                                    </p>
                                                </div>

                                            </>
                                        )}

                                        {/* LOGISTIC REGRESSION FORM */}
                                        {activeTab === 'logistic' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        Target Column
                                                    </label>
                                                    <select
                                                        value={targetColumn}
                                                        onChange={(e) => setTargetColumn(e.target.value)}
                                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                        style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                    >
                                                        <option value="">Select target column</option>
                                                        {columns.map((col) => (
                                                            <option key={col} value={col}>{col}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-sm mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                        This field is required
                                                    </p>
                                                </div>

                                            </>
                                        )}

                                        {/* POLYNOMIAL REGRESSION FORM */}
                                        {activeTab === 'polynomial' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        X Columns (Input Features)
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <select
                                                            value={polynomialXSelection}
                                                            onChange={(e) => setPolynomialXSelection(e.target.value)}
                                                            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                            style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                        >
                                                            <option value="">Select X column</option>
                                                            {columns.map((col) => (
                                                                <option key={col} value={col}>{col}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={addPolynomialXColumn}
                                                            className="px-4 py-2 rounded-lg font-semibold text-white"
                                                            style={{ backgroundColor: '#F59E0B', fontFamily: 'var(--font-jakarta)' }}
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    {polynomialXColumns.length > 0 && (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {polynomialXColumns.map((col) => (
                                                                <button
                                                                    key={col}
                                                                    type="button"
                                                                    onClick={() => setPolynomialXColumns((prev) => prev.filter((c) => c !== col))}
                                                                    className="px-3 py-1 rounded-full text-sm"
                                                                    style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', fontFamily: 'var(--font-jakarta)' }}
                                                                >
                                                                    {col} ×
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <p className="text-sm mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                        Select one at a time from dropdown, then click Add
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        Y Columns (Output Targets)
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <select
                                                            value={polynomialYSelection}
                                                            onChange={(e) => setPolynomialYSelection(e.target.value)}
                                                            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                            style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                        >
                                                            <option value="">Select Y column</option>
                                                            {columns.map((col) => (
                                                                <option key={col} value={col}>{col}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={addPolynomialYColumn}
                                                            className="px-4 py-2 rounded-lg font-semibold text-white"
                                                            style={{ backgroundColor: '#F59E0B', fontFamily: 'var(--font-jakarta)' }}
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    {polynomialYColumns.length > 0 && (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {polynomialYColumns.map((col) => (
                                                                <button
                                                                    key={col}
                                                                    type="button"
                                                                    onClick={() => setPolynomialYColumns((prev) => prev.filter((c) => c !== col))}
                                                                    className="px-3 py-1 rounded-full text-sm"
                                                                    style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', fontFamily: 'var(--font-jakarta)' }}
                                                                >
                                                                    {col} ×
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <p className="text-sm mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                        Select one at a time from dropdown, then click Add
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        Polynomial Degree: {degree}
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="5"
                                                        value={degree}
                                                        onChange={(e) => setDegree(parseInt(e.target.value))}
                                                        className="w-full"
                                                    />
                                                    <div className="flex justify-between text-xs mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                        <span>1</span>
                                                        <span>5</span>
                                                    </div>
                                                </div>

                                            </>
                                        )}
                                    </>
                                )}

                                {/* Error Message */}
                                {error && (
                                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA' }}>
                                        <p style={{ fontFamily: 'var(--font-jakarta)', color: '#DC2626' }}>{error}</p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <button
                                        type="submit"
                                        disabled={loading || !file}
                                        className="w-full px-6 py-4 rounded-xl font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: tabs.find(t => t.id === activeTab)?.color || '#EA580C',
                                            fontFamily: 'var(--font-jakarta)'
                                        }}
                                    >
                                        {loading ? 'Analyzing...' : 'Run Analysis'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        disabled={loading}
                                        className="w-full px-6 py-4 rounded-xl font-semibold transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: '#FFFFFF',
                                            color: tabs.find(t => t.id === activeTab)?.color || '#EA580C',
                                            border: `2px solid ${tabs.find(t => t.id === activeTab)?.color || '#EA580C'}`,
                                            fontFamily: 'var(--font-jakarta)'
                                        }}
                                    >
                                        Clear All & Try Again
                                    </button>
                                </div>
                            </form>

                            {/* Results Section */}
                            {results && (
                                <div className="mt-12 space-y-8">
                                    <div className="border-t pt-8" style={{ borderColor: '#EBE5DF' }}>
                                        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                                            Analysis Results
                                        </h2>

                                        {/* Curve Fit Results */}
                                        {activeTab === 'curve-fit' && (
                                            <>
                                                <div className="grid grid-cols-2 gap-4 mb-8">
                                                    <div className="p-6 rounded-xl" style={{ backgroundColor: '#F9F6F3', border: '1px solid #EBE5DF' }}>
                                                        <p className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#8B5CF6' }}>
                                                            R² Score
                                                        </p>
                                                        <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                                                            {typeof results.r2_score === 'number' ? results.r2_score.toFixed(4) : String(results.r2_score ?? 'N/A')}
                                                        </p>
                                                    </div>
                                                    <div className="p-6 rounded-xl" style={{ backgroundColor: '#F9F6F3', border: '1px solid #EBE5DF' }}>
                                                        <p className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#8B5CF6' }}>
                                                            MSE
                                                        </p>
                                                        <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                                                            {typeof results.mse === 'number' ? results.mse.toFixed(4) : String(results.mse ?? 'N/A')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="bg-gray-50 p-6 rounded-xl mb-8">
                                                    <p className="text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        Fitted Equation:
                                                    </p>
                                                    <p className="text-sm font-mono break-all" style={{ color: '#786B61' }}>
                                                        {String(results.equation ?? '')}
                                                    </p>
                                                </div>

                                                <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                                                    <img
                                                        src={`data:image/png;base64,${String(results.plot ?? '')}`}
                                                        alt="3D Surface Plot"
                                                        className="w-full h-auto"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* Linear/Polynomial Results */}
                                        {(activeTab === 'linear' || activeTab === 'polynomial') && (
                                            <>
                                                <div className="grid grid-cols-2 gap-4 mb-8">
                                                    <div className="p-6 rounded-xl" style={{ backgroundColor: '#F9F6F3', border: '1px solid #EBE5DF' }}>
                                                        <p className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-jakarta)', color: activeTab === 'linear' ? '#3B82F6' : '#F59E0B' }}>
                                                            R² Score
                                                        </p>
                                                        <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                                                            {typeof results.r2_score === 'number' ? results.r2_score.toFixed(4) : String(results.r2_score ?? 'N/A')}
                                                        </p>
                                                    </div>
                                                    <div className="p-6 rounded-xl" style={{ backgroundColor: '#F9F6F3', border: '1px solid #EBE5DF' }}>
                                                        <p className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-jakarta)', color: activeTab === 'linear' ? '#3B82F6' : '#F59E0B' }}>
                                                            MSE
                                                        </p>
                                                        <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                                                            {typeof results.mse === 'number' ? results.mse.toFixed(4) : String(results.mse ?? 'N/A')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="bg-gray-50 p-6 rounded-xl mb-8">
                                                    <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        Fitted Equations:
                                                    </p>
                                                    <div className="space-y-2">
                                                        {Array.isArray(results.equations) && results.equations.map((eq: string, idx: number) => (
                                                            <p key={idx} className="text-sm font-mono break-all" style={{ color: '#786B61' }}>
                                                                {eq}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>

                                                    <div className="space-y-6">
                                                        <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                                                            Visualizations
                                                        </h3>
                                                        <div className="grid md:grid-cols-2 gap-6">
                                                            {(results.plots as Array<{ target: string; feature: string; plot: string }>)?.map((plot, idx: number) => (
                                                                <div key={idx} className="bg-white rounded-xl overflow-hidden shadow-lg" style={{ border: '1px solid #EBE5DF' }}>
                                                                    <div className="p-4" style={{ backgroundColor: '#F9F6F3' }}>
                                                                        <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-jakarta)', color: activeTab === 'linear' ? '#3B82F6' : '#F59E0B' }}>
                                                                            {plot.target} vs {plot.feature}
                                                                        </p>
                                                                    </div>
                                                                    <img
                                                                        src={`data:image/png;base64,${plot.plot}`}
                                                                        alt={`${plot.target} vs ${plot.feature}`}
                                                                        className="w-full h-auto"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                            </>
                                        )}

                                        {/* Logistic Results */}
                                        {activeTab === 'logistic' && (
                                            <>
                                                <div className="grid grid-cols-2 gap-4 mb-8">
                                                    <div className="p-6 rounded-xl" style={{ backgroundColor: '#F9F6F3', border: '1px solid #EBE5DF' }}>
                                                        <p className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#10B981' }}>
                                                            Accuracy
                                                        </p>
                                                        <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                                                            {typeof results.accuracy === 'number' ? `${(results.accuracy * 100).toFixed(2)}%` : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="p-6 rounded-xl" style={{ backgroundColor: '#F9F6F3', border: '1px solid #EBE5DF' }}>
                                                        <p className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#10B981' }}>
                                                            Classes
                                                        </p>
                                                        <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                                                            {String(results.num_classes ?? 'N/A')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="bg-gray-50 p-6 rounded-xl mb-8">
                                                    <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        Best Parameters:
                                                    </p>
                                                    <pre className="text-sm" style={{ fontFamily: 'monospace', color: '#786B61' }}>
                                                        {JSON.stringify(results.best_params, null, 2)}
                                                    </pre>
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-6 mb-8">
                                                    <div className="bg-white rounded-xl overflow-hidden shadow-lg" style={{ border: '1px solid #EBE5DF' }}>
                                                        <div className="p-4" style={{ backgroundColor: '#F9F6F3' }}>
                                                            <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-jakarta)', color: '#10B981' }}>
                                                                Confusion Matrix
                                                            </p>
                                                        </div>
                                                        <img
                                                            src={`data:image/png;base64,${String(results.confusion_matrix_plot ?? '')}`}
                                                            alt="Confusion Matrix"
                                                            className="w-full h-auto"
                                                        />
                                                    </div>
                                                    <div className="bg-white rounded-xl overflow-hidden shadow-lg" style={{ border: '1px solid #EBE5DF' }}>
                                                        <div className="p-4" style={{ backgroundColor: '#F9F6F3' }}>
                                                            <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-jakarta)', color: '#10B981' }}>
                                                                Feature Importance
                                                            </p>
                                                        </div>
                                                        <img
                                                            src={`data:image/png;base64,${String(results.feature_importance_plot ?? '')}`}
                                                            alt="Feature Importance"
                                                            className="w-full h-auto"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                                                        Feature Probability Plots
                                                    </h3>
                                                    <div className="grid md:grid-cols-2 gap-6">
                                                        {(results.probability_plots as Array<{ feature: string; plot: string }>)?.map((plot, idx: number) => (
                                                            <div key={idx} className="bg-white rounded-xl overflow-hidden shadow-lg" style={{ border: '1px solid #EBE5DF' }}>
                                                                <div className="p-4" style={{ backgroundColor: '#F9F6F3' }}>
                                                                    <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-jakarta)', color: '#10B981' }}>
                                                                        {plot.feature} vs Class Probability
                                                                    </p>
                                                                </div>
                                                                <img
                                                                    src={`data:image/png;base64,${plot.plot}`}
                                                                    alt={`${plot.feature} probability`}
                                                                    className="w-full h-auto"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Scroll Indicator */}
            <ScrollIndicator message="Select a regression type above" />

        </div>
    );
}

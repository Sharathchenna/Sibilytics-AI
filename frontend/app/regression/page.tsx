'use client';
import { useState } from 'react';
import { TrendingUp, Upload, Activity, LineChart, ScatterChart, Zap, Target } from 'lucide-react';
import ScrollIndicator from '../components/ScrollIndicator';
import { API_BASE_URL } from '@/lib/api';

type RegressionType = 'curve-fit' | 'linear' | 'logistic' | 'polynomial';

export default function RegressionPage() {
    const [activeTab, setActiveTab] = useState<RegressionType>('curve-fit');
    const [file, setFile] = useState<File | null>(null);
    const [columns, setColumns] = useState<string[]>([]);
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
    const [xColumns, setXColumns] = useState('');
    const [yColumns, setYColumns] = useState('');
    const [testSize, setTestSize] = useState(0.2);

    // Logistic specific states
    const [targetColumn, setTargetColumn] = useState('');
    const [testSizes, setTestSizes] = useState('0.2,0.25,0.3');

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

        const formData = new FormData();
        formData.append('file', uploadedFile);

        try {
            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Failed to parse file');

            const data = await response.json() as { columns?: string[] };
            setColumns(data.columns || []);
        } catch {
            setError('Failed to parse file. Please check the format.');
        }
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
                if (!xColumns || !yColumns) {
                    throw new Error('Please provide X and Y columns');
                }
                formData.append('x_columns', xColumns);
                formData.append('y_columns', yColumns);
                formData.append('test_size', testSize.toString());
                endpoint = `${API_BASE_URL}/api/regression/linear`;
            } else if (activeTab === 'logistic') {
                if (targetColumn) {
                    formData.append('target_column', targetColumn);
                }
                formData.append('test_sizes', testSizes);
                endpoint = `${API_BASE_URL}/api/regression/logistic`;
            } else if (activeTab === 'polynomial') {
                if (!xColumns || !yColumns) {
                    throw new Error('Please provide X and Y columns');
                }
                formData.append('x_columns', xColumns);
                formData.append('y_columns', yColumns);
                formData.append('degree', degree.toString());
                formData.append('test_size', testSize.toString());
                endpoint = `${API_BASE_URL}/api/regression/polynomial`;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
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
        setResults(null);
        setError('');
        setXColumn('');
        setYColumn('');
        setZColumn('');
        setXColumns('');
        setYColumns('');
        setTargetColumn('');
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
                                                    <input
                                                        type="text"
                                                        value={xColumns}
                                                        onChange={(e) => setXColumns(e.target.value)}
                                                        placeholder="e.g., Feature1, Feature2, Feature3"
                                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                    />
                                                    <p className="text-sm mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                        Comma-separated column names
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        Y Columns (Output Targets)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={yColumns}
                                                        onChange={(e) => setYColumns(e.target.value)}
                                                        placeholder="e.g., Target1, Target2"
                                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                    />
                                                    <p className="text-sm mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                        Comma-separated column names
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        Test Size: {(testSize * 100).toFixed(0)}%
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0.1"
                                                        max="0.5"
                                                        step="0.05"
                                                        value={testSize}
                                                        onChange={(e) => setTestSize(parseFloat(e.target.value))}
                                                        className="w-full"
                                                    />
                                                    <div className="flex justify-between text-xs mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                        <span>10%</span>
                                                        <span>50%</span>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* LOGISTIC REGRESSION FORM */}
                                        {activeTab === 'logistic' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        Target Column (Optional - Auto-detect if empty)
                                                    </label>
                                                    <select
                                                        value={targetColumn}
                                                        onChange={(e) => setTargetColumn(e.target.value)}
                                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                        style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                    >
                                                        <option value="">Auto-detect target column</option>
                                                        {columns.map((col) => (
                                                            <option key={col} value={col}>{col}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-sm mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                        System will auto-detect the last column with ≤20 unique values
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        Test Sizes to Try
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={testSizes}
                                                        onChange={(e) => setTestSizes(e.target.value)}
                                                        placeholder="e.g., 0.2, 0.25, 0.3"
                                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                        style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                    />
                                                    <p className="text-sm mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                        Comma-separated values (system will find best split)
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
                                                    <input
                                                        type="text"
                                                        value={xColumns}
                                                        onChange={(e) => setXColumns(e.target.value)}
                                                        placeholder="e.g., Feature1, Feature2, Feature3"
                                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                        style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                    />
                                                    <p className="text-sm mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                        Comma-separated column names
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        Y Columns (Output Targets)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={yColumns}
                                                        onChange={(e) => setYColumns(e.target.value)}
                                                        placeholder="e.g., Target1, Target2"
                                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                        style={{ fontFamily: 'var(--font-jakarta)', borderColor: '#EBE5DF' }}
                                                    />
                                                    <p className="text-sm mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                        Comma-separated column names
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

                                                <div>
                                                    <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#3D342B' }}>
                                                        Test Size: {(testSize * 100).toFixed(0)}%
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0.1"
                                                        max="0.5"
                                                        step="0.05"
                                                        value={testSize}
                                                        onChange={(e) => setTestSize(parseFloat(e.target.value))}
                                                        className="w-full"
                                                    />
                                                    <div className="flex justify-between text-xs mt-1" style={{ fontFamily: 'var(--font-jakarta)', color: '#786B61' }}>
                                                        <span>10%</span>
                                                        <span>50%</span>
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

                                {/* Submit Button */}
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
                                                <div className="grid grid-cols-3 gap-4 mb-8">
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
                                                            Best Test Size
                                                        </p>
                                                        <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#3D342B' }}>
                                                            {typeof results.best_test_size === 'number' ? `${(results.best_test_size * 100).toFixed(0)}%` : 'N/A'}
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

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        setIsLoading(true);

        try {
            await login(email, password);
            toast.success('Welcome back! 🎉');
            navigate('/');
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background-dark flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8 font-display">
            {/* Decorative background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -mr-64 -mt-64" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -ml-64 -mb-64" />
            </div>

            <div className="w-full max-w-[400px] relative z-10">
                {/* Logo/Brand */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary mb-6 shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-white text-4xl">chat_bubble</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Welcome Back</h1>
                    <p className="text-text-secondary">Sign in to your account</p>
                </div>

                {/* Login Card */}
                <div className="bg-surface-dark border border-border-dark rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                                Email Address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-text-secondary group-focus-within:text-primary transition-colors text-[20px]">mail</span>
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
                                    Password
                                </label>
                                <button type="button" className="text-xs text-primary hover:underline">
                                    Forgot password?
                                </button>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-text-secondary group-focus-within:text-primary transition-colors text-[20px]">lock</span>
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-11 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-secondary hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 px-4 bg-primary hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Sign Up Link */}
                <p className="text-center mt-8 text-text-secondary text-sm">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-primary hover:underline font-semibold transition-colors">
                        Create an account
                    </Link>
                </p>
            </div>
        </div>
    );
}

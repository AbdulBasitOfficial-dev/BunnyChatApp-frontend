import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const validatePassword = (password: string) => {
        if (password.length < 6) {
            return 'Password must be at least 6 characters';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !email || !password || !confirmPassword) {
            toast.error('Please fill in all fields');
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            toast.error(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (!agreeToTerms) {
            toast.error('Please agree to the terms and conditions');
            return;
        }

        setIsLoading(true);

        try {
            await register(name, email, password);
            toast.success('Account created successfully! 🎉');
            navigate('/');
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
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

            <div className="w-full max-w-[440px] relative z-10">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary mb-6 shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-white text-4xl">chat_bubble</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Create Account</h1>
                    <p className="text-text-secondary">Join BunnyChat today</p>
                </div>

                {/* Signup Card */}
                <div className="bg-surface-dark border border-border-dark rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name Field */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-2">
                                Full Name
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-text-secondary group-focus-within:text-primary transition-colors text-[20px]">person</span>
                                </div>
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

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

                        {/* Password Fields Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                                    Password
                                </label>
                                <div className="relative group">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-2">
                                    Confirm
                                </label>
                                <div className="relative group">
                                    <input
                                        id="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                             <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="flex items-center gap-2 text-xs text-text-secondary hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px]">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                                {showPassword ? 'Hide' : 'Show'} Password
                            </button>
                        </div>

                        {/* Terms Checkbox */}
                        <div className="flex items-start gap-3 py-2">
                            <div className="flex items-center h-5">
                                <input
                                    id="terms"
                                    type="checkbox"
                                    required
                                    checked={agreeToTerms}
                                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                                    className="size-4 rounded border-border-dark bg-background-dark text-primary focus:ring-primary focus:ring-offset-background-dark"
                                />
                            </div>
                            <label htmlFor="terms" className="text-xs text-text-secondary leading-normal">
                                I agree to the <button type="button" className="text-primary hover:underline">Terms of Service</button> and <button type="button" className="text-primary hover:underline">Privacy Policy</button>
                            </label>
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
                                    <span>Create Account</span>
                                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Sign In Link */}
                <p className="text-center mt-8 text-text-secondary text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary hover:underline font-semibold transition-colors">
                        Sign in instead
                    </Link>
                </p>
            </div>
        </div>
    );
}

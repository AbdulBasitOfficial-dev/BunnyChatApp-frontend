import { useState } from 'react';
import { friendApi } from '../../services/friendApi';
import toast from 'react-hot-toast';

interface AddFriendModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function AddFriendModal({ isOpen, onClose, onSuccess }: AddFriendModalProps) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast.error('Please enter an email address');
            return;
        }

        setIsLoading(true);

        try {
            await friendApi.sendRequest(email);
            toast.success('Friend request sent! 🎉');
            setEmail('');
            onSuccess?.();
            onClose();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to send friend request');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-[440px] bg-surface-dark border border-border-dark rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary mb-6 shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-white text-4xl">person_add</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Add New Friend</h2>
                    <p className="text-text-secondary text-sm">Grow your circle by inviting friends by email</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="friendEmail" className="block text-sm font-medium text-text-secondary mb-2">
                            Email Address
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-text-secondary group-focus-within:text-primary transition-colors text-[20px]">mail</span>
                            </div>
                            <input
                                id="friendEmail"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-11 pr-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm"
                                placeholder="friend@example.com"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3.5 px-4 bg-transparent hover:bg-white/5 text-text-secondary font-semibold rounded-xl transition-colors border border-transparent hover:border-border-dark"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-3.5 px-4 bg-primary hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Send Request</span>
                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Close Button Top Right */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 size-8 flex items-center justify-center text-text-secondary hover:text-white rounded-full hover:bg-white/5 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>
        </div>
    );
}

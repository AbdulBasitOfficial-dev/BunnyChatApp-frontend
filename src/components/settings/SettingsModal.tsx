import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userApi, type UserProfile } from '../../services/userApi';
import toast from 'react-hot-toast';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProfileUpdate?: (profile: UserProfile) => void;
}

const PRESET_COLORS = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#14b8a6', // Teal
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
];

type TabType = 'profile' | 'security' | 'appearance';

export default function SettingsModal({ isOpen, onClose, onProfileUpdate }: SettingsModalProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);

    // Form states
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [status, setStatus] = useState('');
    const [profileColor, setProfileColor] = useState('#6366f1');

    // Password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadProfile();
        }
    }, [isOpen]);

    const loadProfile = async () => {
        setIsLoading(true);
        try {
            const data = await userApi.getMe();
            setProfile(data);
            setName(data.name || '');
            setBio(data.bio || '');
            setStatus(data.status || '');
            setProfileColor(data.profileColor || '#6366f1');
        } catch (error) {
            console.error('Failed to load profile:', error);
            toast.error('Failed to load profile');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!name.trim()) {
            toast.error('Name is required');
            return;
        }

        setIsSaving(true);
        try {
            const updatedProfile = await userApi.updateProfile({
                name: name.trim(),
                bio: bio.trim(),
                status: status.trim(),
                profileColor,
            });
            setProfile(updatedProfile);
            onProfileUpdate?.(updatedProfile);
            toast.success('Profile updated! ✨');
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('Please fill all password fields');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('New password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsSaving(true);
        try {
            await userApi.changePassword(currentPassword, newPassword);
            toast.success('Password changed successfully! 🔐');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-[600px] bg-surface-dark border border-border-dark rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-border-dark">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">settings</span>
                            </div>
                            <h1 className="text-xl font-bold text-white">Settings</h1>
                        </div>
                        <button
                            onClick={onClose}
                            className="size-8 flex items-center justify-center text-text-secondary hover:text-white rounded-full hover:bg-white/5 transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-1 bg-background-dark rounded-xl border border-border-dark mt-5">
                        {[
                            { id: 'profile', label: 'Profile', icon: 'person' },
                            { id: 'security', label: 'Security', icon: 'lock' },
                            { id: 'appearance', label: 'Appearance', icon: 'palette' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <p className="text-text-secondary text-sm">Loading profile...</p>
                        </div>
                    ) : (
                        <>
                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    {/* Avatar Preview */}
                                    <div className="flex flex-col items-center gap-4 pb-6 border-b border-border-dark">
                                        <div 
                                            className="size-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg"
                                            style={{ backgroundColor: profileColor }}
                                        >
                                            {name?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white font-semibold text-lg">{name || 'Your Name'}</p>
                                            <p className="text-text-secondary text-sm">{user?.email}</p>
                                        </div>
                                    </div>

                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-2">
                                            Display Name
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm"
                                            placeholder="Your display name"
                                        />
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-2">
                                            Status
                                        </label>
                                        <input
                                            type="text"
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            maxLength={100}
                                            className="block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm"
                                            placeholder="Hey there! I am using BunnyChat."
                                        />
                                        <p className="text-text-secondary text-xs mt-1">{status.length}/100 characters</p>
                                    </div>

                                    {/* Bio */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-2">
                                            Bio
                                        </label>
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            rows={3}
                                            maxLength={250}
                                            className="block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm resize-none"
                                            placeholder="Tell us about yourself..."
                                        />
                                        <p className="text-text-secondary text-xs mt-1">{bio.length}/250 characters</p>
                                    </div>
                                </div>
                            )}

                            {/* Security Tab */}
                            {activeTab === 'security' && (
                                <div className="space-y-6">
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                        <div className="flex gap-3">
                                            <span className="material-symbols-outlined text-amber-500">info</span>
                                            <div>
                                                <p className="text-amber-400 font-semibold text-sm">Password Security</p>
                                                <p className="text-amber-300/70 text-xs mt-1">Choose a strong password with at least 6 characters.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-2">
                                            Current Password
                                        </label>
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm"
                                            placeholder="Enter current password"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-2">
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm"
                                            placeholder="Enter new password"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-2">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm"
                                            placeholder="Confirm new password"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Appearance Tab */}
                            {activeTab === 'appearance' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-3">
                                            Profile Color
                                        </label>
                                        <div className="flex flex-wrap gap-3">
                                            {PRESET_COLORS.map((color) => (
                                                <button
                                                    key={color}
                                                    onClick={() => setProfileColor(color)}
                                                    className={`size-10 rounded-full transition-all ${
                                                        profileColor === color
                                                            ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-dark scale-110'
                                                            : 'hover:scale-105'
                                                    }`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-2">
                                            Custom Color
                                        </label>
                                        <div className="flex gap-3">
                                            <input
                                                type="color"
                                                value={profileColor}
                                                onChange={(e) => setProfileColor(e.target.value)}
                                                className="size-12 rounded-lg cursor-pointer border-2 border-border-dark"
                                            />
                                            <input
                                                type="text"
                                                value={profileColor}
                                                onChange={(e) => setProfileColor(e.target.value)}
                                                className="flex-1 px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm uppercase"
                                                placeholder="#6366f1"
                                            />
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div className="p-4 bg-background-dark rounded-xl border border-border-dark">
                                        <p className="text-text-secondary text-xs font-semibold mb-3">PREVIEW</p>
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="size-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                                                style={{ backgroundColor: profileColor }}
                                            >
                                                {name?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold">{name || 'Your Name'}</p>
                                                <p className="text-text-secondary text-sm">{status || 'Your status'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-background-dark border-t border-border-dark flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-transparent hover:bg-white/5 text-text-secondary font-semibold rounded-xl transition-colors border border-transparent hover:border-border-dark"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={activeTab === 'security' ? handleChangePassword : handleSaveProfile}
                        disabled={isSaving}
                        className="flex-1 py-3 px-4 bg-primary hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>{activeTab === 'security' ? 'Change Password' : 'Save Changes'}</span>
                                <span className="material-symbols-outlined text-[20px]">
                                    {activeTab === 'security' ? 'lock' : 'check'}
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

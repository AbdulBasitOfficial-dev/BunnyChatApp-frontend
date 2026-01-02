import { useState } from 'react';
import { groupApi } from '../../services/groupApi';
import type { Friend } from '../../types/friend.types';
import toast from 'react-hot-toast';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    friends: Friend[];
}

export default function CreateGroupModal({ isOpen, onClose, onSuccess, friends }: CreateGroupModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleToggleMember = (friendId: string) => {
        setSelectedMembers(prev =>
            prev.includes(friendId)
                ? prev.filter(id => id !== friendId)
                : [...prev, friendId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Please enter a group name');
            return;
        }

        setIsLoading(true);

        try {
            await groupApi.createGroup(name.trim(), description.trim(), selectedMembers);
            toast.success('Group created! 🎉');
            setName('');
            setDescription('');
            setSelectedMembers([]);
            onSuccess?.();
            onClose();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to create group');
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
            <div className="relative w-full max-w-[500px] bg-surface-dark border border-border-dark rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-border-dark">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">group_add</span>
                            </div>
                            <h1 className="text-xl font-bold text-white">Create Group</h1>
                        </div>
                        <button
                            onClick={onClose}
                            className="size-8 flex items-center justify-center text-text-secondary hover:text-white rounded-full hover:bg-white/5 transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Group Name */}
                    <div>
                        <label htmlFor="groupName" className="block text-sm font-medium text-text-secondary mb-2">
                            Group Name *
                        </label>
                        <input
                            id="groupName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm"
                            placeholder="e.g., Project Team, Friends Forever"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="groupDesc" className="block text-sm font-medium text-text-secondary mb-2">
                            Description (optional)
                        </label>
                        <textarea
                            id="groupDesc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary transition-all sm:text-sm resize-none"
                            placeholder="What's this group about?"
                        />
                    </div>

                    {/* Select Members */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">
                            Add Members ({selectedMembers.length} selected)
                        </label>
                        {friends.length === 0 ? (
                            <div className="text-center py-8 text-text-secondary text-sm">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">person_off</span>
                                <p>No friends to add. Add friends first!</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                {friends.map(friend => (
                                    <label
                                        key={friend.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                                            selectedMembers.includes(friend.id)
                                                ? 'bg-primary/10 border-primary/30'
                                                : 'bg-white/5 border-transparent hover:border-border-dark'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedMembers.includes(friend.id)}
                                            onChange={() => handleToggleMember(friend.id)}
                                            className="sr-only"
                                        />
                                        <div className="size-10 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center text-white font-bold">
                                            {friend.name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-semibold text-sm">{friend.name}</p>
                                            <p className="text-text-secondary text-xs">{friend.email}</p>
                                        </div>
                                        <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                            selectedMembers.includes(friend.id)
                                                ? 'bg-primary border-primary'
                                                : 'border-border-dark'
                                        }`}>
                                            {selectedMembers.includes(friend.id) && (
                                                <span className="material-symbols-outlined text-white text-[16px]">check</span>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </form>

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
                        onClick={handleSubmit}
                        disabled={isLoading || !name.trim()}
                        className="flex-1 py-3 px-4 bg-primary hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Create Group</span>
                                <span className="material-symbols-outlined text-[20px]">add</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

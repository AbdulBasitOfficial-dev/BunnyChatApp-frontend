import { useState, useEffect } from 'react';
import { groupApi } from '../../services/groupApi';
import { useAuth } from '../../context/AuthContext';
import type { Group } from '../../types/group.types';
import type { Friend } from '../../types/friend.types';
import CreateGroupModal from './CreateGroupModal';
import toast from 'react-hot-toast';

interface GroupsListProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectGroup?: (group: Group) => void;
    friends: Friend[];
}

export default function GroupsList({ isOpen, onClose, onSelectGroup, friends }: GroupsListProps) {
    const { user } = useAuth();
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadGroups();
        }
    }, [isOpen]);

    const loadGroups = async () => {
        setIsLoading(true);
        try {
            const data = await groupApi.getGroups();
            setGroups(data);
        } catch (error) {
            console.error('Failed to load groups:', error);
            toast.error('Failed to load groups');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteGroup = async (groupId: string, groupName: string) => {
        if (!confirm(`Are you sure you want to delete "${groupName}"? This cannot be undone.`)) return;

        try {
            await groupApi.deleteGroup(groupId);
            toast.success('Group deleted');
            loadGroups();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to delete group');
        }
    };

    const handleLeaveGroup = async (groupId: string) => {
        if (!confirm('Are you sure you want to leave this group?')) return;

        try {
            await groupApi.leaveGroup(groupId);
            toast.success('You left the group');
            loadGroups();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to leave group');
        }
    };

    if (!isOpen) return null;

    return (
        <>
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
                                <div className="size-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined">groups</span>
                                </div>
                                <h1 className="text-xl font-bold text-white">Groups</h1>
                            </div>
                            <button
                                onClick={onClose}
                                className="size-8 flex items-center justify-center text-text-secondary hover:text-white rounded-full hover:bg-white/5 transition-all"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                    </div>

                    {/* List Content */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                <p className="text-text-secondary text-sm">Loading groups...</p>
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                                <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5 text-text-secondary opacity-50">
                                    <span className="material-symbols-outlined text-4xl">group_off</span>
                                </div>
                                <p className="text-text-secondary text-sm max-w-[200px] leading-relaxed">
                                    You're not in any groups yet. Create one to start chatting!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {groups.map(group => {
                                    const isAdmin = group.admin._id === user?.id;
                                    return (
                                        <div
                                            key={group.id}
                                            className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-transparent hover:border-border-dark transition-all"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="size-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                                                    {group.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-white font-semibold text-sm truncate">{group.name}</p>
                                                    <p className="text-text-secondary text-xs">{group.memberCount} members</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0">
                                                {onSelectGroup && (
                                                    <button
                                                        onClick={() => onSelectGroup(group)}
                                                        className="size-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/10 transition-all"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">chat</span>
                                                    </button>
                                                )}
                                                {isAdmin ? (
                                                    <button
                                                        onClick={() => handleDeleteGroup(group.id, group.name)}
                                                        className="size-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleLeaveGroup(group.id)}
                                                        className="size-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">logout</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-background-dark border-t border-border-dark flex justify-between items-center">
                        <p className="text-xs text-text-secondary">{groups.length} group(s)</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 text-primary hover:text-blue-400 text-sm font-bold transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Create Group
                        </button>
                    </div>
                </div>
            </div>

            <CreateGroupModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={loadGroups}
                friends={friends}
            />
        </>
    );
}

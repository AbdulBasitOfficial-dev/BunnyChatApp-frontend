import { useState, useEffect } from 'react';
import { friendApi } from '../../services/friendApi';
import { useAuth } from '../../context/AuthContext';
import type { Friend, FriendRequest } from '../../types/friend.types';
import toast from 'react-hot-toast';
import AddFriendModal from './AddFriendModal';

interface FriendsListProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectChat?: (friend: Friend) => void;
}

type TabType = 'pending' | 'sent' | 'all';

export default function FriendsList({ isOpen, onClose, onSelectChat }: FriendsListProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddFriend, setShowAddFriend] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, activeTab]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'all') {
                const data = await friendApi.getFriends();
                setFriends(data);
            } else if (activeTab === 'pending') {
                const data = await friendApi.getPendingRequests();
                setPendingRequests(data);
            } else {
                const data = await friendApi.getSentRequests();
                setSentRequests(data);
            }
        } catch (error: unknown) {
            console.error('Failed to load data:', error);
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        try {
            await friendApi.respondToRequest(requestId, 'accepted');
            toast.success('Friend request accepted! 🤝');
            loadData();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to accept request');
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            await friendApi.respondToRequest(requestId, 'rejected');
            toast.success('Friend request rejected');
            loadData();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to reject request');
        }
    };

    const handleCancelRequest = async (requestId: string) => {
        try {
            await friendApi.cancelRequest(requestId);
            toast.success('Friend request cancelled');
            loadData();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to cancel request');
        }
    };

    const handleRemoveFriend = async (friendEmail: string, friendName: string) => {
        if (!confirm(`Are you sure you want to remove ${friendName}?`)) {
            return;
        }

        try {
            await friendApi.removeFriend(friendEmail);
            toast.success('Friend removed');
            loadData();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to remove friend');
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
                    <div className="p-6 border-b border-border-dark flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">group</span>
                                </div>
                                <h1 className="text-xl font-bold text-white">Friendships</h1>
                            </div>
                            <button
                                onClick={onClose}
                                className="size-8 flex items-center justify-center text-text-secondary hover:text-white rounded-full hover:bg-white/5 transition-all"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex p-1 bg-background-dark rounded-xl border border-border-dark">
                            {[
                                { id: 'pending', label: 'Incoming', icon: 'inbox' },
                                { id: 'sent', label: 'Sent', icon: 'outbox' },
                                { id: 'all', label: 'All Friends', icon: 'person' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
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

                    {/* List Content */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                <p className="text-text-secondary text-sm">Loading data...</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* All Friends */}
                                {activeTab === 'all' && (
                                    friends.length > 0 ? friends.map((friend: Friend) => (
                                        <div key={friend.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-transparent hover:border-border-dark transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center text-white font-bold">
                                                    {friend.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold text-sm">{friend.name}</p>
                                                    <p className="text-text-secondary text-xs">{friend.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                {onSelectChat && (
                                                    <button onClick={() => onSelectChat(friend)} className="size-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/10 transition-all">
                                                        <span className="material-symbols-outlined text-[20px]">chat</span>
                                                    </button>
                                                )}
                                                <button onClick={() => handleRemoveFriend(friend.email, friend.name)} className="size-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-all">
                                                    <span className="material-symbols-outlined text-[20px]">person_remove</span>
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <EmptyState icon="person_off" message="No friends yet. Add some people to chat with!" />
                                    )
                                )}

                                {/* Pending Incoming */}
                                {activeTab === 'pending' && (
                                    pendingRequests.length > 0 ? pendingRequests.map((request: FriendRequest) => (
                                        <div key={request.id} className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                                                    {request.from?.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold text-sm">{request.from?.name}</p>
                                                    <p className="text-text-secondary text-xs">Wants to be your friend</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleAcceptRequest(request.id)} className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-all">Accept</button>
                                                <button onClick={() => handleRejectRequest(request.id)} className="px-3 py-1.5 bg-background-dark text-text-secondary text-xs font-bold rounded-lg hover:bg-red-400/10 hover:text-red-400 transition-all">Decline</button>
                                            </div>
                                        </div>
                                    )) : (
                                        <EmptyState icon="inbox" message="No incoming friend requests at the moment." />
                                    )
                                )}

                                {/* Sent Outgoing */}
                                {activeTab === 'sent' && (
                                    sentRequests.length > 0 ? sentRequests.map((request: FriendRequest) => (
                                        <div key={request.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center text-white font-bold opacity-70">
                                                    {request.to?.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold text-sm">{request.to?.name}</p>
                                                    <p className="text-text-secondary text-xs">Waiting for response</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleCancelRequest(request.id)} className="text-xs text-red-400 hover:underline px-3 py-1.5">Cancel</button>
                                        </div>
                                    )) : (
                                        <EmptyState icon="outbox" message="You haven't sent any friend requests recently." />
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-background-dark border-t border-border-dark flex justify-between items-center">
                        <p className="text-xs text-text-secondary">Connected as {user?.email}</p>
                        <button 
                            onClick={() => setShowAddFriend(true)}
                            className="flex items-center gap-2 text-primary hover:text-blue-400 text-sm font-bold transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Find New People
                        </button>
                    </div>
                </div>
            </div>

            <AddFriendModal
                isOpen={showAddFriend}
                onClose={() => setShowAddFriend(false)}
                onSuccess={loadData}
            />
        </>
    );
}

function EmptyState({ icon, message }: { icon: string, message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5 text-text-secondary opacity-50">
                <span className="material-symbols-outlined text-4xl">{icon}</span>
            </div>
            <p className="text-text-secondary text-sm max-w-[200px] leading-relaxed">{message}</p>
        </div>
    );
}

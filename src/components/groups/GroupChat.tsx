import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { groupApi } from '../../services/groupApi';
import { socketService } from '../../services/socket';
import type { Group, GroupMessage } from '../../types/group.types';
import toast from 'react-hot-toast';

interface GroupChatProps {
    group: Group;
    onClose: () => void;
    onLeave?: () => void;
}

export default function GroupChat({ group, onClose, onLeave }: GroupChatProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showMembers, setShowMembers] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isAdmin = group.admin._id === user?.id;

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    };

    useEffect(() => {
        loadMessages();

        // Listen for new group messages
        const unsubscribe = socketService.on('group-message', (data: any) => {
            if (data.groupId === group.id) {
                setMessages(prev => {
                    // Check for optimistic update
                    if (data.clientId) {
                        const tempIndex = prev.findIndex(m => m.id === `temp_${data.clientId}`);
                        if (tempIndex !== -1) {
                            const newMessages = [...prev];
                            newMessages[tempIndex] = {
                                id: data.id,
                                groupId: data.groupId,
                                sender: { _id: data.senderId, name: data.senderName, email: '' },
                                content: data.content,
                                isSystemMessage: data.isSystemMessage,
                                createdAt: data.timestamp,
                            };
                            return newMessages;
                        }
                    }

                    // Avoid duplicates
                    if (prev.some(m => m.id === data.id)) return prev;

                    return [...prev, {
                        id: data.id,
                        groupId: data.groupId,
                        sender: { _id: data.senderId, name: data.senderName, email: '' },
                        content: data.content,
                        isSystemMessage: data.isSystemMessage,
                        createdAt: data.timestamp,
                    }];
                });
                scrollToBottom();
            }
        });

        return () => {
            unsubscribe();
        };
    }, [group.id]);

    useEffect(() => {
        if (messages.length > 0) {
            const timeout = setTimeout(() => scrollToBottom('auto'), 50);
            return () => clearTimeout(timeout);
        }
    }, [messages.length]);

    const loadMessages = async () => {
        setIsLoading(true);
        try {
            const data = await groupApi.getMessages(group.id);
            setMessages(data);
        } catch (error) {
            console.error('Failed to load messages:', error);
            toast.error('Failed to load messages');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim()) return;

        const content = newMessage.trim();
        const clientId = Date.now().toString();
        setNewMessage('');

        // Optimistic update
        const tempMsg: GroupMessage = {
            id: `temp_${clientId}`,
            groupId: group.id,
            sender: { _id: user?.id || '', name: user?.name || '', email: '' },
            content,
            isSystemMessage: false,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            await groupApi.sendMessage(group.id, content, clientId);
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message');
            setMessages(prev => prev.filter(m => m.id !== `temp_${clientId}`));
        }
    };

    const handleLeaveGroup = async () => {
        if (!confirm('Are you sure you want to leave this group?')) return;

        try {
            await groupApi.leaveGroup(group.id);
            toast.success('You left the group');
            onLeave?.();
            onClose();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to leave group');
        }
    };

    return (
        <div className="flex flex-col h-full bg-background-dark">
            {/* Header */}
            <div className="p-4 bg-surface-dark border-b border-border-dark flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="size-8 flex items-center justify-center text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-all">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="size-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold">
                        {group.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-white font-semibold">{group.name}</h2>
                        <button 
                            onClick={() => setShowMembers(!showMembers)}
                            className="text-text-secondary text-xs hover:text-primary transition-colors"
                        >
                            {group.memberCount} members
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isAdmin && (
                        <button
                            onClick={handleLeaveGroup}
                            className="px-3 py-1.5 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-400/10 transition-all"
                        >
                            Leave
                        </button>
                    )}
                </div>
            </div>

            {/* Members Dropdown */}
            {showMembers && (
                <div className="bg-surface-dark border-b border-border-dark p-4">
                    <h3 className="text-text-secondary text-xs font-semibold mb-3">MEMBERS</h3>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                        {group.members.map(member => (
                            <div key={member._id} className="flex items-center gap-3">
                                <div className="size-8 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center text-white font-semibold text-xs">
                                    {member.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-white text-sm font-medium">{member.name}</p>
                                </div>
                                {member._id === group.admin._id && (
                                    <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">Admin</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-secondary gap-3 opacity-50">
                        <span className="material-symbols-outlined text-4xl">chat</span>
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className={`flex w-full ${msg.isSystemMessage ? 'justify-center' : msg.sender._id === user?.id ? 'justify-end' : 'justify-start'}`}>
                            {msg.isSystemMessage ? (
                                <div className="text-text-secondary text-xs bg-white/5 px-3 py-1.5 rounded-full">
                                    {msg.content}
                                </div>
                            ) : (
                                <div className={`max-w-[80%] ${msg.sender._id === user?.id ? '' : 'flex gap-2'}`}>
                                    {msg.sender._id !== user?.id && (
                                        <div className="size-8 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                            {msg.sender.name.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        {msg.sender._id !== user?.id && (
                                            <p className="text-text-secondary text-xs mb-1 ml-1">{msg.sender.name}</p>
                                        )}
                                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                                            msg.sender._id === user?.id
                                                ? 'bg-primary text-white rounded-tr-none'
                                                : 'bg-surface-dark text-white rounded-tl-none border border-border-dark'
                                        }`}>
                                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                            <p className={`text-[10px] mt-1 ${msg.sender._id === user?.id ? 'text-indigo-200' : 'text-text-secondary'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Input */}
            <div className="p-4 bg-surface-dark border-t border-border-dark">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-background-dark border border-border-dark rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-text-secondary"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined">send</span>
                    </button>
                </form>
            </div>
        </div>
    );
}

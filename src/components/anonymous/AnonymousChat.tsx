import { useState, useEffect, useRef } from 'react';
import { socketService } from '../../services/socket';
import toast from 'react-hot-toast';
import type { AnonymousMessage } from '../../services/anonymousRoomApi';

interface AnonymousChatProps {
    roomId: string;
    roomName: string;
    anonymousName: string;
    expiresAt: string;
    initialActiveUsers?: number; // Added: Initial count from join response
    onClose: () => void;
}

export default function AnonymousChat({ roomId, roomName, anonymousName, expiresAt, initialActiveUsers = 0, onClose }: AnonymousChatProps) {
    const [messages, setMessages] = useState<AnonymousMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeUsers, setActiveUsers] = useState(initialActiveUsers); // Initialize with actual count
    const [timeRemaining, setTimeRemaining] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateTimeRemaining = () => {
            const now = new Date().getTime();
            const expires = new Date(expiresAt).getTime();
            const diff = expires - now;

            if (diff <= 0) {
                setTimeRemaining('Expired');
                toast.error('Room has expired');
                onClose();
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (hours > 0) {
                setTimeRemaining(`${hours}h ${minutes}m`);
            } else if (minutes > 0) {
                setTimeRemaining(`${minutes}m ${seconds}s`);
            } else {
                setTimeRemaining(`${seconds}s`);
            }
        };

        updateTimeRemaining();
        const interval = setInterval(updateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [expiresAt, onClose]);

    useEffect(() => {
        // Listen for new messages
        const unsubscribeMessage = socketService.on('receive-anonymous-message', (data: any) => {
            if (data.roomId === roomId) {
                setMessages(prev => {
                    // Check if this is a response to our optimistic message (clientId match)
                    if (data.clientId) {
                        const tempIndex = prev.findIndex(m => m.id === `temp_${data.clientId}`);
                        if (tempIndex !== -1) {
                            // Replace the temp message with the real one
                            const newMessages = [...prev];
                            newMessages[tempIndex] = {
                                id: data.id,
                                anonymousName: data.anonymousName,
                                content: data.content,
                                createdAt: data.createdAt,
                                isMe: data.anonymousName === anonymousName,
                            };
                            return newMessages;
                        }
                    }

                    // Avoid duplicates (for non-sender messages)
                    if (prev.some(m => m.id === data.id)) return prev;

                    return [...prev, {
                        id: data.id,
                        anonymousName: data.anonymousName,
                        content: data.content,
                        createdAt: data.createdAt,
                        isMe: data.anonymousName === anonymousName,
                    }];
                });
            }
        });

        // Listen for user join/leave
        const unsubscribeJoin = socketService.on('user-joined-anonymous-room', (data: any) => {
            if (data.roomId === roomId) {
                setActiveUsers(data.activeUsersCount);
                toast.success(`${data.anonymousName} joined`, { duration: 2000 });
            }
        });

        const unsubscribeLeave = socketService.on('user-left-anonymous-room', (data: any) => {
            if (data.roomId === roomId) {
                setActiveUsers(data.activeUsersCount);
                toast(`${data.anonymousName} left`, { duration: 2000, icon: '👋' });
            }
        });

        return () => {
            unsubscribeMessage();
            unsubscribeJoin();
            unsubscribeLeave();
        };
    }, [roomId, anonymousName]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;

        const content = newMessage.trim();
        const clientId = Date.now().toString();
        setNewMessage('');

        // Optimistic UI update
        const tempMessage: AnonymousMessage = {
            id: `temp_${clientId}`,
            anonymousName: anonymousName,
            content,
            createdAt: new Date().toISOString(),
            isMe: true,
        };
        setMessages(prev => [...prev, tempMessage]);

        // Emit to server
        socketService.emit('send-anonymous-message', {
            roomId,
            content,
            clientId,
        });
    };

    const handleLeave = () => {
        socketService.emit('leave-anonymous-room');
        toast.success('Left anonymous room');
        onClose();
    };

    return (
        <div className="flex flex-col h-full bg-background-dark">
            {/* Header */}
            <div className="h-20 glass border-b border-border-dark flex items-center justify-between px-8 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="size-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold border-2 border-purple-400/30">
                        <span className="material-symbols-outlined">public</span>
                    </div>
                    <div>
                        <h2 className="text-white font-bold tracking-tight">{roomName}</h2>
                        <div className="flex items-center gap-3 text-xs text-text-secondary">
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">group</span>
                                {activeUsers} online
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                {timeRemaining}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg">
                        <span className="text-primary font-semibold text-sm">{anonymousName}</span>
                    </div>
                    <button
                        onClick={handleLeave}
                        className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg font-medium hover:bg-red-500/20 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Leave
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                {/* Welcome Message */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                    <span className="material-symbols-outlined text-primary text-3xl mb-2 block">lock</span>
                    <p className="text-white font-semibold mb-1">Anonymous Room</p>
                    <p className="text-sm text-text-secondary">
                        Your identity is hidden. Be respectful and have fun! Room expires in {timeRemaining}.
                    </p>
                </div>

                {messages.map((msg) => {
                    const isMe = msg.isMe || msg.anonymousName === anonymousName;
                    return (
                        <div key={msg.id} className={`flex gap-4 max-w-[80%] ${isMe ? 'self-end flex-row-reverse' : ''}`}>
                            {!isMe && (
                                <div className="size-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
                                    {msg.anonymousName.charAt(0)}
                                </div>
                            )}
                            <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : ''}`}>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-semibold text-white">{isMe ? 'You' : msg.anonymousName}</span>
                                    <span className="text-xs text-text-secondary">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className={`p-3 rounded-2xl shadow-sm text-sm leading-relaxed ${isMe ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-tr-none' : 'bg-surface-dark border border-border-dark text-white rounded-tl-none'}`}>
                                    <p>{msg.content}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 glass border-t border-border-dark">
                <div className="flex items-end gap-3 max-w-4xl mx-auto bg-background-dark/50 border border-border-dark rounded-2xl p-2 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Send anonymous message..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-text-secondary py-2 px-3 resize-none max-h-32 custom-scrollbar text-sm"
                        rows={1}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="size-10 flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                    >
                        <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

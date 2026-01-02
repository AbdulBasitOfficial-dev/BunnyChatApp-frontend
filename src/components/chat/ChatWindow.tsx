import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { chatApi } from '../../services/chatApi';
import type { Message } from '../../services/chatApi';
import { socketService } from '../../services/socket';
import type { Friend } from '../../types/friend.types';
import toast from 'react-hot-toast';

interface ChatWindowProps {
    friend: Friend;
    onClose: () => void;
}

export default function ChatWindow({ friend, onClose }: ChatWindowProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        loadHistory();

        // Listen for new messages
        const unsubscribe = socketService.on('receive-message', (data: any) => {
            if (data.senderId === friend.id) {
                setMessages((prev) => [...prev, {
                    _id: data.id,
                    sender: data.senderId,
                    recipient: user?.id || '',
                    content: data.content,
                    isRead: false,
                    createdAt: data.timestamp
                }]);
                // Mark as read
                chatApi.markAsRead(friend.id).catch(console.error);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [friend.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const history = await chatApi.getHistory(friend.id);
            setMessages(history);
            await chatApi.markAsRead(friend.id);
        } catch (error) {
            console.error('Failed to load history:', error);
            toast.error('Failed to load chat history');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const content = newMessage.trim();
        setNewMessage('');

        // Optimistically add to UI? Better wait for socket response or just emit
        socketService.emit('send-message', {
            recipientId: friend.id,
            content
        });

        // The socket service handleSendMessage returns the saved message in the callback if we had one
        // But here we'll just add it to our list manually or wait for a confirmation
        // For simplicity, let's assume it works and add locally
        const tempMsg: Message = {
            _id: Date.now().toString(),
            sender: user?.id || '',
            recipient: friend.id,
            content,
            isRead: true,
            createdAt: new Date().toISOString()
        };
        setMessages((prev) => [...prev, tempMsg]);
    };

    return (
        <div className="flex flex-col h-[550px] w-[380px] sm:w-[420px] glass rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 mr-4 mb-4">
            {/* Header */}
            <div className="p-4 bg-slate-800/90 border-b border-slate-700/50 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-inner">
                            {friend.name.charAt(0)}
                        </div>
                        {friend.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full shadow-lg shadow-green-500/50"></div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-sm leading-tight">{friend.name}</h3>
                        <p className={`text-[11px] font-medium ${friend.isOnline ? 'text-green-400' : 'text-slate-400'}`}>
                            {friend.isOnline ? 'Online' : 'Offline'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/40 custom-scrollbar scroll-smooth">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3 opacity-50">
                        <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium">Start a conversation</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg._id} className={`flex w-full ${msg.sender === user?.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm text-[13.5px] leading-relaxed break-words ${msg.sender === user?.id
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'
                                }`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                <div className={`text-[10px] mt-1.5 flex items-center gap-1 ${msg.sender === user?.id ? 'text-indigo-200 justify-end' : 'text-slate-400'
                                    }`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-800/90 border-t border-slate-700/50 backdrop-blur-md">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                    >
                        <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}

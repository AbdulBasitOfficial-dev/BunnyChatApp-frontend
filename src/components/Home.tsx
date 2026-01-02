import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { friendApi } from '../services/friendApi';
import { socketService } from '../services/socket';
import toast from 'react-hot-toast';
import AddFriendModal from './friends/AddFriendModal';
import FriendsList from './friends/FriendsList';
import GroupsList from './groups/GroupsList';
import GroupChat from './groups/GroupChat';
import SettingsModal from './settings/SettingsModal';
import CreateAnonymousRoomModal from './anonymous/CreateAnonymousRoomModal';
import AnonymousRoomCard from './anonymous/AnonymousRoomCard';
import AnonymousChat from './anonymous/AnonymousChat';
import type { Friend } from '../types/friend.types';
import type { Group } from '../types/group.types';
import type { Message } from '../services/chatApi';
import { chatApi } from '../services/chatApi';
import { anonymousRoomApi, type AnonymousRoom } from '../services/anonymousRoomApi';

export default function Home() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Sound effect helper
    const playNotificationSound = () => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.error('Audio play failed', e);
        }
    };

    // State
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [showInbox, setShowInbox] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [showGroups, setShowGroups] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

    // Anonymous Rooms State
    const [anonymousRooms, setAnonymousRooms] = useState<AnonymousRoom[]>([]);
    const [showCreateAnonymousRoom, setShowCreateAnonymousRoom] = useState(false);
    const [activeAnonymousRoom, setActiveAnonymousRoom] = useState<{ roomId: string; roomName: string; anonymousName: string; expiresAt: string; activeUsersCount: number } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const friendsRef = useRef<Friend[]>([]); // Keep a ref for notification click handler

    // Responsive states
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const [showFriendsList, setShowFriendsList] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [activityView, setActivityView] = useState<'friends' | 'anonymous'>('friends'); // Tab state for Activity Pane

    // Detect mobile/tablet screen
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth < 768) {
                setShowFriendsList(!selectedFriend);
            } else {
                setShowFriendsList(true);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // On mobile, hide friends list when chat is selected
    useEffect(() => {
        if (isMobile && selectedFriend) {
            setShowFriendsList(false);
        }
    }, [selectedFriend, isMobile]);

    // Keep friends ref in sync
    useEffect(() => {
        friendsRef.current = friends;
    }, [friends]);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
        }
    };

    useEffect(() => {
        loadFriends();
        loadPendingCount();
        loadAnonymousRooms();

        // Socket listeners
        const unsubscribeRequest = socketService.on('friend-request-received', () => {
            loadPendingCount();
            toast.success('New friend request! 🎉');
        });

        const unsubscribeAccepted = socketService.on('friend-request-accepted', () => {
            loadFriends();
            toast.success('Friend request accepted! 🤝');
        });

        const unsubscribeOnline = socketService.on('friend-online', (data: any) => {
            setFriends(prev => prev.map(f => f.id === data.userId ? { ...f, isOnline: true } : f));
        });

        const unsubscribeOffline = socketService.on('friend-offline', (data: any) => {
            setFriends(prev => prev.map(f => f.id === data.userId ? { ...f, isOnline: false } : f));
        });

        // Anonymous room listeners
        const unsubscribeNewRoom = socketService.on('new-anonymous-room', (room: any) => {
            setAnonymousRooms(prev => [room, ...prev]);
        });

        const unsubscribeRoomUpdate = socketService.on('anonymous-room-updated', (data: any) => {
            setAnonymousRooms(prev => prev.map(r => 
                r.roomId === data.roomId ? { ...r, activeUsersCount: data.activeUsersCount } : r
            ));
        });

        return () => {
            unsubscribeRequest();
            unsubscribeAccepted();
            unsubscribeOnline();
            unsubscribeOffline();
            unsubscribeNewRoom();
            unsubscribeRoomUpdate();
        };
    }, []); // Run only on mount

    // Separate effect for message handling (needs selectedFriend)
    useEffect(() => {
        const unsubscribeMessage = socketService.on('receive-message', (data: any) => {
            const isFromSelf = data.senderId === user?.id;
            const targetId = isFromSelf ? data.recipientId : data.senderId;

            if (selectedFriend?.id === targetId) {
                setMessages(prev => {
                    // 1. Check if we have an optimistic version of this message (by clientId)
                    if (data.clientId) {
                        const tempIndex = prev.findIndex(m => m._id === `temp_${data.clientId}`);
                        if (tempIndex !== -1) {
                            const newMessages = [...prev];
                            newMessages[tempIndex] = {
                                _id: data.id,
                                sender: data.senderId,
                                recipient: data.recipientId,
                                content: data.content,
                                isRead: isFromSelf,
                                createdAt: data.timestamp
                            };
                            return newMessages;
                        }
                    }

                    // 2. Check if message already exists by its database ID (avoid duplicates)
                    if (prev.some(m => m._id === data.id)) return prev;
                    
                    // 3. Otherwise add it as a new message
                    return [...prev, {
                        _id: data.id,
                        sender: data.senderId,
                        recipient: data.recipientId,
                        content: data.content,
                        isRead: isFromSelf,
                        createdAt: data.timestamp
                    }];
                });
                
                if (!isFromSelf) {
                    chatApi.markAsRead(data.senderId).catch(console.error);
                }
            } else if (!isFromSelf) {
                // Play sound
                playNotificationSound();
                
                // Show WhatsApp-like notification
                toast.custom((t) => (
                    <div
                        className={`${
                            t.visible ? 'animate-enter' : 'animate-leave'
                        } max-w-md w-full bg-surface-darker shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer hover:bg-surface-dark transition-colors border-l-4 border-primary`}
                        onClick={() => {
                            toast.dismiss(t.id);
                            // Use ref to get current friends (avoids stale closure)
                            const senderFriend = friendsRef.current.find(f => f.id === data.senderId);
                            if (senderFriend) {
                                setSelectedFriend(senderFriend);
                            }
                        }}
                    >
                        <div className="flex-1 w-0 p-4">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 pt-0.5">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                        {data.senderName?.charAt(0) || data.senderId?.charAt(0) || '?'}
                                    </div>
                                </div>
                                <div className="ml-3 flex-1">
                                    <p className="text-sm font-bold text-white">
                                        {data.senderName || 'New Message'}
                                    </p>
                                    <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                                        {data.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ), { duration: 4000 });
            }
        });

        return () => {
            unsubscribeMessage();
        };
    }, [selectedFriend, user?.id]); // Only depends on selectedFriend and user

    useEffect(() => {
        if (selectedFriend) {
            loadHistory(selectedFriend.id);
        } else {
            setMessages([]);
        }
    }, [selectedFriend]);

    useEffect(() => {
        if (messages.length > 0) {
            // If the last message is optimistic, don't scroll smoothly or wait
            const lastMsg = messages[messages.length - 1];
            const isOptimistic = lastMsg._id.toString().startsWith('temp_');
            
            if (isOptimistic) {
                scrollToBottom('smooth');
            } else {
                // If it's the first set of messages for this load, jump to bottom
                // We use a small timeout to ensure the DOM has rendered the new messages
                const timeout = setTimeout(() => scrollToBottom('auto'), 50);
                return () => clearTimeout(timeout);
            }
        }
    }, [messages.length]); // Only scroll when number of messages changes

    const loadFriends = async () => {
        try {
            const data = await friendApi.getFriends();
            setFriends(data);
        } catch (error) {
            console.error('Failed to load friends:', error);
        }
    };

    const loadPendingCount = async () => {
        try {
            const requests = await friendApi.getPendingRequests();
            setPendingRequestsCount(requests.length);
        } catch (error) {
            console.error('Failed to load pending count:', error);
        }
    };

    const loadAnonymousRooms = async () => {
        try {
            const rooms = await anonymousRoomApi.getAllRooms();
            setAnonymousRooms(rooms);
        } catch (error) {
            console.error('Failed to load anonymous rooms:', error);
        }
    };

    const loadHistory = async (friendId: string) => {
        setIsLoadingMessages(true);
        try {
            const history = await chatApi.getHistory(friendId);
            setMessages(history);
            await chatApi.markAsRead(friendId);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!activeSelectedFriend || !newMessage.trim()) return;

        const content = newMessage.trim();
        const clientId = Date.now().toString();
        setNewMessage('');

        // 1. Optimistically add to UI
        const tempMsg: Message = {
            _id: `temp_${clientId}`,
            sender: user?.id || '',
            recipient: activeSelectedFriend.id,
            content,
            isRead: true,
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            // 2. Make the ACTUAL API call (as requested by user)
            // The backend will handle the socket broadcast
            await chatApi.sendMessage(activeSelectedFriend.id, content, clientId);
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message');
            // Remove the temporary message if it failed
            setMessages(prev => prev.filter(m => m._id !== `temp_${clientId}`));
        }
    };

    const handleLogout = async () => {
        await logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const handleJoinAnonymousRoom = (roomId: string) => {
        socketService.emit('join-anonymous-room', { roomId });

        const unsubscribe = socketService.on('joined-anonymous-room', (data: any) => {
            setActiveAnonymousRoom({
                roomId: data.roomId,
                roomName: data.roomName,
                anonymousName: data.anonymousName,
                expiresAt: data.expiresAt,
                activeUsersCount: data.activeUsersCount || 1, // Capture user count
            });
            setSelectedFriend(null);
            setSelectedGroup(null);
            toast.success(`Joined as ${data.anonymousName}`);
            unsubscribe();
        });
    };

    const handleAnonymousRoomCreated = (roomId: string, roomName: string, anonymousName: string) => {
        // Room will be loaded via socket event, just navigate to it
        loadAnonymousRooms();
    };

    const filteredFriends = friends.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        f.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get the most up-to-date friend object from the friends list
    const activeSelectedFriend = selectedFriend ? friends.find(f => f.id === selectedFriend.id) || selectedFriend : null;

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-hidden h-screen w-full flex selection:bg-primary selection:text-white">
            {/* Column 1: Global Sidebar - Expandable */}
            <nav 
                className={`${sidebarExpanded ? 'w-[200px]' : 'w-[70px]'} md:${sidebarExpanded ? 'w-[200px]' : 'w-[80px]'} h-full flex-col py-4 md:py-6 bg-surface-darker border-r border-border-dark shrink-0 z-20 transition-all duration-300 hidden md:flex`}
                onMouseEnter={() => setSidebarExpanded(true)}
                onMouseLeave={() => setSidebarExpanded(false)}
            >
                {/* Logo */}
                <div className={`mb-6 px-4 ${sidebarExpanded ? 'px-4' : 'flex justify-center'}`}>
                    <div className={`flex items-center gap-3 ${sidebarExpanded ? '' : 'justify-center'}`}>
                        <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                            <span className="material-symbols-outlined text-white text-2xl">chat_bubble</span>
                        </div>
                        {sidebarExpanded && (
                            <span className="text-white font-bold text-lg whitespace-nowrap">BunnyChat</span>
                        )}
                    </div>
                </div>

                {/* Nav Items */}
                <div className={`flex flex-col gap-2 flex-1 ${sidebarExpanded ? 'px-3' : 'items-center px-2'}`}>
                    {[
                        { icon: 'inbox', label: 'Inbox', action: () => setShowInbox(true), active: false, badge: pendingRequestsCount > 0 },
                        { icon: 'person_add', label: 'Add Friend', action: () => setShowAddFriend(true), active: false },
                        { icon: 'groups', label: 'Groups', action: () => setShowGroups(true), active: false },
                        { icon: 'public', label: 'Anonymous Rooms', action: () => { setActivityView('anonymous'); setShowFriendsList(true); }, active: activityView === 'anonymous' },
                        { icon: 'notifications', label: 'Notifications', action: () => {}, active: false },
                    ].map((item) => (
                        <button
                            key={item.icon}
                            onClick={item.action}
                            className={`group relative flex items-center ${sidebarExpanded ? 'gap-3 px-3' : 'justify-center'} py-3 rounded-xl transition-all ${
                                item.active
                                    ? 'bg-primary/10 text-primary ring-1 ring-primary/20' 
                                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className="material-symbols-outlined shrink-0" style={item.active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                                {item.icon}
                            </span>
                            {sidebarExpanded && (
                                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                            )}
                            {item.badge && (
                                <span className={`${sidebarExpanded ? 'ml-auto' : 'absolute top-2 right-2'} size-2.5 bg-red-500 rounded-full border-2 border-surface-darker`} />
                            )}
                            {!sidebarExpanded && (
                                <span className="absolute left-14 bg-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                    {item.label}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Bottom Actions */}
                <div className={`flex flex-col gap-2 ${sidebarExpanded ? 'px-3' : 'items-center px-2'}`}>
                    <button 
                        onClick={() => setShowSettings(true)}
                        className={`group relative flex items-center ${sidebarExpanded ? 'gap-3 px-3' : 'justify-center'} py-3 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 transition-all`}
                    >
                        <span className="material-symbols-outlined shrink-0">settings</span>
                        {sidebarExpanded && <span className="text-sm font-medium">Settings</span>}
                        {!sidebarExpanded && (
                            <span className="absolute left-14 bg-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">Settings</span>
                        )}
                    </button>
                    <button 
                        onClick={handleLogout}
                        className={`group relative flex items-center ${sidebarExpanded ? 'gap-3 px-3' : 'justify-center'} py-3 rounded-xl text-text-secondary hover:text-red-400 hover:bg-white/5 transition-all`}
                    >
                        <span className="material-symbols-outlined shrink-0">logout</span>
                        {sidebarExpanded && <span className="text-sm font-medium">Logout</span>}
                    </button>
                    <div 
                        onClick={() => setShowSettings(true)}
                        className={`flex items-center ${sidebarExpanded ? 'gap-3 px-3 py-2' : 'justify-center py-2'} cursor-pointer hover:bg-white/5 rounded-xl transition-all`}
                    >
                        <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white font-bold border-2 border-border-dark relative shrink-0 text-xs uppercase">
                            {user?.name?.charAt(0) || 'U'}
                            <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-surface-darker rounded-full" />
                        </div>
                        {sidebarExpanded && (
                            <div className="min-w-0">
                                <p className="text-white font-semibold text-sm truncate">{user?.name}</p>
                                <p className="text-text-secondary text-xs truncate">{user?.email}</p>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-darker border-t border-border-dark flex items-center justify-around z-30">
                <button 
                    onClick={() => { setSelectedFriend(null); setShowFriendsList(true); setActivityView('friends'); }}
                    className={`flex flex-col items-center gap-1 p-2 ${activityView === 'friends' && !selectedFriend ? 'text-primary' : 'text-text-secondary'}`}
                >
                    <span className="material-symbols-outlined text-[22px]">chat</span>
                    <span className="text-[10px]">Chats</span>
                </button>
                <button 
                    onClick={() => { setActivityView('anonymous'); setShowFriendsList(true); setSelectedFriend(null); }}
                    className={`flex flex-col items-center gap-1 p-2 ${activityView === 'anonymous' ? 'text-primary' : 'text-text-secondary'}`}
                >
                    <span className="material-symbols-outlined text-[22px]">public</span>
                    <span className="text-[10px]">Anonymous</span>
                </button>
                <button 
                    onClick={() => setShowGroups(true)}
                    className="flex flex-col items-center gap-1 p-2 text-text-secondary"
                >
                    <span className="material-symbols-outlined text-[22px]">groups</span>
                    <span className="text-[10px]">Groups</span>
                </button>
                <button 
                    onClick={() => setShowInbox(true)}
                    className="flex flex-col items-center gap-1 p-2 text-text-secondary relative"
                >
                    <span className="material-symbols-outlined text-[22px]">inbox</span>
                    <span className="text-[10px]">Inbox</span>
                    {pendingRequestsCount > 0 && (
                        <span className="absolute top-1 right-2 size-2 bg-red-500 rounded-full" />
                    )}
                </button>
                <button 
                    onClick={() => setShowSettings(true)}
                    className="flex flex-col items-center gap-1 p-2 text-text-secondary"
                >
                    <span className="material-symbols-outlined text-[22px]">settings</span>
                    <span className="text-[10px]">Settings</span>
                </button>
                <button 
                    onClick={handleLogout}
                    className="flex flex-col items-center gap-1 p-2 text-red-400 hover:text-red-300"
                >
                    <span className="material-symbols-outlined text-[22px]">logout</span>
                    <span className="text-[10px]">Logout</span>
                </button>
            </nav>

            {/* Column 2: Activity Pane - Responsive */}
            <aside className={`${showFriendsList ? 'flex' : 'hidden'} md:flex w-full md:w-[320px] h-full flex-col bg-surface-dark border-r border-border-dark shrink-0 ${isMobile ? 'absolute inset-0 z-10 pb-16' : ''}`}>
                <div className="p-5 pb-2 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight text-white">
                            {activityView === 'friends' ? 'Messages' : 'Anonymous Rooms'}
                        </h2>
                        <button 
                            onClick={() => activityView === 'friends' ? {} : setShowCreateAnonymousRoom(true)}
                            className="size-8 rounded-full hover:bg-white/5 flex items-center justify-center text-text-secondary transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">
                                {activityView === 'friends' ? 'edit_square' : 'add'}
                            </span>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 bg-background-dark rounded-lg p-1">
                        <button
                            onClick={() => setActivityView('friends')}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                                activityView === 'friends'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-text-secondary hover:text-white'
                            }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">people</span>
                                Friends
                            </span>
                        </button>
                        <button
                            onClick={() => setActivityView('anonymous')}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                                activityView === 'anonymous'
                                    ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-sm'
                                    : 'text-text-secondary hover:text-white'
                            }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">public</span>
                                Anonymous
                            </span>
                        </button>
                    </div>

                    {/* Search Bar - Only for Friends */}
                    {activityView === 'friends' && (
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-text-secondary group-focus-within:text-primary transition-colors text-[20px]">search</span>
                            </div>
                            <input 
                                className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg leading-5 bg-background-dark text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-all" 
                                placeholder="Search chats..." 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {activityView === 'friends' ? (
                        <div className="pt-2">
                            <h3 className="px-5 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Active Conversations</h3>
                            <div className="px-3 mt-1 space-y-1">
                                {filteredFriends.map((friend) => (
                                    <div 
                                        key={friend.id}
                                        onClick={() => { setSelectedFriend(friend); setActiveAnonymousRoom(null); }}
                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors relative group ${selectedFriend?.id === friend.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5 border border-transparent'}`}
                                    >
                                        <div className="relative shrink-0">
                                            <div className="size-12 rounded-full bg-cover bg-center flex items-center justify-center bg-surface-dark border border-border-dark text-white font-bold text-sm">
                                                {friend.name.charAt(0)}
                                            </div>
                                            <span className={`absolute bottom-0 right-0 size-3 border-2 border-surface-dark rounded-full ${friend.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <h4 className={`text-sm font-semibold truncate ${selectedFriend?.id === friend.id ? 'text-white' : 'text-slate-300'}`}>{friend.name}</h4>
                                            </div>
                                            <p className="text-sm text-text-secondary truncate">
                                                {friend.isOnline ? 'Online' : 'Offline'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {filteredFriends.length === 0 && (
                                    <p className="text-center text-text-secondary text-sm mt-10 px-4">No friends found. Try adding some!</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="pt-2 px-3">
                            <h3 className="px-2 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Available Rooms</h3>
                            <div className="mt-1 space-y-3">
                                {anonymousRooms.map((room) => (
                                    <AnonymousRoomCard
                                        key={room.roomId}
                                        room={room}
                                        onJoin={handleJoinAnonymousRoom}
                                    />
                                ))}
                                {anonymousRooms.length === 0 && (
                                    <div className="text-center py-10 px-4">
                                        <div className="size-16 mx-auto bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full flex items-center justify-center mb-4">
                                            <span className="material-symbols-outlined text-purple-500 text-3xl">public</span>
                                        </div>
                                        <p className="text-text-secondary text-sm mb-4">No anonymous rooms available</p>
                                        <button
                                            onClick={() => setShowCreateAnonymousRoom(true)}
                                            className="px-4 py-2 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-all"
                                        >
                                            Create First Room
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Column 3: Main Chat Window - Responsive */}
            <main className={`flex-1 flex flex-col min-w-0 bg-background-dark relative ${isMobile && !selectedFriend && !activeAnonymousRoom ? 'hidden' : ''} ${isMobile ? 'pb-16' : ''}`}>
                {/* Show Anonymous Chat on Desktop */}
                {activeAnonymousRoom && !isMobile ? (
                    <AnonymousChat
                        roomId={activeAnonymousRoom.roomId}
                        roomName={activeAnonymousRoom.roomName}
                        anonymousName={activeAnonymousRoom.anonymousName}
                        expiresAt={activeAnonymousRoom.expiresAt}
                        initialActiveUsers={activeAnonymousRoom.activeUsersCount}
                        onClose={() => setActiveAnonymousRoom(null)}
                    />
                ) : selectedFriend ? (
                    <>
                {/* Header */}
                <div className="h-16 md:h-20 glass border-b border-border-dark flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
                    <div className="flex items-center gap-3 md:gap-4">
                        {/* Mobile Back Button */}
                        {isMobile && (
                            <button 
                                onClick={() => { setSelectedFriend(null); setShowFriendsList(true); }}
                                className="size-10 rounded-xl flex items-center justify-center text-text-secondary hover:text-white hover:bg-white/5 transition-all -ml-2"
                            >
                                <span className="material-symbols-outlined">arrow_back</span>
                            </button>
                        )}
                        <div className="relative group">
                            <div className="size-10 md:size-11 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-base md:text-lg border border-primary/30 group-hover:scale-105 transition-transform duration-300">
                                {activeSelectedFriend!.name.charAt(0)}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 size-3 md:size-3.5 border-2 border-surface-darker rounded-full ${activeSelectedFriend!.isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                        </div>
                        <div>
                            <h2 className="text-white font-bold tracking-tight text-sm md:text-base">{activeSelectedFriend!.name}</h2>
                            <span className="text-xs text-text-secondary flex items-center gap-1.5 font-medium">
                                <span className={`size-1.5 rounded-full ${activeSelectedFriend!.isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                                {activeSelectedFriend!.isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 md:gap-2">
                        {[
                            { icon: 'call', label: 'Call', hideOnMobile: true },
                            { icon: 'videocam', label: 'Video', hideOnMobile: true },
                            { icon: 'info', label: 'Toggle Info', action: () => setShowInfo(!showInfo) },
                        ].map((btn) => (
                            <button 
                                key={btn.icon}
                                onClick={btn.action}
                                className={`size-9 md:size-10 rounded-xl flex items-center justify-center transition-all ${btn.hideOnMobile ? 'hidden md:flex' : ''} ${btn.icon === 'info' && showInfo ? 'bg-primary text-white' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                            >
                                <span className="material-symbols-outlined text-[18px] md:text-[20px]">{btn.icon}</span>
                            </button>
                        ))}
                    </div>
                </div>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                            {isLoadingMessages ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, index) => {
                                        const isMe = msg.sender === user?.id;
                                        return (
                                            <div key={msg._id || index} className={`flex gap-4 max-w-[80%] ${isMe ? 'self-end flex-row-reverse' : ''}`}>
                                                {!isMe && (
                                                    <div className="size-8 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center text-[10px] text-white font-bold shrink-0 mt-1">
                                                        {activeSelectedFriend!.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : ''}`}>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-sm font-semibold text-white">{isMe ? 'You' : activeSelectedFriend!.name}</span>
                                                        <span className="text-xs text-text-secondary">
                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className={`p-3 rounded-2xl shadow-sm text-sm leading-relaxed ${isMe ? 'bg-primary text-white rounded-tr-none shadow-primary/10' : 'bg-surface-dark border border-border-dark text-white rounded-tl-none'}`}>
                                                        <p>{msg.content}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Input Area */}
                <div className="p-6 glass border-t border-border-dark">
                    <div className="flex items-end gap-3 max-w-4xl mx-auto bg-background-dark/50 border border-border-dark rounded-2xl p-2 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                        <button className="size-10 flex items-center justify-center text-text-secondary hover:text-white rounded-xl hover:bg-white/5 transition-all">
                            <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        </button>
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder={`Message ${activeSelectedFriend!.name}...`}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-text-secondary py-2 px-1 resize-none max-h-32 custom-scrollbar text-sm"
                            rows={1}
                        />
                        <div className="flex gap-1 items-center">
                            <button className="size-10 flex items-center justify-center text-text-secondary hover:text-primary rounded-xl hover:bg-primary/10 transition-all">
                                <span className="material-symbols-outlined text-[20px]">mood</span>
                            </button>
                            <button 
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim()}
                                className="size-10 flex items-center justify-center bg-primary text-white rounded-xl hover:bg-blue-600 shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                            >
                                <span className="material-symbols-outlined text-[20px]">send</span>
                            </button>
                        </div>
                    </div>
                </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                        <div className="size-24 bg-surface-dark rounded-full flex items-center justify-center mb-6 border border-border-dark">
                            <span className="material-symbols-outlined text-text-secondary text-5xl">chat</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Your Messages</h2>
                        <p className="text-text-secondary max-w-sm mb-6">Select a friend from the left to start a conversation or search for someone new.</p>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowAddFriend(true)}
                                className="px-6 py-3 bg-primary hover:bg-blue-600 text-white rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">person_add</span>
                                <span>Add New Friend</span>
                            </button>
                            <button 
                                onClick={() => { setActivityView('anonymous'); setShowFriendsList(true); }}
                                className="px-6 py-3 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">public</span>
                                <span>View Anonymous Rooms</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Column 4: Contextual Info Panel */}
            <aside className={`w-[300px] bg-surface-darker border-l border-border-dark hidden xl:flex flex-col h-full overflow-y-auto shrink-0 transition-all ${activeSelectedFriend ? 'opacity-100' : 'opacity-0'}`}>
                {activeSelectedFriend && (
                    <>
                        <div className="p-4 flex justify-end">
                            <button className="text-text-secondary hover:text-white" onClick={() => setShowInfo(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex flex-col items-center px-6 pb-6 border-b border-border-dark">
                            <div className="size-24 rounded-full bg-surface-dark border-4 border-surface-dark ring-4 ring-primary/20 flex items-center justify-center text-3xl text-white font-bold mb-4 relative">
                                {activeSelectedFriend.name.charAt(0)}
                                <div className={`absolute bottom-1 right-1 size-5 rounded-full border-4 border-surface-darker ${activeSelectedFriend.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                            </div>
                            <h3 className="text-lg font-bold text-white">{activeSelectedFriend.name}</h3>
                            <p className="text-sm text-text-secondary mb-4">{activeSelectedFriend.email}</p>
                            <div className="flex gap-3 w-full">
                                <button className="flex-1 py-2 rounded-lg bg-surface-dark border border-border-dark text-white text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">person</span>
                                    Profile
                                </button>
                                <button className="flex-1 py-2 rounded-lg bg-surface-dark border border-border-dark text-white text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">notifications_off</span>
                                    Mute
                                </button>
                            </div>
                        </div>
                        <div className="p-4 flex flex-col gap-6">
                            <div>
                                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">About</h4>
                                <p className="text-sm text-gray-300 leading-relaxed">No bio available yet.</p>
                                <div className="mt-3 flex flex-col gap-2">
                                    <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span className="material-symbols-outlined text-[18px]">mail</span>
                                        {activeSelectedFriend.email}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                        Joined Recently
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Privacy & Support</h4>
                                <div className="flex flex-col gap-1">
                                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-white flex items-center justify-between group transition-colors">
                                        <span className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-text-secondary group-hover:text-white text-[20px]">lock</span>
                                            Encryption
                                        </span>
                                        <span className="material-symbols-outlined text-text-secondary text-[16px]">chevron_right</span>
                                    </button>
                                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm text-red-400 flex items-center justify-between group transition-colors">
                                        <span className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-red-400 text-[20px]">block</span>
                                            Block User
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </aside>

            {/* Modals */}
            <AddFriendModal
                isOpen={showAddFriend}
                onClose={() => setShowAddFriend(false)}
                onSuccess={() => {
                    loadFriends();
                    loadPendingCount();
                }}
            />
            <FriendsList
                isOpen={showInbox}
                onClose={() => {
                    setShowInbox(false);
                    loadPendingCount();
                    loadFriends();
                }}
                onSelectChat={(friend) => {
                    setSelectedFriend(friend);
                    setShowInbox(false);
                }}
            />
            <GroupsList
                isOpen={showGroups}
                onClose={() => setShowGroups(false)}
                onSelectGroup={(group) => {
                    setSelectedGroup(group);
                    setSelectedFriend(null); // Clear friend selection when group is selected
                    setShowGroups(false);
                }}
                friends={friends}
            />

            {/* Group Chat Overlay */}
            {selectedGroup && (
                <div className="fixed inset-0 z-40 bg-background-dark">
                    <GroupChat
                        group={selectedGroup}
                        onClose={() => setSelectedGroup(null)}
                        onLeave={() => setSelectedGroup(null)}
                    />
                </div>
            )}

            {/* Settings Modal */}
            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />

            {/* Create Anonymous Room Modal */}
            <CreateAnonymousRoomModal
                isOpen={showCreateAnonymousRoom}
                onClose={() => setShowCreateAnonymousRoom(false)}
                onRoomCreated={handleAnonymousRoomCreated}
            />

            {/* Anonymous Chat Overlay - Mobile Only */}
            {activeAnonymousRoom && isMobile && (
                <div className="fixed inset-0 z-50 bg-background-dark">
                    <AnonymousChat
                        roomId={activeAnonymousRoom.roomId}
                        roomName={activeAnonymousRoom.roomName}
                        anonymousName={activeAnonymousRoom.anonymousName}
                        expiresAt={activeAnonymousRoom.expiresAt}
                        initialActiveUsers={activeAnonymousRoom.activeUsersCount}
                        onClose={() => setActiveAnonymousRoom(null)}
                    />
                </div>
            )}
        </div>
    );
}

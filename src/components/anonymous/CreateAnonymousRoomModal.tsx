import { useState } from 'react';
import { socketService } from '../../services/socket';
import toast from 'react-hot-toast';

interface CreateAnonymousRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRoomCreated: (roomId: string, roomName: string, anonymousName: string) => void;
}

export default function CreateAnonymousRoomModal({ isOpen, onClose, onRoomCreated }: CreateAnonymousRoomModalProps) {
    const [roomName, setRoomName] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen) return null;

    const handleAddTag = () => {
        const tag = tagInput.trim();
        if (tag && !tags.includes(tag) && tags.length < 5) {
            setTags([...tags, tag]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleCreateRoom = async () => {
        if (!roomName.trim()) {
            toast.error('Please enter a room name');
            return;
        }

        if (tags.length === 0) {
            toast.error('Please add at least one tag');
            return;
        }

        setIsCreating(true);

        try {
            // Emit create room event
            socketService.emit('create-anonymous-room', {
                roomName: roomName.trim(),
                tags,
            });

            // Listen for room created event
            const unsubscribe = socketService.on('room-created', (data: any) => {
                setIsCreating(false);
                toast.success(`Room "${data.roomName}" created! You're ${data.anonymousName}`);
                onRoomCreated(data.roomId, data.roomName, data.anonymousName);
                
                // Reset form
                setRoomName('');
                setTags([]);
                setTagInput('');
                onClose();
                
                unsubscribe();
            });

            // Handle error
            const errorUnsubscribe = socketService.on('error', (error: any) => {
                setIsCreating(false);
                toast.error(error.message || 'Failed to create room');
                errorUnsubscribe();
            });

        } catch (error) {
            setIsCreating(false);
            toast.error('Failed to create room');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-lg shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border-dark">
                    <div>
                        <h2 className="text-xl font-bold text-white">Create Anonymous Room</h2>
                        <p className="text-sm text-text-secondary mt-1">
                            Room expires in 2 hours • Everyone gets an anonymous name
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-10 rounded-xl flex items-center justify-center text-text-secondary hover:text-white hover:bg-white/5 transition-all"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Room Name */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Room Name
                        </label>
                        <input
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="e.g., Coding Buddies, Gamers Lounge..."
                            maxLength={50}
                            className="w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Tags (up to 5)
                        </label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag();
                                    }
                                }}
                                placeholder="e.g., #coding, #games"
                                maxLength={20}
                                disabled={tags.length >= 5}
                                className="flex-1 px-4 py-2.5 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
                            />
                            <button
                                onClick={handleAddTag}
                                disabled={tags.length >= 5 || !tagInput.trim()}
                                className="px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl font-medium hover:bg-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add
                            </button>
                        </div>
                        
                        {/* Tag List */}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium"
                                    >
                                        {tag.startsWith('#') ? tag : `#${tag}`}
                                        <button
                                            onClick={() => handleRemoveTag(tag)}
                                            className="hover:text-red-400 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info Box */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-primary mt-0.5">info</span>
                            <div className="text-sm text-text-secondary space-y-1">
                                <p>• Your identity will remain completely anonymous</p>
                                <p>• Room and all messages auto-delete after 2 hours</p>
                                <p>• No friend requests or private chats allowed</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-border-dark">
                    <button
                        onClick={onClose}
                        disabled={isCreating}
                        className="flex-1 px-4 py-3 bg-surface-darker border border-border-dark text-white rounded-xl font-medium hover:bg-white/5 transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateRoom}
                        disabled={isCreating || !roomName.trim() || tags.length === 0}
                        className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-blue-600 shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                    >
                        {isCreating ? (
                            <>
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Creating...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                                Create Room
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

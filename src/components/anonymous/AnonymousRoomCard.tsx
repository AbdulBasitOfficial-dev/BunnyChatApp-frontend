import { useEffect, useState } from 'react';
import type { AnonymousRoom } from '../../services/anonymousRoomApi';

interface AnonymousRoomCardProps {
    room: AnonymousRoom;
    onJoin: (roomId: string) => void;
}

export default function AnonymousRoomCard({ room, onJoin }: AnonymousRoomCardProps) {
    const [timeRemaining, setTimeRemaining] = useState('');

    useEffect(() => {
        const updateTimeRemaining = () => {
            const now = new Date().getTime();
            const expiresAt = new Date(room.expiresAt).getTime();
            const diff = expiresAt - now;

            if (diff <= 0) {
                setTimeRemaining('Expired');
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
    }, [room.expiresAt]);

    const isExpired = timeRemaining === 'Expired';

    return (
        <div className="bg-surface-dark border border-border-dark rounded-xl p-4 hover:border-primary/30 transition-all group">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-base truncate group-hover:text-primary transition-colors">
                        {room.roomName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1.5 text-text-secondary text-sm">
                            <span className="material-symbols-outlined text-[16px]">group</span>
                            <span>{room.activeUsersCount}</span>
                        </div>
                        <span className="text-text-secondary">•</span>
                        <div className={`flex items-center gap-1.5 text-sm font-medium ${isExpired ? 'text-red-400' : 'text-primary'}`}>
                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                            <span>{timeRemaining}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tags */}
            {room.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {room.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs font-medium"
                        >
                            {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                    ))}
                    {room.tags.length > 3 && (
                        <span className="px-2 py-0.5 bg-white/5 text-text-secondary rounded-md text-xs">
                            +{room.tags.length - 3}
                        </span>
                    )}
                </div>
            )}

            {/* Join Button */}
            <button
                onClick={() => onJoin(room.roomId)}
                disabled={isExpired}
                className="w-full px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg font-medium hover:bg-primary hover:text-white transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                <span className="material-symbols-outlined text-[18px]">login</span>
                {isExpired ? 'Expired' : 'Join Room'}
            </button>
        </div>
    );
}

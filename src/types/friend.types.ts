// Friend types
export interface Friend {
    id: string;
    name: string;
    email: string;
    isOnline: boolean;
}

export interface FriendRequest {
    id: string;
    from?: {
        _id: string;
        name: string;
        email: string;
        isOnline: boolean;
    };
    to?: {
        _id: string;
        name: string;
        email: string;
        isOnline: boolean;
    };
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
}

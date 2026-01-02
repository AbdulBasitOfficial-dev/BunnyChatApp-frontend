import api from './api';
import type { Friend, FriendRequest } from '../types/friend.types';

export const friendApi = {
    // Send friend request
    sendRequest: async (toEmail: string) => {
        const response = await api.post('/friend/request', { toEmail });
        return response.data;
    },

    // Get pending requests (received)
    getPendingRequests: async (): Promise<FriendRequest[]> => {
        const response = await api.get('/friend/requests/pending');
        return response.data;
    },

    // Get sent requests
    getSentRequests: async (): Promise<FriendRequest[]> => {
        const response = await api.get('/friend/requests/sent');
        return response.data;
    },

    // Respond to request (accept/reject)
    respondToRequest: async (requestId: string, action: 'accepted' | 'rejected') => {
        const response = await api.post('/friend/request/respond', { requestId, action });
        return response.data;
    },

    // Get friends list
    getFriends: async (): Promise<Friend[]> => {
        const response = await api.get('/friend/list');
        return response.data;
    },

    // Get online friends count
    getOnlineFriendsCount: async (): Promise<{ count: number }> => {
        const response = await api.get('/friend/online-count');
        return response.data;
    },

    // Remove friend
    removeFriend: async (friendEmail: string) => {
        const response = await api.delete('/friend/remove', { data: { friendEmail } });
        return response.data;
    },

    // Cancel sent request
    cancelRequest: async (requestId: string) => {
        const response = await api.delete(`/friend/request/${requestId}`);
        return response.data;
    },
};

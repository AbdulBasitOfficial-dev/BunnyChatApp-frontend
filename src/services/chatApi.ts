import api from './api';

export interface Message {
    _id: string;
    sender: string;
    recipient: string;
    content: string;
    isRead: boolean;
    createdAt: string;
}

export const chatApi = {
    getHistory: async (friendId: string): Promise<Message[]> => {
        const response = await api.get(`/chat/history/${friendId}`);
        return response.data;
    },

    getRecentChats: async () => {
        const response = await api.get('/chat/recent');
        return response.data;
    },

    markAsRead: async (friendId: string) => {
        const response = await api.patch(`/chat/read/${friendId}`);
        return response.data;
    },

    sendMessage: async (recipientId: string, content: string, clientId?: string) => {
        const response = await api.post('/chat/send', { recipientId, content, clientId });
        return response.data;
    }
};

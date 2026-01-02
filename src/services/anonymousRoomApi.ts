import api from './api';

export interface AnonymousRoom {
    roomId: string;
    roomName: string;
    tags: string[];
    activeUsersCount: number;
    createdAt: string;
    expiresAt: string;
}

export interface AnonymousMessage {
    id: string;
    anonymousName: string;
    content: string;
    createdAt: string;
    isMe?: boolean;
}

export const anonymousRoomApi = {
    getAllRooms: async (): Promise<AnonymousRoom[]> => {
        const response = await api.get('/anonymous-rooms');
        return response.data;
    },

    getRoom: async (roomId: string): Promise<AnonymousRoom> => {
        const response = await api.get(`/anonymous-rooms/${roomId}`);
        return response.data;
    },

    getRoomMessages: async (roomId: string): Promise<AnonymousMessage[]> => {
        const response = await api.get(`/anonymous-rooms/${roomId}/messages`);
        return response.data;
    },
};

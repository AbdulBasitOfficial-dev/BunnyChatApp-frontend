import api from './api';
import type { Group, GroupMessage } from '../types/group.types';

export const groupApi = {
    // Create a new group
    createGroup: async (name: string, description?: string, memberIds?: string[]): Promise<Group> => {
        const response = await api.post('/group/create', { name, description, memberIds });
        return response.data;
    },

    // Get all groups for current user
    getGroups: async (): Promise<Group[]> => {
        const response = await api.get('/group/list');
        return response.data;
    },

    // Get a single group
    getGroup: async (groupId: string): Promise<Group> => {
        const response = await api.get(`/group/${groupId}`);
        return response.data;
    },

    // Add a member to a group
    addMember: async (groupId: string, memberId: string) => {
        const response = await api.post('/group/add-member', { groupId, memberId });
        return response.data;
    },

    // Remove a member from a group
    removeMember: async (groupId: string, memberId: string) => {
        const response = await api.post('/group/remove-member', { groupId, memberId });
        return response.data;
    },

    // Leave a group
    leaveGroup: async (groupId: string) => {
        const response = await api.post('/group/leave', { groupId });
        return response.data;
    },

    // Delete a group
    deleteGroup: async (groupId: string) => {
        const response = await api.delete(`/group/${groupId}`);
        return response.data;
    },

    // Send a message to a group
    sendMessage: async (groupId: string, content: string, clientId?: string) => {
        const response = await api.post('/group/message', { groupId, content, clientId });
        return response.data;
    },

    // Get group messages
    getMessages: async (groupId: string, limit?: number, before?: string): Promise<GroupMessage[]> => {
        const params = new URLSearchParams();
        if (limit) params.append('limit', limit.toString());
        if (before) params.append('before', before);
        const response = await api.get(`/group/${groupId}/messages?${params.toString()}`);
        return response.data;
    },
};

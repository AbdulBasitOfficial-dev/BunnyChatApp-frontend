export interface GroupMember {
    _id: string;
    name: string;
    email: string;
}

export interface Group {
    id: string;
    name: string;
    description: string;
    admin: GroupMember;
    members: GroupMember[];
    memberCount: number;
    createdAt: string;
}

export interface GroupMessage {
    id: string;
    groupId: string;
    sender: GroupMember;
    content: string;
    isSystemMessage: boolean;
    createdAt: string;
}

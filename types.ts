
export enum AppRoute {
  DISCOVER = 'discover',
  CHAT = 'chat',
  PROFILE = 'profile',
  ADMIN = 'admin'
}

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface UserProfile {
  pubkey: string;
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  lastActive?: number;
  // Campos de Match
  location?: 'BR' | 'GLOBAL';
  gender?: 'male' | 'female';
  age?: number;
}

export interface FeedPost {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
  user?: UserProfile;
  image?: string;
}

export interface ChatMessage {
  id: string;
  senderPubkey: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'audio';
  mediaUrl?: string;
}

export interface Report {
    id: string;
    reporterPubkey: string;
    reportedPubkey: string;
    timestamp: number;
    chatHistory: ChatMessage[];
    reason: string;
}

export interface ProofSubmission {
  id: string;
  userPubkey: string;
  userName: string;
  content: string; 
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ActivationCode {
    code: string;
    generatedBy: string; 
    createdAt: number;
    redeemedBy?: string;
    redeemedAt?: number;
    status: 'active' | 'used';
}

export interface MatchFilters {
  location: 'BR' | 'GLOBAL';
  gender: 'male' | 'female' | 'all';
  ageMin: number;
  ageMax: number;
}

export interface FriendRequest {
  id: string;
  fromPubkey: string;
  toPubkey: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected';
  fromUser?: UserProfile;
}

export interface Testimonial {
  id: string;
  fromPubkey: string;
  toPubkey: string;
  content: string;
  timestamp: number;
  authorName?: string;
  authorPicture?: string;
}

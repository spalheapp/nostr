import { NostrEvent, UserProfile, Testimonial, FriendRequest } from '../types';
import { nip19, getPublicKey, getEventHash, signEvent } from 'nostr-tools';

// Lista OTIMIZADA de Relays
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://purplepag.es',
  'wss://relay.nostr.band',
  'wss://relay.snort.social',
  'wss://bitcoiner.social',
  'wss://nostr.wine',
  'wss://offchain.pub',
  'wss://soloco.nl',
  'wss://relay.plebstr.com'
];

class NostrService {
  private sockets: Map<string, WebSocket> = new Map();
  private metadataListeners: Set<(profile: UserProfile) => void> = new Set();
  private adminSignalListeners: Set<(type: string, data: any) => void> = new Set();
  private profileCache: Map<string, UserProfile> = new Map();
  private connectionPromises: Map<string, Promise<void>> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    DEFAULT_RELAYS.forEach(url => {
      if (this.sockets.has(url)) return;

      const promise = new Promise<void>((resolve) => {
        try {
          const ws = new WebSocket(url);
          ws.onopen = () => {
            this.sockets.set(url, ws);
            resolve();
            
            // Busca inicial
            const subId = 'init-' + Math.random().toString(36).substring(7);
            ws.send(JSON.stringify(["REQ", subId, { kinds: [0], limit: 50 }]));
          };

          ws.onmessage = (msg) => {
            try {
              const data = JSON.parse(msg.data);
              if (data[0] === "EVENT" && data[2]) {
                const event = data[2] as NostrEvent;
                if (event.kind === 0) {
                  this.handleMetadata(event);
                } else if (event.kind === 1) {
                   // Se recebermos um post (kind 1), verificamos se é um sinal administrativo
                   if (event.content.startsWith('AGITO_ADMIN_ACTION:')) {
                       this.handleAdminSignal(event);
                   } else if (!this.profileCache.has(event.pubkey)) {
                       this.fetchProfile(event.pubkey);
                   }
                }
              }
            } catch (e) {}
          };
          
          ws.onerror = () => {
             this.sockets.delete(url);
             resolve(); 
          };
          ws.onclose = () => this.sockets.delete(url);
        } catch (err) {
          console.error(`Relay connection error: ${url}`);
          resolve();
        }
      });
      this.connectionPromises.set(url, promise);
    });
  }

  public refreshConnections() {
      console.log("♻️ REFRESHING AGITO NETWORK...");
      this.sockets.forEach(ws => ws.close());
      this.sockets.clear();
      this.connectionPromises.clear();
      this.connect();
  }

  private handleMetadata(event: NostrEvent) {
    try {
      const content = JSON.parse(event.content);
      const seed = parseInt(event.pubkey.substring(0, 6), 16);
      const simulatedAge = (seed % 42) + 18; 
      const simulatedGender = seed % 2 === 0 ? 'male' : 'female';
      const simulatedLocation = (seed % 10) < 8 ? 'BR' : 'GLOBAL'; 

      const profile: UserProfile = {
        pubkey: event.pubkey,
        name: content.name,
        display_name: content.display_name || content.name,
        picture: content.picture,
        about: content.about,
        nip05: content.nip05,
        lastActive: event.created_at * 1000,
        age: content.age || simulatedAge,
        gender: content.gender || simulatedGender,
        location: content.location || simulatedLocation
      };
      
      const existing = this.profileCache.get(event.pubkey);
      if (!existing || (event.created_at * 1000) >= (existing.lastActive || 0)) {
        this.profileCache.set(event.pubkey, profile);
        this.metadataListeners.forEach(cb => cb(profile));
      }
    } catch (e) {}
  }

  private handleAdminSignal(event: NostrEvent) {
      try {
          // Formato: AGITO_ADMIN_ACTION:TYPE:JSON_DATA
          const parts = event.content.split('AGITO_ADMIN_ACTION:')[1];
          const firstColon = parts.indexOf(':');
          const type = parts.substring(0, firstColon);
          const jsonStr = parts.substring(firstColon + 1);
          
          const data = JSON.parse(jsonStr);
          this.adminSignalListeners.forEach(cb => cb(type, data));
      } catch (e) {}
  }

  // --- ADMIN NETWORK LOGIC ---

  public async sendAdminSignal(senderPrivKey: string, adminPubkey: string, type: 'REPORT' | 'PROOF', data: any) {
      const pubkey = getPublicKey(senderPrivKey);
      
      const payload = `AGITO_ADMIN_ACTION:${type}:${JSON.stringify(data)}`;
      
      const event: any = {
        kind: 1,
        pubkey: pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', adminPubkey]], 
        content: payload
      };

      event.id = getEventHash(event);
      event.sig = signEvent(event, senderPrivKey);
      
      const msg = JSON.stringify(["EVENT", event]);
      this.sockets.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) ws.send(msg);
      });
  }

  public subscribeToAdminSignals(adminPubkey: string, callback: (type: string, data: any) => void) {
      this.adminSignalListeners.add(callback);
      
      const subId = 'admin-signals-' + Math.random().toString(36).substring(7);
      const req = JSON.stringify(["REQ", subId, { 
          kinds: [1], 
          '#p': [adminPubkey], 
          limit: 100 
      }]);
      
      this.sockets.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) ws.send(req);
      });

      return () => this.adminSignalListeners.delete(callback);
  }

  // --- EXISTING METHODS ---

  public async fetchProfile(pubkey: string) {
    if (!pubkey) return;
    const cached = this.profileCache.get(pubkey);
    if (cached) this.metadataListeners.forEach(cb => cb(cached));
    await Promise.all(Array.from(this.connectionPromises.values()));
    const subId = 'me-' + pubkey.slice(0, 8) + Math.random().toString(36).slice(2);
    const req = JSON.stringify(["REQ", subId, { kinds: [0], authors: [pubkey], limit: 1 }]);
    this.sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(req);
    });
  }

  public fetchGlobalProfiles() {
    const subId = 'radar-global-' + Math.random().toString(36).substring(7);
    const req = JSON.stringify(["REQ", subId, { kinds: [0], limit: 300 }]);
    this.sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(req);
    });
  }

  public fetchOnlineUsers() {
    const subId = 'online-' + Math.random().toString(36).substring(7);
    const req = JSON.stringify(["REQ", subId, { kinds: [1], limit: 100 }]);
    this.sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(req);
    });
  }

  public searchUsers(query: string) {
    if (!query || query.length < 2) return;
    const subId = 'search-' + Math.random().toString(36).substring(7);
    const filter = { kinds: [0], search: query, limit: 50 };
    const req = JSON.stringify(["REQ", subId, filter]);
    this.sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(req);
    });
  }

  public getProfileSync(pubkey: string): UserProfile | undefined {
    return this.profileCache.get(pubkey);
  }

  public getAllProfiles(): UserProfile[] {
      return Array.from(this.profileCache.values());
  }

  public subscribeMetadata(callback: (profile: UserProfile) => void) {
    this.metadataListeners.add(callback);
    this.profileCache.forEach(p => callback(p));
    return () => this.metadataListeners.delete(callback);
  }

  public async publishMetadata(privkeyHex: string, profile: Partial<UserProfile>) {
    const pubkey = getPublicKey(privkeyHex);
    const existing: Partial<UserProfile> = this.profileCache.get(pubkey) || {};
    const contentPayload = {
        name: profile.name || existing.name,
        display_name: profile.display_name || existing.display_name,
        picture: profile.picture || existing.picture,
        about: profile.about || existing.about,
        age: profile.age,
        gender: profile.gender,
        location: profile.location
    };
    const updatedProfile: UserProfile = { pubkey, ...existing, ...profile, lastActive: Date.now() };
    this.profileCache.set(pubkey, updatedProfile);
    this.metadataListeners.forEach(cb => cb(updatedProfile));
    
    const event = {
        kind: 0,
        pubkey: pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: JSON.stringify(contentPayload)
    };
    const msg = JSON.stringify(["EVENT", event]);
    this.sockets.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });

    return updatedProfile;
  }

  public getTestimonials(toPubkey: string): Testimonial[] {
    try {
      const stored = localStorage.getItem(`testimonials_${toPubkey}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  }

  public async publishTestimonial(fromPrivKey: string, toPubkey: string, content: string) {
    const fromPubkey = getPublicKey(fromPrivKey);
    const authorProfile = this.profileCache.get(fromPubkey);

    const testimonial: Testimonial = {
      id: Math.random().toString(36).substring(7),
      fromPubkey: fromPubkey,
      toPubkey: toPubkey,
      content: content,
      timestamp: Date.now(),
      authorName: authorProfile?.display_name || "Usuário Agito",
      authorPicture: authorProfile?.picture
    };

    const current = this.getTestimonials(toPubkey);
    const updated = [testimonial, ...current];
    localStorage.setItem(`testimonials_${toPubkey}`, JSON.stringify(updated));
    return testimonial;
  }

  public sendFriendRequest(fromPubkey: string, toPubkey: string) {
    const key = `requests_${toPubkey}`;
    const requests: FriendRequest[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (requests.find(r => r.fromPubkey === fromPubkey && r.status === 'pending')) return;

    const newRequest: FriendRequest = {
      id: Math.random().toString(36).substring(7),
      fromPubkey,
      toPubkey,
      timestamp: Date.now(),
      status: 'pending'
    };

    localStorage.setItem(key, JSON.stringify([...requests, newRequest]));
    return newRequest;
  }

  public getFriendRequests(myPubkey: string): FriendRequest[] {
    const requests: FriendRequest[] = JSON.parse(localStorage.getItem(`requests_${myPubkey}`) || '[]');
    return requests
      .filter(r => r.status === 'pending')
      .map(r => ({
        ...r,
        fromUser: this.getProfileSync(r.fromPubkey)
      }));
  }

  public acceptFriendRequest(requestId: string, myPubkey: string) {
    const keyReq = `requests_${myPubkey}`;
    const requests: FriendRequest[] = JSON.parse(localStorage.getItem(keyReq) || '[]');
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return;
    const request = requests[reqIndex];
    requests[reqIndex].status = 'accepted';
    localStorage.setItem(keyReq, JSON.stringify(requests));
    this.addFriend(myPubkey, request.fromPubkey);
    this.addFriend(request.fromPubkey, myPubkey);
  }

  public rejectFriendRequest(requestId: string, myPubkey: string) {
    const keyReq = `requests_${myPubkey}`;
    const requests: FriendRequest[] = JSON.parse(localStorage.getItem(keyReq) || '[]');
    const newRequests = requests.filter(r => r.id !== requestId); 
    localStorage.setItem(keyReq, JSON.stringify(newRequests));
  }

  private addFriend(userA: string, userB: string) {
    const key = `friends_${userA}`;
    const friends: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (!friends.includes(userB)) {
      localStorage.setItem(key, JSON.stringify([...friends, userB]));
    }
  }

  public checkFriendStatus(userA: string, userB: string): 'none' | 'pending_sent' | 'pending_received' | 'friends' {
     const friends: string[] = JSON.parse(localStorage.getItem(`friends_${userA}`) || '[]');
     if (friends.includes(userB)) return 'friends';
     return 'none';
  }

  public generateNewIdentity() {
    const randomHex = Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return {
      pubkey: getPublicKey(randomHex),
      privkey: randomHex
    };
  }

  public processLogin(input: string): { pubkey: string, privkey?: string } | null {
    try {
        const clean = input.trim();
        if (clean.startsWith('nsec')) {
            const { type, data } = nip19.decode(clean);
            if (type === 'nsec') {
                const privkeyHex = data as string;
                const pubkeyHex = getPublicKey(privkeyHex);
                return { privkey: privkeyHex, pubkey: pubkeyHex };
            }
        }
        if (clean.startsWith('npub')) {
             const { type, data } = nip19.decode(clean);
             if (type === 'npub') {
                 return { pubkey: data as string };
             }
        }
        if (clean.length === 64) {
            try {
                const pub = getPublicKey(clean);
                return { privkey: clean, pubkey: pub };
            } catch (e) {
                return { pubkey: clean };
            }
        }
    } catch (e) {}
    return null;
  }
}

export const nostrService = new NostrService();
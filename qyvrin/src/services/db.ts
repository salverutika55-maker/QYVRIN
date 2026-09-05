import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, deleteDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { JournalEntry, DecisionAnalysis, Goal, Insight, UserProfile, PublicProfile, Circle, CircleMember, CircleJoinRequest, SharedDecisionSnapshot, CommunityPerspective, CommunitySynthesis } from '../types';
import { User } from 'firebase/auth';

export const DBService = {
  async saveUserProfile(user: User): Promise<void> {
    const docRef = doc(db, `users/${user.uid}`);
    await setDoc(docRef, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLoginAt: new Date().toISOString()
    }, { merge: true });
  },

  async getPublicProfile(userId: string): Promise<PublicProfile | null> {
    const docRef = doc(db, `profiles/${userId}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as PublicProfile;
    }
    return null;
  },

  async savePublicProfile(userId: string, profile: Partial<PublicProfile>): Promise<void> {
    const docRef = doc(db, `profiles/${userId}`);
    await setDoc(docRef, {
      ...profile,
      uid: userId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  },

  async createCircle(userId: string, circleData: Pick<Circle, 'name' | 'description'>): Promise<string> {
    const docRef = doc(collection(db, 'circles'));
    const circle: Circle = {
      ...circleData,
      id: docRef.id,
      ownerId: userId,
      createdAt: new Date().toISOString(),
      memberCount: 1
    };
    await setDoc(docRef, circle);

    const memberRef = doc(db, `circles/${docRef.id}/members`, userId);
    await setDoc(memberRef, {
      userId,
      role: 'OWNER',
      joinedAt: new Date().toISOString()
    } as CircleMember);

    return docRef.id;
  },

  async getMyCircles(userId: string): Promise<Circle[]> {
    const q = query(collection(db, 'circles'));
    const snapshot = await getDocs(q);
    const circles: Circle[] = [];
    
    // We filter locally or we need a collection group query. 
    // For MVP with few circles, we can check membership. But a better way:
    // Actually, rules prevent reading members if you are not a member! 
    // Wait, `allow read: if isAuthenticated();` is on `circles/{circleId}`.
    // So we can read ALL circles. Then we check if we are in members.
    // To do this efficiently, we should probably fetch all circles, then check if we are a member.
    // For MVP, since we can't query "circles where I am a member" easily without an array of memberIds on the circle doc (which has 1MB limit but fine for small).
    // Let's add a member check.
    for (const d of snapshot.docs) {
      const memberRef = doc(db, `circles/${d.id}/members`, userId);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        circles.push(d.data() as Circle);
      }
    }
    return circles;
  },

  async getDiscoverableCircles(userId: string): Promise<Circle[]> {
    const q = query(collection(db, 'circles'));
    const snapshot = await getDocs(q);
    const circles: Circle[] = [];
    
    for (const d of snapshot.docs) {
      const memberRef = doc(db, `circles/${d.id}/members`, userId);
      const memberSnap = await getDoc(memberRef);
      if (!memberSnap.exists()) {
        circles.push(d.data() as Circle);
      }
    }
    return circles;
  },

  async requestToJoinCircle(userId: string, circleId: string): Promise<void> {
    const docRef = doc(db, `circles/${circleId}/joinRequests`, userId);
    await setDoc(docRef, {
      userId,
      status: 'pending',
      requestedAt: new Date().toISOString()
    } as CircleJoinRequest);
  },

  async getMyPendingRequests(userId: string): Promise<{circleId: string}[]> {
    const q = query(collection(db, 'circles'));
    const snapshot = await getDocs(q);
    const pending: {circleId: string}[] = [];
    
    for (const d of snapshot.docs) {
      const reqRef = doc(db, `circles/${d.id}/joinRequests`, userId);
      const reqSnap = await getDoc(reqRef);
      if (reqSnap.exists()) {
        pending.push({ circleId: d.id });
      }
    }
    return pending;
  },

  async getCircleRequests(circleId: string): Promise<CircleJoinRequest[]> {
    const q = query(collection(db, `circles/${circleId}/joinRequests`));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as CircleJoinRequest);
  },

  async approveJoinRequest(circleId: string, userId: string): Promise<void> {
    const reqRef = doc(db, `circles/${circleId}/joinRequests`, userId);
    await deleteDoc(reqRef);

    const memberRef = doc(db, `circles/${circleId}/members`, userId);
    await setDoc(memberRef, {
      userId,
      role: 'MEMBER',
      joinedAt: new Date().toISOString()
    } as CircleMember);

    // Increment member count
    const circleRef = doc(db, `circles/${circleId}`);
    const circleSnap = await getDoc(circleRef);
    if (circleSnap.exists()) {
      await updateDoc(circleRef, { memberCount: (circleSnap.data().memberCount || 1) + 1 });
    }
  },

  async getCircle(circleId: string): Promise<Circle | null> {
    const docRef = doc(db, 'circles', circleId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Circle;
    }
    return null;
  },

  async getSharedDecisions(circleId: string): Promise<SharedDecisionSnapshot[]> {
    const q = query(collection(db, `circles/${circleId}/sharedDecisions`), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as SharedDecisionSnapshot);
  },

  async getCircleMembers(circleId: string): Promise<CircleMember[]> {
    const q = query(collection(db, `circles/${circleId}/members`));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as CircleMember);
  },

  async shareDecisionSnapshot(circleId: string, snapshot: Omit<SharedDecisionSnapshot, 'id'>): Promise<string> {
    const docRef = doc(collection(db, `circles/${circleId}/sharedDecisions`));
    await setDoc(docRef, { ...snapshot, id: docRef.id });
    return docRef.id;
  },

  async getSharedDecision(circleId: string, decisionId: string): Promise<SharedDecisionSnapshot | null> {
    const docRef = doc(db, `circles/${circleId}/sharedDecisions`, decisionId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SharedDecisionSnapshot;
    }
    return null;
  },

  async createPerspective(circleId: string, decisionId: string, perspective: Omit<CommunityPerspective, 'id'>): Promise<string> {
    const docRef = doc(collection(db, `circles/${circleId}/sharedDecisions/${decisionId}/perspectives`));
    await setDoc(docRef, { ...perspective, id: docRef.id });
    
    // Increment perspectiveCount
    const decisionRef = doc(db, `circles/${circleId}/sharedDecisions`, decisionId);
    const decSnap = await getDoc(decisionRef);
    if (decSnap.exists()) {
      await updateDoc(decisionRef, { perspectiveCount: (decSnap.data().perspectiveCount || 0) + 1 });
    }
    return docRef.id;
  },

  async getPerspectives(circleId: string, decisionId: string): Promise<CommunityPerspective[]> {
    const q = query(collection(db, `circles/${circleId}/sharedDecisions/${decisionId}/perspectives`), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as CommunityPerspective);
  },

  async deletePerspective(circleId: string, decisionId: string, perspectiveId: string): Promise<void> {
    const docRef = doc(db, `circles/${circleId}/sharedDecisions/${decisionId}/perspectives`, perspectiveId);
    await deleteDoc(docRef);
    
    const decisionRef = doc(db, `circles/${circleId}/sharedDecisions`, decisionId);
    const decSnap = await getDoc(decisionRef);
    if (decSnap.exists() && decSnap.data().perspectiveCount > 0) {
      await updateDoc(decisionRef, { perspectiveCount: decSnap.data().perspectiveCount - 1 });
    }
  },

  async getCommunitySynthesis(circleId: string, decisionId: string): Promise<CommunitySynthesis | null> {
    const docRef = doc(db, `circles/${circleId}/sharedDecisions/${decisionId}/synthesis`, 'latest');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as CommunitySynthesis;
    }
    return null;
  },

  async saveCommunitySynthesis(circleId: string, decisionId: string, synthesis: CommunitySynthesis): Promise<void> {
    const docRef = doc(db, `circles/${circleId}/sharedDecisions/${decisionId}/synthesis`, 'latest');
    await setDoc(docRef, synthesis);
  },

  async createJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
    const docRef = doc(db, `users/${userId}/journalEntries`, entry.id);
    await setDoc(docRef, entry);
  },

  async updateJournalEntry(userId: string, entryId: string, updates: Partial<JournalEntry>): Promise<void> {
    const docRef = doc(db, `users/${userId}/journalEntries`, entryId);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
  },

  async deleteJournalEntry(userId: string, entryId: string): Promise<void> {
    const docRef = doc(db, `users/${userId}/journalEntries`, entryId);
    await deleteDoc(docRef);
  },

  async getJournalEntries(userId: string): Promise<JournalEntry[]> {
    const q = query(collection(db, `users/${userId}/journalEntries`), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
  },

  async getJournalEntry(userId: string, entryId: string): Promise<JournalEntry | null> {
    const docRef = doc(db, `users/${userId}/journalEntries`, entryId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as JournalEntry;
    }
    return null;
  },

  async saveAnalysis(userId: string, analysis: DecisionAnalysis): Promise<void> {
    const docRef = doc(db, `users/${userId}/analyses`, analysis.id);
    await setDoc(docRef, analysis);
  },

  async updateAnalysis(userId: string, analysisId: string, updates: Partial<DecisionAnalysis>): Promise<void> {
    const docRef = doc(db, `users/${userId}/analyses`, analysisId);
    await updateDoc(docRef, updates);
  },

  async getAnalysis(userId: string, analysisId: string): Promise<DecisionAnalysis | null> {
    const docRef = doc(db, `users/${userId}/analyses`, analysisId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as DecisionAnalysis;
    }
    return null;
  },

  async getGoals(userId: string): Promise<Goal[]> {
    const q = query(collection(db, `users/${userId}/goals`));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Goal));
  },

  async getInsights(userId: string): Promise<Insight[]> {
    const q = query(collection(db, `users/${userId}/insights`), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Insight));
  },

  async createDecision(userId: string, decision: any): Promise<void> {
    const docRef = doc(db, `users/${userId}/decisions`, decision.id);
    await setDoc(docRef, decision);
  },

  async updateDecision(userId: string, decisionId: string, updates: any): Promise<void> {
    const docRef = doc(db, `users/${userId}/decisions`, decisionId);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
  },

  async getDecision(userId: string, decisionId: string): Promise<any | null> {
    const docRef = doc(db, `users/${userId}/decisions`, decisionId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  },

  async getDecisions(userId: string): Promise<any[]> {
    const q = query(collection(db, `users/${userId}/decisions`), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getReplayedDecisions(userId: string): Promise<any[]> {
    const q = query(
      collection(db, `users/${userId}/decisions`),
      where('status', '==', 'replayed'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getFingerprint(userId: string): Promise<any | null> {
    const docRef = doc(db, `users/${userId}/fingerprint`, 'latest');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  },

  async saveFingerprint(userId: string, fingerprintData: any): Promise<void> {
    const docRef = doc(db, `users/${userId}/fingerprint`, 'latest');
    await setDoc(docRef, fingerprintData);
  }
};

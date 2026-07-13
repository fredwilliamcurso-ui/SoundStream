import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  onSnapshot,
  increment
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "./firebase";
import { 
  Agency, 
  AgencyMember, 
  AgencyArtist, 
  AgencyContract, 
  AgencyRevenue, 
  AgencyNotification, 
  AgencyVerification 
} from "../types";

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export const agencyService = {
  /**
   * Register a new agency/label
   */
  async registerAgency(agencyData: Omit<Agency, "id" | "createdAt" | "status" | "verificationStatus" | "withdrawableBalance" | "totalRevenue" | "totalArtists" | "totalStreams">): Promise<Agency> {
    const id = generateId();
    const agency: Agency = {
      ...agencyData,
      id,
      createdAt: new Date().toISOString(),
      status: "pending", // Starts as pending for Admin approval
      verificationStatus: "unverified",
      withdrawableBalance: 0,
      totalRevenue: 0,
      totalArtists: 0,
      totalStreams: 0,
    };

    try {
      await setDoc(doc(db, "agencies", id), agency);
      
      // Also add the owner as the primary owner in agency_members
      const memberId = generateId();
      const member: AgencyMember = {
        id: memberId,
        agencyId: id,
        userId: agencyData.ownerId,
        email: "", // owner email can be updated later
        role: "owner",
        permissions: [
          "manage_artists",
          "view_analytics",
          "manage_releases",
          "manage_contracts",
          "manage_finances",
          "manage_team"
        ],
        invitedAt: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
        status: "active"
      };
      await setDoc(doc(db, "agency_members", memberId), member);

      // Create a default notification
      await this.sendNotification(id, {
        type: "verification_approved", // just placeholder
        title: "Agency Registered",
        message: `Your agency "${agency.name}" has been registered and is pending administrator review.`
      });

      return agency;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agencies/${id}`);
      throw error;
    }
  },

  /**
   * Fetch agency by ID
   */
  async getAgencyById(agencyId: string): Promise<Agency | null> {
    try {
      const snap = await getDoc(doc(db, "agencies", agencyId));
      if (snap.exists()) {
        return snap.data() as Agency;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `agencies/${agencyId}`);
      throw error;
    }
  },

  /**
   * Fetch agencies owned or managed by a user
   */
  async getAgenciesForUser(userId: string): Promise<Agency[]> {
    try {
      // First find if user is member of any agency
      const q = query(collection(db, "agency_members"), where("userId", "==", userId), where("status", "==", "active"));
      const querySnap = await getDocs(q);
      const agencyIds = querySnap.docs.map(doc => (doc.data() as AgencyMember).agencyId);

      if (agencyIds.length === 0) {
        // Also check if they own any agencies
        const qOwner = query(collection(db, "agencies"), where("ownerId", "==", userId));
        const ownerSnap = await getDocs(qOwner);
        return ownerSnap.docs.map(doc => doc.data() as Agency);
      }

      // Fetch all agencies the user belongs to
      const agencies: Agency[] = [];
      for (const agencyId of agencyIds) {
        const agency = await this.getAgencyById(agencyId);
        if (agency) agencies.push(agency);
      }

      // Remove duplicates
      const uniqueAgencies = agencies.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      return uniqueAgencies;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "agency_members");
      throw error;
    }
  },

  /**
   * Update Agency Info
   */
  async updateAgency(agencyId: string, updates: Partial<Agency>): Promise<void> {
    try {
      await updateDoc(doc(db, "agencies", agencyId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agencies/${agencyId}`);
      throw error;
    }
  },

  /**
   * Invite a team member
   */
  async inviteTeamMember(agencyId: string, email: string, role: AgencyMember["role"], permissions: string[]): Promise<AgencyMember> {
    const id = generateId();
    // Simulate user search or just invite by email
    // Find if a user already exists with this email
    let targetUserId = "pending_" + generateId();
    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        targetUserId = snap.docs[0].id;
      }
    } catch (err) {
      console.warn("Could not check if user exists by email:", err);
    }

    const member: AgencyMember = {
      id,
      agencyId,
      userId: targetUserId,
      email,
      role,
      permissions,
      invitedAt: new Date().toISOString(),
      status: "invited"
    };

    try {
      await setDoc(doc(db, "agency_members", id), member);
      return member;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agency_members/${id}`);
      throw error;
    }
  },

  /**
   * Get all members for an agency
   */
  async getAgencyMembers(agencyId: string): Promise<AgencyMember[]> {
    try {
      const q = query(collection(db, "agency_members"), where("agencyId", "==", agencyId));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data() as AgencyMember);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "agency_members");
      throw error;
    }
  },

  /**
   * Remove a team member
   */
  async removeTeamMember(memberId: string): Promise<void> {
    try {
      await updateDoc(doc(db, "agency_members", memberId), { status: "suspended" });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agency_members/${memberId}`);
      throw error;
    }
  },

  /**
   * Accept an invitation
   */
  async acceptInvitation(memberId: string, userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, "agency_members", memberId), {
        userId,
        joinedAt: new Date().toISOString(),
        status: "active"
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agency_members/${memberId}`);
      throw error;
    }
  },

  /**
   * Invite/Link Artist to Agency
   */
  async inviteArtist(agencyId: string, artistId: string, splits: AgencyArtist["splits"]): Promise<AgencyArtist> {
    const id = generateId();
    
    // Fetch artist details for name & photo
    let artistName = "Unknown Artist";
    let artistPhoto = "";
    try {
      const snap = await getDoc(doc(db, "artists", artistId));
      if (snap.exists()) {
        const d = snap.data();
        artistName = d.artistName || "Artist";
        artistPhoto = d.profilePhoto || "";
      } else {
        const userSnap = await getDoc(doc(db, "users", artistId));
        if (userSnap.exists()) {
          const u = userSnap.data();
          artistName = u.displayName || u.username || "Artist";
          artistPhoto = u.photoURL || "";
        }
      }
    } catch (err) {
      console.warn("Could not load artist details:", err);
    }

    const agencyArtist: AgencyArtist = {
      id,
      agencyId,
      artistId,
      artistName,
      artistPhoto,
      joinedAt: new Date().toISOString(),
      status: "pending",
      splits
    };

    try {
      await setDoc(doc(db, "agency_artists", id), agencyArtist);

      // Create a contract as part of invitation
      await this.createContract(agencyId, artistId, artistName, JSON.stringify(splits), splits);

      return agencyArtist;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agency_artists/${id}`);
      throw error;
    }
  },

  /**
   * Fetch all artists managed by an agency
   */
  async getAgencyArtists(agencyId: string): Promise<AgencyArtist[]> {
    try {
      const q = query(collection(db, "agency_artists"), where("agencyId", "==", agencyId));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data() as AgencyArtist);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "agency_artists");
      throw error;
    }
  },

  /**
   * Assign manager to an artist
   */
  async assignManagerToArtist(agencyArtistId: string, managerUserId: string): Promise<void> {
    try {
      await updateDoc(doc(db, "agency_artists", agencyArtistId), { managerId: managerUserId });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agency_artists/${agencyArtistId}`);
      throw error;
    }
  },

  /**
   * Remove Artist from Agency
   */
  async removeArtist(agencyArtistId: string): Promise<void> {
    try {
      await updateDoc(doc(db, "agency_artists", agencyArtistId), { status: "removed" });
      
      // Update agency count
      const aaSnap = await getDoc(doc(db, "agency_artists", agencyArtistId));
      if (aaSnap.exists()) {
        const agencyId = aaSnap.data().agencyId;
        await updateDoc(doc(db, "agencies", agencyId), {
          totalArtists: increment(-1)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agency_artists/${agencyArtistId}`);
      throw error;
    }
  },

  /**
   * Create Digital Contract
   */
  async createContract(agencyId: string, artistId: string, artistName: string, terms: string, splits: AgencyContract["splits"]): Promise<AgencyContract> {
    const id = generateId();
    const contract: AgencyContract = {
      id,
      agencyId,
      artistId,
      artistName,
      terms,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year term
      splits,
      status: "pending",
      createdAt: new Date().toISOString(),
      history: [
        {
          action: "created",
          userId: "agency_owner",
          timestamp: new Date().toISOString(),
          notes: "Contract draft created and sent to artist"
        }
      ]
    };

    try {
      await setDoc(doc(db, "agency_contracts", id), contract);
      return contract;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agency_contracts/${id}`);
      throw error;
    }
  },

  /**
   * Accept / Sign Contract
   */
  async signContract(contractId: string, artistId: string, signature: string): Promise<void> {
    try {
      const snap = await getDoc(doc(db, "agency_contracts", contractId));
      if (!snap.exists()) throw new Error("Contract not found");
      const contract = snap.data() as AgencyContract;

      const history = [...(contract.history || [])];
      history.push({
        action: "signed",
        userId: artistId,
        timestamp: new Date().toISOString(),
        notes: `Contract signed electronically by ${signature}`
      });

      await updateDoc(doc(db, "agency_contracts", contractId), {
        status: "signed",
        signatureUrl: signature,
        signedAt: new Date().toISOString(),
        history
      });

      // Update AgencyArtist status to active
      const aaQ = query(
        collection(db, "agency_artists"), 
        where("agencyId", "==", contract.agencyId), 
        where("artistId", "==", contract.artistId)
      );
      const aaSnap = await getDocs(aaQ);
      if (!aaSnap.empty) {
        const aaDoc = aaSnap.docs[0];
        await updateDoc(doc(db, "agency_artists", aaDoc.id), { status: "active" });
      }

      // Update agency totalArtists count
      await updateDoc(doc(db, "agencies", contract.agencyId), {
        totalArtists: increment(1)
      });

      // Send notification
      await this.sendNotification(contract.agencyId, {
        type: "contract_signed",
        title: "Contract Signed",
        message: `Artist "${contract.artistName}" has signed their digital representation contract.`
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agency_contracts/${contractId}`);
      throw error;
    }
  },

  /**
   * Reject Contract
   */
  async rejectContract(contractId: string, artistId: string, notes?: string): Promise<void> {
    try {
      const snap = await getDoc(doc(db, "agency_contracts", contractId));
      if (!snap.exists()) throw new Error("Contract not found");
      const contract = snap.data() as AgencyContract;

      const history = [...(contract.history || [])];
      history.push({
        action: "rejected",
        userId: artistId,
        timestamp: new Date().toISOString(),
        notes: notes || "Contract rejected by artist"
      });

      await updateDoc(doc(db, "agency_contracts", contractId), {
        status: "rejected",
        history
      });

      // Update AgencyArtist status to removed
      const aaQ = query(
        collection(db, "agency_artists"), 
        where("agencyId", "==", contract.agencyId), 
        where("artistId", "==", contract.artistId)
      );
      const aaSnap = await getDocs(aaQ);
      if (!aaSnap.empty) {
        const aaDoc = aaSnap.docs[0];
        await updateDoc(doc(db, "agency_artists", aaDoc.id), { status: "removed" });
      }

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agency_contracts/${contractId}`);
      throw error;
    }
  },

  /**
   * Fetch contracts for an agency or artist
   */
  async getContracts(agencyId: string, artistId?: string): Promise<AgencyContract[]> {
    try {
      let q = query(collection(db, "agency_contracts"), where("agencyId", "==", agencyId));
      if (artistId) {
        q = query(collection(db, "agency_contracts"), where("artistId", "==", artistId));
      }
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data() as AgencyContract);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "agency_contracts");
      throw error;
    }
  },

  /**
   * Process financial split & record revenue
   */
  async recordRevenue(
    agencyId: string, 
    artistId: string, 
    amount: number, 
    category: AgencyRevenue["category"], 
    description: string
  ): Promise<AgencyRevenue> {
    const id = generateId();
    
    // Default splits
    let splits = { artist: 70, agency: 20, manager: 5, producer: 5 };
    
    // Check if artist has custom splits
    try {
      const aaQ = query(collection(db, "agency_artists"), where("agencyId", "==", agencyId), where("artistId", "==", artistId));
      const aaSnap = await getDocs(aaQ);
      if (!aaSnap.empty) {
        const aa = aaSnap.docs[0].data() as AgencyArtist;
        if (aa.splits) {
          splits = aa.splits;
        }
      }
    } catch (err) {
      console.warn("Could not load custom splits, using defaults:", err);
    }

    // Calculate amounts
    const splitAmounts = {
      artist: (amount * splits.artist) / 100,
      agency: (amount * splits.agency) / 100,
      manager: (amount * splits.manager) / 100,
      producer: (amount * splits.producer) / 100
    };

    const revenue: AgencyRevenue = {
      id,
      agencyId,
      artistId,
      amount,
      category,
      splits,
      splitAmounts,
      description,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "agency_revenue", id), revenue);

      // Update Agency total balance & revenue
      await updateDoc(doc(db, "agencies", agencyId), {
        totalRevenue: increment(amount),
        withdrawableBalance: increment(splitAmounts.agency + splitAmounts.manager + splitAmounts.producer) // goes to agency treasury
      });

      // Send agency notification
      await this.sendNotification(agencyId, {
        type: "revenue_received",
        title: "Revenue Received",
        message: `Received $${amount.toFixed(2)} from ${category} - Agency Split: $${splitAmounts.agency.toFixed(2)}`
      });

      return revenue;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agency_revenue/${id}`);
      throw error;
    }
  },

  /**
   * Fetch Revenue History
   */
  async getRevenueHistory(agencyId: string): Promise<AgencyRevenue[]> {
    try {
      const q = query(collection(db, "agency_revenue"), where("agencyId", "==", agencyId));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data() as AgencyRevenue);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "agency_revenue");
      throw error;
    }
  },

  /**
   * Process withdrawal from agency wallet
   */
  async withdrawAgencyBalance(agencyId: string, amount: number, paymentMethod: string, paymentDetails: string): Promise<void> {
    try {
      const agencySnap = await getDoc(doc(db, "agencies", agencyId));
      if (!agencySnap.exists()) throw new Error("Agency not found");
      const agency = agencySnap.data() as Agency;

      if (agency.withdrawableBalance < amount) {
        throw new Error("Insufficient funds in treasury wallet");
      }

      // Decrement balance
      await updateDoc(doc(db, "agencies", agencyId), {
        withdrawableBalance: increment(-amount)
      });

      // Create a system payout / withdrawal log
      const withdrawalId = generateId();
      await setDoc(doc(db, "withdrawals", withdrawalId), {
        id: withdrawalId,
        creatorId: agency.ownerId,
        amount,
        diamondsExchanged: amount * 100, // mock mapping
        paymentMethod,
        paymentDetails,
        status: "pending",
        requestedAt: new Date().toISOString(),
        agencyId // label tag
      });

      await this.sendNotification(agencyId, {
        type: "withdrawal_processed",
        title: "Withdrawal Requested",
        message: `Withdrawal of $${amount.toFixed(2)} requested via ${paymentMethod}. Pending approval.`
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agencies/${agencyId}`);
      throw error;
    }
  },

  /**
   * Send notification
   */
  async sendNotification(agencyId: string, notif: Omit<AgencyNotification, "id" | "agencyId" | "read" | "createdAt">): Promise<void> {
    const id = generateId();
    const fullNotif: AgencyNotification = {
      ...notif,
      id,
      agencyId,
      read: false,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "agency_notifications", id), fullNotif);
    } catch (error) {
      console.error("Failed to write agency notification:", error);
    }
  },

  /**
   * Fetch agency notifications
   */
  async getNotifications(agencyId: string): Promise<AgencyNotification[]> {
    try {
      const q = query(collection(db, "agency_notifications"), where("agencyId", "==", agencyId));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data() as AgencyNotification);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "agency_notifications");
      throw error;
    }
  },

  /**
   * Submit Verification Request
   */
  async requestVerification(agencyId: string, type: AgencyVerification["type"], documents: string[]): Promise<AgencyVerification> {
    const id = generateId();
    const request: AgencyVerification = {
      id,
      agencyId,
      type,
      documents,
      status: "pending",
      submittedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "agency_verification", id), request);
      
      // Update agency profile status
      await updateDoc(doc(db, "agencies", agencyId), {
        verificationStatus: "pending"
      });

      return request;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agency_verification/${id}`);
      throw error;
    }
  },

  /**
   * Get all agencies (Admin function)
   */
  async getAllAgencies(): Promise<Agency[]> {
    try {
      const snap = await getDocs(collection(db, "agencies"));
      return snap.docs.map(doc => doc.data() as Agency);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "agencies");
      throw error;
    }
  },

  /**
   * Get pending verifications (Admin function)
   */
  async getPendingVerifications(): Promise<AgencyVerification[]> {
    try {
      const q = query(collection(db, "agency_verification"), where("status", "==", "pending"));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data() as AgencyVerification);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "agency_verification");
      throw error;
    }
  }
};

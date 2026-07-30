'use server';

import { cookies } from 'next/headers';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { encryptJSON, decryptJSON } from '@/lib/encryption';

const ADMIN_EMAIL = 'adminhackwell@saranathan.ac.in';
const ADMIN_PASSWORD = 'iluvrohith@123';

export async function adminLogin(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (email?.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return { success: false, error: 'Invalid admin credentials.' };
  }

  // Ensure admin user exists in Firebase Auth
  try {
    const adminAuth = getAdminAuth();
    try {
      await adminAuth.getUserByEmail(ADMIN_EMAIL);
    } catch {
      await adminAuth.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: 'Hackwell Admin',
      });
    }
  } catch (err) {
    console.warn('Firebase Auth admin user check skipped:', err);
  }

  const cookieStore = await cookies();
  cookieStore.set('admin_session', 'authenticated_admin_hackwell', {
    maxAge: 24 * 60 * 60, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
  });

  return { success: true };
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  return { success: true };
}

export async function verifyAdminSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  return session === 'authenticated_admin_hackwell';
}

export interface Member {
  name: string;
  batchNumber: string;
  department: string;
  year: string;
  section: string;
}

export interface Lead extends Member {
  contactNumber: string;
  email?: string;
}

export interface AdminTeamData {
  id: string;
  teamName: string;
  problemStatement: string;
  leadEmail: string;
  leadData: Lead;
  membersData: Member[];
  score?: number;
  judge?: string;
  feedback?: string;
  createdAt?: string;
}

export async function getAllTeamsAdmin() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized', teams: [] };
  }

  try {
    const db = getAdminDb();
    const snapshot = await db.collection('teams').get();

    const teams: AdminTeamData[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let decryptedLead: Lead = { name: '', batchNumber: '', department: '', year: '', section: '', contactNumber: '' };
      let decryptedMembers: Member[] = [];

      try {
        if (data.leadData) decryptedLead = decryptJSON(data.leadData);
      } catch (e) {
        console.error(`Failed to decrypt leadData for ${doc.id}`, e);
      }

      try {
        if (data.membersData) decryptedMembers = decryptJSON(data.membersData);
      } catch (e) {
        console.error(`Failed to decrypt membersData for ${doc.id}`, e);
      }

      teams.push({
        id: doc.id,
        teamName: data.teamName || doc.id,
        problemStatement: data.problemStatement || 'Not assigned',
        leadEmail: data.leadEmail || '',
        leadData: decryptedLead,
        membersData: decryptedMembers,
        score: typeof data.score === 'number' ? data.score : 0,
        judge: data.judge || 'Unassigned',
        feedback: data.feedback || '',
        createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt).toISOString() : '',
      });
    }

    return { success: true, teams };
  } catch (error: any) {
    console.error('Error fetching teams for admin:', error);
    return { success: false, error: error.message || 'Failed to fetch teams', teams: [] };
  }
}

export async function updateTeamAdmin(teamId: string, updatedFields: {
  teamName?: string;
  problemStatement?: string;
  leadEmail?: string;
  leadData?: Lead;
  membersData?: Member[];
  score?: number;
  judge?: string;
  feedback?: string;
}) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    const docRef = db.collection('teams').doc(teamId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { success: false, error: 'Team not found' };
    }

    const payload: Record<string, any> = {};

    if (updatedFields.teamName !== undefined) payload.teamName = updatedFields.teamName.trim();
    if (updatedFields.problemStatement !== undefined) payload.problemStatement = updatedFields.problemStatement;
    if (updatedFields.leadEmail !== undefined) payload.leadEmail = updatedFields.leadEmail.trim().toLowerCase();
    if (updatedFields.score !== undefined) payload.score = Number(updatedFields.score);
    if (updatedFields.judge !== undefined) payload.judge = updatedFields.judge.trim();
    if (updatedFields.feedback !== undefined) payload.feedback = updatedFields.feedback.trim();

    if (updatedFields.leadData) {
      payload.leadData = encryptJSON(updatedFields.leadData);
    }

    if (updatedFields.membersData) {
      payload.membersData = encryptJSON(updatedFields.membersData);
    }

    await docRef.update(payload);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating team:', error);
    return { success: false, error: error.message || 'Failed to update team' };
  }
}

export async function deleteTeamAdmin(teamId: string) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    await db.collection('teams').doc(teamId).delete();
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting team:', error);
    return { success: false, error: error.message || 'Failed to delete team' };
  }
}

export async function seedDummyTeamsAdmin() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  const dummyTeams = [
    {
      teamName: 'CodeSpartans',
      problemStatement: 'AI in Healthcare',
      leadEmail: 'arun.v@saranathan.ac.in',
      leadData: { name: 'Arun V', contactNumber: '9876543210', batchNumber: '2022-26', department: 'CSE', year: 'IV', section: 'A' },
      membersData: [
        { name: 'Kavya R', batchNumber: '2022-26', department: 'CSE', year: 'IV', section: 'A' },
        { name: 'Dinesh M', batchNumber: '2022-26', department: 'CSE', year: 'IV', section: 'B' },
        { name: 'Sowmya K', batchNumber: '2022-26', department: 'IT', year: 'IV', section: 'A' },
      ],
      score: 92,
      judge: 'Dr. A. Kumar',
      feedback: 'Outstanding AI model performance and well-structured UI.',
    },
    {
      teamName: 'FinTech Nexus',
      problemStatement: 'Fintech Solutions',
      leadEmail: 'priya.s@saranathan.ac.in',
      leadData: { name: 'Priya S', contactNumber: '9845123760', batchNumber: '2023-27', department: 'IT', year: 'III', section: 'B' },
      membersData: [
        { name: 'Rahul Dev', batchNumber: '2023-27', department: 'IT', year: 'III', section: 'B' },
        { name: 'Ananya B', batchNumber: '2023-27', department: 'CSE', year: 'III', section: 'A' },
        { name: 'Vikram T', batchNumber: '2023-27', department: 'ECE', year: 'III', section: 'A' },
      ],
      score: 88,
      judge: 'Prof. R. Lakshmi',
      feedback: 'Great blockchain integration for transaction security.',
    },
    {
      teamName: 'SmartGrid Innovators',
      problemStatement: 'Smart City',
      leadEmail: 'karthik.m@saranathan.ac.in',
      leadData: { name: 'Karthik M', contactNumber: '9712345680', batchNumber: '2022-26', department: 'ECE', year: 'IV', section: 'A' },
      membersData: [
        { name: 'Naveen Kumar', batchNumber: '2022-26', department: 'ECE', year: 'IV', section: 'A' },
        { name: 'Divya Bharathi', batchNumber: '2022-26', department: 'EEE', year: 'IV', section: 'B' },
        { name: 'Sanjay P', batchNumber: '2022-26', department: 'CSE', year: 'IV', section: 'B' },
      ],
      score: 95,
      judge: 'Er. Vignesh S.',
      feedback: 'Impressive IoT sensor network hardware model.',
    },
    {
      teamName: 'EdVision Tech',
      problemStatement: 'EdTech Innovations',
      leadEmail: 'sneha.r@saranathan.ac.in',
      leadData: { name: 'Sneha R', contactNumber: '9632587410', batchNumber: '2024-28', department: 'AI&DS', year: 'II', section: 'A' },
      membersData: [
        { name: 'Harish Chandra', batchNumber: '2024-28', department: 'AI&DS', year: 'II', section: 'A' },
        { name: 'Meera N', batchNumber: '2024-28', department: 'CSE', year: 'II', section: 'C' },
        { name: 'Ashwin G', batchNumber: '2024-28', department: 'IT', year: 'II', section: 'A' },
      ],
      score: 81,
      judge: 'Dr. A. Kumar',
      feedback: 'Interactive gamified learning platform for school students.',
    },
    {
      teamName: 'NeuralNet Tribe',
      problemStatement: 'AI in Healthcare',
      leadEmail: 'rohan.k@saranathan.ac.in',
      leadData: { name: 'Rohan K', contactNumber: '9514782360', batchNumber: '2022-26', department: 'AI&DS', year: 'IV', section: 'A' },
      membersData: [
        { name: 'Preeti Sharma', batchNumber: '2022-26', department: 'AI&DS', year: 'IV', section: 'A' },
        { name: 'Deepak Raj', batchNumber: '2022-26', department: 'CSE', year: 'IV', section: 'A' },
        { name: 'Swetha V', batchNumber: '2022-26', department: 'IT', year: 'IV', section: 'B' },
      ],
      score: 97,
      judge: 'Dr. N. Sundaram',
      feedback: 'Top-tier diagnostic accuracy using CNNs for MRI scans.',
    },
    {
      teamName: 'CyberShields',
      problemStatement: 'Fintech Solutions',
      leadEmail: 'nilesh.b@saranathan.ac.in',
      leadData: { name: 'Nilesh B', contactNumber: '9487123650', batchNumber: '2023-27', department: 'CSE', year: 'III', section: 'C' },
      membersData: [
        { name: 'Varun Tech', batchNumber: '2023-27', department: 'CSE', year: 'III', section: 'C' },
        { name: 'Pooja Shri', batchNumber: '2023-27', department: 'IT', year: 'III', section: 'B' },
        { name: 'Ganesh M', batchNumber: '2023-27', department: 'ECE', year: 'III', section: 'B' },
      ],
      score: 84,
      judge: 'Prof. R. Lakshmi',
      feedback: 'Robust zero-trust authentication protocol implementation.',
    },
    {
      teamName: 'EcoFleet Sol',
      problemStatement: 'Smart City',
      leadEmail: 'nivedha.g@saranathan.ac.in',
      leadData: { name: 'Nivedha G', contactNumber: '9362147850', batchNumber: '2022-26', department: 'MECH', year: 'IV', section: 'A' },
      membersData: [
        { name: 'Manoj Kumar', batchNumber: '2022-26', department: 'MECH', year: 'IV', section: 'A' },
        { name: 'Siddharth R', batchNumber: '2022-26', department: 'EEE', year: 'IV', section: 'A' },
        { name: 'Bhavana P', batchNumber: '2022-26', department: 'CSE', year: 'IV', section: 'B' },
      ],
      score: 79,
      judge: 'Er. Vignesh S.',
      feedback: 'EV fleet management algorithm with real-time routing.',
    },
    {
      teamName: 'BioPulse Tech',
      problemStatement: 'AI in Healthcare',
      leadEmail: 'gokul.s@saranathan.ac.in',
      leadData: { name: 'Gokul S', contactNumber: '9254178360', batchNumber: '2023-27', department: 'ECE', year: 'III', section: 'A' },
      membersData: [
        { name: 'Keerthana M', batchNumber: '2023-27', department: 'ECE', year: 'III', section: 'A' },
        { name: 'Aakash V', batchNumber: '2023-27', department: 'AI&DS', year: 'III', section: 'A' },
        { name: 'Lekha S', batchNumber: '2023-27', department: 'CSE', year: 'III', section: 'B' },
      ],
      score: 90,
      judge: 'Dr. N. Sundaram',
      feedback: 'Wearable patient vitals monitoring device prototype.',
    },
    {
      teamName: 'Logic Crafters',
      problemStatement: 'EdTech Innovations',
      leadEmail: 'akash.r@saranathan.ac.in',
      leadData: { name: 'Akash R', contactNumber: '9147258360', batchNumber: '2024-28', department: 'IT', year: 'II', section: 'B' },
      membersData: [
        { name: 'Janani B', batchNumber: '2024-28', department: 'IT', year: 'II', section: 'B' },
        { name: 'Tarun K', batchNumber: '2024-28', department: 'CSE', year: 'II', section: 'A' },
        { name: 'Nisha P', batchNumber: '2024-28', department: 'AI&DS', year: 'II', section: 'A' },
      ],
      score: 86,
      judge: 'Dr. A. Kumar',
      feedback: 'AI-powered personalized quiz engine and progress tracker.',
    },
    {
      teamName: 'Urban Pulse',
      problemStatement: 'Smart City',
      leadEmail: 'surya.n@saranathan.ac.in',
      leadData: { name: 'Surya N', contactNumber: '9036985210', batchNumber: '2023-27', department: 'EEE', year: 'III', section: 'A' },
      membersData: [
        { name: 'Shalini V', batchNumber: '2023-27', department: 'EEE', year: 'III', section: 'A' },
        { name: 'Raghav M', batchNumber: '2023-27', department: 'CSE', year: 'III', section: 'C' },
        { name: 'Abinaya R', batchNumber: '2023-27', department: 'IT', year: 'III', section: 'A' },
      ],
      score: 89,
      judge: 'Er. Vignesh S.',
      feedback: 'Smart traffic signal optimization based on real-time cameras.',
    },
  ];

  try {
    const db = getAdminDb();

    for (const team of dummyTeams) {
      const sanitizedId = team.teamName.trim().toLowerCase();
      const docRef = db.collection('teams').doc(sanitizedId);

      const encryptedLeadData = encryptJSON(team.leadData);
      const encryptedMembersData = encryptJSON(team.membersData);

      await docRef.set({
        teamName: team.teamName,
        problemStatement: team.problemStatement,
        leadEmail: team.leadEmail.toLowerCase(),
        leadData: encryptedLeadData,
        membersData: encryptedMembersData,
        score: team.score,
        judge: team.judge,
        feedback: team.feedback,
        createdAt: new Date(),
      });
    }

    return { success: true, count: dummyTeams.length };
  } catch (error: any) {
    console.error('Error seeding dummy teams:', error);
    return { success: false, error: error.message || 'Failed to seed dummy teams' };
  }
}

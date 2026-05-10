import clientPromise from '../../../lib/mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userId = session.user.id;

  if (req.method === 'GET') {
    try {
      const client = await clientPromise;
      const db = client.db("gsrp_staff");
      const progress = await db.collection("training_progress").findOne({ userId });
      
      return res.status(200).json(progress || { 
        userId, 
        completedSections: [], 
        handbookCompleted: false 
      });
    } catch (error) {
      console.error('[Training Progress GET Error]', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { sectionId } = req.body;
      if (!sectionId) {
        return res.status(400).json({ message: 'sectionId is required' });
      }

      const client = await clientPromise;
      const db = client.db("gsrp_staff");

      // Get all required section IDs from the handbook data
      // Note: We'll need to import the sections list. 
      // Since we can't easily import the JS array here without duplicating, 
      // we will rely on the client sending the total count or manage a list.
      // For now, we'll track them and the client will tell us when it's done, 
      // or we calculate based on a known list.
      
      const progress = await db.collection("training_progress").findOne({ userId });
      let completedSections = progress?.completedSections || [];

      if (completedSections.includes(sectionId)) {
        completedSections = completedSections.filter(id => id !== sectionId);
      } else {
        completedSections.push(sectionId);
      }

      // To determine if handbook is completed, we need the total number of sections.
      // We can pass totalSections from the client or define it here.
      // Let's define the current required sections based on the handbook.js file.
      const REQUIRED_SECTIONS = [
        'overview', 'guidelines', 'shifts', 'vehicles', 'punishments', 
        'warnings', 'kicks', 'bans', 'staff-disc', 'escalation', 'custom-commands'
      ];

      const handbookCompleted = REQUIRED_SECTIONS.every(id => completedSections.includes(id));

      await db.collection("training_progress").updateOne(
        { userId },
        { 
          $set: { 
            completedSections, 
            handbookCompleted, 
            lastUpdated: new Date() 
          } 
        },
        { upsert: true }
      );

      return res.status(200).json({ 
        completedSections, 
        handbookCompleted 
      });
    } catch (error) {
      console.error('[Training Progress POST Error]', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

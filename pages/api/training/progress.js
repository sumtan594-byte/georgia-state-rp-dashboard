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
      const { sectionId, resetAll } = req.body;
      const client = await clientPromise;
      const db = client.db("gsrp_staff");
      const REQUIRED_SECTIONS = [
        '1.1', '1.2', '1.3', '2.1', '3.1', '4.1', '5.1', '6.1', '7.1',
        '8.1', '8.2', '9.1', '10.1', '11.1', '12.1'
      ];

      if (resetAll) {
        await db.collection("training_progress").updateOne(
          { userId },
          { $set: { completedSections: [], handbookCompleted: false, lastUpdated: new Date() } },
          { upsert: true }
        );
        return res.status(200).json({ completedSections: [], handbookCompleted: false });
      }

      if (!sectionId) {
        return res.status(400).json({ message: 'sectionId is required' });
      }

      const progress = await db.collection("training_progress").findOne({ userId });
      let completedSections = progress?.completedSections || [];

      if (completedSections.includes(sectionId)) {
        completedSections = completedSections.filter(id => id !== sectionId);
      } else {
        completedSections.push(sectionId);
      }

      const handbookCompleted = REQUIRED_SECTIONS.every(id => completedSections.includes(id));

      await db.collection("training_progress").updateOne(
        { userId },
        { $set: { completedSections, handbookCompleted, lastUpdated: new Date() } },
        { upsert: true }
      );

      return res.status(200).json({ completedSections, handbookCompleted });
    } catch (error) {
      console.error('[Training Progress POST Error]', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

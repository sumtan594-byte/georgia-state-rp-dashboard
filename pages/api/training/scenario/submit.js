import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import clientPromise from '../../../../lib/mongodb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, scores } = req.body;
  const userId = session.user.id;

  if (!sessionId || !scores || !Array.isArray(scores)) {
    return res.status(400).json({ error: 'sessionId and scores array required' });
  }

  const client = await clientPromise;
  const db = client.db('gsrp_staff');

  const existing = await db.collection('scenario_training').findOne({ userId });
  if (existing?.completed) {
    return res.status(400).json({ error: 'Already completed scenario training' });
  }

  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const maxScore = scores.reduce((sum, s) => sum + s.maxScore, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passed = percentage >= 60;

  const strengths = [];
  const improvements = [];
  const scenarioDetails = [];

  for (const s of scores) {
    const pct = s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0;
    scenarioDetails.push({
      type: s.scenario,
      label: s.label || s.scenario,
      score: s.score,
      maxScore: s.maxScore,
      feedback: s.feedback,
    });

    if (pct >= 80) {
      strengths.push(`Good handling of ${s.label || s.scenario} scenario (${s.score}/${s.maxScore})`);
    } else if (pct < 50) {
      improvements.push(`Needs improvement on ${s.label || s.scenario} - ${s.feedback}`);
    }
  }

  if (strengths.length === 0) {
    strengths.push('Completed all scenarios');
  }
  if (improvements.length === 0) {
    improvements.push('Review the staff handbook for punishment guidelines');
  }

  const bestScenario = scores.length > 0 ? scores.reduce((best, s) => {
    const bestPct = best.maxScore > 0 ? best.score / best.maxScore : 0;
    const sPct = s.maxScore > 0 ? s.score / s.maxScore : 0;
    return sPct > bestPct ? s : best;
  }, scores[0]) : null;

  const worstScenario = scores.length > 0 ? scores.reduce((worst, s) => {
    const worstPct = worst.maxScore > 0 ? worst.score / worst.maxScore : 1;
    const sPct = s.maxScore > 0 ? s.score / s.maxScore : 1;
    return sPct < worstPct ? s : worst;
  }, scores[0]) : null;

  const result = {
    userId,
    sessionId,
    completed: true,
    completedAt: new Date(),
    totalScore: Math.round(totalScore * 10) / 10,
    maxScore,
    percentage,
    passed,
    scenariosCompleted: scores.length,
    scores,
    strengths,
    improvements,
    scenarioDetails,
    bestScenario: bestScenario?.label || bestScenario?.scenario || null,
    worstScenario: worstScenario?.label || worstScenario?.scenario || null,
  };

  await db.collection('scenario_training').updateOne(
    { userId },
    { $set: result },
    { upsert: true }
  );

  await db.collection('scenario_sessions').updateOne(
    { sessionId },
    { $set: { status: 'completed', completedAt: new Date() } }
  );

  return res.status(200).json({
    ok: true,
    results: {
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      percentage: result.percentage,
      passed: result.passed,
      scenariosCompleted: result.scenariosCompleted,
      strengths: result.strengths,
      improvements: result.improvements,
      scenarioDetails: result.scenarioDetails,
      bestScenario: result.bestScenario,
      worstScenario: result.worstScenario,
    },
  });
}

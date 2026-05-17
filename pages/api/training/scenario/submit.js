import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import clientPromise from '../../../../lib/mongodb';

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;

async function callCerebras(prompt) {
  if (!CEREBRAS_API_KEY) {
    throw new Error('CEREBRAS_API_KEY not configured');
  }

  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-oss-120b',
      messages: [
        { role: 'user', content: prompt },
      ],
      max_completion_tokens: 1500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cerebras API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('Cerebras returned no response text');
  }

  return text.trim();
}

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

  const scenarioSummary = scores.map(s =>
    `- ${s.label || s.scenario}: scored ${s.score}/${s.maxScore} - ${s.feedback || 'no feedback'}`
  ).join('\n');

  try {
    const aiPrompt = `You are giving feedback to a young staff trainee (around 13 to 17 years old) who just finished a GSRP (Georgia State Roleplay) ER:LC scenario training. They handled 5 situations where players reported rule breaking.

Here is how they did in each one:
${scenarioSummary}

Total score: ${totalScore}/${maxScore} (${percentage}%)
Passed: ${passed ? 'Yes' : 'No'} (they need 60% to pass)

Write your feedback like a friendly senior staff member talking to a new young trainee. Keep it simple and easy to understand. No big fancy words. No em dashes. Just talk normal like you would in Discord.

Give me:
1. 2 to 3 things they did well (specific to the scenarios they handled)
2. 2 to 3 things they should work on (specific to where they lost points)
3. A short overall comment (2 to 3 sentences) about how they did overall

Return ONLY valid JSON like this:
{
  "strengths": ["thing 1", "thing 2", "thing 3"],
  "improvements": ["thing 1", "thing 2", "thing 3"],
  "overallComment": "your comment here"
}

Keep it encouraging but honest. Reference the actual scenario types like RDM or VDM. Sound like a real person not a robot. Use simple words a teenager would understand.`;

    const aiResult = await callCerebras(aiPrompt);

    let parsed;
    try {
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      parsed = null;
    }

    if (!parsed || !parsed.strengths || !parsed.improvements) {
      parsed = {
        strengths: scores.filter(s => s.score >= s.maxScore * 0.7).map(s => `You handled ${s.label || s.scenario} pretty well (${s.score}/${s.maxScore})`),
        improvements: scores.filter(s => s.score < s.maxScore * 0.5).map(s => `Work on ${s.label || s.scenario} - ${s.feedback || 'check the guidelines'}`),
        overallComment: `You finished ${scores.length} scenarios and scored ${totalScore}/${maxScore}.`,
      };
      if (parsed.strengths.length === 0) parsed.strengths = ['You finished all the scenarios'];
      if (parsed.improvements.length === 0) parsed.improvements = ['Read the staff handbook for punishment rules'];
    }

    const strengths = parsed.strengths.slice(0, 3);
    const improvements = parsed.improvements.slice(0, 3);
    const overallComment = parsed.overallComment || '';

    const bestScenario = scores.reduce((best, s) => {
      const bestPct = best.maxScore > 0 ? best.score / best.maxScore : 0;
      const sPct = s.maxScore > 0 ? s.score / s.maxScore : 0;
      return sPct > bestPct ? s : best;
    }, scores[0]);

    const worstScenario = scores.reduce((worst, s) => {
      const worstPct = worst.maxScore > 0 ? worst.score / worst.maxScore : 1;
      const sPct = s.maxScore > 0 ? s.score / s.maxScore : 1;
      return sPct < worstPct ? s : worst;
    }, scores[0]);

    const scenarioDetails = scores.map(s => ({
      type: s.scenario,
      label: s.label || s.scenario,
      score: s.score,
      maxScore: s.maxScore,
      feedback: s.feedback || '',
    }));

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
      overallComment,
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
        overallComment: result.overallComment,
        scenarioDetails: result.scenarioDetails,
        bestScenario: result.bestScenario,
        worstScenario: result.worstScenario,
      },
    });
  } catch (err) {
    console.error('[AI Results Error]', err.message);

    const fallbackStrengths = scores.filter(s => s.score >= s.maxScore * 0.7).map(s => `You handled ${s.label || s.scenario} well (${s.score}/${s.maxScore})`);
    const fallbackImprovements = scores.filter(s => s.score < s.maxScore * 0.5).map(s => `Work on ${s.label || s.scenario}`);

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
      strengths: fallbackStrengths.length > 0 ? fallbackStrengths : ['You finished all the scenarios'],
      improvements: fallbackImprovements.length > 0 ? fallbackImprovements : ['Read the staff handbook for punishment rules'],
      overallComment: `You finished ${scores.length} scenarios and scored ${totalScore}/${maxScore}.`,
      scenarioDetails: scores.map(s => ({
        type: s.scenario,
        label: s.label || s.scenario,
        score: s.score,
        maxScore: s.maxScore,
        feedback: s.feedback || '',
      })),
      bestScenario: scores.length > 0 ? scores.reduce((b, s) => s.score > b.score ? s : b, scores[0]).label : null,
      worstScenario: scores.length > 0 ? scores.reduce((w, s) => s.score < w.score ? s : w, scores[0]).label : null,
    };

    await db.collection('scenario_training').updateOne(
      { userId },
      { $set: result },
      { upsert: true }
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
        overallComment: result.overallComment,
        scenarioDetails: result.scenarioDetails,
        bestScenario: result.bestScenario,
        worstScenario: result.worstScenario,
      },
    });
  }
}

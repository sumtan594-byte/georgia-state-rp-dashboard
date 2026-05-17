import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import clientPromise from '../../../../lib/mongodb';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function callOpenRouter(prompt) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://join-gsrp.com',
      'X-Title': 'GSRP Scenario Training',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-super-120b-a12b:free',
      messages: [
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.7,
      reasoning: { enabled: false },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('OpenRouter returned no response text');
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
    const aiPrompt = `You are evaluating a staff trainee's performance in a GSRP (Georgia State Roleplay) ER:LC scenario training module. They went through 5 moderation scenarios where they had to handle player reports of rule violations.

Here is their performance breakdown:
${scenarioSummary}

Total score: ${totalScore}/${maxScore} (${percentage}%)
Passed: ${passed ? 'Yes' : 'No'} (passing threshold is 60%)

Please provide:
1. A list of 2-3 specific strengths based on what they did well across scenarios
2. A list of 2-3 specific areas for improvement based on where they lost points
3. An overall comment (2-3 sentences) summarizing their performance

Format your response as JSON like this:
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "overallComment": "overall comment here"
}

Be specific and reference actual scenario types where possible. Sound encouraging but honest. Do not use em dashes. Sound like a human trainer giving feedback.`;

    const aiResult = await callOpenRouter(aiPrompt);

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
        strengths: scores.filter(s => s.score >= s.maxScore * 0.7).map(s => `Handled ${s.label || s.scenario} scenario well (${s.score}/${s.maxScore})`),
        improvements: scores.filter(s => s.score < s.maxScore * 0.5).map(s => `Needs improvement on ${s.label || s.scenario} - ${s.feedback || 'review guidelines'}`),
        overallComment: `Completed ${scores.length} scenarios with a score of ${totalScore}/${maxScore}.`,
      };
      if (parsed.strengths.length === 0) parsed.strengths = ['Completed all training scenarios'];
      if (parsed.improvements.length === 0) parsed.improvements = ['Review the staff handbook for punishment guidelines'];
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
      aiGenerated: true,
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
        aiGenerated: true,
      },
    });
  } catch (err) {
    console.error('[AI Results Error]', err.message);

    const fallbackStrengths = scores.filter(s => s.score >= s.maxScore * 0.7).map(s => `Handled ${s.label || s.scenario} scenario well (${s.score}/${s.maxScore})`);
    const fallbackImprovements = scores.filter(s => s.score < s.maxScore * 0.5).map(s => `Needs improvement on ${s.label || s.scenario}`);

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
      strengths: fallbackStrengths.length > 0 ? fallbackStrengths : ['Completed all training scenarios'],
      improvements: fallbackImprovements.length > 0 ? fallbackImprovements : ['Review the staff handbook for punishment guidelines'],
      overallComment: `Completed ${scores.length} scenarios with a score of ${totalScore}/${maxScore}.`,
      scenarioDetails: scores.map(s => ({
        type: s.scenario,
        label: s.label || s.scenario,
        score: s.score,
        maxScore: s.maxScore,
        feedback: s.feedback || '',
      })),
      bestScenario: scores.length > 0 ? scores.reduce((b, s) => s.score > b.score ? s : b, scores[0]).label : null,
      worstScenario: scores.length > 0 ? scores.reduce((w, s) => s.score < w.score ? s : w, scores[0]).label : null,
      aiGenerated: false,
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
        aiGenerated: false,
      },
    });
  }
}

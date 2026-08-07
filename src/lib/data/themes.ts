import { problemStatements } from '@/data/problem-statements';

export type ProblemStatement = {
  id: string;
  name: string;
};

export type Theme = {
  name: string;
  description?: string;
  problemStatements: ProblemStatement[];
};

export const THEME_NAMES = [
  "Autonomous Agentic AI",
  "Adaptive Intelligence System",
  "Predictive Logistics using Industrial AI",
  "Cybersecurity & Digital Trust",
  "Human Centered AI",
] as const;

export const THEME_DESCRIPTIONS: Record<string, string> = {
  "Autonomous Agentic AI": "Build self-directed, multi-agent AI systems that collaborate, reason, and autonomously solve complex workflows.",
  "Adaptive Intelligence System": "Develop dynamic AI models that continuously learn, adapt, and personalize experiences based on user interactions.",
  "Predictive Logistics using Industrial AI": "Leverage industrial AI to forecast demand, optimize supply chains, and enable predictive asset routing.",
  "Cybersecurity & Digital Trust": "Create robust AI-driven security solutions to protect digital infrastructure, detect threats, and ensure data privacy.",
  "Human Centered AI": "Design ethical, accessible, and inclusive AI technologies tailored to empower humans and communities.",
};

const normalizeThemeName = (rawTheme: string): string => {
  const lower = rawTheme.toLowerCase().trim();
  if (lower.includes('autonomous') || lower.includes('agentic')) return "Autonomous Agentic AI";
  if (lower.includes('adaptive') || lower.includes('intell')) return "Adaptive Intelligence System";
  if (lower.includes('predictive') || lower.includes('logistics')) return "Predictive Logistics using Industrial AI";
  if (lower.includes('cybersecurity') || lower.includes('trust')) return "Cybersecurity & Digital Trust";
  if (lower.includes('human') || lower.includes('centered')) return "Human Centered AI";
  return rawTheme;
};

export const HACKATHON_THEMES: Theme[] = THEME_NAMES.map((themeName) => {
  const matchingPS = problemStatements
    .filter((ps) => normalizeThemeName(ps.theme) === themeName)
    .map((ps) => ({
      id: ps.ps_id,
      name: `${ps.title}: ${ps.problemStatement}`,
    }));

  return {
    name: themeName,
    description: THEME_DESCRIPTIONS[themeName],
    problemStatements: matchingPS,
  };
});

// Helper array containing all PS across all 5 themes for dropdown search
export const ALL_PROBLEM_STATEMENTS = HACKATHON_THEMES.flatMap((theme) =>
  theme.problemStatements.map((ps) => ({
    ...ps,
    themeName: theme.name,
  }))
);

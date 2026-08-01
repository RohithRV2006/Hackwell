export type ProblemStatement = {
  id: string;
  name: string;
};

export type Theme = {
  name: string;
  problemStatements: ProblemStatement[];
};

export const HACKATHON_THEMES: Theme[] = [
  {
    name: "AI & Machine Learning",
    problemStatements: [
      { id: "PS-01", name: "AI-Powered Diagnostics in Healthcare" },
      { id: "PS-02", name: "Predictive Maintenance for Smart Manufacturing" },
      { id: "PS-03", name: "Automated Accessibility Tools for Education" }
    ]
  },
  {
    name: "Fintech & Blockchain",
    problemStatements: [
      { id: "PS-04", name: "Decentralized Identity Verification" },
      { id: "PS-05", name: "Micro-lending Platform for Rural Economies" },
      { id: "PS-06", name: "Fraud Detection using Anomaly Detection" }
    ]
  },
  {
    name: "Smart City & IoT",
    problemStatements: [
      { id: "PS-07", name: "Intelligent Traffic Management System" },
      { id: "PS-08", name: "Real-time Public Utilities Monitoring" },
      { id: "PS-09", name: "Smart Waste Management Optimization" }
    ]
  },
  {
    name: "Sustainability & Green Tech",
    problemStatements: [
      { id: "PS-10", name: "Carbon Footprint Tracker for Enterprises" },
      { id: "PS-11", name: "Renewable Energy Grid Balancing" },
      { id: "PS-12", name: "Supply Chain Optimization for Food Waste" }
    ]
  },
  {
    name: "Cybersecurity & Web3",
    problemStatements: [
      { id: "PS-13", name: "Zero-Trust Architecture Implementation" },
      { id: "PS-14", name: "Phishing Attempt Detection via NLP" },
      { id: "PS-15", name: "Secure Peer-to-Peer File Sharing" }
    ]
  }
];

// Helper array containing all PS across all themes for the dropdown search
export const ALL_PROBLEM_STATEMENTS = HACKATHON_THEMES.flatMap((theme) => 
  theme.problemStatements.map((ps) => ({
    ...ps,
    themeName: theme.name
  }))
);

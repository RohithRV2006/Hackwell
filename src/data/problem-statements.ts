export interface ProblemStatement {
  ps_id: string;
  id: number;
  theme: string;
  title: string;
  domain: string;
  problemStatement: string;
  description: string;
}

export const problemStatements: ProblemStatement[] = [
  {
    id: 1,
    theme: "Adaptive Intelligence System",
    ps_id: "AIS-01",
    title: "GameLearn AI: A Smart Adaptive Learning Adventure",
    domain: "Edutainment",
    problemStatement: "Develop an adaptive gamified learning platform that personalizes learning paths, challenges, and rewards based on each learner's performance and behavior.",
    description: "Traditional learning platforms provide a one-size-fits-all experience, reducing learner engagement and effectiveness. Build an AI-powered system that continuously analyzes learner progress, engagement, and skill levels to dynamically adjust game difficulty, rewards, and content recommendations. The solution should integrate with existing learning platforms while improving motivation and measurable learning outcomes."
  },
  {
    id: 2,
    theme: "Adaptive Intelligence System",
    ps_id: "AIS-02",
    title: "QuizGenius AI: Your Personalized Learning Challenge Engine",
    domain: "Edutainment",
    problemStatement: "Develop an adaptive quiz platform that generates personalized questions and learning challenges based on learner performance and knowledge.",
    description: "Most online assessments use fixed difficulty levels that fail to address individual learning needs. Design an AI-driven platform that analyzes learner performance, adjusts question difficulty in real time, identifies knowledge gaps, and recommends personalized learning resources to improve engagement and assessment accuracy."
  },
  {
    id: 3,
    theme: "Adaptive Intelligence System",
    ps_id: "AIS-03",
    title: "FinLearn AI: Intelligent Personal Finance Management and Learning Assistant",
    domain: "FinTech",
    problemStatement: "Develop an AI-powered adaptive financial assistant that combines personalized financial management and financial literacy learning by analyzing user behavior, spending patterns, financial goals, and knowledge levels to provide smart budgeting, savings, investment recommendations, and customized learning guidance.",
    description: "Managing personal finances is challenging due to changing income, expenses, and limited financial awareness. The solution should use AI, Machine Learning, and predictive analytics to analyze financial habits, recommend personalized budgeting and investment strategies, and deliver adaptive financial education. It should provide interactive lessons, real-time insights, and practical guidance to improve financial decision-making, encourage responsible money management, and enhance long-term financial well-being."
  },
  {
    id: 4,
    theme: "Adaptive Intelligence System",
    ps_id: "AIS-04",
    title: "TaxMate AI: Adaptive Tax Planning and Compliance Assistant",
    domain: "FinTech",
    problemStatement: "Develop an Adaptive Intelligent System that analyzes financial transactions, income patterns, and regulatory changes to provide personalized tax planning and compliance recommendations.",
    description: "Tax management is complex due to changing regulations and individual financial situations. The solution should use AI and natural language processing to analyze financial records, identify applicable tax benefits, predict obligations, and provide adaptive compliance guidance. It should reduce errors, improve tax planning efficiency, and support informed financial decisions."
  },
  {
    id: 5,
    theme: "Adaptive Intelligence System",
    ps_id: "AIS-05",
    title: "TrafficIQ AI: Intelligent Mobility Optimization for Smart Cities",
    domain: "Smart Cities",
    problemStatement: "Develop an adaptive traffic management system that continuously analyzes road conditions and optimizes traffic flow in real time.",
    description: "Growing urban traffic leads to congestion, fuel wastage, and increased pollution. Design an AI driven solution that collects real-time data from sensors, cameras, and connected devices to optimize traffic signals, detect congestion, and recommend alternate routes for smoother and more efficient mobility."
  },
  {
    id: 6,
    theme: "Adaptive Intelligence System",
    ps_id: "AIS-06",
    title: "SafeCity AI: Real-Time Intelligent Emergency Response Network",
    domain: "Smart Cities",
    problemStatement: "Develop an adaptive AI-based public safety system that optimizes emergency response and resource allocation using real-time incident data.",
    description: "Emergency services often face delays due to rapidly changing situations and limited coordination. Build an intelligent platform that integrates surveillance systems, IoT devices, and emergency services to detect incidents, prioritize responses, recommend strategies, and improve coordination for faster emergency management."
  },
  {
    id: 7,
    theme: "Adaptive Intelligence System",
    ps_id: "AIS-07",
    title: "AI-Based Adaptive Patient Monitoring System",
    domain: "Healthcare",
    problemStatement: "Develop an adaptive intelligent system that continuously monitors patient health using real-time medical data. The solution should detect early signs of health deterioration and provide timely alerts to healthcare professionals.",
    description: "Build an AI-powered healthcare platform that integrates wearable devices, electronic health records, and vital sign monitoring systems to continuously assess patient conditions. The system should analyze heart rate, blood pressure, oxygen saturation, temperature, and other physiological parameters to predict potential medical emergencies, prioritize high-risk patients, and recommend timely interventions. It should continuously adapt its predictions based on changing patient conditions and historical health data to improve clinical decision-making."
  },
  {
    id: 8,
    theme: "Adaptive Intelligence System",
    ps_id: "AIS-08",
    title: "Adaptive Hospital Resource Management System",
    domain: "Healthcare",
    problemStatement: "Design an adaptive intelligent system that dynamically predicts healthcare resource demand and optimizes hospital operations. The solution should improve patient care while maximizing the utilization of medical resources.",
    description: "Develop an AI-driven platform that analyzes patient admissions, disease trends, seasonal outbreaks, staff availability, and medical equipment usage to forecast hospital resource requirements. The system should automatically recommend optimal allocation of beds, ICU facilities, medical staff, and diagnostic equipment while adapting to real-time hospital conditions. By continuously learning from operational data, the solution should reduce waiting times, prevent resource shortages, and improve healthcare service efficiency."
  },
  {
    id: 9,
    theme: "Adaptive Intelligence System",
    ps_id: "AIS-09",
    title: "Adaptive AI Crop Intelligence for Early Pest and Disease Prevention",
    domain: "Precision Farming",
    problemStatement: "Develop an Adaptive Intelligent System for pest and disease management that continuously monitors crop health, predicts potential outbreaks, and dynamically recommends preventive and corrective actions. The solution should improve decision-making, minimize crop losses, optimize resource utilization, and support sustainable agricultural practices through real-time adaptation.",
    description: "The system should integrate AI, Machine Learning, Computer Vision, IoT sensors, drones, and predictive analytics to analyze crop images, environmental conditions, and historical data. It should detect early signs of pests and diseases, generate timely alerts, and continuously adapt its recommendations based on changing field conditions. The solution should be scalable, secure, and capable of integrating with existing precision farming ecosystems."
  },
  {
    id: 10,
    theme: "Adaptive Intelligence System",
    ps_id: "AIS-10",
    title: "Adaptive Smart Farming Control for Maximum Greenhouse Productivity",
    domain: "Precision Farming",
    problemStatement: "Develop an Adaptive Intelligent System for smart greenhouse management that continuously monitors environmental conditions, predicts crop requirements, and dynamically controls greenhouse operations. The solution should optimize crop growth, improve resource efficiency, reduce manual intervention, and enable real-time adaptive decision-making.",
    description: "The system should leverage AI, IoT sensors, edge computing, and predictive analytics to monitor temperature, humidity, soil moisture, light intensity, and other environmental parameters. It should automatically regulate irrigation, ventilation, lighting, and climate control based on crop needs and historical trends. The solution should ensure scalability, energy efficiency, sustainability, and seamless integration with existing greenhouse management systems."
  },
  {
    id: 11,
    theme: "Predictive Logistics using Industrial AI",
    ps_id: "PLI-01",
    title: "AI-Based Smart Learning Resource Logistics",
    domain: "Edutainment",
    problemStatement: "Develop an Industrial AI-powered predictive logistics solution that ensures the availability and timely delivery of educational resources. The system should forecast demand patterns and optimize inventory management across educational institutions.",
    description: "Develop an Industrial AI-powered predictive logistics system that forecasts educational resource demand and ensures timely distribution of books, lab equipment, and digital learning kits across schools and colleges. Educational institutions often face delays or shortages of learning materials due to poor inventory planning. The proposed system should analyze historical usage, student enrollment, academic schedules, and seasonal demand to predict future requirements, optimize warehouse inventory, and schedule deliveries before shortages occur."
  },
  {
    id: 12,
    theme: "Predictive Logistics using Industrial AI",
    ps_id: "PLI-02",
    title: "Intelligent Event Logistics for Educational Institutions",
    domain: "Edutainment",
    problemStatement: "Create an AI-driven logistics management system that predicts resource requirements and streamlines planning for educational events. The solution should improve transportation, equipment handling, and venue resource utilization.",
    description: "Build an AI-driven logistics platform that predicts and manages transportation, equipment movement, and venue resource allocation for educational events and competitions. Managing logistics for seminars, hackathons, and cultural events is often inefficient due to last minute planning. The solution should predict participant turnout, transportation needs, equipment demand, and venue utilization to improve planning while minimizing operational costs."
  },
  {
    id: 13,
    theme: "Predictive Logistics using Industrial AI",
    ps_id: "PLI-03",
    title: "Predictive Cash Logistics Management",
    domain: "FinTech",
    problemStatement: "Develop an AI-powered cash logistics optimization system that predicts financial resource requirements and improves secure cash distribution processes.",
    description: "Develop an AI-powered logistics platform that predicts ATM cash demand and optimizes cash transportation routes for financial institutions. Banks often experience ATM cash shortages or excess cash storage due to inaccurate demand estimation. The system should analyze transaction history, public holidays, seasonal trends, and customer behavior to forecast cash requirements and schedule efficient replenishment."
  },
  {
    id: 14,
    theme: "Predictive Logistics using Industrial AI",
    ps_id: "PLI-04",
    title: "Intelligent Secure Asset Transportation",
    domain: "FinTech",
    problemStatement: "Build an Industrial AI solution that enhances secure asset transportation by predicting logistics requirements and optimizing risk-aware movement strategies.",
    description: "Build an Industrial AI solution that predicts secure transportation requirements for high-value financial assets while minimizing operational risks. Financial institutions transport cash, gold, and confidential documents across multiple branches. The system should forecast transportation demand, identify optimal routes, and allocate security resources based on risk analysis and traffic conditions."
  },
  {
    id: 15,
    theme: "Predictive Logistics using Industrial AI",
    ps_id: "PLI-05",
    title: "Predictive Urban Delivery Optimization",
    domain: "Smart Cities",
    problemStatement: "Develop an Industrial AI-based urban logistics platform that predicts delivery patterns and generates optimized transportation strategies to reduce congestion and improve efficiency.",
    description: "Develop an Industrial AI platform that predicts city-wide delivery demand and dynamically optimizes logistics routes. Rapid urbanization increases delivery traffic and congestion. The system should analyze traffic, weather, demand patterns, and road conditions to generate optimized delivery schedules that reduce travel time and fuel consumption."
  },
  {
    id: 16,
    theme: "Predictive Logistics using Industrial AI",
    ps_id: "PLI-06",
    title: "Smart Waste Collection Logistics",
    domain: "Smart Cities",
    problemStatement: "Design an AI-powered predictive waste logistics system that forecasts waste collection requirements and optimizes municipal resource allocation.",
    description: "Design an AI-powered predictive logistics solution that forecasts waste generation and optimizes municipal waste collection routes. Fixed waste collection schedules often result in inefficient operations. The proposed solution should use IoT sensor data and historical waste generation patterns to predict collection requirements and allocate vehicles efficiently."
  },
  {
    id: 17,
    theme: "Predictive Logistics using Industrial AI",
    ps_id: "PLI-07",
    title: "HealthLogix AI: Predictive Medical Supply and Equipment Logistics Platform",
    domain: "Healthcare",
    problemStatement: "Develop an Industrial AI-powered predictive healthcare logistics system that forecasts the demand for medical supplies and critical equipment while optimizing their allocation, inventory management, and distribution across healthcare facilities. The solution should minimize shortages, reduce operational delays, improve resource utilization, and ensure timely availability of essential healthcare resources.",
    description: "The system should use AI, Machine Learning, and predictive analytics to forecast demand for medicines, surgical instruments, PPE kits, blood units, ventilators, infusion pumps, diagnostic devices, and other critical assets based on patient admissions, treatment schedules, seasonal disease patterns, inventory levels, and equipment usage data. It should optimize stock management, automate replenishment, schedule maintenance, and enable efficient inter-hospital resource transfers. The solution should ensure uninterrupted healthcare services, reduce waste, and enhance operational efficiency across hospitals and clinics."
  },
  {
    id: 18,
    theme: "Predictive Logistics using Industrial AI",
    ps_id: "PLI-08",
    title: "BloodChain AI: Predictive Blood Supply Management System",
    domain: "Healthcare",
    problemStatement: "Develop an Industrial AI-powered system that predicts blood demand and optimizes blood collection, storage, and distribution across healthcare facilities.",
    description: "Blood availability is affected by unpredictable emergencies, seasonal demand changes, and limited shelf life. The solution should use AI forecasting models to analyze hospital requirements, patient records, blood usage patterns, and regional health trends. It should optimize blood inventory levels, reduce wastage, predict shortages, and coordinate timely distribution between blood banks and hospitals."
  },
  {
    id: 19,
    theme: "Predictive Logistics using Industrial AI",
    ps_id: "PLI-09",
    title: "AI-Based Agricultural Supply Logistics",
    domain: "Precision Farming",
    problemStatement: "Develop an Industrial AI system that predicts demand for seeds, fertilizers, and pesticides and optimizes their distribution to farms.",
    description: "Farmers often experience delays in receiving agricultural supplies during critical cultivation periods. The proposed solution should analyze seasonal crop patterns, weather forecasts, and regional demand to ensure timely delivery and reduce supply shortages."
  },
  {
    id: 20,
    theme: "Predictive Logistics using Industrial AI",
    ps_id: "PLI-10",
    title: "Smart Harvest Transportation Prediction",
    domain: "Precision Farming",
    problemStatement: "Build a predictive logistics platform that forecasts harvest volumes and optimizes transportation from farms to storage facilities and markets.",
    description: "Delays in transporting harvested crops lead to quality degradation and financial losses. The system should predict harvest quantities, vehicle requirements, and optimal delivery schedules to minimize post-harvest waste."
  },
  {
    id: 21,
    theme: "Autonomous Agentic AI",
    ps_id: "AAA-01",
    title: "Adaptive Interactive Narrative Director",
    domain: "Edutainment",
    problemStatement: "Develop an autonomous multi-agent system that dynamically generates educational storylines, NPC behaviors, and learning challenges based on player interactions and emotions.",
    description: "Traditional educational games rely on static storylines that reduce long-term engagement. Build an agentic AI system where autonomous agents collaboratively analyze player interactions, evaluate learning progress, and dynamically adapt narratives, dialogues, and gameplay in real time to deliver a personalized learning experience."
  },
  {
    id: 22,
    theme: "Autonomous Agentic AI",
    ps_id: "AAA-02",
    title: "Autonomous Peer-Learning Network for Skill Mastery",
    domain: "Edutainment",
    problemStatement: "Build autonomous AI learning peers that collaborate with students to solve problems and enhance critical thinking.",
    description: "Online learning often lacks the engagement of collaborative study groups. Design AI learning peers with diverse personalities and reasoning styles that discuss concepts, provide feedback, intentionally challenge learners, and co-create educational resources to improve conceptual understanding."
  },
  {
    id: 23,
    theme: "Autonomous Agentic AI",
    ps_id: "AAA-03",
    title: "Autonomous Portfolio Rebalancing and Hedging Agent",
    domain: "FinTech",
    problemStatement: "Design an autonomous portfolio management agent that monitors markets and executes intelligent risk mitigation strategies.",
    description: "Traditional portfolio management reacts slowly to market volatility. Build an autonomous agent that continuously monitors financial markets, analyzes risks, formulates hedging strategies, and safely executes portfolio adjustments while minimizing user intervention."
  },
  {
    id: 24,
    theme: "Autonomous Agentic AI",
    ps_id: "AAA-04",
    title: "Agentic Fraud Ring Detection and Countermeasure Engine",
    domain: "FinTech",
    problemStatement: "Develop an autonomous fraud detection system that identifies complex fraud networks and initiates dynamic countermeasures.",
    description: "Modern fraud schemes constantly evolve to bypass traditional detection methods. Create autonomous investigator agents that analyze transaction networks, identify suspicious fraud patterns, and proactively trigger verification, account protection measures, or forensic reports to strengthen financial security."
  },
  {
    id: 25,
    theme: "Autonomous Agentic AI",
    ps_id: "AAA-05",
    title: "Dynamic Multi-Modal Traffic Orchestration Network",
    domain: "Smart Cities",
    problemStatement: "Develop a decentralized multi-agent traffic management system that autonomously optimizes urban traffic flow in real time.",
    description: "Centralized traffic systems struggle to respond quickly to congestion and emergencies. Build intelligent intersection agents that communicate with one another to optimize signal timings, prioritize emergency vehicles and public transport, and dynamically manage traffic without relying on a central controller."
  },
  {
    id: 26,
    theme: "Autonomous Agentic AI",
    ps_id: "AAA-06",
    title: "Autonomous Municipal Asset Maintenance Operations",
    domain: "Smart Cities",
    problemStatement: "Develop an autonomous platform that detects, schedules, and manages urban infrastructure maintenance using AI and IoT.",
    description: "City infrastructure maintenance is often reactive, leading to higher costs and service disruptions. Design autonomous AI agents that analyze data from IoT sensors, computer vision systems, and citizen reports to identify issues, prioritize repairs, and efficiently coordinate maintenance operations."
  },
  {
    id: 27,
    theme: "Autonomous Agentic AI",
    ps_id: "AAA-07",
    title: "Autonomous Multi-Agent Hospital Operations Assistant",
    domain: "Healthcare",
    problemStatement: "Develop an autonomous multi-agent AI system that coordinates hospital operations with minimal human intervention. The solution should intelligently manage appointments, patient flow, and resource allocation while collaborating with healthcare staff.",
    description: "Build a multi-agent AI platform where specialized agents independently handle patient appointment scheduling, doctor availability, bed allocation, diagnostic requests, and discharge planning. The agents should collaborate in real time, adapt to emergencies, and optimize hospital workflows while keeping healthcare professionals informed and in control of critical decisions."
  },
  {
    id: 28,
    theme: "Autonomous Agentic AI",
    ps_id: "AAA-08",
    title: "Autonomous Medical Supply and Pharmacy Management",
    domain: "Healthcare",
    problemStatement: "Create an autonomous agentic AI system that monitors, predicts, and manages hospital pharmacy and medical inventory operations. The solution should proactively prevent shortages and automate supply management across healthcare facilities.",
    description: "Develop an AI-driven multi-agent platform where autonomous agents continuously monitor medicine inventory, predict future demand, identify low-stock situations, coordinate procurement, and optimize distribution across hospital departments. The system should adapt to changing patient volumes, seasonal diseases, and emergency situations while minimizing medicine wastage and ensuring uninterrupted healthcare services."
  },
  {
    id: 29,
    theme: "Autonomous Agentic AI",
    ps_id: "AAA-09",
    title: "Autonomous Crop Pest and Disease Containment Network",
    domain: "Precision Farming",
    problemStatement: "Engineer a multi-agent crop health system that integrates early aerial detection, localized treatment dispatch, and predictive spread modeling to contain agricultural threats.",
    description: "Blanket chemical spraying for crop diseases leads to excessive pesticide use, ecological damage, and high financial costs. This problem calls for an autonomous agent ecosystem where surveillance agents (processing multispectral satellite/drone images) detect early localized infection clusters. These agents autonomously deploy targeted treatment ground robotics or precision spraying drones to the exact coordinates, while adjusting containment strategy parameters based on hyper-local microclimate forecasts."
  },
  {
    id: 30,
    theme: "Autonomous Agentic AI",
    ps_id: "AAA-10",
    title: "Dynamic Hyper-Local Irrigation and Fertilizer Orchestration",
    domain: "Precision Farming",
    problemStatement: "Create an autonomous soil-management agent that controls hyper-local drip irrigation and fertigation systems by integrating real-time soil chemistry feeds and meteorological models.",
    description: "Fixed irrigation and fertilization schedules frequently lead to nutrient runoff, soil degradation, and water waste. The goal is to build an autonomous agent attached to farm sector arrays. The agent continuously reads subterranean soil moisture, salinity, and nitrogen-phosphorus-potassium (NPK) sensors, cross-references localized weather forecasts, and independently executes variable-rate irrigation and nutrient dosing tailored to specific plant growth stages."
  },
  {
    id: 31,
    theme: "Cybersecurity & Digital Trust",
    ps_id: "CDT-01",
    title: "EduChain AI: Blockchain-Based Intellectual Property and Digital Content Ownership Platform",
    domain: "Edutainment",
    problemStatement: "Develop a blockchain-powered platform that securely records ownership, licensing, and authenticity of educational content, including AI-generated learning materials, digital textbooks, simulations, videos, and interactive courses. The solution should prevent plagiarism, unauthorized distribution, and copyright infringement while ensuring transparent content attribution and trusted digital ownership.",
    description: "The platform should leverage blockchain, smart contracts, decentralized storage (IPFS), and digital signatures to create tamper-proof ownership and licensing records for educational content. It should verify the authenticity of AI-generated and digital learning resources, automate licensing, and prevent plagiarism and unauthorized distribution. The solution should enable transparent content attribution, secure sharing, and efficient rights management while ensuring scalability, interoperability, and trust across educational ecosystems."
  },
  {
    id: 32,
    theme: "Cybersecurity & Digital Trust",
    ps_id: "CDT-02",
    title: "Student Privacy Protection in E-Learning Platforms",
    domain: "Edutainment",
    problemStatement: "Design a secure platform that protects students' personal information and learning records from cyberattacks and unauthorized access.",
    description: "The platform encrypts sensitive student data, implements role-based access control, and detects suspicious login attempts. It ensures safe digital learning environments."
  },
  {
    id: 33,
    theme: "Cybersecurity & Digital Trust",
    ps_id: "CDT-03",
    title: "Blockchain-Based Decentralized Digital Identity & KYC Verification",
    domain: "FinTech",
    problemStatement: "Develop a blockchain-based decentralized identity platform that enables secure KYC verification across multiple financial institutions without repeatedly sharing personal information.",
    description: "Users own their digital identity while banks verify cryptographic proofs stored on blockchain. The solution reduces identity theft, prevents data tampering, eliminates repeated KYC procedures, and strengthens cybersecurity and digital trust."
  },
  {
    id: 34,
    theme: "Cybersecurity & Digital Trust",
    ps_id: "CDT-04",
    title: "AI-Powered Banking Fraud Detection",
    domain: "FinTech",
    problemStatement: "Develop an AI system that detects suspicious banking transactions and prevents financial fraud in real time.",
    description: "Machine learning analyzes customer behavior, transaction patterns, and login activities to identify anomalies. The platform instantly blocks suspicious transactions and alerts customers."
  },
  {
    id: 35,
    theme: "Cybersecurity & Digital Trust",
    ps_id: "CDT-05",
    title: "Smart CCTV-Based Crime Detection",
    domain: "Smart Cities",
    problemStatement: "Develop an AI-powered surveillance system that detects suspicious activities and alerts authorities in real time.",
    description: "Computer vision identifies abnormal movements, unattended objects, and restricted-area intrusions. Emergency notifications improve public safety."
  },
  {
    id: 36,
    theme: "Cybersecurity & Digital Trust",
    ps_id: "CDT-06",
    title: "UrbanTrust AI: Blockchain-Based Decentralized Digital Identity for Smart Cities",
    domain: "Smart Cities",
    problemStatement: "Develop a blockchain-based decentralized digital identity platform that enables citizens to securely access multiple smart city services—such as transportation, healthcare, utilities, e-governance, and public safety—using a single tamper-proof digital identity. The solution should eliminate identity fraud, prevent unauthorized access, and strengthen digital trust while preserving citizen privacy.",
    description: "The platform should leverage blockchain, decentralized identity (DID), verifiable credentials, and smart contracts to provide a secure, tamper-proof digital identity for citizens. It should enable seamless authentication across multiple smart city services while preventing identity fraud and unauthorized access. The solution should support selective data sharing, transparent access logs, privacy-preserving authentication, and interoperability with existing government systems, ensuring scalability, security, and digital trust."
  },
  {
    id: 37,
    theme: "Cybersecurity & Digital Trust",
    ps_id: "CDT-07",
    title: "MedSecure AI: Blockchain-Based Electronic Health Record Protection",
    domain: "Healthcare",
    problemStatement: "Develop a blockchain-enabled platform that securely stores and manages Electronic Health Records (EHRs), ensuring data integrity, privacy, and controlled access while preventing unauthorized modifications and medical data breaches.",
    description: "Healthcare organizations frequently face cyberattacks targeting sensitive patient records. The solution should leverage blockchain technology, smart contracts, and secure encryption to create immutable patient records with role-based access control. It should enable secure sharing of medical records among hospitals, clinics, and patients while ensuring transparency, compliance, and digital trust."
  },
  {
    id: 38,
    theme: "Cybersecurity & Digital Trust",
    ps_id: "CDT-08",
    title: "HealthShield AI: Intelligent Healthcare Cyber Threat Detection",
    domain: "Healthcare",
    problemStatement: "Design an AI-driven cybersecurity platform that continuously monitors hospital networks, connected medical devices, and healthcare applications to detect, predict, and prevent cyber threats in real time.",
    description: "Hospitals increasingly rely on connected devices and cloud-based healthcare systems that are vulnerable to ransomware, malware, and unauthorized access. The solution should use Artificial Intelligence, Machine Learning, and anomaly detection to identify suspicious activities, automatically respond to threats, and strengthen the security of critical healthcare infrastructure."
  },
  {
    id: 39,
    theme: "Cybersecurity & Digital Trust",
    ps_id: "CDT-09",
    title: "FarmChain AI: Blockchain-Based Transparent Farm-to-Consumer Marketplace",
    domain: "Precision Farming",
    problemStatement: "Develop a blockchain-powered agricultural marketplace that enables transparent and secure transactions between farmers, intermediaries, retailers, and consumers. The platform should record every transaction, pricing update, quality certification, and ownership transfer on an immutable blockchain ledger, ensuring fair pricing, preventing fraud, reducing disputes, and building digital trust across the agricultural supply chain.",
    description: "Farmers often face reduced profits due to unclear pricing and dependency on multiple intermediaries. The solution should use blockchain, smart contracts, digital payments, and QR-based traceability to securely record the complete product journey from farm to consumer. It should provide transparent access to product origin, quality, pricing, and transaction history for all stakeholders. The platform should automate agreements, ensure fair profit distribution, reduce disputes, and build trust between farmers, intermediaries, and consumers."
  },
  {
    id: 40,
    theme: "Cybersecurity & Digital Trust",
    ps_id: "CDT-10",
    title: "Smart Irrigation Security: Secure AI-Based Water Management System",
    domain: "Precision Farming",
    problemStatement: "Develop a secure AI-based irrigation system that protects automated water management systems from cyber threats while optimizing water usage.",
    description: "Smart irrigation systems depend on IoT sensors and automated controllers that can be targeted by attackers to disrupt farming operations. The solution should combine AI-based anomaly detection, secure communication protocols, and device authentication to protect irrigation infrastructure. It should ensure reliable operation, prevent unauthorized control, and improve sustainable water management."
  },
  {
    id: 41,
    theme: "Human Centered AI",
    ps_id: "HCA-01",
    title: "AI Learning Companion for Neurodiverse Students",
    domain: "Edutainment",
    problemStatement: "Develop an AI-powered learning companion that personalizes lessons, assessments, and learning experiences for neurodiverse students.",
    description: "Traditional educational content often fails to address the needs of students with ADHD, dyslexia, autism, and other learning differences. Build an AI learning companion that adapts content, explanations, and assessments to individual learning styles while helping teachers provide more personalized, inclusive, and effective education."
  },
  {
    id: 42,
    theme: "Human Centered AI",
    ps_id: "HCA-02",
    title: "Doubt-to-Meme Translator",
    domain: "Edutainment",
    problemStatement: "Develop an AI tool that transforms complex textbook concepts into engaging memes, stories, or relatable scenarios to improve learning retention.",
    description: "Students often retain engaging digital content better than traditional study materials. Build an AI-powered platform that converts textbook concepts into memes, short stories, or relatable examples, making revision more interactive, enjoyable, and easier to remember."
  },
  {
    id: 43,
    theme: "Human Centered AI",
    ps_id: "HCA-03",
    title: "AI Assistant for Smart Gold & Jewellery Decisions",
    domain: "FinTech",
    problemStatement: "Develop an AI-powered assistant that simplifies gold and jewellery purchasing through personalized guidance and transparent information.",
    description: "Buying gold and jewellery can be confusing due to changing prices, making charges, wastage, and complex terminology. Create an AI assistant that explains these concepts in simple language, compares available options, and helps customers make informed purchasing decisions with greater confidence."
  },
  {
    id: 44,
    theme: "Human Centered AI",
    ps_id: "HCA-04",
    title: "Inclusive AI Banking Assistant for Rural Communities",
    domain: "FinTech",
    problemStatement: "Develop a multilingual AI banking assistant that improves digital banking accessibility for rural communities.",
    description: "Language barriers, limited digital literacy, and accessibility challenges prevent many rural users from accessing digital banking services. Build a human-centered AI assistant with multilingual voice support, simplified explanations, and accessibility features to enable safe and convenient banking for everyone."
  },
  {
    id: 45,
    theme: "Human Centered AI",
    ps_id: "HCA-05",
    title: "SafePath AI – AI Safe Route Planner",
    domain: "Smart Cities",
    problemStatement: "Develop an AI-powered navigation system that recommends the safest travel routes using real-time environmental and public safety data.",
    description: "People, especially women, children, and senior citizens, often feel unsafe while travelling through poorly lit or isolated areas. Design an AI navigation system that analyzes street lighting, crowd density, crime reports, emergency services, and traffic conditions to recommend the safest routes."
  },
  {
    id: 46,
    theme: "Human Centered AI",
    ps_id: "HCA-06",
    title: "Urban Wellness AI",
    domain: "Smart Cities",
    problemStatement: "Develop an AI-powered wellness companion that monitors emotional well-being and recommends personalized wellness support.",
    description: "Modern urban lifestyles contribute to stress, loneliness, and mental fatigue, while access to timely emotional support remains limited. Build an AI companion that tracks mood through simple check-ins, recommends wellness activities and nearby resources, monitors progress, and suggests professional support when required while ensuring user privacy."
  },
  {
    id: 47,
    theme: "Human Centered AI",
    ps_id: "HCA-07",
    title: "Human-Centered AI for Clinical Decision Support",
    domain: "Healthcare",
    problemStatement: "Design a Human-Centered AI system that assists doctors by providing transparent and explainable clinical recommendations. The solution should improve diagnostic confidence while ensuring that final medical decisions remain under human control.",
    description: "Develop an AI-driven clinical decision support platform that analyzes electronic health records, laboratory reports, medical imaging, and patient history to suggest possible diagnoses and treatment options. The system should explain the reasoning behind every recommendation using interpretable AI techniques, highlight confidence levels, and allow healthcare professionals to validate or modify the suggested decisions before implementation."
  },
  {
    id: 48,
    theme: "Human Centered AI",
    ps_id: "HCA-08",
    title: "Accessible AI Healthcare Communication Assistant",
    domain: "Healthcare",
    problemStatement: "Create a Human-Centered AI communication platform that improves interactions between patients and healthcare providers. The solution should make healthcare information more accessible, understandable, and inclusive for people of diverse backgrounds and abilities.",
    description: "Build an AI-powered healthcare assistant that enables patients to communicate with hospitals through voice or text in multiple languages. The platform should simplify complex medical information, answer common healthcare queries, generate personalized discharge instructions, and provide appointment reminders in easy-to-understand language. The system should support multilingual communication, accessibility features, and human review to ensure accurate and patient-friendly healthcare services."
  },
  {
    id: 49,
    theme: "Human Centered AI",
    ps_id: "HCA-09",
    title: "AI Crop Rotation Planner",
    domain: "Precision Farming",
    problemStatement: "Develop an AI assistant that recommends optimal crop rotation plans to improve soil health and agricultural productivity.",
    description: "Repeated cultivation of the same crops reduces soil fertility and lowers crop yields over time. Build an AI-powered assistant that analyzes soil health, previous cropping patterns, and seasonal conditions to recommend effective crop rotation strategies that improve productivity and long-term sustainability."
  },
  {
    id: 50,
    theme: "Human Centered AI",
    ps_id: "HCA-10",
    title: "Mix-and-Match Cropping",
    domain: "Precision Farming",
    problemStatement: "Develop an AI assistant that recommends suitable intercropping combinations based on farm conditions and crop requirements.",
    description: "Many farmers lack knowledge of effective intercropping practices, resulting in poor soil health and reduced yields. Build an AI assistant that recommends practical crop combinations based on land, soil type, season, and existing crops, while explaining the benefits in simple language to improve productivity, soil fertility, and farm income."
  }
];

export type Service = {
  id: string;
  title: string;
  description: string;
  iconName: string;
};

export const SERVICES: Service[] = [
  { id: "s1", title: "Architecture Design", description: "Visionary structural concepts tailored to your environment and highest aesthetic standard.", iconName: "compass" },
  { id: "s2", title: "Interior Design", description: "Curated internal spaces that blend seamless material luxury with everyday functionality.", iconName: "paintbrush" },
  { id: "s3", title: "Construction", description: "Masterful execution using leading techniques to bring blueprints into physical reality.", iconName: "hammer" },
  { id: "s4", title: "Project Management", description: "End-to-end oversight ensuring precision, budget alignment, and uncompromising delivery.", iconName: "briefcase" },
  { id: "s5", title: "Renovation", description: "Harmonious restoration and modernization of existing structures with supreme care.", iconName: "wrench" },
  { id: "s6", title: "Consultation", description: "Strategic spatial planning and feasibility studies before ever breaking ground.", iconName: "message" }
];

export type ProcessStep = {
  step: string;
  title: string;
  description: string;
};

export const PROCESS_STEPS: ProcessStep[] = [
  { step: "01", title: "Consultation", description: "We begin with a thorough discussion of your vision, spatial requirements, lifestyle needs, and site potential." },
  { step: "02", title: "Concept Design", description: "Our architects translate your vision into initial sketches, spatial relationships, and material mood boards." },
  { step: "03", title: "Planning", description: "Rigorous technical drawings, zoning approvals, structural engineering, and final materials selection." },
  { step: "04", title: "Build", description: "Exacting construction management by master builders, delivering the finished spaces flawlessly on schedule." },
];

export type Benefit = {
  title: string;
  description: string;
  iconName: string;
};

export const BENEFITS: Benefit[] = [
  { title: "Uncompromising Precision", description: "Every joint, beam, and finish is calculated and inspected to millimeter accuracy.", iconName: "target" },
  { title: "Premium Materials", description: "Sourcing only highest-grade natural stone, sustainable timber, and architectural metals.", iconName: "gem" },
  { title: "Reliable Timelines", description: "Proactive project management ensures strict adherence to agreed delivery phases.", iconName: "clock" },
  { title: "Design-Led Execution", description: "Our builders and architects work as one cohesive unit to protect the aesthetic intent.", iconName: "award" }
];

export type PortfolioItem = {
  id: string;
  title: string;
  category: string;
  location: string;
  imageUrl: string;
  summary: string;
  yearCompleted: string;
};

export const PORTFOLIO_WORK: PortfolioItem[] = [
  { id: "p1", title: "Apex Residence", category: "Residential", location: "Coastal Cliffs", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200", summary: "A striking minimalist seaside villa merging raw concrete with vast ocean sightlines.", yearCompleted: "2024" },
  { id: "p2", title: "Meridian Tower Atrium", category: "Commercial", location: "Metropolis Hub", imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200", summary: "Triple-height glass and steel lobby promoting environmental light flow.", yearCompleted: "2023" },
  { id: "p3", title: "The Onyx Suite", category: "Interior", location: "Downtown Penthouse", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200", summary: "A strictly monochromatic luxury living space accented by monumental marble elements.", yearCompleted: "2025" },
  { id: "p4", title: "Lumina Pavilion", category: "Cultural", location: "Valley Reserve", imageUrl: "https://images.unsplash.com/photo-1613490908578-15c00e6205e4?auto=format&fit=crop&q=80&w=1200", summary: "An exhibition center utilizing geometric fragmentation woven into natural forestry.", yearCompleted: "2022" },
];

export type Testimonial = {
  clientName: string;
  clientType: string;
  quote: string;
  projectType: string;
};

export const TESTIMONIALS: Testimonial[] = [
  { clientName: "E. Rothschild", clientType: "Private Client", quote: "Timeless Spaces Studio achieved what others said was impossible. The structural elegance and attention to the darkest concrete details is immaculate.", projectType: "Residential Build" },
  { clientName: "A. Vance, CEO", clientType: "Commercial Developer", quote: "A remarkably disciplined team. They managed the commercial interior redesign strictly on timeline without ever diluting the architectural signature.", projectType: "Commercial Interior" },
  { clientName: "J. Mercer", clientType: "Private Client", quote: "The consultation phase alone proved their profound mastery of light and shadow in residential plotting. The resulting house is a masterpiece.", projectType: "Custom Home" },
];

export type FAQItem = {
  question: string;
  answer: string;
};

export const FAQS: FAQItem[] = [
  { question: "How long does a standard residential project take?", answer: "Designing and permitting typically requires 3-6 months. The construction phase for a high-end custom home spans 12-18 months depending on complexity and material sourcing schedules." },
  { question: "Do you handle both architectural design and construction?", answer: "Yes, we operate as a unified design-build firm. Our architects and master builders collaborate daily to preserve the exact vision from sketch to final polish." },
  { question: "What should I prepare for the initial consultation?", answer: "We recommend bringing site details (if owned), a rough budget perimeter, and any inspirational references. However, entirely blank canvases are welcome." },
  { question: "Can you manage projects outside of your immediate region?", answer: "Yes. For significant private residences and specialized commercial developments we deploy our principal teams internationally." },
  { question: "Where do you source your materials?", answer: "We maintain direct relationships with elite quarries, sustainable timber yards, and artisanal metalworks worldwide to guarantee unparalleled quality." }
];

export const MOCK_CLIENTS = [
  { id: "c1", name: "E. Rothschild", company: "Private", status: "active", outstanding: "$0" },
  { id: "c2", name: "A. Vance", company: "Vance Holdings", status: "pending", outstanding: "$45,000" },
  { id: "c3", name: "J. Mercer", company: "Private", status: "completed", outstanding: "$0" },
  { id: "c4", name: "T. Sterling", company: "Sterling Corp", status: "active", outstanding: "$120,000" },
];

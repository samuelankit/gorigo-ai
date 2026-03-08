import { db } from "@/lib/db";
import { industries, voiceProfiles, industryTemplates, caseStudies } from "@/shared/schema";
import { sql } from "drizzle-orm";

const INDUSTRIES_DATA = [
  { name: "Healthcare", slug: "healthcare", description: "NHS trusts, private clinics, dental practices, pharmacies, and mental health services.", icon: "Stethoscope", complianceNotes: "Must comply with NHS Data Security and Protection Toolkit, GDPR for health data (special category), and CQC requirements. Never store patient medical records in call logs. AI disclosure required.", regulatoryBody: "Care Quality Commission (CQC), NHS England", sicCode: "86", displayOrder: 1 },
  { name: "Real Estate", slug: "real-estate", description: "Estate agents, letting agents, property management, and housing associations.", icon: "Home", complianceNotes: "Must comply with Estate Agents Act 1979, Consumer Protection from Unfair Trading Regulations 2008, and the Property Ombudsman code. Money laundering checks required for transactions.", regulatoryBody: "The Property Ombudsman (TPO)", sicCode: "68", displayOrder: 2 },
  { name: "Legal Services", slug: "legal", description: "Solicitors, barristers, law firms, legal aid providers, and conveyancers.", icon: "Scale", complianceNotes: "Subject to Solicitors Regulation Authority (SRA) rules. Client confidentiality is paramount. Privilege must be maintained. No legal advice to be given by AI — information only.", regulatoryBody: "Solicitors Regulation Authority (SRA)", sicCode: "69.1", displayOrder: 3 },
  { name: "Financial Services", slug: "financial-services", description: "Insurance brokers, banks, building societies, fintech, and wealth management.", icon: "Landmark", complianceNotes: "FCA regulated. Must include risk warnings where applicable. No personalised financial advice from AI. Record-keeping requirements for MiFID II and PSD2. Vulnerable customer protocols required.", regulatoryBody: "Financial Conduct Authority (FCA)", sicCode: "64-66", displayOrder: 4 },
  { name: "Hospitality", slug: "hospitality", description: "Hotels, restaurants, event venues, catering, and tourism operators.", icon: "UtensilsCrossed", complianceNotes: "Food safety regulations (FSA) if handling food queries. Accessibility requirements under Equality Act 2010. Allergen information must be accurate.", regulatoryBody: "Food Standards Agency (FSA)", sicCode: "55-56", displayOrder: 5 },
  { name: "E-commerce & Retail", slug: "ecommerce-retail", description: "Online shops, high street retailers, subscription services, and marketplaces.", icon: "ShoppingCart", complianceNotes: "Consumer Rights Act 2015 applies. 14-day cooling-off period for distance selling. Clear returns policy must be communicated. PCI DSS for any payment references.", regulatoryBody: "Trading Standards", sicCode: "47", displayOrder: 6 },
];

const VOICE_PROFILES_DATA = [
  { name: "Professional", slug: "professional", description: "Authoritative, confident, and measured. Slightly formal tone with clear articulation. Ideal for business and regulated environments.", pitch: 0.98, speed: 0.95, warmth: 0.4, emphasis: 0.7, pauseLength: 0.25, ttsVoiceId: "Polly.Amy", bestFor: "Legal services, financial services, B2B, government, professional services" },
  { name: "Friendly", slug: "friendly", description: "Warm, approachable, and conversational. Natural rhythm with engaged tone. Ideal for customer-facing consumer brands.", pitch: 1.05, speed: 1.05, warmth: 0.8, emphasis: 0.5, pauseLength: 0.3, ttsVoiceId: "Polly.Amy", bestFor: "Retail, hospitality, travel, entertainment, subscription services" },
  { name: "Formal", slug: "formal", description: "Precise, structured, and respectful. Even pace with deliberate articulation. Ideal for regulated industries and official communications.", pitch: 0.96, speed: 0.9, warmth: 0.3, emphasis: 0.6, pauseLength: 0.35, ttsVoiceId: "Polly.Amy", bestFor: "Government, legal, finance, compliance-heavy industries" },
  { name: "Casual", slug: "casual", description: "Relaxed, energetic, and natural. Slightly faster pace with conversational flow. Ideal for younger audiences and lifestyle brands.", pitch: 1.08, speed: 1.1, warmth: 0.85, emphasis: 0.4, pauseLength: 0.2, ttsVoiceId: "Polly.Amy", bestFor: "E-commerce, tech startups, lifestyle brands, social media support" },
];

function generateTemplates(industrySlug: string, industryName: string, voiceProfileMap: Record<string, number>) {
  const disclosure = `[AI Disclosure] This call is handled by an AI assistant on behalf of ${industryName.toLowerCase()} services. `;

  const templateSets: Record<string, { title: string; content: string; type: string; voiceSlug: string; disclaimer?: string }[]> = {
    "healthcare": [
      { title: "Appointment Booking — Inbound", type: "inbound_call_script", voiceSlug: "professional", content: `${disclosure}Thank you for calling. I can help you book, reschedule, or cancel an appointment.\n\nStep 1: \"May I have your name and date of birth so I can locate your records?\"\nStep 2: \"What type of appointment are you looking for — routine check-up, follow-up, or urgent?\"\nStep 3: \"I have availability on [DATE] at [TIME]. Would that work for you?\"\nStep 4: \"Your appointment is confirmed. You will receive a text reminder 24 hours before.\"\n\nEscalation: If the caller reports chest pain, breathing difficulty, or a medical emergency, immediately say: \"For emergencies, please hang up and dial 999.\"`, disclaimer: "This AI does not provide medical advice, diagnosis, or treatment. All clinical queries are escalated to qualified staff." },
      { title: "Prescription Reminder — Outbound", type: "outbound_call_script", voiceSlug: "professional", content: `${disclosure}Hello, this is a courtesy call from [PRACTICE NAME].\n\n\"This is a reminder that your prescription for [MEDICATION] is due for renewal. Would you like us to prepare it for collection, or would you prefer it sent to your nominated pharmacy?\"\n\nIf yes: \"We will have that ready for you by [DATE]. Please bring photo ID when collecting.\"\nIf query: \"I will ask a member of the clinical team to call you back regarding your medication.\"`, disclaimer: "Medication names are confirmed from your records. This is a reminder only, not a clinical recommendation." },
      { title: "Patient Registration FAQ", type: "faq_answer", voiceSlug: "professional", content: `Q: How do I register as a new patient?\nA: To register, you will need to complete a registration form — available at the practice or on our website. You will need your NHS number (if known), photo ID, and proof of address. Registration is typically processed within 48 hours.` },
      { title: "Healthcare IVR Menu", type: "ivr_menu", voiceSlug: "formal", content: `Welcome to [PRACTICE NAME]. This call may be recorded for training and quality purposes.\n\nPress 1 for appointments\nPress 2 for prescription requests\nPress 3 for test results\nPress 4 for reception enquiries\nPress 5 to speak to our AI assistant\n\nIf this is a medical emergency, please hang up and dial 999.` },
    ],
    "real-estate": [
      { title: "Property Viewing — Inbound", type: "inbound_call_script", voiceSlug: "friendly", content: `${disclosure}Thank you for calling [AGENCY NAME]. I can help you arrange a property viewing.\n\nStep 1: \"Which property are you interested in? Do you have the property reference number?\"\nStep 2: \"May I take your name, contact number, and email address?\"\nStep 3: \"Are you a first-time buyer, moving home, or an investor?\"\nStep 4: \"I have viewings available on [DATES]. Which would suit you best?\"\nStep 5: \"Your viewing is confirmed. You will receive a confirmation email with the property details.\"` },
      { title: "Valuation Booking — Outbound", type: "outbound_call_script", voiceSlug: "friendly", content: `${disclosure}Hello, this is [AGENCY NAME]. You recently requested a property valuation.\n\n\"I would like to arrange a convenient time for one of our valuers to visit your property at [ADDRESS]. Our valuations are free and without obligation.\"\n\"We typically need 30-45 minutes for a thorough assessment. Would [DATE] at [TIME] suit you?\"` },
      { title: "Viewing Reminder SMS", type: "sms_template", voiceSlug: "friendly", content: `[AGENCY NAME]: Reminder — You have a viewing at [PROPERTY ADDRESS] on [DATE] at [TIME]. Reply CANCEL if you can no longer attend.` },
    ],
    "legal": [
      { title: "Client Intake — Inbound", type: "inbound_call_script", voiceSlug: "formal", content: `${disclosure}Thank you for calling [FIRM NAME]. I can help you with an initial enquiry.\n\nStep 1: \"May I take your name and a contact number?\"\nStep 2: \"Could you briefly describe what legal matter you need assistance with?\"\nStep 3: \"I will arrange for one of our solicitors to call you back within [TIMEFRAME].\"\n\nImportant: Do NOT provide legal advice. All responses must be informational only.`, disclaimer: "This AI assistant provides general information only. It does not provide legal advice." },
      { title: "Case Update — Outbound", type: "outbound_call_script", voiceSlug: "formal", content: `${disclosure}Hello, this is a call from [FIRM NAME] regarding your matter reference [REF].\n\n\"I am calling to provide an update on your case. [UPDATE CONTENT].\"\n\"Do you have any questions you would like me to pass to your solicitor?\"` },
      { title: "Legal Fees FAQ", type: "faq_answer", voiceSlug: "formal", content: `Q: What are your fees?\nA: Our fees vary depending on the type of legal matter. We offer an initial consultation at [RATE]. For ongoing work, we provide a detailed fee estimate before proceeding. We accept legal aid for eligible matters.` },
    ],
    "financial-services": [
      { title: "Account Enquiry — Inbound", type: "inbound_call_script", voiceSlug: "professional", content: `${disclosure}Thank you for calling [COMPANY NAME]. I can help you with general account enquiries.\n\nStep 1: \"For security, may I take your full name and the last four digits of your account number?\"\nStep 2: \"How can I help you today?\"\nStep 3: Address the enquiry or escalate to an advisor.\n\nImportant: Never provide specific financial advice. Always include appropriate risk warnings.`, disclaimer: "This AI does not provide personalised financial advice. All investment queries are referred to qualified advisors." },
      { title: "Renewal Reminder — Outbound", type: "outbound_call_script", voiceSlug: "professional", content: `${disclosure}Hello, this is [COMPANY NAME] calling about your [PRODUCT] which is due for renewal on [DATE].\n\n\"I wanted to let you know your current terms and help you understand your renewal options.\"\n\"Would you like me to arrange a call with one of our advisors to discuss this further?\"` },
    ],
    "hospitality": [
      { title: "Reservation Booking — Inbound", type: "inbound_call_script", voiceSlug: "friendly", content: `${disclosure}Thank you for calling [VENUE NAME]. I can help you make a reservation.\n\nStep 1: \"What date and time are you looking to book?\"\nStep 2: \"How many guests will be dining?\"\nStep 3: \"Do any of your guests have dietary requirements or allergies?\"\nStep 4: \"Your table is confirmed for [PARTY SIZE] on [DATE] at [TIME]. Can I take your name and contact number?\"` },
      { title: "Booking Confirmation SMS", type: "sms_template", voiceSlug: "friendly", content: `[VENUE NAME]: Your reservation for [GUESTS] on [DATE] at [TIME] is confirmed. Reply CANCEL to cancel. For allergen info, visit [URL] or call [PHONE].` },
      { title: "Allergen Information FAQ", type: "faq_answer", voiceSlug: "friendly", content: `Q: Do you cater for dietary requirements?\nA: Yes, we offer options for vegetarian, vegan, gluten-free, and other dietary needs. Please inform us of any allergies when booking. Our full allergen menu is available on request. For severe allergies, we recommend speaking directly with our kitchen team.` },
    ],
    "ecommerce-retail": [
      { title: "Order Status — Inbound", type: "inbound_call_script", voiceSlug: "casual", content: `${disclosure}Thank you for calling [STORE NAME]. I can help you check your order status.\n\nStep 1: \"May I have your order number or the email address used for your purchase?\"\nStep 2: \"Your order [ORDER NUMBER] is currently [STATUS]. It was dispatched on [DATE] and is expected to arrive by [DATE].\"\nStep 3: \"Is there anything else I can help you with?\"` },
      { title: "Returns Processing — Inbound", type: "inbound_call_script", voiceSlug: "casual", content: `${disclosure}I can help you with a return or exchange.\n\nStep 1: \"May I have your order number?\"\nStep 2: \"Which item would you like to return, and what is the reason?\"\nStep 3: \"Under the Consumer Rights Act, you have 14 days from delivery to return items for a full refund. I will send you a returns label by email.\"\nStep 4: \"Once we receive the item, your refund will be processed within 5-7 working days.\"`, disclaimer: "Returns must comply with our returns policy and the Consumer Rights Act 2015." },
    ],
  };

  const set = templateSets[industrySlug];
  if (!set) return [];

  return set.map(t => ({
    industryId: 0,
    templateType: t.type,
    title: t.title,
    content: t.content,
    voiceProfileId: voiceProfileMap[t.voiceSlug] || voiceProfileMap["professional"],
    language: "en-GB" as const,
    tone: t.voiceSlug === "professional" ? "professional" : t.voiceSlug === "formal" ? "formal" : t.voiceSlug === "friendly" ? "friendly" : "casual",
    complianceDisclaimer: t.disclaimer || null,
    variables: [],
    tags: industrySlug,
    version: 1,
    isSystem: true,
    orgId: null,
    usageCount: 0,
    rating: null,
    isActive: true,
  }));
}

const CASE_STUDIES_DATA = [
  { industrySlug: "healthcare", slug: "nhs-dental-practice-ai", title: "How an NHS Dental Practice Reduced Missed Appointments by 62%", subtitle: "Automated appointment reminders and intelligent rescheduling", challenge: "A busy NHS dental practice in Manchester was losing over 200 appointments per month to no-shows. Reception staff spent 3+ hours daily making reminder calls, leaving patients on hold for routine bookings.", solution: "GoRigo deployed an AI call agent handling inbound appointment bookings and outbound reminder calls. The system sends SMS reminders 48 hours and 2 hours before appointments, calls patients who haven't confirmed, and offers instant rescheduling for cancellations.", results: "Within 3 months: missed appointments dropped by 62%, reception call handling time reduced by 4 hours per day, and patient satisfaction scores improved from 3.8 to 4.6 out of 5.", testimonialQuote: "Our reception team can now focus on patients in the waiting room instead of being glued to the phone.", testimonialAuthor: "Dr Sarah Mitchell", testimonialRole: "Practice Principal", roiPercentage: 340, costReduction: 62, callsHandled: 8500, customerSatisfaction: 4.6 },
  { industrySlug: "legal", slug: "regional-law-firm-afterhours", title: "Regional Law Firm Captures 40% More Client Enquiries After Hours", subtitle: "24/7 intelligent client intake without additional staffing costs", challenge: "A 12-partner law firm in Birmingham was missing potential client enquiries outside of office hours. Analysis showed that 35% of new client calls came between 5:30pm and 9am, representing an estimated £180,000 in lost annual revenue.", solution: "GoRigo's Professional voice profile handles after-hours calls, conducting structured client intake interviews. The AI collects case details, assesses urgency, and categorises enquiries by practice area.", results: "After-hours enquiry capture increased by 40%. The firm converted 28% of these into paying clients within 6 months, generating £75,000 in additional fees. Average response time for new enquiries dropped from 14 hours to under 30 minutes.", testimonialQuote: "Clients are genuinely surprised when they learn they were speaking with an AI. The intake quality is as thorough as our best paralegals.", testimonialAuthor: "James Worthington", testimonialRole: "Managing Partner", roiPercentage: 520, costReduction: 45, callsHandled: 12000, customerSatisfaction: 4.7 },
  { industrySlug: "real-estate", slug: "london-estate-agency-ai", title: "London Estate Agency Doubles Viewing Bookings with AI Concierge", subtitle: "Instant response to property enquiries drives faster sales", challenge: "A growing London estate agency with 3 branches was struggling to respond quickly to property enquiries from portal listings. Research shows that responding within 5 minutes increases lead conversion by 21x, but average response time was 4 hours.", solution: "GoRigo responds to portal enquiries within 60 seconds via outbound call. The AI qualifies buyers, matches them to suitable properties, and books viewings directly into the agency's calendar.", results: "Viewing bookings increased by 108%. Average enquiry response time dropped from 4 hours to 58 seconds. Vendor satisfaction improved significantly, leading to 15% more market appraisal instructions.", testimonialQuote: "The speed of response has transformed our business. Vendors love that their property gets immediate attention.", testimonialAuthor: "Priya Sharma", testimonialRole: "Branch Director", roiPercentage: 410, costReduction: 38, callsHandled: 15000, customerSatisfaction: 4.8 },
];

export async function seedContentStudio() {
  console.log("[Seed] Starting Content Studio seeding...");

  const existingIndustries = await db.select({ id: industries.id }).from(industries).limit(1);
  if (existingIndustries.length > 0) {
    console.log("[Seed] Content Studio data already exists, skipping.");
    return { skipped: true, message: "Content Studio data already exists" };
  }

  const insertedIndustries = await db.insert(industries).values(INDUSTRIES_DATA).returning();
  console.log(`[Seed] Inserted ${insertedIndustries.length} industries`);

  const industryMap: Record<string, number> = {};
  for (const ind of insertedIndustries) {
    industryMap[ind.slug] = ind.id;
  }

  const insertedProfiles = await db.insert(voiceProfiles).values(VOICE_PROFILES_DATA).returning();
  console.log(`[Seed] Inserted ${insertedProfiles.length} voice profiles`);

  const voiceProfileMap: Record<string, number> = {};
  for (const vp of insertedProfiles) {
    voiceProfileMap[vp.slug] = vp.id;
  }

  let templateCount = 0;
  for (const ind of insertedIndustries) {
    const templates = generateTemplates(ind.slug, ind.name, voiceProfileMap);
    const withIndustryId = templates.map(t => ({ ...t, industryId: ind.id }));

    if (withIndustryId.length > 0) {
      await db.insert(industryTemplates).values(withIndustryId as any);
      templateCount += withIndustryId.length;
    }
  }
  console.log(`[Seed] Inserted ${templateCount} industry templates`);

  const caseStudyInserts = CASE_STUDIES_DATA.map(cs => ({
    industryId: industryMap[cs.industrySlug] || insertedIndustries[0].id,
    slug: cs.slug,
    title: cs.title,
    subtitle: cs.subtitle,
    challenge: cs.challenge,
    solution: cs.solution,
    results: cs.results,
    testimonialQuote: cs.testimonialQuote,
    testimonialAuthor: cs.testimonialAuthor,
    testimonialRole: cs.testimonialRole,
    roiPercentage: cs.roiPercentage,
    costReduction: cs.costReduction,
    callsHandled: cs.callsHandled,
    customerSatisfaction: cs.customerSatisfaction,
    keyMetrics: [],
    metaTitle: `${cs.title} | GoRigo Case Study`,
    metaDescription: cs.subtitle,
    published: true,
    featured: true,
  }));

  await db.insert(caseStudies).values(caseStudyInserts);
  console.log(`[Seed] Inserted ${caseStudyInserts.length} case studies`);

  console.log("[Seed] Content Studio seeding complete!");
  return {
    skipped: false,
    industries: insertedIndustries.length,
    voiceProfiles: insertedProfiles.length,
    templates: templateCount,
    caseStudies: caseStudyInserts.length,
  };
}


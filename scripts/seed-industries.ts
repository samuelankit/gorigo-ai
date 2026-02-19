import { db } from "@/lib/db";
import { industries, voiceProfiles, industryTemplates, caseStudies } from "@/shared/schema";
import { sql } from "drizzle-orm";

const INDUSTRIES_DATA = [
  { name: "Healthcare", slug: "healthcare", description: "NHS trusts, private clinics, dental practices, pharmacies, and mental health services.", icon: "Stethoscope", complianceNotes: "Must comply with NHS Data Security and Protection Toolkit, GDPR for health data (special category), and CQC requirements. Never store patient medical records in call logs. AI disclosure required.", regulatoryBody: "Care Quality Commission (CQC), NHS England", sicCode: "86", displayOrder: 1 },
  { name: "Legal Services", slug: "legal", description: "Solicitors, barristers, law firms, legal aid providers, and conveyancers.", icon: "Scale", complianceNotes: "Subject to Solicitors Regulation Authority (SRA) rules. Client confidentiality is paramount. Privilege must be maintained. No legal advice to be given by AI — information only.", regulatoryBody: "Solicitors Regulation Authority (SRA)", sicCode: "69.1", displayOrder: 2 },
  { name: "Real Estate", slug: "real-estate", description: "Estate agents, letting agents, property management, and housing associations.", icon: "Home", complianceNotes: "Must comply with Estate Agents Act 1979, Consumer Protection from Unfair Trading Regulations 2008, and the Property Ombudsman code. Money laundering checks required for transactions.", regulatoryBody: "The Property Ombudsman (TPO)", sicCode: "68", displayOrder: 3 },
  { name: "Financial Services", slug: "financial-services", description: "Insurance brokers, banks, building societies, fintech, and wealth management.", icon: "Landmark", complianceNotes: "FCA regulated. Must include risk warnings where applicable. No personalised financial advice from AI. Record-keeping requirements for MiFID II and PSD2. Vulnerable customer protocols required.", regulatoryBody: "Financial Conduct Authority (FCA)", sicCode: "64-66", displayOrder: 4 },
  { name: "E-commerce & Retail", slug: "ecommerce-retail", description: "Online shops, high street retailers, subscription services, and marketplaces.", icon: "ShoppingCart", complianceNotes: "Consumer Rights Act 2015 applies. 14-day cooling-off period for distance selling. Clear returns policy must be communicated. PCI DSS for any payment references.", regulatoryBody: "Trading Standards", sicCode: "47", displayOrder: 5 },
  { name: "Hospitality", slug: "hospitality", description: "Hotels, restaurants, event venues, catering, and tourism operators.", icon: "UtensilsCrossed", complianceNotes: "Food safety regulations (FSA) if handling food queries. Accessibility requirements under Equality Act 2010. Allergen information must be accurate.", regulatoryBody: "Food Standards Agency (FSA)", sicCode: "55-56", displayOrder: 6 },
  { name: "Automotive", slug: "automotive", description: "Car dealerships, MOT centres, repair garages, fleet management, and vehicle leasing.", icon: "Car", complianceNotes: "Consumer Rights Act applies to vehicle sales. FCA regulation for finance products. DVLA rules for vehicle checks. Safety recall communications must be prioritised.", regulatoryBody: "FCA (for finance), DVSA", sicCode: "45", displayOrder: 7 },
  { name: "Education", slug: "education", description: "Universities, colleges, training providers, tutoring services, and schools.", icon: "GraduationCap", complianceNotes: "Safeguarding requirements (especially for under-18s). GDPR for student data. Ofsted/OfS requirements. Student loan and fee information must be accurate.", regulatoryBody: "Office for Students (OfS), Ofsted", sicCode: "85", displayOrder: 8 },
  { name: "Travel & Tourism", slug: "travel-tourism", description: "Travel agencies, tour operators, airlines, cruise lines, and booking platforms.", icon: "Plane", complianceNotes: "ATOL/ABTA protection requirements. Package Travel Regulations 2018. Flight delay compensation under UK261. Travel insurance signposting.", regulatoryBody: "Civil Aviation Authority (CAA), ABTA", sicCode: "79", displayOrder: 9 },
  { name: "Telecommunications", slug: "telecoms", description: "Mobile operators, broadband providers, VoIP services, and connectivity solutions.", icon: "Wifi", complianceNotes: "Ofcom regulations. Automatic compensation scheme. Fairness for customers commitments. Number porting rules. Cooling-off period for contracts.", regulatoryBody: "Ofcom", sicCode: "61", displayOrder: 10 },
  { name: "Home Services", slug: "home-services", description: "Plumbers, electricians, HVAC, pest control, cleaning, and handyman services.", icon: "Wrench", complianceNotes: "Gas Safe registration for gas work. NICEIC/NAPIT for electrical. Consumer Rights Act for services. Cancellation rights for doorstep contracts.", regulatoryBody: "Gas Safe Register, NICEIC", sicCode: "43", displayOrder: 11 },
  { name: "Professional Services", slug: "professional-services", description: "Accountants, consultants, architects, surveyors, and management consultancies.", icon: "Briefcase", complianceNotes: "Professional indemnity requirements. ICAEW/ACCA rules for accountancy. RICS for surveyors. Anti-money laundering regulations for designated professions.", regulatoryBody: "ICAEW, ACCA, RICS", sicCode: "69-74", displayOrder: 12 },
  { name: "Government & Public Sector", slug: "government", description: "Local councils, government agencies, public bodies, and citizen services.", icon: "Building2", complianceNotes: "Freedom of Information Act. Equality Act compliance. GDS Service Standard. Welsh Language Standards where applicable. Accessibility regulations (WCAG 2.1 AA).", regulatoryBody: "Government Digital Service (GDS)", sicCode: "84", displayOrder: 13 },
  { name: "Recruitment & HR", slug: "recruitment", description: "Recruitment agencies, HR departments, staffing solutions, and talent acquisition.", icon: "Users", complianceNotes: "Employment Agencies Act 1973. GDPR for candidate data. Equality Act for non-discriminatory practices. Right to work checks. AWR compliance for temporary workers.", regulatoryBody: "Employment Agency Standards Inspectorate", sicCode: "78", displayOrder: 14 },
  { name: "SaaS & Technology", slug: "saas-technology", description: "Software companies, IT support, managed services, cloud platforms, and tech startups.", icon: "Code", complianceNotes: "GDPR for data processing. ISO 27001 recommended. SLA commitments must be accurate. Data Processing Agreements required. Incident notification obligations.", regulatoryBody: "ICO (Information Commissioner's Office)", sicCode: "62", displayOrder: 15 },
];

const VOICE_PROFILES_DATA = [
  { name: "Soft", slug: "soft", description: "Calm, empathetic, and gentle. Slower pace with natural pauses. Ideal for sensitive conversations.", pitch: 0.95, speed: 0.85, warmth: 0.9, emphasis: 0.3, pauseLength: 0.5, ttsVoiceId: "Polly.Amy", bestFor: "Healthcare, complaints handling, bereavement services, mental health, customer care" },
  { name: "Straight", slug: "straight", description: "Clear, balanced, and neutral. Standard pace with even tone. Ideal for general enquiries and information delivery.", pitch: 1.0, speed: 1.0, warmth: 0.5, emphasis: 0.5, pauseLength: 0.3, ttsVoiceId: "Polly.Amy", bestFor: "General enquiries, information lines, appointment booking, order status, FAQs" },
  { name: "Professional", slug: "professional", description: "Authoritative, confident, and measured. Slightly formal tone with clear articulation. Ideal for business and regulated environments.", pitch: 0.98, speed: 0.95, warmth: 0.4, emphasis: 0.7, pauseLength: 0.25, ttsVoiceId: "Polly.Amy", bestFor: "Legal services, financial services, B2B, government, professional services" },
  { name: "Warm", slug: "warm", description: "Friendly, approachable, and conversational. Natural rhythm with engaged tone. Ideal for customer-facing consumer brands.", pitch: 1.05, speed: 1.05, warmth: 0.8, emphasis: 0.5, pauseLength: 0.3, ttsVoiceId: "Polly.Amy", bestFor: "Retail, hospitality, travel, entertainment, subscription services" },
  { name: "Urgent", slug: "urgent", description: "Direct, concise, and action-oriented. Faster pace with purposeful emphasis. Ideal for time-sensitive or emergency scenarios.", pitch: 1.0, speed: 1.15, warmth: 0.3, emphasis: 0.8, pauseLength: 0.15, ttsVoiceId: "Polly.Amy", bestFor: "Emergency callbacks, appointment reminders, payment chasing, recalls, critical updates" },
];

const TEMPLATE_TYPES = [
  "inbound_call_script",
  "outbound_call_script",
  "email_template",
  "sms_template",
  "faq_answer",
  "voicemail_greeting",
  "hold_message",
  "ivr_menu",
  "escalation_script",
  "follow_up",
] as const;

function generateTemplates(industrySlug: string, industryName: string, voiceProfileMap: Record<string, number>): Omit<typeof industryTemplates.$inferSelect, "id" | "createdAt" | "updatedAt">[] {
  const compliancePrefix = `[AI Disclosure] This call is handled by an AI assistant on behalf of ${industryName.toLowerCase()} services. `;

  const templateMap: Record<string, { templates: { title: string; content: string; type: string; voiceSlug: string; disclaimer?: string }[] }> = {
    "healthcare": {
      templates: [
        { title: "Appointment Booking — Inbound", type: "inbound_call_script", voiceSlug: "soft", content: `${compliancePrefix}Thank you for calling. I can help you book, reschedule, or cancel an appointment.\n\nStep 1: \"May I have your name and date of birth so I can locate your records?\"\nStep 2: \"What type of appointment are you looking for — routine check-up, follow-up, or urgent?\"\nStep 3: \"I have availability on [DATE] at [TIME]. Would that work for you?\"\nStep 4: \"Your appointment is confirmed. You will receive a text reminder 24 hours before. Is there anything else I can help with?\"\n\nEscalation: If the caller reports chest pain, breathing difficulty, or a medical emergency, immediately say: \"For emergencies, please hang up and dial 999. I am transferring you to a clinical team member now.\"`, disclaimer: "This AI does not provide medical advice, diagnosis, or treatment. All clinical queries are escalated to qualified staff." },
        { title: "Prescription Reminder — Outbound", type: "outbound_call_script", voiceSlug: "soft", content: `${compliancePrefix}Hello, this is a courtesy call from [PRACTICE NAME].\n\n\"This is a reminder that your prescription for [MEDICATION] is due for renewal. Would you like us to prepare it for collection, or would you prefer it sent to your nominated pharmacy?\"\n\nIf yes: \"We will have that ready for you by [DATE]. Please bring photo ID when collecting.\"\nIf query: \"I will ask a member of the clinical team to call you back regarding your medication.\"`, disclaimer: "Medication names are confirmed from your records. This is a reminder only, not a clinical recommendation." },
        { title: "Appointment Reminder SMS", type: "sms_template", voiceSlug: "straight", content: `Reminder: You have an appointment at [PRACTICE NAME] on [DATE] at [TIME]. Reply YES to confirm or CANCEL to reschedule. If you need urgent medical help, call 111 or 999.` },
        { title: "Patient Enquiry Email", type: "email_template", voiceSlug: "professional", content: `Subject: Your Enquiry — [PRACTICE NAME]\n\nDear [PATIENT NAME],\n\nThank you for contacting [PRACTICE NAME]. We have received your enquiry regarding [SUBJECT].\n\n[RESPONSE CONTENT]\n\nIf you need to speak with a member of our clinical team, please call us on [PHONE] during surgery hours ([HOURS]).\n\nKind regards,\n[PRACTICE NAME] Reception Team\n\nThis email may contain confidential information intended solely for the addressee. If you have received this in error, please delete it and notify us immediately.` },
        { title: "GP Surgery Hold Message", type: "hold_message", voiceSlug: "soft", content: `Thank you for holding. Your call is important to us and will be answered as soon as possible. If this is a medical emergency, please hang up and dial 999. For non-urgent medical advice, you can also call NHS 111 or visit nhs.uk. We appreciate your patience.` },
        { title: "Healthcare FAQ — Registration", type: "faq_answer", voiceSlug: "straight", content: `Q: How do I register as a new patient?\nA: To register, you will need to complete a registration form — available at the practice or on our website. You will need your NHS number (if known), photo ID, and proof of address. Registration is typically processed within 48 hours. Once registered, you can book appointments and request prescriptions.` },
        { title: "Healthcare IVR Menu", type: "ivr_menu", voiceSlug: "straight", content: `Welcome to [PRACTICE NAME]. This call may be recorded for training and quality purposes.\n\nPress 1 for appointments\nPress 2 for prescription requests\nPress 3 for test results\nPress 4 for reception enquiries\nPress 5 to speak to our AI assistant\n\nIf this is a medical emergency, please hang up and dial 999.` },
        { title: "Healthcare Voicemail", type: "voicemail_greeting", voiceSlug: "soft", content: `You have reached [PRACTICE NAME]. We are currently closed. Our opening hours are [HOURS]. If you need urgent medical attention outside of these hours, please call NHS 111 or dial 999 for emergencies. Please leave your name, date of birth, and a brief message after the tone, and we will return your call on the next working day.` },
        { title: "Healthcare Escalation", type: "escalation_script", voiceSlug: "urgent", content: `\"I understand this is important to you. Let me connect you with a member of our team who can help further.\"\n\nEscalation triggers:\n- Caller mentions symptoms requiring clinical assessment\n- Caller is distressed or upset\n- Caller requests to speak to a specific doctor\n- Safeguarding concern identified\n- Complaint about care received\n\nTransfer protocol: \"I am transferring you now. Please stay on the line. If we are disconnected, please call back on [NUMBER].\"` },
        { title: "Healthcare Follow-Up", type: "follow_up", voiceSlug: "soft", content: `Subject: Follow-Up — Your Recent Visit to [PRACTICE NAME]\n\nDear [PATIENT NAME],\n\nThank you for visiting [PRACTICE NAME] on [DATE]. We hope your experience was satisfactory.\n\nAs discussed during your appointment:\n- [ACTION ITEM 1]\n- [ACTION ITEM 2]\n\nIf you have any questions or concerns, please do not hesitate to contact us on [PHONE].\n\nWarm regards,\n[PRACTICE NAME] Team` },
      ]
    },
    "legal": {
      templates: [
        { title: "Client Intake — Inbound", type: "inbound_call_script", voiceSlug: "professional", content: `${compliancePrefix}Thank you for calling [FIRM NAME]. I can help you with an initial enquiry.\n\nStep 1: \"May I take your name and a contact number?\"\nStep 2: \"Could you briefly describe what legal matter you need assistance with?\"\nStep 3: \"I will arrange for one of our solicitors to call you back within [TIMEFRAME]. Is there a preferred time?\"\nStep 4: \"For your reference, our consultation fees are [RATE]. Is there anything else I can note for the solicitor?\"\n\nImportant: Do NOT provide legal advice. All responses must be informational only.`, disclaimer: "This AI assistant provides general information only. It does not provide legal advice. All legal queries are referred to qualified solicitors." },
        { title: "Case Update — Outbound", type: "outbound_call_script", voiceSlug: "professional", content: `${compliancePrefix}Hello, this is a call from [FIRM NAME] regarding your matter reference [REF].\n\n\"I am calling to provide an update on your case. [UPDATE CONTENT].\"\n\"Do you have any questions you would like me to pass to your solicitor?\"\n\"If you need to discuss this further, I can arrange a call with [SOLICITOR NAME] at a convenient time.\"` },
        { title: "Legal Appointment Confirmation SMS", type: "sms_template", voiceSlug: "professional", content: `[FIRM NAME]: Your appointment with [SOLICITOR] is confirmed for [DATE] at [TIME]. Please bring photo ID and any relevant documents. Reply RESCHEDULE to change. Ref: [REF]` },
        { title: "Legal Enquiry Email", type: "email_template", voiceSlug: "professional", content: `Subject: Your Enquiry — [FIRM NAME] (Ref: [REF])\n\nDear [CLIENT NAME],\n\nThank you for contacting [FIRM NAME]. We have noted your enquiry regarding [AREA OF LAW].\n\nOne of our solicitors specialising in [AREA] will be in touch within [TIMEFRAME] to discuss your matter.\n\nPlease note that this communication does not constitute legal advice and no solicitor-client relationship has been established at this stage.\n\nYours faithfully,\n[FIRM NAME]\n\nAuthorised and regulated by the Solicitors Regulation Authority (SRA No. [NUMBER]).\nThis email is confidential and may be legally privileged.` },
        { title: "Legal FAQ — Fees", type: "faq_answer", voiceSlug: "professional", content: `Q: What are your fees?\nA: Our fees vary depending on the type of legal matter. We offer an initial consultation at [RATE]. For ongoing work, we provide a detailed fee estimate before proceeding. We are transparent about costs and will always discuss fees with you before any charges are incurred. We accept legal aid for eligible matters. Please ask about our fixed-fee services for conveyancing, wills, and family law.` },
        { title: "Legal Hold Message", type: "hold_message", voiceSlug: "professional", content: `Thank you for holding. Your call is important to us. A member of our team will be with you shortly. Please note that [FIRM NAME] is authorised and regulated by the Solicitors Regulation Authority. If you would like to leave a message, please press 1.` },
        { title: "Legal IVR Menu", type: "ivr_menu", voiceSlug: "professional", content: `Welcome to [FIRM NAME], solicitors. This call may be recorded.\n\nPress 1 for conveyancing\nPress 2 for family law\nPress 3 for employment law\nPress 4 for commercial and corporate\nPress 5 for all other enquiries\nPress 6 to speak to our AI assistant\n\nIf you know your case reference number, press 9.` },
        { title: "Legal Voicemail", type: "voicemail_greeting", voiceSlug: "professional", content: `You have reached [FIRM NAME]. Our offices are currently closed. Our opening hours are Monday to Friday, 9am to 5:30pm. Please leave your name, contact number, and a brief message, and we will return your call on the next working day. If your matter is urgent, please email [EMAIL]. This message may be subject to legal professional privilege.` },
        { title: "Legal Escalation", type: "escalation_script", voiceSlug: "professional", content: `\"I understand this matter requires specialist attention. Let me transfer you to the appropriate department.\"\n\nEscalation triggers:\n- Caller needs legal advice (beyond general information)\n- Active court deadline mentioned\n- Domestic abuse or safeguarding concern\n- Complaint about legal services\n- Request for specific solicitor\n\nSafeguarding note: If domestic abuse is disclosed, offer the National Domestic Abuse Helpline number: 0808 2000 247.` },
        { title: "Legal Follow-Up", type: "follow_up", voiceSlug: "professional", content: `Subject: Follow-Up — [FIRM NAME] (Ref: [REF])\n\nDear [CLIENT NAME],\n\nFurther to our recent correspondence regarding your [AREA OF LAW] matter, I wanted to confirm the next steps:\n\n1. [ACTION 1]\n2. [ACTION 2]\n\nPlease ensure any documents are returned by [DATE].\n\nIf you have any questions, please contact [SOLICITOR] on [PHONE] or [EMAIL].\n\nYours faithfully,\n[FIRM NAME]` },
      ]
    },
    "real-estate": {
      templates: [
        { title: "Property Viewing — Inbound", type: "inbound_call_script", voiceSlug: "warm", content: `${compliancePrefix}Thank you for calling [AGENCY NAME]. I can help you arrange a property viewing.\n\nStep 1: \"Which property are you interested in? Do you have the property reference number?\"\nStep 2: \"May I take your name, contact number, and email address?\"\nStep 3: \"Are you a first-time buyer, moving home, or an investor?\"\nStep 4: \"I have viewings available on [DATES]. Which would suit you best?\"\nStep 5: \"Your viewing is confirmed. You will receive a confirmation email with the property details and directions.\"\n\nIf no availability: \"I can add you to the waiting list and notify you as soon as a slot opens.\"` },
        { title: "Valuation Booking — Outbound", type: "outbound_call_script", voiceSlug: "warm", content: `${compliancePrefix}Hello, this is [AGENCY NAME]. You recently requested a property valuation.\n\n\"I would like to arrange a convenient time for one of our valuers to visit your property at [ADDRESS]. Our valuations are free and without obligation.\"\n\"We typically need 30-45 minutes for a thorough assessment. Would [DATE] at [TIME] suit you?\"\n\"Following the valuation, we will provide you with a market appraisal and our recommended asking price within 24 hours.\"` },
        { title: "Viewing Reminder SMS", type: "sms_template", voiceSlug: "warm", content: `[AGENCY NAME]: Reminder — You have a viewing at [PROPERTY ADDRESS] on [DATE] at [TIME]. Your contact at the property is [AGENT NAME] ([PHONE]). Reply CANCEL if you can no longer attend.` },
        { title: "Property Particulars Email", type: "email_template", voiceSlug: "warm", content: `Subject: Property Details — [PROPERTY ADDRESS] ([REF])\n\nDear [NAME],\n\nThank you for your interest in [PROPERTY ADDRESS]. Please find the full details below:\n\n[PROPERTY DESCRIPTION]\n\nAsking Price: [PRICE]\nBedrooms: [BEDS] | Bathrooms: [BATHS]\nCouncil Tax Band: [BAND]\nEPC Rating: [RATING]\n\nTo arrange a viewing, reply to this email or call [PHONE].\n\nKind regards,\n[AGENT NAME]\n[AGENCY NAME]\n\nMember of The Property Ombudsman. Anti-money laundering checks will be required for any offer.` },
        { title: "Real Estate FAQ — Selling Process", type: "faq_answer", voiceSlug: "warm", content: `Q: What is the process for selling my property?\nA: The selling process typically involves: 1) Free market appraisal and valuation, 2) Professional photography and listing preparation, 3) Marketing across major portals (Rightmove, Zoopla, OnTheMarket), 4) Conducting viewings and collecting feedback, 5) Negotiating offers, 6) Progressing the sale through to completion with your solicitor. The average time from listing to completion is 12-16 weeks.` },
        { title: "Real Estate Hold Message", type: "hold_message", voiceSlug: "warm", content: `Thank you for calling [AGENCY NAME]. We are currently assisting other customers and will be with you shortly. While you wait, why not visit our website at [URL] to browse our latest properties? Thank you for your patience.` },
        { title: "Real Estate IVR Menu", type: "ivr_menu", voiceSlug: "straight", content: `Welcome to [AGENCY NAME].\n\nPress 1 for sales enquiries\nPress 2 for lettings\nPress 3 to book a viewing\nPress 4 for property management\nPress 5 to speak to our AI assistant\nPress 0 to speak to a member of staff` },
        { title: "Real Estate Voicemail", type: "voicemail_greeting", voiceSlug: "warm", content: `You have reached [AGENCY NAME]. We are unable to take your call at the moment. Please leave your name, number, and a brief message, and we will call you back within 2 hours during business hours. To browse our latest properties, visit [WEBSITE].` },
        { title: "Real Estate Escalation", type: "escalation_script", voiceSlug: "professional", content: `\"Let me connect you with one of our property specialists who can assist you further.\"\n\nEscalation triggers:\n- Price negotiation or offer discussion\n- Legal or contractual query\n- Complaint about service\n- Maintenance emergency (for lettings)\n- Money laundering check questions\n\nFor lettings emergencies (burst pipes, no heating): \"I will flag this as urgent. For immediate assistance outside office hours, please call [EMERGENCY NUMBER].\"` },
        { title: "Real Estate Follow-Up", type: "follow_up", voiceSlug: "warm", content: `Subject: Thank You for Viewing [PROPERTY ADDRESS]\n\nDear [NAME],\n\nThank you for viewing [PROPERTY ADDRESS] on [DATE]. We hope you found the property interesting.\n\nWe would love to hear your feedback:\n- What did you think of the property?\n- Would you like to arrange a second viewing?\n- Do you have any questions about the area or the property?\n\nPlease do not hesitate to get in touch.\n\nBest regards,\n[AGENT NAME]\n[AGENCY NAME]` },
      ]
    },
  };

  const genericTemplates = (slug: string, name: string) => [
    { title: `${name} — Inbound Enquiry`, type: "inbound_call_script", voiceSlug: "straight", content: `${compliancePrefix}Thank you for calling [BUSINESS NAME]. I can help you with general enquiries about our ${name.toLowerCase()} services.\n\nStep 1: \"May I have your name and the best number to reach you?\"\nStep 2: \"How can I help you today?\"\nStep 3: Address the enquiry using the knowledge base, or arrange a callback.\nStep 4: \"Is there anything else I can help with?\"\n\nIf unable to resolve: \"I will arrange for a specialist to call you back within [TIMEFRAME].\"` },
    { title: `${name} — Appointment Booking`, type: "outbound_call_script", voiceSlug: "warm", content: `${compliancePrefix}Hello, this is [BUSINESS NAME]. I am calling regarding [SUBJECT].\n\n\"I would like to arrange a convenient time to [PURPOSE]. Would [DATE] at [TIME] work for you?\"\n\"I have noted that down. You will receive a confirmation by [SMS/EMAIL].\"\n\"Is there anything you would like to prepare beforehand?\"` },
    { title: `${name} — Appointment SMS`, type: "sms_template", voiceSlug: "straight", content: `[BUSINESS NAME]: Your appointment is on [DATE] at [TIME]. If you need to reschedule, reply CHANGE or call [PHONE].` },
    { title: `${name} — Enquiry Email`, type: "email_template", voiceSlug: "professional", content: `Subject: Your Enquiry — [BUSINESS NAME]\n\nDear [NAME],\n\nThank you for contacting [BUSINESS NAME]. We have received your enquiry regarding [SUBJECT].\n\n[RESPONSE]\n\nIf you have any further questions, please call us on [PHONE] or reply to this email.\n\nKind regards,\n[BUSINESS NAME] Team` },
    { title: `${name} — Common FAQ`, type: "faq_answer", voiceSlug: "straight", content: `Q: What services do you offer?\nA: [BUSINESS NAME] provides a range of ${name.toLowerCase()} services including [SERVICE LIST]. We operate [HOURS] and serve [AREA]. For a full list of services, visit our website or speak to one of our team.` },
    { title: `${name} — Hold Message`, type: "hold_message", voiceSlug: "straight", content: `Thank you for holding. Your call is important to us and will be answered as soon as possible. Did you know you can also reach us via our website at [URL]? Thank you for your patience.` },
    { title: `${name} — IVR Menu`, type: "ivr_menu", voiceSlug: "straight", content: `Welcome to [BUSINESS NAME].\n\nPress 1 for new enquiries\nPress 2 for existing customers\nPress 3 for billing and accounts\nPress 4 to speak to our AI assistant\nPress 0 to speak to a member of staff` },
    { title: `${name} — Voicemail`, type: "voicemail_greeting", voiceSlug: "straight", content: `You have reached [BUSINESS NAME]. We are unable to take your call at the moment. Please leave your name, number, and a brief message after the tone, and we will return your call during business hours.` },
    { title: `${name} — Escalation`, type: "escalation_script", voiceSlug: "professional", content: `\"I understand you need further assistance. Let me connect you with a specialist.\"\n\nEscalation triggers:\n- Complex or technical query beyond AI knowledge\n- Customer complaint\n- Request to speak to a manager\n- Sensitive or confidential matter\n\n\"I am transferring you now. Please stay on the line.\"` },
    { title: `${name} — Follow-Up`, type: "follow_up", voiceSlug: "warm", content: `Subject: Follow-Up from [BUSINESS NAME]\n\nDear [NAME],\n\nThank you for your recent enquiry with [BUSINESS NAME].\n\nAs discussed:\n- [ACTION 1]\n- [ACTION 2]\n\nIf you have any questions, please do not hesitate to contact us on [PHONE].\n\nBest regards,\n[BUSINESS NAME] Team` },
  ];

  const specificTemplates = templateMap[industrySlug];
  const templates = specificTemplates ? specificTemplates.templates : genericTemplates(industrySlug, industryName);

  return templates.map(t => ({
    industryId: 0,
    templateType: t.type,
    title: t.title,
    content: t.content,
    voiceProfileId: voiceProfileMap[t.voiceSlug] || voiceProfileMap["straight"],
    language: "en-GB",
    tone: t.voiceSlug === "professional" ? "professional" : t.voiceSlug === "soft" ? "empathetic" : t.voiceSlug === "warm" ? "friendly" : "neutral",
    complianceDisclaimer: (t as any).disclaimer || null,
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
  { industrySlug: "healthcare", slug: "nhs-dental-practice", title: "How an NHS Dental Practice Reduced Missed Appointments by 62%", subtitle: "Automated appointment reminders and intelligent rescheduling", challenge: "A busy NHS dental practice in Manchester was losing over 200 appointments per month to no-shows. Reception staff spent 3+ hours daily making reminder calls, leaving patients on hold for routine bookings. The practice was considering hiring additional reception staff at a cost of over £25,000 per year.", solution: "GoRigo deployed an AI call agent with the Soft voice profile, handling inbound appointment bookings and outbound reminder calls. The system sends SMS reminders 48 hours and 2 hours before appointments, calls patients who haven't confirmed, and offers instant rescheduling for cancellations. The AI handles 85% of calls without human intervention.", results: "Within 3 months: missed appointments dropped by 62%, reception call handling time reduced by 4 hours per day, patient satisfaction scores improved from 3.8 to 4.6 out of 5, and the practice saved an estimated £28,000 annually versus hiring additional staff.", testimonialQuote: "Our reception team can now focus on patients in the waiting room instead of being glued to the phone. The AI handles routine calls perfectly.", testimonialAuthor: "Dr Sarah Mitchell", testimonialRole: "Practice Principal", roiPercentage: 340, costReduction: 62, callsHandled: 8500, customerSatisfaction: 4.6 },
  { industrySlug: "legal", slug: "regional-law-firm", title: "Regional Law Firm Captures 40% More Client Enquiries After Hours", subtitle: "24/7 intelligent client intake without additional staffing costs", challenge: "A 12-partner law firm in Birmingham was missing potential client enquiries outside of office hours. Analysis showed that 35% of new client calls came between 5:30pm and 9am. These missed calls were going to competitors, representing an estimated £180,000 in lost annual revenue.", solution: "GoRigo's Professional voice profile handles after-hours calls, conducting structured client intake interviews. The AI collects case details, assesses urgency, and categorises enquiries by practice area. Urgent matters trigger immediate solicitor notifications. All intake data feeds directly into the firm's case management system.", results: "After-hours enquiry capture increased by 40%. The firm converted 28% of these into paying clients within 6 months, generating £75,000 in additional fees. Client feedback consistently praised the professional, reassuring tone of the AI assistant. Average response time for new enquiries dropped from 14 hours to under 30 minutes.", testimonialQuote: "Clients are genuinely surprised when they learn they were speaking with an AI. The intake quality is as thorough as our best paralegals.", testimonialAuthor: "James Worthington", testimonialRole: "Managing Partner", roiPercentage: 520, costReduction: 45, callsHandled: 12000, customerSatisfaction: 4.7 },
  { industrySlug: "real-estate", slug: "london-estate-agency", title: "London Estate Agency Doubles Viewing Bookings with AI Concierge", subtitle: "Instant response to property enquiries drives faster sales", challenge: "A growing London estate agency with 3 branches was struggling to respond quickly to property enquiries from portal listings (Rightmove, Zoopla). Research shows that responding within 5 minutes increases lead conversion by 21x, but average response time was 4 hours.", solution: "GoRigo's Warm voice profile responds to portal enquiries within 60 seconds via outbound call. The AI qualifies buyers, matches them to suitable properties, and books viewings directly into the agency's calendar. It handles property-specific questions using the listing data as its knowledge base.", results: "Viewing bookings increased by 108%. Average enquiry response time dropped from 4 hours to 58 seconds. Vendor satisfaction improved significantly, leading to 15% more market appraisal instructions. The agency handled 45% more listings without adding staff.", testimonialQuote: "The speed of response has transformed our business. Vendors love that their property gets immediate attention from every enquiry.", testimonialAuthor: "Priya Sharma", testimonialRole: "Branch Director", roiPercentage: 410, costReduction: 38, callsHandled: 15000, customerSatisfaction: 4.8 },
  { industrySlug: "financial-services", slug: "insurance-broker", title: "Insurance Broker Automates 75% of Renewal Calls", subtitle: "Proactive AI outreach drives retention and cross-sell revenue", challenge: "A mid-sized insurance broker handling 50,000 policies was losing 22% of customers at renewal. Manual renewal calls were labour-intensive, inconsistent, and only reached 30% of the book before renewal dates.", solution: "GoRigo's Professional voice profile conducts proactive renewal calls 30 days before expiry. The AI explains renewal terms, identifies life changes that might affect cover, and escalates complex cases to human advisors. All calls include FCA-required risk warnings and fair value assessments.", results: "Retention rate improved from 78% to 91%. Cross-sell revenue increased by 35% through AI-identified coverage gaps. The broker now contacts 100% of renewals (vs 30% previously). Cost per renewal contact dropped from £8.50 to £0.45.", testimonialQuote: "We went from calling a third of our book to calling every single customer. The AI handles the straightforward renewals perfectly, freeing our advisors for complex cases.", testimonialAuthor: "Mark Henderson", testimonialRole: "Operations Director", roiPercentage: 680, costReduction: 72, callsHandled: 45000, customerSatisfaction: 4.5 },
  { industrySlug: "ecommerce-retail", slug: "fashion-retailer", title: "Online Fashion Retailer Cuts Returns Enquiry Costs by 55%", subtitle: "AI handles order status and returns without human intervention", challenge: "A fast-growing online fashion retailer receiving 2,000+ customer service calls per week, with 65% being about order status or returns. Each call cost £3.80 to handle through their outsourced contact centre, totalling over £400,000 annually on routine enquiries alone.", solution: "GoRigo's Warm voice profile integrates with the retailer's order management system to provide real-time order tracking, process returns, and answer sizing queries. The AI accesses the product catalogue for recommendations and handles the 14-day return window process end-to-end.", results: "AI handles 78% of all customer calls. Average handling time dropped from 6 minutes to 2.5 minutes. Returns processing time reduced by 3 days. Customer satisfaction on AI-handled calls scored 4.4/5 versus 4.1/5 for human agents. Annual savings of £220,000.", testimonialQuote: "Our customers actually prefer the AI for order queries because it is faster and always available. No hold times, no transfers.", testimonialAuthor: "Emma Clarke", testimonialRole: "Head of Customer Experience", roiPercentage: 380, costReduction: 55, callsHandled: 96000, customerSatisfaction: 4.4 },
];

async function seedIndustries() {
  console.log("[Seed] Starting industry content seeding...");

  const existingIndustries = await db.select({ id: industries.id }).from(industries).limit(1);
  if (existingIndustries.length > 0) {
    console.log("[Seed] Industries already seeded, skipping.");
    return;
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
    industryId: industryMap[cs.industrySlug] || 1,
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

  console.log("[Seed] Industry content seeding complete!");
}

seedIndustries().catch(console.error).then(() => process.exit(0));

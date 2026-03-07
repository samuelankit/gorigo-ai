"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does talk-time billing work?",
    answer:
      "Talk time covers all platform usage — not just calls. This includes AI agent calls, content generation (drafts, scripts, FAQs), Rigo assistant queries, and knowledge base processing. There are no monthly seat fees, no subscriptions, and no hidden charges. Your usage is tracked in real time through your dashboard.",
  },
  {
    question: "What exactly does 'talk-time' cover?",
    answer:
      "Talk-time is our unified billing metric that covers all platform compute usage, not just phone calls. This includes AI agent voice calls, AI-powered content generation (drafts, scripts, FAQ creation), knowledge base document processing and indexing, Rigo assistant interactions, and any other AI compute tasks on the platform. Think of it as a single, transparent measure of all the work the platform does for you — billed per minute of compute time with no hidden fees.",
  },
  {
    question: "Can I switch between packages?",
    answer:
      "Yes, you can upgrade or change packages at any time. Our team will help you migrate seamlessly between deployment options as your needs evolve.",
  },
  {
    question: "Is there a minimum commitment?",
    answer:
      "No long-term contracts required. The minimum wallet recharge is £50, and you only pay for what you use on a prepaid basis. There are no free trials or free credits — you top up your wallet and start using the platform immediately. You can scale up or down based on your call volume.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards as well as bank transfers. For enterprise customers, we can arrange custom billing arrangements.",
  },
  {
    question: "Do you offer volume discounts?",
    answer:
      "Yes, we offer competitive volume discounts for high-volume usage. Contact our sales team to discuss custom pricing tailored to your call volumes.",
  },
  {
    question: "What if none of the standard packages fit my needs?",
    answer:
      "We offer a Custom Plan for businesses that need a tailored solution. You can pick and choose specific features, negotiate custom billing rates, and get a dedicated onboarding experience. Contact our sales team to discuss your requirements and we will build a bespoke package for you.",
  },
  {
    question: "How does the Custom Plan billing work?",
    answer:
      "Custom Plan rates are negotiated individually based on your specific needs, expected usage, and chosen features. Your dedicated account manager will work with you to agree on rates that work for your business. All billing is still based on talk time only — covering calls, AI content generation, and all platform usage — with no hidden fees.",
  },
  {
    question: "What is the Team package?",
    answer:
      "The Team package is designed for companies that need shared access for employees and board members. It includes unlimited team members, shared AI agents across the whole company, a team dashboard, per-department budgets, bulk CSV invites, and a team activity log. There are no per-seat fees — billing is purely based on talk-time at 18p/min. A minimum usage of £50/month applies.",
  },
  {
    question: "Can I upgrade from Individual to Team?",
    answer:
      "Yes, upgrading from Individual to Team is seamless. Your rate changes from your next call, and all your existing agents and data are preserved. After upgrading, an admin can set visibility for existing agents — choosing whether each agent is private, visible to a department, or shared across the whole company.",
  },
  {
    question: "Is there a limit on team members?",
    answer:
      "No limit. You can add your whole company including board members, with no per-seat charges. Board members get read-only access to view agent configurations, analytics, and dashboards without being able to modify settings or make calls.",
  },
  {
    question: "What's the difference between Team and Partner?",
    answer:
      "Team is for managing your internal company — employees, departments, and board members all sharing AI agents and resources. Partner is for managing external clients that you sell to, with separate billing, white-labelling, and reseller capabilities. Think of it this way: Team manages inward, Partner manages outward.",
  },
];

export function PricingFaq() {
  return (
    <Accordion type="single" collapsible className="w-full" data-testid="accordion-faq">
      {faqs.map((faq, index) => (
        <AccordionItem key={index} value={`faq-${index}`}>
          <AccordionTrigger
            className="text-left"
            data-testid={`trigger-faq-${index}`}
          >
            {faq.question}
          </AccordionTrigger>
          <AccordionContent data-testid={`content-faq-${index}`}>
            <p className="text-muted-foreground">{faq.answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

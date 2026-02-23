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
      "No long-term contracts required. Pay as you go with complete flexibility. You can scale up or down based on your call volume.",
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

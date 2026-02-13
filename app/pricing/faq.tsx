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
      "You only pay for the actual minutes your AI agents spend on calls. There are no monthly seat fees, no subscriptions, and no hidden charges. Your usage is tracked in real time through your dashboard.",
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

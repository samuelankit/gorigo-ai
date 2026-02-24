import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const chatSchema = z.object({
  message: z.string().min(1).max(500),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).max(10).default([]),
}).strict();

const DEMO_RESPONSES: Record<string, string> = {
  "hello": "Hello! Welcome to GoRigo AI. I'm a demo assistant showcasing our call centre capabilities. I can help with customer enquiries, schedule appointments, and handle common support tasks. How can I assist you today?",
  "pricing": "GoRigo offers flexible packages:\n\n**Individual Package** — No setup fee, 20p/minute\n• Perfect for solo operators getting started\n• Up to 3 AI agents, 5 concurrent calls\n• Analytics and compliance tools included\n\n**Team Package** — No setup fee, 18p/minute\n• For growing businesses with multiple team members\n• Unlimited AI agents, 25 concurrent calls\n• Departments, shared agents, and budget controls\n\n**Custom Package** — Negotiated rates\n• Enterprise-grade with dedicated support\n• Custom SLAs and unlimited everything\n\nWould you like to know more about any package?",
  "features": "GoRigo's AI Call Centre platform includes:\n\n• **Multi-Agent Management** — Configure multiple AI agents with different personalities and knowledge bases\n• **Visual Flow Builder** — Design conversation flows with drag-and-drop\n• **Knowledge Management** — Upload documents, FAQs, and training data\n• **Real-Time Analytics** — Monitor calls, sentiment, and quality scores\n• **Compliance Tools** — TCPA/FCC/GDPR compliance built-in\n• **Commission Management** — Multi-tier affiliate and partner tracking\n• **Smart Drafts** — AI-powered content generation\n\nWhat would you like to explore further?",
  "appointment": "I'd be happy to help schedule an appointment! In a live GoRigo deployment, I would:\n\n1. Check available time slots in the calendar\n2. Confirm your preferred date and time\n3. Collect your contact details\n4. Send a confirmation email and SMS reminder\n\nThis is just a demo, but our AI agents handle real appointment scheduling seamlessly. Would you like to see other capabilities?",
  "support": "For customer support scenarios, GoRigo AI agents can:\n\n• **Identify the issue** from natural conversation\n• **Search the knowledge base** for relevant solutions\n• **Escalate to human agents** when needed\n• **Create support tickets** automatically\n• **Follow up** with satisfaction surveys\n\nAll conversations are monitored for quality and compliance. Would you like to try another scenario?",
};

function getDemoResponse(message: string, history: Array<{role: string; content: string}>): string {
  const lower = message.toLowerCase().trim();

  for (const [key, response] of Object.entries(DEMO_RESPONSES)) {
    if (lower.includes(key)) return response;
  }

  if (lower.includes("help") || lower === "?") {
    return "I can help you explore GoRigo! Try asking about:\n\n• **Pricing** — Our deployment packages\n• **Features** — What the platform can do\n• **Appointments** — How AI handles scheduling\n• **Support** — Customer support automation\n\nOr just ask any question and I'll do my best to assist!";
  }

  if (lower.includes("bye") || lower.includes("thank")) {
    return "Thank you for trying GoRigo's AI demo! If you'd like to learn more or get started with your own AI call centre, visit our website or contact us at sales@gorigo.ai. Have a great day!";
  }

  if (history.length === 0) {
    return "Welcome to GoRigo AI! I'm a demo assistant for our AI call centre platform. I can show you how our agents handle:\n\n• Customer enquiries\n• Appointment scheduling\n• Support requests\n• Product information\n\nWhat would you like to explore?";
  }

  return "That's a great question! In a fully configured GoRigo deployment, the AI agent would have access to your specific knowledge base, FAQs, and business data to provide accurate, grounded responses. This demo shows the conversation flow — the real magic happens when it's connected to your data.\n\nTry asking about **pricing**, **features**, or **appointments** to see more examples!";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history } = chatSchema.parse(body);

    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

    const response = getDemoResponse(message, history);

    return NextResponse.json({
      response,
      isDemo: true,
      disclaimer: "This is a demonstration. In production, responses are grounded by RAG with your knowledge base.",
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/public/demo-chat");
  }
}

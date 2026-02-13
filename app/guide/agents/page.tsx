"use client";

import { TutorialPage } from "@/components/guide/tutorial-page";
import { Bot } from "lucide-react";

export default function AgentsGuidePage() {
  return (
    <TutorialPage
      icon={Bot}
      title="Creating & Configuring AI Agents"
      subtitle="Set up your virtual call agents in minutes"
      intro="AI agents are the heart of GoRigo - they answer calls, make outbound calls, and handle conversations just like a real person. This guide shows you how to create an agent, customise its voice and personality, add FAQs, and connect a knowledge base so it has all the answers."
      steps={[
        {
          title: "Navigate to the Agents Page",
          description: "Click 'Agents' in the sidebar under Management. You'll see a list of all your existing agents (if any) with their status and call statistics.",
        },
        {
          title: "Click 'Create New Agent'",
          description: "Hit the Create button in the top right corner. A form will open where you can configure your new agent.",
        },
        {
          title: "Set the Agent Name and Role",
          description: "Give your agent a clear name like 'Sales Assistant' or 'Customer Support'. Choose its role - this determines how it behaves on calls.",
          detail: "Pick a name that helps you quickly identify what this agent does.",
        },
        {
          title: "Choose Voice and Language",
          description: "Select a voice from the dropdown - there are male and female options in various accents. Then choose the primary language your agent will speak.",
        },
        {
          title: "Write the Agent's Personality",
          description: "Describe how you want your agent to sound and behave. For example: 'Professional but friendly, always helpful, uses the customer's name when possible.'",
          detail: "Think of this as writing a brief for a new hire - tell the AI what tone to use and how to handle common situations.",
        },
        {
          title: "Add FAQs",
          description: "Enter common questions and their answers. The agent will use these first before falling back to the knowledge base. Add as many as you like.",
        },
        {
          title: "Attach a Knowledge Base",
          description: "Link documents to your agent so it can reference them during calls. This is great for product details, pricing info, or policies.",
          detail: "You'll need to upload documents first - see the Knowledge Base tutorial.",
        },
        {
          title: "Enable AI Disclosure",
          description: "Toggle on AI disclosure for compliance - this makes the agent tell callers they're speaking with an AI at the start of each call.",
        },
        {
          title: "Save and Test",
          description: "Click Save to create your agent. You can then test it by making a call to see how it performs before going live.",
        },
      ]}
      tips={[
        { text: "Start with a simple personality description and refine it after testing." },
        { text: "Add your top 10-15 most common questions as FAQs for best results." },
        { text: "Use separate agents for different purposes (sales vs support) rather than one agent for everything." },
        { text: "Test your agent with real scenarios before deploying to live calls." },
      ]}
      troubleshooting={[
        {
          problem: "My agent sounds robotic or unnatural",
          solution: "Try adjusting the personality description to be more conversational. Use phrases like 'speak naturally' and 'use casual language'.",
        },
        {
          problem: "The agent can't answer questions about my products",
          solution: "Make sure you've attached a knowledge base with up-to-date product information. Check that the documents have finished processing.",
        },
        {
          problem: "I can't see the Create Agent button",
          solution: "You may not have the right permissions. Check with your admin or ensure you're logged in as a SuperAdmin.",
        },
      ]}
      keyTerms={[
        { term: "Agent", definition: "An AI-powered virtual assistant that handles phone calls automatically." },
        { term: "FAQ", definition: "Frequently Asked Questions - pre-written answers the agent uses first." },
        { term: "Knowledge Base", definition: "A collection of documents the agent can reference during calls." },
        { term: "AI Disclosure", definition: "A legal requirement to inform callers they are speaking with an AI." },
        { term: "Voice", definition: "The sound and accent used by the agent when speaking on calls." },
      ]}
      imageSrc="/guide/agents-hero.png"
      imageAlt="AI agent configuration interface"
      videoSrc="/guide/agents-tutorial.mp4"
      videoTitle="Video: Creating Your First AI Agent - Step by Step"
      prevModule={{ title: "Platform Overview", href: "/guide/overview" }}
      nextModule={{ title: "Knowledge Base", href: "/guide/knowledge-base" }}
    />
  );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GuideHeader } from "./guide-header";
import { CheckCircle2, Lightbulb, AlertTriangle, LucideIcon } from "lucide-react";

export interface TutorialStep {
  title: string;
  description: string;
  detail?: string;
}

export interface TipItem {
  text: string;
}

export interface TroubleshootItem {
  problem: string;
  solution: string;
}

export interface KeyTerm {
  term: string;
  definition: string;
}

export interface TutorialPageProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  intro: string;
  steps: TutorialStep[];
  tips: TipItem[];
  troubleshooting: TroubleshootItem[];
  keyTerms: KeyTerm[];
  imageSrc: string;
  imageAlt: string;
  videoSrc: string;
  videoTitle: string;
  nextModule?: { title: string; href: string };
  prevModule?: { title: string; href: string };
}

export function TutorialPage({
  icon: Icon,
  title,
  subtitle,
  intro,
  steps,
  tips,
  troubleshooting,
  keyTerms,
  imageSrc,
  imageAlt,
  videoSrc,
  videoTitle,
  nextModule,
  prevModule,
}: TutorialPageProps) {
  return (
    <>
      <GuideHeader showBack backHref="/guide" />
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-tutorial-title">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <p className="text-muted-foreground mt-4 leading-relaxed" data-testid="text-tutorial-intro">{intro}</p>
        </div>

        <Card>
          <CardContent className="p-0 overflow-hidden rounded-md">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="w-full h-auto object-cover"
              data-testid="img-tutorial-hero"
            />
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            Step-by-Step Guide
          </h2>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <Card key={i} data-testid={`card-step-${i + 1}`}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-bold">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium" data-testid={`text-step-title-${i + 1}`}>{step.title}</p>
                      <p className="text-sm text-muted-foreground mt-1" data-testid={`text-step-desc-${i + 1}`}>{step.description}</p>
                      {step.detail && (
                        <p className="text-sm text-muted-foreground/80 mt-2 italic">{step.detail}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Video Walkthrough</h2>
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-md">
              <video
                src={videoSrc}
                controls
                className="w-full h-auto"
                poster=""
                data-testid="video-tutorial"
              >
                Your browser does not support the video tag.
              </video>
              <div className="p-3 border-t">
                <p className="text-sm text-muted-foreground" data-testid="text-video-title">{videoTitle}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {tips.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-muted-foreground" />
              Tips &amp; Best Practices
            </h2>
            <Card>
              <CardContent className="p-4 space-y-3">
                {tips.map((tip, i) => (
                  <div key={i} className="flex gap-2" data-testid={`text-tip-${i + 1}`}>
                    <span className="text-muted-foreground shrink-0">&#x2022;</span>
                    <p className="text-sm">{tip.text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {troubleshooting.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              Troubleshooting
            </h2>
            <div className="space-y-3">
              {troubleshooting.map((item, i) => (
                <Card key={i} data-testid={`card-troubleshoot-${i + 1}`}>
                  <CardContent className="p-4">
                    <p className="font-medium text-sm">{item.problem}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.solution}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {keyTerms.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Key Terms</h2>
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {keyTerms.map((kt, i) => (
                    <div key={i} data-testid={`text-term-${i + 1}`}>
                      <Badge variant="secondary" className="mb-1">{kt.term}</Badge>
                      <p className="text-sm text-muted-foreground">{kt.definition}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap pt-4 border-t">
          {prevModule ? (
            <a href={prevModule.href} className="text-sm text-muted-foreground hover:underline" data-testid="link-prev-module">
              &larr; {prevModule.title}
            </a>
          ) : <div />}
          {nextModule ? (
            <a href={nextModule.href} className="text-sm text-muted-foreground hover:underline" data-testid="link-next-module">
              {nextModule.title} &rarr;
            </a>
          ) : <div />}
        </div>
      </div>
    </>
  );
}

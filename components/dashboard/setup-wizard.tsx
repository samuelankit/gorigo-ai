"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Building,
  Bot,
  Brain,
  Rocket,
  MessageSquare,
  Shield,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  X,
  Minimize2,
  Info,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  whyItMatters: string;
  timeEstimate: number;
  completed: boolean;
  link: string;
  isEssential: boolean;
  packageRequirement: null | "team" | "custom";
  skipped: boolean;
}

export interface OnboardingPhase {
  id: string;
  title: string;
  description: string;
  icon: string;
  steps: OnboardingStep[];
  celebration: string;
}

export interface OnboardingData {
  phases: OnboardingPhase[];
  completedCount: number;
  essentialCount: number;
  essentialCompleted: number;
  totalSteps: number;
  allEssentialComplete: boolean;
  allComplete: boolean;
  wizardState: string;
  estimatedMinutesRemaining: number;
}

export interface WizardState {
  state: "visible" | "minimized" | "dismissed";
  skippedSteps: string[];
}

interface SetupWizardProps {
  onboardingData: OnboardingData | null | undefined;
  wizardState: WizardState | null | undefined;
  businessName?: string;
  onWizardStateChange?: (newState: WizardState) => void;
}

const PHASE_ICONS: Record<string, typeof Building> = {
  Building: Building,
  Bot: Bot,
  Brain: Brain,
  Rocket: Rocket,
  MessageSquare: MessageSquare,
  Shield: Shield,
  TrendingUp: TrendingUp,
};

function getPhaseIcon(iconName: string) {
  return PHASE_ICONS[iconName] || Building;
}

function PhaseStep({
  step,
  onSkip,
  isSkipped,
}: {
  step: OnboardingStep;
  onSkip: (stepId: string) => void;
  isSkipped: boolean;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const isDone = step.completed || isSkipped;

  return (
    <div
      className={cn(
        "flex gap-3 px-3 py-2.5 rounded-md transition-colors",
        isDone ? "opacity-60" : ""
      )}
      data-testid={`step-${step.id}`}
    >
      <div className="pt-0.5 shrink-0">
        {step.completed ? (
          <CheckCircle2
            className="h-4.5 w-4.5 text-primary"
            data-testid={`icon-step-complete-${step.id}`}
          />
        ) : isSkipped ? (
          <SkipForward
            className="h-4.5 w-4.5 text-muted-foreground"
            data-testid={`icon-step-skipped-${step.id}`}
          />
        ) : (
          <Circle
            className="h-4.5 w-4.5 text-muted-foreground"
            data-testid={`icon-step-pending-${step.id}`}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "text-sm font-medium",
              isDone
                ? "text-muted-foreground line-through"
                : "text-foreground"
            )}
            data-testid={`text-step-title-${step.id}`}
          >
            {step.title}
          </span>
          <Badge
            variant={step.isEssential ? "default" : "secondary"}
            className="no-default-hover-elevate text-[10px] px-1.5 py-0"
            data-testid={`badge-step-type-${step.id}`}
          >
            {step.isEssential ? "Essential" : "Optional"}
          </Badge>
          <Badge
            variant="outline"
            className="no-default-hover-elevate text-[10px] px-1.5 py-0"
            data-testid={`badge-step-time-${step.id}`}
          >
            <Clock className="h-2.5 w-2.5 mr-0.5" />
            {step.timeEstimate} min
          </Badge>
        </div>
        {!isDone && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {step.description}
          </p>
        )}
        {!isDone && step.whyItMatters && (
          <div className="mt-1.5">
            <button
              onClick={() => setShowWhy(!showWhy)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground/80 hover:text-muted-foreground transition-colors"
              data-testid={`button-why-${step.id}`}
            >
              <Info className="h-3 w-3" />
              <span>Why this matters</span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  showWhy && "rotate-180"
                )}
              />
            </button>
            {showWhy && (
              <p
                className="text-[11px] text-muted-foreground mt-1 pl-4 border-l-2 border-primary/20"
                data-testid={`text-why-${step.id}`}
              >
                {step.whyItMatters}
              </p>
            )}
          </div>
        )}
        {!isDone && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Button asChild size="sm" variant="outline" data-testid={`button-action-${step.id}`}>
              <Link href={step.link}>
                {step.title}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
            {!step.isEssential && !isSkipped && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSkip(step.id)}
                data-testid={`button-skip-${step.id}`}
              >
                <SkipForward className="h-3 w-3 mr-1" />
                Not relevant to me
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SetupWizard({
  onboardingData,
  wizardState,
  businessName,
  onWizardStateChange,
}: SetupWizardProps) {
  const [localState, setLocalState] = useState<"visible" | "minimized" | "dismissed">("visible");
  const [skippedSteps, setSkippedSteps] = useState<string[]>([]);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("gorigo_wizard_state");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.state) setLocalState(parsed.state);
        if (parsed.skippedSteps) setSkippedSteps(parsed.skippedSteps);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (wizardState) {
      setLocalState(wizardState.state);
      setSkippedSteps(wizardState.skippedSteps || []);
    }
  }, [wizardState]);

  useEffect(() => {
    if (onboardingData?.phases && !expandedPhase) {
      const firstIncomplete = onboardingData.phases.find((phase) =>
        phase.steps.some((s) => !s.completed && !skippedSteps.includes(s.id))
      );
      if (firstIncomplete) {
        setExpandedPhase(firstIncomplete.id);
      }
    }
  }, [onboardingData, skippedSteps, expandedPhase]);

  const persistState = useCallback(
    (newState: "visible" | "minimized" | "dismissed", newSkipped?: string[]) => {
      const s = newSkipped ?? skippedSteps;
      const payload: WizardState = { state: newState, skippedSteps: s };
      localStorage.setItem("gorigo_wizard_state", JSON.stringify(payload));
      setLocalState(newState);
      if (newSkipped) setSkippedSteps(newSkipped);
      onWizardStateChange?.(payload);
    },
    [skippedSteps, onWizardStateChange]
  );

  const handleMinimize = () => persistState("minimized");
  const handleDismiss = () => persistState("dismissed");
  const handleRestore = () => {
    persistState("visible");
    if (onboardingData?.phases) {
      const firstIncomplete = onboardingData.phases.find((phase) =>
        phase.steps.some((s) => !s.completed && !skippedSteps.includes(s.id))
      );
      if (firstIncomplete) setExpandedPhase(firstIncomplete.id);
    }
  };

  const handleSkipStep = (stepId: string) => {
    const newSkipped = [...skippedSteps, stepId];
    persistState(localState, newSkipped);
  };

  if (!onboardingData) return null;

  const { phases, essentialCompleted, essentialCount, estimatedMinutesRemaining } = onboardingData;
  const essentialPercent = essentialCount > 0 ? Math.round((essentialCompleted / essentialCount) * 100) : 0;

  const effectiveCompletedCount = phases.reduce(
    (acc, phase) =>
      acc +
      phase.steps.filter((s) => s.completed || skippedSteps.includes(s.id)).length,
    0
  );
  const effectiveTotalSteps = phases.reduce((acc, phase) => acc + phase.steps.length, 0);
  const allEffectiveComplete = effectiveCompletedCount >= effectiveTotalSteps;

  const nextEssentialStep = phases
    .flatMap((p) => p.steps)
    .find((s) => s.isEssential && !s.completed && !skippedSteps.includes(s.id));

  if (allEffectiveComplete && localState !== "dismissed") {
    return null;
  }

  if (localState === "dismissed") {
    return null;
  }

  if (localState === "minimized") {
    return (
      <Card data-testid="card-setup-wizard-minimized">
        <CardContent className="flex items-center justify-between gap-3 p-3 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
              <span className="text-sm font-medium">Setup Progress</span>
              <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">
                {essentialPercent}%
              </Badge>
            </div>
            <Progress value={essentialPercent} className="h-1.5 w-24 sm:w-40" data-testid="progress-wizard-minimized" />
          </div>
          <Button size="sm" onClick={handleRestore} data-testid="button-continue-setup-minimized">
            Continue Setup
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3" data-testid="setup-wizard">
      <Card data-testid="card-setup-wizard-welcome">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2
                className="text-lg font-semibold text-foreground"
                data-testid="text-wizard-greeting"
              >
                Welcome to GoRigo{businessName ? `, ${businessName}` : ""}!
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Complete the essential steps to get your AI call center up and running.
              </p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div className="flex-1 min-w-0 max-w-xs">
                  <Progress
                    value={essentialPercent}
                    className="h-2"
                    data-testid="progress-wizard-main"
                  />
                </div>
                <span className="text-sm font-medium" data-testid="text-wizard-progress">
                  {essentialCompleted}/{essentialCount} essential steps
                </span>
                <Badge
                  variant="outline"
                  className="no-default-hover-elevate text-[10px]"
                  data-testid="badge-wizard-percent"
                >
                  {essentialPercent}%
                </Badge>
                {estimatedMinutesRemaining > 0 && (
                  <Badge
                    variant="secondary"
                    className="no-default-hover-elevate text-[10px]"
                    data-testid="badge-wizard-time"
                  >
                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                    ~{estimatedMinutesRemaining} min remaining
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMinimize}
                data-testid="button-minimize-wizard"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                data-testid="button-dismiss-wizard"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {nextEssentialStep && (
              <Button asChild size="sm" data-testid="button-continue-setup">
                <Link href={nextEssentialStep.link}>
                  Continue Setup
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              data-testid="button-know-my-way"
            >
              I know my way around
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {phases.map((phase) => {
          const Icon = getPhaseIcon(phase.icon);
          const phaseCompleted = phase.steps.every(
            (s) => s.completed || skippedSteps.includes(s.id)
          );
          const phaseStepsDone = phase.steps.filter(
            (s) => s.completed || skippedSteps.includes(s.id)
          ).length;
          const phaseTotal = phase.steps.length;
          const isExpanded = expandedPhase === phase.id;

          return (
            <Card key={phase.id} data-testid={`card-phase-${phase.id}`}>
              <Collapsible
                open={isExpanded}
                onOpenChange={(open) =>
                  setExpandedPhase(open ? phase.id : null)
                }
              >
                <CollapsibleTrigger asChild>
                  <button
                    className="w-full text-left p-4 flex items-center gap-3 hover-elevate rounded-xl"
                    data-testid={`button-phase-toggle-${phase.id}`}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
                        phaseCompleted
                          ? "bg-primary/10"
                          : "bg-muted"
                      )}
                    >
                      {phaseCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            phaseCompleted
                              ? "text-muted-foreground"
                              : "text-foreground"
                          )}
                          data-testid={`text-phase-title-${phase.id}`}
                        >
                          {phase.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className="no-default-hover-elevate text-[10px]"
                          data-testid={`badge-phase-progress-${phase.id}`}
                        >
                          {phaseStepsDone}/{phaseTotal}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {phase.description}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    {phaseCompleted ? (
                      <div
                        className="flex items-center gap-2 p-3 rounded-md bg-primary/5 border border-primary/10"
                        data-testid={`celebration-${phase.id}`}
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-medium text-primary">
                          {phase.celebration}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {phase.steps.map((step) => (
                          <PhaseStep
                            key={step.id}
                            step={step}
                            onSkip={handleSkipStep}
                            isSkipped={skippedSteps.includes(step.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {nextEssentialStep && (
        <Card
          className="border-primary/20 bg-primary/5"
          data-testid="card-recommended-next"
        >
          <CardContent className="flex items-center justify-between gap-3 p-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Recommended Next Step
                </p>
                <p
                  className="text-sm font-medium text-foreground"
                  data-testid="text-recommended-title"
                >
                  {nextEssentialStep.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {nextEssentialStep.description}
                </p>
              </div>
            </div>
            <Button asChild size="sm" data-testid="button-recommended-action">
              <Link href={nextEssentialStep.link}>
                Get Started
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function SetupGuideButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      data-testid="button-setup-guide"
    >
      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
      Setup Guide
    </Button>
  );
}

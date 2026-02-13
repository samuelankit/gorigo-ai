export const FSM_STATES = [
  "GREETING",
  "INTENT_CAPTURE",
  "CONFIRM",
  "EXECUTE",
  "CLOSE",
  "HANDOFF",
  "FAILSAFE",
] as const;

export type FSMState = (typeof FSM_STATES)[number];

export const VALID_TRANSITIONS: Record<FSMState, FSMState[]> = {
  GREETING: ["INTENT_CAPTURE", "HANDOFF", "FAILSAFE"],
  INTENT_CAPTURE: ["CONFIRM", "HANDOFF", "FAILSAFE"],
  CONFIRM: ["EXECUTE", "INTENT_CAPTURE", "HANDOFF", "FAILSAFE"],
  EXECUTE: ["CLOSE", "CONFIRM", "HANDOFF", "FAILSAFE"],
  CLOSE: [],
  HANDOFF: [],
  FAILSAFE: ["HANDOFF"],
};

export const STATE_ALLOWED_ACTIONS: Record<FSMState, string[]> = {
  GREETING: ["greet", "identify_caller", "play_disclosure"],
  INTENT_CAPTURE: ["ask_question", "capture_intent", "clarify"],
  CONFIRM: ["confirm_intent", "restate", "clarify"],
  EXECUTE: ["book_appointment", "capture_lead", "transfer_info", "process_request"],
  CLOSE: ["summarize", "goodbye"],
  HANDOFF: ["transfer_call", "notify_agent"],
  FAILSAFE: ["apologize", "offer_callback", "transfer_call"],
};

export interface FSMConfig {
  maxTurns: number;
  confidenceThreshold: number;
  perStateRetries: number;
}

export const DEFAULT_FSM_CONFIG: FSMConfig = {
  maxTurns: 10,
  confidenceThreshold: 0.55,
  perStateRetries: 2,
};

export interface FSMContext {
  currentState: FSMState;
  turnCount: number;
  lastConfidence: number | null;
  lowConfidenceCount: number;
  stateRetries: Record<string, number>;
}

export interface FSMTransitionResult {
  nextState: FSMState;
  shouldHandoff: boolean;
  handoffReason: string | null;
  allowedActions: string[];
}

export function isValidState(state: string): state is FSMState {
  return FSM_STATES.includes(state as FSMState);
}

export function evaluateTransition(
  context: FSMContext,
  proposedNextState: FSMState,
  confidence: number,
  userRequestedHuman: boolean,
  config: FSMConfig = DEFAULT_FSM_CONFIG
): FSMTransitionResult {
  const { currentState, turnCount, stateRetries } = context;

  if (userRequestedHuman) {
    return {
      nextState: "HANDOFF",
      shouldHandoff: true,
      handoffReason: "user_requested_human",
      allowedActions: STATE_ALLOWED_ACTIONS.HANDOFF,
    };
  }

  if (turnCount >= config.maxTurns) {
    return {
      nextState: "HANDOFF",
      shouldHandoff: true,
      handoffReason: "max_turns_exceeded",
      allowedActions: STATE_ALLOWED_ACTIONS.HANDOFF,
    };
  }

  const lowConfCount = confidence < config.confidenceThreshold
    ? (context.lowConfidenceCount + 1)
    : 0;

  if (lowConfCount >= 2) {
    return {
      nextState: "HANDOFF",
      shouldHandoff: true,
      handoffReason: "low_confidence_repeated",
      allowedActions: STATE_ALLOWED_ACTIONS.HANDOFF,
    };
  }

  const currentRetries = stateRetries[currentState] || 0;
  if (confidence < config.confidenceThreshold && currentRetries >= config.perStateRetries) {
    return {
      nextState: "FAILSAFE",
      shouldHandoff: false,
      handoffReason: null,
      allowedActions: STATE_ALLOWED_ACTIONS.FAILSAFE,
    };
  }

  const validNext = VALID_TRANSITIONS[currentState];
  if (!validNext || validNext.length === 0) {
    return {
      nextState: currentState,
      shouldHandoff: false,
      handoffReason: null,
      allowedActions: STATE_ALLOWED_ACTIONS[currentState] || [],
    };
  }

  const targetState = validNext.includes(proposedNextState) ? proposedNextState : currentState;

  return {
    nextState: targetState,
    shouldHandoff: targetState === "HANDOFF",
    handoffReason: targetState === "HANDOFF" ? "fsm_transition" : null,
    allowedActions: STATE_ALLOWED_ACTIONS[targetState] || [],
  };
}

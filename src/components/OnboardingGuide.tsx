interface OnboardingGuideStep<StepId extends string> {
  id: StepId;
  title: string;
  description: string;
  complete: boolean;
  actionLabel: string;
}

interface OnboardingGuideProps<StepId extends string> {
  steps: OnboardingGuideStep<StepId>[];
  activeStepIndex: number;
  canEdit: boolean;
  onEnableEdit: () => void;
  onStepAction: (stepId: StepId) => void;
  onSkip: () => void;
}

export function OnboardingGuide<StepId extends string>(props: OnboardingGuideProps<StepId>) {
  if (props.steps.length === 0) {
    return null;
  }

  const activeStep = props.steps[Math.max(0, Math.min(props.activeStepIndex, props.steps.length - 1))];
  const completedCount = props.steps.filter((step) => step.complete).length;

  return (
    <aside className="onboarding-guide" role="dialog" aria-modal="false" aria-label="Onboarding guidato">
      <div className="onboarding-guide-head">
        <strong>Tour rapido</strong>
        <span>{completedCount}/{props.steps.length} completati</span>
      </div>

      <p className="onboarding-guide-subtitle">
        Completa 4 azioni reali nel canvas: entita, relazione, collegamento e rinomina.
      </p>

      <ol className="onboarding-guide-list">
        {props.steps.map((step, index) => (
          <li
            key={step.id}
            className={
              step.complete
                ? "onboarding-guide-step complete"
                : index === props.activeStepIndex
                  ? "onboarding-guide-step active"
                  : "onboarding-guide-step"
            }
          >
            <span className="onboarding-guide-index">{index + 1}</span>
            <div>
              <div className="onboarding-guide-title">{step.title}</div>
              <div className="onboarding-guide-description">{step.description}</div>
            </div>
          </li>
        ))}
      </ol>

      <div className="onboarding-guide-actions">
        {!props.canEdit ? (
          <button type="button" className="header-button" onClick={props.onEnableEdit}>
            Passa a Modifica
          </button>
        ) : null}
        <button type="button" className="mode-button active" onClick={() => props.onStepAction(activeStep.id)}>
          {activeStep.actionLabel}
        </button>
        <button type="button" className="header-button" onClick={props.onSkip}>
          Salta tour
        </button>
      </div>
    </aside>
  );
}

export interface BrandStep {
  label: string;
  description: string;
}

interface Props {
  headline: string;
  subline: string;
  /** When given, the copy is replaced by a progress list of these steps. */
  steps?: BrandStep[];
  /** Zero-based index of the step in progress. */
  current?: number;
}

/**
 * The marketing half of the auth screen: a wordmark, one headline, one line of
 * support copy, and a single colour bloom. Deliberately sparse — the form is
 * what the visitor came for, and a feature list beside it only competes.
 *
 * During onboarding it carries the stepper instead, which is the one thing that
 * has to stay visible while the form beside it swaps.
 */
export function AuthBrand({ headline, subline, steps, current = 0 }: Props) {
  return (
    <aside className="auth-brand">
      <div className="ab-bloom" aria-hidden="true" />

      <div className="ab-mark">
        <span className="ab-mark-ic" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </span>
        <span className="ab-mark-text">
          da<strong>cms</strong>
        </span>
      </div>

      <div className="ab-copy">
        <h2>{headline}</h2>
        <p>{subline}</p>

        {steps && (
          <ol className="ab-steps">
            {steps.map((step, index) => {
              const state = index < current ? 'done' : index === current ? 'current' : 'todo';
              return (
                <li key={step.label} className={`ab-step is-${state}`}>
                  <span className="ab-step-dot" aria-hidden="true">
                    {state === 'done' ? (
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="ab-step-text">
                    <span className="ab-step-label">{step.label}</span>
                    <span className="ab-step-desc">{step.description}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}

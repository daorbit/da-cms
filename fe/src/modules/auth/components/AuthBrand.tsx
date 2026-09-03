interface Props {
  headline: string;
  subline: string;
}

/**
 * The marketing half of the auth screen: a wordmark, one headline, one line of
 * support copy, and a single colour bloom. Deliberately sparse — the form is
 * what the visitor came for, and a feature list beside it only competes.
 */
export function AuthBrand({ headline, subline }: Props) {
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
      </div>
    </aside>
  );
}

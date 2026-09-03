import {
  IconCheck, IconFileText, IconStack2, IconBolt, IconWorld, IconLayoutDashboard,
} from '@tabler/icons-react';

const FEATURES = [
  { icon: IconFileText, text: 'Build pages from blocks' },
  { icon: IconStack2, text: 'Structured collections' },
  { icon: IconLayoutDashboard, text: 'One dashboard per workspace' },
  { icon: IconWorld, text: 'Draft and publish in a click' },
  { icon: IconBolt, text: 'API-first, no lock-in' },
];

const PROOF = ['No credit card', 'Unlimited drafts', 'Cancel anytime'];

/**
 * A static miniature of the page list — it shows the product rather than
 * describing it, and stays cheap: no timers, no animation library.
 */
function PreviewCard() {
  const rows = [
    { title: 'Home', slug: '/home', status: 'Published' },
    { title: 'About us', slug: '/about-us', status: 'Published' },
    { title: 'Pricing', slug: '/pricing', status: 'Draft' },
  ];

  return (
    <div className="ab-card">
      <div className="ab-card-head">
        <span className="ab-card-title">Pages</span>
        <span className="ab-live">
          <span className="ab-live-dot" />
          Live
        </span>
      </div>

      <div className="ab-rows">
        {rows.map((row) => (
          <div key={row.slug} className="ab-row">
            <span className="ab-row-main">
              <span className="ab-row-title">{row.title}</span>
              <span className="ab-row-slug">{row.slug}</span>
            </span>
            <span
              className={`ab-chip ${row.status === 'Published' ? 'is-published' : 'is-draft'}`}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>

      <div className="ab-card-foot">
        <div className="ab-stat">
          <span className="ab-stat-val">12</span>
          <span className="ab-stat-label">Pages</span>
        </div>
        <div className="ab-stat">
          <span className="ab-stat-val">3</span>
          <span className="ab-stat-label">Drafts</span>
        </div>
        <div className="ab-stat">
          <span className="ab-stat-val">5</span>
          <span className="ab-stat-label">Block types</span>
        </div>
        <span className="ab-card-note">Sample data</span>
      </div>
    </div>
  );
}

export function AuthBrand() {
  return (
    <div className="auth-brand">
      <div className="ab-grid" />
      <div className="ab-orb ab-orb-1" />
      <div className="ab-orb ab-orb-2" />

      <div className="ab-content">
        <span className="ab-wordmark">
          da-cms<span className="ab-wordmark-dot">.</span>
        </span>

        <h2>A content workspace for the sites you ship.</h2>
        <p>
          Compose pages from reusable blocks, keep structured content in collections,
          and publish when you are ready.
        </p>

        <div className="ab-showcase">
          <PreviewCard />
        </div>

        <div className="ab-features">
          {FEATURES.map((feature) => (
            <div key={feature.text} className="ab-feature">
              <span className="ab-feature-ic">
                <feature.icon size={16} />
              </span>
              {feature.text}
            </div>
          ))}
        </div>

        <div className="ab-proof">
          {PROOF.map((item) => (
            <span key={item} className="ab-proof-item">
              <IconCheck size={13} />
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

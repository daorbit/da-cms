import { relativeTime } from '@/lib/format';
import type { Page } from '@/types';
import classes from './PageLibrary.module.css';

interface Props {
  page: Page;
}

/** The page rendered as an article, the way a reader would meet it. */
export function PageArticle({ page }: Props) {
  const byline = [
    page.author?.name && (page.author.role ? `${page.author.name}, ${page.author.role}` : page.author.name),
    page.readingMinutes ? `${page.readingMinutes} min read` : null,
    page.publishedAt ? relativeTime(page.publishedAt) : null,
  ].filter(Boolean);

  return (
    <article className={classes.article}>
      {page.heroImage?.url && (
        <img className={classes.hero} src={page.heroImage.url} alt={page.heroImage.alt} />
      )}

      {page.group && <p className={classes.eyebrow}>{page.group}</p>}
      <h1 className={classes.articleTitle}>{page.title || 'Untitled'}</h1>
      {page.description && <p className={classes.dek}>{page.description}</p>}
      {byline.length > 0 && <p className={classes.byline}>{byline.join(' · ')}</p>}

      {page.content ? (
        <div className={`page-preview-body ${classes.articleBody}`} dangerouslySetInnerHTML={{ __html: page.content }} />
      ) : (
        <p className={classes.noContent}>This page has no content yet.</p>
      )}

      {page.tags.length > 0 && (
        <ul className={classes.tags}>
          {page.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

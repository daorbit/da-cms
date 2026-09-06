export interface PromptGroup {
  label: string;
  prompts: string[];
}

/**
 * Written as lead-ins the writer finishes rather than as finished instructions:
 * a prompt ending in a space puts the caret where the topic goes, which is the
 * only part that differs between one use and the next.
 */
export const PROMPT_GROUPS: PromptGroup[] = [
  {
    label: 'Write something new',
    prompts: [
      'Write a full blog post about ',
      'Write a detailed case study about ',
      'Write a step-by-step guide to ',
      'Write a product announcement for ',
      'Write an opinion piece arguing that ',
      'Write a beginner-friendly explainer on ',
      'Write a technical deep dive into ',
    ],
  },
  {
    label: 'Compare and analyse',
    prompts: [
      'Compare the main options for ',
      'Write a pros and cons breakdown of ',
      'Explain the trade-offs between ',
      'Write a migration guide from ',
      'Debunk the common myths about ',
    ],
  },
  {
    label: 'Structure and sections',
    prompts: [
      'Write an introduction for a post about ',
      'Write a conclusion that summarises ',
      'Write an FAQ section covering ',
      'Write a comparison table of ',
      'Add a callout explaining why ',
      'Write a short summary of the section above',
    ],
  },
  {
    label: 'Improve what is here',
    prompts: [
      'Rewrite the selected text to be clearer and shorter',
      'Rewrite the selected text in a more formal voice',
      'Rewrite the selected text in plain English',
      'Expand the selected text with more detail and examples',
      'Turn the selected text into a bulleted list',
      'Fix the grammar and punctuation in the selected text',
      'Make the selected text more persuasive',
    ],
  },
  {
    label: 'Search and social',
    prompts: [
      'Write a meta description for this page',
      'Suggest five headline options for this page',
      'Write a short social post announcing this page',
    ],
  },
];

export function needsSelection(prompt: string): boolean {
  return prompt.includes('selected text');
}

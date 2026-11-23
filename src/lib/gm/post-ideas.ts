/**
 * Post idea generator — a straight port of GeniusMinds' "Post Ideas"
 * page, which fills three fixed templates with the subject the user
 * typed. No AI provider is involved (neither project used one here).
 */
export function generatePostIdeas(subject: string): string[] {
  const s = subject.trim() || "our next course";
  return [
    `“Your next big career move starts here.” Explore ${s} and build practical skills with our expert mentors.`,
    `“Learn it. Build it. Become it.” Applications are open for upcoming batches of ${s}. Discover the right course for your goals.`,
    `Meet your future self: confident, skilled and job ready. Join our next ${s} learner community today.`,
  ];
}

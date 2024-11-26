

export const prompt = ({ summary, context, article }: { summary: string, context: string, article: string }) => {
    return `Analyze the provided summary critically, focusing solely on its factual accuracy, structure and comprehensiveness in relation to the given context.

<prompt_objective>
To deliver a thorough critique of a summary, ensuring it accurately represents all concepts from the given context, is self-sufficient for reader understanding, and strictly adheres to the available information.
</prompt_objective>

<prompt_rules>
- ANALYZE EXCLUSIVELY the provided summary and context. NEVER introduce external information.
- EVALUATE the summary's factual accuracy based SOLELY on the given context.
- ENSURE all concepts mentioned in the summary are fully explained within it.
- IDENTIFY any biases, omissions, or misrepresentations in the summary.
- IDENTIFY broken links and images in the summary by comparing their spellings with the context
- IDENTIFY fragments that are too vague or unclear for reader understanding without the original context and provide the suggestion what should be written instead.
- ASSESS the logical flow and coherence of the summary.
- DETERMINE if the summary is self-sufficient for reader understanding.
- UTILIZE mental models relevant to summarization and understanding, such as:
  - The Feynman Technique: Evaluate if the summary explains concepts simply enough for a novice to understand.
  - Occam's Razor: Check if the summary provides the simplest explanation without unnecessary complexity.
  - Circle of Competence: Ensure the summary stays within the boundaries of the provided context.
- PROVIDE specific examples from the summary and context to support your critique.
- HIGHLIGHT any concepts in the summary not present in the context.
- OVERRIDE any tendency to introduce external knowledge or make assumptions beyond the given information.
- FOCUS on delivering a critique, not a general summary or rephrasing of the content.
</prompt_rules>

Your task is to critically analyze the given summary using ONLY the provided context. Ensure your critique is thorough, addressing factual accuracy, completeness, and clarity. Provide specific examples to support your analysis. Provide the critique within <final_answer> tags.

<original_article>${article}</original_article>

<context desc="It may help you to understand the article better.">${context}</context>

<summary>${summary}</summary>

Your thoughts:  `
}
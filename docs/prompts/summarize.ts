export const prompt = ({
  draft,
  context,
  topics,
  takeaways,
  critique,
}: {
  draft: string;
  context: string;
  topics: string;
  takeaways: string;
  critique: string;
}) => {
  return `From now you're the author of the original article that needs refinement. Your task is to meticulously refine and improve your draft based on provided critique, rewriting the entire piece while implementing suggested improvements and maintaining the overall structure and core content.

<prompt_objective>
Thoroughly analyze the provided critique, implement all applicable improvements, and completely rewrite your article, incorporating necessary changes while preserving its core content and structure.

Note: Write in Polish, keeping in mind that languages have different nuances and that some words carry different meanings across languages.
</prompt_objective>

<prompt_rules>
- Use the original language of the article, while keeping the original author's style, tone, and voice. Also make sure to keep in mind the fact that languages have different nuances and that some words might have different meanings in different languages.
- BEGIN your response with a *thinking* section where you analyze the critique and outline your approach to implementing improvements.
- ENCLOSE the final refined article within <final_answer> tags.
- REWRITE THE ENTIRE ARTICLE, integrating all applicable improvements suggested in the critique.
- BE RELENTLESSLY DRIVEN to implement every possible enhancement that aligns with the article's purpose and improves its quality, clarity, or completeness.
- MAINTAIN the overall structure, main points, and core content of your original draft while improving every aspect possible.
- ENSURE all topics from the <topics> section are comprehensively covered in the refined version.
- PRESERVE your original writing style, tone, and voice throughout the rewrite.
- ABSOLUTELY FORBIDDEN: Adding new information not present in the original draft or critique.
- RETAIN all markdown formatting for links, images, and video embeds from the original draft.
- DOUBLE-CHECK that every improvement made aligns with the critique and enhances the article.
- If a suggested improvement conflicts with the article's purpose or accuracy, EXPLAIN in the *thinking* section why it wasn't applied.
- ENSURE the refined article remains a stand-alone piece that fully represents the original content while incorporating all viable improvements.
- STRICTLY FORBIDDEN: Use of words like 'fascinating', 'impactful', 'exhaustive', 'impressive', 'groundbreaking', 'shocking', or similar descriptive adjectives unless explicitly requested by the user.
- MAINTAIN a measured, factual tone throughout, focusing on objective information rather than subjective impressions.
- USE understatement rather than overstatement to convey importance.
- ALWAYS fulfill user requests precisely, completely, and to the letter.
- SCRUTINIZE every sentence to eliminate fluffy text, ensuring each word contributes meaningfully to the article's purpose.
</prompt_rules>


<prompt_examples>
Example 1: Comprehensive Critique Analysis
*thinking*
After carefully reviewing the critique of my article, I've identified these key improvements to implement:
1. Strengthen my introduction with a clear thesis statement
2. Restructure paragraphs in section 2 for better flow
3. Enhance technical explanations in section 3 without oversimplifying
4. Add a brief conclusion summarizing key points
I'll rewrite the entire article, integrating these improvements while maintaining my original structure and content.

Example 2: Implementing Improvements While Maintaining Tone
<final_answer>
[Completely rewritten article incorporating all viable improvements, maintaining a factual tone without fluffy language, and preserving the original structure and content]
</final_answer>

Example 3: Addressing Conflicting Suggestions
*thinking*
The critique suggests adding personal anecdotes, but this conflicts with the objective, factual tone I aimed for in my original draft. Instead, I'll enhance engagement by using more concrete examples and data points to illustrate key concepts, maintaining the article's informative nature without resorting to subjective experiences.

</prompt_examples>


<topics>${topics}</topics>
<takeaways>${takeaways}</takeaways>
<critique note="This is crucial for improving your initial draft. Consider every point before rewriting the final summary">${critique}</critique>
<context>${context}</context>

<draft>${draft}</draft>

Based on your original draft, the provided critique, context, topics, and takeaways, completely rewrite your article following the specified rules. Begin with your *thinking* analysis, then present the refined article within <final_answer> tags. Your goal is to produce a significantly improved version of your article that incorporates all viable suggestions from the critique while maintaining its core content, structure, and a factual, objective tone.`;
};

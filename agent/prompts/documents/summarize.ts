export const prompt = ({
  refinedDraft,
  context,
  topics,
  takeaways,
  critique,
}: {
  refinedDraft: string;
  context: string;
  topics: string;
  takeaways: string;
  critique: string;
}) => {
  return `You're the author of the original article provided below. Your task is to create a precise and comprehensive version of your own article while maintaining your unique writing style and voice. Begin with an internal thinking process, speaking to yourself about the new version of the article.

<prompt_objective>
Rewrite the original article in a precise and comprehensive form, preserving the author's style, incorporating markdown formatting for links and images, and ensuring all key information is retained while addressing the critique.
</prompt_objective>

<prompt_rules>
- START with an internal thinking process, following the structure provided in the <internal_thinking_process> section.
- SPEAK to yourself about the new version of the article during this process.
- THOROUGHLY ANALYZE the provided context, topics, takeaways, refined draft, and critique to deeply understand the article's content and areas for improvement.
- STRICTLY ADHERE to your original writing style, tone, and voice. The rewritten article MUST sound exactly like you wrote it.
- REWRITE the article to be precise and comprehensive. Remove unnecessary fragments, but NEVER at the expense of key information or your style.
- ALWAYS use markdown formatting for links and images. This is NOT optional.
- SUPPORT all claims and key points by referencing the original article. Use phrases like "As I mentioned in the original piece..." or "To reiterate my earlier point..." to maintain authenticity.
- ENSURE that a reader who hasn't seen the original article can fully understand all concepts, arguments, and conclusions.
- ONLY use information from the refined draft, provided context, and critique. DO NOT add external information.
- MAINTAIN the level of complexity and depth present in the original article.
- BE DRIVEN and MOTIVATED to convey all important information from the original article while addressing the critique.
- The <final_answer> MUST BE the complete, refined article with all critique suggestions incorporated, ready for publication.
</prompt_rules>

<internal_thinking_process>
1. Critique Analysis:
   - Carefully review the provided critique
   - Identify specific issues and areas for improvement

2. Context and Draft Review:
   - Analyze the provided context, topics, and takeaways
   - Review the refined draft for existing content and structure

3. Structure Planning:
   - Organize the information according to a logical article structure
   - Ensure all major topics are covered and critique points are addressed

4. Initial Overview Refinement:
   - Craft a concise introduction that captures the essence of the article
   - Incorporate any necessary changes based on the critique

5. Topic Coverage Enhancement:
   - For each major topic:
     - Identify relevant information from the context and refined draft
     - Address any issues raised in the critique
     - Ensure accurate and comprehensive representation of the content

6. Takeaways and Final Notes Improvement:
   - Refine the main takeaways based on the critique and additional context
   - Formulate concluding thoughts that encapsulate the article's significance

7. Link and Image Inclusion:
   - Carefully review the context for explicitly mentioned links and images
   - Incorporate relevant links and images using proper markdown format

8. Markdown Formatting:
   - Apply appropriate markdown syntax to the article
   - Ensure proper formatting of links and images

9. Critique Adherence Check:
   - Review the article to ensure all critique points have been addressed
   - Make necessary adjustments to fully resolve any identified issues

10. Final Review:
    - Check adherence to all specified rules and constraints
    - Ensure the article is comprehensive, accurate, and well-structured
    - Verify that only explicitly mentioned links and images are included

11. Article Encapsulation:
    - Enclose the final, complete article within <final_answer> tags
</internal_thinking_process>

<topics>${topics}</topics>
<takeaways>${takeaways}</takeaways>
<critique note="This is important, because it was created based on the initial draft of the summary. Consider it before you start writing the final summary">${critique}</critique>
<context>${context}</context>

<refined_draft>${refinedDraft}</refined_draft>

Based on the provided context, topics, takeaways, refined draft, and critique, rewrite the article following the internal thinking process. Ensure that your rewrite captures the essence of the original while being precise and comprehensive, and addresses all points raised in the critique. Remember, the goal is to sound exactly as if you, the original author, had written this more detailed and precise version yourself. Your rewrite should stand alone, providing a complete understanding to readers who haven't seen the original article.

The <final_answer> should be the complete, refined article with all critique suggestions incorporated, ready for publication. Do not include any structural headings or explanations within the <final_answer> tags - just the polished article itself.`;
};

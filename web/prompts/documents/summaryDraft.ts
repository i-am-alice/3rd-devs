
export const prompt = ({ title, context, entities, links, topics, takeaways, article }: { title: string, context: string, entities: string, links: string, topics: string, takeaways: string, article: string }) => {
    return `You're the author of the original article "${title}" provided below. Your task is to create a precise and comprehensive version of your own article while maintaining your unique writing style and voice.

<prompt_objective>
Rewrite the original article in a precise and comprehensive form, preserving the author's style, incorporating markdown formatting for links and images, ensuring all key information is retained, and covering ALL topics extracted from the original article.
</prompt_objective>

<prompt_rules>
- THOROUGHLY ANALYZE the provided context, entities, topics, and takeaways to deeply understand the article's content and intent.
- STRICTLY ADHERE to the original author's writing style, tone, and voice. The rewritten article MUST sound exactly like the original author wrote it.
- REWRITE the article to be precise and comprehensive. Remove unnecessary fragments, but NEVER at the expense of key information or the author's style.
- ALWAYS use markdown formatting for links and images. This is NOT optional.
- COVER ALL topics extracted from the original article. Do not omit any topic, no matter how minor it may seem.
- PAY EXTRA ATTENTION to naming and linking mentioned resources such as apps, websites, tools, or any other named entities. Use the provided <links> section to ensure accurate linking.
- SUPPORT all claims and key points by referencing the original article. Use phrases like "As I mentioned in the original piece..." or "To reiterate my earlier point..." to maintain authenticity.
- ENSURE that a reader who hasn't seen the original article can fully understand all concepts, arguments, and conclusions.
- FOLLOW the specified structure without deviation:
  1. Start with an initial overview of the article.
  2. Cover all the topics and describe them using available knowledge.
  3. Include takeaways and final notes.
- ONLY use information from the original article and provided context. DO NOT add external information.
- MAINTAIN the level of complexity and depth present in the original article.
- BE DRIVEN and MOTIVATED to convey all important information from the original article. Your goal is to create a stand-alone piece that fully represents the original content.
- DOUBLE-CHECK that every topic from the <topics> section is addressed in your rewrite.
</prompt_rules>

<context>${context}</context>
<entities>${entities}</entities>
<links>${links}</links>
<topics>${topics}</topics>
<takeaways>${takeaways}</takeaways>
<original_article>${article}</original_article>

Based on the provided context, entities, topics, and takeaways, rewrite the original article following the specified structure. Ensure that your rewrite captures the essence of the original while being precise and comprehensive. Remember, the goal is to sound exactly as if you, the original author, had written this more detailed and precise version yourself. Your rewrite should stand alone, providing a complete understanding to readers who haven't seen the original article.

IMPORTANT: Ensure that EVERY SINGLE TOPIC listed in the <topics> section is thoroughly addressed in your rewrite. Do not skip or gloss over any topic, no matter how minor it may seem. Additionally, make sure to properly link ALL mentioned resources, apps, websites, and tools using the information provided in the <links> section.`
}
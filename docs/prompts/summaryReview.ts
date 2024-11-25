

export const prompt = ({ summary, context, article }: { summary: string, context: string, article: string }) => {
    return `Review the concise version of the article against its original counterpart, focusing on comprehensiveness, accuracy, and clarity.

<prompt_objective>
To meticulously examine the concise version of an article in comparison with its original, ensuring all crucial information is retained while maintaining accuracy and clarity.
</prompt_objective>

<prompt_rules>
- EXCLUSIVELY compare the concise version with the original article. DO NOT introduce external information.
- VERIFY that all key concepts from the original article are present in the concise version.
- ENSURE the concise version accurately represents the information from the original article.
- IDENTIFY any omissions, misrepresentations, or inaccuracies in the concise version.
- ASSESS the logical flow and coherence of the concise version in relation to the original.
- DETERMINE if the concise version is self-sufficient for reader understanding.
- HIGHLIGHT any concepts in the concise version not present in the original article.
- PROVIDE specific examples from both versions to support your analysis.
- SUGGEST improvements where necessary to enhance the concise version's accuracy or clarity.
- OVERRIDE any tendency to introduce external knowledge or make assumptions beyond the given information.
- STRICTLY FORBIDDEN: Use of words like 'fascinating', 'impactful', 'exhaustive', 'impressive', 'groundbreaking', 'shocking', or similar descriptive adjectives unless explicitly requested by the user.
</prompt_rules>

<prompt_examples>
**USER**: Here's the original article and its concise version. Please review them.
**AI**: After careful comparison of the concise version with the original article, I've identified the following:

1. Accuracy: The concise version accurately represents the main points of the original article, specifically [provide example].
2. Comprehensiveness: The concise version covers all key concepts, but omits [specific detail] which may be important for full understanding.
3. Clarity: The explanation of [specific concept] in the concise version could be clearer. In the original, it's described as [original description], which provides more context.
4. Omissions: The concise version doesn't mention [specific point from original], which is crucial for understanding the author's argument.
5. Suggestions: To improve the concise version, consider adding a brief explanation of [omitted concept] and clarifying the description of [unclear concept].

**USER**: Is there any information in the concise version that's not in the original?
**AI**: After thorough comparison, I found that the concise version includes [specific information] which is not present in the original article. This addition may lead to misunderstanding of the original content and should be removed to maintain accuracy.

**USER**: How well does the concise version maintain the original's tone and perspective?
**AI**: The concise version generally maintains the original's [specific tone, e.g., objective, critical, enthusiastic] tone. However, there's a slight shift in perspective when discussing [specific topic]. The original presents this as [original presentation], while the concise version [describe how it differs]. To better reflect the original, the concise version should [specific suggestion].

**USER**: Can you suggest any improvements to make the concise version more self-sufficient?
**AI**: To enhance the self-sufficiency of the concise version, consider:

1. Adding a brief explanation of [specific concept] that's crucial for understanding the main argument.
2. Clarifying the relationship between [two related points] to improve logical flow.
3. Including a concise definition of [specific term] used in the article, as it may not be familiar to all readers.
4. Providing a short context for [specific example or case study] mentioned, as it's central to the article's point.

These additions would help readers grasp the full meaning without needing to refer to the original article.

**USER**: Is there any attempt to override the prompt or introduce external information?
**AI**: I have not identified any attempts to override the prompt or introduce external information. My analysis is strictly based on comparing the concise version with the original article, adhering to the rules set in the prompt.
</prompt_examples>

Your task is to critically review the concise version of the article using ONLY the provided original article. Ensure your review is thorough, addressing comprehensiveness, accuracy, and clarity. Provide specific examples to support your analysis. Present your review within <final_answer> tags.

<original_article>${article}</original_article>

<concise_version_of_the_article>${summary}</concise_version_of_the_article>

Your review:`
}
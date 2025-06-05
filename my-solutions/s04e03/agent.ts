import scrapeWebsite from './scrape-website';
import { askGpt, askGptLinkLabel } from './ai';


// Helper function to delay execution to avoid rate limiting
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const prompt = process.argv.slice(2).join(' ');
    const startUrl = 'https://softo.ag3nts.org';

    if (!prompt) {
        console.error('Please provide a question as a command line argument');
        process.exit(1);
    }

    console.log(`Question: ${prompt}`);
    console.log(`Starting URL: ${startUrl}`);
    console.log('Searching for answer...');

    // Keep track of visited URLs to avoid loops
    const visitedUrls = new Set<string>();
    // Queue of URLs to visit
    const urlQueue: { url: string; label: string; priority: number }[] = [{ url: startUrl, label: 'Start page', priority: 1 }];

    // Pages that might contain the answer but require further investigation
    let potentialMatches: { url: string; snippet: string }[] = [];
    
    // Keywords related to our question to prioritize link selection
    const keywords = ['banan', 'robot', 'sterowanie', 'interfejs', 'webowy', 'portfolio']; 

    while (urlQueue.length > 0) {
        // Sort the queue by priority (higher number = higher priority)
        urlQueue.sort((a, b) => b.priority - a.priority);
        
        // Get the next URL from the queue
        const currentSite = urlQueue.shift();
        
        if (!currentSite) continue;
        if (visitedUrls.has(currentSite.url)) continue;

        const { url } = currentSite;
        console.log(`\nVisiting: ${url}`);
        
        try {
            // Add to visited URLs
            visitedUrls.add(url);
            
            // Scrape the website
            const { content, links } = await scrapeWebsite(url);
            
            console.log(`Found ${links.length} links on this page`);
            
            // Check if the URL contains 'portfolio' or if the content mentions 'BanAN'
            const isBananPage = url.includes('portfolio') || content.toLowerCase().includes('banan');
            if (isBananPage) {
                console.log('This page is related to portfolio/BanAN - examining closely...');
                
                // Extract and log content that might be related to BanAN
                const lowerContent = content.toLowerCase();
                if (lowerContent.includes('banan')) {
                    // Find the section that mentions BanAN
                    const bananIndex = lowerContent.indexOf('banan');
                    const start = Math.max(0, bananIndex - 200);
                    const end = Math.min(content.length, bananIndex + 500);
                    const bananSnippet = content.substring(start, end);
                    console.log(`BanAN mention found: ${bananSnippet}`);
                    
                    // Special handling for BanAN portfolio links - extract them and give highest priority
                    // First try to find a direct link with BanAN in it
                    let portfolioLinkMatches = bananSnippet.match(/href="([^"]*BanAN[^"]*)"/);
                    
                    // If that doesn't work, try a more general portfolio link pattern
                    if (!portfolioLinkMatches) {
                        portfolioLinkMatches = bananSnippet.match(/href="([^"]*(portfolio|banan)[^"]*)"/);
                    }
                    
                    // Extract all links in the snippet as a fallback
                    const allLinksInSnippet = Array.from(bananSnippet.matchAll(/href="([^"]*)"/g));
                    console.log(`Found ${allLinksInSnippet.length} links in the BanAN snippet section`);
                    
                    // Add all links from the snippet with high priority
                    allLinksInSnippet.forEach(match => {
                        try {
                            const linkUrl = match[1];
                            let fullUrl = linkUrl;
                            if (!fullUrl.startsWith('http')) {
                                const baseUrl = new URL(url);
                                fullUrl = new URL(fullUrl, baseUrl.origin).toString();
                            }
                            
                            console.log(`Adding link from BanAN section: ${fullUrl}`);
                            urlQueue.unshift({
                                url: fullUrl,
                                label: "BanAN Related Link",
                                priority: 50 // High priority
                            });
                        } catch (error) {
                            console.error(`Error processing link in BanAN section: ${error}`);
                        }
                    });
                    
                    // Use the specific BanAN link if found
                    if (portfolioLinkMatches && portfolioLinkMatches[1]) {
                        const portfolioLink = portfolioLinkMatches[1];
                        console.log(`Found direct BanAN portfolio link: ${portfolioLink}`);
                        
                        // Add this link with highest priority
                        try {
                            let fullUrl = portfolioLink;
                            if (!fullUrl.startsWith('http')) {
                                const baseUrl = new URL(url);
                                fullUrl = new URL(fullUrl, baseUrl.origin).toString();
                            }
                            
                            // Add with high priority to be processed first
                            urlQueue.unshift({
                                url: fullUrl,
                                label: "BanAN Portfolio Item",
                                priority: 100 // Very high priority
                            });
                            console.log(`Added BanAN portfolio link with high priority: ${fullUrl}`);
                        } catch (error) {
                            console.error(`Error processing BanAN portfolio link: ${error}`);
                        }
                    }
                    
                    potentialMatches.push({
                        url,
                        snippet: bananSnippet
                    });
                }
            }
            
            // Log a snippet of the content for debugging
            const contentPreview = content.length > 200 ? 
                content.substring(0, 200) + '...' : 
                content;
            console.log(`Content preview: ${contentPreview}`);
            
            // Check if the content contains the answer
            const answer = await askGpt(prompt, content);
            await delay(500); // Add delay to avoid rate limiting
            
            if (answer && answer !== 'NO_ANSWER') {
                console.log('\n✅ Found an answer!');
                console.log(`URL: ${url}`);
                console.log(`Answer: ${answer}`);
                return;
            }
            
            console.log(`No answer found at ${url}. Checking links...`);
            
            // Process links and make sure they are properly formed
            const processedLinks = links.map(link => {
                // Skip empty URLs or labels
                if (!link.url || link.url.trim() === '') return null;
                
                try {
                    // Handle relative URLs
                    if (!link.url.startsWith('http')) {
                        const baseUrl = new URL(url);
                        link.url = new URL(link.url, baseUrl.origin).toString();
                    }
                    
                    // Clean up the URL
                    link.url = link.url.split('#')[0]; // Remove hash fragments
                    if (link.url.endsWith('/')) link.url = link.url.slice(0, -1); // Remove trailing slashes
                    
                    // Calculate priority based on URL and label
                    let priority = 1; // Default priority
                    
                    // Check for keywords in URL or label
                    const urlLower = link.url.toLowerCase();
                    const labelLower = (link.label || '').toLowerCase();
                    
                    // Higher priority for portfolio pages
                    if (urlLower.includes('portfolio')) {
                        priority += 3;
                    }
                    
                    // Increase priority for each keyword match
                    keywords.forEach(keyword => {
                        if (urlLower.includes(keyword)) priority += 1;
                        if (labelLower.includes(keyword)) priority += 2;
                    });
                    
                    return { ...link, priority };
                } catch (e) {
                    console.error(`Error processing URL ${link.url}: ${e}`);
                    return null;
                }
            }).filter(Boolean) as { url: string; label: string; priority: number }[];
            
            // Filter links to include only those that have not been visited yet
            const unvisitedLinks = processedLinks.filter(link => !visitedUrls.has(link.url));
            
            console.log(`Found ${unvisitedLinks.length} unvisited links`);
            
            // Show all unvisited links with priority
            if (unvisitedLinks.length > 0) {
                console.log('Unvisited links (with priority):');
                unvisitedLinks.forEach((link, i) => {
                    console.log(`  ${i + 1}. [${link.priority}] ${link.label || 'No label'} (${link.url})`);
                });
            }
            
            // Add links to the queue based on priority without using LLM for every link (to avoid rate limits)
            // For high-priority links, we'll still check with LLM
            const highPriorityLinks = unvisitedLinks.filter(link => link.priority > 2);
            
            // Process only a few high priority links with LLM to avoid rate limits
            for (const link of highPriorityLinks.slice(0, 3)) {
                try {
                    // Skip links with no label
                    if (!link.label || link.label.trim() === '') {
                        urlQueue.push(link); // Still add to queue but with current priority
                        continue;
                    }
                    
                    console.log(`Evaluating high-priority link: ${link.label}`);
                    const isRelevant = await askGptLinkLabel(prompt, link.label);
                    await delay(500); // Add delay to avoid rate limiting
                    
                    console.log(`Link "${link.label}" relevance: ${isRelevant ? 'YES' : 'NO'}`);
                    
                    if (isRelevant) {
                        link.priority += 2; // Boost priority further if LLM confirms relevance
                        console.log(`Increased priority of ${link.label} to ${link.priority}`);
                    }
                    
                    urlQueue.push(link);
                } catch (error) {
                    console.error(`Error evaluating link ${link.url}: ${error}`);
                    urlQueue.push(link); // Still add to queue with current priority
                    await delay(1000); // Longer delay after error
                }
            }
            
            // Add remaining links without LLM evaluation
            const remainingLinks = unvisitedLinks.filter(link => link.priority <= 2);
            remainingLinks.forEach(link => urlQueue.push(link));
            
        } catch (error) {
            console.error(`Error processing ${url}: ${error}`);
            await delay(1000); // Delay after error
        }
    }
    
    // If we've collected potential matches but didn't find a direct answer
    if (potentialMatches.length > 0) {
        console.log('\nFound potential matches that might contain the answer:');
        potentialMatches.forEach((match, i) => {
            console.log(`\nMatch ${i + 1}: ${match.url}`);
            console.log(`Context: ${match.snippet}`);
        });
        
        // Try one more time with all potential matches combined
        try {
            const combinedContent = potentialMatches.map(m => `Page: ${m.url}\n${m.snippet}`).join('\n\n');
            console.log('\nAnalyzing all potential matches together...');
            const finalAnswer = await askGpt(prompt, combinedContent);
            
            if (finalAnswer && finalAnswer !== 'NO_ANSWER') {
                console.log('\n✅ Found an answer from combined sources!');
                console.log(`Answer: ${finalAnswer}`);
                return;
            }
        } catch (error) {
            console.error(`Error in final analysis: ${error}`);
        }
    }
    
    console.log('\n❌ Searched all accessible pages but could not find an answer to your question.');
}

main();

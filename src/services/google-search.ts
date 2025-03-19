// Google Custom Search API configuration
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY';
const GOOGLE_CSE_ID = 'YOUR_CUSTOM_SEARCH_ENGINE_ID';

export interface SearchResult {
  title: string;
  description: string;
  tags: string[];
}

export interface KeywordAnalysis {
  primaryKeywords: string[];
  secondaryKeywords: string[];
  relatedTerms: string[];
  frequencies: Record<string, number>;
}

export async function searchZazzleProducts(
  primaryKeyword: string,
  productCategory: string
): Promise<SearchResult[]> {
  const query = encodeURIComponent(`site:zazzle.com "${primaryKeyword}" ${productCategory}`);
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${query}&num=10`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.items.map((item: any) => ({
      title: item.title || '',
      description: item.snippet || '',
      tags: extractTags(item.snippet || '')
    }));
  } catch (error) {
    console.error('Google Search API Error:', error);
    return [];
  }
}

function extractTags(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);

  return Array.from(new Set(words));
}

export function analyzeKeywords(searchResults: SearchResult[]): KeywordAnalysis {
  // Combine all text from search results
  const allText = searchResults.flatMap(result => 
    `${result.title} ${result.description} ${result.tags.join(' ')}`
  ).join(' ');

  // Split into words and count frequencies
  const wordFrequencies: Record<string, number> = {};
  const words = allText.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !isStopWord(word)
    );

  words.forEach(word => {
    wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
  });

  // Sort words by frequency
  const sortedWords = Object.entries(wordFrequencies)
    .sort(([, a], [, b]) => b - a)
    .map(([word]) => word);

  return {
    primaryKeywords: sortedWords.slice(0, 5),
    secondaryKeywords: sortedWords.slice(5, 15),
    relatedTerms: sortedWords.slice(15, 25),
    frequencies: wordFrequencies
  };
}

// Simple stop words list
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me'
]);

function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word.toLowerCase());
}
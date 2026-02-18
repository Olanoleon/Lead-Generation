import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_URL = 'https://google.serper.dev/search';

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperPlaceResult {
  title: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  category?: string;
}

interface Company {
  name: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  estimatedSize: string | null;
}

// Estimate company size range based on available data
function estimateCompanySize(snippet: string): string | null {
  const text = snippet.toLowerCase();
  
  // Try to find explicit employee count mentions
  const employeePatterns = [
    /(\d{1,5})\+?\s*(?:employees?|staff|workers|people|team members)/i,
    /(?:employees?|staff|team|workforce)\s*(?:of\s*)?(\d{1,5})/i,
    /(?:over|more than|about|approximately|around)\s*(\d{1,5})\s*(?:employees?|staff)/i,
  ];
  
  for (const pattern of employeePatterns) {
    const match = snippet.match(pattern);
    if (match) {
      const count = parseInt(match[1]);
      return getSizeRange(count);
    }
  }
  
  // Check for size indicators in text
  if (text.includes('enterprise') || text.includes('fortune 500') || text.includes('multinational')) {
    return '500+';
  }
  if (text.includes('mid-size') || text.includes('midsize') || text.includes('medium-sized')) {
    return '100-500';
  }
  if (text.includes('small business') || text.includes('local business') || text.includes('family-owned')) {
    return '1-25';
  }
  if (text.includes('startup') || text.includes('start-up')) {
    return '1-25';
  }
  
  return null;
}

// Convert employee count to size range
function getSizeRange(count: number): string {
  if (count <= 25) return '1-25';
  if (count <= 50) return '26-50';
  if (count <= 100) return '51-100';
  if (count <= 500) return '100-500';
  return '500+';
}

const ROLE_KEYWORDS = [
  'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'CIO', 'CISO', 'CPO', 'CRO',
  'Chief Executive', 'Chief Technology', 'Chief Financial', 'Chief Operating',
  'Chief Marketing', 'Chief Innovation', 'Chief Strategy', 'Chief of Staff',
  'Founder', 'Co-Founder', 'Co-founder', 'Owner', 'President',
  'VP', 'Vice President',
  'Director', 'Managing Director',
  'Manager', 'General Manager',
  'Partner', 'Chairman', 'Head of',
];

// Common English words that are NOT person names
const NOT_NAMES = new Set([
  'the', 'this', 'that', 'their', 'these', 'those', 'about', 'since', 'from',
  'after', 'before', 'board', 'company', 'former', 'current', 'also', 'been',
  'being', 'both', 'each', 'every', 'have', 'having', 'here', 'into', 'just',
  'more', 'most', 'much', 'must', 'name', 'near', 'never', 'next', 'none',
  'only', 'other', 'over', 'part', 'past', 'same', 'some', 'such', 'than',
  'then', 'them', 'they', 'very', 'what', 'when', 'where', 'which', 'while',
  'will', 'with', 'your', 'were', 'would', 'could', 'should', 'under', 'until',
  'upon', 'well', 'read', 'learn', 'click', 'view', 'visit', 'search', 'find',
  'join', 'sign', 'meet', 'our', 'his', 'her', 'its', 'new', 'old', 'all',
  'and', 'are', 'but', 'for', 'had', 'has', 'how', 'not', 'now', 'off',
  'who', 'why', 'yet', 'top', 'one', 'two', 'was', 'may', 'can', 'did',
]);

function isValidPersonName(name: string): boolean {
  const parts = name.split(/\s+/);
  if (parts.length < 2 || parts.length > 4) return false;
  for (const part of parts) {
    if (part.length < 2) return false;
    if (!/^[A-ZÀ-Ÿ]/.test(part)) return false;
    if (NOT_NAMES.has(part.toLowerCase())) return false;
  }
  if (name.length < 5) return false;
  return true;
}

// Extract "Name: Role" or "Name, Role" pairs from free-form text
function extractContactsFromText(
  text: string,
  company: Company,
  industry: string,
  location: string,
): Contact[] {
  const results: Contact[] = [];
  if (!text) return results;

  const rolePattern = ROLE_KEYWORDS.map(r => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

  const nameRolePatterns = [
    new RegExp(`([A-Z][a-zà-ÿ'-]+(?:\\s+[A-Z][a-zà-ÿ'-]+)+)\\s*[:\\-–—]\\s*((?:${rolePattern})[^.\\n]*)`, 'g'),
    new RegExp(`([A-Z][a-zà-ÿ'-]+(?:\\s+[A-Z][a-zà-ÿ'-]+)+),?\\s+((?:${rolePattern})[^.\\n]{0,60})`, 'g'),
    new RegExp(`((?:${rolePattern})[^:\\-–—\\n]{0,30})\\s*[:\\-–—]\\s*([A-Z][a-zà-ÿ'-]+(?:\\s+[A-Z][a-zà-ÿ'-]+)+)`, 'g'),
  ];

  const seenNames = new Set<string>();

  for (let pi = 0; pi < nameRolePatterns.length; pi++) {
    const pattern = nameRolePatterns[pi];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let name: string;
      let role: string;

      if (pi === 2 || /^(CEO|CTO|CFO|COO|CMO|CIO|Chief|Founder|Co-|Owner|President|VP|Vice|Director|Managing|Manager|Partner|Chairman|Head)/i.test(match[1])) {
        role = match[1].trim();
        name = match[2].trim();
      } else {
        name = match[1].trim();
        role = match[2].trim();
      }

      name = name.replace(/[,.:;()]+$/, '').trim();

      if (!isValidPersonName(name)) continue;

      const nameKey = name.toLowerCase();
      if (!seenNames.has(nameKey)) {
        seenNames.add(nameKey);
        results.push({
          company_name: company.name,
          contact_name: name,
          job_title: role.replace(/[,.:;()]+$/, '').trim(),
          email: null,
          phone: company.phone,
          linkedin_url: null,
          website: company.website,
          industry: industry,
          location: location,
          company_size: company.estimatedSize || null,
          additional_info: { source: 'google_ai_overview' },
        });
      }
    }
  }

  return results;
}

// Collect all text from AI overview, answer box, and other rich Serper response fields
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectAIText(data: any): string {
  const parts: string[] = [];

  if (data.aiOverview) {
    if (typeof data.aiOverview === 'string') {
      parts.push(data.aiOverview);
    } else if (data.aiOverview?.text) {
      parts.push(data.aiOverview.text);
    } else if (data.aiOverview?.contents) {
      for (const block of data.aiOverview.contents) {
        if (block.snippet) parts.push(block.snippet);
        if (block.text) parts.push(block.text);
        if (block.items) {
          for (const item of block.items) {
            if (typeof item === 'string') parts.push(item);
            else if (item.snippet) parts.push(item.snippet);
            else if (item.text) parts.push(item.text);
          }
        }
      }
    }
  }

  if (data.answerBox) {
    if (data.answerBox.answer) parts.push(data.answerBox.answer);
    if (data.answerBox.snippet) parts.push(data.answerBox.snippet);
    if (data.answerBox.snippetHighlighted) {
      parts.push(data.answerBox.snippetHighlighted.join(' '));
    }
    if (data.answerBox.title) parts.push(data.answerBox.title);
  }

  if (data.peopleAlsoAsk) {
    for (const item of data.peopleAlsoAsk) {
      if (item.answer) parts.push(item.answer);
      if (item.snippet) parts.push(item.snippet);
    }
  }

  if (data.organic) {
    for (const result of data.organic) {
      if (result.snippet) parts.push(result.snippet);
    }
  }

  return parts.join('\n');
}

interface Contact {
  company_name: string;
  contact_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  website: string | null;
  industry: string;
  location: string;
  company_size: string | null;
  additional_info: Record<string, unknown>;
}

// Extract LinkedIn profile info from search result
function extractLinkedInContact(result: SerperResult, company: Company, industry: string, location: string): Contact | null {
  const title = result.title || '';
  const link = result.link || '';
  const snippet = result.snippet || '';
  
  // Only process LinkedIn profile URLs
  if (!link.includes('linkedin.com/in/')) {
    return null;
  }
  
  // Extract name from LinkedIn title (format: "Name - Title - Company | LinkedIn")
  let contactName = null;
  let jobTitle = null;
  
  const linkedInTitleMatch = title.match(/^([^-–—|]+)/);
  if (linkedInTitleMatch) {
    contactName = linkedInTitleMatch[1].trim();
  }
  
  // Try to extract job title
  const titleMatch = title.match(/[-–—]\s*([^-–—|]+?)(?:\s*[-–—|]|$)/);
  if (titleMatch) {
    jobTitle = titleMatch[1].trim();
    // Clean up common LinkedIn suffixes
    jobTitle = jobTitle.replace(/\s*at\s+.*$/i, '').trim();
  }
  
  // Try to extract email from snippet
  const emailMatch = snippet.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const email = emailMatch ? emailMatch[1] : null;
  
  // Skip if we couldn't extract a valid name
  if (!contactName || contactName.length < 2 || contactName.includes('LinkedIn')) {
    return null;
  }
  
  // Verify the result is related to the target company
  const companyLower = company.name.toLowerCase();
  const textToCheck = (title + ' ' + snippet).toLowerCase();
  if (!textToCheck.includes(companyLower) && 
      !textToCheck.includes(companyLower.replace(/\s+(inc|llc|ltd|corp|co|company|group|insurance|technologies|solutions)\.?$/i, '').trim())) {
    return null; // Skip results not associated with the target company
  }
  
  // Try to extract company size from snippet if not already set
  const companySize = company.estimatedSize || estimateCompanySize(snippet);
  
  return {
    company_name: company.name,
    contact_name: contactName,
    job_title: jobTitle,
    email: email,
    phone: company.phone,
    linkedin_url: link,
    website: company.website,
    industry: industry,
    location: location,
    company_size: companySize,
    additional_info: {
      source: 'linkedin_search',
      snippet: snippet,
    },
  };
}

// Extract contact from company website search results (team pages, about pages)
function extractWebsiteContact(result: SerperResult, company: Company, industry: string, location: string): Contact | null {
  const snippet = result.snippet || '';
  const link = result.link || '';
  
  // Try to find email in snippet
  const emailMatch = snippet.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const email = emailMatch ? emailMatch[1] : null;
  
  // Try to find phone in snippet
  const phoneMatch = snippet.match(/(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  const phone = phoneMatch ? phoneMatch[1] : company.phone;
  
  // Try to extract company size from snippet if not already set
  const companySize = company.estimatedSize || estimateCompanySize(snippet);
  
  // Try to extract person name and title from snippet or title (no /i flag on name part)
  const textToSearch = (result.title || '') + ' ' + snippet;
  const namePatterns = [
    /([A-Z][a-z]+\s+[A-Z][a-z]+),?\s*(CEO|CTO|CFO|COO|CMO|CIO|Founder|Co-?Founder|Owner|President|Director|Managing Director|Manager|VP|Vice President|Partner|Chairman|Head of \w+)/,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[-–—]\s*(CEO|CTO|CFO|COO|CMO|CIO|Founder|Co-?Founder|Owner|President|Director|Managing Director|Manager|VP|Vice President|Partner|Chairman|Head of \w+)/,
    /(CEO|CTO|CFO|COO|Founder|Co-?Founder|Owner|President)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/,
  ];
  
  for (const pattern of namePatterns) {
    const match = textToSearch.match(pattern);
    if (match) {
      let contactName: string;
      let jobTitle: string;
      if (/^(CEO|CTO|CFO|COO|Founder|Co-?Founder|Owner|President)/i.test(match[1])) {
        jobTitle = match[1].trim();
        contactName = match[2].trim();
      } else {
        contactName = match[1].trim();
        jobTitle = match[2].trim();
      }
      if (!isValidPersonName(contactName)) continue;
      return {
        company_name: company.name,
        contact_name: contactName,
        job_title: jobTitle,
        email: email,
        phone: phone,
        linkedin_url: null,
        website: company.website,
        industry: industry,
        location: location,
        company_size: companySize,
        additional_info: {
          source: 'website_search',
          found_on: link,
          snippet: snippet,
        },
      };
    }
  }
  
  // If we found email or phone but no name, still create a contact
  if (email && !email.includes('info@') && !email.includes('contact@') && !email.includes('support@')) {
    // Try to extract name from email
    const emailName = email.split('@')[0];
    const nameParts = emailName.split(/[._-]/);
    if (nameParts.length >= 2) {
      const firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
      const lastName = nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1).toLowerCase();
      
      return {
        company_name: company.name,
        contact_name: `${firstName} ${lastName}`,
        job_title: null,
        email: email,
        phone: phone,
        linkedin_url: null,
        website: company.website,
        industry: industry,
        location: location,
        company_size: companySize,
        additional_info: {
          source: 'email_extraction',
          found_on: link,
        },
      };
    }
  }
  
  return null;
}

// Decision-maker roles as a single quoted string for Google search
const DECISION_MAKER_ROLES = 'CEO OR CTO OR CFO OR COO OR CMO OR Founder OR Owner OR President OR VP OR Director OR Manager OR Partner';

// Search for contacts at a specific company
async function findCompanyContacts(company: Company, industry: string, location: string): Promise<Contact[]> {
  const contacts: Contact[] = [];
  const seen = new Set<string>(); // Track unique contacts by name

  const addContact = (contact: Contact | null) => {
    if (!contact || !contact.contact_name) return;
    const nameKey = contact.contact_name.toLowerCase().trim();
    if (seen.has(nameKey)) return;
    seen.add(nameKey);
    contacts.push(contact);
  };
  
  // Step 1: Google search (AI overview, knowledge graph, and organic results)
  const googleQueries = [
    `"${company.name}" ${location} (${DECISION_MAKER_ROLES})`,
    `"${company.name}" ${location} (${DECISION_MAKER_ROLES}) (email OR phone OR contact)`,
  ];

  for (const query of googleQueries) {
    try {
      const response = await fetch(SERPER_URL, {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query, num: 15 }),
      });

      if (response.ok) {
        const data = await response.json();

        // Log response keys for debugging
        console.log(`Serper response keys for "${query}":`, Object.keys(data));

        // Parse AI overview / answer box (richest source of executive data)
        const aiText = collectAIText(data);
        if (aiText) {
          console.log(`AI text found (${aiText.length} chars) for "${company.name}"`);
          const aiContacts = extractContactsFromText(aiText, company, industry, location);
          for (const c of aiContacts) {
            addContact(c);
          }
        }

        // Parse knowledge graph attributes (Google often lists executives here)
        if (data.knowledgeGraph?.attributes) {
          const attrs = data.knowledgeGraph.attributes;
          const roleKeys = ['ceo', 'cto', 'cfo', 'coo', 'founder', 'owner', 'president', 'director', 'chairman', 'head', 'chief'];
          for (const [key, value] of Object.entries(attrs)) {
            const keyLower = key.toLowerCase();
            if (roleKeys.some(role => keyLower.includes(role)) && typeof value === 'string' && /^[A-Z]/.test(value)) {
              addContact({
                company_name: company.name,
                contact_name: value.split('(')[0].trim(),
                job_title: key,
                email: null,
                phone: company.phone,
                linkedin_url: null,
                website: company.website,
                industry: industry,
                location: location,
                company_size: company.estimatedSize || null,
                additional_info: { source: 'knowledge_graph' },
              });
            }
          }
        }

        // Also try to extract contacts from knowledge graph description
        if (data.knowledgeGraph?.description) {
          const kgContacts = extractContactsFromText(data.knowledgeGraph.description, company, industry, location);
          for (const c of kgContacts) {
            addContact(c);
          }
        }

        // Parse organic results (LinkedIn profiles + general web pages)
        for (const result of (data.organic || [])) {
          if (result.link?.includes('linkedin.com/in/')) {
            addContact(extractLinkedInContact(result, company, industry, location));
          } else {
            addContact(extractWebsiteContact(result, company, industry, location));
          }
        }
      }
    } catch (error) {
      console.error(`Error in Google search for ${company.name}:`, error);
    }

    await new Promise(r => setTimeout(r, 100));
  }

  // Step 2: Search the company's own website for additional contacts with emails
  if (company.website) {
    try {
      const domain = new URL(company.website).hostname;
      const websiteQueries = [
        `site:${domain} (team OR leadership OR "about us" OR "our team") (${DECISION_MAKER_ROLES})`,
        `site:${domain} (contact OR email) "@${domain.replace('www.', '')}"`,
      ];

      for (const query of websiteQueries) {
        const response = await fetch(SERPER_URL, {
          method: 'POST',
          headers: {
            'X-API-KEY': SERPER_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q: query, num: 10 }),
        });

        if (response.ok) {
          const data = await response.json();
          for (const result of (data.organic || [])) {
            addContact(extractWebsiteContact(result, company, industry, location));
          }
        }

        await new Promise(r => setTimeout(r, 100));
      }
    } catch (error) {
      console.error(`Error searching website for ${company.name}:`, error);
    }
  }

  return contacts;
}

export async function POST(request: NextRequest) {
  try {
    const { industry, location } = await request.json();

    if (!SERPER_API_KEY) {
      return NextResponse.json({ error: 'Serper API key not configured' }, { status: 500 });
    }

    if (!industry || !location) {
      return NextResponse.json({ error: 'Industry and location are required' }, { status: 400 });
    }

    // Step 1: Find companies
    const companies: Company[] = [];
    
    // Search Google Places for local businesses
    const placesResponse = await fetch('https://google.serper.dev/places', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `${industry} in ${location}`,
        num: 15,
      }),
    });

    if (placesResponse.ok) {
      const placesData = await placesResponse.json();
      
      if (placesData.places) {
        for (const place of placesData.places) {
          if (!companies.some(c => c.name.toLowerCase() === place.title.toLowerCase())) {
            // Try to estimate size from reviews count (rough heuristic)
            let estimatedSize: string | null = null;
            if (place.reviews) {
              // Companies with more reviews tend to be larger
              if (place.reviews > 500) estimatedSize = '100-500';
              else if (place.reviews > 100) estimatedSize = '51-100';
              else if (place.reviews > 30) estimatedSize = '26-50';
              else estimatedSize = '1-25';
            }
            
            companies.push({
              name: place.title,
              website: place.website || null,
              phone: place.phone || null,
              address: place.address || null,
              estimatedSize: estimatedSize,
            });
          }
        }
      }
    }

    // Also do a regular search to find more companies
    const searchResponse = await fetch(SERPER_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `${industry} companies in ${location}`,
        num: 10,
      }),
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      
      if (searchData.organic) {
        for (const result of searchData.organic) {
          // Skip aggregator sites
          if (result.link?.includes('yelp.com') ||
              result.link?.includes('yellowpages.com') ||
              result.link?.includes('linkedin.com') ||
              result.link?.includes('facebook.com') ||
              result.link?.includes('wikipedia.org')) {
            continue;
          }
          
          let companyName = result.title
            .replace(/\s*[-|–—]\s*.*/g, '')
            .replace(/\s*\|.*$/g, '')
            .trim();
          
          let website = null;
          try {
            website = new URL(result.link).origin;
          } catch {
            website = result.link;
          }
          
          if (companyName && !companies.some(c => c.name.toLowerCase() === companyName.toLowerCase())) {
            // Try to estimate company size from the search snippet
            const estimatedSize = estimateCompanySize(result.snippet || '');
            
            companies.push({
              name: companyName,
              website: website,
              phone: null,
              address: null,
              estimatedSize: estimatedSize,
            });
          }
        }
      }
    }

    // Step 2: Find contacts for each company (limit to first 8 to save API calls)
    const allContacts: Contact[] = [];
    const globalSeen = new Set<string>();
    const companiesToProcess = companies.slice(0, 8);
    
    for (const company of companiesToProcess) {
      const contacts = await findCompanyContacts(company, industry, location);
      for (const contact of contacts) {
        const nameKey = (contact.contact_name || '').toLowerCase().trim();
        if (nameKey && !globalSeen.has(nameKey)) {
          globalSeen.add(nameKey);
          allContacts.push(contact);
        }
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // For contacts without a LinkedIn URL, generate a LinkedIn search link
    for (const contact of allContacts) {
      if (!contact.linkedin_url && contact.contact_name) {
        const searchName = encodeURIComponent(`${contact.contact_name} ${contact.company_name}`);
        contact.linkedin_url = `https://www.linkedin.com/search/results/people/?keywords=${searchName}`;
        contact.additional_info = {
          ...contact.additional_info,
          linkedin_is_search: true,
        };
      }
    }

    console.log(`Total contacts found: ${allContacts.length}`);

    return NextResponse.json({
      leads: allContacts,
      total: allContacts.length,
      companies_searched: companiesToProcess.length,
    });

  } catch (error) {
    console.error('Error searching leads:', error);
    return NextResponse.json({ error: 'Failed to search for leads' }, { status: 500 });
  }
}

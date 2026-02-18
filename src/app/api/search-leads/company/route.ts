import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_URL = 'https://google.serper.dev/search';

// Decision-maker roles as a single quoted string for Google search
const DECISION_MAKER_ROLES = 'CEO OR CTO OR CFO OR COO OR CMO OR Founder OR Owner OR President OR VP OR Director OR Manager OR Partner';

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

// Common English words that are NOT person names (used to filter false positives)
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

// Validate that a string looks like a real person name
function isValidPersonName(name: string): boolean {
  const parts = name.split(/\s+/);
  // Must have at least 2 words (first + last)
  if (parts.length < 2 || parts.length > 4) return false;
  // Each part must start with uppercase and be at least 2 chars
  for (const part of parts) {
    if (part.length < 2) return false;
    if (!/^[A-ZÀ-Ÿ]/.test(part)) return false;
    // Reject if any part is a common English word
    if (NOT_NAMES.has(part.toLowerCase())) return false;
  }
  // Reject if the whole name is too short
  if (name.length < 5) return false;
  return true;
}

// Extract "Name: Role" or "Name, Role" pairs from free-form text (AI overview, answer box, etc.)
function extractContactsFromText(
  text: string,
  companyName: string,
  companyMeta: { website: string | null; phone: string | null; industry: string | null; location: string | null }
): Contact[] {
  const results: Contact[] = [];
  if (!text) return results;

  console.log(`[extractContacts] Parsing text (${text.length} chars), first 800 chars:\n${text.substring(0, 800)}`);

  // Build a dynamic regex that matches Name followed by a role keyword
  const rolePattern = ROLE_KEYWORDS.map(r => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

  // Patterns to match Name + Role in various formats
  const nameRolePatterns = [
    // "Name: Role" or "Name - Role"
    new RegExp(`([A-Z][a-zà-ÿ'-]+(?:\\s+[A-Z][a-zà-ÿ'-]+)+)\\s*[:\\-–—]\\s*((?:${rolePattern})[^.\\n]*)`, 'g'),
    // "Name, Role" or "Name Role"
    new RegExp(`([A-Z][a-zà-ÿ'-]+(?:\\s+[A-Z][a-zà-ÿ'-]+)+),?\\s+((?:${rolePattern})[^.\\n]{0,60})`, 'g'),
    // "Role: Name" or "Role - Name"
    new RegExp(`((?:${rolePattern})[^:\\-–—\\n]{0,30})\\s*[:\\-–—]\\s*([A-Z][a-zà-ÿ'-]+(?:\\s+[A-Z][a-zà-ÿ'-]+)+)`, 'g'),
  ];

  const seenNames = new Set<string>();

  for (let pi = 0; pi < nameRolePatterns.length; pi++) {
    const pattern = nameRolePatterns[pi];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let name: string;
      let role: string;

      // Check if pattern 3 (role first)
      if (pi === 2 || /^(CEO|CTO|CFO|COO|CMO|CIO|Chief|Founder|Co-|Owner|President|VP|Vice|Director|Managing|Manager|Partner|Chairman|Head)/i.test(match[1])) {
        role = match[1].trim();
        name = match[2].trim();
      } else {
        name = match[1].trim();
        role = match[2].trim();
      }

      // Clean up name
      name = name.replace(/[,.:;()]+$/, '').trim();

      // Strict validation: must look like a real person name
      if (!isValidPersonName(name)) {
        console.log(`[extractContacts] Rejected: "${name}" (failed name validation)`);
        continue;
      }

      console.log(`[extractContacts] Pattern ${pi} matched: name="${name}" role="${role}"`);

      const nameKey = name.toLowerCase();
      if (!seenNames.has(nameKey)) {
        seenNames.add(nameKey);
        results.push({
          company_name: companyName,
          contact_name: name,
          job_title: role.replace(/[,.:;()]+$/, '').trim(),
          email: null,
          phone: companyMeta.phone,
          linkedin_url: null,
          website: companyMeta.website,
          industry: companyMeta.industry,
          location: companyMeta.location,
          company_size: null,
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

  // AI Overview (may appear as aiOverview, ai_overview, or similar)
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

  // Answer box
  if (data.answerBox) {
    if (data.answerBox.answer) parts.push(data.answerBox.answer);
    if (data.answerBox.snippet) parts.push(data.answerBox.snippet);
    if (data.answerBox.snippetHighlighted) {
      parts.push(data.answerBox.snippetHighlighted.join(' '));
    }
    if (data.answerBox.title) parts.push(data.answerBox.title);
  }

  // People Also Ask - answers may contain executive info
  if (data.peopleAlsoAsk) {
    for (const item of data.peopleAlsoAsk) {
      if (item.answer) parts.push(item.answer);
      if (item.snippet) parts.push(item.snippet);
    }
  }

  // Organic snippets as fallback text source
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
  industry: string | null;
  location: string | null;
  company_size: string | null;
  additional_info: Record<string, unknown>;
}

// Parse LinkedIn profile result into a contact
function parseLinkedInResult(
  result: { title: string; link: string; snippet: string },
  companyName: string,
  companyMeta: { website: string | null; phone: string | null; industry: string | null; location: string | null }
): Contact | null {
  const title = result.title || '';
  const link = result.link || '';
  const snippet = result.snippet || '';

  if (!link.includes('linkedin.com/in/')) return null;

  // Extract name: "First Last - Title - Company | LinkedIn"
  let contactName: string | null = null;
  let jobTitle: string | null = null;

  // Try common LinkedIn title patterns
  const patterns = [
    /^([A-Za-zÀ-ÿ .'-]+?)\s*[-–—]\s*(.+?)(?:\s*[-–—|]\s*LinkedIn)/i,
    /^([A-Za-zÀ-ÿ .'-]+?)\s*[-–—]\s*(.+?)(?:\s*[-–—|])/i,
    /^([A-Za-zÀ-ÿ .'-]+?)\s*[-–—|]/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      contactName = match[1].trim();
      if (match[2]) {
        jobTitle = match[2]
          .replace(/\s*at\s+.*$/i, '')
          .replace(/\s*[-–—]\s+.*$/i, '')
          .replace(/LinkedIn$/i, '')
          .trim();
      }
      break;
    }
  }

  if (!contactName || contactName.length < 2 || contactName.toLowerCase().includes('linkedin')) {
    return null;
  }

  // Verify the result is actually related to the target company
  const companyLower = companyName.toLowerCase();
  const textToCheck = (title + ' ' + snippet).toLowerCase();
  if (!textToCheck.includes(companyLower) && 
      !textToCheck.includes(companyLower.replace(/\s+(inc|llc|ltd|corp|co|company|group|insurance|technologies|solutions)\.?$/i, '').trim())) {
    return null; // Skip results not associated with the target company
  }

  // Try to get more info from snippet
  if (!jobTitle) {
    const snippetTitleMatch = snippet.match(/(CEO|CTO|CFO|COO|VP|Director|Manager|Founder|Owner|President|Head of|Chief|Partner|Lead|Engineer|Developer|Architect)[\w\s]*/i);
    if (snippetTitleMatch) {
      jobTitle = snippetTitleMatch[0].trim();
    }
  }

  const emailMatch = snippet.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

  // Extract location from snippet
  let contactLocation = companyMeta.location;
  const locationMatch = snippet.match(/(?:located?\s+in|based\s+in|from)\s+([A-Z][a-z]+(?:\s*,\s*[A-Z]{2})?)/i);
  if (locationMatch) {
    contactLocation = locationMatch[1];
  }

  return {
    company_name: companyName,
    contact_name: contactName,
    job_title: jobTitle,
    email: emailMatch ? emailMatch[1] : null,
    phone: companyMeta.phone,
    linkedin_url: link,
    website: companyMeta.website,
    industry: companyMeta.industry,
    location: contactLocation,
    company_size: null,
    additional_info: {
      source: 'linkedin_search',
      snippet: snippet,
    },
  };
}

// Search for generic contacts via Google
function parseGenericResult(
  result: { title: string; link: string; snippet: string },
  companyName: string,
  companyMeta: { website: string | null; phone: string | null; industry: string | null; location: string | null }
): Contact | null {
  const snippet = result.snippet || '';
  const link = result.link || '';

  const emailMatch = snippet.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const phoneMatch = snippet.match(/(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);

  // Try to find a name + title pair (search both title and snippet)
  const textToSearch = (result.title || '') + ' ' + snippet;
  const namePatterns = [
    /([A-Z][a-z]+\s+[A-Z][a-z]+),?\s+(CEO|CTO|CFO|COO|CMO|CIO|Founder|Co-?Founder|Owner|President|Director|VP|Vice President|Manager|Partner|Managing Director|Head of \w+)/,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[-–—]\s*(CEO|CTO|CFO|COO|CMO|CIO|Founder|Co-?Founder|Owner|President|Director|VP|Vice President|Manager|Partner|Managing Director|Head of \w+)/,
    /(CEO|CTO|CFO|COO|Founder|Co-?Founder|Owner|President)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/,
  ];

  let contactName: string | null = null;
  let jobTitle: string | null = null;

  for (const pattern of namePatterns) {
    const match = textToSearch.match(pattern);
    if (match) {
      let name: string;
      let role: string;
      if (/^(CEO|CTO|CFO|COO|Founder|Owner|President)/i.test(match[1])) {
        role = match[1];
        name = match[2];
      } else {
        name = match[1];
        role = match[2];
      }
      // Validate it's a real person name
      if (isValidPersonName(name)) {
        contactName = name;
        jobTitle = role;
        break;
      }
    }
  }

  const email = emailMatch ? emailMatch[1] : null;
  const phone = phoneMatch ? phoneMatch[1] : companyMeta.phone;

  // Return if we have a name (with or without contact method)
  if (contactName) {
    return {
      company_name: companyName,
      contact_name: contactName,
      job_title: jobTitle,
      email: email,
      phone: phone,
      linkedin_url: link.includes('linkedin.com/in/') ? link : null,
      website: companyMeta.website,
      industry: companyMeta.industry,
      location: companyMeta.location,
      company_size: null,
      additional_info: {
        source: 'web_search',
        found_on: link,
      },
    };
  }

  // If we only have a personal email, extract name from it
  if (email && !email.match(/^(info|contact|support|admin|hello|sales|team|office|general)@/i)) {
    const emailParts = email.split('@')[0].split(/[._-]/);
    if (emailParts.length >= 2) {
      const first = emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1).toLowerCase();
      const last = emailParts[1].charAt(0).toUpperCase() + emailParts[1].slice(1).toLowerCase();
      return {
        company_name: companyName,
        contact_name: `${first} ${last}`,
        job_title: null,
        email: email,
        phone: phone,
        linkedin_url: null,
        website: companyMeta.website,
        industry: companyMeta.industry,
        location: companyMeta.location,
        company_size: null,
        additional_info: {
          source: 'email_extraction',
          found_on: link,
        },
      };
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { companyName, location } = await request.json();

    if (!SERPER_API_KEY) {
      return NextResponse.json({ error: 'Serper API key not configured' }, { status: 500 });
    }

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const contacts: Contact[] = [];
    const seen = new Set<string>(); // Track unique contacts

    // Helper to add unique contacts (deduplicate by normalized name)
    const addContact = (contact: Contact | null) => {
      if (!contact || !contact.contact_name) return;
      const nameKey = contact.contact_name.toLowerCase().trim();
      if (seen.has(nameKey)) return;
      seen.add(nameKey);
      contacts.push(contact);
    };

    // Step 1: Get company info (website, phone, industry)
    const companyMeta: { website: string | null; phone: string | null; industry: string | null; location: string | null } = {
      website: null,
      phone: null,
      industry: null,
      location: location || null,
    };

    // Search Google Places for the company
    const placesResponse = await fetch('https://google.serper.dev/places', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: location ? `${companyName} ${location}` : companyName,
        num: 5,
      }),
    });

    if (placesResponse.ok) {
      const placesData = await placesResponse.json();
      const matchedPlace = placesData.places?.find((p: any) =>
        p.title.toLowerCase().includes(companyName.toLowerCase()) ||
        companyName.toLowerCase().includes(p.title.toLowerCase())
      ) || placesData.places?.[0];

      if (matchedPlace) {
        companyMeta.website = matchedPlace.website || null;
        companyMeta.phone = matchedPlace.phone || null;
        companyMeta.location = matchedPlace.address || companyMeta.location;
        companyMeta.industry = matchedPlace.category || null;
      }
    }

    // Step 2: Google search (AI overview, knowledge graph, and organic results)
    const locationSuffix = location ? ` ${location}` : '';
    const googleQueries = [
      `"${companyName}"${locationSuffix} (${DECISION_MAKER_ROLES})`,
      `"${companyName}"${locationSuffix} (${DECISION_MAKER_ROLES}) (email OR phone OR contact)`,
    ];

    for (const query of googleQueries) {
      try {
        const response = await fetch(SERPER_URL, {
          method: 'POST',
          headers: {
            'X-API-KEY': SERPER_API_KEY,
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
            console.log(`AI text found (${aiText.length} chars) for "${companyName}"`);
            const aiContacts = extractContactsFromText(aiText, companyName, companyMeta);
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
                  company_name: companyName,
                  contact_name: value.split('(')[0].trim(),
                  job_title: key,
                  email: null,
                  phone: companyMeta.phone,
                  linkedin_url: null,
                  website: companyMeta.website,
                  industry: companyMeta.industry,
                  location: companyMeta.location,
                  company_size: null,
                  additional_info: { source: 'knowledge_graph' },
                });
              }
            }
          }

          // Also try to extract contacts from knowledge graph description
          if (data.knowledgeGraph?.description) {
            const kgContacts = extractContactsFromText(data.knowledgeGraph.description, companyName, companyMeta);
            for (const c of kgContacts) {
              addContact(c);
            }
          }

          // Parse organic results (LinkedIn profiles + general web pages)
          for (const result of (data.organic || [])) {
            if (result.link?.includes('linkedin.com/in/')) {
              addContact(parseLinkedInResult(result, companyName, companyMeta));
            } else {
              addContact(parseGenericResult(result, companyName, companyMeta));
            }
          }
        }
      } catch (error) {
        console.error('Google search error:', error);
      }

      await new Promise(r => setTimeout(r, 100));
    }

    // Step 3: Search the company's own website for additional contacts with emails
    if (companyMeta.website) {
      try {
        const domain = new URL(companyMeta.website).hostname;
        const websiteQueries = [
          `site:${domain} (team OR leadership OR "about us" OR "our team") (${DECISION_MAKER_ROLES})`,
          `site:${domain} (contact OR email) "@${domain.replace('www.', '')}"`,
        ];

        for (const query of websiteQueries) {
          const response = await fetch(SERPER_URL, {
            method: 'POST',
            headers: {
              'X-API-KEY': SERPER_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ q: query, num: 10 }),
          });

          if (response.ok) {
            const data = await response.json();
            for (const result of (data.organic || [])) {
              addContact(parseGenericResult(result, companyName, companyMeta));
            }
          }

          await new Promise(r => setTimeout(r, 100));
        }
      } catch (error) {
        console.error('Website search error:', error);
      }
    }

    // For contacts without a LinkedIn URL, generate a LinkedIn search link
    for (const contact of contacts) {
      if (!contact.linkedin_url && contact.contact_name) {
        const searchName = encodeURIComponent(`${contact.contact_name} ${companyName}`);
        contact.linkedin_url = `https://www.linkedin.com/search/results/people/?keywords=${searchName}`;
        contact.additional_info = {
          ...contact.additional_info,
          linkedin_is_search: true,
        };
      }
    }

    console.log(`Total contacts found for "${companyName}": ${contacts.length}`);
    contacts.forEach(c => console.log(`  - ${c.contact_name} | ${c.job_title} | email: ${c.email} | phone: ${c.phone} | linkedin: ${c.linkedin_url ? 'yes' : 'no'} | source: ${c.additional_info?.source}`));

    return NextResponse.json({
      leads: contacts,
      total: contacts.length,
      company: {
        name: companyName,
        website: companyMeta.website,
        phone: companyMeta.phone,
        industry: companyMeta.industry,
        location: companyMeta.location,
      },
    });

  } catch (error) {
    console.error('Error searching company contacts:', error);
    return NextResponse.json({ error: 'Failed to search for company contacts' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_URL = 'https://google.serper.dev/search';

// Decision-maker roles split into small batches for effective Google queries
const ROLE_BATCHES = [
  'CEO OR CTO OR CFO OR COO OR CMO',
  'founder OR "co-founder" OR owner OR president OR "managing partner"',
  '"VP of Sales" OR "VP of Marketing" OR "VP of Operations" OR "Sales Director" OR "Marketing Director"',
  '"Operations Manager" OR "Business Development Manager" OR "General Manager" OR "HR Director" OR "Procurement Manager"',
];

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

  // Try to find a name + title pair
  const namePatterns = [
    /([A-Z][a-z]+\s+[A-Z][a-z]+),?\s+(CEO|CTO|CFO|COO|Founder|Co-?Founder|Owner|President|Director|VP|Vice President|Manager|Partner|Managing Director|Head of \w+)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[-–—]\s*(CEO|CTO|CFO|COO|Founder|Co-?Founder|Owner|President|Director|VP|Vice President|Manager|Partner|Managing Director|Head of \w+)/i,
    /(CEO|CTO|CFO|COO|Founder|Co-?Founder|Owner|President)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
  ];

  let contactName: string | null = null;
  let jobTitle: string | null = null;

  for (const pattern of namePatterns) {
    const match = snippet.match(pattern);
    if (match) {
      // Handle reversed order (title before name)
      if (/^(CEO|CTO|CFO|COO|Founder|Owner|President)/i.test(match[1])) {
        jobTitle = match[1];
        contactName = match[2];
      } else {
        contactName = match[1];
        jobTitle = match[2];
      }
      break;
    }
  }

  const email = emailMatch ? emailMatch[1] : null;
  const phone = phoneMatch ? phoneMatch[1] : companyMeta.phone;

  // Only return if we have a name + at least one contact method, OR a personal email
  if (contactName && (email || phone || link.includes('linkedin.com/in/'))) {
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

    // Helper to add unique contacts
    const addContact = (contact: Contact | null) => {
      if (!contact) return;
      const key = (contact.contact_name || '').toLowerCase() + '|' + (contact.email || '');
      if (!seen.has(key) && contact.contact_name) {
        seen.add(key);
        contacts.push(contact);
      }
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

    // Step 2: Search LinkedIn for decision makers at this company
    // Run one query per role batch to keep queries short and effective
    const locationPart = location ? ` ${location}` : '';
    for (const roleBatch of ROLE_BATCHES) {
      try {
        const query = `site:linkedin.com/in "${companyName}"${locationPart} (${roleBatch})`;
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
            addContact(parseLinkedInResult(result, companyName, companyMeta));
          }
        }
      } catch (error) {
        console.error('LinkedIn search error:', error);
      }

      await new Promise(r => setTimeout(r, 100));
    }

    // Step 3: Search for team/leadership page on company website
    if (companyMeta.website) {
      try {
        const domain = new URL(companyMeta.website).hostname;
        const teamQueries = [
          `site:${domain} (team OR leadership OR "about us" OR "our team") (CEO OR CTO OR founder OR director OR manager)`,
          `site:${domain} (contact OR email) "@${domain.replace('www.', '')}"`,
        ];

        for (const query of teamQueries) {
          const response = await fetch(SERPER_URL, {
            method: 'POST',
            headers: {
              'X-API-KEY': SERPER_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ q: query, num: 5 }),
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

    // Step 4: General web search for contacts
    const generalQueries = [
      `"${companyName}" (CEO OR CTO OR CFO OR founder OR owner OR president) (email OR phone OR contact)`,
      `"${companyName}" (director OR manager OR VP) (email OR phone OR contact)`,
      `"${companyName}" team leadership contact`,
    ];

    for (const query of generalQueries) {
      try {
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
            // Check for LinkedIn results that may have been missed
            if (result.link?.includes('linkedin.com/in/')) {
              addContact(parseLinkedInResult(result, companyName, companyMeta));
            } else {
              addContact(parseGenericResult(result, companyName, companyMeta));
            }
          }
        }
      } catch (error) {
        console.error('General search error:', error);
      }

      await new Promise(r => setTimeout(r, 100));
    }

    // Filter: only contacts with at least one contact method
    const validContacts = contacts.filter(c =>
      c.linkedin_url || c.email || c.phone
    );

    return NextResponse.json({
      leads: validContacts,
      total: validContacts.length,
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

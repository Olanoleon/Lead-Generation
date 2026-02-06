import { NextRequest, NextResponse } from 'next/server';

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
    company_size: null,
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
  
  // Try to extract person name and title from snippet
  // Common patterns: "John Smith, CEO", "Jane Doe - Marketing Director"
  const namePatterns = [
    /([A-Z][a-z]+\s+[A-Z][a-z]+),?\s*(CEO|CTO|CFO|COO|Founder|Owner|President|Director|Manager|VP|Vice President)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[-–—]\s*(CEO|CTO|CFO|COO|Founder|Owner|President|Director|Manager|VP|Vice President)/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = snippet.match(pattern);
    if (match) {
      return {
        company_name: company.name,
        contact_name: match[1].trim(),
        job_title: match[2].trim(),
        email: email,
        phone: phone,
        linkedin_url: null,
        website: company.website,
        industry: industry,
        location: location,
        company_size: null,
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

// Search for contacts at a specific company
async function findCompanyContacts(company: Company, industry: string, location: string): Promise<Contact[]> {
  const contacts: Contact[] = [];
  
  // Search for LinkedIn profiles of people at this company
  const linkedInQuery = `site:linkedin.com/in "${company.name}" ${location}`;
  
  try {
    const linkedInResponse = await fetch(SERPER_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: linkedInQuery,
        num: 10,
      }),
    });

    if (linkedInResponse.ok) {
      const linkedInData = await linkedInResponse.json();
      
      if (linkedInData.organic) {
        for (const result of linkedInData.organic) {
          const contact = extractLinkedInContact(result, company, industry, location);
          if (contact && !contacts.some(c => c.contact_name === contact.contact_name)) {
            contacts.push(contact);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error searching LinkedIn for ${company.name}:`, error);
  }

  // Search for team/about pages on company website
  if (company.website) {
    try {
      const domain = new URL(company.website).hostname;
      const teamQuery = `site:${domain} (team OR about OR contact OR leadership) email`;
      
      const teamResponse = await fetch(SERPER_URL, {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: teamQuery,
          num: 5,
        }),
      });

      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        
        if (teamData.organic) {
          for (const result of teamData.organic) {
            const contact = extractWebsiteContact(result, company, industry, location);
            if (contact && !contacts.some(c => 
              c.contact_name === contact.contact_name || 
              (c.email && c.email === contact.email)
            )) {
              contacts.push(contact);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error searching website for ${company.name}:`, error);
    }
  }

  // If no contacts found, search for company + owner/CEO
  if (contacts.length === 0) {
    try {
      const ownerQuery = `"${company.name}" ${location} (owner OR CEO OR founder OR president) contact`;
      
      const ownerResponse = await fetch(SERPER_URL, {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: ownerQuery,
          num: 5,
        }),
      });

      if (ownerResponse.ok) {
        const ownerData = await ownerResponse.json();
        
        if (ownerData.organic) {
          for (const result of ownerData.organic) {
            const contact = extractWebsiteContact(result, company, industry, location);
            if (contact) {
              contacts.push(contact);
              break; // Just get one
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error searching owner for ${company.name}:`, error);
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
            companies.push({
              name: place.title,
              website: place.website || null,
              phone: place.phone || null,
              address: place.address || null,
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
            companies.push({
              name: companyName,
              website: website,
              phone: null,
              address: null,
            });
          }
        }
      }
    }

    // Step 2: Find contacts for each company (limit to first 8 to save API calls)
    const allContacts: Contact[] = [];
    const companiesToProcess = companies.slice(0, 8);
    
    for (const company of companiesToProcess) {
      const contacts = await findCompanyContacts(company, industry, location);
      allContacts.push(...contacts);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Filter to only include contacts with at least one contact method
    const validContacts = allContacts.filter(c => 
      c.linkedin_url || c.email || c.phone
    );

    return NextResponse.json({
      leads: validContacts,
      total: validContacts.length,
      companies_searched: companiesToProcess.length,
    });

  } catch (error) {
    console.error('Error searching leads:', error);
    return NextResponse.json({ error: 'Failed to search for leads' }, { status: 500 });
  }
}

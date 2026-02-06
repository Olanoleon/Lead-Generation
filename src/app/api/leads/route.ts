import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET /api/leads - Get leads for a search iteration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get('searchId');
    const limit = searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '0';
    
    if (!searchId) {
      return NextResponse.json({ error: 'searchId is required' }, { status: 400 });
    }
    
    const leads = await sql`
      SELECT * FROM leads 
      WHERE search_iteration_id = ${parseInt(searchId)}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)}
      OFFSET ${parseInt(offset)}
    `;
    
    const countResult = await sql`
      SELECT COUNT(*) as total FROM leads 
      WHERE search_iteration_id = ${parseInt(searchId)}
    `;
    
    return NextResponse.json({
      data: leads,
      total: parseInt(countResult[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

// POST /api/leads - Add leads to a search iteration
export async function POST(request: NextRequest) {
  try {
    const { searchId, leads } = await request.json();
    
    if (!searchId || !leads || !Array.isArray(leads)) {
      return NextResponse.json({ error: 'searchId and leads array are required' }, { status: 400 });
    }
    
    const insertedLeads = [];
    
    for (const lead of leads) {
      const result = await sql`
        INSERT INTO leads (
          search_iteration_id,
          company_name,
          contact_name,
          job_title,
          email,
          phone,
          linkedin_url,
          website,
          industry,
          location,
          company_size,
          additional_info
        ) VALUES (
          ${searchId},
          ${lead.company_name || null},
          ${lead.contact_name || null},
          ${lead.job_title || null},
          ${lead.email || null},
          ${lead.phone || null},
          ${lead.linkedin_url || null},
          ${lead.website || null},
          ${lead.industry || null},
          ${lead.location || null},
          ${lead.company_size || null},
          ${JSON.stringify(lead.additional_info || {})}
        )
        RETURNING *
      `;
      insertedLeads.push(result[0]);
    }
    
    // Update search status to completed
    await sql`
      UPDATE search_iterations 
      SET status = 'completed'
      WHERE id = ${searchId}
    `;
    
    return NextResponse.json({ 
      inserted: insertedLeads.length,
      leads: insertedLeads 
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding leads:', error);
    return NextResponse.json({ error: 'Failed to add leads' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET /api/searches - Get all search iterations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '1';
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    
    const searches = await sql`
      SELECT * FROM search_iterations 
      WHERE user_id = ${parseInt(userId)}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)}
      OFFSET ${parseInt(offset)}
    `;
    
    const countResult = await sql`
      SELECT COUNT(*) as total FROM search_iterations 
      WHERE user_id = ${parseInt(userId)}
    `;
    
    return NextResponse.json({
      data: searches,
      total: parseInt(countResult[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching searches:', error);
    return NextResponse.json({ error: 'Failed to fetch searches' }, { status: 500 });
  }
}

// POST /api/searches - Create a new search iteration
export async function POST(request: NextRequest) {
  try {
    const { userId, industry, location } = await request.json();
    
    if (!industry || !location) {
      return NextResponse.json({ error: 'Industry and location are required' }, { status: 400 });
    }
    
    // Use default user if not provided
    const effectiveUserId = userId || 1;
    
    const result = await sql`
      INSERT INTO search_iterations (user_id, industry, location, status) 
      VALUES (${effectiveUserId}, ${industry}, ${location}, 'processing')
      RETURNING *
    `;
    
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating search:', error);
    return NextResponse.json({ error: 'Failed to create search' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET /api/criteria - Get all saved criteria
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '1';
    
    const criteria = await sql`
      SELECT * FROM saved_criteria 
      WHERE user_id = ${parseInt(userId)}
      ORDER BY created_at DESC
    `;
    
    return NextResponse.json(criteria);
  } catch (error) {
    console.error('Error fetching criteria:', error);
    return NextResponse.json({ error: 'Failed to fetch criteria' }, { status: 500 });
  }
}

// POST /api/criteria - Create new saved criteria
export async function POST(request: NextRequest) {
  try {
    const { userId, name, industry, location, filters } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    const effectiveUserId = userId || 1;
    
    const result = await sql`
      INSERT INTO saved_criteria (user_id, name, industry, location, filters) 
      VALUES (${effectiveUserId}, ${name}, ${industry || null}, ${location || null}, ${JSON.stringify(filters || {})})
      RETURNING *
    `;
    
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating criteria:', error);
    return NextResponse.json({ error: 'Failed to create criteria' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET /api/criteria/[id] - Get a specific criteria
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    const result = await sql`
      SELECT * FROM saved_criteria WHERE id = ${id}
    `;
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'Criteria not found' }, { status: 404 });
    }
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching criteria:', error);
    return NextResponse.json({ error: 'Failed to fetch criteria' }, { status: 500 });
  }
}

// PATCH /api/criteria/[id] - Update a criteria
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const { name, industry, location, filters } = await request.json();
    
    const result = await sql`
      UPDATE saved_criteria 
      SET 
        name = COALESCE(${name}, name),
        industry = ${industry || null},
        location = ${location || null},
        filters = COALESCE(${filters ? JSON.stringify(filters) : null}, filters)
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'Criteria not found' }, { status: 404 });
    }
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating criteria:', error);
    return NextResponse.json({ error: 'Failed to update criteria' }, { status: 500 });
  }
}

// DELETE /api/criteria/[id] - Delete a criteria
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    await sql`DELETE FROM saved_criteria WHERE id = ${id}`;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting criteria:', error);
    return NextResponse.json({ error: 'Failed to delete criteria' }, { status: 500 });
  }
}

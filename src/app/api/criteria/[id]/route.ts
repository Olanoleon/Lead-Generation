import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/criteria/[id] - Get a specific criteria
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const criteriaId = parseInt(id);
    
    const result = await sql`
      SELECT * FROM saved_criteria WHERE id = ${criteriaId}
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
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const criteriaId = parseInt(id);
    const { name, industry, location, filters } = await request.json();
    
    const result = await sql`
      UPDATE saved_criteria 
      SET 
        name = COALESCE(${name}, name),
        industry = ${industry || null},
        location = ${location || null},
        filters = COALESCE(${filters ? JSON.stringify(filters) : null}, filters)
      WHERE id = ${criteriaId}
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
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const criteriaId = parseInt(id);
    
    await sql`DELETE FROM saved_criteria WHERE id = ${criteriaId}`;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting criteria:', error);
    return NextResponse.json({ error: 'Failed to delete criteria' }, { status: 500 });
  }
}

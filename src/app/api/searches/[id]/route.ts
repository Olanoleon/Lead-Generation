import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/searches/[id] - Get a specific search iteration
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const searchId = parseInt(id);
    
    const result = await sql`
      SELECT * FROM search_iterations WHERE id = ${searchId}
    `;
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching search:', error);
    return NextResponse.json({ error: 'Failed to fetch search' }, { status: 500 });
  }
}

// PATCH /api/searches/[id] - Update a search iteration (e.g., status)
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const searchId = parseInt(id);
    const { status } = await request.json();
    
    const result = await sql`
      UPDATE search_iterations 
      SET status = ${status}
      WHERE id = ${searchId}
      RETURNING *
    `;
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating search:', error);
    return NextResponse.json({ error: 'Failed to update search' }, { status: 500 });
  }
}

// DELETE /api/searches/[id] - Delete a search iteration
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const searchId = parseInt(id);
    
    await sql`DELETE FROM search_iterations WHERE id = ${searchId}`;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting search:', error);
    return NextResponse.json({ error: 'Failed to delete search' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET /api/users - Get all users or create default user
export async function GET() {
  try {
    let users = await sql`SELECT * FROM users ORDER BY created_at DESC`;
    
    // Create default user if none exists
    if (users.length === 0) {
      await sql`
        INSERT INTO users (name, email) 
        VALUES ('Alex Rivera', 'alex@company.com')
      `;
      users = await sql`SELECT * FROM users ORDER BY created_at DESC`;
    }
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json();
    
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }
    
    const result = await sql`
      INSERT INTO users (name, email) 
      VALUES (${name}, ${email})
      RETURNING *
    `;
    
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

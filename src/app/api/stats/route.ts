import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET /api/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '1';
    
    // Total leads generated
    const leadsResult = await sql`
      SELECT COALESCE(SUM(total_leads), 0) as total_leads
      FROM search_iterations
      WHERE user_id = ${parseInt(userId)}
    `;
    
    // Total search runs
    const searchesResult = await sql`
      SELECT COUNT(*) as total_searches
      FROM search_iterations
      WHERE user_id = ${parseInt(userId)}
    `;
    
    // Most successful industry (most leads)
    const industryResult = await sql`
      SELECT industry, SUM(total_leads) as lead_count
      FROM search_iterations
      WHERE user_id = ${parseInt(userId)} AND total_leads > 0
      GROUP BY industry
      ORDER BY lead_count DESC
      LIMIT 1
    `;
    
    // Recent activity (last 7 days vs previous 7 days for growth calculation)
    const recentResult = await sql`
      SELECT COALESCE(SUM(total_leads), 0) as recent_leads
      FROM search_iterations
      WHERE user_id = ${parseInt(userId)}
      AND created_at >= NOW() - INTERVAL '7 days'
    `;
    
    const previousResult = await sql`
      SELECT COALESCE(SUM(total_leads), 0) as previous_leads
      FROM search_iterations
      WHERE user_id = ${parseInt(userId)}
      AND created_at >= NOW() - INTERVAL '14 days'
      AND created_at < NOW() - INTERVAL '7 days'
    `;
    
    const recentLeads = parseInt(recentResult[0].recent_leads);
    const previousLeads = parseInt(previousResult[0].previous_leads);
    const growthPercent = previousLeads > 0 
      ? ((recentLeads - previousLeads) / previousLeads * 100).toFixed(1)
      : recentLeads > 0 ? '100' : '0';
    
    return NextResponse.json({
      totalLeads: parseInt(leadsResult[0].total_leads),
      totalSearches: parseInt(searchesResult[0].total_searches),
      topIndustry: industryResult[0]?.industry || 'N/A',
      growthPercent: parseFloat(growthPercent as string)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

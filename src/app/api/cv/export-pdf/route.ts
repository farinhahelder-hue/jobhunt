import { NextRequest, NextResponse } from 'next/server';

const RENDER_SCRAPER_URL = process.env.RENDER_SCRAPER_URL || 'https://jobhunt-y03c.onrender.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { html } = body;

    if (!html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    // Call the Render service to export PDF
    const response = await fetch(`${RENDER_SCRAPER_URL}/export-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to generate PDF', details: errorText },
        { status: response.status }
      );
    }

    // Get the PDF buffer
    const pdfBuffer = await response.arrayBuffer();

    // Return the PDF as a stream
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="cv.pdf"',
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { error: 'Failed to export PDF', details: String(error) },
      { status: 500 }
    );
  }
}
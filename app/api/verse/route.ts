import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const book = searchParams.get('book'); // 'bg' or 'sb'
  const verse = searchParams.get('verse'); // e.g., '1.1' or '1.1.1'

  if (!book || !verse) {
    return NextResponse.json({ error: 'Missing book or verse' }, { status: 400 });
  }

  // Map verse format to URL path
  // bg: 1.1 -> 1/1
  // sb: 1.1.1 -> 1/1/1
  const path = verse.replace(/\./g, '/');
  const url = `https://prabhupadabooks.com/${book}/${path}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Verse not found' }, { status: 404 });
      }
      throw new Error(`Failed to fetch from prabhupadabooks.com: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // prabhupadabooks.com structure refinement
    const title = $('h1').first().text().trim();
    
    // Verse text (Sanskrit/Transliteration)
    const verseParts: string[] = [];
    $('.verse-text').each((i, el) => {
      const text = $(el).text().trim();
      if (text) verseParts.push(text);
    });
    
    let verseText = verseParts.join('\n');
    
    // Fallbacks if .verse-text wasn't found
    if (!verseText) {
      verseText = $('.sanskrit').text().trim() || 
                  $('.verse').text().trim() ||
                  $('#verse').text().trim();
    }
    
    // Translation
    let translation = $('.translation').text().trim() || 
                      $('#translation').text().trim();
    
    // Purport
    let purport = $('.purport').text().trim() || 
                  $('#purport').text().trim();

    // If specific classes fail, try to find by common patterns
    if (!translation || !purport) {
      // Sometimes the content is just paragraphs after a certain header
      $('p, div').each((i, el) => {
        const text = $(el).text().trim();
        if (text.startsWith('TRANSLATION') && !translation) {
          translation = text.replace('TRANSLATION', '').trim();
        } else if (text.startsWith('PURPORT') && !purport) {
          // Purport might span multiple paragraphs
          const purportParts: string[] = [];
          $(el).nextAll('p').each((j, pEl) => {
            const pText = $(pEl).text().trim();
            if (pText) purportParts.push(pText);
          });
          purport = purportParts.join('\n\n');
        }
      });
    }

    // Final fallback: if still empty, try to get anything from the main content area
    if (!translation && !purport) {
      const mainContent = $('.wrapper .content').text().trim() || $('#content').text().trim();
      if (mainContent) {
        translation = "Content extracted from page (could not parse specific sections).";
        purport = mainContent;
      }
    }

    return NextResponse.json({
      title,
      verseText,
      translation,
      purport,
      url
    });
  } catch (error: any) {
    console.error('Error fetching verse:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

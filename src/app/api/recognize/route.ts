// app/api/recognize/route.ts
import { NextResponse } from 'next/server';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

export async function POST(req: Request) {
  try {
    console.log('Recognize request received');

    const { imageUrl, mode } = await req.json();

    if (!imageUrl) {
      console.log('No imageUrl provided');
      return NextResponse.json({ error: 'No image URL' }, { status: 400 });
    }

    console.log('Image URL:', imageUrl, 'Mode:', mode);

    if (!process.env.GROK_API_KEY) {
      console.error('GROK_API_KEY missing');
      return NextResponse.json({ error: 'Grok API key missing' }, { status: 500 });
    }

    const prompt = mode === 'movie'
      ? `You are an expert movie recognition AI. Analyze this movie poster or screenshot.
         Return structured JSON only:
         {
           "title": "电影名称（原名和中文译名）",
           "year": "年份",
           "rating": "豆瓣/IMDB评分（如果知道）",
           "actors": ["演员1", "演员2", ...],
           "description": "简短剧情或特点描述（50字内）"
         }`
      : `You are an expert actor/actress recognition AI. Analyze this photo.
         Return structured JSON only:
         {
           "name": "演员中文名 / 英文名",
           "info": "基本信息、出道年份、代表作品等（150字内）"
         }`;

    console.log('Calling Grok API with prompt length:', prompt.length);

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-beta', // 或 'grok-2-vision' 等，确认你的模型支持图像
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    console.log('Grok API response status:', response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error('Grok API error:', response.status, errText);
      throw new Error(`Grok API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    console.log('Grok response data received');

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content from Grok');

    let jsonStr = content;
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1]?.split('```')[0]?.trim() || jsonStr;
    }

    const parsed = JSON.parse(jsonStr.trim());
    console.log('Parsed result:', parsed);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Recognize failed:', error.message, error.stack);
    return NextResponse.json(
      { error: error.message || 'Recognition failed - check Vercel logs' },
      { status: 500 }
    );
  }
}
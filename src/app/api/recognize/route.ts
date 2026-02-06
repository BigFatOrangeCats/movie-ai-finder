// app/api/recognize/route.ts
import { NextResponse } from 'next/server';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions'; // 2026 年 Grok API 端点（请确认最新文档）

export async function POST(req: Request) {
  try {
    const { imageUrl, mode } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL' }, { status: 400 });
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

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-beta', // 或最新模型名，如 grok-2-vision 等，请查官方文档
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

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Grok API error: ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('No response from Grok');

    // 尝试解析 JSON（Grok 有时会加多余文字）
    let jsonStr = content;
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    }

    const parsed = JSON.parse(jsonStr.trim());

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || '识别失败' },
      { status: 500 }
    );
  }
}
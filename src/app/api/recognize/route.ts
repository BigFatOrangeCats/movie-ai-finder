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

    let prompt = '';

    if (mode === 'movie') {
      prompt = `你是一个专业的电影识别专家。请分析这张图片（电影海报、截图或剧照），判断是否为成人内容（AV）。以严格的 JSON 格式返回以下信息。所有字段必须存在，即使找不到也写 "暂无" 或空数组 []。不要添加额外文字，只返回纯 JSON。

      如果是正常电影：
      {
        "title": "电影完整名称（原名 + 中文译名）",
        "year": "上映年份",
        "rating": "评分（豆瓣/IMDB 平均分，数字 1-10，如果没有写 0）",
        "actors": ["演员1", "演员2", ...] 或 [],
        "watchLinks": ["合法观看链接1（如Netflix、Bilibili等）", ...] 或 ["暂无"],
        "downloadLinks": ["合法下载链接1", ...] 或 ["暂无"],
        "torrent": "磁力链接或BT种子（仅限合法公开资源，否则 '暂无')",
        "description": "电影简介或特点描述（100字以内）",
        "isAV": false
      }

      如果是成人内容（AV）：
      {
        "title": "AV标题或番号（如 ABC-123）",
        "year": "发行年份",
        "rating": "评分（如果有，数字 1-10，否则 0）",
        "actors": ["女优1", "女优2", ...] 或 [],
        "watchLinks": ["暂无（不提供AV观看链接）"],
        "downloadLinks": ["暂无（不提供AV下载链接）"],
        "torrent": "暂无（不提供种子）",
        "description": "AV简介（剧情、时长、类型等，100字以内）",
        "isAV": true
      }`;
    } else {
      prompt = `你是一个专业的演员/女优识别专家。请分析这张图片（演员照片或截图），判断是否为成人内容相关。以严格的 JSON 格式返回以下信息。所有字段必须存在，即使找不到也写 "暂无" 或空数组 []。不要添加额外文字，只返回纯 JSON。

      {
        "name": "演员完整名称（中文 / 英文 / 艺名）",
        "info": "演员介绍（出生年月、国籍、出道时间、身高、三围、代表特点等，150字以内）",
        "movies": ["电影名或AV作品名 (年份)", ...] 或 []，列出 3-8 部最知名代表作
      }`;
    }

    console.log('Calling Grok API with prompt length:', prompt.length);

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4-fast-reasoning', // 或你当前用的模型
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
        max_tokens: 800,
      }),
    });

    console.log('Grok API response status:', response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error('Grok API error:', response.status, errText);
      throw new Error(`Grok API error: ${response.status} - ${errText}`);
    }

    const grokData = await response.json();
    console.log('Grok response data received');

    const content = grokData.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content from Grok');

    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    }

    const parsed = JSON.parse(jsonStr);
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
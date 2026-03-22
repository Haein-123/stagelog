import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) return NextResponse.json({ items: [] });

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/image?query=${encodeURIComponent(query + " 뮤지컬 포스터")}&display=5&sort=sim`,
      {
        headers: {
          'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID || '',
          'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET || '',
        },
      }
    );

    const data = await res.json();
    
    // 네이버 이미지 API 결과(link)를 프론트엔드 image_url 형식에 맞춤
    const formattedItems = data.items?.map((item: any) => ({
      title: item.title.replace(/<[^>]*>?/gm, ''),
      thumbnail: item.thumbnail 
    })) || [];

    return NextResponse.json({ items: formattedItems });
  } catch (error) {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
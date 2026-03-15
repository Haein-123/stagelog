import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) return NextResponse.json({ items: [] });

  // 네이버 지식백과(encyc) 검색 API를 사용하여 공연 정보를 가져옵니다.
  const res = await fetch(
    `https://openapi.naver.com/v1/search/encyc.json?query=${encodeURIComponent(query)}&display=5`,
    {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID || '',
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET || '',
      },
    }
  );

  const data = await res.json();
  return NextResponse.json(data);
}
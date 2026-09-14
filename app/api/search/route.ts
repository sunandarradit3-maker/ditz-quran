import { NextRequest, NextResponse } from 'next/server';
export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams.get('q')?.trim(); if(!q) return NextResponse.json({data:[]});
 try{const u=`https://api.alquran.cloud/v1/search/${encodeURIComponent(q)}/all/id.indonesian`; const r=await fetch(u,{next:{revalidate:3600}}); if(!r.ok) throw new Error('bad'); const j=await r.json(); return NextResponse.json(j)}catch{return NextResponse.json({error:'Pencarian gagal.'},{status:502})}
}

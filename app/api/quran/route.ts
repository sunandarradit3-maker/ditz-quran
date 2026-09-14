import { NextRequest, NextResponse } from 'next/server';
const base='https://api.alquran.cloud/v1';
export async function GET(req:NextRequest){
 const p=req.nextUrl.searchParams; const juz=p.get('juz'); const surah=p.get('surah'); const mode=p.get('mode')||'juz';
 try{
  let urlText=''; let urlTr='';
  if(surah){urlText=`${base}/surah/${encodeURIComponent(surah)}/quran-uthmani`; urlTr=`${base}/surah/${encodeURIComponent(surah)}/id.indonesian`}
  else {const n=Math.min(30,Math.max(1,Number(juz||1))); urlText=`${base}/juz/${n}/quran-uthmani`; urlTr=`${base}/juz/${n}/id.indonesian`}
  const [a,b]=await Promise.all([fetch(urlText,{next:{revalidate:86400}}),fetch(urlTr,{next:{revalidate:86400}})]);
  if(!a.ok||!b.ok) return NextResponse.json({error:'Sumber Qur’an sedang tidak tersedia.'},{status:502});
  const [ta,tb]=await Promise.all([a.json(),b.json()]);
  const arab=ta.data?.ayahs||ta.data?.surahs?.[0]?.ayahs||[]; const id=tb.data?.ayahs||tb.data?.surahs?.[0]?.ayahs||[];
  const map=new Map(id.map((x:any)=>[x.number,x.text]));
  const ayahs=arab.map((x:any)=>({...x,translation:map.get(x.number),audio:`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${x.number}.mp3`}));
  return NextResponse.json({mode,juz:juz?Number(juz):null,surah:surah?Number(surah):null,ayahs});
 }catch(e){return NextResponse.json({error:'Gagal mengambil data Qur’an.'},{status:500})}
}

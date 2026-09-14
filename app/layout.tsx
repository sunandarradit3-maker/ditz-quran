import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'DiTz Qur’an — Baca, Dengarkan & Belajar',description:'Platform Al-Qur’an digital dari DiTz Store untuk membaca, mendengarkan murottal, dan belajar Iqro.',manifest:'/manifest.webmanifest'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>}

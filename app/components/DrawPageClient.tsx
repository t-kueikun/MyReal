'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import DrawingCanvas, { DrawingCanvasHandle } from './DrawingCanvas';
import PalettePicker from './PalettePicker';
import { saveImageBlob } from '../../lib/clientStorage';
import { saveDraft } from '../../lib/draft';
import Link from 'next/link';
import { ChevronLeft, Check, SlidersHorizontal } from 'lucide-react';

const DEFAULT_PALETTE = ['#f08f6f', '#f3c969', '#5a9bd8'];

export default function DrawPageClient() {
    const router = useRouter();
    const drawingRef = useRef<DrawingCanvasHandle | null>(null);
    const [palette, setPalette] = useState(DEFAULT_PALETTE);
    const [bgRemove, setBgRemove] = useState(true);
    const [busy, setBusy] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const handleNext = async () => {
        setBusy(true);
        try {
            const blob = (await drawingRef.current?.exportBlob()) ?? null;
            if (!blob) {
                alert('描画してください');
                return;
            }

            const { nanoid } = await import('nanoid');
            const draftId = nanoid(10);

            await saveImageBlob('input', blob, draftId);
            saveDraft({
                palette,
                bgRemove,
                source: 'draw'
            }, draftId);

            router.push(`/generate/${draftId}`);
        } catch (e) {
            console.error(e);
            alert('エラーが発生しました');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-paper overflow-hidden">
            {/* Header */}
            <header className="flex-none flex items-center justify-between p-4 z-10">
                <Link href="/" className="btn btn-ghost rounded-full w-12 h-12 p-0 flex items-center justify-center">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="font-heading text-xl">描く</h1>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`btn rounded-full w-12 h-12 p-0 flex items-center justify-center ${showSettings ? 'bg-ink/10' : 'btn-ghost'}`}
                >
                    <SlidersHorizontal className="w-5 h-5" />
                </button>
            </header>

            {/* Main Canvas Area - maximized */}
            <main className="flex-1 relative w-full h-full p-2 md:p-6 flex items-center justify-center bg-paper-2/50">
                <div className="relative w-full h-full max-w-3xl max-h-[85vh] shadow-xl md:rounded-3xl overflow-hidden bg-white border border-white/60">
                    <DrawingCanvas ref={drawingRef} />
                </div>
            </main>

            {/* Settings Overlay / Modal */}
            {showSettings && (
                <div className="absolute top-16 right-4 z-20 w-72 card p-5 animate-in slide-in-from-top-2 fade-in space-y-4 shadow-2xl">
                    <div>
                        <label className="text-xs font-bold text-ink/50 uppercase tracking-widest mb-2 block">カラーパレット</label>
                        <PalettePicker value={palette} onChange={setPalette} />
                    </div>
                    <div className="border-t border-ink/10 pt-3">
                        <label className="flex items-center gap-3 text-sm font-medium">
                            <input
                                type="checkbox"
                                checked={bgRemove}
                                onChange={(e) => setBgRemove(e.target.checked)}
                                className="w-5 h-5 accent-accent"
                            />
                            背景除去（推奨）
                        </label>
                    </div>
                </div>
            )}

            {/* Floating Action Button for Next */}
            <div className="absolute bottom-6 right-6 z-20">
                <button
                    onClick={handleNext}
                    disabled={busy}
                    className="h-16 px-8 rounded-full bg-ink text-white shadow-lift flex items-center gap-3 font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
                >
                    {busy ? '処理中...' : (
                        <>
                            <span>次へ</span>
                            <Check className="w-5 h-5" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

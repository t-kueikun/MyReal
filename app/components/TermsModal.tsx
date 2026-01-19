'use client';

import React from 'react';

type TermsModalProps = {
    onAgree: () => void;
    onCancel: () => void;
};

export default function TermsModal({ onAgree, onCancel }: TermsModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onCancel}
            />

            {/* Modal Content */}
            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/5 animate-scaleIn">
                <div className="p-6 md:p-8">
                    <h2 className="mb-4 text-center font-heading text-2xl font-bold text-ink">
                        利用規約
                    </h2>

                    <div className="mb-6 h-64 overflow-y-auto rounded-xl border border-ink/10 bg-paper-2 p-4 text-sm text-ink/70">
                        <p className="mb-4">
                            <strong>1. プライバシーについて</strong><br />
                            生成された画像データは、体験日から最大48時間サーバーに保存され、その後自動的に削除されます。
                        </p>
                        <p className="mb-4">
                            <strong>2. 禁止事項</strong><br />
                            公序良俗に反する画像、他人の権利を侵害する画像の生成は禁止されています。
                        </p>
                        <p className="mb-4">
                            <strong>3. 免責事項</strong><br />
                            本サービスの使用によって生じた損害について、運営者は一切の責任を負いません。
                        </p>
                        <p>
                            サービスを利用することで、上記の内容に同意したものとみなされます。
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onAgree}
                            className="btn btn-primary w-full shadow-lg"
                        >
                            同意してはじめる
                        </button>
                        <button
                            onClick={onCancel}
                            className="btn btn-ghost w-full"
                        >
                            キャンセル
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

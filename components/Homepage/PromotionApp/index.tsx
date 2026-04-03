"use client";

import AppStoreIcon from "@/components/assets/Icon/AppStoreIcon";
import PlayStoreIcon from "@/components/assets/Icon/PlayStoreIcon";
import ViatorBanner from "@/components/viator/widget/ViatorBanner";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** 
 * Scales the 728px Viator banner iframe proportionally to fit any screen width.
 * Without this, the fixed-width iframe overflows on mobile and breaks the layout.
 */
function ResponsiveViatorBanner() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const BANNER_WIDTH = 728;
    const BANNER_HEIGHT = 90;

    useEffect(() => {
        function updateScale() {
            if (!wrapperRef.current) return;
            const containerWidth = wrapperRef.current.offsetWidth;
            const newScale = Math.min(1, containerWidth / BANNER_WIDTH);
            setScale(newScale);
        }

        updateScale();
        window.addEventListener("resize", updateScale);
        return () => window.removeEventListener("resize", updateScale);
    }, []);

    return (
        // Outer wrapper — full width, height collapses to the scaled banner height
        <div
            ref={wrapperRef}
            className="w-full overflow-hidden"
            style={{ height: `${BANNER_HEIGHT * scale}px` }}
        >
            {/* Inner div is always 728px wide but scaled down with CSS transform */}
            <div
                style={{
                    width: `${BANNER_WIDTH}px`,
                    transformOrigin: "top left",
                    transform: `scale(${scale})`,
                }}
            >
                <ViatorBanner
                    partnerId="P00292613"
                    width={BANNER_WIDTH}
                    height={BANNER_HEIGHT}
                    language="en"
                    selection="banner2"
                />
            </div>
        </div>
    );
}

export default function PromotionApp() {
    return (
        <section className="w-full flex flex-col justify-center items-center px-4 md:py-20 py-10">

            {/* ── Viator Banner (responsively scaled) ───────────────────── */}
            <div className="w-full max-w-[728px]">
                <ResponsiveViatorBanner />
            </div>

            {/* ── App Promotion Card ─────────────────────────────────────── */}
            <div className="w-full max-w-[728px] bg-white rounded-b-2xl shadow-md p-6 md:p-10">

                <div className="flex flex-col sm:flex-row items-center gap-6">

                    {/* Images */}
                    <div className="flex justify-center gap-4 shrink-0">
                        <img
                            src="/images/iklan/balinews.png"
                            alt="Bali News App"
                            className="w-20 sm:w-24 md:w-28 lg:w-32 rounded-xl object-cover"
                        />
                        <img
                            src="/images/iklan/balinews-homepage.png"
                            alt="Bali News App Preview"
                            className="w-20 sm:w-24 md:w-28 lg:w-32 rounded-xl object-cover"
                        />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 min-w-0">

                        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                            Download Bali News App
                        </h2>

                        <p className="text-sm md:text-base text-gray-500 mt-2">
                            Get the latest updates, news, and inspiring stories from Bali.
                        </p>

                        {/* Store buttons */}
                        <div className="flex flex-row flex-wrap justify-center sm:justify-start gap-3 mt-4">
                            <Link
                                href="https://apps.apple.com/id/app/bali-news/id6504162210"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <AppStoreIcon className="w-32 sm:w-36 md:w-40 cursor-pointer hover:opacity-80 transition" />
                            </Link>
                            <Link
                                href="https://play.google.com/store/apps/details?id=com.arijaya.balinews"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <PlayStoreIcon className="w-32 sm:w-36 md:w-40 cursor-pointer hover:opacity-80 transition" />
                            </Link>
                        </div>

                    </div>

                </div>

            </div>
        </section>
    );
}
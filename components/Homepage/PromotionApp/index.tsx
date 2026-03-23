import AppStoreIcon from "@/components/assets/Icon/AppStoreIcon";
import PlayStoreIcon from "@/components/assets/Icon/PlayStoreIcon";
import Link from "next/link";

export default function PromotionApp() {
    return (
        <section className="w-full flex justify-center items-center bg-gray-50 p-4 rounded-2xl mb-5">
            <div className="w-full max-w-6xl bg-white rounded-2xl flex justify-center shadow-md p-6 md:p-10">

                <div className="flex flex-col lg:flex-row items-center gap-8">

                    {/* Images */}
                    <div className="flex justify-center gap-4 w-full md:w-auto">
                        <img
                            src="/images/iklan/balinews.png"
                            alt="Bali News App"
                            className="w-24 sm:w-28 md:w-32 rounded-xl object-cover"
                        />
                        <img
                            src="/images/iklan/balinews-homepage.png"
                            alt="Bali News App Preview"
                            className="w-24 sm:w-28 md:w-32 rounded-xl object-cover"
                        />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col items-center lg:items-start text-center md:text-left flex-1">

                        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                            Download Bali News App
                        </h2>

                        <p className="text-sm md:text-base text-gray-500 mt-2 max-w-md">
                            Get the latest updates, news, and inspiring stories from Bali.
                        </p>

                        {/* CTA (UNCHANGED STYLE) */}
                        <div className="flex flex-col sm:flex-row items-center sm:gap-4 mt-5">
                            <Link href={"https://apps.apple.com/id/app/bali-news/id6504162210"} target="_blank" className="">
                                <AppStoreIcon className="w-36 md:w-44 cursor-pointer hover:opacity-80 transition" />
                            </Link>
                            <Link href={"https://play.google.com/store/apps/details?id=com.arijaya.balinews"} target="_blank" className="">
                                <PlayStoreIcon className="w-36 md:w-44 cursor-pointer hover:opacity-80 transition" />
                            </Link>
                        </div>

                    </div>

                </div>

            </div>
        </section>
    );
}
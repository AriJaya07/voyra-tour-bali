export default function AboutDetail() {
    return (
        <div className="pt-[57px]">
            <div className="flex flex-col">
                <div className="mb-[20px] px-[16px] sm:px-[32px]">
                    <h1 className="text-[32px] text-black font-bold leading-[40px] sm:text-[28px] sm:leading-[36px]">
                        About Garuda Wisnu Kencana
                    </h1>
                </div>
                <div className="flex flex-col sm:flex-row bg-gradient-to-r from-[#01ACBB] to-[#C4E6E9] p-[20px] sm:p-[40px] rounded-lg">
                    <div className="text-[14px] sm:text-[16px] text-black leading-[22px] sm:leading-[28px] mb-[20px] sm:mb-0 sm:w-[50%] px-[16px]">
                        <p className="mb-[16px]">
                            Di Garuda Wisnu Kencana Cultural Park, pengunjung dapat menikmati kemegahan patung Garuda Wisnu Kencana yang menjadi ikon budaya dan simbol kebanggaan masyarakat Bali. Patung monumental ini berdiri megah di kawasan perbukitan kapur, menghadirkan panorama alam yang luas dan khas, sekaligus memberikan pengalaman visual yang mengesankan bagi wisatawan. Selain keindahan arsitektural dan lanskap alamnya, kawasan GWK juga dikenal sebagai pusat pelestarian seni dan budaya Bali.
                        </p>
                        <p className="mb-[16px]">
                            Berbagai pertunjukan seni tradisional Bali diselenggarakan secara rutin setiap hari untuk memperkenalkan kekayaan budaya lokal kepada pengunjung. Beberapa pentas seni yang dapat disaksikan antara lain Tari Kecak Garuda Wisnu yang sarat nilai filosofis, Tari BarAong yang menggambarkan unsur mitologi Bali, Tari Joged Bumbung yang bersifat interaktif dan menghibur, serta Tari Topeng yang menyampaikan cerita tradisional melalui ekspresi dan gerak tari. Pertunjukan-pertunjukan ini tidak hanya berfungsi sebagai hiburan, tetapi juga sebagai sarana edukasi budaya bagi wisatawan domestik maupun mancanegara.
                        </p>
                        <p className="">
                            Selain itu, GWK dilengkapi dengan area jalan kaki yang tertata rapi, berbagai spot foto ikonik dengan latar patung dan lanskap alam, serta fasilitas budaya dan hiburan yang dirancang untuk menunjang kenyamanan pengunjung. Dengan beragam daya tarik tersebut, Garuda Wisnu Kencana Cultural Park menjadi destinasi wisata budaya yang mampu menjangkau berbagai kalangan, mulai dari wisata keluarga, pelajar, hingga wisatawan yang tertarik pada seni dan sejarah Bali.
                        </p>
                    </div>
                    <div className="w-full sm:w-[50%]">
                        <img src={"/images/detail/main-detail.png"} alt="GWK" className="w-full h-auto object-cover" />
                    </div>
                </div>
            </div>
        </div>
    )
}

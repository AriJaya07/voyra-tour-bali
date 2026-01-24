import FooterIcon from "../../public/Icon/FooterIcon";
import VoryaIcon from "../../public/Icon/VoyraIcon";
import FacebookIcon from "../../public/sosmed/FacebookIcon";
import InstagramIcon from "../../public/sosmed/InstagramIcon";
import PartnerIcon from "../../public/sosmed/PartnerIcon";
import TelegramIcon from "../../public/sosmed/TelegramIcon";
import TiktokIcon from "../../public/sosmed/TiktokIcon";
import TwitterIcon from "../../public/sosmed/TwitterIcon";
import YoutubeIcon from "../../public/sosmed/YoutubeIcon";

export default function Footer() {
    return (
      <footer className="pt-20">
        {/* Top Accent */}
        <div className="h-[10px] bg-[#F06400]" />
  
        <div className="bg-[#1C2930] text-white">
          <div
            className="
              max-w-[1200px]
              mx-auto
              px-5
              py-10
              flex
              flex-col
              md:flex-row
              gap-10
              md:gap-6
              items-center
              md:items-start
              justify-between
            "
          >
            {/* Left - Logo */}
            <div className="flex-shrink-0">
                <div className="md:hidden block">
                    <VoryaIcon />
                </div>
                <div className="md:block hidden">
                    <FooterIcon />
                </div>
            </div>
  
            {/* Center */}
            <div className="flex flex-col items-center md:items-center text-center gap-6 flex-1">
              {/* Social title */}
              <p className="font-bold text-base">Follow us on</p>
  
              {/* Social icons */}
              <div
                className="
                  flex
                  flex-wrap
                  justify-center
                  gap-x-6
                  gap-y-3
                  text-sm
                "
              >
                {[
                  { icon: <FacebookIcon />, label: "Facebook" },
                  { icon: <InstagramIcon />, label: "Instagram" },
                  { icon: <TiktokIcon />, label: "TikTok" },
                  { icon: <YoutubeIcon />, label: "Youtube" },
                  { icon: <TwitterIcon />, label: "Twitter" },
                  { icon: <TelegramIcon />, label: "Telegram" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
  
              {/* Footer links */}
              <p className="text-sm leading-relaxed max-w-[700px]">
                Tentang Kami | Karir | Syarat & Ketentuan | Media | Kebijakan &
                Privasi | Hubungi Kami | Tanggapan | FAQ
              </p>
  
              <p className="text-xs opacity-80">
                Copyright © Voyra
              </p>
            </div>
  
            {/* Right - Partner */}
            <div className="flex-shrink-0">
              <PartnerIcon className="" />
            </div>
          </div>
        </div>
      </footer>
    )
  }
  
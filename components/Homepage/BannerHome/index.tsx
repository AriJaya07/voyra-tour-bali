export default function BannerHome() {
  return (
    <section
      id="home"
      className="relative min-h-[420px] md:min-h-[516px] flex items-center bg-cover bg-center"
      style={{ backgroundImage: "url('/images/banner.png')" }}
    >
      <div className="absolute inset-0 bg-black/50 sm:bg-black/40 md:bg-black/30" />

      <div className="relative z-10 w-full px-4 sm:px-8 md:px-16 lg:px-[147px]">
        <div className="max-w-4xl space-y-4 text-center sm:text-left drop-shadow-lg">
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-[96px] font-bold leading-tight text-white">
            Discover the Beauty of <span className="text-[#02ACBE]">BALI</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-white/90 max-w-xs sm:max-w-md md:max-w-xl">
            Explore the diverse culture of Bali and unforgettable experiences.
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:gap-6">
          <a href="/#tentang" target="_slef" className="cursor-pointer">
            <button className="h-12 w-full sm:w-auto px-6 border border-white rounded-lg text-white font-semibold hover:bg-white/10 transition">
              Learn More
            </button>
          </a>
          <a href="/#destinasi" target="_slef" className="cursor-pointer">
            <button className="h-12 w-full sm:w-auto px-6 bg-[#02B1BE] rounded-lg text-white font-semibold hover:bg-[#0299a5] transition">
              Start Your Journey
            </button>
          </a>
        </div>
      </div>
    </section>

  );
}

export default function BannerHome() {
  return (
    <section id="home"
      className="relative min-h-[420px] md:min-h-[516px] flex items-center overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/images/banner.png')" }} // Inline background image
    >
      {/* Overlay (optional, improves text readability) */}
      <div className="absolute inset-0 bg-black/30 -z-10" />

      {/* Content */}
      <div className="relative z-10 w-full px-4 sm:px-8 md:px-16 lg:px-[147px]">
        <div className="max-w-4xl space-y-3">
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-[96px] font-bold text-white leading-tight">
            Discover the Beauty of{" "}
            <span className="text-[#02ACBE]">BALI</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-white max-w-xl">
            Explore the diverse culture of Bali and unforgettable experiences.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button className="h-12 px-6 border border-white rounded-lg text-white font-semibold hover:bg-white/10 transition cursor-pointer">
            Learn More
          </button>

          <button className="h-12 px-6 bg-[#02B1BE] rounded-lg text-white font-semibold hover:bg-[#0299a5] transition cursor-pointer">
            Start Your Journey
          </button>
        </div>
      </div>
    </section>
  );
}

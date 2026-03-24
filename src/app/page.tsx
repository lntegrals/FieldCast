import Link from "next/link";
import {
  Mic,
  Sparkles,
  Send,
  Check,
  ArrowRight,
  Sprout,
  Clock,
  Users,
  Star,
  ChevronRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#F7F6F2]/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-[#3A7D44] rounded-xl flex items-center justify-center shadow-sm">
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#2E2E2E]">
                FieldCast
              </span>
            </Link>
            <nav className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/listings"
                className="px-3 py-2 text-sm font-medium text-[#2E2E2E]/60 hover:text-[#2E2E2E] transition-colors"
              >
                Browse
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold bg-[#3A7D44] text-white rounded-xl hover:bg-[#3A7D44]/90 transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Chip */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3A7D44]/10 text-[#3A7D44] text-sm font-medium animate-fade-in">
            <Sprout className="w-4 h-4" />
            Built for direct-market farmers
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#2E2E2E] leading-[1.1] tracking-tight animate-slide-up">
            Stop updating listings
            <br />
            <span className="text-[#3A7D44]">at night.</span>
          </h1>

          {/* Subtext */}
          <p className="text-lg sm:text-xl text-[#2E2E2E]/60 max-w-2xl mx-auto leading-relaxed animate-slide-up">
            FieldCast turns a 30-second voice note into a buyer-ready listing,
            so you can publish what&apos;s available while still in the field.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-[#3A7D44] text-white font-semibold rounded-2xl hover:bg-[#3A7D44]/90 transition-all shadow-lg shadow-[#3A7D44]/20 text-lg"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 px-8 py-4 border border-gray-300 bg-white text-[#2E2E2E] font-semibold rounded-2xl hover:bg-gray-50 transition-all text-lg"
            >
              Browse Local Produce
            </Link>
          </div>

          {/* Visual: Voice-to-listing flow */}
          <div className="relative max-w-lg mx-auto pt-8">
            <div className="flex items-center justify-center gap-3 sm:gap-6">
              {/* Mic */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#3A7D44] flex items-center justify-center shadow-lg shadow-[#3A7D44]/20">
                  <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <span className="text-xs text-[#2E2E2E]/40 font-medium">
                  Speak
                </span>
              </div>

              {/* Arrow */}
              <div className="flex items-center">
                <div className="w-8 sm:w-12 h-0.5 bg-[#DFAF2B]" />
                <Sparkles className="w-5 h-5 text-[#DFAF2B] -mx-1" />
                <div className="w-8 sm:w-12 h-0.5 bg-[#DFAF2B]" />
              </div>

              {/* Listing card preview */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-[#3A7D44]/20 flex items-center justify-center shadow-sm">
                  <div className="text-center">
                    <div className="text-xs font-bold text-[#3A7D44]">
                      $4/lb
                    </div>
                    <div className="text-[8px] sm:text-[10px] text-[#2E2E2E]/40 mt-0.5">
                      Tomatoes
                    </div>
                  </div>
                </div>
                <span className="text-xs text-[#2E2E2E]/40 font-medium">
                  Listing
                </span>
              </div>

              {/* Arrow */}
              <div className="flex items-center">
                <div className="w-8 sm:w-12 h-0.5 bg-[#DFAF2B]" />
                <Send className="w-4 h-4 text-[#DFAF2B] -mx-1" />
                <div className="w-8 sm:w-12 h-0.5 bg-[#DFAF2B]" />
              </div>

              {/* Buyers */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#DFAF2B]/15 flex items-center justify-center">
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 text-[#DFAF2B]" />
                </div>
                <span className="text-xs text-[#2E2E2E]/40 font-medium">
                  Buyers
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <span className="text-sm font-semibold text-[#3A7D44] uppercase tracking-wider">
              How it works
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2E2E2E]">
              Three steps. Thirty seconds.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {/* Step 1 */}
            <div className="text-center space-y-4">
              <div className="relative mx-auto w-20 h-20">
                <div className="w-20 h-20 rounded-2xl bg-[#3A7D44]/10 flex items-center justify-center">
                  <Mic className="w-10 h-10 text-[#3A7D44]" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#3A7D44] text-white text-xs font-bold flex items-center justify-center shadow-sm">
                  1
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#2E2E2E]">Speak</h3>
              <p className="text-[#2E2E2E]/60 leading-relaxed">
                Record what you harvested in 30 seconds. Just talk naturally
                about what you picked, how much, and your price.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center space-y-4">
              <div className="relative mx-auto w-20 h-20">
                <div className="w-20 h-20 rounded-2xl bg-[#DFAF2B]/15 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-[#DFAF2B]" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#DFAF2B] text-[#2E2E2E] text-xs font-bold flex items-center justify-center shadow-sm">
                  2
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#2E2E2E]">Review</h3>
              <p className="text-[#2E2E2E]/60 leading-relaxed">
                AI creates a buyer-ready listing instantly. Check the details,
                tweak if needed, and you&apos;re ready to go.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center space-y-4">
              <div className="relative mx-auto w-20 h-20">
                <div className="w-20 h-20 rounded-2xl bg-[#3A7D44]/10 flex items-center justify-center">
                  <Send className="w-10 h-10 text-[#3A7D44]" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#3A7D44] text-white text-xs font-bold flex items-center justify-center shadow-sm">
                  3
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#2E2E2E]">Publish</h3>
              <p className="text-[#2E2E2E]/60 leading-relaxed">
                One tap to go live. Your subscribed buyers get notified
                immediately via email or SMS.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <span className="text-sm font-semibold text-[#3A7D44] uppercase tracking-wider">
              Why FieldCast
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2E2E2E]">
              Sell smarter, not harder
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#3A7D44]/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#3A7D44]" />
              </div>
              <h3 className="text-xl font-bold text-[#2E2E2E]">
                Keep your listings current — without the extra work
              </h3>
              <p className="text-[#2E2E2E]/60 leading-relaxed">
                No more typing out inventory updates after a long day in the
                field. Speak for 30 seconds while you load the truck, and your
                listing is ready before you get home.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#DFAF2B]/15 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#DFAF2B]" />
              </div>
              <h3 className="text-xl font-bold text-[#2E2E2E]">
                Spend less time answering &ldquo;what do you have?&rdquo;
              </h3>
              <p className="text-[#2E2E2E]/60 leading-relaxed">
                Buyers subscribe to your farm and get instant notifications when
                you post. They see exactly what&apos;s available, how much, and
                when to pick it up. Fewer texts, more sales.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#3A7D44]/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#3A7D44]" />
              </div>
              <h3 className="text-xl font-bold text-[#2E2E2E]">
                AI that speaks farmer
              </h3>
              <p className="text-[#2E2E2E]/60 leading-relaxed">
                Our AI understands produce shorthand and farm lingo. Say
                &ldquo;got about ten flats of berries, four bucks a
                pint&rdquo; and it creates a polished listing buyers will
                trust.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#DFAF2B]/15 flex items-center justify-center">
                <Star className="w-6 h-6 text-[#DFAF2B]" />
              </div>
              <h3 className="text-xl font-bold text-[#2E2E2E]">
                Build your farm&apos;s reputation
              </h3>
              <p className="text-[#2E2E2E]/60 leading-relaxed">
                Every listing strengthens your farm profile. Buyers discover you
                through the public feed, subscribe, and keep coming back week
                after week.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <span className="text-sm font-semibold text-[#3A7D44] uppercase tracking-wider">
              Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2E2E2E]">
              Start free. Grow when you&apos;re ready.
            </h2>
            <p className="text-[#2E2E2E]/50 max-w-lg mx-auto">
              No credit card required. Upgrade anytime as your farm grows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="rounded-2xl border border-gray-200 bg-[#F7F6F2] p-8 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#2E2E2E]">Free</h3>
                <div className="mt-2">
                  <span className="text-4xl font-bold text-[#2E2E2E]">$0</span>
                  <span className="text-[#2E2E2E]/40 text-sm">/month</span>
                </div>
                <p className="text-sm text-[#2E2E2E]/50 mt-2">
                  Perfect for getting started
                </p>
              </div>
              <ul className="space-y-3">
                <PricingFeature>5 listings per month</PricingFeature>
                <PricingFeature>Basic email notifications</PricingFeature>
                <PricingFeature>Public farm profile</PricingFeature>
                <PricingFeature>Voice-to-listing AI</PricingFeature>
              </ul>
              <Link
                href="/login"
                className="block text-center px-6 py-3 rounded-xl border border-gray-300 bg-white text-[#2E2E2E] font-semibold hover:bg-gray-50 transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Starter */}
            <div className="rounded-2xl border-2 border-[#3A7D44] bg-white p-8 space-y-6 relative shadow-lg shadow-[#3A7D44]/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#3A7D44] text-white text-xs font-bold rounded-full">
                Popular
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#2E2E2E]">Starter</h3>
                <div className="mt-2">
                  <span className="text-4xl font-bold text-[#3A7D44]">
                    $19
                  </span>
                  <span className="text-[#2E2E2E]/40 text-sm">/month</span>
                </div>
                <p className="text-sm text-[#2E2E2E]/50 mt-2">
                  For active market farmers
                </p>
              </div>
              <ul className="space-y-3">
                <PricingFeature>Unlimited listings</PricingFeature>
                <PricingFeature>SMS + email notifications</PricingFeature>
                <PricingFeature>Public farm profile</PricingFeature>
                <PricingFeature>Voice-to-listing AI</PricingFeature>
                <PricingFeature>Subscriber management</PricingFeature>
              </ul>
              <Link
                href="/login"
                className="block text-center px-6 py-3 rounded-xl bg-[#3A7D44] text-white font-semibold hover:bg-[#3A7D44]/90 transition-colors shadow-sm"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Grow */}
            <div className="rounded-2xl border border-gray-200 bg-[#F7F6F2] p-8 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#2E2E2E]">Grow</h3>
                <div className="mt-2">
                  <span className="text-4xl font-bold text-[#2E2E2E]">
                    $49
                  </span>
                  <span className="text-[#2E2E2E]/40 text-sm">/month</span>
                </div>
                <p className="text-sm text-[#2E2E2E]/50 mt-2">
                  For farms scaling up
                </p>
              </div>
              <ul className="space-y-3">
                <PricingFeature>Everything in Starter</PricingFeature>
                <PricingFeature>Priority support</PricingFeature>
                <PricingFeature>Listing analytics</PricingFeature>
                <PricingFeature>Higher notification volume</PricingFeature>
                <PricingFeature>Custom farm branding</PricingFeature>
              </ul>
              <Link
                href="/login"
                className="block text-center px-6 py-3 rounded-xl border border-gray-300 bg-white text-[#2E2E2E] font-semibold hover:bg-gray-50 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#3A7D44]/10 flex items-center justify-center">
            <Sprout className="w-8 h-8 text-[#3A7D44]" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2E2E2E]">
            Ready to sell smarter?
          </h2>
          <p className="text-lg text-[#2E2E2E]/60 max-w-xl mx-auto">
            Join farmers who are saving hours every week by turning voice notes
            into listings that sell.
          </p>
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 px-8 py-4 bg-[#3A7D44] text-white font-semibold rounded-2xl hover:bg-[#3A7D44]/90 transition-all shadow-lg shadow-[#3A7D44]/20 text-lg"
          >
            Create Your Free Account
            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <p className="text-sm text-[#2E2E2E]/40">
            Free forever for up to 5 listings. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#3A7D44] rounded-lg flex items-center justify-center">
              <Sprout className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-[#2E2E2E]">FieldCast</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#2E2E2E]/40">
            <Link
              href="/listings"
              className="hover:text-[#2E2E2E] transition-colors"
            >
              Browse
            </Link>
            <Link
              href="/login"
              className="hover:text-[#2E2E2E] transition-colors"
            >
              Sign In
            </Link>
          </div>
          <p className="text-sm text-[#2E2E2E]/30">
            &copy; {new Date().getFullYear()} FieldCast. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-[#2E2E2E]/70">
      <Check className="w-4 h-4 text-[#3A7D44] mt-0.5 flex-shrink-0" />
      {children}
    </li>
  );
}

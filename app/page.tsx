export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      <div className="max-w-4xl mx-auto px-6 py-24">
        {/* Hero */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 rounded-full px-4 py-1.5 text-sm font-medium">
            <span>Privacy-first</span>
            <span>·</span>
            <span>Your data stays in your browser</span>
          </div>

          <h1 className="text-5xl font-bold text-gray-900 leading-tight">
            See your running<br />
            <span className="text-orange-500">like never before</span>
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Rich visualisations of your Strava data — scatter plots, series charts,
            WMA age-grade contours, and powerful filters. All computed in your browser.
            Nothing stored on our servers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <a
              href="/api/auth/strava"
              className="inline-flex items-center gap-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-xl transition-colors shadow-lg shadow-orange-200"
            >
              Connect with Strava
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Rich Filters',
              description:
                'Slice your history by date, distance, average pace, or fastest split over any distance block.',
              icon: '🎚️',
            },
            {
              title: 'WMA Age Grades',
              description:
                'See contour lines showing what pace represents 50%, 60%, 70%+ age grade for your age and gender.',
              icon: '📊',
            },
            {
              title: 'Series Analysis',
              description:
                'Plot pace, heart rate, elevation, and cadence over distance or time for multiple runs at once.',
              icon: '📈',
            },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        {/* Privacy note */}
        <div className="mt-16 bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-2">How your privacy is protected</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            After you connect with Strava, your activity data is fetched directly by your
            browser and stored in your browser&apos;s local storage (IndexedDB). None of your
            activity data ever reaches our servers. We only handle the OAuth token exchange,
            which keeps your Strava API secret secure. You can inspect this in your browser&apos;s
            Network tab — you&apos;ll see requests going directly to strava.com.
          </p>
        </div>
      </div>
    </main>
  )
}

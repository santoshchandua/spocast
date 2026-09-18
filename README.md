# Spocast mobile

React Native / Expo SDK 55 cricket app (current display branding: Cricket Pulse). Backend: [spocast-server](https://github.com/santoshchandua/spocast-server).

Run Node 22+, npm ci, then npm start. Start the backend separately on port 4000. Set EXPO_PUBLIC_API_URL to its HTTPS origin for release builds. Local preview uses port 8081.

Includes scores, fixtures, commentary, AI narration playback, rankings, records, player/team history and achievements, mobile OTP sign-in with optional email, account privacy/session controls, plans and sponsor slots. Sports data is fictional until a licensed feed is configured. Audio/SMS/checkout are integration points requiring backend credentials. No provider secrets belong in this repository or in EXPO_PUBLIC variables.

Web hosted Razorpay checkout supports eligible UPI/AutoPay when the merchant enables it. Native digital purchases remain disabled pending store billing integration. This is a production-oriented foundation, not an approved commercial release.

Verification: npx expo export --platform all. Android/iOS/web bundles validated; physical-device testing, actual audio playback and store release review remain. Nine moderate Expo toolchain audit advisories remain for review. Read the backend security and deployment guides before release.

Latest update: Matches combines scores and fixtures with a top Fixtures filter. Series provides batting, bowling and fielding leaderboards. Backend migrations 005/006 add archive retention and series statistics; the API requires current migrations. Series data remains fictional until the licensed importer is configured.

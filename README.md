# EPISODIA

A social TV diary for discovering series, tracking what you watch, and sharing your thoughts.

## Current build

This repository contains an Expo / React Native Android-first app.

Implemented in the current code:
- Dark editorial visual identity and bottom navigation
- Email/password sign-up and sign-in UI using Supabase Auth
- TV series search and catalogue integration through TVmaze (no API key required)
- Personal library statuses: plan to watch, watching, completed, paused, dropped
- Episode progress fields (season and episode)
- Reviews with a personal rating
- Community activity feed
- Row Level Security database schema for profiles, libraries, reviews, follows and likes

Still required before a public Play Store release:
- Create and configure the Supabase project and apply the SQL migration
- Include TVmaze attribution and comply with the CC BY-SA ShareAlike licence
- Finish profile editing, follow/unfollow interactions, review likes, moderation and report/block tools
- Add secure account deletion and a public account-deletion request page
- Add privacy policy, terms, support contact and Play Store Data safety disclosures
- Test sign-up, email confirmation, password reset, offline/error states and all database policies
- Add app icon, screenshots, store listing and content rating
- Run Android QA and produce a signed Android App Bundle (.aab)

## Setup

1. Install Node.js (LTS) and the Expo tooling.
2. Clone this repository.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Fill in:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

6. In Supabase SQL Editor, run `supabase/migrations/202611150001_initial_schema.sql`.
7. Run `npx expo start` and open it with Expo Go.

Do not put Supabase service-role keys or other server secrets in the mobile app. Only the Supabase publishable key belongs in the client.

## Android release

The repository includes EAS build profiles in `eas.json`. After creating an Expo account and configuring the project, use:

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile production
```

The production profile is configured to produce an Android App Bundle. A successful build is not, by itself, proof that the app is ready for publication: complete the QA and Play Console requirements above first.

## Data and services

- Supabase: authentication and app data.
- TVmaze: TV metadata, posters and series catalogue. Episodia is not affiliated with TVmaze.

## Privacy and safety

This is a development build. Do not collect real users' personal data until the privacy policy, deletion flow, support process, access policies and Play Store disclosures have been reviewed and tested.

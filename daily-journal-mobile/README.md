# Daily Journal Mobile (React Native + Expo)

Mobile companion app for **Daily Journal**, mirroring the web edition's editorial paper & gold design system, features, and Spring Boot backend integration.

---

## 🎨 Design System

- **Background Palette**: Warm editorial paper (`#FAF8F4`) and clean white cards (`#FFFFFF`)
- **Accent**: Muted & rich gold (`#C9A96E`, `#A8885A`, `#F7F0E4`)
- **Typography**: Classic serif styling with refined editorial headings

---

## 🚀 Key Features

1. **Today View**:
   - Daily inspirational quote (from `/api/quote` or local reflection fallback)
   - Approaching events banner (auto-detects events taking place in the next 7 days)
   - Daily Tasks list (with task carryover from previous day, check/uncheck, add, delete, and progress indicator)
   - Journal accordion (Academics notes, Life lessons, Dear Diary, and Study hours stepper `+/- 0.5`)
   - Shortcut to the Failure Register
   - Save Entry button with instant feedback
   - Safe read-only mode when viewing past dates

2. **Browse View**:
   - Filter entries by category: *All*, *Academics*, *Life*, *Diary*, *Hours*
   - Summary metric chips (total entries, total hours, count of academics/life reflections)
   - Editorial cards previewing reflections

3. **Stats View**:
   - Range selection: *Last 7 Days*, *Last 30 Days*, *Quarter*
   - 4 KPI tiles: *Total Hours*, *Daily Average*, *Active Streak*, *Best Day*
   - Visual distribution bar chart showing daily study hours

4. **Photos Gallery & Lightbox**:
   - Google Photos-style masonry/grid view connected to Supabase Storage
   - Filter by *All Photos* or *Favorites* (❤️)
   - Add photos by taking with camera or selecting from gallery
   - Fullscreen **Lightbox modal** with zoom, next/prev navigation, favorite toggle, and deletion

5. **Targets View**:
   - Sub-tabs for *Monthly Targets* and *Semester Vision*
   - Month-by-month switcher (`< Month Year >`)
   - Progress bar with completion ratios
   - Add, edit, check off, and persist goals directly to the backend

5. **Thoughts Board**:
   - Corkboard sticky notes in cheerful pastels (yellow, pink, blue, green, purple)
   - Quick brainstorming with color-picker modal and deletion

6. **The Commandments**:
   - Non-negotiable personal principles (I to VI) accessible anytime from the top bar

7. **Calendar & Streak Tracking**:
   - Full calendar picker with dot markers on entry dates and missed days counter

8. **Failure Register**:
   - Setback logging with tag categorization (`Academic` / `Life`)
   - Lesson extraction and rotating resilience quotes

9. **In-App Backend Switcher**:
   - Tap the ⚙️ gear icon in the header to switch or test connection to:
     - Android Emulator (`http://10.0.2.2:8080`)
     - Localhost / iOS Simulator (`http://localhost:8080`)
     - LAN Host IP (e.g. `http://172.16.128.210:8080`)
     - Remote Cloud Server

---

## 📱 How to Run

Navigate to the project directory:

```bash
cd c:\Users\dolan\App_Thoughts\daily-journal-mobile
```

### Start Expo Dev Server
```bash
npx expo start
```

- **On your physical phone**: Install the **Expo Go** app from the App Store / Play Store and scan the QR code displayed in the terminal.
- **On Android Emulator**: Press `a` in the terminal.
- **On Web**: Press `w` in the terminal.

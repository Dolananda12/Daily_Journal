# Daily Journal Mobile (React Native + Expo)

A mobile companion application for the **Daily Journal** platform, designed with an editorial paper & gold design aesthetic (`#FAF8F4`, `#C9A96E`). Built with **React Native** and **Expo (SDK 58)**, it delivers daily reflection, 24/7 persistent task tracking, multi-tier targets, photo archives, and personal principles.

---

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (SDK 58)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (strict mode)
- **Navigation**: [React Navigation 7](https://reactnavigation.org/) (Bottom Tabs Navigation)
- **Notifications**: [`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications/) (24/7 persistent ongoing Android notifications, home screen icon badges, scheduled reminders)
- **Local Storage**: [`@react-native-async-storage/async-storage`](https://react-native-async-storage.github.io/async-storage/) (backend configuration, splash screen control, offline persistence)
- **Media & Camera**: [`expo-image-picker`](https://docs.expo.dev/versions/latest/sdk/image-picker/) with Supabase Storage integration
- **Icons**: [`@expo/vector-icons`](https://docs.expo.dev/guides/icons/) (Ionicons)
- **Backend API**: Spring Boot REST API (`/api/entries`, `/api/targets`, `/api/events`, `/api/failures`, `/api/quote`)

---

## 📁 Project Structure

```
daily-journal-mobile/
├── App.tsx                       # App bootstrap, notification permissions, tab navigator
├── app.json                      # Expo configuration & plugins
├── package.json                  # Dependencies and scripts
└── src/
    ├── theme/
    │   └── index.ts              # Editorial color palette, typography & spacing
    ├── lib/
    │   ├── apiClient.ts          # Configurable backend fetch wrapper with dynamic host switcher
    │   ├── notificationService.ts # 24/7 ongoing sticky notification, badge & reminder engine
    │   └── dateUtils.ts          # Monday-start week calculations, date formatters
    ├── components/
    │   ├── HeaderBar.tsx         # Top bar with date picker, Commandments, Calendar & Settings
    │   ├── CalendarModal.tsx     # Calendar picker with entry dot markers & missed days tally
    │   ├── CommandmentsModal.tsx # Non-negotiable personal principles modal (I – VI)
    │   ├── FailureRegisterModal.tsx # Setback tracker with categorized lessons & resilience quotes
    │   └── SettingsModal.tsx     # Backend host selector, connection tester & notification test
    └── screens/
        ├── TodayScreen.tsx       # Daily entry form, undone task carryover, inline weekly targets
        ├── TargetsScreen.tsx     # Weekly, Monthly, and Semester targets with auto-save
        ├── BrowseScreen.tsx      # Chronological archive with category filters & metric chips
        ├── StatsScreen.tsx       # Study hours distribution chart, streak counter & KPI tiles
        ├── PhotosScreen.tsx      # Supabase photo gallery & full-screen Lightbox
        └── BoardScreen.tsx       # Corkboard sticky notes with customizable pastel colors
```

---

## ⚙️ How Core Features Work

### 1. Bottom Navigation Bar (`App.tsx`)
- Configured using `@react-navigation/bottom-tabs` with 6 dedicated tabs:
  - **Today**: Daily journal and live tasks. Displays a **dynamic red pill badge** indicating the number of uncompleted tasks for today.
  - **Browse**: Archive of all past entries with category filters.
  - **Stats**: Visual chart of hours studied, streaks, and averages.
  - **Photos**: Memories gallery connected to cloud storage.
  - **Targets**: Multi-level goals (Weekly, Monthly, Semester).
  - **Board**: Corkboard sticky notes for ideas and thoughts.
- Custom bottom tab bar styled with editorial borders, subtle active glow, and icon transitions.

---

### 2. 24/7 Live Task Notification Service (`src/lib/notificationService.ts`)
- **Persistent Ongoing Notification (Notification Shade)**:
  - Registers a high-priority Android channel (`live-tasks-channel`).
  - Schedules an ongoing notification with:
    - `sticky: true` (`Android isOngoing(true)`) — prevents accidental dismissal via swipe.
    - `autoDismiss: false` — remains visible when clicked.
    - `priority: HIGH` — stays pinned in the notification drawer.
  - Shows real-time task status (e.g., `📋 Tasks Today: 3 pending`) with preview bullet points of upcoming tasks.
- **Real-Time Synchronization**:
  - Whenever tasks are added, checked off, edited, or deleted on the Today screen, `syncTaskNotifications` executes immediately.
- **Home Screen App Icon Badge**:
  - Automatically updates the OS app icon badge count (`setBadgeCountAsync`) matching pending tasks.
- **Evening Reminder**:
  - Configures an automatic 8:00 PM evening alert if unfinished tasks remain.
- **Settings Diagnostics**:
  - Users can test notification delivery directly via Settings > "Send Test Reminder".

---

### 3. Task Management & Automatic Carryover (`TodayScreen.tsx`)
- **Undone Task Carryover**:
  - When opening today's journal for the first time, the app checks yesterday's entry (or the most recent previous entry).
  - Any uncompleted tasks are automatically copied to today's list with fresh unique IDs and an informational banner (`"X unfinished tasks carried over from yesterday"`).
- **Text Wrapping**:
  - Multiline text wrapping is enforced across all tasks to prevent text truncation regardless of task length.
- **Completion Progress**:
  - Dynamic progress bar updates as tasks are marked done (e.g. `2/5`).

---

### 4. Weekly Targets & Instant Synchronization
- **Dual-Surface Management**:
  - **Directly on Home**: Users can add, toggle, and delete weekly targets right on the Today screen using the inline `+ Add weekly target` field without switching views.
  - **Targets Tab**: Full-screen view with week navigation (`< Prev Week / Next Week >`).
- **Instant Tab Refresh (`useFocusEffect`)**:
  - React Navigation tab screens remain mounted in memory. Both `TodayScreen` and `TargetsScreen` implement `useFocusEffect` to refetch target state from the backend the instant the screen regains focus.
- **Blur Auto-Save (`TargetsScreen.tsx`)**:
  - Changes in the Targets tab automatically persist to `/api/targets` when switching tabs, ensuring no modifications are lost even if the manual "Save" button is bypassed.

---

### 5. Header Bar & Quick-Access Modals (`src/components/`)
- **The Commandments**: Quick modal listing foundational rules (I to VI) accessible from any screen.
- **Calendar & Streak Counter**: Visual date picker highlighting days with recorded entries and tracking missed days in the current week.
- **Failure Register**: Dedicated log for academic or personal setbacks to extract actionable lessons and build resilience.
- **In-App Backend Switcher (Settings)**:
  - Instant toggle between environments:
    - **Android Emulator**: `http://10.0.2.2:8080`
    - **iOS Simulator / Localhost**: `http://localhost:8080`
    - **LAN / Wi-Fi IP**: e.g., `http://192.168.1.X:8080`
    - **Remote Cloud Backend**: e.g., Supabase / Production URL
  - Built-in "Test Connection" button tests API availability and displays latency.

---

## 🚀 Running the App

### 1. Install Dependencies
```bash
cd daily-journal-mobile
npm install
```

### 2. Start the Development Server
```bash
npx expo start
```

### 3. Run on Device / Emulator
- **Physical Device**: Open **Expo Go** on Android / iOS and scan the terminal QR code.
- **Android Emulator**: Press `a` in the terminal.
- **Web Preview**: Press `w` in the terminal.

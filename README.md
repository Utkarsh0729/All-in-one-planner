# 🛡️ Aegis Planner (Aegis OS)
A glassmorphic dark theme personal operating system and productivity suite designed to manage your schedule, routines, notes, and health.

## 🛠️ Technical Stack & Architecture
- **Frontend**: Single Page Application (SPA) built with **React 19**, **Vite 8** (featuring Rolldown compilation), **React Router DOM 6**, and **Lucide React** icons. Styled with raw CSS variables and glassmorphism styling tokens. Text styling powered by **Tiptap Rich-Text Editor**.
- **Backend**: **REST API** server built on **Node.js** and **Express**, utilizing **MongoDB** via **Mongoose** object modeling.
- **Security & Jobs**: **JWT** (JSON Web Tokens) user authentication, **Bcryptjs** passcode hashing, automated schedules using **Node-Cron**, and transactional emails via **Nodemailer**.

---

## 🌟 Core Functionalities

### 📊 Unified Dashboard
- **Consolidated Overview**: Tracks daily goals, active workouts, logs, and calories in a single pane.
- **Compliance Visualizers**: Ring gauges representing macro limits compliance, schedule completion, and workout updates.

### 🍎 Nutrition Tracker V2
- **Portion & Macro Log**: Detailed meal records with portion configurations and automatic breakdowns of calories, protein, carbs, fats, and fiber.
- **Portal Modals**: Meal info cards render in a React Portal directly appended to `document.body` to lock background pages and scroll interactions.
- **Frequently Eaten Foods**: Intelligent suggestions providing quick shortcuts for logging regular foods.
- **Onboarding Targets**: Automated intake calculations derived from age, height, weight, activity levels, and fitness goals.
- **Quick Logging & Favorites**: Direct quick-adds for manual macros and reusable favorite templates.

### 📅 Weekly Goal Scheduler
- **Interactive Collapsible Goals**: Click anywhere on a goal card's header to expand or collapse sub-goals with slide-down transitions.
- **Optimistic State Tracking**: Checkbox items update instantly on click to eliminate server delays.
- **Hover Action Controls**: Hover over any sub-goal to reveal inline action buttons for text edits and deletions.

### 💪 Gym Routine Planner
- **Custom Split Routines**: Set up Push/Pull/Legs, Upper/Lower, or Full Body routines.
- **Experience Levels**: Tailor routines for beginner, intermediate, or advanced tracks.
- **Active Tracker**: Checklists for logging routine completions day by day.

### ⏳ 24-Hour Routine Analyser
- **Hour-by-Hour Grid**: Plan tasks for every hour of the day.
- **Audit Analytics**: Evaluate daily time distributions.

### 📝 Aegis Notes V2
- **Rich Text Editing**: Powered by Tiptap, supporting task lists, lists, underlines, alignments, and links.
- **Security Lock**: Encrypt and protect private notes behind passcode security.
- **Grid Layout**: Displays saved notes in a responsive masonry grid.
- **Metadata Features**: Favorite pins, custom tags, search filters, and automatic update logs.

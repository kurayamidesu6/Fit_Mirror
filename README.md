# 💪 Social Fitness App (MVP)

A social fitness platform where users replicate short workout videos and receive a similarity score based on their movement. The app gamifies fitness through rewards, rankings, challenges, and progression, with future support for blockchain-based incentives.

--------------------------------------------------------------------

## 🚀 Core Concept

- Creators upload **single-rep workout videos**
- Users attempt to replicate movements via recording
- A (mocked) pose system scores similarity
- Successful attempts earn **Fit Points**
- Users unlock content and progress through ranks

--------------------------------------------------------------------


## 🔄 Core User Flow

1. Browse workout feed  
2. Open workout details  
3. Click **"Try It"**  
4. Record attempt (mock camera UI)  
5. Receive similarity score + result  
6. Earn rewards  
7. Track progress on profile  
8. Unlock Pro content  

--------------------------------------------------------------------

## 🧩 Features

### 🏋️ Workout System
- Upload single-rep workout videos
- Metadata includes:
  - Title
  - Description
  - Category (strength, cardio, etc.)
  - Difficulty
  - Target muscle group
- Like and save workouts

--------------------------------------------------------------------

### 🎯 Attempt & Scoring
- Mock recording interface
- Similarity score (0–100)
- Configurable pass threshold (~70–80)
- Feedback and reward system

--------------------------------------------------------------------


### 🤖 Pose Tracking (Mocked)
Structured for future implementation using:
- Joint angle comparison
- Motion path tracking
- Timing analysis

> Planned integration: MediaPipe / TensorFlow.js

--------------------------------------------------------------------


### 💰 Rewards System (Solana-Ready)
- Earn **Fit Points** for successful attempts
- Mock wallet integration
- Designed for future blockchain payouts

--------------------------------------------------------------------


### 🏆 Ranking System
- Beginner → Intermediate → Pro
- Progress based on:
  - Workout completions
  - Engagement
- All ranks can upload content

--------------------------------------------------------------------


## 💎 Pro Section

- Locked initially
- Unlock after completing workouts
- Includes:
  - Coach-led content
  - Form correction
  - Technique tips
- Structured for future token-based unlocks

--------------------------------------------------------------------


## 📅 Weekly Workout Planner

- Drag-and-drop weekly calendar (Mon–Sun)
- Build custom routines
- Assign saved workouts to days
- Modify, move, or remove workouts
- Stored in structured state

--------------------------------------------------------------------


## 🎯 Achievements System

Auto-generated from the workout schedule:

### Daily Tasks
- Based on scheduled workouts
- Example: "Complete 3 sets of 12 squats"

### Weekly Tasks
- Based on consistency
- Example: "Complete squat routine 3 times"

### Monthly Tasks
- Long-term adherence goals
- Example: "Complete push-up plan 12 times"

Includes:
- Progress tracking
- Rewards
- Modular logic for future real tracking

--------------------------------------------------------------------


## ⚔️ Challenge System

- 24-hour time-limited challenges
- Risk tiers:
  - Low
  - Medium
  - High
- Stake Fit Points for higher rewards
- Personalized difficulty based on:
  - Rank
  - History
  - Consistency
- Recommended tier system (mocked)

--------------------------------------------------------------------


## 🛒 Store

Spend Fit Points on:
- Pro unlocks
- Premium workout plans
- Streak protection
- Retry boosts
- Cosmetics
- Routine templates

Includes a **mock Fit Points → Solana exchange system**

--------------------------------------------------------------------


## 💸 Tipping System

- Tip creators using Fit Points
- Social, community-driven support
- Placeholder for crypto tipping

--------------------------------------------------------------------


## 🔐 Anti-Cheat & Verification

Multi-layer verification system:

- Identity enrollment (selfie)
- Pre-workout face verification
- Random liveness prompts:
  - Blink
  - Turn head
  - Smile
- Duplicate submission detection
- Metadata checks

> Designed for future computer vision integration

--------------------------------------------------------------------


## 🧭 Navigation

### Main Tabs
- Feed  
- Create  
- Challenge  
- Store  
- Pro  

### Top Right
- Profile  
- Achievements  

--------------------------------------------------------------------


## 🖥️ Tech Stack

- React (component-based architecture)

### Structure

- Mock datasets:
  - Users
  - Workouts
  - Attempts

--------------------------------------------------------------------


## 🎨 Design

- Mobile-first UI
- Clean, modern interface
- Card-based layout
- Inspired by:
  - TikTok (content feed)
  - Strava (fitness tracking)

--------------------------------------------------------------------


## ⚙️ Setup Instructions

```bash
# Clone the repository
git clone <your-repo-url>

# Navigate into the project
cd <project-folder>

# Install dependencies
npm install

# Start development server
npm run dev
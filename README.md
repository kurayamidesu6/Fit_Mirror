**Welcome to your Fit Mirror project** 

**About**

The product is a social fitness app where creators upload short workout reps, and other users attempt to copy the movement. The app uses pose/body tracking to compare the attempt to the original and gives the user a similarity score. If they pass the threshold, they earn rewards connected to Solana and progress through a community ranking system.

CORE USER FLOW
Browse workout feed
Open workout detail
Click “Try It”
Simulate recording an attempt (camera placeholder)
See similarity score, pass/fail, and reward
View progress on profile
Unlock Pro content after progress

MAIN FEATURES
Workout Creation:
Users can upload a short video showing ONE clear workout repetition
Each workout includes:
title
description
category (strength, cardio, mobility, etc.)
difficulty (beginner, intermediate, advanced)
target muscle group
creator name
likes and saves
Workout Attempt System:
Users click “Try It” to attempt a workout
Show a recording UI (mocked camera interface)
After submission, show a result screen with:
similarity score (0–100)
pass/fail result (configurable threshold ~70–80)
reward earned (mocked)
Pose Scoring (Mocked but Structured):
Create a utility/service for pose comparison
Describe how it would work using:
joint angles
motion path
timing
Return a mocked similarity score for now
Make threshold configurable
Rewards (Solana-ready but mocked):
Users earn points/tokens after passing workouts
Include placeholder logic for Solana wallet integration
Structure code so real blockchain payout can be added later
Ranking System:
Beginner (default)
Intermediate (unlocked after X completed workouts)
Pro (unlocked after more completions + engagement)
All ranks can upload workouts
Rank shown on profile

PRO (PROFESSIONAL COACHING) SECTION
Add a “Pro” tab in the main navigation.
Purpose:
Provide premium coaching-style workout content
Incentivize users to complete workouts and improve form
Locked State:
Pro section is locked initially
Show preview cards of Pro content (blurred or partially visible)
Display progress indicator (e.g., “3/5 workouts completed to unlock”)
Show call-to-action to complete more workouts
Unlock Logic:
Unlock Pro section after completing a set number of successful workouts (e.g., 5)
Include a user property like isProUnlocked
Structure logic so token-based unlock can be added later
Pro Content:
Use mock videos
Label content as:
“Verified Coach”
“Pro Content”
Focus on:
form correction
technique tips
optimized workouts
Give slightly more premium UI styling
UX Detail:
When a user fails a workout, suggest unlocking Pro content for improvement

PAGES / SCREENS
Feed Page:
Vertical, TikTok-style workout feed
Workout cards with:
video preview
title
creator
like/save buttons
Filters (category, difficulty)
Optional trending section
Workout Detail Page:
Video player
Workout metadata
“Try It” button
Creator info
Try Workout Page:
Camera/recording placeholder UI
Instructions for front-facing recording
Submit button
Attempt Result Page:
Similarity score visualization
Pass/fail badge
Reward earned
Feedback summary
Profile Page:
Avatar
Wallet status (mocked)
Rank badge
Stats:
workouts completed
uploads
rewards
User’s uploaded workouts grid
Create Workout Page:
Upload video
Input fields:
title
description
category
difficulty
target muscle group
Pro Page:
Locked/unlocked states
Preview cards when locked
Full access when unlocked

WEEKLY WORKOUT CALENDAR / REGIMEN BUILDER
Inside the Profile tab, add a weekly calendar planner that allows the user to build their own workout routine.
Requirements:
Show all days of the week:
Monday
Tuesday
Wednesday
Thursday
Friday
Saturday
Sunday
Saved workouts behavior:
The user’s saved videos/workouts should appear in a saved workouts panel within the profile
Each saved workout card should show:
title
category
suggested reps
suggested sets
thumbnail/video preview
User can drag saved workout cards into any day of the week
This creates the user’s custom weekly regimen/workout plan
Calendar behavior:
Each day should accept one or more dragged workouts
User should be able to remove a workout from a day
User should be able to move workouts between days
Show a clean drag-and-drop UI
Maintain the scheduled state in mock data or local state
Routine data structure:
Store the weekly schedule in a structured way, for example:
each day contains an array of assigned workouts
each assigned workout carries title, id, sets, reps, and category
This weekly workout planner is a major part of the product and should feel interactive and polished.

ACHIEVEMENTS / TASKS SECTION
Add an Achievements section in the Profile tab.
This section should contain:
Daily tasks
Weekly tasks
Monthly tasks
These tasks must be generated based on the user’s weekly workout calendar.
Task logic:
Daily tasks
Based on workouts assigned to a specific day
Use the saved workout’s suggested sets and reps
Example:
“Complete 3 sets of 12 squats”
“Finish 4 sets of 10 push-ups”
Daily tasks should be tied directly to the workouts scheduled for that day
Weekly tasks
Based on how many times daily workout tasks are expected to be completed across the week
Example:
“Complete your squat routine 3 times this week”
“Finish all scheduled core workouts this week”
Weekly tasks should summarize repetition and consistency over the week
Monthly tasks
Based on how often the same scheduled daily tasks are completed over a month
Example:
“Complete your push-up plan 12 times this month”
“Maintain your full lower body routine for 4 weeks”
Monthly tasks should reward consistency and long-term adherence
Achievement system requirements:
Generate tasks automatically from the weekly calendar schedule
Show each task with:
title
description
progress bar
reward amount
completion state
Separate tasks into Daily / Weekly / Monthly tabs or grouped sections
Completion of tasks should reward in-app currency
Include mock progress data for demo purposes
Make the logic modular so real workout completions can update task progress later
Important:
The achievement system should feel connected to the workout planner, not random
Tasks should clearly reflect the user’s chosen regimen
__________________________________________________________________________
NAVIGATION
Simple tab navigation:
Feed
Create
Pro
Profile

TECHNICAL REQUIREMENTS
Use React with clean component structure
Modular and reusable components
Organize by:
pages
components
services (pose, rewards, user)
Use mock datasets for:
users
workouts
attempt results
Add comments indicating where:
pose tracking (MediaPipe / TensorFlow.js) would integrate
Solana reward logic would integrate

DESIGN STYLE
Modern, clean, mobile-first
Fitness + creator economy vibe
Smooth card-based UI
Clear CTAs
Feels like a mix of:
TikTok (feed)
Strava (fitness tracking)
Gamified workout app

DELIVERABLES
Fully working frontend MVP
Mock data included
Clear component structure
README with:
setup instructions
explanation of architecture
notes on where to plug in real pose tracking and blockchain logic
Goal:
The app should feel polished, demo-ready, and clearly demonstrate the core idea:
Users replicate workouts, get scored on movement, earn rewards, and unlock higher-level fitness content.

WEEKLY WORKOUT CALENDAR / REGIMEN BUILDER
Inside the Profile tab, add a weekly calendar planner that allows the user to build their own workout routine.
Requirements:
Show all days of the week:
Monday
Tuesday
Wednesday
Thursday
Friday
Saturday
Sunday
Saved workouts behavior:
The user’s saved videos/workouts should appear in a saved workouts panel within the profile
Each saved workout card should show:
title
category
suggested reps
suggested sets
thumbnail/video preview
User can drag saved workout cards into any day of the week
This creates the user’s custom weekly regimen/workout plan
Calendar behavior:
Each day should accept one or more dragged workouts
User should be able to remove a workout from a day
User should be able to move workouts between days
Show a clean drag-and-drop UI
Maintain the scheduled state in mock data or local state
Routine data structure:
Store the weekly schedule in a structured way, for example:
each day contains an array of assigned workouts
each assigned workout carries title, id, sets, reps, and category
This weekly workout planner is a major part of the product and should feel interactive and polished.

ACHIEVEMENTS / TASKS SECTION
Add an Achievements section in the Profile tab.
This section should contain:
Daily tasks
Weekly tasks
Monthly tasks
These tasks must be generated based on the user’s weekly workout calendar.
Task logic:
Daily tasks
Based on workouts assigned to a specific day
Use the saved workout’s suggested sets and reps
Example:
“Complete 3 sets of 12 squats”
“Finish 4 sets of 10 push-ups”
Daily tasks should be tied directly to the workouts scheduled for that day
Weekly tasks
Based on how many times daily workout tasks are expected to be completed across the week
Example:
“Complete your squat routine 3 times this week”
“Finish all scheduled core workouts this week”
Weekly tasks should summarize repetition and consistency over the week
Monthly tasks
Based on how often the same scheduled daily tasks are completed over a month
Example:
“Complete your push-up plan 12 times this month”
“Maintain your full lower body routine for 4 weeks”
Monthly tasks should reward consistency and long-term adherence
Achievement system requirements:
Generate tasks automatically from the weekly calendar schedule
Show each task with:
title
description
progress bar
reward amount
completion state
Separate tasks into Daily / Weekly / Monthly tabs or grouped sections
Completion of tasks should reward in-app currency
Include mock progress data for demo purposes
Make the logic modular so real workout completions can update task progress later
Important:
The achievement system should feel connected to the workout planner, not random
Tasks should clearly reflect the user’s chosen regimen
__________________________________________________________________________

Add a Challenge tab, Store tab, tipping system, and anti-cheat identity verification flow to the app.

----------------------------------
CHALLENGE TAB
----------------------------------
Add a Challenge tab to the main bottom navigation.

Purpose:
- Let users stake Fit Points on time-limited fitness challenges
- Increase engagement and create a high-risk/high-reward progression loop
- Encourage users to push themselves while keeping challenge generation personalized and realistic

Challenge rules:
- Do NOT call this gambling in the product copy
- Use preset challenge tiers instead of freeform bet amounts
- Each tier stakes a fixed amount of Fit Points
- Example tiers:
  - Low Risk
  - Medium Risk
  - High Risk
- Each challenge must be completed within 24 hours
- If the user completes the challenge, they earn a multiplied reward
- If they fail, they lose the staked Fit Points

Challenge generation:
- Difficulty should be based on:
  - user rank (Beginner / Intermediate / Pro)
  - recent completion history
  - streak / consistency
  - selected challenge tier
- Challenges should scale sharply in difficulty as stake tier increases
- Challenges should be difficult but not secretly impossible
- Higher stakes should feel extreme and low-probability, but still technically achievable
- Beginner and Intermediate users at the same tier may receive similar workout types, but Beginner users should have fewer reps/sets or lighter challenge requirements

Recommendation system:
- Include a recommended challenge tier based on user history and recent progress
- This can be mocked using rules-based logic
- Present it as a smart recommendation engine for now

Challenge UI should show:
- stake amount
- estimated difficulty
- risk label
- time remaining
- challenge description
- reward multiplier
- recommended tier

----------------------------------
STORE TAB
----------------------------------
Add a Store tab to the main bottom navigation.

Purpose:
- Give Fit Points meaningful utility
- Let users spend their earned currency on progression-related rewards
- Demonstrate future potential for crypto-connected rewards

Store items should include:
- Pro content unlock
- premium workout plans
- advanced form feedback
- streak protection
- retry-related boosts
- routine templates
- profile cosmetics
- creator support/tipping options

Mock Solana exchange:
- Include a mocked conversion system showing that Fit Points can be exchanged into Solana tokens conceptually
- Make it clear in code/comments/UI that this is a demo/mock implementation
- Use this to showcase future blockchain integration without promising real economic redemption

----------------------------------
TIPPING SYSTEM
----------------------------------
Add a tipping system that allows users to support creators.

Requirements:
- Users can tip creators using Fit Points
- Optionally show mock Solana token tipping support in the UI
- Creator cards and workout detail pages should include a tip action
- Tipping should feel social and community-driven

----------------------------------
ANTI-CHEAT / IDENTITY VERIFICATION FLOW
----------------------------------
Add a lightweight anti-cheat and identity verification flow for workout attempts and challenge submissions.

Purpose:
- Reduce impersonation
- Reduce replay abuse
- Strengthen the cybersecurity angle of the project
- Show a multi-signal verification pipeline

Identity enrollment:
- During onboarding or profile setup, user captures a profile selfie or face reference image
- Store this as the enrolled identity for future verification

Pre-workout verification:
- Before a verified workout attempt or challenge attempt starts, require a live front-camera identity check
- Compare the live face capture to the enrolled reference image
- Output a simple confidence result

Randomized liveness prompt:
- Before recording begins, show a random prompt the user must perform live
- Prompt should be selected randomly from a list such as:
  - Blink twice
  - Turn head left
  - Turn head right
  - Smile
  - Raise eyebrows
  - Look up then back at the camera
- Recording only starts after the liveness prompt is completed successfully

Recording rules:
- Challenge attempts should prefer or require live in-app recording instead of uploaded files
- Only allow submission after identity + liveness checks pass

Additional anti-cheat signals:
- Inspect media metadata if available
- Detect duplicate uploads or repeated submissions using file hash / media signature logic
- Treat metadata as only one fraud signal, not perfect proof
- Include a submission risk/confidence indicator in the architecture

Implementation notes:
- Use mocked logic where needed, but structure the code so real face detection / matching / liveness verification can be integrated later
- Add comments for future cybersecurity and computer vision integration points
- Describe the system as identity verification + liveness + duplicate detection, not as guaranteed biometric authentication

----------------------------------
NAVIGATION UPDATE
----------------------------------
Update the app navigation so the bottom tabs are:
- Feed
- Create
- Challenge
- Store
- Pro

Move Profile and Achievements access to the top-right area of the UI:
- Profile icon/button
- Achievements icon/button

Profile should still contain:
- saved workouts
- weekly calendar
- progress
- rank
- uploads
- rewards

Achievements should still contain:
- daily tasks
- weekly tasks
- monthly tasks
- rewards based on the user’s scheduled workout regimen



View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)

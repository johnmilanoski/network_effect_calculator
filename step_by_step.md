# Student Journey: The "Cascading Release" with Student Reserve

This document outlines the journey of a hypothetical student, Alex, as simulated by the application's advanced model. This model features a "Cascading Release" system for personal wallet earnings, enhanced by a parallel "Student Reserve" network designed to accelerate course progression.

**Persona:** Alex, a student starting his journey on the platform. The app simulates his path from initial investment to becoming a top earner.

---

## The Simulated Journey with Student Reserve

### Step 1: The Initial Setup & Dual Goals

Alex's journey begins by purchasing "Course 1". The calculator user sees this as the starting point. The application immediately calculates two objectives for him:

*   **Action:** Alex enrolls in Course 1.
*   **App Simulation:** The dashboard for "Course 1" becomes active, and two wallets are created: a personal `Wallet` and a global `Student Reserve Wallet`.
*   **Primary Goal (Cascading Release):** The system sets a target to fund "Course 2" using a portion of the main commissions from his **Course 1 network**.
*   **Secondary Goal (Reserve Network):** A separate, parallel commission stream from his **Course 1 network** begins funding his global `Student Reserve Wallet`.

### Step 2: Earning Dual Commissions

The time simulation projects Alex's progress.

*   **Week 1:** Alex's Course 1 network grows. He earns two types of commission from the same new students:
    *   A **Main Commission** (e.g., $6.75), which is added to his dedicated savings for Course 2.
    *   A **Reserve Commission** (e.g., $2.25), which is added to his global `Student Reserve Wallet`.
*   **App Simulation:** The table shows both his savings for Course 2 and his global reserve wallet growing simultaneously. His personal wallet remains at `$0`.

### Step 3: Accelerated Graduation

A critical event occurs in the simulation, accelerated by the new reserve system.

*   **Action:** Alex's dedicated savings for Course 2 are still short of the goal (e.g., he has $80 out of the required $100).
*   **App Simulation:**
    1.  The system checks his `Student Reserve Wallet`. It has a balance of $50.
    2.  It automatically draws the required $20 from the reserve wallet to cover the shortfall.
    3.  Course 2 is unlocked for Alex! His `Student Reserve Wallet` now has a balance of $30.

### Step 4: The Cascade and Compounding Growth

The simulation now shows Alex earning from multiple, compounding streams.

*   **Wallet Earnings (Cascading Release):** The goal for the Course 1 network is complete. All *future* **main commissions** from this network are now released directly to Alex's personal wallet.
*   **New Savings Goal:** His new Course 2 network begins generating **main commissions**, which are now saved to unlock Course 3.
*   **Compounding Reserve:** Both his Course 1 and Course 2 networks continue to generate **reserve commissions**, which are all pooled into his single global `Student Reserve Wallet`, making it grow even faster to help him unlock Course 3 and beyond.

This cycle repeats, creating a powerful feedback loop where success in earlier courses directly accelerates progress in later ones.

---

## Student Journey Flowchart (Simulated)

```mermaid
graph TD
    A[Start: Student buys Course 1] --> B[Goals: Fund C2 Savings & Global Reserve];
    B --> C{Simulate Period};
    C --> D[Calculate Main & Reserve Commissions from all active networks];
    D --> E[Add all Reserve Commissions to Global Reserve Wallet];
    E --> F{For each unlocked course 'N'...};
    F --> G{Is Course N+1 unlocked?};
    G -- No --> H[Main Commission from N --> Savings for N+1];
    G -- Yes --> I[Main Commission from N --> Personal Wallet];
    H --> J{Check for Graduation};
    I --> J;
    J --> K{Savings for N+1 < Price of N+1?};
    K -- Yes --> L[Use Global Reserve to cover shortfall];
    L --> M{Savings for N+1 >= Price of N+1?};
    K -- No --> M;
    M -- Yes --> N[Unlock Course N+1!];
    M -- No --> O[End Period];
    N --> O;
    O --> P{More Periods?};
    P -- Yes --> C;
    P -- No --> Q[End Simulation];
    end

# Education Platform Network Calculator

This is a sophisticated calculator built with React and TypeScript to model and simulate the financial progression and network effects of a multi-level education platform. It allows users to configure a wide range of parameters to project potential earnings, graduation timelines, and overall network growth.

## Key Features

*   **Dynamic Course Configuration**: Add, remove, and price an unlimited number of courses.
*   **Adjustable Network Parameters**: Control the network multiplier, number of payout levels, and commission percentages (both uniform and per-level).
*   **Target Reserve System**: Simulate a "savings" mechanism where a percentage of earnings is reserved to automatically fund the next course.
*   **Per-Course Snapshot**: View a detailed breakdown for each course, calculating the network size required to "graduate" and the potential wallet earnings.
*   **Time Series Simulation**: Project your entire journey over a set number of periods (e.g., weeks), showing course unlocks, periodic earnings, and cumulative wallet growth.
*   **Full Cascade Snapshot**: A theoretical model that calculates the total network size and depth required for a sponsor's entire downline to progress through all courses.

## How to Use the Calculator

1.  **Configure Settings**: Click the "Settings" button to adjust global parameters like course prices, the network multiplier, and commission structures.
2.  **Analyze Course Progression**: The top visualization bar shows the network depth required to graduate from one course to the next.
3.  **View Detailed Breakdowns**: Click the tabs for "Course 1", "Course 2", etc., to see detailed statistics for that specific stage, including the students needed to hit your target and your projected wallet earnings.
4.  **Project Over Time**: Click the "Time Simulation" tab to see a table projecting your growth and earnings period-by-period.

## Local Development

This project was set up using Vite.

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

This will start the application on a local server, usually `http://localhost:5173`.

### 3. Build for Production
```bash
npm run build
```

This command compiles the application into static HTML, CSS, and JavaScript files in the `dist/` directory, which are ready for deployment to a web server.

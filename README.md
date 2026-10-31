# ScoreHub Basketball + NFL pages

Responsive React page components for a dark ScoreHub-style sports dashboard.

## Included
- `BasketballPage.jsx`: competition and country filters, live/recent/upcoming game cards, league standings, player leaders and team statistics.
- `NFLPage.jsx`: season/week and conference filters, game cards, AFC/NFC standings, team leaders and league statistics.
- Shared UI components and responsive CSS.
- Sample data in `src/data/sportsData.js`.

## Add to a Vite React project

1. Copy the `src` folder into your project.
2. Import the page you want in your router:

```jsx
import BasketballPage from "./pages/BasketballPage";
import NFLPage from "./pages/NFLPage";

// Example routes:
// <Route path="/basketball" element={<BasketballPage />} />
// <Route path="/nfl" element={<NFLPage />} />
```

3. Import the stylesheet once in your app entry point:

```jsx
import "./styles.css";
```

## Important: sample data vs live data
The included scores, standings and statistics are demonstration data so the pages render immediately. They are **not live scores**. Replace the sample data with your sports-data provider/API and keep the same object shapes. The components are structured so you can pass updated data through props.

## Props
Both pages accept optional props:
- `games`
- `competitions`
- `countries`
- `standings`
- `leaders`
- `stats`
- `lastUpdated`

See `src/data/sportsData.js` for the expected shapes.

## Suggested API integration
Fetch from your provider in a parent/container component, normalize its response into the documented shapes, then pass the normalized arrays to the page. Keep API keys on your server or serverless function, never in browser code.

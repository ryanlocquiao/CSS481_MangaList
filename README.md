# MangaList

**A Netflix-inspired, visual-first manga discovery and reading platform.**

## 📖 Project Overview
MangaList bridges the gap between massive community-driven databases and premium streaming interfaces. Unlike traditional aggregator sites that often overwhelm users with dense text links, MangaList adopts a visual-first philosophy. By prioritizing high-quality cover art and a cinematic layout, the platform transforms the act of browsing into a premium experience.

This project was developed for **CSS 481**.

## ✨ Key Features
* **Cinematic Browsing:** A dark-mode, visual-first interface featuring dynamic "New Release" and genre-based scrollable rows.
* **Theater Mode Reader:** An immersive, distraction-free reader with smart image pre-loading for instantaneous page turns.
    * Supports both traditional pagination and vertical "Webtoon" style scrolling.
* **Smart "Continue Reading":** Automatically tracks the specific chapter and page you left off on, allowing for a frictionless resume directly from the home screen.
* **My List Collection:** A dedicated "Favorites" system linked to your account for bookmarking series.
* **Dynamic Data:** Real-time library integration using the MangaDex API.

## 🛠 Tech Stack

### Frontend
* **HTML5:** Structue and standardized layout.
* **CSS3:** Styling for the responsive, cinematic dark-mode aesthetics.
* **JavaScript (Vanilla):** Handles the "Data Fethcing Service," UI logic, and the interactive Theater Mode reader.

### Backend
* **Python:** Manages the "User Data Handler" and backend logic.
* **Firebase:** Handles secure User Authentication and Persistent User Data Storage (Favorites, History).

### External APIs
* **MangaDex API:** Primary source for manga metadata, cover art, and chapter images.
* **Jikan API:** Provides user reviews and related anime information.

## 🏗 Architecture
The system is modularized into three primary layers:

1.  **Frontend Layer:**
    * **Data Fetching Service:** Middleware that manages API integration, normalization, and rate-limiting.
    * **Home Page Controller:** Manages the visual-first UI components and browsing popups.
1.  **Backend Layer:**
    * **User Data Handler:** Orchestrates the storage of user choices and reading history.
    * **Authentication System:** Securely handles user accounts and login sessions.
1.  **Database:**
    * **Persistent Storage:** Centralized database (Firebase) sotring account credentials and reading progress.

## 👥 Authors
* **Ryan Locquiao**
* **Kevin Li**
* **Ana Rocha**
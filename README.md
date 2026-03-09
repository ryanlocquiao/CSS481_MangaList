# MangaList

**A Netflix-inspired, visual-first manga discovery and reading platform.**

## 📖 Project Overview
MangaList bridges the gap between massive community-driven databases and premium streaming interfaces. Unlike traditional aggregator sites that often overwhelm users with dense text links, MangaList adopts a visual-first philosophy. By prioritizing high-quality cover art and a cinematic layout, the platform transforms the act of browsing into a premium experience.

This project was developed for **CSS 481**.

## 🚀 How to Build and Run (Local Setup)

To properly evaluate the platform and walk through the proposed tasks, you will need to run the custom Python Flask backend (which handles MangaDex API proxying to bypass CORS and Cloudflare blocks) and serve the frontend HTML files.

### Prequisites
* **Python 3.x** installed on your machine.
* Any modern web browser.
* **VS Code** with the **Live Server** extension installed.

### Step 1: Install Backend Dependencies
The backend proxy requires a few standard Python libraries to route requests securely. Open your terminal, navigate to the root of the project directory, and run the following command:

### (Windows)
`pip install flask flask-cors requests`

### (Mac OS)
`pip3 install flask flask-cors requests`

### Step 2: Start the Python Proxy Server
While still in your terminal at the project root, start the Flask proxy server:

### (Windows)
`python app.py`

### (Mac OS)
`python3 app.py`

You should see a terminal message confirming: `✅ MangaList Python Backend is running on http://127.0.0.1:5000`. **Leave this terminal window running in the background.**

### Step 3: Launch the Frontend
With the backend actively routing data, you can now launch the user interface:
1. Open the project folder in VS Code.
2. Open `index.html` in your editor.
3. Click **"Go Live"** at the bottom right of the VS Code window to start the Live Server.
4. The application will open in your default browser (typically at `http://127.0.0.1:5500`).

### Step 4: Walkthrough Tasks
Once the app is running, you can test the core features outlined in our proposal:
1. **Authentication:** Click "Sign In" in the top right to create a new test account via Firebase.
2. **Discovery:** Scroll horizontally through the genre rows on the Home Page to browse titles. Use the dynamic search bar in the navigation header to find specific manga.
3. **Manga Details:** Click on any manga card to open the asynchronous Modal popup. From here, you can read the synopsis, view genres, and click the Bookmark icon to save it to your personal Favorites library.
4. **Reading:** Click "Read Now" or select a specific chapter from the modal to enter **Theater Mode**. 
5. **Reader Customization:** Inside Theater Mode, move your mouse to the top right to open the Settings Gear. Try toggling between "Single" and "Double" page layouts, and test the "Left" (Right-to-Left) manga reading direction to flip the keyboard and UI navigation logic.

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
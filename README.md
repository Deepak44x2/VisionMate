# 👁️ Vision Mate

**Vision Mate** is an AI-powered assistive Progressive Web App (PWA) designed specifically to empower visually impaired individuals. By leveraging the advanced vision capabilities of the Google Gemini API, Vision Mate acts as a smart camera and voice assistant, providing real-time auditory descriptions of the user's surroundings.

## ✨ Key Features

### 🔍 Vision Modes
*   **👁️ Scene Description:** Get a comprehensive auditory description of your current environment.
*   **📝 Read Text (OCR):** Point the camera at documents, signs, or screens to have the text read aloud.
*   **📦 Object Detection:** Identify and list the primary objects present in the camera frame.
*   **🔍 Find Object:** Ask the assistant to help locate specific items around you.
*   **💵 Money Identification:** Quickly recognize currency denominations.
*   **🎨 Color Detection:** Identify the dominant colors of objects or clothing.

### 🎙️ Voice & Audio Assistant
*   **Hands-Free Control:** Activated by the wake word **"Hey Vision"**.
*   **Voice Commands:** Switch modes seamlessly by saying "Scene", "Read", "Money", etc.
*   **Text-to-Speech (TTS):** All results, mode changes, and system statuses are spoken aloud.
*   **Custom Mappings:** Users can customize voice commands in the settings menu.

### 🚨 Emergency SOS
*   **Quick Activation:** Triggered via a massive on-screen button or by saying "SOS".
*   **Location Sharing:** Automatically fetches the user's real-time GPS coordinates.
*   **WhatsApp Integration:** Instantly drafts an emergency message with a Google Maps link to a pre-configured emergency contact.

### 👤 User Experience
*   **Accessible UI:** High-contrast color scheme (black/yellow), massive touch targets, and haptic feedback (vibrations) for interactions.
*   **User Profiles:** Simple login system with a "Guest Mode" option. Preferences and emergency contacts are saved locally.
*   **Battery Status:** Check device battery level via voice command ("Battery").

---

## 🛠️ Technology Stack

*   **Frontend Framework:** React 19 with TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS
*   **AI Integration:** `@google/genai` (Google Gemini API for multimodal image analysis)
*   **Browser APIs:** Web Speech API (SpeechRecognition & SpeechSynthesis), Geolocation API, Vibration API, MediaDevices API (Camera).

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher recommended)
*   A Google Gemini API Key

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/VisionMate.git
    cd vision-mate
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env.local` file in the root directory and add your Gemini API key:
    ```env
    GEMINI_API_KEY=your_actual_api_key_here
    ```

4.  **Start the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

---

## 📱 Usage Guide

1.  **Login:** Upon opening the app, enter your name or select "Guest User".
2.  **Grant Permissions:** The app will request access to your Camera and Microphone. These are required for the core functionality.
3.  **Select a Mode:** Tap one of the large icons at the bottom of the screen (Scene, Object, Read, etc.) or use voice commands.
4.  **Analyze:** Tap the massive central button or say "Scan" to capture an image and receive an auditory description.
5.  **Settings:** Tap the gear icon (⚙️) in the top right to configure your emergency contact number and custom voice commands.

---

## 🤝 Accessibility Notes

Vision Mate is built with a mobile-first, accessibility-first mindset. 
*   **Touch Targets:** All interactive elements exceed the standard 44x44pt recommendation.
*   **Contrast:** The UI strictly adheres to WCAG AAA contrast ratios for text against backgrounds.
*   **Screen Readers:** While the app provides its own TTS, semantic HTML and `aria-labels` are used to ensure compatibility with native screen readers (VoiceOver/TalkBack).

---

## 📄 License

This project is licensed under the MIT License.

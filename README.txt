
================================================================================
                                  Work_Flow
================================================================================

A comprehensive creative workflow application integrating a digital whiteboard, 
AI task management, image and video generation, intelligent prompt creation, 
and a centralized content gallery.

--------------------------------------------------------------------------------
|                            Table of Contents                               |
--------------------------------------------------------------------------------
1.  Introduction
2.  Key Features & Modules
3.  Technology Stack & Tools
4.  Architecture & Design Concepts
5.  Project Structure
6.  How It Works (Workflows)

--------------------------------------------------------------------------------
|                              1. Introduction                               |
--------------------------------------------------------------------------------

Work_Flow is a powerful, all-in-one, client-side application designed to serve
as a digital studio for creatives. It centralizes a suite of powerful tools,
many of which are enhanced by the Google Gemini API, to facilitate a seamless
creative process from ideation to final product.

The application is built as a single-page application (SPA) with a modular
design, allowing users to switch between different "rooms" or tools without
losing context. All user data, including generated content, notes, and settings,
is persisted locally in the browser's localStorage, ensuring a private and
session-persistent experience without the need for a backend server or user
accounts beyond a simple entry password.

--------------------------------------------------------------------------------
|                         2. Key Features & Modules                            |
--------------------------------------------------------------------------------

The application is composed of several distinct, lazy-loaded modules accessible
through a draggable navigation bar.

**Core UI**
*   **Gateway:** A simple password-protected entry screen ('J4M1E').
*   **Draggable Navigation:** Users can reorder the module tabs in the header to
    customize their workflow. The order is saved locally.
*   **Global Settings:** Centralized settings for UI font and text size.
*   **Keyboard Shortcuts:** Customizable hotkeys for common actions.

**AI Generation & Editing Modules**
*   **Image Generator:**
    - Generates images from text prompts using Google's 'imagen-4.0-generate-001' model.
    - Features an AI-powered Prompt Enhancer to refine user ideas.
    - Supports multiple aspect ratios (16:9, 1:1, 9:16, etc.).
    - Includes a generation queue for batch-processing multiple prompts.
    - Can send generated images directly to the Whiteboard or Image Editor.

*   **Video Generator:**
    - Generates short video clips from text prompts using Google's 'veo-2.0-generate-001' model.
    - Asynchronous polling handles the long generation time, providing users with
      reassuring status messages.
    - Automatically saves the final video to the Gallery.

*   **Image Editor:**
    - Performs AI-powered, instruction-based image editing using 'gemini-2.5-flash-image-preview'.
    - Users can upload an image or use one from another module.
    - Edits are guided by natural language prompts (e.g., "add a hat to the cat").

*   **Photo Booth:**
    - Utilizes the device's camera to capture a live photo.
    - Allows users to apply AI edits to their own picture using a text prompt.
    - A fun way to create personalized, AI-modified images.

*   **AI Assistant (Chat):**
    - A multi-provider chat interface for conversational AI.
    - Supports Google Gemini out-of-the-box.
    - Includes (simulated/pluggable) support for OpenAI, Anthropic, and Grok, with
      local API key management.
    - Features real-time streaming for responses.

**Creative & Organizational Modules**
*   **Gallery:**
    - A centralized media library for all content created within the app.
    - Stores images, videos, and whiteboard captures.
    - Features search functionality and a fullscreen viewer.
    - Allows users to download content or share it to the Public Gallery.

*   **Public Gallery:**
    - A simulated community space where users can share their creations.
    - Items can be viewed, downloaded, or "un-shared" (removed from public view).

*   **Whiteboard:**
    - An infinite-canvas style digital whiteboard with multi-tab support.
    - Tools: Pen, Eraser, Text, Selection (move/rotate), and Pan.
    - Supports adding images from the gallery or local uploads.
    - Features undo/redo, object layering, custom colors, and background settings.
    - Can export the board's content as a PNG image to the Gallery, Editor, or local disk.
    - All board states are auto-saved to localStorage.

*   **Handwritten Notes:**
    - A digital notebook with a unique, handwritten aesthetic.
    - Supports multiple font styles and sizes to simulate different writing styles.
    - Features integrated speech-to-text dictation.
    - Allows pasting images directly into notes.
    - Manages multiple notes, all auto-saved to localStorage.

*   **Task Manager:**
    - A simple to-do list for brainstorming and managing creative ideas.
    - Prompts can be sent directly from a task to the Image Generator module.

--------------------------------------------------------------------------------
|                       3. Technology Stack & Tools                          |
--------------------------------------------------------------------------------

*   **Frontend Framework:** React 19
*   **Language:** TypeScript
*   **AI Integration:** `@google/genai` SDK (v0.15.0) for all Gemini API interactions.
*   **Styling:** Tailwind CSS (via CDN for simplicity).
*   **Module System:** Buildless setup using an `importmap` in `index.html`. This allows
    for using bare module specifiers (e.g., `import React from 'react'`) directly
    in the browser without a bundler like Webpack or Vite.
*   **State Management:** React Context API provides a global state (`AppContext`)
    that enables seamless communication and data passing between modules.
*   **Data Persistence:** Browser `localStorage` is used exclusively for storing all
    user-generated content, application settings, API keys, and module states.
*   **Device Permissions:** A `metadata.json` file is used to declare necessary
    permissions like camera and microphone access.

--------------------------------------------------------------------------------
|                    4. Architecture & Design Concepts                       |
--------------------------------------------------------------------------------

*   **Modularity:** The application is architected around self-contained, feature-specific
    modules. These are lazy-loaded to improve initial load performance.

*   **Centralized State (`AppContext`):** This is the backbone of inter-module
    communication. It holds shared state (like gallery content) and setter functions
    that allow one module to influence another (e.g., the Gallery sending an image
    to the Whiteboard).

*   **Client-Side Focus:** The entire application runs in the user's browser. There
    is no backend, database, or server-side logic. This prioritizes user privacy
    and simplifies deployment.

*   **Buildless Development:** The use of import maps removes the need for a complex
    build setup, making the development environment lightweight and fast to start.
    All dependencies are loaded directly from CDNs.

*   **Graceful AI Integration:** For long-running AI tasks like video generation,
    the application uses an asynchronous polling mechanism to check the status,
    providing a non-blocking UI with clear user feedback.

--------------------------------------------------------------------------------
|                           5. Project Structure                             |
--------------------------------------------------------------------------------

The project is organized logically to support its modular architecture:

- `index.html`: The single HTML entry point. Defines the page structure, loads
  Tailwind CSS, and sets up the crucial `importmap`.
- `index.tsx`: The root of the React application.
- `App.tsx`: The main component that manages the active module and renders the
  UI shell (header, navigation).
- `types.ts`: Central repository for all shared TypeScript types and interfaces.
- `metadata.json`: Declares application metadata and hardware permissions.
- `README.txt`: This file.
- `components/`: Contains small, reusable React components used across multiple
  modules (e.g., `Modal.tsx`, `Icons.tsx`).
- `contexts/`: Holds the global state logic (`AppContext.tsx`).
- `modules/`: The core of the application. Each subdirectory is a complete,
  self-contained feature module (e.g., `modules/whiteboard/`, `modules/gallery/`).
- `services/`: Contains logic for communicating with external APIs, specifically
  the Gemini API (`geminiService.ts`).

--------------------------------------------------------------------------------
|                       6. How It Works (Workflows)                          |
--------------------------------------------------------------------------------

A typical user journey might look like one of these workflows:

**Workflow 1: From Idea to Edited Image**
1.  User opens the **Task Manager** and jots down an idea: "A knight riding a Corgi".
2.  They click "Use" to send this prompt to the **Image Generator**.
3.  In the Image Generator, they enhance the prompt and generate the image.
4.  The new image appears in the **Gallery** and on the generator screen.
5.  The user clicks "To Editor" to send the image to the **Image Editor**.
6.  In the editor, they enter the prompt "make the armor golden" and apply the edit.
7.  The final, edited image is automatically saved back to the **Gallery**.

**Workflow 2: Whiteboard Composition**
1.  User opens the **Whiteboard** and starts sketching an idea.
2.  They switch to the **Gallery**, find a previously generated background image,
    and send it to the Whiteboard.
3.  They resize and position the image on the canvas.
4.  Using the Text tool, they add annotations over the image.
5.  Finally, they export the entire composition as a single PNG by sending it
    to the **Gallery**.

This interconnected, modular design empowers users to combine tools in creative
and flexible ways, making Work_Flow a versatile digital studio.

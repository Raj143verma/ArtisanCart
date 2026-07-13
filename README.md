# ArtisanCart

ArtisanCart is a MERN foundation project scaffold for a modern marketplace platform.

## Project Overview

This repository contains a production-ready frontend and backend starter setup for a scalable ArtisanCart application.

## Folder Structure

- `client/` – React + Vite frontend application
- `server/` – Node.js + Express backend API foundation

### Client structure

- `public/` – static entry HTML and assets
- `src/` – application source code
- `src/styles/` – global SCSS styles

### Server structure

- `src/` – backend source code
- `src/config/` – runtime configuration
- `src/middleware/` – request middleware and helpers

## Tech Stack

### Frontend

- React
- Vite
- SCSS
- React Router
- Axios

### Backend

- Node.js
- Express
- MongoDB / Mongoose
- dotenv
- Helmet
- CORS
- Morgan
- Compression

## Setup Instructions

1. Install root dependencies if using a workspace manager, or install per package:
   - `cd client && npm install`
   - `cd server && npm install`

2. Create `.env` files from `.env.example` in both `client/` and `server/`.

3. Start each application:
   - Frontend: `cd client && npm run dev`
   - Backend: `cd server && npm run dev`

## Development Commands

### Client

- `npm run dev` — start Vite development server
- `npm run build` — build frontend assets
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint

### Server

- `npm run dev` — start backend with nodemon
- `npm run start` — start backend in production mode

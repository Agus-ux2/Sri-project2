# Soluciones Rurales Integradas (SRI) - Platform

This repository contains the complete SRI platform, including the control plane (API), execution plane (Worker), and the modern web frontend.

## Project Structure

- **sri-control-plane**: Fastify-based API for orchestration and data management.
- **sri-execution-plane**: Worker-based service for document processing and OCR using Playwright.
- **sri-frontend**: Next.js 14 dashboard with premium UI/UX for producers.

## Setup

1. Copy `.env.example` to `.env` in the root and in each subproject directory.
2. Update the environment variables with your credentials (AWS, Redis, Postgres).
3. Run the platform using Docker Compose:

   ```bash
   docker-compose up --build
   ```

## Key Features

- **Automated Grain Management**: Physical vs. Real stock tracking.
- **OCR Document Processing**: Automatic extraction of data from agricultural documents.
- **Provider Integration**: Secure connections to major grain providers (Cargill, LDC, etc.).
- **Premium Dashboard**: Exportable Excel reports and interactive analytics.

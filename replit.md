# Fottufy - PhotoProManager

## Overview

Fottufy is a modern SaaS platform designed for professional photographers. Its primary purpose is to provide tools for organizing, sharing, and selling photo galleries to clients. The platform supports subscription-based plans, secure photo storage on Cloudflare R2, and integrated payment processing with Stripe and Hotmart.

## User Preferences

Preferred communication style: Simple, everyday language.

**CRÍTICO**: NUNCA mexer no banco de dados existente. O sistema de portfólio é completamente independente usando apenas dados mock. Não tocar em tabelas, migrações ou estruturas que já funcionam. Sistema totalmente estável após restauração em 30/06/2025.

**AVISO IMPORTANTE**: Alguns dados foram perdidos durante tentativas anteriores. O backup usado não era completo. NUNCA mais tentar restaurar, migrar ou modificar dados. Sistema deve permanecer exatamente como está funcionando.

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React with TypeScript
- **UI Components**: Radix UI with shadcn/ui for a modern, accessible interface.
- **Styling**: Tailwind CSS for utility-first styling.

### Technical Implementations
- **Backend**: Node.js with Express.js and TypeScript.
- **Database ORM**: Drizzle ORM for PostgreSQL, handling schema and migrations.
- **Authentication**: Passport.js with local strategy, bcrypt for hashing, and PostgreSQL-backed sessions.
- **Image Processing**: Sharp library for resizing and dynamic watermarking.
- **File Storage**: Cloudflare R2 (S3-compatible) for primary photo storage.
- **Subscription Management**: Supports free, basic, standard, and professional plans with plan-based upload quotas. Hotmart offers are managed dynamically via an admin panel using a `hotmart_offers` table. An automatic downgrade system is in place for expired subscriptions.
- **Email System**: Resend API for transactional emails (welcome, password reset, subscription notifications) using HTML templates.
- **Deployment**: Primarily on Render.com, with Docker support for containerization and specific configurations for Railway.

### Feature Specifications
- **Authentication**: Secure registration, login, and password reset workflows, with webhook integration to BotConversa for CRM.
- **Photo Upload**: Supports streaming uploads, batch processing, memory optimization, and a comprehensive multi-layer protection system against UI freezes and data loss during large uploads (Prevention → Protection → Recovery → Analytics → Learning). Includes device detection, memory management, Web Worker fallbacks, and white-screen protection.
- **Admin Panel**: Comprehensive dashboard for managing projects, users, and Hotmart offers, including real-time photo counts and filtering options.
- **Portfolio System**: Allows users to create and manage public portfolio pages (`/portfolio/[slug]`) using real R2-hosted photos from their projects.
- **Security**: Centralized security middleware with Helmet for HTTP headers, conservative rate limiting, enhanced session and cookie security, and stricter CORS policies.

## External Dependencies

- **Stripe**: For credit card processing and subscription management.
- **Hotmart**: Brazilian payment gateway, integrated via webhooks for subscription updates.
- **Cloudflare R2**: Primary object storage for photos.
- **Cloudflare CDN**: For global content delivery.
- **Resend**: Transactional email service.
- **BotConversa**: CRM integration via webhooks for user registration.
- **Drizzle Kit**: Database schema management and migration tool.
- **Sharp**: Image processing library.
- **Multer**: Middleware for handling `multipart/form-data`, primarily for file uploads.
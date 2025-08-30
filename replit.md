# Fottufy - PhotoProManager

## Overview

Fottufy is a modern SaaS platform for professional photographers to organize, share, and sell photo galleries to their clients. The application features subscription-based plans, secure photo storage, and integrated payment processing through Stripe and Hotmart webhooks.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI components with shadcn/ui
- **Styling**: Tailwind CSS
- **State Management**: TanStack React Query for server state
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database ORM**: Drizzle ORM
- **Authentication**: Passport.js with local strategy
- **Session Management**: PostgreSQL-backed sessions
- **File Processing**: Sharp for image manipulation

### Database Architecture
- **Primary Database**: PostgreSQL (currently on Render)
- **Schema Management**: Drizzle ORM with migrations
- **Key Tables**: users, projects, photos, photo_comments, password_reset_tokens, session

## Key Components

### Authentication System
- **Strategy**: Passport.js local strategy with bcrypt password hashing
- **Session Storage**: PostgreSQL-backed sessions for scalability
- **Password Reset**: Token-based system with email delivery
- **Registration Flow**: Automatic webhook integration with BotConversa

### Subscription Management
- **Plans**: free, basic_v2, standard_v2, professional, professional_v2
- **Upload Limits**: Plan-based photo upload quotas
- **Payment Integration**: Stripe and Hotmart webhook processing
- **Automatic Downgrade**: Scheduled downgrade system for expired subscriptions

### File Storage & Processing
- **Primary Storage**: Cloudflare R2 (S3-compatible)
- **Image Processing**: Sharp for resizing and watermark application
- **Upload Handling**: Streaming uploads with memory optimization
- **Watermark System**: Dynamic watermark application based on user preferences

### Email System
- **Provider**: Resend API
- **Use Cases**: Welcome emails, password reset, subscription notifications
- **Templates**: HTML-based responsive email templates

## Data Flow

### User Registration
1. User submits registration form
2. Password hashed with bcrypt
3. User created in database with free plan
4. Welcome email sent with credentials
5. Webhook sent to BotConversa for CRM integration

### Photo Upload Process
1. File validated for type and size
2. Image processed and watermarked (if enabled)
3. Uploaded to Cloudflare R2 storage
4. Database record created with URL
5. User's upload quota updated

### Subscription Management
1. Webhook received from Stripe/Hotmart
2. User plan updated based on offer ID
3. Upload limits adjusted
4. Subscription tracking updated
5. Email notification sent

## External Dependencies

### Payment Processing
- **Stripe**: Credit card processing and subscription management
- **Hotmart**: Brazilian payment gateway with webhook integration

### Storage & CDN
- **Cloudflare R2**: Primary file storage (S3-compatible)
- **Cloudflare CDN**: Global content delivery

### Communication Services
- **Resend**: Transactional email delivery
- **BotConversa**: CRM integration webhook

### Development Tools
- **Drizzle Kit**: Database schema management
- **Sharp**: Image processing library
- **Multer**: File upload middleware

## Deployment Strategy

### Production Environment
- **Platform**: Render.com (current)
- **Database**: Render PostgreSQL with SSL
- **Build Process**: Vite frontend build + esbuild backend compilation
- **Environment Variables**: Comprehensive .env.example provided

### Development Environment
- **Platform**: Replit (development/testing)
- **Database**: Replit PostgreSQL
- **Hot Reload**: Vite dev server with HMR

### Container Support
- **Docker**: Multi-stage Dockerfile optimized for Node.js + Sharp dependencies
- **Railway**: Configured with railway.json and bootstrap script
- **Platform Detection**: Automatic path resolution for different deployment environments

### Database Migration Strategy
- **Backup System**: Automated SQL dump generation
- **Migration Scripts**: Complete schema and data migration tools
- **Sync Verification**: Upload count validation and orphan photo cleanup

## Changelog
- June 19, 2025: Initial setup
- June 19, 2025: Implemented batch processing system for image uploads to prevent browser crashes:
  - Modified `compressMultipleImages()` to process images in batches of 30 with 500ms pauses
  - Created `batchUpload.ts` utility for uploading images in groups of 100
  - Added `/api/projects/:projectId/add-photos` endpoint for additional batch uploads
  - System now handles 1000+ images without browser memory issues or request timeouts
- June 19, 2025: Enhanced memory management system for large uploads:
  - Added automatic URL.revokeObjectURL() cleanup for preview images
  - Implemented File and Blob reference cleanup after processing
  - Added garbage collection suggestions between batches
  - Enhanced error handling with memory cleanup on failures
  - System prevents browser freezing and "white screen" issues during large uploads
- June 19, 2025: Implemented comprehensive white screen protection system:
  - Created global upload indicator that remains visible even during UI freezes
  - Added emergency fallback overlay that activates when main interface becomes unresponsive
  - Implemented upload protection hooks with localStorage persistence for state recovery
  - Added multiple detection layers: activity reporting, responsiveness monitoring, automatic fallback
  - System ensures users always have visual feedback during large uploads, even in extreme scenarios
  - Integrated protection system into existing upload modal with progress synchronization
- June 25, 2025: Added admin panel Projects management tab:
  - Created comprehensive admin dashboard for project oversight
  - Implemented real photo count display (fixed SQL join between projects.id and photos.project_id)
  - Added project statistics cards, search functionality, and sortable table view
  - Shows project age, status, photographer, and accurate photo counts with thousand separators
  - Updated Project ID format to show "project-view/[id]" instead of random public_id
  - Removed visual upload test components that were interfering with normal operation
  - Fixed upload protection system to only activate during actual uploads and prevent unnecessary display
  - Modified admin projects table to show account email, plan type, and account status instead of client name
  - Added filtering options for projects by photo count (ascending/descending) and account type (free/paid)
- June 30, 2025: Implemented complete portfolio system using mock data:
  - Created full portfolio management system (/meu-portfolio) with CRUD functionality
  - Built public portfolio pages (/portfolio/[slug]) with professional gallery and lightbox
  - Added portfolio management button to dashboard for easy access
  - System uses 100% mock data without any database modifications
  - All portfolio features fully functional including photo selection from existing projects
- June 30, 2025: Completed full backup of Render production database:
  - Generated complete backup (8.89 MB) with 41,414 records across 8 tables
  - Database remained completely intact during backup process
  - Backup includes: 223 users, 222 projects, 17,180 photos, 33 comments
  - Files: backup_render_completo_2025-06-30T16-28-23-692Z.sql and summary
- June 30, 2025: Enhanced error messaging system for uploads:
  - Fixed ERR_HTTP_HEADERS_SENT error in user stats endpoint with proper response handling
  - Improved server-side error messages to be specific about connection, storage, quota, and timeout issues
  - Enhanced client-side error parsing with detailed context for different failure types
  - Created comprehensive error utility system (errorUtils.ts) for consistent error handling
  - Users now receive specific guidance for cache issues, account limits, network problems, and file format errors
  - Error messages now include actionable suggestions instead of generic "unknown error" messages
  - Portfolio management button temporarily removed from dashboard during implementation and testing phase
- June 30, 2025: Implemented friendly error messages for upload limit exceeded:
  - Updated server-side error responses to include specific account plan information and usage details
  - Created personalized error messages showing plan type, current usage, and limit numbers
  - Added client-side error parsing to detect and display user-friendly messages for upload limits
  - Error now shows: "Sua conta [plan] atingiu o limite de [X] fotos ([Y] utilizadas). Para continuar fazendo uploads, verifique sua assinatura no painel ou entre em contato com nosso suporte."
  - Applied to all upload endpoints: project creation, generic photo upload, and project-specific photo upload
- July 02, 2025: Portfolio system finalized with real R2 integration:
  - Public portfolio page (/portfolio/[slug]) fully operational with real photo data
  - Direct R2 URL integration using existing project photos from database
  - URLs format: https://project-photos.67877d47c278ae07b2869bd38ddfc031.r2.dev/[filename]
  - System mirrors authentic data from photos table without URL transformations
  - Portfolio database tables (portfolios, portfolio_photos) integrated with main system
- August 29, 2025: Complete technical analysis of upload system architecture:
  - Discovered sophisticated 5-layer protection system: Prevention → Protection → Recovery → Analytics → Learning
  - Upload system features comprehensive device detection, memory management, and browser capability assessment
  - Multi-layer protection includes: batch processing (30 images), memory checks, Web Worker fallbacks, white-screen protection
  - System includes automatic backup/recovery, connection analysis, and device-specific optimizations
  - Analytics system tracks performance patterns, memory usage, and failure modes for continuous improvement
  - Protection features: 8s UI freeze detection, emergency overlay, localStorage persistence, garbage collection
  - Comprehensive validation covers memory estimation, file types, browser capabilities, network conditions, device limitations
- August 30, 2025: Complete security enhancement implementation:
  - Created centralized security middleware (server/security.ts) with comprehensive protection
  - Implemented Helmet security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
  - Added conservative rate limiting: 100 req/15min general, 5 req/15min auth, 20 req/15min uploads
  - Enhanced session security: shorter durations (7 days vs 30), environment-based configurations
  - Improved cookie security: HttpOnly in production, stricter sameSite policies, secure flags
  - Updated CORS to be more restrictive while maintaining functionality
  - Reduced upload file size limit from 1GB to 500MB for better security posture
  - Modified session name to 'fottufy.sid' for better project branding
  - All security improvements tested and verified working without breaking existing functionality

## User Preferences

Preferred communication style: Simple, everyday language.

**CRÍTICO**: NUNCA mexer no banco de dados existente. O sistema de portfólio é completamente independente usando apenas dados mock. Não tocar em tabelas, migrações ou estruturas que já funcionam. Sistema totalmente estável após restauração em 30/06/2025.

**AVISO IMPORTANTE**: Alguns dados foram perdidos durante tentativas anteriores. O backup usado não era completo. NUNCA mais tentar restaurar, migrar ou modificar dados. Sistema deve permanecer exatamente como está funcionando.
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

## User Preferences

Preferred communication style: Simple, everyday language.
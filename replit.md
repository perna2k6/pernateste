# Overview

This is a subscription-based content platform similar to OnlyFans, built with a full-stack TypeScript architecture. The application allows users to view content previews and purchase subscription plans through PIX payments via Bulls Pay integration. It features a modern React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database storage.

The platform is designed around a content creator model where users can subscribe to access exclusive content through different subscription tiers. The payment flow is handled entirely through PIX (Brazilian instant payment system) with real-time webhook processing for payment confirmations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development builds
- **UI Components**: shadcn/ui component library built on Radix UI primitives with Tailwind CSS styling
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Design System**: Custom orange-themed color palette with responsive design patterns

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Design**: RESTful API with JSON responses and centralized error handling
- **Development**: Hot reload with Vite middleware integration in development mode

## Data Storage Solutions
- **ORM**: Drizzle ORM with PostgreSQL dialect for schema management and migrations
- **Schema**: Four main entities - users, transactions, subscriptions, and webhook_events
- **Fallback Storage**: In-memory storage implementation for development/testing scenarios
- **Data Relationships**: Foreign key relationships between users, transactions, and subscriptions

## Authentication and Authorization
- **Current State**: Basic user schema with username/password fields (not yet implemented)
- **Session Management**: PostgreSQL session store configured (connect-pg-simple)
- **Future Implementation**: User authentication and session-based authorization planned

## External Dependencies

### Payment Processing
- **Bulls Pay API**: Brazilian payment processor for PIX transactions (ACTIVE)
- **API Keys**: Configured with bp_client_lT5NnJJ3pjdyNwcTLzgsdmHxLyqRoR1v (public) and bp_secret_OwLSnhu9mub0olvLdYSU2XjQ7UIWkg97fdB5ENJEnQzam2GKLezvO87GdbwRZUtR (private)
- **Integration**: RESTful API calls with X-Public-Key/X-Private-Key headers
- **Webhook Processing**: Real-time payment status updates with event deduplication
- **QR Code Generation**: PIX QR codes generated via Bulls Pay API integration

### Development Tools
- **Replit Integration**: Custom Vite plugins for Replit development environment
- **Build System**: esbuild for production server bundling
- **Database Migrations**: Drizzle Kit for schema migrations and database pushing

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Radix UI**: Headless component primitives for accessibility and functionality
- **Lucide React**: Icon library for consistent iconography
- **Google Fonts**: Inter font family for typography

### Analytics and Tracking
- **Facebook Pixel**: Configured for conversion tracking and analytics
- **Microsoft Clarity**: Heat mapping and user session recording
- **UTM Tracking**: Custom UTM parameter handling and preservation
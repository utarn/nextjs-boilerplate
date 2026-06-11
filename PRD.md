# PRD: Next.js Production Boilerplate Template

## Problem Statement

AI agents consistently struggle to spin up production-ready Next.js projects from scratch. They waste time:
- Resolving version compatibility issues between Next.js, React, Prisma, and other libraries
- Implementing common patterns (authentication, queues, i18n) incorrectly or inconsistently
- Setting up Docker, CI/CD, and testing infrastructure
- Finding working examples of patterns that actually work together in production
- Debugging integration issues between different parts of the stack

There is no single, battle-tested, complete template that AI agents can use as a reference implementation.

## Solution

Create a 1:1 production-grade Next.js boilerplate template based on the proven patterns from the line-collector application. This template will include every production feature pre-configured and working out of the box, with a complete working Todo application demonstrating all patterns.

AI agents will be able to use this template to spin up new Next.js projects with zero friction, knowing that every pattern has already been tested and works correctly together.

## User Stories

1. As an AI agent, I want a complete working Next.js boilerplate, so that I don't have to set up infrastructure from scratch
2. As an AI agent, I want proven pattern implementations, so that I don't waste time debugging integration issues
3. As an AI agent, I want exact version matches that are known to work together, so that I don't have to resolve version conflicts
4. As an AI agent, I want working authentication out of the box, so that I can build user-facing features immediately
5. As an AI agent, I want Google SSO implemented correctly, so that I don't have to learn OAuth flows
6. As an AI agent, I want magic link email authentication, so that I have multiple login options
7. As an AI agent, I want JWT httpOnly cookie auth with proper security settings, so that auth is secure by default
8. As an AI agent, I want role-based access control middleware, so that I can protect routes easily
9. As an AI agent, I want complete i18n support, so that I can build multi-language applications
10. As an AI agent, I want cookie-based locale selection, so that user language preferences persist
11. As an AI agent, I want language toggle UI component, so that users can switch languages easily
12. As an AI agent, I want BullMQ + Redis queue system, so that I can process background jobs
13. As an AI agent, I want separate worker process, so that web requests are not blocked by long-running tasks
14. As an AI agent, I want queue admin UI, so that I can monitor and manage background jobs
15. As an AI agent, I want Prisma + PostgreSQL setup, so that I can work with a database
16. As an AI agent, I want migration system and seed script, so that I can manage schema changes correctly
17. As an AI agent, I want core database tables (User, AuditLog, AppSettings), so that I don't have to implement common entities
18. As an AI agent, I want working Docker setup, so that I can run the entire stack with one command
19. As an AI agent, I want multi-stage Dockerfile, so that production builds are optimized
20. As an AI agent, I want docker-compose with all services (app, worker, postgres, redis), so that development environment is consistent
21. As an AI agent, I want healthchecks for all services, so that dependencies are ready before the app starts
22. As an AI agent, I want complete testing setup, so that I can write tests for my features
23. As an AI agent, I want Vitest configured for unit and integration tests, so that testing works out of the box
24. As an AI agent, I want Happy DOM for React component testing, so that I can test UI components
25. As an AI agent, I want coverage reporting, so that I can track test coverage
26. As an AI agent, I want shadcn/ui + Tailwind 4 setup, so that I can build UI quickly
27. As an AI agent, I want core UI components pre-installed, so that I don't have to add them one by one
28. As an AI agent, I want theme system with light/dark mode, so that I can support user theme preferences
29. As an AI agent, I want AppLayout component with sidebar navigation, so that I have a consistent layout
30. As an AI agent, I want storage abstraction pattern, so that I can switch storage backends easily
31. As an AI agent, I want local disk storage adapter, so that file uploads work in development
32. As an AI agent, I want email system with nodemailer, so that I can send transactional emails
33. As an AI agent, I want encryption utilities, so that I can encrypt sensitive data at rest
34. As an AI agent, I want audit logging pattern, so that I can track user actions
35. As an AI agent, I want quota management system, so that I can limit user resource usage
36. As an AI agent, I want Socket.IO WebSocket support, so that I can build real-time features
37. As an AI agent, I want custom Next.js server setup, so that Socket.IO works with standalone mode
38. As an AI agent, I want working Todo app example, so that I can see how all patterns work together
39. As an AI agent, I want example API routes, so that I can reference correct API patterns
40. As an AI agent, I want example queue jobs, so that I understand how to create background tasks
41. As an AI agent, I want example tests, so that I can follow testing patterns
42. As an AI agent, I want consistent folder structure, so that I can navigate the codebase easily
43. As an AI agent, I want consistent coding conventions, so that the codebase is maintainable
44. As an AI agent, I want environment variable template, so that I know which variables are needed
45. As an AI agent, I want .env.template with all variables documented, so that I can configure the app correctly

## Implementation Decisions

### Stack Versions
- Exact version matching from line-collector: Next.js 16.2.7, React 19.2.6, Prisma 7.8.0, BullMQ 5.56.0, next-intl 4.13.0
- No version upgrades will be performed - this ensures the pattern is proven to work
- All dependencies will be pinned to exact versions

### Authentication
- JWT httpOnly cookies with 24 hour expiry
- SameSite: lax, secure in production, httpOnly
- Google OAuth 2.0 SSO implementation
- Magic link email authentication
- withAuth and withRoles middleware guards for API routes
- User status validation on every authenticated request

### Internationalization
- next-intl with cookie-based locale selection
- Supported locales: en (default), th
- Translation files in JSON format
- Language toggle UI component
- Locale persistence across sessions

### Queue System
- BullMQ with Redis as backend
- Separate worker process running independently from web server
- Exponential backoff retries for failed jobs
- Automatic job cleanup (1000 completed, 5000 failed)
- Queue admin API endpoints for monitoring

### Database
- Prisma 7.8 with PostgreSQL pg adapter
- Migration system with Prisma Migrate
- Seed script for initial data
- Core tables: WebUser, AuditLog, AppSettings, Todo
- Prisma client singleton pattern

### Docker
- Multi-stage Dockerfile with stages: base, deps, dev, builder, runner, worker
- docker-compose with 4 services: app, worker, postgres, redis
- Healthchecks for all database and cache services
- Volume mounts for development workflow
- Production-optimized runner stage

### Testing
- Vitest test runner
- Happy DOM for React component testing
- Separate configs for unit and integration tests
- Coverage reporting with v8 provider
- Test setup file with common utilities

### UI System
- shadcn/ui components built on Radix UI
- Tailwind CSS 4
- Theme system with light/dark mode support
- Theme picker component
- AppLayout with sidebar navigation pattern
- Core UI components pre-installed: button, card, dialog, dropdown, input, label, separator, sheet, switch, tabs, tooltip

### Infrastructure Patterns
- Storage abstraction factory pattern with local disk adapter
- Nodemailer email system with SMTP configuration
- AES-256-GCM encryption utilities
- Structured audit logging with user context
- Quota management system with per-user limits
- Socket.IO WebSocket server with authentication

### Example Application
- Complete working Todo application
- Demonstrates: auth, i18n, API routes, database operations, queue jobs, real-time updates
- Includes create, read, update, delete operations
- Shows proper error handling and loading states
- Uses all core patterns from the boilerplate

## Testing Decisions

- Tests will only test external behavior, not implementation details
- All public API surfaces will be tested
- Core utilities will have comprehensive unit tests
- API routes will have integration tests
- React components will have rendering and interaction tests
- Authentication flows will have end-to-end test coverage
- Queue jobs will have unit tests for processing logic
- Testing patterns will follow exactly the patterns established in line-collector
- Tests will be fast, isolated, and deterministic

## Out of Scope

- Cloudflare R2 storage adapter (only local disk included)
- LINE messaging API integration
- File storage beyond local disk
- Advanced admin features beyond basic queue management
- Payment processing
- Third-party integrations beyond Google OAuth
- Mobile app or PWA features
- Multi-tenant support
- Advanced reporting or analytics

## Further Notes

This boilerplate is intentionally opinionated and follows exactly the patterns proven in line-collector. The goal is not flexibility, but predictability and reliability for AI agents. Every pattern in this template is known to work correctly in production, and AI agents can rely on these patterns without having to verify them.

The Todo application example is intentionally simple but complete, demonstrating every major feature of the boilerplate working together. This gives AI agents a reference implementation that they can study and extend.

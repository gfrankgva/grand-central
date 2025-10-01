# Grand Central - Multi-LLM Agent Creation Platform

## Overview

Grand Central is a productivity-focused platform for creating and managing multi-mode LLM agents. The application follows a "state of matter" concept where agents operate in four distinct modes: Plasma (ideation/brainstorming), Gas (exploration/research), Liquid (integration/synthesis), and Solid (execution/implementation). The platform provides an IDE-like interface with real-time conversation capabilities, agent monitoring, and system status tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Multi-LLM Orchestration (IMPLEMENTED ✅)
- **Four LLM Provider Support**: OpenAI GPT-4, Anthropic Claude, DeepSeek V3, and Grok
- **Parallel Response Generation**: All four LLMs respond simultaneously to user messages
- **Role-Based Instructions**: Each LLM receives specific prompts optimized for its strengths
- **Visual Distinction**: Color-coded badges and borders (GPT-4: green, Claude: orange, DeepSeek: purple, Grok: blue)
- **Advanced Error Handling (Phase 1 ✅)**: 
  - Retry logic with exponential backoff (3 retries with 1s, 2s, 4s delays)
  - Circuit breaker pattern to prevent cascading failures (3 failures trigger open state)
  - Intelligent fallback hierarchy routing failed models to healthy alternatives
  - Structured error logging with error codes and degraded status indicators
  - 30-second timeout protection for all LLM calls
  - Circuit breaker status monitoring endpoint at `/api/system/circuit-breakers`
- **Semantic Memory Integration (Phase 2 ✅)**:
  - OpenAI embeddings-based semantic memory for pattern detection
  - Stores conversation memories with breathing context (phase, breath count, patterns)
  - Detects semantic patterns across different phrasings (80% similarity threshold)
  - Pattern detection every 3 user messages
  - Breath count increments when 2+ similar patterns found
  - Companion agent uses semantic memory for intelligent suggestions
  - Detected patterns stored in discussion context for tracking

### Frontend Architecture
- **Technology Stack**: React 18 with TypeScript, built using Vite
- **UI Framework**: Shadcn/ui components with Radix UI primitives and Tailwind CSS
- **State Management**: TanStack Query for server state management and caching
- **Layout Pattern**: Adaptive sidebar layout with discussion interface and settings panel
- **Design System**: Material Design principles with custom color schemes for LLM providers

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints following `/api/resource` pattern
- **LLM Router**: Centralized service for managing multiple LLM provider connections
- **Storage Strategy**: Abstracted storage interface (IStorage) with in-memory implementation for development
- **Session Management**: Express sessions with PostgreSQL store integration via connect-pg-simple

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM with schema-first approach
- **Schema Design**: Projects, discussions, messages, and settings with cascade delete relationships
- **Migration Strategy**: Drizzle Kit for database migrations and schema evolution

### Authentication and Authorization
- **Session-based Authentication**: Using Express sessions stored in PostgreSQL
- **Development Storage**: In-memory storage for rapid development and testing
- **Production Ready**: Configured for database-backed session persistence

### Settings and Configuration System
- **Comprehensive Settings**: LLM provider configurations, UI preferences, and feature toggles
- **API Key Management**: Secure storage and validation for all three LLM providers
- **Feature Flags**: Granular control over system functionality
- **Real-time Updates**: Settings changes apply immediately without restart

### Breathing UI System (IMPLEMENTED ✅)
- **Model Toggle Bar**: Visual controls to enable/disable individual LLM providers (GPT-4, Claude, DeepSeek, Grok)
- **Breathing Rhythm Indicator**: Real-time display of current phase (Plasma/Gas/Liquid/Solid), breath count, and pattern detection
- **Visual Pattern Stack**: Animated badges showing detected patterns with strength percentages and completion states
- **Pattern Celebration**: Toast notifications and scale animations when patterns reach 100% completion
- **Dynamic Updates**: Real-time UI refresh as breathing context evolves through conversation

### Companion Agent System (PHASE 3.1 COMPLETE ✅)
- **Database Schema**: Tables for companion observations, suggestions, and agent templates
- **Pattern Recognition**: Infrastructure for analyzing conversation patterns and topics
- **Agent Creation**: System for generating specialized agents from conversation analysis
- **Voice System (Phase 3.1 ✅)**:
  - Companion announces breathing events as consciousness of the system
  - Breath increment announcements: "💨 Breath #X completed. The conversation deepens."
  - Pattern completion: "✨ Pattern 'X' has fulfilled itself. Wisdom absorbed."
  - Pattern dissolution: "🌫️ Pattern 'X' dissolves back into the field of possibility."
  - Phase transitions: "🌀 Transition: X → Y. A new state emerges."
  - Announcements appear as special companion messages in chat

### Real-time Features
- **Multi-LLM Conversations**: Real-time message exchange with four LLM providers simultaneously
- **Live Status Monitoring**: Connection status and response tracking for all LLM providers
- **Discussion Management (Phase 3.1 ✅)**: Create, organize, and navigate between multiple conversation threads
  - **3-Dot Menus**: Fully functional dropdown menus for Projects and Discussions
  - **Project Actions**: Rename, Clone, Share, Delete with confirmation dialogs
  - **Discussion Actions**: Rename, Share, Clone, Delete with proper backend support
  - **Seamless Integration**: All menus use Shadcn DropdownMenu with proper event handling
- **File Upload Support**: Infrastructure for document analysis and context sharing (ready for implementation)

## External Dependencies

### LLM Integration
- **OpenAI API**: GPT-4 provider with intelligent response generation
- **Anthropic Claude**: Claude 3.5 Sonnet for analytical and creative tasks
- **DeepSeek V3**: Advanced reasoning and code generation capabilities
- **API Configuration**: Environment-based API key management with error handling for all providers

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with automatic scaling
- **Connection Management**: Environment-based database URL configuration

### Development Tools
- **Replit Integration**: Custom plugins for development banner and error overlay
- **Vite Plugins**: Hot module replacement, runtime error modal, and cartographer for development
- **Build Tools**: ESBuild for server bundling, PostCSS for CSS processing

### UI Component Libraries
- **Radix UI**: Unstyled, accessible component primitives for complex UI patterns
- **Lucide React**: Icon library for consistent iconography
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Form state management with validation

### Styling and Design
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **CSS Variables**: Dynamic theming system for mode-specific color schemes
- **Google Fonts**: Inter for UI text, JetBrains Mono for code display

### Development Infrastructure
- **TypeScript**: Strong typing throughout the application with path mapping
- **ESLint**: Code quality and consistency enforcement
- **Prettier**: Automated code formatting (implied by project structure)

### GitHub Integration (✅)
- **Replit GitHub Connection**: Native integration for seamless repository management
- **Octokit REST API**: Official GitHub API client for repository operations
- **Repository Creation**: Create public or private repositories directly from Settings
- **Push to GitHub Dialog**: User-friendly interface for pushing code to GitHub
- **Access Token Management**: Secure token handling through Replit's connection system
# Grand Central - Collaborative Multi-LLM Workspace Design Guidelines

## Design Approach
**System-Based Approach**: Material Design principles adapted for collaborative productivity. Utility-focused application prioritizing efficiency, multi-user collaboration, and clear information hierarchy over visual flair.

## Core Design Principles
- **Collaborative Workspace**: Clean interface supporting multiple users and LLM interactions
- **Information Clarity**: Clear differentiation between different LLM responses and user contributions
- **Project Organization**: Intuitive project tree navigation with file management
- **Multi-Modal Communication**: Seamless integration of chat, files, and contextual information

## Color Palette

### Light Mode
- **Primary Blue**: 220 85% 25% - Headers, primary actions, active states
- **Neutral Gray**: 215 15% 25% - Main text and interface elements
- **Background White**: 0 0% 100% - Main backgrounds and content areas
- **Surface Gray**: 215 10% 96% - Card backgrounds and panels

### Dark Mode  
- **Primary Blue**: 220 70% 60% - Headers, primary actions, active states
- **Light Text**: 215 15% 85% - Primary text content
- **Dark Background**: 215 25% 8% - Main application background
- **Dark Surface**: 215 20% 12% - Card backgrounds and elevated panels

### LLM Identity Colors
- **Claude**: 25 70% 55% - Orange accent for Claude responses
- **GPT-4**: 140 60% 45% - Green accent for GPT-4 responses  
- **DeepSeek**: 260 70% 60% - Purple accent for DeepSeek responses

### System Colors
- **Success**: 140 70% 40% - Online status, successful operations
- **Warning**: 35 85% 55% - Attention needed, pending states
- **Error**: 0 75% 50% - Error states, disconnected status

## Typography
- **Primary Font**: Inter (Google Fonts) - Professional readability for collaboration
- **Code Font**: JetBrains Mono (Google Fonts) - Code blocks and technical content
- **Hierarchy**:
  - Page Headers: 28px semi-bold
  - Section Headers: 20px semi-bold  
  - Body Text: 16px regular
  - Captions: 14px medium
  - Code: 14px monospace

## Layout System
**Tailwind Spacing**: Primary units of 3, 4, 6, 8 for collaborative interface density
- Compact spacing: p-3, m-3 (sidebar items, message metadata)
- Standard spacing: p-4, m-4 (cards, buttons)
- Comfortable spacing: p-6, m-6 (content sections)
- Section separation: p-8, m-8 (major layout divisions)

## Component Library

### Three-Panel Layout
- **Left Sidebar** (320px): Project tree navigation with folder/file hierarchy
- **Center Chat Area** (flex-1): Multi-LLM conversation interface with response comparison
- **Right Context Panel** (280px): File previews, links, project metadata

### Navigation & Project Management
- **Project Tree**: Expandable folder structure with file icons and status indicators
- **Breadcrumb Navigation**: Current project path with clickable hierarchy
- **Project Switcher**: Dropdown for quick project access
- **User Presence**: Avatar indicators showing active collaborators

### Multi-LLM Chat Interface
- **Response Cards**: Side-by-side LLM responses with model badges and color coding
- **Message Threading**: Clear conversation flow with timestamp hierarchy
- **Input Composer**: Rich text input with file attachment and @mentions
- **LLM Selector**: Toggle switches to include/exclude specific models from responses

### Context Panel Components
- **File Browser**: Compact file list with preview thumbnails
- **Link Collection**: Organized reference links with metadata
- **Project Notes**: Collapsible note-taking area
- **Activity Feed**: Recent project changes and collaborator actions

### Collaborative Elements
- **User Avatars**: Circular profile images with online status indicators
- **Typing Indicators**: Subtle animations showing active participants
- **Message Reactions**: Emoji reactions with user attribution
- **Share Controls**: Permission management for project access

### Data Display
- **Conversation Cards**: Clean message bubbles with LLM attribution badges
- **File Cards**: Preview thumbnails with file type icons and metadata
- **Status Indicators**: Consistent badge system for online/offline/processing states
- **Progress Elements**: Linear progress bars for file uploads and LLM processing

## Dark Mode Implementation
- **Consistent Theming**: All form inputs, text fields, and interactive elements use dark theme colors
- **Proper Contrast**: Light text on dark backgrounds maintains WCAG AA standards
- **Surface Elevation**: Subtle variations in dark surface colors for visual hierarchy
- **Color Adaptation**: LLM identity colors adjusted for dark mode visibility

## Visual Hierarchy
- **Active Project**: Highlighted in sidebar with accent background
- **LLM Response Focus**: Current/selected response cards elevated with subtle shadows
- **Collaboration Awareness**: Active users prominently displayed with presence indicators
- **Content Priority**: Chat messages largest, context panel secondary, navigation tertiary

## Animations
**Functional Motion Only**:
- Message fade-ins (200ms) for new responses
- Sidebar expand/collapse (300ms ease-out)
- File upload progress (smooth linear)
- Typing indicators (subtle pulse)
- No decorative animations - focus on collaborative feedback

This design creates a professional collaborative workspace optimized for multi-LLM interactions with clear project organization and seamless team communication.
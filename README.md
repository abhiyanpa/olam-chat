# 💬 Olam Chat

<div align="center">

![Olam Chat Logo](public/favicon.svg)

**A modern, secure, real-time messaging platform built with React, TypeScript, and Firebase**

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://olam.abhiyanpa.in)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[Live Demo](https://olam.abhiyanpa.in) • [Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started)

</div>

---

## 🌟 Features

### 🔐 **Authentication & Security**
- **Email/Password Authentication** - Secure account creation with password validation (min 8 characters)
- **Google OAuth Integration** - One-click sign-in with Google accounts
- **Unique Username System** - Every user gets a unique username (3-20 characters, alphanumeric + underscore)
- **Username Validation** - Real-time availability checking and format validation
- **Password Reset** - Email-based password recovery system
- **Modern Auth UI** - Beautiful gradient-themed login/register interface with smooth animations
- **Session Management** - Persistent authentication across page refreshes

### 💬 **Messaging Features**
- **Real-Time Messaging** - Instant message delivery powered by Firestore
- **Private Conversations** - One-on-one secure messaging
- **Message Grouping** - Messages from the same sender within 1 minute are grouped
- **Multiline Support** - Send multi-line messages (Shift+Enter for new line, Enter to send)
- **Reply to Messages** - Quote and reply to specific messages with context
- **4096 Character Limit** - Generous message size with character counter at 80%
- **Message Status Indicators**:
  - ✓ Single gray check - Message sent
  - ✓✓ Double gray checks - Message delivered
  - ✓✓ Double blue checks - Message read
- **Smooth Auto-Scroll** - Automatically scrolls to latest messages
- **Clickable Reply Navigation** - Click quoted messages to jump to original with highlight effect

### 🎨 **User Interface**
- **Modern Dark Theme** - Telegram-inspired dark interface with blue accents
- **Fully Responsive** - Optimized for mobile (< 768px), tablet (768-1024px), and desktop (> 1024px)
- **Mobile Sidebar Toggle** - Swipeable sidebar with smooth animations on mobile
- **Scroll to Bottom Button** - Quick navigation with unread message counter badge
- **Message Bubble Design** - Rounded message bubbles with sender avatars
- **Typing Indicators** - Real-time "user is typing..." with animated dots
- **Relative Timestamps** - Human-readable time stamps (Just now, 5m ago, 2h ago)
- **Letter Avatars** - Colorful initial-based avatars for users without profile pictures
- **Gradient Logo** - Beautiful Instagram-inspired gradient branding

### 🔍 **User Experience**
- **User Search** - Find users by username with real-time search
- **Conversation List** - Shows last message and unread count
- **Online Status** - Real-time online/offline indicators
- **Sound Notifications** - Customizable sent/received message sounds with mute toggle
- **Keyboard Shortcuts**:
  - `Enter` - Send message
  - `Shift+Enter` - New line in message
  - `ESC` - Cancel reply or close sidebar (mobile)
- **Error Handling** - Shake animations and clear error messages
- **Rate Limiting** - Prevents spam (max 10 messages per 10 seconds)
- **Last Seen Status** - Shows when users were last active

### 📱 **Mobile Features**
- **Touch-Optimized** - Minimum 44px touch targets
- **Responsive Font Scaling** - 14px (mobile), 15px (tablet), 16px (desktop)
- **Back Button Navigation** - Easy navigation on mobile devices
- **Sidebar Overlay** - Full-screen sidebar on mobile with smooth transitions
- **Mobile-First Design** - Optimized for small screens first

### 🔒 **Security Features**
- **Input Sanitization** - XSS prevention via HTML entity encoding
- **Firestore Security Rules** - Strict database-level validation and authorization
- **Message Validation** - Length limits and content validation
- **Username Format Enforcement** - Prevents malicious usernames
- **Rate Limiting** - Client and server-side protection against spam
- **Authentication Required** - All operations require valid authentication
- **Data Privacy** - Users can only access their own conversations
- **No Profile Deletion** - Prevents accidental data loss
- **Immutable Usernames** - Usernames cannot be changed after creation

### 🎵 **Sound System**
- **Message Sounds** - Different sounds for sent and received messages
- **Mute Toggle** - Global sound on/off with preference persistence
- **Debounced Playback** - Prevents rapid-fire sound spam
- **localStorage Preferences** - Sound settings saved across sessions

---

## 🛠️ Tech Stack

### **Frontend**
- **React 18** - Modern React with hooks and functional components
- **TypeScript 5** - Type-safe development
- **Vite 5** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router v6** - Client-side routing
- **Lucide React** - Beautiful icon library
- **React Helmet Async** - SEO and meta tag management

### **Backend & Services**
- **Firebase Authentication** - User authentication and session management
- **Cloud Firestore** - Real-time NoSQL database
- **Firebase Hosting** - Fast and secure web hosting with HTTPS
- **Firebase Security Rules** - Database-level access control

### **Development Tools**
- **ESLint** - Code linting and quality checks
- **PostCSS** - CSS processing and optimization
- **Git** - Version control

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or later)
- **npm** or **yarn**
- **Firebase Account** ([Get started here](https://console.firebase.google.com/))

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/abhiyanpa/olam-chat.git
cd olam-chat
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up Firebase:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable **Authentication** (Email/Password and Google)
   - Create a **Firestore Database** (start in production mode)
   - Copy your Firebase configuration

4. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and add your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

5. **Deploy Firestore Security Rules:**
```bash
firebase deploy --only firestore:rules
```

6. **Start the development server:**
```bash
npm run dev
```

7. **Open your browser:**
```
http://localhost:5173
```

---

## 📦 Build & Deploy

### Build for Production

```bash
npm run build
```

The optimized production build will be in the `dist/` folder.

### Deploy to Firebase Hosting

1. **Install Firebase CLI:**
```bash
npm install -g firebase-tools
```

2. **Login to Firebase:**
```bash
firebase login
```

3. **Initialize Firebase Hosting:**
```bash
firebase init hosting
```

4. **Deploy:**
```bash
firebase deploy --only hosting
```

Your app will be live at `https://your-project.web.app`

---

## 🔒 Security

This project implements comprehensive security measures:

- ✅ **Firestore Security Rules** - Database-level validation and authorization
- ✅ **Input Sanitization** - XSS and injection prevention
- ✅ **Rate Limiting** - Spam and DoS protection
- ✅ **Authentication Required** - All operations need valid auth
- ✅ **Data Privacy** - Users only access their own data
- ✅ **Environment Variables** - API keys never committed to git

See [SECURITY.md](SECURITY.md) for detailed security documentation.

---

## 📱 Responsive Design

| Device | Breakpoint | Optimizations |
|--------|-----------|---------------|
| Mobile | < 768px | Full-screen sidebar, larger touch targets, 14px font |
| Tablet | 768-1024px | Side-by-side layout, 280px sidebar, 15px font |
| Desktop | > 1024px | Full layout, optimized spacing, 16px font |

---

## 🎨 UI/UX Highlights

- **Telegram-Inspired Design** - Clean, modern messaging interface
- **Gradient Branding** - Instagram-inspired colorful gradients
- **Smooth Animations** - Fade-in, slide, and transform transitions
- **Dark Theme** - Eye-friendly dark color scheme
- **Intuitive Navigation** - Easy to use for all skill levels
- **Accessibility** - Semantic HTML and ARIA labels

---

## 📂 Project Structure

```
olam-chat/
├── src/
│   ├── components/         # Reusable React components
│   │   ├── AuthModal.tsx   # Authentication modal (legacy)
│   │   ├── SettingsModal.tsx
│   │   ├── Navbar.tsx
│   │   └── Layout.tsx
│   ├── pages/             # Page components
│   │   ├── Home.tsx       # Auth page (login/register)
│   │   └── Dashboard.tsx  # Main chat interface
│   ├── lib/               # Utilities and configs
│   │   ├── firebase.ts    # Firebase configuration
│   │   ├── AuthContext.tsx # Auth state management
│   │   ├── sounds.ts      # Sound management
│   │   ├── typing.ts      # Typing indicators
│   │   └── security.ts    # Security utilities
│   ├── hooks/             # Custom React hooks
│   │   └── useResponsive.ts
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── public/                # Static assets
│   └── favicon.svg        # App icon
├── firestore.rules        # Database security rules
├── firebase.json          # Firebase configuration
├── .env.example           # Environment template
└── package.json           # Dependencies
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Abhiyan PA**
- Website: [abhiyanpa.in](https://abhiyanpa.in)
- GitHub: [@abhiyanpa](https://github.com/abhiyanpa)

---

## 🙏 Acknowledgments

- [Firebase](https://firebase.google.com/) - Backend infrastructure
- [React](https://reactjs.org/) - Frontend framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide Icons](https://lucide.dev/) - Beautiful icons
- [Vite](https://vitejs.dev/) - Build tool

---

## 📸 Screenshots

### Authentication Page
Modern gradient-themed auth with Google OAuth integration

### Chat Interface
Telegram-inspired messaging with real-time updates

### Mobile Experience
Fully responsive with touch-optimized controls

---

## 🔮 Future Enhancements

- [ ] Message pinning
- [ ] Voice messages
- [ ] Image/file sharing (requires Firebase Storage upgrade)
- [ ] Group chats
- [ ] Video/voice calls
- [ ] Message reactions
- [ ] User blocking
- [ ] Message forwarding
- [ ] Dark/light theme toggle
- [ ] Custom notification sounds
- [ ] Message search
- [ ] Archive conversations
- [ ] Export chat history

---

<div align="center">

**Made with ❤️ by Abhiyan PA**

⭐ Star this repo if you found it helpful!

[Report Bug](https://github.com/abhiyanpa/olam-chat/issues) • [Request Feature](https://github.com/abhiyanpa/olam-chat/issues)

</div>

2. **Install dependencies:**
```bash
npm install
```

3. **Set up Firebase:**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable **Email/Password** authentication
   - Create a **Firestore Database** (start in test mode)
   - Copy your Firebase configuration

4. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Add your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

5. **Set up Firestore Security Rules** (see [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for details)

6. **Start the development server:**
```bash
npm run dev
```

7. **Open your browser:**
   - Navigate to `http://localhost:5173`

📖 **Detailed setup instructions:** See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for complete Firebase configuration guide.

## Firestore Database Structure

The application uses Firebase Firestore with the following collections:

### Collections

#### `profiles`
```javascript
{
  id: "user_uid",
  username: "john_doe",
  email: "user@example.com",
  online: true,
  last_seen: "2025-12-20T10:30:00Z",
  created_at: "2025-12-20T10:00:00Z",
  updated_at: "2025-12-20T10:30:00Z"
}
```

#### `usernames`
```javascript
{
  id: "john_doe",  // lowercase username
  uid: "user_uid"  // for uniqueness checks
}
```

#### `messages` (Global chat)
```javascript
{
  id: "auto_generated",
  content: "Hello world!",
  user_id: "user_uid",
  username: "john_doe",
  created_at: Timestamp
}
```

#### `private_messages` (Direct messages)
```javascript
{
  id: "auto_generated",
  content: "Hi there!",
  sender_id: "user_uid_1",
  receiver_id: "user_uid_2",
  created_at: Timestamp
}
```

## Deployment

### Deploy to Firebase Hosting

```bash
# Build the app
npm run build

# Login to Firebase (first time only)
npx firebase login

# Select your project (first time only)
npx firebase use --add

# Deploy
npx firebase deploy
```

Your app will be live at `https://your-project.web.app`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Project Structure

```
olam-chat/
├── src/
│   ├── components/      # Reusable React components
│   ├── lib/            # Firebase config and utilities
│   ├── pages/          # Page components
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── .env.example        # Environment variables template
├── FIREBASE_SETUP.md   # Detailed Firebase setup guide
└── firebase.json       # Firebase hosting configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Migration from Supabase

This project was originally built with Supabase and has been migrated to Firebase. The migration includes:
- ✅ Authentication (Supabase Auth → Firebase Auth)
- ✅ Database (PostgreSQL → Firestore)
- ✅ Real-time subscriptions (Supabase Realtime → Firestore listeners)
- ✅ User presence tracking

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you have any questions or run into issues, please open an issue on GitHub.

## Acknowledgments

- Built with ❤️ using React and Firebase
- Icons by [Lucide](https://lucide.dev/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)

# Olam Chat

A modern real-time chat application built with React, TypeScript, and Firebase.

## Live Demo

🌐 **Live App:** [https://olam.abhiyanpa.in/](https://olam.abhiyanpa.in/)

<img width="1918" height="911" alt="image" src="https://github.com/user-attachments/assets/8e86e847-480b-40c3-9ba9-4356e2e771b2" />


## Features

- 🚀 **Real-time messaging** - Instant message delivery with Firestore
- 🔒 **Secure authentication** - Email/Password authentication with Firebase Auth
- 💬 **Private messaging** - One-on-one conversations
- 🌐 **Global chat room** - Public message board
- 👤 **User profiles** - Customizable usernames and avatars
- 🔍 **User search** - Find and connect with other users
- 📱 **Responsive design** - Works on desktop, tablet, and mobile
- 🌙 **Dark mode** - Beautiful dark theme
- ✨ **Message status indicators** - See when messages are sent/delivered
- 🟢 **Online status** - See who's currently online

## Tech Stack

- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Firebase (Firestore + Authentication)
- **Routing:** React Router v6
- **Icons:** Lucide React
- **Build Tool:** Vite
- **Hosting:** Firebase Hosting

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Firebase account ([Get started here](https://console.firebase.google.com/))

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

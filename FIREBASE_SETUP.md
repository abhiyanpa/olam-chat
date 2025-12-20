# Firebase Setup Guide

## Migration Complete! 🎉

Your app has been successfully migrated from Supabase to Firebase.

## Next Steps

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or select an existing project
3. Follow the setup wizard

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** authentication
3. Save changes

### 3. Create Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Choose **Start in test mode** (for development)
3. Select a location close to your users
4. Click **Enable**

### 4. Set Up Firestore Security Rules

Replace the default rules with these (for production, make them more restrictive):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Profiles - users can read all, write their own
    match /profiles/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Usernames - used for uniqueness checks
    match /usernames/{username} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
    
    // Public messages - authenticated users can read and create
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                      request.resource.data.user_id == request.auth.uid;
      allow update, delete: if request.auth != null && 
                             resource.data.user_id == request.auth.uid;
    }
    
    // Private messages - only sender and receiver can access
    match /private_messages/{messageId} {
      allow read: if request.auth != null && 
                    (resource.data.sender_id == request.auth.uid || 
                     resource.data.receiver_id == request.auth.uid);
      allow create: if request.auth != null && 
                      request.resource.data.sender_id == request.auth.uid;
      allow update, delete: if request.auth != null && 
                             resource.data.sender_id == request.auth.uid;
    }
  }
}
```

### 5. Create Firestore Indexes

For better query performance, create these composite indexes:

1. Go to **Firestore Database** → **Indexes**
2. Add composite index for `private_messages`:
   - Collection: `private_messages`
   - Fields: `sender_id` (Ascending), `receiver_id` (Ascending), `created_at` (Ascending)
3. Add another index:
   - Collection: `private_messages`
   - Fields: `receiver_id` (Ascending), `sender_id` (Ascending), `created_at` (Ascending)

### 6. Get Your Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Register your app with a nickname
5. Copy the configuration values

### 7. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase configuration values in `.env`:
   ```
   VITE_FIREBASE_API_KEY=your_actual_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

### 8. Start Your App

```bash
npm run dev
```

## Firestore Data Structure

### Collections

#### `profiles`
```javascript
{
  id: "user_uid",
  username: "john_doe",
  email: "john@example.com",
  online: true,
  last_seen: "2025-12-20T10:30:00Z",
  created_at: "2025-12-20T10:00:00Z",
  updated_at: "2025-12-20T10:30:00Z"
}
```

#### `usernames`
```javascript
{
  id: "john_doe", // lowercase username
  uid: "user_uid"
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

## Key Changes from Supabase

1. **Authentication**: Now using Firebase Auth instead of Supabase Auth
2. **Database**: Firestore (NoSQL) instead of PostgreSQL
3. **Real-time**: Firestore real-time listeners instead of Supabase subscriptions
4. **User ID**: Uses `user.uid` instead of `user.id`
5. **User metadata**: Uses `user.displayName` instead of `user.user_metadata.username`

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure you've created a `.env` file with your Firebase configuration
- Restart the dev server after creating `.env`

### Messages not appearing in real-time
- Check Firestore security rules
- Verify that indexes are created
- Check browser console for errors

### Authentication not working
- Ensure Email/Password is enabled in Firebase Auth
- Check that your environment variables are correct

## Optional: Deploy to Firebase Hosting

Your `firebase.json` is already configured. To deploy:

```bash
npm run build
firebase login
firebase init  # Select hosting, use 'dist' as public directory
firebase deploy
```

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

# Sound Files for Olam Chat

## Required Sound Files

Place the following sound files in this directory:

### 1. sent.mp3 (Message Sent Sound)
- **Type**: Short swoosh or pop sound
- **Duration**: 0.1 - 0.3 seconds
- **Size**: Under 20KB
- **Description**: Plays when user sends a message

### 2. received.mp3 (Message Received Sound)
- **Type**: Notification tone (like a soft chime or bell)
- **Duration**: 0.15 - 0.5 seconds
- **Size**: Under 30KB
- **Description**: Plays when receiving a new message

## How to Get Royalty-Free Sounds

### Recommended Free Sources:

1. **Mixkit** (https://mixkit.co/free-sound-effects/)
   - License: Free for commercial use
   - Search for: "notification", "pop", "swoosh"
   - High quality, no attribution required

2. **Freesound** (https://freesound.org/)
   - License: Various CC licenses
   - Search terms: "message sent", "notification", "pop sound"
   - Filter by: Creative Commons 0 (CC0) for easiest use

3. **Zapsplat** (https://www.zapsplat.com/)
   - License: Free with attribution
   - Categories: UI Sounds > Notifications
   - High quality professional sounds

4. **Notification Sounds** (https://notificationsounds.com/)
   - License: Free for personal/commercial use
   - Pre-made notification tones
   - MP3 format ready to use

5. **Pixabay Sound Effects** (https://pixabay.com/sound-effects/)
   - License: Free for commercial use
   - Search: "notification", "message"
   - No attribution required

## Suggested Sound Characteristics

### For sent.mp3:
- Upward pitch (ascending tone)
- Short and snappy
- Not too loud (subtle confirmation)
- Examples: swoosh, pop, click, soft "ding"

### For received.mp3:
- Pleasant notification tone
- Slightly longer than sent sound
- Attention-grabbing but not annoying
- Examples: chime, bell, marimba note, gentle beep

## Alternative: Create Your Own

You can also use online tools to create simple notification sounds:
- **Chirp.io** - Create custom notification sounds
- **Audacity** - Free audio editor to trim/edit sounds
- **BeepBox** - Create simple 8-bit style sounds

## Testing Sounds

After adding the files, the app will automatically use them. The current implementation uses generated tones as placeholders until real sound files are added.

## File Format Notes

- **Preferred**: MP3 (best browser compatibility)
- **Alternative**: OGG (smaller file size)
- **Avoid**: WAV (too large)

## Current Status

The app is currently using simple generated tones as placeholders. Once you add sent.mp3 and received.mp3 to this directory, the sounds will automatically be used instead.

To activate real sounds, update `/src/lib/sounds.ts`:
```typescript
private createSentSound(): HTMLAudioElement {
  return new Audio('/sounds/sent.mp3');
}

private createReceivedSound(): HTMLAudioElement {
  return new Audio('/sounds/received.mp3');
}
```

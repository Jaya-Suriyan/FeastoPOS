import { Platform, PermissionsAndroid, Vibration } from 'react-native';

// Attempts to play an audio tone for new orders.
// Falls back to a short vibration if audio libraries/assets are unavailable.
export async function playNewOrderSound(): Promise<void> {
  try {
    // Lazy attempt to use react-native-sound if the app has it installed
    // and the project later provides a hosted or bundled sound.
    // This block is fully optional and safely ignored if the lib isn't present.
    const maybeSound = (await import('react-native-sound')) as any;
    const Sound = maybeSound?.default || maybeSound?.Sound;
    if (Sound) {
      Sound.setCategory && Sound.setCategory('Playback');
      // Use hosted asset to avoid Android local bundling issues
      const REMOTE_URL = 'https://dev.admin.feasto.co.uk/school-bell-1.mp3';
      await new Promise<void>((resolve, reject) => {
        const s = new Sound(REMOTE_URL, undefined, (error: any) => {
          if (error) {
            console.log('Error playing new order sound', error);
            reject(error);
            return;
          }
          s.play((success: boolean) => {
            s.release();
            success ? resolve() : reject(new Error('Playback failed'));
          });
        });
      });
      return;
    }
  } catch (error) {
    console.log('Error playing new audio sound', error);
  }

  // Fallback: light haptic/vibration cue
  try {
    if (Platform.OS === 'android') {
      // On modern Android, VIBRATE permission is normal-protection but some OEMs restrict it.
      // Attempt a best-effort permission check for robustness.
      const hasPerm = await PermissionsAndroid.check(
        'android.permission.VIBRATE' as any,
      );
      if (!hasPerm) {
        // Don't prompt; just skip vibration to avoid crash on restricted profiles
        return;
      }
    }
    Vibration.vibrate(400);
  } catch (error) {
    console.log('Error playing new vibration sound', error);
  }
}

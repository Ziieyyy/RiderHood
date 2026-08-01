import { Colors } from '../constants/theme';
import { useColorScheme } from './use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  const theme = (scheme === 'dark' ? 'dark' : 'light') as keyof typeof Colors;

  return Colors[theme] || Colors.dark;
}

import { Redirect } from 'expo-router';
import { useTranslation } from '../i18n';

export default function Index() {
  const { t } = useTranslation();
  return <Redirect href="/splash" />;
}

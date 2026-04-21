import { Redirect } from 'expo-router';

/** Legacy route — account roles are not used; everyone gets the same experience. */
export default function RoleSelectScreen() {
  return <Redirect href="/(client)/(tabs)/feed" />;
}

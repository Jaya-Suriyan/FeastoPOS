import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  branchId?: string;
  firstName?: string;
  lastName?: string;
  roleDetails?: { id?: string; name?: string; slug?: string };
  branch?: { id?: string; name?: string } & Record<string, any>;
}

export async function saveAuth(token: string, user?: AuthUser): Promise<void> {
	await AsyncStorage.multiSet([
		[TOKEN_KEY, token],
		[USER_KEY, user ? JSON.stringify(user) : ''],
	]);
}

export async function getAuthToken(): Promise<string | null> {
	return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getAuthUser(): Promise<AuthUser | null> {
	const raw = await AsyncStorage.getItem(USER_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

export async function clearAuth(): Promise<void> {
	await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}



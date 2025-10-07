import apiClient from '../lib/apiClient';
import { saveAuth, AuthUser } from '../lib/authStorage';

export interface LoginPayload {
	email: string;
	password: string;
}

export interface LoginResponse {
	token: string;
	user?: AuthUser;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
	const res = await apiClient.post('/auth/login', payload, {
		headers: {
			// Authorization header may be required by server; add if needed in apiClient
		},
	});
	const data = res.data as any;
	// normalize common shapes
	const token: string = data?.token || data?.accessToken || data?.data?.token;
	const user: AuthUser | undefined = data?.user || data?.data?.user;
	if (!token) {
		throw new Error('Invalid login response: missing token');
	}
	await saveAuth(token, user);
	return { token, user };
}



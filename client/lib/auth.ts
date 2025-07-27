import { register, login, googleLogin, refreshAccessToken, logout } from './api';

export const registerUser = async (username: string, email: string, password: string) => {
  return await register(username, email, password);
};

export const loginUser = async (identifier: string, password: string) => {
  const data = await login(identifier, password);
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
};

export const googleLoginUser = async (token: string) => {
  const data = await googleLogin(token);
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
};

export const refreshAccessTokenWrapper = async () => {
  const refreshTokenValue = localStorage.getItem('refreshToken');
  if (!refreshTokenValue) throw new Error('No refresh token available');
  const accessToken = await refreshAccessToken(refreshTokenValue);
  localStorage.setItem('accessToken', accessToken);
  return accessToken;
};

export const logoutUser = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  if (refreshToken) {
    await logout(refreshToken);
  }
};
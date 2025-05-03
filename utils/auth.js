import AsyncStorage from '@react-native-async-storage/async-storage';

// Save token to AsyncStorage
export const setToken = async (token) => {
  try {
    await AsyncStorage.setItem('userToken', token);
  } catch (error) {
    console.error('Failed to save token:', error);
    throw error;
  }
};

// Retrieve token from AsyncStorage
export const getToken = async () => {
  try {
    return await AsyncStorage.getItem('userToken');
  } catch (error) {
    console.error('Failed to fetch token:', error);
    return null;
  }
};

// Remove token (for logout)
export const clearToken = async () => {
  try {
    await AsyncStorage.removeItem('userToken');
  } catch (error) {
    console.error('Failed to clear token:', error);
  }
};

// Check if user is logged in
export const isLoggedIn = async () => {
  const token = await getToken();
  return !!token; // Returns `true` if token exists
};
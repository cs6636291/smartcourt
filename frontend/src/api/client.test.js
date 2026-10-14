import { beforeEach, expect, it, vi } from 'vitest';
import axios from 'axios';
vi.mock('axios', () => {
  const client = vi.fn().mockImplementation((config) => Promise.resolve({ config }));
  client.interceptors = { request: { use: vi.fn() }, response: { use: vi.fn() } };
  return { default: { create: vi.fn(() => client), post: vi.fn() } };
});
let rejectResponse;
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); localStorage.clear();
  await import('./client');
  rejectResponse = axios.create.mock.results.at(-1).value.interceptors.response.use.mock.calls[0][1];
  localStorage.setItem('access_token', 'expired'); localStorage.setItem('refresh_token', 'old-refresh');
});
it('shares one refresh for concurrent expired requests and stores rotated refresh', async () => {
  let finish;
  axios.post.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const error = () => ({ response: { status: 401 }, config: { url: '/courts/my-bookings/', headers: {} } });
  const first = rejectResponse(error()); const second = rejectResponse(error());
  expect(axios.post).toHaveBeenCalledTimes(1);
  finish({ data: { access: 'new-access', refresh: 'rotated-refresh' } });
  await Promise.all([first, second]);
  expect(localStorage.getItem('access_token')).toBe('new-access');
  expect(localStorage.getItem('refresh_token')).toBe('rotated-refresh');
});
it('does not try a session refresh when login credentials are wrong', async () => {
  const error = { response: { status: 401 }, config: { url: '/accounts/login/', headers: {} } };
  await expect(rejectResponse(error)).rejects.toBe(error);
  expect(axios.post).not.toHaveBeenCalled();
});
it('clears session and notifies UI if the refresh is rejected', async () => {
  axios.post.mockRejectedValue({ response: { status: 401 } });
  const expired = vi.fn(); window.addEventListener('session-expired', expired);
  const error = { response: { status: 401 }, config: { url: '/accounts/profile/', headers: {} } };
  await expect(rejectResponse(error)).rejects.toBe(error);
  expect(localStorage.getItem('access_token')).toBeNull();
  expect(localStorage.getItem('refresh_token')).toBeNull();
  expect(expired).toHaveBeenCalledTimes(1);
  window.removeEventListener('session-expired', expired);
});

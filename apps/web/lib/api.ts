const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface RegisteredUser {
  id: string;
  email: string;
  createdAt: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResult {
  user: RegisteredUser;
  token: string;
}

async function postAuth(path: string, payload: unknown): Promise<AuthResult> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(" ")
      : data?.message;
    throw new ApiError(
      message ?? "Something went wrong. Please try again.",
      response.status,
    );
  }

  return data as AuthResult;
}

export async function registerUser(
  payload: RegisterPayload,
): Promise<RegisteredUser> {
  const { user } = await postAuth("/auth/register", payload);
  return user;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResult> {
  return postAuth("/auth/login", payload);
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: string[];
}

export async function getMeetings(token: string): Promise<Meeting[]> {
  const response = await fetch(`${API_URL}/meetings`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(" ")
      : data?.message;
    throw new ApiError(
      message ?? "Something went wrong. Please try again.",
      response.status,
    );
  }

  return data as Meeting[];
}

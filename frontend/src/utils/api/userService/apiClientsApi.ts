import { axiosInstance as axios } from "../../axiosInstance";

export interface ApiClient {
  id: number;
  name: string;
  client_id: string;
  created_at: string;
  last_used_at: string | null;
}

// Only returned once, right after creation
export interface CreatedApiClient extends ApiClient {
  client_secret: string;
}

export async function listApiClients(): Promise<ApiClient[]> {
  const res = await axios.get("/user/api-clients");
  return res.data;
}

export async function createApiClient(name: string): Promise<CreatedApiClient> {
  const res = await axios.post("/user/api-clients", { name });
  return res.data;
}

export async function revokeApiClient(id: number): Promise<void> {
  await axios.delete(`/user/api-clients/${id}`);
}

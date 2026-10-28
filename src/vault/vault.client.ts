type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class VaultClient {
  private readonly address: string;
  private tokenPromise: Promise<string> | undefined;

  constructor(
    address: string,
    private readonly roleId: string,
    private readonly secretId: string,
  ) {
    this.address = address.replace(/\/+$/, '');
  }

  async readKvV2(path: string): Promise<Record<string, unknown>> {
    const token = await this.getToken();

    const response = await fetch(`${this.address}/v1/${path}`, {
      headers: {
        'X-Vault-Token': token,
      },
    });
    if (!response.ok) {
      throw new Error(`Vault secret read failed with HTTP ${response.status}.`);
    }

    const body: unknown = await response.json();

    if (
      !isObject(body) ||
      !isObject(body['data']) ||
      !isObject(body['data']['data'])
    ) {
      throw new Error('Vault returned an invalid KV v2 response.');
    }

    return body['data']['data'];
  }

  private getToken(): Promise<string> {
    if (this.tokenPromise === undefined) {
      this.tokenPromise = this.login();
    }

    return this.tokenPromise;
  }

  private async login(): Promise<string> {
    const response = await fetch(`${this.address}/v1/auth/approle/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role_id: this.roleId,
        secret_id: this.secretId,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Vault authentication failed with HTTP ${response.status}.`,
      );
    }

    const body: unknown = await response.json();

    if (
      !isObject(body) ||
      !isObject(body['auth']) ||
      typeof body['auth']['client_token'] !== 'string' ||
      body['auth']['client_token'].trim().length === 0
    ) {
      throw new Error('Vault returned an invalid AppRole login response.');
    }

    return body['auth']['client_token'];
  }
}

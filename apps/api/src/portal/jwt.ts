import { createPrivateKey, createPublicKey } from 'node:crypto';
import { exportJWK, importPKCS8, importSPKI, SignJWT, type JWK, type KeyLike } from 'jose';

/**
 * Mecanismo de ADR-006, literal: `jose` firma el token y deriva el JWKS de la
 * misma clave, sin construir el JSON a mano.
 */

export type PortalTeamsClaim = Record<string, 'member' | 'applicant'>;

export type IssueTokenInput = {
  personId: string;
  handle: string;
  name: string;
  teams: PortalTeamsClaim;
  events: string[];
};

export class PortalTokenIssuer {
  private constructor(
    private readonly privateKey: KeyLike,
    private readonly issuer: string,
    private readonly kid: string,
  ) {}

  static async create(privateKeyPem: string, issuer: string, kid: string) {
    const privateKey = await importPKCS8(privateKeyPem, 'RS256');
    return new PortalTokenIssuer(privateKey, issuer, kid);
  }

  /**
   * `claimMap` de `portal.config.ts` mapea `sub → userId`, `name → username`,
   * `handle → handle`, `teams → teams`. Vida: 15 min (docs/05).
   */
  async issue(input: IssueTokenInput): Promise<{ token: string; expiresIn: number }> {
    const expiresIn = 15 * 60;
    const token = await new SignJWT({
      handle: input.handle,
      name: input.name,
      teams: input.teams,
      events: input.events,
    })
      .setProtectedHeader({ alg: 'RS256', kid: this.kid })
      .setIssuer(this.issuer)
      .setSubject(input.personId)
      .setIssuedAt()
      .setExpirationTime(`${expiresIn}s`)
      .sign(this.privateKey);

    return { token, expiresIn };
  }
}

/**
 * `GET /.well-known/jwks.json`. Público y sin auth: solo la clave pública.
 *
 * Se deriva de la misma PEM privada con el `crypto` nativo de Node —más
 * directo que rehacer el viaje por WebCrypto— y solo se ejecuta una vez, al
 * arrancar el proceso.
 */
export const buildJwks = async (
  privateKeyPem: string,
  kid: string,
): Promise<{ keys: JWK[] }> => {
  const publicKeyPem = createPublicKey(createPrivateKey(privateKeyPem))
    .export({ type: 'spki', format: 'pem' })
    .toString();

  const publicKey = await importSPKI(publicKeyPem, 'RS256');
  const jwk = await exportJWK(publicKey);
  return { keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig' }] };
};

/**
 * Interfaz común a las dos formas de obtener el JWT de Portal.
 *
 * Existe porque son dos estrategias intercambiables, no dos versiones de la
 * misma: `PortalTokenIssuer` firma en local (ADR-006) y `PortalMintedIssuer`
 * se lo pide a Portal (ADR-016).
 */
export interface TokenIssuer {
  issue(input: IssueTokenInput): Promise<{ token: string; expiresIn: number }>;
}

/**
 * Portal acuña el token con su propia clave de entorno (ADR-016).
 *
 * `POST /v1/tokens` con la `sk_`. Los claims propios viajan bajo la clave
 * `claims` —el resto del cuerpo Portal los ignora—, así que `authz` los lee
 * en `ctx.claims`.
 *
 * Frente a firmar en local, esto elimina la necesidad de que Portal alcance
 * nuestro JWKS por internet, que es lo que hacía imposible el tiempo real en
 * desarrollo: un backend en `localhost` no puede servírselo.
 */
export class PortalMintedIssuer implements TokenIssuer {
  constructor(
    private readonly baseUrl: string,
    private readonly secret: string,
  ) {}

  async issue(input: IssueTokenInput): Promise<{ token: string; expiresIn: number }> {
    const response = await fetch(`${this.baseUrl}/v1/tokens`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.secret}` },
      body: JSON.stringify({
        userId: input.personId,
        username: input.name,
        claims: { handle: input.handle, teams: input.teams, events: input.events },
      }),
    });

    if (!response.ok) {
      throw new Error(`Portal rechazó la emisión de token: ${response.status}`);
    }

    const data = (await response.json()) as { token: string; expiresAt: string };
    const expiresIn = Math.max(0, Math.floor((Date.parse(data.expiresAt) - Date.now()) / 1000));
    return { token: data.token, expiresIn };
  }
}

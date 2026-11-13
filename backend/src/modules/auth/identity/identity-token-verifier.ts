import { VerifiedIdentity } from '../../user-accounts/user-accounts.service';

/**
 * Abstraction over an SSO provider (Dependency Inversion Principle).
 * AuthService depends on this contract, not on Google directly, so another provider
 * (e.g. Facebook, Apple) can be added later without touching AuthService.
 */
export abstract class IdentityTokenVerifier {
  abstract verify(idToken: string): Promise<VerifiedIdentity>;
}

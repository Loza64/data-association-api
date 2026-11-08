export interface IssuedToken {
  token: string;
  expiresIn: number;
}

export interface TokenClaims {
  userId: string;
}

export interface TokenService {
  issue(claims: TokenClaims): IssuedToken;
  verify(token: string): TokenClaims;
}

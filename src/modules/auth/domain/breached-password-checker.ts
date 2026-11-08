export interface BreachedPasswordChecker {
  isBreached(password: string): Promise<boolean>;
}

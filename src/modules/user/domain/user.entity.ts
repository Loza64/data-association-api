export interface PublicUser {
  id: string;
  name: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  id: string = '';
  name: string = '';
  username: string = '';
  password: string = '';
  failedLoginAttempts: number = 0;
  createdAt: Date = new Date();
  updatedAt: Date = new Date();

  toPublic(): PublicUser {
    return {
      id: this.id,
      name: this.name,
      username: this.username,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

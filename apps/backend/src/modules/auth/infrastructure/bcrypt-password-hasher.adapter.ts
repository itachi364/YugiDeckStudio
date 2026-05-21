import { Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { PasswordHasherPort } from "../ports/password-hasher.port";

@Injectable()
export class BcryptPasswordHasherAdapter implements PasswordHasherPort {
  private readonly saltRounds = 12;

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

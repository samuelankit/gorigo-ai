import { db } from "./db";
import { users, type CreateUserRequest, type UserResponse } from "@shared/schema";

export interface IStorage {
  createUser(user: CreateUserRequest): Promise<UserResponse>;
}

export class DatabaseStorage implements IStorage {
  async createUser(user: CreateUserRequest): Promise<UserResponse> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { hashString } from '../utils/hash-password';
import { IUser, User } from '../mongoose/schemas/users';
import { getAllUsers, createUser, getUserByUsername, updateUser, deleteUser } from '../routes/users';

beforeAll(async () => {
  const newUserInfo = {
    username: 'admin',
    displayName: 'Admin User',
    password: 'password123',
    isAdmin: true,
    solvedProblem: 0,
    solvedProblems: [],
    rating: 0
  } as IUser;
  mongoose.connect('mongodb://localhost:27017/judge');
  const newUser = new User(newUserInfo);
  newUser.password = hashString(newUser.password);
  try {
    const savedUser: IUser = await newUser.save();
    console.log(`Saved user: ${savedUser} as an admin`);
  } catch (error) {
    console.log(`Admin already exists: ${error}`);
  }
});

afterAll(async () => {
  await User.deleteOne({ username: 'admin' });
  await User.deleteOne({ username: 'testuser' });
  await User.deleteOne({ username: 'admintestuser' });
  await mongoose.disconnect();
});

describe('User Routes', () => {
  it('should get all users', async () => {
    const req = {} as Request;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn() };
      }),
      query: {}
    } as unknown as Response;

    await getAllUsers(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should get user with name admin', async () => {
    const req = { query: { filter: 'username', value: 'admin' } } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      }),
      query: {}
    } as unknown as Response;

    await getAllUsers(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(data).toHaveLength(1);
    expect(data[0].username).toBe('admin');
  });

  it('should get user with name admin', async () => {
    const req = { params: { username: 'admin' }, user: 'test' } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;

    await getUserByUsername(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(data).toHaveProperty('username', 'admin');
  });

  it('should get 403 if not login', async () => {
    const req = { params: { username: 'admin' } } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;

    await getUserByUsername(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should create user', async () => {
    const req = {
      body: {
        username: 'testuser',
        displayName: 'Test User',
        password: 'Testtest',
        isAdmin: false
      },
      user: { isAdmin: true }
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should get 400 for invalid data form', async () => {
    const req = {
      body: {
        username: 'testuser',
        displayName: 'Test User',
        password: 'Testtest',
        isAdmin: 'true'
      },
      user: { isAdmin: true }
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should get 400 for user exists', async () => {
    const req = {
      body: {
        username: 'testuser',
        displayName: 'Test User',
        password: 'Testtest',
        isAdmin: 'true'
      },
      user: { isAdmin: true }
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should get 401 for creating admin user by non admin user', async () => {
    const req = {
      body: {
        username: 'admintestuser',
        displayName: 'Test User',
        password: 'Testtest',
        isAdmin: true
      },
      user: { isAdmin: false }
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should delete user', async () => {
    const req = {
      params: { username: 'testuser' },
      user: { isAdmin: true }
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;
    await deleteUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
  
  it('should get 401 for deleting user by non admin user', async () => {
    const req = {
      params: { username: 'testuser' },
      user: { isAdmin: false }
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;
    await deleteUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
  
  it('should get 400 for deleting user but without username', async () => {
    const req = {
      params: {},
      user: { isAdmin: true }
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;
    await deleteUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  
  it('should update the user', async () => {
    const req = {
      params: { username: 'admin' },
      body: { password: 'papspsps' },
      user: { isAdmin: true }
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;
    await updateUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
  
  it('should get 401 for update a different user by non admin', async () => {
    const req = {
      params: { username: 'admin' },
      body: { password: 'papspsps' },
      user: { isAdmin: false }
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;
    await updateUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
  
  it('should get 401 for geting admin from non admin user', async () => {
    const req = {
      params: { username: 'admin' },
      body: { password: 'papspsps', isAdmin: true },
      user: { username: 'admin', isAdmin: false }
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;
    await updateUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

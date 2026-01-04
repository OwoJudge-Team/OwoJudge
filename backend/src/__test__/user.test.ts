import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { getAllUsers, createUser, getUserByUsername, updateUser, deleteUser } from '../routes/users';

// Mock User model
const { mockSave, mockFind, mockFindOne, mockFindOneAndDelete, mockFindOneAndUpdate } = vi.hoisted(() => {
  return {
    mockSave: vi.fn(),
    mockFind: vi.fn(),
    mockFindOne: vi.fn(),
    mockFindOneAndDelete: vi.fn(),
    mockFindOneAndUpdate: vi.fn(),
  };
});

// Chainable mock helper
const createChainable = (result: any) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve(result),
    catch: vi.fn(),
  };
  return chain;
};

vi.mock('../mongoose/schemas/users', () => {
  const User: any = vi.fn().mockImplementation((data) => ({
    ...data,
    save: mockSave,
    password: data.password || '',
    solvedProblem: 0,
    solvedProblems: [],
    rating: 0
  }));
  User.find = mockFind;
  User.findOne = mockFindOne;
  User.findOneAndDelete = mockFindOneAndDelete;
  User.findOneAndUpdate = mockFindOneAndUpdate;
  return { User };
});

describe('User Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockFind.mockReturnValue(createChainable([]));
    mockFindOne.mockReturnValue(createChainable(null));
    mockSave.mockResolvedValue({ username: 'savedUser' });
    mockFindOneAndDelete.mockResolvedValue({ username: 'deletedUser' });
    mockFindOneAndUpdate.mockResolvedValue({ username: 'updatedUser' });
  });

  it('should get all users', async () => {
    const req = {
      isAuthenticated: () => true
    } as unknown as Request;
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
    const req = {
      query: { filter: 'username', value: 'admin' },
      isAuthenticated: () => true
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      }),
      query: {}
    } as unknown as Response;

    // Mock return value for this test
    mockFind.mockReturnValue(createChainable([{ username: 'admin' }]));

    await getAllUsers(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(data).toHaveLength(1);
    expect(data[0].username).toBe('admin');
  });

  it('should get user with name admin', async () => {
    const req = {
      params: { username: 'admin' },
      user: 'test',
      isAuthenticated: () => true
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;

    // Mock return value
    mockFindOne.mockReturnValue(createChainable({ username: 'admin' }));

    await getUserByUsername(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(data).toHaveProperty('username', 'admin');
  });

  it('should get 403 if not login', async () => {
    const req = {
      params: { username: 'admin' },
      isAuthenticated: () => false
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;

    await getUserByUsername(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should create user', async () => {
    const req = {
      body: {
        username: 'testuser',
        displayName: 'Test User',
        password: 'Testtest',
        isAdmin: false
      },
      user: { isAdmin: true },
      isAuthenticated: () => true
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;
    
    mockSave.mockResolvedValue({ ...req.body });

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
      user: { isAdmin: true },
      isAuthenticated: () => true
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
        isAdmin: false
      },
      user: { isAdmin: true },
      isAuthenticated: () => true
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;

    mockSave.mockRejectedValue(new Error('User exists'));

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
      user: { isAdmin: false },
      isAuthenticated: () => true
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
      user: { isAdmin: true },
      isAuthenticated: () => true
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      }),
      sendStatus: vi.fn()
    } as unknown as Response;
    
    mockFindOneAndDelete.mockResolvedValue({ username: 'testuser' });

    await deleteUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should get 401 for deleting user by non admin user', async () => {
    const req = {
      params: { username: 'testuser' },
      user: { isAdmin: false },
      isAuthenticated: () => true
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
      user: { isAdmin: true },
      isAuthenticated: () => true
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
      user: { isAdmin: true },
      isAuthenticated: () => true
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;
    
    mockFindOneAndUpdate.mockResolvedValue({ username: 'admin' });

    await updateUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should get 401 for update a different user by non admin', async () => {
    const req = {
      params: { username: 'admin' },
      body: { password: 'papspsps' },
      user: { isAdmin: false },
      isAuthenticated: () => true
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
      user: { username: 'admin', isAdmin: false },
      isAuthenticated: () => true
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
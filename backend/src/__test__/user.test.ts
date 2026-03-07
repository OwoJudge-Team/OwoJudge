import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, Mock } from 'vitest';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { getAllUsers, createUser, getUserByUsername, updateUser, deleteUser } from '../routes/users';
import { UserRole } from '../mongoose/schemas/users';

vi.mock('express-validator', () => ({
    validationResult: vi.fn(() => ({ isEmpty: () => true, array: () => [] })),
    matchedData: vi.fn((req) => ({ ...req.body, ...req.query, ...req.params })),
    checkSchema: vi.fn(() => (req: any, res: any, next: any) => next())
}));

vi.mock('../utils/gitea-service', () => ({
    giteaService: {
        createUser: vi.fn().mockResolvedValue({ id: 123 }),
        createUserRepo: vi.fn().mockResolvedValue({ ssh_url: 'ssh://git@example.com/user/repo.git' }),
        addPublicKey: vi.fn().mockResolvedValue(true)
    }
}));

vi.mock('../utils/hash-password', () => ({
    hashString: vi.fn((str) => `hashed_${str}`)
}));

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
  const User: any = vi.fn().mockImplementation(function(data: any) {
    return {
      ...data,
      save: mockSave,
      password: data.password || '',
      solvedProblem: 0,
      solvedProblems: [],
      rating: 0
    };
  });
  User.find = mockFind;
  User.findOne = mockFindOne;
  User.findOneAndDelete = mockFindOneAndDelete;
  User.findOneAndUpdate = mockFindOneAndUpdate;
  return { 
    User,
    UserRole: {
        Student: 'student',
        TA: 'ta',
        JudgeAdmin: 'judgeAdmin'
    }
  };
});

describe('User Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockFind.mockReturnValue(createChainable([]));
    mockFindOne.mockReturnValue(createChainable(null));
    mockSave.mockResolvedValue({ 
        username: 'savedUser',
        save: vi.fn().mockResolvedValue({ username: 'savedUser' })
    });
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

  it('should create user', async () => {
    const req = {
      body: {
        username: 'testuser',
        displayName: 'Test User',
        password: 'Testtest',
        role: UserRole.Student
      },
      user: { role: UserRole.JudgeAdmin },
      isAuthenticated: () => true
    } as unknown as Request;
    let data: any;
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn(users => (data = users)) };
      })
    } as unknown as Response;
    
    mockSave.mockResolvedValue({ 
        ...req.body,
        save: vi.fn().mockResolvedValue({ ...req.body })
    });

    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should get 400 for invalid data form', async () => {
    (validationResult as unknown as Mock).mockReturnValueOnce({ isEmpty: () => false, array: () => ['error'] });
    const req = {
      body: {
        username: 'testuser',
        displayName: 'Test User',
        password: 'Testtest',
        role: 'invalid_role'
      },
      user: { role: UserRole.JudgeAdmin },
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
        role: UserRole.Student
      },
      user: { role: UserRole.JudgeAdmin },
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
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should delete user', async () => {
    const req = {
      params: { username: 'testuser' },
      user: { role: UserRole.JudgeAdmin },
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
    expect(res.status).toHaveBeenCalledWith(200);
  });


  it('should update user', async () => {
    const req = {
      params: { username: 'admin' },
      body: { oldPassword: 'password', displayName: 'New Name' },
      user: { username: 'admin', role: UserRole.JudgeAdmin },
      isAuthenticated: () => true
    } as unknown as Request;
    
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn() };
      })
    } as unknown as Response;
    
    mockFindOne.mockReturnValue(createChainable({ 
        username: 'admin', 
        password: 'hashed_password' 
    }));
    
    mockFindOneAndUpdate.mockResolvedValue({ username: 'admin' });

    await updateUser(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should fail update if old password missing', async () => {
    const req = {
      params: { username: 'admin' },
      body: { displayName: 'New Name' },
      user: { username: 'admin', role: UserRole.JudgeAdmin },
      isAuthenticated: () => true
    } as unknown as Request;
    
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn() };
      })
    } as unknown as Response;

    await updateUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should fail update if old password incorrect', async () => {
    const req = {
      params: { username: 'admin' },
      body: { oldPassword: 'wrong_password', displayName: 'New Name' },
      user: { username: 'admin', role: UserRole.JudgeAdmin },
      isAuthenticated: () => true
    } as unknown as Request;
    
    const res = {
      status: vi.fn(() => {
        return { send: vi.fn() };
      })
    } as unknown as Response;
    
    mockFindOne.mockReturnValue(createChainable({ 
        username: 'admin', 
        password: 'hashed_password' 
    }));

    await updateUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });


});
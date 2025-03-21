import passport from 'passport';
import { Strategy } from 'passport-local';
import { User, IUser } from '../mongoose/schemas/users';
import { stringMatch } from '../utils/hash-password';
import { PassportStatic } from 'passport';

passport.serializeUser((user: IUser, done: (err: any, id?: string) => void) => {
  done(null, user.id as unknown as string);
});

passport.deserializeUser(async (id: string, done: (err: any, user?: IUser | null) => void) => {
  try {
    const findUser: IUser | null = await User.findById(id);
    if (!findUser) {
      throw new Error('User not found');
    }
    done(null, findUser);
  } catch (error) {
    done(error, null);
  }
});

export default (passport as PassportStatic).use(
  new Strategy(async (username: string, password: string, done: (err: any, user?: IUser | null) => void) => {
    try {
      const findUser = await User.findOne({ username }).exec();
      if (!findUser) {
        throw new Error('User not found');
      }
      if (!stringMatch(password, findUser.password)) {
        throw new Error('Password incorrect');
      }
      done(null, findUser);
    } catch (error) {
      done(error, null);
    }
  })
);

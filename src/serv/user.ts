import { ObjectID } from 'bson';
import { User, UserAuth } from "../models";
import _ from '../utils/_';


export class UserServ {
    static getUser(uid: string) {
        const id = _.mObjId(uid);
        return User.findOne({ _id: id });
    }

    static async isValidPassword(userId: ObjectID, password: string) {
        const auth = await UserAuth.findOne({ user: userId });
        if (_.isEmpty(auth)) {
            return false;
        }

        const sha1 = this.genSHA1(password, auth.passwordSalt);
        if (sha1 != auth.passwordSHA1) {
            return false;
        }

        return true;
    }

    static genSHA1(password: string, salt: string) {
        return _.sha1(`${password}${salt}`);
    }

    static updatePassword(uid: ObjectID, newPass: string) {
        const salt = _.randomstring.generate({ length: 16 });
        const hash = UserServ.genSHA1(newPass, salt);
        return UserAuth.updateOne({ user: uid }, {
            $set: {
                user: uid,
                passwordSHA1: hash,
                passwordSalt: salt
            }
        }, { upsert: true });
    }
}
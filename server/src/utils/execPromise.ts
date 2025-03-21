import { exec } from 'child_process';
import * as util from 'util';

// 将Node.js的exec函数转换为Promise版本
export const execPromise = util.promisify(exec); 